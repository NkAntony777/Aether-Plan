import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Train, Clock, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TicketInfo } from '../../services/trainLogic';

interface TrainResultsWidgetProps {
    payload: {
        tickets: TicketInfo[];
        title?: string;
        origin?: string;
        destination?: string;
        date?: string;
    };
    onSubmit?: (response: TicketInfo | { kind: 'skip'; mode: 'train' }) => void;
}

const TrainResultsWidget: React.FC<TrainResultsWidgetProps> = ({ payload, onSubmit }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const { tickets, title, origin, destination, date } = payload;

    const handleSelect = (ticket: TicketInfo) => {
        setSelectedId(ticket.train_no);
        if (onSubmit) {
            onSubmit(ticket);
        }
    };

    const handleSkip = () => {
        if (onSubmit) {
            onSubmit({ kind: 'skip', mode: 'train' });
        }
    };

    if (!tickets || tickets.length === 0) {
        return (
            <div className="w-full max-w-2xl bg-stone-50 rounded-xl border border-stone-100 p-6 text-center space-y-4">
                <div>
                    <Train className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                    <p className="text-stone-500">暂无符合条件的车次</p>
                </div>
                <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-sm rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100"
                >
                    暂不决定具体车次
                </button>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl"
        >
            {(title || (origin && destination)) && (
                <div className="mb-4 text-center">
                    {title && (
                        <p className="text-xs font-serif text-stone-500 tracking-wider italic mb-1">-- {title} --</p>
                    )}
                    {origin && destination && (
                        <div className="flex items-center justify-center gap-2 text-stone-700 font-medium">
                            <span>{origin}</span>
                            <ArrowRight className="w-4 h-4 text-stone-400" />
                            <span>{destination}</span>
                            {date && <span className="ml-2 text-sm text-stone-500 font-normal">({date})</span>}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-3">
                {tickets.map((ticket, index) => (
                    <motion.div
                        key={ticket.train_no}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSelect(ticket)}
                        className={cn(
                            'bg-white rounded-xl border border-stone-100 p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5',
                            selectedId === ticket.train_no && 'ring-2 ring-stone-900 shadow-md'
                        )}
                    >
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                                    {ticket.start_train_code}
                                </div>
                                <div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <p className="text-xl font-bold text-stone-900 leading-none">{ticket.start_time}</p>
                                            <p className="text-xs text-stone-500 mt-1">{ticket.from_station}</p>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <p className="text-[10px] text-stone-400 flex items-center gap-0.5 mb-0.5">
                                                <Clock className="w-3 h-3" />
                                                {ticket.lishi}
                                            </p>
                                            <div className="w-16 h-[1px] bg-stone-200 relative">
                                                <ArrowRight className="absolute -right-1 -top-1.5 w-3 h-3 text-stone-300" />
                                            </div>
                                        </div>

                                        <div className="text-center">
                                            <p className="text-xl font-bold text-stone-900 leading-none">{ticket.arrive_time}</p>
                                            <p className="text-xs text-stone-500 mt-1">{ticket.to_station}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            {ticket.prices.map((price) => (
                                <div
                                    key={price.seat_type_code}
                                    className={cn(
                                        'flex flex-col p-2 rounded-lg text-center border transition-colors',
                                        price.num === '无' || price.num === '--'
                                            ? 'bg-stone-50 border-transparent text-stone-300'
                                            : 'bg-stone-50 border-stone-100 text-stone-700 hover:bg-blue-50 hover:border-blue-100'
                                    )}
                                >
                                    <span className="text-xs text-stone-500 mb-0.5">{price.seat_name}</span>
                                    <span className={cn('text-sm font-semibold', price.num !== '无' && price.num !== '--' && 'text-terracotta-600')}>
                                        ¥{price.price}
                                    </span>
                                    <span className={cn('text-[10px]', price.num === '有' ? 'text-green-600' : price.num === '无' || price.num === '--' ? 'text-stone-300' : 'text-stone-500')}>
                                        {price.num === '有' ? '有票' : price.num}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>
            <div className="mt-6 flex justify-center">
                <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-sm rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100"
                >
                    暂不决定具体车次
                </button>
            </div>
        </motion.div>
    );
};

export default TrainResultsWidget;
