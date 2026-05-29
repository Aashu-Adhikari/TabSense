// src/background/utils/staleTabMonitor.js

import { llmService } from '../../services/llmService.js';

const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours
// For testing, can change to 1 * 60 * 1000 (1 minute) if needed

export const staleTabMonitor = {
  async checkForStaleTabs() {
    try {
      console.log('Background: Checking for stale tabs...');
      const allTabs = await new Promise(resolve => chrome.tabs.query({}, resolve));
      
      const now = Date.now();
      const staleTabs = allTabs.filter(tab => {
        // Skip active tab
        if (tab.active) return false;
        
        // Skip tabs in groups
        if (tab.groupId !== -1 && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) return false;
        
        // Check age if lastAccessed is available
        if (tab.lastAccessed) {
          return (now - tab.lastAccessed) > STALE_THRESHOLD_MS;
        }
        
        return false;
      });

      if (staleTabs.length === 0) {
        console.log('Background: No stale tabs found.');
        return;
      }

      console.log(`Background: Found ${staleTabs.length} stale tabs. Classifying...`);
      
      // Lazily import ML to save resources when not used
      const { tabClassifier } = await import('../../ml/classifier.js');
      if (!tabClassifier.initialized) {
        await tabClassifier.initialize();
      }

      // Group stale tabs by category
      const categorizedTabs = {};
      
      for (const tab of staleTabs) {
        // Skip extension pages, etc
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue;
        
        const classification = await tabClassifier.classifyTab(tab.title, tab.url);
        const category = classification.category || 'General';
        
        if (!categorizedTabs[category]) {
          categorizedTabs[category] = [];
        }
        categorizedTabs[category].push(tab);
      }
      
      // Find the most populated category with > 2 tabs
      let maxCategory = null;
      let maxCount = 0;
      
      for (const [category, tabs] of Object.entries(categorizedTabs)) {
        if (tabs.length > maxCount) {
          maxCount = tabs.length;
          maxCategory = category;
        }
      }
      
      // If we have a significant cluster of stale tabs
      if (maxCategory && maxCount > 2) { // Notify if 3 or more
        console.log(`Background: Notifying about ${maxCount} stale tabs in ${maxCategory}`);
        
        // Save the tab IDs we're notifying about so we can close them if accepted
        const tabIds = categorizedTabs[maxCategory].map(t => t.id);
        await chrome.storage.local.set({ stale_tab_intervention: { category: maxCategory, tabIds } });
        
        chrome.notifications.create('stale-tabs-notification', {
          type: 'basic',
          iconUrl: '../../icons/icon128.png', // Relative path from background script
          title: 'TabSense Declutter',
          message: `You have ${maxCount} old tabs about '${maxCategory}'. Want me to extract the key takeaways and close them?`,
          buttons: [
            { title: 'Extract & Close' },
            { title: 'Ignore' }
          ],
          requireInteraction: true
        });
      }
      
    } catch (error) {
      console.error('Background: Error checking for stale tabs:', error);
    }
  },

  async handleNotificationAction(notificationId, buttonIndex) {
    if (notificationId !== 'stale-tabs-notification') return;

    if (buttonIndex === 0) {
      // "Extract & Close"
      try {
        const { stale_tab_intervention } = await chrome.storage.local.get('stale_tab_intervention');
        if (!stale_tab_intervention || !stale_tab_intervention.tabIds) return;
        
        const { category, tabIds } = stale_tab_intervention;
        console.log(`Background: Extracting and closing ${tabIds.length} tabs for category ${category}`);
        
        // Ensure side panel is open to show the result
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
          chrome.sidePanel.open({ tabId: tabs[0].id }).catch(() => {
            chrome.sidePanel.open({ windowId: tabs[0].windowId }).catch(console.error);
          });
        }
        
        // Here we simulate the group extraction flow but for specific tab IDs
        // We can send a message to the chat handlers, but we are inside background,
        // we can just directly extract text and send to LLM
        const chatHandlers = await import('../messageHandlers/chatHandlers.js');
        
        // Wait, chatHandlers expects a request format for EXTRACT_GROUP_CONTENT
        // Instead, let's extract manually or use llmService directly
        
        // Notify UI that a background extraction is happening
        chrome.runtime.sendMessage({ 
          type: 'START_CHAT', 
          message: `I'm extracting key takeaways from your ${tabIds.length} old tabs about '${category}'...` 
        }).catch(() => {}); // Ignore error if UI not open
        
        let aggregatedText = '';
        const validTabIds = [];
        
        // 1. Gather text from all tabs
        for (const tabId of tabIds) {
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tabId },
              func: () => document.body ? document.body.innerText : ''
            });
            
            if (results && results[0] && results[0].result) {
              const text = results[0].result.substring(0, 5000); // 5k chars per tab
              const tabInfo = await chrome.tabs.get(tabId);
              aggregatedText += `\n\n--- TAB: ${tabInfo.title} ---\n${text}`;
              validTabIds.push(tabId);
            } else {
               // Add tab even if we can't extract, so we close it
               validTabIds.push(tabId);
            }
          } catch (e) {
            console.warn(`Failed to extract from tab ${tabId}:`, e);
            validTabIds.push(tabId); // Still want to close it
          }
        }
        
        // 2. Send to LLM
        if (aggregatedText.trim()) {
           try {
             // Create a chat summary
             const prompt = `Please extract the key takeaways and summarize the following content from ${validTabIds.length} old tabs about '${category}'. Organize by main concepts:\n\n${aggregatedText}`;
             
             // Check if llm config is available
             const config = await llmService.getSettings();
             let summary = '';
             
             if (!config.apiKey) {
               summary = "Error: LLM API key not configured. I've closed the tabs but couldn't generate a summary. Please configure your API key in Settings.";
             } else {
               // Provide empty history
               summary = await llmService.generateResponse(prompt, []);
             }
             
             // Save to a new chat history
             const chatId = `chat_${Date.now()}`;
             const newChat = {
                id: chatId,
                timestamp: Date.now(),
                title: `Key Takeaways: ${category}`,
                messages: [
                  { role: 'user', content: `Please summarize my ${validTabIds.length} old tabs about '${category}'` },
                  { role: 'assistant', content: summary, citations: [] }
                ]
             };
             
             await chrome.storage.local.set({ [chatId]: newChat });
             
             // Notify UI to load this new chat
             chrome.runtime.sendMessage({ 
               type: 'CHAT_GENERATED', 
               chatId: chatId,
               chatTitle: newChat.title
             }).catch(() => {});
             
           } catch (err) {
              console.error('LLM summarization failed:', err);
              // Still close them
           }
        }
        
        // 3. Close the tabs
        if (validTabIds.length > 0) {
           await chrome.tabs.remove(validTabIds);
        }
        
      } catch (e) {
        console.error('Error during extraction and close:', e);
      }
    }
    
    // In both cases (Extract or Ignore), clean up state
    await chrome.storage.local.remove('stale_tab_intervention');
    chrome.notifications.clear('stale-tabs-notification');
  }
};
