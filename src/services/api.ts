let masterDoc: any = null;
let masterTocMap: Record<string, [number, number]> | null = null;
let masterVerseMap: Record<string, number[]> | null = null;

export function initSsrMasterData(data: {
  tocMap: Record<string, [number, number]>;
  verseMap: Record<string, number[]>;
  doc: any;
}) {
  masterTocMap = data.tocMap;
  masterVerseMap = data.verseMap;
  masterDoc = data.doc;
}

export function getLocalDataSync(query: string): string {
  if (!masterDoc || !masterTocMap || !masterVerseMap) {
    return '';
  }
  const requestedParagraphs = parseQueryNumbers(query, masterTocMap, masterVerseMap);
  if (requestedParagraphs.size === 0) {
    return `<div class="p-4 bg-yellow-50 text-yellow-800 rounded">No matching paragraphs found. We currently support searching by paragraph number, section number (e.g. 1.1.2), or exact bible verse.</div>`;
  }
  const extractedHtml = extractParagraphsFromDoc(masterDoc, requestedParagraphs, true);
  if (!extractedHtml) {
    return `<div class="p-4 bg-red-50 text-red-800 rounded">Paragraphs not found.</div>`;
  }
  return extractedHtml;
}

export async function fetchLocalData(query: string): Promise<string> {
  // If master data is already loaded in memory (e.g. SSR or preloaded), use it immediately
  if (masterDoc && masterTocMap && masterVerseMap) {
    return getLocalDataSync(query);
  }

  try {
    // 1. Fetch the master file and maps
    const [catResponse, tocResponse, verseResponse] = await Promise.all([
      fetch(`/Catechism_Modern_Search/data/catechism_all.json`),
      fetch(`/Catechism_Modern_Search/data/toc_map.json`),
      fetch(`/Catechism_Modern_Search/data/verse_map.json`)
    ]);

    if (!catResponse.ok) {
      throw new Error(`Master catechism file not found`);
    }
    const data = await catResponse.json();
    const fullHtml = data.html; // The entire HTML dump of every paragraph

    const tocMap = tocResponse.ok ? await tocResponse.json() : {};
    const verseMap = verseResponse.ok ? await verseResponse.json() : {};

    // 2. Parse the query to find exactly what the user wants to see
    const requestedParagraphs = parseQueryNumbers(query, tocMap, verseMap);
    if (requestedParagraphs.size === 0) {
       // If we can't parse paragraph numbers (maybe they put in a word?), just return a message
       return `<div class="p-4 bg-yellow-50 text-yellow-800 rounded">No matching paragraphs found. We currently support searching by paragraph number, section number (e.g. 1.1.2), or exact bible verse.</div>`;
    }

    // 3. Extract the requested paragraphs out of the massive HTML block
    const parser = new DOMParser();
    const doc = parser.parseFromString(fullHtml, 'text/html');
    const extractedHtml = extractParagraphsFromDoc(doc, requestedParagraphs, false);

    if (!extractedHtml) {
      return `<div class="p-4 bg-red-50 text-red-800 rounded">Paragraphs not found.</div>`;
    }

    return extractedHtml;
  } catch (err) {
    console.error(`Error loading local data for query ${query}:`, err);
    throw err;
  }
}

/**
 * Converts a query string into a Set of numbers.
 */
export function parseQueryNumbers(query: string, tocMap: Record<string, [number, number]> = {}, verseMap: Record<string, number[]> = {}): Set<number> {
  const result = new Set<number>();
  
  // Clean query and check verse map first if it's text
  const cleanQuery = query.trim();
  if (verseMap[cleanQuery]) {
     verseMap[cleanQuery].forEach(n => result.add(n));
     return result; // return immediately for exact verse matches
  }

  // Handle 's1' type section searches
  let parsedQuery = cleanQuery.toLowerCase();
  if (parsedQuery.startsWith('s')) {
    parsedQuery = parsedQuery.substring(1);
  }

  // Split by commas first
  const parts = parsedQuery.split(',');
  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;

    // Check if it's a section query like 1.1.2.3 or 0 (Prologue)
    // We check tocMap directly for full match or string split matching
    if (tocMap[p]) {
      const [start, end] = tocMap[p];
      for (let i = start; i <= end; i++) {
        result.add(i);
      }
      continue;
    }
    
    // Check if it's a range (e.g. 711-716)
    if (p.includes('-')) {
      const [start, end] = p.split('-').map(n => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          result.add(i);
        }
      }
    } else {
      // It's a single number
      const num = parseInt(p, 10);
      if (!isNaN(num)) result.add(num);
    }
  }
  
  return result;
}

/**
 * Finds all div elements with ID `para-X`, fixes their internal links, and returns them as a single string.
 */
function extractParagraphsFromDoc(doc: any, requestedParagraphs: Set<number>, isClone = false): string {
  let resultHtml = '';
  
  // Convert Set to Array and sort to return paragraphs in numerical order
  const sortedParagraphs = Array.from(requestedParagraphs).sort((a, b) => a - b);
  
  // Keep track of the last breadcrumb HTML we injected so we don't duplicate it
  // if sequential paragraphs share the same exact section headers.
  let lastBreadcrumbHtml = '';
  
  for (const pNum of sortedParagraphs) {
    const elementId = `para-${pNum}`;
    const origElement = doc.getElementById(elementId);
    
    if (origElement) {
      // Traverse up to find section headers
      const foundHeaders: string[] = [];
      let parent = origElement.parentElement;
      while (parent && parent.tagName === 'DIV') {
        if (parent.classList.contains('section')) {
           const nav = parent.querySelector('.navigation');
           if (nav) {
              foundHeaders.unshift(nav.outerHTML);
           }
        }
        parent = parent.parentElement;
      }

      let currentBreadcrumbHtml = '';
      if (foundHeaders.length > 0) {
         currentBreadcrumbHtml = `<div class="breadcrumbs p-3 bg-blue-50 border border-blue-100 rounded-md mb-4 text-sm text-blue-900">${foundHeaders.join('<div class="my-1"></div>')}</div>`;
      }

      // If the breadcrumb changed (we entered a new section relative to the last paragraph rendered), append it
      if (currentBreadcrumbHtml !== lastBreadcrumbHtml) {
         resultHtml += currentBreadcrumbHtml;
         lastBreadcrumbHtml = currentBreadcrumbHtml;
      }

      // Clone if requested (SSR master doc) to avoid mutating the master DOM
      const pElement = isClone ? origElement.cloneNode(true) : origElement;
      const ownerDoc = pElement.ownerDocument || doc;

      // Fix links: the original HTML contains href="#!/search/something"
      const links = pElement.querySelectorAll('a');
      links.forEach((link: any) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#!/search/')) {
          const target = href.replace('#!/search/', '');
          
          // 1. Footnote Superscript -> Footnote Body
          if (target.includes('/fn/')) {
             const match = target.match(/\/fn\/(.+)/);
             if (match) {
               const targetId = 'fn:' + match[1];
               link.setAttribute('href', 'javascript:void(0)');
               link.setAttribute('onclick', `document.getElementById('${targetId}')?.scrollIntoView({behavior: 'smooth'})`);
             }
          } 
          // 2. Footnote Body -> Back to Superscript
          else if (target.includes('/fnref/')) {
             const match = target.match(/\/fnref\/(.+)/);
             if (match) {
               // The original HTML often uses a dot instead of colon for the backlink
               const targetId = 'fnref:' + match[1].replace('.', ':');
               link.setAttribute('href', 'javascript:void(0)');
               link.setAttribute('onclick', `document.getElementById('${targetId}')?.scrollIntoView({behavior: 'smooth'})`);
             }
          }
          // 3. Catechism Cross References (pure numbers, ranges, or sections)
          else if (/^s?[\d.,\-]+$/.test(target)) {
             link.setAttribute('href', `/Catechism_Modern_Search/catechism/${target}`);
          }
          // 4. Bible Verses & External References
          else {
             const verse = decodeURIComponent(target);
             const gatewayUrl = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(verse)}&version=RSVCE`;
             
             // Split style: The text itself links to the internal cross-reference search,
             // and we inject a small book icon next to it for the Gateway link.
             link.setAttribute('href', `/Catechism_Modern_Search/catechism/${encodeURIComponent(verse)}`);
             
             // Create the external launch icon
             const externalIcon = ownerDoc.createElement('a');
             externalIcon.setAttribute('href', gatewayUrl);
             externalIcon.setAttribute('target', '_blank');
             externalIcon.setAttribute('rel', 'noopener noreferrer');
             externalIcon.setAttribute('title', 'Read this chapter on Bible Gateway');
             externalIcon.setAttribute('style', 'margin-left: 4px; opacity: 0.7; text-decoration: none;');
             externalIcon.innerHTML = `📖`;

             // Insert it right after the verse link
             link.parentNode?.insertBefore(externalIcon, link.nextSibling);
          }
        }
      });

      // Wrap it in the standard section classes the original website uses so it styles correctly
      // Add a subtle bottom border to separate multiple paragraphs nicely
      resultHtml += `<div class="section pb-6 mb-6 border-b border-gray-100 last:border-0">${pElement.outerHTML}</div>`;
    }
  }
  
  // Breadcrumb nav links aren't touched by the per-paragraph link fixing above; rewrite them too.
  return resultHtml.replace(/href="#!\/search\/([^"]+)"/g, 'href="/Catechism_Modern_Search/catechism/$1"');
}
