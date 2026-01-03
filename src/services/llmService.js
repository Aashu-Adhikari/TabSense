// src/services/llmService.js

export const DEFAULT_FREE_CONFIG = {
  provider: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: '', // User must still provide this
  model: 'google/gemini-2.0-flash-exp:free'
};

class LLMService {
  async getConfig() {
    const result = await chrome.storage.local.get(['llm_settings']);
    // Merge with defaults to ensure we always have fields
    return { ...DEFAULT_FREE_CONFIG, ...result.llm_settings };
  }

  async validateKey(apiKey) {
    return apiKey && apiKey.length > 5;
  }

  async chat(messages, context) {
    const config = await this.getConfig();
    
    if (!config.apiKey) {
      throw new Error('API Key is missing. Please configure it in settings.');
    }

    const systemPrompt = {
      role: 'system',
      content: `You are a helpful AI assistant analyzing a webpage. 
      Answer the user's questions based primarily on the provided webpage context.
      
      WEBPAGE CONTEXT:
      ${context}`
    };

    // Construct the URL. Handle cases where users might miss '/chat/completions'
    let endpoint = config.baseUrl;
    if (!endpoint.endsWith('/chat/completions')) {
      // Remove trailing slash if present
      endpoint = endpoint.replace(/\/+$/, '');
      endpoint += '/chat/completions';
    }

    const payload = {
      model: config.model,
      messages: [systemPrompt, ...messages],
      temperature: 0.7,
      max_tokens: 1000,
      // OpenRouter specific header to prevent caching issues
      provider: { ignore: ["False"] }
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          // Headers required by OpenRouter
          'HTTP-Referer': 'https://github.com/TabSynth/extension', 
          'X-Title': 'TabSynth Extension'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle OpenRouter privacy specific error
        if (errorData.error?.message?.includes('data policy')) {
          throw new Error('Free models require "Data Logging" enabled in your OpenRouter privacy settings.');
        }
        
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('LLM Service Error:', error);
      throw error;
    }
  }
}

export const llmService = new LLMService();