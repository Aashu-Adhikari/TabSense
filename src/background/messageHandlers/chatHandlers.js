// src/background/messageHandlers/chatHandlers.js
import { llmService } from '../../services/llmService.js';

export function handleExtractTabContent(request, sendResponse) {
  const { tabId } = request;

  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) {
      sendResponse({ success: false, error: "Tab closed or inaccessible" });
      return;
    }

    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.includes('chrome.google.com/webstore')) {
      sendResponse({ success: false, error: "Cannot chat with browser system pages." });
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId },
      files: ['scraper.js']
    })
    .then(injectionResults => {
      if (!injectionResults || !injectionResults[0]) {
        sendResponse({ success: false, error: "Script injection failed." });
        return;
      }
      const content = injectionResults[0].result;
      if (!content || content === "NO_CONTENT_FOUND") {
        sendResponse({ success: false, error: "Page appears empty." });
        return;
      }
      sendResponse({ success: true, content });
    })
    .catch(err => {
      sendResponse({ success: false, error: err.message });
    });
  });
  return true;
}

export function handleSendChatMessage(request, sendResponse) {
  const { messages, context } = request;
  llmService.chat(messages, context)
    .then(reply => sendResponse({ success: true, reply }))
    .catch(err => sendResponse({ success: false, error: err.message }));
  return true;
}

// ===== NEW CONFIG HANDLERS =====

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