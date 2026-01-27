import React, { useState, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Send, Type } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TextInputWidgetProps {
    payload: {
        placeholder?: string;
        label?: string;
        icon?: 'location' | 'text';
        context?: string;
        fieldKey?: string;
    };
    onSubmit: (response: string) => void;
}

const TextInputWidget: React.FC<TextInputWidgetProps> = ({ payload, onSubmit }) => {
    const [value, setValue] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const { placeholder = '请输入...', label, icon: _icon = 'text' } = payload;
    const icon = _icon === 'location' ? <MapPin className="w-5 h-5" /> : <Type className="w-5 h-5" />;

    const handleSubmit = () => {
        const trimmed = value.trim();
        if (trimmed && !submitted) {
            setSubmitted(true);
            onSubmit(trimmed);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };

    if (submitted) {
        return null; // Will be rendered by WidgetRenderer as completed state
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
        >
            {label && (
                <p className="text-sm font-serif text-stone-500 mb-3 tracking-wider italic">-- {label} --</p>
            )}

            <div className="flex items-center gap-2 bg-white rounded-xl border border-stone-100 shadow-soft p-2 transition-all duration-300 focus-within:shadow-elevated focus-within:border-stone-200">
                <div className="pl-2 text-stone-400">
                    {icon}
                </div>

                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoFocus
                    className="flex-1 bg-transparent outline-none text-stone-800 placeholder-stone-400 py-2 px-1 text-base font-sans"
                />

                <button
                    onClick={handleSubmit}
                    disabled={!value.trim()}
                    className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300',
                        value.trim()
                            ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-md'
                            : 'bg-stone-100 text-stone-400'
                    )}
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
};

export default TextInputWidget;
