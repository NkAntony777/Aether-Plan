// Message and Widget type definitions

export type MessageRole = 'user' | 'assistant' | 'system';

// Base message interface
interface BaseMessage {
    id: string;
    role: MessageRole;
    timestamp: Date;
}

// Plain text message
export interface TextMessage extends BaseMessage {
    type: 'text';
    content: string;
}

// Widget types
export type WidgetType =
    // Basic inputs
    | 'text_input'
    | 'number_input'
    | 'textarea'
    // Selectors
    | 'single_select'
    | 'multi_select'
    | 'radio_cards'
    | 'checkbox_cards'
    | 'dropdown'
    | 'cascader'
    // Date/Time
    | 'date_picker'
    | 'date_range'
    | 'time_picker'
    | 'datetime_picker'
    // Location
    | 'location_input'
    | 'map_picker'
    | 'map_view'
    | 'route_display'
    // Travel
    | 'flight_search'
    | 'flight_results'
    | 'train_search'
    | 'train_tickets'
    | 'hotel_search'
    | 'hotel_search_advanced'
    | 'restaurant_cards'
    | 'attraction_cards'
    // Composite
    | 'traveler_form'
    | 'budget_slider'
    | 'rating_filter'
    | 'price_range'
    // Display
    | 'itinerary_view'
    | 'timeline'
    | 'comparison_table'
    | 'image_gallery'
    | 'weather_card'
    | 'currency_converter'
    // Confirmation
    | 'confirm_button'
    | 'action_buttons'
    | 'summary_card';

// Widget payload types
export interface RadioCardOption {
    id: string;
    label: string;
    description?: string;
    icon?: string;
    disabled?: boolean;
}

export interface DateRangePayload {
    minDate?: string;
    maxDate?: string;
    defaultRange?: { start: string; end: string };
    showPrice?: boolean;
    priceData?: Record<string, number>;
}

export interface FlightResult {
    id: string;
    airline: string;
    airlineLogo?: string;
    flightNumber: string;
    departure: { time: string; airport: string; city: string };
    arrival: { time: string; airport: string; city: string };
    duration: string;
    stops: number;
    price: { amount: number; currency: string };
}

export interface TrainResult {
    train_no: string;
    start_train_code: string;
    start_time: string;
    arrive_time: string;
    price: number;
    // Optional compatibility fields if needed
    id?: string;
    trainNumber?: string;
}

export interface PlaceInfo {
    id: string;
    name: string;
    category: 'hotel' | 'restaurant' | 'attraction' | 'transport';
    rating?: number;
    priceLevel?: number;
    image?: string;
    address?: string;
    distance?: string;
    tags?: string[];
}

// Widget message
export interface WidgetMessage extends BaseMessage {
    type: 'widget';
    widgetType: WidgetType;
    payload: Record<string, unknown>;
    userResponse?: unknown;
    isCompleted?: boolean;
}

// Union type for all messages
export type ChatMessage = TextMessage | WidgetMessage;

// Planning state
export interface CollectedData {
    destination?: string;
    origin?: string;
    dates?: { start: string; end: string };
    travelers?: number;
    transportMode?: 'flight' | 'train' | 'drive' | 'bus';
    returnTransportMode?: 'flight' | 'train' | 'drive' | 'skip';
    selectedFlight?: FlightResult;
    selectedTrain?: TrainResult;
    selectedHotel?: PlaceInfo;
    selectedPlaces?: PlaceInfo[];
    budget?: { min: number; max: number; currency: string };
    preferences?: string[];
    draftPlan?: string;
    webEnrichedPlan?: string;
    webSources?: { title: string; url: string; description?: string }[];
}

// API configuration
export interface ApiConfig {
    endpoint: string;
    method: 'GET' | 'POST';
    params?: Record<string, string>;
    headers?: Record<string, string>;
}
