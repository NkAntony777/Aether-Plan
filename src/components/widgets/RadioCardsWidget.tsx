import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plane, Train, Car, Check, X, Search, BookOpen, ClipboardList, Calendar, Target, ListChecks } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RadioCardOption {
    id: string;
    label: string;
    description?: string;
    icon?: string;
}

interface RadioCardsWidgetProps {
    payload: {
        options: RadioCardOption[];
        title?: string;
    };
    onSubmit: (response: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
    plane: <Plane className="w-5 h-5" />,
    train: <Train className="w-5 h-5" />,
    car: <Car className="w-5 h-5" />,
    close: <X className="w-5 h-5" />,
    search: <Search className="w-5 h-5" />,
    book: <BookOpen className="w-5 h-5" />,
    clipboard: <ClipboardList className="w-5 h-5" />,
    calendar: <Calendar className="w-5 h-5" />,
    target: <Target className="w-5 h-5" />,
    checklist: <ListChecks className="w-5 h-5" />,
};

const RadioCardsWidget: React.FC<RadioCardsWidgetProps> = ({ payload, onSubmit }) => {
    const [selected, setSelected] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const { options, title } = payload;

    const handleSelect = (id: string) => {
        if (submitted) return;
        setSelected(id);
    };

    const handleConfirm = () => {
        if (selected && !submitted) {
            setSubmitted(true);
            const selectedOption = options.find(o => o.id === selected);
            onSubmit(selectedOption?.id || selected);
        }
    };

    return (
        <div className="w-full max-w-lg">
            {title && (
                <p className="text-sm font-serif text-stone-500 mb-4 tracking-wider italic">-- {title} --</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {options.map((option, index) => (
                    <motion.button
                        key={option.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        onClick={() => handleSelect(option.id)}
                        disabled={submitted}
                        className={cn(
                            'group relative flex flex-col items-center justify-center p-6 text-center transition-all duration-300',
                            'bg-white rounded-xl border border-stone-100 shadow-sm',
                            'hover:shadow-elevated hover:-translate-y-1',
                            selected === option.id && 'ring-1 ring-stone-900 bg-stone-50',
                            submitted && selected !== option.id && 'opacity-40 grayscale',
                            submitted && 'cursor-default hover:translate-y-0 hover:shadow-sm'
                        )}
                    >
                        {selected === option.id && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-3 right-3 w-5 h-5 rounded-full bg-stone-900 flex items-center justify-center"
                            >
                                <Check className="w-3 h-3 text-white" />
                            </motion.div>
                        )}

                        <div className={cn(
                            "mb-4 p-3 rounded-full bg-stone-50 text-stone-400 group-hover:text-stone-900 group-hover:bg-sage-100 transition-colors duration-300",
                            selected === option.id && "bg-stone-900 text-white group-hover:bg-stone-900 group-hover:text-white"
                        )}>
                            {option.icon && iconMap[option.icon]}
                        </div>

                        <span className="font-serif font-medium text-stone-900 text-lg mb-1">{option.label}</span>

                        {option.description && (
                            <span className="text-xs text-stone-500 font-sans leading-relaxed px-2">{option.description}</span>
                        )}
                    </motion.button>
                ))}
            </div>

            {selected && !submitted && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 flex justify-center"
                >
                    <button
                        onClick={handleConfirm}
                        className="btn-primary"
                    >
                        确认选择
                    </button>
                </motion.div>
            )}
        </div>
    );
};

export default RadioCardsWidget;
