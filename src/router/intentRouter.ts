/**
 * 意图驱动路由系统
 * 
 * 核心概念：
 * - Intent: 用户意图（如 travel, hotel, attraction）
 * - Action: 具体动作（如 search, modify, view）
 * - Entity: 实体信息（如目的地、日期、人数）
 * - Context: 上下文（用于多轮对话）
 */

import { callLLM, isLLMConfigured } from '../services/llm';

// ==================== 类型定义 ====================

/** 意图类型 */
export type IntentType =
    | 'travel'        // 旅行规划
    | 'hotel'         // 酒店搜索
    | 'flight'        // 航班搜索
    | 'train'         // 火车票搜索
    | 'attraction'    // 景点查询
    | 'restaurant'    // 餐厅推荐
    | 'map'           // 地图查看
    | 'plan'          // 通用计划（学习/项目/活动/生活）
    | 'weather'       // 天气查询
    | 'chat'          // 闲聊
    | 'help'          // 帮助
    | 'unknown';      // 未知意图

/** 动作类型 */
export type ActionType =
    | 'search'        // 搜索
    | 'modify'        // 修改
    | 'view'          // 查看
    | 'create'        // 创建
    | 'cancel'        // 取消
    | 'confirm'       // 确认
    | 'ask'           // 询问
    | 'navigate';     // 导航

/** 计划领域 */
export type PlanDomain = 'travel' | 'study' | 'project' | 'event' | 'life' | 'other';

/** 实体信息 */
export interface Entities {
    destination?: string;
    origin?: string;
    dates?: { start: string; end: string };
    date?: string;
    travelers?: number;
    budget?: number;
    transportMode?: 'flight' | 'train' | 'car' | 'bus';
    accommodationType?: 'hotel' | 'hostel' | 'apartment';
    keywords?: string[];
    planDomain?: PlanDomain;
    goal?: string;
    [key: string]: unknown;
}

/** 意图识别结果 */
export interface IntentResult {
    intent: IntentType;
    action: ActionType;
    confidence: number;
    entities: Entities;
    subIntents?: IntentType[];
    reasoning?: string;
    suggestedResponse?: string;
    needsClarification?: boolean;
    clarificationQuestion?: string;
}

/** 路由配置 */
export interface RouteConfig {
    intent: IntentType;
    component?: string;
    handler?: string;
    requiredEntities?: string[];
    optionalEntities?: string[];
    description: string;
}

/** 对话上下文 */
export interface ConversationContext {
    sessionId: string;
    history: Array<{
        role: 'user' | 'assistant';
        content: string;
        intent?: IntentType;
        entities?: Entities;
    }>;
    currentState: {
        activeIntent?: IntentType;
        collectedEntities: Entities;
        pendingAction?: ActionType;
        planDomain?: PlanDomain;
    };
}

// ==================== LLM 提示词 ====================

const INTENT_RECOGNITION_PROMPT = `你是一个专业的意图识别助手，负责分析用户输入并提取结构化信息。

## 任务
分析用户的输入，识别意图、动作和实体，返回 JSON 格式的结果。

## 意图类型
- travel: 旅行规划（想去某地、旅游、度假）
- hotel: 酒店相关（住宿、宾馆、民宿）
- flight: 航班相关（机票、飞机）
- train: 火车票相关（高铁、动车、火车）
- attraction: 景点查询（景点、游玩、打卡）
- restaurant: 餐厅推荐（美食、吃饭、餐厅）
- map: 地图查看（地图、位置、在哪）
- plan: 通用计划（学习计划、项目计划、活动筹备、生活目标）
- weather: 天气查询（天气、气温、下雨）
- chat: 闲聊（打招呼、聊天、问候）
- help: 帮助（怎么用、功能、帮助）
- unknown: 无法识别

## 动作类型
- search: 搜索/查询
- modify: 修改/更换
- view: 查看/展示
- create: 创建/制定
- cancel: 取消
- confirm: 确认
- ask: 询问
- navigate: 导航/跳转

## 实体类型
- destination: 目的地（城市、景点名）
- origin: 出发地
- dates: 日期范围 {start, end}
- date: 单个日期
- travelers: 人数
- budget: 预算
- transportMode: 交通方式 (flight/train/car/bus)
- accommodationType: 住宿类型
- keywords: 关键词数组
- planDomain: 计划领域 (travel/study/project/event/life/other)
- goal: 目标描述

## 分析要点
1. 理解用户的真实意图，不要被表面词汇迷惑
2. 提取所有可识别的实体信息
3. 判断是否需要澄清（如信息不足或有歧义）
4. 给出建议的回复内容
5. 评估置信度

## 当前上下文
{CONTEXT}

## 用户输入
{USER_INPUT}

## 输出格式（严格 JSON）
{
    "intent": "意图类型",
    "action": "动作类型",
    "confidence": 0.95,
    "entities": {
        "destination": "提取的目的地",
        "origin": "提取的出发地",
        "dates": {"start": "2024-03-15", "end": "2024-03-20"},
        "travelers": 2,
        "budget": 5000,
        "transportMode": "flight",
        "keywords": ["美食", "景点"],
        "planDomain": "travel",
        "goal": "用户目标"
    },
    "subIntents": ["hotel", "attraction"],
    "reasoning": "识别理由",
    "suggestedResponse": "建议的回复内容",
    "needsClarification": false,
    "clarificationQuestion": "如需澄清，填写澄清问题"
}`;

// ==================== 意图识别器 ====================

export class IntentRecognizer {
    private context: ConversationContext;

    constructor(sessionId: string = 'default') {
        this.context = {
            sessionId,
            history: [],
            currentState: {
                collectedEntities: {},
            },
        };
    }

    /**
     * 分析用户输入，识别意图
     */
    async recognize(userInput: string): Promise<IntentResult> {
        // 1. 如果 LLM 可用，使用 LLM 进行意图识别
        if (isLLMConfigured()) {
            return this.recognizeWithLLM(userInput);
        }

        // 2. 否则使用本地规则
        return this.recognizeLocally(userInput);
    }

    /**
     * 使用 LLM 进行意图识别
     */
    private async recognizeWithLLM(userInput: string): Promise<IntentResult> {
        const contextStr = this.buildContextString();
        const prompt = INTENT_RECOGNITION_PROMPT
            .replace('{CONTEXT}', contextStr)
            .replace('{USER_INPUT}', userInput);

        try {
            const response = await callLLM([
                { role: 'system', content: '你是一个意图识别专家，只返回 JSON 格式的结果，不要有任何其他输出。' },
                { role: 'user', content: prompt }
            ], { temperature: 0.1 });

            if (response.success && response.message) {
                const jsonMatch = response.message.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]) as IntentResult;
                    return this.validateAndNormalize(result);
                }
            }
        } catch (error) {
            console.error('LLM intent recognition failed:', error);
        }

        return this.recognizeLocally(userInput);
    }

    /**
     * 本地规则识别（降级方案）
     */
    private recognizeLocally(userInput: string): IntentResult {
        const lower = userInput.toLowerCase();
        const entities: Entities = {};

        const intentKeywords: Record<IntentType, string[]> = {
            travel: ['旅游', '旅行', '去', '玩', '度假', '出行', '游玩', '想去', '要去'],
            hotel: ['酒店', '住宿', '宾馆', '民宿', '住哪', '订房', '房间'],
            flight: ['机票', '飞机', '航班', '坐飞机', '飞'],
            train: ['火车', '高铁', '动车', '车票', '列车'],
            attraction: ['景点', '玩什么', '打卡', '必去', '推荐去', '有什么好玩的'],
            restaurant: ['餐厅', '美食', '吃饭', '好吃', '推荐吃', '餐馆'],
            map: ['地图', '在哪', '位置', '怎么走', '路线'],
            plan: ['计划', '规划', '安排', '制定', '学习计划', '项目计划'],
            weather: ['天气', '气温', '下雨', '晴天', '冷不冷'],
            chat: ['你好', '嗨', 'hello', 'hi', '在吗', '怎么样'],
            help: ['怎么用', '帮助', '功能', '能做什么', '使用方法'],
            unknown: [],
        };

        const actionKeywords: Record<ActionType, string[]> = {
            search: ['搜索', '查', '找', '看', '有没有', '多少'],
            modify: ['换', '改', '修改', '更换', '不要这个', '重新'],
            view: ['显示', '展示', '看看', '查看'],
            create: ['创建', '制定', '生成', '规划', '安排'],
            cancel: ['取消', '不要', '算了', '放弃'],
            confirm: ['确认', '确定', '好的', '可以', '没问题'],
            ask: ['什么', '怎么', '如何', '为什么', '哪'],
            navigate: ['去', '跳转', '打开', '进入'],
        };

        let intent: IntentType = 'unknown';
        let maxMatches = 0;

        for (const [type, keywords] of Object.entries(intentKeywords)) {
            const matches = keywords.filter(k => lower.includes(k)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                intent = type as IntentType;
            }
        }

        let action: ActionType = 'search';
        for (const [type, keywords] of Object.entries(actionKeywords)) {
            if (keywords.some(k => lower.includes(k))) {
                action = type as ActionType;
                break;
            }
        }

        entities.destination = this.extractDestination(lower);
        entities.origin = this.extractOrigin(lower);
        entities.dates = this.extractDates(lower);
        entities.budget = this.extractBudget(lower);
        entities.travelers = this.extractTravelers(lower);

        const suggestedResponse = this.generateSuggestedResponse(intent, action, entities);

        return {
            intent,
            action,
            confidence: 0.6,
            entities,
            suggestedResponse,
            needsClarification: intent === 'unknown',
        };
    }

    private buildContextString(): string {
        const { currentState, history } = this.context;
        const recentHistory = history.slice(-5);
        const lines: string[] = [];

        if (currentState.activeIntent) {
            lines.push(`当前活跃意图: ${currentState.activeIntent}`);
        }
        if (Object.keys(currentState.collectedEntities).length > 0) {
            lines.push(`已收集实体: ${JSON.stringify(currentState.collectedEntities)}`);
        }
        if (currentState.planDomain) {
            lines.push(`计划领域: ${currentState.planDomain}`);
        }
        if (recentHistory.length > 0) {
            lines.push('最近对话:');
            recentHistory.forEach(h => {
                lines.push(`  ${h.role === 'user' ? '用户' : '助手'}: ${h.content.slice(0, 100)}`);
            });
        }

        return lines.length > 0 ? lines.join('\n') : '无上下文信息';
    }

    private validateAndNormalize(result: IntentResult): IntentResult {
        if (!result.intent) result.intent = 'unknown';
        if (!result.action) result.action = 'search';
        if (!result.entities) result.entities = {};
        if (typeof result.confidence !== 'number') result.confidence = 0.5;

        result.entities = {
            ...this.context.currentState.collectedEntities,
            ...result.entities,
        };

        return result;
    }

    private extractDestination(text: string): string | undefined {
        const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '西安', '南京', '苏州',
            '厦门', '青岛', '大连', '三亚', '丽江', '大理', '桂林', '长沙', '武汉', '天津',
            '东京', '巴黎', '纽约', '伦敦', '首尔', '曼谷', '新加坡', '悉尼'];

        for (const city of cities) {
            if (text.includes(city)) return city;
        }
        return undefined;
    }

    private extractOrigin(text: string): string | undefined {
        const patterns = ['从', '出发'];
        for (const p of patterns) {
            const index = text.indexOf(p);
            if (index !== -1) {
                const after = text.slice(index + p.length);
                const city = this.extractDestination(after);
                if (city) return city;
            }
        }
        return undefined;
    }

    private extractDates(text: string): { start: string; end: string } | undefined {
        const datePattern = /(\d{1,2})月(\d{1,2})/;
        const match = text.match(datePattern);
        if (match) {
            const month = match[1].padStart(2, '0');
            const day = match[2].padStart(2, '0');
            const year = new Date().getFullYear();
            return { start: `${year}-${month}-${day}`, end: `${year}-${month}-${day}` };
        }
        return undefined;
    }

    private extractBudget(text: string): number | undefined {
        const match = text.match(/(\d+)[块元千]/);
        return match ? parseInt(match[1]) : undefined;
    }

    private extractTravelers(text: string): number | undefined {
        const patterns = ['(\\d+)人', '(\\d+)个', '一家(\\d+)口'];
        for (const p of patterns) {
            const match = text.match(new RegExp(p));
            if (match) return parseInt(match[1]);
        }
        return undefined;
    }

    private generateSuggestedResponse(intent: IntentType, action: ActionType, entities: Entities): string {
        const responses: Record<IntentType, string> = {
            travel: `好的，我来帮您规划${entities.destination ? `去${entities.destination}` : ''}的旅行。`,
            hotel: `正在为您查找${entities.destination ? `${entities.destination}` : ''}的酒店信息。`,
            flight: `正在搜索${entities.origin ? `从${entities.origin}` : ''}到${entities.destination || '目的地'}的航班。`,
            train: `正在查询${entities.origin ? `从${entities.origin}` : ''}到${entities.destination || '目的地'}的高铁。`,
            attraction: `${entities.destination || '这里'}有很多值得去的地方，让我为您推荐。`,
            restaurant: `正在为您寻找${entities.destination || '附近'}的美食。`,
            map: `正在加载${entities.destination || '目的地'}的地图。`,
            plan: `好的，让我帮您制定计划。`,
            weather: `正在查询${entities.destination || ''}的天气情况。`,
            chat: '您好！有什么我可以帮助您的吗？',
            help: '我可以帮您规划旅行、搜索酒店、查询航班高铁、推荐景点美食等。您想做什么？',
            unknown: '抱歉，我不太理解您的意思。您可以告诉我您想去哪里旅游，或者需要什么帮助？',
        };

        return responses[intent] || responses.unknown;
    }

    /**
     * 更新上下文
     */
    updateContext(role: 'user' | 'assistant', content: string, intent?: IntentType, entities?: Entities) {
        this.context.history.push({ role, content, intent, entities });

        if (intent) {
            this.context.currentState.activeIntent = intent;
        }

        if (entities) {
            this.context.currentState.collectedEntities = {
                ...this.context.currentState.collectedEntities,
                ...entities,
            };
        }
    }

    /**
     * 获取当前上下文
     */
    getContext(): ConversationContext {
        return this.context;
    }

    /**
     * 清除上下文
     */
    clearContext() {
        this.context = {
            sessionId: this.context.sessionId,
            history: [],
            currentState: {
                collectedEntities: {},
            },
        };
    }
}

// ==================== 全局实例 ====================

let globalRecognizer: IntentRecognizer | null = null;

export function getIntentRecognizer(sessionId?: string): IntentRecognizer {
    if (!globalRecognizer || (sessionId && globalRecognizer.getContext().sessionId !== sessionId)) {
        globalRecognizer = new IntentRecognizer(sessionId || 'default');
    }
    return globalRecognizer;
}
