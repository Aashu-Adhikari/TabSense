// src/sidebar/SidebarApp.js
import React, { useState, useEffect } from 'react';
import './sidebar-base.css';
import '../styles/components/search.css';
import '../styles/components/groups.css';
import './sidebar-chat.css';
import { useGroups } from '../hooks/useGroups';
import { useSearch } from '../hooks/useSearch';
import SearchResultsView from '../components/SearchResultsView';
import Button from '../components/common/Button';
import ChatView from '../components/ChatView';
import CreateGroupView from '../components/CreateGroupView';
import SettingsView, { COMPONENT_FILTERS } from '../components/SettingsView';
import { mlCategories } from '../utils/mlCategories';

function SidebarApp() {
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

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        setCurrentTab(tabs[0]);
      }
    });
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && searchTerm) clearSearch();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm, clearSearch]);

  const loading = groupsLoading;

  // --- RENDER HELPERS ---

  const renderActivityBar = () => (
    <div className="activity-bar">
      <div
        className={`activity-bar-item ${activeView === 'explorer' ? 'active' : ''}`}
        onClick={() => setActiveView('explorer')}
        title="Explorer"
      >
        <div className="activity-bar-icon">📁</div>
      </div>
      <div
        className={`activity-bar-item ${activeView === 'chat' ? 'active' : ''}`}
        onClick={() => setActiveView('chat')}
        title="Chat"
      >
        <div className="activity-bar-icon">💬</div>
      </div>
      <div className="activity-bar-spacer" />
      <div
        className={`activity-bar-item ${activeView === 'settings' ? 'active' : ''}`}
        onClick={() => setActiveView('settings')}
        title="Settings"
      >
        <div className="activity-bar-icon">⚙️</div>
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
          />
        </div>
      );
    }

    return (
      <>
        <div className="sidebar-header">
          <span className="sidebar-header-title">EXPLORER</span>
          <div className="sidebar-header-actions">
            <button className="sidebar-action-btn" onClick={fetchGroupsAndTabs} title="Refresh">🔄</button>
            <button className="sidebar-action-btn" onClick={() => {
              if (expandedGroups.size === groups.length) setExpandedGroups(new Set());
              else setExpandedGroups(new Set(groups.map(g => g.id)));
            }} title="Toggle All">↕️</button>
          </div>
        </div>

        <div className="sidebar-main">
          {/* Quick Actions Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-header" onClick={() => { }}>
              <span className="codicon codicon-chevron-down"></span>
              <span>Quick Actions</span>
            </div>
            <div className="sidebar-section-content">
              {currentTab && (
                <div style={{ padding: '0 16px' }}>
                  <Button
                    variant="primary"
                    fullWidth
                    icon="🤖"
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
                <div style={{ padding: '8px 16px' }}>
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
                      Group
                    </Button>
                  </div>
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
              onAddToGroup={handleAssignTabToCategory}
              groups={groups}
              onOpenTab={handleOpenTab}
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
                    groups.map(group => (
                      <div key={group.id} className="sidebar-group-container">
                        <div className="sidebar-group-item" onClick={() => toggleGroup(group.id)}>
                          <span style={{ marginRight: '4px', fontSize: '10px', width: '12px', display: 'inline-block', textAlign: 'center' }}>
                            {expandedGroups.has(group.id) ? '▼' : '▶'}
                          </span>
                          <div className="sidebar-group-info">
                            <span className="sidebar-group-title">{group.title}</span>
                          </div>
                          <div className="sidebar-group-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="sidebar-action-btn"
                              onClick={() => {
                                setActiveChatGroup(group);
                                setActiveView('chat');
                              }}
                              title="Chat with group"
                            >
                              💬
                            </button>
                          </div>
                        </div>
                        {expandedGroups.has(group.id) && (
                          <div className="sidebar-group-tabs">
                            {group.tabs.map(tab => (
                              <div key={tab.id} className="sidebar-tab-item nested-tab" onClick={() => handleOpenTab(tab.id, tab.windowId)} style={{ paddingLeft: '28px' }}>
                                <img src={tab.favIconUrl || 'data:image/svg+xml;base64,...'} className="sidebar-tab-favicon" alt="" />
                                <div className="sidebar-tab-info">
                                  <div className="sidebar-tab-title">{tab.title}</div>
                                </div>
                                <div className="sidebar-tab-actions">
                                  <button
                                    className="sidebar-action-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveChatTab(tab);
                                      setActiveView('chat');
                                    }}
                                    title="Chat"
                                  >
                                    💬
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
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
                        <button
                          className="sidebar-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveChatTab(tab);
                            setActiveView('chat');
                          }}
                          title="Chat"
                        >
                          💬
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

    return (
      <div className="sidebar-main" style={{ overflow: 'hidden' }}>
        {target.tab || target.group ? (
          <ChatView
            {...target}
            onBack={() => {
              setActiveChatTab(null);
              setActiveChatGroup(null);
              setActiveView('explorer');
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
    <div className="sidebar-container">
      {renderActivityBar()}
      <div className="sidebar-content">
        {activeView === 'explorer' && renderExplorerView()}
        {activeView === 'chat' && renderChatView()}
        {activeView === 'settings' && renderSettingsView()}
      </div>
    </div>
  );
}

export default SidebarApp;