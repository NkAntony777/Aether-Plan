// LLM Service - 统一 LLM 接口

import type {
    LLMConfig,
    LLMProvider,
    ChatMessage,
    LLMResponse,
    IntentResult,
    ConversationContext
} from './types';
import { OpenAIProvider } from './providers/openai';
import { ClaudeProvider } from './providers/claude';
import { OllamaProvider } from './providers/ollama';
import { CONVERSATION_SYSTEM_PROMPT, BASE_SYSTEM_PROMPT } from './prompts/system';

/**
 * LLM 提供商接口
 */
interface LLMProviderInterface {
    chat(messages: ChatMessage[]): Promise<LLMResponse>;
    detectIntent(userInput: string, context?: ChatMessage[]): Promise<IntentResult | null>;
    streamChat?(messages: ChatMessage[]): AsyncGenerator<string>;
}

/**
 * LLM 服务 - 统一入口
 */
export class LLMService {
    private provider: LLMProviderInterface;
    private config: LLMConfig;
    private contextHistory: Map<string, ConversationContext> = new Map();

    constructor(config: LLMConfig) {
        this.config = config;
        this.provider = this.createProvider(config);
    }

    /**
     * 创建提供商实例
     */
    private createProvider(config: LLMConfig): LLMProviderInterface {
        switch (config.provider) {
            case 'openai':
                return new OpenAIProvider(config);
            case 'claude':
                return new ClaudeProvider(config);
            case 'ollama':
                return new OllamaProvider(config);
            default:
                throw new Error(`Unknown provider: ${config.provider}`);
        }
    }

    /**
     * 切换提供商
     */
    switchProvider(config: LLMConfig): void {
        this.config = config;
        this.provider = this.createProvider(config);
    }

    /**
     * 获取当前配置
     */
    getConfig(): LLMConfig {
        return { ...this.config };
    }

    /**
     * 意图识别
     */
    async detectIntent(
        userInput: string, 
        sessionId?: string
    ): Promise<IntentResult> {
        const context = sessionId ? this.getContext(sessionId) : undefined;
        const contextMessages = context?.messages.slice(-6); // 最近3轮对话

        const result = await this.provider.detectIntent(userInput, contextMessages);
        
        if (result) {
            return result;
        }

        // 降级：返回默认意图
        return {
            intent: 'unknown',
            confidence: 0,
            entities: {},
            needsClarification: true,
            clarificationQuestion: '抱歉，我没有理解您的意思。您能换种方式表达吗？',
        };
    }

    /**
     * 生成对话回复
     */
    async generateReply(
        userInput: string,
        sessionId: string = 'default'
    ): Promise<string> {
        const context = this.getOrCreateContext(sessionId);
        
        // 添加用户消息到上下文
        context.messages.push({ role: 'user', content: userInput });

        const messages: ChatMessage[] = [
            { role: 'system', content: CONVERSATION_SYSTEM_PROMPT },
            ...context.messages.slice(-10), // 保留最近5轮对话
        ];

        const response = await this.provider.chat(messages);

        if (response.success && response.content) {
            // 添加助手回复到上下文
            context.messages.push({ role: 'assistant', content: response.content });
            context.updatedAt = new Date();
            return response.content;
        }

        return '抱歉，我遇到了一些问题。请稍后再试。';
    }

    /**
     * 流式生成回复
     */
    async *streamReply(
        userInput: string,
        sessionId: string = 'default'
    ): AsyncGenerator<string> {
        if (!this.provider.streamChat) {
            // 如果不支持流式，降级为普通回复
            const reply = await this.generateReply(userInput, sessionId);
            yield reply;
            return;
        }

        const context = this.getOrCreateContext(sessionId);
        context.messages.push({ role: 'user', content: userInput });

        const messages: ChatMessage[] = [
            { role: 'system', content: CONVERSATION_SYSTEM_PROMPT },
            ...context.messages.slice(-10),
        ];

        let fullResponse = '';
        for await (const chunk of this.provider.streamChat(messages)) {
            fullResponse += chunk;
            yield chunk;
        }

        // 保存完整回复到上下文
        context.messages.push({ role: 'assistant', content: fullResponse });
        context.updatedAt = new Date();
    }

    /**
     * 智能回复（结合意图识别）
     */
    async smartReply(
        userInput: string,
        sessionId: string = 'default'
    ): Promise<{
        reply: string;
        intent: IntentResult;
    }> {
        // 1. 先识别意图
        const intent = await this.detectIntent(userInput, sessionId);

        // 2. 根据意图生成回复
        const context = this.getOrCreateContext(sessionId);
        context.messages.push({ role: 'user', content: userInput });

        // 构建包含意图信息的系统提示
        const intentInfo = `\n\n## 当前识别的意图\n- 意图类型: ${intent.intent}\n- 置信度: ${intent.confidence}\n- 提取的实体: ${JSON.stringify(intent.entities, null, 2)}${intent.needsClarification ? `\n- 需要澄清: ${intent.clarificationQuestion}` : ''}`;

        const messages: ChatMessage[] = [
            { role: 'system', content: BASE_SYSTEM_PROMPT + intentInfo },
            ...context.messages.slice(-10),
        ];

        const response = await this.provider.chat(messages);

        let reply: string;
        if (response.success && response.content) {
            reply = response.content;
            context.messages.push({ role: 'assistant', content: reply });
            context.updatedAt = new Date();
        } else {
            reply = '抱歉，我遇到了一些问题。请稍后再试。';
        }

        // 更新上下文中的意图信息
        context.lastIntent = intent.intent;
        context.lastEntities = intent.entities;

        return { reply, intent };
    }

    /**
     * 获取或创建会话上下文
     */
    private getOrCreateContext(sessionId: string): ConversationContext {
        if (!this.contextHistory.has(sessionId)) {
            this.contextHistory.set(sessionId, {
                sessionId,
                messages: [],
                collectedData: {},
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        return this.contextHistory.get(sessionId)!;
    }

    /**
     * 获取会话上下文
     */
    private getContext(sessionId: string): ConversationContext | undefined {
        return this.contextHistory.get(sessionId);
    }

    /**
     * 清除会话上下文
     */
    clearContext(sessionId: string): void {
        this.contextHistory.delete(sessionId);
    }

    /**
     * 清除所有上下文
     */
    clearAllContexts(): void {
        this.contextHistory.clear();
    }

    /**
     * 获取会话历史
     */
    getSessionHistory(sessionId: string): ChatMessage[] {
        const context = this.contextHistory.get(sessionId);
        return context ? [...context.messages] : [];
    }
}

// 默认配置
export const defaultLLMConfig: LLMConfig = {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:7b',
    temperature: 0.7,
    maxTokens: 2000,
};

// 单例实例
let llmServiceInstance: LLMService | null = null;

/**
 * 获取 LLM 服务单例
 */
export function getLLMService(config?: LLMConfig): LLMService {
    if (!llmServiceInstance || config) {
        llmServiceInstance = new LLMService(config || defaultLLMConfig);
    }
    return llmServiceInstance;
}

/**
 * 初始化 LLM 服务
 */
export function initLLMService(config: LLMConfig): LLMService {
    llmServiceInstance = new LLMService(config);
    return llmServiceInstance;
}

export * from './types';
export { OpenAIProvider } from './providers/openai';
export { ClaudeProvider } from './providers/claude';
export { OllamaProvider } from './providers/ollama';

// ==================== 便捷函数 ====================

/**
 * 检查 LLM 是否已配置
 */
export function isLLMConfigured(): boolean {
    try {
        const service = getLLMService();
        const config = service.getConfig();
        // 检查是否有有效的配置
        if (config.provider === 'ollama') {
            return true; // Ollama 本地运行，始终可用
        }
        return Boolean(config.apiKey);
    } catch {
        return false;
    }
}

/**
 * 调用 LLM 进行对话
 */
export async function callLLM(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; domain?: string }
): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const service = getLLMService();
        
        // 如果有 domain 选项，添加到系统提示
        const systemMessage: ChatMessage = {
            role: 'system',
            content: options?.domain 
                ? `你是一个专业的${options.domain === 'travel' ? '旅行规划' : options.domain}助手。`
                : BASE_SYSTEM_PROMPT,
        };

        const allMessages = [systemMessage, ...messages];
        
        // 使用 provider 直接调用
        const response = await service['provider'].chat(allMessages);
        
        if (response.success && response.content) {
            return { success: true, message: response.content };
        }
        
        return { success: false, error: response.error || '调用失败' };
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : '未知错误' 
        };
    }
}

/**
 * 流式调用 LLM
 */
export async function* streamCallLLM(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
): AsyncGenerator<string> {
    const service = getLLMService();
    
    if (!service['provider'].streamChat) {
        const result = await callLLM(messages, options);
        if (result.success && result.message) {
            yield result.message;
        }
        return;
    }

    const systemMessage: ChatMessage = {
        role: 'system',
        content: BASE_SYSTEM_PROMPT,
    };

    const allMessages = [systemMessage, ...messages];
    
    for await (const chunk of service['provider'].streamChat!(allMessages)) {
        yield chunk;
    }
}
