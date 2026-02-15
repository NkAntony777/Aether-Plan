/**
 * Tambo Zod Schemas for Widget Data Validation
 *
 * This module defines Zod schemas for all widget data structures used in the
 * Aether Plan application. These schemas enable type-safe validation and
 * TypeScript type inference for Tambo AI tool calls.
 *
 * @module tambo/schemas
 */

import { z } from 'zod';

// ============================================================================
// Common/Shared Schemas
// ============================================================================

/**
 * Schema for location coordinates
 */
export const CoordinatesSchema = z.object({
  lat: z.number().describe('Latitude coordinate'),
  lng: z.number().describe('Longitude coordinate'),
});

/**
 * Schema for map location marker
 */
export const MapLocationSchema = z.object({
  id: z.string().describe('Unique identifier for the location'),
  name: z.string().describe('Name of the location'),
  lat: z.number().describe('Latitude coordinate'),
  lng: z.number().describe('Longitude coordinate'),
  type: z.string().optional().describe('Type of location (e.g., attraction, transport)'),
});

// ============================================================================
// MapWidget Schemas
// ============================================================================

/**
 * Schema for MapWidget payload
 */
export const MapWidgetPayloadSchema = z.object({
  center: CoordinatesSchema.optional().describe('Map center coordinates'),
  zoom: z.number().min(1).max(20).optional().describe('Map zoom level (1-20)'),
  locations: z.array(MapLocationSchema).optional().describe('Array of locations to display on the map'),
  title: z.string().optional().describe('Optional title displayed above the map'),
});

// ============================================================================
// DateRangeWidget Schemas
// ============================================================================

/**
 * Schema for date range
 */
export const DateRangeSchema = z.object({
  start: z.string().describe('Start date in YYYY-MM-DD format'),
  end: z.string().describe('End date in YYYY-MM-DD format'),
});

/**
 * Schema for DateRangeWidget payload
 */
export const DateRangeWidgetPayloadSchema = z.object({
  minDate: z.string().optional().describe('Minimum selectable date (YYYY-MM-DD)'),
  maxDate: z.string().optional().describe('Maximum selectable date (YYYY-MM-DD)'),
  defaultRange: DateRangeSchema.optional().describe('Default selected date range'),
  context: z.string().optional().describe('Context hint for the date selection'),
});

/**
 * Schema for DateRangeWidget response
 */
export const DateRangeWidgetResponseSchema = DateRangeSchema;

// ============================================================================
// FlightResultsWidget Schemas
// ============================================================================

/**
 * Schema for flight departure/arrival info
 */
export const FlightEndpointSchema = z.object({
  airport: z.string().describe('Airport code or name'),
  time: z.string().describe('ISO timestamp or time string'),
  terminal: z.string().optional().describe('Terminal information'),
});

/**
 * Schema for flight price
 */
export const FlightPriceSchema = z.object({
  amount: z.number().describe('Price amount'),
  currency: z.string().describe('Currency code (e.g., CNY, USD)'),
});

/**
 * Schema for a single flight offer
 */
export const FlightOfferSchema = z.object({
  id: z.string().describe('Unique flight identifier'),
  airline: z.string().describe('Airline name'),
  airlineCode: z.string().describe('Airline IATA code'),
  flightNumber: z.string().describe('Flight number'),
  departure: FlightEndpointSchema.describe('Departure information'),
  arrival: FlightEndpointSchema.describe('Arrival information'),
  duration: z.string().describe('Flight duration (e.g., "2h30m")'),
  stops: z.number().describe('Number of stops'),
  price: FlightPriceSchema.describe('Price information'),
  cabinClass: z.string().describe('Cabin class (e.g., ECONOMY, BUSINESS)'),
});

/**
 * Schema for FlightResultsWidget payload
 */
export const FlightResultsWidgetPayloadSchema = z.object({
  flights: z.array(FlightOfferSchema).describe('Array of flight offers'),
  title: z.string().optional().describe('Optional title for the widget'),
  origin: z.string().optional().describe('Origin city or airport'),
  destination: z.string().optional().describe('Destination city or airport'),
});

/**
 * Schema for FlightResultsWidget response (selected flight or skip)
 */
export const FlightResultsWidgetResponseSchema = z.union([
  FlightOfferSchema,
  z.object({
    kind: z.literal('skip'),
    mode: z.literal('flight'),
  }),
]);

// ============================================================================
// TrainResultsWidget Schemas
// ============================================================================

/**
 * Schema for train ticket price info
 */
export const TrainPriceSchema = z.object({
  seat_name: z.string().describe('Seat type name (e.g., 二等座, 一等座)'),
  seat_type_code: z.string().describe('Seat type code'),
  num: z.string().describe('Availability status or number of seats'),
  price: z.number().describe('Price in CNY'),
  discount: z.number().nullable().optional().describe('Discount amount if applicable'),
});

/**
 * Schema for train ticket info
 */
export const TicketInfoSchema = z.object({
  train_no: z.string().describe('Train number identifier'),
  start_train_code: z.string().describe('Train code for display'),
  start_date: z.string().describe('Departure date'),
  start_time: z.string().describe('Departure time (HH:mm)'),
  arrive_date: z.string().describe('Arrival date'),
  arrive_time: z.string().describe('Arrival time (HH:mm)'),
  lishi: z.string().describe('Duration string'),
  from_station: z.string().describe('Departure station name'),
  to_station: z.string().describe('Arrival station name'),
  from_station_telecode: z.string().describe('Departure station telecode'),
  to_station_telecode: z.string().describe('Arrival station telecode'),
  prices: z.array(TrainPriceSchema).describe('Array of seat prices'),
  dw_flag: z.array(z.string()).describe('Additional flags'),
});

/**
 * Schema for TrainResultsWidget payload
 */
export const TrainResultsWidgetPayloadSchema = z.object({
  tickets: z.array(TicketInfoSchema).describe('Array of train tickets'),
  title: z.string().optional().describe('Optional title for the widget'),
  origin: z.string().optional().describe('Origin station name'),
  destination: z.string().optional().describe('Destination station name'),
  date: z.string().optional().describe('Travel date'),
});

/**
 * Schema for TrainResultsWidget response (selected ticket or skip)
 */
export const TrainResultsWidgetResponseSchema = z.union([
  TicketInfoSchema,
  z.object({
    kind: z.literal('skip'),
    mode: z.literal('train'),
  }),
]);

// ============================================================================
// HotelSearchWidget Schemas
// ============================================================================

/**
 * Schema for hotel room type
 */
export const HotelRoomTypeSchema = z.object({
  name: z.string().describe('Room type name'),
  price: z.number().describe('Room price per night'),
  capacity: z.number().describe('Maximum occupancy'),
});

/**
 * Schema for nearby attraction
 */
export const NearbyAttractionSchema = z.object({
  name: z.string().describe('Attraction name'),
  distance: z.string().describe('Distance from hotel'),
});

/**
 * Schema for hotel info
 */
export const HotelInfoSchema = z.object({
  id: z.string().describe('Unique hotel identifier'),
  name: z.string().describe('Hotel name'),
  type: z.string().optional().describe('Hotel type classification'),
  rating: z.number().optional().describe('Hotel rating (0-5)'),
  price: z.number().optional().describe('Starting price per night'),
  priceRange: z.string().optional().describe('Price range description'),
  address: z.string().optional().describe('Hotel address'),
  image: z.string().optional().describe('Hotel image URL'),
  tags: z.array(z.string()).optional().describe('Hotel feature tags'),
  distance: z.number().optional().describe('Distance from city center'),
  tel: z.string().optional().describe('Hotel telephone number'),
  facilities: z.array(z.string()).optional().describe('Available facilities'),
  roomTypes: z.array(HotelRoomTypeSchema).optional().describe('Available room types'),
  nearbyAttractions: z.array(NearbyAttractionSchema).optional().describe('Nearby attractions'),
});

/**
 * Schema for HotelSearchWidget payload
 */
export const HotelSearchWidgetPayloadSchema = z.object({
  city: z.string().describe('City to search for hotels'),
  hotels: z.array(HotelInfoSchema).optional().describe('Array of hotel results'),
  title: z.string().optional().describe('Optional title for the widget'),
  showTypeSelection: z.boolean().optional().describe('Whether to show hotel type selection'),
  showKeywordInput: z.boolean().optional().describe('Whether to show keyword search input'),
  isSearching: z.boolean().optional().describe('Whether search is in progress'),
});

// ============================================================================
// PlaceCardsWidget Schemas
// ============================================================================

/**
 * Schema for place info (used for restaurants, attractions, etc.)
 */
export const PlaceInfoSchema = z.object({
  id: z.string().describe('Unique place identifier'),
  name: z.string().describe('Place name'),
  category: z.enum(['hotel', 'restaurant', 'attraction', 'transport']).describe('Place category'),
  rating: z.number().optional().describe('Rating (0-5)'),
  priceLevel: z.number().optional().describe('Price level (1-5)'),
  image: z.string().optional().describe('Place image URL'),
  address: z.string().optional().describe('Place address'),
  distance: z.string().optional().describe('Distance from reference point'),
  tags: z.array(z.string()).optional().describe('Place feature tags'),
});

/**
 * Schema for PlaceCardsWidget payload
 */
export const PlaceCardsWidgetPayloadSchema = z.object({
  places: z.array(PlaceInfoSchema).describe('Array of places to display'),
  title: z.string().optional().describe('Optional title for the widget'),
  selectable: z.boolean().optional().describe('Whether places can be selected'),
});

// ============================================================================
// ChecklistWidget Schemas
// ============================================================================

/**
 * Schema for a single checklist item
 */
export const ChecklistItemSchema = z.object({
  id: z.string().describe('Unique item identifier'),
  label: z.string().describe('Item label text'),
  description: z.string().optional().describe('Optional item description'),
  checked: z.boolean().optional().describe('Whether item is initially checked'),
});

/**
 * Schema for ChecklistWidget payload
 */
export const ChecklistWidgetPayloadSchema = z.object({
  title: z.string().optional().describe('Optional title for the checklist'),
  items: z.array(ChecklistItemSchema).describe('Array of checklist items'),
  selectable: z.boolean().optional().describe('Whether items can be toggled'),
});

/**
 * Schema for ChecklistWidget response
 */
export const ChecklistWidgetResponseSchema = z.object({
  selected: z.array(z.string()).describe('Array of selected item IDs'),
});

// ============================================================================
// MarkdownCardWidget Schemas
// ============================================================================

/**
 * Schema for MarkdownCardWidget payload
 */
export const MarkdownCardWidgetPayloadSchema = z.object({
  title: z.string().optional().describe('Optional title for the card'),
  content: z.string().describe('Markdown content to render'),
});

// ============================================================================
// ResourceListWidget Schemas
// ============================================================================

/**
 * Schema for a single resource item
 */
export const ResourceItemSchema = z.object({
  id: z.string().describe('Unique resource identifier'),
  title: z.string().describe('Resource title'),
  type: z.string().optional().describe('Resource type'),
  description: z.string().optional().describe('Resource description'),
  url: z.string().optional().describe('Resource URL'),
});

/**
 * Schema for ResourceListWidget payload
 */
export const ResourceListWidgetPayloadSchema = z.object({
  title: z.string().optional().describe('Optional title for the list'),
  resources: z.array(ResourceItemSchema).describe('Array of resources to display'),
});

// ============================================================================
// RadioCardsWidget Schemas
// ============================================================================

/**
 * Schema for a single radio card option
 */
export const RadioCardOptionSchema = z.object({
  id: z.string().describe('Unique option identifier'),
  label: z.string().describe('Option label text'),
  description: z.string().optional().describe('Optional option description'),
  icon: z.string().optional().describe('Icon name for the option'),
});

/**
 * Schema for RadioCardsWidget payload
 */
export const RadioCardsWidgetPayloadSchema = z.object({
  options: z.array(RadioCardOptionSchema).describe('Array of selectable options'),
  title: z.string().optional().describe('Optional title for the widget'),
});

/**
 * Schema for RadioCardsWidget response (selected option ID)
 */
export const RadioCardsWidgetResponseSchema = z.string();

// ============================================================================
// TextInputWidget Schemas
// ============================================================================

/**
 * Schema for TextInputWidget payload
 */
export const TextInputWidgetPayloadSchema = z.object({
  placeholder: z.string().optional().describe('Input placeholder text'),
  label: z.string().optional().describe('Optional label above the input'),
  icon: z.enum(['location', 'text']).optional().describe('Icon type to display'),
  context: z.string().optional().describe('Context hint for the input'),
  fieldKey: z.string().optional().describe('Key identifier for the field'),
});

/**
 * Schema for TextInputWidget response (entered text)
 */
export const TextInputWidgetResponseSchema = z.string();

// ============================================================================
// Composite/Planning Schemas
// ============================================================================

/**
 * Schema for collected planning data
 */
export const CollectedDataSchema = z.object({
  destination: z.string().optional().describe('Destination location'),
  origin: z.string().optional().describe('Origin location'),
  dates: DateRangeSchema.optional().describe('Travel dates'),
  travelers: z.number().optional().describe('Number of travelers'),
  transportMode: z.enum(['flight', 'train', 'drive', 'bus']).optional().describe('Transport mode'),
  returnTransportMode: z.enum(['flight', 'train', 'drive', 'skip']).optional().describe('Return transport mode'),
  selectedFlight: FlightOfferSchema.optional().describe('Selected flight offer'),
  selectedTrain: TicketInfoSchema.optional().describe('Selected train ticket'),
  selectedHotel: HotelInfoSchema.optional().describe('Selected hotel'),
  selectedPlaces: z.array(PlaceInfoSchema).optional().describe('Selected places'),
  budget: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string(),
  }).optional().describe('Budget range'),
  preferences: z.array(z.string()).optional().describe('User preferences'),
  draftPlan: z.string().optional().describe('Draft plan text'),
  webEnrichedPlan: z.string().optional().describe('Web-enriched plan text'),
  webSources: z.array(z.object({
    title: z.string(),
    url: z.string(),
    description: z.string().optional(),
  })).optional().describe('Web sources used'),
  planType: z.enum(['travel', 'study', 'project', 'event', 'life', 'other']).optional().describe('Type of plan'),
  goal: z.string().optional().describe('Planning goal'),
  domainSlots: z.record(z.string(), z.unknown()).optional().describe('Domain-specific data slots'),
});

// ============================================================================
// Widget Type Union Schema
// ============================================================================

/**
 * Union schema for all widget payloads
 */
export const WidgetPayloadSchema = z.union([
  MapWidgetPayloadSchema,
  DateRangeWidgetPayloadSchema,
  FlightResultsWidgetPayloadSchema,
  TrainResultsWidgetPayloadSchema,
  HotelSearchWidgetPayloadSchema,
  PlaceCardsWidgetPayloadSchema,
  ChecklistWidgetPayloadSchema,
  MarkdownCardWidgetPayloadSchema,
  ResourceListWidgetPayloadSchema,
  RadioCardsWidgetPayloadSchema,
  TextInputWidgetPayloadSchema,
]);

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type MapLocation = z.infer<typeof MapLocationSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type FlightEndpoint = z.infer<typeof FlightEndpointSchema>;
export type FlightPrice = z.infer<typeof FlightPriceSchema>;
export type FlightOffer = z.infer<typeof FlightOfferSchema>;
export type TrainPrice = z.infer<typeof TrainPriceSchema>;
export type TicketInfo = z.infer<typeof TicketInfoSchema>;
export type HotelRoomType = z.infer<typeof HotelRoomTypeSchema>;
export type NearbyAttraction = z.infer<typeof NearbyAttractionSchema>;
export type HotelInfo = z.infer<typeof HotelInfoSchema>;
export type PlaceInfo = z.infer<typeof PlaceInfoSchema>;
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type ResourceItem = z.infer<typeof ResourceItemSchema>;
export type RadioCardOption = z.infer<typeof RadioCardOptionSchema>;
export type CollectedData = z.infer<typeof CollectedDataSchema>;

// Widget Payload Types
export type MapWidgetPayload = z.infer<typeof MapWidgetPayloadSchema>;
export type DateRangeWidgetPayload = z.infer<typeof DateRangeWidgetPayloadSchema>;
export type FlightResultsWidgetPayload = z.infer<typeof FlightResultsWidgetPayloadSchema>;
export type TrainResultsWidgetPayload = z.infer<typeof TrainResultsWidgetPayloadSchema>;
export type HotelSearchWidgetPayload = z.infer<typeof HotelSearchWidgetPayloadSchema>;
export type PlaceCardsWidgetPayload = z.infer<typeof PlaceCardsWidgetPayloadSchema>;
export type ChecklistWidgetPayload = z.infer<typeof ChecklistWidgetPayloadSchema>;
export type MarkdownCardWidgetPayload = z.infer<typeof MarkdownCardWidgetPayloadSchema>;
export type ResourceListWidgetPayload = z.infer<typeof ResourceListWidgetPayloadSchema>;
export type RadioCardsWidgetPayload = z.infer<typeof RadioCardsWidgetPayloadSchema>;
export type TextInputWidgetPayload = z.infer<typeof TextInputWidgetPayloadSchema>;

// Widget Response Types
export type DateRangeWidgetResponse = z.infer<typeof DateRangeWidgetResponseSchema>;
export type FlightResultsWidgetResponse = z.infer<typeof FlightResultsWidgetResponseSchema>;
export type TrainResultsWidgetResponse = z.infer<typeof TrainResultsWidgetResponseSchema>;
export type ChecklistWidgetResponse = z.infer<typeof ChecklistWidgetResponseSchema>;
export type RadioCardsWidgetResponse = z.infer<typeof RadioCardsWidgetResponseSchema>;
export type TextInputWidgetResponse = z.infer<typeof TextInputWidgetResponseSchema>;

// Union Types
export type WidgetPayload = z.infer<typeof WidgetPayloadSchema>;
