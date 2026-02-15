// Workflow Engine - 智能工作流引擎
// 支持多领域的规划工作流

import type { IntentType, ExtractedEntities, PlanningDomain, IntentResult } from '../llm/types';
import type { WidgetType } from '../../types/message';

/**
 * 工作流阶段
 */
export interface WorkflowPhase {
    id: string;
    name: string;
    description: string;
    requiredSlots: string[];      // 该阶段需要的必填信息
    optionalSlots: string[];      // 该阶段的可选信息
    widgets: WidgetType[];        // 该阶段展示的 Widget
    nextPhase?: string;          // 下一阶段 ID
    isComplete?: (entities: ExtractedEntities) => boolean;  // 阶段完成条件
}

/**
 * 工作流定义
 */
export interface WorkflowDefinition {
    domain: PlanningDomain;
    name: string;
    description: string;
    startPhase: string;           // 起始阶段 ID
    phases: Record<string, WorkflowPhase>;
    generatePlan: (entities: ExtractedEntities) => Promise<PlanOutput>;
}

/**
 * 规划输出
 */
export interface PlanOutput {
    title: string;
    summary: string;
    sections: PlanSection[];
    widgets: WidgetOutput[];
    recommendations?: string[];
}

export interface PlanSection {
    title: string;
    content: string;
    items?: string[];
}

export interface WidgetOutput {
    widgetType: WidgetType;
    payload: Record<string, unknown>;
}

/**
 * 当前工作流状态
 */
export interface WorkflowState {
    currentPhaseId: string;
    completedPhases: string[];
    pendingWidgets: WidgetType[];
    isComplete: boolean;
}

/**
 * 工作流引擎
 */
export class WorkflowEngine {
    private workflows: Map<PlanningDomain, WorkflowDefinition> = new Map();
    private currentWorkflow: WorkflowDefinition | null = null;
    private state: WorkflowState | null = null;

    constructor() {
        this.registerDefaultWorkflows();
    }

    /**
     * 注册默认工作流
     */
    private registerDefaultWorkflows(): void {
        // 注册旅行工作流
        this.workflows.set('travel', this.createTravelWorkflow());
        // 注册学习工作流
        this.workflows.set('study', this.createStudyWorkflow());
        // 注册项目管理工作流
        this.workflows.set('project', this.createProjectWorkflow());
        // 注册活动筹备工作流
        this.workflows.set('event', this.createEventWorkflow());
        // 注册生活目标工作流
        this.workflows.set('life', this.createLifeWorkflow());
    }

    /**
     * 根据领域获取工作流
     */
    getWorkflow(domain: PlanningDomain): WorkflowDefinition | undefined {
        return this.workflows.get(domain);
    }

    /**
     * 根据意图启动工作流
     */
    startWorkflow(intent: IntentResult): WorkflowDefinition | null {
        const domain = intent.entities.domain || this.inferDomain(intent.intent);
        const workflow = this.workflows.get(domain);

        if (!workflow) {
            console.warn(`[WorkflowEngine] No workflow found for domain: ${domain}`);
            return null;
        }

        this.currentWorkflow = workflow;
        this.state = {
            currentPhaseId: workflow.startPhase,
            completedPhases: [],
            pendingWidgets: [],
            isComplete: false,
        };

        return workflow;
    }

    /**
     * 从意图推断领域
     */
    private inferDomain(intent: IntentType): PlanningDomain {
        if (intent.startsWith('travel_') || ['search_flights', 'search_trains', 'search_hotels', 'recommend_places'].includes(intent)) {
            return 'travel';
        }
        if (intent.startsWith('study_') || intent === 'learning_path' || intent === 'exam_prep' || intent === 'skill_acquisition') {
            return 'study';
        }
        if (intent.startsWith('project_') || intent === 'task_breakdown' || intent === 'team_assignment' || intent === 'project_progress') {
            return 'project';
        }
        if (intent.startsWith('event_') || intent === 'venue_booking' || intent === 'budget_planning' || intent === 'timeline_setup' || intent === 'checklist_review') {
            return 'event';
        }
        if (intent.startsWith('life_') || intent === 'goal_setting' || intent === 'habit_building' || intent === 'daily_routine' || intent === 'health_tracker' || intent === 'financial_planning') {
            return 'life';
        }
        return 'general';
    }

    /**
     * 获取当前阶段的 Widget
     */
    getCurrentWidgets(entities: ExtractedEntities): WidgetType[] {
        if (!this.currentWorkflow || !this.state) {
            return [];
        }

        const currentPhase = this.currentWorkflow.phases[this.state.currentPhaseId];
        if (!currentPhase) {
            return [];
        }

        // 检查必填信息是否完整
        const missingRequired = currentPhase.requiredSlots.filter(
            slot => !this.isSlotFilled(slot, entities)
        );

        // 如果有缺失的信息，返回对应的输入 Widget
        return this.getWidgetsForMissingSlots(missingRequired, entities);
    }

    /**
     * 检查槽位是否已填充
     */
    private isSlotFilled(slot: string, entities: ExtractedEntities): boolean {
        const value = entities[slot as keyof ExtractedEntities];
        return value !== undefined && value !== null && value !== '';
    }

    /**
     * 根据缺失的槽位获取对应的 Widget
     */
    private getWidgetsForMissingSlots(missingSlots: string[], entities: ExtractedEntities): WidgetType[] {
        const widgets: WidgetType[] = [];

        for (const slot of missingSlots) {
            const widget = this.mapSlotToWidget(slot, entities);
            if (widget) {
                widgets.push(widget);
            }
        }

        return widgets;
    }

    /**
     * 槽位映射到 Widget
     */
    private mapSlotToWidget(slot: string, entities: ExtractedEntities): WidgetType | null {
        const domain = entities.domain;

        // 根据领域和槽位返回合适的 Widget
        switch (slot) {
            // 通用
            case 'goal':
            case 'subject':
            case 'projectName':
            case 'eventName':
            case 'habitName':
                return 'text_input';

            // 旅行相关
            case 'origin':
            case 'destination':
                return 'location_input';
            case 'departureDate':
            case 'returnDate':
            case 'dateRange':
            case 'deadline':
            case 'examDate':
                return 'date_picker';
            case 'travelers':
            case 'teamSize':
            case 'expectedAttendees':
                return 'number_input';
            case 'budget':
            case 'projectBudget':
            case 'eventBudget':
                return 'budget_slider';
            case 'transportType':
                return domain === 'travel' ? 'radio_cards' : null;
            case 'hotelStar':
                return 'radio_cards';
            case 'preferences':
                return 'multi_select';

            // 学习相关
            case 'targetLevel':
            case 'currentLevel':
            case 'learningStyle':
                return 'radio_cards';
            case 'availableTimePerDay':
                return 'number_input';
            case 'studyDuration':
            case 'duration':
                return 'text_input';

            // 项目管理相关
            case 'roles':
            case 'deliverables':
            case 'milestones':
                return 'textarea';
            case 'deadlineDate':
                return 'date_picker';

            // 活动相关
            case 'eventType':
            case 'eventDuration':
                return 'radio_cards';
            case 'venueRequirements':
            case 'equipment':
                return 'multi_select';
            case 'catering':
                return 'radio_cards';

            // 生活相关
            case 'habitCategory':
            case 'frequency':
                return 'radio_cards';
            case 'trigger':
            case 'reward':
            case 'targetMetric':
            case 'currentMetric':
                return 'text_input';

            default:
                return null;
        }
    }

    /**
     * 检查工作流是否完成
     */
    isComplete(): boolean {
        return this.state?.isComplete ?? false;
    }

    /**
     * 获取当前状态
     */
    getState(): WorkflowState | null {
        return this.state;
    }

    /**
     * 推进到下一阶段
     */
    advancePhase(entities: ExtractedEntities): void {
        if (!this.currentWorkflow || !this.state) return;

        const currentPhase = this.currentWorkflow.phases[this.state.currentPhaseId];
        if (!currentPhase) return;

        // 检查当前阶段是否完成
        if (currentPhase.isComplete && currentPhase.isComplete(entities)) {
            this.state.completedPhases.push(this.state.currentPhaseId);

            // 移动到下一阶段
            if (currentPhase.nextPhase) {
                this.state.currentPhaseId = currentPhase.nextPhase;
            } else {
                this.state.isComplete = true;
            }
        }
    }

    /**
     * 生成规划输出
     */
    async generatePlan(entities: ExtractedEntities): Promise<PlanOutput | null> {
        if (!this.currentWorkflow) {
            return null;
        }

        return this.currentWorkflow.generatePlan(entities);
    }

    // ==================== 创建各领域工作流 ====================

    /**
     * 创建旅行工作流
     */
    private createTravelWorkflow(): WorkflowDefinition {
        return {
            domain: 'travel',
            name: '旅行规划工作流',
            description: '完整的旅行规划流程，从目的地选择到行程生成',
            startPhase: 'destination',
            phases: {
                destination: {
                    id: 'destination',
                    name: '确定目的地',
                    description: '了解用户的旅行目的地',
                    requiredSlots: ['destination'],
                    optionalSlots: ['preferences'],
                    widgets: ['location_input'],
                    nextPhase: 'dates',
                },
                dates: {
                    id: 'dates',
                    name: '确定出行日期',
                    description: '确定出发日期和返程日期',
                    requiredSlots: ['departureDate'],
                    optionalSlots: ['returnDate', 'dateRange'],
                    widgets: ['date_range'],
                    nextPhase: 'travelers',
                },
                travelers: {
                    id: 'travelers',
                    name: '确定出行人员',
                    description: '确定旅行人数和关系',
                    requiredSlots: ['travelers'],
                    optionalSlots: ['adults', 'children'],
                    widgets: ['number_input'],
                    nextPhase: 'transport',
                },
                transport: {
                    id: 'transport',
                    name: '选择交通方式',
                    description: '选择航班、高铁或其他交通方式',
                    requiredSlots: ['transportType'],
                    optionalSlots: ['cabinClass', 'origin'],
                    widgets: ['radio_cards'],
                    nextPhase: 'budget',
                },
                budget: {
                    id: 'budget',
                    name: '设定预算',
                    description: '确定旅行预算范围',
                    requiredSlots: ['budget'],
                    optionalSlots: ['budgetCurrency'],
                    widgets: ['budget_slider'],
                    nextPhase: 'accommodation',
                },
                accommodation: {
                    id: 'accommodation',
                    name: '选择住宿',
                    description: '选择酒店类型和星级',
                    requiredSlots: [],
                    optionalSlots: ['hotelStar', 'roomType'],
                    widgets: ['radio_cards'],
                    nextPhase: 'complete',
                },
                complete: {
                    id: 'complete',
                    name: '生成行程',
                    description: '生成完整的旅行计划',
                    requiredSlots: [],
                    optionalSlots: [],
                    widgets: [],
                    isComplete: () => true,
                },
            },
            generatePlan: async (entities) => {
                return {
                    title: `${entities.destination} 旅行计划`,
                    summary: `为期 ${entities.dateRange?.end ? Math.ceil((new Date(entities.dateRange.end).getTime() - new Date(entities.dateRange.start).getTime()) / (1000 * 60 * 60 * 24)) : 3} 天的 ${entities.destination} 之旅`,
                    sections: [
                        {
                            title: '行程概览',
                            content: `目的地：${entities.destination}\n出行日期：${entities.departureDate} - ${entities.returnDate}\n出行人数：${entities.travelers}人\n预算：${entities.budget}元`,
                        },
                    ],
                    widgets: [
                        { widgetType: 'flight_search', payload: { origin: entities.origin, destination: entities.destination } },
                        { widgetType: 'hotel_search', payload: { destination: entities.destination } },
                        { widgetType: 'attraction_cards', payload: { destination: entities.destination } },
                    ],
                };
            },
        };
    }

    /**
     * 创建学习工作流
     */
    private createStudyWorkflow(): WorkflowDefinition {
        return {
            domain: 'study',
            name: '学习规划工作流',
            description: '从学习目标设定到学习路径规划',
            startPhase: 'goal',
            phases: {
                goal: {
                    id: 'goal',
                    name: '确定学习目标',
                    description: '了解用户想要学习的内容',
                    requiredSlots: ['subject'],
                    optionalSlots: ['targetLevel', 'certification'],
                    widgets: ['text_input'],
                    nextPhase: 'current',
                },
                current: {
                    id: 'current',
                    name: '了解当前水平',
                    description: '了解用户当前的知识水平',
                    requiredSlots: ['currentLevel'],
                    optionalSlots: ['learningStyle'],
                    widgets: ['radio_cards'],
                    nextPhase: 'timeline',
                },
                timeline: {
                    id: 'timeline',
                    name: '确定学习时间',
                    description: '确定学习时长和截止日期',
                    requiredSlots: ['studyDuration'],
                    optionalSlots: ['deadline', 'examDate', 'availableTimePerDay'],
                    widgets: ['date_picker', 'number_input'],
                    nextPhase: 'resources',
                },
                resources: {
                    id: 'resources',
                    name: '准备学习资源',
                    description: '确定可用的学习资源',
                    requiredSlots: [],
                    optionalSlots: ['resources'],
                    widgets: ['multi_select'],
                    nextPhase: 'complete',
                },
                complete: {
                    id: 'complete',
                    name: '生成学习计划',
                    description: '生成完整的学习计划',
                    requiredSlots: [],
                    optionalSlots: [],
                    widgets: [],
                    isComplete: () => true,
                },
            },
            generatePlan: async (entities) => {
                return {
                    title: `${entities.subject} 学习计划`,
                    summary: `在 ${entities.studyDuration} 内达到 ${entities.targetLevel} 水平`,
                    sections: [
                        {
                            title: '学习目标',
                            content: `学习科目：${entities.subject}\n目标水平：${entities.targetLevel}\n当前水平：${entities.currentLevel}`,
                        },
                        {
                            title: '时间规划',
                            content: `学习时长：${entities.studyDuration}\n每天学习：${entities.availableTimePerDay}小时\n截止日期：${entities.deadline || '灵活'}`,
                        },
                        {
                            title: '学习建议',
                            content: entities.learningStyle ? `推荐学习方式：${entities.learningStyle}` : '建议结合多种学习方式',
                            items: [
                                '制定阶段性小目标',
                                '定期复习巩固',
                                '实践应用加深理解',
                            ],
                        },
                    ],
                    widgets: [
                        { widgetType: 'timeline', payload: { subject: entities.subject, duration: entities.studyDuration } },
                        { widgetType: 'checklist', payload: { title: '学习任务清单' } },
                    ],
                };
            },
        };
    }

    /**
     * 创建项目管理工作流
     */
    private createProjectWorkflow(): WorkflowDefinition {
        return {
            domain: 'project',
            name: '项目管理规划工作流',
            description: '从项目启动到里程碑规划',
            startPhase: 'overview',
            phases: {
                overview: {
                    id: 'overview',
                    name: '项目概述',
                    description: '了解项目基本信息',
                    requiredSlots: ['projectName', 'projectType'],
                    optionalSlots: ['projectBudget'],
                    widgets: ['text_input', 'number_input'],
                    nextPhase: 'team',
                },
                team: {
                    id: 'team',
                    name: '团队配置',
                    description: '确定团队规模和角色分工',
                    requiredSlots: ['teamSize'],
                    optionalSlots: ['roles'],
                    widgets: ['number_input', 'multi_select'],
                    nextPhase: 'timeline',
                },
                timeline: {
                    id: 'timeline',
                    name: '时间规划',
                    description: '确定项目截止日期和阶段',
                    requiredSlots: ['deadlineDate'],
                    optionalSlots: ['milestones'],
                    widgets: ['date_picker'],
                    nextPhase: 'deliverables',
                },
                deliverables: {
                    id: 'deliverables',
                    name: '交付物定义',
                    description: '明确项目的交付物',
                    requiredSlots: ['deliverables'],
                    optionalSlots: ['dependencies', 'risks'],
                    widgets: ['textarea'],
                    nextPhase: 'complete',
                },
                complete: {
                    id: 'complete',
                    name: '生成项目计划',
                    description: '生成完整的项目计划',
                    requiredSlots: [],
                    optionalSlots: [],
                    widgets: [],
                    isComplete: () => true,
                },
            },
            generatePlan: async (entities) => {
                return {
                    title: `${entities.projectName} 项目计划`,
                    summary: `项目类型：${entities.projectType} | 团队规模：${entities.teamSize}人 | 预算：${entities.projectBudget || '待定'}元`,
                    sections: [
                        {
                            title: '项目概述',
                            content: `项目名称：${entities.projectName}\n项目类型：${entities.projectType}\n团队规模：${entities.teamSize}人`,
                        },
                        {
                            title: '时间线',
                            content: `截止日期：${entities.deadlineDate}`,
                        },
                        {
                            title: '交付物',
                            content: entities.deliverables?.join('\n') || '待定义',
                        },
                    ],
                    widgets: [
                        { widgetType: 'timeline', payload: { projectName: entities.projectName, deadline: entities.deadlineDate } },
                        { widgetType: 'checklist', payload: { title: '项目任务清单' } },
                    ],
                };
            },
        };
    }

    /**
     * 创建活动筹备工作流
     */
    private createEventWorkflow(): WorkflowDefinition {
        return {
            domain: 'event',
            name: '活动筹备工作流',
            description: '从活动规划到执行清单',
            startPhase: 'event_info',
            phases: {
                event_info: {
                    id: 'event_info',
                    name: '活动信息',
                    description: '了解活动基本信息',
                    requiredSlots: ['eventType', 'eventName'],
                    optionalSlots: ['eventDate', 'eventDuration'],
                    widgets: ['text_input', 'date_picker'],
                    nextPhase: 'attendees',
                },
                attendees: {
                    id: 'attendees',
                    name: '参与人数',
                    description: '确定预期参与人数',
                    requiredSlots: ['expectedAttendees'],
                    optionalSlots: ['venueRequirements'],
                    widgets: ['number_input'],
                    nextPhase: 'budget',
                },
                budget: {
                    id: 'budget',
                    name: '预算规划',
                    description: '确定活动预算',
                    requiredSlots: ['eventBudget'],
                    optionalSlots: ['catering', 'equipment'],
                    widgets: ['budget_slider', 'radio_cards'],
                    nextPhase: 'venue',
                },
                venue: {
                    id: 'venue',
                    name: '场地安排',
                    description: '确定场地需求',
                    requiredSlots: [],
                    optionalSlots: ['venueRequirements'],
                    widgets: ['multi_select'],
                    nextPhase: 'complete',
                },
                complete: {
                    id: 'complete',
                    name: '生成活动计划',
                    description: '生成完整的活动筹备计划',
                    requiredSlots: [],
                    optionalSlots: [],
                    widgets: [],
                    isComplete: () => true,
                },
            },
            generatePlan: async (entities) => {
                return {
                    title: `${entities.eventName} 活动计划`,
                    summary: `${entities.eventType} | ${entities.expectedAttendees}人 | 预算${entities.eventBudget}元`,
                    sections: [
                        {
                            title: '活动信息',
                            content: `活动名称：${entities.eventName}\n活动类型：${entities.eventType}\n活动时间：${entities.eventDate}\n参与人数：${entities.expectedAttendees}人`,
                        },
                        {
                            title: '预算分配',
                            content: `总预算：${entities.eventBudget}元`,
                        },
                    ],
                    widgets: [
                        { widgetType: 'checklist', payload: { title: '活动筹备清单' } },
                    ],
                };
            },
        };
    }

    /**
     * 创建生活目标工作流
     */
    private createLifeWorkflow(): WorkflowDefinition {
        return {
            domain: 'life',
            name: '生活目标工作流',
            description: '习惯养成和目标追踪',
            startPhase: 'goal',
            phases: {
                goal: {
                    id: 'goal',
                    name: '确定目标',
                    description: '了解用户想要达成的目标',
                    requiredSlots: ['habitName', 'habitCategory'],
                    optionalSlots: ['targetMetric', 'currentMetric'],
                    widgets: ['text_input', 'radio_cards'],
                    nextPhase: 'frequency',
                },
                frequency: {
                    id: 'frequency',
                    name: '确定频率',
                    description: '确定习惯执行频率',
                    requiredSlots: ['frequency'],
                    optionalSlots: ['trigger', 'duration'],
                    widgets: ['radio_cards', 'text_input'],
                    nextPhase: 'complete',
                },
                complete: {
                    id: 'complete',
                    name: '生成计划',
                    description: '生成习惯养成计划',
                    requiredSlots: [],
                    optionalSlots: [],
                    widgets: [],
                    isComplete: () => true,
                },
            },
            generatePlan: async (entities) => {
                return {
                    title: `${entities.habitName} 习惯养成计划`,
                    summary: `目标类别：${entities.habitCategory} | 频率：${entities.frequency}`,
                    sections: [
                        {
                            title: '目标信息',
                            content: `习惯名称：${entities.habitName}\n类别：${entities.habitCategory}\n频率：${entities.frequency}`,
                        },
                        {
                            title: '执行策略',
                            content: `触发条件：${entities.trigger || '待设定'}\n持续时间：${entities.duration || '长期'}\n奖励机制：${entities.reward || '自我激励'}`,
                        },
                    ],
                    widgets: [
                        { widgetType: 'checklist', payload: { title: '每日打卡' } },
                    ],
                };
            },
        };
    }
}

// 导出单例
export const workflowEngine = new WorkflowEngine();
