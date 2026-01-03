// src/background/messageHandlers/chatHandlers.js
import { llmService } from '../../services/llmService.js';

// ... (Keep your corrected streamSSE function here) ...
async function* streamSSE(responseBody) {
  // (Paste the robust version we fixed in previous steps: 
  // splitting by '\n' and checking delta.reasoning || delta.reasoning_content)
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
          // Content
          if (delta.content) yield delta.content;
          
          // // Reasoning (DeepSeek/Generic)
          // const reasoning = delta.reasoning || delta.reasoning_content || delta.thinking;
          // if (reasoning) yield `*${reasoning}*`; 
        }
      } catch (e) {}
    }
  }
}

// ===== NEW HANDLER FOR PORT CONNECTION =====
export function handleChatStreamConnection(port) {
  // Wait for the frontend to send the messages/context payload
  port.onMessage.addListener(async (request) => {
    const { messages, context } = request;

    try {
      const responseBody = await llmService.chat(messages, context);
      
      if (!responseBody) {
        port.postMessage({ type: 'error', text: "Empty response from API" });
        return;
      }

      for await (const chunk of streamSSE(responseBody)) {
        // Send directly through the open port
        port.postMessage({ type: 'chunk', text: chunk });
      }
      port.postMessage({ type: 'end' });

    } catch (error) {
      console.error('Streaming error:', error);
      port.postMessage({ type: 'error', text: error.message });
    }
  });
}

// ... (Keep handleExtractTabContent, config handlers, etc.)

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
      files: ['scraper.js']
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