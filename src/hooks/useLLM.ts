// useLLM Hook - React Hook for LLM Service

import { useState, useCallback, useEffect } from 'react';
import { 
    initAI, 
    generateResponseSmart, 
    detectIntentAsync, 
    isLLMAvailable,
    type AIResponse,
    type IntentResult,
    type LLMConfig,
} from '../services/aiService';
import { getLLMService } from '../services/llm';

/**
 * LLM Hook 配置
 */
interface UseLLMConfig {
    sessionId?: string;
    provider?: 'openai' | 'claude' | 'ollama';
    apiKey?: string;
    baseUrl?: string;
    model?: string;
}

/**
 * LLM Hook 返回值
 */
interface UseLLMReturn {
    // 状态
    isLoading: boolean;
    error: string | null;
    isAvailable: boolean;
    
    // 方法
    sendMessage: (message: string) => Promise<AIResponse[]>;
    detectIntent: (message: string) => Promise<{ intent: string; entities?: IntentResult['entities'] }>;
    streamMessage: (message: string, onChunk: (chunk: string) => void) => Promise<void>;
    clearHistory: () => void;
    getHistory: () => Array<{ role: string; content: string }>;
}

/**
 * useLLM Hook
 * 
 * @example
 * ```tsx
 * const { sendMessage, isLoading, isAvailable } = useLLM({
 *     provider: 'ollama',
 *     sessionId: 'user-123',
 * });
 * 
 * const handleSend = async () => {
 *     const responses = await sendMessage('我想去北京旅游');
 *     responses.forEach(r => {
 *         if (r.type === 'text') console.log(r.content);
 *     });
 * };
 * ```
 */
export function useLLM(config: UseLLMConfig = {}): UseLLMReturn {
    const {
        sessionId = 'default',
        provider = 'ollama',
        apiKey,
        baseUrl,
        model,
    } = config;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAvailable, setIsAvailable] = useState(false);

    // 初始化 LLM 服务
    useEffect(() => {
        const llmConfig: LLMConfig = {
            provider,
            apiKey,
            baseUrl,
            model: model || (provider === 'ollama' ? 'qwen2.5:7b' : undefined),
        };

        initAI(llmConfig);
        setIsAvailable(isLLMAvailable());

        // 如果是 Ollama，检查是否可用
        if (provider === 'ollama') {
            checkOllamaAvailability(baseUrl || 'http://localhost:11434');
        }
    }, [provider, apiKey, baseUrl, model]);

    // 检查 Ollama 可用性
    const checkOllamaAvailability = async (url: string) => {
        try {
            const response = await fetch(`${url}/api/tags`);
            setIsAvailable(response.ok);
        } catch {
            setIsAvailable(false);
            setError('Ollama 服务不可用，请确保 Ollama 正在运行');
        }
    };

    // 发送消息并获取响应
    const sendMessage = useCallback(async (message: string): Promise<AIResponse[]> => {
        setIsLoading(true);
        setError(null);

        try {
            const responses = await generateResponseSmart(message, {}, sessionId);
            return responses;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);
            return [{
                type: 'text',
                content: '抱歉，我遇到了一些问题。请稍后再试。',
            }];
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    // 意图识别
    const detectIntent = useCallback(async (message: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await detectIntentAsync(message, {}, sessionId);
            return {
                intent: result.intent,
                entities: result.llmResult?.entities,
            };
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);
            return { intent: 'unknown' };
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    // 流式消息
    const streamMessage = useCallback(async (
        message: string,
        onChunk: (chunk: string) => void
    ): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            const llmService = getLLMService();
            for await (const chunk of llmService.streamReply(message, sessionId)) {
                onChunk(chunk);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    // 清除历史
    const clearHistory = useCallback(() => {
        const llmService = getLLMService();
        llmService.clearContext(sessionId);
    }, [sessionId]);

    // 获取历史
    const getHistory = useCallback(() => {
        const llmService = getLLMService();
        return llmService.getSessionHistory(sessionId);
    }, [sessionId]);

    return {
        isLoading,
        error,
        isAvailable,
        sendMessage,
        detectIntent,
        streamMessage,
        clearHistory,
        getHistory,
    };
}

/**
 * useIntent Hook - 仅用于意图识别
 * 
 * @example
 * ```tsx
 * const { detect, intent, entities, isLoading } = useIntent();
 * 
 * await detect('我想去三亚玩');
 * console.log(intent, entities);
 * ```
 */
export function useIntent(sessionId: string = 'default') {
    const [intent, setIntent] = useState<string | null>(null);
    const [entities, setEntities] = useState<IntentResult['entities'] | null>(null);
    const [confidence, setConfidence] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);

    const detect = useCallback(async (message: string) => {
        setIsLoading(true);
        try {
            const result = await detectIntentAsync(message, {}, sessionId);
            setIntent(result.intent);
            if (result.llmResult) {
                setEntities(result.llmResult.entities);
                setConfidence(result.llmResult.confidence);
            }
        } catch (error) {
            console.error('Intent detection failed:', error);
            setIntent('unknown');
            setConfidence(0);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    const reset = useCallback(() => {
        setIntent(null);
        setEntities(null);
        setConfidence(0);
    }, []);

    return {
        detect,
        reset,
        intent,
        entities,
        confidence,
        isLoading,
    };
}

export default useLLM;
