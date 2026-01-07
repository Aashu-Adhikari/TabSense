// src/background/messageHandlers/chatHandlers.js
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
// ===== GROUP CONTENT EXTRACTION (UPDATED) ========================
// =================================================================

export function handleExtractGroupContent(request, sendResponse) {
  const { groupId } = request;

  // 1. Expand the group first (Visual feedback & ensures tabs are "visible" to Chrome)
  chrome.tabGroups.update(groupId, { collapsed: false });

  // 2. Get all tabs
  chrome.tabs.query({ groupId }, async (tabs) => {
    if (!tabs || tabs.length === 0) {
      sendResponse({ success: false, error: "Group is empty." });
      return;
    }

    // 3. Process tabs in parallel, but wait for them to load
    const scrapePromises = tabs.map(async (tab) => {
      // Skip system pages
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.includes('webstore')) {
        return null;
      }

      try {
        // AWAIT the awakening/loading of the tab
        await ensureTabIsReady(tab.id);

        // Now safe to inject
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: getPageContent,
        });

        const content = results?.[0]?.result;
        if (!content || content === "NO_CONTENT_FOUND") return null;
        
        // Truncate per-tab content
        const truncated = content.substring(0, 5000); 
        
        return {
          tabId: tab.id,
          title: tab.title,
          url: tab.url,
          content: truncated
        };
      } catch (err) {
        console.warn(`Failed to scrape tab ${tab.id}:`, err);
        return null;
      }
    });

    // 4. Wait for all tabs to be ready and scraped
    const results = await Promise.all(scrapePromises);
    
    const validResults = results.filter(r => r !== null);
    
    if (validResults.length === 0) {
      sendResponse({ success: false, error: "No readable tabs found in this group." });
      return;
    }

    const combinedContext = validResults.map((doc, index) => `
      ---
      [Source ${index + 1}]
      TITLE: ${doc.title}
      URL: ${doc.url}
      CONTENT:
      ${doc.content}
      ---
    `).join('\n');

    sendResponse({ 
      success: true, 
      content: combinedContext, 
      count: validResults.length,
      tabs: validResults.map(r => ({ id: r.tabId, title: r.title, url: r.url }))
    });
  });

  return true; // Keep channel open
}

// ... (Rest of file: streamSSE, handleSendChatMessage, handleExtractTabContent etc. remains unchanged)
// PASTE THE REST OF YOUR EXISTING CODE BELOW

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

        if (delta) {
          if (delta.content) yield delta.content;
          // Filtering reasoning 
          // const reasoning = delta.reasoning || delta.reasoning_content || delta.thinking;
          // if (reasoning) yield `*${reasoning}*`; 
        }
      } catch (e) {}
    }
  }
}

export function handleSendChatMessage(request, sendResponse) {
  const { messages, context } = request;

  llmService.chat(messages, context)
    .then(async (responseBody) => {
      if (!responseBody) throw new Error("No response from AI Provider");

      const channel = new MessageChannel();
      sendResponse({ success: true, port: channel.port1 });

      try {
        for await (const chunk of streamSSE(responseBody)) {
          channel.port2.postMessage({ type: 'chunk', text: chunk });
        }
        channel.port2.postMessage({ type: 'end' });
      } catch (error) {
        channel.port2.postMessage({ type: 'error', text: error.message });
      } finally {
        channel.port2.close();
      }
    })
    .catch(err => {
      sendResponse({ success: false, error: err.message });
    });

  return true;
}

export function handleExtractTabContent(request, sendResponse) {
  const { tabId } = request;

  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) {
      sendResponse({ success: false, error: "Tab not found" });
      return;
    }

    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.includes('webstore')) {
      sendResponse({ success: false, error: "System pages cannot be read." });
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId },
      func: getPageContent, 
    })
    .then(results => {
      if (!results || !results[0]) {
        sendResponse({ success: false, error: "Script injection failed" });
        return;
      }
      
      const content = results[0].result;
      
      if (!content || content === "NO_CONTENT_FOUND") {
        sendResponse({ success: false, error: "Page appears empty." });
      } else {
        sendResponse({ success: true, content });
      }
    })
    .catch(err => {
      sendResponse({ success: false, error: "Cannot access page (Security Restriction)" });
    });
  });

  return true;
}

export function handleChatStreamConnection(port) {
  port.onMessage.addListener(async (request) => {
    const { messages, context } = request;
    try {
      const responseBody = await llmService.chat(messages, context);
      if (!responseBody) {
        port.postMessage({ type: 'error', text: "Empty response" });
        return;
      }
      for await (const chunk of streamSSE(responseBody)) {
        port.postMessage({ type: 'chunk', text: chunk });
      }
      port.postMessage({ type: 'end' });
    } catch (error) {
      port.postMessage({ type: 'error', text: error.message });
    }
  });
}

export function handleSaveLLMConfig(request, sendResponse) {
  chrome.storage.local.set({ llm_settings: request.config }, () => sendResponse({ success: true }));
  return true;
}

export function handleGetLLMConfig(request, sendResponse) {
  chrome.storage.local.get(['llm_settings'], (res) => {
    sendResponse({ success: true, config: res.llm_settings || null });
  });
  return true;
}

export function handleSwitchToTab(request, sendResponse) {
  const { tabId } = request;
  chrome.tabs.update(tabId, { active: true });
  sendResponse({ success: true });
  return true;
}