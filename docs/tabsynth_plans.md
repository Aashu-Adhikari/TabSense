Based on our recent progress (completing Group Chat, Citations, and the switch to API-first architecture) and the upcoming plans we discussed (Copy, Retry, History, Sidebar), here is the **Updated Phased Roadmap**.

I have marked Phase 3 as fully completed and inserted the new **Phase 4: Advanced UX & Persistence** as the current focus.

---

### **Phase 1: The Core Organizer (Foundation) [COMPLETED]**
*Goal: Build a high-performance, manual tab manager that replaces the default Chrome capability.*

*   **Stage 1.1: Architecture Setup**
    *   Established **Manifest V3** structure with a React-based Popup and a non-blocking Service Worker.
    *   Implemented a Webpack build system with Babel.
*   **Stage 1.2: State Management**
    *   Created custom hooks (`useGroups`, `useSearch`) to manage browser state.
    *   Implemented **Stale-While-Revalidate caching** to make the UI load instantly (0ms latency perception).
*   **Stage 1.3: Rule-Based Logic**
    *   Built **Domain Grouping** (Regex parsing of URLs).
    *   Built **Content Grouping** (Keyword matching algorithms).
    *   Implemented debounced **Search** across all open windows.

---

### **Phase 2: On-Device Intelligence (The "Brain") [COMPLETED]**
*Goal: Implement privacy-first Machine Learning to classify tabs automatically without sending data to a cloud.*

*   **Stage 2.1: The Classifier Engine**
    *   Integrated **TensorFlow.js** and the **Universal Sentence Encoder (USE)**.
    *   Implemented vector embedding generation to classify tab titles into 10 categories (e.g., "Code," "Shopping").
*   **Stage 2.2: The Cold Start Solution**
    *   Created an offline training pipeline (`train-model.js`) with a curated dataset of 500+ websites.
    *   Bundled pre-trained weights into the extension so the AI is smart immediately upon installation.
*   **Stage 2.3: Adaptive "Online" Learning**
    *   Built a feedback loop: When a user assigns a tab to a category via the UI dropdown, the model captures that data.
    *   Implemented a **locking training cycle** in the background to retrain the model on user data without freezing the UI.
*   **Stage 2.4: Production Optimization**
    *   Migrated from monolithic TensorFlow to **Modular Imports** (`tfjs-core`, `tfjs-backend-cpu`).
    *   Reduced extension build size from **32MB** to **~1.5MB** via Tree Shaking.

---

### **Phase 3: The Research Companion (RAG) [COMPLETED]**
*Goal: Transform the extension from an "Organizer" into an "Analyst" that reads and summarizes content.*

*   **Stage 3.1: Single Tab Intelligence**
    *   **Content Extraction:** Built a robust DOM scraper to extract readable text from any webpage (handling SPAs and Shadow DOM).
    *   **LLM Integration:** Switched to a lightweight **API-First Architecture** (OpenAI/OpenRouter).
    *   **Configuration:** Built a Settings UI for users to bring their own API Keys.
    *   **Streaming:** Implemented `chrome.runtime.connect` ports to stream AI responses token-by-token.
*   **Stage 3.2: Advanced Chat Features**
    *   **Citations:** Prompt engineering to force the AI to cite sources (`[[Source: Title]]`).
    *   **Navigation:** Made citations clickable to jump to the specific tab.
    *   **Quick Actions:** Added "Chips" for one-click tasks (Summarize, Key Takeaways).
*   **Stage 3.3: Group Intelligence**
    *   **Multi-Tab Scraping:** Implemented parallel scraping logic to read 10+ tabs simultaneously.
    *   **Tab Awakening:** Logic to detect "discarded" (memory-saved) tabs, reload them, and wait for readiness before scraping.
    *   **Context Merging:** Strategy to combine content from multiple sources with character truncation safeguards.

---

### **Phase 4: Advanced UX & Persistence [CURRENT FOCUS]**
*Goal: Turn the chat feature from a temporary utility into a persistent, reliable workspace.*

*   **Stage 4.1: Utility Tools (Copy & Export)**
    *   **Message Copy:** Clipboard icon for individual AI responses.
    *   **Transcript Copy:** "Export Chat" feature to copy the full conversation format.
*   **Stage 4.2: Error Recovery**
    *   **Retry Logic:** "Regenerate" button to handle network glitches or hallucinations without re-typing prompts.
*   **Stage 4.3: Smart Persistence (History)**
    *   **Storage Schema:** Architecture to save chat states to `chrome.storage.local` keyed by ID.
    *   **Auto-Save/Restore:** Logic to load previous chats automatically when re-opening the popup.
    *   **Expiration Engine:** Background alarm to purge chat history older than user-defined limits (2h - 5h).
*   **Stage 4.4: Sidebar Integration**
    *   **Manifest Update:** Enable `side_panel` permission.
    *   **State Sync:** Synchronize state between the Popup and Sidebar so the conversation flows seamlessly between views.

---

### **Phase 5: Agentic Workflows (The Future)**
*Goal: Enable the extension to take action, not just answer questions.*

*   **Stage 5.1: Task Automation**
    *   Example: "Close all duplicates" or "Archive all 1-week old News tabs."
*   **Stage 5.2: External Integrations**
    *   **Export:** "Send this summary to Notion" or "Save these links to Obsidian."
*   **Stage 5.3: Smart Triggers**
    *   Time-based rules (e.g., "Ungroup 'Work' tabs at 6 PM").

---

### **Phase 6: Platform & Scale**
*Goal: Monetization and ecosystem.*

*   **Stage 6.1: Cloud Sync**
    *   Syncing trained model weights and custom groups across devices.
*   **Stage 6.2: Enterprise Features**
    *   Team-shared tab groups for collaborative research.
*   **Stage 6.3: Cross-Browser Support**
    *   Porting the extension to Firefox (using Polyfill) and Safari.

---

### **Current Technical Stack Snapshot**
*   **Frontend:** React 18, CSS Modules.
*   **Extension Framework:** Chrome Manifest V3.
*   **Background:** Service Worker (Non-persistent).
*   **ML Engine:** TensorFlow.js (CPU Backend) + Universal Sentence Encoder.
*   **LLM Provider:** API-Agnostic (OpenAI, DeepSeek, Gemini via OpenRouter).
*   **Build Tool:** Webpack 5 (Optimized for Tree Shaking).