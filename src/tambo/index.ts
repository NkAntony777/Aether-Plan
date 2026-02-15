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
// Will be exported from ./components when implemented
// export * from './components';

// Tools - Local AI tools (searchFlights, searchTrains, etc.)
// Will be exported from ./tools when implemented
// export * from './tools';

// Provider - TamboProvider configuration
// Will be exported from ./provider when implemented
// export * from './provider';

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
