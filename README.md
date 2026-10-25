# Moving Parts

The front page of **moving-parts.dev**: a home for interactive explainers that take big ideas in mathematics, computer science and physics apart, so you can watch them work.

It links to:

- **Beyond Dijkstra** (`../Beyond Dijkstra`): the 2022–2025 shortest-path breakthroughs
- **From Black Box to Rulebook** (`../From Black Box to Rulebook`): pulling readable rules out of machine-learning models
- **The Clockwork Sky** (`../The Clockwork Sky`): an introduction to astrophysics, from the basics (Part I of III is out)

The page is one static HTML file with a stylesheet and a small script for the gear train in the header. It uses the same design tokens as the two explainers (`src/styles.css`), so it follows the reader's light or dark setting the same way.

## Development

Requires Node 20.19 or later (developed on Node 24).

```bash
npm install
npm run dev        # local dev server at http://localhost:5173
npm run build      # type-check and build to dist/
npm run previews   # re-render the link-preview images (needs Node 23.6+; first time: npx playwright install chromium)
```

## Layout

```
index.html       the page: explainer cards, head tags for search engines and link previews, structured data
src/styles.css   design tokens (shared with the explainers) and page styles
src/gears.ts     the draggable gear train in the header
public/          favicon, link-preview image, robots.txt, sitemap.xml
preview/         the link-preview card (1200 × 630) for the front page and each explainer
scripts/         render-previews.ts: renders those cards to PNG
```

## Adding an explainer

1. Copy one of the `<li>` cards in `index.html`. A finished explainer is an `<a class="card">`; one that isn't out yet is a `<div class="card cardSoon">` with a "Coming soon" tag.
2. Add it to the `hasPart` list in the structured data in `index.html`'s head.
3. Add its card to `preview/card.ts` and `scripts/render-previews.ts`, run `npm run previews`, and copy its image from `preview/out/` to `public/og-image.png` in the explainer's project.
4. In the explainer's own project, copy what Beyond Dijkstra has: the head tags in `index.html`, `public/robots.txt` and `public/sitemap.xml`, and the redirect from its `*.cloudfront.net` address in `infra/lib/site-stack.ts`.

## Search engines

- Every site has a canonical address. The front page's CloudFront function redirects `www.` and its `*.cloudfront.net` address to `moving-parts.dev`; each explainer redirects its `*.cloudfront.net` address to its subdomain.
- **Google Search Console** uses one *Domain* property for `moving-parts.dev`, which covers every subdomain. It is verified by a TXT record on the bare domain: the token is in `txtValues` in `infra/bin/app.ts`, deployed with `npm --prefix infra run deploy:dns`. Each site's `sitemap.xml` is submitted there.
- **Bing Webmaster Tools** imports the sites from Search Console.

## Deploying

The domain and the front page are defined in `infra/` with AWS CDK, in two stacks:

- **MovingPartsDns**: the Route 53 hosted zone for `moving-parts.dev`. The domain is registered at Porkbun, with its nameservers pointing here. The zone is kept even if the stack is deleted, so those nameservers never change.
- **MovingPartsSite**: the front page, served from a private S3 bucket through CloudFront on `moving-parts.dev` (`www.` redirects there).

Each explainer deploys from its own project, on its own subdomain in the same zone:

| Explainer | Address | Project |
| --- | --- | --- |
| Beyond Dijkstra | https://dijkstra.moving-parts.dev | `../Beyond Dijkstra` |
| From Black Box to Rulebook | https://rulebook.moving-parts.dev | `../From Black Box to Rulebook` |

```bash
npm install --prefix infra   # once
npm run deploy               # build, upload, invalidate the CloudFront cache
```

`npm run deploy` uses the active AWS CLI profile, which must be in `us-east-1` (CloudFront only takes certificates from there). To remove the front page, run `npm --prefix infra run destroy`. That leaves the hosted zone in place.

To add a new explainer, give its CDK stack a certificate and an alias record in the `moving-parts.dev` zone, the same way `infra/lib/site-stack.ts` in Beyond Dijkstra does, then add its card to `index.html`.
