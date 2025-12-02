# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-02

### Added
- Initial release of LLM Skills
- Electron-based desktop application
- Full TypeScript support for both main and renderer processes
- Support for multiple LLM providers:
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude 3 Opus, Sonnet, Haiku)
  - Google (Gemini Pro)
  - DeepSeek (Chat, Coder)
  - ZhipuAI (GLM-4, GLM-3)
  - Moonshot AI (Kimi 8K, 32K, 128K)
- Skill management system:
  - Create, read, update, delete skills
  - Custom prompt templates with parameter substitution
  - Configurable parameters (string, number, boolean)
  - Per-skill provider and model selection
  - Temperature and max tokens control
- User interface:
  - Modern dark theme
  - Sidebar navigation
  - Skill editor
  - Execution interface with parameter inputs
  - Result display with token usage statistics
- Settings management:
  - API key storage
  - Default provider/model selection
  - Theme preferences
- Three default skills:
  - Code Review
  - Text Summarization
  - Language Translation
- Documentation:
  - README (English and Chinese)
  - API documentation
  - Architecture documentation
  - Contributing guidelines
- Build system:
  - TypeScript compilation
  - Electron packaging
  - Verification script

### Security
- Context isolation enabled
- Node integration disabled in renderer
- Secure IPC communication via preload script
- Local API key storage

## [Unreleased]

### Planned Features
- [ ] Streaming response support
- [ ] Skill import/export
- [ ] Skill marketplace
- [ ] Multi-turn conversation support
- [ ] History management
- [ ] Additional LLM providers
- [ ] Plugin system
- [ ] Internationalization (i18n)
- [ ] Dark/Light theme toggle
- [ ] Skill templates library
- [ ] Batch execution
- [ ] API usage analytics
- [ ] Automated testing suite

