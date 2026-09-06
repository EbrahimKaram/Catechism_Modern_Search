import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseHTML } from 'linkedom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function prerender() {
  const startTime = Date.now();
  console.log('Starting build-time prerendering...');

  // 1. Read data files
  const catPath = path.join(rootDir, 'public/data/catechism_all.json');
  const tocPath = path.join(rootDir, 'public/data/toc_map.json');
  const versePath = path.join(rootDir, 'public/data/verse_map.json');

  const catechismData = JSON.parse(fs.readFileSync(catPath, 'utf8'));
  const tocMap = JSON.parse(fs.readFileSync(tocPath, 'utf8'));
  const verseMap = JSON.parse(fs.readFileSync(versePath, 'utf8'));
  const paragraphCount = catechismData.per || 2865;

  // 2. Parse HTML once into memory with linkedom
  console.log('Parsing master catechism HTML into memory...');
  const { document: masterDoc } = parseHTML(`<!DOCTYPE html><html><body>${catechismData.html}</body></html>`);

  // 3. Import SSR bundle
  const serverEntryPath = path.join(distDir, 'server/entry-server.js');
  const { render, initSsrMasterData } = await import(pathToFileURL(serverEntryPath).href);

  // 4. Initialize SSR master data
  initSsrMasterData({
    tocMap,
    verseMap,
    doc: masterDoc,
  });

  // 5. Read client template
  const templatePath = path.join(distDir, 'index.html');
  const template = fs.readFileSync(templatePath, 'utf8');

  // Strip template static fallback head tags that will be replaced by unhead SSR tags
  const cleanTemplate = template
    .replace(/<title>.*?<\/title>/s, '')
    .replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/gi, '')
    .replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/gi, '')
    .replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/gi, '');

  // 6. Build route list
  const routes = ['/'];

  for (const sectionId of Object.keys(tocMap)) {
    routes.push(`/catechism/${encodeURIComponent(sectionId)}`);
  }

  for (let n = 1; n <= paragraphCount; n++) {
    routes.push(`/catechism/${n}`);
  }

  console.log(`Prerendering ${routes.length} static pages with concurrency...`);

  let renderedCount = 0;
  const CONCURRENCY = 50;
  let routeIndex = 0;

  async function worker() {
    while (routeIndex < routes.length) {
      const i = routeIndex++;
      const route = routes[i];

      const { appHtml, headPayload } = await render(route);

      let html = cleanTemplate.replace('<div id="app"></div>', `<div id="app">${appHtml}</div>`);

      // Inject head tags from unhead
      if (headPayload && headPayload.headTags) {
        html = html.replace('</head>', `${headPayload.headTags}\n</head>`);
      }

      // Determine output file path
      let outFilePath;
      if (route === '/') {
        outFilePath = path.join(distDir, 'index.html');
      } else {
        // e.g. /catechism/451 -> dist/catechism/451/index.html
        const subPath = route.startsWith('/') ? route.slice(1) : route;
        const decodedSubPath = decodeURIComponent(subPath);
        outFilePath = path.join(distDir, decodedSubPath, 'index.html');
      }

      await fs.promises.mkdir(path.dirname(outFilePath), { recursive: true });
      await fs.promises.writeFile(outFilePath, html, 'utf8');

      renderedCount++;
      if (renderedCount % 500 === 0 || renderedCount === routes.length) {
        console.log(`  Rendered ${renderedCount} / ${routes.length} pages...`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // 7. Clean up dist/server
  const serverDir = path.join(distDir, 'server');
  if (fs.existsSync(serverDir)) {
    fs.rmSync(serverDir, { recursive: true, force: true });
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Successfully prerendered ${renderedCount} static pages in ${elapsed}s!`);
}

prerender().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
