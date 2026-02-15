// Ollama Provider - 本地 Ollama 实现

import type { LLMConfig, ChatMessage, LLMResponse, IntentResult } from '../types';
import { INTENT_SYSTEM_PROMPT } from '../prompts/system';

/**
 * Ollama 本地模型提供商
 * 适合：无 API 费用、隐私保护、离线使用
 * 推荐模型：qwen2.5:7b（中文理解好）、llama3.1:8b
 */
export class OllamaProvider {
    private baseUrl: string;
    private model: string;
    private temperature: number;
    private maxTokens: number;

    constructor(config: LLMConfig) {
        this.baseUrl = config.baseUrl || 'http://localhost:11434';
        this.model = config.model || 'qwen2.5:7b';
        this.temperature = config.temperature ?? 0.7;
        this.maxTokens = config.maxTokens || 2000;
    }

    /**
     * 发送聊天请求
     */
    async chat(messages: ChatMessage[]): Promise<LLMResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    options: {
                        temperature: this.temperature,
                        num_predict: this.maxTokens,
                    },
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.message?.content || '';

            return {
                success: true,
                content,
                usage: {
                    promptTokens: data.prompt_eval_count || 0,
                    completionTokens: data.eval_count || 0,
                    totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
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
            
            const fullPrompt = `${INTENT_SYSTEM_PROMPT}

${contextMessages.length > 0 ? '之前的对话:\n' + contextMessages.map(m => `${m.role}: ${m.content}`).join('\n') + '\n\n' : ''}
用户输入: "${userInput}"

请分析意图并输出 JSON（只输出 JSON，不要其他文字）:`;

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: fullPrompt,
                    options: {
                        temperature: 0.3,
                        num_predict: 1000,
                    },
                    stream: false,
                    format: 'json', // Ollama 的 JSON 模式
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.response || '';

            // 尝试解析 JSON
            try {
                const intentResult = JSON.parse(content) as IntentResult;
                return intentResult;
            } catch {
                // 尝试从文本中提取 JSON
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]) as IntentResult;
                }
                throw new Error('Failed to parse JSON response');
            }
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
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    options: {
                        temperature: this.temperature,
                        num_predict: this.maxTokens,
                    },
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
                    if (line.trim()) {
                        try {
                            const data = JSON.parse(line);
                            const content = data.message?.content;
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

    /**
     * 检查 Ollama 是否可用
     */
    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * 获取可用模型列表
     */
    async listModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) return [];
            
            const data = await response.json();
            return data.models?.map((m: { name: string }) => m.name) || [];
        } catch {
            return [];
        }
    }
}

export default OllamaProvider;
