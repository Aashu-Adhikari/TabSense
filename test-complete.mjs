// Test the complete grouping and ordering functionality

import {
  groupTabsByDomain,
  groupTabsByContent,
  mergeGroupingStrategies
} from './src/background/utils/groupingAlgorithms.js';

// Test data with various tab types
const testTabs = [
  { id: 1, title: 'Google Search', url: 'https://www.google.com/search', windowId: 1 },
  { id: 2, title: 'OpenRouter AI', url: 'https://openrouter.ai', windowId: 1 },
  { id: 3, title: 'GitHub Repository', url: 'https://github.com/user/repo', windowId: 1 },
  { id: 4, title: 'Facebook Home', url: 'https://www.facebook.com', windowId: 1 },
  { id: 5, title: 'Amazon Shopping', url: 'https://www.amazon.com', windowId: 1 },
  { id: 6, title: 'Docs - Google', url: 'https://docs.google.com', windowId: 1 },
  { id: 7, title: 'ChatGPT', url: 'https://chat.openai.com', windowId: 1 },
  { id: 8, title: 'YouTube Video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', windowId: 1 },
  { id: 9, title: 'Reddit', url: 'https://www.reddit.com/r/webdev', windowId: 1 },
  { id: 10, title: 'LinkedIn', url: 'https://www.linkedin.com', windowId: 1 },
  { id: 11, title: 'Twitter', url: 'https://twitter.com', windowId: 1 }
];

console.log('=== Testing Complete Grouping Functionality ===');
console.log(`Total tabs to group: ${testTabs.length}\n`);

// Test domain-based grouping
const domainGroups = groupTabsByDomain(testTabs);
console.log('--- Domain-Based Groups ---');
domainGroups.forEach(group => {
  console.log(`${group.suggestedName} (${group.tabs.length} tabs)`);
});

console.log('\n--- Content-Based Groups ---');
const contentGroups = groupTabsByContent(testTabs);
contentGroups.forEach(group => {
  console.log(`${group.suggestedName} (${group.tabs.length} tabs)`);
});

console.log('\n--- Merged Groups ---');
const mergedGroups = mergeGroupingStrategies(domainGroups, contentGroups);
mergedGroups.forEach(group => {
  console.log(`${group.suggestedName} (${group.tabs.length} tabs)`);
});

console.log('\n=== Verification ===');

// Verify all groups are sorted alphabetically
const isSorted = (arr) => {
  for (let i = 0; i < arr.length - 1; i++) {
    const aName = arr[i].suggestedName.replace(/^[\p{Emoji}]+ /u, '');
    const bName = arr[i + 1].suggestedName.replace(/^[\p{Emoji}]+ /u, '');
    if (aName.localeCompare(bName) > 0) {
      return false;
    }
  }
  return true;
};

console.log('All groups sorted alphabetically:', isSorted(mergedGroups));

// Verify all tabs are in groups
const allTabIds = new Set(testTabs.map(tab => tab.id));
const groupedTabIds = new Set(mergedGroups.flatMap(group => group.tabIds));
const ungroupedTabIds = [...allTabIds].filter(id => !groupedTabIds.has(id));

console.log(`Total tabs in groups: ${groupedTabIds.size}`);
console.log(`Ungrouped tabs: ${ungroupedTabIds.length}`);

if (ungroupedTabIds.length > 0) {
  console.log('Ungrouped tab IDs:', ungroupedTabIds);
}

console.log('\n=== Done ===');
