# LLM Skills

A powerful Electron-based application that provides Claude Skills-like functionality with support for multiple Large Language Model (LLM) APIs.

> 🇨🇳 [中文文档](README_CN.md) | 📖 [Quick Start](docs/QUICK_START.md) | 📚 [API Docs](docs/API.md) | 🏗️ [Architecture](docs/ARCHITECTURE.md)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-28.0-9feaf9.svg)](https://www.electronjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- **Multi-LLM Support**: Integrate with various LLM providers including:
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude 3)
  - Google (Gemini)
  - DeepSeek
  - ZhipuAI (ChatGLM)
  - Moonshot AI (Kimi)

- **Skill Management**: Create, edit, and organize reusable AI skills with:
  - Custom prompts with parameter templates
  - Configurable parameters (string, number, boolean)
  - Provider and model selection per skill
  - Temperature and token limit controls

- **User-Friendly Interface**: Modern, dark-themed UI with:
  - Sidebar navigation for quick skill access
  - Intuitive skill editor
  - Easy execution interface with parameter inputs
  - Real-time result display with token usage statistics

- **Settings Management**: Centralized configuration for:
  - API keys for all providers
  - Default provider and model selection
  - Theme preferences

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd llm-skills
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

4. Run the application:
```bash
npm run dev
```

## Usage

### First Time Setup

1. Launch the application
2. Click the Settings button (⚙️) in the sidebar
3. Add your API keys for the LLM providers you want to use
4. Set your default provider and model
5. Save settings

### Creating a Skill

1. Click "New Skill" button in the sidebar
2. Fill in the skill details:
   - **Name**: A descriptive name for your skill
   - **Description**: What the skill does
   - **Prompt Template**: Your prompt with parameters in `{paramName}` format
   - **Parameters**: Define input parameters with name, type, and description
   - **Provider/Model**: Select which LLM to use
   - **Temperature/Max Tokens**: Fine-tune the generation settings
3. Click "Save"

### Executing a Skill

1. Click on a skill in the sidebar
2. Select "Execute" from the menu
3. Fill in the required parameters
4. Click "Execute"
5. View the result and token usage statistics

### Editing a Skill

1. Click on a skill in the sidebar
2. Select "Edit" from the menu
3. Make your changes
4. Click "Save"

## Development

### Project Structure

```
llm-skills/
├── src/
│   ├── main/              # Main process (TypeScript)
│   │   ├── index.ts       # Main entry point
│   │   ├── types.ts       # Type definitions
│   │   ├── skillManager.ts   # Skill management logic
│   │   ├── llmManager.ts     # LLM API integration
│   │   └── preload.ts     # Preload script for IPC
│   └── renderer/          # Renderer process (HTML/CSS/JS)
│       ├── index.html     # Main UI
│       ├── styles.css     # Styles
│       └── app.js         # Frontend logic
├── dist/                  # Compiled TypeScript output
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

- `npm run build` - Compile TypeScript
- `npm run watch` - Watch mode for development
- `npm run dev` - Build and run with dev tools
- `npm start` - Run the application
- `npm run clean` - Clean build output
- `npm run package` - Build distributable package

### Adding a New LLM Provider

To add support for a new LLM provider:

1. Add the provider definition in `llmManager.ts` `initializeProviders()`:
```typescript
{
  id: 'provider-id',
  name: 'Provider Name',
  apiKeyName: 'PROVIDER_API_KEY',
  baseUrl: 'https://api.provider.com',
  supportStreaming: true,
  models: [
    { id: 'model-id', name: 'Model Name', contextWindow: 4096, maxOutput: 2048 }
  ]
}
```

2. Implement the API integration method:
```typescript
private async chatProviderName(
  provider: LLMProvider,
  modelId: string,
  messages: Message[],
  apiKey: string,
  options?: ChatOptions
): Promise<ChatResponse> {
  // Implementation
}
```

3. Add the case in the `chat()` method switch statement

## API Key Security

API keys are stored locally in the application's user data directory:
- macOS: `~/Library/Application Support/llm-skills/settings.json`
- Windows: `%APPDATA%/llm-skills/settings.json`
- Linux: `~/.config/llm-skills/settings.json`

**Important**: Never commit your `settings.json` file to version control.

## Building for Distribution

```bash
npm run package
```

The built application will be available in the `release/` directory.

## License

MIT

## Documentation

- 📖 [Quick Start Guide](docs/QUICK_START.md) - Get up and running in 5 minutes
- 📚 [API Documentation](docs/API.md) - Complete API reference
- 🏗️ [Architecture](docs/ARCHITECTURE.md) - System design and architecture
- 🤝 [Contributing Guide](CONTRIBUTING.md) - How to contribute
- 📝 [Changelog](CHANGELOG.md) - Version history
- 📋 [Project Index](docs/PROJECT_INDEX.md) - Complete file structure

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a Pull Request.

