# Quick Start Guide

This guide will help you get started with LLM Skills in 5 minutes.

## Prerequisites

- Node.js 18 or later
- npm (comes with Node.js)
- An API key from at least one LLM provider

## Installation

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd llm-skills

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

### Step 2: Verify Installation

```bash
# Run verification script (Unix/macOS/Linux)
./scripts/verify.sh

# Or manually verify
npm run build
```

You should see:
```
✅ All checks passed!
```

### Step 3: Run the Application

```bash
# Development mode (with DevTools)
npm run dev

# Or production mode
npm start
```

## First-Time Setup

### 1. Configure API Keys

When you first launch the application:

1. Click the **Settings** button (⚙️) in the sidebar
2. Scroll down to "API Keys" section
3. Enter your API key for at least one provider:
   - **OpenAI**: Get from https://platform.openai.com/api-keys
   - **Anthropic**: Get from https://console.anthropic.com/
   - **Google**: Get from https://makersuite.google.com/app/apikey
   - Others as needed
4. Select your default provider and model
5. Click **Save**

### 2. Try a Default Skill

The application comes with three pre-configured skills:

1. Click **"Text Summarization"** in the sidebar
2. Select **Execute**
3. Paste some text in the input field
4. Click **Execute**
5. View the result!

## Creating Your First Skill

### Example: Email Writer

1. Click **"+ New Skill"** button

2. Fill in the details:
   - **Name**: `Professional Email Writer`
   - **Description**: `Compose professional emails based on topic and tone`
   - **Prompt Template**:
     ```
     Write a professional email about: {topic}
     
     Tone: {tone}
     Recipient: {recipient}
     
     Make it concise and well-structured.
     ```

3. Add Parameters:
   - Parameter 1:
     - Name: `topic`
     - Type: `string`
     - Description: `Main topic of the email`
     - Required: ✓
   
   - Parameter 2:
     - Name: `tone`
     - Type: `string`
     - Description: `Email tone (formal/casual/friendly)`
     - Required: ✓
   
   - Parameter 3:
     - Name: `recipient`
     - Type: `string`
     - Description: `Who is receiving the email`
     - Required: ✓

4. Configure Settings:
   - Provider: (use default or select one)
   - Model: (use default or select one)
   - Temperature: `0.7`
   - Max Tokens: `500`

5. Click **Save**

### Test Your Skill

1. Click your new skill in the sidebar
2. Select **Execute**
3. Fill in the parameters:
   - Topic: `project deadline extension`
   - Tone: `formal`
   - Recipient: `manager`
4. Click **Execute**
5. Review the generated email!

## Understanding Parameters

Parameters are placeholders in your prompt template that get replaced with actual values during execution.

### Syntax
Use curly braces: `{parameterName}`

### Example
```
Translate the following text from {sourceLang} to {targetLang}:

{text}
```

### Parameter Types
- **string**: Text input (single line or multiline)
- **number**: Numeric input
- **boolean**: Checkbox (true/false)

## Tips for Better Results

### 1. Temperature Settings
- **0.0 - 0.3**: Deterministic, consistent (good for code, translation)
- **0.4 - 0.7**: Balanced (good for most tasks)
- **0.8 - 2.0**: Creative, varied (good for brainstorming, creative writing)

### 2. Prompt Engineering
- Be specific and clear
- Provide context and examples
- Use structured output requests
- Break complex tasks into steps

### 3. Token Limits
- Set appropriate max tokens for your use case
- Check token usage in results
- Adjust if responses are cut off

## Common Use Cases

### Code Review
```
Review the following {language} code and provide feedback:

{code}

Focus on:
1. Bugs and errors
2. Code quality
3. Performance
4. Best practices
```

### Translation
```
Translate from {sourceLang} to {targetLang}:

{text}

Maintain the original tone and style.
```

### Summarization
```
Summarize the following text in {style} style:

{text}

Length: {length} sentences
```

### Data Extraction
```
Extract the following information from the text:

{fields}

Text:
{text}

Return as JSON format.
```

## Keyboard Shortcuts

- `Cmd/Ctrl + N`: New Skill
- `Cmd/Ctrl + S`: Save Skill
- `Cmd/Ctrl + ,`: Open Settings
- `Esc`: Close modal/editor

## Troubleshooting

### Issue: "API key not set"
**Solution**: Go to Settings and add your API key for the selected provider.

### Issue: "Model not found"
**Solution**: Check if the model ID is correct and supported by your provider.

### Issue: Build errors
**Solution**: 
```bash
npm run clean
npm install
npm run build
```

### Issue: Application won't start
**Solution**:
1. Check Node.js version: `node -v` (should be 18+)
2. Rebuild dependencies: `npm rebuild`
3. Clear cache and rebuild:
   ```bash
   rm -rf node_modules dist
   npm install
   npm run build
   ```

## Next Steps

- Explore the [API Documentation](API.md)
- Learn about [Architecture](ARCHITECTURE.md)
- Read [Contributing Guidelines](../CONTRIBUTING.md)
- Create more skills for your workflows!

## Getting Help

- Check the [README](../README.md) for detailed information
- Review the [FAQ section](../README_CN.md#常见问题)
- Open an issue on GitHub
- Join our community discussions

## Resources

### LLM Provider Documentation
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Google AI Docs](https://ai.google.dev/docs)

### Prompt Engineering Guides
- [OpenAI Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)
- [Anthropic Prompt Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)

---

Happy Skill Building! 🚀

