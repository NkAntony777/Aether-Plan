import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Star, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { PlaceInfo } from '../../types/message';

interface PlaceCardsWidgetProps {
    payload: {
        places: PlaceInfo[];
        title?: string;
        selectable?: boolean;
    };
    onSubmit?: (response: PlaceInfo) => void;
}

const PlaceCardsWidget: React.FC<PlaceCardsWidgetProps> = ({ payload, onSubmit }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const { places, title, selectable = false } = payload;

    const handleSelect = (place: PlaceInfo) => {
        if (selectable && onSubmit) {
            setSelectedId(place.id);
            onSubmit(place);
        }
    };

    const renderPriceLevel = (level?: number) => {
        if (!level) return null;
        return (
            <span className="text-sage-600 font-medium">
                {'¥'.repeat(level)}
                <span className="text-stone-300">{'¥'.repeat(5 - level)}</span>
            </span>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl"
        >
            {title && (
                <p className="text-sm font-serif text-stone-500 mb-4 tracking-wider italic">-- {title} --</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {places.map((place, index) => (
                    <motion.div
                        key={place.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.4 }}
                        onClick={() => handleSelect(place)}
                        className={cn(
                            'group bg-white rounded-xl border border-stone-100 overflow-hidden shadow-soft transition-all duration-300',
                            'hover:shadow-elevated hover:-translate-y-1',
                            selectable && 'cursor-pointer',
                            selectedId === place.id && 'ring-2 ring-stone-900'
                        )}
                    >
                        {/* Image */}
                        {place.image && (
                            <div className="aspect-[4/3] overflow-hidden">
                                <img
                                    src={place.image}
                                    alt={place.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                        )}

                        {/* Content */}
                        <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-serif font-medium text-stone-900 leading-tight">
                                    {place.name}
                                </h3>
                                {place.rating && (
                                    <div className="flex items-center gap-1 text-amber-500 flex-shrink-0">
                                        <Star className="w-3.5 h-3.5 fill-current" />
                                        <span className="text-xs font-medium">{place.rating}</span>
                                    </div>
                                )}
                            </div>

                            {place.address && (
                                <p className="text-xs text-stone-400 flex items-center gap-1 mb-2">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate">{place.address}</span>
                                </p>
                            )}

                            <div className="flex items-center justify-between mt-3">
                                {place.priceLevel && renderPriceLevel(place.priceLevel)}

                                {place.tags && place.tags.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                        {place.tags.slice(0, 2).map(tag => (
                                            <span
                                                key={tag}
                                                className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hover Action */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-stone-600 hover:bg-white">
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default PlaceCardsWidget;
