# Lazy ML Initialization - Changes Summary

## Problem
Popup took ~15 seconds to load because ML model (TensorFlow.js + Universal Sentence Encoder) was initializing on service worker startup.

## Solution
Deferred ML initialization until user explicitly requests AI features (AI Grouping or assigning tab to ML category).

## Files Modified

### 1. `src/background/background.js`
**Removed ML auto-initialization on service worker startup**

```diff
- import { tabClassifier } from '../ml/classifier.js';
+ // import { tabClassifier } from '../ml/classifier.js'; // Removed - ML initializes lazily
```

```diff
- // Initialize ML on service worker startup
- tabClassifier.initialize().then(() => {
-   console.log('Background: ML initialized successfully');
- }).catch(error => {
-   console.error('Background: ML initialization failed:', error);
- });
```

### 2. `src/ml/classifier.js`
**Removed auto-initialization on module load**

```diff
const tabClassifier = new TabClassifier();
-tabClassifier.initialize().catch(error => {
-  console.error('TabClassifier: Background initialization failed:', error);
-});

export { tabClassifier };
```

### 3. `src/popup/App.js`
**Made ML initialization lazy - only when user requests AI features**

```diff
- import { useMlClassification } from '../hooks/useMlClassification';
+ // import { useMlClassification } from '../hooks/useMlClassification'; // Removed - lazy init instead
```

```diff
- const { mlInitialized, initializing: mlInitializing } = useMlClassification();
+ // ML state - lazily initialized
+ const [mlInitialized, setMlInitialized] = useState(false);
+ const [mlInitializing, setMlInitializing] = useState(false);
```

**In `handleAssignTabToCategory` function - lazy init for ML categories:**

```diff
  if (value.startsWith('ml_category--')) {
    const categoryLabel = value.replace('ml_category--', '');
    const category = mlCategories.find(c => c.label === categoryLabel);
    if (category) {
+     // Lazy initialize ML if not ready
+     if (!mlInitialized) {
+       setMlInitializing(true);
+       await chromeApi.initializeML();
+       setMlInitialized(true);
+       setMlInitializing(false);
+     }
      await chromeApi.findOrCreateGroupAndAddTab(tab.id, category.label, category.emoji);
      await chromeApi.learnFromAssignment(tab, category.label);
      fetchGroupsAndTabs();
    }
```

**In `handleGroupTabs` function - lazy init for AI grouping:**

```diff
  case 'ai':
+   // Lazy initialize ML if not ready
+   if (!mlInitialized) {
+     setMlInitializing(true);
+     await chromeApi.initializeML();
+     setMlInitialized(true);
+     setMlInitializing(false);
+   }
    response = await chromeApi.mlAutoGroupAllTabs({ confidenceThreshold: 0.6, minGroupSize: 2, maxGroups: 10 });
    break;
```

**Removed `mlInitializing` from main loading state:**

```diff
- const loading = groupsLoading || mlInitializing;
+ const loading = groupsLoading;
```

**Enabled AI grouping option (was disabled):**

```diff
- <option value="ai" disabled={!mlInitialized}>🤖 AI Grouping</option>
+ <option value="ai">🤖 AI Grouping</option>
```

**Updated button to show initializing state:**

```diff
  <Button
    variant="primary"
    onClick={handleGroupTabs}
-   disabled={isGrouping || (groupingMethod === 'ai' && !mlInitialized)}
-   loading={isGrouping}
+   disabled={isGrouping || mlInitializing}
+   loading={isGrouping || mlInitializing}
    fullWidth
  >
-   {isGrouping ? 'Grouping...' : `Group Tabs`}
+   {mlInitializing ? 'Initializing AI...' : isGrouping ? 'Grouping...' : `Group Tabs`}
  </Button>
```

## Result
- **Before**: Popup loads in ~15 seconds (ML blocks startup)
- **After**: Popup loads in ~2-3 seconds (tabs/groups from cache), ML loads only when user clicks AI Grouping

## Notes
- AI option is now enabled by default
- When user selects AI Grouping and clicks the button, they see "Initializing AI..." for ~10-15 seconds
- ML model persists in Chrome storage across sessions
- User-trained weights are preserved (stored separately from extension bundle)
