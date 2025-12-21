// src/popup/App.js
import React, { useState, useEffect } from 'react';
import './popup.css';
import '../styles/components/search.css';
import '../styles/components/groups.css';
import { useGroups } from '../hooks/useGroups';
import { useSearch } from '../hooks/useSearch';
import { useMlClassification } from '../hooks/useMlClassification';
import GroupCard from '../components/GroupCard';
import SearchResultsView from '../components/SearchResultsView';
import Button from '../components/common/Button';
import { mlCategories } from '../utils/mlCategories'; // Import the shared categories

function App() {
  const {
    groups,
    ungroupedTabs,
    loading: groupsLoading,
    error: groupsError,
    fetchGroupsAndTabs,
    handleUngroupSingleTab,
    handleUngroupAll,
    handleRenameGroup,
    handleAddToGroup,
    handleOpenTab
  } = useGroups();

  const {
    searchTerm,
    searchResults,
    searchLoading,
    error: searchError,
    handleSearchChange,
    clearSearch
  } = useSearch();

  const { mlInitialized, initializing: mlInitializing, error: mlError } = useMlClassification();

  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupingMethod, setGroupingMethod] = useState('domain');
  const [isGrouping, setIsGrouping] = useState(false);

  // =================================================================
  // ===== MODIFIED HANDLER FOR DYNAMIC DROPDOWN =====================
  // =================================================================
  const handleAssignTabToCategory = async (tab, event) => {
    const { value } = event.target;
    if (!value) return;

    const { chromeApi } = await import('../services/chromeApi');

    // Visually reset the dropdown immediately
    event.target.value = "";

    // Case 1: The value is a prefix for a NEW ML category assignment.
    if (value.startsWith('ml_category--')) {
      const categoryLabel = value.replace('ml_category--', '');
      const category = mlCategories.find(c => c.label === categoryLabel);

      if (category) {
        // Find or create a group with this category name
        await chromeApi.findOrCreateGroupAndAddTab(tab.id, category.label, category.emoji);

        // This is a precise learning signal! Train the model.
        await chromeApi.learnFromAssignment(tab, category.label);

        // Refresh the UI
        fetchGroupsAndTabs();
      }
    }
    // Case 2: The value is a number, so it's an EXISTING group ID.
    else if (!isNaN(value)) {
      const groupId = parseInt(value, 10);

      // --- START OF FIX: "STICKY INTENT" LOGIC ---
      // Check if the selected existing group is an AI-learnable group.
      const group = groups.find(g => g.id === groupId);
      if (group) {
        // Find the matching ML category based on the group's title.
        const matchingMlCategory = mlCategories.find(
          cat => `${cat.emoji} ${cat.label}` === group.title
        );

        // If the group's name matches an AI category, this is also a valid training signal!
        if (matchingMlCategory) {
          console.log(`Learning: User added tab to existing AI group '${group.title}'.`);
          await chromeApi.learnFromAssignment(tab, matchingMlCategory.label);
        }
      }
      // --- END OF FIX ---

      // This part always runs to actually move the tab.
      handleAddToGroup(tab.id, groupId);
    }
  };


  // (The rest of the component's logic and JSX are unchanged)
  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleStartRename = (groupId, currentName) => {
    setRenamingGroup(groupId);
    setNewGroupName(currentName);
  };

  const saveGroupName = (groupId) => {
    if (!newGroupName.trim()) return;
    handleRenameGroup(groupId, newGroupName);
    setRenamingGroup(null);
    setNewGroupName('');
  };

  const handleGroupTabs = async () => {
    if (ungroupedTabs.length < 2) return;
    
    setIsGrouping(true);
    try {
      const { chromeApi } = await import('../services/chromeApi');
      
      let response;
      switch (groupingMethod) {
        case 'domain':
          response = await chromeApi.groupByDomain();
          break;
        case 'content':
          response = await chromeApi.groupByContent();
          break;
        case 'ai':
          response = await chromeApi.mlAutoGroupAllTabs({
            confidenceThreshold: 0.6,
            minGroupSize: 2,
            maxGroups: 10
          });
          break;
        default:
          response = await chromeApi.groupByDomain();
      }
      
      if (response && response.success) {
        const { message } = response;
        alert(message || 'Grouping successful! Check your browser to see the new groups.');
        fetchGroupsAndTabs();
      } else {
        throw new Error(response.error || 'Grouping failed for an unknown reason.');
      }
    } catch (error) {
      console.error('Grouping failed:', error);
      alert(`Tab grouping failed: ${error.message}`);
    } finally {
      setIsGrouping(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && searchTerm) {
        clearSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm, clearSearch]);

  const loading = groupsLoading || mlInitializing;
  const error = groupsError || searchError || mlError;

  const getGroupingMethodInfo = () => {
    switch (groupingMethod) {
      case 'domain': return { icon: '🌐', name: 'Domain Grouping', description: 'Group by website domain' };
      case 'content': return { icon: '📋', name: 'Content Grouping', description: 'Group by content type' };
      case 'ai': return { icon: '🤖', name: 'AI Grouping', description: 'Smart ML-based grouping' };
      default: return { icon: '🌐', name: 'Domain Grouping', description: 'Group by website domain' };
    }
  };

  const methodInfo = getGroupingMethodInfo();

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>🪄 TabSynth</h1>
        <p className="subtitle">Smart Tab Groups</p>
      </header>

      <main className="popup-main">
        <div className="search-container">
          <div className="search-input-wrapper">
            <div className="search-icon">🔍</div>
            <input
              type="text"
              placeholder="Search across all tabs..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
              autoComplete="off"
              spellCheck="false"
            />
            <div className="search-actions">
              {searchLoading && <div className="search-loading-indicator"></div>}
              {searchTerm && (
                <button 
                  className="clear-search-btn"
                  onClick={clearSearch}
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

        {error && <div className="error-state">Error: {error}</div>}

        {loading ? (
          <div className="loading-state">Loading groups...</div>
        ) : searchTerm ? (
          <SearchResultsView
            searchResults={searchResults}
            searchLoading={searchLoading}
            searchTerm={searchTerm}
            onClearSearch={clearSearch}
            onAddToGroup={handleAddToGroup}
            groups={groups}
            onOpenTab={handleOpenTab}
          />
        ) : (
          <>
            <div className="section-header">
              <h2>Tab Groups ({groups.length})</h2>
              {groups.length > 0 && (
                <Button variant="secondary" onClick={() => {
                  if (expandedGroups.size === groups.length) {
                    setExpandedGroups(new Set());
                  } else {
                    setExpandedGroups(new Set(groups.map(g => g.id)));
                  }
                }}>
                  {expandedGroups.size === groups.length ? 'Collapse All' : 'Expand All'}
                </Button>
              )}
            </div>
            
            <div className="groups-list">
              {groups.length > 0 ? (
                groups.map(group => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    expanded={expandedGroups.has(group.id)}
                    onToggle={toggleGroup}
                    onUngroupSingleTab={handleUngroupSingleTab}
                    onUngroupAll={handleUngroupAll}
                    onStartRename={handleStartRename}
                    onOpenTab={handleOpenTab}
                  />
                ))
              ) : (
                <div className="empty-section">No groups yet. Use the dropdown below to choose a grouping method.</div>
              )}
            </div>

            <div className="section-header">
              <h2>Ungrouped Tabs <span className="count-badge">{ungroupedTabs.length}</span></h2>
            </div>
            
            {ungroupedTabs.length >= 2 && (
              <div className="grouping-controls">
                <div className="grouping-method-selector">
                  <label htmlFor="grouping-method" className="grouping-label">Grouping Method:</label>
                  <select
                    id="grouping-method"
                    value={groupingMethod}
                    onChange={(e) => setGroupingMethod(e.target.value)}
                    className="grouping-method-select"
                  >
                    <option value="domain">🌐 Domain Grouping</option>
                    <option value="content">📋 Content Grouping</option>
                    <option value="ai" disabled={!mlInitialized}>🤖 AI Grouping</option>
                  </select>
                  <div className="grouping-description">
                    {methodInfo.description}
                    {groupingMethod === 'ai' && !mlInitialized && ' (ML not initialized)'}
                  </div>
                </div>
                
                <Button
                  variant="primary"
                  onClick={handleGroupTabs}
                  disabled={isGrouping || (groupingMethod === 'ai' && !mlInitialized)}
                  loading={isGrouping}
                  fullWidth={true}
                  size="large"
                >
                  {isGrouping ? 'Grouping...' : `🚀 Group Tabs (${methodInfo.name})`}
                </Button>
              </div>
            )}
            
            <div className="ungrouped-tabs-list">
              {ungroupedTabs.length > 0 ? (
                ungroupedTabs.map(tab => (
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
                      src={tab.favIconUrl || 'data:image/svg+xml;base64,...'} 
                      alt="Favicon" 
                      className="tab-favicon" 
                    />
                    <div className="ungrouped-tab-info">
                      <div className="ungrouped-tab-title" title={tab.title}>{tab.title}</div>
                      <div className="ungrouped-tab-url" title={tab.url}>{tab.url}</div>
                    </div>
                    
                    <div className="ungrouped-tab-actions">
                      <select 
                        className="group-select"
                        onChange={(e) => handleAssignTabToCategory(tab, e)}
                        onClick={(e) => e.stopPropagation()}
                        title="Assign tab to a group"
                      >
                        <option value="">➕ Add to...</option>
                        
                        {groups.length > 0 && (
                          <optgroup label="Existing Groups">
                            {groups.map(group => (
                              <option key={group.id} value={group.id}>
                                {group.title} ({group.tabs.length})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        
                        <optgroup label="AI Categories">
                          {mlCategories.map(category => (
                            <option key={category.label} value={`ml_category--${category.label}`}>
                              {category.emoji} {category.label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-section">All tabs are grouped! 🎉</div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="popup-footer">
        <Button variant="secondary" onClick={fetchGroupsAndTabs}>🔄 Refresh</Button>
      </footer>
    </div>
  );
}

export default App;