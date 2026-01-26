import { create } from 'zustand';
import type { ChatMessage, CollectedData, WidgetMessage } from '../types/message';

interface PlanningState {
    // Chat messages
    messages: ChatMessage[];

    // Collected user data
    collectedData: CollectedData;

    // Loading state
    isLoading: boolean;

    // Current pending widget (waiting for user input)
    pendingWidget: WidgetMessage | null;

    // Actions
    addMessage: (message: ChatMessage) => void;
    updateCollectedData: <K extends keyof CollectedData>(key: K, value: CollectedData[K]) => void;
    setLoading: (loading: boolean) => void;
    setPendingWidget: (widget: WidgetMessage | null) => void;
    completeWidget: (widgetId: string, response: unknown) => void;
    clearChat: () => void;
}

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const usePlanningStore = create<PlanningState>((set) => ({
    messages: [],
    collectedData: {},
    isLoading: false,
    pendingWidget: null,

    addMessage: (message) => {
        set((state) => ({
            messages: [...state.messages, { ...message, id: message.id || generateId() }],
        }));
    },

    updateCollectedData: (key, value) => {
        set((state) => ({
            collectedData: { ...state.collectedData, [key]: value },
        }));
    },

    setLoading: (loading) => {
        set({ isLoading: loading });
    },

    setPendingWidget: (widget) => {
        set({ pendingWidget: widget });
    },

    completeWidget: (widgetId, response) => {
        set((state) => ({
            messages: state.messages.map((msg) =>
                msg.id === widgetId && msg.type === 'widget'
                    ? { ...msg, userResponse: response, isCompleted: true }
                    : msg
            ),
            pendingWidget: null,
        }));
    },

    clearChat: () => {
        set({
            messages: [],
            collectedData: {},
            isLoading: false,
            pendingWidget: null,
        });
    },
}));

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
