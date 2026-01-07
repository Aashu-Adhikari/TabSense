# Implementation Plan: Chat Feature Upgrade

## Overview
This plan outlines the implementation of two features for the TabSynth Chrome Extension:
1. **Source Citations & Tab Switching** - Click citations to jump to specific tabs
2. **Quick Action Chips** - One-click research prompts

---

## Current Architecture Summary

### Data Flow
```
User Input → ChatView → chromeApi.connectChatStream() 
  → Port Message → background.js → chatHandlers.js 
  → llmService.js → LLM API → Stream Response 
  → ReactMarkdown render
```

### Key Files
- [`ChatView.js`](../src/components/ChatView.js) - React component for chat UI
- [`chatHandlers.js`](../src/background/messageHandlers/chatHandlers.js) - Background message handlers
- [`llmService.js`](../src/services/llmService.js) - LLM API communication
- [`chromeApi.js`](../src/services/chromeApi.js) - Frontend API service

---

## Feature 1: Source Citations & Tab Switching

### Goal
Allow users to click citation links in AI responses to immediately switch to the referenced tab.

### Implementation Details

#### 1.1 Modify Background Handler ([`chatHandlers.js`](../src/background/messageHandlers/chatHandlers.js))

**Current State:**
```javascript
return {
  title: tab.title,
  url: tab.url,
  content: truncated
};
```

**Changes:**
- Include `tabId` in the returned object for each tab
- Return an array of tab metadata alongside the combined context

```javascript
return {
  title: tab.title,
  url: tab.url,
  tabId: tab.id,  // NEW: Include tab ID
  content: truncated
};
```

Also update the response to include tab metadata:
```javascript
sendResponse({ 
  success: true, 
  content: combinedContext, 
  count: validResults.length,
  tabs: validResults.map(r => ({ id: r.tabId, title: r.title, url: r.url })) // NEW
});
```

#### 1.2 Update System Prompt ([`llmService.js`](../src/services/llmService.js))

**Current System Prompt:**
```javascript
const systemPrompt = {
  role: 'system',
  content: `You are a helpful AI assistant analyzing a webpage. 
  Answer the user's questions based primarily on the provided webpage context.
  
  WEBPAGE CONTEXT:
  ${context}`
};
```

**Changes:**
Add citation format instructions to the system prompt:

```javascript
const systemPrompt = {
  role: 'system',
  content: `You are a helpful AI assistant analyzing webpage content. 
  Answer the user's questions based primarily on the provided webpage context.

  CITATION RULES:
  - When referencing specific information, cite the source using the format: [Source N]
  - Where N is the source number (1, 2, 3...) corresponding to the numbered sources below
  - Only cite when referencing specific facts from the context
  - If information comes from a specific source, cite it immediately after the claim

  SOURCES:
  ${context}`
};
```

**Update context format** to include source numbers:
```javascript
const combinedContext = validResults.map((doc, index) => `
  ---
  [Source ${index + 1}]
  TITLE: ${doc.title}
  URL: ${doc.url}
  CONTENT:
  ${doc.content}
  ---
`).join('\n');
```

#### 1.4 Add Tab Switching API ([`chromeApi.js`](../src/services/chromeApi.js))

Add new method to ChromeApiService:
```javascript
async switchToTab(tabId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "SWITCH_TO_TAB", tabId }, resolve);
  });
}
```

#### 1.4 Add Background Handler for Tab Switching ([`chatHandlers.js`](../src/background/messageHandlers/chatHandlers.js))

```javascript
export function handleSwitchToTab(request, sendResponse) {
  const { tabId } = request;
  chrome.tabs.update(tabId, { active: true });
  sendResponse({ success: true });
  return true;
}
```

#### 1.5 Update ChatView Component ([`ChatView.js`](../src/components/ChatView.js))

**State Changes:**
```javascript
const [tabMetadata, setTabMetadata] = useState([]); // NEW: Store tab IDs
```

**Update `extractContent`:**
```javascript
if (response.success && response.content) {
  setContext(response.content);
  setTabMetadata(response.tabs || []); // NEW: Store tab metadata
  // ... rest of existing code
}
```

**Add citation click handler:**
```javascript
const handleCitationClick = async (sourceNum) => {
  const tabIndex = sourceNum - 1;
  if (tabMetadata[tabIndex]) {
    await chromeApi.switchToTab(tabMetadata[tabIndex].id);
  }
};
```

**Update ReactMarkdown components:**
```javascript
<ReactMarkdown 
  remarkPlugins={[remarkGfm]}
  components={{
    a: ({node, href, children, ...props}) => {
      // Check if link looks like a citation [Source N]
      const citationMatch = href?.match(/\[Source\s+(\d+)\]/i);
      if (citationMatch) {
        const sourceNum = parseInt(citationMatch[1]);
        const tabInfo = tabMetadata[sourceNum - 1];
        const tooltip = tabInfo ? `Jump to: ${tabInfo.title}` : `Source ${sourceNum}`;
        return (
          <button 
            className="citation-link"
            onClick={() => handleCitationClick(sourceNum)}
            title={tooltip}
            {...props}
          >
            {children}
          </button>
        );
      }
      // Hide citations in single-tab mode - render as plain text
      if (tab && tabMetadata.length <= 1) {
        return <span className="citation-hidden">{children}</span>;
      }
      return <a {...props} target="_blank" rel="noopener noreferrer" />;
    }
  }}
>
  {m.content}
</ReactMarkdown>
```

---

## Feature 2: Quick Action Chips

### Goal
Provide one-click research prompts for common tasks.

### Implementation Details

#### 2.1 Define Chip Data Structure ([`ChatView.js`](../src/components/ChatView.js))

```javascript
const QUICK_CHIPS = [
  {
    id: 'summarize',
    emoji: '📝',
    label: 'Summarize',
    prompt: 'Provide a concise bullet-point summary of this content.'
  },
  {
    id: 'takeaways',
    emoji: '🔑',
    label: 'Key Takeaways',
    prompt: 'What are the 3 most important takeaways?'
  },
  {
    id: 'issues',
    emoji: '🤔',
    label: 'Find Issues',
    prompt: 'Are there any contradictions or errors?'
  }
];
```

#### 2.2 Add Chip Click Handler

```javascript
const handleChipClick = (chip) => {
  setInput(chip.prompt);
  setStatus('ready');
  // Auto-submit after setting input
  setTimeout(() => {
    const form = document.querySelector('.chat-input-form');
    if (form) form.requestSubmit();
  }, 100);
};
```

#### 2.3 Add Chip UI to Render

Add chips **only when there are multiple tabs** (hide for single-tab mode):
```jsx
{group && tabMetadata.length > 1 && (
  <div className="quick-chips">
    {QUICK_CHIPS.map(chip => (
      <button 
        key={chip.id}
        className="chip-button"
        onClick={() => handleChipClick(chip)}
        disabled={status === 'thinking' || status === 'extracting'}
      >
        <span className="chip-emoji">{chip.emoji}</span>
        <span className="chip-label">{chip.label}</span>
      </button>
    ))}
  </div>
)}
```

**Note:** Chips are only shown when analyzing multiple tabs (group mode with count > 1).

#### 2.4 Add CSS Styling

```css
.quick-chips {
  display: flex;
  gap: 8px;
  padding: 12px;
  overflow-x: auto;
}

.chip-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  background: white;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.chip-button:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.chip-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chip-emoji {
  font-size: 14px;
}

.chip-label {
  font-size: 13px;
  color: #333;
}

.citation-link {
  background: #e3f2fd;
  color: #1976d2;
  border: none;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: underline;
}

.citation-link:hover {
  background: #bbdefb;
}
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/background/messageHandlers/chatHandlers.js` | Add `handleSwitchToTab`, modify `handleExtractGroupContent` to include tab IDs |
| `src/services/llmService.js` | Update system prompt with citation format instructions, number sources |
| `src/services/chromeApi.js` | Add `switchToTab` method |
| `src/components/ChatView.js` | Add `tabMetadata` state, citation click handler, quick chips UI |
| `src/popup/popup.css` | Add CSS for chips and citation links |

---

## Testing Checklist

- [ ] Tab content extraction includes tab IDs
- [ ] AI responses include citations in format [Source N]
- [ ] Clicking citation switches to correct tab
- [ ] Quick chips auto-submit prompts on click
- [ ] Chips are hidden in single-tab mode
- [ ] Chips are disabled during thinking/extracting states
- [ ] Styling looks good in popup (limited width)

---

## Mermaid: Data Flow After Changes

```mermaid
flowchart TD
    A[User clicks Chip] --> B[Set input with prompt]
    B --> C[handleSendMessage]
    C --> D[chromeApi.connectChatStream]
    D --> E[Background: llmService.chat]
    E --> F[LLM API with citation instructions]
    F --> G[Stream response with citations]
    G --> H[ReactMarkdown renders]
    H --> I[User clicks citation [Source 1]]
    I --> J[handleCitationClick]
    J --> K[chromeApi.switchToTab]
    K --> L[Background: handleSwitchToTab]
    L --> M[chrome.tabs.update - switches tab]
```
