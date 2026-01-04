import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chromeApi } from '../services/chromeApi';
import SettingsView from './SettingsView';
import Button from './common/Button';

const ChatView = ({ tab, group, onBack }) => {
  // Configuration State
  const [hasConfig, setHasConfig] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [isFreeTier, setIsFreeTier] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  
  // UI State
  const [status, setStatus] = useState('initializing');
  
  const messagesEndRef = useRef(null);
  const aiResponseBufferRef = useRef('');

  const targetTitle = tab ? tab.title : (group ? group.title : "Context");

  useEffect(() => {
    checkConfig();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const checkConfig = async () => {
    const response = await chromeApi.getLLMConfig();
    if (response.config && response.config.apiKey) {
      setHasConfig(true);
      setIsFreeTier(response.config.model?.includes(':free'));
      setCheckingConfig(false);
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
    
    let response;
    
    // LOGIC FORK: TAB vs GROUP
    if (tab) {
      console.log("ChatView: Extracting Tab", tab.id);
      response = await chromeApi.extractTabContent(tab.id);
    } else if (group) {
      console.log("ChatView: Extracting Group", group.id);
      response = await chromeApi.extractGroupContent(group.id);
    }

    if (response.success && response.content) {
      setContext(response.content);
      
      const introMsg = tab 
        ? `I've read **${targetTitle}**. What would you like to know?`
        : `I've read **${response.count} tabs** in **${targetTitle}**. Ask me about them!`;

      setMessages([{ role: 'assistant', content: introMsg }]);
      setStatus('ready');
    } else {
      setStatus('error');
      setMessages([{ role: 'assistant', content: `**Error:** ${response.error || 'No readable content found.'}` }]);
    }
  };



  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || status === 'thinking') return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStatus('thinking');

    const recentHistory = messages.slice(-10);
    const apiMessages = [...recentHistory, userMsg];

    // --- NEW CONNECTION LOGIC ---
    aiResponseBufferRef.current = ''; 
    
    // Start the stream
    chromeApi.connectChatStream(apiMessages, context, {
      onChunk: (text) => {
        aiResponseBufferRef.current += text;
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
            newMessages[newMessages.length - 1].content = aiResponseBufferRef.current;
          } else {
            newMessages.push({ role: 'assistant', content: aiResponseBufferRef.current });
          }
          return [...newMessages];
        });
      },
      onEnd: () => {
        console.log("Stream finished successfully");
        setStatus('ready');
      },
      onError: (errText) => {
        console.error("Stream error:", errText);
        setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${errText}` }]);
        setStatus('ready');
      }
    });
  };

  // --- RENDER HELPERS ---

  if (checkingConfig) {
    return <div className="loading-state">Checking AI settings...</div>;
  }

  if (!hasConfig || showSettings) {
    return (
      <div className="chat-view-container">
        <div className="chat-header">
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
              checkConfig(); 
            }}
            onCancel={hasConfig ? () => setShowSettings(false) : null}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="chat-view-container">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>←</button>
        {/* Display Tab Title OR Group Title */}
        <span className="chat-tab-title" title={targetTitle}>
          {group ? '📁 ' : ''}{targetTitle}
        </span>
        <button 
          className="settings-btn" 
          onClick={() => setShowSettings(true)}
          title="Configure AI Model"
        >
          ⚙️
        </button>
      </div>

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
        
        <div ref={messagesEndRef} />
      </div>

      {isFreeTier && (
        <div className="status-bar-notice">
          ⚡ Using Free Model (Latency may occur)
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          // FIX: Show "Ask a question..." even after error, unless extraction failed
          placeholder={status === 'error' && !context ? "Refresh tab to try again" : "Ask a question..."}
          // FIX: Only disable if status is 'thinking' or 'extracting'. 'ready' and 'error' (API error) allow typing.
          disabled={status === 'thinking' || status === 'extracting'}
          autoFocus
        />
        <button type="submit" disabled={status === 'thinking' || status === 'extracting' || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatView;