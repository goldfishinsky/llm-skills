# Architecture Documentation

## Overview

LLM Skills is built using Electron with a clear separation between main and renderer processes. The architecture follows best practices for security and modularity.

## Process Architecture

```
┌─────────────────────────────────────────┐
│         Main Process (Node.js)          │
│  ┌─────────────────────────────────┐   │
│  │       index.ts (Entry)          │   │
│  └──────────┬──────────────────────┘   │
│             │                            │
│    ┌────────┴────────┐                  │
│    │                 │                  │
│  ┌─▼──────────┐  ┌──▼──────────┐      │
│  │ Skill      │  │ LLM         │      │
│  │ Manager    │  │ Manager     │      │
│  └────────────┘  └─────────────┘      │
└─────────────────────────────────────────┘
              │
              │ IPC (Context Bridge)
              │
┌─────────────▼───────────────────────────┐
│      Renderer Process (Chromium)        │
│  ┌─────────────────────────────────┐   │
│  │      index.html (UI)            │   │
│  │      ├── styles.css             │   │
│  │      └── app.js                 │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Main Process Components

### index.ts
- Application lifecycle management
- Window creation and management
- IPC handler registration
- Coordinates between SkillManager and LLMManager

### skillManager.ts
- CRUD operations for skills
- Skill execution logic
- Local storage management (skills.json)
- Parameter validation

### llmManager.ts
- LLM provider abstractions
- API client implementations
- Settings management
- API key storage

### preload.ts
- Context bridge setup
- Exposes safe API to renderer
- Type-safe IPC communication

## Renderer Process Components

### index.html
- Application structure
- UI layout
- Modal dialogs

### styles.css
- Dark theme implementation
- Responsive design
- Component styling

### app.js
- UI state management
- Event handling
- API calls to main process
- DOM manipulation

## Data Flow

### Creating a Skill

```
User Input (UI)
    │
    ▼
app.js (validate & format)
    │
    ▼
IPC: skill:create
    │
    ▼
index.ts (IPC handler)
    │
    ▼
skillManager.createSkill()
    │
    ▼
Save to skills.json
    │
    ▼
Return created skill
    │
    ▼
Update UI
```

### Executing a Skill

```
User clicks Execute
    │
    ▼
app.js (collect parameters)
    │
    ▼
IPC: skill:execute
    │
    ▼
skillManager.executeSkill()
    │
    ├──▶ Validate parameters
    │
    ├──▶ Format prompt
    │
    └──▶ llmManager.chat()
         │
         ├──▶ Get API key
         │
         ├──▶ Call LLM API
         │
         └──▶ Parse response
              │
              ▼
         Return result
              │
              ▼
         Display in UI
```

## Security Model

### Context Isolation
- `nodeIntegration: false` - Renderer cannot access Node.js APIs
- `contextIsolation: true` - Main and renderer contexts are separate
- `preload.js` - Only bridge for controlled communication

### API Key Storage
- Stored in app's userData directory
- Not accessible from renderer process directly
- Read/write only through IPC handlers

### Input Validation
- Parameter validation in skillManager
- Type checking with TypeScript
- Sanitization before display

## Storage

### File Structure
```
userData/
├── skills.json        # All skills data
└── settings.json      # App settings and API keys
```

### skills.json Format
```json
[
  {
    "id": "skill_123",
    "name": "Code Review",
    "description": "...",
    "prompt": "...",
    "parameters": [...],
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
]
```

### settings.json Format
```json
{
  "apiKeys": {
    "openai": "sk-...",
    "anthropic": "sk-ant-..."
  },
  "defaultProvider": "openai",
  "defaultModel": "gpt-3.5-turbo",
  "theme": "dark"
}
```

## Extension Points

### Adding LLM Providers

1. **Register Provider** in `llmManager.ts`:
```typescript
this.providers.set('newprovider', {
  id: 'newprovider',
  name: 'New Provider',
  // ... configuration
});
```

2. **Implement API Client**:
```typescript
private async chatNewProvider(...): Promise<ChatResponse> {
  // Implementation
}
```

3. **Add to Router**:
```typescript
case 'newprovider':
  return this.chatNewProvider(...);
```

### Adding Parameter Types

1. Update `SkillParameter` type in `types.ts`
2. Add UI input in `renderExecutionInputs()` in `app.js`
3. Add parameter extraction logic in `getParametersFromForm()`

## Build Process

```
TypeScript Source (src/main/*.ts)
    │
    ▼
TypeScript Compiler (tsc)
    │
    ▼
JavaScript Output (dist/main/*.js)
    │
    ▼
Electron Builder
    │
    ▼
Platform-specific Package (release/)
```

## Testing Strategy

### Unit Tests (Recommended)
- Test SkillManager CRUD operations
- Test LLM API clients
- Test parameter validation

### Integration Tests
- Test IPC communication
- Test skill execution flow
- Test settings persistence

### E2E Tests
- Test UI workflows
- Test with real API calls (with test keys)

## Performance Considerations

- Skills loaded once at startup
- Settings cached in memory
- Lazy loading of UI components
- Minimal main process blocking

## Error Handling

### Main Process
- Try-catch in IPC handlers
- Error logging to console
- Return error objects to renderer

### Renderer Process
- Try-catch around API calls
- User-friendly error messages
- Error state in UI

## Future Improvements

- [ ] Streaming responses
- [ ] Database instead of JSON files
- [ ] Plugin system with sandboxing
- [ ] Automatic updates
- [ ] Telemetry and analytics
- [ ] Multi-window support

