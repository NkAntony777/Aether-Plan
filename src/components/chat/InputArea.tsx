import React, { useState, type KeyboardEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InputAreaProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

const InputArea: React.FC<InputAreaProps> = ({
    onSend,
    disabled = false,
    placeholder = '告诉我可以为您规划什么...',
}) => {
    const [input, setInput] = useState('');

    const handleSend = () => {
        const trimmed = input.trim();
        if (trimmed && !disabled) {
            onSend(trimmed);
            setInput('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="relative group">
            <div className={cn(
                "absolute inset-0 bg-gradient-to-r from-sage-200 to-terracotta-200 rounded-2xl blur opacity-20 transition-opacity duration-500",
                "group-hover:opacity-40"
            )} />

            <div className="relative bg-white rounded-2xl flex items-end p-2 shadow-soft border border-stone-100 transition-shadow duration-300 group-hover:shadow-elevated">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={1}
                    className={cn(
                        'flex-1 bg-transparent resize-none outline-none text-stone-800 placeholder-stone-400',
                        'min-h-[44px] max-h-[120px] py-3 px-4 text-base font-sans',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    style={{
                        height: 'auto',
                        overflow: 'hidden',
                    }}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    }}
                />

                <button
                    onClick={handleSend}
                    disabled={disabled || !input.trim()}
                    className={cn(
                        'flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 m-0.5',
                        input.trim() && !disabled
                            ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-md transform hover:scale-105 active:scale-95'
                            : 'bg-stone-100 text-stone-400'
                    )}
                >
                    {input.trim() ? <Send className="w-5 h-5" /> : <Sparkles className="w-5 h-5 opacity-50" />}
                </button>
            </div>
        </div>
    );
};

export default InputArea;
