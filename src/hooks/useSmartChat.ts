// useSmartChat - 智能聊天 Hook，集成 LLM 意图识别

import { useState, useCallback, useRef } from 'react';
import { getIntentRecognizer, type IntentResult, type IntentType, type Entities } from '../router/intentRouter';
import { loadAPIConfig } from '../types/apiConfig';

export interface SmartChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    intent?: IntentType;
    entities?: Entities;
    timestamp: Date;
}

export interface SmartChatState {
    messages: SmartChatMessage[];
    currentIntent: IntentType | null;
    collectedEntities: Entities;
    isLoading: boolean;
    error: string | null;
}

export interface UseSmartChatOptions {
    sessionId?: string;
    onIntentDetected?: (result: IntentResult) => void;
    onEntityCollected?: (entities: Entities) => void;
}

export interface UseSmartChatReturn {
    // 状态
    messages: SmartChatMessage[];
    currentIntent: IntentType | null;
    collectedEntities: Entities;
    isLoading: boolean;
    error: string | null;
    
    // 方法
    sendMessage: (content: string) => Promise<IntentResult>;
    clearHistory: () => void;
    updateEntities: (entities: Partial<Entities>) => void;
    getIntentRecognizer: () => ReturnType<typeof getIntentRecognizer>;
}

/**
 * 智能聊天 Hook
 * 
 * 集成 LLM 意图识别，提供智能对话能力
 */
export function useSmartChat(options: UseSmartChatOptions = {}): UseSmartChatReturn {
    const { sessionId = 'default', onIntentDetected, onEntityCollected } = options;
    
    const [state, setState] = useState<SmartChatState>({
        messages: [],
        currentIntent: null,
        collectedEntities: {},
        isLoading: false,
        error: null,
    });
    
    const recognizerRef = useRef(getIntentRecognizer(sessionId));
    
    /**
     * 生成唯一 ID
     */
    const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    /**
     * 添加消息
     */
    const addMessage = useCallback((role: 'user' | 'assistant', content: string, intent?: IntentType, entities?: Entities) => {
        const message: SmartChatMessage = {
            id: generateId(),
            role,
            content,
            intent,
            entities,
            timestamp: new Date(),
        };
        
        setState(prev => ({
            ...prev,
            messages: [...prev.messages, message],
        }));
        
        return message;
    }, []);
    
    /**
     * 发送消息并识别意图
     */
    const sendMessage = useCallback(async (content: string): Promise<IntentResult> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        // 添加用户消息
        addMessage('user', content);
        
        try {
            // 使用意图识别器分析用户输入
            const recognizer = recognizerRef.current;
            const result = await recognizer.recognize(content);
            
            // 更新上下文
            recognizer.updateContext('user', content, result.intent, result.entities);
            
            // 更新状态
            setState(prev => ({
                ...prev,
                currentIntent: result.intent,
                collectedEntities: { ...prev.collectedEntities, ...result.entities },
                isLoading: false,
            }));
            
            // 回调
            onIntentDetected?.(result);
            onEntityCollected?.(result.entities);
            
            // 如果有建议回复，添加到消息列表
            if (result.suggestedResponse) {
                addMessage('assistant', result.suggestedResponse, result.intent, result.entities);
                recognizer.updateContext('assistant', result.suggestedResponse);
            }
            
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
            throw error;
        }
    }, [addMessage, onIntentDetected, onEntityCollected]);
    
    /**
     * 清除历史
     */
    const clearHistory = useCallback(() => {
        recognizerRef.current.clearContext();
        setState({
            messages: [],
            currentIntent: null,
            collectedEntities: {},
            isLoading: false,
            error: null,
        });
    }, []);
    
    /**
     * 更新实体
     */
    const updateEntities = useCallback((entities: Partial<Entities>) => {
        setState(prev => ({
            ...prev,
            collectedEntities: { ...prev.collectedEntities, ...entities },
        }));
        onEntityCollected?.(entities);
    }, [onEntityCollected]);
    
    return {
        messages: state.messages,
        currentIntent: state.currentIntent,
        collectedEntities: state.collectedEntities,
        isLoading: state.isLoading,
        error: state.error,
        sendMessage,
        clearHistory,
        updateEntities,
        getIntentRecognizer: () => recognizerRef.current,
    };
}

/**
 * 检查 LLM 是否已配置
 */
export function isLLMReady(): boolean {
    const config = loadAPIConfig();
    return Boolean(config.llm.apiKey || config.llm.provider === 'ollama');
}

export default useSmartChat;
