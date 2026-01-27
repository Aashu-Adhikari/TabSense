import React, { useState, useEffect } from 'react';
import { chromeApi } from '../services/chromeApi';
import Button from './common/Button';
import '../popup/settings.css';

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

// Available setting components
export const SETTING_COMPONENTS = {
  LLM_API: 'llm_api',
  AUTO_GROUPING: 'auto_grouping',
  CHAT_HISTORY: 'chat_history',
  // Add more components here as they are developed
};

// Component filter presets
export const COMPONENT_FILTERS = {
  ALL: [SETTING_COMPONENTS.LLM_API, SETTING_COMPONENTS.AUTO_GROUPING],
  CHAT: [SETTING_COMPONENTS.LLM_API, SETTING_COMPONENTS.CHAT_HISTORY], // LLM API and chat history settings for chat interface
  HEADER: [SETTING_COMPONENTS.LLM_API, SETTING_COMPONENTS.AUTO_GROUPING], // Same as ALL for now
  SIDEBAR: [SETTING_COMPONENTS.LLM_API, SETTING_COMPONENTS.CHAT_HISTORY], // Sidebar-specific settings
};

const SettingsView = ({
  onSaved,
  onCancel,
  isFirstSetup,
  enabledComponents = COMPONENT_FILTERS.ALL,
  compact = false,
  title,
  showBackButton = false
}) => {
  const [provider, setProvider] = useState('free');
  const [baseUrl, setBaseUrl] = useState(PRESETS.free.baseUrl);
  const [model, setModel] = useState(PRESETS.free.model);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-grouping settings
  const [autoGroupingEnabled, setAutoGroupingEnabled] = useState(true);
  const [autoGroupingMethod, setAutoGroupingMethod] = useState('domain');

  // Chat history settings
  const [chatRetentionHours, setChatRetentionHours] = useState(24);

  // Determine which components to show
  const showLLMSettings = enabledComponents.includes(SETTING_COMPONENTS.LLM_API);
  const showAutoGrouping = enabledComponents.includes(SETTING_COMPONENTS.AUTO_GROUPING);
  const showChatHistory = enabledComponents.includes(SETTING_COMPONENTS.CHAT_HISTORY);

  // Load existing settings if editing
  useEffect(() => {
    if (!isFirstSetup) {
      if (showLLMSettings) {
        chromeApi.getLLMConfig().then(res => {
          if (res.config) {
            setProvider(res.config.provider || 'custom');
            setBaseUrl(res.config.baseUrl);
            setModel(res.config.model);
            setApiKey(res.config.apiKey);
          }
        });
      }

      if (showAutoGrouping) {
        // Load auto-grouping settings
        chrome.storage.local.get(['auto_grouping_settings']).then(result => {
          const settings = result.auto_grouping_settings || {};
          setAutoGroupingEnabled(settings.enabled || false);
          setAutoGroupingMethod(settings.method || 'domain');
        });
      }

      if (showChatHistory) {
        // Load chat history settings
        chrome.storage.local.get(['chat_history_settings']).then(result => {
          const settings = result.chat_history_settings || {};
          setChatRetentionHours(settings.retentionHours || 24);
        });
      }
    }
  }, [isFirstSetup, showLLMSettings, showAutoGrouping]);

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    if (newProvider !== 'custom') {
      setBaseUrl(PRESETS[newProvider].baseUrl);
      setModel(PRESETS[newProvider].model);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    // Save LLM config only if API key is provided (for chat features) and component is enabled
    if (showLLMSettings && apiKey.trim()) {
      const config = { provider, baseUrl, apiKey, model };
      await chromeApi.saveLLMConfig(config);
    }

    // Save auto-grouping settings if component is enabled
    if (showAutoGrouping) {
      const autoGroupingSettings = {
        enabled: autoGroupingEnabled,
        method: autoGroupingMethod
      };
      await chrome.storage.local.set({ auto_grouping_settings: autoGroupingSettings });
    }

    // Save chat history settings if component is enabled
    if (showChatHistory) {
      const chatHistorySettings = {
        retentionHours: chatRetentionHours
      };
      await chrome.storage.local.set({ chat_history_settings: chatHistorySettings });
    }

    setLoading(false);
    onSaved();
  };

  const headerTitle = title || (compact ? 'AI Settings' : '⚙️ Settings');

  return (
    <div className="settings-container">
      <div className="settings-header">
        {showBackButton && onCancel && (
          <button className="settings-btn-header" onClick={onCancel} aria-label="Back">
            &larr;
          </button>
        )}
        <h3 className="settings-title">{headerTitle}</h3>
      </div>
      <div className="settings-content">
        {/* Show LLM API settings only if component is enabled */}
        {showLLMSettings && (
          <>
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
              {compact ? (
                <>
                  <strong>Note:</strong> Free models may experience latency or rate limits. Data logging must be enabled in OpenRouter settings.
                </>
              ) : (
                <>
                  ⚠️ <strong>Note:</strong> Free models may experience latency or rate limits. Data logging must be enabled in OpenRouter settings.
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Show Auto-Grouping settings only if component is enabled */}
      {showAutoGrouping && (
        <>
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
        </>
      )}

      {/* Show Chat History settings only if component is enabled */}
      {showChatHistory && (
        <>
          <h3>💬 Chat History Settings</h3>

          <div className="form-group">
            <label>Chat History Retention (hours)</label>
            <input
              type="number"
              min="1"
              max="24"
              value={chatRetentionHours}
              onChange={(e) => setChatRetentionHours(Math.min(24, Math.max(1, parseInt(e.target.value) || 1)))}
              className="settings-input"
              placeholder="24"
            />
            <p className="settings-hint">
              Chat conversations older than this will be automatically deleted to save storage space. Maximum 24 hours.
            </p>
          </div>
        </>
      )}


      {/* If no components are enabled, show a message */}
      {!showLLMSettings && !showAutoGrouping && (
        <div className="empty-settings">
          <p>No settings are available for this view.</p>
        </div>
      )}

      <div className="settings-actions">
        {onCancel && (
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
            className={compact ? 'sidebar-btn sidebar-btn--secondary' : ''}
          >
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleSave}
          loading={loading}
          fullWidth={!onCancel}
          className={compact ? 'sidebar-btn sidebar-btn--primary' : ''}
        >
          Save Configuration
        </Button>
      </div>
      </div>
    </div>
  );
};

export default SettingsView;
