// ML-related message handlers
import { tabClassifier } from '../../ml/classifier.js';
import { getGroupColor } from '../utils/groupingAlgorithms.js';

export function handleInitializeML(request, sendResponse) {
  tabClassifier.initialize()
    .then(success => {
      sendResponse({ 
        success: true, 
        initialized: tabClassifier.initialized 
      });
    })
    .catch(error => {
      console.error('Background: ML init error:', error);
      sendResponse({ 
        success: false, 
        error: error.message,
        initialized: false
      });
    });
  return true;
}

export function handlePingML(request, sendResponse) {
  sendResponse({ 
    success: true, 
    initialized: tabClassifier.initialized,
    initializing: !!tabClassifier.initializationPromise
  });
  return true;
}

export function handleClassifyTab(request, sendResponse) {
  const { title, url } = request;
  
  tabClassifier.classifyTab(title, url)
    .then(result => {
      sendResponse({ 
        success: true, 
        classification: result 
      });
    })
    .catch(error => {
      console.error('Background: Classification error:', error);
      sendResponse({ 
        success: false, 
        error: error.message,
        classification: tabClassifier.fallbackClassification(title, url)
      });
    });
  
  return true;
}

export function handleGetSmartGroupName(request, sendResponse) {
  const { tabs } = request;
  
  tabClassifier.getSmartGroupName(tabs)
    .then(groupName => {
      sendResponse({ success: true, groupName });
    })
    .catch(error => {
      console.error('Background: Smart naming error:', error);
      const domain = tabs[0] ? new URL(tabs[0].url).hostname.replace('www.', '') : 'Tabs';
      sendResponse({ success: true, groupName: `📁 ${domain}` });
    });
  
  return true;
}

export function handleTrainModel(request, sendResponse) {
  const { trainingData } = request;
  
  tabClassifier.trainWithUserData(trainingData)
    .then(success => {
      sendResponse({ success });
    })
    .catch(error => {
      console.error('Background: Training error:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  return true;
}

export function handleMlAutoGroupAllTabs(request, sendResponse) {
  const { options = {} } = request;
  
  chrome.tabs.query({}, (allTabs) => {
    const ungroupedTabs = allTabs.filter(tab => 
      tab.groupId === -1 || tab.groupId === undefined
    );
    
    if (ungroupedTabs.length === 0) {
      sendResponse({ 
        success: true, 
        message: "No ungrouped tabs to process",
        groupsCreated: 0,
        totalTabsGrouped: 0
      });
      return true;
    }
    
    tabClassifier.mlAutoGroupAllTabs(ungroupedTabs, options)
      .then(result => {
        if (result.success) {
          // Create the groups in the browser
          const { groups: mlGroups } = result;
          
          if (mlGroups.length > 0) {
            let completed = 0;
            const createdGroups = [];
            
            mlGroups.forEach((group, index) => {
              setTimeout(() => {
                chrome.tabs.group({ tabIds: group.tabIds }, (groupId) => {
                  if (!chrome.runtime.lastError && groupId) {
                    chrome.tabGroups.update(groupId, {
                      title: group.name,
                      color: getGroupColor('content')
                    }, () => {
                      createdGroups.push({
                        groupId,
                        name: group.name,
                        tabCount: group.tabIds.length
                      });
                      
                      completed++;
                      if (completed === mlGroups.length) {
                        sendResponse({
                          success: true,
                          message: `Created ${createdGroups.length} AI-powered groups`,
                          groupsCreated: createdGroups.length,
                          totalTabsGrouped: createdGroups.reduce((sum, g) => sum + g.tabCount, 0),
                          groups: createdGroups
                        });
                      }
                    });
                  } else {
                    completed++;
                    if (completed === mlGroups.length) {
                      sendResponse({
                        success: true,
                        message: `Created ${createdGroups.length} AI-powered groups`,
                        groupsCreated: createdGroups.length,
                        totalTabsGrouped: createdGroups.reduce((sum, g) => sum + g.tabCount, 0),
                        groups: createdGroups
                      });
                    }
                  }
                });
              }, index * 200); // Stagger group creation
            });
          } else {
            sendResponse({
              success: true,
              message: "AI found no suitable groups to create",
              groupsCreated: 0,
              totalTabsGrouped: 0
            });
          }
        } else {
          sendResponse({
            success: false,
            error: result.error || 'ML grouping failed',
            groupsCreated: 0,
            totalTabsGrouped: 0
          });
        }
      })
      .catch(error => {
        console.error('Background: ML auto-group error:', error);
        sendResponse({
          success: false,
          error: error.message,
          groupsCreated: 0,
          totalTabsGrouped: 0
        });
      });
  });
  
  return true;
}
