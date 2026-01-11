import React, { useState } from 'react';
import { getColorEmoji } from '../utils/uiUtils';

const GroupCard = ({
  group,
  expanded,
  onToggle,
  onUngroupSingleTab,
  onUngroupAll,
  onStartRename,
  onRename,
  onOpenTab
}) => {
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');

  const handleStartRename = () => {
    setRenamingGroup(group.id);
    setNewGroupName(group.title);
    onStartRename(group.id, group.title);
  };

  const handleSaveName = () => {
    if (newGroupName.trim() && onRename) {
      onRename(group.id, newGroupName);
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

  return (
    <div className="group-card" data-group-id={group.id}>
      <div className="group-header" onClick={() => onToggle(group.id)}>
        <div className="group-header-left">
          <span className="group-color">{colorEmoji}</span>
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
                  src={tab.favIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCAxLjVhNi41IDYuNSAwIDEgMCAwIDEzIDYuNSA2LjUgMCAwIDAgMC0xM3pNOC41IDV2My4zTDEwLjggOS43YS41LjUgMCAxIDEtLjcuN0w3LjUgOC4yYTEgMSAwIDAgMS0uNS0uOVY1YTEgMSAwIDAgMSAxLTFoMGExIDEgMCAwIDEgMSAxeiIgZmlsbD0iIzY2NjY2NiIvPjwvc3ZnPg=='}
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
