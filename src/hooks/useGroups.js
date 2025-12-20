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
      const response = await chromeApi.getGroupsWithTabs();
      
      if (response && response.success) {
        setGroups(response.groups);
        setUngroupedTabs(response.ungroupedTabs);
      } else {
        throw new Error('Failed to fetch groups');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUngroupSingleTab = async (groupId, tabId) => {
    try {
      await chromeApi.ungroupSingleTab(tabId);
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
