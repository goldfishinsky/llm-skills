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
// State management
let currentSkill: Skill | null = null;
let skills: Skill[] = [];
let providers: LLMProvider[] = [];
let settings: Settings | null = null;

// Initialize app
async function init(): Promise<void> {
  await loadProviders();
  await loadSettings();
  await loadSkills();
  setupEventListeners();
  
  // Show dashboard by default
  showDashboard();
}

// Load data
async function loadSkills(): Promise<void> {
  skills = await window.electronAPI.skill.getAll();
  renderSkillsDashboard();
}

async function loadProviders(): Promise<void> {
  providers = await window.electronAPI.llm.getProviders();
}

async function loadSettings(): Promise<void> {
  settings = await window.electronAPI.settings.get();
}

// Render functions
function renderSkillsDashboard(): void {
  const skillsGrid = document.getElementById('skillsGrid')!;
  skillsGrid.innerHTML = '';

  if (skills.length === 0) {
    skillsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
        <p>No skills yet. Click "New Skill" to create one.</p>
      </div>
    `;
    return;
  }

  skills.forEach(skill => {
    const card = document.createElement('div');
    card.className = 'skill-card';
    card.innerHTML = `
      <div class="skill-card-header">
        <h3>${escapeHtml(skill.name)}</h3>
      </div>
      <p>${escapeHtml(skill.description || 'No description')}</p>
      <div class="skill-card-actions">
        <button class="btn btn-primary execute-skill-btn" data-id="${skill.id}">Execute</button>
        <button class="btn btn-secondary edit-skill-btn" data-id="${skill.id}">Edit</button>
      </div>
    `;
    
    // Add event listeners for buttons
    card.querySelector('.execute-skill-btn')!.addEventListener('click', (e) => {
      e.stopPropagation();
      showExecution(skill);
    });
    
    card.querySelector('.edit-skill-btn')!.addEventListener('click', (e) => {
      e.stopPropagation();
      showEditor(skill);
    });

    skillsGrid.appendChild(card);
  });
}

function showDashboard(): void {
  document.getElementById('skillsDashboard')!.classList.remove('hidden');
  document.getElementById('skillEditor')!.classList.add('hidden');
  document.getElementById('skillExecution')!.classList.add('hidden');
  currentSkill = null;
}

function showEditor(skill: Skill | null = null): void {
  currentSkill = skill;

  document.getElementById('skillsDashboard')!.classList.add('hidden');
  document.getElementById('skillExecution')!.classList.add('hidden');
  document.getElementById('skillEditor')!.classList.remove('hidden');

  if (skill) {
    (document.getElementById('skillName') as HTMLInputElement).value = skill.name;
    (document.getElementById('skillDescription') as HTMLTextAreaElement).value = skill.description;
    (document.getElementById('skillPrompt') as HTMLTextAreaElement).value = skill.prompt;
    (document.getElementById('skillTemperature') as HTMLInputElement).value = String(skill.temperature ?? 0.7);
    (document.getElementById('skillMaxTokens') as HTMLInputElement).value = String(skill.maxTokens ?? 2000);
    (document.getElementById('skillApiKey') as HTMLInputElement).value = skill.apiKey || '';
    
    renderProviderSelect();
    (document.getElementById('skillProvider') as HTMLSelectElement).value = skill.provider || settings!.defaultProvider;
    updateModelSelect();
    (document.getElementById('skillModel') as HTMLSelectElement).value = skill.model || settings!.defaultModel;
    
    renderParameters(skill.parameters);
    (document.getElementById('deleteSkillBtn') as HTMLButtonElement).style.display = 'flex';
  } else {
    (document.getElementById('skillName') as HTMLInputElement).value = '';
    (document.getElementById('skillDescription') as HTMLTextAreaElement).value = '';
    (document.getElementById('skillPrompt') as HTMLTextAreaElement).value = '';
    (document.getElementById('skillTemperature') as HTMLInputElement).value = '0.7';
    (document.getElementById('skillMaxTokens') as HTMLInputElement).value = '2000';
    (document.getElementById('skillApiKey') as HTMLInputElement).value = '';
    
    renderProviderSelect();
    (document.getElementById('skillProvider') as HTMLSelectElement).value = settings!.defaultProvider;
    updateModelSelect();
    
    renderParameters([]);
    (document.getElementById('deleteSkillBtn') as HTMLButtonElement).style.display = 'none';
  }
}

function showExecution(skill: Skill): void {
  currentSkill = skill;

  document.getElementById('skillsDashboard')!.classList.add('hidden');
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
  document.getElementById('userProfileBtn')!.addEventListener('click', showSettings);
  
  document.getElementById('saveSkillBtn')!.addEventListener('click', saveSkill);
  document.getElementById('deleteSkillBtn')!.addEventListener('click', deleteSkill);
  document.getElementById('closeEditorBtn')!.addEventListener('click', showDashboard);
  
  document.getElementById('addParameterBtn')!.addEventListener('click', addParameter);
  document.getElementById('skillProvider')!.addEventListener('change', updateModelSelect);
  
  document.getElementById('executeBtn')!.addEventListener('click', executeSkill);
  document.getElementById('closeExecutionBtn')!.addEventListener('click', showDashboard);
  
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
  
  const provider = (document.getElementById('skillProvider') as HTMLSelectElement).value;
  const model = (document.getElementById('skillModel') as HTMLSelectElement).value;
  const temperature = parseFloat((document.getElementById('skillTemperature') as HTMLInputElement).value);
  const maxTokens = parseInt((document.getElementById('skillMaxTokens') as HTMLInputElement).value);
  const apiKey = (document.getElementById('skillApiKey') as HTMLInputElement).value;

  const skillData = {
    name,
    description: (document.getElementById('skillDescription') as HTMLTextAreaElement).value.trim(),
    prompt: (document.getElementById('skillPrompt') as HTMLTextAreaElement).value.trim(),
    parameters,
    provider,
    model,
    temperature,
    maxTokens,
    apiKey: apiKey || undefined, // Only include if not empty
  };

  try {
    if (currentSkill) {
      await window.electronAPI.skill.update(currentSkill.id, skillData);
    } else {
      await window.electronAPI.skill.create(skillData);
    }
    await loadSkills();
    showDashboard();
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
      showDashboard();
    } catch (error) {
      alert('Error deleting skill: ' + (error as Error).message);
    }
  }
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

  // Show result area and clear previous content
  const resultElement = document.getElementById('executionResult')!;
  const resultContent = document.getElementById('resultContent')!;
  resultElement.classList.remove('hidden');
  resultContent.textContent = '⏳ Starting execution...';

  // Listen for progress updates
  const progressListener = (_event: any, message: string) => {
    resultContent.textContent += '\n' + message;
  };
  window.electronAPI.onProgress(progressListener);

  try {
    const result: SkillExecutionResult = await window.electronAPI.skill.execute(currentSkill.id, params);
    
    // Remove progress listener
    window.electronAPI.removeProgressListener(progressListener);
    
    if (result.success) {
      resultContent.textContent = result.result || '';
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
      resultContent.textContent = 'Error: ' + result.error;
      document.getElementById('resultUsage')!.textContent = '';
    }
  } catch (error) {
    window.electronAPI.removeProgressListener(progressListener);
    resultContent.textContent = 'Error: ' + (error as Error).message;
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
