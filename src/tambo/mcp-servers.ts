/**
 * MCP Servers Configuration
 *
 * This module provides configuration for Model Context Protocol (MCP) servers
 * that can extend Tambo AI capabilities with external tools and data sources.
 *
 * MCP is an optional extension that allows integration with:
 * - External APIs and services
 * - Database connections
 * - File system access
 * - Custom tools and functions
 *
 * @module tambo/mcp-servers
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for a single MCP server
 */
export interface McpServerConfig {
  /** Unique identifier for the server */
  id: string;
  /** Human-readable name */
  name: string;
  /** Server description */
  description: string;
  /** Transport type */
  transport: 'stdio' | 'http' | 'websocket';
  /** Server URL (for http/websocket) or command (for stdio) */
  endpoint: string;
  /** Optional arguments for stdio transport */
  args?: string[];
  /** Optional environment variables */
  env?: Record<string, string>;
  /** Whether this server is enabled */
  enabled: boolean;
  /** Tool categories provided by this server */
  categories?: McpToolCategory[];
}

/**
 * Categories of tools that MCP servers can provide
 */
export type McpToolCategory =
  | 'search'
  | 'travel'
  | 'maps'
  | 'database'
  | 'filesystem'
  | 'web'
  | 'ai'
  | 'utility';

/**
 * Full MCP configuration object
 */
export interface McpConfiguration {
  /** Whether MCP is enabled globally */
  enabled: boolean;
  /** List of configured servers */
  servers: McpServerConfig[];
  /** Default timeout for MCP tool calls (ms) */
  defaultTimeout: number;
  /** Maximum concurrent connections */
  maxConnections: number;
}

// ============================================================================
// Pre-defined MCP Server Configurations
// ============================================================================

/**
 * Brave Search MCP Server
 * Provides web search capabilities via Brave Search API
 */
export const braveSearchMcpServer: McpServerConfig = {
  id: 'brave-search',
  name: 'Brave Search',
  description: 'Web search using Brave Search API for current information',
  transport: 'stdio',
  endpoint: 'npx',
  args: ['-y', '@modelcontextprotocol/server-brave-search'],
  env: {
    BRAVE_API_KEY: import.meta.env.VITE_BRAVE_API_KEY || '',
  },
  enabled: true,
  categories: ['search', 'web'],
};

/**
 * Fetch MCP Server
 * Provides URL fetching and content extraction
 */
export const fetchMcpServer: McpServerConfig = {
  id: 'fetch',
  name: 'Fetch',
  description: 'Fetch and extract content from URLs',
  transport: 'stdio',
  endpoint: 'npx',
  args: ['-y', '@modelcontextprotocol/server-fetch'],
  enabled: true,
  categories: ['web'],
};

/**
 * Filesystem MCP Server
 * Provides file system access for local files
 */
export const filesystemMcpServer: McpServerConfig = {
  id: 'filesystem',
  name: 'Filesystem',
  description: 'Read and write files from the local filesystem',
  transport: 'stdio',
  endpoint: 'npx',
  args: [
    '-y',
    '@modelcontextprotocol/server-filesystem',
    '/', // Root path - should be configured based on environment
  ],
  enabled: false, // Disabled by default for security
  categories: ['filesystem'],
};

/**
 * Memory MCP Server
 * Provides persistent memory/storage capabilities
 */
export const memoryMcpServer: McpServerConfig = {
  id: 'memory',
  name: 'Memory',
  description: 'Persistent memory and knowledge graph storage',
  transport: 'stdio',
  endpoint: 'npx',
  args: ['-y', '@modelcontextprotocol/server-memory'],
  enabled: false,
  categories: ['ai', 'utility'],
};

/**
 * Sequential Thinking MCP Server
 * Provides structured problem-solving capabilities
 */
export const sequentialThinkingMcpServer: McpServerConfig = {
  id: 'sequential-thinking',
  name: 'Sequential Thinking',
  description: 'Structured step-by-step thinking for complex problems',
  transport: 'stdio',
  endpoint: 'npx',
  args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
  enabled: false,
  categories: ['ai'],
};

/**
 * Puppeteer MCP Server
 * Provides browser automation capabilities
 */
export const puppeteerMcpServer: McpServerConfig = {
  id: 'puppeteer',
  name: 'Puppeteer',
  description: 'Browser automation for web scraping and testing',
  transport: 'stdio',
  endpoint: 'npx',
  args: ['-y', '@modelcontextprotocol/server-puppeteer'],
  enabled: false, // Disabled by default, requires browser
  categories: ['web'],
};

/**
 * Custom Aether Plan MCP Server
 * Provides travel-specific tools and data access
 */
export const aetherPlanMcpServer: McpServerConfig = {
  id: 'aether-plan',
  name: 'Aether Plan',
  description: 'Custom MCP server for Aether Plan travel tools',
  transport: 'http',
  endpoint: import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3001/mcp',
  enabled: false, // Enable when custom MCP server is deployed
  categories: ['travel', 'maps', 'database'],
};

// ============================================================================
// Server Collections
// ============================================================================

/**
 * All available MCP server configurations
 */
export const allMcpServers: McpServerConfig[] = [
  braveSearchMcpServer,
  fetchMcpServer,
  filesystemMcpServer,
  memoryMcpServer,
  sequentialThinkingMcpServer,
  puppeteerMcpServer,
  aetherPlanMcpServer,
];

/**
 * Default enabled MCP servers
 */
export const defaultMcpServers: McpServerConfig[] = [
  braveSearchMcpServer,
  fetchMcpServer,
];

/**
 * Travel-focused MCP server configuration
 */
export const travelMcpServers: McpServerConfig[] = [
  braveSearchMcpServer,
  fetchMcpServer,
  aetherPlanMcpServer,
];

// ============================================================================
// Configuration Functions
// ============================================================================

/**
 * Get MCP servers filtered by category
 */
export function getMcpServersByCategory(
  category: McpToolCategory
): McpServerConfig[] {
  return allMcpServers.filter(
    (server) => server.categories?.includes(category)
  );
}

/**
 * Get enabled MCP servers
 */
export function getEnabledMcpServers(): McpServerConfig[] {
  return allMcpServers.filter((server) => server.enabled);
}

/**
 * Get MCP server by ID
 */
export function getMcpServerById(id: string): McpServerConfig | undefined {
  return allMcpServers.find((server) => server.id === id);
}

/**
 * Create a custom MCP configuration
 */
export function createMcpConfiguration(
  servers: McpServerConfig[],
  options: Partial<Omit<McpConfiguration, 'servers'>> = {}
): McpConfiguration {
  return {
    enabled: true,
    servers,
    defaultTimeout: 30000, // 30 seconds
    maxConnections: 5,
    ...options,
  };
}

/**
 * Default MCP configuration for the application
 */
export const defaultMcpConfiguration: McpConfiguration = createMcpConfiguration(
  defaultMcpServers,
  {
    enabled: false, // MCP is opt-in by default
  }
);

/**
 * Full MCP configuration with all servers
 */
export const fullMcpConfiguration: McpConfiguration = createMcpConfiguration(
  allMcpServers,
  {
    enabled: false,
    defaultTimeout: 60000, // 1 minute for comprehensive setup
    maxConnections: 10,
  }
);

// ============================================================================
// Environment-based Configuration
// ============================================================================

/**
 * Get MCP configuration from environment variables
 */
export function getMcpConfigFromEnv(): McpConfiguration {
  const mcpEnabled = import.meta.env.VITE_MCP_ENABLED === 'true';
  const mcpServers = import.meta.env.VITE_MCP_SERVERS?.split(',').map((s: string) =>
    s.trim()
  );

  let servers: McpServerConfig[];

  if (mcpServers && mcpServers.length > 0) {
    // Use specified servers
    servers = mcpServers
      .map((id: string) => {
        const server = getMcpServerById(id);
        if (server) {
          return { ...server, enabled: true };
        }
        return null;
      })
      .filter((s: McpServerConfig | null): s is McpServerConfig => s !== null);
  } else {
    // Use default enabled servers
    servers = getEnabledMcpServers();
  }

  return createMcpConfiguration(servers, {
    enabled: mcpEnabled,
  });
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate an MCP server configuration
 */
export function validateMcpServerConfig(
  config: McpServerConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.id || config.id.trim() === '') {
    errors.push('Server ID is required');
  }

  if (!config.name || config.name.trim() === '') {
    errors.push('Server name is required');
  }

  if (!config.endpoint || config.endpoint.trim() === '') {
    errors.push('Server endpoint is required');
  }

  if (!['stdio', 'http', 'websocket'].includes(config.transport)) {
    errors.push(
      `Invalid transport type: ${config.transport}. Must be stdio, http, or websocket`
    );
  }

  if (config.transport === 'stdio' && !config.args?.length) {
    // This is just a warning, not an error
    console.warn(
      `[MCP] Server "${config.name}" uses stdio transport but has no args defined`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all configured MCP servers
 */
export function validateAllMcpServers(): {
  valid: boolean;
  results: Array<{ server: string; valid: boolean; errors: string[] }>;
} {
  const results = allMcpServers.map((server) => ({
    server: server.name,
    ...validateMcpServerConfig(server),
  }));

  return {
    valid: results.every((r) => r.valid),
    results,
  };
}

// ============================================================================
// Debug Utilities
// ============================================================================

/**
 * Get MCP configuration status for debugging
 */
export function getMcpStatus(): {
  configured: boolean;
  enabledCount: number;
  totalCount: number;
  servers: Array<{
    id: string;
    name: string;
    enabled: boolean;
    categories: McpToolCategory[];
  }>;
} {
  const envConfig = getMcpConfigFromEnv();

  return {
    configured: envConfig.enabled,
    enabledCount: envConfig.servers.filter((s) => s.enabled).length,
    totalCount: allMcpServers.length,
    servers: allMcpServers.map((s) => ({
      id: s.id,
      name: s.name,
      enabled: s.enabled,
      categories: s.categories || [],
    })),
  };
}

/**
 * Log MCP configuration status (development only)
 */
export function logMcpStatus(): void {
  if (!import.meta.env.DEV) return;

  const status = getMcpStatus();
  console.log('[MCP] Configuration Status:', status);
}
