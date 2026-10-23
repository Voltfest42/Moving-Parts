/**
 * Renders the link-preview images (Open Graph, 1200 × 630) from preview/card.html.
 *
 *   npm run previews
 *
 * The front page's image goes straight into public/. The explainers' images go
 * into preview/out/; copy each one to public/og-image.png in that explainer's project.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const TARGETS: [site: string, file: string][] = [
  ['front', 'public/og-image.png'],
  ['dijkstra', 'preview/out/beyond-dijkstra.png'],
  ['rulebook', 'preview/out/from-black-box-to-rulebook.png'],
];

mkdirSync('preview/out', { recursive: true });

const server = await createServer({ logLevel: 'error', server: { port: 5199 } });
await server.listen();
const base = server.resolvedUrls?.local[0];
if (!base) throw new Error('The Vite server did not report a local address');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    colorScheme: 'light',
    // Draws the gears once, in their starting position, instead of turning them.
    reducedMotion: 'reduce',
  });
  for (const [site, file] of TARGETS) {
    await page.goto(`${base}preview/card.html?site=${site}`);
    await page.waitForSelector('body[data-ready="true"]');
    await page.screenshot({ path: file, type: 'png' });
    console.log(`${site} → ${file}`);
  }
} finally {
  await browser.close();
  await server.close();
}
