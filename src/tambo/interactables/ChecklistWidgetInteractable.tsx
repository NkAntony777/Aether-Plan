/**
 * ChecklistWidget Interactable Component
 *
 * This module wraps ChecklistWidget with withTamboInteractable HOC to enable
 * AI-driven interactions and real-time prop/state updates.
 *
 * @module tambo/interactables/ChecklistWidgetInteractable
 */

import { withTamboInteractable } from '@tambo-ai/react';
import { z } from 'zod';
import ChecklistWidget from '../../components/widgets/ChecklistWidget';

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Schema for a single checklist item
 */
const ChecklistItemSchema = z.object({
  id: z.string().describe('Unique item identifier'),
  label: z.string().describe('Item label text'),
  description: z.string().optional().describe('Optional item description'),
  checked: z.boolean().optional().describe('Whether item is initially checked'),
});

/**
 * Schema for ChecklistWidget props (serializable props for AI updates)
 */
const ChecklistWidgetPropsSchema = z.object({
  payload: z.object({
    title: z.string().optional().describe('Optional title for the checklist'),
    items: z.array(ChecklistItemSchema).describe('Array of checklist items'),
    selectable: z.boolean().optional().describe('Whether items can be toggled'),
  }),
});

/**
 * Schema for ChecklistWidget state (trackable state for AI)
 */
const ChecklistWidgetStateSchema = z.object({
  selected: z.array(z.string()).describe('Array of selected/checked item IDs'),
  submitted: z.boolean().optional().describe('Whether the checklist has been submitted'),
});

// ============================================================================
// Interactable Component
// ============================================================================

/**
 * Interactable wrapper for ChecklistWidget.
 *
 * This component can be controlled by AI through Tambo's interactable system.
 * The AI can add/remove checklist items, toggle items, and track user selections.
 *
 * @example
 * ```tsx
 * // Use directly in your app - AI can now control this checklist
 * <ChecklistWidgetInteractable
 *   payload={{
 *     title: 'Packing List',
 *     items: [
 *       { id: '1', label: 'Passport', checked: false },
 *       { id: '2', label: 'Clothes', checked: true },
 *     ],
 *     selectable: true,
 *   }}
 * />
 *
 * // With callbacks
 * <ChecklistWidgetInteractable
 *   payload={{ ... }}
 *   onInteractableReady={(id) => console.log('Checklist ready:', id)}
 *   onPropsUpdate={(newProps) => console.log('Props updated:', newProps)}
 * />
 * ```
 */
const ChecklistWidgetInteractable = withTamboInteractable(ChecklistWidget, {
  componentName: 'ChecklistWidget',
  description:
    'An interactive checklist component for tasks, packing lists, or to-do items. AI can add, remove, or modify checklist items, and track which items the user has selected. Use this for gathering user preferences or tracking completion status.',
  propsSchema: ChecklistWidgetPropsSchema,
  stateSchema: ChecklistWidgetStateSchema,
});

ChecklistWidgetInteractable.displayName = 'ChecklistWidgetInteractable';

export default ChecklistWidgetInteractable;

// Re-export schemas for external use
export { ChecklistWidgetPropsSchema, ChecklistWidgetStateSchema, ChecklistItemSchema };
