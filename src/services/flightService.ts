// Amadeus Flight API Service
import { loadAPIConfig } from '../types/apiConfig';

const useServerKeys = (import.meta as { env?: Record<string, string> }).env?.VITE_USE_SERVER_KEYS === 'true';
const apiBase = (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE || '';
const apiToken = (import.meta as { env?: Record<string, string> }).env?.VITE_API_TOKEN;

function buildApiUrl(path: string, params?: URLSearchParams): string {
    const prefix = apiBase ? apiBase.replace(/\/$/, '') : '';
    const query = params ? `?${params.toString()}` : '';
    return `${prefix}${path.startsWith('/') ? path : `/${path}`}${query}`;
}

// Airport codes for common cities
const CITY_AIRPORT_CODES: Record<string, string> = {
    // China
    '北京': 'PEK',
    '上海': 'PVG',
    '广州': 'CAN',
    '深圳': 'SZX',
    '成都': 'CTU',
    '杭州': 'HGH',
    '西安': 'XIY',
    '三亚': 'SYX',
    '重庆': 'CKG',
    '南京': 'NKG',
    '武汉': 'WUH',
    '厦门': 'XMN',
    '青岛': 'TAO',
    '大连': 'DLC',
    '昆明': 'KMG',
    '香港': 'HKG',
    // International
    '东京': 'NRT',
    '首尔': 'ICN',
    '新加坡': 'SIN',
    '曼谷': 'BKK',
    '巴黎': 'CDG',
    '伦敦': 'LHR',
    '纽约': 'JFK',
    '洛杉矶': 'LAX',
    '迪拜': 'DXB',
    '悉尼': 'SYD',
};

export interface FlightOffer {
    id: string;
    airline: string;
    airlineCode: string;
    flightNumber: string;
    departure: {
        airport: string;
        time: string;
        terminal?: string;
    };
    arrival: {
        airport: string;
        time: string;
        terminal?: string;
    };
    duration: string;
    stops: number;
    price: {
        amount: number;
        currency: string;
    };
    cabinClass: string;
}

export interface FlightSearchResult {
    success: boolean;
    flights?: FlightOffer[];
    error?: string;
}

// Token cache
let accessToken: string | null = null;
let tokenExpiry: number = 0;

// Get Amadeus OAuth token
async function getAmadeusToken(): Promise<string | null> {
    if (useServerKeys) {
        return null;
    }
    const config = loadAPIConfig();

    if (!config.amadeus.enabled || !config.amadeus.apiKey || !config.amadeus.apiSecret) {
        return null;
    }

    // Return cached token if still valid
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    try {
        const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: config.amadeus.apiKey,
                client_secret: config.amadeus.apiSecret,
            }),
        });

        if (!response.ok) {
            console.error('Amadeus token error:', response.status);
            return null;
        }

        const data = await response.json();
        accessToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Expire 1 min early
        return accessToken;
    } catch (error) {
        console.error('Amadeus token fetch error:', error);
        return null;
    }
}

async function searchFlightsViaProxy(
    origin: string,
    destination: string,
    departureDate: string,
    returnDate?: string,
    adults: number = 1
): Promise<FlightSearchResult> {
    const params = new URLSearchParams({
        origin,
        destination,
        departureDate,
        adults: String(adults),
    });
    if (returnDate) params.set('returnDate', returnDate);

    const headers: Record<string, string> = {};
    if (apiToken) headers['x-aether-token'] = apiToken;

    const url = buildApiUrl('/api/flights', params);
    try {
        let response = await fetch(url, { headers });
        if (!response.ok && !apiBase && typeof window !== 'undefined') {
            const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
            if (isLocalhost) {
                const fallbackUrl = `http://localhost:8787/api/flights?${params.toString()}`;
                response = await fetch(fallbackUrl, { headers });
            }
        }
        const data = await response.json().catch(() => ({} as Record<string, unknown>));
        if (!response.ok) {
            return { success: false, error: (data as { error?: string }).error || `http_${response.status}` };
        }
        return { success: true, flights: (data as { flights?: FlightOffer[] }).flights || [] };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'flight_proxy_failed' };
    }
}

// Get airport code for a city
export function getAirportCode(city: string): string | null {
    return CITY_AIRPORT_CODES[city] || null;
}

// Search for flights
export async function searchFlights(
    origin: string,
    destination: string,
    departureDate: string,
    returnDate?: string,
    adults: number = 1
): Promise<FlightSearchResult> {
    if (useServerKeys) {
        return searchFlightsViaProxy(origin, destination, departureDate, returnDate, adults);
    }
    const token = await getAmadeusToken();

    if (!token) {
        return {
            success: false,
            error: 'Amadeus API 未配置或认证失败',
        };
    }

    const originCode = getAirportCode(origin) || origin;
    const destCode = getAirportCode(destination) || destination;

    try {
        const params = new URLSearchParams({
            originLocationCode: originCode,
            destinationLocationCode: destCode,
            departureDate,
            adults: adults.toString(),
            currencyCode: 'CNY',
            max: '10',
        });

        if (returnDate) {
            params.append('returnDate', returnDate);
        }

        const response = await fetch(
            `https://test.api.amadeus.com/v2/shopping/flight-offers?${params}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.errors?.[0]?.detail || `航班搜索失败: ${response.status}`,
            };
        }

        const data = await response.json();

        // Parse flight offers
        const flights: FlightOffer[] = (data.data || []).map((offer: Record<string, unknown>, index: number) => {
            const itineraries = offer.itineraries as Array<{ duration: string; segments: Array<Record<string, unknown>> }>;
            const firstItinerary = itineraries?.[0];
            const firstSegment = firstItinerary?.segments?.[0];
            const lastSegment = firstItinerary?.segments?.[firstItinerary.segments.length - 1];
            const price = offer.price as { total: string; currency: string };

            return {
                id: `flight-${index}`,
                airline: (firstSegment?.carrierCode as string) || 'Unknown',
                airlineCode: (firstSegment?.carrierCode as string) || '',
                flightNumber: `${firstSegment?.carrierCode || ''}${firstSegment?.number || ''}`,
                departure: {
                    airport: (firstSegment?.departure as { iataCode: string; at: string; terminal?: string })?.iataCode || '',
                    time: (firstSegment?.departure as { iataCode: string; at: string })?.at || '',
                    terminal: (firstSegment?.departure as { terminal?: string })?.terminal,
                },
                arrival: {
                    airport: (lastSegment?.arrival as { iataCode: string; at: string; terminal?: string })?.iataCode || '',
                    time: (lastSegment?.arrival as { iataCode: string; at: string })?.at || '',
                    terminal: (lastSegment?.arrival as { terminal?: string })?.terminal,
                },
                duration: firstItinerary?.duration?.replace('PT', '').toLowerCase() || '',
                stops: (firstItinerary?.segments?.length || 1) - 1,
                price: {
                    amount: parseFloat(price?.total || '0'),
                    currency: price?.currency || 'CNY',
                },
                cabinClass: ((offer.travelerPricings as Array<{ fareDetailsBySegment: Array<{ cabin: string }> }>)?.[0]?.fareDetailsBySegment?.[0]?.cabin) || 'ECONOMY',
            };
        });

        return {
            success: true,
            flights,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : '航班搜索请求失败',
        };
    }
}

// Check if Amadeus is configured
export function isAmadeusConfigured(): boolean {
    if (useServerKeys) return true;
    const config = loadAPIConfig();
    return config.amadeus.enabled && Boolean(config.amadeus.apiKey && config.amadeus.apiSecret);
}
