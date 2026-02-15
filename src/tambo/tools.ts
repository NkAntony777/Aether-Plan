/**
 * Tambo Tools - Local AI tools for travel and planning services
 *
 * This module defines TamboTool objects for various AI-powered operations:
 * - Flight search (via Amadeus API)
 * - Train search (via 12306 API)
 * - Hotel search (via Amap POI)
 * - Place recommendations (via Amap POI)
 * - Geocoding (via Amap)
 * - Web search (via Brave Search)
 *
 * These tools can be registered with TamboProvider to enable AI-driven
 * function calling in chat interactions.
 *
 * @module tambo/tools
 */

import { defineTool, type TamboTool } from '@tambo-ai/react';
import { z } from 'zod';

// ============================================================================
// API Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

// ============================================================================
// Input/Output Schemas
// ============================================================================

/**
 * Schema for flight search parameters
 */
export const SearchFlightsInputSchema = z.object({
  origin: z.string().describe('IATA code of departure airport (e.g., PEK, PVG)'),
  destination: z.string().describe('IATA code of arrival airport (e.g., SHA, CAN)'),
  departureDate: z.string().describe('Departure date in YYYY-MM-DD format'),
  returnDate: z.string().optional().describe('Return date for round trip (YYYY-MM-DD)'),
  adults: z.number().min(1).max(9).optional().default(1).describe('Number of adult passengers'),
});

/**
 * Schema for flight search result
 */
export const FlightResultSchema = z.object({
  id: z.string(),
  airline: z.string(),
  airlineCode: z.string(),
  flightNumber: z.string(),
  departure: z.object({
    airport: z.string(),
    time: z.string(),
    terminal: z.string().optional(),
  }),
  arrival: z.object({
    airport: z.string(),
    time: z.string(),
    terminal: z.string().optional(),
  }),
  duration: z.string(),
  stops: z.number(),
  price: z.object({
    amount: z.number(),
    currency: z.string(),
  }),
  cabinClass: z.string(),
});

/**
 * Schema for train search parameters
 */
export const SearchTrainsInputSchema = z.object({
  from: z.string().describe('Departure station name or city (e.g., "Beijing", "Shanghai")'),
  to: z.string().describe('Arrival station name or city'),
  date: z.string().describe('Travel date in YYYY-MM-DD format'),
});

/**
 * Schema for train ticket result
 */
export const TrainResultSchema = z.object({
  train_no: z.string(),
  start_train_code: z.string(),
  start_date: z.string(),
  start_time: z.string(),
  arrive_time: z.string(),
  lishi: z.string(),
  from_station: z.string(),
  to_station: z.string(),
  prices: z.array(z.object({
    seat_name: z.string(),
    seat_type_code: z.string(),
    num: z.string(),
    price: z.number(),
  })),
});

/**
 * Schema for hotel search parameters
 */
export const SearchHotelsInputSchema = z.object({
  city: z.string().describe('City name to search for hotels'),
  keywords: z.string().optional().describe('Optional search keywords'),
  types: z.string().optional().describe('POI type codes for filtering'),
  offset: z.number().optional().default(10).describe('Number of results to return'),
});

/**
 * Schema for hotel result
 */
export const HotelResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
  address: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  tel: z.string().optional(),
  rating: z.number().optional(),
  cost: z.string().optional(),
  photos: z.array(z.string()).optional(),
  distance: z.number().optional(),
});

/**
 * Schema for place search parameters
 */
export const SearchPlacesInputSchema = z.object({
  keywords: z.string().describe('Search keywords (e.g., "restaurant", "attraction")'),
  city: z.string().describe('City name to search within'),
  types: z.string().optional().describe('POI type codes for filtering'),
  offset: z.number().optional().default(10).describe('Number of results to return'),
});

/**
 * Schema for place result
 */
export const PlaceResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  typecode: z.string().optional(),
  address: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  tel: z.string().optional(),
  rating: z.number().optional(),
  cost: z.string().optional(),
  photos: z.array(z.string()).optional(),
  distance: z.number().optional(),
});

/**
 * Schema for geocoding parameters
 */
export const GeocodeInputSchema = z.object({
  address: z.string().describe('Address or location name to geocode'),
});

/**
 * Schema for geocoding result
 */
export const GeocodeResultSchema = z.object({
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  formattedAddress: z.string(),
});

/**
 * Schema for web search parameters
 */
export const WebSearchInputSchema = z.object({
  query: z.string().describe('Search query'),
  count: z.number().min(1).max(10).optional().default(5).describe('Number of results to return'),
  country: z.string().optional().describe('Country code for results (e.g., "CN", "US")'),
  freshness: z.string().optional().describe('Freshness filter (e.g., "day", "week", "month")'),
});

/**
 * Schema for web search result
 */
export const WebSearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string(),
  age: z.string().optional(),
  source: z.string().optional(),
});

/**
 * Schema for POI around location parameters
 */
export const SearchAroundInputSchema = z.object({
  location: z.string().describe('Location coordinates as "lng,lat" string'),
  radius: z.number().optional().default(3000).describe('Search radius in meters'),
});

/**
 * Schema for around search result
 */
export const AroundResultSchema = z.object({
  name: z.string(),
  distance: z.string(),
});

/**
 * Schema for route planning parameters
 */
export const RouteInputSchema = z.object({
  origin: z.string().describe('Origin location as "lng,lat" string'),
  destination: z.string().describe('Destination location as "lng,lat" string'),
  strategy: z.number().optional().default(0).describe('Route strategy (0=recommended, 1=fastest, 2=shortest)'),
});

/**
 * Schema for route result
 */
export const RouteResultSchema = z.object({
  distance: z.number().describe('Total distance in meters'),
  duration: z.number().describe('Estimated duration in seconds'),
});

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Search for flights using Amadeus API
 *
 * @example
 * ```typescript
 * const result = await searchFlightsTool.tool({
 *   origin: 'PVG',
 *   destination: 'PEK',
 *   departureDate: '2024-03-15',
 *   adults: 1
 * });
 * ```
 */
export const searchFlightsTool: TamboTool = defineTool({
  name: 'search_flights',
  title: 'Search Flights',
  description:
    'Search for flight options between two airports. Returns a list of available flights with times, prices, and airline information. Use IATA airport codes (e.g., PEK for Beijing, PVG for Shanghai).',
  inputSchema: SearchFlightsInputSchema,
  outputSchema: z.object({
    flights: z.array(FlightResultSchema),
  }),
  tool: async (params) => {
    const query = new URLSearchParams({
      origin: params.origin,
      destination: params.destination,
      departureDate: params.departureDate,
      adults: String(params.adults ?? 1),
    });
    if (params.returnDate) {
      query.append('returnDate', params.returnDate);
    }

    const response = await fetch(`${API_BASE_URL}/api/flights?${query.toString()}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Flight search failed: ${response.status}`);
    }

    return response.json();
  },
});

/**
 * Search for train tickets using 12306 API
 *
 * @example
 * ```typescript
 * const result = await searchTrainsTool.tool({
 *   from: 'Beijing',
 *   to: 'Shanghai',
 *   date: '2024-03-15'
 * });
 * ```
 */
export const searchTrainsTool: TamboTool = defineTool({
  name: 'search_trains',
  title: 'Search Trains',
  description:
    'Search for train tickets between two cities in China using the 12306 system. Returns available trains with times, seat types, prices, and availability. Supports Chinese city names.',
  inputSchema: SearchTrainsInputSchema,
  outputSchema: z.object({
    tickets: z.array(TrainResultSchema),
  }),
  tool: async (params) => {
    const query = new URLSearchParams({
      from: params.from,
      to: params.to,
      date: params.date,
    });

    const response = await fetch(`${API_BASE_URL}/api/12306/tickets?${query.toString()}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Train search failed: ${response.status}`);
    }

    return response.json();
  },
});

/**
 * Search for hotels using Amap POI API
 *
 * @example
 * ```typescript
 * const result = await searchHotelsTool.tool({
 *   city: 'Beijing',
 *   keywords: 'luxury',
 *   offset: 10
 * });
 * ```
 */
export const searchHotelsTool: TamboTool = defineTool({
  name: 'search_hotels',
  title: 'Search Hotels',
  description:
    'Search for hotels in a specific city using Amap (Gaode Maps) POI data. Returns hotel listings with names, addresses, ratings, and contact information.',
  inputSchema: SearchHotelsInputSchema,
  outputSchema: z.object({
    pois: z.array(HotelResultSchema),
  }),
  tool: async (params) => {
    const query = new URLSearchParams({
      keywords: params.keywords || 'hotel',
      city: params.city,
      offset: String(params.offset ?? 10),
    });
    if (params.types) {
      query.append('types', params.types);
    }

    const response = await fetch(`${API_BASE_URL}/api/amap/poi?${query.toString()}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Hotel search failed: ${response.status}`);
    }

    return response.json();
  },
});

/**
 * Search for places (restaurants, attractions, etc.) using Amap POI API
 *
 * @example
 * ```typescript
 * const result = await searchPlacesTool.tool({
 *   keywords: 'restaurant',
 *   city: 'Shanghai',
 *   offset: 10
 * });
 * ```
 */
export const searchPlacesTool: TamboTool = defineTool({
  name: 'search_places',
  title: 'Search Places',
  description:
    'Search for places of interest like restaurants, attractions, shopping centers, etc. using Amap (Gaode Maps) POI data. Useful for finding recommendations in a specific city.',
  inputSchema: SearchPlacesInputSchema,
  outputSchema: z.object({
    pois: z.array(PlaceResultSchema),
  }),
  tool: async (params) => {
    const query = new URLSearchParams({
      keywords: params.keywords,
      city: params.city,
      offset: String(params.offset ?? 10),
    });
    if (params.types) {
      query.append('types', params.types);
    }

    const response = await fetch(`${API_BASE_URL}/api/amap/poi?${query.toString()}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Place search failed: ${response.status}`);
    }

    return response.json();
  },
});

/**
 * Convert address to coordinates using Amap geocoding API
 *
 * @example
 * ```typescript
 * const result = await geocodeTool.tool({
 *   address: 'Tiananmen Square, Beijing'
 * });
 * ```
 */
export const geocodeTool: TamboTool = defineTool({
  name: 'geocode',
  title: 'Geocode Address',
  description:
    'Convert an address or place name to geographic coordinates (latitude and longitude). Useful for mapping locations or calculating distances.',
  inputSchema: GeocodeInputSchema,
  outputSchema: GeocodeResultSchema,
  tool: async (params) => {
    const query = new URLSearchParams({
      address: params.address,
    });

    const response = await fetch(`${API_BASE_URL}/api/amap/geocode?${query.toString()}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Geocoding failed: ${response.status}`);
    }

    return response.json();
  },
});

/**
 * Search the web for information using Brave Search API
 *
 * @example
 * ```typescript
 * const result = await webSearchTool.tool({
 *   query: 'best restaurants in Beijing',
 *   count: 5
 * });
 * ```
 */
export const webSearchTool: TamboTool = defineTool({
  name: 'web_search',
  title: 'Web Search',
  description:
    'Search the web for information using Brave Search. Returns relevant web pages with titles, URLs, and descriptions. Use this to find current information, reviews, or general knowledge.',
  inputSchema: WebSearchInputSchema,
  outputSchema: z.object({
    query: z.string(),
    results: z.array(WebSearchResultSchema),
  }),
  tool: async (params) => {
    const query = new URLSearchParams({
      q: params.query,
      count: String(params.count ?? 5),
    });
    if (params.country) {
      query.append('country', params.country);
    }
    if (params.freshness) {
      query.append('freshness', params.freshness);
    }

    const response = await fetch(`${API_BASE_URL}/api/search?${query.toString()}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Web search failed: ${response.status}`);
    }

    return response.json();
  },
});

/**
 * Search for POIs around a specific location
 *
 * @example
 * ```typescript
 * const result = await searchAroundTool.tool({
 *   location: '116.397428,39.90923',
 *   radius: 3000
 * });
 * ```
 */
export const searchAroundTool: TamboTool = defineTool({
  name: 'search_around',
  title: 'Search Nearby',
  description:
    'Search for points of interest around a specific location. Provide coordinates as "longitude,latitude" and a search radius in meters. Returns nearby hotels, restaurants, and other POIs.',
  inputSchema: SearchAroundInputSchema,
  outputSchema: z.object({
    items: z.array(AroundResultSchema),
  }),
  tool: async (params) => {
    const query = new URLSearchParams({
      location: params.location,
      radius: String(params.radius ?? 3000),
    });

    const response = await fetch(`${API_BASE_URL}/api/amap/around?${query.toString()}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Around search failed: ${response.status}`);
    }

    return response.json();
  },
});

/**
 * Calculate driving route between two locations
 *
 * @example
 * ```typescript
 * const result = await routeTool.tool({
 *   origin: '116.397428,39.90923',
 *   destination: '121.473701,31.230416',
 *   strategy: 0
 * });
 * ```
 */
export const routeTool: TamboTool = defineTool({
  name: 'calculate_route',
  title: 'Calculate Route',
  description:
    'Calculate a driving route between two locations. Provide coordinates as "longitude,latitude". Returns total distance in meters and estimated duration in seconds.',
  inputSchema: RouteInputSchema,
  outputSchema: RouteResultSchema,
  tool: async (params) => {
    const query = new URLSearchParams({
      origin: params.origin,
      destination: params.destination,
      strategy: String(params.strategy ?? 0),
    });

    const response = await fetch(`${API_BASE_URL}/api/amap/route?${query.toString()}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Route calculation failed: ${response.status}`);
    }

    return response.json();
  },
});

// ============================================================================
// Tool Collections
// ============================================================================

/**
 * All travel-related tools for trip planning
 */
export const travelTools: TamboTool[] = [
  searchFlightsTool,
  searchTrainsTool,
  searchHotelsTool,
  searchPlacesTool,
  geocodeTool,
  searchAroundTool,
  routeTool,
];

/**
 * All search-related tools
 */
export const searchTools: TamboTool[] = [
  webSearchTool,
  searchPlacesTool,
  searchHotelsTool,
];

/**
 * All available tools for registration with TamboProvider
 */
export const tamboTools: TamboTool[] = [
  searchFlightsTool,
  searchTrainsTool,
  searchHotelsTool,
  searchPlacesTool,
  geocodeTool,
  webSearchTool,
  searchAroundTool,
  routeTool,
];

// ============================================================================
// Type Exports
// ============================================================================

export type SearchFlightsInput = z.infer<typeof SearchFlightsInputSchema>;
export type FlightResult = z.infer<typeof FlightResultSchema>;
export type SearchTrainsInput = z.infer<typeof SearchTrainsInputSchema>;
export type TrainResult = z.infer<typeof TrainResultSchema>;
export type SearchHotelsInput = z.infer<typeof SearchHotelsInputSchema>;
export type HotelResult = z.infer<typeof HotelResultSchema>;
export type SearchPlacesInput = z.infer<typeof SearchPlacesInputSchema>;
export type PlaceResult = z.infer<typeof PlaceResultSchema>;
export type GeocodeInput = z.infer<typeof GeocodeInputSchema>;
export type GeocodeResult = z.infer<typeof GeocodeResultSchema>;
export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;
export type WebSearchResult = z.infer<typeof WebSearchResultSchema>;
export type SearchAroundInput = z.infer<typeof SearchAroundInputSchema>;
export type AroundResult = z.infer<typeof AroundResultSchema>;
export type RouteInput = z.infer<typeof RouteInputSchema>;
export type RouteResult = z.infer<typeof RouteResultSchema>;
