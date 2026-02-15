/**
 * Tambo Components - Wraps existing widgets as Tambo AI components
 *
 * This module exports all widget components wrapped as TamboComponent objects
 * that can be registered with the TamboRegistryProvider for AI-driven UI.
 *
 * @module tambo/components
 */

import type { TamboComponent } from '@tambo-ai/react';

// Import widget components
import MapWidget from '../components/widgets/MapWidget';
import DateRangeWidget from '../components/widgets/DateRangeWidget';
import FlightResultsWidget from '../components/widgets/FlightResultsWidget';
import TrainResultsWidget from '../components/widgets/TrainResultsWidget';
import HotelSearchWidget from '../components/widgets/HotelSearchWidget';
import PlaceCardsWidget from '../components/widgets/PlaceCardsWidget';
import ChecklistWidget from '../components/widgets/ChecklistWidget';
import MarkdownCardWidget from '../components/widgets/MarkdownCardWidget';
import ResourceListWidget from '../components/widgets/ResourceListWidget';
import RadioCardsWidget from '../components/widgets/RadioCardsWidget';
import TextInputWidget from '../components/widgets/TextInputWidget';

// Import Zod schemas
import {
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
} from './schemas';

// ============================================================================
// Map Widget Component
// ============================================================================

/**
 * Tambo component for displaying interactive maps with location markers.
 * Supports center coordinates, zoom level, and multiple location markers.
 */
export const TamboMapWidget: TamboComponent = {
  name: 'MapWidget',
  description:
    'Displays an interactive map with location markers. Use this to show geographic locations, attractions, or points of interest on a map.',
  component: MapWidget,
  propsSchema: MapWidgetPayloadSchema,
};

// ============================================================================
// Date Range Widget Component
// ============================================================================

/**
 * Tambo component for selecting date ranges.
 * Provides a calendar interface for users to pick start and end dates.
 */
export const TamboDateRangeWidget: TamboComponent = {
  name: 'DateRangeWidget',
  description:
    'A calendar-based date range picker. Use this when you need the user to select a period of time, such as travel dates or event duration.',
  component: DateRangeWidget,
  propsSchema: DateRangeWidgetPayloadSchema,
};

// ============================================================================
// Flight Results Widget Component
// ============================================================================

/**
 * Tambo component for displaying flight search results.
 * Shows a list of flight options with times, prices, and allows selection.
 */
export const TamboFlightResultsWidget: TamboComponent = {
  name: 'FlightResultsWidget',
  description:
    'Displays a list of flight search results with departure/arrival times, prices, and airline information. Users can select a flight or skip selection.',
  component: FlightResultsWidget,
  propsSchema: FlightResultsWidgetPayloadSchema,
};

// ============================================================================
// Train Results Widget Component
// ============================================================================

/**
 * Tambo component for displaying train ticket search results.
 * Shows train schedules, seat availability, and prices for selection.
 */
export const TamboTrainResultsWidget: TamboComponent = {
  name: 'TrainResultsWidget',
  description:
    'Displays train ticket search results with departure/arrival times, seat types, prices, and availability. Users can select a train or skip selection.',
  component: TrainResultsWidget,
  propsSchema: TrainResultsWidgetPayloadSchema,
};

// ============================================================================
// Hotel Search Widget Component
// ============================================================================

/**
 * Tambo component for hotel search and display.
 * Provides hotel type selection, keyword search, and results display.
 */
export const TamboHotelSearchWidget: TamboComponent = {
  name: 'HotelSearchWidget',
  description:
    'A hotel search interface that allows users to select hotel types (economy, comfort, luxury), add search keywords, and browse hotel results with ratings, prices, and details.',
  component: HotelSearchWidget,
  propsSchema: HotelSearchWidgetPayloadSchema,
};

// ============================================================================
// Place Cards Widget Component
// ============================================================================

/**
 * Tambo component for displaying place cards.
 * Shows restaurants, attractions, or other places in a card grid format.
 */
export const TamboPlaceCardsWidget: TamboComponent = {
  name: 'PlaceCardsWidget',
  description:
    'Displays a grid of place cards for restaurants, attractions, hotels, or transport hubs. Each card shows the place name, rating, address, and optional image.',
  component: PlaceCardsWidget,
  propsSchema: PlaceCardsWidgetPayloadSchema,
};

// ============================================================================
// Checklist Widget Component
// ============================================================================

/**
 * Tambo component for displaying interactive checklists.
 * Allows users to check off items from a list.
 */
export const TamboChecklistWidget: TamboComponent = {
  name: 'ChecklistWidget',
  description:
    'An interactive checklist where users can check off items. Useful for packing lists, to-do items, or any multi-select scenario.',
  component: ChecklistWidget,
  propsSchema: ChecklistWidgetPayloadSchema,
};

// ============================================================================
// Markdown Card Widget Component
// ============================================================================

/**
 * Tambo component for rendering markdown content in a card.
 * Displays formatted text with markdown syntax support.
 */
export const TamboMarkdownCardWidget: TamboComponent = {
  name: 'MarkdownCardWidget',
  description:
    'Renders markdown content in a styled card. Use this to display formatted text, lists, links, and other markdown-supported content.',
  component: MarkdownCardWidget,
  propsSchema: MarkdownCardWidgetPayloadSchema,
};

// ============================================================================
// Resource List Widget Component
// ============================================================================

/**
 * Tambo component for displaying a list of resources.
 * Shows resources with titles, descriptions, and optional links.
 */
export const TamboResourceListWidget: TamboComponent = {
  name: 'ResourceListWidget',
  description:
    'Displays a list of resources or references with titles, types, descriptions, and optional external links. Useful for showing recommended articles, guides, or related content.',
  component: ResourceListWidget,
  propsSchema: ResourceListWidgetPayloadSchema,
};

// ============================================================================
// Radio Cards Widget Component
// ============================================================================

/**
 * Tambo component for displaying selectable radio card options.
 * Shows options as cards with icons, labels, and descriptions.
 */
export const TamboRadioCardsWidget: TamboComponent = {
  name: 'RadioCardsWidget',
  description:
    'Displays a set of selectable options as cards with icons, labels, and descriptions. Use this when you need the user to choose one option from a small set.',
  component: RadioCardsWidget,
  propsSchema: RadioCardsWidgetPayloadSchema,
};

// ============================================================================
// Text Input Widget Component
// ============================================================================

/**
 * Tambo component for text input.
 * Provides a simple input field for user text entry.
 */
export const TamboTextInputWidget: TamboComponent = {
  name: 'TextInputWidget',
  description:
    'A simple text input field with optional placeholder, label, and icon. Use this when you need to collect a short text input from the user, such as a location name or search query.',
  component: TextInputWidget,
  propsSchema: TextInputWidgetPayloadSchema,
};

// ============================================================================
// All Components Array
// ============================================================================

/**
 * Array of all Tambo-wrapped widget components.
 * Pass this to TamboRegistryProvider to register all widgets.
 *
 * @example
 * ```tsx
 * import { tamboWidgets } from './tambo/components';
 *
 * <TamboRegistryProvider components={tamboWidgets}>
 *   <App />
 * </TamboRegistryProvider>
 * ```
 */
export const tamboWidgets: TamboComponent[] = [
  TamboMapWidget,
  TamboDateRangeWidget,
  TamboFlightResultsWidget,
  TamboTrainResultsWidget,
  TamboHotelSearchWidget,
  TamboPlaceCardsWidget,
  TamboChecklistWidget,
  TamboMarkdownCardWidget,
  TamboResourceListWidget,
  TamboRadioCardsWidget,
  TamboTextInputWidget,
];

// ============================================================================
// Component Groups (for selective registration)
// ============================================================================

/**
 * Travel-related widget components for trip planning.
 */
export const travelWidgets: TamboComponent[] = [
  TamboMapWidget,
  TamboDateRangeWidget,
  TamboFlightResultsWidget,
  TamboTrainResultsWidget,
  TamboHotelSearchWidget,
  TamboPlaceCardsWidget,
];

/**
 * General-purpose widget components for various use cases.
 */
export const utilityWidgets: TamboComponent[] = [
  TamboChecklistWidget,
  TamboMarkdownCardWidget,
  TamboResourceListWidget,
  TamboRadioCardsWidget,
  TamboTextInputWidget,
];
