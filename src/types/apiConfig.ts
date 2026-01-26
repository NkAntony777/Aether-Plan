// API Configuration Types

// LLM Provider Types
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

// LLM Provider Definitions with Latest Models (2025)
export const LLM_PROVIDERS: LLMProviderConfig[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        requiresApiKey: true,
        models: [
            { id: 'gpt-5.2', name: 'GPT-5.2', description: '最新旗舰推理模型' },
            { id: 'gpt-5', name: 'GPT-5', description: '强大通用模型' },
            { id: 'gpt-4.1', name: 'GPT-4.1', description: '最智能非推理模型' },
            { id: 'gpt-4o', name: 'GPT-4o', description: '多模态模型' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '高性价比' },
            { id: 'o4-mini', name: 'o4-mini', description: '推理模型' },
            { id: 'o3', name: 'o3', description: '高级推理' },
        ],
    },
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        baseUrl: 'https://api.anthropic.com/v1',
        requiresApiKey: true,
        models: [
            { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', description: '最智能模型' },
            { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', description: '平衡智能与速度' },
            { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', description: '快速高效' },
            { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: '稳定版本' },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: '经典版本' },
        ],
    },
    {
        id: 'siliconflow',
        name: '硅基流动 SiliconFlow',
        baseUrl: 'https://api.siliconflow.cn/v1',
        requiresApiKey: true,
        models: [
            { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek-V3', description: '高性能推理' },
            { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1', description: '推理增强' },
            { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B', description: '通义千问' },
            { id: 'Qwen/QwQ-32B', name: 'QwQ-32B', description: '推理模型' },
            { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5-7B (免费)', description: '免费模型' },
        ],
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        requiresApiKey: true,
        models: [
            { id: 'deepseek-chat', name: 'DeepSeek Chat', description: '对话模型' },
            { id: 'deepseek-coder', name: 'DeepSeek Coder', description: '代码模型' },
            { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: '推理模型' },
        ],
    },
    {
        id: 'moonshot',
        name: 'Moonshot (月之暗面)',
        baseUrl: 'https://api.moonshot.cn/v1',
        requiresApiKey: true,
        models: [
            { id: 'moonshot-v1-128k', name: 'Moonshot 128K', description: '超长上下文' },
            { id: 'moonshot-v1-32k', name: 'Moonshot 32K', description: '长上下文' },
            { id: 'moonshot-v1-8k', name: 'Moonshot 8K', description: '标准版' },
        ],
    },
    {
        id: 'zhipu',
        name: '智谱 GLM',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        requiresApiKey: true,
        models: [
            { id: 'glm-4-plus', name: 'GLM-4 Plus', description: '最新旗舰' },
            { id: 'glm-4', name: 'GLM-4', description: '高性能' },
            { id: 'glm-4-flash', name: 'GLM-4 Flash', description: '快速响应' },
        ],
    },
    {
        id: 'custom',
        name: '自定义 / Custom',
        baseUrl: '',
        requiresApiKey: true,
        models: [
            { id: 'custom', name: '自定义模型', description: '手动输入模型名称' },
        ],
    },
];

// API Configuration State
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

// Default Configuration
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

// LocalStorage Key
export const API_CONFIG_STORAGE_KEY = 'aether-plan-api-config';

// Helper to load config from localStorage
export function loadAPIConfig(): APIConfig {
    if (typeof window === 'undefined') return DEFAULT_API_CONFIG;

    try {
        const stored = localStorage.getItem(API_CONFIG_STORAGE_KEY);
        if (stored) {
            return { ...DEFAULT_API_CONFIG, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to load API config:', e);
    }
    return DEFAULT_API_CONFIG;
}

// Helper to save config to localStorage
export function saveAPIConfig(config: APIConfig): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.error('Failed to save API config:', e);
    }
}
