// Background Service Worker - Handles core tab operations

// Listen for a message from the popup asking for tab data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_ALL_TABS") {
    // Use the Chrome API to get all tabs in all windows
    chrome.tabs.query({}, (tabs) => {
      // Format the data to send only what we need
      const tabData = tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        windowId: tab.windowId
      }));
      // Send the formatted data back to the popup
      sendResponse({ success: true, tabs: tabData });
    });
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});