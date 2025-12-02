# Contributing to LLM Skills

Thank you for your interest in contributing to LLM Skills! This document provides guidelines and instructions for contributing.

## Development Setup

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/yourusername/llm-skills.git
cd llm-skills
```

3. Install dependencies:
```bash
npm install
```

4. Build the project:
```bash
npm run build
```

5. Run in development mode:
```bash
npm run dev
```

## Project Structure

- `src/main/` - Main process code (TypeScript)
  - `index.ts` - Application entry point
  - `types.ts` - Type definitions
  - `skillManager.ts` - Skill CRUD operations
  - `llmManager.ts` - LLM API integrations
  - `preload.ts` - IPC bridge

- `src/renderer/` - Renderer process (UI)
  - `index.html` - Main UI structure
  - `styles.css` - Styling
  - `app.js` - Frontend logic

## Code Style

- Use TypeScript for all main process code
- Follow existing code style and conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Ensure proper type definitions

## Making Changes

1. Create a new branch for your feature:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes
3. Test thoroughly
4. Commit with clear messages:
```bash
git commit -m "Add: description of your changes"
```

5. Push to your fork:
```bash
git push origin feature/your-feature-name
```

6. Create a Pull Request

## Adding New LLM Providers

To add a new LLM provider:

1. Add the provider configuration in `llmManager.ts`:
   - Provider metadata (id, name, base URL)
   - Available models with context windows

2. Implement the API integration method:
   - Handle authentication
   - Format requests according to provider's API
   - Parse responses into standard format

3. Add provider to the switch case in `chat()` method

4. Test with a valid API key

5. Update README.md with the new provider

## Testing

Before submitting a PR:

1. Build the project: `npm run build`
2. Test the application: `npm run dev`
3. Verify all features work:
   - Create/edit/delete skills
   - Execute skills with different parameters
   - Test with multiple LLM providers
   - Check settings persistence

## Pull Request Guidelines

- Provide a clear description of changes
- Reference any related issues
- Include screenshots for UI changes
- Ensure code builds without errors
- Test your changes thoroughly

## Reporting Issues

When reporting issues, please include:

- OS and version
- Electron version
- Steps to reproduce
- Expected vs actual behavior
- Error messages or logs
- Screenshots if applicable

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## Questions?

Feel free to open an issue for discussion or ask questions.

Thank you for contributing! 🎉

