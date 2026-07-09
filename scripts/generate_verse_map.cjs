const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../public/data/catechism_all.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const html = data.html;

const verseMap = {};

// Find all paragraphs and their content
const paraRegex = /id="para-(\d+)"[\s\S]*?(?=(id="para-\d+")|$)/g;

let match;
while ((match = paraRegex.exec(html)) !== null) {
  const paraNum = parseInt(match[1], 10);
  const paraContent = match[0]; // Content until the next paragraph

  // Find bible verse links like href="#!/search/1%20Cor%2016:22"
  const linkRegex = /href="#!\/search\/([^"\n]+)"/g;
  let linkMatch;
  
  while ((linkMatch = linkRegex.exec(paraContent)) !== null) {
    const target = linkMatch[1];
    
    // Check if it's a verse (contains %20, space, or colon).
    // Let's also rule out footnote internal references like 1-2865/fn/
    if ((target.includes('%20') || target.includes('+') || target.includes(':') || target.includes(' ')) && !target.includes('/fn/') && !target.includes('/fnref/')) {
      const verse = decodeURIComponent(target).trim();
      
      if (!verseMap[verse]) {
        verseMap[verse] = new Set();
      }
      verseMap[verse].add(paraNum);
    }
  }
}

// Convert Set objects to sorted arrays
const finalMap = {};
for (const verse in verseMap) {
  finalMap[verse] = Array.from(verseMap[verse]).sort((a, b) => a - b);
}

const outPath = path.join(__dirname, '../public/data/verse_map.json');
fs.writeFileSync(outPath, JSON.stringify(finalMap, null, 2));

console.log(`Indexed ${Object.keys(finalMap).length} unique Bible verses and external references.`);
