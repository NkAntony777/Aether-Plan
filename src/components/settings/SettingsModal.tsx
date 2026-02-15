import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Globe, Cpu, MapPin, Plane, ChevronDown, Check, AlertCircle, Zap, Loader2, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { useAPIConfigStore } from '../../stores/apiConfigStore';
import { LLM_PROVIDERS, type LLMProvider } from '../../types/apiConfig';
import { cn } from '../../lib/utils';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const SettingsModal: React.FC = () => {
    const {
        config,
        isConfigOpen,
        closeConfig,
        updateLLMProvider,
        updateLLMApiKey,
        updateLLMBaseUrl,
        updateLLMModel,
        updateLLMCustomModel,
        updateAmadeusConfig,
        updateAmapConfig,
        updateTamboConfig,
        saveConfig,
    } = useAPIConfigStore();

    const [activeTab, setActiveTab] = React.useState<'llm' | 'travel' | 'map'>('llm');
    const [showProviderDropdown, setShowProviderDropdown] = React.useState(false);
    const [showModelDropdown, setShowModelDropdown] = React.useState(false);
    const [saved, setSaved] = React.useState(false);
    const [testStatus, setTestStatus] = React.useState<TestStatus>('idle');
    const [testMessage, setTestMessage] = React.useState('');
    const [useCustomModel, setUseCustomModel] = React.useState(Boolean(config.llm.customModel));
    const useServerKeys = (import.meta as { env?: Record<string, string> }).env?.VITE_USE_SERVER_KEYS === 'true';

    const currentProvider = LLM_PROVIDERS.find(p => p.id === config.llm.provider);

    const handleSave = () => {
        saveConfig();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // Test API connectivity
    const handleTestAPI = async () => {
        if (!useServerKeys && !config.llm.apiKey) {
            setTestStatus('error');
            setTestMessage('Please enter an API key first.');
            return;
        }

        setTestStatus('testing');
        setTestMessage('Testing connection...');

        try {
            const model = useCustomModel && config.llm.customModel
                ? config.llm.customModel
                : config.llm.model;

            const base = (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE || '';
            const token = (import.meta as { env?: Record<string, string> }).env?.VITE_API_TOKEN;
            const proxyUrl = base ? `${base.replace(/\/$/, '')}/api/llm/chat` : '/api/llm/chat';

            const response = await fetch(useServerKeys ? proxyUrl : `${config.llm.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(useServerKeys ? {} : { Authorization: `Bearer ${config.llm.apiKey}` }),
                    ...(config.llm.provider === 'anthropic' && !useServerKeys ? {
                        'x-api-key': config.llm.apiKey,
                        'anthropic-version': '2023-06-01',
                    } : {}),
                    ...(useServerKeys && token ? { 'x-aether-token': token } : {}),
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 10,
                }),
            });

            if (response.ok) {
                const data = await response.json().catch(() => ({}));
                const modelUsed = data.model || model;
                setTestStatus('success');
                setTestMessage(`Connection OK: ${modelUsed}`);
            } else {
                const errorData = await response.json().catch(() => ({}));
                setTestStatus('error');
                setTestMessage(errorData.error?.message || `Connection failed: ${response.status}`);
            }
        } catch (error) {
            setTestStatus('error');
            setTestMessage(error instanceof Error ? error.message : 'Connection failed');
        }
    };

    if (!isConfigOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
                onClick={closeConfig}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-xl bg-white rounded-2xl shadow-elevated overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between px-6 py-4 border-b border-stone-100">
                        <div>
                            <h2 className="text-xl font-serif font-medium text-stone-900">API Configuration</h2>
                            {useServerKeys && (
                                <p className="mt-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
                                    Server key mode enabled. Keys are read from backend environment variables.
                                </p>
                            )}
                        </div>
                        <button
                            onClick={closeConfig}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-stone-100">
                        {[
                            { id: 'llm', label: 'AI 模型', icon: Cpu },
                            { id: 'travel', label: '旅行 API', icon: Plane },
                            { id: 'map', label: '地图 API', icon: MapPin },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'llm' | 'travel' | 'map')}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                                    activeTab === tab.id
                                        ? 'text-stone-900 border-b-2 border-stone-900 -mb-[1px]'
                                        : 'text-stone-400 hover:text-stone-600'
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        {/* LLM Tab */}
                        {activeTab === 'llm' && (
                            <div className="space-y-5">
                                {/* Provider Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-stone-700">服务商 Provider</label>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-left hover:border-stone-200 transition-colors"
                                        >
                                            <span className="text-stone-800">{currentProvider?.name || 'Select Provider'}</span>
                                            <ChevronDown className={cn('w-4 h-4 text-stone-400 transition-transform', showProviderDropdown && 'rotate-180')} />
                                        </button>

                                        <AnimatePresence>
                                            {showProviderDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute z-10 mt-2 w-full bg-white rounded-xl border border-stone-100 shadow-elevated overflow-hidden max-h-48 overflow-y-auto"
                                                >
                                                    {LLM_PROVIDERS.map(provider => (
                                                        <button
                                                            key={provider.id}
                                                            onClick={() => {
                                                                updateLLMProvider(provider.id as LLMProvider);
                                                                setShowProviderDropdown(false);
                                                                setTestStatus('idle');
                                                            }}
                                                            className={cn(
                                                                'w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-50 transition-colors',
                                                                config.llm.provider === provider.id && 'bg-sage-50'
                                                            )}
                                                        >
                                                            <span className="text-stone-800">{provider.name}</span>
                                                            {config.llm.provider === provider.id && (
                                                                <Check className="w-4 h-4 text-sage-600" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* API Key */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                                        <Key className="w-4 h-4" />
                                        API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={useServerKeys ? '' : config.llm.apiKey}
                                        onChange={e => { updateLLMApiKey(e.target.value); setTestStatus('idle'); }}
                                        placeholder={useServerKeys ? 'Managed by server' : 'sk-...'}
                                        disabled={useServerKeys}
                                        className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-300 transition-colors"
                                    />
                                </div>

                                {/* Base URL */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                                        <Globe className="w-4 h-4" />
                                        Base URL
                                    </label>
                                    <input
                                        type="text"
                                        value={config.llm.baseUrl}
                                        onChange={e => { updateLLMBaseUrl(e.target.value); setTestStatus('idle'); }}
                                        placeholder="https://api.openai.com/v1"
                                        className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-300 transition-colors"
                                    />
                                </div>

                                {/* Model Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-stone-700">预设模型</label>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowModelDropdown(!showModelDropdown)}
                                            disabled={useCustomModel}
                                            className={cn(
                                                "w-full flex items-center justify-between px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-left transition-colors",
                                                useCustomModel ? 'opacity-50 cursor-not-allowed' : 'hover:border-stone-200'
                                            )}
                                        >
                                            <span className="text-stone-800">
                                                {currentProvider?.models.find(m => m.id === config.llm.model)?.name || config.llm.model}
                                            </span>
                                            <ChevronDown className={cn('w-4 h-4 text-stone-400 transition-transform', showModelDropdown && 'rotate-180')} />
                                        </button>

                                        <AnimatePresence>
                                            {showModelDropdown && !useCustomModel && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute z-10 mt-2 w-full bg-white rounded-xl border border-stone-100 shadow-elevated overflow-hidden max-h-48 overflow-y-auto"
                                                >
                                                    {currentProvider?.models.map(model => (
                                                        <button
                                                            key={model.id}
                                                            onClick={() => {
                                                                updateLLMModel(model.id);
                                                                setShowModelDropdown(false);
                                                                setTestStatus('idle');
                                                            }}
                                                            className={cn(
                                                                'w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-50 transition-colors',
                                                                config.llm.model === model.id && 'bg-sage-50'
                                                            )}
                                                        >
                                                            <div>
                                                                <span className="text-stone-800 block">{model.name}</span>
                                                                {model.description && (
                                                                    <span className="text-xs text-stone-400">{model.description}</span>
                                                                )}
                                                            </div>
                                                            {config.llm.model === model.id && (
                                                                <Check className="w-4 h-4 text-sage-600" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Custom Model Toggle & Input */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-stone-700">使用自定义模型名称</label>
                                        <button
                                            onClick={() => setUseCustomModel(!useCustomModel)}
                                            className={cn(
                                                'w-12 h-6 rounded-full transition-colors relative',
                                                useCustomModel ? 'bg-sage-500' : 'bg-stone-200'
                                            )}
                                        >
                                            <span className={cn(
                                                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                                                useCustomModel ? 'translate-x-6' : 'translate-x-0.5'
                                            )} />
                                        </button>
                                    </div>

                                    {useCustomModel && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                        >
                                            <input
                                                type="text"
                                                value={config.llm.customModel || ''}
                                                onChange={e => { updateLLMCustomModel(e.target.value); setTestStatus('idle'); }}
                                                placeholder="输入模型名称，如 gpt-4o, claude-3-opus..."
                                                className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-300 transition-colors"
                                            />
                                            <p className="text-xs text-stone-400 mt-1">
                                                直接输入 API 要求的模型名称，将覆盖预设选择
                                            </p>
                                        </motion.div>
                                    )}
                                </div>

                                {/* API Test Section */}
                                <div className="pt-4 border-t border-stone-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                                            <Zap className="w-4 h-4" />
                                            测试 API 连接
                                        </label>
                                        <button
                                            onClick={handleTestAPI}
                                            disabled={testStatus === 'testing'}
                                            className={cn(
                                                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                                                testStatus === 'testing'
                                                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                                    : 'bg-stone-900 text-white hover:bg-stone-800'
                                            )}
                                        >
                                            {testStatus === 'testing' ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    测试中...
                                                </>
                                            ) : (
                                                '测试连接'
                                            )}
                                        </button>
                                    </div>

                                    {/* Test Result */}
                                    {testStatus !== 'idle' && testStatus !== 'testing' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                'p-3 rounded-xl flex items-start gap-2 text-sm',
                                                testStatus === 'success' ? 'bg-sage-50 text-sage-700' : 'bg-red-50 text-red-700'
                                            )}
                                        >
                                            {testStatus === 'success' ? (
                                                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            )}
                                            <span>{testMessage}</span>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Tambo Mode Toggle */}
                                <div className="pt-4 border-t border-stone-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                Tambo 模式
                                            </label>
                                            <p className="text-xs text-stone-400 mt-1 ml-6">使用 Tambo AI 代理进行对话和工具调用</p>
                                        </div>
                                        <button
                                            onClick={() => updateTamboConfig({ enabled: !config.tambo.enabled })}
                                            className={cn(
                                                'w-12 h-6 rounded-full transition-colors relative',
                                                config.tambo.enabled ? 'bg-sage-500' : 'bg-stone-200'
                                            )}
                                        >
                                            <span className={cn(
                                                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                                                config.tambo.enabled ? 'translate-x-6' : 'translate-x-0.5'
                                            )} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Travel API Tab */}
                        {activeTab === 'travel' && (
                            <div className="space-y-5">
                                <div className="flex items-start gap-3 p-4 bg-stone-50 rounded-xl">
                                    <AlertCircle className="w-5 h-5 text-stone-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-stone-600">
                                        <p className="font-medium mb-1">Amadeus API (航班搜索)</p>
                                        <p>需要在 <a href="https://developers.amadeus.com" target="_blank" rel="noopener noreferrer" className="text-sage-600 underline">developers.amadeus.com</a> 注册开发者账号获取 API Key。</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-stone-700">启用 Amadeus API</span>
                                    <button
                                        onClick={() => updateAmadeusConfig({ enabled: !config.amadeus.enabled })}
                                        className={cn(
                                            'w-12 h-6 rounded-full transition-colors relative',
                                            config.amadeus.enabled ? 'bg-sage-500' : 'bg-stone-200'
                                        )}
                                    >
                                        <span className={cn(
                                            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                                            config.amadeus.enabled ? 'translate-x-6' : 'translate-x-0.5'
                                        )} />
                                    </button>
                                </div>

                                {config.amadeus.enabled && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-stone-700">API Key</label>
                                            <input
                                                type="password"
                                                value={useServerKeys ? '' : config.amadeus.apiKey}
                                                onChange={e => updateAmadeusConfig({ apiKey: e.target.value })}
                                                placeholder={useServerKeys ? 'Managed by server' : 'Amadeus API Key'}
                                                disabled={useServerKeys}
                                                className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-300 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-stone-700">API Secret</label>
                                            <input
                                                type="password"
                                                value={useServerKeys ? '' : config.amadeus.apiSecret}
                                                onChange={e => updateAmadeusConfig({ apiSecret: e.target.value })}
                                                placeholder={useServerKeys ? 'Managed by server' : 'Amadeus API Secret'}
                                                disabled={useServerKeys}
                                                className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-300 transition-colors"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Map API Tab */}
                        {activeTab === 'map' && (
                            <div className="space-y-5">
                                <div className="flex items-start gap-3 p-4 bg-stone-50 rounded-xl">
                                    <AlertCircle className="w-5 h-5 text-stone-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-stone-600">
                                        <p className="font-medium mb-1">高德地图 API</p>
                                        <p>需要在 <a href="https://lbs.amap.com" target="_blank" rel="noopener noreferrer" className="text-sage-600 underline">高德开放平台</a> 注册获取 API Key。目前使用免费的 OpenStreetMap。</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-stone-700">启用高德地图 API</span>
                                    <button
                                        onClick={() => updateAmapConfig({ enabled: !config.amap.enabled })}
                                        className={cn(
                                            'w-12 h-6 rounded-full transition-colors relative',
                                            config.amap.enabled ? 'bg-sage-500' : 'bg-stone-200'
                                        )}
                                    >
                                        <span className={cn(
                                            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                                            config.amap.enabled ? 'translate-x-6' : 'translate-x-0.5'
                                        )} />
                                    </button>
                                </div>

                                {config.amap.enabled && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-stone-700">高德 API Key</label>
                                        <input
                                            type="password"
                                            value={useServerKeys ? '' : config.amap.apiKey}
                                            onChange={e => updateAmapConfig({ apiKey: e.target.value })}
                                            placeholder={useServerKeys ? 'Managed by server' : '高德地图 API Key'}
                                            disabled={useServerKeys}
                                            className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-300 transition-colors"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 bg-stone-50/50">
                        <p className="text-xs text-stone-400">配置保存在浏览器本地存储中</p>
                        <button
                            onClick={handleSave}
                            className={cn(
                                'btn-primary flex items-center gap-2',
                                saved && 'bg-sage-600'
                            )}
                        >
                            {saved ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    已保存
                                </>
                            ) : (
                                '保存配置'
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SettingsModal;
