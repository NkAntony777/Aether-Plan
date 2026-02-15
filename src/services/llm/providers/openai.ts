// OpenAI Provider - OpenAI API 实现

import type { LLMConfig, ChatMessage, LLMResponse, IntentResult } from '../types';
import { INTENT_SYSTEM_PROMPT } from '../prompts/system';

/**
 * OpenAI 提供商
 */
export class OpenAIProvider {
    private apiKey: string;
    private baseUrl: string;
    private model: string;
    private temperature: number;
    private maxTokens: number;

    constructor(config: LLMConfig) {
        this.apiKey = config.apiKey || '';
        this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        this.model = config.model || 'gpt-4o-mini';
        this.temperature = config.temperature ?? 0.7;
        this.maxTokens = config.maxTokens || 2000;
    }

    /**
     * 发送聊天请求
     */
    async chat(messages: ChatMessage[]): Promise<LLMResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    temperature: this.temperature,
                    max_tokens: this.maxTokens,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'OpenAI API error');
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content || '';

            return {
                success: true,
                content,
                usage: {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * 意图识别（使用 JSON 模式）
     */
    async detectIntent(userInput: string, context?: ChatMessage[]): Promise<IntentResult | null> {
        try {
            const messages: ChatMessage[] = [
                { role: 'system', content: INTENT_SYSTEM_PROMPT },
                ...(context || []),
                { role: 'user', content: userInput },
            ];

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    temperature: 0.3, // 意图识别用较低温度
                    max_tokens: 1000,
                    response_format: { type: 'json_object' },
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'OpenAI API error');
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content || '';

            // 解析 JSON 响应
            const intentResult = JSON.parse(content) as IntentResult;
            return intentResult;
        } catch (error) {
            console.error('Intent detection error:', error);
            return null;
        }
    }

    /**
     * 流式聊天（返回 ReadableStream）
     */
    async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    temperature: this.temperature,
                    max_tokens: this.maxTokens,
                    stream: true,
                }),
            });

            if (!response.ok) {
                throw new Error('Stream request failed');
            }

            const reader = response.body?.getReader();
            if (!reader) return;

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') return;
                        
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content;
                            if (content) yield content;
                        } catch {
                            // 忽略解析错误
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Stream error:', error);
        }
    }
}

export default OpenAIProvider;
