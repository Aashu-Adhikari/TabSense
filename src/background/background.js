// src/background/background.js

// Background Service Worker - Modular Architecture
import { tabClassifier } from '../ml/classifier.js';

// Import all message handlers
import * as tabHandlers from './messageHandlers/tabHandlers.js';
import * as groupHandlers from './messageHandlers/groupHandlers.js';
import * as searchHandlers from './messageHandlers/searchHandlers.js';
import * as mlHandlers from './messageHandlers/mlHandlers.js';

// Proactive Caching Logic (no changes here)
async function updateTabCache() { /* ... */ }
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
chrome.runtime.onStartup.addListener(updateTabCache);
chrome.runtime.onInstalled.addListener(updateTabCache);

// =================================================================
// ===== REMOVED THE OLD onUpdated EVENT LISTENER ==================
// =================================================================

// ML Initialization (no changes here)
tabClassifier.initialize().then(() => {
  console.log('Background: ML initialized successfully');
}).catch(error => {
  console.error('Background: ML initialization failed:', error);
});

// Message Listener (modified)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Tab handlers
  if (request.action === "GET_ALL_TABS") return tabHandlers.handleGetAllTabs(request, sendResponse);
  if (request.action === "GET_GROUPS_WITH_TABS") return tabHandlers.handleGetGroupsWithTabs(request, sendResponse);
  if (request.action === "UNGROUP_SINGLE_TAB") return tabHandlers.handleUngroupSingleTab(request, sendResponse);
  if (request.action === "ADD_TAB_TO_GROUP") return tabHandlers.handleAddToGroup(request, sendResponse);

  // Group handlers
  if (request.action === "GROUP_TABS") return groupHandlers.handleGroupTabs(request, sendResponse);
  if (request.action === "AUTO_GROUP_TABS") return groupHandlers.handleAutoGroupTabs(request, sendResponse);
  if (request.action === "GROUP_BY_DOMAIN") return groupHandlers.handleGroupByDomain(request, sendResponse);
  if (request.action === "GROUP_BY_CONTENT") return groupHandlers.handleGroupByContent(request, sendResponse);
  if (request.action === "UNGROUP_ALL_TABS") return groupHandlers.handleUngroupAllTabs(request, sendResponse);
  if (request.action === "RENAME_GROUP") return groupHandlers.handleRenameGroup(request, sendResponse);
  
  // ===== NEW ACTION for finding/creating a group from an ML category =====
  if (request.action === "FIND_OR_CREATE_GROUP_AND_ADD_TAB") {
    return groupHandlers.handleFindOrCreateGroupAndAddTab(request, sendResponse);
  }

  // Search handlers
  if (request.action === "SEARCH_ALL_TABS") return searchHandlers.handleSearchAllTabs(request, sendResponse);

  // ML handlers
  if (request.action === "INITIALIZE_ML") return mlHandlers.handleInitializeML(request, sendResponse);
  if (request.action === "PING_ML") return mlHandlers.handlePingML(request, sendResponse);
  if (request.action === "CLASSIFY_TAB") return mlHandlers.handleClassifyTab(request, sendResponse);
  if (request.action === "GET_SMART_GROUP_NAME") return mlHandlers.handleGetSmartGroupName(request, sendResponse);
  if (request.action === "TRAIN_MODEL") return mlHandlers.handleTrainModel(request, sendResponse);
  if (request.action === "ML_AUTO_GROUP_ALL_TABS") return mlHandlers.handleMlAutoGroupAllTabs(request, sendResponse);

  // ===== NEW ACTION for precise, user-directed learning =====
  if (request.action === "LEARN_FROM_ASSIGNMENT") {
    mlHandlers.handleLearnFromAssignment(request);
    return false; // No response needed
  }

  // Default response for unknown actions
  sendResponse({ success: false, error: `Unknown action: ${request.action}` });
  return false;
});