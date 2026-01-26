// Grouping algorithms for tab organization

export function groupTabsByDomain(tabs, domainSettings = {}) {
  const groups = {};

  console.log('groupTabsByDomain called with', tabs.length, 'tabs');
  tabs.forEach(tab => {
    try {
      const domain = new URL(tab.url).hostname.replace('www.', '');
      const windowId = tab.windowId;
      const key = `${windowId}_${domain}`;

      if (!groups[key]) {
        groups[key] = {
          tabIds: [],
          tabs: [],
          suggestedName: getFriendlyDomainName(domain, domainSettings),
          confidence: 'high',
          type: 'domain',
          windowId: windowId
        };
        console.log(`Created new group for domain: ${domain} in window: ${windowId}`);
      }
      groups[key].tabIds.push(tab.id);
      groups[key].tabs.push(tab);
      console.log(`Added tab to domain group ${domain} in window ${windowId}:`, tab.title);
    } catch (error) {
      console.error('Error grouping tab:', error, tab);
      const windowId = tab.windowId;
      const key = `${windowId}_unknown`;
      if (!groups[key]) {
        groups[key] = {
          tabIds: [],
          tabs: [],
          suggestedName: 'Other Tabs',
          confidence: 'medium',
          type: 'unknown',
          windowId: windowId
        };
      }
      groups[key].tabIds.push(tab.id);
      groups[key].tabs.push(tab);
    }
  });

  const filtered = Object.values(groups);
  console.log(`Filtered groups:`, filtered.length);
  filtered.forEach(group => {
    console.log(`Group: ${group.suggestedName} has ${group.tabIds.length} tabs`);
    console.log(`Tabs:`, group.tabs.map(t => t.title));
  });

  return filtered;
}

export function groupTabsByContent(tabs) {
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
    const windowId = tab.windowId;

    for (const { pattern, category, emoji } of contentPatterns) {
      if (pattern.test(title) || pattern.test(tab.url.toLowerCase())) {
        const key = `${windowId}_${category}`;
        if (!groups[key]) {
          groups[key] = {
            tabIds: [],
            tabs: [],
            suggestedName: `${emoji} ${category}`,
            confidence: 'medium',
            type: 'content',
            windowId: windowId
          };
        }
        groups[key].tabIds.push(tab.id);
        groups[key].tabs.push(tab);
        categorized = true;
        break;
      }
    }

    if (!categorized) {
      const key = `${windowId}_uncategorized`;
      if (!groups[key]) {
        groups[key] = {
          tabIds: [],
          tabs: [],
          suggestedName: '📋 General Browsing',
          confidence: 'low',
          type: 'general',
          windowId: windowId
        };
      }
      groups[key].tabIds.push(tab.id);
      groups[key].tabs.push(tab);
    }
  });

  const filtered = Object.values(groups);
  return filtered;
}

export function mergeGroupingStrategies(domainGroups, contentGroups) {
  const merged = [...contentGroups];

  domainGroups.forEach(domainGroup => {
    const domainTabIds = new Set(domainGroup.tabIds);

    const alreadyGrouped = merged.some(contentGroup =>
      contentGroup.tabIds.some(id => domainTabIds.has(id))
    );

    if (!alreadyGrouped) {
      merged.push(domainGroup);
    }
  });

  return merged;
}

/**
 * Sorts an array of groups alphabetically by title, ignoring emoji prefixes.
 * @param {Array} groups - Array of group objects (from chrome.tabGroups.query or processed)
 * @returns {Array} - Sorted array
 */
export function sortGroupsAlphabetically(groups) {
  return [...groups].sort((a, b) => {
    const aTitle = a.title || a.suggestedName || '';
    const bTitle = b.title || b.suggestedName || '';
    const aName = aTitle.replace(/^[\p{Emoji}]+ /u, '').trim();
    const bName = bTitle.replace(/^[\p{Emoji}]+ /u, '').trim();
    return aName.localeCompare(bName);
  });
}

/**
 * Reorders all tab groups in the browser to be in alphabetical order, per window.
 */
export async function reorderGroupsInBrowser() {
  try {
    const groups = await new Promise(resolve => chrome.tabGroups.query({}, resolve));
    if (groups.length <= 1) return;

    // Group groups by windowId
    const groupsByWindow = {};
    groups.forEach(group => {
      if (!groupsByWindow[group.windowId]) {
        groupsByWindow[group.windowId] = [];
      }
      groupsByWindow[group.windowId].push(group);
    });

    for (const windowId in groupsByWindow) {
      const windowGroups = groupsByWindow[windowId];
      if (windowGroups.length <= 1) continue;

      const sortedGroups = sortGroupsAlphabetically(windowGroups);
      
      // Calculate target positions within this window
      let currentTabIndex = 0;
      for (const group of sortedGroups) {
        const groupTabs = await new Promise(resolve => chrome.tabs.query({ groupId: group.id, windowId: parseInt(windowId) }, resolve));
        if (groupTabs.length > 0) {
          // Move the first tab of the group to the currentTabIndex
          await new Promise(resolve => chrome.tabs.move(groupTabs[0].id, { index: currentTabIndex }, resolve));
          currentTabIndex += groupTabs.length;
        }
      }
    }
    console.log('Background: Reordered groups in browser alphabetically per window.');
  } catch (error) {
    console.error('Background: Failed to reorder groups in browser:', error);
  }
}

export function createTabGroups(groups, callback) {
  if (groups.length === 0) {
    callback({ created: 0, groups: [] });
    return;
  }

  const results = [];
  let completed = 0;

  // Create groups sequentially to avoid race conditions
  groups.forEach((group, index) => {
    setTimeout(() => {
      console.log(`Creating group: ${group.suggestedName} with ${group.tabIds.length} tabs`);
      chrome.tabs.group({ tabIds: group.tabIds }, (groupId) => {
        if (!chrome.runtime.lastError && groupId) {
          // Update group with title, color, and collapsed state
          chrome.tabGroups.update(groupId, {
            title: group.suggestedName,
            color: getGroupColor(group.type),
            collapsed: true
          }, () => {
            if (chrome.runtime.lastError) {
              console.error(`Failed to update group ${group.suggestedName}:`, chrome.runtime.lastError);
            } else {
              console.log(`Group ${group.suggestedName} created and collapsed successfully`);
            }

            // Verify all tabs are in the group
            chrome.tabs.query({ groupId: groupId }, (groupTabs) => {
              console.log(`Group ${group.suggestedName} contains ${groupTabs.length} tabs`);
              const missingTabIds = group.tabIds.filter(id => !groupTabs.some(tab => tab.id === id));
              if (missingTabIds.length > 0) {
                console.warn(`Group ${group.suggestedName} is missing tabs:`, missingTabIds);
                // Try to add missing tabs to the group
                chrome.tabs.group({ tabIds: missingTabIds, groupId: groupId }, () => {
                  if (chrome.runtime.lastError) {
                    console.error(`Failed to add missing tabs to group ${group.suggestedName}:`, chrome.runtime.lastError);
                  } else {
                    console.log(`Successfully added missing tabs to group ${group.suggestedName}`);
                  }
                });
              }
            });

            results.push({
              groupId,
              name: group.suggestedName,
              tabCount: group.tabIds.length,
              type: group.type
            });

            completed++;
            if (completed === groups.length) {
              // After all groups are created, ensure they stay collapsed
              setTimeout(() => {
                results.forEach(result => {
                  chrome.tabGroups.update(result.groupId, { collapsed: true }, () => {
                    if (chrome.runtime.lastError) {
                      console.debug(`Failed to ensure group ${result.name} stays collapsed:`, chrome.runtime.lastError);
                    }
                  });
                });

                // Callback after ensuring collapsed state
                callback({ created: groups.length, groups: results });
              }, 300); // Small delay to ensure all operations are complete
            }
          });
        } else {
          console.error(`Failed to create group ${group.suggestedName}:`, chrome.runtime.lastError);
          completed++;
          if (completed === groups.length) {
            callback({ created: results.length, groups: results });
          }
        }
      });
    }, index * 200); // Increased delay to prevent race conditions
  });
}

export function getFriendlyDomainName(domain, domainSettings = {}) {
  const settings = domainSettings[domain] || {};

  // 1. Use custom name if available
  if (settings.name) {
    // If emoji is also set, prepend it
    if (settings.emoji) {
      return `${settings.emoji} ${settings.name}`;
    }
    // Otherwise use default emoji + custom name
    return `🌍 ${settings.name}`;
  }

  // 2. Use custom emoji if available (with default name)
  const name = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  if (settings.emoji) {
    return `${settings.emoji} ${name}`;
  }

  // 3. Fallback to default
  return `🌍 ${name}`;
}

export function getGroupColor(type) {
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
