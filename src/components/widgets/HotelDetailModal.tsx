import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Star, MapPin, Phone, Wifi, Car, Coffee, Dumbbell,
    Waves, Utensils, Check, ChevronRight, Building2, Navigation
} from 'lucide-react';
import type { HotelInfo } from './HotelSearchWidget';

interface HotelDetailModalProps {
    hotel: HotelInfo | null;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (hotel: HotelInfo) => void;
}

// Facility icons mapping
const FACILITY_ICONS: Record<string, React.ElementType> = {
    'WiFi': Wifi,
    '免费WiFi': Wifi,
    '无线网络': Wifi,
    '停车场': Car,
    '免费停车': Car,
    '餐厅': Utensils,
    '早餐': Coffee,
    '健身房': Dumbbell,
    '健身中心': Dumbbell,
    '游泳池': Waves,
    '泳池': Waves,
};

// Default facilities if none provided
const DEFAULT_FACILITIES = ['免费WiFi', '空调', '24小时前台', '行李寄存', '电梯'];

// Default room types if none provided
const DEFAULT_ROOM_TYPES = [
    { name: '标准大床房', price: 299, capacity: 2 },
    { name: '豪华双床房', price: 399, capacity: 2 },
    { name: '家庭套房', price: 599, capacity: 4 },
];

const HotelDetailModal: React.FC<HotelDetailModalProps> = ({
    hotel,
    isOpen,
    onClose,
    onSelect,
}) => {
    if (!isOpen || !hotel) return null;

    const facilities = hotel.facilities || DEFAULT_FACILITIES;
    const roomTypes = hotel.roomTypes || DEFAULT_ROOM_TYPES;
    const nearbyAttractions = hotel.nearbyAttractions || [
        { name: '市中心', distance: '1.2km' },
        { name: '地铁站', distance: '500m' },
        { name: '购物中心', distance: '800m' },
    ];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-lg bg-white rounded-2xl shadow-elevated overflow-hidden max-h-[85vh] flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header Image */}
                    <div className="h-48 bg-gradient-to-br from-stone-200 to-stone-100 relative flex-shrink-0">
                        {hotel.image ? (
                            <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Building2 className="w-16 h-16 text-stone-300" />
                            </div>
                        )}

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-stone-600 hover:text-stone-900 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Rating Badge */}
                        {hotel.rating && (
                            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-1">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span className="font-medium text-stone-900">{hotel.rating.toFixed(1)}</span>
                            </div>
                        )}
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        {/* Hotel Name & Address */}
                        <div>
                            <h2 className="text-xl font-serif font-medium text-stone-900">{hotel.name}</h2>
                            {hotel.address && (
                                <p className="text-sm text-stone-500 mt-1 flex items-start gap-1">
                                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    {hotel.address}
                                </p>
                            )}
                            {hotel.tel && (
                                <p className="text-sm text-sage-600 mt-1 flex items-center gap-1">
                                    <Phone className="w-4 h-4" />
                                    {hotel.tel}
                                </p>
                            )}
                        </div>

                        {/* Room Types */}
                        <div>
                            <h3 className="text-sm font-medium text-stone-700 mb-3">房型价格</h3>
                            <div className="space-y-2">
                                {roomTypes.map((room, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-3 bg-stone-50 rounded-xl"
                                    >
                                        <div>
                                            <p className="font-medium text-stone-800">{room.name}</p>
                                            <p className="text-xs text-stone-400">可住 {room.capacity} 人</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-terracotta-600">¥{room.price}</span>
                                            <span className="text-xs text-stone-400">/晚</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Facilities */}
                        <div>
                            <h3 className="text-sm font-medium text-stone-700 mb-3">配套设施</h3>
                            <div className="flex flex-wrap gap-2">
                                {facilities.map((facility, idx) => {
                                    const IconComponent = FACILITY_ICONS[facility] || Check;
                                    return (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-sage-50 text-sage-700 rounded-full text-sm"
                                        >
                                            <IconComponent className="w-4 h-4" />
                                            {facility}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Nearby Attractions */}
                        <div>
                            <h3 className="text-sm font-medium text-stone-700 mb-3">周边信息</h3>
                            <div className="space-y-2">
                                {nearbyAttractions.map((place, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0"
                                    >
                                        <span className="text-stone-600 flex items-center gap-2">
                                            <Navigation className="w-4 h-4 text-stone-400" />
                                            {place.name}
                                        </span>
                                        <span className="text-sm text-stone-400">{place.distance}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        {hotel.tags && hotel.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {hotel.tags.map((tag, idx) => (
                                    <span key={idx} className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex-shrink-0 p-5 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
                        <div>
                            {hotel.price ? (
                                <>
                                    <span className="text-2xl font-bold text-terracotta-600">¥{hotel.price}</span>
                                    <span className="text-sm text-stone-400 ml-1">起</span>
                                </>
                            ) : hotel.priceRange ? (
                                <span className="text-lg font-medium text-terracotta-600">{hotel.priceRange}</span>
                            ) : (
                                <span className="text-stone-500">价格详询</span>
                            )}
                        </div>
                        <motion.button
                            onClick={() => onSelect(hotel)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-stone-800 transition-colors"
                        >
                            选择此酒店
                            <ChevronRight className="w-4 h-4" />
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default HotelDetailModal;
