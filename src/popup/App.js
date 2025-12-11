// Main Popup Component - With Global Search
import React, { useState, useEffect, useRef } from 'react';
import './popup.css';

function App() {
  // State for groups and ungrouped tabs
  const [groups, setGroups] = useState([]);
  const [ungroupedTabs, setUngroupedTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const searchTimeoutRef = useRef(null);

  // Fetch groups and tabs
  const fetchGroupsAndTabs = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ action: "GET_GROUPS_WITH_TABS" }, (response) => {
      if (response && response.success) {
        setGroups(response.groups);
        setUngroupedTabs(response.ungroupedTabs);
      } else {
        console.error("Failed to fetch groups:", response);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchGroupsAndTabs();
  }, []);

  // Handle search input with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim()) {
      setSearchLoading(true);
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchTerm);
      }, 300);
    } else {
      setSearchResults(null);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Perform search across all tabs
  const performSearch = (term) => {
    chrome.runtime.sendMessage({ 
      action: "SEARCH_ALL_TABS", 
      searchTerm: term 
    }, (response) => {
      if (response && response.success) {
        setSearchResults(response);
      } else {
        console.error("Search failed:", response);
      }
      setSearchLoading(false);
    });
  };

  // Toggle group expansion
  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Remove single tab from group
  const handleUngroupSingleTab = (groupId, tabId) => {
    chrome.runtime.sendMessage({ 
      action: "UNGROUP_SINGLE_TAB", 
      tabId: tabId 
    }, (response) => {
      if (response && response.success) {
        const updatedGroups = groups.map(group => {
          if (group.id === groupId) {
            return {
              ...group,
              tabs: group.tabs.filter(tab => tab.id !== tabId)
            };
          }
          return group;
        }).filter(group => group.tabs.length > 0);
        
        setGroups(updatedGroups);
        fetchGroupsAndTabs();
        // Refresh search results if active
        if (searchTerm.trim()) {
          performSearch(searchTerm);
        }
      }
    });
  };

  // Remove entire group
  const handleUngroupAll = (groupId) => {
    if (!confirm("Ungroup all tabs in this group?")) return;
    
    chrome.runtime.sendMessage({ 
      action: "UNGROUP_ALL_TABS", 
      groupId: groupId 
    }, (response) => {
      if (response && response.success) {
        setGroups(groups.filter(group => group.id !== groupId));
        fetchGroupsAndTabs();
        if (searchTerm.trim()) {
          performSearch(searchTerm);
        }
      }
    });
  };

  // Start renaming a group
  const startRenamingGroup = (groupId, currentName) => {
    setRenamingGroup(groupId);
    setNewGroupName(currentName);
  };

  // Save new group name
  const saveGroupName = (groupId) => {
    if (!newGroupName.trim()) return;
    
    chrome.runtime.sendMessage({ 
      action: "RENAME_GROUP", 
      groupId: groupId,
      newName: newGroupName
    }, (response) => {
      if (response && response.success) {
        setGroups(groups.map(group => 
          group.id === groupId 
            ? { ...group, title: newGroupName }
            : group
        ));
        if (searchTerm.trim()) {
          performSearch(searchTerm);
        }
      }
      setRenamingGroup(null);
      setNewGroupName('');
    });
  };

  // Add tab to existing group
  const handleAddToGroup = (tabId, groupId) => {
    chrome.runtime.sendMessage({ 
      action: "ADD_TAB_TO_GROUP", 
      tabId: tabId,
      groupId: groupId 
    }, (response) => {
      if (response && response.success) {
        fetchGroupsAndTabs();
        if (searchTerm.trim()) {
          performSearch(searchTerm);
        }
      }
    });
  };

  // Open tab when clicked
  const handleOpenTab = (tabId, windowId) => {
    chrome.tabs.update(tabId, { active: true });
    chrome.windows.update(windowId, { focused: true });
    window.close();
  };

  // Filter ungrouped tabs by search (for normal view)
  const filteredUngroupedTabs = ungroupedTabs.filter(tab =>
    !searchTerm.trim() ||
    tab.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tab.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to get group info by ID
  const getGroupById = (groupId) => {
    return groups.find(g => g.id === groupId);
  };

  // Group Card Component
  const GroupCard = ({ group }) => {
    const isExpanded = expandedGroups.has(group.id);
    const colorEmoji = getColorEmoji(group.color);

    return (
      <div className="group-card" data-group-id={group.id}>
        <div className="group-header" onClick={() => toggleGroup(group.id)}>
          <div className="group-header-left">
            <span className="group-color">{colorEmoji}</span>
            {renamingGroup === group.id ? (
              <input
                type="text"
                className="group-rename-input"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveGroupName(group.id);
                  if (e.key === 'Escape') setRenamingGroup(null);
                }}
                onBlur={() => saveGroupName(group.id)}
                autoFocus
              />
            ) : (
              <span className="group-title">{group.title}</span>
            )}
            <span className="group-count">{group.tabs.length} tab{group.tabs.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="group-header-right">
            <span className="group-toggle">{isExpanded ? '▼' : '▶'}</span>
          </div>
        </div>
        
        {isExpanded && (
          <div className="group-content">
            <div className="group-tabs-list">
              {group.tabs.map(tab => (
                <div 
                  key={tab.id} 
                  className="group-tab-item clickable-tab"
                  onClick={(e) => {
                    if (!e.target.closest('.ungroup-single-btn')) {
                      handleOpenTab(tab.id, tab.windowId);
                    }
                  }}
                  title="Click to open tab"
                >
                  <img 
                    src={tab.favIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCAxLjVhNi41IDYuNSAwIDEgMCAwIDEzIDYuNSA2LjUgMCAwIDAgMC0xM3pNOC41IDV2My4zTDEwLjggOS43YS41LjUgMCAxIDEtLjcuN0w3LjUgOC4yYTEgMSAwIDAgMS0uNS0uOVY1YTEgMSAwIDAgMSAxLTFoMHAgMSAxIDAgMCAxIDEgMXoiIGZpbGw9IiM2NjY2NjYiLz48L3N2Zz4='} 
                    alt="Favicon" 
                    className="tab-favicon" 
                  />
                  <div className="group-tab-info">
                    <div className="group-tab-title" title={tab.title}>
                      {tab.title}
                    </div>
                    <div className="group-tab-url" title={tab.url}>
                      {tab.url}
                    </div>
                  </div>
                  <button
                    className="ungroup-single-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUngroupSingleTab(group.id, tab.id);
                    }}
                    title="Remove from group"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            
            <div className="group-actions">
              <button
                className="group-action-btn rename-btn"
                onClick={() => startRenamingGroup(group.id, group.title)}
              >
                ✏️ Rename
              </button>
              <button
                className="group-action-btn ungroup-btn"
                onClick={() => handleUngroupAll(group.id)}
              >
                🗑️ Ungroup All
              </button>
              <button
                className="group-action-btn ai-btn"
                onClick={() => {/* Future: Chat with this group */}}
                disabled
                title="Coming soon - Phase 3"
              >
                🤖 Ask AI
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper for color emoji
  const getColorEmoji = (color) => {
    const emojiMap = {
      'grey': '⚫', 'blue': '🔵', 'red': '🔴', 'yellow': '🟡',
      'green': '🟢', 'pink': '🟣', 'purple': '🟣', 'cyan': '🔵', 'orange': '🟠'
    };
    return emojiMap[color] || '⚫';
  };

// Search Results View - Updated for better UI
const SearchResultsView = () => {
  if (!searchResults || searchLoading) return null;

  const { searchResults: allResults, groupedResults, ungroupedResults, searchTerm } = searchResults;

  // Helper to highlight search terms
  const highlightText = (text) => {
    if (!searchTerm.trim()) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <span key={index} className="search-highlight">{part}</span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="search-results-container">
      <div className="search-header">
        <h3>
          🔍 Search Results
          <span className="search-count">
            {allResults.length} match{allResults.length !== 1 ? 'es' : ''}
          </span>
        </h3>
        <button 
          className="clear-search-btn"
          onClick={() => setSearchTerm('')}
        >
          Clear Search
        </button>
      </div>

      {/* Grouped Results */}
      {groupedResults.length > 0 && (
        <div className="search-section">
          <div className="search-section-header">
            <h4>📁 In Groups</h4>
            <span className="search-section-count">{groupedResults.length}</span>
          </div>
          <div className="search-tabs-list">
            {groupedResults.map(tab => {
              const group = getGroupById(tab.groupId);
              return (
                <div 
                  key={tab.id} 
                  className="search-tab-item clickable-tab"
                  onClick={() => handleOpenTab(tab.id, tab.windowId)}
                  title="Click to open tab"
                >
                  <img 
                    src={tab.favIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCAxLjVhNi41IDYuNSAwIDEgMCAwIDEzIDYuNSA2LjUgMCAwIDAgMC0xM3pNOC41IDV2My4zTDEwLjggOS43YS41LjUgMCAxIDEtLjcuN0w3LjUgOC4yYTEgMSAwIDAgMS0uNS0uOVY1YTEgMSAwIDAgMSAxLTFoMHAgMSAxIDAgMCAxIDEgMXoiIGZpbGw9IiM2NjY2NjYiLz48L3N2Zz4='} 
                    alt="Favicon" 
                    className="search-tab-favicon" 
                  />
                  <div className="search-tab-info">
                    <div className="search-tab-title">
                      {highlightText(tab.title)}
                    </div>
                    <div className="search-tab-meta">
                      {group && (
                        <span className="search-tab-group">
                          {group.title}
                        </span>
                      )}
                      <span className="search-tab-url" title={tab.url}>
                        {tab.url}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ungrouped Results */}
      {ungroupedResults.length > 0 && (
        <div className="search-section">
          <div className="search-section-header">
            <h4>🔓 Ungrouped</h4>
            <span className="search-section-count">{ungroupedResults.length}</span>
          </div>
          <div className="search-tabs-list">
            {ungroupedResults.map(tab => (
              <div 
                key={tab.id} 
                className="search-tab-item clickable-tab"
                onClick={() => handleOpenTab(tab.id, tab.windowId)}
                title="Click to open tab"
              >
                <img 
                  src={tab.favIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCAxLjVhNi41IDYuNSAwIDEgMCAwIDEzIDYuNSA2LjUgMCAwIDAgMC0xM3pNOC41IDV2My4zTDEwLjggOS43YS41LjUgMCAxIDEtLjcuN0w3LjUgOC4yYTEgMSAwIDAgMS0uNS0uOVY1YTEgMSAwIDAgMSAxLTFoMHAgMSAxIDAgMCAxIDEgMXoiIGZpbGw9IiM2NjY2NjYiLz48L3N2Zz4='} 
                  alt="Favicon" 
                  className="search-tab-favicon" 
                />
                <div className="search-tab-info">
                  <div className="search-tab-title">
                    {highlightText(tab.title)}
                  </div>
                  <div className="search-tab-meta">
                    <span className="search-tab-url" title={tab.url}>
                      {tab.url}
                    </span>
                  </div>
                </div>
                {groups.length > 0 && (
                  <select 
                    className="search-group-select"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddToGroup(tab.id, parseInt(e.target.value));
                        e.target.value = "";
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">Add to group...</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.title} ({group.tabs.length})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {allResults.length === 0 && (
        <div className="no-results">
          No tabs found for "{searchTerm}"
        </div>
      )}
    </div>
  );
};

  // Normal View (when not searching)
  const NormalView = () => (
    <>
      {/* Groups Section */}
      <div className="section-header">
        <h2>Tab Groups ({groups.length})</h2>
        {groups.length > 0 && (
          <button 
            className="expand-all-btn"
            onClick={() => {
              if (expandedGroups.size === groups.length) {
                setExpandedGroups(new Set());
              } else {
                setExpandedGroups(new Set(groups.map(g => g.id)));
              }
            }}
          >
            {expandedGroups.size === groups.length ? 'Collapse All' : 'Expand All'}
          </button>
        )}
      </div>
      
      <div className="groups-list">
        {groups.length > 0 ? (
          groups.map(group => (
            <GroupCard key={group.id} group={group} />
          ))
        ) : (
          <div className="empty-section">
            No groups yet. Use "Smart Group All" to create groups automatically.
          </div>
        )}
      </div>

      {/* Ungrouped Tabs Section */}
      <div className="section-header">
        <h2>
          Ungrouped Tabs 
          <span className="count-badge">
            {filteredUngroupedTabs.length}{searchTerm && ` of ${ungroupedTabs.length}`}
          </span>
        </h2>
        {ungroupedTabs.length >= 2 && (
          <button 
            className="smart-group-btn"
            onClick={() => {
              chrome.runtime.sendMessage({ action: "AUTO_GROUP_TABS" }, () => {
                fetchGroupsAndTabs();
              });
            }}
          >
            ✨ Smart Group All
          </button>
        )}
      </div>
      
      <div className="ungrouped-tabs-list">
        {filteredUngroupedTabs.length > 0 ? (
          filteredUngroupedTabs.map(tab => (
            <div 
              key={tab.id} 
              className="ungrouped-tab-item clickable-tab"
              onClick={(e) => {
                if (!e.target.closest('.group-select')) {
                  handleOpenTab(tab.id, tab.windowId);
                }
              }}
              title="Click to open tab"
            >
              <img 
                src={tab.favIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCAxLjVhNi41IDYuNSAwIDEgMCAwIDEzIDYuNSA2LjUgMCAwIDAgMC0xM3pNOC41IDV2My4zTDEwLjggOS43YS41LjUgMCAxIDEtLjcuN0w3LjUgOC4yYTEgMSAwIDAgMS0uNS0uOVY1YTEgMSAwIDAgMSAxLTFoMHAgMSAxIDAgMCAxIDEgMXoiIGZpbGw9IiM2NjY2NjYiLz48L3N2Zz4='} 
                alt="Favicon" 
                className="tab-favicon" 
              />
              <div className="ungrouped-tab-info">
                <div className="ungrouped-tab-title" title={tab.title}>
                  {tab.title}
                </div>
                <div className="ungrouped-tab-url" title={tab.url}>
                  {tab.url}
                </div>
              </div>
              
              <div className="ungrouped-tab-actions">
                <span className="tab-window">Win {tab.windowId}</span>
                
                {groups.length > 0 && (
                  <select 
                    className="group-select"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddToGroup(tab.id, parseInt(e.target.value));
                        e.target.value = "";
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">➕ Add to...</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.title} ({group.tabs.length})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-section">
            {searchTerm 
              ? `No ungrouped tabs found for "${searchTerm}"`
              : ungroupedTabs.length === 0 
                ? "All tabs are grouped! 🎉"
                : "No ungrouped tabs"}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>🪄 TabSynth</h1>
        <p className="subtitle">Smart Tab Groups</p>
      </header>

      <main className="popup-main">
        {/* Search Bar */}
{/* Enhanced Search Bar */}
<div className="search-container">
  <div className="search-input-wrapper">
    <div className="search-icon">🔍</div>
    
    <input
      type="text"
      placeholder="Search across all tabs..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="search-input"
      autoComplete="off"
      spellCheck="false"
    />
    
    <div className="search-actions">
      {searchLoading && (
        <div className="search-loading-indicator"></div>
      )}
      
      {searchTerm && (
        <button 
          className="clear-search-btn"
          onClick={() => setSearchTerm('')}
          aria-label="Clear search"
          title="Clear search (Esc)"
        >
          ✕
        </button>
      )}
    </div>
  </div>
  
  <div className="search-hint">
    Search by <span>title</span> or <span>URL</span> • Press <span>Esc</span> to clear
  </div>
  
</div>

                {searchLoading && (
            <div className="loading-state">
                🔍 Searching...
            </div>
                )}

                {loading && !searchTerm ? (
                <div className="loading-state">Loading groups...</div>
            ) : searchTerm ? (
                <SearchResultsView />
            ) : (
                <NormalView />
            )}
      </main>

      <footer className="popup-footer">
        <button 
          className="primary-btn"
          onClick={fetchGroupsAndTabs}
        >
          🔄 Refresh
        </button>
      </footer>
    </div>
  );
}

export default App;