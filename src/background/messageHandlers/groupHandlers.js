// Group-related message handlers

export function handleGroupTabs(request, sendResponse) {
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

export function handleGroupByDomain(request, sendResponse) {
  chrome.tabs.query({}, (allTabs) => {
    if (allTabs.length === 0) {
      sendResponse({ success: true, message: "No tabs to group", groups: [] });
      return true;
    }

    import('../utils/groupingAlgorithms.js').then(({ 
      groupTabsByDomain,
      createTabGroups 
    }) => {
      // Group only by domain (no content-based grouping)
      const domainGroups = groupTabsByDomain(allTabs);
      
      createTabGroups(domainGroups, (results) => {
        sendResponse({ 
          success: true, 
          message: `Created ${results.created} domain-based groups`,
          groups: results.groups,
          totalTabs: allTabs.length
        });
      });
    });
  });
  return true;
}

export function handleGroupByContent(request, sendResponse) {
  chrome.tabs.query({}, (allTabs) => {
    if (allTabs.length === 0) {
      sendResponse({ success: true, message: "No tabs to group", groups: [] });
      return true;
    }

    import('../utils/groupingAlgorithms.js').then(({ 
      groupTabsByContent,
      createTabGroups 
    }) => {
      // Group by content patterns
      const contentGroups = groupTabsByContent(allTabs);
      
      createTabGroups(contentGroups, (results) => {
        sendResponse({ 
          success: true, 
          message: `Created ${results.created} content-based groups`,
          groups: results.groups,
          totalTabs: allTabs.length
        });
      });
    });
  });
  return true;
}

export function handleGroupByAI(request, sendResponse) {
  chrome.tabs.query({}, (allTabs) => {
    if (allTabs.length === 0) {
      sendResponse({ success: true, message: "No tabs to group", groups: [] });
      return true;
    }

    // Import ML classifier
    import('../../ml/classifier.js').then(({ tabClassifier }) => {
      tabClassifier.mlAutoGroupAllTabs(allTabs, {
        confidenceThreshold: 0.6,
        minGroupSize: 2,
        maxGroups: 10
      }).then(result => {
        if (result.success) {
          sendResponse({ 
            success: true, 
            message: `Created ${result.groupsCreated} AI-powered groups`,
            groups: result.groups,
            totalTabs: allTabs.length
          });
        } else {
          sendResponse({ 
            success: false, 
            error: result.error || 'AI grouping failed'
          });
        }
      }).catch(error => {
        console.error('AI Grouping error:', error);
        sendResponse({ 
          success: false, 
          error: error.message 
        });
      });
    });
  });
  return true;
}

// Legacy function for backward compatibility (redirects to domain-based grouping)
export function handleAutoGroupTabs(request, sendResponse) {
  // Redirect to domain-based grouping
  return handleGroupByDomain(request, sendResponse);
}

export function handleUngroupAllTabs(request, sendResponse) {
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

export function handleRenameGroup(request, sendResponse) {
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
