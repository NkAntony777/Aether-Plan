/**
 * Smart Chat Service - 统一智能聊天服务
 *
 * 完全基于 LLM 意图识别的对话系统
 * 替代旧的 detectIntentLocally 逻辑
 */

import { getIntentRecognizer, type IntentResult, type IntentType, type Entities } from '../router/intentRouter';
import { getSmartRouter, type RouteResult } from '../router/smartRouter';
import { isLLMConfigured } from './llm';

// ==================== 类型定义 ====================

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    intent?: IntentType;
    entities?: Entities;
    timestamp: Date;
    widget?: RouteResult['widget'];
}

export interface SmartChatSession {
    sessionId: string;
    messages: ChatMessage[];
    currentIntent: IntentType | null;
    collectedEntities: Entities;
    createdAt: Date;
    updatedAt: Date;
}

export interface SmartChatConfig {
    sessionId?: string;
    enableLLM?: boolean;
    onIntentDetected?: (result: IntentResult) => void;
    onRouteComplete?: (result: RouteResult) => void;
}

// ==================== 智能聊天服务类 ====================

export class SmartChatService {
    private sessionId: string;
    private recognizer: ReturnType<typeof getIntentRecognizer>;
    private router: ReturnType<typeof getSmartRouter>;
    private messages: ChatMessage[] = [];
    private config: SmartChatConfig;

    constructor(config: SmartChatConfig = {}) {
        this.sessionId = config.sessionId || this.generateSessionId();
        this.config = config;
        this.recognizer = getIntentRecognizer(this.sessionId);
        this.router = getSmartRouter(this.sessionId);
    }

    /**
     * 处理用户输入
     */
    async processInput(userInput: string): Promise<{
        intentResult: IntentResult;
        routeResult: RouteResult;
        message: ChatMessage;
    }> {
        // 1. 添加用户消息
        const userMessage = this.addMessage('user', userInput);

        // 2. 意图识别
        const intentResult = await this.recognizer.recognize(userInput);
        
        // 更新上下文
        this.recognizer.updateContext('user', userInput, intentResult.intent, intentResult.entities);

        // 3. 路由处理
        const routeResult = await this.router.route(intentResult);

        // 4. 生成回复消息
        const assistantMessage = this.addMessage(
            'assistant',
            routeResult.response,
            intentResult.intent,
            routeResult.updatedEntities
        );

        // 5. 如果有 widget，附加到消息
        if (routeResult.widget) {
            assistantMessage.widget = routeResult.widget;
        }

        // 6. 更新路由上下文
        this.router.addHistory('user', userInput);
        this.router.addHistory('assistant', routeResult.response);
        if (routeResult.updatedEntities) {
            this.router.updateEntities(routeResult.updatedEntities);
        }

        // 7. 回调
        this.config.onIntentDetected?.(intentResult);
        this.config.onRouteComplete?.(routeResult);

        return {
            intentResult,
            routeResult,
            message: assistantMessage,
        };
    }

    /**
     * 添加消息
     */
    private addMessage(
        role: 'user' | 'assistant' | 'system',
        content: string,
        intent?: IntentType,
        entities?: Entities
    ): ChatMessage {
        const message: ChatMessage = {
            id: this.generateMessageId(),
            role,
            content,
            intent,
            entities,
            timestamp: new Date(),
        };
        this.messages.push(message);
        return message;
    }

    /**
     * 获取所有消息
     */
    getMessages(): ChatMessage[] {
        return [...this.messages];
    }

    /**
     * 获取当前意图
     */
    getCurrentIntent(): IntentType | null {
        return this.recognizer.getContext().currentState.activeIntent || null;
    }

    /**
     * 获取已收集的实体
     */
    getCollectedEntities(): Entities {
        return {
            ...this.recognizer.getContext().currentState.collectedEntities,
        };
    }

    /**
     * 手动更新实体
     */
    updateEntities(entities: Partial<Entities>) {
        this.recognizer.getContext().currentState.collectedEntities = {
            ...this.recognizer.getContext().currentState.collectedEntities,
            ...entities,
        };
        this.router.updateEntities(entities);
    }

    /**
     * 清除会话
     */
    clearSession() {
        this.messages = [];
        this.recognizer.clearContext();
        this.router.clearContext();
    }

    /**
     * 获取会话信息
     */
    getSession(): SmartChatSession {
        return {
            sessionId: this.sessionId,
            messages: this.messages,
            currentIntent: this.getCurrentIntent(),
            collectedEntities: this.getCollectedEntities(),
            createdAt: this.messages[0]?.timestamp || new Date(),
            updatedAt: new Date(),
        };
    }

    /**
     * 检查 LLM 是否可用
     */
    isLLMAvailable(): boolean {
        return isLLMConfigured();
    }

    /**
     * 生成会话 ID
     */
    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 生成消息 ID
     */
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ==================== 全局实例管理 ====================

const sessions = new Map<string, SmartChatService>();

export function getSmartChatService(sessionId?: string, config?: SmartChatConfig): SmartChatService {
    const id = sessionId || 'default';
    
    if (!sessions.has(id)) {
        sessions.set(id, new SmartChatService({ ...config, sessionId: id }));
    }
    
    return sessions.get(id)!;
}

export function createNewSession(config?: SmartChatConfig): SmartChatService {
    const service = new SmartChatService(config);
    sessions.set(service.getSession().sessionId, service);
    return service;
}

// ==================== 便捷函数 ====================

/**
 * 快速意图识别
 */
export async function quickRecognize(input: string): Promise<IntentResult> {
    const recognizer = getIntentRecognizer();
    return recognizer.recognize(input);
}

/**
 * 快速路由处理
 */
export async function quickRoute(input: string): Promise<RouteResult> {
    const service = getSmartChatService();
    const { routeResult } = await service.processInput(input);
    return routeResult;
}

export default SmartChatService;
