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
}

interface SkillExecutionResult {
  success: boolean;
  result?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// State management
let currentSkill: Skill | null = null;
let currentView: 'welcome' | 'editor' | 'execution' = 'welcome';
let skills: Skill[] = [];
let providers: LLMProvider[] = [];
let settings: Settings | null = null;

// Initialize app
async function init(): Promise<void> {
  await loadProviders();
  await loadSettings();
  await loadSkills();
  setupEventListeners();
}

// Load data
async function loadSkills(): Promise<void> {
  skills = await window.electronAPI.skill.getAll();
  renderSkillsList();
}

async function loadProviders(): Promise<void> {
  providers = await window.electronAPI.llm.getProviders();
}

async function loadSettings(): Promise<void> {
  settings = await window.electronAPI.settings.get();
}

// Render functions
function renderSkillsList(): void {
  const skillsList = document.getElementById('skillsList')!;
  skillsList.innerHTML = '';

  if (skills.length === 0) {
    skillsList.innerHTML = '<div style="padding: 12px; color: var(--text-secondary); font-size: 13px;">No skills yet. Create one to get started.</div>';
    return;
  }

  skills.forEach(skill => {
    const skillItem = document.createElement('div');
    skillItem.className = 'skill-item';
    skillItem.innerHTML = `
      <h3>${escapeHtml(skill.name)}</h3>
      <p>${escapeHtml(skill.description)}</p>
    `;
    skillItem.addEventListener('click', () => showSkillMenu(skill));
    skillsList.appendChild(skillItem);
  });
}

function showSkillMenu(skill: Skill): void {
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.position = 'fixed';
  menu.style.zIndex = '1000';
  
  const options = [
    { label: 'Execute', action: () => showExecution(skill) },
    { label: 'Edit', action: () => showEditor(skill) },
  ];

  const html = options.map(opt => `<div class="menu-item">${opt.label}</div>`).join('');
  menu.innerHTML = html;
  
  document.body.appendChild(menu);
  
  const items = menu.querySelectorAll('.menu-item');
  items.forEach((item, index) => {
    item.addEventListener('click', () => {
      options[index].action();
      document.body.removeChild(menu);
    });
  });

  const rect = (event as MouseEvent).target ? ((event as MouseEvent).target as HTMLElement).getBoundingClientRect() : { right: 0, top: 0 };
  menu.style.left = rect.right + 'px';
  menu.style.top = rect.top + 'px';

  setTimeout(() => {
    const clickOutside = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        document.body.removeChild(menu);
        document.removeEventListener('click', clickOutside);
      }
    };
    document.addEventListener('click', clickOutside);
  }, 0);
}

function showEditor(skill: Skill | null = null): void {
  currentSkill = skill;
  currentView = 'editor';

  document.getElementById('welcomeScreen')!.classList.add('hidden');
  document.getElementById('skillExecution')!.classList.add('hidden');
  document.getElementById('skillEditor')!.classList.remove('hidden');

  if (skill) {
    (document.getElementById('skillName') as HTMLInputElement).value = skill.name;
    (document.getElementById('skillDescription') as HTMLTextAreaElement).value = skill.description;
    (document.getElementById('skillPrompt') as HTMLTextAreaElement).value = skill.prompt;
    (document.getElementById('skillTemperature') as HTMLInputElement).value = String(skill.temperature || 0.7);
    (document.getElementById('skillMaxTokens') as HTMLInputElement).value = String(skill.maxTokens || 2000);
    
    renderProviderSelect();
    (document.getElementById('skillProvider') as HTMLSelectElement).value = skill.provider || settings!.defaultProvider;
    updateModelSelect();
    (document.getElementById('skillModel') as HTMLSelectElement).value = skill.model || settings!.defaultModel;
    
    renderParameters(skill.parameters);
    (document.getElementById('deleteSkillBtn') as HTMLButtonElement).style.display = 'block';
  } else {
    (document.getElementById('skillName') as HTMLInputElement).value = '';
    (document.getElementById('skillDescription') as HTMLTextAreaElement).value = '';
    (document.getElementById('skillPrompt') as HTMLTextAreaElement).value = '';
    (document.getElementById('skillTemperature') as HTMLInputElement).value = '0.7';
    (document.getElementById('skillMaxTokens') as HTMLInputElement).value = '2000';
    
    renderProviderSelect();
    (document.getElementById('skillProvider') as HTMLSelectElement).value = settings!.defaultProvider;
    updateModelSelect();
    
    renderParameters([]);
    (document.getElementById('deleteSkillBtn') as HTMLButtonElement).style.display = 'none';
  }
}

function showExecution(skill: Skill): void {
  currentSkill = skill;
  currentView = 'execution';

  document.getElementById('welcomeScreen')!.classList.add('hidden');
  document.getElementById('skillEditor')!.classList.add('hidden');
  document.getElementById('skillExecution')!.classList.remove('hidden');

  document.getElementById('executionSkillName')!.textContent = skill.name;
  document.getElementById('executionResult')!.classList.add('hidden');

  renderExecutionInputs(skill.parameters);
}

function renderProviderSelect(): void {
  const select = document.getElementById('skillProvider') as HTMLSelectElement;
  select.innerHTML = providers.map(p => 
    `<option value="${p.id}">${p.name}</option>`
  ).join('');
}

function updateModelSelect(): void {
  const providerId = (document.getElementById('skillProvider') as HTMLSelectElement).value;
  const provider = providers.find(p => p.id === providerId);
  const select = document.getElementById('skillModel') as HTMLSelectElement;
  
  if (provider) {
    select.innerHTML = provider.models.map(m => 
      `<option value="${m.id}">${m.name}</option>`
    ).join('');
  }
}

function renderParameters(parameters: SkillParameter[] = []): void {
  const container = document.getElementById('parametersList')!;
  container.innerHTML = '';

  parameters.forEach((param, index) => {
    const paramItem = createParameterItem(param, index);
    container.appendChild(paramItem);
  });
}

function createParameterItem(param: SkillParameter, index: number): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'parameter-item';
  div.innerHTML = `
    <div class="parameter-header">
      <strong>Parameter ${index + 1}</strong>
      <button class="btn-icon danger" onclick="removeParameter(${index})" title="Remove Parameter">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
    <div class="parameter-fields">
      <input type="text" placeholder="Name" value="${param.name || ''}" data-field="name">
      <select data-field="type">
        <option value="string" ${param.type === 'string' ? 'selected' : ''}>String</option>
        <option value="number" ${param.type === 'number' ? 'selected' : ''}>Number</option>
        <option value="boolean" ${param.type === 'boolean' ? 'selected' : ''}>Boolean</option>
      </select>
      <input type="text" placeholder="Description" value="${param.description || ''}" data-field="description" style="grid-column: 1 / -1;">
      <label style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" ${param.required ? 'checked' : ''} data-field="required">
        Required
      </label>
    </div>
  `;
  return div;
}

function renderExecutionInputs(parameters: SkillParameter[]): void {
  const container = document.getElementById('executionInputs')!;
  container.innerHTML = '';

  parameters.forEach(param => {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    let inputHtml: string;
    if (param.type === 'boolean') {
      inputHtml = `<input type="checkbox" id="param-${param.name}" ${param.required ? 'required' : ''}>`;
    } else if (param.type === 'number') {
      inputHtml = `<input type="number" id="param-${param.name}" placeholder="${param.description}" ${param.required ? 'required' : ''}>`;
    } else {
      inputHtml = `<textarea id="param-${param.name}" placeholder="${param.description}" rows="3" ${param.required ? 'required' : ''}></textarea>`;
    }

    formGroup.innerHTML = `
      <label for="param-${param.name}">${param.name}${param.required ? ' *' : ''}</label>
      ${inputHtml}
    `;
    container.appendChild(formGroup);
  });
}

// Event listeners
function setupEventListeners(): void {
  document.getElementById('newSkillBtn')!.addEventListener('click', () => showEditor());
  // document.getElementById('settingsBtn')!.addEventListener('click', showSettings); // Removed in new UI
  
  document.getElementById('sidebarToggleBtn')!.addEventListener('click', toggleSidebar);
  document.querySelector('.user-profile')!.addEventListener('click', showSettings);
  
  document.getElementById('saveSkillBtn')!.addEventListener('click', saveSkill);
  document.getElementById('deleteSkillBtn')!.addEventListener('click', deleteSkill);
  document.getElementById('closeEditorBtn')!.addEventListener('click', closeEditor);
  
  document.getElementById('addParameterBtn')!.addEventListener('click', addParameter);
  document.getElementById('skillProvider')!.addEventListener('change', updateModelSelect);
  
  document.getElementById('executeBtn')!.addEventListener('click', executeSkill);
  document.getElementById('closeExecutionBtn')!.addEventListener('click', closeExecution);
  
  document.getElementById('closeSettingsBtn')!.addEventListener('click', closeSettings);
  document.getElementById('saveSettingsBtn')!.addEventListener('click', saveSettings);
  
  document.getElementById('defaultProvider')!.addEventListener('change', updateDefaultModelSelect);
}

async function saveSkill(): Promise<void> {
  const name = (document.getElementById('skillName') as HTMLInputElement).value.trim();
  if (!name) {
    alert('Please enter a skill name');
    return;
  }

  const parameters = getParametersFromForm();
  
  const skillData = {
    name,
    description: (document.getElementById('skillDescription') as HTMLTextAreaElement).value.trim(),
    prompt: (document.getElementById('skillPrompt') as HTMLTextAreaElement).value.trim(),
    parameters,
    provider: (document.getElementById('skillProvider') as HTMLSelectElement).value,
    model: (document.getElementById('skillModel') as HTMLSelectElement).value,
    temperature: parseFloat((document.getElementById('skillTemperature') as HTMLInputElement).value),
    maxTokens: parseInt((document.getElementById('skillMaxTokens') as HTMLInputElement).value)
  };

  try {
    if (currentSkill) {
      await window.electronAPI.skill.update(currentSkill.id, skillData);
    } else {
      await window.electronAPI.skill.create(skillData);
    }
    await loadSkills();
    closeEditor();
  } catch (error) {
    alert('Error saving skill: ' + (error as Error).message);
  }
}

async function deleteSkill(): Promise<void> {
  if (!currentSkill) return;
  
  if (confirm(`Are you sure you want to delete "${currentSkill.name}"?`)) {
    try {
      await window.electronAPI.skill.delete(currentSkill.id);
      await loadSkills();
      closeEditor();
    } catch (error) {
      alert('Error deleting skill: ' + (error as Error).message);
    }
  }
}

function closeEditor(): void {
  document.getElementById('skillEditor')!.classList.add('hidden');
  document.getElementById('welcomeScreen')!.classList.remove('hidden');
  currentSkill = null;
  currentView = 'welcome';
}

function closeExecution(): void {
  document.getElementById('skillExecution')!.classList.add('hidden');
  document.getElementById('welcomeScreen')!.classList.remove('hidden');
  currentSkill = null;
  currentView = 'welcome';
}

function addParameter(): void {
  const parameters = getParametersFromForm();
  parameters.push({
    name: '',
    type: 'string',
    description: '',
    required: false
  });
  renderParameters(parameters);
}

// Export to window for inline onclick handlers
(window as any).removeParameter = function(index: number): void {
  const parameters = getParametersFromForm();
  parameters.splice(index, 1);
  renderParameters(parameters);
};

function getParametersFromForm(): SkillParameter[] {
  const paramItems = document.querySelectorAll('.parameter-item');
  const parameters: SkillParameter[] = [];

  paramItems.forEach(item => {
    const param: SkillParameter = {
      name: (item.querySelector('[data-field="name"]') as HTMLInputElement).value.trim(),
      type: (item.querySelector('[data-field="type"]') as HTMLSelectElement).value as 'string' | 'number' | 'boolean',
      description: (item.querySelector('[data-field="description"]') as HTMLInputElement).value.trim(),
      required: (item.querySelector('[data-field="required"]') as HTMLInputElement).checked
    };
    if (param.name) {
      parameters.push(param);
    }
  });

  return parameters;
}

async function executeSkill(): Promise<void> {
  if (!currentSkill) return;

  const params: Record<string, any> = {};
  currentSkill.parameters.forEach(param => {
    const element = document.getElementById(`param-${param.name}`) as HTMLInputElement | HTMLTextAreaElement;
    if (element) {
      if (param.type === 'boolean') {
        params[param.name] = (element as HTMLInputElement).checked;
      } else if (param.type === 'number') {
        params[param.name] = parseFloat(element.value);
      } else {
        params[param.name] = element.value;
      }
    }
  });

  const executeBtn = document.getElementById('executeBtn') as HTMLButtonElement;
  executeBtn.disabled = true;
  executeBtn.textContent = 'Executing...';

  try {
    const result: SkillExecutionResult = await window.electronAPI.skill.execute(currentSkill.id, params);
    
    document.getElementById('executionResult')!.classList.remove('hidden');
    
    if (result.success) {
      document.getElementById('resultContent')!.textContent = result.result || '';
      if (result.usage) {
        document.getElementById('resultUsage')!.innerHTML = `
          <strong>Token Usage:</strong> 
          Prompt: ${result.usage.promptTokens} | 
          Completion: ${result.usage.completionTokens} | 
          Total: ${result.usage.totalTokens}
        `;
      } else {
        document.getElementById('resultUsage')!.textContent = '';
      }
    } else {
      document.getElementById('resultContent')!.textContent = 'Error: ' + result.error;
      document.getElementById('resultUsage')!.textContent = '';
    }
  } catch (error) {
    document.getElementById('executionResult')!.classList.remove('hidden');
    document.getElementById('resultContent')!.textContent = 'Error: ' + (error as Error).message;
    document.getElementById('resultUsage')!.textContent = '';
  } finally {
    executeBtn.disabled = false;
    executeBtn.textContent = 'Execute';
  }
}

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

function toggleSidebar(): void {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('collapsed');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

