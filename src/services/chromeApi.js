// Chrome Extension API Service
class ChromeApiService {
  // Get all tabs
  async getAllTabs() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "GET_ALL_TABS" }, resolve);
    });
  }

  // Get groups with tabs
  async getGroupsWithTabs() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "GET_GROUPS_WITH_TABS" }, resolve);
    });
  }

  // Group tabs
  async groupTabs(tabIds, groupName) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: "GROUP_TABS", 
        tabIds, 
        groupName 
      }, resolve);
    });
  }

  // Auto group tabs (legacy - now uses domain grouping)
  async autoGroupTabs() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "AUTO_GROUP_TABS" }, resolve);
    });
  }

  // Group by domain
  async groupByDomain() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "GROUP_BY_DOMAIN" }, resolve);
    });
  }

  // Group by content
  async groupByContent() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "GROUP_BY_CONTENT" }, resolve);
    });
  }

  // Group by AI
  async groupByAI() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "GROUP_BY_AI" }, resolve);
    });
  }

  // Ungroup single tab
  async ungroupSingleTab(tabId) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: "UNGROUP_SINGLE_TAB", 
        tabId 
      }, resolve);
    });
  }

  // Ungroup all tabs
  async ungroupAllTabs(groupId) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: "UNGROUP_ALL_TABS", 
        groupId 
      }, resolve);
    });
  }

  // Add tab to group
  async addTabToGroup(tabId, groupId) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: "ADD_TAB_TO_GROUP", 
        tabId, 
        groupId 
      }, resolve);
    });
  }

  // Rename group
  async renameGroup(groupId, newName) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: "RENAME_GROUP", 
        groupId, 
        newName 
      }, resolve);
    });
  }

  // Move tab group
  async moveTabGroup(groupId, index, windowId) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: "MOVE_TAB_GROUP",
        groupId,
        index,
        windowId
      }, resolve);
    });
  }

  // Search all tabs
  async searchAllTabs(searchTerm) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: "SEARCH_ALL_TABS", 
        searchTerm 
      }, resolve);
    });
  }

    async findOrCreateGroupAndAddTab(tabId, categoryName, categoryEmoji) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: "FIND_OR_CREATE_GROUP_AND_ADD_TAB",
        tabId,
        categoryName,
        categoryEmoji
      }, resolve);
    });
  }

  async learnFromAssignment(tab, correctLabel) {
    // This is a "fire and forget" message, no response needed.
    chrome.runtime.sendMessage({
      action: "LEARN_FROM_ASSIGNMENT",
      tab,
      correctLabel
    });
  }

  // ML Operations
  async initializeML() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "INITIALIZE_ML" }, resolve);
    });
  }

  async classifyTab(title, url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: "CLASSIFY_TAB", 
        title, 
        url 
      }, resolve);
    });
  }

  async getSmartGroupName(tabs) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: "GET_SMART_GROUP_NAME", 
        tabs 
      }, resolve);
    });
  }

  async trainModel(trainingData) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: "TRAIN_MODEL", 
        trainingData 
      }, resolve);
    });
  }

  async mlAutoGroupAllTabs(options) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: "ML_AUTO_GROUP_ALL_TABS",
        options
      }, resolve);
    });
  }

  async extractGroupContent(groupId) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "EXTRACT_GROUP_CONTENT", groupId }, resolve);
    });
  }

  async pingML() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "PING_ML" }, resolve);
    });
  }

  // ===== CHAT METHODS =====
  async extractTabContent(tabId) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "EXTRACT_TAB_CONTENT", tabId }, resolve);
    });
  }

  async sendChatMessage(messages, context) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "SEND_CHAT_MESSAGE", messages, context }, resolve);
    });
  }

    connectChatStream(messages, context, callbacks) {
    const { onChunk, onEnd, onError } = callbacks;
    const port = chrome.runtime.connect({ name: 'chat_stream' });

    // Send the initial request payload
    port.postMessage({ messages, context });

    // Listen for stream messages from background
    port.onMessage.addListener((msg) => {
      if (msg.type === 'chunk') {
        if (onChunk) onChunk(msg.text);
      } else if (msg.type === 'end') {
        if (onEnd) onEnd();
        port.disconnect();
      } else if (msg.type === 'error') {
        if (onError) onError(msg.text);
        port.disconnect();
      }
    });

    // Handle disconnection (e.g., service worker dies)
    port.onDisconnect.addListener(() => {
      if (chrome.runtime.lastError) {
        if (onError) onError(chrome.runtime.lastError.message);
      }
    });

    // Return a function to manually cancel the stream
    return () => port.disconnect();
  }

  async saveLLMConfig(config) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "SAVE_LLM_CONFIG", config }, resolve);
    });
  }


  async getLLMConfig() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "GET_LLM_CONFIG" }, resolve);
    });
  }

  async switchToTab(tabId) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "SWITCH_TO_TAB", tabId }, resolve);
    });
  }

}


export const chromeApi = new ChromeApiService();
