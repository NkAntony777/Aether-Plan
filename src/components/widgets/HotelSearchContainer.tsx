import React, { useState, useCallback } from 'react';
import HotelSearchWidget, { type HotelInfo } from './HotelSearchWidget';
import HotelDetailModal from './HotelDetailModal';
import { searchHotelsAdvanced, searchNearbyAttractions, isAmapConfigured } from '../../services/amapService';
import { mockHotels } from '../../services/mockResponses';

interface HotelSearchContainerProps {
    city: string;
    onComplete: (hotel: HotelInfo) => void;
}

// Convert mock hotels to HotelInfo format with proper pricing
const convertMockHotels = (hotels: typeof mockHotels, hotelType: string): HotelInfo[] => {
    const basePriceMap: Record<string, number> = { economy: 180, comfort: 380, luxury: 780 };
    const basePrice = basePriceMap[hotelType] || 350;

    return hotels.map((h, index) => {
        // Generate a realistic price based on type and index
        const priceVariation = (index * 37 % 150) - 50;
        const price = Math.max(99, basePrice + priceVariation);

        return {
            id: h.id,
            name: h.name,
            rating: h.rating || 4.0 + (index % 10) * 0.08,
            price,
            address: h.address,
            image: h.image,
            tags: h.tags,
            facilities: hotelType === 'luxury'
                ? ['免费WiFi', '空调', '24小时前台', '游泳池', '健身房', '餐厅']
                : hotelType === 'comfort'
                    ? ['免费WiFi', '空调', '24小时前台', '停车场', '餐厅']
                    : ['免费WiFi', '空调', '24小时前台'],
            roomTypes: [
                { name: '标准房', price, capacity: 2 },
                { name: '大床房', price: price + 80, capacity: 2 },
                { name: '家庭房', price: price + 150, capacity: 4 },
            ],
        };
    });
};

const HotelSearchContainer: React.FC<HotelSearchContainerProps> = ({ city, onComplete }) => {
    const [hotels, setHotels] = useState<HotelInfo[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedHotel, setSelectedHotel] = useState<HotelInfo | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Handle search request
    const handleSearch = useCallback(async (type: string, keyword: string) => {
        setIsSearching(true);

        if (isAmapConfigured()) {
            // Use real API
            const result = await searchHotelsAdvanced(
                city,
                type as 'economy' | 'comfort' | 'luxury',
                keyword || undefined,
                8
            );

            if (result.success && result.hotels) {
                // Fetch nearby attractions for top hotels
                const hotelsWithAttractions = await Promise.all(
                    result.hotels.slice(0, 8).map(async (hotel) => {
                        if (hotel.location) {
                            const attractions = await searchNearbyAttractions(hotel.location, 3000);
                            return { ...hotel, nearbyAttractions: attractions.slice(0, 5) };
                        }
                        return hotel;
                    })
                );
                setHotels(hotelsWithAttractions);
            } else {
                // Fallback to mock data with proper type pricing
                setHotels(convertMockHotels(mockHotels, type).slice(0, 6));
            }
        } else {
            // No API configured, use mock data with type-based pricing
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
            setHotels(convertMockHotels(mockHotels, type).slice(0, 6));
        }

        setIsSearching(false);
    }, [city]);

    // Handle view hotel details
    const handleViewDetails = useCallback((hotel: HotelInfo) => {
        setSelectedHotel(hotel);
        setIsDetailOpen(true);
    }, []);

    // Handle select hotel from detail modal
    const handleSelectHotel = useCallback((hotel: HotelInfo) => {
        setIsDetailOpen(false);
        onComplete(hotel);
    }, [onComplete]);

    // Handle close detail modal
    const handleCloseDetail = useCallback(() => {
        setIsDetailOpen(false);
        setSelectedHotel(null);
    }, []);

    return (
        <>
            <HotelSearchWidget
                payload={{
                    city,
                    hotels,
                    title: `为您搜索 ${city} 的酒店`,
                    showTypeSelection: true,
                    showKeywordInput: true,
                    isSearching,
                }}
                onSearch={handleSearch}
                onViewDetails={handleViewDetails}
            />

            <HotelDetailModal
                hotel={selectedHotel}
                isOpen={isDetailOpen}
                onClose={handleCloseDetail}
                onSelect={handleSelectHotel}
            />
        </>
    );
};

export default HotelSearchContainer;
