import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage, CollectedData, WidgetMessage } from '../types/message';

export interface SessionRecord {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    data: CollectedData;
    messages: ChatMessage[];
}

interface PlanningState {
    // Chat messages
    messages: ChatMessage[];

    // Collected user data
    collectedData: CollectedData;

    // Planning sessions
    sessions: Record<string, SessionRecord>;
    currentSessionId: string;

    // Pending new plan input
    pendingPlanInput: string | null;

    // Loading state
    isLoading: boolean;

    // Current pending widget (waiting for user input)
    pendingWidget: WidgetMessage | null;

    // Actions
    addMessage: (message: ChatMessage) => void;
    updateCollectedData: <K extends keyof CollectedData>(key: K, value: CollectedData[K]) => void;
    startNewSession: (seed?: Partial<CollectedData>) => void;
    switchSession: (sessionId: string) => void;
    deleteSession: (sessionId: string) => void;
    setPendingPlanInput: (input: string | null) => void;
    setLoading: (loading: boolean) => void;
    setPendingWidget: (widget: WidgetMessage | null) => void;
    completeWidget: (widgetId: string, response: unknown) => void;
    clearChat: () => void;
}

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const nowIso = () => new Date().toISOString();

const getPlanTypeLabel = (planType?: CollectedData['planType']) => {
    switch (planType) {
        case 'travel':
            return '旅行';
        case 'study':
            return '学习';
        case 'project':
            return '项目';
        case 'event':
            return '活动';
        case 'life':
            return '生活';
        default:
            return '计划';
    }
};

const deriveSessionTitle = (data: CollectedData) => {
    if (data.planType === 'travel') {
        if (data.destination) return `旅行 · ${data.destination}`;
        if (data.goal) return `旅行 · ${data.goal}`;
        return '旅行计划';
    }
    if (data.goal) return `${getPlanTypeLabel(data.planType)} · ${data.goal}`;
    if (data.destination) return `${getPlanTypeLabel(data.planType)} · ${data.destination}`;
    if (data.planType) return `${getPlanTypeLabel(data.planType)}计划`;
    return '未命名计划';
};

const createSession = (seed?: Partial<CollectedData>): SessionRecord => {
    const data = seed ? { ...seed } : {};
    const timestamp = nowIso();
    return {
        id: generateId(),
        title: deriveSessionTitle(data),
        createdAt: timestamp,
        updatedAt: timestamp,
        data,
        messages: [],
    };
};

const initialSession = createSession();

export const usePlanningStore = create<PlanningState>()(
    persist(
        (set) => ({
            messages: [],
            collectedData: {},
            sessions: { [initialSession.id]: initialSession },
            currentSessionId: initialSession.id,
            pendingPlanInput: null,
            isLoading: false,
            pendingWidget: null,

            addMessage: (message) => {
                set((state) => {
                    const session = state.sessions[state.currentSessionId];
                    const nextMessage = { ...message, id: message.id || generateId() };
                    const nextMessages = [...state.messages, nextMessage];
                    const updatedSession: SessionRecord = session
                        ? {
                            ...session,
                            messages: nextMessages,
                            updatedAt: nowIso(),
                        }
                        : {
                            ...createSession(),
                            messages: nextMessages,
                        };
                    return {
                        messages: nextMessages,
                        sessions: { ...state.sessions, [state.currentSessionId]: updatedSession },
                    };
                });
            },

            updateCollectedData: (key, value) => {
                set((state) => {
                    const session = state.sessions[state.currentSessionId];
                    const currentData = session?.data || state.collectedData || {};
                    const updatedData = { ...currentData, [key]: value };
                    const updatedSession: SessionRecord = session
                        ? {
                            ...session,
                            data: updatedData,
                            title: deriveSessionTitle(updatedData),
                            updatedAt: nowIso(),
                        }
                        : {
                            ...createSession(updatedData),
                            data: updatedData,
                        };
                    return {
                        sessions: { ...state.sessions, [state.currentSessionId]: updatedSession },
                        collectedData: updatedData,
                    };
                });
            },
            startNewSession: (seed) => {
                set((state) => {
                    const newSession = createSession(seed);
                    return {
                        sessions: { ...state.sessions, [newSession.id]: newSession },
                        currentSessionId: newSession.id,
                        collectedData: newSession.data,
                        messages: newSession.messages,
                        pendingPlanInput: null,
                        pendingWidget: null,
                    };
                });
            },

            switchSession: (sessionId) => {
                set((state) => {
                    const session = state.sessions[sessionId];
                    if (!session) return {};
                    return {
                        currentSessionId: sessionId,
                        collectedData: session.data,
                        messages: session.messages,
                        pendingPlanInput: null,
                        pendingWidget: null,
                    };
                });
            },
            deleteSession: (sessionId) => {
                set((state) => {
                    const nextSessions = { ...state.sessions };
                    const target = nextSessions[sessionId];
                    if (!target) return {};
                    delete nextSessions[sessionId];
                    const remainingIds = Object.keys(nextSessions);
                    if (remainingIds.length === 0) {
                        const newSession = createSession();
                        return {
                            sessions: { [newSession.id]: newSession },
                            currentSessionId: newSession.id,
                            collectedData: newSession.data,
                            messages: newSession.messages,
                            pendingPlanInput: null,
                            pendingWidget: null,
                        };
                    }
                    const nextId = state.currentSessionId === sessionId ? remainingIds[0] : state.currentSessionId;
                    const nextSession = nextSessions[nextId];
                    return {
                        sessions: nextSessions,
                        currentSessionId: nextId,
                        collectedData: nextSession.data,
                        messages: nextSession.messages,
                        pendingPlanInput: null,
                        pendingWidget: null,
                    };
                });
            },

            setPendingPlanInput: (input) => {
                set({ pendingPlanInput: input });
            },

            setLoading: (loading) => {
                set({ isLoading: loading });
            },

            setPendingWidget: (widget) => {
                set({ pendingWidget: widget });
            },

            completeWidget: (widgetId, response) => {
                set((state) => {
                    const updatedMessages = state.messages.map((msg) =>
                        msg.id === widgetId && msg.type === 'widget'
                            ? { ...msg, userResponse: response, isCompleted: true }
                            : msg
                    );
                    const session = state.sessions[state.currentSessionId];
                    if (!session) {
                        return { messages: updatedMessages, pendingWidget: null };
                    }
                    const updatedSession: SessionRecord = {
                        ...session,
                        messages: updatedMessages,
                        updatedAt: nowIso(),
                    };
                    return {
                        messages: updatedMessages,
                        sessions: { ...state.sessions, [state.currentSessionId]: updatedSession },
                        pendingWidget: null,
                    };
                });
            },

            clearChat: () => {
                const newSession = createSession();
                set({
                    messages: newSession.messages,
                    collectedData: newSession.data,
                    sessions: { [newSession.id]: newSession },
                    currentSessionId: newSession.id,
                    pendingPlanInput: null,
                    isLoading: false,
                    pendingWidget: null,
                });
            },
        }),
        {
            name: 'aether-plan-store',
            partialize: (state) => ({
                sessions: state.sessions,
                currentSessionId: state.currentSessionId,
                messages: state.messages,
                collectedData: state.collectedData,
                pendingPlanInput: state.pendingPlanInput,
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                const sessionIds = Object.keys(state.sessions || {});
                if (sessionIds.length === 0) {
                    const fallback = createSession();
                    state.sessions = { [fallback.id]: fallback };
                    state.currentSessionId = fallback.id;
                    state.messages = fallback.messages;
                    state.collectedData = fallback.data;
                    return;
                }
                const currentId = state.currentSessionId && state.sessions[state.currentSessionId]
                    ? state.currentSessionId
                    : sessionIds[0];
                const session = state.sessions[currentId];
                state.currentSessionId = currentId;
                state.messages = session.messages;
                state.collectedData = session.data;
            },
        }
    )
);

// Helper function to add user message
export const addUserMessage = (content: string) => {
    const store = usePlanningStore.getState();
    store.addMessage({
        id: generateId(),
        role: 'user',
        type: 'text',
        content,
        timestamp: new Date(),
    });
};

// Helper function to add assistant text message
export const addAssistantMessage = (content: string) => {
    const store = usePlanningStore.getState();
    store.addMessage({
        id: generateId(),
        role: 'assistant',
        type: 'text',
        content,
        timestamp: new Date(),
    });
};

// Helper function to add widget message
export const addWidgetMessage = (widgetType: WidgetMessage['widgetType'], payload: Record<string, unknown>) => {
    const store = usePlanningStore.getState();
    const widget: WidgetMessage = {
        id: generateId(),
        role: 'assistant',
        type: 'widget',
        widgetType,
        payload,
        timestamp: new Date(),
    };
    store.addMessage(widget);
    store.setPendingWidget(widget);
    return widget;
};
