import { HtmlBasePlugin } from "@11ty/eleventy";

// Site build settings. Content lives in src/content as one small file per item,
// so the Pages CMS editor (and Claude) can add or change things without touching code.
export default function (eleventyConfig) {
  // Adds the site's address prefix to every link, including links typed into page text.
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  const pubGlob = "src/content/publications/*.md";
  const isLive = (item) => !item.data.draft;

  eleventyConfig.addCollection("publications", (api) =>
    api.getFilteredByGlob(pubGlob).filter(isLive).sort((a, b) =>
      (b.data.year || 0) - (a.data.year || 0) || String(a.data.title).localeCompare(String(b.data.title))
    )
  );
  eleventyConfig.addCollection("people", (api) =>
    api.getFilteredByGlob("src/content/people/*.md").sort((a, b) =>
      (a.data.order ?? 99) - (b.data.order ?? 99) || a.data.name.localeCompare(b.data.name)
    )
  );
  eleventyConfig.addCollection("news", (api) =>
    api.getFilteredByGlob("src/content/news/*.md").filter(isLive).sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addCollection("featured", (api) =>
    api.getFilteredByGlob("src/content/featured/*.md").filter(isLive).sort((a, b) => b.date - a.date)
  );

  // References may be stored as a slug ("adam-gaffney") or as the file path the
  // editor writes ("src/content/people/adam-gaffney.md"); both mean the same thing.
  const ref = (v) => String(v || "").split("/").pop().replace(/\.md$/, "");
  const refs = (list) => (Array.isArray(list) ? list : list ? [list] : []).map(ref);
  eleventyConfig.addFilter("refs", refs);

  // Trainee work: a paper counts when someone on the Former fellows page is an author
  // and a current lab member is tagged on it. Fellows are found in author lists by
  // surname and first initial ("Hawks L", "Wilper AP") or by full name.
  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fellowMatcher = (p) => {
    const w = String(p.data.name).replace(/\(.*?\)/g, "").trim().split(/\s+/);
    const first = w[0], last = w[w.length - 1];
    const re = new RegExp(`^${reEsc(last)} ${first[0]}[A-Z]*$`);
    const full = String(p.data.name).trim().toLowerCase();
    return (a) => re.test(a) || a.toLowerCase() === full;
  };
  const authorList = (d) => String(d.authors || "").split(/,\s*/).map((a) => a.trim());
  const traineesOn = (d, people) => {
    const current = new Set((people || []).filter((p) => p.data.group === "current").map((p) => p.page.fileSlug));
    if (!refs(d.members).some((m) => current.has(m))) return [];
    const authors = authorList(d);
    return (people || []).filter((p) => p.data.group === "former" && authors.some(fellowMatcher(p)));
  };
  eleventyConfig.addFilter("markTrainees", (d, people) => {
    const tests = traineesOn(d, people).map(fellowMatcher);
    return authorList(d).filter(Boolean).map((a) =>
      tests.some((t) => t(a)) ? `<span class="trainee">${esc(a)}<sup class="dagger" title="Former lab fellow">†</sup><span class="sr-only"> (former lab fellow)</span></span>` : esc(a)
    ).join(", ");
  });
  eleventyConfig.addFilter("isTraineeWork", (d, people) => traineesOn(d, people).length > 0);
  eleventyConfig.addFilter("traineeWork", (pubs, people) => pubs.filter((p) => traineesOn(p.data, people).length > 0));
  eleventyConfig.addFilter("byTopic", (pubs, slug) => pubs.filter((p) => refs(p.data.topics).includes(slug)));
  eleventyConfig.addFilter("byMember", (pubs, slug) => pubs.filter((p) => refs(p.data.members).includes(slug)));
  eleventyConfig.addFilter("journal", (v) => String(v || "").replace(/\s*\(.*?\)\s*$/, "").replace(/\b([a-z])/g, (m, c, i, str) =>
    i > 0 && /^(of|and|the|in|for|on|to|a|an)\b/.test(str.slice(i)) ? m : c.toUpperCase()));
  eleventyConfig.addFilter("where", (items, key, value) => items.filter((i) => i.data[key] === value));
  eleventyConfig.addCollection("topics", (api) =>
    api.getFilteredByGlob("src/content/topics/*.md").sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99))
  );
  eleventyConfig.addFilter("topicName", (slug, topics) => {
    const t = topics.find((x) => x.page.fileSlug === ref(slug));
    return t ? t.data.name : ref(slug);
  });
  eleventyConfig.addFilter("personName", (slug, people) => {
    const p = people.find((x) => x.page.fileSlug === ref(slug));
    return p ? p.data.name : slug;
  });
  eleventyConfig.addFilter("pubLink", (d) => d.url || (d.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${d.pmid}/` : ""));
  eleventyConfig.addFilter("readableDate", (date) =>
    new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
  );
  eleventyConfig.addFilter("initials", (name) => name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join(""));
  eleventyConfig.addFilter("year", () => new Date().getFullYear());
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));
  eleventyConfig.addFilter("limit", (arr, n) => arr.slice(0, n));
  eleventyConfig.addFilter("count", (arr) => arr.length);

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
}
