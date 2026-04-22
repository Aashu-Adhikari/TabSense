// src/background/messageHandlers/analyticsHandlers.js

import { timeTracker } from '../utils/timeTracker.js';

export async function handleGetTimeAnalytics(request, sendResponse) {
  try {
    const data = await timeTracker.getAnalyticsData();
    sendResponse({ success: true, data });
  } catch (error) {
    console.error('Background: Error fetching time analytics:', error);
    sendResponse({ success: false, error: error.message });
  }
  return true;
}
