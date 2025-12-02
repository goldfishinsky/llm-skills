# API Documentation

## Skill Manager API

### getAllSkills()
Get all skills from the database.

**Returns**: `Skill[]`

### getSkill(skillId: string)
Get a specific skill by ID.

**Parameters**:
- `skillId`: Unique identifier of the skill

**Returns**: `Skill | null`

### createSkill(skillData)
Create a new skill.

**Parameters**:
- `skillData`: Skill object without id, createdAt, updatedAt

**Returns**: `Skill`

### updateSkill(skillId: string, skillData)
Update an existing skill.

**Parameters**:
- `skillId`: Unique identifier of the skill
- `skillData`: Partial skill object with fields to update

**Returns**: `Skill`

### deleteSkill(skillId: string)
Delete a skill.

**Parameters**:
- `skillId`: Unique identifier of the skill

**Returns**: `boolean` - Success status

### executeSkill(skillId: string, params)
Execute a skill with given parameters.

**Parameters**:
- `skillId`: Unique identifier of the skill
- `params`: Object with parameter values

**Returns**: `SkillExecutionResult`

## LLM Manager API

### getProviders()
Get list of all available LLM providers.

**Returns**: `LLMProvider[]`

### getModels(providerId: string)
Get available models for a specific provider.

**Parameters**:
- `providerId`: Provider identifier

**Returns**: `LLMModel[]`

### setApiKey(providerId: string, apiKey: string)
Set API key for a provider.

**Parameters**:
- `providerId`: Provider identifier
- `apiKey`: API key string

**Returns**: `void`

### chat(providerId, modelId, messages, options)
Send chat completion request to LLM.

**Parameters**:
- `providerId`: Provider identifier
- `modelId`: Model identifier
- `messages`: Array of Message objects
- `options`: Optional ChatOptions

**Returns**: `Promise<ChatResponse>`

### getSettings()
Get current application settings.

**Returns**: `Settings`

### saveSettings(settings)
Save application settings.

**Parameters**:
- `settings`: Settings object

**Returns**: `void`

## Type Definitions

### Skill
```typescript
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
```

### SkillParameter
```typescript
interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
}
```

### Message
```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### ChatOptions
```typescript
interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  stopSequences?: string[];
}
```

### ChatResponse
```typescript
interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}
```

### Settings
```typescript
interface Settings {
  apiKeys: Record<string, string>;
  defaultProvider: string;
  defaultModel: string;
  theme: 'light' | 'dark' | 'auto';
}
```

## IPC Communication

The application uses Electron's IPC for communication between main and renderer processes.

### Available IPC Channels

- `skill:getAll` - Get all skills
- `skill:get` - Get specific skill
- `skill:create` - Create new skill
- `skill:update` - Update skill
- `skill:delete` - Delete skill
- `skill:execute` - Execute skill

- `llm:getProviders` - Get LLM providers
- `llm:setApiKey` - Set API key
- `llm:chat` - Send chat request
- `llm:getModels` - Get models for provider

- `settings:get` - Get settings
- `settings:save` - Save settings

## Error Handling

All API methods that can fail return appropriate error objects or throw exceptions that should be caught and handled by the caller.

Example error handling:

```javascript
try {
  const result = await window.electronAPI.skill.execute(skillId, params);
  if (!result.success) {
    console.error('Execution failed:', result.error);
  }
} catch (error) {
  console.error('API call failed:', error);
}
```

