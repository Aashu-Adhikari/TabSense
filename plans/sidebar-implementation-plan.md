# Sidebar Implementation Plan for TabSynth

## Overview

Add a Chrome Side Panel to TabSynth that persists alongside the browser, providing extended tab management capabilities beyond the popup. Users can choose their preferred interface.

## Architecture

```
┌─────────────────────────────────────────┐
│  Browser Toolbar                        │
├────────┬────────────────────────────────┤
│        │  TabSynth Side Panel           │
│ Page   │  ┌────────────────────────────┐│
│        │  │ [Chat with this tab]       ││
│        │  │ 🔍 Search tabs...          ││
│        │  │                            ││
│        │  │ 📁 Groups (6)              ││
│        │  │ ├── 💻 Dev (4 tabs)        ││
│        │  │ ├── 📚 Docs (2 tabs)       ││
│        │  │ ├── 🐦 Social (3 tabs)     ││
│        │  │                            ││
│        │  │ 📋 Ungrouped (8)           ││
│        │  │ [🌐 Domain] [📋 Content]   ││
│        │  │ [🤖 AI Grouping]           ││
│        │  └────────────────────────────┘│
│        │                                │
└────────┴────────────────────────────────┘
```

## Dual Interface Design

### User Preference Selection

Users can choose their preferred interface in Settings:

```
┌─────────────────────────────────────┐
│  Preferred View:                    │
│  ○ Popup (default)                  │
│  ○ Sidebar (persistent)             │
└─────────────────────────────────────┘
```

| Feature | Popup | Sidebar |
|---------|-------|---------|
| Quick access | Click icon | Pin icon |
| Persistent | Closes on blur | Stays open |
| Chat | ✅ | ✅ |
| Tab management | ✅ | ✅ |
| AI grouping | ✅ | ✅ |
| Search | ✅ | ✅ |

### Both Can Be Active

Users can use both interfaces interchangeably:
- Popup for quick actions
- Sidebar for extended work
- Toggle between them freely

## Files to Create/Modify

### New Files
- `src/sidepanel/sidepanel.html` - Side panel HTML entry point
- `src/sidepanel/SidepanelApp.js` - Main React component for side panel
- `src/sidepanel/sidepanel.css` - Side panel specific styles
- `src/sidepanel/index.js` - Side panel entry point (React mount)

### Modified Files
- `src/manifest.json` - Add side_panel permission and configuration
- `src/background/background.js` - Add side panel open/close handlers
- `src/components/SettingsView.js` - Add "Preferred View" setting

## Implementation Steps

### Step 1: Update manifest.json

```json
{
  "manifest_version": 3,
  "name": "TabSynth",
  "side_panel": {
    "default_path": "sidepanel.html",
    "open_at_install": false
  },
  "permissions": [
    "tabs",
    "tabGroups",
    "storage",
    "sidePanel"
  ],
  "action": {
    "default_popup": "popup.html"
  }
}
```

### Step 2: Create sidepanel.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TabSynth</title>
  <link rel="stylesheet" href="sidepanel.css">
</head>
<body>
  <div id="root"></div>
  <script src="index.js"></script>
</body>
</html>
```

### Step 3: Create SidepanelApp.js

Reuse components from popup where possible:
- `App.js` → `SidepanelApp.js` (extend functionality)
- `GroupCard.js` (unchanged)
- `SearchResultsView.js` (unchanged)
- `ChatView.js` (enhanced for side panel)

**Key differences from popup:**
- Wider layout (350px vs 400px popup)
- Persistent state across navigation
- Enhanced chat view (more space for conversation)
- Quick actions toolbar

### Step 4: Add Side Panel Toggle to Popup

In `src/popup/App.js`, add a button to open side panel:

```javascript
<Button
  variant="secondary"
  icon="📑"
  onClick={() => chrome.sidePanel.open()}
>
  Open Side Panel
</Button>
```

### Step 5: Add Preferred View Setting

In `src/components/SettingsView.js`, add:

```javascript
// Add to state
const [preferredView, setPreferredView] = useState('popup');

// Add to settings form
<div className="form-group">
  <label>Preferred View</label>
  <select 
    value={preferredView} 
    onChange={(e) => {
      setPreferredView(e.target.value);
      chrome.storage.local.set({ preferredView: e.target.value });
    }}
    className="settings-select"
  >
    <option value="popup">Popup (default)</option>
    <option value="sidebar">Sidebar (persistent)</option>
  </select>
  <p className="settings-hint">
    Popup: Quick access via toolbar icon. Sidebar: Persistent panel.
  </p>
</div>
```

### Step 6: Handle Toolbar Icon Behavior

```javascript
// In background.js - handle toolbar icon click based on preference
chrome.action.onClicked.addListener(async (tab) => {
  const result = await chrome.storage.local.get(['preferredView']);
  const preferredView = result.preferredView || 'popup';
  
  if (preferredView === 'sidebar') {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
  // If popup, default behavior handles it
});
```

### Step 7: Handle Side Panel Events in Background

```javascript
// Keep side panel synchronized with current tab
chrome.tabs.onActivated.addListener((activeInfo) => {
  // Update side panel state for new active tab
});

// Close side panel when all tabs closed in window
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // Check if no more tabs in window, optionally close side panel
});
```

## Component Enhancements for Side Panel

### SidepanelApp.js Features
1. **Persistent Header** - Always visible, shows current window tab count
2. **Enhanced Search** - Larger input, instant results
3. **Full Chat View** - More vertical space for conversations
4. **Quick Actions** - Pin, close, move tab actions
5. **Tab Preview** - Hover to preview tab content

### Shared Components (no changes)
- `GroupCard.js` - Display groups (works same)
- `SearchResultsView.js` - Search results (works same)
- `Button.js` - Reusable button (works same)

### Modified Components
- `SettingsView.js` - Add "Preferred View" setting

## Styling (sidepanel.css)

```css
.sidepanel-container {
  width: 350px;
  height: 100vh;
  overflow-y: auto;
  background: #1e1e1e;
  color: #e0e0e0;
}

.sidepanel-header {
  padding: 16px;
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidepanel-main {
  padding: 12px;
}

.chat-container {
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
}
```

## Build Configuration

Update `webpack.config.js` to include side panel files:

```javascript
entry: {
  popup: './src/popup/index.js',
  sidepanel: './src/sidepanel/index.js',
  background: './src/background/background.js',
  content: './src/content/content.js'
},
output: {
  path: path.resolve(__dirname, 'build'),
  filename: '[name].js'
}
```

## User Experience Flow

```
1. User installs TabSynth
2. User opens settings → selects "Sidebar" as preferred view
3. User clicks extension icon → side panel opens
4. Side panel persists while browsing
5. User can:
   - Chat with current tab
   - Search all tabs
   - Manage groups
   - AI group tabs
   - Toggle back to popup anytime
```

## Testing Checklist

- [ ] Side panel opens from popup button
- [ ] Side panel persists across page navigation
- [ ] Tab list updates in real-time
- [ ] Chat functionality works in side panel
- [ ] AI grouping works from side panel
- [ ] Styling is consistent with popup
- [ ] Build produces sidepanel.js
- [ ] Extension loads without errors
- [ ] Preferred View setting saves correctly
- [ ] Toolbar icon respects preferred view setting
- [ ] Both popup and sidebar work simultaneously

## Reuse Strategy

| Component | Popup | Sidebar | Notes |
|-----------|-------|---------|-------|
| App.js | ✅ | → SidepanelApp.js | 80% reuse |
| GroupCard.js | ✅ | ✅ | No changes |
| ChatView.js | ✅ | ✅ | No changes |
| SearchResultsView.js | ✅ | ✅ | No changes |
| useGroups hook | ✅ | ✅ | No changes |
| useSearch hook | ✅ | ✅ | No changes |
| chromeApi service | ✅ | ✅ | No changes |
| ml classifier | ✅ | ✅ | No changes |

## Estimated Effort

| Task | Time |
|------|------|
| Manifest updates | 10 min |
| Side panel HTML/CSS | 30 min |
| SidepanelApp.js | 2 hours |
| Settings for preferred view | 30 min |
| Background handlers | 30 min |
| Component sharing | 1 hour |
| Testing | 1.5 hours |
| **Total** | ~6 hours |

## Future Enhancements (Post-MVP)

- Dark/Light theme toggle
- Side panel width customization
- Keyboard shortcuts
- Tab bookmarking
- Session saving/loading
