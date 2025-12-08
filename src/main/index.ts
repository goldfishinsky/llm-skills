import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import { SkillManager } from './skillManager';
import { LLMManager } from './llmManager';
import { Skill, ChatOptions, Message, Settings, CustomSkill } from './types';

let mainWindow: BrowserWindow | null;
let skillManager: SkillManager;
let llmManager: LLMManager;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e1e'
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  skillManager = new SkillManager();
  llmManager = new LLMManager();
  
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIPC(): void {
  // Skill management
  ipcMain.handle('skill:getAll', async (): Promise<Skill[]> => {
    return skillManager.getAllSkills();
  });

  ipcMain.handle('skill:get', async (_event, skillId: string): Promise<Skill | null> => {
    return skillManager.getSkill(skillId);
  });

  ipcMain.handle('skill:create', async (_event, skillData: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Promise<Skill> => {
    return skillManager.createSkill(skillData);
  });

  ipcMain.handle('skill:update', async (_event, skillId: string, skillData: Partial<Skill>): Promise<Skill> => {
    return skillManager.updateSkill(skillId, skillData);
  });

  ipcMain.handle('skill:delete', async (_event, skillId: string): Promise<boolean> => {
    return skillManager.deleteSkill(skillId);
  });

  ipcMain.handle('skill:execute', async (event, skillId: string, params: Record<string, any>) => {
    const progressCallback = (message: string) => {
      event.sender.send('skill:progress', message);
    };
    return skillManager.executeSkill(skillId, params, llmManager, progressCallback);
  });

  // LLM management
  ipcMain.handle('llm:getProviders', async () => {
    return llmManager.getProviders();
  });

  ipcMain.handle('llm:setApiKey', async (_event, provider: string, apiKey: string): Promise<void> => {
    return llmManager.setApiKey(provider, apiKey);
  });

  ipcMain.handle('llm:chat', async (_event, provider: string, model: string, messages: Message[], options?: ChatOptions) => {
    return llmManager.chat(provider, model, messages, options);
  });

  ipcMain.handle('llm:getModels', async (_event, provider: string) => {
    return llmManager.getModels(provider);
  });

  // Settings
  ipcMain.handle('settings:get', async (): Promise<Settings> => {
    return llmManager.getSettings();
  });

  ipcMain.handle('settings:save', async (_event, settings: Settings): Promise<void> => {
    return llmManager.saveSettings(settings);
  });

  // Custom Skills
  ipcMain.handle('customSkills:getAll', async (): Promise<CustomSkill[]> => {
    return skillManager.getCustomSkills();
  });

  ipcMain.handle('customSkills:reload', async (): Promise<void> => {
    skillManager.reloadCustomSkills();
  });

  ipcMain.handle('customSkills:getDirectory', async (): Promise<string> => {
    return skillManager.getCustomSkillsDirectory();
  });

  ipcMain.handle('customSkills:openDirectory', async (): Promise<void> => {
    const dir = skillManager.getCustomSkillsDirectory();
    shell.openPath(dir);
  });
}

