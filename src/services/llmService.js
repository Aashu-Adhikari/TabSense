// src/services/llmService.js

export const DEFAULT_MODEL = {
  provider: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: '', // User must provide their own API key
  model: '' // User selects their preferred model
};

class LLMService {
  // Helper to get the full configuration object
  async getConfig() {
    const result = await chrome.storage.local.get(['llm_settings']);
    return { ...DEFAULT_MODEL, ...result.llm_settings };
  }

  async validateKey(apiKey) {
    return apiKey && apiKey.length > 5;
  }

  async chat(messages, context) {
    // FIX: Use getConfig() instead of getApiKey()
    const config = await this.getConfig();
    
    if (!config.apiKey) {
      throw new Error('API Key is missing. Please configure it in settings.');
    }

    const systemPrompt = {
      role: 'system',
      content: `You are a helpful AI assistant analyzing webpage content. 
      Answer the user's questions based primarily on the provided webpage context.
      
      CITATION RULES:
      - When referencing specific information, cite the source using the format: [Source N]
      - Where N is the source number (1, 2, 3...) corresponding to the numbered sources below
      - Only cite when referencing specific facts from the context
      - If information comes from a specific source, cite it immediately after the claim
      
      SOURCES:
      ${context}`
    };

    // Construct the correct endpoint URL
    let endpoint = config.baseUrl;
    if (!endpoint.endsWith('/chat/completions')) {
      endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
    }

    const payload = {
      model: config.model,
      messages: [systemPrompt, ...messages],
      temperature: 0.7,
      max_tokens: 5000,
      stream: true, // Enable streaming
      provider: { ignore: ["False"] }
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'HTTP-Referer': 'https://github.com/TabSynth/extension',
          'X-Title': 'TabSynth Extension'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error?.message?.includes('data policy')) {
          throw new Error('Please enable "Data Logging" in your LLM Provider privacy settings.');
        }
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }

      // Return the readable stream for the handler to process
      return response.body;

    } catch (error) {
      console.error('LLM Service Error:', error);
      throw error;
    }
  }
}

export const llmService = new LLMService();