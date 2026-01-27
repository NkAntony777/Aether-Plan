// API configuration types

const USE_SERVER_KEYS = (import.meta as { env?: Record<string, string> }).env?.VITE_USE_SERVER_KEYS === 'true';

// LLM provider types
export type LLMProvider =
    | 'openai'
    | 'anthropic'
    | 'siliconflow'
    | 'deepseek'
    | 'moonshot'
    | 'zhipu'
    | 'custom';

export interface LLMProviderConfig {
    id: LLMProvider;
    name: string;
    baseUrl: string;
    models: LLMModelOption[];
    requiresApiKey: boolean;
}

export interface LLMModelOption {
    id: string;
    name: string;
    description?: string;
}

// LLM provider definitions
export const LLM_PROVIDERS: LLMProviderConfig[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        requiresApiKey: true,
        models: [
            { id: 'gpt-5.2', name: 'GPT-5.2' },
            { id: 'gpt-5', name: 'GPT-5' },
            { id: 'gpt-4.1', name: 'GPT-4.1' },
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
            { id: 'o4-mini', name: 'o4-mini' },
            { id: 'o3', name: 'o3' },
        ],
    },
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        baseUrl: 'https://api.anthropic.com/v1',
        requiresApiKey: true,
        models: [
            { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5' },
            { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
            { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
            { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        ],
    },
    {
        id: 'siliconflow',
        name: 'SiliconFlow',
        baseUrl: 'https://api.siliconflow.cn/v1',
        requiresApiKey: true,
        models: [
            { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek-V3' },
            { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1' },
            { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B' },
            { id: 'Qwen/QwQ-32B', name: 'QwQ-32B' },
            { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5-7B (Free)' },
        ],
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        requiresApiKey: true,
        models: [
            { id: 'deepseek-chat', name: 'DeepSeek Chat' },
            { id: 'deepseek-coder', name: 'DeepSeek Coder' },
            { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
        ],
    },
    {
        id: 'moonshot',
        name: 'Moonshot',
        baseUrl: 'https://api.moonshot.cn/v1',
        requiresApiKey: true,
        models: [
            { id: 'moonshot-v1-128k', name: 'Moonshot 128K' },
            { id: 'moonshot-v1-32k', name: 'Moonshot 32K' },
            { id: 'moonshot-v1-8k', name: 'Moonshot 8K' },
        ],
    },
    {
        id: 'zhipu',
        name: 'Zhipu GLM',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        requiresApiKey: true,
        models: [
            { id: 'glm-4-plus', name: 'GLM-4 Plus' },
            { id: 'glm-4', name: 'GLM-4' },
            { id: 'glm-4-flash', name: 'GLM-4 Flash' },
        ],
    },
    {
        id: 'custom',
        name: 'Custom',
        baseUrl: '',
        requiresApiKey: true,
        models: [
            { id: 'custom', name: 'Custom' },
        ],
    },
];

// API configuration state
export interface APIConfig {
    llm: {
        provider: LLMProvider;
        apiKey: string;
        baseUrl: string;
        model: string;
        customModel?: string;
    };
    amadeus: {
        enabled: boolean;
        apiKey: string;
        apiSecret: string;
    };
    amap: {
        enabled: boolean;
        apiKey: string;
    };
}

// Default configuration
export const DEFAULT_API_CONFIG: APIConfig = {
    llm: {
        provider: 'openai',
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
    },
    amadeus: {
        enabled: false,
        apiKey: '',
        apiSecret: '',
    },
    amap: {
        enabled: false,
        apiKey: '',
    },
};

// LocalStorage key
export const API_CONFIG_STORAGE_KEY = 'aether-plan-api-config';

function sanitizeConfig(config: APIConfig): APIConfig {
    if (!USE_SERVER_KEYS) return config;
    return {
        ...config,
        llm: { ...config.llm, apiKey: '' },
        amadeus: { ...config.amadeus, apiKey: '', apiSecret: '' },
        amap: { ...config.amap, apiKey: '' },
    };
}

// Helper to load config from localStorage
export function loadAPIConfig(): APIConfig {
    if (typeof window === 'undefined') return sanitizeConfig(DEFAULT_API_CONFIG);

    try {
        const stored = localStorage.getItem(API_CONFIG_STORAGE_KEY);
        if (stored) {
            return sanitizeConfig({ ...DEFAULT_API_CONFIG, ...JSON.parse(stored) });
        }
    } catch (e) {
        console.error('Failed to load API config:', e);
    }
    return sanitizeConfig(DEFAULT_API_CONFIG);
}

// Helper to save config to localStorage
export function saveAPIConfig(config: APIConfig): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify(sanitizeConfig(config)));
    } catch (e) {
        console.error('Failed to save API config:', e);
    }
}
