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

  // Chat with Tools
  ipcMain.handle('chat:send', async (event, message: string, history: Message[]) => {
    const settings = llmManager.getSettings();
    const provider = settings.defaultProvider;
    const model = settings.defaultModel;

    // Prepare tools
    const tools = skillManager.getTools();
    const toolDefinitions = tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));

    const systemPrompt = `You are a helpful AI assistant. You have access to the following tools:
${JSON.stringify(toolDefinitions, null, 2)}

To use a tool, you MUST respond with ONLY a JSON object in this format:
{"tool": "tool_name", "parameters": {...}}

If you don't need to use a tool, just respond normally.
If the user asks to download music, use the 'download_music' tool.
If the user asks to find jobs, use the 'search_jobs' tool.
`;

    // Construct messages
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...history.filter(m => m.role !== 'system'), // Filter out previous system messages if any
      { role: 'user', content: message }
    ];

    // Chat Loop
    let response = await llmManager.chat(provider, model, messages);
    let content = response.content;

    // Check for tool call
    try {
      // Simple JSON extraction (can be improved)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const potentialJson = jsonMatch[0];
        const toolCall = JSON.parse(potentialJson);
        
        if (toolCall.tool && toolCall.parameters) {
          const toolName = toolCall.tool;
          const toolParams = toolCall.parameters;
          
          // Notify frontend
          event.sender.send('tool:execution', { 
            tool: toolName, 
            status: 'Executing...', 
          });

          const tool = tools.find(t => t.name === toolName);
          if (tool) {
            const progressCallback = (msg: string) => {
               event.sender.send('tool:execution', { 
                tool: toolName, 
                status: msg 
              });
            };

            const result = await tool.execute(toolParams, progressCallback);
            
            // Notify frontend of result
            event.sender.send('tool:execution', { 
              tool: toolName, 
              status: 'Completed',
              result: result
            });

            // Feed result back to LLM
            messages.push({ role: 'assistant', content: content });
            messages.push({ role: 'user', content: `Tool Execution Result: ${result}\n\nPlease summarize the result for me.` });
            
            const finalResponse = await llmManager.chat(provider, model, messages);
            return finalResponse.content;
          } else {
            return `Error: Tool ${toolName} not found.`;
          }
        }
      }
    } catch (e) {
      // Not a tool call, just return content
    }

    return content;
  });
}

