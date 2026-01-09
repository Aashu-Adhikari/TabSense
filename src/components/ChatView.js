import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chromeApi } from '../services/chromeApi';
import SettingsView from './SettingsView';
import Button from './common/Button';

const ChatView = ({ tab, onBack }) => {
  const [hasConfig, setHasConfig] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [isFreeTier, setIsFreeTier] = useState(false);
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  const [status, setStatus] = useState('initializing');
  
  const messagesEndRef = useRef(null);
  
  // Ref to hold the growing response
  const aiResponseBufferRef = useRef('');
  // Ref to hold the disconnect function
  const disconnectStreamRef = useRef(null);

  useEffect(() => {
    checkConfig();
    // Cleanup on unmount: disconnect any active stream
    return () => {
      if (disconnectStreamRef.current) {
        disconnectStreamRef.current();
      }
    };
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
      if (!context && status === 'initializing') extractContent();
    } else {
      setHasConfig(false);
      setCheckingConfig(false);
    }
  };

  const extractContent = async () => {
    setStatus('extracting');
    const response = await chromeApi.extractTabContent(tab.id);
    if (response.success && response.content) {
      setContext(response.content);
      setMessages([{ role: 'assistant', content: `I've read **${tab.title}**. What would you like to know?` }]);
      setStatus('ready');
    } else {
      setStatus('error');
      setMessages([{ role: 'assistant', content: `**Error:** ${response.error || 'Empty page'}` }]);
    }
  };

 const handleSendMessage = (e) => {
    e.preventDefault();
    // Prevent sending if empty or if already busy (thinking OR streaming)
    if (!input.trim() || status === 'thinking' || status === 'streaming') return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStatus('thinking'); // Shows the "Thinking..." bubble

    const recentHistory = messages.slice(-10);
    const apiMessages = [...recentHistory, userMsg];

    aiResponseBufferRef.current = ''; 
    
    const disconnect = chromeApi.connectChatStream(apiMessages, context, {
      onChunk: (text) => {
        aiResponseBufferRef.current += text;
        
        // CRITICAL FIX: Hide "Thinking..." immediately on first chunk
        setStatus(currentStatus => {
          if (currentStatus === 'thinking') return 'streaming';
          return currentStatus;
        });

        setMessages(prev => {
          const newMessages = [...prev];
          // If the last message is the AI's, update it. Otherwise, create it.
          if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
            newMessages[newMessages.length - 1].content = aiResponseBufferRef.current;
          } else {
            newMessages.push({ role: 'assistant', content: aiResponseBufferRef.current });
          }
          return [...newMessages];
        });
      },
      onEnd: () => {
        setStatus('ready'); // Re-enable input
      },
      onError: (errText) => {
        setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${errText}` }]);
        setStatus('ready');
      }
    });
    
    disconnectStreamRef.current = disconnect;
  };
  // --- RENDER ---
  if (checkingConfig) return <div className="loading-state">Checking AI settings...</div>;

  if (!hasConfig || showSettings) {
    return (
      <div className="chat-view-container">
        <div className="chat-header">
          <button className="back-btn" onClick={() => hasConfig ? setShowSettings(false) : onBack()}>←</button>
          <span>{hasConfig ? 'AI Settings' : 'Setup AI Chat'}</span>
        </div>
        <div className="chat-body-centered">
          <SettingsView 
            isFirstSetup={!hasConfig}
            onSaved={() => { setShowSettings(false); checkConfig(); }}
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
        <span className="chat-tab-title" title={tab.title}>{tab.title}</span>
        <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙️</button>
      </div>

      <div className="chat-messages">
        {status === 'extracting' && <div className="loading-state">Reading content...</div>}
        
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{ a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}
            >
              {m.content}
            </ReactMarkdown>
          </div>
        ))}

        {status === 'thinking' && <div className="chat-bubble assistant thinking">Thinking...</div>}
        <div ref={messagesEndRef} />
      </div>

      {isFreeTier && <div className="status-bar-notice">⚡ Using Free Model</div>}

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          disabled={status !== 'ready'} 
          placeholder="Ask a question..."
          autoFocus 
        />
        <button type="submit" disabled={status !== 'ready' || !input.trim()}>Send</button>
      </form>
    </div>
  );
};

export default ChatView;