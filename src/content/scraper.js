// src/content/scraper.js
(function() {
  try {
    // 1. Try standard body text
    let text = document.body ? document.body.innerText : "";

    // 2. If empty, try the document root (catches frameset/shadow DOM edges)
    if (!text || text.trim().length < 50) {
      text = document.documentElement.innerText || "";
    }

    // 3. If still empty, try walking the DOM (last resort)
    if (!text || text.trim().length < 50) {
      const allParagraphs = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span');
      text = Array.from(allParagraphs).map(el => el.innerText).join('\n');
    }

    if (!text || text.trim().length === 0) {
      return "NO_CONTENT_FOUND";
    }

    // Cleanup: Limit to ~50k chars to prevent token overflow
    return text.replace(/\s+/g, ' ').trim().substring(0, 50000);

  } catch (e) {
    console.error("TabSynth Scraper Error:", e);
    return "NO_CONTENT_FOUND";
  }
})();