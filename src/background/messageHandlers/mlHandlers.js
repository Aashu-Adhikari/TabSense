// src/background/messageHandlers/mlHandlers.js
import { tabClassifier } from '../../ml/classifier.js';
import { getGroupColor } from '../utils/groupingAlgorithms.js';

// =================================================================
// ===== REVISED: PRECISE AUTO-LEARNING IMPLEMENTATION =============
// =================================================================

const USER_TRAINING_DATA_KEY = 'userGeneratedTrainingData';
const TRAINING_THRESHOLD = 50; // Trigger retraining after collecting 10 new examples.

let isTrainingInProgress = false;

/**
 * Learns from a user explicitly assigning a tab to an ML category.
 * @param {object} request Contains the tab and the correct ML label.
 */
async function runTrainingCycle() {
  if (isTrainingInProgress) {
    console.log('Learning: Training is already in progress. Skipping new cycle for now.');
    return;
  }

  try {
    isTrainingInProgress = true;
    console.log('Learning: Starting a new training cycle.');

    const result = await new Promise(resolve => chrome.storage.local.get([USER_TRAINING_DATA_KEY], resolve));
    let pendingData = result[USER_TRAINING_DATA_KEY] || [];

    // Keep training as long as there is enough data.
    // This handles the case where new data arrives while a training session is active.
    while (pendingData.length >= TRAINING_THRESHOLD) {
      console.log(`Learning: Found ${pendingData.length} examples. Starting model retraining...`);
      
      // We take a snapshot of the data we're about to train on.
      const trainingBatch = [...pendingData];
      
      const success = await tabClassifier.trainWithUserData(trainingBatch);

      if (success) {
        console.log('Learning: Model retrained successfully.');
        // IMPORTANT: Only remove the data that we just trained on.
        // First, get the latest pending data again.
        const latestResult = await new Promise(resolve => chrome.storage.local.get([USER_TRAINING_DATA_KEY], resolve));
        const latestPendingData = latestResult[USER_TRAINING_DATA_KEY] || [];
        
        // Filter out the items that were in our successful batch.
        const remainingData = latestPendingData.slice(trainingBatch.length);
        
        await new Promise(resolve => chrome.storage.local.set({ [USER_TRAINING_DATA_KEY]: remainingData }, resolve));
        console.log(`Learning: ${remainingData.length} examples remain pending.`);
        
        // Update our local variable for the next loop iteration.
        pendingData = remainingData;

      } else {
        console.error('Learning: Model retraining failed. Data will be kept for next attempt.');
        // If it fails, stop the cycle to prevent repeated failures.
        break; 
      }
    }

  } catch (error) {
    console.error('Learning: A critical error occurred in the training cycle:', error);
  } finally {
    console.log('Learning: Training cycle finished.');
    // Release the lock so a new cycle can be triggered later.
    isTrainingInProgress = false;
  }
}

/**
 * Adds a new training example and triggers the training cycle if needed.
 * This function is now very fast and does not await the training itself.
 */
export async function handleLearnFromAssignment(request) {
  const { tab, correctLabel } = request;
  console.log(`Learning: Received new example for tab "${tab.title}" -> "${correctLabel}".`);

  try {
    const newTrainingExample = { text: `${tab.title} ${tab.url}`, label: correctLabel };
    
    const result = await new Promise(resolve => chrome.storage.local.get([USER_TRAINING_DATA_KEY], resolve));
    const pendingData = result[USER_TRAINING_DATA_KEY] || [];
    const allPendingData = [...pendingData, newTrainingExample];
    
    // Save the new data immediately.
    await new Promise(resolve => chrome.storage.local.set({ [USER_TRAINING_DATA_KEY]: allPendingData }, resolve));
    console.log(`Learning: ${allPendingData.length} total training examples are now pending.`);
    
    // Trigger the training cycle. This call is NOT awaited.
    // It will run in the background without blocking the user's action.
    runTrainingCycle();

  } catch (error) {
    console.error('Learning: Failed to add new training example:', error);
  }
}


// (The rest of this file remains exactly the same. No other functions are changed.)

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
                      color: getGroupColor('content'),
                      collapsed: true
                    }, () => {
                      if (chrome.runtime.lastError) {
                        console.error(`Failed to update AI group ${group.name}:`, chrome.runtime.lastError);
                      }

                      createdGroups.push({
                        groupId,
                        name: group.name,
                        tabCount: group.tabIds.length
                      });

                      completed++;
                      if (completed === mlGroups.length) {
                        // Ensure all groups stay collapsed after creation
                        setTimeout(() => {
                          const collapsePromises = createdGroups.map(createdGroup => {
                            return new Promise(resolve => {
                              chrome.tabGroups.update(createdGroup.groupId, { collapsed: true }, () => {
                                if (chrome.runtime.lastError) {
                                  console.debug(`Failed to ensure AI group ${createdGroup.name} stays collapsed:`, chrome.runtime.lastError);
                                }
                                resolve();
                              });
                            });
                          });

                          Promise.all(collapsePromises).then(() => {
                            chrome.tabs.query({}, (allCurrentTabs) => {
                              const remainingUngrouped = allCurrentTabs.filter(tab =>
                                tab.groupId === -1 || tab.groupId === undefined
                              );

                              if (remainingUngrouped.length === 0) {
                                sendResponse({
                                  success: true,
                                  message: `Created ${createdGroups.length} AI-powered groups`,
                                  groupsCreated: createdGroups.length,
                                  totalTabsGrouped: createdGroups.reduce((sum, g) => sum + g.tabCount, 0),
                                  groups: createdGroups
                                });
                                return;
                              }

                              const remainingByWindow = {};
                              remainingUngrouped.forEach(tab => {
                                if (!remainingByWindow[tab.windowId]) {
                                  remainingByWindow[tab.windowId] = [];
                                }
                                remainingByWindow[tab.windowId].push(tab.id);
                              });

                              const windowKeys = Object.keys(remainingByWindow);
                              if (windowKeys.length === 0) {
                                sendResponse({
                                  success: true,
                                  message: `Created ${createdGroups.length} AI-powered groups`,
                                  groupsCreated: createdGroups.length,
                                  totalTabsGrouped: createdGroups.reduce((sum, g) => sum + g.tabCount, 0),
                                  groups: createdGroups
                                });
                                return;
                              }

                              let windowsCompleted = 0;
                              windowKeys.forEach(windowId => {
                                const tabIds = remainingByWindow[windowId];
                                chrome.tabs.group({ tabIds }, (groupId) => {
                                  if (!chrome.runtime.lastError && groupId) {
                                    chrome.tabGroups.update(groupId, {
                                      title: 'Random Browsing',
                                      color: getGroupColor('content'),
                                      collapsed: true
                                    }, () => {
                                      createdGroups.push({
                                        groupId,
                                        name: 'Random Browsing',
                                        tabCount: tabIds.length
                                      });
                                      windowsCompleted++;
                                      if (windowsCompleted === windowKeys.length) {
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
                                    windowsCompleted++;
                                    if (windowsCompleted === windowKeys.length) {
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
                              });
                            });
                          });
                        }, 300);
                      }
                    });
                  } else {
                    console.error(`Failed to create AI group ${group.name}:`, chrome.runtime.lastError);
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
              }, index * 200);
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
