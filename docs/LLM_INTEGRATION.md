# LLM 集成使用指南

## 快速开始

### 1. 配置环境变量

复制 `.env.example` 到 `.env.local`：

```bash
cp .env.example .env.local
```

### 2. 选择 LLM 提供商

#### 选项 A: Ollama（推荐 - 免费、本地）

1. 安装 Ollama: https://ollama.ai
2. 下载模型:
   ```bash
   ollama pull qwen2.5:7b  # 中文理解好
   # 或
   ollama pull llama3.1:8b
   ```
3. 配置 `.env.local`:
   ```
   VITE_LLM_PROVIDER=ollama
   VITE_OLLAMA_BASE_URL=http://localhost:11434
   VITE_OLLAMA_MODEL=qwen2.5:7b
   ```

#### 选项 B: OpenAI

配置 `.env.local`:
```
VITE_LLM_PROVIDER=openai
VITE_OPENAI_API_KEY=sk-your-api-key
VITE_OPENAI_MODEL=gpt-4o-mini
```

#### 选项 C: Claude

配置 `.env.local`:
```
VITE_LLM_PROVIDER=claude
VITE_ANTHROPIC_API_KEY=sk-ant-your-api-key
VITE_CLAUDE_MODEL=claude-3-haiku-20240307
```

### 3. 在代码中使用

```typescript
import { 
    initAI, 
    generateResponseSmart, 
    detectIntentAsync,
    isLLMAvailable 
} from './services/aiService';

// 初始化（应用启动时调用一次）
initAI({
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:7b',
});

// 检查 LLM 是否可用
console.log('LLM Available:', isLLMAvailable());

// 意图识别
const { intent, llmResult } = await detectIntentAsync(
    '我想下个月带爸妈去三亚玩',
    {},
    'session-123'
);

console.log('Intent:', intent);
console.log('Entities:', llmResult?.entities);
// 输出:
// Intent: travel_start
// Entities: { destination: '三亚', dateRange: {...}, travelers: 3 }

// 生成智能回复
const responses = await generateResponseSmart(
    '我想去北京旅游',
    {},
    'session-123'
);

responses.forEach(response => {
    if (response.type === 'text') {
        console.log('AI:', response.content);
    } else if (response.type === 'widget') {
        console.log('Widget:', response.widgetType, response.widgetPayload);
    }
});
```

## 高级用法

### 流式回复

```typescript
import { getLLMService } from './services/llm';

const llmService = getLLMService();

// 流式生成回复
for await (const chunk of llmService.streamReply('帮我规划一次旅行')) {
    process.stdout.write(chunk); // 实时输出
}
```

### 直接使用意图识别

```typescript
import { getLLMService } from './services/llm';

const llmService = getLLMService();

const intent = await llmService.detectIntent(
    '3月15号从上海去北京，两个人，预算5000',
    'session-123'
);

// intent 结构:
// {
//   intent: 'travel_complete',
//   confidence: 0.95,
//   entities: {
//     origin: '上海',
//     destination: '北京',
//     departureDate: '2024-03-15',
//     travelers: 2,
//     budget: 5000
//   },
//   subIntents: ['search_flights', 'search_hotels']
// }
```

### 会话管理

```typescript
import { getLLMService } from './services/llm';

const llmService = getLLMService();

// 获取会话历史
const history = llmService.getSessionHistory('session-123');

// 清除会话
llmService.clearContext('session-123');
```

### 动态切换提供商

```typescript
import { getLLMService } from './services/llm';

const llmService = getLLMService();

// 切换到 OpenAI
llmService.switchProvider({
    provider: 'openai',
    apiKey: 'sk-new-key',
    model: 'gpt-4o',
});

// 切换回 Ollama
llmService.switchProvider({
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:7b',
});
```

## 性能对比

| 提供商 | 延迟 | 成本 | 隐私 | 中文理解 |
|--------|------|------|------|----------|
| Ollama (qwen2.5) | ~500ms | 免费 | ✅ 本地 | ⭐⭐⭐⭐⭐ |
| OpenAI (gpt-4o-mini) | ~300ms | $0.15/1M tokens | ❌ 云端 | ⭐⭐⭐⭐ |
| Claude (haiku) | ~400ms | $0.25/1M tokens | ❌ 云端 | ⭐⭐⭐⭐ |

## 故障排除

### Ollama 连接失败

```bash
# 检查 Ollama 是否运行
curl http://localhost:11434/api/tags

# 启动 Ollama 服务
ollama serve
```

### 意图识别不准确

1. 调整 temperature（降低可提高一致性）
2. 修改 `src/services/llm/prompts/system.ts` 中的提示词
3. 考虑使用更强的模型

### API Key 错误

确保 `.env.local` 中的 API Key 格式正确：
- OpenAI: `sk-...`
- Claude: `sk-ant-...`
