/**
 * useTamboChat - Encapsulates Tambo hooks for chat functionality
 *
 * This hook provides a unified interface for Tambo AI chat interactions,
 * combining thread management, message sending, and tool execution.
 *
 * @module hooks/useTamboChat
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import {
  useTambo,
  useTamboThreadInput,
  isTamboConfigured,
  getTamboConfigStatus,
} from '../tambo';
import type { TamboThreadMessage } from '@tambo-ai/react';

// ============================================================================
// Types
// ============================================================================

/**
 * Chat message format compatible with both Tambo and the existing chat UI
 */
export interface TamboChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolCalls?: ToolCallInfo[];
}

/**
 * Information about a tool call made during message generation
 */
export interface ToolCallInfo {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: unknown;
  error?: string;
}

/**
 * Options for the useTamboChat hook
 */
export interface UseTamboChatOptions {
  /** Callback when a message is sent */
  onMessageSent?: (content: string) => void;
  /** Callback when a response is received */
  onResponseReceived?: (message: TamboChatMessage) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Callback when a tool is called */
  onToolCall?: (toolInfo: ToolCallInfo) => void;
}

/**
 * Return type for the useTamboChat hook
 */
export interface UseTamboChatReturn {
  // State
  messages: TamboChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | null;
  isConfigured: boolean;
  configStatus: ReturnType<typeof getTamboConfigStatus>;

  // Thread management
  threadId: string | undefined;
  createNewThread: () => void;

  // Messaging
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;

  // Input helpers
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;

  // Utilities
  retryLastMessage: () => Promise<void>;

  // Advanced
  cancelRun: () => Promise<void>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert Tambo thread message to our chat message format
 */
function convertTamboMessage(msg: TamboThreadMessage): TamboChatMessage {
  // Extract text content from the message
  let textContent = '';
  if (typeof msg.content === 'string') {
    textContent = msg.content;
  } else if (msg.content && typeof msg.content === 'object') {
    // Handle content blocks
    const contentBlocks = msg.content as Array<{ type: string; text?: string }>;
    if (Array.isArray(contentBlocks)) {
      textContent = contentBlocks
        .filter((block) => block.type === 'text' && block.text)
        .map((block) => block.text)
        .join('\n');
    }
  }

  return {
    id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role: msg.role as 'user' | 'assistant',
    content: textContent,
    timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date(),
    isStreaming: false,
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook for Tambo AI chat functionality
 *
 * This hook encapsulates the Tambo SDK hooks to provide a simplified interface
 * for chat interactions, including message management, thread handling, and
 * error states.
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const {
 *     messages,
 *     isLoading,
 *     sendMessage,
 *     input,
 *     setInput,
 *     handleSubmit,
 *     isConfigured,
 *   } = useTamboChat({
 *     onMessageSent: (content) => console.log('Sent:', content),
 *     onError: (error) => console.error('Error:', error),
 *   });
 *
 *   if (!isConfigured) {
 *     return <div>Please configure Tambo API key</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <MessageList messages={messages} />
 *       <form onSubmit={handleSubmit}>
 *         <input
 *           value={input}
 *           onChange={(e) => setInput(e.target.value)}
 *           placeholder="Type a message..."
 *         />
 *         <button type="submit" disabled={isLoading}>
 *           Send
 *         </button>
 *       </form>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTamboChat(
  options: UseTamboChatOptions = {}
): UseTamboChatReturn {
  const { onMessageSent, onResponseReceived, onError, onToolCall } = options;

  // Local state
  const [messages, setMessages] = useState<TamboChatMessage[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Refs for tracking
  const processingRef = useRef(false);
  const lastUserMessageRef = useRef<string>('');

  // Get Tambo hooks
  const tambo = useTambo();
  const threadInput = useTamboThreadInput();

  // Configuration status
  const isConfigured = isTamboConfigured();
  const configStatus = getTamboConfigStatus();

  // ============================================================================
  // Sync messages from Tambo thread
  // ============================================================================

  useEffect(() => {
    if (!tambo?.messages) return;

    const convertedMessages = tambo.messages.map(convertTamboMessage);
    setMessages(convertedMessages);
  }, [tambo?.messages]);

  // ============================================================================
  // Send message function
  // ============================================================================

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      if (processingRef.current) return;

      setError(null);
      processingRef.current = true;
      lastUserMessageRef.current = content.trim();

      try {
        // Notify callback
        onMessageSent?.(content.trim());

        // Send to Tambo using the thread input hook
        if (threadInput?.submit) {
          // Set the input value and submit
          threadInput.setValue(content.trim());
          await threadInput.submit();

          // The messages will be updated via the useTambo hook subscription
        } else {
          throw new Error('Tambo thread input not available');
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        processingRef.current = false;
      }
    },
    [threadInput, onMessageSent, onError]
  );

  // ============================================================================
  // Form submission handler
  // ============================================================================

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const content = threadInput?.value || '';
      if (!content.trim()) return;

      await sendMessage(content);

      // Clear input after sending
      threadInput?.setValue('');
    },
    [sendMessage, threadInput]
  );

  // ============================================================================
  // Input management
  // ============================================================================

  const input = threadInput?.value || '';
  const setInput = useCallback(
    (value: string) => {
      threadInput?.setValue(value);
    },
    [threadInput]
  );

  // ============================================================================
  // Thread management
  // ============================================================================

  const threadId = tambo?.currentThreadId;

  const createNewThread = useCallback(() => {
    // Clear local messages
    setMessages([]);
    setError(null);

    // Start a new thread via Tambo context
    if (tambo?.startNewThread) {
      tambo.startNewThread();
    }
  }, [tambo]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // ============================================================================
  // Retry functionality
  // ============================================================================

  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      await sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  // ============================================================================
  // Cancel run
  // ============================================================================

  const cancelRun = useCallback(async () => {
    if (tambo?.cancelRun) {
      await tambo.cancelRun();
    }
  }, [tambo]);

  // ============================================================================
  // Effect to notify on response received
  // ============================================================================

  useEffect(() => {
    if (tambo?.messages && tambo.messages.length > 0) {
      const lastMessage = tambo.messages[tambo.messages.length - 1];
      if (lastMessage.role === 'assistant') {
        onResponseReceived?.(convertTamboMessage(lastMessage));
      }
    }
    // Note: onToolCall can be implemented by monitoring tool use content in messages
    // This is intentionally left for future enhancement when tool tracking is needed
    void onToolCall;
  }, [tambo?.messages, onResponseReceived, onToolCall]);

  // ============================================================================
  // Return hook value
  // ============================================================================

  return {
    // State
    messages,
    isLoading: threadInput?.isPending || false,
    isStreaming: tambo?.isStreaming || false,
    error,
    isConfigured,
    configStatus,

    // Thread management
    threadId,
    createNewThread,

    // Messaging
    sendMessage,
    clearMessages,

    // Input helpers
    input,
    setInput,
    handleSubmit,

    // Utilities
    retryLastMessage,

    // Advanced
    cancelRun,
  };
}

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * Check if Tambo is available and properly configured
 */
export { isTamboConfigured, getTamboConfigStatus };

/**
 * Default export
 */
export default useTamboChat;
