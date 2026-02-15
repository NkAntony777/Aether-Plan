/**
 * Tambo Provider Configuration
 *
 * This module provides the TamboProvider wrapper component for the Aether Plan
 * application. It configures the Tambo AI SDK with all registered components,
 * tools, and authentication settings.
 *
 * @module tambo/provider
 */

import { TamboProvider } from '@tambo-ai/react';
import type { ReactNode } from 'react';
import { tamboWidgets } from './components';
import { tamboTools } from './tools';

// ============================================================================
// Environment Configuration
// ============================================================================

/**
 * Tambo API key from environment variables.
 * Required for cloud-hosted Tambo backend.
 */
const TAMBO_API_KEY = import.meta.env.VITE_TAMBO_API_KEY || '';

/**
 * Tambo API URL from environment variables.
 * Optional - defaults to Tambo cloud if not specified.
 */
const TAMBO_API_URL = import.meta.env.VITE_TAMBO_API_URL || undefined;

/**
 * Enable debug mode for Tambo SDK.
 * Set VITE_TAMBO_DEBUG=true to enable verbose logging.
 */
const TAMBO_DEBUG = import.meta.env.VITE_TAMBO_DEBUG === 'true';

// ============================================================================
// Provider Configuration Types
// ============================================================================

/**
 * Props for the AetherTamboProvider component
 */
export interface AetherTamboProviderProps {
  /** Child components to wrap with TamboProvider */
  children: ReactNode;
  /** User identifier for thread ownership (defaults to 'default-user') */
  userKey?: string;
  /** Optional project/component filter to only register specific widgets */
  widgetsFilter?: 'all' | 'travel' | 'utility';
  /** Optional flag to enable/disable tools */
  enableTools?: boolean;
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Aether Plan Tambo Provider
 *
 * Wraps the application with TamboProvider, configuring all widget components
 * and tools for AI-driven generative UI.
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { AetherTamboProvider } from './tambo/provider';
 *
 * function App() {
 *   return (
 *     <AetherTamboProvider userKey="user-123">
 *       <ChatContainer />
 *     </AetherTamboProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom widget filter
 * <AetherTamboProvider
 *   userKey="user-123"
 *   widgetsFilter="travel"
 *   enableTools={true}
 * >
 *   <App />
 * </AetherTamboProvider>
 * ```
 */
export function AetherTamboProvider({
  children,
  userKey = 'default-user',
  widgetsFilter = 'all',
  enableTools = true,
}: AetherTamboProviderProps) {
  // Select widgets based on filter
  const selectedWidgets = widgetsFilter === 'all'
    ? tamboWidgets
    : tamboWidgets.filter((widget) => {
        // Filter based on widget name conventions
        const travelWidgets = [
          'MapWidget',
          'DateRangeWidget',
          'FlightResultsWidget',
          'TrainResultsWidget',
          'HotelSearchWidget',
          'PlaceCardsWidget',
        ];
        const utilityWidgets = [
          'ChecklistWidget',
          'MarkdownCardWidget',
          'ResourceListWidget',
          'RadioCardsWidget',
          'TextInputWidget',
        ];

        if (widgetsFilter === 'travel') {
          return travelWidgets.includes(widget.name || '');
        }
        if (widgetsFilter === 'utility') {
          return utilityWidgets.includes(widget.name || '');
        }
        return true;
      });

  // Combine components and tools
  const providerConfig = {
    apiKey: TAMBO_API_KEY,
    userKey,
    components: selectedWidgets,
    ...(TAMBO_API_URL && { apiUrl: TAMBO_API_URL }),
    ...(enableTools && { tools: tamboTools }),
  };

  // Development warnings
  if (!TAMBO_API_KEY && import.meta.env.DEV) {
    console.warn(
      '[Tambo] VITE_TAMBO_API_KEY is not set. ' +
        'Set it in your .env file for full functionality.'
    );
  }

  if (TAMBO_DEBUG) {
    console.log('[Tambo] Provider config:', {
      widgetsCount: selectedWidgets.length,
      toolsCount: enableTools ? tamboTools.length : 0,
      hasApiKey: !!TAMBO_API_KEY,
    });
  }

  return (
    <TamboProvider {...providerConfig}>
      {children}
    </TamboProvider>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if Tambo is properly configured
 */
export function isTamboConfigured(): boolean {
  return !!TAMBO_API_KEY;
}

/**
 * Get the current Tambo configuration status
 */
export function getTamboConfigStatus(): {
  hasApiKey: boolean;
  hasApiUrl: boolean;
  debugMode: boolean;
  widgetsCount: number;
  toolsCount: number;
} {
  return {
    hasApiKey: !!TAMBO_API_KEY,
    hasApiUrl: !!TAMBO_API_URL,
    debugMode: TAMBO_DEBUG,
    widgetsCount: tamboWidgets.length,
    toolsCount: tamboTools.length,
  };
}

// ============================================================================
// Re-exports for Convenience
// ============================================================================

// Re-export Tambo hooks for easy access
export { useTambo, useTamboThreadInput, useTamboThread, useTamboThreadList } from '@tambo-ai/react';
export type { TamboProviderProps } from '@tambo-ai/react';
