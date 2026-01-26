import React, { Suspense, lazy } from 'react';
import type { WidgetMessage, PlaceInfo } from '../../types/message';
import RadioCardsWidget from './RadioCardsWidget';
import DateRangeWidget from './DateRangeWidget';
import TextInputWidget from './TextInputWidget';
import PlaceCardsWidget from './PlaceCardsWidget';
import FlightResultsWidget from './FlightResultsWidget';
import TrainResultsWidget from './TrainResultsWidget';
import HotelSearchContainer from './HotelSearchContainer';
import type { FlightOffer } from '../../services/flightService';
import type { TicketInfo } from '../../services/trainLogic';
import type { HotelInfo } from './HotelSearchWidget';

// Lazy load MapWidget to avoid SSR issues with Leaflet
const MapWidget = lazy(() => import('./MapWidget'));

interface WidgetRendererProps {
    message: WidgetMessage;
    onSubmit: (response: unknown) => void;
}

// Loading fallback for map
const MapLoading = () => (
    <div className="w-full max-w-2xl h-80 bg-stone-100 rounded-2xl animate-pulse flex items-center justify-center">
        <span className="text-stone-400 text-sm">Loading map...</span>
    </div>
);

const WidgetRenderer: React.FC<WidgetRendererProps> = ({ message, onSubmit }) => {
    const { widgetType, payload, isCompleted, userResponse } = message;

    // If widget is completed, show the selected response
    if (isCompleted && userResponse) {
        // Format date range nicely
        if (typeof userResponse === 'object' && 'start' in (userResponse as object)) {
            const { start, end } = userResponse as { start: string; end: string };
            return (
                <div className="px-1 py-2">
                    <p className="font-serif text-lg text-stone-800 italic border-l-2 border-sage-300 pl-4 py-1">
                        {start} → {end}
                    </p>
                </div>
            );
        }

        // Format flight selection
        if (typeof userResponse === 'object' && 'flightNumber' in (userResponse as object)) {
            const flight = userResponse as FlightOffer;
            return (
                <div className="px-1 py-2">
                    <p className="font-serif text-lg text-stone-800 italic border-l-2 border-sage-300 pl-4 py-1">
                        ✈️ {flight.flightNumber} - ¥{flight.price.amount.toLocaleString()}
                    </p>
                </div>
            );
        }

        // Format train selection
        if (typeof userResponse === 'object' && 'train_no' in (userResponse as object)) {
            const ticket = userResponse as TicketInfo;
            // Find lowest price to display
            const minPrice = Math.min(...ticket.prices.map(p => p.price));
            return (
                <div className="px-1 py-2">
                    <p className="font-serif text-lg text-stone-800 italic border-l-2 border-sage-300 pl-4 py-1">
                        🚄 {ticket.start_train_code} | {ticket.start_time}-{ticket.arrive_time} | ¥{minPrice}起
                    </p>
                </div>
            );
        }

        // Format skip selection
        if (typeof userResponse === 'object' && 'kind' in (userResponse as object)) {
            const skip = userResponse as { kind?: string; mode?: string };
            if (skip.kind === 'skip') {
                const label = skip.mode === 'flight' ? '\u6682\u4e0d\u51b3\u5b9a\u5177\u4f53\u822a\u73ed' : '\u6682\u4e0d\u51b3\u5b9a\u5177\u4f53\u8f66\u6b21';
                return (
                    <div className="px-1 py-2">
                        <p className="font-serif text-lg text-stone-800 italic border-l-2 border-sage-300 pl-4 py-1">
                            {label}
                        </p>
                    </div>
                );
            }
        }

        // Format hotel selection (from advanced search)
        if (typeof userResponse === 'object' && 'roomTypes' in (userResponse as object)) {
            const hotel = userResponse as HotelInfo;
            return (
                <div className="px-1 py-2">
                    <p className="font-serif text-lg text-stone-800 italic border-l-2 border-sage-300 pl-4 py-1">
                        🏨 {hotel.name} {hotel.price ? `- ¥${hotel.price}起` : ''}
                    </p>
                </div>
            );
        }

        // Format place selection
        if (typeof userResponse === 'object' && 'name' in (userResponse as object)) {
            const place = userResponse as PlaceInfo;
            return (
                <div className="px-1 py-2">
                    <p className="font-serif text-lg text-stone-800 italic border-l-2 border-sage-300 pl-4 py-1">
                        📍 {place.name}
                    </p>
                </div>
            );
        }

        return (
            <div className="px-1 py-2">
                <p className="font-serif text-lg text-stone-800 italic border-l-2 border-sage-300 pl-4 py-1">
                    {String(userResponse)}
                </p>
            </div>
        );
    }

    // Render appropriate widget based on type
    switch (widgetType) {
        case 'radio_cards':
            return (
                <RadioCardsWidget
                    payload={payload as { options: { id: string; label: string; description?: string; icon?: string }[]; title?: string }}
                    onSubmit={onSubmit}
                />
            );

        case 'date_range':
            return (
                <DateRangeWidget
                    payload={payload as { minDate?: string; maxDate?: string }}
                    onSubmit={onSubmit}
                />
            );

        case 'text_input':
            return (
                <TextInputWidget
                    payload={payload as { placeholder?: string; label?: string; icon?: 'location' | 'text' }}
                    onSubmit={onSubmit}
                />
            );

        case 'map_view':
            return (
                <Suspense fallback={<MapLoading />}>
                    <MapWidget
                        payload={payload as { center?: { lat: number; lng: number }; zoom?: number; locations?: Array<{ id: string; name: string; lat: number; lng: number; type?: string }>; title?: string }}
                        onSubmit={onSubmit}
                    />
                </Suspense>
            );

        case 'flight_results':
            return (
                <FlightResultsWidget
                    payload={payload as { flights: FlightOffer[]; title?: string; origin?: string; destination?: string }}
                    onSubmit={onSubmit}
                />
            );

        case 'hotel_search_advanced':
            return (
                <HotelSearchContainer
                    city={(payload as { city: string }).city}
                    onComplete={(hotel) => onSubmit(hotel)}
                />
            );

        case 'attraction_cards':
        case 'restaurant_cards':
        case 'hotel_search':
            return (
                <PlaceCardsWidget
                    payload={payload as { places: PlaceInfo[]; title?: string; selectable?: boolean }}
                    onSubmit={onSubmit}
                />
            );

        case 'train_tickets':
            return (
                <TrainResultsWidget
                    payload={payload as { tickets: TicketInfo[]; title?: string; origin?: string; destination?: string; date?: string }}
                    onSubmit={onSubmit}
                />
            );

        default:
            return (
                <div className="bg-stone-50 rounded-xl border border-stone-100 px-4 py-3">
                    <p className="text-sm text-stone-400">
                        Unknown Widget: {widgetType}
                    </p>
                </div>
            );
    }
};

export default WidgetRenderer;
