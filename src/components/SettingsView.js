import React, { useState, useEffect } from 'react';
import { chromeApi } from '../services/chromeApi';
import Button from './common/Button';
import '../popup/settings.css';
import { openPatreon } from '../utils/links';

const PRESETS = {
  openrouter: {
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: '',
    label: 'OpenRouter'
  },
  openrouter_free: {
    provider: 'openrouter_free',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openrouter/free',
    label: 'OpenRouter (Free)'
  },
  deepseek: {
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: '',
    label: 'DeepSeek'
  },
  openai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: '',
    label: 'OpenAI'
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
  UI_PREFERENCES: 'ui_preferences',
  // Add more components here as they are developed
};

// Component filter presets
export const COMPONENT_FILTERS = {
  ALL: [SETTING_COMPONENTS.LLM_API, SETTING_COMPONENTS.AUTO_GROUPING, SETTING_COMPONENTS.UI_PREFERENCES],
  CHAT: [SETTING_COMPONENTS.LLM_API, SETTING_COMPONENTS.CHAT_HISTORY, SETTING_COMPONENTS.UI_PREFERENCES], // LLM API and chat history settings for chat interface
  HEADER: [SETTING_COMPONENTS.LLM_API, SETTING_COMPONENTS.AUTO_GROUPING, SETTING_COMPONENTS.UI_PREFERENCES], // Same as ALL for now
  SIDEBAR: [SETTING_COMPONENTS.LLM_API, SETTING_COMPONENTS.AUTO_GROUPING, SETTING_COMPONENTS.CHAT_HISTORY, SETTING_COMPONENTS.UI_PREFERENCES], // Sidebar-specific settings
};

const SettingsView = ({
  onSaved,
  onCancel,
  isFirstSetup,
  enabledComponents = COMPONENT_FILTERS.ALL,
  compact = false,
  title,
  showBackButton = false,
  showSupportButton = true
}) => {
  const [provider, setProvider] = useState('openrouter');
  const [baseUrl, setBaseUrl] = useState(PRESETS.openrouter.baseUrl);
  const [model, setModel] = useState(PRESETS.openrouter.model);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [defaultView, setDefaultView] = useState('sidepanel');
  const [uiSize, setUiSize] = useState('normal');

  // Auto-grouping settings
  const [autoGroupingEnabled, setAutoGroupingEnabled] = useState(true);
  const [autoGroupingMethod, setAutoGroupingMethod] = useState('domain');

  // Chat history settings
  const [chatRetentionHours, setChatRetentionHours] = useState(24);

  // Initial values for dirty tracking
  const [initialValues, setInitialValues] = useState({
    provider: 'openrouter',
    baseUrl: PRESETS.openrouter.baseUrl,
    model: PRESETS.openrouter.model,
    apiKey: '',
    autoGroupingEnabled: true,
    autoGroupingMethod: 'domain',
    chatRetentionHours: 24,
    defaultView: 'sidepanel',
    uiSize: 'normal'
  });

  // Determine which components to show
  const showLLMSettings = enabledComponents.includes(SETTING_COMPONENTS.LLM_API);
  const showAutoGrouping = enabledComponents.includes(SETTING_COMPONENTS.AUTO_GROUPING);
  const showChatHistory = enabledComponents.includes(SETTING_COMPONENTS.CHAT_HISTORY);
  const showUiPreferences = enabledComponents.includes(SETTING_COMPONENTS.UI_PREFERENCES);
  const showUiSizeOption = compact;

  // Load existing settings if editing
  useEffect(() => {
    const loadAllSettings = async () => {
      const newInitial = { ...initialValues };
      
      if (!isFirstSetup) {
        if (showLLMSettings) {
          const res = await chromeApi.getLLMConfig();
          if (res.config) {
            const p = res.config.provider || 'openrouter';
            setProvider(p);
            setBaseUrl(res.config.baseUrl);
            setModel(res.config.model);
            setApiKey(res.config.apiKey);
            
            newInitial.provider = p;
            newInitial.baseUrl = res.config.baseUrl;
            newInitial.model = res.config.model;
            newInitial.apiKey = res.config.apiKey;
          }
        }

        if (showAutoGrouping) {
          const result = await chrome.storage.local.get(['auto_grouping_settings']);
          const settings = result.auto_grouping_settings || {};
          setAutoGroupingEnabled(settings.enabled || false);
          setAutoGroupingMethod(settings.method || 'domain');
          
          newInitial.autoGroupingEnabled = settings.enabled || false;
          newInitial.autoGroupingMethod = settings.method || 'domain';
        }

        if (showChatHistory) {
          const result = await chrome.storage.local.get(['chat_history_settings']);
          const settings = result.chat_history_settings || {};
          setChatRetentionHours(settings.retentionHours || 24);
          
          newInitial.chatRetentionHours = settings.retentionHours || 24;
        }

        if (showUiPreferences) {
          const result = await chrome.storage.local.get(['ui_preferences']);
          const settings = result.ui_preferences || {};
          setDefaultView(settings.defaultView || 'sidepanel');
          setUiSize(settings.uiSize || 'normal');
          
          newInitial.defaultView = settings.defaultView || 'sidepanel';
          newInitial.uiSize = settings.uiSize || 'normal';
        }
        
        setInitialValues(newInitial);
      }
    };

    loadAllSettings();
  }, [isFirstSetup, showLLMSettings, showAutoGrouping, showChatHistory, showUiPreferences]);

  const isChanged = () => {
    if (showLLMSettings) {
      if (provider !== initialValues.provider) return true;
      if (baseUrl !== initialValues.baseUrl) return true;
      if (model !== initialValues.model) return true;
      if (apiKey !== initialValues.apiKey) return true;
    }
    if (showAutoGrouping) {
      if (autoGroupingEnabled !== initialValues.autoGroupingEnabled) return true;
      if (autoGroupingMethod !== initialValues.autoGroupingMethod) return true;
    }
    if (showChatHistory) {
      if (chatRetentionHours !== initialValues.chatRetentionHours) return true;
    }
    if (showUiPreferences) {
      if (defaultView !== initialValues.defaultView) return true;
      if (uiSize !== initialValues.uiSize) return true;
    }
    return false;
  };

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    if (newProvider !== 'custom') {
      setBaseUrl(PRESETS[newProvider].baseUrl);
      setModel(PRESETS[newProvider].model);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {

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

      if (showUiPreferences) {
        const uiPreferences = {
          defaultView,
          uiSize
        };
        await chrome.storage.local.set({ ui_preferences: uiPreferences });
        try {
          await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: defaultView === 'sidepanel' });
        } catch (error) {
          console.warn('Settings: Failed to update side panel behavior:', error);
        }
      }

      // Update initial values after saving
      setInitialValues({
        provider,
        baseUrl,
        model,
        apiKey,
        autoGroupingEnabled,
        autoGroupingMethod,
        chatRetentionHours,
        defaultView,
        uiSize
      });

      setLoading(false);
      onSaved();
    } catch (error) {
      console.error('Settings: Failed to save:', error);
      setLoading(false);
    }
  };

  const headerTitle = title || '⚙️ Settings';

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
              <option value="openrouter">OpenRouter</option>
              <option value="openrouter_free">OpenRouter (Free)</option>
              <option value="deepseek">DeepSeek</option>
              <option value="openai">OpenAI</option>
              <option value="custom">Custom (Any Compatible API)</option>
            </select>
          </div>

          {provider !== 'openrouter_free' && (
            <>
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
            </>
          )}

          <div className="form-group">
            <label>API Key</label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="settings-input"
            />
            {(provider === 'openrouter' || provider === 'openrouter_free') && (
              <p className="settings-hint">
                Get a free API key at <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai</a>
              </p>
            )}
          </div>

          {(provider === 'openrouter' || provider === 'openrouter_free') && (
            <div className="free-tier-notice">
              {compact ? (
                <>
                  <strong>Note:</strong> OpenRouter models or free models may have rate limits depending on your plan and the selected model.
                </>
              ) : (
                <>
                  ⚠️ <strong>Note:</strong> OpenRouter models may have rate limits depending on your plan and the selected model.
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

      {showUiPreferences && (
        <>
          <h3>🧭 Interface Settings</h3>

          <div className="form-group">
            <label>Default action on toolbar click</label>
            <select
              value={defaultView}
              onChange={(e) => setDefaultView(e.target.value)}
              className="settings-select"
            >
              <option value="sidepanel">Open Side Panel</option>
              <option value="popup">Open Popup</option>
            </select>
            <p className="settings-hint">
              This controls whether the extension button opens the side panel or the popup.
            </p>
          </div>

          {showUiSizeOption && (
            <div className="form-group">
              <label>Interface size</label>
              <select
                value={uiSize}
                onChange={(e) => setUiSize(e.target.value)}
                className="settings-select"
              >
                <option value="small">Small</option>
                <option value="normal">Normal</option>
                <option value="big">Big</option>
              </select>
              <p className="settings-hint">
                Adjust the overall size of text, buttons, and spacing in the side panel.
              </p>
            </div>
          )}
        </>
      )}


      {/* If no components are enabled, show a message */}
      {!showLLMSettings && !showAutoGrouping && !showUiPreferences && !showChatHistory && (
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
        {showSupportButton && (
          <Button
            variant="secondary"
            onClick={openPatreon}
            disabled={loading}
            className={compact ? 'sidebar-btn sidebar-btn--secondary' : ''}
          >
            Support
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleSave}
          loading={loading}
          disabled={loading || !isChanged()}
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
