// Test the grouping algorithms to see if any tabs are being excluded

// Mock the modules
const groupingAlgorithms = {
  groupTabsByDomain: function(tabs, domainSettings = {}) {
    const groups = {};

    console.log('groupTabsByDomain called with', tabs.length, 'tabs');
    tabs.forEach(tab => {
      try {
        const domain = new URL(tab.url).hostname.replace('www.', '');
        if (!groups[domain]) {
          groups[domain] = {
            tabIds: [],
            tabs: [],
            suggestedName: domain,
            confidence: 'high',
            type: 'domain'
          };
          console.log(`Created new group for domain: ${domain}`);
        }
        groups[domain].tabIds.push(tab.id);
        groups[domain].tabs.push(tab);
        console.log(`Added tab to domain group ${domain}:`, tab.title);
      } catch (error) {
        console.error('Error grouping tab:', error, tab);
        const key = 'unknown';
        if (!groups[key]) {
          groups[key] = {
            tabIds: [],
            tabs: [],
            suggestedName: 'Other Tabs',
            confidence: 'medium',
            type: 'unknown'
          };
        }
        groups[key].tabIds.push(tab.id);
        groups[key].tabs.push(tab);
      }
    });

    const filtered = Object.values(groups).filter(group => group.tabIds.length > 1);
    console.log(`Filtered groups with >1 tab:`, filtered.length);
    filtered.forEach(group => {
      console.log(`Group: ${group.suggestedName} has ${group.tabIds.length} tabs`);
      console.log(`Tabs:`, group.tabs.map(t => t.title));
    });
    
    filtered.sort((a, b) => {
      const aName = a.suggestedName.replace(/^[\p{Emoji}]+ /u, '');
      const bName = b.suggestedName.replace(/^[\p{Emoji}]+ /u, '');
      return aName.localeCompare(bName);
    });
    return filtered;
  },

  groupTabsByContent: function(tabs) {
    const contentPatterns = [
      { pattern: /github|gitlab|bitbucket|pull request|issue|commit/i, category: 'Code & Development', emoji: '💻' },
      { pattern: /docs?|documentation|api ref|tutorial|guide|how to/i, category: 'Documentation', emoji: '📚' },
      { pattern: /stack overflow|stackexchange|reddit|forum|discussion/i, category: 'Q&A & Forums', emoji: '💬' },
      { pattern: /youtube|video|tutorial|watch|stream/i, category: 'Videos', emoji: '🎬' },
      { pattern: /twitter|x\.com|tweet|instagram|social/i, category: 'Social Media', emoji: '🐦' },
      { pattern: /shopping|amazon|ebay|store|buy|cart/i, category: 'Shopping', emoji: '🛒' },
      { pattern: /mail|gmail|outlook|email|inbox/i, category: 'Email', emoji: '📧' },
      { pattern: /chatgpt|claude|bard|ai|llm|generative/i, category: 'AI Tools', emoji: '🤖' },
      { pattern: /notion|drive|dropbox|cloud|storage/i, category: 'Cloud Storage', emoji: '☁️' },
      { pattern: /calendar|meeting|event|schedule|zoom|meet/i, category: 'Meetings & Calendar', emoji: '📅' }
    ];

    const groups = {};
    const uncategorized = [];

    tabs.forEach(tab => {
      let categorized = false;
      const title = tab.title.toLowerCase();

      for (const { pattern, category, emoji } of contentPatterns) {
        if (pattern.test(title) || pattern.test(tab.url.toLowerCase())) {
          const key = category;
          if (!groups[key]) {
            groups[key] = {
              tabIds: [],
              tabs: [],
              suggestedName: `${emoji} ${category}`,
              confidence: 'medium',
              type: 'content'
            };
          }
          groups[key].tabIds.push(tab.id);
          groups[key].tabs.push(tab);
          categorized = true;
          break;
        }
      }

      if (!categorized) {
        uncategorized.push(tab);
      }
    });

    if (uncategorized.length >= 2) {
      groups['uncategorized'] = {
        tabIds: uncategorized.map(t => t.id),
        tabs: uncategorized,
        suggestedName: '📋 General Browsing',
        confidence: 'low',
        type: 'general'
      };
    }

    const filtered = Object.values(groups).filter(group => group.tabIds.length > 1);
    filtered.sort((a, b) => {
      const aName = a.suggestedName.replace(/^[\p{Emoji}]+ /u, '');
      const bName = b.suggestedName.replace(/^[\p{Emoji}]+ /u, '');
      return aName.localeCompare(bName);
    });
    return filtered;
  }
};

// Test data - 5 tabs from 2 domains
const testTabs = [
  { id: 1, title: 'Google Search', url: 'https://www.google.com/search?q=test', windowId: 1 },
  { id: 2, title: 'Google News', url: 'https://news.google.com', windowId: 1 },
  { id: 3, title: 'Google Maps', url: 'https://www.google.com/maps', windowId: 1 },
  { id: 4, title: 'GitHub Repo', url: 'https://github.com/user/repo', windowId: 1 },
  { id: 5, title: 'GitHub Issues', url: 'https://github.com/user/repo/issues', windowId: 1 }
];

// Test domain-based grouping
console.log('=== Domain-Based Grouping ===');
const domainGroups = groupingAlgorithms.groupTabsByDomain(testTabs);
console.log('Result:', JSON.stringify(domainGroups, null, 2));
console.log('\n');

// Test content-based grouping
console.log('=== Content-Based Grouping ===');
const contentGroups = groupingAlgorithms.groupTabsByContent(testTabs);
console.log('Result:', JSON.stringify(contentGroups, null, 2));
console.log('\n');

// Calculate total tabs in groups
let totalTabsInDomainGroups = domainGroups.reduce((sum, group) => sum + group.tabs.length, 0);
let totalTabsInContentGroups = contentGroups.reduce((sum, group) => sum + group.tabs.length, 0);

console.log(`Total tabs in domain groups: ${totalTabsInDomainGroups}`);
console.log(`Total tabs in content groups: ${totalTabsInContentGroups}`);
