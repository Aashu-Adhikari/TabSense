import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chromeApi } from '../services/chromeApi';
import SettingsView, { COMPONENT_FILTERS } from './SettingsView';
import Button from './common/Button';
import '../popup/chat.css';
import {
  IconArrowLeft,
  IconCopy,
  IconFile,
  IconRefresh,
  IconSettings,
  IconTrash,
  IconStop,
  IconSend
} from './common/Icons';

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
  } catch (error) {
    console.warn('Failed to save chat state:', error);
  }
};

const loadChatState = async (tab, group) => {
  const key = getChatStorageKey(tab, group);
  if (!key) return null;

  try {
    const result = await chrome.storage.local.get([key]);
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



const ChatView = ({ tab, group, onBack, isSidebar = false, onRefresh }) => {
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
  const [pendingGroupRefresh, setPendingGroupRefresh] = useState(false);

  // UI State
  const [status, setStatus] = useState('initializing');

  const messagesEndRef = useRef(null);
  const aiResponseBufferRef = useRef('');
  const saveTimeoutRef = useRef(null);
  const groupTabIdsRef = useRef(null);
  const textareaRef = useRef(null);
  const stopStreamRef = useRef(null);

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
    const initializeChat = async () => {
      const hasSavedMessages = await loadSavedChatState();
      await checkConfig(hasSavedMessages);
    };
    initializeChat();
  }, []);

  useEffect(() => {
    if (!group) return;

    const normalizeIds = (ids = []) => {
      const seen = new Set();
      const result = [];
      ids.forEach((id) => {
        if (typeof id !== 'number' || seen.has(id)) return;
        seen.add(id);
        result.push(id);
      });
      return result.sort((a, b) => a - b);
    };

    const areSameIds = (prevIds, nextIds) => {
      if (!prevIds || !nextIds) return false;
      if (prevIds.length !== nextIds.length) return false;
      for (let i = 0; i < prevIds.length; i += 1) {
        if (prevIds[i] !== nextIds[i]) return false;
      }
      return true;
    };

    const handleGroupTabIds = (nextIds) => {
      const normalized = normalizeIds(nextIds);
      const previous = groupTabIdsRef.current;
      groupTabIdsRef.current = normalized;

      if (!previous) return;
      if (areSameIds(previous, normalized)) return;

      if (status === 'thinking' || status === 'extracting') {
        setPendingGroupRefresh(true);
      } else {
        refreshGroupContext();
      }
    };

    const handleStorageChange = (changes, areaName) => {
      if (areaName !== 'local' || !changes.cachedGroups) return;
      const cachedGroups = changes.cachedGroups.newValue || [];
      const updatedGroup = cachedGroups.find((entry) => entry.id === group.id);
      if (updatedGroup?.tabs) {
        handleGroupTabIds(updatedGroup.tabs.map((tab) => tab.id));
      }
    };

    chrome.storage.local.get(['cachedGroups'], (result) => {
      const cachedGroups = result.cachedGroups || [];
      const cachedGroup = cachedGroups.find((entry) => entry.id === group.id);
      if (cachedGroup?.tabs) {
        handleGroupTabIds(cachedGroup.tabs.map((tab) => tab.id));
      }
    });

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [group, status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Auto-save when messages or context change
  useEffect(() => {
    if (messages.length > 0 || context) {
      if (messages.length <= 1) {
        return;
      }
      debouncedSave({ messages, context, tabMetadata });
    }
  }, [messages, context, tabMetadata, debouncedSave]);

  const loadSavedChatState = async () => {
    console.log('loadSavedChatState: starting for tab/group:', tab?.id, group?.id);
    const savedState = await loadChatState(tab, group);
    console.log('loadSavedChatState: loaded state:', savedState ? 'found' : 'null');
    if (savedState && savedState.version === CHAT_STORAGE_VERSION) {
      console.log('loadSavedChatState: setting messages, count:', savedState.messages?.length || 0);
      setMessages(savedState.messages || []);
      setContext(savedState.context || '');
      setTabMetadata(savedState.tabMetadata || []);
      // If we have saved messages, we're ready; otherwise extract content
      if (savedState.messages && savedState.messages.length > 0) {
        console.log('loadSavedChatState: setting status to ready');
        setStatus('ready');
        return true; // Has saved messages
      }
    } else {
      console.log('loadSavedChatState: no valid saved state');
    }
    return false; // No saved messages
  };

  const checkConfig = async (hasSavedMessages = false) => {
    console.log('checkConfig: hasSavedMessages =', hasSavedMessages, 'messages.length =', messages.length, 'status =', status);
    const response = await chromeApi.getLLMConfig();
    if (response.config && response.config.apiKey) {
      setHasConfig(true);
      setIsFreeTier(response.config.model?.includes(':free'));
      setCheckingConfig(false);
      // Only extract content if we don't have saved messages
      console.log('checkConfig: checking if should extract content, hasSavedMessages =', hasSavedMessages);
      if (!hasSavedMessages) {
        console.log('checkConfig: extracting content');
        extractContent();
      } else {
        console.log('checkConfig: skipping content extraction, have saved messages');
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

      let introMsg = '';
      if (tab) {
        introMsg = `I've read **${targetTitle}**. What would you like to know?`;
      } else {
        const titleList = response.tabs ? response.tabs.map(t => `- ${t.title}`).join('\n') : '';
        introMsg = `I've read **${response.count} tabs** in **${targetTitle}**:\n\n${titleList}\n\nAsk me about them!`;
      }

      setMessages([{ role: 'assistant', content: introMsg }]);
      setStatus('ready');
    } else {
      setStatus('error');
      setMessages([{ role: 'assistant', content: `**Error:** ${response.error || 'No readable content found.'}` }]);
    }
  };

  const refreshGroupContext = async () => {
    if (!group) return;
    setStatus('extracting');

    const response = await chromeApi.extractGroupContent(group.id);

    if (response.success && response.content) {
      setContext(response.content);
      setTabMetadata(response.tabs || []);
      setMessages((prev) => {
        if (prev.length === 0) {
          return prev;
        }
        return [...prev, {
          role: 'assistant',
          content: `Context updated with **${response.count} tabs** from **${targetTitle}**.`
        }];
      });
      setStatus('ready');
    } else {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `**Context update failed:** ${response.error || 'No readable content found.'}`,
        isError: true
      }]);
      setStatus('ready');
    }
  };

  useEffect(() => {
    if (!group || !pendingGroupRefresh) return;
    if (status === 'thinking' || status === 'extracting') return;
    setPendingGroupRefresh(false);
    refreshGroupContext();
  }, [group, pendingGroupRefresh, status]);

  // Handle citation click - switch to the referenced tab
  // For new format: handleCitationClick(title, quote)
  // For old format: handleCitationClick(sourceNum) where sourceNum is a number
  const handleCitationClick = async (arg1, arg2) => {
    // Check if this is new format (title, quote) or old format (sourceNum)
    if (typeof arg1 === 'number') {
      // Old format: sourceNum
      const sourceNum = arg1;
      console.log('Citation clicked (old format):', sourceNum, tabMetadata);
      const tabIndex = sourceNum - 1;
      if (tabMetadata[tabIndex]) {
        await chromeApi.switchToTab(tabMetadata[tabIndex].id);
      } else {
        console.warn('Tab metadata not found for source:', sourceNum);
      }
    } else {
      // New format: (title, quote)
      const title = arg1;
      const quote = arg2;
      console.log('Citation clicked (new format):', title, quote);

      // Find the tab with matching title
      const matchingTab = tabMetadata.find(tab =>
        tab.title.toLowerCase().includes(title.toLowerCase()) ||
        title.toLowerCase().includes(tab.title.toLowerCase())
      );

      if (matchingTab) {
        await chromeApi.activateTab(matchingTab.id, quote);
      } else {
        console.warn('Tab not found for title:', title);
      }
    }
  };

  const inputFormRef = useRef(null);

  // Handle chip click - set input and auto-submit
  const handleChipClick = (chip) => {
    setInput(chip.prompt);
    setStatus('ready');
    // Auto-submit after setting input
    setTimeout(() => {
      inputFormRef.current?.requestSubmit();
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
    const stopStream = chromeApi.connectChatStream(apiMessages, context, {
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
        stopStreamRef.current = null;
      },
      onError: (errText) => {
        console.error("Stream error:", errText);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `**Error:** ${errText}`,
          isError: true // Mark as error message for special rendering
        }]);
        setStatus('ready');
        stopStreamRef.current = null;
      }
    });

    stopStreamRef.current = stopStream;
  };

  const handleStopGeneration = () => {
    if (stopStreamRef.current) {
      stopStreamRef.current();
      stopStreamRef.current = null;
      setStatus('ready');
    }
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

  const handleResendLastUserMessage = () => {
    if (status === 'thinking') return;
    if (lastUserMessageIndex < 0) return;
    const lastUser = messages[lastUserMessageIndex];
    if (!lastUser?.content) return;
    setMessages(prev => prev.slice(0, lastUserMessageIndex));
    setInput(lastUser.content);
    setStatus('ready');
    setTimeout(() => {
      const formSelector = isSidebar ? '.sidebar-chat-input-form' : '.chat-input-form';
      const form = document.querySelector(formSelector);
      if (form) form.requestSubmit();
    }, 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = isSidebar ? 80 : 120;
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
    }
  }, [input, isSidebar]);

  // --- RENDER HELPERS ---

  if (checkingConfig) {
    return <div className="loading-state">Checking AI settings...</div>;
  }

  if (!hasConfig || showSettings) {
    const containerClass = isSidebar ? 'sidebar-chat-view-container' : 'chat-view-container';
    const headerClass = isSidebar ? 'sidebar-chat-header' : 'chat-header';
    const backBtnClass = isSidebar ? 'sidebar-back-btn' : 'back-btn';
    const bodyClass = isSidebar ? 'sidebar-chat-body-centered' : 'chat-body-centered';

    return (
      <div className={containerClass}>
        <div className={headerClass}>
          <button
            className={backBtnClass}
            onClick={() => hasConfig ? setShowSettings(false) : onBack()}
            aria-label="Back"
          >
            {isSidebar ? <IconArrowLeft className="sidebar-icon sidebar-icon--small" /> : '←'}
          </button>
          <span>{hasConfig ? 'AI Settings' : 'Setup AI Chat'}</span>
        </div>
        <div className={bodyClass}>
          <SettingsView
            isFirstSetup={!hasConfig}
            enabledComponents={COMPONENT_FILTERS.CHAT}
            compact={isSidebar}
            showSupportButton={false}
            onSaved={() => {
              setShowSettings(false);
              const hasExistingConversation = messages.length > 0 || context.length > 0;
              checkConfig(hasExistingConversation);
            }}
            onCancel={hasConfig ? () => setShowSettings(false) : null}
          />
        </div>
      </div>
    );
  }

  // Check if we should show chips (for any chat context with content)
  const showChips = (tab || group) && context.length > 0;
  const lastUserMessageIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === 'user') return i;
    }
    return -1;
  })();

  const containerClass = isSidebar ? 'sidebar-chat-view-container' : 'chat-view-container';
  const headerClass = isSidebar ? 'sidebar-chat-header' : 'chat-header';
  const backBtnClass = isSidebar ? 'sidebar-back-btn' : 'back-btn';
  const tabTitleClass = isSidebar ? 'sidebar-chat-tab-title' : 'chat-tab-title';
  const clearBtnClass = isSidebar ? 'sidebar-clear-chat-btn' : 'clear-chat-btn';
  const exportBtnClass = isSidebar ? 'sidebar-export-chat-btn' : 'export-chat-btn';
  const settingsBtnClass = isSidebar ? 'sidebar-settings-btn' : 'settings-btn';
  const refreshBtnClass = isSidebar ? 'sidebar-refresh-chat-btn' : 'refresh-chat-btn';
  const quickChipsClass = isSidebar ? 'sidebar-quick-chips' : 'quick-chips';
  const chipBtnClass = isSidebar ? 'sidebar-chip-button' : 'chip-button';
  const chipEmojiClass = isSidebar ? 'sidebar-chip-emoji' : 'chip-emoji';
  const chipLabelClass = isSidebar ? 'sidebar-chip-label' : 'chip-label';
  const messagesClass = isSidebar ? 'sidebar-chat-messages' : 'chat-messages';
  const bubbleClass = isSidebar ? 'sidebar-chat-bubble' : 'chat-bubble';
  const bubbleContentClass = isSidebar ? 'sidebar-chat-bubble-content' : 'chat-bubble-content';
  const citationLinkClass = isSidebar ? 'sidebar-citation-link' : 'citation-link';
  const messageActionsClass = isSidebar ? 'sidebar-message-actions' : 'message-actions';
  const regenerateBtnClass = isSidebar ? 'sidebar-regenerate-btn' : 'regenerate-btn';
  const copyBtnClass = isSidebar ? 'sidebar-copy-message-btn' : 'copy-message-btn';
  const statusNoticeClass = isSidebar ? 'sidebar-status-bar-notice' : 'status-bar-notice';
  const inputFormClass = isSidebar ? 'sidebar-chat-input-form' : 'chat-input-form';

  return (
    <div className={containerClass}>
      <div className={headerClass}>
        <button className={backBtnClass} onClick={onBack} aria-label="Back">
          {isSidebar ? (
            <IconArrowLeft className="sidebar-icon sidebar-icon--small" />
          ) : (
            <IconArrowLeft className="chat-icon" />
          )}
        </button>
        {/* Display Tab Title OR Group Title */}
        <span className={tabTitleClass} title={targetTitle}>
          {group && !isSidebar ? '📁 ' : ''}{targetTitle}
        </span>
        {isSidebar && onRefresh && (
          <button
            className={refreshBtnClass}
            onClick={onRefresh}
            title="Refresh current tab chat"
            aria-label="Refresh current tab chat"
          >
            <IconRefresh className="sidebar-icon sidebar-icon--small" />
          </button>
        )}
        {messages.length > 0 && (
          <>
            <button
              className={clearBtnClass}
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
              {isSidebar ? (
                <IconTrash className="sidebar-icon sidebar-icon--small" />
              ) : (
                <IconTrash className="chat-icon" />
              )}
            </button>
            <button
              className={exportBtnClass}
              onClick={() => {
                const transcript = messages.map(msg => {
                  const role = msg.role === 'user' ? 'You' : 'AI';
                  return `${role}: ${msg.content}`;
                }).join('\n\n');
                copyToClipboard(transcript);
              }}
              title="Export chat transcript"
            >
              {isSidebar ? (
                <IconFile className="sidebar-icon sidebar-icon--small" />
              ) : (
                <IconFile className="chat-icon" />
              )}
            </button>
          </>
        )}
        <button
          className={settingsBtnClass}
          onClick={() => setShowSettings(true)}
          title="Configure AI Model"
        >
          {isSidebar ? (
            <IconSettings className="sidebar-icon sidebar-icon--small" />
          ) : (
            <IconSettings className="chat-icon" />
          )}
        </button>
      </div>

      {/* Quick Action Chips - only shown for multi-tab groups */}
      {showChips && (
        <div className={quickChipsClass}>
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip.id}
              className={chipBtnClass}
              onClick={() => handleChipClick(chip)}
              disabled={status === 'thinking' || status === 'extracting'}
            >
              {!isSidebar && <span className={chipEmojiClass}>{chip.emoji}</span>}
              <span className={chipLabelClass}>{chip.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className={messagesClass}>
        {status === 'extracting' && (
          <div className="loading-state">
            <span className="btn-spinner" style={{ display: 'inline-block', marginRight: '8px' }}></span>
            Reading page content...
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`${bubbleClass} ${m.role}`}>
            <div className={bubbleContentClass}>
              {(() => {
                // Pre-process markdown to convert [Source N] to markdown links
                const processedContent = m.content
                  .replace(
                    /\[Sources?\s+([^\]]+)\]/gi,
                    (match, list) => {
                      const parts = list.split(',').map(part => part.trim()).filter(Boolean);
                      return parts.map(part => `[Source ${part}]`).join(' ');
                    }
                  )
                  // Process new format: [[Source: Title | "snippet"]] or [Source: Title | "snippet"]
                  .replace(
                    /\[{1,2}Source:\s*(.+?)\s*\|\s*"(.*?)"\]{1,2}/gi,
                    (match, title, snippet) => {
                      const trimmedTitle = title.trim();
                      // Find the index in tabMetadata to restore numbered citations
                      const index = tabMetadata.findIndex(tab =>
                        tab.title.toLowerCase().includes(trimmedTitle.toLowerCase()) ||
                        trimmedTitle.toLowerCase().includes(tab.title.toLowerCase())
                      );

                      const sourceNum = index !== -1 ? index + 1 : '?';

                      // Encode both title and snippet in URL parameters
                      const params = new URLSearchParams({
                        title: trimmedTitle,
                        quote: snippet
                      });
                      return `[${sourceNum}](/citation-new?${params.toString()})`;
                    }
                  )
                  // Process old format: [Source N] or [Source N: Title]
                  .replace(
                    /\[Source\s+(\d+)(?:[:\s]+([^\]]+))?\]/gi,
                    (match, num, title) => {
                      const sourceNum = parseInt(num);
                      const tabInfo = tabMetadata[sourceNum - 1];
                      const linkTitle = title || (tabInfo ? tabInfo.title : `Source ${sourceNum}`);
                      const prefix = isSidebar ? 'Source' : '🔗';
                      return `[${prefix} ${linkTitle}](/citation-${sourceNum})`;
                    }
                  );

                return (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, href, children, ...props }) => {
                        // Check if this is a citation link
                        const citationMatch = href?.match(/\/citation-(\d+)/);
                        const isNewCitation = href?.startsWith('/citation-new');

                        if (citationMatch) {
                          // Old format: /citation-N
                          const sourceNum = parseInt(citationMatch[1]);
                          const tabInfo = tabMetadata[sourceNum - 1];
                          return (
                            <button
                              className={citationLinkClass}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCitationClick(sourceNum);
                              }}
                              title={tabInfo?.title || `Source ${sourceNum}`}
                              aria-label={tabInfo?.title || `Source ${sourceNum}`}
                            >
                              <span className="citation-index">{sourceNum}</span>
                            </button>
                          );
                        }

                        if (isNewCitation) {
                          // New format: /citation-new?title=...&quote=...
                          try {
                            const url = new URL(href, 'http://dummy.com'); // Base needed for relative URLs
                            const title = url.searchParams.get('title');
                            const quote = url.searchParams.get('quote');

                            return (
                              <button
                                className={citationLinkClass}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCitationClick(title, quote);
                                }}
                                title={title}
                                aria-label={title}
                              >
                                <span className="citation-index">{children}</span>
                              </button>
                            );
                          } catch (e) {
                            console.error('Failed to parse citation URL:', href);
                            return <span>{children}</span>;
                          }
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
              <div className={messageActionsClass}>
                {m.isError && lastUserMessage && (
                  <button
                    className={regenerateBtnClass}
                    onClick={handleRegenerate}
                    title="Regenerate response"
                    disabled={status === 'thinking'}
                  >
                    {isSidebar ? (
                      <IconRefresh className="sidebar-icon sidebar-icon--small" />
                    ) : (
                      <IconRefresh className="chat-icon" />
                    )}
                  </button>
                )}
                <button
                  className={copyBtnClass}
                  onClick={() => copyToClipboard(m.content)}
                  title="Copy message"
                >
                  {isSidebar ? (
                    <IconCopy className="sidebar-icon sidebar-icon--small" />
                  ) : (
                    <IconCopy className="chat-icon" />
                  )}
                </button>
              </div>
            )}
            {m.role === 'user' && i === lastUserMessageIndex && (
              <div className={messageActionsClass}>
                <button
                  className={regenerateBtnClass}
                  onClick={handleResendLastUserMessage}
                  title="Resend message"
                  disabled={status === 'thinking'}
                >
                  {isSidebar ? (
                    <IconRefresh className="sidebar-icon sidebar-icon--small" />
                  ) : (
                    <IconRefresh className="chat-icon" />
                  )}
                </button>
              </div>
            )}
          </div>
        ))}

        {status === 'thinking' && (
          <div className={`${bubbleClass} assistant thinking`}>
            Thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {isFreeTier && (
        <div className={statusNoticeClass}>
          ⚡ Using Free Model (Latency may occur)
        </div>
      )}

      <form ref={inputFormRef} className={inputFormClass} onSubmit={handleSendMessage}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={status === 'error' && !context ? "Refresh tab to try again" : "Ask a question..."}
          disabled={status === 'thinking' || status === 'extracting'}
          rows={1}
          autoFocus
        />
        <button
          type="button"
          className="stop-btn"
          onClick={handleStopGeneration}
          disabled={status !== 'thinking'}
          title="Stop generation"
          style={{ display: status === 'thinking' ? 'flex' : 'none' }}
        >
          <IconStop className="chat-icon" />
        </button>
        <button
          type="submit"
          disabled={status === 'thinking' || status === 'extracting' || !input.trim()}
          title="Send message"
          style={{ display: status === 'thinking' ? 'none' : 'flex' }}
        >
          <IconSend className="chat-icon" />
        </button>
      </form>
    </div>
  );
};

export default ChatView;
