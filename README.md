# TabSynth - AI-Powered Tab Manager

An intelligent Chrome extension that uses AI to automatically organize and manage your browser tabs. Features smart grouping, content analysis, and conversational AI for enhanced productivity.

## Project Structure

```
├── src/
│   ├── background/         # Background service worker
│   ├── content/          # Content scripts
│   ├── popup/            # Popup UI (React)
│   └── manifest.json     # Extension manifest
├── build/                # Built extension files
├── public/               # Static files
├── webpack.config.js     # Webpack configuration
└── package.json         # Project dependencies and scripts
```

## Features

- **Smart Tab Management**: Organize browser tabs with intelligent grouping
- **AI-Powered Classification**: Uses machine learning to categorize tabs by content
- **Automatic Grouping**: Optionally auto-group new tabs as they're opened
- **Manual Grouping**: Group tabs by domain, content, or AI classification
- **Chat with Tabs**: Ask questions about webpage content using AI
- **Customizable Settings**: Configure AI providers, models, and grouping preferences
- **Manifest V3 compliant**
- **React popup UI**
- **Background service worker**
- **Content scripts for page interaction**
- **Webpack bundling with Babel**
- **CSS styling**

### Auto-Grouping Feature

When enabled in settings, new tabs are automatically grouped based on your chosen method:

- **Domain Grouping**: Groups tabs by website domain
- **Content Grouping**: Groups based on page content analysis
- **AI Grouping**: Uses machine learning to intelligently categorize tabs

Auto-grouping can be enabled/disabled and configured in the extension settings.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd chrome-extension-react
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Watch for changes:
   ```bash
   npm run watch
   ```

### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `build` folder

## Components

### Popup UI (React)

The popup UI is built with React and is located in `src/popup/`:
- `popup.html` - HTML template
- `popup.css` - Styles
- `App.js` - Main React component
- `index.js` - Entry point

### Background Service Worker

The background service worker handles extension lifecycle events and messages:
- `src/background/background.js`

### Content Scripts

Content scripts interact with web pages:
- `src/content/content.js`

## Building

The extension is built using Webpack:
- React components are bundled and optimized
- CSS is processed and included
- All files are output to the `build/` directory

## Chrome Extension Permissions

The extension requests the following permissions:
- `activeTab` - Access to the active tab
- `storage` - Local storage for settings
- `scripting` - For injecting scripts into pages
- `http://*/*`, `https://*/*` - Host permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Build the extension (`npm run build`)
5. Test in Chrome
6. Submit a pull request

## License

MIT
