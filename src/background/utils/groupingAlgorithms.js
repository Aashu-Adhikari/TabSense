// Grouping algorithms for tab organization

export function groupTabsByDomain(tabs, domainSettings = {}) {
  const groups = {};

  tabs.forEach(tab => {
    try {
      const domain = new URL(tab.url).hostname.replace('www.', '');
      if (!groups[domain]) {
        groups[domain] = {
          tabIds: [],
          tabs: [],
          suggestedName: getFriendlyDomainName(domain, domainSettings),
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

export function mergeGroupingStrategies(domainGroups, contentGroups) {
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

export function createTabGroups(groups, callback) {
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
