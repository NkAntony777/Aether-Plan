import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Square } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ChecklistItem {
    id: string;
    label: string;
    description?: string;
    checked?: boolean;
}

interface ChecklistWidgetProps {
    payload: {
        title?: string;
        items: ChecklistItem[];
        selectable?: boolean;
    };
    onSubmit?: (response: { selected: string[] }) => void;
}

const ChecklistWidget: React.FC<ChecklistWidgetProps> = ({ payload, onSubmit }) => {
    const { title, items, selectable = false } = payload;
    const initial = useMemo(() => {
        const map: Record<string, boolean> = {};
        items.forEach((item) => {
            map[item.id] = Boolean(item.checked);
        });
        return map;
    }, [items]);
    const [selected, setSelected] = useState<Record<string, boolean>>(initial);
    const [submitted, setSubmitted] = useState(false);

    const toggle = (id: string) => {
        if (submitted) return;
        setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSubmit = () => {
        if (!selectable || submitted) return;
        setSubmitted(true);
        const chosen = Object.entries(selected)
            .filter(([, value]) => value)
            .map(([key]) => key);
        onSubmit?.({ selected: chosen });
    };

    return (
        <div className="w-full max-w-2xl">
            {title && (
                <p className="text-sm font-serif text-stone-500 mb-4 tracking-wider italic">-- {title} --</p>
            )}
            <div className="space-y-3">
                {items.map((item, index) => {
                    const active = Boolean(selected[item.id]);
                    return (
                        <motion.button
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.4 }}
                            onClick={() => (selectable ? toggle(item.id) : undefined)}
                            className={cn(
                                'w-full text-left p-4 rounded-xl border border-stone-100 bg-white shadow-sm transition-all duration-300',
                                selectable && 'hover:shadow-elevated hover:-translate-y-0.5 cursor-pointer',
                                active && 'border-stone-300 bg-stone-50'
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <span className={cn('mt-0.5 text-stone-500', active && 'text-stone-900')}>
                                    {active ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                </span>
                                <div>
                                    <div className="text-sm font-semibold text-stone-800">{item.label}</div>
                                    {item.description && (
                                        <div className="mt-1 text-xs text-stone-500 leading-relaxed">{item.description}</div>
                                    )}
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
            {selectable && !submitted && (
                <div className="mt-5 flex justify-center">
                    <button onClick={handleSubmit} className="btn-primary">
                        确认完成
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChecklistWidget;
