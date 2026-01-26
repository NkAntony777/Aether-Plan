import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Sparkles, Crown, Search, RotateCcw, Loader2, MapPin, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';

// Hotel type options
const HOTEL_TYPES = [
    { id: 'economy', label: '经济型', description: '实惠之选，干净舒适', icon: Building2, priceRange: '¥100-300' },
    { id: 'comfort', label: '舒适型', description: '品质之选，设施齐全', icon: Sparkles, priceRange: '¥300-600' },
    { id: 'luxury', label: '豪华型', description: '尊享之选，极致体验', icon: Crown, priceRange: '¥600+' },
];

export interface HotelInfo {
    id: string;
    name: string;
    type?: string;
    rating?: number;
    price?: number;
    priceRange?: string;
    address?: string;
    image?: string;
    tags?: string[];
    distance?: number;
    tel?: string;
    facilities?: string[];
    roomTypes?: Array<{ name: string; price: number; capacity: number }>;
    nearbyAttractions?: Array<{ name: string; distance: string }>;
}

interface HotelSearchWidgetProps {
    payload: {
        city: string;
        hotels?: HotelInfo[];
        title?: string;
        showTypeSelection?: boolean;
        showKeywordInput?: boolean;
        isSearching?: boolean;
    };
    onSearch: (type: string, keyword: string) => void;
    onViewDetails: (hotel: HotelInfo) => void;
}

const HotelSearchWidget: React.FC<HotelSearchWidgetProps> = ({
    payload,
    onSearch,
    onViewDetails,
}) => {
    const { city, hotels = [], title, showTypeSelection = true, showKeywordInput = true, isSearching = false } = payload;

    const [selectedType, setSelectedType] = useState<string>('comfort');
    const [keyword, setKeyword] = useState<string>('');
    const [hasSearched, setHasSearched] = useState(false);
    const [refineKeyword, setRefineKeyword] = useState<string>('');

    const handleSearch = () => {
        setHasSearched(true);
        onSearch(selectedType, keyword);
    };

    const handleContinueSearch = () => {
        onSearch(selectedType, keyword);
    };

    // Handle refine search - add new keyword to existing search
    const handleRefineSearch = () => {
        if (refineKeyword.trim()) {
            const newKeyword = keyword ? `${keyword} ${refineKeyword.trim()}` : refineKeyword.trim();
            setKeyword(newKeyword);
            setRefineKeyword('');
            onSearch(selectedType, newKeyword);
        }
    };

    // Handle Enter key for refine search
    const handleRefineKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRefineSearch();
        }
    };

    // Get display price - prefer actual price, fallback to room type min price
    const getDisplayPrice = (hotel: HotelInfo): { price: number | null; label: string } => {
        if (hotel.price && hotel.price > 0) {
            return { price: hotel.price, label: '起' };
        }
        if (hotel.roomTypes && hotel.roomTypes.length > 0) {
            const minPrice = Math.min(...hotel.roomTypes.map(r => r.price));
            return { price: minPrice, label: '起' };
        }
        return { price: null, label: '' };
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl space-y-4"
        >
            {title && (
                <p className="text-sm font-serif text-stone-500 tracking-wider italic">-- {title} --</p>
            )}

            {/* Hotel Type Selection Cards */}
            {showTypeSelection && !hasSearched && (
                <div className="space-y-3">
                    <p className="text-sm font-medium text-stone-600">选择酒店类型</p>
                    <div className="grid grid-cols-3 gap-3">
                        {HOTEL_TYPES.map((type) => (
                            <motion.button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                    'relative p-4 rounded-xl border text-left transition-all',
                                    selectedType === type.id
                                        ? 'bg-stone-900 text-white border-stone-900 shadow-elevated'
                                        : 'bg-white text-stone-700 border-stone-100 hover:border-stone-200'
                                )}
                            >
                                <type.icon className={cn('w-5 h-5 mb-2', selectedType === type.id ? 'text-white' : 'text-stone-400')} />
                                <p className="font-medium text-sm">{type.label}</p>
                                <p className={cn('text-xs mt-1', selectedType === type.id ? 'text-stone-300' : 'text-stone-400')}>
                                    {type.description}
                                </p>
                                <p className={cn('text-xs mt-2 font-medium', selectedType === type.id ? 'text-sage-300' : 'text-sage-600')}>
                                    {type.priceRange}
                                </p>
                            </motion.button>
                        ))}
                    </div>
                </div>
            )}

            {/* Initial Keyword Input */}
            {showKeywordInput && !hasSearched && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-stone-600">特殊需求（可选）</p>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="例如：亲子房、四人入住、Loft、海景..."
                            className="flex-1 px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-300 transition-colors"
                        />
                        <motion.button
                            onClick={handleSearch}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isSearching}
                            className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-50"
                        >
                            {isSearching ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Search className="w-4 h-4" />
                            )}
                            搜索
                        </motion.button>
                    </div>
                    <p className="text-xs text-stone-400">
                        💡 可输入房型、人数、设施、位置等关键词，帮您精准匹配
                    </p>
                </div>
            )}

            {/* Loading State */}
            {isSearching && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                    <span className="ml-2 text-stone-500">正在搜索 {city} 的酒店...</span>
                </div>
            )}

            {/* Hotel Results */}
            {hasSearched && !isSearching && hotels.length > 0 && (
                <div className="space-y-4">
                    {/* Results Header with Search Info */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-stone-500">
                                找到 <span className="font-medium text-stone-700">{hotels.length}</span> 家酒店
                                {keyword && <span className="text-stone-400"> · 搜索: {keyword}</span>}
                            </p>
                        </div>
                        <button
                            onClick={handleContinueSearch}
                            className="text-sm text-sage-600 hover:text-sage-700 flex items-center gap-1"
                        >
                            <RotateCcw className="w-4 h-4" />
                            换一批
                        </button>
                    </div>

                    {/* Refine Search Input - Always visible after first search */}
                    <div className="flex gap-2 bg-stone-50 rounded-xl p-2">
                        <div className="flex items-center px-2 text-stone-400">
                            <Filter className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={refineKeyword}
                            onChange={(e) => setRefineKeyword(e.target.value)}
                            onKeyDown={handleRefineKeyDown}
                            placeholder="补充需求，如：五大道附近、有泳池、可做饭..."
                            className="flex-1 px-2 py-2 bg-transparent text-stone-800 placeholder-stone-400 focus:outline-none text-sm"
                        />
                        <motion.button
                            onClick={handleRefineSearch}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={!refineKeyword.trim() || isSearching}
                            className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-stone-800 transition-colors disabled:opacity-50"
                        >
                            <Search className="w-3 h-3" />
                            筛选
                        </motion.button>
                    </div>

                    {/* Hotel Cards Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {hotels.slice(0, 8).map((hotel, index) => {
                            const priceInfo = getDisplayPrice(hotel);
                            return (
                                <motion.div
                                    key={hotel.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white rounded-xl border border-stone-100 overflow-hidden hover:shadow-elevated transition-all cursor-pointer group"
                                    onClick={() => onViewDetails(hotel)}
                                >
                                    {/* Hotel Image */}
                                    <div className="h-32 bg-gradient-to-br from-stone-100 to-stone-50 relative overflow-hidden">
                                        {hotel.image ? (
                                            <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Building2 className="w-8 h-8 text-stone-300" />
                                            </div>
                                        )}
                                        {hotel.rating && (
                                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium text-amber-600">
                                                ⭐ {hotel.rating.toFixed(1)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Hotel Info */}
                                    <div className="p-3">
                                        <h4 className="font-medium text-stone-900 text-sm truncate group-hover:text-sage-700 transition-colors">
                                            {hotel.name}
                                        </h4>
                                        {hotel.address && (
                                            <p className="text-xs text-stone-400 mt-1 truncate flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {hotel.address}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between mt-2">
                                            {priceInfo.price ? (
                                                <span className="text-terracotta-600 font-bold">
                                                    ¥{priceInfo.price}
                                                    <span className="text-xs font-normal text-stone-400 ml-0.5">{priceInfo.label}</span>
                                                </span>
                                            ) : (
                                                <span className="text-stone-400 text-sm">查看价格</span>
                                            )}
                                            <span className="text-xs text-sage-600 bg-sage-50 px-2 py-1 rounded-full">
                                                查看详情
                                            </span>
                                        </div>
                                        {hotel.tags && hotel.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {hotel.tags.slice(0, 2).map((tag, idx) => (
                                                    <span key={idx} className="text-xs text-stone-400 bg-stone-50 px-2 py-0.5 rounded">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* No Results for current search */}
                    {hotels.length === 0 && (
                        <div className="text-center py-8">
                            <Building2 className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                            <p className="text-stone-500">未找到符合条件的酒店</p>
                            <button
                                onClick={() => setHasSearched(false)}
                                className="mt-3 text-sm text-sage-600 hover:text-sage-700"
                            >
                                修改搜索条件
                            </button>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default HotelSearchWidget;
