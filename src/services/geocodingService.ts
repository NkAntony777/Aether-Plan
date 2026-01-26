// Geocoding Service - Convert city names to coordinates
// Using OpenStreetMap Nominatim API (free, no API key required)

export interface GeocodingResult {
    lat: number;
    lng: number;
    displayName: string;
    found: boolean;
}

// Cache for geocoding results to avoid repeated API calls
const geocodeCache: Record<string, GeocodingResult> = {};

// Common Chinese cities with pre-cached coordinates for faster response
const PRESET_CITIES: Record<string, { lat: number; lng: number; displayName: string }> = {
    '北京': { lat: 39.9042, lng: 116.4074, displayName: '北京市, 中国' },
    '上海': { lat: 31.2304, lng: 121.4737, displayName: '上海市, 中国' },
    '广州': { lat: 23.1291, lng: 113.2644, displayName: '广州市, 广东省, 中国' },
    '深圳': { lat: 22.5431, lng: 114.0579, displayName: '深圳市, 广东省, 中国' },
    '成都': { lat: 30.5728, lng: 104.0668, displayName: '成都市, 四川省, 中国' },
    '杭州': { lat: 30.2741, lng: 120.1551, displayName: '杭州市, 浙江省, 中国' },
    '西安': { lat: 34.3416, lng: 108.9398, displayName: '西安市, 陕西省, 中国' },
    '三亚': { lat: 18.2528, lng: 109.5119, displayName: '三亚市, 海南省, 中国' },
    '重庆': { lat: 29.4316, lng: 106.9123, displayName: '重庆市, 中国' },
    '南京': { lat: 32.0603, lng: 118.7969, displayName: '南京市, 江苏省, 中国' },
    '武汉': { lat: 30.5928, lng: 114.3055, displayName: '武汉市, 湖北省, 中国' },
    '苏州': { lat: 31.2990, lng: 120.5853, displayName: '苏州市, 江苏省, 中国' },
    '厦门': { lat: 24.4798, lng: 118.0894, displayName: '厦门市, 福建省, 中国' },
    '青岛': { lat: 36.0671, lng: 120.3826, displayName: '青岛市, 山东省, 中国' },
    '大连': { lat: 38.9140, lng: 121.6147, displayName: '大连市, 辽宁省, 中国' },
    '丽江': { lat: 26.8721, lng: 100.2299, displayName: '丽江市, 云南省, 中国' },
    '桂林': { lat: 25.2744, lng: 110.2992, displayName: '桂林市, 广西壮族自治区, 中国' },
    '拉萨': { lat: 29.6500, lng: 91.1000, displayName: '拉萨市, 西藏自治区, 中国' },
    '香港': { lat: 22.3193, lng: 114.1694, displayName: '香港特别行政区, 中国' },
    '澳门': { lat: 22.1987, lng: 113.5439, displayName: '澳门特别行政区, 中国' },
    '台北': { lat: 25.0330, lng: 121.5654, displayName: '台北市, 台湾' },
    // International cities
    '东京': { lat: 35.6762, lng: 139.6503, displayName: 'Tokyo, Japan' },
    '首尔': { lat: 37.5665, lng: 126.9780, displayName: 'Seoul, South Korea' },
    '新加坡': { lat: 1.3521, lng: 103.8198, displayName: 'Singapore' },
    '曼谷': { lat: 13.7563, lng: 100.5018, displayName: 'Bangkok, Thailand' },
    '巴黎': { lat: 48.8566, lng: 2.3522, displayName: 'Paris, France' },
    '伦敦': { lat: 51.5074, lng: -0.1278, displayName: 'London, UK' },
    '纽约': { lat: 40.7128, lng: -74.0060, displayName: 'New York, USA' },
    '洛杉矶': { lat: 34.0522, lng: -118.2437, displayName: 'Los Angeles, USA' },
    '迪拜': { lat: 25.2048, lng: 55.2708, displayName: 'Dubai, UAE' },
    '悉尼': { lat: -33.8688, lng: 151.2093, displayName: 'Sydney, Australia' },
};

/**
 * Geocode a city name to coordinates
 * First checks preset cities, then cache, then calls Nominatim API
 */
export async function geocodeCity(cityName: string): Promise<GeocodingResult> {
    // Normalize city name
    const normalizedName = cityName.trim();

    // Check preset cities first (fast path)
    if (PRESET_CITIES[normalizedName]) {
        const preset = PRESET_CITIES[normalizedName];
        return {
            lat: preset.lat,
            lng: preset.lng,
            displayName: preset.displayName,
            found: true,
        };
    }

    // Check cache
    if (geocodeCache[normalizedName]) {
        return geocodeCache[normalizedName];
    }

    // Call Nominatim API
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(normalizedName)}&format=json&limit=1&accept-language=zh`,
            {
                headers: {
                    'User-Agent': 'AetherPlan/1.0 (travel-planning-app)',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.length > 0) {
            const result: GeocodingResult = {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                displayName: data[0].display_name,
                found: true,
            };

            // Cache the result
            geocodeCache[normalizedName] = result;

            return result;
        }

        // City not found
        return {
            lat: 0,
            lng: 0,
            displayName: '',
            found: false,
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        return {
            lat: 0,
            lng: 0,
            displayName: '',
            found: false,
        };
    }
}

/**
 * Check if a city name is in presets (for faster validation)
 */
export function isPresetCity(cityName: string): boolean {
    return cityName.trim() in PRESET_CITIES;
}

/**
 * Get all preset city names
 */
export function getPresetCityNames(): string[] {
    return Object.keys(PRESET_CITIES);
}
