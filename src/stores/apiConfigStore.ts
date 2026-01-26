import { create } from 'zustand';
import {
    type APIConfig,
    type LLMProvider,
    DEFAULT_API_CONFIG,
    loadAPIConfig,
    saveAPIConfig,
    LLM_PROVIDERS,
} from '../types/apiConfig';

interface APIConfigState {
    config: APIConfig;
    isConfigOpen: boolean;

    // Actions
    openConfig: () => void;
    closeConfig: () => void;
    updateLLMProvider: (provider: LLMProvider) => void;
    updateLLMApiKey: (apiKey: string) => void;
    updateLLMBaseUrl: (baseUrl: string) => void;
    updateLLMModel: (model: string) => void;
    updateLLMCustomModel: (model: string) => void;
    updateAmadeusConfig: (config: Partial<APIConfig['amadeus']>) => void;
    updateAmapConfig: (config: Partial<APIConfig['amap']>) => void;
    saveConfig: () => void;
    resetConfig: () => void;
}

export const useAPIConfigStore = create<APIConfigState>((set, get) => ({
    config: loadAPIConfig(),
    isConfigOpen: false,

    openConfig: () => set({ isConfigOpen: true }),
    closeConfig: () => set({ isConfigOpen: false }),

    updateLLMProvider: (provider: LLMProvider) => {
        const providerConfig = LLM_PROVIDERS.find(p => p.id === provider);
        set(state => ({
            config: {
                ...state.config,
                llm: {
                    ...state.config.llm,
                    provider,
                    baseUrl: providerConfig?.baseUrl || state.config.llm.baseUrl,
                    model: providerConfig?.models[0]?.id || state.config.llm.model,
                },
            },
        }));
    },

    updateLLMApiKey: (apiKey: string) => {
        set(state => ({
            config: {
                ...state.config,
                llm: { ...state.config.llm, apiKey },
            },
        }));
    },

    updateLLMBaseUrl: (baseUrl: string) => {
        set(state => ({
            config: {
                ...state.config,
                llm: { ...state.config.llm, baseUrl },
            },
        }));
    },

    updateLLMModel: (model: string) => {
        set(state => ({
            config: {
                ...state.config,
                llm: { ...state.config.llm, model },
            },
        }));
    },

    updateLLMCustomModel: (customModel: string) => {
        set(state => ({
            config: {
                ...state.config,
                llm: { ...state.config.llm, customModel },
            },
        }));
    },

    updateAmadeusConfig: (amadeus: Partial<APIConfig['amadeus']>) => {
        set(state => ({
            config: {
                ...state.config,
                amadeus: { ...state.config.amadeus, ...amadeus },
            },
        }));
    },

    updateAmapConfig: (amap: Partial<APIConfig['amap']>) => {
        set(state => ({
            config: {
                ...state.config,
                amap: { ...state.config.amap, ...amap },
            },
        }));
    },

    saveConfig: () => {
        const { config } = get();
        saveAPIConfig(config);
    },

    resetConfig: () => {
        set({ config: DEFAULT_API_CONFIG });
        saveAPIConfig(DEFAULT_API_CONFIG);
    },
}));
