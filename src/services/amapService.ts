// Amap API service (supports server-side proxy mode)
import { loadAPIConfig } from '../types/apiConfig';

const useServerKeys = (import.meta as { env?: Record<string, string> }).env?.VITE_USE_SERVER_KEYS === 'true';
const apiBase = (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE || '';
const apiToken = (import.meta as { env?: Record<string, string> }).env?.VITE_API_TOKEN;

function buildApiUrl(path: string, params?: URLSearchParams): string {
    const prefix = apiBase ? apiBase.replace(/\/$/, '') : '';
    const query = params ? `?${params.toString()}` : '';
    return `${prefix}${path.startsWith('/') ? path : `/${path}`}${query}`;
}

function buildHeaders(): HeadersInit {
    return apiToken ? { 'x-aether-token': apiToken } : {};
}

export interface AmapPOI {
    id: string;
    name: string;
    type: string;
    typecode: string;
    address: string;
    location: {
        lat: number;
        lng: number;
    };
    tel?: string;
    rating?: number;
    cost?: string;
    photos?: string[];
    distance?: number;
}

export interface POISearchResult {
    success: boolean;
    pois?: AmapPOI[];
    error?: string;
}

export interface GeocodingResult {
    success: boolean;
    location?: {
        lat: number;
        lng: number;
    };
    formattedAddress?: string;
    error?: string;
}

const POI_TYPES = {
    hotel: '100000',
    restaurant: '050000',
    attraction: '110000',
    shopping: '060000',
    transport: '150000',
};

const DEFAULT_HOTEL_KEYWORD = '\u9152\u5e97';
const DEFAULT_ATTRACTION_KEYWORD = '\u666f\u70b9';
const DEFAULT_RESTAURANT_KEYWORD = '\u7f8e\u98df';

function getAmapKey(): string | null {
    if (useServerKeys) return null;
    const config = loadAPIConfig();
    if (!config.amap.enabled || !config.amap.apiKey) {
        return null;
    }
    return config.amap.apiKey;
}

export async function amapGeocode(address: string): Promise<GeocodingResult> {
    const key = getAmapKey();
    if (!key && !useServerKeys) {
        return { success: false, error: 'Amap API not configured' };
    }

    try {
        const response = await (useServerKeys
            ? fetch(buildApiUrl('/api/amap/geocode', new URLSearchParams({ address })), { headers: buildHeaders() })
            : fetch(
                  `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${key}&output=json`
              ));

        if (!response.ok) {
            return { success: false, error: `Geocode failed: ${response.status}` };
        }

        const data = await response.json();
        if (data.status !== '1' || !data.geocodes || data.geocodes.length === 0) {
            return { success: false, error: data.info || 'Address not found' };
        }

        const geocode = data.geocodes[0];
        const [lng, lat] = geocode.location.split(',').map(Number);

        return {
            success: true,
            location: { lat, lng },
            formattedAddress: geocode.formatted_address,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Geocode request failed',
        };
    }
}

export async function searchPOI(
    keyword: string,
    city: string,
    type?: keyof typeof POI_TYPES,
    pageSize: number = 10
): Promise<POISearchResult> {
    const key = getAmapKey();
    if (!key && !useServerKeys) {
        return { success: false, error: 'Amap API not configured' };
    }

    try {
        const params = new URLSearchParams({
            keywords: keyword,
            city,
            citylimit: 'true',
            offset: pageSize.toString(),
            output: 'json',
            extensions: 'all',
        });

        if (type && POI_TYPES[type]) {
            params.append('types', POI_TYPES[type]);
        }

        const response = await (useServerKeys
            ? fetch(buildApiUrl('/api/amap/poi', params), { headers: buildHeaders() })
            : fetch(`https://restapi.amap.com/v3/place/text?${new URLSearchParams({ key: key || '' }).toString()}&${params}`));

        if (!response.ok) {
            return { success: false, error: `POI search failed: ${response.status}` };
        }

        const data = await response.json();
        if (data.status !== '1') {
            return { success: false, error: data.info || 'POI search failed' };
        }

        const pois: AmapPOI[] = (data.pois || []).map((poi: Record<string, unknown>) => {
            const [lng, lat] = ((poi.location as string) || '0,0').split(',').map(Number);
            const photos = poi.photos as Array<{ url: string }> | undefined;

            return {
                id: poi.id as string,
                name: poi.name as string,
                type: poi.type as string,
                typecode: poi.typecode as string,
                address: (poi.address as string) || '',
                location: { lat, lng },
                tel: poi.tel as string | undefined,
                rating: poi.biz_ext ? parseFloat((poi.biz_ext as { rating?: string }).rating || '0') : undefined,
                cost: poi.biz_ext ? (poi.biz_ext as { cost?: string }).cost : undefined,
                photos: photos?.map(p => p.url),
                distance: poi.distance ? parseInt(poi.distance as string, 10) : undefined,
            };
        });

        return { success: true, pois };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'POI search request failed',
        };
    }
}

export async function searchHotels(city: string, keyword?: string): Promise<POISearchResult> {
    return searchPOI(keyword || DEFAULT_HOTEL_KEYWORD, city, 'hotel', 10);
}

const HOTEL_TYPE_KEYWORDS: Record<string, string[]> = {
    economy: ['\u5feb\u6377\u9152\u5e97', '\u7ecf\u6d4e\u578b\u9152\u5e97', '\u9752\u5e74\u65c5\u820d', '\u8fde\u9501\u9152\u5e97'],
    comfort: ['\u5546\u52a1\u9152\u5e97', '\u7cbe\u54c1\u9152\u5e97', '\u8212\u9002\u578b'],
    luxury: ['\u4e94\u661f\u7ea7', '\u8c6a\u534e\u9152\u5e97', '\u5ea6\u5047\u9152\u5e97', '\u5962\u534e'],
};

export interface HotelDetailInfo {
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
    location?: { lat: number; lng: number };
}

export async function searchHotelsAdvanced(
    city: string,
    hotelType: 'economy' | 'comfort' | 'luxury',
    keyword?: string,
    limit: number = 8
): Promise<{ success: boolean; hotels?: HotelDetailInfo[]; error?: string }> {
    const key = getAmapKey();
    if (!key && !useServerKeys) {
        return { success: false, error: 'Amap API not configured' };
    }

    try {
        const typeKeywords = HOTEL_TYPE_KEYWORDS[hotelType] || [];
        const baseKeyword = typeKeywords[Math.floor(Math.random() * typeKeywords.length)] || DEFAULT_HOTEL_KEYWORD;
        const searchKeyword = keyword ? `${keyword} ${baseKeyword}` : baseKeyword;

        const params = new URLSearchParams({
            keywords: searchKeyword,
            city,
            citylimit: 'true',
            offset: Math.min(limit + 2, 25).toString(),
            page: '1',
            output: 'json',
            extensions: 'all',
            types: POI_TYPES.hotel,
        });

        const response = await (useServerKeys
            ? fetch(buildApiUrl('/api/amap/poi', params), { headers: buildHeaders() })
            : fetch(`https://restapi.amap.com/v3/place/text?${new URLSearchParams({ key: key || '' }).toString()}&${params}`));

        if (!response.ok) {
            return { success: false, error: `Hotel search failed: ${response.status}` };
        }

        const data = await response.json();
        if (data.status !== '1') {
            return { success: false, error: data.info || 'Hotel search failed' };
        }

        const hotels: HotelDetailInfo[] = (data.pois || [])
            .slice(0, limit)
            .map((poi: Record<string, unknown>, index: number) => {
                const [lng, lat] = ((poi.location as string) || '0,0').split(',').map(Number);
                const photos = poi.photos as Array<{ url: string }> | undefined;
                const bizExt = poi.biz_ext as { rating?: string; cost?: string } | undefined;

                const basePriceMap = { economy: 180, comfort: 380, luxury: 780 };
                const basePrice = basePriceMap[hotelType] || 350;
                const priceVariation = (index * 37 % 150) - 50;

                let finalPrice = basePrice + priceVariation;
                if (bizExt?.cost) {
                    const apiCost = parseInt(bizExt.cost, 10);
                    if (apiCost > 0) {
                        finalPrice = apiCost;
                    }
                }

                const minPrice = hotelType === 'economy' ? 99 : hotelType === 'comfort' ? 250 : 500;
                const maxPrice = hotelType === 'economy' ? 350 : hotelType === 'comfort' ? 700 : 2500;
                finalPrice = Math.max(minPrice, Math.min(maxPrice, finalPrice));

                const roomTypes = generateRoomTypes(hotelType, finalPrice);

                return {
                    id: poi.id as string,
                    name: poi.name as string,
                    type: poi.type as string,
                    rating: bizExt?.rating ? parseFloat(bizExt.rating) : 4.0 + (index % 10) * 0.08,
                    price: finalPrice,
                    priceRange: hotelType === 'economy' ? '\u00a5100-300' : hotelType === 'comfort' ? '\u00a5300-600' : '\u00a5600+',
                    address: (poi.address as string) || '',
                    image: photos?.[0]?.url,
                    tags: (poi.type as string)?.split(';').slice(0, 3),
                    tel: poi.tel as string,
                    distance: poi.distance ? parseInt(poi.distance as string, 10) : undefined,
                    location: { lat, lng },
                    facilities: generateFacilities(hotelType),
                    roomTypes,
                    nearbyAttractions: [],
                };
            });

        if (hotels.length < 3) {
            return { success: false, error: 'Not enough hotels found. Try different filters.' };
        }

        return { success: true, hotels };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Hotel search request failed',
        };
    }
}

function generateRoomTypes(hotelType: string, basePrice: number): Array<{ name: string; price: number; capacity: number }> {
    if (hotelType === 'economy') {
        return [
            { name: '\u6807\u51c6\u95f4', price: basePrice, capacity: 2 },
            { name: '\u5927\u5e8a\u623f', price: basePrice + 30, capacity: 2 },
            { name: '\u5bb6\u5ead\u623f', price: basePrice + 80, capacity: 3 },
        ];
    }
    if (hotelType === 'comfort') {
        return [
            { name: '\u9ad8\u7ea7\u5927\u5e8a\u623f', price: basePrice, capacity: 2 },
            { name: '\u8c6a\u534e\u53cc\u5e8a\u623f', price: basePrice + 100, capacity: 2 },
            { name: '\u5546\u52a1\u5957\u623f', price: basePrice + 200, capacity: 2 },
            { name: '\u5bb6\u5ead\u5957\u623f', price: basePrice + 300, capacity: 4 },
        ];
    }
    return [
        { name: '\u8c6a\u534e\u5927\u5e8a\u623f', price: basePrice, capacity: 2 },
        { name: '\u884c\u653f\u5957\u623f', price: basePrice + 400, capacity: 2 },
        { name: '\u603b\u7edf\u5957\u623f', price: basePrice + 1500, capacity: 4 },
        { name: 'Loft\u590d\u5f0f\u623f', price: basePrice + 600, capacity: 4 },
    ];
}

function generateFacilities(hotelType: string): string[] {
    const basic = ['\u514d\u8d39WiFi', '\u7a7a\u8c03', '24\u5c0f\u65f6\u524d\u53f0', '\u7535\u68af'];
    const comfort = ['\u514d\u8d39\u505c\u8f66', '\u9910\u5385', '\u884c\u674e\u5bc4\u5b58', '\u6d17\u8863\u670d\u52a1'];
    const luxury = ['\u6e38\u6cf3\u6c60', '\u5065\u8eab\u4e2d\u5fc3', 'SPA', '\u5546\u52a1\u4e2d\u5fc3', '\u793c\u5bbe\u670d\u52a1', '\u5ba2\u623f\u9001\u9910'];

    if (hotelType === 'economy') return basic;
    if (hotelType === 'comfort') return [...basic, ...comfort];
    return [...basic, ...comfort, ...luxury];
}

export async function searchNearbyAttractions(
    location: { lat: number; lng: number },
    radius: number = 3000
): Promise<Array<{ name: string; distance: string }>> {
    const key = getAmapKey();
    if (!key && !useServerKeys) return [];

    try {
        const params = new URLSearchParams({
            location: `${location.lng},${location.lat}`,
            radius: radius.toString(),
            types: POI_TYPES.attraction,
            offset: '5',
            output: 'json',
        });

        const response = await (useServerKeys
            ? fetch(buildApiUrl('/api/amap/around', params), { headers: buildHeaders() })
            : fetch(`https://restapi.amap.com/v3/place/around?key=${key}&${params}`));

        if (!response.ok) return [];

        const data = await response.json();
        if (data.status !== '1') return [];

        return (data.pois || []).map((poi: { name: string; distance: string }) => ({
            name: poi.name,
            distance: parseInt(poi.distance, 10) >= 1000
                ? `${(parseInt(poi.distance, 10) / 1000).toFixed(1)}km`
                : `${poi.distance}m`,
        }));
    } catch {
        return [];
    }
}

export async function searchAttractions(city: string, keyword?: string): Promise<POISearchResult> {
    return searchPOI(keyword || DEFAULT_ATTRACTION_KEYWORD, city, 'attraction', 10);
}

export async function searchRestaurants(city: string, keyword?: string): Promise<POISearchResult> {
    return searchPOI(keyword || DEFAULT_RESTAURANT_KEYWORD, city, 'restaurant', 10);
}

export async function getRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    strategy: number = 0
): Promise<{ success: boolean; distance?: number; duration?: number; error?: string }> {
    const key = getAmapKey();
    if (!key && !useServerKeys) {
        return { success: false, error: 'Amap API not configured' };
    }

    try {
        const params = new URLSearchParams({
            origin: `${origin.lng},${origin.lat}`,
            destination: `${destination.lng},${destination.lat}`,
            strategy: strategy.toString(),
            output: 'json',
        });

        const response = await (useServerKeys
            ? fetch(buildApiUrl('/api/amap/route', params), { headers: buildHeaders() })
            : fetch(`https://restapi.amap.com/v3/direction/driving?key=${key}&${params}`));

        if (!response.ok) {
            return { success: false, error: `Route planning failed: ${response.status}` };
        }

        const data = await response.json();
        if (data.status !== '1' || !data.route?.paths?.[0]) {
            return { success: false, error: data.info || 'Route not found' };
        }

        const path = data.route.paths[0];
        return {
            success: true,
            distance: parseInt(path.distance, 10),
            duration: parseInt(path.duration, 10),
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Route planning request failed',
        };
    }
}

export function isAmapConfigured(): boolean {
    if (useServerKeys) return true;
    const config = loadAPIConfig();
    return config.amap.enabled && Boolean(config.amap.apiKey);
}

export function poiToPlaceInfo(poi: AmapPOI, category: 'hotel' | 'restaurant' | 'attraction'): {
    id: string;
    name: string;
    category: 'hotel' | 'restaurant' | 'attraction' | 'transport';
    rating?: number;
    priceLevel?: number;
    image?: string;
    address?: string;
    tags?: string[];
} {
    return {
        id: poi.id,
        name: poi.name,
        category,
        rating: poi.rating,
        priceLevel: poi.cost ? Math.min(5, Math.ceil(parseFloat(poi.cost) / 100)) : undefined,
        image: poi.photos?.[0],
        address: poi.address,
        tags: poi.type?.split(';').slice(0, 2),
    };
}
