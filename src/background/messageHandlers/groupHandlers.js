// src/background/messageHandlers/groupHandlers.js

import { getGroupColor } from '../utils/groupingAlgorithms.js';

// =================================================================
// ===== NEW: FIND/CREATE GROUP FROM ML CATEGORY ===================
// =================================================================
export async function handleFindOrCreateGroupAndAddTab(request, sendResponse) {
  const { tabId, categoryName, categoryEmoji } = request;

  try {
    const allGroups = await new Promise(resolve => chrome.tabGroups.query({}, resolve));
    const targetTitle = `${categoryEmoji} ${categoryName}`;
    let targetGroup = allGroups.find(group => group.title === targetTitle);

    if (targetGroup) {
      // Group already exists, just add the tab to it.
      await new Promise(resolve => chrome.tabs.group({ tabIds: [tabId], groupId: targetGroup.id }, resolve));
      sendResponse({ success: true, groupId: targetGroup.id, created: false });
    } else {
      // Group does not exist, create it first, then name it.
      const newGroupId = await new Promise(resolve => chrome.tabs.group({ tabIds: [tabId] }, resolve));
      await new Promise(resolve => {
        chrome.tabGroups.update(newGroupId, {
          title: targetTitle,
          color: getGroupColor('content') // Assign a default color
        }, resolve);
      });
      sendResponse({ success: true, groupId: newGroupId, created: true });
    }
  } catch (error) {
    console.error('Error in findOrCreateGroupAndAddTab:', error);
    sendResponse({ success: false, error: error.message });
  }

  // Return true to indicate we will send a response asynchronously.
  return true;
}

// (The rest of this file remains exactly the same. No other functions are changed.)

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

    // Fetch custom domain settings first
    chrome.storage.local.get(['custom_domain_settings'], (result) => {
      const domainSettings = result.custom_domain_settings || {};

      import('../utils/groupingAlgorithms.js').then(({
        groupTabsByDomain,
        createTabGroups
      }) => {
        // Group only by domain (no content-based grouping)
        const domainGroups = groupTabsByDomain(allTabs, domainSettings);

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

export function handleAutoGroupTabs(request, sendResponse) {
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