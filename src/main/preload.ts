import { contextBridge, ipcRenderer } from 'electron';
import { Skill, Message, ChatOptions, Settings } from './types';

const electronAPI = {
  // Skill operations
  skill: {
    getAll: (): Promise<Skill[]> => ipcRenderer.invoke('skill:getAll'),
    get: (skillId: string): Promise<Skill | null> => ipcRenderer.invoke('skill:get', skillId),
    create: (skillData: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Promise<Skill> => 
      ipcRenderer.invoke('skill:create', skillData),
    update: (skillId: string, skillData: Partial<Skill>): Promise<Skill> => 
      ipcRenderer.invoke('skill:update', skillId, skillData),
    delete: (skillId: string): Promise<boolean> => ipcRenderer.invoke('skill:delete', skillId),
    execute: (skillId: string, params: Record<string, any>): Promise<any> => 
      ipcRenderer.invoke('skill:execute', skillId, params)
  },
  
  // LLM operations
  llm: {
    getProviders: () => ipcRenderer.invoke('llm:getProviders'),
    setApiKey: (provider: string, apiKey: string): Promise<void> => 
      ipcRenderer.invoke('llm:setApiKey', provider, apiKey),
    chat: (provider: string, model: string, messages: Message[], options?: ChatOptions) => 
      ipcRenderer.invoke('llm:chat', provider, model, messages, options),
    getModels: (provider: string) => ipcRenderer.invoke('llm:getModels', provider)
  },

  // Settings operations
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
    save: (settings: Settings): Promise<void> => ipcRenderer.invoke('settings:save', settings)
  },

  // Progress events
  onProgress: (callback: (event: any, message: string) => void) => {
    ipcRenderer.on('skill:progress', callback);
  },
  removeProgressListener: (callback: (event: any, message: string) => void) => {
    ipcRenderer.removeListener('skill:progress', callback);
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;

