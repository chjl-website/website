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
