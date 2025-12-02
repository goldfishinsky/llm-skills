// Global type definitions for renderer process

declare global {
  interface Window {
    electronAPI: {
      skill: {
        getAll: () => Promise<any[]>;
        get: (skillId: string) => Promise<any | null>;
        create: (skillData: any) => Promise<any>;
        update: (skillId: string, skillData: any) => Promise<any>;
        delete: (skillId: string) => Promise<boolean>;
        execute: (skillId: string, params: Record<string, any>) => Promise<any>;
      };
      llm: {
        getProviders: () => Promise<any[]>;
        setApiKey: (provider: string, apiKey: string) => Promise<void>;
        chat: (provider: string, model: string, messages: any[], options?: any) => Promise<any>;
        getModels: (provider: string) => Promise<any[]>;
      };
      settings: {
        get: () => Promise<any>;
        save: (settings: any) => Promise<void>;
      };
    };
  }
}

export {};

