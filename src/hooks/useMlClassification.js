import { useState, useEffect } from 'react';
import { chromeApi } from '../services/chromeApi';

export const useMlClassification = () => {
  const [mlInitialized, setMlInitialized] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState(null);

  // Initialize ML on component mount
  useEffect(() => {
    const initializeML = async () => {
      try {
        setInitializing(true);
        setError(null);
        
        const response = await chromeApi.initializeML();
        
        if (response && response.success) {
          setMlInitialized(true);
        } else {
          throw new Error(response?.error || 'Failed to initialize ML');
        }
      } catch (err) {
        setError(err.message);
        console.error('ML initialization error:', err);
      } finally {
        setInitializing(false);
      }
    };

    initializeML();
  }, []);

  const handleMlAutoGroup = async (ungroupedTabs, options = {}) => {
    if (!mlInitialized || !ungroupedTabs?.length) {
      throw new Error('ML not initialized or no tabs to group');
    }

    try {
      const originalButton = document.querySelector('.ml-auto-group-btn');
      if (originalButton) {
        originalButton.innerHTML = '<span class="ml-btn-icon">⏳</span> AI Grouping...';
        originalButton.disabled = true;
      }
      
      const response = await chromeApi.mlAutoGroupAllTabs(options);
      
      if (originalButton) {
        originalButton.innerHTML = '<span class="ml-btn-icon">🤖</span> AI Auto Group';
        originalButton.disabled = false;
      }
      
      if (response && response.success) {
        return response;
      } else {
        throw new Error(response?.error || 'ML Auto Group failed');
      }
      
    } catch (error) {
      console.error('ML Auto Group failed:', error);
      const originalButton = document.querySelector('.ml-auto-group-btn');
      if (originalButton) {
        originalButton.innerHTML = '<span class="ml-btn-icon">🤖</span> AI Auto Group';
        originalButton.disabled = false;
      }
      throw error;
    }
  };

  const classifyTab = async (title, url) => {
    try {
      const response = await chromeApi.classifyTab(title, url);
      return response?.classification;
    } catch (err) {
      console.error('Classification error:', err);
      return null;
    }
  };

  const getSmartGroupName = async (tabs) => {
    try {
      const response = await chromeApi.getSmartGroupName(tabs);
      return response?.groupName;
    } catch (err) {
      console.error('Smart group name error:', err);
      return 'New Group';
    }
  };

  return {
    mlInitialized,
    initializing,
    error,
    handleMlAutoGroup,
    classifyTab,
    getSmartGroupName,
    reinitialize: () => setMlInitialized(false)
  };
};
