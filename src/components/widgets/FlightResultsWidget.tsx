import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plane, Clock, ArrowRight, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { FlightOffer } from '../../services/flightService';

interface FlightResultsWidgetProps {
    payload: {
        flights: FlightOffer[];
        title?: string;
        origin?: string;
        destination?: string;
    };
    onSubmit?: (response: FlightOffer | { kind: 'skip'; mode: 'flight' }) => void;
}

const AIRLINE_NAMES: Record<string, string> = {
    CA: '中国国航',
    MU: '东方航空',
    CZ: '南方航空',
    HU: '海南航空',
    ZH: '深圳航空',
    MF: '厦门航空',
    '3U': '四川航空',
    SC: '山东航空',
    FM: '上海航空',
    NH: '全日空',
    JL: '日本航空',
    KE: '大韩航空',
    OZ: '韩亚航空',
    SQ: '新加坡航空',
    TG: '泰国航空',
    EK: '阿联酋航空',
    QR: '卡塔尔航空',
    AF: '法国航空',
    BA: '英国航空',
    LH: '汉莎航空',
    UA: '美联航',
    AA: '美国航空',
    DL: '达美航空',
};

const FlightResultsWidget: React.FC<FlightResultsWidgetProps> = ({ payload, onSubmit }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const { flights, title, origin, destination } = payload;

    const handleSelect = (flight: FlightOffer) => {
        setSelectedId(flight.id);
        if (onSubmit) {
            onSubmit(flight);
        }
    };

    const handleSkip = () => {
        if (onSubmit) {
            onSubmit({ kind: 'skip', mode: 'flight' });
        }
    };

    const formatTime = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return isoString;
        }
    };

    const formatDuration = (duration: string) => {
        return duration.replace(/h/g, '小时').replace(/m/g, '分钟');
    };

    const getAirlineName = (code: string) => {
        return AIRLINE_NAMES[code] || code;
    };

    if (!flights || flights.length === 0) {
        return (
            <div className="w-full max-w-2xl bg-stone-50 rounded-xl border border-stone-100 p-6 text-center space-y-4">
                <div>
                    <Plane className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                    <p className="text-stone-500">暂无符合条件的航班</p>
                </div>
                <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-sm rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100"
                >
                    暂不决定具体航班
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
            {title && (
                <p className="text-sm font-serif text-stone-500 mb-4 tracking-wider italic">-- {title} --</p>
            )}

            {origin && destination && (
                <div className="flex items-center justify-center gap-3 mb-4 text-stone-600">
                    <span className="font-medium">{origin}</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="font-medium">{destination}</span>
                </div>
            )}

            <div className="space-y-3">
                {flights.map((flight, index) => (
                    <motion.div
                        key={flight.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleSelect(flight)}
                        className={cn(
                            'bg-white rounded-xl border border-stone-100 p-4 cursor-pointer transition-all hover:shadow-elevated hover:-translate-y-0.5',
                            selectedId === flight.id && 'ring-2 ring-stone-900 shadow-elevated'
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center">
                                    <Plane className="w-6 h-6 text-stone-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-stone-900">
                                        {getAirlineName(flight.airlineCode)}
                                        <span className="text-stone-400 text-sm ml-2">{flight.flightNumber}</span>
                                    </p>
                                    <p className="text-xs text-stone-400">{flight.cabinClass}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-xl font-semibold text-stone-900">{formatTime(flight.departure.time)}</p>
                                    <p className="text-xs text-stone-400">{flight.departure.airport}</p>
                                </div>

                                <div className="flex flex-col items-center">
                                    <p className="text-xs text-stone-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDuration(flight.duration)}
                                    </p>
                                    <div className="w-20 h-[1px] bg-stone-200 my-1 relative">
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-stone-300" />
                                    </div>
                                    <p className="text-xs text-stone-400">
                                        {flight.stops === 0 ? '直飞' : `${flight.stops} 次经停`}
                                    </p>
                                </div>

                                <div className="text-center">
                                    <p className="text-xl font-semibold text-stone-900">{formatTime(flight.arrival.time)}</p>
                                    <p className="text-xs text-stone-400">{flight.arrival.airport}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-2xl font-bold text-terracotta-600">¥{flight.price.amount.toLocaleString()}</p>
                                <p className="text-xs text-stone-400">起</p>
                            </div>
                        </div>

                        {selectedId === flight.id && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center"
                            >
                                <Check className="w-4 h-4" />
                            </motion.div>
                        )}
                    </motion.div>
                ))}
            </div>
            <div className="mt-6 flex justify-center">
                <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-sm rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100"
                >
                    暂不决定具体航班
                </button>
            </div>
        </motion.div>
    );
};

export default FlightResultsWidget;
