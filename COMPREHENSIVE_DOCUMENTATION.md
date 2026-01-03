# TabSynth - Comprehensive Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Structure](#architecture--structure)
3. [Machine Learning System](#machine-learning-system)
4. [Chrome Extension Integration](#chrome-extension-integration)
5. [UI Components & Styling](#ui-components--styling)
6. [Tab Management Logic](#tab-management-logic)
7. [API Services & Message Handling](#api-services--message-handling)
8. [Installation & Usage Guide](#installation--usage-guide)
9. [Development Workflow](#development-workflow)
10. [Technical Specifications](#technical-specifications)

---

## Project Overview

**TabSynth** is an AI-powered Chrome extension that intelligently organizes browser tabs using machine learning. It combines traditional tab management with advanced AI classification to create meaningful tab groups based on content, domain, and learned user behavior.

### Key Features
- 🤖 **AI-Powered Tab Classification**: Uses TensorFlow.js and Universal Sentence Encoder for content analysis
- 📁 **Smart Grouping**: Multiple grouping methods including domain-based, content-based, and AI-based grouping
- 🔍 **Advanced Search**: Real-time search across all tabs by title or URL
- 🧠 **Adaptive Learning**: AI learns from user assignments to improve accuracy
- ⚡ **Modern Architecture**: Manifest V3, React-based UI, service worker background processing
- 📱 **Intuitive Interface**: Clean popup UI with emoji-based categorization

---

## Architecture & Structure

### Project Structure
```
src/
├── background/                 # Service worker and message handlers
│   ├── background.js          # Main service worker
│   ├── messageHandlers/       # Modular message handlers
│   │   ├── tabHandlers.js     # Tab management operations
│   │   ├── groupHandlers.js   # Grouping operations
│   │   ├── searchHandlers.js  # Search functionality
│   │   └── mlHandlers.js      # Machine learning operations
│   └── utils/
│       └── groupingAlgorithms.js # Grouping algorithms
├── components/                # React components
│   ├── GroupCard.js          # Group display component
│   ├── SearchResultsView.js  # Search results component
│   └── common/
│       └── Button.js         # Reusable button component
├── containers/
│   └── PopupApp.js          # Main container component
├── hooks/                    # Custom React hooks
│   ├── useGroups.js         # Groups state management
│   ├── useSearch.js         # Search functionality
│   └── useMlClassification.js # ML classification hook
├── ml/                       # Machine learning components
│   ├── classifier.js        # Main ML classifier
│   ├── training-data.js     # Training data management
│   └── pretrained-model/    # Pre-trained model files
│       ├── model.json       # Model architecture
│       └── weights.bin      # Model weights
├── popup/                    # Chrome extension popup
│   ├── App.js              # Main popup component
│   ├── popup.html          # HTML template
│   ├── popup.css           # Popup styles
│   └── index.js            # Popup entry point
├── services/
│   └── chromeApi.js        # Chrome API service layer
├── styles/                  # CSS styles
│   ├── components/         # Component-specific styles
│   │   ├── groups.css      # Groups styling
│   │   └── search.css      # Search styling
│   └── utilities/          # Utility styles
└── utils/
    ├── mlCategories.js     # AI categories definitions
    └── uiUtils.js          # UI utilities
```

### Core Technologies
- **Frontend**: React 18.2.0, JavaScript ES6+
- **Machine Learning**: TensorFlow.js 3.21.0, Universal Sentence Encoder 1.3.3
- **Build System**: Webpack 5.87.0, Babel 7.22.5
- **Chrome Extension**: Manifest V3
- **Styling**: CSS3 with CSS Modules
- **State Management**: React Hooks (useState, useEffect)

---

## Machine Learning System

### Classification Categories
The AI system uses 10 predefined categories for tab classification:

| Category | Emoji | Description |
|----------|-------|-------------|
| Code & Development | 💻 | Programming, APIs, documentation |
| Documentation | 📚 | Tutorials, guides, references |
| Social Media | 🐦 | Twitter, Facebook, Reddit, social platforms |
| Shopping | 🛒 | E-commerce, product pages, shopping sites |
| News & Articles | 📰 | News sites, blogs, Medium articles |
| Video & Entertainment | 🎬 | YouTube, Netflix, streaming platforms |
| Productivity & Tools | ⚡ | Notion, Drive, calendars, productivity apps |
| Email & Communication | 📧 | Gmail, Outlook, email clients |
| AI & Machine Learning | 🤖 | ChatGPT, OpenAI, ML resources |
| General Browsing | 🌐 | Miscellaneous browsing |

### ML Classifier Architecture

#### Core Components
```javascript
class TabClassifier {
  // TensorFlow.js models
  this.model = null;           // Custom classification model
  this.useModel = null;        // Universal Sentence Encoder
  
  // Configuration
  this.categories = [...];     // 10 predefined categories
  this.initialized = false;    // Initialization status
  this.useFallbackOnly = false; // Fallback mode flag
}
```

#### Model Loading Strategy
1. **User-trained weights**: First priority - loads from Chrome storage
2. **Pre-trained model**: Second priority - loads from extension bundle
3. **Fallback classification**: Rule-based classification if ML fails

#### Classification Process
1. **Text Processing**: Combines tab title and domain into input text
2. **Embedding Generation**: Uses Universal Sentence Encoder to create embeddings
3. **Neural Network Prediction**: Custom TensorFlow.js model predicts category
4. **Confidence Scoring**: Returns category with confidence score
5. **Fallback**: Rule-based classification if confidence < threshold

#### Training System
- **User Feedback Learning**: Learns from user tab-to-category assignments
- **Incremental Training**: Fine-tunes model with user data
- **Weight Persistence**: Saves trained weights to Chrome storage
- **Minimum Data**: Requires 5+ training examples for effective learning

### Fallback Classification
When ML is unavailable or confidence is low, uses rule-based classification:

```javascript
const rules = [
  { pattern: /github|gitlab|stack overflow|code|api|docs?\./, category: 'Code & Development' },
  { pattern: /docs?|documentation|tutorial|guide|reference/, category: 'Documentation' },
  { pattern: /twitter|facebook|instagram|reddit|social/, category: 'Social Media' },
  // ... more rules
];
```

---

## Chrome Extension Integration

### Manifest V3 Configuration
```json
{
  "manifest_version": 3,
  "name": "TabSynth (Dev)",
  "version": "1.0.0",
  "description": "Tab organizer and research assistant.",
  "action": {
    "default_popup": "popup.html",
    "default_title": "TabSynth"
  },
  "background": {
    "service_worker": "background.js"
  },
  "permissions": [
    "tabs",
    "tabGroups",
    "storage"
  ],
  "web_accessible_resources": [
    {
      "resources": [
        "ml/pretrained-model/model.json",
        "ml/pretrained-model/group1-shard1of1.bin"
      ],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### Permissions Explained
- **tabs**: Access to tab information and manipulation
- **tabGroups**: Create and manage tab groups
- **storage**: Save ML model weights and user preferences
- **web_accessible_resources**: Load ML model files

### Service Worker Architecture
The background service worker (`background.js`) serves as the central message router:

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Tab handlers
  if (request.action === "GET_ALL_TABS") return tabHandlers.handleGetAllTabs(request, sendResponse);
  if (request.action === "GET_GROUPS_WITH_TABS") return tabHandlers.handleGetGroupsWithTabs(request, sendResponse);
  
  // Group handlers
  if (request.action === "GROUP_TABS") return groupHandlers.handleGroupTabs(request, sendResponse);
  if (request.action === "AUTO_GROUP_TABS") return groupHandlers.handleAutoGroupTabs(request, sendResponse);
  
  // ML handlers
  if (request.action === "CLASSIFY_TAB") return mlHandlers.handleClassifyTab(request, sendResponse);
  if (request.action === "LEARN_FROM_ASSIGNMENT") {
    mlHandlers.handleLearnFromAssignment(request);
    return false; // No response needed
  }
  
  // Default response
  sendResponse({ success: false, error: `Unknown action: ${request.action}` });
  return false;
});
```

### Event Listeners
The service worker maintains real-time tab cache through event listeners:

```javascript
// Tab events
chrome.tabs.onCreated.addListener(updateTabCache);
chrome.tabs.onRemoved.addListener(updateTabCache);
chrome.tabs.onUpdated.addListener(updateTabCache);
chrome.tabs.onMoved.addListener(updateTabCache);
chrome.tabs.onAttached.addListener(updateTabCache);
chrome.tabs.onDetached.addListener(updateTabCache);

// Tab group events
chrome.tabGroups.onCreated.addListener(updateTabCache);
chrome.tabGroups.onRemoved.addListener(updateTabCache);
chrome.tabGroups.onUpdated.addListener(updateTabCache);
chrome.tabGroups.onMoved.addListener(updateTabCache);

// Extension lifecycle
chrome.runtime.onStartup.addListener(updateTabCache);
chrome.runtime.onInstalled.addListener(updateTabCache);
```

---

## UI Components & Styling

### Main Application Component
The popup UI is built with React and follows a modular component architecture:

#### App.js - Main Component
- **State Management**: Uses custom hooks for groups, search, and ML
- **Grouping Methods**: Domain, content, and AI-based grouping
- **Dynamic UI**: Real-time search, loading states, error handling
- **Interactive Elements**: Expandable groups, rename functionality, tab assignment

#### Component Hierarchy
```
App.js (Main)
├── Header (Title & Subtitle)
├── Search Container
│   ├── Search Input
│   ├── Search Actions
│   └── Search Hint
├── Groups Section
│   ├── Section Header (Expand/Collapse All)
│   └── Groups List
│       └── GroupCard (for each group)
├── Ungrouped Tabs Section
│   ├── Grouping Controls
│   │   ├── Method Selector
│   │   └── Group Button
│   └── Ungrouped Tabs List
│       └── Tab Items (with assignment dropdown)
└── Footer (Refresh button)
```

### Custom React Hooks

#### useGroups.js
```javascript
export const useGroups = () => {
  // State
  const [groups, setGroups] = useState([]);
  const [ungroupedTabs, setUngroupedTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Key feature: Stale-while-revalidate caching
  const fetchGroupsAndTabs = async () => {
    // 1. Load from cache for fast UI
    const cachedData = await new Promise(resolve => {
      chrome.storage.local.get(['cachedGroups', 'cachedUngroupedTabs'], resolve);
    });
    
    // 2. Fetch fresh data in background
    const freshResponse = await chromeApi.getGroupsWithTabs();
    // 3. Update UI with fresh data
  };
};
```

#### useSearch.js
- Real-time search across all tabs
- Debounced input handling
- Loading states and error handling

#### useMlClassification.js
- ML initialization management
- Classification state tracking
- Error handling for ML operations

### Styling Architecture
- **Component-specific CSS**: Separate files for each component
- **CSS Modules**: Scoped styling to prevent conflicts
- **Utility classes**: Common styling patterns
- **Responsive design**: Mobile-friendly popup sizing

#### Key Styling Files
- `popup.css`: Main popup container and layout
- `groups.css`: Group display and interaction styles
- `search.css`: Search interface styling

---

## Tab Management Logic

### Grouping Algorithms

#### Domain-Based Grouping
```javascript
// Groups tabs by website domain
const groupTabsByDomain = (tabs) => {
  const domainGroups = {};
  tabs.forEach(tab => {
    const domain = extractDomain(tab.url);
    if (!domainGroups[domain]) {
      domainGroups[domain] = [];
    }
    domainGroups[domain].push(tab);
  });
  return domainGroups;
};
```

#### Content-Based Grouping
- Analyzes tab titles and URLs for content patterns
- Groups similar content types together
- Uses keyword matching and semantic analysis

#### AI-Based Grouping
```javascript
// ML-powered intelligent grouping
const mlAutoGroupAllTabs = async (ungroupedTabs, options = {}) => {
  const {
    confidenceThreshold = 0.6,
    minGroupSize = 2,
    maxGroups = 10
  } = options;

  // 1. Classify all tabs
  const classifications = await Promise.all(
    ungroupedTabs.map(async (tab) => ({
      tab,
      classification: await tabClassifier.classifyTab(tab.title, tab.url)
    }))
  );

  // 2. Filter by confidence
  const validTabs = classifications.filter(item => 
    item.classification.confidence >= confidenceThreshold
  );

  // 3. Group by category
  const categoryGroups = {};
  validTabs.forEach(({ tab, classification }) => {
    const category = classification.category;
    if (!categoryGroups[category]) {
      categoryGroups[category] = { tabs: [], totalConfidence: 0 };
    }
    categoryGroups[category].tabs.push(tab);
    categoryGroups[category].totalConfidence += classification.confidence;
  });

  // 4. Create final groups
  return Object.values(categoryGroups)
    .filter(group => group.tabs.length >= minGroupSize)
    .slice(0, maxGroups);
};
```

### Search Functionality
- **Real-time search**: Searches as user types
- **Multi-field search**: Searches both title and URL
- **Performance optimization**: Debounced input, efficient filtering
- **Results display**: Clean, organized search results view

### Cache Management
- **Stale-while-revalidate**: Fast loading from cache, background updates
- **Chrome storage API**: Persistent storage for groups and tabs
- **Real-time synchronization**: Event-driven cache updates

---

## API Services & Message Handling

### ChromeApiService
Provides a clean abstraction layer for Chrome extension APIs:

```javascript
class ChromeApiService {
  // Tab operations
  async getAllTabs() { /* ... */ }
  async getGroupsWithTabs() { /* ... */ }
  
  // Group operations
  async groupTabs(tabIds, groupName) { /* ... */ }
  async groupByDomain() { /* ... */ }
  async groupByContent() { /* ... ... */ }
  
  // ML operations
  async classifyTab(title, url) { /* ... */ }
  async mlAutoGroupAllTabs(options) { /* ... */ }
  async learnFromAssignment(tab, correctLabel) { /* ... */ }
  
  // Search
  async searchAllTabs(searchTerm) { /* ... */ }
}
```

### Message Handler Architecture
Modular message handlers for different functionality areas:

#### tabHandlers.js
- `handleGetAllTabs()`: Retrieve all browser tabs
- `handleGetGroupsWithTabs()`: Get groups with their associated tabs
- `handleUngroupSingleTab()`: Remove tab from group
- `handleAddToGroup()`: Add tab to existing group

#### groupHandlers.js
- `handleGroupTabs()`: Create new group with selected tabs
- `handleAutoGroupTabs()`: Automatic grouping (legacy)
- `handleGroupByDomain()`: Domain-based grouping
- `handleGroupByContent()`: Content-based grouping
- `handleFindOrCreateGroupAndAddTab()`: Smart group finding/creation

#### searchHandlers.js
- `handleSearchAllTabs()`: Search functionality implementation

#### mlHandlers.js
- `handleClassifyTab()`: ML-based tab classification
- `handleInitializeML()`: Initialize ML models
- `handleLearnFromAssignment()`: Process user learning feedback
- `handleMlAutoGroupAllTabs()`: AI-powered grouping

### Learning System
The ML system learns from user behavior through a sophisticated feedback loop:

```javascript
const handleLearnFromAssignment = async (request) => {
  const { tab, correctLabel } = request;
  
  // 1. Store training example
  const trainingExample = {
    text: `${tab.title} ${extractDomain(tab.url)}`,
    label: correctLabel
  };
  
  // 2. Add to training data
  await addTrainingExample(trainingExample);
  
  // 3. Retrain model if enough data
  const allTrainingData = await getAllTrainingData();
  if (allTrainingData.length >= 5) {
    await tabClassifier.trainWithUserData(allTrainingData);
  }
};
```

---

## Installation & Usage Guide

### Prerequisites
- Node.js v14 or higher
- npm or yarn package manager
- Chrome browser (for extension testing)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TabSynth
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `build` folder

### Usage Instructions

#### Basic Tab Management
1. **Open TabSynth**: Click the extension icon in Chrome toolbar
2. **View Groups**: See existing tab groups in the popup
3. **Search Tabs**: Use the search bar to find specific tabs
4. **Manage Groups**: Expand/
