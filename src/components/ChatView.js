import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chromeApi } from '../services/chromeApi';
import SettingsView, { COMPONENT_FILTERS } from './SettingsView';
import Button from './common/Button';
import '../popup/chat.css';

// Chat storage utilities
const CHAT_STORAGE_PREFIX = 'chat_';
const CHAT_STORAGE_VERSION = 1;

const getChatStorageKey = (tab, group) => {
  if (tab) return `${CHAT_STORAGE_PREFIX}tab_${tab.id}`;
  if (group) return `${CHAT_STORAGE_PREFIX}group_${group.id}`;
  return null;
};

const saveChatState = async (tab, group, state) => {
  const key = getChatStorageKey(tab, group);
  if (!key) return;

  const dataToSave = {
    ...state,
    timestamp: Date.now(),
    version: CHAT_STORAGE_VERSION
  };

  try {
    await chrome.storage.local.set({ [key]: dataToSave });
    console.log('ChatView: Saved chat state for', key, 'messages:', dataToSave.messages?.length || 0);
  } catch (error) {
    console.warn('Failed to save chat state:', error);
  }
};

const loadChatState = async (tab, group) => {
  const key = getChatStorageKey(tab, group);
  if (!key) return null;

  try {
    const result = await chrome.storage.local.get([key]);
    console.log('ChatView: Loaded chat state for', key, 'found:', !!result[key], 'messages:', result[key]?.messages?.length || 0);
    return result[key] || null;
  } catch (error) {
    console.warn('Failed to load chat state:', error);
    return null;
  }
};

const clearChatState = async (tab, group) => {
  const key = getChatStorageKey(tab, group);
  if (!key) return;

  try {
    await chrome.storage.local.remove([key]);
  } catch (error) {
    console.warn('Failed to clear chat state:', error);
  }
};

// Copy to clipboard function
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text to clipboard:', err);
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackErr) {
      console.error('Fallback copy method failed:', fallbackErr);
      document.body.removeChild(textArea);
      return false;
    }
  }
};

// Quick Action Chips data structure
const QUICK_CHIPS = [
  {
    id: 'summarize',
    emoji: '📝',
    label: 'Summarize',
    prompt: 'Provide a concise bullet-point summary of this content.'
  },
  {
    id: 'takeaways',
    emoji: '🔑',
    label: 'Key Takeaways',
    prompt: 'What are the most important takeaways?'
  },
  {
    id: 'issues',
    emoji: '🤔',
    label: 'Find Issues',
    prompt: 'Are there any contradictions or errors?'
  }
];

// Helper function to process citation text into clickable elements
// Converts patterns like [Source 1] or [Source 1: Tab Title] into clickable spans
function processCitationText(text, tabMetadata, onCitationClick) {
  // Regex to match [Source N] or [Source N: Title] patterns
  const citationRegex = /\[Source\s+(\d+)(?:[:\s]+([^\]]+))?\]/gi;
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = citationRegex.exec(text)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    const sourceNum = parseInt(match[1]);
    const customTitle = match[2] ? match[2].trim() : null;
    const tabInfo = tabMetadata[sourceNum - 1];
    const title = customTitle || (tabInfo ? tabInfo.title : `Source ${sourceNum}`);
    
    parts.push(
      <button
        key={`citation-${match.index}`}
        className="citation-link"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCitationClick(sourceNum);
        }}
        title={`Jump to: ${tabInfo?.title || `Source ${sourceNum}`}`}
      >
        <span className="citation-icon">🔗</span>
        <span className="citation-label">{title}</span>
      </button>
    );
    
    lastIndex = citationRegex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts;
}

// Component to render text with citation processing
function CitationText({ children, tabMetadata, onCitationClick }) {
  const text = children || '';
  const hasCitations = /\[Source\s+\d+\]/i.test(text);
  
  if (!hasCitations || !tabMetadata.length) {
    return <>{text}</>;
  }
  
  return <>{processCitationText(text, tabMetadata, onCitationClick)}</>;
}

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
  const [tabMetadata, setTabMetadata] = useState([]); // Store tab IDs for citations
  const [lastUserMessage, setLastUserMessage] = useState(null); // Store last user message for retry

  // UI State
  const [status, setStatus] = useState('initializing');
  
  const messagesEndRef = useRef(null);
  const aiResponseBufferRef = useRef('');
  const saveTimeoutRef = useRef(null);

  const targetTitle = tab ? tab.title : (group ? group.title : "Context");

  // Debounced save function
  const debouncedSave = useCallback((state) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveChatState(tab, group, state);
    }, 1000); // Save after 1 second of inactivity
  }, [tab, group]);

  useEffect(() => {
    checkConfig();
    loadSavedChatState();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Auto-save when messages or context change
  useEffect(() => {
    console.log('ChatView: Auto-save effect triggered, messages:', messages.length, 'context length:', context.length);
    if (messages.length > 0 || context) {
      console.log('ChatView: Triggering debounced save');
      debouncedSave({ messages, context, tabMetadata });
    }
  }, [messages, context, tabMetadata, debouncedSave]);

  const loadSavedChatState = async () => {
    console.log('ChatView: Loading saved chat state for tab/group:', tab?.id, group?.id);
    const savedState = await loadChatState(tab, group);
    if (savedState && savedState.version === CHAT_STORAGE_VERSION) {
      console.log('ChatView: Restoring saved state with', savedState.messages?.length || 0, 'messages');
      setMessages(savedState.messages || []);
      setContext(savedState.context || '');
      setTabMetadata(savedState.tabMetadata || []);
      // If we have saved messages, we're ready; otherwise extract content
      if (savedState.messages && savedState.messages.length > 0) {
        setStatus('ready');
        console.log('ChatView: Set status to ready with saved messages');
      } else {
        console.log('ChatView: No saved messages, will extract content');
      }
    } else {
      console.log('ChatView: No valid saved state found');
    }
  };

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
      setTabMetadata(response.tabs || []); // Store tab metadata for citations
      
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

  // Handle citation click - switch to the referenced tab
  const handleCitationClick = async (sourceNum) => {
    console.log('Citation clicked:', sourceNum, tabMetadata);
    const tabIndex = sourceNum - 1;
    if (tabMetadata[tabIndex]) {
      await chromeApi.switchToTab(tabMetadata[tabIndex].id);
    } else {
      console.warn('Tab metadata not found for source:', sourceNum);
    }
  };

  // Handle chip click - set input and auto-submit
  const handleChipClick = (chip) => {
    setInput(chip.prompt);
    setStatus('ready');
    // Auto-submit after setting input
    setTimeout(() => {
      const form = document.querySelector('.chat-input-form');
      if (form) form.requestSubmit();
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || status === 'thinking') return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setLastUserMessage(userMsg); // Store for retry
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
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `**Error:** ${errText}`,
          isError: true // Mark as error message for special rendering
        }]);
        setStatus('ready');
      }
    });
  };

  const handleRegenerate = async () => {
    if (!lastUserMessage || status === 'thinking') return;

    // Remove the error message from the end
    setMessages(prev => prev.filter((msg, index) => {
      // Remove the last assistant message if it's an error
      if (index === prev.length - 1 && msg.role === 'assistant' && msg.isError) {
        return false;
      }
      return true;
    }));

    setStatus('thinking');

    const recentHistory = messages.slice(-10);
    const apiMessages = [...recentHistory, lastUserMessage];

    // Start the stream again
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
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `**Error:** ${errText}`,
          isError: true
        }]);
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
            enabledComponents={COMPONENT_FILTERS.CHAT}
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

  // Check if we should show chips (for any chat context with content)
  const showChips = (tab || group) && context.length > 0;

  return (
    <div className="chat-view-container">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>←</button>
        {/* Display Tab Title OR Group Title */}
        <span className="chat-tab-title" title={targetTitle}>
          {group ? '📁 ' : ''}{targetTitle}
        </span>
        {messages.length > 0 && (
          <>
            <button
              className="clear-chat-btn"
              onClick={async () => {
                if (confirm('Clear this chat history? This cannot be undone.')) {
                  setMessages([]);
                  setContext('');
                  setTabMetadata([]);
                  setLastUserMessage(null);
                  await clearChatState(tab, group);
                  // Re-extract content for fresh start
                  if (status !== 'initializing') {
                    extractContent();
                  }
                }
              }}
              title="Clear chat history"
            >
              🗑️
            </button>
            <button
              className="export-chat-btn"
              onClick={() => {
                const transcript = messages.map(msg => {
                  const role = msg.role === 'user' ? 'You' : 'AI';
                  return `${role}: ${msg.content}`;
                }).join('\n\n');
                copyToClipboard(transcript);
              }}
              title="Export chat transcript"
            >
              📄
            </button>
          </>
        )}
        <button 
          className="settings-btn" 
          onClick={() => setShowSettings(true)}
          title="Configure AI Model"
        >
          ⚙️
        </button>
      </div>

      {/* Quick Action Chips - only shown for multi-tab groups */}
      {showChips && (
        <div className="quick-chips">
          {QUICK_CHIPS.map(chip => (
            <button 
              key={chip.id}
              className="chip-button"
              onClick={() => handleChipClick(chip)}
              disabled={status === 'thinking' || status === 'extracting'}
            >
              <span className="chip-emoji">{chip.emoji}</span>
              <span className="chip-label">{chip.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="chat-messages">
        {status === 'extracting' && (
          <div className="loading-state">
            <span className="btn-spinner" style={{display:'inline-block', marginRight:'8px'}}></span>
            Reading page content...
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            <div className="chat-bubble-content">
              {(() => {
                // Pre-process markdown to convert [Source N] to markdown links
                const processedContent = m.content.replace(
                  /\[Source\s+(\d+)(?:[:\s]+([^\]]+))?\]/gi,
                  (match, num, title) => {
                    const sourceNum = parseInt(num);
                    const tabInfo = tabMetadata[sourceNum - 1];
                    const linkTitle = title || (tabInfo ? tabInfo.title : `Source ${sourceNum}`);
                    return `[🔗 ${linkTitle}](/citation-${sourceNum})`;
                  }
                );
                
                return (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({node, href, children}) => {
                        // Check if this is a citation link
                        const citationMatch = href?.match(/\/citation-(\d+)/);
                        if (citationMatch) {
                          const sourceNum = parseInt(citationMatch[1]);
                          const tabInfo = tabMetadata[sourceNum - 1];
                          return (
                            <button
                              className="citation-link"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCitationClick(sourceNum);
                              }}
                              title={`Jump to: ${tabInfo?.title || `Source ${sourceNum}`}`}
                            >
                              {children}
                            </button>
                          );
                        }
                        return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                      }
                    }}
                  >
                    {processedContent}
                  </ReactMarkdown>
                );
              })()}
            </div>
            {m.role === 'assistant' && (
              <div className="message-actions">
                {m.isError && lastUserMessage && (
                  <button
                    className="regenerate-btn"
                    onClick={handleRegenerate}
                    title="Regenerate response"
                    disabled={status === 'thinking'}
                  >
                    🔄
                  </button>
                )}
                <button
                  className="copy-message-btn"
                  onClick={() => copyToClipboard(m.content)}
                  title="Copy message"
                >
                  📋
                </button>
              </div>
            )}
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
          placeholder={status === 'error' && !context ? "Refresh tab to try again" : "Ask a question..."}
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
