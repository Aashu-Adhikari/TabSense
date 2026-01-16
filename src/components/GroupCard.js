import React, { useState } from 'react';
import { getColorEmoji } from '../utils/uiUtils';

const GroupCard = ({
  group,
  expanded,
  onToggle,
  onUngroupSingleTab,
  onUngroupAll,
  onStartRename,
  onOpenTab,
  onChatWithGroup,
  domainSettings = {},
  onSaveDomainSetting,
  onRename
}) => {
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingEmoji, setEditingEmoji] = useState(false);
  const [newEmoji, setNewEmoji] = useState('');
  const [editingDomainName, setEditingDomainName] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');

  const handleStartRename = () => {
    setRenamingGroup(group.id);
    setNewGroupName(group.title);
    onStartRename(group.id, group.title);
  };

  const handleSaveName = () => {
    if (newGroupName.trim()) {
      onRename(group.id, newGroupName.trim());
      setRenamingGroup(null);
      setNewGroupName('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setRenamingGroup(null);
      setNewGroupName('');
    }
  };

  const colorEmoji = getColorEmoji(group.color);

  // Check if all tabs belong to the same domain
  const getHostname = (url) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return null;
    }
  };

  const firstHostname = group.tabs.length > 0 ? getHostname(group.tabs[0].url) : null;
  const isSingleDomain = firstHostname && group.tabs.every(tab => getHostname(tab.url) === firstHostname);

  // Get domain settings
  const domainSetting = isSingleDomain ? domainSettings[firstHostname] || {} : {};
  const customEmoji = domainSetting.emoji;
  const customDomainName = domainSetting.name;

  const groupFavicon = isSingleDomain
    ? group.tabs.find(tab => tab.favIconUrl && !tab.favIconUrl.startsWith('chrome'))?.favIconUrl
    : null;

  const handleSaveEmoji = () => {
    const settings = { ...domainSetting };
    if (newEmoji.trim()) {
      settings.emoji = newEmoji.trim();
    } else {
      delete settings.emoji;
    }
    onSaveDomainSetting(firstHostname, settings);
    setEditingEmoji(false);
    setNewEmoji('');
  };

  const handleSaveDomainName = () => {
    const settings = { ...domainSetting };
    if (newDomainName.trim()) {
      settings.name = newDomainName.trim();
    } else {
      delete settings.name;
    }
    onSaveDomainSetting(firstHostname, settings);
    setEditingDomainName(false);
    setNewDomainName('');
  };

  return (
    <div className="group-card" data-group-id={group.id}>
      <div className="group-header" onClick={() => onToggle(group.id)}>
        <div className="group-header-left">

          <div
            className="group-icon-container"
            onClick={(e) => {
              if (isSingleDomain) {
                e.stopPropagation();
                setEditingEmoji(true);
                setNewEmoji(customEmoji || '');
              }
            }}
            style={{ cursor: isSingleDomain ? 'pointer' : 'default', position: 'relative', marginRight: '8px' }}
            title={isSingleDomain ? "Click to set custom emoji" : ""}
          >
            {editingEmoji ? (
              <input
                type="text"
                className="emoji-input"
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                onBlur={handleSaveEmoji}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEmoji();
                  if (e.key === 'Escape') setEditingEmoji(false);
                }}
                autoFocus
                style={{ width: '24px', textAlign: 'center', padding: 0, border: '1px solid #ccc', borderRadius: '4px' }}
              />
            ) : groupFavicon ? (
              <img
                src={groupFavicon}
                alt="Group Icon"
                className="group-icon-favicon"
                style={{ width: '16px', height: '16px', objectFit: 'contain' }}
              />
            ) : customEmoji ? (
              <span className="group-custom-emoji" style={{ fontSize: '16px' }}>{customEmoji}</span>
            ) : (
              <span className="group-color">{colorEmoji}</span>
            )}
          </div>

          {renamingGroup === group.id ? (
            <input
              type="text"
              className="group-rename-input"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveName}
              autoFocus
            />
          ) : (
            <span className="group-title">{group.title}</span>
          )}
          <span className="group-count">
            {group.tabs.length} tab{group.tabs.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="group-header-right">
          <span className="group-toggle">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {expanded && (
        <div className="group-content">
          <div className="group-tabs-list">
            {group.tabs.map(tab => (
              <div
                key={tab.id}
                className="group-tab-item clickable-tab"
                onClick={(e) => {
                  if (!e.target.closest('.ungroup-single-btn')) {
                    onOpenTab(tab.id, tab.windowId);
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
                    onUngroupSingleTab(group.id, tab.id);
                  }}
                  title="Remove from group"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="group-actions">
            {/* NEW CHAT BUTTON */}
            <button
              className="group-action-btn ai-btn"
              onClick={(e) => {
                e.stopPropagation();
                onChatWithGroup(group);
              }}
              style={{ fontWeight: 'bold', color: '#4f46e5' }}
            >
              🤖 Chat
            </button>

            {isSingleDomain && (
              <>
                {editingDomainName ? (
                  <input
                    type="text"
                    value={newDomainName}
                    onChange={(e) => setNewDomainName(e.target.value)}
                    onBlur={handleSaveDomainName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveDomainName();
                      if (e.key === 'Escape') setEditingDomainName(false);
                    }}
                    autoFocus
                    placeholder="Domain Name"
                    style={{ width: '100px', padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                ) : (
                  <>
                    <button
                      className="group-action-btn emoji-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEmoji(true);
                        setNewEmoji(customEmoji || '');
                      }}
                      title="Set custom emoji for this domain"
                    >
                      {customEmoji || '😀'} Set Emoji
                    </button>
                    <button
                      className="group-action-btn name-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDomainName(true);
                        setNewDomainName(customDomainName || '');
                      }}
                      title="Set custom name for this domain"
                    >
                      🏷️ Set Name
                    </button>
                  </>
                )}
              </>
            )}

            <button
              className="group-action-btn rename-btn"
              onClick={handleStartRename}
            >
              ✏️ Rename
            </button>
            <button
              className="group-action-btn ungroup-btn"
              onClick={() => onUngroupAll(group.id)}
            >
              🗑️ Ungroup All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupCard;
