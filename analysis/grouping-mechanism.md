# TabSynth Grouping Mechanism Analysis

## Overview

TabSynth implements a multi-faceted grouping system with three primary strategies for organizing tabs:
1. Domain-based grouping
2. Content-based grouping
3. AI/ML-based grouping

These strategies can be used individually or combined, and the system supports both manual and automatic grouping of tabs.

## Architecture

The grouping mechanism is implemented across several key files:

### Core Algorithm Files
- `src/background/utils/groupingAlgorithms.js` - Domain and content-based grouping logic
- `src/ml/classifier.js` - AI/ML classification and grouping
- `src/background/messageHandlers/groupHandlers.js` - Grouping command handlers
- `src/background/messageHandlers/mlHandlers.js` - ML command handlers
- `src/background/background.js` - Auto-grouping on tab creation

### Frontend Integration
- `src/hooks/useGroups.js` - State management for groups and ungrouped tabs
- `src/hooks/useMlClassification.js` - ML operations from React components
- `src/services/chromeApi.js` - API interface for communication with background

## Grouping Strategies

### 1. Domain-Based Grouping

#### Algorithm (`groupTabsByDomain`)
```javascript
// src/background/utils/groupingAlgorithms.js
export function groupTabsByDomain(tabs, domainSettings = {})
```
- Groups tabs by their domain (removing www. prefix)
- Handles custom domain settings (custom names/emojis)
- Excludes tabs that can't be grouped (e.g., chrome:// URLs)
- Returns groups with suggested names like "🌍 Example" and high confidence

#### Process:
1. Extract domain from tab URL
2. Check for custom domain settings
3. Create new group or add to existing domain group
4. Filter groups with >1 tab
5. Sort alphabetically

#### Handler (`handleGroupByDomain`)
- Fetches all tabs and custom domain settings
- Calls `groupTabsByDomain`
- Creates Chrome tab groups
- Returns results with group details

### 2. Content-Based Grouping

#### Algorithm (`groupTabsByContent`)
```javascript
// src/background/utils/groupingAlgorithms.js
export function groupTabsByContent(tabs)
```
- Uses regex patterns to match tab titles/URLs against predefined categories
- Categories include: Code & Development, Documentation, Q&A & Forums, Videos, Social Media, Shopping, Email, AI Tools, Cloud Storage, Meetings & Calendar
- Handles uncategorized tabs (groups them as "General Browsing" if ≥2 tabs)
- Returns groups with emoji prefixes and medium confidence

#### Process:
1. Iterate through tabs
2. Match against content patterns
3. Assign to category groups
4. Handle uncategorized tabs
5. Filter and sort groups

#### Handler (`handleGroupByContent`)
- Similar to domain handler, but uses `groupTabsByContent`
- Creates Chrome tab groups with appropriate colors

### 3. AI/ML-Based Grouping

#### Core Component (`TabClassifier`)
```javascript
// src/ml/classifier.js
class TabClassifier
```
- **Initialization**: Loads TensorFlow.js and Universal Sentence Encoder
- **Model Loading**: Attempts to load user-trained or pre-trained model
- **Classification**: Encodes tab title/URL using USE, then classifies with dense neural network
- **Fallback**: Rule-based classification if ML fails

#### Key Methods:
- `classifyTab`: Classifies a single tab with confidence score
- `getSmartGroupName`: Generates group name based on classification of tabs
- `mlAutoGroupAllTabs`: Auto-groups tabs using ML classification

#### Categories:
1. Code & Development
2. Documentation
3. Social Media
4. Shopping
5. News & Articles
6. Video & Entertainment
7. Productivity & Tools
8. Email & Communication
9. AI & Machine Learning
10. General Browsing

#### Auto-Grouping Process:
1. Classify all ungrouped tabs
2. Filter by confidence threshold (default: 0.6)
3. Group by category
4. Filter by minimum group size (default: 2)
5. Sort by tab count
6. Limit number of groups (default: 10)

#### Handler (`handleMlAutoGroupAllTabs`)
- Fetches ungrouped tabs
- Calls `mlAutoGroupAllTabs`
- Creates Chrome tab groups with emoji titles

## Auto-Grouping on Tab Creation

```javascript
// src/background/background.js
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    await autoGroupTab(tab);
  }
});
```

### Process:
1. Tab completes loading
2. Check if auto-grouping is enabled
3. Determine if tab should be auto-grouped (skips internal pages, new tabs, already grouped tabs)
4. Select grouping method based on settings (domain, content, or AI)
5. Find or create appropriate group
6. Add tab to group

## Hybrid Strategy

```javascript
// src/background/utils/groupingAlgorithms.js
export function mergeGroupingStrategies(domainGroups, contentGroups)
```
- Combines content groups and domain groups
- Ensures no tab is in multiple groups
- Content groups take precedence over domain groups

## Key Features

### Custom Domain Settings
```javascript
// src/hooks/useGroups.js
const handleSaveDomainSetting = async (domain, settings)
```
- Users can set custom names and emojis for specific domains
- Applied to existing groups when settings change

### Fallback Mechanisms
- All strategies have fallback options if primary method fails
- ML classifier falls back to rule-based if TensorFlow fails to load
- Invalid URLs are grouped as "Other Tabs"

### Training
```javascript
// src/ml/classifier.js
async trainWithUserData(trainingExamples)
```
- ML model can be trained with user-generated examples
- Collects training data from explicit tab assignments
- Retrains when enough data is collected (default: 50 examples)

### Performance Optimization
- Caching system for quick UI loading (stale-while-revalidate)
- Batch processing of tabs
- Lazy initialization of ML components

## UI Integration

### `useGroups` Hook
- Fetches groups and ungrouped tabs from cache and background
- Manages domain settings
- Provides handlers for grouping operations

### `useMlClassification` Hook
- Initializes ML model
- Handles ML auto-grouping
- Provides classification and smart naming functions

## Communication Flow

```
Frontend Component
    ↓
chromeApi service
    ↓
Background message handler
    ↓
Grouping/ML algorithm
    ↓
Chrome API
    ↓
Updated tab groups
    ↓
Cache updated
    ↓
Frontend re-render
```

## Configuration

### Auto-Grouping Settings
```javascript
// src/background/background.js
const autoGroupingSettings = settings.auto_grouping_settings || {};
```
- `enabled`: Whether auto-grouping is active
- `method`: Grouping strategy (domain, content, or ai)

### ML Settings
- `confidenceThreshold`: Minimum classification confidence (default: 0.6)
- `minGroupSize`: Minimum number of tabs per group (default: 2)
- `maxGroups`: Maximum number of groups to create (default: 10)

## Conclusion

The grouping mechanism in TabSynth is well-structured and comprehensive, offering multiple strategies to suit different user needs. The modular design allows for easy extension and maintenance, while the hybrid approach ensures effective tab organization even when some methods fail. The system balances performance and accuracy with fallback mechanisms and lazy initialization.
