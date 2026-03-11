import { useState, useEffect } from 'react';
import { chromeApi } from '../services/chromeApi';
import { emojiService } from '../services/emojiService';

export const useGroups = () => {
  const [groups, setGroups] = useState([]);
  const [ungroupedTabs, setUngroupedTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [domainSettings, setDomainSettings] = useState({});

  const fetchGroupsAndTabs = async () => {
    try {
      setLoading(true);
      setError(null);

      // --- OPTIMIZATION: STALE-WHILE-REVALIDATE ---

      // 1. INSTANTLY LOAD FROM CACHE FOR A FAST UI
      const cachedData = await new Promise(resolve => {
        chrome.storage.local.get(['cachedGroups', 'cachedUngroupedTabs'], resolve);
      });

      // Load custom domain settings
      const settings = await emojiService.getDomainSettings();
      setDomainSettings(settings);

      if (cachedData.cachedGroups && cachedData.cachedUngroupedTabs) {
        console.log('Hook: Loaded data from cache.');
        setGroups(cachedData.cachedGroups);
        setUngroupedTabs(cachedData.cachedUngroupedTabs);
        setLoading(false); // UI is now populated, stop the main loading indicator.
      }

      // 2. THEN, FETCH FRESH DATA FROM THE BACKGROUND TO SYNCHRONIZE
      console.log('Hook: Fetching fresh data from service worker...');
      const freshResponse = await chromeApi.getGroupsWithTabs();

      if (freshResponse && freshResponse.success) {
        console.log('Hook: Updated UI with fresh data.');
        // This will cause a quick, seamless re-render if anything changed
        // since the cache was last written.
        setGroups(freshResponse.groups);
        setUngroupedTabs(freshResponse.ungroupedTabs);
      } else {
        // If the fresh fetch fails, we still have the cached data,
        // so we don't need to throw a breaking error.
        console.error('Hook: Failed to fetch fresh data, using cached version.');
        // Optionally, set an error to notify the user that data might be stale.
        setError('Could not sync latest tab data.');
      }

    } catch (err) {
      setError(err.message);
      console.error('Error in fetchGroupsAndTabs:', err);
    } finally {
      // Ensure loading is always false in the end, even if cache was empty.
      setLoading(false);
    }
  };

  const handleUngroupSingleTab = async (groupId, tabId) => {
    try {
      await chromeApi.ungroupSingleTab(tabId);
      // The background script's event listener will update the cache automatically.
      // For instant UI feedback, we can manually refetch here.
      await fetchGroupsAndTabs();
    } catch (err) {
      setError(err.message);
    }
  };

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const handleDeleteGroup = async (groupId) => {
    try {
      const response = await chromeApi.deleteGroup(groupId);
      if (response && response.success) {
        const groupData = response.groupData;
        const timestamp = Date.now();

        const undoItem = {
          groupData,
          timestamp,
          expiresAt: timestamp + 60000 // 60 seconds
        };

        // Add to undo stack, clear redo stack (new action breaks redo chain)
        setUndoStack(prev => [...prev, undoItem]);
        setRedoStack([]);

        // Auto-expire after 60 seconds
        setTimeout(() => {
          setUndoStack(prev => {
            const filtered = prev.filter(item => item.timestamp !== timestamp);
            // If this was the last undo item and we have redo items, clear redo
            if (filtered.length === 0) {
              setRedoStack([]);
            }
            return filtered;
          });
        }, 60000);

        await fetchGroupsAndTabs();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUndoDelete = async () => {
    if (undoStack.length === 0) return;
    
    // Get the most recent undo item
    const undoItem = undoStack[undoStack.length - 1];
    if (!undoItem) return;

    try {
      const response = await chromeApi.undoDeleteGroup(undoItem.groupData);
      if (response && response.success) {
        // Move from undo stack to redo stack
        setUndoStack(prev => prev.slice(0, -1));
        setRedoStack(prev => [...prev, undoItem]);
        await fetchGroupsAndTabs();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRedoDelete = async () => {
    if (redoStack.length === 0) return;
    
    // Get the most recent redo item
    const redoItem = redoStack[redoStack.length - 1];
    if (!redoItem) return;

    // Check if the item has expired
    if (Date.now() > redoItem.expiresAt) {
      setRedoStack(prev => prev.slice(0, -1));
      return;
    }

    try {
      // Find the restored group by matching tabs
      const currentGroups = await new Promise(resolve => 
        chrome.runtime.sendMessage({ action: "GET_GROUPS_WITH_TABS" }, resolve)
      );
      
      if (!currentGroups || !currentGroups.success) {
        throw new Error('Could not fetch current groups');
      }

      // Find the group that contains the same tabs
      const restoredGroup = currentGroups.groups.find(g => {
        const groupTabIds = g.tabs.map(t => t.id);
        const originalTabIds = redoItem.groupData.tabs.map(t => t.id);
        // Check if all original tab IDs are in this group
        return originalTabIds.every(id => groupTabIds.includes(id));
      });

      if (!restoredGroup) {
        throw new Error('Restored group not found');
      }

      // Now delete this group
      const response = await chromeApi.deleteGroup(restoredGroup.id);
      if (response && response.success) {
        // Move from redo stack back to undo stack
        setRedoStack(prev => prev.slice(0, -1));
        const newUndoItem = {
          groupData: response.groupData,
          timestamp: Date.now(),
          expiresAt: Date.now() + 60000
        };
        setUndoStack(prev => [...prev, newUndoItem]);
        await fetchGroupsAndTabs();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUngroupAll = async (groupId, skipConfirm = false) => {
    if (!skipConfirm && !confirm("Ungroup all tabs in this group? (Tabs will stay open)")) return;

    try {
      await chromeApi.ungroupAllTabs(groupId);
      await fetchGroupsAndTabs();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRenameGroup = async (groupId, newName) => {
    if (!newName.trim()) return;

    try {
      await chromeApi.renameGroup(groupId, newName);
      await fetchGroupsAndTabs();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddToGroup = async (tabId, groupId) => {
    try {
      await chromeApi.addTabToGroup(tabId, groupId);
      await fetchGroupsAndTabs();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenTab = (tabId, windowId) => {
    chrome.tabs.update(tabId, { active: true });
    chrome.windows.update(windowId, { focused: true });

    // Check if we are in a popup (extension's own window/popup has tabId)
    // or just close if it's the popup
    if (typeof window !== 'undefined' && window.close) {
      window.close();
    }
  };

  const handleSaveDomainSetting = async (domain, settings) => {
    try {
      await emojiService.setDomainSetting(domain, settings);

      // Update local state
      const updatedSettings = await emojiService.getDomainSettings();
      setDomainSettings(updatedSettings);

      // Find active groups that match this domain and update their titles
      const groupsToUpdate = groups.filter(g => {
        // Check if group is a single-domain group matching the updated domain
        const firstHostname = g.tabs.length > 0 ? new URL(g.tabs[0].url).hostname.replace('www.', '') : null;
        return firstHostname === domain && g.tabs.every(tab => new URL(tab.url).hostname.replace('www.', '') === firstHostname);
      });

      for (const group of groupsToUpdate) {
        const currentSettings = updatedSettings[domain] || {};
        const name = currentSettings.name || domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);

        let newTitle;
        if (currentSettings.emoji) {
          newTitle = `${currentSettings.emoji} ${name}`;
        } else {
          newTitle = `🌍 ${name}`;
        }

        await chromeApi.renameGroup(group.id, newTitle);
      }

      // Refresh groups to reflect changes
      await fetchGroupsAndTabs();

    } catch (err) {
      console.error('Failed to save domain setting:', err);
      setError('Failed to save domain setting');
    }
  };

  useEffect(() => {
    fetchGroupsAndTabs();
  }, []);

  useEffect(() => {
    const handleStorageChange = (changes, areaName) => {
      if (areaName !== 'local') return;
      if (changes.cachedGroups || changes.cachedUngroupedTabs) {
        const cachedGroups = changes.cachedGroups?.newValue;
        const cachedUngroupedTabs = changes.cachedUngroupedTabs?.newValue;
        if (cachedGroups) {
          setGroups(cachedGroups);
        }
        if (cachedUngroupedTabs) {
          setUngroupedTabs(cachedUngroupedTabs);
        }
        setLoading(false);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  return {
    groups,
    ungroupedTabs,
    loading,
    error,
    domainSettings,
    undoStack,
    redoStack,
    fetchGroupsAndTabs,
    handleUngroupSingleTab,
    handleUngroupAll,
    handleDeleteGroup,
    handleUndoDelete,
    handleRedoDelete,
    handleRenameGroup,
    handleAddToGroup,
    handleOpenTab,
    handleSaveDomainSetting
  };
};
