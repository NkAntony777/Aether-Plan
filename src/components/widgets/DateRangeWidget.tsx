import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DateRangeWidgetProps {
    payload: {
        minDate?: string;
        maxDate?: string;
        defaultRange?: { start: string; end: string };
        context?: string;
    };
    onSubmit: (response: { start: string; end: string }) => void;
}

const DateRangeWidget: React.FC<DateRangeWidgetProps> = ({ payload: _payload, onSubmit }) => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const formatDate = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const isInRange = (date: Date) => {
        if (!startDate || !endDate) return false;
        return date >= startDate && date <= endDate;
    };

    const isSelected = (date: Date) => {
        if (startDate && formatDate(date) === formatDate(startDate)) return true;
        if (endDate && formatDate(date) === formatDate(endDate)) return true;
        return false;
    };

    const handleDateClick = (day: number) => {
        if (submitted) return;
        const clickedDate = new Date(currentYear, currentMonth, day);

        if (!startDate || (startDate && endDate)) {
            setStartDate(clickedDate);
            setEndDate(null);
        } else if (clickedDate < startDate) {
            setStartDate(clickedDate);
        } else {
            setEndDate(clickedDate);
        }
    };

    const handleConfirm = () => {
        if (startDate && endDate && !submitted) {
            setSubmitted(true);
            onSubmit({
                start: formatDate(startDate),
                end: formatDate(endDate),
            });
        }
    };

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const weekDays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[20px] p-6 w-full max-w-sm shadow-elevated border border-stone-100"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <span className="w-1 h-4 bg-sage-400 rounded-full" />
                    <h3 className="text-xl font-serif text-stone-900">Pick a Date</h3>
                </div>

                <div className="flex gap-1">
                    <button
                        onClick={prevMonth}
                        disabled={submitted}
                        className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-900 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={nextMonth}
                        disabled={submitted}
                        className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-900 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="text-center mb-6">
                <span className="font-serif text-lg text-stone-800 tracking-wide font-medium">
                    {monthNames[currentMonth]} {currentYear}
                </span>
            </div>

            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-3">
                {weekDays.map((day) => (
                    <div key={day} className="text-center text-[10px] font-bold tracking-widest text-stone-300 py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const date = new Date(currentYear, currentMonth, day);
                    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const selected = isSelected(date);
                    const inRange = isInRange(date);

                    return (
                        <button
                            key={day}
                            onClick={() => handleDateClick(day)}
                            disabled={isPast || submitted}
                            className="relative w-full aspect-square flex items-center justify-center text-sm group focus:outline-none"
                        >
                            {/* Range Background */}
                            {inRange && (
                                <div className={cn(
                                    "absolute inset-y-0 w-full bg-sage-50",
                                    formatDate(date) === (startDate && formatDate(startDate)) && "left-[50%] rounded-l-full",
                                    formatDate(date) === (endDate && formatDate(endDate)) && "right-[50%] rounded-r-full"
                                )} />
                            )}

                            {/* Selection Circle */}
                            <div className={cn(
                                "relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                                selected ? "bg-stone-900 text-white shadow-md scale-100" : "scale-90 group-hover:scale-100 group-hover:bg-stone-100",
                                isPast && "text-stone-200 cursor-not-allowed group-hover:bg-transparent"
                            )}>
                                {day}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Footer Info */}
            <div className="mt-6 pt-4 border-t border-stone-50 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-xs text-stone-400 uppercase tracking-wider">Duration</span>
                    <span className="font-serif text-stone-800">
                        {startDate && endDate ?
                            `${Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1)} Days`
                            : "--"
                        }
                    </span>
                </div>

                {startDate && endDate && !submitted && (
                    <motion.button
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={handleConfirm}
                        className="btn-primary py-2 px-6 text-sm"
                    >
                        Confirm
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
};

export default DateRangeWidget;
