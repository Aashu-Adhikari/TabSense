// src/hooks/useGroups.js
import { useState, useEffect } from 'react';
import { chromeApi } from '../services/chromeApi';

export const useGroups = () => {
  const [groups, setGroups] = useState([]);
  const [ungroupedTabs, setUngroupedTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGroupsAndTabs = async () => {
    try {
      setLoading(true);
      setError(null);

      // --- OPTIMIZATION: STALE-WHILE-REVALIDATE ---

      // 1. INSTANTLY LOAD FROM CACHE FOR A FAST UI
      const cachedData = await new Promise(resolve => {
        chrome.storage.local.get(['cachedGroups', 'cachedUngroupedTabs'], resolve);
      });

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

  const handleUngroupAll = async (groupId) => {
    if (!confirm("Ungroup all tabs in this group?")) return;

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
    window.close();
  };

  useEffect(() => {
    fetchGroupsAndTabs();
  }, []);

  return {
    groups,
    ungroupedTabs,
    loading,
    error,
    fetchGroupsAndTabs,
    handleUngroupSingleTab,
    handleUngroupAll,
    handleRenameGroup,
    handleAddToGroup,
    handleOpenTab
  };
};