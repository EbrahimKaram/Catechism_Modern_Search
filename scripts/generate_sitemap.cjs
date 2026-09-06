const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://www.ebrahimkaram.com/Catechism_Modern_Search/';

const tocPath = path.join(__dirname, '../public/data/toc_map.json');
const tocMap = JSON.parse(fs.readFileSync(tocPath, 'utf8'));

const catPath = path.join(__dirname, '../public/data/catechism_all.json');
const catechismData = JSON.parse(fs.readFileSync(catPath, 'utf8'));
const paragraphCount = catechismData.per || 2865;

const urls = [SITE_URL];

for (const sectionId of Object.keys(tocMap)) {
  urls.push(`${SITE_URL}catechism/${encodeURIComponent(sectionId)}`);
}

for (let n = 1; n <= paragraphCount; n++) {
  urls.push(`${SITE_URL}catechism/${n}`);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n') +
  `\n</urlset>\n`;

const outPath = path.join(__dirname, '../public/sitemap.xml');
fs.writeFileSync(outPath, xml);

console.log(`Generated sitemap.xml with ${urls.length} URLs.`);
