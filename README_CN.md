# LLM Skills

一个强大的基于Electron的应用，提供类似Claude Skills的功能，支持多种大语言模型API。

## 功能特性

- **多模型支持**: 集成多种大语言模型提供商，包括：
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude 3)
  - Google (Gemini)
  - DeepSeek（深度求索）
  - ZhipuAI（智谱清言 - ChatGLM）
  - Moonshot AI（月之暗面 - Kimi）

- **技能管理**: 创建、编辑和组织可复用的AI技能：
  - 自定义提示词模板与参数
  - 可配置参数（字符串、数字、布尔值）
  - 每个技能可选择不同的提供商和模型
  - 温度和token限制控制

- **友好界面**: 现代化深色主题UI：
  - 侧边栏导航快速访问技能
  - 直观的技能编辑器
  - 简单的执行界面与参数输入
  - 实时结果显示和token使用统计

- **设置管理**: 集中配置：
  - 所有提供商的API密钥
  - 默认提供商和模型选择
  - 主题偏好设置

## 安装

1. 克隆仓库：
```bash
git clone <repository-url>
cd llm-skills
```

2. 安装依赖：
```bash
npm install
```

3. 构建TypeScript代码：
```bash
npm run build
```

4. 运行应用：
```bash
npm run dev
```

## 使用方法

### 首次设置

1. 启动应用
2. 点击侧边栏的设置按钮（⚙️）
3. 添加你要使用的大模型提供商的API密钥
4. 设置默认的提供商和模型
5. 保存设置

### 创建技能

1. 点击侧边栏的"New Skill"按钮
2. 填写技能详情：
   - **Name（名称）**: 技能的描述性名称
   - **Description（描述）**: 技能的功能说明
   - **Prompt Template（提示词模板）**: 使用 `{参数名}` 格式定义参数
   - **Parameters（参数）**: 定义输入参数的名称、类型和描述
   - **Provider/Model（提供商/模型）**: 选择使用哪个大模型
   - **Temperature/Max Tokens（温度/最大token）**: 微调生成设置
3. 点击"Save"保存

### 执行技能

1. 点击侧边栏中的技能
2. 从菜单中选择"Execute"
3. 填写必需的参数
4. 点击"Execute"执行
5. 查看结果和token使用统计

### 编辑技能

1. 点击侧边栏中的技能
2. 从菜单中选择"Edit"
3. 修改内容
4. 点击"Save"保存

## 开发

### 项目结构

```
llm-skills/
├── src/
│   ├── main/              # 主进程（TypeScript）
│   │   ├── index.ts       # 主入口文件
│   │   ├── types.ts       # 类型定义
│   │   ├── skillManager.ts   # 技能管理逻辑
│   │   ├── llmManager.ts     # 大模型API集成
│   │   └── preload.ts     # IPC通信预加载脚本
│   └── renderer/          # 渲染进程（HTML/CSS/JS）
│       ├── index.html     # 主界面
│       ├── styles.css     # 样式
│       └── app.js         # 前端逻辑
├── dist/                  # TypeScript编译输出
├── package.json
├── tsconfig.json
└── README.md
```

### 脚本命令

- `npm run build` - 编译TypeScript
- `npm run watch` - 开发模式监听文件变化
- `npm run dev` - 构建并运行（开启开发工具）
- `npm start` - 运行应用
- `npm run clean` - 清理构建输出
- `npm run package` - 构建可分发包

### 添加新的大模型提供商

要添加对新大模型提供商的支持：

1. 在 `llmManager.ts` 的 `initializeProviders()` 中添加提供商定义：
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

2. 实现API集成方法：
```typescript
private async chatProviderName(
  provider: LLMProvider,
  modelId: string,
  messages: Message[],
  apiKey: string,
  options?: ChatOptions
): Promise<ChatResponse> {
  // 实现代码
}
```

3. 在 `chat()` 方法的switch语句中添加case

## API密钥安全

API密钥本地存储在应用的用户数据目录：
- macOS: `~/Library/Application Support/llm-skills/settings.json`
- Windows: `%APPDATA%/llm-skills/settings.json`
- Linux: `~/.config/llm-skills/settings.json`

**重要**: 永远不要将 `settings.json` 文件提交到版本控制系统。

## 构建分发版本

```bash
npm run package
```

构建的应用将在 `release/` 目录中。

## 许可证

MIT

## 贡献

欢迎贡献！请随时提交Pull Request。

## 常见问题

### 1. 如何获取API密钥？

- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/
- **Google**: https://makersuite.google.com/app/apikey
- **DeepSeek**: https://platform.deepseek.com/
- **ZhipuAI**: https://open.bigmodel.cn/
- **Moonshot**: https://platform.moonshot.cn/

### 2. 支持哪些参数类型？

目前支持三种参数类型：
- **string（字符串）**: 文本输入
- **number（数字）**: 数值输入
- **boolean（布尔值）**: 复选框

### 3. 如何使用参数？

在提示词模板中使用 `{参数名}` 格式，例如：
```
请将以下文本从{sourceLang}翻译成{targetLang}：

{text}
```

### 4. Temperature参数有什么作用？

Temperature控制生成的随机性：
- **0.0-0.3**: 更确定、更一致的输出（适合代码、翻译）
- **0.4-0.7**: 平衡的输出（默认值）
- **0.8-2.0**: 更有创意、更多样化的输出（适合创意写作）

## 技术栈

- **Electron**: 跨平台桌面应用框架
- **TypeScript**: 类型安全的JavaScript超集
- **Node.js**: 运行时环境
- **Axios**: HTTP客户端
- **原生CSS**: 无框架依赖的现代UI

## 路线图

- [ ] 流式响应支持
- [ ] 技能导入/导出
- [ ] 技能市场
- [ ] 多轮对话支持
- [ ] 历史记录管理
- [ ] 更多大模型提供商支持
- [ ] 插件系统
- [ ] 国际化支持

## 截图

（待添加）

## 致谢

感谢所有大语言模型提供商提供的优秀API服务。

