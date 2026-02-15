// LLM Types - LLM 相关类型定义

/**
 * 支持的 LLM 提供商
 */
export type LLMProvider = 'openai' | 'claude' | 'ollama';

/**
 * LLM 配置
 */
export interface LLMConfig {
    provider: LLMProvider;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

/**
 * 消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * 聊天消息
 */
export interface ChatMessage {
    role: MessageRole;
    content: string;
}

/**
 * 意图类型 - 支持多领域规划
 */
export type IntentType =
    // Travel - 旅行相关
    | 'travel_start'      // 开始旅行规划
    | 'travel_complete'   // 完整旅行请求
    | 'search_flights'    // 搜索航班
    | 'search_trains'     // 搜索高铁/火车
    | 'search_hotels'     // 搜索酒店
    | 'recommend_places'  // 景点推荐
    | 'travel_itinerary'  // 生成行程
    | 'trip_modify'       // 修改行程

    // Study - 学习相关
    | 'study_plan'        // 开始学习计划
    | 'study_schedule'    // 考试/课程安排
    | 'learning_path'     // 学习路线规划
    | 'exam_prep'         // 考试准备
    | 'skill_acquisition' // 技能学习

    // Project - 项目管理相关
    | 'project_kickoff'    // 项目启动
    | 'project_milestone'  // 里程碑管理
    | 'task_breakdown'     // 任务分解
    | 'team_assignment'    // 团队分配
    | 'project_progress'   // 进度追踪

    // Event - 活动筹备相关
    | 'event_planning'    // 活动筹备
    | 'venue_booking'      // 场地预订
    | 'budget_planning'   // 预算规划
    | 'timeline_setup'    // 时间线设置
    | 'checklist_review'  // 检查清单

    // Life - 生活目标相关
    | 'goal_setting'       // 目标设定
    | 'habit_building'     // 习惯养成
    | 'daily_routine'      // 日常安排
    | 'health_tracker'     // 健康追踪
    | 'financial_planning' // 财务规划

    // General - 通用
    | 'ask_weather'       // 询问天气
    | 'ask_budget'        // 预算咨询
    | 'modify_plan'       // 修改计划
    | 'greeting'          // 问候
    | 'unknown';          // 未知意图

/**
 * 规划领域类型
 */
export type PlanningDomain = 'travel' | 'study' | 'project' | 'event' | 'life' | 'general';

/**
 * 提取的实体 - 支持多领域
 */
export interface ExtractedEntities {
    // ===== 通用实体 =====
    domain?: PlanningDomain;      // 规划领域
    goal?: string;               // 目标描述

    // ===== 旅行相关 =====
    origin?: string;             // 出发地
    destination?: string;        // 目的地
    departureDate?: string;      // 出发日期
    returnDate?: string;         // 返回日期
    dateRange?: {
        start: string;
        end: string;
    };
    travelers?: number;          // 旅行人数
    adults?: number;            // 成人数
    children?: number;          // 儿童数
    budget?: number;             // 预算金额
    budgetCurrency?: string;    // 货币单位
    transportType?: 'flight' | 'train' | 'bus' | 'car';
    cabinClass?: 'economy' | 'business' | 'first';
    hotelStar?: number;          // 酒店星级
    roomType?: string;          // 房间类型

    // ===== 学习相关 =====
    subject?: string;            // 学习科目
    targetLevel?: string;        // 目标水平
    currentLevel?: string;       // 当前水平
    deadline?: string;          // 截止日期
    studyDuration?: string;     // 学习时长
    availableTimePerDay?: number; // 每天可用时间(小时)
    learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
    examDate?: string;          // 考试日期
    certification?: string;     // 目标证书
    resources?: string[];       // 可用资源

    // ===== 项目管理相关 =====
    projectName?: string;       // 项目名称
    projectType?: string;       // 项目类型
    teamSize?: number;         // 团队规模
    roles?: string[];           // 角色分工
    milestones?: Milestone[];   // 里程碑
    deliverables?: string[];   // 交付物
    deadlineDate?: string;      // 截止日期
    projectBudget?: number;    // 项目预算
    dependencies?: string[];   // 依赖关系
    risks?: string[];          // 风险因素

    // ===== 活动筹备相关 =====
    eventType?: string;        // 活动类型
    eventName?: string;        // 活动名称
    expectedAttendees?: number; // 预期参与人数
    venueRequirements?: string[]; // 场地要求
    eventDate?: string;        // 活动日期
    eventDuration?: string;    // 活动时长
    eventBudget?: number;      // 活动预算
    equipment?: string[];      // 设备需求
    catering?: boolean;        // 是否需要餐饮

    // ===== 生活目标相关 =====
    habitName?: string;         // 习惯名称
    habitCategory?: 'health' | 'productivity' | 'learning' | 'social' | 'financial' | 'other';
    frequency?: string;         // 频率 (每天/每周)
    trigger?: string;           // 触发条件
    reward?: string;           // 奖励机制
    duration?: string;         // 持续时间
    targetMetric?: string;     // 目标指标
    currentMetric?: string;    // 当前指标

    // ===== 通用偏好 =====
    preferences?: string[];    // 用户偏好
    specialRequests?: string;  // 特殊要求
    notes?: string;            // 备注
}

/**
 * 里程碑定义
 */
export interface Milestone {
    name: string;
    description?: string;
    dueDate?: string;
    status?: 'pending' | 'in_progress' | 'completed';
    tasks?: string[];
    owner?: string;
}

/**
 * 意图识别结果
 */
export interface IntentResult {
    intent: IntentType;
    confidence: number;        // 置信度 0-1
    entities: ExtractedEntities;
    subIntents?: IntentType[]; // 子意图
    reasoning?: string;        // 推理过程（可选，用于调试）
    needsClarification?: boolean;  // 是否需要澄清
    clarificationQuestion?: string; // 澄清问题
}

/**
 * 对话上下文
 */
export interface ConversationContext {
    sessionId: string;
    messages: ChatMessage[];
    collectedData: Record<string, unknown>;
    lastIntent?: IntentType;
    lastEntities?: ExtractedEntities;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * LLM 响应
 */
export interface LLMResponse {
    success: boolean;
    content?: string;
    intent?: IntentResult;
    error?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
