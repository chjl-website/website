// News items that only point to an outside story (media coverage, interviews)
// link straight to that story, so they get no page or layout of their own on this site.
export default {
  eleventyComputed: {
    layout: (data) => (data.external ? false : "news-item.njk"),
    permalink: (data) => (data.external ? false : `/news/${data.page.fileSlug}/`),
  },
};
