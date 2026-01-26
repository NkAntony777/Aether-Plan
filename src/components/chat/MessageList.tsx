import React from 'react';
import type { ChatMessage } from '../../types/message';
import MessageBubble from './MessageBubble';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
    messages: ChatMessage[];
    isLoading: boolean;
    onWidgetSubmit: (widgetId: string, response: unknown) => void;
}

const MessageList: React.FC<MessageListProps> = ({
    messages,
    isLoading,
    onWidgetSubmit,
}) => {
    const scrollRef = useAutoScroll<HTMLDivElement>([messages, isLoading]);

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        >
            {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                        <span className="text-3xl">✨</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        智能规划助手
                    </h2>
                    <p className="text-gray-400 max-w-md">
                        告诉我您想要规划什么，我会通过智能对话引导您完成整个规划过程。
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2 justify-center">
                        {['我想去北京旅游', '帮我规划一次生日派对', '安排一次团队会议'].map(
                            (suggestion) => (
                                <button
                                    key={suggestion}
                                    className="px-4 py-2 rounded-full glass hover:bg-white/10 transition-colors text-sm text-gray-300"
                                >
                                    {suggestion}
                                </button>
                            )
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            onWidgetSubmit={onWidgetSubmit}
                        />
                    ))}
                    {isLoading && <TypingIndicator />}
                </>
            )}
        </div>
    );
};

export default MessageList;
