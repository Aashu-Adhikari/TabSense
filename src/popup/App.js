// Main Popup React Component - WITH SEARCH & GROUPING
import React, { useState, useEffect } from 'react';
import './popup.css';

function App() {
  // Existing states
  const [allTabs, setAllTabs] = useState([]);
  const [filteredTabs, setFilteredTabs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // NEW STATE: Track selected tab IDs
  const [selectedTabIds, setSelectedTabIds] = useState(new Set());
  const [isGrouping, setIsGrouping] = useState(false); // For loading state on button

  // Fetch tabs (existing code)
  useEffect(() => {
    const fetchTabs = () => {
      chrome.runtime.sendMessage({ action: "GET_ALL_TABS" }, (response) => {
        if (response && response.success) {
          setAllTabs(response.tabs);
          setFilteredTabs(response.tabs);
          setSelectedTabIds(new Set()); // Clear selection on refresh
        } else {
          console.error("Failed to fetch tabs:", response);
        }
        setLoading(false);
      });
    };
    fetchTabs();
  }, []);

  // Search filter (existing code)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTabs(allTabs);
      return;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    const filtered = allTabs.filter(tab => {
      return (
        tab.title.toLowerCase().includes(lowercasedTerm) ||
        tab.url.toLowerCase().includes(lowercasedTerm)
      );
    });
    setFilteredTabs(filtered);
  }, [searchTerm, allTabs]);

  // NEW: Handle checkbox selection
  const handleTabSelect = (tabId, isSelected) => {
    const newSelected = new Set(selectedTabIds);
    if (isSelected) {
      newSelected.add(tabId);
    } else {
      newSelected.delete(tabId);
    }
    setSelectedTabIds(newSelected);
  };

  // NEW: Select all visible tabs
  const handleSelectAll = () => {
    const allVisibleIds = new Set(filteredTabs.map(tab => tab.id));
    setSelectedTabIds(allVisibleIds);
  };

  // NEW: Clear selection
  const handleClearSelection = () => {
    setSelectedTabIds(new Set());
  };

  // NEW: Group selected tabs by domain
  const handleGroupByDomain = () => {
    if (selectedTabIds.size === 0) return;
    
    setIsGrouping(true);
    
    // Extract domain from each selected tab
    const tabsToGroup = allTabs.filter(tab => selectedTabIds.has(tab.id));
    const domains = tabsToGroup.map(tab => {
      try {
        return new URL(tab.url).hostname;
      } catch {
        return 'unknown';
      }
    });
    
    // Find the most common domain for group name
    const domainCount = {};
    let mostCommonDomain = 'Tabs';
    let maxCount = 0;
    
    domains.forEach(domain => {
      domainCount[domain] = (domainCount[domain] || 0) + 1;
      if (domainCount[domain] > maxCount) {
        maxCount = domainCount[domain];
        mostCommonDomain = domain;
      }
    });

    // Send to background script
    chrome.runtime.sendMessage({
      action: "GROUP_TABS",
      tabIds: Array.from(selectedTabIds),
      groupName: mostCommonDomain
    }, (response) => {
      if (response && response.success) {
        // Refresh the tab list to show new groups
        handleRefresh();
        // Clear selection after grouping
        setSelectedTabIds(new Set());
      } else {
        console.error("Failed to group tabs:", response);
        alert(`Failed to group tabs: ${response?.error || 'Unknown error'}`);
      }
      setIsGrouping(false);
    });
  };

  const handleRefresh = () => {
    setLoading(true);
    setSelectedTabIds(new Set()); // Clear selection on refresh
    chrome.runtime.sendMessage({ action: "GET_ALL_TABS" }, (response) => {
      if (response && response.success) {
        setAllTabs(response.tabs);
        const lowercasedTerm = searchTerm.toLowerCase();
        const filtered = response.tabs.filter(tab => {
          return (
            tab.title.toLowerCase().includes(lowercasedTerm) ||
            tab.url.toLowerCase().includes(lowercasedTerm)
          );
        });
        setFilteredTabs(filtered);
      }
      setLoading(false);
    });
  };

    const handleSmartGroup = () => {
    setIsGrouping(true);
    
    chrome.runtime.sendMessage({ action: "AUTO_GROUP_TABS" }, (response) => {
        if (response && response.success) {
        // Show success message
        alert(`✨ Created ${response.groups.length} smart groups!\n\n${response.groups.map(g => `• ${g.name} (${g.tabCount} tabs)`).join('\n')}`);
        
        // Refresh tab list to reflect new groups
        handleRefresh();
        setSelectedTabIds(new Set());
        } else {
        console.error("Auto-grouping failed:", response);
        alert(`Failed to auto-group tabs: ${response?.error || 'Unknown error'}`);
        }
        setIsGrouping(false);
    });
    };

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>🪄 TabSynth</h1>
        <p className="subtitle">Your AI Tab Assistant</p>
      </header>

      <main className="popup-main">
        {/* Search bar (existing) */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Search tabs by title or URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* NEW: Selection controls */}
        {!loading && filteredTabs.length > 0 && (
          <div className="selection-controls">
            <div className="selection-info">
              <span className="selected-count">
                {selectedTabIds.size} tab{selectedTabIds.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="selection-buttons">
              <button 
                className="selection-btn"
                onClick={handleSelectAll}
                disabled={selectedTabIds.size === filteredTabs.length}
              >
                Select All
              </button>
              <button 
                className="selection-btn"
                onClick={handleClearSelection}
                disabled={selectedTabIds.size === 0}
              >
                Clear
              </button>
              <button 
                className="group-btn"
                onClick={handleGroupByDomain}
                disabled={selectedTabIds.size === 0 || isGrouping}
              >
                {isGrouping ? 'Grouping...' : 'Group Selected'}
              </button>
                <button 
                    className="smart-group-btn"
                    onClick={handleSmartGroup}
                    disabled={isGrouping || allTabs.length < 2}
                    title="Automatically group all tabs by category"
                >
                    {isGrouping ? 'Analyzing...' : '✨ Smart Group All'}
                </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading your tabs...</div>
        ) : (
          <>
            <div className="tabs-header">
              <h2>
                Open Tabs 
                <span className="tab-count">
                  ({filteredTabs.length}{searchTerm && ` of ${allTabs.length}`})
                </span>
              </h2>
            </div>
            <div className="tabs-list">
              {filteredTabs.length > 0 ? (
                filteredTabs.map((tab) => (
                  <div key={tab.id} className="tab-item">
                    {/* NEW: Checkbox for selection */}
                    <input
                      type="checkbox"
                      className="tab-checkbox"
                      checked={selectedTabIds.has(tab.id)}
                      onChange={(e) => handleTabSelect(tab.id, e.target.checked)}
                      id={`tab-${tab.id}`}
                    />
                    <img 
                      src={tab.favIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCAxLjVhNi41IDYuNSAwIDEgMCAwIDEzIDYuNSA2LjUgMCAwIDAgMC0xM3pNOC41IDV2My4zTDEwLjggOS43YS41LjUgMCAxIDEtLjcuN0w3LjUgOC4yYTEgMSAwIDAgMS0uNS0uOVY1YTEgMSAwIDAgMSAxLTFoMGEgMSAxIDAgMCAxIDEgMXoiIGZpbGw9IiM2NjY2NjYiLz48L3N2Zz4='} 
                      alt="Favicon" 
                      className="tab-favicon" 
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <label htmlFor={`tab-${tab.id}`} className="tab-info">
                      <div className="tab-title">{tab.title}</div>
                      <div className="tab-url">{tab.url}</div>
                    </label>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  {searchTerm 
                    ? `No tabs found for "${searchTerm}"` 
                    : "No tabs found."}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="popup-footer">
        <button 
          className="primary-btn"
          onClick={handleRefresh}
        >
          Refresh Tabs
        </button>
      </footer>
    </div>
  );
}

export default App;