// src/components/ApiKeyInput.js
import React, { useState } from 'react';
import { chromeApi } from '../services/chromeApi';
import Button from './common/Button';

const ApiKeyInput = ({ onKeySaved }) => {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!key.startsWith('sk-')) {
      alert('Invalid OpenAI Key. It should start with "sk-"');
      return;
    }
    setLoading(true);
    await chromeApi.saveApiKey(key);
    setLoading(false);
    onKeySaved();
  };

  return (
    <div className="api-key-container">
      <h3>🤖 Setup Chat</h3>
      <p className="api-desc">Enter your OpenAI API Key to enable chat features.</p>
      <input 
        type="password" 
        className="api-input"
        placeholder="sk-..." 
        value={key}
        onChange={(e) => setKey(e.target.value)}
      />
      <div className="api-actions">
        <Button onClick={handleSave} loading={loading} fullWidth>
          Save & Enable
        </Button>
        <p className="api-note">Key is stored locally on your device.</p>
      </div>
    </div>
  );
};

export default ApiKeyInput;