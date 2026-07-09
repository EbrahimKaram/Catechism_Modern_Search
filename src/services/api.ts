export async function fetchLocalData(query: string): Promise<string> {
  try {
    // 1. Fetch the master file and TOC map
    const [catResponse, tocResponse] = await Promise.all([
      fetch(`/catechism-app/data/catechism_all.json`),
      fetch(`/catechism-app/data/toc_map.json`)
    ]);

    if (!catResponse.ok) {
      throw new Error(`Master catechism file not found`);
    }
    const data = await catResponse.json();
    const fullHtml = data.html; // The entire HTML dump of every paragraph

    const tocMap = tocResponse.ok ? await tocResponse.json() : {};

    // 2. Parse the query to find exactly what the user wants to see
    const requestedParagraphs = parseQueryNumbers(query, tocMap);
    if (requestedParagraphs.size === 0) {
       // If we can't parse paragraph numbers (maybe they put in a word?), just return a message
       return `<div class="p-4 bg-yellow-50 text-yellow-800 rounded">Search by keyword is not supported locally. Please enter paragraph numbers or section numbers.</div>`;
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
 * Converts a query string like "522,711-716,722" or "1.1.2.3" into a Set of numbers.
 */
function parseQueryNumbers(query: string, tocMap: Record<string, [number, number]> = {}): Set<number> {
  const result = new Set<number>();
  
  // Split by commas first
  const parts = query.split(',');
  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;

    // Check if it's a section query like 1.1.2.3
    if (p.includes('.') && !p.includes('-')) {
      if (tocMap[p]) {
        const [start, end] = tocMap[p];
        for (let i = start; i <= end; i++) {
          result.add(i);
        }
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
 * Uses DOMParser to find all div elements with ID `para-X` and return them as a single string.
 */
function extractParagraphsFromHtml(html: string, requestedParagraphs: Set<number>): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let resultHtml = '';
  
  // Convert Set to Array and sort to return paragraphs in numerical order
  const sortedParagraphs = Array.from(requestedParagraphs).sort((a, b) => a - b);
  
  for (const pNum of sortedParagraphs) {
    const elementId = `para-${pNum}`;
    const pElement = doc.getElementById(elementId);
    
    if (pElement) {
      // Wrap it in the standard section classes the original website uses so it styles correctly
      resultHtml += `<div class="section">${pElement.outerHTML}</div>`;
    }
  }
  
  return resultHtml;
}
