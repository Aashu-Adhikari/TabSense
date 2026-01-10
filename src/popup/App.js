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
import ChatView from '../components/ChatView';
import CreateGroupView from '../components/CreateGroupView'; // <-- NEW IMPORT
import { mlCategories } from '../utils/mlCategories';

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

  // Remove useMlClassification from unconditional call - only load when needed
  // const { mlInitialized, initializing: mlInitializing } = useMlClassification();
  
  // ML state - lazily initialized
  const [mlInitialized, setMlInitialized] = useState(false);
  const [mlInitializing, setMlInitializing] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupingMethod, setGroupingMethod] = useState('domain');
  const [isGrouping, setIsGrouping] = useState(false);

  // Chat State
  const [activeChatTab, setActiveChatTab] = useState(null);
  const [currentTab, setCurrentTab] = useState(null);

  // ===== NEW STATE FOR CUSTOM GROUP CREATION =====
  const [tabForNewGroup, setTabForNewGroup] = useState(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) setCurrentTab(tabs[0]);
    });
  }, []);

  const handleAssignTabToCategory = async (tab, event) => {
    const { value } = event.target;
    if (!value) return;
    
    // ===== NEW: Handle Custom Group Creation =====
    if (value === 'create_custom') {
      event.target.value = ""; // Reset dropdown
      setTabForNewGroup(tab);
      return;
    }

    // Import chromeApi early for ML initialization
    const { chromeApi } = await import('../services/chromeApi');
    event.target.value = "";

    if (value.startsWith('ml_category--')) {
      const categoryLabel = value.replace('ml_category--', '');
      const category = mlCategories.find(c => c.label === categoryLabel);
      if (category) {
        // Lazy initialize ML if not ready
        if (!mlInitialized) {
          setMlInitializing(true);
          await chromeApi.initializeML();
          setMlInitialized(true);
          setMlInitializing(false);
        }
        await chromeApi.findOrCreateGroupAndAddTab(tab.id, category.label, category.emoji);
        await chromeApi.learnFromAssignment(tab, category.label);
        fetchGroupsAndTabs();
      }
    } else if (!isNaN(value)) {
      const groupId = parseInt(value, 10);
      const group = groups.find(g => g.id === groupId);
      if (group) {
        const matchingMlCategory = mlCategories.find(cat => `${cat.emoji} ${cat.label}` === group.title);
        if (matchingMlCategory) {
          await chromeApi.learnFromAssignment(tab, matchingMlCategory.label);
        }
      }
      handleAddToGroup(tab.id, groupId);
    }
  };

  // ... (toggleGroup, handleStartRename, saveGroupName, handleGroupTabs, useEffect handleKeyDown remain unchanged) ...
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

  const saveGroupName = (groupId, newName) => {
    if (!newName.trim()) return;
    handleRenameGroup(groupId, newName);
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
        case 'domain': response = await chromeApi.groupByDomain(); break;
        case 'content': response = await chromeApi.groupByContent(); break;
        case 'ai': 
          // Lazy initialize ML if not ready
          if (!mlInitialized) {
            setMlInitializing(true);
            await chromeApi.initializeML();
            setMlInitialized(true);
            setMlInitializing(false);
          }
          response = await chromeApi.mlAutoGroupAllTabs({ confidenceThreshold: 0.6, minGroupSize: 2, maxGroups: 10 }); 
          break;
        default: response = await chromeApi.groupByDomain();
      }
      if (response && response.success) {
        alert(response.message || 'Grouping successful!');
        fetchGroupsAndTabs();
      } else {
        throw new Error(response.error || 'Grouping failed');
      }
    } catch (error) {
      alert(`Tab grouping failed: ${error.message}`);
    } finally {
      setIsGrouping(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && searchTerm) clearSearch();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm, clearSearch]);

  const loading = groupsLoading;

  // View Switching Logic
  if (activeChatTab) {
    return <ChatView tab={activeChatTab} onBack={() => setActiveChatTab(null)} />;
  }

  // ===== NEW VIEW: Custom Group Creation =====
  if (tabForNewGroup) {
    return (
      <CreateGroupView 
        tab={tabForNewGroup} 
        onBack={() => setTabForNewGroup(null)}
        onGroupCreated={() => {
          setTabForNewGroup(null);
          fetchGroupsAndTabs();
        }}
      />
    );
  }

  return (
    <div className="popup-container">
    
    <header className="popup-header">
        <h1>
          <img src="icons/icon48.png" alt="Logo" className="header-logo" />
          TabSense
          <span className="beta-badge">BETA</span>
        </h1>
            <p className="subtitle">Organize. Search. Chat.</p>
          </header>

  

      {currentTab && (
        <div style={{ padding: '1rem 1rem 0' }}>
          <Button 
            variant="primary" 
            fullWidth 
            icon="🤖"
            onClick={() => setActiveChatTab(currentTab)}
          >
            Chat with this Tab
          </Button>
        </div>
      )}

      <main className="popup-main">
        {/* ... Search Container (unchanged) ... */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <div className="search-icon">🔍</div>
            <input
              type="text"
              placeholder="Search tabs..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
            />
            <div className="search-actions">
              {searchLoading && <div className="search-loading-indicator"></div>}
              {searchTerm && <button className="clear-search-btn" onClick={clearSearch}>✕</button>}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : searchTerm ? (
          <SearchResultsView
            searchResults={searchResults}
            searchTerm={searchTerm}
            onClearSearch={clearSearch}
            onAddToGroup={handleAddToGroup}
            groups={groups}
            onOpenTab={handleOpenTab}
          />
        ) : (
          <>
            {/* Groups List (unchanged) */}
            <div className="section-header">
              <h2>Tab Groups ({groups.length})</h2>
              {groups.length > 0 && (
                <Button variant="secondary" onClick={() => {
                  if (expandedGroups.size === groups.length) setExpandedGroups(new Set());
                  else setExpandedGroups(new Set(groups.map(g => g.id)));
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
                    onRename={saveGroupName}
                    onOpenTab={handleOpenTab}
                  />
                ))
              ) : (
                <div className="empty-section">No groups yet.</div>
              )}
            </div>

            <div className="section-header">
              <h2>Ungrouped Tabs <span className="count-badge">{ungroupedTabs.length}</span></h2>
            </div>
            
            {ungroupedTabs.length >= 2 && (
              <div className="grouping-controls">
                {/* ... Grouping controls (unchanged) ... */}
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
                    <option value="ai">🤖 AI Grouping</option>
                  </select>
                </div>
                
                <Button
                  variant="primary"
                  onClick={handleGroupTabs}
                  disabled={isGrouping || mlInitializing}
                  loading={isGrouping || mlInitializing}
                  fullWidth
                >
                  {mlInitializing ? 'Initializing AI...' : isGrouping ? 'Grouping...' : `Group Tabs`}
                </Button>
              </div>
            )}
            
            <div className="ungrouped-tabs-list">
              {ungroupedTabs.map(tab => (
                <div 
                  key={tab.id} 
                  className="ungrouped-tab-item clickable-tab"
                  onClick={(e) => {
                    if (!e.target.closest('.group-select')) handleOpenTab(tab.id, tab.windowId);
                  }}
                >
                  <img src={tab.favIconUrl || 'data:image/svg+xml;base64,...'} className="tab-favicon" />
                  <div className="ungrouped-tab-info">
                    <div className="ungrouped-tab-title">{tab.title}</div>
                    <div className="ungrouped-tab-url">{tab.url}</div>
                  </div>
                  <div className="ungrouped-tab-actions">
                    <select 
                      className="group-select"
                      onChange={(e) => handleAssignTabToCategory(tab, e)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">➕ Add to...</option>
                      
                      {/* ===== NEW OPTION ===== */}
                      <option value="create_custom" style={{fontWeight: 'bold', color: '#3b82f6'}}>
                        ✨ Create New Group...
                      </option>
                      {/* ====================== */}

                      {groups.length > 0 && (
                        <optgroup label="Existing">
                          {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                        </optgroup>
                      )}
                      <optgroup label="AI Categories">
                        {mlCategories.map(c => <option key={c.label} value={`ml_category--${c.label}`}>{c.emoji} {c.label}</option>)}
                      </optgroup>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="popup-footer">
         <Button variant="primary" onClick={fetchGroupsAndTabs}>🔄 Refresh</Button>
      </footer>
    </div>
  );
}

export default App;