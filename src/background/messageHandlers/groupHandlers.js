// src/background/messageHandlers/groupHandlers.js

import { getGroupColor } from '../utils/groupingAlgorithms.js';
import { emojiService } from '../../services/emojiService.js';

// =================================================================
// ===== NEW: FIND/CREATE GROUP FROM ML CATEGORY ===================
// =================================================================
export async function handleFindOrCreateGroupAndAddTab(request, sendResponse) {
  const { tabId, categoryName, categoryEmoji, groupTitle } = request;

  try {
    // Get the tab's windowId first
    const tab = await new Promise(resolve => chrome.tabs.get(tabId, resolve));
    if (!tab) throw new Error("Tab not found");
    const windowId = tab.windowId;

    const allGroups = await new Promise(resolve => chrome.tabGroups.query({ windowId }, resolve));
    const targetTitle = groupTitle || `${categoryEmoji} ${categoryName}`;

    console.log('Finding or creating group for title:', targetTitle, 'in window:', windowId);
    console.log('Existing groups in window:', allGroups.map(g => g.title));

    let targetGroup = allGroups.find(group => group.title === targetTitle);

    if (targetGroup) {
      // Group already exists in this window, just add the tab to it.
      await new Promise(resolve => chrome.tabs.group({ tabIds: [tabId], groupId: targetGroup.id }, resolve));
      sendResponse({ success: true, groupId: targetGroup.id, created: false });
    } else {
      // Group does not exist in this window, create it first, then name it.
      const newGroupId = await new Promise(resolve => chrome.tabs.group({ tabIds: [tabId] }, resolve));
      await new Promise(resolve => {
        chrome.tabGroups.update(newGroupId, {
          title: targetTitle,
          color: getGroupColor('content'), // Assign a default color
          collapsed: true
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

  chrome.tabs.group({ tabIds: tabIds }, (groupId) => {
    if (chrome.runtime.lastError) {
      sendResponse({
        success: false,
        error: `Grouping failed: ${chrome.runtime.lastError.message}`
      });
      return;
    }

    chrome.tabGroups.update(groupId, {
      title: groupName,
      color: "grey",
      collapsed: true
    }, () => {
      sendResponse({
        success: true,
        groupId: groupId,
        groupName: groupName,
        tabCount: tabIds.length
      });
    });
  });
  return true;
}

export function handleGroupByDomain(request, sendResponse) {
  chrome.tabs.query({}, (allTabs) => {
    if (allTabs.length === 0) {
      sendResponse({ success: true, message: "No tabs to group", groups: [] });
      return;
    }

    // Fetch merged domain settings (defaults + custom)
    emojiService.getDomainSettings().then((domainSettings) => {
      import('../utils/groupingAlgorithms.js').then(({
        groupTabsByDomain,
        createTabGroups
      }) => {
        try {
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
        } catch (error) {
          console.error('Error in domain grouping:', error);
          sendResponse({ success: false, error: error.message });
        }
      }).catch((importError) => {
        console.error('Error importing grouping algorithms:', importError);
        sendResponse({ success: false, error: 'Failed to load grouping algorithms' });
      });
    }).catch((settingsError) => {
      console.error('Error getting domain settings:', settingsError);
      sendResponse({ success: false, error: 'Failed to get domain settings' });
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

export function handleMoveGroup(request, sendResponse) {
  const { groupId, index, windowId } = request;

  const moveOptions = windowId !== undefined ? { index, windowId } : { index };

  chrome.tabGroups.move(groupId, moveOptions, () => {
    if (chrome.runtime.lastError) {
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ success: true });
    }
  });
  return true;
}
export function handleDeleteGroup(request, sendResponse) {
  const { groupId } = request;

  (async () => {
    try {
      // 1. Get group metadata
      const group = await new Promise((resolve, reject) => {
        chrome.tabGroups.get(groupId, (res) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(res);
        });
      });

      // 2. Get tabs in this group
      const tabs = await new Promise(resolve => chrome.tabs.query({ groupId }, resolve));

      // 3. Prepare metadata for undo
      const groupData = {
        title: group.title,
        color: group.color,
        tabs: tabs.map(t => ({
          url: t.url,
          title: t.title,
          favIconUrl: t.favIconUrl,
          pinned: t.pinned,
          index: t.index
        })),
        windowId: group.windowId
      };

      // 4. Send response with metadata BEFORE closing tabs
      sendResponse({ success: true, groupData });

      // 5. Close the tabs (this will automatically delete the group)
      const tabIds = tabs.map(t => t.id);
      await new Promise(resolve => chrome.tabs.remove(tabIds, resolve));
    } catch (error) {
      console.error('Error in handleDeleteGroup:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true;
}

export function handleUndoDeleteGroup(request, sendResponse) {
  const { groupData } = request;

  (async () => {
    try {
      // 1. Re-open tabs
      const createdTabs = [];
      for (const tabInfo of groupData.tabs) {
        const tab = await new Promise(resolve => {
          chrome.tabs.create({
            url: tabInfo.url,
            windowId: groupData.windowId,
            active: false,
            pinned: tabInfo.pinned
          }, resolve);
        });
        createdTabs.push(tab);
      }

      // 2. Re-group them
      const tabIds = createdTabs.map(t => t.id);
      const newGroupId = await new Promise(resolve => chrome.tabs.group({ tabIds }, resolve));

      // 3. Update group properties
      await new Promise(resolve => {
        chrome.tabGroups.update(newGroupId, {
          title: groupData.title,
          color: groupData.color,
          collapsed: true
        }, resolve);
      });

      sendResponse({ success: true, groupId: newGroupId });
    } catch (error) {
      console.error('Error in handleUndoDeleteGroup:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true;
}
