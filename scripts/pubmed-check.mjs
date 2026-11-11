// Weekly PubMed check. For each lab member with a `pubmed_query`, searches PubMed
// for papers added in the last 45 days, skips papers already on the site, and saves
// the rest as hidden drafts (draft: true) with suggested topics for an editor to approve.
// Uses NCBI's free E-utilities; set NCBI_API_KEY for higher rate limits (optional).
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PEOPLE = path.join(ROOT, "src/content/people");
const PUBS = path.join(ROOT, "src/content/publications");
const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const KEY = process.env.NCBI_API_KEY ? `&api_key=${process.env.NCBI_API_KEY}` : "";
const DAYS = Number(process.env.PUBMED_DAYS || 45);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const field = (text, name) => {
  const m = text.match(new RegExp(`^${name}:\\s*(.*)$`, "m"));
  if (!m) return "";
  try { return JSON.parse(m[1]); } catch { return m[1].replace(/^["']|["']$/g, ""); }
};

// Keyword rules for suggested topics; an editor confirms them before a paper shows.
const TOPIC_RULES = {
  "single-payer-and-health-reform": /single.payer|medicare for all|national health (insurance|program)|health reform|affordable care act|\bACA\b|universal/i,
  "coverage-and-access": /uninsur|underinsur|coverage|medicaid|access to care|insurance/i,
  "health-spending-and-administrative-costs": /spending|expenditure|administrative|cost|price|billing/i,
  "for-profit-and-corporate-health-care": /for-profit|private equity|investor|medicare advantage|corporat|ownership|pharmaceutical industry/i,
  "medical-debt-and-affordability": /medical debt|bankrupt|out-of-pocket|afford|financial (hardship|strain)|cost-related/i,
  "racism-and-health-equity": /racis|racial|ethnic|black|hispanic|latin|disparit|inequ|equity/i,
  "immigrant-health": /immigra|public charge|undocumented|limited english/i,
  "incarceration-and-health": /incarcerat|prison|jail|probation|justice.involved/i,
  "reproductive-health-and-sexual-violence": /abortion|reproductive|contracept|pregnan|childbirth|sexual (assault|violence)|rape/i,
  "covid-19": /covid|sars-cov|pandemic/i,
  "mortality-and-life-expectancy": /mortality|life expectancy|deaths|excess death/i,
  "climate-and-environmental-health": /climate|extreme heat|heat-related|cold-related|wildfire|air pollution|environmental/i,
  "chronic-disease-and-clinical-care": /diabet|asthma|copd|hypertens|cancer|dialysis|chronic|insulin|clinical/i,
  "medical-education-and-advocacy": /residen|medical student|education|training|advoca|workforce/i,
};

async function eutils(pathAndQuery) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${EUTILS}/${pathAndQuery}&tool=chjl-site&retmode=json${KEY}`);
    if (res.ok) return res.json();
    await sleep(2000 * (attempt + 1));
  }
  throw new Error(`PubMed request failed: ${pathAndQuery}`);
}

const people = [];
for (const f of await readdir(PEOPLE)) {
  if (!f.endsWith(".md")) continue;
  const text = await readFile(path.join(PEOPLE, f), "utf8");
  const q = field(text, "pubmed_query");
  if (q && field(text, "group") !== "former") people.push({ slug: f.replace(/\.md$/, ""), name: field(text, "name"), query: q });
}

const known = new Set();
for (const f of await readdir(PUBS)) {
  if (!f.endsWith(".md")) continue;
  const pmid = field(await readFile(path.join(PUBS, f), "utf8"), "pmid");
  if (pmid) known.add(String(pmid));
}

const found = new Map(); // pmid -> Set of member slugs
for (const p of people) {
  const term = encodeURIComponent(`(${p.query})`);
  const r = await eutils(`esearch.fcgi?db=pubmed&term=${term}&reldate=${DAYS}&datetype=edat&retmax=200`);
  for (const id of r.esearchresult?.idlist || []) {
    if (known.has(id)) continue;
    if (!found.has(id)) found.set(id, new Set());
    found.get(id).add(p.slug);
  }
  await sleep(KEY ? 120 : 400);
}

if (!found.size) { console.log("No new papers."); process.exit(0); }

const ids = [...found.keys()];
const summary = await eutils(`esummary.fcgi?db=pubmed&id=${ids.join(",")}`);
let added = 0;
for (const id of ids) {
  const s = summary.result?.[id];
  if (!s || /erratum|correction/i.test((s.pubtype || []).join(" "))) continue;
  const title = String(s.title || "").replace(/\.$/, "");
  const authors = (s.authors || []).map((a) => a.name);
  const shown = authors.length > 8 ? [...authors.slice(0, 6), "et al."] : authors;
  const year = Number(String(s.pubdate || s.epubdate || "").slice(0, 4)) || new Date().getFullYear();
  const types = (s.pubtype || []).join(" ");
  const type = /editorial|comment|letter|review/i.test(types) ? "Commentary" : "Research";
  const topics = Object.entries(TOPIC_RULES).filter(([, re]) => re.test(title)).map(([t]) => `src/content/topics/${t}.md`);
  const members = [...found.get(id)].map((m) => `src/content/people/${m}.md`);
  const lines = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `authors: ${JSON.stringify(shown.join(", "))}`,
    `year: ${year}`,
    `venue: ${JSON.stringify(s.fulljournalname || s.source || "")}`,
    `type: ${JSON.stringify(type)}`,
    "topics:" + (topics.length ? "" : " []"), ...topics.map((t) => `  - ${t}`),
    "members:", ...members.map((m) => `  - ${m}`),
    `pmid: ${JSON.stringify(id)}`,
    'summary: ""',
    "draft: true",
    `added: ${new Date().toISOString().slice(0, 10)}`,
    "---", "",
  ];
  await writeFile(path.join(PUBS, `pmid-${id}.md`), lines.join("\n"));
  added++;
  console.log(`Draft added: ${title} (${id})`);
}
console.log(`${added} new draft(s) for review.`);
