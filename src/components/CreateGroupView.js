import React, { useState } from 'react';
import { chromeApi } from '../services/chromeApi';
import Button from './common/Button';

const CreateGroupView = ({ tab, onBack, onGroupCreated }) => {
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

  return (
    <div className="chat-view-container"> {/* Reusing the full-screen container style */}
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <span>Create Custom Group</span>
      </div>

      <div className="chat-body-centered">
        <div className="settings-container"> {/* Reusing settings container for the form */}
          <h3>📁 New Group</h3>
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
              <Button variant="secondary" onClick={onBack} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={loading} disabled={!groupName.trim()}>
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