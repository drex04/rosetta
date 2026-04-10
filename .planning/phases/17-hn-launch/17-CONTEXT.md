# Phase 17 — HN Launch: Context & Locked Decisions

Release-prep polish to make Rosetta publicly shareable: professional README,
Open Graph/Twitter meta tags, social preview image, and GitHub repo metadata.

---

## Decisions

- **App name**: "Rosetta" — clean single word for the title, expanded to
  "Rosetta — Visual Ontology Mapper" in the HTML `<title>` and README hero.

- **Live demo URL**: `https://drex04.github.io/rosetta/` — Vite is already
  configured with `base: './'` which works for GitHub Pages subpath deployment.
  The README and OG tags use this URL. If the repo is not yet published at this
  URL, the executor should note it as a placeholder.

- **OG image format**: `public/og-image.svg` — an SVG social card (1200×630
  viewBox). GitHub, LinkedIn, Slack, and most modern crawlers support SVG.
  Twitter/X does not; if Twitter card is a priority, export a PNG copy as
  `public/og-image.png` and use `.png` in the meta tag. The plan uses SVG for
  now; PNG conversion is at executor discretion.

- **Meta description**: One sentence covering what the app does and the
  audience: "A browser-based visual editor for OWL/RDF ontologies and
  schema mappings — built for defense interoperability scenarios."

- **README screenshot**: The README references `docs/screenshot.png`. A
  placeholder file is not committed — the executor should take a screenshot of
  the sample NATO project loaded and save it to `docs/screenshot.png` before
  committing. The path is referenced with a GitHub raw URL so it renders on
  GitHub.

- **GitHub repo metadata**: Set via `gh repo edit` — description, topics
  (semantic-web, rdf, owl, ontology, sparql, shacl, rml, nato, react, typescript),
  and homepage URL. Requires `gh` CLI authenticated.

## Deferred Ideas

- **Demo GIF / video**: Animated walkthrough of the canvas — high impact for HN
  but requires screen recording tooling. Out of scope for this phase; can be added
  after launch.
- **`docs/` folder with more screenshots**: Per-feature screenshots — out of scope.
- **`CONTRIBUTING.md`**: Out of scope for v1 launch.
- **`LICENSE` file**: Should be added but is a one-liner — at executor discretion
  (MIT recommended for a public portfolio project).
