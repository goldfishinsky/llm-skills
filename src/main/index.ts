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

    const systemPrompt = `You are a helpful AI assistant.
You have access to the following tools to help the user:
${JSON.stringify(toolDefinitions, null, 2)}

## Tool Calling Rules:
1. To use a tool, you MUST respond with ONLY a JSON object in this format:
   {"tool": "tool_name", "parameters": {...}}
2. Do NOT include any conversation, explanation, or markdown formatting around the JSON.
3. If you don't need a tool, respond naturally in the user's language.

## Examples:
User: "Download 'Hotel California'"
Assistant: {"tool": "music-download", "parameters": {"query": "Hotel California"}}

User: "Next song"
Assistant: {"tool": "music-control", "parameters": {"action": "next"}}

User: "Find developer jobs"
Assistant: {"tool": "job-search", "parameters": {"query": "developer"}}

Important:
- Use 'music-download' for downloading.
- Use 'music-control' for playback control.
- If the user speaks Chinese, translate queries as needed but keep the tool name in English.
`;

    // Construct messages
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...history.filter(m => m.role !== 'system'),
      { role: 'user', content: message }
    ];

    // Chat Loop (Max 5 iterations)
    let iterations = 0;
    const maxIterations = 5;
    let lastContent = '';

    while (iterations < maxIterations) {
      iterations++;
      console.log(`\n--- Iteration ${iterations} ---`);
      
      const response = await llmManager.chat(provider, model, messages);
      const content = response.content;
      lastContent = content;
      
      console.log('LLM Response Content:', content);

      // Extract JSON tool call - Improved logic to handle nested braces
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const potentialJson = content.substring(firstBrace, lastBrace + 1);
        console.log('Potential JSON:', potentialJson);
        
        try {
          let toolCall = JSON.parse(potentialJson);
          console.log('Parsed Tool Call:', JSON.stringify(toolCall));
          
          let toolName = toolCall.tool;
          let toolParams = toolCall.parameters;

          // Fallback logic: if tool/parameters structure is missing
          if (!toolName || !toolParams) {
             console.log('Strict JSON structure missing, attempting fallback inference...');
             
             // Check if any known tool name appears in the content
             const foundTool = tools.find(t => content.includes(t.name));
             if (foundTool) {
               console.log(`Inferred tool from context: ${foundTool.name}`);
               toolName = foundTool.name;
               // Assume the entire JSON is the parameters if "parameters" key is missing
               toolParams = toolCall.parameters || toolCall;
             }
          }
          
          if (toolName && toolParams) {
            console.log(`Tool identified: ${toolName}`);
            
            // Notify frontend
            event.sender.send('tool:execution', { 
              tool: toolName, 
              status: 'Executing...', 
            });

            // Log available tools
            console.log('Available tools:', tools.map(t => t.name));

            const tool = tools.find(t => t.name === toolName || t.id === toolName);
            if (tool) {
              const progressCallback = (msg: string) => {
                console.log(`[Progress] ${msg}`);
                event.sender.send('tool:execution', { 
                  tool: toolName, 
                  status: msg 
                });
              };

              console.log('Executing tool...');
              try {
                const result = await tool.execute(toolParams, progressCallback);
                console.log('Tool execution result:', result);
                
                // Notify frontend of result
                event.sender.send('tool:execution', { 
                  tool: toolName, 
                  status: 'Completed',
                  result: result
                });

                // Feed result back to LLM
                messages.push({ role: 'assistant', content: content });
                messages.push({ role: 'user', content: `Tool Execution Result: ${result}\n\nPlease summarize this for the user.` });
                
                // Continue loop to get the final summary (or another tool call)
                continue;
              } catch (execError) {
                console.error('Tool execution failed:', execError);
                event.sender.send('tool:execution', { 
                  tool: toolName, 
                  status: 'Error',
                  result: (execError as Error).message
                });
                return `Error executing tool ${toolName}: ${(execError as Error).message}`;
              }
            } else {
              console.error(`Tool not found: ${toolName}`);
              event.sender.send('tool:execution', { 
                tool: toolName, 
                status: 'Error',
                result: `Tool not found. Available: ${tools.map(t => t.name).join(', ')}`
              });
              return `Error: Tool ${toolName} not found.`;
            }
          } else {
              console.log('JSON parsed but missing tool or parameters fields');
          }
        } catch (e) {
          console.error('JSON Parse Error:', e);
          // Only notify error if it really looked like a tool call (e.g. started with {"tool":)
          if (potentialJson.includes('"tool"')) {
             event.sender.send('tool:execution', { 
                tool: 'unknown', 
                status: 'Error',
                result: `Failed to parse tool call: ${(e as Error).message}`
             });
          }
          // Not valid JSON or not a tool call, treat as normal message
          break;
        }
      } else {
        console.log('No JSON found in response');
        // No JSON found, treat as normal message
        break;
      }
    }

    console.log('Returning final content');
    return lastContent;
  });
}

