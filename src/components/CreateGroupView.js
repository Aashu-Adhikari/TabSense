import React, { useState } from 'react';
import { chromeApi } from '../services/chromeApi';
import Button from './common/Button';
import { IconArrowLeft } from './common/Icons';

const CreateGroupView = ({ tab, onBack, onGroupCreated, isSidebar = false }) => {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setLoading(true);
    // Reuse the existing generic 'groupTabs' API which accepts an array of IDs and a name
    await chromeApi.groupTabs([tab.id], groupName.trim());
    setLoading(false);
    onGroupCreated();
  };

  const containerClass = isSidebar ? 'sidebar-chat-view-container' : 'chat-view-container';
  const headerClass = isSidebar ? 'sidebar-chat-header' : 'chat-header';
  const backBtnClass = isSidebar ? 'sidebar-back-btn' : 'back-btn';
  const bodyClass = isSidebar ? 'sidebar-chat-body-centered' : 'chat-body-centered';

  return (
    <div className={containerClass}>
      <div className={headerClass}>
        <button className={backBtnClass} onClick={onBack} aria-label="Back">
          {isSidebar ? <IconArrowLeft className="sidebar-icon sidebar-icon--small" /> : '←'}
        </button>
        <span>Create Custom Group</span>
      </div>

      <div className={bodyClass}>
        <div className="settings-container"> {/* Reusing settings container for the form */}
          <h3>{isSidebar ? 'New Group' : '📁 New Group'}</h3>
          <p className="api-desc">
            Create a new group for the tab:<br/>
            <strong>{tab.title}</strong>
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Group Name</label>
              <input 
                type="text" 
                className="settings-input"
                placeholder="e.g., Project Alpha"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="settings-actions">
              <Button
                variant="secondary"
                onClick={onBack}
                disabled={loading}
                className={isSidebar ? 'sidebar-btn sidebar-btn--secondary' : ''}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={!groupName.trim()}
                className={isSidebar ? 'sidebar-btn sidebar-btn--primary' : ''}
              >
                Create & Add
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupView;
