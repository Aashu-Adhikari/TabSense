// src/background/background.js

// Background Service Worker - Modular Architecture
// import { tabClassifier } from '../ml/classifier.js'; // Removed - ML initializes lazily

// Import all message handlers
import * as tabHandlers from './messageHandlers/tabHandlers.js';
import * as groupHandlers from './messageHandlers/groupHandlers.js';
import * as searchHandlers from './messageHandlers/searchHandlers.js';
import * as mlHandlers from './messageHandlers/mlHandlers.js';
import * as chatHandlers from './messageHandlers/chatHandlers.js';

// =================================================================
// ===== PROACTIVE CACHING FOR INSTANT POPUP UI ====================
// =================================================================

// Function to fetch and cache the current state of tabs and groups
async function updateTabCache() {
  console.log('Background: Updating tab cache...');
  try {
    const groups = await new Promise(resolve => chrome.tabGroups.query({}, resolve));
    const allTabs = await new Promise(resolve => chrome.tabs.query({}, resolve));

    // Process data structure (Mirroring logic from tabHandlers)
    const groupMap = {};
    const groupedTabIds = new Set();

    if (groups.length > 0) {
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
    }

    const ungroupedTabs = allTabs.filter(tab =>
      tab.groupId === -1 || !groupMap[tab.groupId] || tab.groupId === undefined
    ).map(tab => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      windowId: tab.windowId,
      groupId: tab.groupId
    }));

    const groupList = Object.values(groupMap).filter(g => g.tabs.length > 0);

    // Save the processed data to local storage
    await chrome.storage.local.set({
      cachedGroups: groupList,
      cachedUngroupedTabs: ungroupedTabs,
      cacheTimestamp: Date.now()
    });
    console.log('Background: Tab cache updated successfully.');

  } catch (error) {
    console.error('Background: Failed to update tab cache:', error);
  }
}

// Listen for any changes and trigger a cache update
chrome.tabs.onCreated.addListener(updateTabCache);
chrome.tabs.onRemoved.addListener(updateTabCache);
chrome.tabs.onUpdated.addListener(updateTabCache);
chrome.tabs.onMoved.addListener(updateTabCache);
chrome.tabs.onAttached.addListener(updateTabCache);
chrome.tabs.onDetached.addListener(updateTabCache);

chrome.tabGroups.onCreated.addListener(updateTabCache);
chrome.tabGroups.onRemoved.addListener(updateTabCache);
chrome.tabGroups.onUpdated.addListener(updateTabCache);
chrome.tabGroups.onMoved.addListener(updateTabCache);

// Create an initial cache when the browser starts or the extension is installed/updated
chrome.runtime.onStartup.addListener(updateTabCache);
chrome.runtime.onInstalled.addListener(updateTabCache);


// =================================================================
// ===== ML INITIALIZATION =========================================
// =================================================================

// THIS WAS MISSING. It is required for the Chat Stream to work.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'chat_stream') {
    chatHandlers.handleChatStreamConnection(port);
  }
});


// =================================================================
// ===== MESSAGE ROUTING ===========================================
// =================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // --- Tab Handlers ---
  if (request.action === "GET_ALL_TABS") {
    return tabHandlers.handleGetAllTabs(request, sendResponse);
  }
  
  if (request.action === "GET_GROUPS_WITH_TABS") {
    return tabHandlers.handleGetGroupsWithTabs(request, sendResponse);
  }
  
  if (request.action === "UNGROUP_SINGLE_TAB") {
    return tabHandlers.handleUngroupSingleTab(request, sendResponse);
  }
  
  if (request.action === "ADD_TAB_TO_GROUP") {
    return tabHandlers.handleAddToGroup(request, sendResponse);
  }

  // --- Group Handlers ---
  if (request.action === "GROUP_TABS") {
    return groupHandlers.handleGroupTabs(request, sendResponse);
  }
  
  if (request.action === "AUTO_GROUP_TABS") {
    return groupHandlers.handleAutoGroupTabs(request, sendResponse);
  }
  
  if (request.action === "GROUP_BY_DOMAIN") {
    return groupHandlers.handleGroupByDomain(request, sendResponse);
  }
  
  if (request.action === "GROUP_BY_CONTENT") {
    return groupHandlers.handleGroupByContent(request, sendResponse);
  }
  
  if (request.action === "UNGROUP_ALL_TABS") {
    return groupHandlers.handleUngroupAllTabs(request, sendResponse);
  }
  
  if (request.action === "RENAME_GROUP") {
    return groupHandlers.handleRenameGroup(request, sendResponse);
  }

  if (request.action === "FIND_OR_CREATE_GROUP_AND_ADD_TAB") {
    return groupHandlers.handleFindOrCreateGroupAndAddTab(request, sendResponse);
  }

  // --- Search Handlers ---
  if (request.action === "SEARCH_ALL_TABS") {
    return searchHandlers.handleSearchAllTabs(request, sendResponse);
  }

  // --- ML Handlers ---
  if (request.action === "INITIALIZE_ML") {
    return mlHandlers.handleInitializeML(request, sendResponse);
  }
  
  if (request.action === "PING_ML") {
    return mlHandlers.handlePingML(request, sendResponse);
  }
  
  if (request.action === "CLASSIFY_TAB") {
    return mlHandlers.handleClassifyTab(request, sendResponse);
  }
  
  if (request.action === "GET_SMART_GROUP_NAME") {
    return mlHandlers.handleGetSmartGroupName(request, sendResponse);
  }
  
  if (request.action === "TRAIN_MODEL") {
    return mlHandlers.handleTrainModel(request, sendResponse);
  }
  
  if (request.action === "ML_AUTO_GROUP_ALL_TABS") {
    return mlHandlers.handleMlAutoGroupAllTabs(request, sendResponse);
  }

  if (request.action === "LEARN_FROM_ASSIGNMENT") {
    mlHandlers.handleLearnFromAssignment(request);
    return false; // No response needed for this fire-and-forget action
  }

  // --- Chat Handlers (New Phase 3) ---
  if (request.action === "EXTRACT_TAB_CONTENT") {
    return chatHandlers.handleExtractTabContent(request, sendResponse);
  }

  if (request.action === "SEND_CHAT_MESSAGE") {
    return chatHandlers.handleChatStreamConnection(request, sendResponse);
  }

  // UPDATED HANDLERS
  if (request.action === "SAVE_LLM_CONFIG") {
    return chatHandlers.handleSaveLLMConfig(request, sendResponse);
  }
  if (request.action === "GET_LLM_CONFIG") {
    return chatHandlers.handleGetLLMConfig(request, sendResponse);
  }

  // --- Default Fallback ---
  sendResponse({ success: false, error: `Unknown action: ${request.action}` });
  return false;
});