// src/sidebar/SidebarApp.js
import React, { useState, useEffect } from 'react';
import './sidebar-base.css';
import '../styles/components/search.css';
import '../styles/components/groups.css';
import '../styles/components/toast.css';
import './sidebar-chat.css';
import { useGroups } from '../hooks/useGroups';
import { useSearch } from '../hooks/useSearch';
import GroupCard from '../components/GroupCard';
import SearchResultsView from '../components/SearchResultsView';
import Button from '../components/common/Button';
import ChatView from '../components/ChatView';
import CreateGroupView from '../components/CreateGroupView';
import UndoToast from '../components/common/UndoToast';
import SettingsView, { COMPONENT_FILTERS } from '../components/SettingsView';
import { mlCategories } from '../utils/mlCategories';
import { openPatreon } from '../utils/links';
import {
  IconChat,
  IconChevrons,
  IconFolder,
  IconHeart,
  IconRefresh,
  IconSettings,
  IconSort,
  IconSidebar,
  IconExternal
} from '../components/common/Icons';

function SidebarApp() {
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
    undoState,
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

  // Custom Group Creation
  const [tabForNewGroup, setTabForNewGroup] = useState(null);

  // Sidebar View State
  const [activeView, setActiveView] = useState('explorer'); // 'explorer', 'chat', 'settings'
  const [draggedGroupId, setDraggedGroupId] = useState(null);
  const [dragOverGroupId, setDragOverGroupId] = useState(null);
  const [uiSize, setUiSize] = useState('normal');
  const [defaultView, setDefaultView] = useState('sidepanel');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        setCurrentTab(tabs[0]);
      }
    });
    const handleActivated = (activeInfo) => {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (!chrome.runtime.lastError && tab) {
          setCurrentTab(tab);
        }
      });
    };
    chrome.tabs.onActivated.addListener(handleActivated);
    return () => chrome.tabs.onActivated.removeListener(handleActivated);
  }, []);

  useEffect(() => {
    const normalizeSize = (value) => (
      value === 'small' || value === 'big' ? value : 'normal'
    );

    chrome.storage.local.get(['ui_preferences'], (result) => {
      setUiSize(normalizeSize(result.ui_preferences?.uiSize));
      setDefaultView(result.ui_preferences?.defaultView || 'sidepanel');
    });

    const handleStorageChange = (changes, areaName) => {
      if (areaName !== 'local' || !changes.ui_preferences) return;
      const { newValue } = changes.ui_preferences;
      setUiSize(normalizeSize(newValue?.uiSize));
      setDefaultView(newValue?.defaultView || 'sidepanel');
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Switch to chat view if a chat is activated
  useEffect(() => {
    if (activeChatTab || activeChatGroup) {
      setActiveView('chat');
    }
  }, [activeChatTab, activeChatGroup]);

  const handleAssignTabToCategory = async (tab, event) => {
    const { value } = event.target;
    if (!value) return;

    if (value === 'create_custom') {
      event.target.value = "";
      setTabForNewGroup(tab);
      return;
    }

    const { chromeApi } = await import('../services/chromeApi');
    event.target.value = "";

    if (value.startsWith('ml_category--')) {
      const categoryLabel = value.replace('ml_category--', '');
      const category = mlCategories.find(c => c.label === categoryLabel);
      if (category) {
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

        if (newView === 'popup') {
          // Open popup immediately
          chrome.action.openPopup();
        }
      } catch (e) {
        console.warn('Failed to update panel behavior:', e);
      }
    });
  };

  const loading = groupsLoading;

  // --- RENDER HELPERS ---

  const renderActivityBar = () => (
    <div className="activity-bar">
      <div
        className={`activity-bar-item ${activeView === 'explorer' ? 'active' : ''}`}
        onClick={() => setActiveView('explorer')}
        title="Explorer"
      >
        <div className="activity-bar-icon">
          <IconFolder className="sidebar-icon" />
        </div>
      </div>
      <div
        className={`activity-bar-item ${activeView === 'chat' ? 'active' : ''}`}
        onClick={() => setActiveView('chat')}
        title="Chat"
      >
        <div className="activity-bar-icon">
          <IconChat className="sidebar-icon" />
        </div>
      </div>
      <div className="activity-bar-spacer" />
      <div
        className="activity-bar-item"
        onClick={openPatreon}
        title="Support"
      >
        <div className="activity-bar-icon">
          <IconHeart className="sidebar-icon" />
        </div>
      </div>
      <div
        className={`activity-bar-item ${activeView === 'settings' ? 'active' : ''}`}
        onClick={() => setActiveView('settings')}
        title="Settings"
      >
        <div className="activity-bar-icon">
          <IconSettings className="sidebar-icon" />
        </div>
      </div>
    </div>
  );

  const renderExplorerView = () => {
    if (tabForNewGroup) {
      return (
        <div className="sidebar-main">
          <CreateGroupView
            tab={tabForNewGroup}
            onBack={() => setTabForNewGroup(null)}
            onGroupCreated={() => {
              setTabForNewGroup(null);
              fetchGroupsAndTabs();
            }}
            isSidebar
          />
        </div>
      );
    }

    return (
      <>
        <div className="sidebar-header sidebar-header--brand">
          <div className="sidebar-brand">
            <img className="sidebar-brand-icon" src="icons/icon48.png" alt="" />
            <div className="sidebar-brand-text">
              <div className="sidebar-brand-title">TabSense</div>
              <div className="sidebar-brand-tagline">Organize. Search. Chat.</div>
            </div>
          </div>
          <div className="sidebar-header-actions">
            <button
              className="sidebar-action-btn"
              onClick={toggleDefaultView}
              title={defaultView === 'sidepanel' ? 'Switch to Popup Mode' : 'Switch to Sidebar Mode'}
            >
              {defaultView === 'sidepanel' ? (
                <IconSidebar className="sidebar-icon sidebar-icon--small" />
              ) : (
                <IconExternal className="sidebar-icon sidebar-icon--small" />
              )}
            </button>
            <button className="sidebar-action-btn" onClick={fetchGroupsAndTabs} title="Refresh">
              <IconRefresh className="sidebar-icon sidebar-icon--small" />
            </button>
            <button className="sidebar-action-btn" onClick={() => {
              if (expandedGroups.size === groups.length) setExpandedGroups(new Set());
              else setExpandedGroups(new Set(groups.map(g => g.id)));
            }} title="Toggle All">
              <IconChevrons className="sidebar-icon sidebar-icon--small" />
            </button>
            <button className="sidebar-action-btn" onClick={handleSortGroups} title="Sort Groups">
              <IconSort className="sidebar-icon sidebar-icon--small" />
            </button>
          </div>
        </div>

        <div className="sidebar-main">
          {/* Quick Actions Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-header" onClick={() => { }}>
              <span className="codicon codicon-chevron-down"></span>
            </div>
            <div className="sidebar-section-content">
              {currentTab && (
                <div className="sidebar-quick-action">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => {
                      setActiveChatTab(currentTab);
                      setActiveView('chat');
                    }}
                    className="sidebar-btn sidebar-btn--primary"
                  >
                    Chat with Current Tab
                  </Button>
                </div>
              )}
              {ungroupedTabs.length >= 2 && (
                <div className="sidebar-quick-action">
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    <select
                      value={groupingMethod}
                      onChange={(e) => setGroupingMethod(e.target.value)}
                      className="sidebar-select"
                      style={{ flex: 1, fontSize: '11px' }}
                    >
                      <option value="domain">Domain</option>
                      <option value="content">Content</option>
                      <option value="ai">AI</option>
                    </select>
                    <Button
                      variant="secondary"
                      onClick={handleGroupTabs}
                      disabled={isGrouping || mlInitializing}
                      loading={isGrouping || mlInitializing}
                      className="sidebar-btn sidebar-btn--secondary"
                    >
                      {mlInitializing ? 'Init...' : isGrouping ? 'Grouping...' : 'Group'}
                    </Button>
                  </div>
                </div>
              )}
              {groups.length > 0 && (
                <div className="sidebar-quick-action">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      if (confirm('Are you sure you want to ungroup all tabs?')) {
                        Promise.all(groups.map(group => handleUngroupAll(group.id, true)))
                          .then(() => fetchGroupsAndTabs())
                          .catch(error => console.error('Error ungrouping all tabs:', error));
                      }
                    }}
                    className="sidebar-btn sidebar-btn--secondary"
                  >
                    Ungroup All Tabs
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Search Section */}
          <div className="sidebar-search-container">
            <div className="sidebar-search-input-wrapper">
              <input
                type="text"
                placeholder="Search tabs..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="sidebar-search-input"
              />
              {searchTerm && <button className="sidebar-clear-search-btn" onClick={clearSearch} style={{ width: '16px', height: '16px', fontSize: '10px' }}>✕</button>}
            </div>
          </div>

          {loading ? (
            <div className="sidebar-loading-state">Loading...</div>
          ) : searchTerm ? (
            <SearchResultsView
              searchResults={searchResults}
              searchTerm={searchTerm}
              onClearSearch={clearSearch}
              onAddToGroup={handleAddToGroup}
              groups={groups}
              onOpenTab={handleOpenTab}
              compact
            />
          ) : (
            <>
              {/* Groups Section */}
              <div className="sidebar-section">
                <div className="sidebar-section-header">
                  <span className="codicon codicon-chevron-down"></span>
                  <span>Tab Groups ({groups.length})</span>
                </div>
                <div className="sidebar-section-content">
                  {groups.length > 0 ? (
                    <div className="groups-list sidebar-groups-list">
                      {groups.map(group => (
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
                          onChatWithGroup={(targetGroup) => {
                            setActiveChatGroup(targetGroup);
                            setActiveView('chat');
                          }}
                          domainSettings={domainSettings}
                          onSaveDomainSetting={handleSaveDomainSetting}
                          onRename={handleRenameGroup}
                          showChatShortcut
                          compactLabels
                          chatShortcutIcon={<IconChat className="sidebar-icon sidebar-icon--small" />}
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
                      ))}
                    </div>
                  ) : (
                    <div className="sidebar-empty-section" style={{ padding: '8px', fontSize: '12px' }}>No groups</div>
                  )}
                </div>
              </div>

              {/* Ungrouped Tabs Section */}
              <div className="sidebar-section">
                <div className="sidebar-section-header">
                  <span className="codicon codicon-chevron-down"></span>
                  <span>Ungrouped ({ungroupedTabs.length})</span>
                </div>
                <div className="sidebar-section-content">
                  {ungroupedTabs.map(tab => (
                    <div key={tab.id} className="sidebar-tab-item" onClick={() => handleOpenTab(tab.id, tab.windowId)}>
                      <img src={tab.favIconUrl || 'data:image/svg+xml;base64,...'} className="sidebar-tab-favicon" alt="" />
                      <div className="sidebar-tab-info">
                        <div className="sidebar-tab-title">{tab.title}</div>
                      </div>
                      <div className="sidebar-tab-actions">
                        <select
                          className="group-select"
                          onChange={(e) => handleAssignTabToCategory(tab, e)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">➕ Add to...</option>
                          <option value="create_custom" style={{ fontWeight: 'bold', color: '#3b82f6' }}>
                            Create New Group...
                          </option>
                          {groups.length > 0 && (
                            <optgroup label="Existing">
                              {groups
                                .filter(g => g.windowId === tab.windowId)
                                .map(g => <option key={g.id} value={g.id}>{g.title}</option>)
                              }
                            </optgroup>
                          )}
                          <optgroup label="AI Categories">
                            {mlCategories.map(c => <option key={c.label} value={`ml_category--${c.label}`}>{c.label}</option>)}
                          </optgroup>
                        </select>
                        <button
                          className="sidebar-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveChatTab(tab);
                            setActiveView('chat');
                          }}
                          title="Chat"
                        >
                          <IconChat className="sidebar-icon sidebar-icon--small" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </>
    );
  };

  const renderChatView = () => {
    // If no specific chat is active, show a placeholder or default chat
    // For now, we'll just show the ChatView with the active tab/group or null
    // If null, ChatView usually handles it or we can show a "Select a tab to chat" message
    const target = activeChatTab ? { tab: activeChatTab } : (activeChatGroup ? { group: activeChatGroup } : { tab: currentTab });
    const chatKey = target.tab ? `tab-${target.tab.id}` : (target.group ? `group-${target.group.id}` : 'none');

    return (
      <div className="sidebar-main" style={{ overflow: 'hidden' }}>
        {target.tab || target.group ? (
          <ChatView
            {...target}
            key={chatKey}
            onBack={() => {
              setActiveChatTab(null);
              setActiveChatGroup(null);
              setActiveView('explorer');
            }}
            isSidebar
            onRefresh={() => {
              if (currentTab) {
                setActiveChatGroup(null);
                setActiveChatTab(currentTab);
                setActiveView('chat');
              }
            }}
          />
        ) : (
          <div className="sidebar-empty-section">Select a tab or group to start chatting.</div>
        )}
      </div>
    );
  };

  const renderSettingsView = () => (
    <>
      <div className="sidebar-header">
        <span className="sidebar-header-title">SETTINGS</span>
      </div>
      <div className="sidebar-main">
        <div className="settings-view-container">
          <SettingsView
            enabledComponents={COMPONENT_FILTERS.SIDEBAR}
            compact
            showSupportButton={false}
            onSaved={() => {
              fetchGroupsAndTabs();
            }}
            onCancel={() => setActiveView('explorer')}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className={`sidebar-container sidebar-size-${uiSize}`}>
      {renderActivityBar()}
      <div className="sidebar-content">
        {activeView === 'explorer' && renderExplorerView()}
        {activeView === 'chat' && renderChatView()}
        {activeView === 'settings' && renderSettingsView()}
      </div>

      {undoState && (
        <UndoToast
          expiresAt={undoState.expiresAt}
          onUndo={handleUndoDelete}
        />
      )}
    </div>
  );
}

export default SidebarApp;
