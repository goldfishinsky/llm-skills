// Core types for the application

export interface Skill {
  id: string;
  name: string;
  description: string;
  prompt: string;
  parameters: SkillParameter[];
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string; // Optional skill-specific API key
  tools?: string[]; // List of tool IDs enabled for this skill
  createdAt: number;
  updatedAt: number;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  execute: (params: any, onProgress?: (message: string) => void) => Promise<any>;
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
}

export interface LLMProvider {
  id: string;
  name: string;
  apiKeyName: string;
  baseUrl?: string;
  models: LLMModel[];
  supportStreaming: boolean;
}

export interface LLMModel {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  stopSequences?: string[];
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

export interface Settings {
  apiKeys: Record<string, string>;
  defaultProvider: string;
  defaultModel: string;
  theme: 'light' | 'dark' | 'auto';
  jamendoApiKey?: string;
}

export interface SkillExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

