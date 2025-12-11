// Background Service Worker - Enhanced Group Management
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // GET_ALL_TABS - get all tabs
  if (request.action === "GET_ALL_TABS") {
    chrome.tabs.query({}, (tabs) => {
      const tabData = tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        windowId: tab.windowId,
        groupId: tab.groupId
      }));
      sendResponse({ success: true, tabs: tabData });
    });
    return true;
  }

  // GROUP_TABS - group selected tabs
  if (request.action === "GROUP_TABS") {
    const { tabIds, groupName } = request;
    
    if (!tabIds || tabIds.length === 0) {
      sendResponse({ success: false, error: "No tab IDs provided" });
      return true;
    }

    chrome.tabs.get(tabIds[0], (firstTab) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: "Invalid tab IDs" });
        return;
      }

      const windowId = firstTab.windowId;
      
      chrome.tabs.query({ windowId: windowId }, (windowTabs) => {
        const validTabIds = tabIds.filter(id => 
          windowTabs.some(tab => tab.id === id)
        );

        if (validTabIds.length === 0) {
          sendResponse({ success: false, error: "No valid tabs in the same window" });
          return;
        }

        chrome.tabs.group({ tabIds: validTabIds }, (groupId) => {
          if (chrome.runtime.lastError) {
            sendResponse({ 
              success: false, 
              error: `Grouping failed: ${chrome.runtime.lastError.message}` 
            });
            return;
          }

          chrome.tabGroups.update(groupId, {
            title: groupName,
            color: "grey"
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
    return true;
  }

  // AUTO_GROUP_TABS - smart auto-grouping
  if (request.action === "AUTO_GROUP_TABS") {
    chrome.tabs.query({}, (allTabs) => {
      if (allTabs.length === 0) {
        sendResponse({ success: true, message: "No tabs to group", groups: [] });
        return true;
      }

      const domainGroups = groupTabsByDomain(allTabs);
      const contentGroups = groupTabsByContent(allTabs);
      const finalGroups = mergeGroupingStrategies(domainGroups, contentGroups);
      
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

  // GET_GROUPS_WITH_TABS - get all groups with their tabs
  if (request.action === "GET_GROUPS_WITH_TABS") {
    chrome.tabGroups.query({}, (groups) => {
      if (groups.length === 0) {
        sendResponse({ success: true, groups: [], ungroupedTabs: [] });
        return true;
      }

      chrome.tabs.query({}, (allTabs) => {
        const groupMap = {};
        const groupedTabIds = new Set();
        
        groups.forEach(group => {
          groupMap[group.id] = {
            id: group.id,
            title: group.title || `Group ${group.id}`,
            color: group.color,
            collapsed: group.collapsed,
            windowId: group.windowId,
            tabs: []
          };
        });

        allTabs.forEach(tab => {
          if (tab.groupId !== -1 && groupMap[tab.groupId]) {
            groupMap[tab.groupId].tabs.push({
              id: tab.id,
              title: tab.title,
              url: tab.url,
              favIconUrl: tab.favIconUrl,
              windowId: tab.windowId
            });
            groupedTabIds.add(tab.id);
          }
        });

        const ungroupedTabs = allTabs
          .filter(tab => tab.groupId === -1 || !groupMap[tab.groupId])
          .map(tab => ({
            id: tab.id,
            title: tab.title,
            url: tab.url,
            favIconUrl: tab.favIconUrl,
            windowId: tab.windowId
          }));

        const groupList = Object.values(groupMap).filter(g => g.tabs.length > 0);
        
        sendResponse({ 
          success: true, 
          groups: groupList,
          ungroupedTabs: ungroupedTabs
        });
      });
    });
    return true;
  }

  // UNGROUP_SINGLE_TAB - remove single tab from group
  if (request.action === "UNGROUP_SINGLE_TAB") {
    const { tabId } = request;
    
    chrome.tabs.ungroup(tabId, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }

  // UNGROUP_ALL_TABS - remove entire group
  if (request.action === "UNGROUP_ALL_TABS") {
    const { groupId } = request;
    
    chrome.tabs.query({ groupId: groupId }, (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ success: true, message: "Group already empty" });
        return;
      }
      
      const tabIds = tabs.map(tab => tab.id);
      chrome.tabs.ungroup(tabIds, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, ungroupedCount: tabIds.length });
        }
      });
    });
    return true;
  }

  // ADD_TAB_TO_GROUP - add tab to specific group
  if (request.action === "ADD_TAB_TO_GROUP") {
    const { tabId, groupId } = request;
    
    chrome.tabs.group({ tabIds: [tabId], groupId: groupId }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }

  // RENAME_GROUP - rename group
  if (request.action === "RENAME_GROUP") {
    const { groupId, newName } = request;
    
    chrome.tabGroups.update(groupId, { title: newName }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }

  // NEW: Search across all tabs (grouped + ungrouped)
  if (request.action === "SEARCH_ALL_TABS") {
    const { searchTerm } = request;
    
    chrome.tabs.query({}, (allTabs) => {
      if (!searchTerm.trim()) {
        // Return empty results for empty search
        sendResponse({ 
          success: true, 
          searchResults: [],
          groupedResults: [],
          ungroupedResults: []
        });
        return true;
      }

      const term = searchTerm.toLowerCase();
      const allResults = [];
      const groupedResults = [];
      const ungroupedResults = [];

      allTabs.forEach(tab => {
        const matches = tab.title.toLowerCase().includes(term) || 
                       tab.url.toLowerCase().includes(term);
        
        if (matches) {
          const tabData = {
            id: tab.id,
            title: tab.title,
            url: tab.url,
            favIconUrl: tab.favIconUrl,
            windowId: tab.windowId,
            groupId: tab.groupId,
            isGrouped: tab.groupId !== -1
          };
          
          allResults.push(tabData);
          
          if (tab.groupId !== -1) {
            groupedResults.push(tabData);
          } else {
            ungroupedResults.push(tabData);
          }
        }
      });

      sendResponse({ 
        success: true, 
        searchResults: allResults,
        groupedResults: groupedResults,
        ungroupedResults: ungroupedResults,
        searchTerm: searchTerm
      });
    });
    return true;
  }

});

// --- HELPER FUNCTIONS ---

// Group tabs by their hostname
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

// Group tabs by analyzing their titles
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
  const merged = [...contentGroups];
  
  domainGroups.forEach(domainGroup => {
    const domainTabIds = new Set(domainGroup.tabIds);
    
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
    }, index * 100);
  });
}

// Get friendly names for common domains
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

// Assign colors based on group type
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

// Helper function to get color emoji
function getColorEmoji(color) {
  const emojiMap = {
    'grey': '⚫',
    'blue': '🔵', 
    'red': '🔴',
    'yellow': '🟡',
    'green': '🟢',
    'pink': '🟣',
    'purple': '🟣',
    'cyan': '🔵',
    'orange': '🟠'
  };
  return emojiMap[color] || '⚫';
}