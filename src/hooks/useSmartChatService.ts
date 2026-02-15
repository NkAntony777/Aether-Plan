/**
 * useSmartChatService - 智能聊天服务 Hook
 * 
 * 完全基于 LLM 意图识别的对话 Hook
 * 替代旧的 useSmartChat 和 processUserInput 逻辑
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
    SmartChatService,
    getSmartChatService,
    createNewSession,
    type ChatMessage,
    type SmartChatConfig,
} from '../services/smartChatService';
import type { IntentResult, IntentType, Entities } from '../router/intentRouter';
import type { RouteResult } from '../router/smartRouter';

// ==================== 类型定义 ====================

export interface UseSmartChatServiceOptions {
    sessionId?: string;
    autoStart?: boolean;
    onIntentDetected?: (result: IntentResult) => void;
    onRouteComplete?: (result: RouteResult) => void;
    onMessageAdded?: (message: ChatMessage) => void;
}

export interface UseSmartChatServiceReturn {
    // 状态
    messages: ChatMessage[];
    currentIntent: IntentType | null;
    collectedEntities: Entities;
    isLoading: boolean;
    error: string | null;
    isLLMAvailable: boolean;

    // 方法
    sendMessage: (content: string) => Promise<{
        intentResult: IntentResult;
        routeResult: RouteResult;
        message: ChatMessage;
    }>;
    clearHistory: () => void;
    updateEntities: (entities: Partial<Entities>) => void;
    getService: () => SmartChatService;
    startNewSession: () => void;
}

// ==================== Hook 实现 ====================

export function useSmartChatService(
    options: UseSmartChatServiceOptions = {}
): UseSmartChatServiceReturn {
    const {
        sessionId,
        autoStart = true,
        onIntentDetected,
        onRouteComplete,
        onMessageAdded,
    } = options;

    // 状态
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentIntent, setCurrentIntent] = useState<IntentType | null>(null);
    const [collectedEntities, setCollectedEntities] = useState<Entities>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLLMAvailable, setIsLLMAvailable] = useState(false);

    // 服务引用
    const serviceRef = useRef<SmartChatService | null>(null);

    // 初始化服务
    useEffect(() => {
        const config: SmartChatConfig = {
            sessionId,
            enableLLM: true,
            onIntentDetected: (result) => {
                setCurrentIntent(result.intent);
                setCollectedEntities(prev => ({ ...prev, ...result.entities }));
                onIntentDetected?.(result);
            },
            onRouteComplete: (result) => {
                onRouteComplete?.(result);
            },
        };

        if (sessionId) {
            serviceRef.current = getSmartChatService(sessionId, config);
        } else if (autoStart) {
            serviceRef.current = createNewSession(config);
        }

        if (serviceRef.current) {
            setIsLLMAvailable(serviceRef.current.isLLMAvailable());
        }
    }, [sessionId, autoStart, onIntentDetected, onRouteComplete]);

    // 发送消息
    const sendMessage = useCallback(async (content: string) => {
        if (!serviceRef.current) {
            serviceRef.current = createNewSession({
                onIntentDetected,
                onRouteComplete,
            });
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await serviceRef.current.processInput(content);

            // 更新状态
            setMessages(serviceRef.current.getMessages());
            setCurrentIntent(result.intentResult.intent);
            setCollectedEntities(serviceRef.current.getCollectedEntities());

            // 回调
            onMessageAdded?.(result.message);

            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '未知错误';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [onIntentDetected, onRouteComplete, onMessageAdded]);

    // 清除历史
    const clearHistory = useCallback(() => {
        if (serviceRef.current) {
            serviceRef.current.clearSession();
            setMessages([]);
            setCurrentIntent(null);
            setCollectedEntities({});
            setError(null);
        }
    }, []);

    // 更新实体
    const updateEntities = useCallback((entities: Partial<Entities>) => {
        if (serviceRef.current) {
            serviceRef.current.updateEntities(entities);
            setCollectedEntities(serviceRef.current.getCollectedEntities());
        }
    }, []);

    // 获取服务实例
    const getService = useCallback(() => {
        if (!serviceRef.current) {
            serviceRef.current = createNewSession({
                onIntentDetected,
                onRouteComplete,
            });
        }
        return serviceRef.current;
    }, [onIntentDetected, onRouteComplete]);

    // 开始新会话
    const startNewSession = useCallback(() => {
        serviceRef.current = createNewSession({
            onIntentDetected,
            onRouteComplete,
        });
        setMessages([]);
        setCurrentIntent(null);
        setCollectedEntities({});
        setError(null);
        setIsLLMAvailable(serviceRef.current.isLLMAvailable());
    }, [onIntentDetected, onRouteComplete]);

    return {
        messages,
        currentIntent,
        collectedEntities,
        isLoading,
        error,
        isLLMAvailable,
        sendMessage,
        clearHistory,
        updateEntities,
        getService,
        startNewSession,
    };
}

export default useSmartChatService;
