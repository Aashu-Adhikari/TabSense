// Content script for the Chrome extension
console.log('Content script loaded');

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'injectContent') {
    // Example: Inject content into the page
    const element = document.createElement('div');
    element.innerHTML = request.content;
    element.style.position = 'fixed';
    element.style.bottom = '10px';
    element.style.right = '10px';
    element.style.padding = '10px';
    element.style.background = 'white';
    element.style.border = '1px solid #ccc';
    element.style.zIndex = '9999';
    document.body.appendChild(element);
    
    sendResponse({ success: true });
    return true;
  }
  
  return false;
});

// Send initial message to background script
chrome.runtime.sendMessage({ action: 'contentScriptReady' }, (response) => {
  console.log('Response from background:', response);
});
