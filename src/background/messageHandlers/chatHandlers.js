import { llmService } from '../../services/llmService.js';

// =================================================================
// ===== HELPER: WAIT FOR TAB LOAD =================================
// =================================================================
/**
 * Checks if a tab is discarded/unloaded. If so, reloads it and waits
 * for the 'complete' status before resolving.
 */
function ensureTabIsReady(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) return reject("Tab not found");

      // If tab is already loaded and active, we are good.
      if (!tab.discarded && tab.status === 'complete') {
        return resolve(tab);
      }

      console.log(`Tab ${tabId} is discarded or loading. Waking it up...`);

      // If discarded, we must reload it to make it "alive" again
      if (tab.discarded) {
        chrome.tabs.reload(tabId);
      }

      // Set a timeout to avoid hanging forever if a page fails to load
      const timeoutId = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        console.warn(`Timeout waiting for tab ${tabId} to load.`);
        resolve(tab); // Try to scrape whatever is there anyway
      }, 10000); // 10 second max wait

      // Listen for the loading completion
      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          clearTimeout(timeoutId);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(tab);
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

// =================================================================
// ===== INLINE SCRAPER FUNCTION ===================================
// =================================================================
function getPageContent() {
  try {
    // 1. Try to find main content wrapper
    let text = "";
    const mainElement = document.querySelector('main') || document.querySelector('article') || document.querySelector('#content');
    
    if (mainElement && mainElement.innerText.length > 50) {
      text = mainElement.innerText;
    } else {
      text = document.body ? document.body.innerText : (document.documentElement.innerText || "");
    }

    if (!text || text.trim().length === 0) return "NO_CONTENT_FOUND";

    return text.replace(/\s+/g, ' ').trim().substring(0, 50000);
  } catch (e) {
    return "NO_CONTENT_FOUND";
  }
}

// =================================================================
// ===== EXTRACT TAB CONTENT (UPDATED) =============================
// =================================================================

export function handleExtractTabContent(request, sendResponse) {
  const { tabId } = request;

  chrome.tabs.get(tabId, async (tab) => {
    if (chrome.runtime.lastError || !tab) {
      sendResponse({ success: false, error: "Tab closed or inaccessible" });
      return;
    }

    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.includes('chrome.google.com/webstore')) {
      sendResponse({ success: false, error: "Cannot chat with browser system pages." });
      return;
    }

    try {
      // Await the tab to be ready
      await ensureTabIsReady(tabId);

      // Now safe to inject - use inline function instead of scraper.js
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: getPageContent,
      });

      const content = results?.[0]?.result;
      if (!content || content === "NO_CONTENT_FOUND") {
        sendResponse({ success: false, error: "Page appears empty." });
        return;
      }
      sendResponse({ success: true, content });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  });
  return true;
}

// =================================================================
// ===== STREAMING HELPERS =========================================
// =================================================================

async function* streamSSE(responseBody) {
  const reader = responseBody.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      if (trimmed === 'data: [DONE]') return;

      try {
        const jsonStr = trimmed.slice(6);
        const data = JSON.parse(jsonStr);
        const delta = data.choices?.[0]?.delta;

        if (delta && delta.content) {
          yield delta.content;
        }
      } catch (e) {}
    }
  }
}

// =================================================================
// ===== SEND CHAT MESSAGE (WITH STREAMING) ========================
// =================================================================

export function handleChatStreamConnection(port) {
  port.onMessage.addListener(async (request) => {
    const { messages, context } = request;

    try {
      const responseBody = await llmService.chat(messages, context);
      
      if (!responseBody) {
        port.postMessage({ type: 'error', text: "Empty response from API" });
        return;
      }

      for await (const chunk of streamSSE(responseBody)) {
        // Send chunk directly over the open port
        port.postMessage({ type: 'chunk', text: chunk });
      }
      port.postMessage({ type: 'end' });

    } catch (error) {
      console.error('Streaming error:', error);
      port.postMessage({ type: 'error', text: error.message });
    }
  });
}

// =================================================================
// ===== CONFIG HANDLERS ===========================================
// =================================================================

export function handleSaveLLMConfig(request, sendResponse) {
  const { config } = request;
  chrome.storage.local.set({ llm_settings: config }, () => {
    sendResponse({ success: true });
  });
  return true;
}

export function handleGetLLMConfig(request, sendResponse) {
  chrome.storage.local.get(['llm_settings'], (result) => {
    // If no settings exist, return null so UI can show setup
    sendResponse({ 
      success: true, 
      config: result.llm_settings || null 
    });
  });
  return true;
}
