"""One-time import: turns the publications sheet (exported as JSON) into one
markdown file per paper, plus topic and people files. Run once; afterwards the
files themselves are the source of truth."""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
C = ROOT / "src" / "content"

def slug(s, n=70):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s[:n].rstrip("-")

def yq(s):
    return json.dumps(s, ensure_ascii=False)

TOPICS = [
    ("single-payer-and-health-reform", "Single payer and health reform"),
    ("coverage-and-access", "Coverage and access to care"),
    ("health-spending-and-administrative-costs", "Health spending and administrative costs"),
    ("chronic-disease-and-clinical-care", "Chronic disease and clinical care"),
    ("racism-and-health-equity", "Racism and health equity"),
    ("for-profit-and-corporate-health-care", "For-profit and corporate health care"),
    ("medical-debt-and-affordability", "Medical debt and affordability"),
    ("covid-19", "COVID-19"),
    ("medical-education-and-advocacy", "Medical education and advocacy"),
    ("immigrant-health", "Immigrant health"),
    ("reproductive-health-and-sexual-violence", "Reproductive health and sexual violence"),
    ("mortality-and-life-expectancy", "Mortality and life expectancy"),
    ("incarceration-and-health", "Incarceration and health"),
    ("climate-and-environmental-health", "Climate and environmental health"),
]
TOPIC_BY_NAME = {n: s for s, n in TOPICS}

def person_slug(name):
    return slug(name)

def main(sheet_json):
    rows = json.load(open(sheet_json))["values"]
    head, rows = rows[0], rows[1:]
    out = C / "publications"
    out.mkdir(parents=True, exist_ok=True)
    seen = set()
    for r in rows:
        r = (r + [""] * 8)[:8]
        title, authors, year, venue, typ, topics, members, ident = [x.strip() for x in r]
        if not title:
            continue
        pmid, url = "", ""
        if re.fullmatch(r"\d{5,9}", ident):
            pmid = ident
            fname = f"pmid-{pmid}"
        else:
            url = ident if ident.startswith("http") else ""
            fname = f"{year}-{slug(title, 60)}"
        base, i = fname, 2
        while fname in seen:
            fname, i = f"{base}-{i}", i + 1
        seen.add(fname)
        tslugs = [TOPIC_BY_NAME[t.strip()] for t in topics.split(";") if t.strip() in TOPIC_BY_NAME]
        mslugs = [f"src/content/people/{person_slug(m.strip())}.md" for m in members.split(";") if m.strip()]
        mslugs = [m for m in mslugs if (ROOT / m).exists()]  # skip people no longer on the site
        tpaths = [f"src/content/topics/{t}.md" for t in tslugs]
        lines = ["---", f"title: {yq(title.rstrip('.'))}", f"authors: {yq(authors)}",
                 f"year: {int(year) if year.isdigit() else yq(year)}", f"venue: {yq(venue)}", f"type: {yq(typ)}"]
        lines.append("topics:" + ("" if tpaths else " []"))
        lines += [f"  - {p}" for p in tpaths]
        lines.append("members:" + ("" if mslugs else " []"))
        lines += [f"  - {p}" for p in mslugs]
        if pmid: lines.append(f"pmid: {yq(pmid)}")
        if url: lines.append(f"url: {yq(url)}")
        lines += ["summary: \"\"", "draft: false", "---", ""]
        (out / f"{fname}.md").write_text("\n".join(lines))
    tdir = C / "topics"; tdir.mkdir(parents=True, exist_ok=True)
    for i, (s, n) in enumerate(TOPICS):
        p = tdir / f"{s}.md"
        if not p.exists():
            p.write_text(f"---\nname: {yq(n)}\norder: {i+1}\n---\n")
    print("publications:", len(seen))

if __name__ == "__main__":
    main(sys.argv[1])
