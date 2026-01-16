import React, { useState } from 'react';
import './popup.css';
import '../styles/components/search.css';
import '../styles/components/groups.css';
import { useGroups } from '../hooks/useGroups';
import { useSearch } from '../hooks/useSearch';
import { useMlClassification } from '../hooks/useMlClassification';
import GroupCard from '../components/GroupCard';
import SearchResultsView from '../components/SearchResultsView';
import Button from '../components/common/Button';

function App() {
  // Custom hooks for state management
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
    handleOpenTab,
    domainSettings,
    handleSaveDomainSetting
  } = useGroups();

  const {
    searchTerm,
    searchResults,
    searchLoading,
    error: searchError,
    handleSearchChange,
    clearSearch
  } = useSearch();

  const {
    mlInitialized,
    initializing: mlInitializing,
    error: mlError,
    handleMlAutoGroup
  } = useMlClassification();

  // Local state for UI
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');

  // Group operations
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

  const handleMlAutoGroupClick = async () => {
    if (ungroupedTabs.length === 0 || !mlInitialized) return;

    try {
      const response = await handleMlAutoGroup(ungroupedTabs, {
        confidenceThreshold: 0.6,
        minGroupSize: 2,
        maxGroups: 10
      });

      if (response && response.success) {
        const { groupsCreated, totalTabsGrouped, message } = response;
        alert(`${message}\n\nCheck your browser - the groups are now created and ready to use!`);
        fetchGroupsAndTabs();
      }
    } catch (error) {
      console.error('ML Auto Group failed:', error);
      alert('AI Auto Group failed. Please try "Smart Group All" instead.');
    }
  };

  const handleSmartGroupAll = async () => {
    if (ungroupedTabs.length < 2) return;

    const { chromeApi } = await import('../services/chromeApi');
    await chromeApi.autoGroupTabs();
    fetchGroupsAndTabs();
  };

  // Handle escape key for search
  React.useEffect(() => {
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

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>🪄 TabSynth</h1>
        <p className="subtitle">Smart Tab Groups</p>
      </header>

      <main className="popup-main">
        {/* Search Bar */}
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
              {searchLoading && (
                <div className="search-loading-indicator"></div>
              )}
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

        {/* Error State */}
        {error && (
          <div className="error-state">
            Error: {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="loading-state">Loading groups...</div>
        ) : searchTerm ? (
          /* Search Results */
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
          /* Normal View */
          <>
            {/* Tab Groups Section */}
            <div className="section-header">
              <h2>Tab Groups ({groups.length})</h2>
              {groups.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (expandedGroups.size === groups.length) {
                      setExpandedGroups(new Set());
                    } else {
                      setExpandedGroups(new Set(groups.map(g => g.id)));
                    }
                  }}
                >
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
                    domainSettings={domainSettings}
                    onSaveDomainSetting={handleSaveDomainSetting}
                  />
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
                  {ungroupedTabs.length}
                </span>
              </h2>
              <div className="action-buttons">
                {ungroupedTabs.length >= 2 && (
                  <Button
                    variant="secondary"
                    onClick={handleSmartGroupAll}
                  >
                    ✨ Smart Group All
                  </Button>
                )}
                {ungroupedTabs.length >= 2 && mlInitialized && (
                  <Button
                    variant="primary"
                    className="ml-auto-group-btn"
                    onClick={handleMlAutoGroupClick}
                    disabled={!mlInitialized}
                  >
                    <span className="ml-btn-icon">🤖</span> AI Auto Group
                  </Button>
                )}
              </div>
            </div>

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
                  All tabs are grouped! 🎉
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="popup-footer">
        <Button
          variant="secondary"
          onClick={fetchGroupsAndTabs}
        >
          🔄 Refresh
        </Button>
      </footer>
    </div>
  );
}

export default App;
