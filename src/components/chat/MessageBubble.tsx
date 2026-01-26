import React from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from '../../types/message';
import { cn } from '../../lib/utils';
import WidgetRenderer from '../widgets/WidgetRenderer';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
    message: ChatMessage;
    onWidgetSubmit?: (widgetId: string, response: unknown) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onWidgetSubmit }) => {
    const isUser = message.role === 'user';
    const isWidget = message.type === 'widget';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                'flex flex-col gap-1 max-w-[90%] md:max-w-[75%]',
                isUser ? 'ml-auto items-end' : 'mr-auto items-start'
            )}
        >
            {/* Label (Optional) */}
            <span className={cn(
                "text-[10px] font-medium uppercase tracking-widest text-stone-400 mb-1 px-1",
                isUser ? "text-right" : "text-left"
            )}>
                {isUser ? 'You' : 'Aether'}
            </span>

            {/* Message Content */}
            <div
                className={cn(
                    'relative px-6 py-4 transition-all duration-300',
                    isUser
                        ? 'bg-stone-100 rounded-2xl rounded-tr-sm text-stone-800 shadow-sm'
                        : 'bg-white border border-stone-100 rounded-2xl rounded-tl-sm text-stone-800 shadow-[0_2px_10px_rgba(0,0,0,0.02)]',
                    isWidget && 'bg-transparent border-0 shadow-none p-0 w-full'
                )}
            >
                {message.type === 'text' ? (
                    <div className={cn(
                        "text-sm md:text-base leading-loose font-sans",
                        !isUser && "font-serif text-base tracking-wide"
                    )}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                                strong: ({ node, ...props }) => <span className="font-bold text-stone-900" {...props} />,
                                em: ({ node, ...props }) => <span className="italic text-stone-600" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-4 mb-4 space-y-2" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-4 mb-4 space-y-2" {...props} />,
                                li: ({ node, ...props }) => <li className="pl-1 leading-loose" {...props} />,
                                code: ({ node, ...props }) => <code className="bg-stone-100 px-1 py-0.5 rounded text-sm text-stone-600 font-mono" {...props} />,
                                table: ({ node, ...props }) => (
                                    <div className="overflow-x-auto -mx-2 md:mx-0 my-3">
                                        <table className="w-full border-collapse text-sm md:text-base" {...props} />
                                    </div>
                                ),
                                thead: ({ node, ...props }) => <thead className="bg-stone-50" {...props} />,
                                tbody: ({ node, ...props }) => <tbody {...props} />,
                                tr: ({ node, ...props }) => <tr className="even:bg-stone-50/40" {...props} />,
                                th: ({ node, ...props }) => (
                                    <th className="border border-stone-200 px-4 py-3 text-left font-semibold text-stone-700 tracking-wide" {...props} />
                                ),
                                td: ({ node, ...props }) => (
                                    <td className="border border-stone-200 px-4 py-3 align-top text-stone-700 leading-relaxed" {...props} />
                                ),
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <WidgetRenderer
                        message={message}
                        onSubmit={(response) => onWidgetSubmit?.(message.id, response)}
                    />
                )}
            </div>
        </motion.div>
    );
};

export default MessageBubble;
