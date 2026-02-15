// LLM Chat Example Component
// 示例组件：展示如何使用 LLM 服务

import React, { useState, useRef, useEffect } from 'react';
import { useLLM, useIntent } from '../hooks/useLLM';
import type { AIResponse } from '../services/aiService';

/**
 * LLM 聊天示例组件
 */
export const LLMChatExample: React.FC = () => {
    const [messages, setMessages] = useState<Array<{
        role: 'user' | 'assistant';
        content: string;
        widgets?: AIResponse[];
    }>>([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { sendMessage, isLoading, error, isAvailable } = useLLM({
        provider: 'ollama',
        sessionId: 'demo-session',
    });

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');

        // 添加用户消息
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        // 获取 AI 响应
        const responses = await sendMessage(userMessage);

        // 处理响应
        const textResponse = responses.find(r => r.type === 'text');
        const widgetResponses = responses.filter(r => r.type === 'widget');

        setMessages(prev => [...prev, {
            role: 'assistant',
            content: textResponse?.content || '',
            widgets: widgetResponses,
        }]);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-[600px] max-w-2xl mx-auto border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4">
                <h2 className="text-lg font-semibold">🤖 Aether Plan AI 助手</h2>
                <div className="flex items-center gap-2 text-sm opacity-90">
                    <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-300' : 'bg-red-300'}`} />
                    {isAvailable ? 'LLM 已连接' : 'LLM 未连接'}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                        <p className="text-4xl mb-4">🌍</p>
                        <p>你好！我是 Aether Plan AI 助手。</p>
                        <p className="text-sm mt-2">试试说："我想去北京旅游"</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                                msg.role === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white shadow-md'
                            }`}
                        >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            
                            {/* Render widgets */}
                            {msg.widgets && msg.widgets.map((widget, wIdx) => (
                                <div key={wIdx} className="mt-2 p-2 bg-gray-100 rounded text-sm">
                                    <p className="text-gray-600">📦 Widget: {widget.widgetType}</p>
                                    <pre className="text-xs text-gray-500 mt-1">
                                        {JSON.stringify(widget.widgetPayload, null, 2)}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white shadow-md rounded-lg p-3">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-lg text-sm">
                        ⚠️ {error}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="输入消息..."
                        className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        发送
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * 意图识别示例组件
 */
export const IntentDetectionExample: React.FC = () => {
    const [input, setInput] = useState('');
    const { detect, intent, entities, confidence, isLoading } = useIntent('intent-demo');

    const handleDetect = async () => {
        if (!input.trim()) return;
        await detect(input);
    };

    return (
        <div className="max-w-2xl mx-auto p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">🔍 意图识别测试</h3>
            
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="输入测试文本，如：下个月想去三亚玩"
                    className="flex-1 border rounded px-3 py-2"
                />
                <button
                    onClick={handleDetect}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    识别
                </button>
            </div>

            {intent && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">意图:</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                            {intent}
                        </span>
                        <span className="text-gray-500 text-sm">
                            置信度: {(confidence * 100).toFixed(1)}%
                        </span>
                    </div>

                    {entities && Object.keys(entities).length > 0 && (
                        <div>
                            <span className="font-medium">提取的实体:</span>
                            <pre className="mt-1 p-3 bg-gray-100 rounded text-sm overflow-x-auto">
                                {JSON.stringify(entities, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LLMChatExample;
