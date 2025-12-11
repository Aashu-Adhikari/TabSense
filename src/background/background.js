// Background Service Worker - Handles core tab operations
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Existing: Get all tabs
  if (request.action === "GET_ALL_TABS") {
    chrome.tabs.query({}, (tabs) => {
      const tabData = tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        windowId: tab.windowId
      }));
      sendResponse({ success: true, tabs: tabData });
    });
    return true; // Keep message channel open
  }

  // NEW: Group tabs
  if (request.action === "GROUP_TABS") {
    const { tabIds, groupName } = request;
    
    if (!tabIds || tabIds.length === 0) {
      sendResponse({ success: false, error: "No tab IDs provided" });
      return true;
    }

    // Check if tabs exist and are in the same window
    chrome.tabs.get(tabIds[0], (firstTab) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: "Invalid tab IDs" });
        return;
      }

      const windowId = firstTab.windowId;
      
      // Verify all tabs are in the same window
      chrome.tabs.query({ windowId: windowId }, (windowTabs) => {
        const validTabIds = tabIds.filter(id => 
          windowTabs.some(tab => tab.id === id)
        );

        if (validTabIds.length === 0) {
          sendResponse({ success: false, error: "No valid tabs in the same window" });
          return;
        }

        // Create the tab group
        chrome.tabs.group({ tabIds: validTabIds }, (groupId) => {
          if (chrome.runtime.lastError) {
            sendResponse({ 
              success: false, 
              error: `Grouping failed: ${chrome.runtime.lastError.message}` 
            });
            return;
          }

          // Update group title and color
          chrome.tabGroups.update(groupId, {
            title: groupName,
            color: "grey" // Default color, can be customized later
          }, () => {
            sendResponse({ 
              success: true, 
              groupId: groupId,
              groupName: groupName,
              tabCount: validTabIds.length
            });
          });
        });
      });
    });
    return true; // Keep message channel open
  }
  if (request.action === "AUTO_GROUP_TABS") {
    chrome.tabs.query({}, (allTabs) => {
      if (allTabs.length === 0) {
        sendResponse({ success: true, message: "No tabs to group", groups: [] });
        return true;
      }

      // Strategy 1: Group by domain (reliable)
      const domainGroups = groupTabsByDomain(allTabs);
      
      // Strategy 2: Group by content category (smart)
      const contentGroups = groupTabsByContent(allTabs);
      
      // Combine strategies: Prefer content grouping when confident, fall back to domain
      const finalGroups = mergeGroupingStrategies(domainGroups, contentGroups);
      
      // Create the groups in Chrome
      createTabGroups(finalGroups, (results) => {
        sendResponse({ 
          success: true, 
          message: `Created ${results.created} smart groups`,
          groups: results.groups,
          totalTabs: allTabs.length
        });
      });
    });
    return true;
  }
});

// --- NEW HELPER FUNCTIONS FOR AUTO-GROUPING ---

// Group tabs by their hostname (e.g., github.com, docs.google.com)
function groupTabsByDomain(tabs) {
  const groups = {};
  
  tabs.forEach(tab => {
    try {
      const domain = new URL(tab.url).hostname.replace('www.', '');
      if (!groups[domain]) {
        groups[domain] = {
          tabIds: [],
          tabs: [],
          suggestedName: getFriendlyDomainName(domain),
          confidence: 'high',
          type: 'domain'
        };
      }
      groups[domain].tabIds.push(tab.id);
      groups[domain].tabs.push(tab);
    } catch {
      // Invalid URL, group as "Unknown"
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
  
  return Object.values(groups).filter(group => group.tabIds.length > 1);
}

// Group tabs by analyzing their titles for common categories
function groupTabsByContent(tabs) {
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
  
  // Handle uncategorized tabs
  if (uncategorized.length >= 2) {
    groups['uncategorized'] = {
      tabIds: uncategorized.map(t => t.id),
      tabs: uncategorized,
      suggestedName: '📋 General Browsing',
      confidence: 'low',
      type: 'general'
    };
  }
  
  return Object.values(groups).filter(group => group.tabIds.length > 1);
}

// Merge domain and content grouping strategies
function mergeGroupingStrategies(domainGroups, contentGroups) {
  const merged = [...contentGroups]; // Start with content groups (smarter)
  
  // Add domain groups only if they don't conflict with content groups
  domainGroups.forEach(domainGroup => {
    const domainTabIds = new Set(domainGroup.tabIds);
    
    // Check if these tabs are already in a content group
    const alreadyGrouped = merged.some(contentGroup => 
      contentGroup.tabIds.some(id => domainTabIds.has(id))
    );
    
    if (!alreadyGrouped && domainGroup.tabIds.length >= 2) {
      merged.push(domainGroup);
    }
  });
  
  return merged;
}

// Create actual tab groups in Chrome
function createTabGroups(groups, callback) {
  if (groups.length === 0) {
    callback({ created: 0, groups: [] });
    return;
  }
  
  const results = [];
  let completed = 0;
  
  groups.forEach((group, index) => {
    // Small delay to avoid Chrome API rate limiting
    setTimeout(() => {
      chrome.tabs.group({ tabIds: group.tabIds }, (groupId) => {
        if (!chrome.runtime.lastError && groupId) {
          chrome.tabGroups.update(groupId, {
            title: group.suggestedName,
            color: getGroupColor(group.type)
          }, () => {
            results.push({
              groupId,
              name: group.suggestedName,
              tabCount: group.tabIds.length,
              type: group.type
            });
            
            completed++;
            if (completed === groups.length) {
              callback({ created: groups.length, groups: results });
            }
          });
        } else {
          completed++;
          if (completed === groups.length) {
            callback({ created: results.length, groups: results });
          }
        }
      });
    }, index * 100); // Stagger requests
  });
}

// Helper: Get friendly names for common domains
function getFriendlyDomainName(domain) {
  const domainMap = {
    'github.com': '🐙 GitHub',
    'docs.github.com': '📘 GitHub Docs',
    'stackoverflow.com': '🗨️ Stack Overflow',
    'developer.mozilla.org': '🌐 MDN Web Docs',
    'docs.google.com': '📊 Google Docs',
    'notion.so': '📝 Notion',
    'figma.com': '🎨 Figma',
    'chat.openai.com': '🤖 ChatGPT',
    'claude.ai': '📓 Claude',
    'reddit.com': '👥 Reddit',
    'twitter.com': '🐦 Twitter',
    'x.com': '🐦 X (Twitter)',
    'youtube.com': '🎬 YouTube'
  };
  
  return domainMap[domain] || `🌍 ${domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)}`;
}

// Helper: Assign colors based on group type
function getGroupColor(type) {
  const colorMap = {
    'domain': 'blue',
    'content': 'green', 
    'code': 'yellow',
    'docs': 'cyan',
    'social': 'pink',
    'general': 'grey',
    'unknown': 'grey'
  };
  return colorMap[type] || 'grey';
}
