export async function fetchLocalData(query: string): Promise<string> {
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
    const extractedHtml = extractParagraphsFromHtml(fullHtml, requestedParagraphs);

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
function parseQueryNumbers(query: string, tocMap: Record<string, [number, number]> = {}, verseMap: Record<string, number[]> = {}): Set<number> {
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
 * Uses DOMParser to find all div elements with ID `para-X`, fix their internal links, and return them as a single string.
 */
function extractParagraphsFromHtml(html: string, requestedParagraphs: Set<number>): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let resultHtml = '';
  
  // Convert Set to Array and sort to return paragraphs in numerical order
  const sortedParagraphs = Array.from(requestedParagraphs).sort((a, b) => a - b);
  
  // Keep track of the last breadcrumb HTML we injected so we don't duplicate it
  // if sequential paragraphs share the same exact section headers.
  let lastBreadcrumbHtml = '';
  
  for (const pNum of sortedParagraphs) {
    const elementId = `para-${pNum}`;
    const pElement = doc.getElementById(elementId);
    
    if (pElement) {
      // Traverse up to find section headers
      const foundHeaders: string[] = [];
      let parent = pElement.parentElement;
      while (parent && parent.tagName === 'DIV') {
        if (parent.classList.contains('section')) {
           const nav = parent.querySelector(':scope > .navigation');
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

      // Fix links: the original HTML contains href="#!/search/something"
      const links = pElement.querySelectorAll('a');
      links.forEach(link => {
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
             const externalIcon = document.createElement('a');
             externalIcon.setAttribute('href', gatewayUrl);
             externalIcon.setAttribute('target', '_blank');
             externalIcon.setAttribute('rel', 'noopener noreferrer');
             externalIcon.setAttribute('title', 'Read this chapter on Bible Gateway');
             externalIcon.style.marginLeft = '4px';
             externalIcon.style.opacity = '0.7';
             externalIcon.style.textDecoration = 'none';
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
