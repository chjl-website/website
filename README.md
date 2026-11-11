# Cambridge Health Justice Lab website

Static site built with Eleventy, meant for GitHub Pages, edited through Pages CMS.

## How it works
- Content lives in `src/content/` (publications, people, topics, news, featured, pages) and `src/_data/site.json`.
- `npm run build` writes the site to `_site/`. `npm start` serves it locally.
- `.pages.yml` defines the Pages CMS editing forms (editors sign in by email, no GitHub account needed).
- `.github/workflows/deploy.yml` publishes to GitHub Pages on every change to `main`.
- `.github/workflows/pubmed-weekly.yml` runs `scripts/pubmed-check.mjs` every Monday. New papers by lab members are saved hidden (draft: true) with suggested topics; an editor approves by unticking "Hidden: waiting for approval".
- Topics are their own collection. Renaming a topic means editing one file's `name`.
- Altmetric badges show media and social attention next to each paper with a PMID.

## Editing
Lab members add papers, news and people through the Pages CMS editing form. Changes publish automatically within a few minutes.
