// src/content/scraper.js
(function() {
  try {
    // Debug log - you can see this in the target web page's console
    console.log("TabSynth: Scraper started.");

    // 1. naive attempt: grab body text
    let text = document.body ? document.body.innerText : "";

    // 2. better attempt: try to find main content wrapper
    const mainElement = document.querySelector('main') || document.querySelector('article') || document.querySelector('#content');
    if (mainElement && mainElement.innerText.length > 50) {
      text = mainElement.innerText;
    }

    // 3. Fallback: if body is empty, try documentElement (catches some edge cases)
    if (!text) {
      text = document.documentElement.innerText;
    }

    if (!text || text.trim().length === 0) {
      console.warn("TabSynth: No text found in DOM.");
      return "NO_CONTENT_FOUND";
    }

    // 4. Cleanup text
    const cleanText = text
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim()
      .substring(0, 50000); // Limit size

    console.log(`TabSynth: Returning ${cleanText.length} chars.`);
    return cleanText;

  } catch (e) {
    console.error("TabSynth Scraper Error:", e);
    return "NO_CONTENT_FOUND";
  }
})();