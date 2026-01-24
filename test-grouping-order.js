// Test that groups are created in alphabetical order based on name after emoji

// Import the updated functions
const {
  groupTabsByDomain
} = require('./src/background/utils/groupingAlgorithms');

// Test data with various domain names
const testTabs = [
  { id: 1, title: 'Google Search', url: 'https://www.google.com/search', windowId: 1 },
  { id: 2, title: 'OpenRouter AI', url: 'https://openrouter.ai', windowId: 1 },
  { id: 3, title: 'GitHub Repository', url: 'https://github.com/user/repo', windowId: 1 },
  { id: 4, title: 'Facebook Home', url: 'https://www.facebook.com', windowId: 1 },
  { id: 5, title: 'Amazon Shopping', url: 'https://www.amazon.com', windowId: 1 },
  { id: 6, title: 'Docs - Google', url: 'https://docs.google.com', windowId: 1 }
];

console.log('=== Testing Group Creation and Order ===');

// Group tabs by domain
const domainGroups = groupTabsByDomain(testTabs);

console.log('Groups created (should be sorted alphabetically):');
domainGroups.forEach(group => {
  console.log(`- ${group.suggestedName}`);
});

// Verify groups are sorted alphabetically by name after emoji
const sortedNames = domainGroups.map(group => 
  group.suggestedName.replace(/^[\p{Emoji}]+ /u, '')
).sort();

const actualNames = domainGroups.map(group => 
  group.suggestedName.replace(/^[\p{Emoji}]+ /u, '')
);

console.log('\n=== Order Verification ===');
console.log('Expected order (alphabetical):', sortedNames);
console.log('Actual order:', actualNames);

if (JSON.stringify(sortedNames) === JSON.stringify(actualNames)) {
  console.log('✅ Groups are in alphabetical order');
} else {
  console.log('❌ Groups are not in alphabetical order');
}
