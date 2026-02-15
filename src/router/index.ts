/**
 * 智能路由系统 - 统一导出
 * 
 * 完全基于 LLM 意图识别的路由系统
 */

// 意图识别器
export {
    IntentRecognizer,
    getIntentRecognizer,
    type IntentType,
    type ActionType,
    type Entities,
    type IntentResult,
    type RouteConfig,
    type ConversationContext,
    type PlanDomain,
} from './intentRouter';

// 智能路由器
export {
    SmartRouter,
    getSmartRouter,
    registerHandler,
    type RouteResult,
    type RouteContext,
    type RouteHandler,
} from './smartRouter';
