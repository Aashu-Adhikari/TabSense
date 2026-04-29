# TabSense - Comprehensive Technical Documentation

**Version:** 1.3.0  
**Last Updated:** April 2026  
**Manifest:** V3

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Structure](#architecture--structure)
3. [Core Features](#core-features)
4. [Machine Learning System](#machine-learning-system)
5. [LLM Integration](#llm-integration)
6. [Chrome Extension Architecture](#chrome-extension-architecture)
7. [UI Components](#ui-components)
8. [State Management](#state-management)
9. [Data Flow](#data-flow)
10. [Installation & Development](#installation--development)
11. [API Reference](#api-reference)
12. [Technical Specifications](#technical-specifications)

---

## Project Overview

**TabSense** is an AI-powered Chrome extension that intelligently organizes browser tabs using machine learning and provides conversational AI capabilities for analyzing webpage content. It combines traditional tab management with advanced AI classification to create meaningful tab groups based on content, domain, and learned user behavior.

### Key Capabilities

| Feature | Description |
|---------|-------------|
| 🤖 **AI Classification** | TensorFlow.js + Universal Sentence Encoder for content analysis |
| 📁 **Smart Grouping** | Domain, content, and ML-based grouping methods |
| 🔍 **Advanced Search** | Real-time search across all tabs by title or URL |
| 🧠 **Adaptive Learning** | Model learns from user assignments to improve accuracy |
| 💬 **Chat with Tabs** | LLM integration for querying webpage content with citations |
| 🔄 **Undo/Redo** | 60-second window to undo/redo group deletions |
| 📊 **Advanced Analytics** | Track active time, memory usage, focus scores, and clear stale tabs |
| ⚡ **Dual UI** | Both popup and side panel interfaces |

### Technology Stack

- **Frontend:** React 18.2.0, JavaScript ES6+
- **Machine Learning:** TensorFlow.js 3.21.0, Universal Sentence Encoder 1.3.3
- **LLM Integration:** OpenRouter API (compatible with OpenAI, custom endpoints)
- **Build System:** Webpack 5.87.0, Babel 7.22.5
- **Platform:** Chrome Extension Manifest V3
- **Styling:** CSS3 with component-scoped styles
- **State Management:** React Hooks (useState, useEffect)

---

## Architecture & Structure

### Project Directory Structure

```
TabSense/
├── src/
│   ├── background/                 # Service worker & message handlers
│   │   ├── background.js          # Main service worker entry
│   │   ├── messageHandlers/       # Modular message handlers
│   │   │   ├── chatHandlers.js    # LLM chat operations
│   │   │   ├── groupHandlers.js   # Grouping operations
│   │   │   ├── mlHandlers.js      # ML classification & training
│   │   │   ├── searchHandlers.js  # Search functionality
│   │   │   └── tabHandlers.js     # Tab management operations
│   │   └── utils/
│   │       └── groupingAlgorithms.js  # Grouping algorithm implementations
│   │
│   ├── components/                 # React components
│   │   ├── common/                # Reusable UI components
│   │   │   ├── Button.js          # Styled button component
│   │   │   ├── Icons.js           # SVG icon components
│   │   │   └── UndoToast.js       # Undo notification (legacy)
│   │   ├── ApiKeyInput.js         # API key configuration
│   │   ├── ChatView.js            # LLM chat interface
│   │   ├── CreateGroupView.js     # Custom group creation
│   │   ├── EmojiPicker.js         # Emoji selection UI
│   │   ├── GroupCard.js           # Group display card
│   │   ├── SearchResultsView.js   # Search results display
│   │   └── SettingsView.js        # Settings configuration UI
│   │
│   ├── containers/
│   │   └── PopupApp.js            # Main popup container (legacy)
│   │
│   ├── content/
│   │   └── content.js             # Content script for web pages
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── useGroups.js           # Groups state & operations
│   │   ├── useMlClassification.js # ML classification hook
│   │   └── useSearch.js           # Search functionality hook
│   │
│   ├── icons/                      # Extension icons
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   │
│   ├── ml/                         # Machine learning components
│   │   ├── classifier.js          # TabClassifier class
│   │   ├── training-data.js       # Training data management
│   │   └── pretrained-model/      # Pre-trained model files
│   │       ├── model.json         # Model architecture
│   │       └── weights.bin        # Model weights (291 KB)
│   │
│   ├── popup/                      # Popup UI (legacy main interface)
│   │   ├── App.js                 # Main popup component
│   │   ├── popup.html             # HTML template
│   │   ├── popup.css              # Popup styles
│   │   ├── base.css               # Base styles & layout
│   │   ├── action-grid.css        # Action grid styling
│   │   ├── chat.css               # Chat interface styles
│   │   ├── settings.css           # Settings UI styles
│   │   └── index.js               # Entry point
│   │
│   ├── services/                   # Service layer
│   │   ├── chromeApi.js           # Chrome API abstraction
│   │   ├── emojiService.js        # Domain emoji management
│   │   └── llmService.js          # LLM API integration
│   │
│   ├── sidebar/                    # Side panel interface
│   │   ├── SidebarApp.js          # Main sidebar component
│   │   ├── sidepanel.html         # HTML template
│   │   ├── sidepanel.js           # Entry point
│   │   ├── sidebar-base.css       # Base sidebar styles
│   │   ├── sidebar-chat.css       # Chat sidebar styles
│   │   └── sidebar-settings.css   # Settings sidebar styles
│   │
│   ├── styles/                     # Global styles
│   │   ├── components/
│   │   │   ├── groups.css         # Groups styling
│   │   │   ├── search.css         # Search styling
│   │   │   └── toast.css          # Toast notification styles
│   │   └── utilities/
│   │
│   ├── utils/                      # Utility functions
│   │   ├── defaultDomainSettings.js  # Default domain configurations
│   │   ├── links.js               # External link helpers
│   │   ├── mlCategories.js        # ML category definitions
│   │   └── uiUtils.js             # UI utility functions
│   │
│   └── manifest.json              # Extension manifest
│
├── build/                          # Compiled extension output
├── node_modules/                   # Dependencies
├── analysis/                       # Analysis documents
├── docs/                           # Documentation files
├── plans/                          # Implementation plans
├── package.json                    # Project configuration
├── package-lock.json               # Dependency lock file
├── webpack.config.js              # Webpack configuration
├── train-model.js                 # ML training script (Node.js)
├── training-data.csv              # Training dataset
└── README.md                      # Project overview
```

### Module Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Popup     │  │   Sidebar   │  │   Content Script    │ │
│  │   (React)   │  │   (React)   │  │   (Vanilla JS)      │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────────────┘ │
│         │                │                      │           │
│         └────────────────┼──────────────────────┘           │
│                          │                                   │
│                   ┌──────▼──────┐                           │
│                   │chromeApi.js │                           │
│                   │  (Service)  │                           │
│                   └──────┬──────┘                           │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         │                │                │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │  Message    │  │  Message    │  │  Message    │         │
│  │  Handlers   │  │  Handlers   │  │  Handlers   │         │
│  │  (tab)      │  │  (group)    │  │  (ml)       │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │           Background Service Worker                   │ │
│  │  - Proactive tab cache                                │ │
│  │  - Event listeners (tabs, groups)                     │ │
│  │  - Message routing                                    │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Features

### 1. Tab Grouping

TabSense provides three grouping methods:

#### Domain Grouping
Groups tabs by website domain with customizable emojis and names.

```javascript
// Example: Groups all github.com tabs together
Input: [github.com/repo1, github.com/repo2, stackoverflow.com/question]
Output: [📁 GitHub (2 tabs), 📁 Stack Overflow (1 tab)]
```

#### Content Grouping
Analyzes tab titles and URLs using pattern matching.

```javascript
const contentPatterns = [
  { pattern: /github|gitlab|bitbucket/i, category: 'Code & Development', emoji: '💻' },
  { pattern: /youtube|video|tutorial/i, category: 'Videos', emoji: '🎬' },
  { pattern: /amazon|shopping|store/i, category: 'Shopping', emoji: '🛒' },
  // ... more patterns
];
```

#### AI Grouping
Uses machine learning to intelligently categorize tabs into 10 predefined categories.

### 2. Search Functionality

Real-time search across all tabs with:
- Title matching
- URL matching
- Highlighted search terms
- Instant results display

### 3. Undo/Redo System

**Recently implemented feature** (v1.1.1):

- **Undo Stack:** Tracks deleted groups for 60 seconds
- **Redo Stack:** Allows re-deleting restored groups
- **Header Toolbar:** Undo (↶) and Redo (↷) buttons
- **Auto-expiry:** Items expire after 60 seconds

```javascript
// State structure
const [undoStack, setUndoStack] = useState([]);  // Deleted groups
const [redoStack, setRedoStack] = useState([]);  // Re-deletable groups

// Each stack item:
{
  groupData: { title, color, tabs: [...], windowId },
  timestamp: 1234567890,
  expiresAt: 1234567950  // 60 seconds later
}
```

### 4. Chat with Tabs

LLM-powered chat interface for querying webpage content:

- **Streaming responses** with real-time output
- **Citation system** with source references
- **Context extraction** from tab content
- **Chat history persistence** (configurable retention)
- **Multiple LLM providers** (OpenRouter, OpenAI, custom)

### 5. Domain Customization

Users can customize how domains appear:

```javascript
// Default settings
{
  'github.com': { emoji: '💻', name: 'GitHub' },
  'stackoverflow.com': { emoji: '📚', name: 'Stack Overflow' },
  'youtube.com': { emoji: '🎬', name: 'YouTube' }
}
```

### 6. Advanced Analytics Dashboard

**Recently implemented feature** (v1.1.1):

Comprehensive tracking and optimization metrics accessed via the pie-chart icon in the Popup/Sidebar, or as a standalone enlarged view.

- **Time Tracking:** Background Service Worker tracks active focus time per tab and domain.
- **Estimated Memory Usage:** Intelligent heuristic estimates RAM footprint based on site category (e.g. Video ≈ 150MB, Standard ≈ 50MB).
- **Daily Focus Score:** 0-100 score classifying browsing time into "Productive" vs "Distracting" buckets using a customizable domain blocklist.
- **The Graveyard:** Automatically flags "Stale Tabs" that have been dormant for >24 hours and provides a 1-click "Clear All" utility.
- **Historical Trends:** Persistent storage logs daily active time and visualizes the past 7 days using a custom CSS BarChart.

---

## Machine Learning System

### Classification Categories

TabSense uses 10 predefined categories for ML classification:

| Category | Emoji | Description | Example Domains |
|----------|-------|-------------|-----------------|
| Code & Development | 💻 | Programming, APIs, documentation | github.com, stackoverflow.com |
| Documentation | 📚 | Tutorials, guides, references | docs.python.org, mdn.io |
| Social Media | 🐦 | Social platforms | twitter.com, reddit.com |
| Shopping | 🛒 | E-commerce, products | amazon.com, ebay.com |
| News & Articles | 📰 | News sites, blogs | nytimes.com, medium.com |
| Video & Entertainment | 🎬 | Streaming, video platforms | youtube.com, netflix.com |
| Productivity & Tools | ⚡ | Productivity apps | notion.so, drive.google.com |
| Email & Communication | 📧 | Email clients | gmail.com, outlook.com |
| AI & Machine Learning | 🤖 | AI tools, ML resources | chat.openai.com, huggingface.co |
| General Browsing | 🌐 | Miscellaneous | google.com, wikipedia.org |

### TabClassifier Architecture

```javascript
class TabClassifier {
  // Models
  model: tf.LayersModel       // Custom classification model
  useModel: UniversalSentenceEncoder  // Text embeddings

  // Configuration
  categories: string[]        // 10 predefined categories
  initialized: boolean        // Initialization status
  useFallbackOnly: boolean    // Fallback mode flag

  // Methods
  initialize()               // Load models
  classifyTab(title, url)    // Classify a single tab
  trainWithUserData(examples) // Fine-tune with user data
  mlAutoGroupAllTabs(tabs)   // Group all tabs by ML
}
```

### Model Architecture

```
Input (512) → Dense(128, ReLU) → Dropout(0.3) → Dense(64, ReLU) → Dense(10, Softmax)
              ↓                    ↓                ↓                ↓
           512-dim             128-dim          64-dim          10 categories
           embedding           hidden           hidden          probabilities
```

### Classification Pipeline

```
1. Text Preprocessing
   └─> Combine title + domain: "Repository - GitHub github.com"

2. Embedding Generation
   └─> Universal Sentence Encoder → 512-dimensional vector

3. Neural Network Prediction
   └─> Model predicts category probabilities

4. Confidence Scoring
   └─> Return category with highest probability

5. Fallback (if confidence < 0.3)
   └─> Rule-based classification
```

### Training System

#### Initial Training (Node.js)
```bash
npm run train
```

Trains the model using `training-data.csv`:
```csv
text,label
"GitHub - repository code",Code & Development
"Stack Overflow - Python question",Code & Development
"Amazon - product page",Shopping
```

#### User Fine-Tuning (In-Browser)
The model learns from user behavior:

```javascript
// When user assigns tab to ML category
await chromeApi.learnFromAssignment(tab, 'Code & Development');

// Training triggers after 50 examples
if (pendingData.length >= 50) {
  await tabClassifier.trainWithUserData(pendingData);
}
```

### Fallback Classification

When ML is unavailable or confidence is low:

```javascript
const rules = [
  { pattern: /github|gitlab|stack overflow/i, category: 'Code & Development' },
  { pattern: /docs?|documentation|tutorial/i, category: 'Documentation' },
  { pattern: /twitter|facebook|instagram|reddit/i, category: 'Social Media' },
  { pattern: /amazon|shop|buy|cart/i, category: 'Shopping' },
  { pattern: /news|article|blog|medium/i, category: 'News & Articles' },
  { pattern: /youtube|watch|video|stream|netflix/i, category: 'Video & Entertainment' },
  { pattern: /notion|drive|dropbox|calendar/i, category: 'Productivity & Tools' },
  { pattern: /mail|gmail|outlook|email/i, category: 'Email & Communication' },
  { pattern: /chatgpt|openai|claude|ai|llm/i, category: 'AI & Machine Learning' }
];
```

### Weight Persistence

Model weights are saved to Chrome storage:

```javascript
// Save after training
await this.saveModelWeights();
// Storage key: 'ml_model_weights'
// Format: { weight_0: Float32Array, weight_1: Float32Array, ... }
```

---

## LLM Integration

### Architecture

```
┌─────────────────┐
│   ChatView.js   │  React component
└────────────────┘
         │
         │ sendMessage(messages, context)
         ▼
┌─────────────────┐
│  chromeApi.js   │  Service layer
└────────┬────────┘
         │
         │ SEND_CHAT_MESSAGE
         ▼
┌─────────────────┐
│chatHandlers.js  │  Background handler
└────────┬────────┘
         │
         │ llmService.chat()
         ▼
┌─────────────────┐
│  llmService.js  │  API client
└────────┬────────┘
         │
         │ POST /chat/completions
         ▼
┌─────────────────┐
│  OpenRouter API │  or OpenAI, Custom
└─────────────────┘
```

### Configuration

Users configure LLM settings in SettingsView:

```javascript
{
  provider: 'openrouter',      // 'openrouter', 'openai', 'custom'
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: 'sk-...',           // Stored in chrome.storage.local
  model: 'meta-llama/llama-3-8b-instruct'
}
```

### Chat Flow

1. **Content Extraction:** Extract text from tab(s)
2. **Context Building:** Format with citations
3. **System Prompt:** Add citation rules
4. **Streaming:** Process SSE response chunks
5. **Citation Parsing:** Extract [[Source: Title | "quote"]] format
6. **State Persistence:** Save chat history

### Citation System

When multiple sources are provided:

```
Format: [[Source: Page Title | "exact text snippet"]]

Example: 
"According to the documentation, React uses virtual DOM [[Source: React Docs | "The virtual DOM is a representation..."]]"
```

---

## Chrome Extension Architecture

### Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "TabSense",
  "version": "1.1.1",
  "action": {
    "default_popup": "popup.html",
    "default_title": "TabSense"
  },
  "background": {
    "service_worker": "background.js"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "permissions": [
    "tabs",
    "tabGroups",
    "storage",
    "scripting",
    "sidePanel",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

### Permissions Explained

| Permission | Purpose |
|------------|---------|
| `tabs` | Access tab information, create/close tabs |
| `tabGroups` | Create, update, remove tab groups |
| `storage` | Save settings, ML weights, chat history |
| `scripting` | Inject content scripts for extraction |
| `sidePanel` | Display side panel interface |
| `activeTab` | Access currently active tab |

### Service Worker Architecture

#### Proactive Caching

```javascript
// Event listeners trigger cache updates
chrome.tabs.onCreated.addListener(updateTabCache);
chrome.tabs.onRemoved.addListener(updateTabCache);
chrome.tabs.onUpdated.addListener(updateTabCache);
chrome.tabGroups.onUpdated.addListener(updateTabCache);

// Cache structure
{
  cachedGroups: [...],        // Groups with tabs
  cachedUngroupedTabs: [...], // Ungrouped tabs
  cacheTimestamp: 1234567890
}
```

#### Message Routing

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Tab operations
  if (request.action === "GET_ALL_TABS") 
    return tabHandlers.handleGetAllTabs(request, sendResponse);
  
  // Group operations
  if (request.action === "GROUP_TABS") 
    return groupHandlers.handleGroupTabs(request, sendResponse);
  
  // ML operations
  if (request.action === "CLASSIFY_TAB") 
    return mlHandlers.handleClassifyTab(request, sendResponse);
  
  // Chat operations
  if (request.action === "SEND_CHAT_MESSAGE") 
    return chatHandlers.handleSendChatMessage(request, sendResponse);
});
```

### Auto-Grouping System

Background script can auto-group new tabs:

```javascript
// Listen for tab activity
chrome.tabs.onCreated.addListener(async (tab) => {
  const settings = await chrome.storage.local.get(['auto_grouping_settings']);
  
  if (settings.auto_grouping_settings?.enabled) {
    const method = settings.auto_grouping_settings.method; // 'domain', 'content', 'ai'
    // Group based on method
  }
});
```

---

## UI Components

### Component Hierarchy

```
PopupApp / SidebarApp (Root)
├── Header
│   ├── Brand (logo + title)
│   └── Action Buttons (Undo, Redo, Refresh, Settings, etc.)
├── Search Container
│   ├── Search Input
│   └── Clear Button
├── Action Grid (Popup only)
│   ├── Chat with Tab
│   └── Grouping Controls
├── Groups Section
│   └── GroupCard[] (for each group)
│       ├── Group Header
│       │   ├── Expand/Collapse
│       │   ├── Title (editable)
│       │   ├── Actions (Chat, Delete, Ungroup)
│       │   └── Domain Settings (if applicable)
│       └── Tab List
│           └── Tab Item[] (for each tab)
│               ├── Favicon
│               ├── Title
│               ├── URL
│               └── Actions (Ungroup, Assign)
├── Ungrouped Tabs Section
│   └── Ungrouped Tab Item[]
└── Footer (Popup only)
    └── Refresh Button
```

### Key Components

#### GroupCard.js
Displays a group with its tabs:
- Expandable/collapsible
- Inline rename
- Domain emoji customization
- Drag-and-drop support (WIP)
- Chat shortcut

#### ChatView.js
Full chat interface:
- Streaming responses
- Citation rendering
- Chat history
- Settings integration
- Markdown rendering (react-markdown)

#### SettingsView.js
Configuration UI:
- LLM provider selection
- API key input
- Auto-grouping settings
- Chat history retention
- UI preferences (size, default view)

### Styling Architecture

```
src/styles/
├── components/
│   ├── groups.css      # Group cards, tab lists
│   ├── search.css      # Search bar, results
│   └── toast.css       # Toast notifications
├── popup/
│   ├── base.css        # Layout, buttons, dark mode
│   ├── action-grid.css # Action grid layout
│   ├── chat.css        # Chat interface
│   └── settings.css    # Settings forms
└── sidebar/
    ├── sidebar-base.css    # Sidebar layout
    ├── sidebar-chat.css    # Sidebar chat
    └── sidebar-settings.css # Sidebar settings
```

### Dark Mode Support

Automatic dark mode via `prefers-color-scheme`:

```css
@media (prefers-color-scheme: dark) {
  .popup-container {
    background: #0f172a;
    color: #f1f5f9;
  }
  /* ... more dark mode styles */
}
```

---

## State Management

### React Hooks

#### useGroups.js

Manages groups, tabs, and undo/redo:

```javascript
const {
  groups,              // Array of groups with tabs
  ungroupedTabs,       // Array of ungrouped tabs
  loading,             // Loading state
  error,               // Error state
  domainSettings,      // Domain emoji settings
  undoStack,           // Deleted groups (60s)
  redoStack,           // Re-deletable groups
  fetchGroupsAndTabs,  // Refresh data
  handleDeleteGroup,   // Delete group
  handleUndoDelete,    // Undo last delete
  handleRedoDelete,    // Redo last undo
  handleRenameGroup,   // Rename group
  handleAddToGroup,    // Add tab to group
  handleOpenTab        // Open/activate tab
} = useGroups();
```

#### useSearch.js

Manages search state:

```javascript
const {
  searchTerm,          // Current search query
  searchResults,       // Matching tabs
  searchLoading,       // Loading state
  handleSearchChange,  // Update search
  clearSearch          // Clear search
} = useSearch();
```

#### useMlClassification.js

Manages ML initialization:

```javascript
const {
  mlInitialized,       // ML ready
  initializing,        // Initializing
  error,               // Error state
  handleMlAutoGroup    // Trigger ML grouping
} = useMlClassification();
```

### Stale-While-Revalidate Pattern

```javascript
const fetchGroupsAndTabs = async () => {
  // 1. Load from cache (instant UI)
  const cachedData = await chrome.storage.local.get([
    'cachedGroups', 
    'cachedUngroupedTabs'
  ]);
  
  if (cachedData.cachedGroups) {
    setGroups(cachedData.cachedGroups);
    setLoading(false);
  }
  
  // 2. Fetch fresh data (background sync)
  const freshResponse = await chromeApi.getGroupsWithTabs();
  
  if (freshResponse.success) {
    setGroups(freshResponse.groups);
    setUngroupedTabs(freshResponse.ungroupedTabs);
  }
};
```

---

## Data Flow

### Tab Grouping Flow

```
User clicks "Group by Domain"
         │
         ▼
┌─────────────────┐
│   App.js        │  handleGroupTabs()
└────────────────┘
         │
         ▼
┌─────────────────┐
│  chromeApi.js   │  groupByDomain()
└────────┬────────
         │
         │ GROUP_BY_DOMAIN
         ▼
┌─────────────────┐
│groupHandlers.js │  handleGroupByDomain()
└────────────────┘
         │
         ▼
┌─────────────────┐
│groupingAlgo.js  │  groupTabsByDomain()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  chrome.tabs    │  Create groups
│  chrome.tabGroups│  Update titles
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Event Listeners│  onUpdated, onMoved
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ updateTabCache()│  Update cache
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  storage.local  │  Save cachedGroups
└────────┬────────
         │
         │ storage.onChanged
         ▼
┌─────────────────┐
│  useGroups hook │  Update state
└────────┬────────
         │
         ▼
┌─────────────────┐
│   UI Re-render  │
└─────────────────┘
```

### Chat Message Flow

```
User sends message
         │
         ▼
┌─────────────────┐
│   ChatView.js   │  handleSend()
└────────────────┘
         │
         ▼
┌─────────────────┐
│  chromeApi.js   │  sendChatMessage()
└────────┬────────
         │
         │ SEND_CHAT_MESSAGE
         ▼
┌─────────────────┐
│chatHandlers.js  │  handleSendChatMessage()
└────────┬────────
         │
         ▼
┌─────────────────┐
│  llmService.js  │  chat(messages, context)
└────────┬────────
         │
         │ POST /chat/completions
         ▼
┌─────────────────┐
│  OpenRouter API │  Streaming response
└────────┬────────
         │
         │ ReadableStream
         ▼
┌─────────────────┐
│chatHandlers.js  │  Stream chunks
└────────────────┘
         │
         │ port.onMessage
         ▼
┌─────────────────┐
│   ChatView.js   │  Append chunks
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ react-markdown  │  Render + citations
└────────┬────────
         │
         ▼
┌─────────────────┐
│  storage.local  │  Save chat history
└─────────────────┘
```

---

## Installation & Development

### Prerequisites

- Node.js v14 or higher
- npm or yarn
- Chrome browser (v88+ for Manifest V3)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd TabSense

# Install dependencies
npm install
```

### Development

```bash
# Build for development
npm run watch

# Build for production
npm run build

# Train ML model (optional)
npm run train
```

### Loading in Chrome

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `build/` folder
5. Extension icon appears in toolbar

### Project Structure After Build

```
build/
├── manifest.json         # Extension manifest
├── popup.html            # Popup UI
├── sidepanel.html        # Side panel UI
├── popup.js              # Popup bundle
├── sidepanel.js          # Side panel bundle
├── background.js         # Service worker
├── content.js            # Content script
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── ml/pretrained-model/
    ├── model.json
    └── weights.bin
```

### Training Custom Model

1. Prepare `training-data.csv`:
```csv
text,label
"GitHub repository - issue tracker",Code & Development
"Amazon product page - wireless headphones",Shopping
```

2. Run training:
```bash
npm run train
```

3. Model saved to `src/ml/pretrained-model/`

4. Rebuild extension:
```bash
npm run build
```

---

## API Reference

### chromeApi Service

#### Tab Operations

```javascript
// Get all tabs
await chromeApi.getAllTabs();

// Get groups with tabs
await chromeApi.getGroupsWithTabs();

// Switch to tab
await chromeApi.switchToTab(tabId);

// Activate tab with citation
await chromeApi.activateTab(tabId, quote);
```

#### Group Operations

```javascript
// Group tabs
await chromeApi.groupTabs(tabIds, groupName);

// Group by domain
await chromeApi.groupByDomain();

// Group by content
await chromeApi.groupByContent();

// Group by AI
await chromeApi.groupByAI();

// Ungroup single tab
await chromeApi.ungroupSingleTab(tabId);

// Ungroup all tabs in group
await chromeApi.ungroupAllTabs(groupId);

// Add tab to group
await chromeApi.addTabToGroup(tabId, groupId);

// Rename group
await chromeApi.renameGroup(groupId, newName);

// Delete group (with undo support)
await chromeApi.deleteGroup(groupId);

// Undo delete
await chromeApi.undoDeleteGroup(groupData);
```

#### ML Operations

```javascript
// Initialize ML
await chromeApi.initializeML();

// Classify tab
await chromeApi.classifyTab(title, url);

// Get smart group name
await chromeApi.getSmartGroupName(tabs);

// ML auto-group
await chromeApi.mlAutoGroupAllTabs(options);

// Learn from assignment
await chromeApi.learnFromAssignment(tab, label);
```

#### Search Operations

```javascript
// Search all tabs
await chromeApi.searchAllTabs(searchTerm);
```

#### Chat Operations

```javascript
// Extract tab content
await chromeApi.extractTabContent(tabId);

// Extract group content
await chromeApi.extractGroupContent(groupId);

// Send chat message
await chromeApi.sendChatMessage(messages, context);

// Connect streaming chat
const cancelStream = chromeApi.connectChatStream(
  messages, 
  context,
  { onChunk, onEnd, onError }
);
```

#### Settings Operations

```javascript
// Save LLM config
await chromeApi.saveLLMConfig(config);

// Get LLM config
await chromeApi.getLLMConfig();
```

### Message Handler API

#### Request Format

```javascript
{
  action: "ACTION_NAME",
  // ... additional parameters
}
```

#### Response Format

```javascript
{
  success: true/false,
  // ... additional data or error
}
```

#### Available Actions

| Action | Handler | Parameters | Response |
|--------|---------|------------|----------|
| `GET_ALL_TABS` | tabHandlers | - | `{ tabs: [...] }` |
| `GET_GROUPS_WITH_TABS` | tabHandlers | - | `{ groups: [...], ungroupedTabs: [...] }` |
| `GROUP_TABS` | groupHandlers | `{ tabIds, groupName }` | `{ groupId }` |
| `GROUP_BY_DOMAIN` | groupHandlers | - | `{ groups: [...] }` |
| `CLASSIFY_TAB` | mlHandlers | `{ title, url }` | `{ classification }` |
| `SEND_CHAT_MESSAGE` | chatHandlers | `{ messages, context }` | Streaming |
| `SEARCH_ALL_TABS` | searchHandlers | `{ searchTerm }` | `{ results: [...] }` |

---

## Technical Specifications

### Performance Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Popup load time | < 200ms | ~100ms (cached) |
| Search response | < 100ms | ~50ms |
| ML classification | < 500ms | ~300ms |
| Group creation | < 1s | ~500ms |
| Bundle size (popup) | < 500KB | 455KB |
| Bundle size (background) | < 1MB | 1.07MB |

### Memory Management

```javascript
// TensorFlow.js tensor cleanup
async function classifyTab() {
  let embedding = null;
  let prediction = null;
  
  try {
    embedding = await useModel.embed([text]);
    prediction = model.predict(embedding);
    return result;
  } finally {
    if (embedding) embedding.dispose();
    if (prediction) prediction.dispose();
  }
}
```

### Storage Schema

```javascript
// chrome.storage.local structure
{
  // Cache
  cachedGroups: [...],
  cachedUngroupedTabs: [...],
  cacheTimestamp: number,
  
  // ML
  ml_model_weights: { weight_0: ..., weight_1: ... },
  userGeneratedTrainingData: [{ text, label }, ...],
  
  // LLM
  llm_settings: { provider, baseUrl, apiKey, model },
  
  // Settings
  auto_grouping_settings: { enabled, method },
  chat_history_settings: { retentionHours },
  ui_preferences: { defaultView, uiSize },
  
  // Domain customization
  custom_domain_settings: { domain: { emoji, name } },
  
  // Chat history
  chat_tab_<id>: { messages, timestamp },
  chat_group_<id>: { messages, timestamp }
}
```

### Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 88+ | ✅ Fully Supported |
| Edge | 88+ | ✅ Supported |
| Brave | 1.20+ | ✅ Supported |
| Firefox | N/A | ❌ Manifest V3 required |

### Build Configuration

```javascript
// webpack.config.js
{
  entry: {
    popup: './src/popup/index.js',
    sidepanel: './src/sidebar/sidepanel.js',
    background: './src/background/background.js',
    content: './src/content/content.js'
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
}
```

---

## Contributing

### Code Style

- ES6+ JavaScript
- React functional components with hooks
- Component-scoped CSS
- JSDoc comments for public APIs

### Pull Request Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes
4. Build extension (`npm run build`)
5. Test in Chrome
6. Submit pull request

### Testing Checklist

- [ ] Tab grouping works (domain, content, AI)
- [ ] Search returns accurate results
- [ ] Chat sends/receives messages
- [ ] Undo/redo functions within 60s window
- [ ] Settings persist across sessions
- [ ] ML classification accurate
- [ ] Dark mode displays correctly

---

## License

MIT License - See LICENSE file for details

---

## Changelog

### v1.1.1 (March 2026)
- ✅ Added undo/redo buttons to header toolbar
- ✅ Removed toast notification for undo
- ✅ Implemented 60-second undo window with stack-based approach
- ✅ Added redo functionality for re-deleting restored groups
- ✅ Updated Icons.js with Undo and Redo icons
- ✅ Added disabled state styling for header buttons

### v1.1.0 (Previous)
- Added side panel interface
- Improved chat citation system
- Enhanced ML training with user feedback
- Added domain customization with emoji picker

### v1.0.0 (Initial Release)
- Core tab grouping functionality
- ML-powered classification
- LLM chat integration
- Search functionality
- Settings management
