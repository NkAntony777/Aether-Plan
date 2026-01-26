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
const SYSTEM_PROMPT = `你是 Aether Plan，一个优雅的旅行规划助手。你的任务是帮助用户规划旅行。

你需要收集以下信息来规划旅行：
1. 目的地 (destination) - 支持全球任意城市
2. 出发地 (origin) - 支持全球任意城市
3. 出行日期 (dates)
4. 交通方式 (transport)

请用温暖、优雅的语气与用户交流。当用户提到旅行意图时，帮助他们一步一步完成规划。

【重要】你支持全球任意城市，不仅限于中国城市。无论用户想去巴黎、东京、纽约还是任何地方，都可以帮忙规划。

当用户提到目的地时，请提取城市名称并引导用户进入下一步流程。

回复格式：
- 普通文本回复直接返回
- 如果需要用户输入信息，你的回复应该引导用户下一步操作`;

// Call LLM API with OpenAI-compatible format
export async function callLLM(messages: ChatMessage[]): Promise<LLMResponse> {
    const config = loadAPIConfig();

    // Check if API key is configured
    if (!config.llm.apiKey) {
        return {
            success: false,
            error: '请先在设置中配置 API Key',
        };
    }

    const provider = LLM_PROVIDERS.find(p => p.id === config.llm.provider);
    const baseUrl = config.llm.baseUrl || provider?.baseUrl || 'https://api.openai.com/v1';

    // Support custom model input
    let model = config.llm.model;
    if (config.llm.customModel) {
        model = config.llm.customModel;
    } else if (config.llm.provider === 'custom') {
        model = config.llm.customModel || config.llm.model;
    }

    // Prepare messages with system prompt
    const fullMessages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
    ];

    try {
        // OpenAI-compatible API call
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.llm.apiKey}`,
                // Anthropic uses different header
                ...(config.llm.provider === 'anthropic' ? {
                    'x-api-key': config.llm.apiKey,
                    'anthropic-version': '2023-06-01',
                } : {}),
            },
            body: JSON.stringify({
                model,
                messages: fullMessages,
                max_tokens: 1024,
                temperature: 0.7,
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
    // Common travel patterns in Chinese
    const patterns = [
        /去(.{2,10}?)(?:旅游|旅行|玩|转转|看看|游玩)/,
        /想?(?:去|到)(.{2,10})$/,
        /(.{2,10})(?:之旅|游|行)/,
        /目的地[是为：:]*(.{2,10})/,
        /^([\u4e00-\u9fa5]{2,6})$/, // Standalone valid Chinese city name (strict)
    ];

    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match && match[1]) {
            // Clean up the extracted city name
            const city = match[1].trim().replace(/[，。！？,!?]/g, '');

            // Validation: City names are usually short (2-5 chars for Chinese)
            // Block generic words to prevent "Help me plan" being captured
            const blocklist = [
                '帮我', '规划', '行程', '景点', '推荐', '看看', '这个', '那个', '几天', '怎么', '什么',
                '你好', '谢谢', '再见', '没有', '是的', '不是', '好的', '收到', '可以', '不行', '这就', '开始'
            ];
            const forbiddenTerms = ['\u9152\u5e97', '\u4f4f\u5bbf', '\u5bbe\u9986', '\u6c11\u5bbf', '\u65c5\u9986', '\u9009\u9152\u5e97', '\u627e\u9152\u5e97', '\u8ba2\u9152\u5e97', '\u4f4f\u54ea', '\u4f4f\u54ea\u91cc', '\u4f4f\u90a3'];

            if (
                city.length >= 2 &&
                city.length <= 6 &&  // Chinese cities rarely exceed 6 chars (e.g. ????)
                !blocklist.some(word => city.includes(word)) &&
                !forbiddenTerms.some(term => city.includes(term)) &&
                !/^\d+$/.test(city) // Reject pure numbers
            ) {
                return city;
            }
        }
    }

    return null;
}

// Extract date range from text
function extractDates(input: string): { start: string; end: string } | null {
    // Matches "8月15日-8月18日" or "8.15-8.18" or "8月15到18号"
    const datePattern = /(\d{1,2})[月.](\d{1,2})[日号]?(?:[-至到]|\s{1,3})(\d{1,2})[月.](\d{1,2})[日号]?/g;
    const match = datePattern.exec(input);

    if (match) {
        const year = new Date().getFullYear();
        const startMonth = match[1].padStart(2, '0');
        const startDay = match[2].padStart(2, '0');
        const endMonth = match[3].padStart(2, '0');
        const endDay = match[4].padStart(2, '0');
        return {
            start: `${year}-${startMonth}-${startDay}`,
            end: `${year}-${endMonth}-${endDay}`
        };
    }
    return null;
}

// Extract transport mode from text
function extractTransport(input: string): 'flight' | 'train' | 'drive' | null {
    if (input.includes('飞机') || input.includes('航班') || input.includes('飞过去')) return 'flight';
    if (input.includes('高铁') || input.includes('火车') || input.includes('动车')) return 'train';
    if (input.includes('自驾') || input.includes('开车')) return 'drive';
    return null;
}

// Enhanced intent detection
export function detectIntentLocally(input: string): {
    intent: 'travel' | 'hotel' | 'attraction' | 'map' | 'flight' | 'train' | 'plan_itinerary' | 'unknown';
    action?: 'search' | 'modify' | 'view' | 'create'; // Action type: search new, modify existing, or just view
    destination?: string;
    extractedDates?: { start: string; end: string };
    extractedTransport?: 'flight' | 'train' | 'drive';
} {
    const lowerInput = input.toLowerCase();

    // Extract entities
    const destination = extractDestination(input);
    const extractedDates = extractDates(input) || undefined;
    const extractedTransport = extractTransport(input) || undefined;

    // 1. Check for Modification/Re-selection Intents (Context Switching)
    if (
        lowerInput.includes('重新') ||
        lowerInput.includes('换个') ||
        lowerInput.includes('修改') ||
        lowerInput.includes('不想要') ||
        lowerInput.includes('选错')
    ) {
        if (lowerInput.includes('酒店') || lowerInput.includes('住')) {
            return { intent: 'hotel', action: 'modify', destination: destination || undefined, extractedDates, extractedTransport };
        }
        if (lowerInput.includes('机票') || lowerInput.includes('航班') || lowerInput.includes('飞')) {
            return { intent: 'flight', action: 'modify', destination: destination || undefined, extractedDates, extractedTransport };
        }
        if (lowerInput.includes('高铁') || lowerInput.includes('火车') || lowerInput.includes('动车') || lowerInput.includes('票')) {
            return { intent: 'train', action: 'modify', destination: destination || undefined, extractedDates, extractedTransport };
        }
        if (lowerInput.includes('地点') || lowerInput.includes('目的地') || lowerInput.includes('城市')) {
            return { intent: 'travel', action: 'modify', destination: destination || undefined, extractedDates, extractedTransport };
        }
    }

    // 2. Plan/Itinerary Intent (Highest Priority Standard Intent)
    if (
        lowerInput.includes('行程') ||
        lowerInput.includes('规划') ||
        lowerInput.includes('安排') ||
        lowerInput.includes('路线') ||
        lowerInput.includes('攻略') ||
        lowerInput.includes('计划')
    ) {
        return { intent: 'plan_itinerary', action: 'create', destination: destination || undefined, extractedDates, extractedTransport };
    }

    // 3. Entity-Specific Intents
    if (lowerInput.includes('酒店') || lowerInput.includes('住宿') || lowerInput.includes('宾馆')) {
        return { intent: 'hotel', action: 'search', destination: destination || undefined, extractedDates, extractedTransport };
    }

    if (lowerInput.includes('景点') || lowerInput.includes('玩什么') || lowerInput.includes('有什么好玩') || lowerInput.includes('景区')) {
        return { intent: 'attraction', action: 'view', destination: destination || undefined, extractedDates, extractedTransport };
    }

    if (lowerInput.includes('地图') || lowerInput.includes('位置') || lowerInput.includes('在哪')) {
        return { intent: 'map', action: 'view', destination: destination || undefined, extractedDates, extractedTransport };
    }

    if (lowerInput.includes('飞机') || lowerInput.includes('航班') || lowerInput.includes('机票')) {
        return { intent: 'flight', action: 'search', destination: destination || undefined, extractedDates, extractedTransport };
    }

    if (lowerInput.includes('高铁') || lowerInput.includes('火车') || lowerInput.includes('动车')) {
        return { intent: 'train', action: 'search', destination: destination || undefined, extractedDates, extractedTransport };
    }

    if (lowerInput.includes('旅游') || lowerInput.includes('旅行') || lowerInput.includes('去') || destination) {
        // If user explicitly asks for itinerary/planning
        if (
            lowerInput.includes('行程') ||
            lowerInput.includes('规划') ||
            lowerInput.includes('安排') ||
            lowerInput.includes('路线') ||
            lowerInput.includes('攻略')
        ) {
            return { intent: 'plan_itinerary', action: 'create', destination: destination || undefined, extractedDates, extractedTransport };
        }
        return { intent: 'travel', action: 'search', destination: destination || undefined, extractedDates, extractedTransport };
    }

    // Direct planning request without travel keywords
    if (
        lowerInput.includes('行程') ||
        lowerInput.includes('规划') ||
        lowerInput.includes('安排') ||
        lowerInput.includes('计划')
    ) {
        return { intent: 'plan_itinerary', action: 'create', destination: destination || undefined, extractedDates, extractedTransport };
    }

    // Capture standalone entities
    if (extractedDates || extractedTransport) {
        // If we found dates/transport but no specific intent, merge into current context
        return { intent: 'unknown', extractedDates, extractedTransport };
    }

    return { intent: 'unknown' };
}

// Check if LLM is configured and ready
export function isLLMConfigured(): boolean {
    const config = loadAPIConfig();
    return Boolean(config.llm.apiKey && config.llm.baseUrl && config.llm.model);
}
