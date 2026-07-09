import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function scrapeCatechism() {
  const url = 'https://www.catholiccrossreference.online/catechism/';
  console.log('Starting scrape of entire catechism...');

  const dataDir = path.join(__dirname, '../public/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // The Catechism has exactly 2865 paragraphs.
  // The API enforces a strict "25 paragraphs per page" limit (offset step).
  // 2865 / 25 = 114.6 -> 115 requests total to download the entire book.
  const TOTAL_PARAS = 2865;
  const PER_PAGE = 25;
  let allHtmlContent = '';

  for (let offset = 0; offset < TOTAL_PARAS; offset += PER_PAGE) {
    console.log(`Fetching paragraphs chunk (offset ${offset})...`);
    
    // Attempt the fetch with retry logic
    let success = false;
    let attempts = 0;
    
    while (!success && attempts < 3) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ TOKEN: '1', lang: 'en', query: '1-2865', offset: offset.toString() })
        });
        
        const data = await res.json();
        
        if (data.html) {
          allHtmlContent += data.html;
          success = true;
        } else {
           throw new Error("No HTML returned");
        }
      } catch (err) {
        attempts++;
        console.error(`Attempt ${attempts} failed for offset ${offset}. Retrying in 2 seconds...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    if (!success) {
      console.error(`CRITICAL ERROR: Failed to fetch offset ${offset} after 3 attempts.`);
      process.exit(1);
    }
  }

  console.log('Finished downloading all chunks.');
  
  // Save the massive aggregated HTML into one local file
  // Users will load this file for any search they want on the frontend
  const combinedJson = {
    lang: 'en',
    raw: '1-2865',
    per: TOTAL_PARAS,
    html: allHtmlContent
  };

  fs.writeFileSync(
    path.join(dataDir, 'catechism_all.json'), 
    JSON.stringify(combinedJson)
  );

  console.log('Scrape complete! Data saved to public/data/catechism_all.json');
}

scrapeCatechism().catch(console.error);
