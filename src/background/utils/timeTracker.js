// src/background/utils/timeTracker.js

class TimeTracker {
  constructor() {
    this.activeTabId = null;
    this.activeWindowId = null;
    this.activeStartTime = null;
    
    // In-memory accumulation: { dateKey: { domain: ms, ... } }
    this.timeData = {};
    this.isTracking = false;
    this.idleState = 'active'; // 'active', 'idle', 'locked'
  }

  async initialize() {
    if (this.isTracking) return;
    
    // Load existing data
    const data = await chrome.storage.local.get(['tab_time_tracking', 'time_tracker_state']);
    this.timeData = data.tab_time_tracking || {};
    
    // Prune old data (keep only last 30 days)
    this.pruneOldData();

    // Recover active state if it exists, otherwise initialize it
    const state = data.time_tracker_state;
    if (state && state.activeTabId && state.activeStartTime) {
      this.activeTabId = state.activeTabId;
      this.activeWindowId = state.activeWindowId;
      this.activeStartTime = state.activeStartTime;
    } else {
      try {
        const tabs = await new Promise(resolve => chrome.tabs.query({ active: true, currentWindow: true }, resolve));
        if (tabs && tabs.length > 0) {
          this.activeTabId = tabs[0].id;
          this.activeWindowId = tabs[0].windowId;
          this.activeStartTime = Date.now();
        }
      } catch (e) {}
    }
    
    this.isTracking = true;
  }

  async ensureInitialized() {
    if (!this.isTracking) {
      await this.initialize();
    }
  }

  getTodayKey() {
    return new Date().toISOString().split('T')[0];
  }

  pruneOldData() {
    const keys = Object.keys(this.timeData);
    if (keys.length > 30) {
      const sortedKeys = keys.sort(); // String sort works for YYYY-MM-DD
      const keysToRemove = sortedKeys.slice(0, sortedKeys.length - 30);
      keysToRemove.forEach(k => delete this.timeData[k]);
      this.saveToStorage();
    }
  }

  async flushCurrentActiveTime() {
    await this.ensureInitialized();
    if (!this.activeTabId || !this.activeStartTime || this.idleState !== 'active') return;

    const now = Date.now();
    const duration = now - this.activeStartTime;
    
    if (duration < 1000) return; // Ignore < 1 second

    try {
      const tab = await new Promise(resolve => chrome.tabs.get(this.activeTabId, resolve));
      if (tab && tab.url) {
        // Skip chrome:// and extension pages
        if (!tab.url.startsWith('http')) {
          this.activeStartTime = now;
          this.saveStateToStorage();
          return;
        }

        let domain = 'unknown';
        try {
          domain = new URL(tab.url).hostname.replace('www.', '');
        } catch (e) {}

        const today = this.getTodayKey();
        if (!this.timeData[today]) {
          this.timeData[today] = { domains: {}, tabs: {}, total: 0 };
        }

        // Add to domain
        this.timeData[today].domains[domain] = (this.timeData[today].domains[domain] || 0) + duration;
        
        // Add to specific tab (using tab.id)
        const tabKey = `${tab.id}_${domain}`;
        if (!this.timeData[today].tabs[tabKey]) {
          this.timeData[today].tabs[tabKey] = { time: 0, title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl };
        }
        this.timeData[today].tabs[tabKey].time += duration;
        this.timeData[today].tabs[tabKey].title = tab.title; // Update title in case it changed

        // Add to total
        this.timeData[today].total += duration;
      }
    } catch (e) {
      // Tab might be closed
    }

    this.activeStartTime = now; // Reset start time for continuous tracking
    this.saveStateToStorage();
  }

  saveStateToStorage() {
    chrome.storage.local.set({
      time_tracker_state: {
        activeTabId: this.activeTabId,
        activeWindowId: this.activeWindowId,
        activeStartTime: this.activeStartTime
      }
    });
  }

  async handleTabActivated(tabId, windowId) {
    await this.ensureInitialized();
    if (this.idleState !== 'active') return;
    await this.flushCurrentActiveTime();
    this.activeTabId = tabId;
    this.activeWindowId = windowId;
    this.activeStartTime = Date.now();
    this.saveStateToStorage();
  }

  async handleWindowFocusChanged(windowId) {
    await this.ensureInitialized();
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // Browser lost focus
      await this.flushCurrentActiveTime();
      this.activeStartTime = null;
      this.saveStateToStorage();
    } else {
      // Browser gained focus
      const tabs = await new Promise(resolve => chrome.tabs.query({ active: true, windowId: windowId }, resolve));
      if (tabs.length > 0) {
        await this.handleTabActivated(tabs[0].id, windowId);
      }
    }
  }

  async handleIdleStateChanged(newState) {
    await this.ensureInitialized();
    this.idleState = newState;
    if (newState === 'active') {
      // Woke up
      this.activeStartTime = Date.now();
    } else {
      // Went idle or locked
      await this.flushCurrentActiveTime();
      this.activeStartTime = null;
    }
    this.saveStateToStorage();
  }

  async saveToStorage() {
    await this.flushCurrentActiveTime();
    await chrome.storage.local.set({ tab_time_tracking: this.timeData });
  }

  async getAnalyticsData() {
    await this.ensureInitialized();
    await this.flushCurrentActiveTime();
    const today = this.getTodayKey();
    
    // Calculate last 7 days keys
    const history = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      history.push({
        date: key,
        total: this.timeData[key] ? this.timeData[key].total : 0
      });
    }

    return {
      today: this.timeData[today] || { domains: {}, tabs: {}, total: 0 },
      history
    };
  }
}

export const timeTracker = new TimeTracker();

// Top-level listener registration required for Manifest V3 Service Workers
chrome.tabs.onActivated.addListener(activeInfo => timeTracker.handleTabActivated(activeInfo.tabId, activeInfo.windowId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === timeTracker.activeTabId && changeInfo.url) {
    timeTracker.flushCurrentActiveTime().then(() => {
      timeTracker.activeStartTime = Date.now();
    });
  }
});
chrome.windows.onFocusChanged.addListener(windowId => timeTracker.handleWindowFocusChanged(windowId));
if (chrome.idle) {
  chrome.idle.onStateChanged.addListener(newState => timeTracker.handleIdleStateChanged(newState));
}
setInterval(() => timeTracker.saveToStorage(), 60000);
