// Claude Provider - Anthropic Claude API 实现

import type { LLMConfig, ChatMessage, LLMResponse, IntentResult } from '../types';
import { INTENT_SYSTEM_PROMPT } from '../prompts/system';

/**
 * Claude 提供商
 */
export class ClaudeProvider {
    private apiKey: string;
    private baseUrl: string;
    private model: string;
    private maxTokens: number;

    constructor(config: LLMConfig) {
        this.apiKey = config.apiKey || '';
        this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
        this.model = config.model || 'claude-3-haiku-20240307';
        this.maxTokens = config.maxTokens || 2000;
    }

    /**
     * 发送聊天请求
     */
    async chat(messages: ChatMessage[]): Promise<LLMResponse> {
        try {
            // Claude API 需要分离 system 消息
            const systemMessage = messages.find(m => m.role === 'system');
            const otherMessages = messages.filter(m => m.role !== 'system');

            const response = await fetch(`${this.baseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: this.maxTokens,
                    system: systemMessage?.content,
                    messages: otherMessages.map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Claude API error');
            }

            const data = await response.json();
            const content = data.content[0]?.text || '';

            return {
                success: true,
                content,
                usage: {
                    promptTokens: data.usage?.input_tokens || 0,
                    completionTokens: data.usage?.output_tokens || 0,
                    totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
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
     * 意图识别
     */
    async detectIntent(userInput: string, context?: ChatMessage[]): Promise<IntentResult | null> {
        try {
            const contextMessages = context || [];
            const contextStr = contextMessages.length > 0 
                ? `\n\n之前的对话:\n${contextMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`
                : '';

            const response = await fetch(`${this.baseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 1000,
                    system: INTENT_SYSTEM_PROMPT,
                    messages: [{
                        role: 'user',
                        content: `${contextStr}\n\n用户输入: "${userInput}"\n\n请分析意图并输出 JSON:`,
                    }],
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Claude API error');
            }

            const data = await response.json();
            const content = data.content[0]?.text || '';

            // 提取 JSON（Claude 可能会包裹在 markdown 代码块中）
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
            
            const intentResult = JSON.parse(jsonStr) as IntentResult;
            return intentResult;
        } catch (error) {
            console.error('Intent detection error:', error);
            return null;
        }
    }

    /**
     * 流式聊天
     */
    async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
        try {
            const systemMessage = messages.find(m => m.role === 'system');
            const otherMessages = messages.filter(m => m.role !== 'system');

            const response = await fetch(`${this.baseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: this.maxTokens,
                    system: systemMessage?.content,
                    messages: otherMessages.map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
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
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.type === 'content_block_delta') {
                                const content = parsed.delta?.text;
                                if (content) yield content;
                            }
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

export default ClaudeProvider;
