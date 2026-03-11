// src/popup/App.js
import React, { useState, useEffect } from 'react';
import './base.css';
import '../styles/components/search.css';
import '../styles/components/groups.css';
import './action-grid.css';
import { useGroups } from '../hooks/useGroups';
import { useSearch } from '../hooks/useSearch';
import GroupCard from '../components/GroupCard';
import SearchResultsView from '../components/SearchResultsView';
import Button from '../components/common/Button';
import ChatView from '../components/ChatView';
import CreateGroupView from '../components/CreateGroupView';
import SettingsView, { COMPONENT_FILTERS } from '../components/SettingsView';
import { mlCategories } from '../utils/mlCategories';
import {
  IconChat,
  IconChevrons,
  IconHeart,
  IconRefresh,
  IconSettings,
  IconSort,
  IconSidebar,
  IconExternal,
  IconUndo,
  IconRedo
} from '../components/common/Icons';
import { openPatreon } from '../utils/links';

function App() {
  const {
    groups,
    ungroupedTabs,
    loading: groupsLoading,
    error: groupsError,
    fetchGroupsAndTabs,
    handleUngroupSingleTab,
    handleUngroupAll,
    handleDeleteGroup,
    handleUndoDelete,
    handleRedoDelete,
    undoStack,
    redoStack,
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
  const [activeChatGroup, setActiveChatGroup] = useState(null);
  const [currentTab, setCurrentTab] = useState(null);

  // ===== NEW STATE FOR CUSTOM GROUP CREATION =====
  const [tabForNewGroup, setTabForNewGroup] = useState(null);

  // ===== NEW STATE FOR SETTINGS =====
  const [showSettings, setShowSettings] = useState(false);
  const [draggedGroupId, setDraggedGroupId] = useState(null);
  const [dragOverGroupId, setDragOverGroupId] = useState(null);
  const [defaultView, setDefaultView] = useState('popup');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) setCurrentTab(tabs[0]);
    });

    // Load default view preference
    chrome.storage.local.get(['ui_preferences'], (result) => {
      setDefaultView(result.ui_preferences?.defaultView || 'sidepanel');
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
        throw new Error(response ? (response.error || 'Grouping failed') : 'No response from background script');
      }
    } catch (error) {
      alert(`Tab grouping failed: ${error.message}`);
    } finally {
      setIsGrouping(false);
    }
  };

  const handleGroupDragStart = (group) => (event) => {
    setDraggedGroupId(group.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(group.id));
  };

  const handleGroupDragOver = (group) => (event) => {
    event.preventDefault();
    if (draggedGroupId && draggedGroupId !== group.id) {
      setDragOverGroupId(group.id);
    }
    event.dataTransfer.dropEffect = 'move';
  };

  const handleGroupDragEnd = () => {
    setDraggedGroupId(null);
    setDragOverGroupId(null);
  };

  const handleGroupDrop = (targetGroup) => async (event) => {
    event.preventDefault();
    if (!draggedGroupId || draggedGroupId === targetGroup.id) {
      handleGroupDragEnd();
      return;
    }
    const draggedGroup = groups.find((group) => group.id === draggedGroupId);
    if (!draggedGroup || draggedGroup.windowId !== targetGroup.windowId) {
      handleGroupDragEnd();
      return;
    }
    if (typeof draggedGroup.index !== 'number' || typeof targetGroup.index !== 'number') {
      handleGroupDragEnd();
      return;
    }
    try {
      const { chromeApi } = await import('../services/chromeApi');
      const movingDown = draggedGroup.index < targetGroup.index;
      const adjustment = movingDown ? draggedGroup.tabs.length : 0;
      const moveIndex = Math.max(0, targetGroup.index - adjustment);
      const response = await chromeApi.moveTabGroup(draggedGroupId, moveIndex, targetGroup.windowId);
      if (response?.success) {
        fetchGroupsAndTabs();
      }
    } finally {
      handleGroupDragEnd();
    }
  };

  const handleSortGroups = async () => {
    const { chromeApi } = await import('../services/chromeApi');
    const normalizeTitle = (title) =>
      title.replace(/^[^A-Za-z0-9]+/, '').trim();
    const groupsByWindow = groups.reduce((acc, group) => {
      acc[group.windowId] = acc[group.windowId] || [];
      acc[group.windowId].push(group);
      return acc;
    }, {});

    for (const windowId of Object.keys(groupsByWindow)) {
      const windowGroups = groupsByWindow[windowId];
      const indices = windowGroups.map(group => group.index).filter(index => typeof index === 'number');
      if (indices.length === 0) {
        continue;
      }
      let cursorIndex = Math.min(...indices);
      const sorted = [...windowGroups].sort((a, b) =>
        normalizeTitle(a.title).localeCompare(
          normalizeTitle(b.title),
          undefined,
          { numeric: true, sensitivity: 'base' }
        )
      );
      for (let i = 0; i < sorted.length; i += 1) {
        const tabCount = sorted[i].tabs?.length || 1;
        await chromeApi.moveTabGroup(sorted[i].id, cursorIndex, parseInt(windowId, 10));
        cursorIndex += tabCount;
      }
    }
    fetchGroupsAndTabs();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && searchTerm) clearSearch();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm, clearSearch]);

  const toggleDefaultView = async () => {
    const newView = defaultView === 'sidepanel' ? 'popup' : 'sidepanel';

    chrome.storage.local.get(['ui_preferences'], async (result) => {
      const prefs = result.ui_preferences || {};
      prefs.defaultView = newView;
      await chrome.storage.local.set({ ui_preferences: prefs });

      try {
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: newView === 'sidepanel' });

        if (newView === 'sidepanel') {
          // Open sidebar and close popup
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
              chrome.sidePanel.open({ windowId: tabs[0].windowId });
              window.close();
            }
          });
        }
      } catch (e) {
        console.warn('Failed to update panel behavior:', e);
      }
      setDefaultView(newView);
    });
  };

  const loading = groupsLoading;

  // View Switching Logic
  if (activeChatTab) {
    return <ChatView tab={activeChatTab} onBack={() => setActiveChatTab(null)} />;
  }

  // 2. Chat with Group (NEW)
  if (activeChatGroup) {
    return <ChatView group={activeChatGroup} onBack={() => setActiveChatGroup(null)} />;
  }

  // ===== NEW VIEW: Settings =====
  if (showSettings) {
    return (
      <SettingsView
        enabledComponents={COMPONENT_FILTERS.HEADER}
        title="⚙️ Settings"
        showBackButton
        showSupportButton={false}
        onSaved={() => {
          setShowSettings(false);
          fetchGroupsAndTabs(); // Refresh in case settings affected grouping
        }}
        onCancel={() => setShowSettings(false)}
      />
    );
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
        <div className="popup-brand">
          <img className="popup-brand-icon" src="icons/icon48.png" alt="" />
          <div className="popup-brand-text">
            <div className="popup-brand-title">TabSense</div>
            <div className="popup-brand-tagline">Organize. Search. Chat.</div>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="header-icon-btn"
            onClick={handleUndoDelete}
            disabled={undoStack.length === 0}
            title={`Undo Delete (${undoStack.length} available)`}
            aria-label="Undo"
          >
            <IconUndo className="popup-icon" />
          </button>
          <button
            className="header-icon-btn"
            onClick={handleRedoDelete}
            disabled={redoStack.length === 0}
            title={`Redo Delete (${redoStack.length} available)`}
            aria-label="Redo"
          >
            <IconRedo className="popup-icon" />
          </button>
          <button
            className="header-icon-btn"
            onClick={toggleDefaultView}
            title={defaultView === 'sidepanel' ? 'Switch to Popup Mode' : 'Switch to Sidebar Mode'}
          >
            {defaultView === 'sidepanel' ? (
              <IconSidebar className="popup-icon" />
            ) : (
              <IconExternal className="popup-icon" />
            )}
          </button>
          <button
            className="header-icon-btn"
            onClick={fetchGroupsAndTabs}
            title="Refresh"
            aria-label="Refresh"
          >
            <IconRefresh className="popup-icon" />
          </button>
          <button
            className="header-icon-btn"
            onClick={openPatreon}
            title="Support"
            aria-label="Support"
          >
            <IconHeart className="popup-icon" />
          </button>
          <button
            className="header-icon-btn"
            onClick={() => setShowSettings(true)}
            title="Settings"
            aria-label="Settings"
          >
            <IconSettings className="popup-icon" />
          </button>
        </div>
      </header>

      <div className="action-grid">
        {/* Box 1: Chat with this Tab */}
        <div className="action-box chat-box">
          {currentTab && (
            <Button
              variant="primary"
              fullWidth
              icon="🤖"
              onClick={() => setActiveChatTab(currentTab)}
              className="chat-tab-btn"
            >
              Chat with Tab
            </Button>
          )}
        </div>

        {/* Box 2: Grouping Controls */}
        <div className="action-box grouping-box">
          {ungroupedTabs.length >= 2 ? (
            <>
              <div className="grouping-method-selector">
                <select
                  id="grouping-method"
                  value={groupingMethod}
                  onChange={(e) => setGroupingMethod(e.target.value)}
                  className="grouping-method-select"
                >
                  <option value="domain">🌐 Domain</option>
                  <option value="content">📋 Content</option>
                  <option value="ai">🤖 AI</option>
                </select>
              </div>

              <Button
                variant="primary"
                onClick={handleGroupTabs}
                disabled={isGrouping || mlInitializing}
                loading={isGrouping || mlInitializing}
                fullWidth
                className="group-tabs-btn"
              >
                {mlInitializing ? 'Init...' : isGrouping ? 'Grouping...' : `Group`}
              </Button>
            </>
          ) : (
            <div className="empty-placeholder-text">
              Add more tabs to group
            </div>
          )}
        </div>
      </div>

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
                <div className="section-header-actions">
                  <button
                    className="section-icon-btn"
                    onClick={() => {
                      if (expandedGroups.size === groups.length) setExpandedGroups(new Set());
                      else setExpandedGroups(new Set(groups.map(g => g.id)));
                    }}
                    title={expandedGroups.size === groups.length ? 'Collapse All' : 'Expand All'}
                    aria-label={expandedGroups.size === groups.length ? 'Collapse All' : 'Expand All'}
                  >
                    <IconChevrons />
                  </button>
                  <button
                    className="section-icon-btn"
                    onClick={handleSortGroups}
                    title="Sort Groups"
                    aria-label="Sort Groups"
                  >
                    <IconSort />
                  </button>
                  <button
                    className="section-icon-btn"
                    onClick={() => {
                      if (confirm('Are you sure you want to ungroup all tabs?')) {
                        Promise.all(groups.map(group => handleUngroupAll(group.id, true)))
                          .then(() => fetchGroupsAndTabs())
                          .catch(error => console.error('Error ungrouping all tabs:', error));
                      }
                    }}
                    title="Ungroup All"
                    aria-label="Ungroup All"
                  >
                    X
                  </button>
                </div>
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
                    onDeleteGroup={handleDeleteGroup}
                    onStartRename={handleStartRename}
                    onOpenTab={handleOpenTab}
                    onChatWithGroup={setActiveChatGroup}
                    domainSettings={domainSettings}
                    onSaveDomainSetting={handleSaveDomainSetting}
                    onRename={handleRenameGroup}
                    showChatShortcut
                    chatShortcutIcon={<IconChat />}
                    draggable
                    onDragStart={handleGroupDragStart(group)}
                    onDragOver={handleGroupDragOver(group)}
                    onDrop={handleGroupDrop(group)}
                    onDragEnd={handleGroupDragEnd}
                    extraClassName={[
                      draggedGroupId === group.id ? 'group-card--dragging' : '',
                      dragOverGroupId === group.id ? 'group-card--drag-over' : ''
                    ].join(' ').trim()}
                  />
                ))
              ) : (
                <div className="empty-section">No groups yet.</div>
              )}
            </div>

            <div className="section-header">
              <h2>Ungrouped Tabs <span className="count-badge">{ungroupedTabs.length}</span></h2>
            </div>



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
                      <option value="create_custom" style={{ fontWeight: 'bold', color: '#3b82f6' }}>
                        ✨ Create New Group...
                      </option>
                      {/* ====================== */}

                      {groups.length > 0 && (
                        <optgroup label="Existing">
                          {groups
                            .filter(g => g.windowId === tab.windowId)
                            .map(g => <option key={g.id} value={g.id}>{g.title}</option>)
                          }
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
    </div>
  );
}

export default App;
