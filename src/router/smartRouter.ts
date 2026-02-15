// Smart Router - 智能路由处理器
// 根据意图识别结果，分发到对应的处理逻辑

import type { IntentResult, IntentType, Entities } from './intentRouter';

/**
 * 路由处理结果
 */
export interface RouteResult {
    success: boolean;
    response: string;
    widget?: {
        type: string;
        payload: Record<string, unknown>;
    };
    nextAction?: {
        type: 'ask' | 'widget' | 'redirect';
        data?: unknown;
    };
    updatedEntities?: Partial<Entities>;
}

/**
 * 路由处理器函数类型
 */
export type RouteHandler = (
    intent: IntentResult,
    context: RouteContext
) => Promise<RouteResult>;

/**
 * 路由上下文
 */
export interface RouteContext {
    sessionId: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    collectedEntities: Entities;
    previousIntent?: IntentType;
}

/**
 * 意图到处理器的映射
 */
const routeHandlers: Partial<Record<IntentType, RouteHandler>> = {};

/**
 * 注册路由处理器
 */
export function registerHandler(intent: IntentType, handler: RouteHandler) {
    routeHandlers[intent] = handler;
}

/**
 * 智能路由器
 */
export class SmartRouter {
    private context: RouteContext;

    constructor(sessionId: string = 'default') {
        this.context = {
            sessionId,
            history: [],
            collectedEntities: {},
        };
    }

    /**
     * 处理意图识别结果
     */
    async route(intentResult: IntentResult): Promise<RouteResult> {
        const { intent, entities } = intentResult;

        // 更新上下文
        this.context.collectedEntities = { ...this.context.collectedEntities, ...entities };
        this.context.previousIntent = intent;

        // 查找处理器
        const handler = routeHandlers[intent];

        if (handler) {
            return handler(intentResult, this.context);
        }

        // 默认处理
        return this.defaultHandler(intentResult);
    }

    /**
     * 默认处理器
     */
    private async defaultHandler(result: IntentResult): Promise<RouteResult> {
        const { suggestedResponse, needsClarification, clarificationQuestion } = result;

        // 如果需要澄清
        if (needsClarification && clarificationQuestion) {
            return {
                success: true,
                response: clarificationQuestion,
                nextAction: {
                    type: 'ask',
                    data: { question: clarificationQuestion },
                },
            };
        }

        // 使用建议回复
        if (suggestedResponse) {
            return {
                success: true,
                response: suggestedResponse,
            };
        }

        // 未知意图
        return {
            success: false,
            response: '抱歉，我不太理解您的意思。您可以告诉我您想去哪里旅游，或者需要什么帮助？',
        };
    }

    /**
     * 添加对话历史
     */
    addHistory(role: 'user' | 'assistant', content: string) {
        this.context.history.push({ role, content });
    }

    /**
     * 获取上下文
     */
    getContext(): RouteContext {
        return { ...this.context };
    }

    /**
     * 更新实体
     */
    updateEntities(entities: Partial<Entities>) {
        this.context.collectedEntities = { ...this.context.collectedEntities, ...entities };
    }

    /**
     * 清除上下文
     */
    clearContext() {
        this.context = {
            sessionId: this.context.sessionId,
            history: [],
            collectedEntities: {},
        };
    }
}

// ==================== 内置处理器 ====================

/**
 * 旅行意图处理器
 */
registerHandler('travel', async (result, _context) => {
    const { entities } = result;
    const { destination } = entities;

    if (destination) {
        return {
            success: true,
            response: `太棒了！**${destination}** 是个令人向往的目的地。🌍\n\n请告诉我，您将从哪里出发？`,
            widget: {
                type: 'text_input',
                payload: {
                    placeholder: '输入出发城市...',
                    label: '出发城市',
                    icon: 'location',
                },
            },
            updatedEntities: { destination },
        };
    }

    return {
        success: true,
        response: '🌍 世界很大，你想去哪里探索？\n\n你可以告诉我任何城市，比如：\n• 国内：北京、成都、丽江、拉萨...\n• 国际：东京、巴黎、纽约、悉尼...',
    };
});

/**
 * 酒店意图处理器
 */
registerHandler('hotel', async (result, context) => {
    const { entities } = result;
    const destination = entities.destination || context.collectedEntities.destination;

    if (!destination) {
        return {
            success: true,
            response: '请问您想查询**哪个城市**的酒店？🏨',
        };
    }

    return {
        success: true,
        response: `让我们为您在 **${destination}** 找一家合适的酒店吧！`,
        widget: {
            type: 'hotel_search_advanced',
            payload: { city: destination },
        },
    };
});

/**
 * 航班意图处理器
 */
registerHandler('flight', async (result, context) => {
    const { entities } = result;
    const { origin, destination, dates } = entities;
    const collected = context.collectedEntities;

    const effectiveOrigin = origin || collected.origin;
    const effectiveDest = destination || collected.destination;
    const effectiveDates = dates || collected.dates;

    if (!effectiveOrigin) {
        return {
            success: true,
            response: '请问您将**从哪里出发**？',
            widget: {
                type: 'text_input',
                payload: {
                    placeholder: '输入出发城市...',
                    label: '出发城市',
                    icon: 'location',
                },
            },
        };
    }

    if (!effectiveDest) {
        return {
            success: true,
            response: '请问您想**去哪里**？',
        };
    }

    if (!effectiveDates) {
        return {
            success: true,
            response: `了解，从 **${effectiveOrigin}** 飞 **${effectiveDest}**。🗓️\n\n请选择您的**出行日期**。`,
            widget: {
                type: 'date_range',
                payload: {
                    minDate: new Date().toISOString().split('T')[0],
                },
            },
        };
    }

    return {
        success: true,
        response: `正在搜索 ${effectiveOrigin} → ${effectiveDest} 的航班...`,
        widget: {
            type: 'flight_results',
            payload: {
                origin: effectiveOrigin,
                destination: effectiveDest,
                date: effectiveDates.start,
            },
        },
    };
});

/**
 * 高铁意图处理器
 */
registerHandler('train', async (result, context) => {
    const { entities } = result;
    const { origin, destination, dates } = entities;
    const collected = context.collectedEntities;

    const effectiveOrigin = origin || collected.origin;
    const effectiveDest = destination || collected.destination;
    const effectiveDates = dates || collected.dates;

    if (!effectiveOrigin) {
        return {
            success: true,
            response: '请问您将**从哪里出发**？',
            widget: {
                type: 'text_input',
                payload: {
                    placeholder: '输入出发城市...',
                    label: '出发城市',
                    icon: 'location',
                },
            },
        };
    }

    if (!effectiveDest) {
        return {
            success: true,
            response: '请问您想**去哪里**？',
        };
    }

    if (!effectiveDates) {
        return {
            success: true,
            response: `了解，从 **${effectiveOrigin}** 去 **${effectiveDest}**。🗓️\n\n请选择您的**出行日期**。`,
            widget: {
                type: 'date_range',
                payload: {
                    minDate: new Date().toISOString().split('T')[0],
                },
            },
        };
    }

    return {
        success: true,
        response: `正在为您查询从 ${effectiveOrigin} 到 ${effectiveDest} 的列车... 🚄`,
        widget: {
            type: 'train_tickets',
            payload: {
                origin: effectiveOrigin,
                destination: effectiveDest,
                date: effectiveDates.start,
            },
        },
    };
});

/**
 * 景点意图处理器
 */
registerHandler('attraction', async (result, context) => {
    const { entities } = result;
    const destination = entities.destination || context.collectedEntities.destination;

    if (!destination) {
        return {
            success: true,
            response: '请问您想查看**哪个城市**的景点？🏞️',
        };
    }

    return {
        success: true,
        response: `${destination} 有这些必去的地方：`,
        widget: {
            type: 'attraction_cards',
            payload: {
                city: destination,
                title: `${destination} 景点`,
            },
        },
    };
});

/**
 * 地图意图处理器
 */
registerHandler('map', async (result, context) => {
    const { entities } = result;
    const destination = entities.destination || context.collectedEntities.destination;

    if (!destination) {
        return {
            success: true,
            response: '请问您想查看**哪个城市**的地图？🗺️',
        };
    }

    return {
        success: true,
        response: `正在加载 ${destination} 的地图...`,
        widget: {
            type: 'map_view',
            payload: {
                city: destination,
                zoom: 12,
                title: `${destination} 地图`,
            },
        },
    };
});

/**
 * 闲聊意图处理器
 */
registerHandler('chat', async (result, context) => {
    const greetings = [
        '你好！有什么我可以帮助您的吗？😊',
        '嗨！我是 Aether Plan，您的智能规划助手。有什么想规划的吗？',
        '您好！我可以帮您规划旅行、搜索酒店、查询航班高铁等。您想做什么？',
    ];

    return {
        success: true,
        response: greetings[Math.floor(Math.random() * greetings.length)],
    };
});

/**
 * 帮助意图处理器
 */
registerHandler('help', async (result, context) => {
    return {
        success: true,
        response: `我可以帮您做很多事情：

🌍 **旅行规划**
- 搜索机票、高铁
- 查找酒店
- 推荐景点

📝 **计划制定**
- 学习计划
- 项目规划
- 活动筹备
- 生活目标

您可以这样问我：
- "我想去三亚旅游"
- "帮我查北京到上海的机票"
- "推荐一下成都的美食"
- "制定一个英语学习计划"`,
    };
});

// ==================== 全局实例 ====================

let globalRouter: SmartRouter | null = null;

export function getSmartRouter(sessionId?: string): SmartRouter {
    if (!globalRouter || (sessionId && globalRouter.getContext().sessionId !== sessionId)) {
        globalRouter = new SmartRouter(sessionId || 'default');
    }
    return globalRouter;
}
