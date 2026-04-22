import React, { useState } from 'react';
import { getColorEmoji } from '../utils/uiUtils';
import EmojiPicker from './EmojiPicker';

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
  onRename,
  onDeleteGroup,
  showChatShortcut = false,
  compactLabels = false,
  chatShortcutIcon = null,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  extraClassName = ''
}) => {
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingDomainName, setEditingDomainName] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [imageError, setImageError] = useState(false);

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
  const colorMap = {
    grey: '#9ca3af',
    blue: '#60a5fa',
    red: '#f87171',
    yellow: '#facc15',
    green: '#34d399',
    pink: '#f472b6',
    purple: '#a78bfa',
    cyan: '#38bdf8',
    orange: '#fb923c'
  };
  const colorDot = colorMap[group.color] || '#9ca3af';

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

  const handleEmojiSelect = (emoji) => {
    const settings = { ...domainSetting };
    settings.emoji = emoji;
    onSaveDomainSetting(firstHostname, settings);
    setShowEmojiPicker(false);
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

  const chatLabel = compactLabels ? 'Chat' : '🤖 Chat';
  const emojiLabel = compactLabels ? 'Emoji' : `${customEmoji || '😀'} Set Emoji`;
  const nameLabel = compactLabels ? 'Name' : '🏷️ Set Name';
  const renameLabel = compactLabels ? 'Rename' : '✏️ Rename';
  const ungroupLabel = compactLabels ? 'Ungroup' : '🗑️ Ungroup All';

  const cardClassName = expanded ? 'group-card group-card--expanded' : 'group-card group-card--collapsed';
  const combinedClassName = `${cardClassName} ${extraClassName}`.trim();

  return (
    <div
      className={combinedClassName}
      data-group-id={group.id}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="group-header" onClick={() => onToggle(group.id)}>
        <div className="group-header-left">

          <div
            className="group-icon-container"
            onClick={(e) => {
              if (isSingleDomain) {
                e.stopPropagation();
                setShowEmojiPicker(true);
              }
            }}
            style={{ cursor: isSingleDomain ? 'pointer' : 'default', position: 'relative', marginRight: '8px' }}
            title={isSingleDomain ? "Click to set custom emoji" : ""}
          >
            {groupFavicon && !imageError ? (
              <img
                src={groupFavicon}
                alt="Group Icon"
                className="group-icon-favicon"
                style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                onError={() => setImageError(true)}
              />
            ) : customEmoji && !compactLabels ? (
              <span className="group-custom-emoji" style={{ fontSize: '16px' }}>{customEmoji}</span>
            ) : compactLabels ? (
              <span className="group-color-dot" style={{ backgroundColor: colorDot }} />
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
          {showChatShortcut && (
            <button
              className="group-chat-shortcut"
              onClick={(e) => {
                e.stopPropagation();
                onChatWithGroup(group);
              }}
              title="Chat with group"
              aria-label="Chat with group"
            >
              {chatShortcutIcon || '💬'}
            </button>
          )}
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
                        setShowEmojiPicker(true);
                      }}
                      title="Set custom emoji for this domain"
                    >
                      {emojiLabel}
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
                      {nameLabel}
                    </button>
                  </>
                )}
              </>
            )}

            <button
              className="group-action-btn rename-btn"
              onClick={handleStartRename}
            >
              {renameLabel}
            </button>
            <button
              className="group-action-btn ungroup-btn"
              onClick={() => onUngroupAll(group.id)}
              title="Keep tabs open but remove group"
            >
              {ungroupLabel}
            </button>
            <button
              className="group-action-btn delete-btn"
              onClick={() => onDeleteGroup(group.id)}
              title="Close all tabs and delete group"
              style={{ color: '#ef4444' }}
            >
              {compactLabels ? 'Delete' : '🗑️ Delete Group'}
            </button>
          </div>
        </div>
      )}

      <EmojiPicker
        isOpen={showEmojiPicker}
        onSelect={handleEmojiSelect}
        onClose={() => setShowEmojiPicker(false)}
      />
    </div>
  );
};

export default GroupCard;
