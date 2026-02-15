/**
 * MapWidget Interactable Component
 *
 * This module wraps MapWidget with withTamboInteractable HOC to enable
 * AI-driven interactions and real-time prop updates.
 *
 * @module tambo/interactables/MapWidgetInteractable
 */

import { withTamboInteractable } from '@tambo-ai/react';
import { z } from 'zod';
import MapWidget from '../../components/widgets/MapWidget';

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Schema for map location marker
 */
const MapLocationSchema = z.object({
  id: z.string().describe('Unique identifier for the location'),
  name: z.string().describe('Name of the location'),
  lat: z.number().describe('Latitude coordinate'),
  lng: z.number().describe('Longitude coordinate'),
  type: z.string().optional().describe('Type of location (e.g., attraction, transport)'),
});

/**
 * Schema for coordinates
 */
const CoordinatesSchema = z.object({
  lat: z.number().describe('Latitude coordinate'),
  lng: z.number().describe('Longitude coordinate'),
});

/**
 * Schema for MapWidget props (serializable props for AI updates)
 */
const MapWidgetPropsSchema = z.object({
  payload: z.object({
    center: CoordinatesSchema.optional().describe('Map center coordinates'),
    zoom: z.number().min(1).max(20).optional().describe('Map zoom level (1-20)'),
    locations: z.array(MapLocationSchema).optional().describe('Array of locations to display on the map'),
    title: z.string().optional().describe('Optional title displayed above the map'),
  }),
});

// ============================================================================
// Interactable Component
// ============================================================================

/**
 * Interactable wrapper for MapWidget.
 *
 * This component can be controlled by AI through Tambo's interactable system.
 * The AI can update map center, zoom level, and locations in real-time.
 *
 * @example
 * ```tsx
 * // Use directly in your app - AI can now control this map
 * <MapWidgetInteractable
 *   payload={{
 *     center: { lat: 39.9042, lng: 116.4074 },
 *     zoom: 12,
 *     locations: [{ id: '1', name: 'Beijing', lat: 39.9, lng: 116.4 }]
 *   }}
 * />
 *
 * // With callback when interactable is ready
 * <MapWidgetInteractable
 *   payload={{ ... }}
 *   onInteractableReady={(id) => console.log('Map ready:', id)}
 * />
 * ```
 */
const MapWidgetInteractable = withTamboInteractable(MapWidget, {
  componentName: 'MapWidget',
  description:
    'An interactive map component that displays geographic locations with markers. AI can update the center coordinates, zoom level, and add/remove location markers in real-time. Use this to show travel destinations, points of interest, or navigation routes.',
  propsSchema: MapWidgetPropsSchema,
});

MapWidgetInteractable.displayName = 'MapWidgetInteractable';

export default MapWidgetInteractable;

// Re-export schemas for external use
export { MapWidgetPropsSchema, MapLocationSchema, CoordinatesSchema };
