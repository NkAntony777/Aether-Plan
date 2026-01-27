// LLM Service - Real API integration for chat
import { loadAPIConfig, LLM_PROVIDERS } from '../types/apiConfig';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMResponse {
    success: boolean;
    message?: string;
    error?: string;
}

// System prompt for travel planning assistant - supports ANY city
export type PlanDomain = 'travel' | 'study' | 'project' | 'event' | 'life' | 'other';

// System prompt registry
const TRAVEL_PROMPT = `You are Aether Plan, a refined travel planning assistant.
Help users plan trips with clarity and warmth. Collect destination, origin, dates, and transport.
Guide users step-by-step and provide structured responses.`;

const STUDY_PROMPT = `You are Aether Plan, a learning planner and study coach.
Build a learning roadmap with milestones, weekly routines, resources, and checkpoints.
Ask for goal, timeframe, current level, and weekly available time.`;

const PROJECT_PROMPT = `You are Aether Plan, a project planning assistant.
Define scope, milestones, tasks, dependencies, risks, and deliverables.
Ask for goal, deadline, team size, and constraints.`;

const EVENT_PROMPT = `You are Aether Plan, an event planning assistant.
Plan timelines, tasks, resources, and budgets for events.
Ask for event type, date, audience size, location, and budget.`;

const LIFE_PROMPT = `You are Aether Plan, a life planning assistant.
Design habits, routines, and checkpoints to reach personal goals.
Ask for goal, timeframe, daily constraints, and preferred pace.`;

const GENERAL_PROMPT = `You are Aether Plan, a universal planning assistant.
When unsure, ask clarifying questions and suggest a clear next step.`;

const PROMPT_REGISTRY: Record<PlanDomain, string> = {
    travel: TRAVEL_PROMPT,
    study: STUDY_PROMPT,
    project: PROJECT_PROMPT,
    event: EVENT_PROMPT,
    life: LIFE_PROMPT,
    other: GENERAL_PROMPT,
};

export function getSystemPrompt(domain?: PlanDomain): string {
    return PROMPT_REGISTRY[domain ?? 'other'] ?? GENERAL_PROMPT;
}

const useServerKeys = (import.meta as { env?: Record<string, string> }).env?.VITE_USE_SERVER_KEYS === 'true';

function buildProxyUrl(path: string): string {
    const base = (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE || '';
    const prefix = base ? base.replace(/\/$/, '') : '';
    return `${prefix}${path.startsWith('/') ? path : `/${path}`}`;
}

async function callLLMProxy(
    messages: ChatMessage[],
    payload: { model?: string; maxTokens?: number; temperature?: number }
): Promise<LLMResponse> {
    const token = (import.meta as { env?: Record<string, string> }).env?.VITE_API_TOKEN;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['x-aether-token'] = token;

    const url = buildProxyUrl('/api/llm/chat');
    try {
        let response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                messages,
                model: payload.model,
                max_tokens: payload.maxTokens ?? 2048,
                temperature: payload.temperature ?? 0.7,
            }),
        });

        if (!response.ok && (!url.startsWith('http') || url.startsWith('/')) && typeof window !== 'undefined') {
            const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
            if (isLocalhost) {
                const fallbackUrl = `http://localhost:8787/api/llm/chat`;
                response = await fetch(fallbackUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        messages,
                        model: payload.model,
                        max_tokens: payload.maxTokens ?? 2048,
                        temperature: payload.temperature ?? 0.7,
                    }),
                });
            }
        }

        const data = await response.json().catch(() => ({} as Record<string, unknown>));
        if (!response.ok) {
            return { success: false, error: (data as { error?: string }).error || `http_${response.status}` };
        }
        return { success: true, message: (data as { message?: string }).message || '' };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'proxy_failed' };
    }
}

// Call LLM API with OpenAI-compatible format
export async function callLLM(
    messages: ChatMessage[],
    options?: { domain?: PlanDomain; systemPrompt?: string; maxTokens?: number; temperature?: number }
): Promise<LLMResponse> {
    const config = loadAPIConfig();

    if (!useServerKeys && !config.llm.apiKey) {
        return {
            success: false,
            error: '请先在设置中配置 API Key',
        };
    }

    const provider = LLM_PROVIDERS.find(p => p.id === config.llm.provider);
    const baseUrl = config.llm.baseUrl || provider?.baseUrl || 'https://api.openai.com/v1';

    let model = config.llm.model;
    if (config.llm.customModel) {
        model = config.llm.customModel;
    } else if (config.llm.provider === 'custom') {
        model = config.llm.customModel || config.llm.model;
    }

    const systemPrompt = options?.systemPrompt || getSystemPrompt(options?.domain);
    const fullMessages: ChatMessage[] = [{ role: 'system', content: systemPrompt }, ...messages];

    if (useServerKeys) {
        return callLLMProxy(fullMessages, {
            model,
            maxTokens: options?.maxTokens,
            temperature: options?.temperature,
        });
    }

    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.llm.apiKey}`,
                ...(config.llm.provider === 'anthropic' ? {
                    'x-api-key': config.llm.apiKey,
                    'anthropic-version': '2023-06-01',
                } : {}),
            },
            body: JSON.stringify({
                model,
                messages: fullMessages,
                max_tokens: options?.maxTokens ?? 2048,
                temperature: options?.temperature ?? 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error?.message || `API 请求失败: ${response.status}`,
            };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || data.content?.[0]?.text;

        if (!content) {
            return {
                success: false,
                error: '未能获取有效回复',
            };
        }

        return {
            success: true,
            message: content,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : '网络请求失败',
        };
    }
}
// Extract destination from text - now supports any city-like name
export function extractDestination(input: string): string | null {
    const patterns = [
        /\u53bb(.{2,10}?)(?:\u65c5\u884c|\u65c5\u6e38|\u73a9|\u8f6c\u8f6c|\u770b\u770b|\u6e38\u73a9)/,
        /\u60f3\u53bb(?:\u5230)?(.{2,10})$/,
        /([\u4e00-\u9fa5]{2,6})(?:\u4e4b\u65c5|\u6e38|\u884c\u7a0b)/,
        /\u76ee\u7684\u5730(?:\u662f)?[:\uff1a]?\s*(.{2,10})/,
        /^(?:\u53bb|\u5230)\s*(.{2,10})$/,
        /^([\u4e00-\u9fa5]{2,6})$/,
    ];

    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match && match[1]) {
            const city = match[1].trim().replace(/[\uff0c\u3002\uff01\uff1f?!]/g, '');

            const blocklist = [
                '\u5e2e\u6211', '\u4e3a\u6211\u751f\u6210', '\u5e2e\u6211\u751f\u6210', '\u751f\u6210', '\u5236\u4f5c', '\u5199\u4e00\u4e2a',
                '\u89c4\u5212', '\u8ba1\u5212', '\u884c\u7a0b', '\u8349\u6848', '\u884c\u7a0b\u8349\u6848', '\u8ba1\u5212\u8349\u6848', '\u653b\u7565', '\u5b89\u6392',
                '\u666f\u70b9', '\u63a8\u8350', '\u770b\u770b', '\u8fd9\u4e2a', '\u90a3\u4e2a', '\u51e0\u5929', '\u600e\u4e48', '\u4ec0\u4e48',
                '\u4f60\u597d', '\u8c22\u8c22', '\u518d\u89c1', '\u6ca1\u6709', '\u662f\u7684', '\u4e0d\u662f', '\u597d\u7684', '\u6536\u5230', '\u53ef\u4ee5', '\u4e0d\u884c', '\u8fd9\u5c31', '\u5f00\u59cb',
                '\u6d3b\u52a8', '\u4f1a\u8bae', '\u6d3e\u5bf9', '\u6d3e\u5c0d', '\u805a\u4f1a', '\u5a5a\u793c', '\u751f\u65e5', '\u5e86\u795d'
            ];
            const forbiddenTerms = [
                '\u9152\u5e97', '\u4f4f\u5bbf', '\u5bbe\u9986', '\u6c11\u5bbf', '\u65c5\u9986',
                '\u9009\u9152\u5e97', '\u627e\u9152\u5e97', '\u8ba2\u9152\u5e97',
                '\u4f4f\u54ea', '\u4f4f\u54ea\u91cc', '\u4f4f\u90a3'
            ];

            if (
                city.length >= 2 &&
                city.length <= 6 &&
                !blocklist.some(word => city.includes(word)) &&
                !forbiddenTerms.some(term => city.includes(term)) &&
                !/^\d+$/.test(city)
            ) {
                return city;
            }
        }
    }

    return null;
}

// Extract date range from text
function extractDates(input: string): { start: string; end: string } | null {
    const year = new Date().getFullYear();
    const patterns: RegExp[] = [
        /(\d{1,2})\u6708(\d{1,2})(?:\u65e5|\u53f7)?\s*(?:-|~|\u2013|\u2014|\u5230|\u81f3)\s*(\d{1,2})\u6708(\d{1,2})(?:\u65e5|\u53f7)?/,
        /(\d{1,2})[./](\d{1,2})\s*(?:-|~|\u2013|\u2014|\u5230|\u81f3)\s*(\d{1,2})[./](\d{1,2})/,
    ];

    for (const pattern of patterns) {
        const match = pattern.exec(input);
        if (match) {
            const startMonth = match[1].padStart(2, '0');
            const startDay = match[2].padStart(2, '0');
            const endMonth = match[3].padStart(2, '0');
            const endDay = match[4].padStart(2, '0');
            const startMonthNum = Number(match[1]);
            const startDayNum = Number(match[2]);
            const endMonthNum = Number(match[3]);
            const endDayNum = Number(match[4]);
            const endYear = endMonthNum < startMonthNum || (endMonthNum === startMonthNum && endDayNum < startDayNum)
                ? year + 1
                : year;
            return {
                start: `${year}-${startMonth}-${startDay}`,
                end: `${endYear}-${endMonth}-${endDay}`,
            };
        }
    }
    return null;
}

// Extract transport mode from text
function extractTransport(input: string): 'flight' | 'train' | 'drive' | null {
    if (/(\u98de\u673a|\u822a\u73ed|\u673a\u7968|flight|plane)/i.test(input)) return 'flight';
    if (/(\u9ad8\u94c1|\u706b\u8f66|\u52a8\u8f66|\u5217\u8f66|train|rail)/i.test(input)) return 'train';
    if (/(\u81ea\u9a7e|\u5f00\u8f66|\u79df\u8f66|drive|car)/i.test(input)) return 'drive';
    return null;
}

// Enhanced intent detection
export function detectIntentLocally(input: string): {
    intent: 'travel' | 'hotel' | 'attraction' | 'map' | 'flight' | 'train' | 'plan_itinerary' | 'study' | 'project' | 'event' | 'life' | 'unknown';
    action?: 'search' | 'modify' | 'view' | 'create';
    destination?: string;
    extractedDates?: { start: string; end: string };
    extractedTransport?: 'flight' | 'train' | 'drive';
    domain?: PlanDomain;
} {
    const lowerInput = input.toLowerCase();
    const destination = extractDestination(input);
    const extractedDates = extractDates(input) || undefined;
    const extractedTransport = extractTransport(input) || undefined;

    const learningKeywords = ['\u5b66\u4e60', '\u5907\u8003', '\u8bfe\u7a0b', '\u590d\u4e60', '\u8003\u8bd5', '\u5237\u9898', '\u5b66\u4e60\u8ba1\u5212', 'study', 'learn'];
    const projectKeywords = ['\u9879\u76ee', '\u5f00\u53d1', '\u6784\u5efa', '\u642d\u5efa', '\u5b9e\u73b0', '\u4ea4\u4ed8', '\u91cc\u7a0b\u7891', 'roadmap', 'build', 'project'];
    const eventKeywords = ['\u6d3b\u52a8', '\u4f1a\u8bae', '\u53d1\u5e03\u4f1a', '\u5a5a\u793c', '\u805a\u4f1a', '\u6d3e\u5bf9', '\u6d3e\u5c0d', '\u751f\u65e5', '\u5e86\u795d', '\u5468\u5e74', '\u56e2\u5efa', '\u5e74\u4f1a', '\u665a\u4f1a', '\u9152\u4f1a', '\u6c99\u9f99', '\u8bba\u575b', '\u5c55\u4f1a', '\u805a\u9910', 'event', 'conference', 'party'];
    const lifeKeywords = ['\u751f\u6d3b', '\u4e60\u60ef', '\u5065\u8eab', '\u996e\u98df', '\u4f5c\u606f', '\u4eba\u751f', 'life plan', 'habit'];
    const travelKeywords = ['\u65c5\u884c', '\u65c5\u6e38', '\u884c\u7a0b', '\u666f\u70b9', '\u9152\u5e97', '\u673a\u7968', '\u822a\u73ed', '\u9ad8\u94c1', '\u706b\u8f66', '\u81ea\u9a7e', 'trip', 'travel'];
    const containsAny = (keywords: string[]) =>
        keywords.some(keyword => {
            if (/^[a-z0-9-]+$/.test(keyword)) {
                return new RegExp('\\b' + keyword + '\\b', 'i').test(lowerInput);
            }
            return lowerInput.includes(keyword);
        });

    const detectDomain = (): PlanDomain => {
        if (containsAny(learningKeywords)) return 'study';
        if (containsAny(projectKeywords)) return 'project';
        if (containsAny(eventKeywords)) return 'event';
        if (containsAny(lifeKeywords)) return 'life';
        if (containsAny(travelKeywords) || extractedTransport) return 'travel';
        return 'other';
    };

    const domain = detectDomain();
    const withDomain = <T extends Record<string, unknown>>(payload: T) => ({ ...payload, domain });

    const modifyKeywords = ['\u91cd\u65b0', '\u6362\u4e2a', '\u4fee\u6539', '\u4e0d\u60f3\u8981', '\u9009\u9519', '\u66f4\u6362', '\u8c03\u6574'];
    const hotelKeywords = ['\u9152\u5e97', '\u4f4f\u5bbf', '\u5bbe\u9986', '\u6c11\u5bbf'];
    const flightKeywords = ['\u673a\u7968', '\u822a\u73ed', '\u98de\u673a'];
    const trainKeywords = ['\u9ad8\u94c1', '\u706b\u8f66', '\u52a8\u8f66', '\u5217\u8f66'];
    const destinationKeywords = ['\u5730\u70b9', '\u76ee\u7684\u5730', '\u57ce\u5e02'];

    if (containsAny(modifyKeywords)) {
        if (containsAny(hotelKeywords)) {
            return withDomain({ intent: 'hotel', action: 'modify', destination: destination || undefined, extractedDates, extractedTransport });
        }
        if (containsAny(flightKeywords)) {
            return withDomain({ intent: 'flight', action: 'modify', destination: destination || undefined, extractedDates, extractedTransport });
        }
        if (containsAny(trainKeywords)) {
            return withDomain({ intent: 'train', action: 'modify', destination: destination || undefined, extractedDates, extractedTransport });
        }
        if (containsAny(destinationKeywords)) {
            return withDomain({ intent: 'travel', action: 'modify', destination: destination || undefined, extractedDates, extractedTransport });
        }
    }

    if (domain === 'study') {
        return withDomain({ intent: 'study', action: 'create', destination: destination || undefined, extractedDates, extractedTransport });
    }
    if (domain === 'project') {
        return withDomain({ intent: 'project', action: 'create', destination: destination || undefined, extractedDates, extractedTransport });
    }
    if (domain === 'event') {
        return withDomain({ intent: 'event', action: 'create', destination: destination || undefined, extractedDates, extractedTransport });
    }
    if (domain === 'life') {
        return withDomain({ intent: 'life', action: 'create', destination: destination || undefined, extractedDates, extractedTransport });
    }

    const planKeywords = ['\u884c\u7a0b', '\u89c4\u5212', '\u5b89\u6392', '\u8def\u7ebf', '\u653b\u7565', '\u8ba1\u5212'];
    if (containsAny(planKeywords)) {
        return { intent: 'plan_itinerary', action: 'create', destination: destination || undefined, extractedDates, extractedTransport };
    }

    if (containsAny(hotelKeywords)) {
        return { intent: 'hotel', action: 'search', destination: destination || undefined, extractedDates, extractedTransport };
    }

    const attractionKeywords = ['\u666f\u70b9', '\u73a9\u4ec0\u4e48', '\u6709\u4ec0\u4e48\u597d\u73a9', '\u666f\u533a'];
    if (containsAny(attractionKeywords)) {
        return { intent: 'attraction', action: 'view', destination: destination || undefined, extractedDates, extractedTransport };
    }

    const mapKeywords = ['\u5730\u56fe', '\u4f4d\u7f6e', '\u5728\u54ea'];
    if (containsAny(mapKeywords)) {
        return { intent: 'map', action: 'view', destination: destination || undefined, extractedDates, extractedTransport };
    }

    if (containsAny(flightKeywords)) {
        return { intent: 'flight', action: 'search', destination: destination || undefined, extractedDates, extractedTransport };
    }

    if (containsAny(trainKeywords)) {
        return { intent: 'train', action: 'search', destination: destination || undefined, extractedDates, extractedTransport };
    }

    const travelTriggers = ['\u65c5\u6e38', '\u65c5\u884c', '\u51fa\u884c', '\u51fa\u6e38', '\u81ea\u7531\u884c'];
    if (containsAny(travelTriggers) || destination) {
        if (containsAny(planKeywords)) {
            return { intent: 'plan_itinerary', action: 'create', destination: destination || undefined, extractedDates, extractedTransport };
        }
        return { intent: 'travel', action: 'search', destination: destination || undefined, extractedDates, extractedTransport };
    }

    if (extractedDates || extractedTransport) {
        return { intent: 'unknown', extractedDates, extractedTransport };
    }

    return { intent: 'unknown' };
}

export function detectDomainLocally(input: string): PlanDomain {
    const lowerInput = input.toLowerCase();
    const learningKeywords = ['\u5b66\u4e60', '\u5907\u8003', '\u8bfe\u7a0b', '\u590d\u4e60', '\u8003\u8bd5', '\u5237\u9898', '\u5b66\u4e60\u8ba1\u5212', 'study', 'learn'];
    const projectKeywords = ['\u9879\u76ee', '\u5f00\u53d1', '\u6784\u5efa', '\u642d\u5efa', '\u5b9e\u73b0', '\u4ea4\u4ed8', '\u91cc\u7a0b\u7891', 'roadmap', 'build', 'project'];
    const eventKeywords = ['\u6d3b\u52a8', '\u4f1a\u8bae', '\u53d1\u5e03\u4f1a', '\u5a5a\u793c', '\u805a\u4f1a', '\u6d3e\u5bf9', '\u6d3e\u5c0d', '\u751f\u65e5', '\u5e86\u795d', '\u5468\u5e74', '\u56e2\u5efa', '\u5e74\u4f1a', '\u665a\u4f1a', '\u9152\u4f1a', '\u6c99\u9f99', '\u8bba\u575b', '\u5c55\u4f1a', '\u805a\u9910', 'event', 'conference', 'party'];
    const lifeKeywords = ['\u751f\u6d3b', '\u4e60\u60ef', '\u5065\u8eab', '\u996e\u98df', '\u4f5c\u606f', '\u4eba\u751f', 'life plan', 'habit'];
    const travelKeywords = ['\u65c5\u884c', '\u65c5\u6e38', '\u884c\u7a0b', '\u666f\u70b9', '\u9152\u5e97', '\u673a\u7968', '\u822a\u73ed', '\u9ad8\u94c1', '\u706b\u8f66', '\u81ea\u9a7e', 'trip', 'travel'];

    const containsAny = (keywords: string[]) =>
        keywords.some(keyword => {
            if (/^[a-z0-9-]+$/.test(keyword)) {
                return new RegExp('\\b' + keyword + '\\b', 'i').test(lowerInput);
            }
            return lowerInput.includes(keyword);
        });

    if (containsAny(learningKeywords)) return 'study';
    if (containsAny(projectKeywords)) return 'project';
    if (containsAny(eventKeywords)) return 'event';
    if (containsAny(lifeKeywords)) return 'life';
    if (containsAny(travelKeywords)) return 'travel';
    return 'other';
}

// Check if LLM is configured and ready
export function isLLMConfigured(): boolean {
    if (useServerKeys) return true;
    const config = loadAPIConfig();
    return Boolean(config.llm.apiKey && config.llm.baseUrl && config.llm.model);
}






















