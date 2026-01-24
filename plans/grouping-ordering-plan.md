# Implementation Plan: Tab Grouping and Ordering

## Overview
This plan outlines the implementation of tab grouping and ordering functionality for the TabSynth Chrome Extension.

## Current Architecture
- **Grouping Methods**: Domain-based, Content-based, and merged strategies
- **Sorting**: Groups are sorted alphabetically by name after emoji prefix
- **Chrome API**: Uses chrome.tabs.group and chrome.tabs.move for positioning

## Key Files Modified
- [`src/background/utils/groupingAlgorithms.js`](../src/background/utils/groupingAlgorithms.js) - Implements grouping logic
- [`src/background/messageHandlers/groupHandlers.js`](../src/background/messageHandlers/groupHandlers.js) - Handles grouping messages
- [`src/hooks/useGroups.js`](../src/hooks/useGroups.js) - React hook for group management

## Features Implemented

### 1. Grouping Algorithms
- **Domain-based grouping**: Groups tabs by domain name
- **Content-based grouping**: Groups tabs by content type (using regular expressions)
- **Merge strategies**: Combines domain and content groups
- **Fallback mechanism**: Handles uncategorized tabs

### 2. Ordering
- **Sorting logic**: Groups are sorted alphabetically based on name after emoji prefix
- **Positioning**: Groups are moved to correct positions after creation
- **Emoji handling**: Strips emoji from group name before sorting

### 3. Chrome Extension API Integration
- **Group creation**: Uses chrome.tabs.group to create new groups
- **Group update**: Updates group properties (title, color) after creation
- **Group positioning**: Calculates and moves groups to correct alphabetical positions
- **Verification**: Ensures all tabs are correctly added to groups

## Testing
### Unit Tests
- UI Utils Tests (14 tests)
- Classifier Tests (5 tests)

### Manual Testing
1. Open several tabs with different domains and content types
2. Click "Group by Domain" or "Group by Content"
3. Verify that groups are created and sorted alphabetically
4. Check that all tabs are included in groups

## Performance Considerations
- Groups are processed with a small delay (100ms per group) to prevent API throttling
- Target positions are calculated efficiently using tab counts
- Chrome API calls are optimized by minimizing unnecessary operations

## Future Improvements
- Add more content categories
- Improve performance for large numbers of tabs
- Add support for custom group ordering
- Implement drag-and-drop functionality

## File Changes Summary

| File | Changes |
|------|---------|
| `src/background/utils/groupingAlgorithms.js` | Added sorting, position calculation, and verification logic |
| `src/background/messageHandlers/groupHandlers.js` | Updated grouping handlers |
| `src/hooks/useGroups.js` | Added group management functionality |

## Testing Checklist

- [x] Tabs are correctly grouped by domain
- [x] Tabs are correctly grouped by content
- [x] Groups are sorted alphabetically by name after emoji
- [x] All tabs are included in groups
- [x] Groups are positioned correctly in the tab strip
- [x] Unit tests pass
- [x] Performance is acceptable

## Data Flow
```
User clicks "Group Tabs" → groupTabsByDomain/groupTabsByContent → mergeGroupingStrategies → createTabGroups → Chrome API calls
```
