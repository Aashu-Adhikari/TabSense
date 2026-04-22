// Tab-related message handlers

export function handleGetAllTabs(request, sendResponse) {
  chrome.tabs.query({}, (tabs) => {
    const tabData = tabs.map(tab => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      windowId: tab.windowId,
      groupId: tab.groupId,
      lastAccessed: tab.lastAccessed
    }));
    sendResponse({ success: true, tabs: tabData });
  });
  return true;
}

export function handleUngroupSingleTab(request, sendResponse) {
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

export function handleAddToGroup(request, sendResponse) {
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

export function handleGetGroupsWithTabs(request, sendResponse) {
  console.log('Background: GET_GROUPS_WITH_TABS request received');
  
  chrome.tabGroups.query({}, (groups) => {
    console.log('Background: tabGroups.query result:', groups.length, 'groups');
    
    // ALWAYS query for ALL tabs, regardless of groups
    chrome.tabs.query({}, (allTabs) => {
      console.log('Background: tabs.query result:', allTabs.length, 'total tabs');
      
      const groupMap = {};
      const groupedTabIds = new Set();
      
      // Only process groups if they exist
    if (groups.length > 0) {
      groups.forEach(group => {
        groupMap[group.id] = {
          id: group.id,
          title: group.title || `Group ${group.id}`,
          color: group.color,
          collapsed: group.collapsed,
          windowId: group.windowId,
          index: null,
          tabs: []
        };
      });

      // Organize tabs into their groups
      allTabs.forEach(tab => {
        if (tab.groupId !== -1 && groupMap[tab.groupId]) {
          groupMap[tab.groupId].tabs.push({
            id: tab.id,
            title: tab.title,
            url: tab.url,
            favIconUrl: tab.favIconUrl,
            windowId: tab.windowId,
            lastAccessed: tab.lastAccessed
          });
          if (typeof tab.index === 'number') {
            const currentIndex = groupMap[tab.groupId].index;
            groupMap[tab.groupId].index = currentIndex === null ? tab.index : Math.min(currentIndex, tab.index);
          }
          groupedTabIds.add(tab.id);
        }
      });
    }
      
      // Get ungrouped tabs (tabs without groupId OR with groupId === -1 OR not in groupMap)
      const ungroupedTabs = allTabs.filter(tab => {
        // Tab is ungrouped if:
        // 1. groupId is -1, OR
        // 2. groupId doesn't exist in groupMap (invalid/removed group), OR
        // 3. tab.groupId is undefined (some edge cases)
        return tab.groupId === -1 || 
               !groupMap[tab.groupId] || 
               tab.groupId === undefined;
      }).map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        windowId: tab.windowId,
        groupId: tab.groupId,
        lastAccessed: tab.lastAccessed
      }));
      
      // Convert groupMap to array, filter out empty groups
      const groupList = Object.values(groupMap)
        .filter(g => g.tabs.length > 0)
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

      console.log('Background: Returning', groupList.length, 'groups and', ungroupedTabs.length, 'ungrouped tabs');
      
      sendResponse({ 
        success: true, 
        groups: groupList,
        ungroupedTabs: ungroupedTabs
      });
    });
  });
  return true;
}
