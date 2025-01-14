import Anthropic from '@anthropic-ai/sdk';

// API endpoint configuration - use relative URLs
const API_URL = '';  // Empty string means use relative URLs

export interface ComparisonResponse {
  modelId: string;
  response: string;
  tokensUsed: number;
  responseTime: number;
  cost: number;
}

export interface Comparison {
  id: number;
  user_prompt: string;
  system_prompt: string;
  responses: string | ComparisonResponse[];
  created_at: string;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  multilingual: boolean;
  vision: boolean;
  message_batches: boolean;
  context_window: number;
  max_output_tokens: number;
  input_cost_per_1m: number;
  output_cost_per_1m: number;
  latency: string;
  isFavorite: boolean;
}

export interface ApiKeyInfo {
  provider: string;
  exists: boolean;
}

export async function getComparisons(limit = 10): Promise<Comparison[]> {
  try {
    const response = await fetch(`${API_URL}/api/comparisons?limit=${limit}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Failed to fetch comparisons: ${response.statusText}${
          errorData ? ` - ${JSON.stringify(errorData)}` : ''
        }`
      );
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching comparisons:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to connect to server. Please make sure the server is running.'
    );
  }
}

export async function saveComparison(
  systemPrompt: string,
  userPrompt: string,
  responses: Array<{
    modelId: string;
    response: string;
    tokensUsed: number;
    responseTime: number;
    cost: number;
  }>
): Promise<number> {
  try {
    const response = await fetch(`${API_URL}/api/comparisons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        responses,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Failed to save comparison: ${response.statusText}${
          errorData ? ` - ${JSON.stringify(errorData)}` : ''
        }`
      );
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error saving comparison:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to connect to server. Please make sure the server is running.'
    );
  }
}

export async function saveApiKey(provider: string, apiKey: string): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        apiKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Failed to save API key: ${response.statusText}${
          errorData ? ` - ${JSON.stringify(errorData)}` : ''
        }`
      );
    }
  } catch (error) {
    console.error('Error saving API key:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to connect to server. Please make sure the server is running.'
    );
  }
}

// Private function for raw API calls
async function getCompletion({ 
  modelId, 
  userPrompt, 
  systemPrompt,
  temperature = 0.7,
  messages = [] 
}: {
  modelId: string;
  userPrompt: string;
  systemPrompt?: string;
  temperature?: number;
  messages?: Array<{ role: string; content: string }>;
}): Promise<any> {
  const formattedMessages = [...messages];
  if (systemPrompt && !messages.some(m => m.role === 'system')) {
    formattedMessages.unshift({ role: 'system', content: systemPrompt });
  }
  formattedMessages.push({ role: 'user', content: userPrompt });

  const response = await fetch(`${API_URL}/api/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: formattedMessages,
      temperature,
      stream: true
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.statusText}${error ? `: ${error}` : ''}`);
  }

  return response;
}

export async function getModelCompletion({ 
  modelId, 
  userPrompt, 
  systemPrompt,
  temperature = 0.7,
  messages = []
}: {
  modelId: string;
  userPrompt: string;
  systemPrompt?: string;
  temperature?: number;
  messages?: Array<{ role: string; content: string }>;
}): Promise<any> {
  // Adjust temperature based on model
  let adjustedTemperature = temperature;
  if (modelId.startsWith('o1-') || modelId === 'o1') {
    // o1 models only support temperature=1
    adjustedTemperature = 1;
  } else if (modelId.startsWith('gpt-')) {
    // OpenAI models support temperature up to 2
    adjustedTemperature = Math.min(Math.max(temperature, 0), 2);
  } else {
    // Other models typically use 0-1 range
    adjustedTemperature = Math.min(Math.max(temperature, 0), 1);
  }

  if (modelId.startsWith('o1-') || modelId === 'o1') {
    // For o1 models, prepend system prompt to user prompt and include previous messages
    const previousMessages = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
    const combinedPrompt = [
      systemPrompt,
      previousMessages,
      userPrompt
    ].filter(Boolean).join('\n\n');
    
    return getCompletion({ 
      modelId, 
      userPrompt: combinedPrompt,
      temperature: adjustedTemperature 
    });
  }
  
  // For other models, use standard message format
  return getCompletion({ 
    modelId, 
    userPrompt, 
    systemPrompt,
    temperature: adjustedTemperature,
    messages 
  });
}

export async function getModels(): Promise<Model[]> {
  try {
    const response = await fetch(`${API_URL}/api/models`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Failed to fetch models: ${response.statusText}${
          errorData ? ` - ${JSON.stringify(errorData)}` : ''
        }`
      );
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching models:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Unknown error occurred'
    );
  }
}

export async function toggleFavorite(modelId: string, isFavorite: boolean): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/favorites/${modelId}`, {
      method: isFavorite ? 'DELETE' : 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Failed to ${isFavorite ? 'remove' : 'add'} favorite: ${response.statusText}${
          errorData ? ` - ${JSON.stringify(errorData)}` : ''
        }`
      );
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to connect to server. Please make sure the server is running.'
    );
  }
}

export async function getApiKeyInfo(): Promise<ApiKeyInfo[]> {
  try {
    const response = await fetch(`${API_URL}/api/keys/info`);
    if (!response.ok) {
      throw new Error('Failed to fetch API key info');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching API key info:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to connect to server. Please make sure the server is running.'
    );
  }
}