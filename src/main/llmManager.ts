import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import axios from 'axios';
import { LLMProvider, Message, ChatOptions, ChatResponse, Settings } from './types';

export class LLMManager {
  private settingsPath: string;
  private settings: Settings;
  private providers: Map<string, LLMProvider>;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'settings.json');
    this.providers = new Map();
    this.initializeProviders();
    this.settings = this.loadSettings();
  }

  private initializeProviders(): void {
    const providers: LLMProvider[] = [
      {
        id: 'openai',
        name: 'OpenAI',
        apiKeyName: 'OPENAI_API_KEY',
        baseUrl: 'https://api.openai.com/v1',
        supportStreaming: true,
        models: [
          { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', contextWindow: 128000, maxOutput: 4096 },
          { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192, maxOutput: 4096 },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385, maxOutput: 4096 }
        ]
      },
      {
        id: 'anthropic',
        name: 'Anthropic (Claude)',
        apiKeyName: 'ANTHROPIC_API_KEY',
        baseUrl: 'https://api.anthropic.com/v1',
        supportStreaming: true,
        models: [
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000, maxOutput: 4096 },
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', contextWindow: 200000, maxOutput: 4096 },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', contextWindow: 200000, maxOutput: 4096 }
        ]
      },
      {
        id: 'google',
        name: 'Google (Gemini)',
        apiKeyName: 'GOOGLE_API_KEY',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        supportStreaming: true,
        models: [
          { id: 'gemini-pro', name: 'Gemini Pro', contextWindow: 32760, maxOutput: 2048 },
          { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', contextWindow: 16384, maxOutput: 2048 }
        ]
      },
      {
        id: 'deepseek',
        name: 'DeepSeek',
        apiKeyName: 'DEEPSEEK_API_KEY',
        baseUrl: 'https://api.deepseek.com/v1',
        supportStreaming: true,
        models: [
          { id: 'deepseek-chat', name: 'DeepSeek Chat', contextWindow: 32768, maxOutput: 4096 },
          { id: 'deepseek-coder', name: 'DeepSeek Coder', contextWindow: 16384, maxOutput: 4096 }
        ]
      },
      {
        id: 'zhipu',
        name: 'ZhipuAI (ChatGLM)',
        apiKeyName: 'ZHIPU_API_KEY',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        supportStreaming: true,
        models: [
          { id: 'glm-4', name: 'GLM-4', contextWindow: 128000, maxOutput: 4096 },
          { id: 'glm-4-flash', name: 'GLM-4 Flash (Free)', contextWindow: 128000, maxOutput: 4096 },
          { id: 'glm-3-turbo', name: 'GLM-3 Turbo', contextWindow: 128000, maxOutput: 4096 }
        ]
      },
      {
        id: 'moonshot',
        name: 'Moonshot AI (Kimi)',
        apiKeyName: 'MOONSHOT_API_KEY',
        baseUrl: 'https://api.moonshot.cn/v1',
        supportStreaming: true,
        models: [
          { id: 'moonshot-v1-8k', name: 'Moonshot v1 8K', contextWindow: 8192, maxOutput: 4096 },
          { id: 'moonshot-v1-32k', name: 'Moonshot v1 32K', contextWindow: 32768, maxOutput: 4096 },
          { id: 'moonshot-v1-128k', name: 'Moonshot v1 128K', contextWindow: 131072, maxOutput: 4096 }
        ]
      }
    ];

    providers.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  private loadSettings(): Settings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }

    return {
      apiKeys: {},
      defaultProvider: 'openai',
      defaultModel: 'gpt-3.5-turbo',
      theme: 'auto',
      jamendoApiKey: undefined
    };
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  saveSettings(settings: Settings): void {
    this.settings = settings;
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  getProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  getModels(providerId: string): LLMProvider['models'] {
    const provider = this.providers.get(providerId);
    return provider ? provider.models : [];
  }

  setApiKey(providerId: string, apiKey: string): void {
    this.settings.apiKeys[providerId] = apiKey;
    this.saveSettings(this.settings);
  }

  async chat(
    providerId: string,
    modelId: string,
    messages: Message[],
    options?: ChatOptions,
    apiKey?: string
  ): Promise<ChatResponse> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const finalApiKey = apiKey || this.settings.apiKeys[providerId];
    if (!finalApiKey) {
      throw new Error(`API key not set for provider ${providerId}`);
    }

    switch (providerId) {
      case 'openai':
      case 'deepseek':
      case 'moonshot':
        return this.chatOpenAICompatible(provider, modelId, messages, finalApiKey, options);
      case 'anthropic':
        return this.chatAnthropic(provider, modelId, messages, finalApiKey, options);
      case 'google':
        return this.chatGoogle(provider, modelId, messages, finalApiKey, options);
      case 'zhipu':
        return this.chatZhipu(provider, modelId, messages, finalApiKey, options);
      default:
        throw new Error(`Provider ${providerId} not implemented`);
    }
  }

  private async chatOpenAICompatible(
    provider: LLMProvider,
    modelId: string,
    messages: Message[],
    apiKey: string,
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const client = axios.create({
      baseURL: provider.baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const response = await client.post('/chat/completions', {
      model: modelId,
      messages: messages, // Messages now include system prompt if provided
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      stop: options?.stopSequences,
      stream: false
    });

    const data = response.data;
    return {
      content: data.choices[0].message.content,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined,
      model: data.model,
      finishReason: data.choices[0].finish_reason
    };
  }

  private async chatAnthropic(
    provider: LLMProvider,
    modelId: string,
    messages: Message[],
    apiKey: string,
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const client = axios.create({
      baseURL: provider.baseUrl,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await client.post('/messages', {
      model: modelId,
      messages: userMessages,
      system: systemMessage?.content,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP,
      stop_sequences: options?.stopSequences
    });

    const data = response.data;
    return {
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      },
      model: data.model,
      finishReason: data.stop_reason
    };
  }

  private async chatGoogle(
    provider: LLMProvider,
    modelId: string,
    messages: Message[],
    apiKey: string,
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const client = axios.create({
      baseURL: provider.baseUrl,
      params: { key: apiKey }
    });

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await client.post(`/models/${modelId}:generateContent`, {
      contents: contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens,
        topP: options?.topP,
        stopSequences: options?.stopSequences
      }
    });

    const data = response.data;
    const candidate = data.candidates[0];
    
    return {
      content: candidate.content.parts[0].text,
      model: modelId,
      finishReason: candidate.finishReason
    };
  }

  private async chatZhipu(
    provider: LLMProvider,
    modelId: string,
    messages: Message[],
    apiKey: string,
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const client = axios.create({
      baseURL: provider.baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const response = await client.post('/chat/completions', {
      model: modelId,
      messages: messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      stop: options?.stopSequences
    });

    const data = response.data;
    return {
      content: data.choices[0].message.content,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined,
      model: data.model,
      finishReason: data.choices[0].finish_reason
    };
  }
}

