import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chromeApi } from '../services/chromeApi';
import SettingsView from './SettingsView';
import Button from './common/Button';

const ChatView = ({ tab, onBack }) => {
  // Configuration State
  const [hasConfig, setHasConfig] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [isFreeTier, setIsFreeTier] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  
  // UI State: 'initializing', 'extracting', 'ready', 'thinking', 'error'
  const [status, setStatus] = useState('initializing');
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef(null);

  // 1. On Mount: Check if LLM Config exists
  useEffect(() => {
    checkConfig();
  }, []);

  // 2. Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const checkConfig = async () => {
    const response = await chromeApi.getLLMConfig();
    
    if (response.config && response.config.apiKey) {
      setHasConfig(true);
      // Check if using the free tier model (simple heuristic based on model name)
      setIsFreeTier(response.config.model?.includes(':free'));
      setCheckingConfig(false);
      
      // If we haven't extracted content yet, do it now
      if (!context && status === 'initializing') {
        extractContent();
      }
    } else {
      setHasConfig(false);
      setCheckingConfig(false);
    }
  };

  const extractContent = async () => {
    setStatus('extracting');
    console.log("ChatView: Requesting content extraction for tab", tab.id);
    
    const response = await chromeApi.extractTabContent(tab.id);
    
    if (response.success && response.content) {
      setContext(response.content);
      
      // Add initial greeting
      setMessages([{ 
        role: 'assistant', 
        content: `I've read **${tab.title}**. What would you like to know?` 
      }]);
      setStatus('ready');
    } else {
      console.error("ChatView: Extraction failed.", response.error);
      setStatus('error');
      setMessages([{ 
        role: 'assistant', 
        content: `**Error:** I couldn't read the content of this page.\n\nReason: *${response.error || 'Empty page'}*.\n\nPlease try refreshing the tab.` 
      }]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || status === 'thinking') return;

    // 1. Add User Message
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStatus('thinking');

    // 2. Prepare Context (Last 10 messages + new message)
    const recentHistory = messages.slice(-10);
    const apiMessages = [...recentHistory, userMsg];

    // 3. Send to API
    const response = await chromeApi.sendChatMessage(apiMessages, context);

    // 4. Handle Response
    if (response.success) {
      setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: `**API Error:** ${response.error}` }]);
    }
    setStatus('ready');
  };

  // --- RENDER HELPERS ---

  if (checkingConfig) {
    return <div className="loading-state">Checking AI settings...</div>;
  }

  // View 1: Settings / Setup Screen
  // Shown if no config exists OR if user clicked the settings gear
  if (!hasConfig || showSettings) {
    return (
      <div className="chat-view-container">
        <div className="chat-header">
          {/* Back button logic: If we have config, go back to chat. If not, go back to main menu. */}
          <button 
            className="back-btn" 
            onClick={() => hasConfig ? setShowSettings(false) : onBack()}
          >
            ←
          </button>
          <span>{hasConfig ? 'AI Settings' : 'Setup AI Chat'}</span>
        </div>
        <div className="chat-body-centered">
          <SettingsView 
            isFirstSetup={!hasConfig}
            onSaved={() => {
              setShowSettings(false);
              checkConfig(); // Reload config to update free tier status/key
            }}
            onCancel={hasConfig ? () => setShowSettings(false) : null}
          />
        </div>
      </div>
    );
  }

  // View 2: Main Chat Interface
  return (
    <div className="chat-view-container">
      {/* Header */}
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <span className="chat-tab-title" title={tab.title}>{tab.title}</span>
        
        {/* Settings Button */}
        <button 
          className="settings-btn" 
          onClick={() => setShowSettings(true)}
          title="Configure AI Model"
        >
          ⚙️
        </button>
      </div>

      {/* Message List */}
      <div className="chat-messages">
        {status === 'extracting' && (
          <div className="loading-state">
            <span className="btn-spinner" style={{display:'inline-block', marginRight:'8px'}}></span>
            Reading page content...
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Ensure links open in a new tab
                a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
              }}
            >
              {m.content}
            </ReactMarkdown>
          </div>
        ))}

        {status === 'thinking' && (
          <div className="chat-bubble assistant thinking">
            Thinking...
          </div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Free Tier Notice */}
      {isFreeTier && (
        <div className="status-bar-notice">
          ⚡ Using Free Model (Latency may occur)
        </div>
      )}

      {/* Input Area */}
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder={status === 'error' ? "Refresh tab to try again" : "Ask a question..."}
          disabled={status !== 'ready'}
          autoFocus
        />
        <button type="submit" disabled={status !== 'ready' || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatView;