import React, { useState, useEffect } from 'react';
import { chromeApi } from '../services/chromeApi';
import Button from './common/Button';

const PRESETS = {
  free: {
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.0-flash-exp:free',
    label: 'OpenRouter (Free Tier)'
  },
  openai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    label: 'OpenAI (Official)'
  },
  custom: {
    provider: 'custom',
    baseUrl: '',
    model: '',
    label: 'Custom / Other'
  }
};

const SettingsView = ({ onSaved, onCancel, isFirstSetup }) => {
  const [provider, setProvider] = useState('free');
  const [baseUrl, setBaseUrl] = useState(PRESETS.free.baseUrl);
  const [model, setModel] = useState(PRESETS.free.model);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-grouping settings
  const [autoGroupingEnabled, setAutoGroupingEnabled] = useState(false);
  const [autoGroupingMethod, setAutoGroupingMethod] = useState('domain');

  // Load existing settings if editing
  useEffect(() => {
    if (!isFirstSetup) {
      chromeApi.getLLMConfig().then(res => {
        if (res.config) {
          setProvider(res.config.provider || 'custom');
          setBaseUrl(res.config.baseUrl);
          setModel(res.config.model);
          setApiKey(res.config.apiKey);
        }
      });

      // Load auto-grouping settings
      chrome.storage.local.get(['auto_grouping_settings']).then(result => {
        const settings = result.auto_grouping_settings || {};
        setAutoGroupingEnabled(settings.enabled || false);
        setAutoGroupingMethod(settings.method || 'domain');
      });
    }
  }, [isFirstSetup]);

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    if (newProvider !== 'custom') {
      setBaseUrl(PRESETS[newProvider].baseUrl);
      setModel(PRESETS[newProvider].model);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    // Save LLM config only if API key is provided (for chat features)
    if (apiKey.trim()) {
      const config = { provider, baseUrl, apiKey, model };
      await chromeApi.saveLLMConfig(config);
    }

    // Always save auto-grouping settings (works without API key)
    const autoGroupingSettings = {
      enabled: autoGroupingEnabled,
      method: autoGroupingMethod
    };
    await chrome.storage.local.set({ auto_grouping_settings: autoGroupingSettings });

    setLoading(false);
    onSaved();
  };

  return (
    <div className="settings-container">
      <h3>⚙️ AI Settings</h3>
      
      <div className="form-group">
        <label>Service Provider</label>
        <select 
          value={provider} 
          onChange={(e) => handleProviderChange(e.target.value)}
          className="settings-select"
        >
          <option value="free">OpenRouter (Free Tier)</option>
          <option value="openai">OpenAI</option>
          <option value="custom">Custom (Any Compatible API)</option>
        </select>
      </div>

      <div className="form-group">
        <label>Base URL</label>
        <input 
          type="text" 
          value={baseUrl} 
          onChange={(e) => setBaseUrl(e.target.value)}
          disabled={provider !== 'custom'}
          className="settings-input"
        />
      </div>

      <div className="form-group">
        <label>Model Name</label>
        <input 
          type="text" 
          value={model} 
          onChange={(e) => setModel(e.target.value)}
          className="settings-input"
        />
      </div>

      <div className="form-group">
        <label>API Key</label>
        <input 
          type="password" 
          value={apiKey} 
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="settings-input"
        />
        {model.toLowerCase().includes('free') && (
          <p className="settings-hint">
            Get a free key at <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai</a>
          </p>
        )}
      </div>

      {model.toLowerCase().includes('free') && (
        <div className="free-tier-notice">
          ⚠️ <strong>Note:</strong> Free models may experience latency or rate limits. Data logging must be enabled in OpenRouter settings.
        </div>
      )}

      <h3>🔄 Auto-Grouping Settings</h3>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={autoGroupingEnabled}
            onChange={(e) => setAutoGroupingEnabled(e.target.checked)}
          />
          Enable automatic grouping of new tabs
        </label>
      </div>

      {autoGroupingEnabled && (
        <div className="form-group">
          <label>Auto-Grouping Method</label>
          <select
            value={autoGroupingMethod}
            onChange={(e) => setAutoGroupingMethod(e.target.value)}
            className="settings-select"
          >
            <option value="domain">🌐 Domain Grouping</option>
            <option value="content">📋 Content Grouping</option>
            <option value="ai">🤖 AI Grouping</option>
          </select>
        </div>
      )}

      <div className="settings-actions">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button variant="primary" onClick={handleSave} loading={loading} fullWidth={!onCancel}>
          Save Configuration
        </Button>
      </div>
    </div>
  );
};

export default SettingsView;