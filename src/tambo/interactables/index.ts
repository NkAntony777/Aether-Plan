/**
 * Tambo Interactable Components Index
 *
 * This module exports all interactable component wrappers that can be
 * controlled by AI through Tambo's interactable system.
 *
 * @module tambo/interactables
 */

// Interactable Components
export { default as MapWidgetInteractable } from './MapWidgetInteractable';
export { default as ChecklistWidgetInteractable } from './ChecklistWidgetInteractable';

// Re-export schemas with unique names to avoid conflicts with ./schemas
export {
  MapWidgetPropsSchema,
  MapLocationSchema as InteractableMapLocationSchema,
  CoordinatesSchema as InteractableCoordinatesSchema,
} from './MapWidgetInteractable';

export {
  ChecklistWidgetPropsSchema,
  ChecklistWidgetStateSchema,
  ChecklistItemSchema as InteractableChecklistItemSchema,
} from './ChecklistWidgetInteractable';
