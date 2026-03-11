# TabSense - AI-Powered Tab Manager

**Version:** 1.1.1 | **Manifest:** V3 | **Platform:** Chrome Extension

An intelligent Chrome extension that uses AI to automatically organize and manage your browser tabs. Features smart grouping, content analysis, and conversational AI for enhanced productivity.

![Version](https://img.shields.io/badge/version-1.1.1-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-green)
![React](https://img.shields.io/badge/react-18.2-blue)
![TensorFlow](https://img.shields.io/badge/tensorflow.js-3.21-orange)

---

## ✨ Features

### 🤖 AI-Powered Organization
- **Smart Classification:** 10 predefined categories using TensorFlow.js
- **Auto-Learning:** Model improves from your tab assignments
- **Fallback System:** Rule-based classification when ML unavailable

### 📁 Intelligent Grouping
- **Domain Grouping:** Group tabs by website (github.com, stackoverflow.com)
- **Content Grouping:** Pattern-based categorization
- **AI Grouping:** ML-powered intelligent organization
- **Custom Emojis:** Personalize domain group names and icons

### 🔍 Advanced Search
- Real-time search across all tabs
- Search by title or URL
- Highlighted matching terms
- Instant results

### 💬 Chat with Tabs
- Ask questions about webpage content
- Streaming responses with citations
- Multiple LLM providers (OpenRouter, OpenAI, custom)
- Chat history persistence

### 🔄 Undo/Redo
- 60-second window to undo group deletions
- Redo to re-delete restored groups
- Header toolbar buttons for quick access

### 🎨 Dual Interface
- **Popup:** Quick access from toolbar
- **Side Panel:** Full-featured panel view
- Dark mode support

---

## 🚀 Quick Start

### Installation

1. **Clone & Install**
   ```bash
   git clone <repository-url>
   cd TabSense
   npm install
   ```

2. **Build**
   ```bash
   npm run build
   ```

3. **Load in Chrome**
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/` folder

### Development

```bash
# Watch mode (auto-rebuild)
npm run watch

# Production build
npm run build

# Train ML model
npm run train
```

---

## 📚 Documentation

- **[Comprehensive Documentation](./COMPREHENSIVE_DOCUMENTATION.md)** - Full technical docs
- **[Analysis](./analysis/)** - Technical analysis documents
- **[Plans](./plans/)** - Implementation plans

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  TabSense Extension                  │
├─────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │    Popup     │  │   Sidebar    │  │  Content  │ │
│  │   (React)    │  │   (React)    │  │  Script   │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                  │                 │       │
│         └──────────────────┼─────────────────┘       │
│                            │                         │
│                   ┌────────▼────────┐               │
│                   │  chromeApi.js   │               │
│                   │   (Service)     │               │
│                   └────────┬────────┘               │
│                            │                         │
│         ┌──────────────────┼─────────────────┐      │
│         │                  │                 │      │
│  ┌──────▼──────┐   ┌───────▼───────┐  ┌─────▼────┐ │
│  │   Group     │   │      ML       │  │   Chat   │ │
│  │  Handlers   │   │   Handlers    │  │ Handlers │ │
│  └─────────────┘   └───────────────┘  └──────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │         Background Service Worker               │ │
│  │  - Proactive caching                            │ │
│  │  - Event listeners                              │ │
│  │  - Message routing                              │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 🧠 ML Categories

| Category | Emoji | Examples |
|----------|-------|----------|
| Code & Development | 💻 | GitHub, Stack Overflow, API docs |
| Documentation | 📚 | Tutorials, guides, references |
| Social Media | 🐦 | Twitter, Reddit, Facebook |
| Shopping | 🛒 | Amazon, eBay, online stores |
| News & Articles | 📰 | News sites, Medium, blogs |
| Video & Entertainment | 🎬 | YouTube, Netflix, streaming |
| Productivity & Tools | ⚡ | Notion, Google Drive, calendars |
| Email & Communication | 📧 | Gmail, Outlook, email clients |
| AI & Machine Learning | 🤖 | ChatGPT, Claude, AI tools |
| General Browsing | 🌐 | Google, Wikipedia, other |

---

## ⚙️ Configuration

### LLM Settings

Configure in Settings view:

| Provider | Base URL | Example Model |
|----------|----------|---------------|
| OpenRouter | https://openrouter.ai/api/v1 | meta-llama/llama-3-8b-instruct |
| OpenAI | https://api.openai.com/v1 | gpt-4o-mini |
| Custom | Your endpoint | Any compatible model |

### Auto-Grouping

Enable automatic grouping for new tabs:
- **Domain:** Group by website domain
- **Content:** Pattern-based grouping
- **AI:** ML-powered categorization

---

## 📦 Project Structure

```
TabSense/
├── src/
│   ├── background/         # Service worker & handlers
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── ml/                # ML classifier & models
│   ├── popup/             # Popup UI
│   ├── sidebar/           # Side panel UI
│   ├── services/          # Service layer
│   └── utils/             # Utilities
├── build/                 # Compiled extension
├── training-data.csv      # ML training data
├── train-model.js         # Training script
└── webpack.config.js      # Build config
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18.2, JavaScript ES6+ |
| **ML** | TensorFlow.js 3.21, Universal Sentence Encoder |
| **LLM** | OpenRouter API, OpenAI-compatible |
| **Build** | Webpack 5, Babel 7 |
| **Platform** | Chrome Extension Manifest V3 |

---

## 🎯 Key APIs Used

### Chrome Extension APIs
- `chrome.tabs` - Tab management
- `chrome.tabGroups` - Group operations
- `chrome.storage.local` - Data persistence
- `chrome.scripting` - Content extraction
- `chrome.sidePanel` - Side panel interface

### Message Passing
```javascript
// Request
chrome.runtime.sendMessage({ 
  action: "GROUP_TABS", 
  tabIds: [1, 2, 3], 
  groupName: "My Group" 
});

// Response
{ success: true, groupId: 5, tabCount: 3 }
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Install extension successfully
- [ ] Group tabs by domain
- [ ] Group tabs by content
- [ ] Group tabs by AI
- [ ] Search across tabs
- [ ] Chat with a tab
- [ ] Delete and undo group deletion
- [ ] Customize domain emoji
- [ ] Configure LLM settings
- [ ] Dark mode displays correctly

### Build Verification

```bash
npm run build
# Check for errors (warnings about bundle size are OK)
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Build extension (`npm run build`)
5. Test in Chrome
6. Submit pull request

### Code Style
- ES6+ JavaScript
- React functional components with hooks
- Component-scoped CSS
- JSDoc for public APIs

---

## 📝 Changelog

### v1.1.1 (March 2026)
- ✅ Added undo/redo buttons to header toolbar
- ✅ Removed toast notification for undo
- ✅ Implemented 60-second undo window
- ✅ Added redo functionality

### v1.1.0
- Added side panel interface
- Improved chat citation system
- Enhanced ML training
- Domain customization

### v1.0.0
- Initial release
- Core tab grouping
- ML classification
- LLM chat integration

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- [TensorFlow.js](https://www.tensorflow.org/js) - Machine learning in the browser
- [Universal Sentence Encoder](https://tfhub.dev/google/universal-sentence-encoder/1) - Text embeddings
- [OpenRouter](https://openrouter.ai) - LLM API provider
- [React](https://react.dev) - UI framework

---

## 📧 Support

- **Documentation:** [COMPREHENSIVE_DOCUMENTATION.md](./COMPREHENSIVE_DOCUMENTATION.md)
- **Issues:** GitHub Issues
- **Privacy:** No data collected. API keys stored locally in Chrome storage.

---

<div align="center">

**TabSense** - Organize. Search. Chat.

Made with ❤️ using React + TensorFlow.js

</div>
