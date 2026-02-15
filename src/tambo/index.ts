/**
 * Tambo Integration Module
 *
 * This module provides AI-powered chat capabilities using the Tambo React SDK.
 * It exports schemas, components, tools, and hooks for integrating Tambo AI
 * into the Aether Plan application.
 *
 * @module tambo
 */

// Schemas - Zod schemas for widget data validation
export * from './schemas';

// Components - Tambo-wrapped widget components
export * from './components';

// Tools - Local AI tools (searchFlights, searchTrains, etc.)
export * from './tools';

// Provider - TamboProvider configuration
export {
  AetherTamboProvider,
  isTamboConfigured,
  getTamboConfigStatus,
  useTambo,
  useTamboThreadInput,
  useTamboThread,
  useTamboThreadList,
} from './provider';
export type { AetherTamboProviderProps } from './provider';

// MCP Servers - Optional MCP server configuration
// Will be exported from ./mcp-servers when implemented
// export * from './mcp-servers';

// Re-export common Tambo types for convenience
export type {
  TamboThread,
  TamboThreadMessage,
  TamboTool,
  TamboComponent,
  TamboProviderProps,
  UseTamboReturn,
} from '@tambo-ai/react';
