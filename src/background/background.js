// src/background/background.js

// Background Service Worker - Modular Architecture
// import { tabClassifier } from '../ml/classifier.js'; // Removed - ML initializes lazily

// Import all message handlers
import * as tabHandlers from './messageHandlers/tabHandlers.js';
import * as groupHandlers from './messageHandlers/groupHandlers.js';
import * as searchHandlers from './messageHandlers/searchHandlers.js';
import * as mlHandlers from './messageHandlers/mlHandlers.js';
import * as chatHandlers from './messageHandlers/chatHandlers.js';
import { emojiService } from '../services/emojiService.js';

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

// Track tab activity
const activeTabTimers = new Map();
let currentActiveTabId = null; // Track current active tab
const ACTIVITY_TIMEOUT = 5000; // 5 seconds of inactivity to trigger grouping

// Function to set timers for all inactive ungrouped tabs
async function setTimersForInactiveUngroupedTabs() {
  try {
    const allTabs = await new Promise(resolve => chrome.tabs.query({}, resolve));
    const ungroupedTabs = allTabs.filter(tab =>
      tab.id !== currentActiveTabId &&
      (tab.groupId === -1 || tab.groupId === undefined) &&
      shouldAutoGroupTab(tab)
    );

    // Clear existing timers for tabs that are no longer ungrouped or active
    for (const [tabId, timer] of activeTabTimers) {
      const tab = allTabs.find(t => t.id === tabId);
      if (!tab || tab.groupId !== -1 || tab.id === currentActiveTabId) {
        clearTimeout(timer);
        activeTabTimers.delete(tabId);
      }
    }

    // Set timers for inactive ungrouped tabs
    ungroupedTabs.forEach(tab => {
      if (!activeTabTimers.has(tab.id)) {
        console.log('Background: Setting timer for inactive ungrouped tab:', tab.title);
        const timer = setTimeout(async () => {
          await autoGroupTab(tab);
          activeTabTimers.delete(tab.id);
        }, ACTIVITY_TIMEOUT);
        activeTabTimers.set(tab.id, timer);
      }
    });
  } catch (error) {
    console.error('Background: Error setting timers for inactive tabs:', error);
  }
}

// When user activates a tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('Background: Tab activated:', activeInfo.tabId);

  // Clear any existing timer for the newly activated tab
  if (activeTabTimers.has(activeInfo.tabId)) {
    clearTimeout(activeTabTimers.get(activeInfo.tabId));
    activeTabTimers.delete(activeInfo.tabId);
    console.log('Background: Cleared timer for newly activated tab');
  }

  // Update current active tab reference
  currentActiveTabId = activeInfo.tabId;

  // Set timers for all other inactive ungrouped tabs
  await setTimersForInactiveUngroupedTabs();

  // Get the tab info and log
  try {
    const currentTab = await new Promise(resolve => chrome.tabs.get(activeInfo.tabId, resolve));
    console.log('Background: User started working on tab:', currentTab.title);
  } catch (error) {
    console.error('Background: Error getting current tab info:', error);
  }
});

// Also handle case when user closes a tab or navigates away from a tab
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (activeTabTimers.has(tabId)) {
    clearTimeout(activeTabTimers.get(tabId));
    activeTabTimers.delete(tabId);
  }
});

// Clear timers when tabs are grouped
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.groupId !== undefined && changeInfo.groupId !== -1) {
    // Tab was grouped, clear its timer
    if (activeTabTimers.has(tabId)) {
      clearTimeout(activeTabTimers.get(tabId));
      activeTabTimers.delete(tabId);
      console.log('Background: Cleared timer for grouped tab:', tabId);
    }
  }
});

chrome.tabGroups.onCreated.addListener(updateTabCache);
chrome.tabGroups.onRemoved.addListener(updateTabCache);
chrome.tabGroups.onUpdated.addListener(updateTabCache);
chrome.tabGroups.onMoved.addListener(updateTabCache);

// Create an initial cache when the browser starts or the extension is installed/updated
chrome.runtime.onStartup.addListener(async () => {
  await updateTabCache();
  await setTimersForInactiveUngroupedTabs();
});
chrome.runtime.onInstalled.addListener(async () => {
  await updateTabCache();
  await setTimersForInactiveUngroupedTabs();
});

// =================================================================
// ===== AUTO-GROUPING LOGIC =======================================
// =================================================================

// Helper function to determine if a tab should be auto-grouped
function shouldAutoGroupTab(tab) {
  // Skip if tab is not fully loaded
  if (tab.status !== 'complete') return false;

  // Skip chrome:// URLs and other internal pages
  if (tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://') ||
    tab.url.startsWith('about:') ||
    tab.url.startsWith('edge://')) {
    return false;
  }

  // Skip new tab pages
  if (tab.url === 'chrome://newtab/' ||
    tab.url.includes('newtab') ||
    tab.title.toLowerCase().includes('new tab')) {
    return false;
  }

  // Skip tabs that are already grouped
  if (tab.groupId !== -1) return false;

  return true;
}

// Function to auto-group a newly created tab
async function autoGroupTab(tab) {
  try {
    // Check if auto-grouping is enabled
    const settings = await chrome.storage.local.get(['auto_grouping_settings']);
    const autoGroupingSettings = settings.auto_grouping_settings || {};
    const domainSettings = await emojiService.getDomainSettings();

    if (!autoGroupingSettings.enabled) return;

    // Check if tab should be auto-grouped
    if (!shouldAutoGroupTab(tab)) return;

    console.log('Background: Auto-grouping tab:', tab.title, tab.url);

    // Import required modules dynamically
    const { tabClassifier } = await import('../ml/classifier.js');
    const groupHandlers = await import('./messageHandlers/groupHandlers.js');
    const { getFriendlyDomainName } = await import('./utils/groupingAlgorithms.js');

    let category = null;
    let emoji = null;
    let groupTitle = null;

    switch (autoGroupingSettings.method) {
      case 'domain':
        // Extract domain for grouping
        try {
          const domain = new URL(tab.url).hostname.replace('www.', '');
          groupTitle = getFriendlyDomainName(domain, domainSettings);
        } catch (e) {
          category = 'Web';
          emoji = '🌐';
        }
        break;

      case 'content':
        // Use content-based grouping (simplified)
        category = tab.title.split(' ')[0] || 'Content';
        emoji = '📋';
        break;

      case 'ai':
        // Use ML classification
        if (!tabClassifier.initialized) {
          await tabClassifier.initialize();
        }
        const classification = await tabClassifier.classifyTab(tab.title, tab.url);
        category = classification.category;
        emoji = tabClassifier.getCategoryEmoji(category);
        break;

      default:
        return; // Unknown method
    }

    // Find or create group and add tab
    const result = await new Promise((resolve, reject) => {
      groupHandlers.handleFindOrCreateGroupAndAddTab({
        tabId: tab.id,
        categoryName: category,
        categoryEmoji: emoji,
        groupTitle: groupTitle
      }, resolve);
    });

    if (result && result.success) {
      console.log('Background: Successfully auto-grouped tab:', tab.title);
    } else {
      console.warn('Background: Failed to auto-group tab:', result?.error);
    }

  } catch (error) {
    console.error('Background: Error in auto-grouping:', error);
  }
}

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

  // --- Chat Handlers ---
  if (request.action === "EXTRACT_TAB_CONTENT") {
    return chatHandlers.handleExtractTabContent(request, sendResponse);
  }

  if (request.action === "EXTRACT_GROUP_CONTENT") {
    return chatHandlers.handleExtractGroupContent(request, sendResponse);
  }

  if (request.action === "SWITCH_TO_TAB") {
    return chatHandlers.handleSwitchToTab(request, sendResponse);
  }

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

// ===== NEW: LONG-LIVED CONNECTION LISTENER =====
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'chat_stream') {
    chatHandlers.handleChatStreamConnection(port);
  }
});

