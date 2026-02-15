/**
 * Chat Adapter - 聊天适配器
 * 
 * 将新的 LLM 意图识别路由系统与现有的 planningStore 集成
 * 提供平滑的迁移路径
 */

import { getIntentRecognizer, type IntentType, type Entities, type IntentResult } from '../router/intentRouter';
import { getSmartRouter, type RouteResult } from '../router/smartRouter';
import { isLLMConfigured } from './llm';
import type { PlanDomain } from './llmService';

// ==================== 类型映射 ====================

/**
 * 将新的 IntentType 映射到旧的 intent 字符串
 */
export function mapIntentToLegacy(intent: IntentType): string {
    const mapping: Record<IntentType, string> = {
        travel: 'travel',
        hotel: 'hotel',
        flight: 'flight',
        train: 'train',
        attraction: 'attraction',
        restaurant: 'restaurant',
        map: 'map',
        plan: 'plan_itinerary',
        weather: 'weather',
        chat: 'chat',
        help: 'help',
        unknown: 'unknown',
    };
    return mapping[intent] || 'unknown';
}

/**
 * 将新的 IntentType 映射到 PlanDomain
 */
export function mapIntentToDomain(intent: IntentType): PlanDomain {
    const mapping: Record<IntentType, PlanDomain> = {
        travel: 'travel',
        hotel: 'travel',
        flight: 'travel',
        train: 'travel',
        attraction: 'travel',
        restaurant: 'travel',
        map: 'travel',
        plan: 'other',
        weather: 'travel',
        chat: 'other',
        help: 'other',
        unknown: 'other',
    };
    return mapping[intent] || 'other';
}

/**
 * 从 IntentResult 提取旧格式数据
 */
export function extractLegacyData(result: IntentResult): {
    intent: string;
    action: string;
    destination?: string;
    origin?: string;
    dates?: { start: string; end: string };
    transportMode?: string;
    budget?: number;
    travelers?: number;
} {
    const { intent, action, entities } = result;
    
    return {
        intent: mapIntentToLegacy(intent),
        action,
        destination: entities.destination,
        origin: entities.origin,
        dates: entities.dates,
        transportMode: entities.transportMode,
        budget: entities.budget,
        travelers: entities.travelers,
    };
}

// ==================== 智能意图处理器 ====================

export interface ProcessResult {
    intent: IntentType;
    action: string;
    entities: Entities;
    response: string;
    widget?: RouteResult['widget'];
    needsMoreInfo: boolean;
    clarificationQuestion?: string;
}

/**
 * 智能意图处理器
 * 
 * 结合 LLM 意图识别和本地规则，提供统一的意图处理接口
 */
export class SmartIntentProcessor {
    private recognizer = getIntentRecognizer();
    private router = getSmartRouter();

    /**
     * 处理用户输入
     */
    async process(userInput: string): Promise<ProcessResult> {
        // 1. 使用 LLM 进行意图识别
        const intentResult = await this.recognizer.recognize(userInput);
        
        // 2. 更新上下文
        this.recognizer.updateContext('user', userInput, intentResult.intent, intentResult.entities);

        // 3. 路由处理
        const routeResult = await this.router.route(intentResult);

        // 4. 更新路由上下文
        this.router.addHistory('user', userInput);
        this.router.addHistory('assistant', routeResult.response);

        return {
            intent: intentResult.intent,
            action: intentResult.action,
            entities: {
                ...intentResult.entities,
                ...routeResult.updatedEntities,
            },
            response: routeResult.response,
            widget: routeResult.widget,
            needsMoreInfo: intentResult.needsClarification || false,
            clarificationQuestion: intentResult.clarificationQuestion,
        };
    }

    /**
     * 获取当前收集的实体
     */
    getCollectedEntities(): Entities {
        return this.recognizer.getContext().currentState.collectedEntities;
    }

    /**
     * 获取当前意图
     */
    getCurrentIntent(): IntentType | null {
        return this.recognizer.getContext().currentState.activeIntent || null;
    }

    /**
     * 手动更新实体
     */
    updateEntities(entities: Partial<Entities>) {
        this.recognizer.getContext().currentState.collectedEntities = {
            ...this.recognizer.getContext().currentState.collectedEntities,
            ...entities,
        };
        this.router.updateEntities(entities);
    }

    /**
     * 清除上下文
     */
    clearContext() {
        this.recognizer.clearContext();
        this.router.clearContext();
    }

    /**
     * 检查 LLM 是否可用
     */
    isLLMReady(): boolean {
        return isLLMConfigured();
    }
}

// ==================== 全局实例 ====================

let globalProcessor: SmartIntentProcessor | null = null;

export function getSmartIntentProcessor(): SmartIntentProcessor {
    if (!globalProcessor) {
        globalProcessor = new SmartIntentProcessor();
    }
    return globalProcessor;
}

export function resetSmartIntentProcessor(): void {
    if (globalProcessor) {
        globalProcessor.clearContext();
    }
    globalProcessor = new SmartIntentProcessor();
}

// ==================== 便捷函数 ====================

/**
 * 快速处理用户输入
 */
export async function processUserInputSmart(userInput: string): Promise<ProcessResult> {
    const processor = getSmartIntentProcessor();
    return processor.process(userInput);
}

/**
 * 获取当前收集的数据
 */
export function getCollectedData(): Entities {
    return getSmartIntentProcessor().getCollectedEntities();
}

/**
 * 更新收集的数据
 */
export function updateCollectedData(entities: Partial<Entities>): void {
    getSmartIntentProcessor().updateEntities(entities);
}

export default SmartIntentProcessor;
