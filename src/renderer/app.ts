// Type definitions for window.electronAPI
interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required: boolean;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  prompt: string;
  parameters: SkillParameter[];
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  tools?: string[];
  createdAt: number;
  updatedAt: number;
}

interface LLMModel {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
}

interface LLMProvider {
  id: string;
  name: string;
  apiKeyName: string;
  baseUrl?: string;
  models: LLMModel[];
  supportStreaming: boolean;
}

interface Settings {
  apiKeys: Record<string, string>;
  defaultProvider: string;
  defaultModel: string;
  theme: 'light' | 'dark' | 'auto';
  jamendoApiKey?: string;
}

interface CustomSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  runtime: string;
  script: string;
  scriptPath: string;
  skillPath: string;
  enabled: boolean;
  instructions?: string; // For prompt skills
  parameters?: any[];
}

// State management
let customSkills: CustomSkill[] = [];
let providers: LLMProvider[] = [];
let settings: Settings | null = null;
let chatHistory: Array<{role: 'user' | 'assistant' | 'system', content: string}> = [];

// Initialize app
async function init(): Promise<void> {
  await loadProviders();
  await loadSettings();
  await loadCustomSkills();
  setupEventListeners();
  
  // Initialize chat
  appendMessage('system', 'Hello! I can help you with various tasks using your skills. Try asking me to download music or search for jobs.');
}

// Load data
async function loadProviders(): Promise<void> {
  providers = await window.electronAPI.llm.getProviders();
}

async function loadSettings(): Promise<void> {
  settings = await window.electronAPI.settings.get();
}

async function loadCustomSkills(): Promise<void> {
  customSkills = await window.electronAPI.customSkills.getAll();
}

// Chat Functions
function appendMessage(role: 'user' | 'assistant' | 'system', content: string): void {
  const chatMessages = document.getElementById('chatMessages')!;
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  // Simple markdown-like parsing (can be improved)
  let formattedContent = escapeHtml(content)
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>');

  contentDiv.innerHTML = formattedContent;
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  chatHistory.push({ role, content });
}

function appendToolExecution(toolName: string, status: string, result?: string): HTMLElement {
  const chatMessages = document.getElementById('chatMessages')!;
  const toolDiv = document.createElement('div');
  toolDiv.className = 'tool-execution';
  
  toolDiv.innerHTML = `
    <div class="tool-header">
      <span>⚙️ ${escapeHtml(toolName)}</span>
      <span>${escapeHtml(status)}</span>
    </div>
    ${result ? `<div class="tool-content">${escapeHtml(result)}</div>` : ''}
  `;
  
  chatMessages.appendChild(toolDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return toolDiv;
}

async function sendMessage(): Promise<void> {
  const input = document.getElementById('chatInput') as HTMLTextAreaElement;
  const message = input.value.trim();
  
  if (!message) return;
  
  input.value = '';
  input.style.height = 'auto'; // Reset height
  
  appendMessage('user', message);
  
  const sendBtn = document.getElementById('sendMessageBtn') as HTMLButtonElement;
  sendBtn.disabled = true;
  
  try {
    // Send to backend
    const response = await window.electronAPI.chat.send(message, chatHistory);
    appendMessage('assistant', response);
  } catch (error) {
    appendMessage('system', `Error: ${(error as Error).message}`);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

// UI Functions
function showCustomSkillsPanel(): void {
  document.getElementById('chatInterface')!.classList.add('hidden');
  document.getElementById('customSkillsPanel')!.classList.remove('hidden');
  renderCustomSkillsList();
}

function showChatInterface(): void {
  document.getElementById('customSkillsPanel')!.classList.add('hidden');
  document.getElementById('chatInterface')!.classList.remove('hidden');
}

function renderCustomSkillsList(): void {
  const container = document.getElementById('customSkillsList')!;
  
  if (customSkills.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No custom skills found.</p>
        <p>Click "Open Folder" to add your first skill!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = customSkills.map(skill => `
    <div class="custom-skill-item">
      <div class="custom-skill-info">
        <h4>${escapeHtml(skill.name)}</h4>
        <p>${escapeHtml(skill.description)}</p>
        <div class="custom-skill-meta">
          <span>🏷️ v${skill.version}</span>
          <span>⚙️ ${skill.runtime}</span>
          <span>📄 ${skill.script || 'No script'}</span>
        </div>
      </div>
      <div class="custom-skill-status ${skill.enabled ? 'enabled' : 'disabled'}">
        ${skill.enabled ? '✓ Enabled' : '✗ Disabled'}
      </div>
    </div>
  `).join('');
}

// Event listeners
function setupEventListeners(): void {
  // Chat input
  const chatInput = document.getElementById('chatInput') as HTMLTextAreaElement;
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Auto-resize textarea
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
  });

  document.getElementById('sendMessageBtn')!.addEventListener('click', sendMessage);
  
  // Settings
  document.getElementById('userProfileBtn')!.addEventListener('click', showSettings);
  document.getElementById('closeSettingsBtn')!.addEventListener('click', closeSettings);
  document.getElementById('saveSettingsBtn')!.addEventListener('click', saveSettings);
  document.getElementById('defaultProvider')!.addEventListener('change', updateDefaultModelSelect);

  // Custom Skills Panel
  document.getElementById('customSkillsBtn')!.addEventListener('click', showCustomSkillsPanel);
  document.getElementById('closeCustomSkillsBtn')!.addEventListener('click', showChatInterface);
  document.getElementById('reloadCustomSkillsBtn')!.addEventListener('click', async () => {
    await window.electronAPI.customSkills.reload();
    customSkills = await window.electronAPI.customSkills.getAll();
    renderCustomSkillsList();
  });
  document.getElementById('openSkillsFolderBtn')!.addEventListener('click', () => {
    window.electronAPI.customSkills.openDirectory();
  });
  
  // Listen for tool execution events from backend
  window.electronAPI.onToolExecution((event: any, data: { tool: string, status: string, result?: string }) => {
    appendToolExecution(data.tool, data.status, data.result);
  });
}

// Settings Functions (Reused)
async function showSettings(): Promise<void> {
  document.getElementById('settingsModal')!.classList.remove('hidden');
  
  const defaultProviderSelect = document.getElementById('defaultProvider') as HTMLSelectElement;
  defaultProviderSelect.innerHTML = providers.map(p => 
    `<option value="${p.id}">${p.name}</option>`
  ).join('');
  defaultProviderSelect.value = settings!.defaultProvider;
  
  updateDefaultModelSelect();
  (document.getElementById('defaultModel') as HTMLSelectElement).value = settings!.defaultModel;
  (document.getElementById('theme') as HTMLSelectElement).value = settings!.theme;
  
  renderApiKeys();
}

function updateDefaultModelSelect(): void {
  const providerId = (document.getElementById('defaultProvider') as HTMLSelectElement).value;
  const provider = providers.find(p => p.id === providerId);
  const select = document.getElementById('defaultModel') as HTMLSelectElement;
  
  if (provider) {
    select.innerHTML = provider.models.map(m => 
      `<option value="${m.id}">${m.name}</option>`
    ).join('');
  }
}

function renderApiKeys(): void {
  const container = document.getElementById('apiKeysList')!;
  container.innerHTML = '';

  // Add Jamendo API Key first
  const jamendoItem = document.createElement('div');
  jamendoItem.className = 'api-key-item';
  jamendoItem.innerHTML = `
    <label>Jamendo API Key (for Music Download)</label>
    <input type="password" 
           id="jamendo-apikey" 
           placeholder="Enter your Jamendo API client_id"
           value="${settings!.jamendoApiKey || ''}">
  `;
  container.appendChild(jamendoItem);

  // Add LLM Provider API Keys
  providers.forEach(provider => {
    const item = document.createElement('div');
    item.className = 'api-key-item';
    item.innerHTML = `
      <label>${provider.name} API Key</label>
      <input type="password" 
             id="apikey-${provider.id}" 
             placeholder="Enter your ${provider.name} API key"
             value="${settings!.apiKeys[provider.id] || ''}">
    `;
    container.appendChild(item);
  });
}

async function saveSettings(): Promise<void> {
  const newSettings: Settings = {
    defaultProvider: (document.getElementById('defaultProvider') as HTMLSelectElement).value,
    defaultModel: (document.getElementById('defaultModel') as HTMLSelectElement).value,
    theme: (document.getElementById('theme') as HTMLSelectElement).value as 'light' | 'dark' | 'auto',
    apiKeys: {}
  };

  providers.forEach(provider => {
    const input = document.getElementById(`apikey-${provider.id}`) as HTMLInputElement;
    if (input && input.value) {
      newSettings.apiKeys[provider.id] = input.value;
    }
  });

  // Get Jamendo API key
  const jamendoInput = document.getElementById('jamendo-apikey') as HTMLInputElement;
  if (jamendoInput && jamendoInput.value) {
    newSettings.jamendoApiKey = jamendoInput.value;
  }

  try {
    await window.electronAPI.settings.save(newSettings);
    settings = newSettings;
    closeSettings();
  } catch (error) {
    alert('Error saving settings: ' + (error as Error).message);
  }
}

function closeSettings(): void {
  document.getElementById('settingsModal')!.classList.add('hidden');
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
