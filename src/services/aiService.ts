// AI Service - Abstraction layer for AI responses
// 升级版：支持 LLM 意图识别，同时保留降级方案

import type { CollectedData, WidgetType } from '../types/message';
import { getMockFlights, getMockTrains, getMockHotels, getMockAttractions } from './mockResponses';
import {
    getLLMService,
    initLLMService,
    type IntentResult,
    type LLMConfig,
    type IntentType,
    type PlanningDomain
} from './llm';
import { workflowEngine } from './planning';

// Response types
export interface AIResponse {
    type: 'text' | 'widget';
    content?: string;
    widgetType?: WidgetType;
    widgetPayload?: Record<string, unknown>;
}

// Intent detection (保留原有类型，用于兼容)
export type UserIntent =
    | 'travel_start'
    | 'ask_origin'
    | 'ask_dates'
    | 'ask_transport'
    | 'search_flights'
    | 'search_trains'
    | 'search_hotels'
    | 'recommend_places'
    | 'unknown';

// LLM 配置
let llmEnabled = false;
let llmConfig: LLMConfig | null = null;

/**
 * 初始化 LLM 服务
 * @param config LLM 配置
 */
export function initAI(config: {
    provider: 'openai' | 'claude' | 'ollama';
    apiKey?: string;
    baseUrl?: string;
    model?: string;
}): void {
    llmConfig = config as LLMConfig;
    initLLMService(llmConfig);
    llmEnabled = true;
    console.log(`[AI Service] LLM initialized: ${config.provider}`);
}

/**
 * 启用/禁用 LLM
 */
export function setLLMEnabled(enabled: boolean): void {
    llmEnabled = enabled;
    console.log(`[AI Service] LLM ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * 检查 LLM 是否可用
 */
export function isLLMAvailable(): boolean {
    return llmEnabled && llmConfig !== null;
}

/**
 * 意图类型映射（LLM -> 原有类型）
 */
function mapIntentToUserIntent(intent: IntentType): UserIntent {
    const mapping: Record<IntentType, UserIntent> = {
        // Travel
        'travel_start': 'travel_start',
        'travel_complete': 'travel_start',
        'travel_itinerary': 'travel_start',
        'trip_modify': 'unknown',
        'search_flights': 'search_flights',
        'search_trains': 'search_trains',
        'search_hotels': 'search_hotels',
        'recommend_places': 'recommend_places',
        // Study - 映射到 unknown，新系统会处理
        'study_plan': 'unknown',
        'study_schedule': 'unknown',
        'learning_path': 'unknown',
        'exam_prep': 'unknown',
        'skill_acquisition': 'unknown',
        // Project
        'project_kickoff': 'unknown',
        'project_milestone': 'unknown',
        'task_breakdown': 'unknown',
        'team_assignment': 'unknown',
        'project_progress': 'unknown',
        // Event
        'event_planning': 'unknown',
        'venue_booking': 'unknown',
        'budget_planning': 'unknown',
        'timeline_setup': 'unknown',
        'checklist_review': 'unknown',
        // Life
        'goal_setting': 'unknown',
        'habit_building': 'unknown',
        'daily_routine': 'unknown',
        'health_tracker': 'unknown',
        'financial_planning': 'unknown',
        // General
        'ask_weather': 'unknown',
        'ask_budget': 'unknown',
        'modify_plan': 'unknown',
        'greeting': 'unknown',
        'unknown': 'unknown',
    };
    return mapping[intent] || 'unknown';
}

/**
 * 获取意图对应的领域
 */
export function getDomainFromIntent(intent: IntentType): PlanningDomain {
    if (intent.startsWith('travel_') || ['search_flights', 'search_trains', 'search_hotels', 'recommend_places'].includes(intent)) {
        return 'travel';
    }
    if (intent.startsWith('study_') || ['learning_path', 'exam_prep', 'skill_acquisition'].includes(intent)) {
        return 'study';
    }
    if (intent.startsWith('project_') || ['task_breakdown', 'team_assignment', 'project_progress'].includes(intent)) {
        return 'project';
    }
    if (intent.startsWith('event_') || ['venue_booking', 'budget_planning', 'timeline_setup', 'checklist_review'].includes(intent)) {
        return 'event';
    }
    if (intent.startsWith('life_') || ['goal_setting', 'habit_building', 'daily_routine', 'health_tracker', 'financial_planning'].includes(intent)) {
        return 'life';
    }
    return 'general';
}

/**
 * 简单意图检测（降级方案）
 */
function detectIntentSimple(input: string, _collectedData: CollectedData): UserIntent {
    const lower = input.toLowerCase();

    // Travel-related keywords
    if (lower.includes('旅游') || lower.includes('旅行') || lower.includes('想去')) {
        return 'travel_start';
    }

    // Transport search
    if (lower.includes('航班') || lower.includes('机票')) {
        return 'search_flights';
    }
    if (lower.includes('高铁') || lower.includes('火车')) {
        return 'search_trains';
    }

    // Hotels
    if (lower.includes('酒店') || lower.includes('住宿')) {
        return 'search_hotels';
    }

    // Places
    if (lower.includes('景点') || lower.includes('推荐') || lower.includes('玩什么')) {
        return 'recommend_places';
    }

    return 'unknown';
}

/**
 * 意图检测（智能版本 - 优先使用 LLM）
 */
export async function detectIntentAsync(
    input: string, 
    collectedData: CollectedData,
    sessionId?: string
): Promise<{
    intent: UserIntent;
    llmResult?: IntentResult;
}> {
    // 如果 LLM 可用，使用 LLM 进行意图识别
    if (llmEnabled) {
        try {
            const llmService = getLLMService();
            const llmResult = await llmService.detectIntent(input, sessionId);
            
            return {
                intent: mapIntentToUserIntent(llmResult.intent),
                llmResult,
            };
        } catch (error) {
            console.error('[AI Service] LLM intent detection failed, falling back:', error);
        }
    }

    // 降级到简单意图检测
    return {
        intent: detectIntentSimple(input, collectedData),
    };
}

// 保持原有的同步版本（用于兼容）
export function detectIntent(input: string, _collectedData: CollectedData): UserIntent {
    return detectIntentSimple(input, _collectedData);
}

// Extract destination from text
export function extractDestination(input: string): string | null {
    const destinations = [
        '北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '重庆',
        '南京', '武汉', '苏州', '三亚', '厦门', '青岛', '大连', '丽江',
        '东京', '巴黎', '纽约', '伦敦', '新加坡', '曼谷', '首尔', '迪拜'
    ];

    return destinations.find(d => input.includes(d)) || null;
}

/**
 * 生成 AI 响应（智能版本 - 使用 LLM）
 */
export async function generateResponseSmart(
    input: string,
    collectedData: CollectedData,
    sessionId: string = 'default'
): Promise<AIResponse[]> {
    // 如果 LLM 可用，使用智能回复
    if (llmEnabled) {
        try {
            const llmService = getLLMService();
            const { reply, intent } = await llmService.smartReply(input, sessionId);
            
            const responses: AIResponse[] = [
                { type: 'text', content: reply },
            ];

            // 根据意图添加对应的 widget
            const widget = generateWidgetForIntent(intent, collectedData);
            if (widget) {
                responses.push(widget);
            }

            return responses;
        } catch (error) {
            console.error('[AI Service] LLM response failed, falling back:', error);
        }
    }

    // 降级到原有逻辑
    return generateResponse(input, collectedData);
}

/**
 * 根据意图生成对应的 Widget
 */
function generateWidgetForIntent(
    intentResult: IntentResult, 
    collectedData: CollectedData
): AIResponse | null {
    const { intent, entities } = intentResult;

    switch (intent) {
        case 'travel_start':
        case 'travel_complete':
            if (!entities.origin) {
                return {
                    type: 'widget',
                    widgetType: 'text_input',
                    widgetPayload: {
                        placeholder: '例如：上海、北京...',
                        label: '出发城市',
                        icon: 'location',
                    },
                };
            }
            if (!entities.departureDate) {
                return {
                    type: 'widget',
                    widgetType: 'date_picker',
                    widgetPayload: {
                        label: '出发日期',
                        icon: 'calendar',
                    },
                };
            }
            return null;

        case 'search_flights':
            if (entities.origin && entities.destination) {
                const flights = getMockFlights(entities.origin, entities.destination);
                return {
                    type: 'widget',
                    widgetType: 'flight_search',
                    widgetPayload: { flights },
                };
            }
            return null;

        case 'search_trains':
            if (entities.origin && entities.destination) {
                const trains = getMockTrains(entities.origin, entities.destination);
                return {
                    type: 'widget',
                    widgetType: 'train_search',
                    widgetPayload: { trains },
                };
            }
            return null;

        case 'search_hotels':
            const dest = entities.destination || collectedData.destination;
            if (dest) {
                const hotels = getMockHotels(dest);
                return {
                    type: 'widget',
                    widgetType: 'hotel_search',
                    widgetPayload: { hotels },
                };
            }
            return null;

        case 'recommend_places':
            const placeDest = entities.destination || collectedData.destination;
            if (placeDest) {
                const attractions = getMockAttractions(placeDest);
                return {
                    type: 'widget',
                    widgetType: 'attraction_cards',
                    widgetPayload: { attractions },
                };
            }
            return null;

        default:
            return null;
    }
}

// Generate AI response based on intent and collected data (原有逻辑)
export async function generateResponse(
    input: string,
    collectedData: CollectedData
): Promise<AIResponse[]> {
    const intent = detectIntent(input, collectedData);
    const responses: AIResponse[] = [];

    switch (intent) {
        case 'travel_start': {
            const destination = extractDestination(input);
            if (destination) {
                responses.push({
                    type: 'text',
                    content: `太棒了！${destination} 是个令人向往的目的地。请告诉我，您将从哪里出发？`,
                });
                responses.push({
                    type: 'widget',
                    widgetType: 'text_input',
                    widgetPayload: {
                        placeholder: '例如：上海、北京...',
                        label: '出发城市',
                        icon: 'location',
                    },
                });
            } else {
                responses.push({
                    type: 'text',
                    content: '世界很大，你想从哪里开始探索？比如北京的历史，上海的繁华，或者巴黎的浪漫？',
                });
            }
            break;
        }

        case 'search_flights': {
            if (collectedData.origin && collectedData.destination) {
                const flights = getMockFlights(collectedData.origin, collectedData.destination);
                responses.push({
                    type: 'text',
                    content: `为您找到 ${flights.length} 个航班选项：`,
                });
            } else {
                responses.push({
                    type: 'text',
                    content: '请先告诉我您的出发地和目的地，我再为您搜索航班。',
                });
            }
            break;
        }

        case 'search_trains': {
            if (collectedData.origin && collectedData.destination) {
                const trains = getMockTrains(collectedData.origin, collectedData.destination);
                responses.push({
                    type: 'text',
                    content: `为您找到 ${trains.length} 趟高铁：`,
                });
            } else {
                responses.push({
                    type: 'text',
                    content: '请先告诉我您的出发地和目的地，我再为您搜索高铁。',
                });
            }
            break;
        }

        case 'search_hotels': {
            if (collectedData.destination) {
                const hotels = getMockHotels(collectedData.destination);
                responses.push({
                    type: 'text',
                    content: `在 ${collectedData.destination} 为您推荐 ${hotels.length} 家精选酒店：`,
                });
            } else {
                responses.push({
                    type: 'text',
                    content: '请先告诉我您要去哪座城市，我再为您推荐酒店。',
                });
            }
            break;
        }

        case 'recommend_places': {
            if (collectedData.destination) {
                getMockAttractions(collectedData.destination);
                responses.push({
                    type: 'text',
                    content: `${collectedData.destination} 有这些必去的地方：`,
                });
            } else {
                responses.push({
                    type: 'text',
                    content: '请先告诉我您要去哪座城市，我来推荐当地的精彩去处。',
                });
            }
            break;
        }

        default:
            responses.push({
                type: 'text',
                content: '无论是远方的旅行，还是特别的聚会，我都在这里为您规划。告诉我您的想法，例如"我想去北京旅游"。',
            });
    }

    return responses;
}

// Simulate API delay
export function simulateDelay(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 多领域工作流支持 ====================

/**
 * 根据意图和领域获取对应的 Widget（支持多领域）
 */
export function generateWidgetsForMultiDomain(
    intentResult: IntentResult,
    collectedData: CollectedData
): AIResponse[] {
    const { intent, entities, needsClarification, clarificationQuestion } = intentResult;
    const responses: AIResponse[] = [];

    // 如果需要澄清，先返回澄清问题
    if (needsClarification && clarificationQuestion) {
        responses.push({
            type: 'text',
            content: clarificationQuestion,
        });
    }

    // 启动工作流并获取当前阶段需要的 Widget
    const workflow = workflowEngine.startWorkflow(intentResult);
    if (workflow) {
        const widgets = workflowEngine.getCurrentWidgets(entities);
        for (const widgetType of widgets) {
            const widget = createWidgetForPhase(widgetType, intent, entities);
            if (widget) {
                responses.push(widget);
            }
        }
    }

    // 如果没有启动工作流，使用原有的 Widget 生成逻辑
    if (responses.length === 0 || !workflow) {
        const widget = generateWidgetForIntent(intentResult, collectedData);
        if (widget) {
            responses.push(widget);
        }
    }

    return responses;
}

/**
 * 根据阶段创建 Widget
 */
function createWidgetForPhase(
    widgetType: WidgetType,
    intent: IntentType,
    _entities: IntentResult['entities']
): AIResponse | null {
    const basePayload = {
        intent,
    };

    switch (widgetType) {
        // 文本输入
        case 'text_input':
            return {
                type: 'widget',
                widgetType: 'text_input',
                widgetPayload: {
                    ...basePayload,
                    label: getLabelForIntent(intent),
                    placeholder: getPlaceholderForIntent(intent),
                },
            };

        // 数字输入
        case 'number_input':
            return {
                type: 'widget',
                widgetType: 'number_input',
                widgetPayload: {
                    ...basePayload,
                    label: getNumberLabelForIntent(intent),
                    min: 1,
                    max: getMaxForIntent(intent),
                },
            };

        // 日期选择
        case 'date_picker':
            return {
                type: 'widget',
                widgetType: 'date_picker',
                widgetPayload: {
                    ...basePayload,
                    label: getDateLabelForIntent(intent),
                },
            };

        // 日期范围
        case 'date_range':
            return {
                type: 'widget',
                widgetType: 'date_range',
                widgetPayload: {
                    ...basePayload,
                    label: getDateRangeLabelForIntent(intent),
                },
            };

        // 预算滑块
        case 'budget_slider':
            return {
                type: 'widget',
                widgetType: 'budget_slider',
                widgetPayload: {
                    ...basePayload,
                    label: '预算范围',
                    min: 0,
                    max: 50000,
                    step: 100,
                },
            };

        // 单选卡片
        case 'radio_cards':
            return {
                type: 'widget',
                widgetType: 'radio_cards',
                widgetPayload: {
                    ...basePayload,
                    options: getRadioOptionsForIntent(intent),
                },
            };

        // 多选
        case 'multi_select':
            return {
                type: 'widget',
                widgetType: 'multi_select',
                widgetPayload: {
                    ...basePayload,
                    options: getMultiSelectOptionsForIntent(intent),
                },
            };

        default:
            return null;
    }
}

/**
 * 根据意图获取标签
 */
function getLabelForIntent(intent: IntentType): string {
    const labels: Record<string, string> = {
        // Travel
        destination: '想去哪里？',
        origin: '从哪里出发？',
        // Study
        subject: '想学习什么？',
        targetLevel: '目标是什么水平？',
        currentLevel: '目前是什么水平？',
        // Project
        projectName: '项目名称是？',
        projectType: '项目类型是？',
        // Event
        eventName: '活动名称是？',
        eventType: '是什么类型的活动？',
        // Life
        habitName: '想养成什么习惯？',
        habitCategory: '属于哪类习惯？',
    };
    return labels[intent] || '请输入';
}

/**
 * 根据意图获取占位符
 */
function getPlaceholderForIntent(intent: IntentType): string {
    const placeholders: Record<string, string> = {
        destination: '例如：北京、上海、三亚...',
        origin: '例如：上海、北京...',
        subject: '例如：编程、英语、游泳...',
        projectName: '例如：CRM系统、小程序...',
        eventName: '例如：生日派对、公司年会...',
        habitName: '例如：早起、每天运动、读书...',
    };
    return placeholders[intent] || '请输入...';
}

/**
 * 根据意图获取数字标签
 */
function getNumberLabelForIntent(intent: IntentType): string {
    const labels: Record<string, string> = {
        travelers: '出行人数',
        teamSize: '团队人数',
        expectedAttendees: '参与人数',
        availableTimePerDay: '每天学习时间（小时）',
    };
    return labels[intent] || '数量';
}

/**
 * 根据意图获取数字上限
 */
function getMaxForIntent(intent: IntentType): number {
    const maxValues: Record<string, number> = {
        travelers: 20,
        teamSize: 100,
        expectedAttendees: 1000,
        availableTimePerDay: 24,
    };
    return maxValues[intent] || 100;
}

/**
 * 根据意图获取日期标签
 */
function getDateLabelForIntent(intent: IntentType): string {
    const labels: Record<string, string> = {
        departureDate: '出发日期',
        returnDate: '返程日期',
        deadline: '截止日期',
        examDate: '考试日期',
        deadlineDate: '项目截止日期',
        eventDate: '活动日期',
    };
    return labels[intent] || '选择日期';
}

/**
 * 根据意图获取日期范围标签
 */
function getDateRangeLabelForIntent(_intent: IntentType): string {
    return '选择日期范围';
}

/**
 * 根据意图获取单选选项
 */
function getRadioOptionsForIntent(intent: IntentType): { id: string; label: string; description?: string }[] {
    const optionsMap: Record<string, { id: string; label: string; description?: string }[]> = {
        transportType: [
            { id: 'flight', label: '✈️ 飞机', description: '速度快，适合远途' },
            { id: 'train', label: '🚄 高铁', description: '舒适便捷，覆盖广' },
            { id: 'bus', label: '🚌 大巴', description: '经济实惠' },
            { id: 'car', label: '🚗 自驾', description: '灵活自由' },
        ],
        cabinClass: [
            { id: 'economy', label: '经济舱', description: '性价比高' },
            { id: 'business', label: '商务舱', description: '舒适宽敞' },
            { id: 'first', label: '头等舱', description: '顶级体验' },
        ],
        hotelStar: [
            { id: '3', label: '⭐⭐⭐ 经济型', description: '性价比高' },
            { id: '4', label: '⭐⭐⭐⭐ 舒适型', description: '品质不错' },
            { id: '5', label: '⭐⭐⭐⭐⭐ 豪华型', description: '顶级享受' },
        ],
        learningStyle: [
            { id: 'visual', label: '👁️ 视觉型', description: '喜欢看图、看视频' },
            { id: 'auditory', label: '👂 听觉型', description: '喜欢听讲、听音频' },
            { id: 'kinesthetic', label: '👐 动手型', description: '喜欢实践、动手操作' },
            { id: 'reading', label: '📖 阅读型', description: '喜欢看书、读文档' },
        ],
        frequency: [
            { id: 'daily', label: '每天', description: '每天坚持' },
            { id: 'weekly', label: '每周', description: '每周几次' },
            { id: 'monthly', label: '每月', description: '每月目标' },
        ],
        habitCategory: [
            { id: 'health', label: '💪 健康', description: '运动、饮食、睡眠' },
            { id: 'productivity', label: '⚡ 效率', description: '时间管理、任务管理' },
            { id: 'learning', label: '📚 学习', description: '阅读、课程、技能' },
            { id: 'social', label: '🤝 社交', description: '人际沟通、社交活动' },
            { id: 'financial', label: '💰 财务', description: '理财、储蓄、消费' },
        ],
    };
    return optionsMap[intent] || [];
}

/**
 * 根据意图获取多选选项
 */
function getMultiSelectOptionsForIntent(intent: IntentType): { id: string; label: string }[] {
    const optionsMap: Record<string, { id: string; label: string }[]> = {
        preferences: [
            { id: '美食', label: '🍜 美食' },
            { id: '自然风光', label: '🏔️ 自然风光' },
            { id: '人文历史', label: '🏛️ 人文历史' },
            { id: '购物', label: '🛍️ 购物' },
            { id: '夜生活', label: '🌙 夜生活' },
            { id: '亲子', label: '👨‍👩‍👧 亲子' },
        ],
        roles: [
            { id: '产品经理', label: '产品经理' },
            { id: '前端开发', label: '前端开发' },
            { id: '后端开发', label: '后端开发' },
            { id: '设计师', label: '设计师' },
            { id: '测试工程师', label: '测试工程师' },
            { id: '运维工程师', label: '运维工程师' },
        ],
        venueRequirements: [
            { id: '室内', label: '室内' },
            { id: '室外', label: '室外' },
            { id: '投影设备', label: '投影设备' },
            { id: '音响设备', label: '音响设备' },
            { id: '停车位', label: '停车位' },
            { id: '无障碍设施', label: '无障碍设施' },
        ],
    };
    return optionsMap[intent] || [];
}

// 导出 LLM 相关类型和函数
export type { IntentResult, LLMConfig, PlanningDomain } from './llm';
