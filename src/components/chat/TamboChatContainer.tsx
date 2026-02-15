/**
 * TamboChatContainer - Chat container using Tambo AI SDK
 *
 * This component provides a chat interface powered by the Tambo AI SDK,
 * supporting generative UI with widgets and tools integration.
 *
 * @module components/chat/TamboChatContainer
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Compass, Settings, Plus, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useTamboChat, type TamboChatMessage } from '../../hooks/useTamboChat';
import { useAPIConfigStore } from '../../stores/apiConfigStore';
import MessageList from './MessageList';
import InputArea from './InputArea';
import SettingsModal from '../settings/SettingsModal';
import { cn } from '../../lib/utils';
import type { ChatMessage } from '../../types/message';

// Use settings modal through the store
const SettingsModalWrapper: React.FC = () => {
  return <SettingsModal />;
};

// ============================================================================
// Types
// ============================================================================

interface TamboChatContainerProps {
  /** Optional CSS class name */
  className?: string;
  /** Callback when a new thread is created */
  onNewThread?: () => void;
  /** Callback when settings is opened */
  onSettingsOpen?: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert TamboChatMessage to ChatMessage format for the existing UI components
 */
function convertToChatMessage(msg: TamboChatMessage): ChatMessage {
  return {
    id: msg.id,
    role: msg.role,
    type: 'text',
    content: msg.content,
    timestamp: msg.timestamp,
  };
}

// ============================================================================
// Component
// ============================================================================

/**
 * Tambo-powered Chat Container Component
 *
 * A chat interface that uses the Tambo AI SDK for intelligent conversations
 * with generative UI capabilities.
 *
 * @example
 * ```tsx
 * // In App.tsx with TamboProvider
 * <AetherTamboProvider>
 *   <TamboChatContainer />
 * </AetherTamboProvider>
 * ```
 */
const TamboChatContainer: React.FC<TamboChatContainerProps> = ({
  className,
  onNewThread,
  onSettingsOpen,
}) => {
  // Get API config store for settings modal control
  const { openConfig } = useAPIConfigStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Use the Tambo chat hook
  const {
    messages: tamboMessages,
    isLoading,
    isStreaming,
    error,
    isConfigured,
    configStatus,
    threadId,
    createNewThread,
    sendMessage,
    handleSubmit,
    retryLastMessage,
    cancelRun,
  } = useTamboChat({
    onError: (err) => {
      console.error('[TamboChat] Error:', err);
    },
    onMessageSent: (content) => {
      console.log('[TamboChat] Message sent:', content);
    },
    onResponseReceived: (message) => {
      console.log('[TamboChat] Response received:', message.content.substring(0, 50));
    },
  });

  // Convert Tambo messages to the format expected by MessageList
  const chatMessages: ChatMessage[] = tamboMessages.map(convertToChatMessage);

  // Handle sending messages
  const handleSend = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      await sendMessage(content);
    },
    [sendMessage]
  );

  // Handle new thread creation
  const handleNewThread = useCallback(() => {
    createNewThread();
    onNewThread?.();
  }, [createNewThread, onNewThread]);

  // Handle settings open
  const handleSettingsOpen = useCallback(() => {
    openConfig();
    onSettingsOpen?.();
  }, [openConfig, onSettingsOpen]);

  // Handle widget submit (for compatibility with existing widgets)
  const handleWidgetSubmit = useCallback(
    async (_widgetId: string, response: unknown) => {
      // For now, treat widget responses as regular messages
      const responseText =
        typeof response === 'string'
          ? response
          : JSON.stringify(response);
      await sendMessage(responseText);
    },
    [sendMessage]
  );

  // ============================================================================
  // Render Configuration Warning
  // ============================================================================

  if (!isConfigured) {
    return (
      <div className={cn('flex flex-col h-full bg-gradient-to-br from-stone-50 to-stone-100', className)}>
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-stone-800 mb-2">
              Tambo API 未配置
            </h2>
            <p className="text-stone-600 mb-4">
              请在 .env 文件中设置 VITE_TAMBO_API_KEY 以启用 AI 聊天功能。
            </p>
            <div className="bg-stone-100 rounded-lg p-4 text-left text-sm mb-4">
              <p className="font-mono text-stone-700">
                VITE_TAMBO_API_KEY=your_api_key_here
              </p>
            </div>
            <button
              onClick={handleSettingsOpen}
              className="px-6 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
            >
              打开设置
            </button>
          </motion.div>
        </div>
        <SettingsModalWrapper />
      </div>
    );
  }

  return (
    <div className={cn('flex h-full bg-gradient-to-br from-stone-50 to-stone-100', className)}>
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarCollapsed ? 0 : 280 }}
        className="overflow-hidden bg-white border-r border-stone-200 flex-shrink-0"
      >
        <div className="w-[280px] h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-stone-100">
            <button
              onClick={handleNewThread}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">新对话</span>
            </button>
          </div>

          {/* Recent Threads */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 px-2">
              当前会话
            </p>
            {threadId && (
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-stone-100 text-stone-800 text-sm">
                <Clock className="w-4 h-4 text-stone-400" />
                <span className="truncate">会话 {threadId.slice(0, 8)}...</span>
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-stone-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <Compass className="w-5 h-5 text-stone-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-stone-800">Aether Plan</h1>
              <p className="text-xs text-stone-500">
                Tambo AI - {configStatus.widgetsCount} widgets, {configStatus.toolsCount} tools
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Debug info in dev mode */}
            {import.meta.env.DEV && (
              <span className="text-xs text-stone-400 mr-2">
                {isStreaming ? 'Streaming...' : isLoading ? 'Loading...' : 'Ready'}
              </span>
            )}

            {/* Cancel button when streaming */}
            {(isLoading || isStreaming) && (
              <button
                onClick={cancelRun}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                取消
              </button>
            )}

            <button
              onClick={handleSettingsOpen}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-stone-600" />
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {chatMessages.length === 0 ? (
            // Empty state
            <div className="flex-1 flex items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-lg"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <span className="text-3xl">✨</span>
                </div>
                <h2 className="text-2xl font-bold text-stone-800 mb-3">
                  智能规划助手
                </h2>
                <p className="text-stone-600 mb-6">
                  基于Tambo AI的智能对话系统，支持生成式UI和工具调用。
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    '我想去北京旅游',
                    '帮我规划一次生日派对',
                    '安排一次团队会议',
                    '查找上海到杭州的火车',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSend(suggestion)}
                      className="px-4 py-2 rounded-full bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-all text-sm text-stone-600"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            // Message list
            <MessageList
              messages={chatMessages}
              isLoading={isLoading || isStreaming}
              onWidgetSubmit={handleWidgetSubmit}
            />
          )}
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-6 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error.message}</span>
            </div>
            <button
              onClick={retryLastMessage}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded transition-colors text-red-700"
            >
              <RefreshCw className="w-3 h-3" />
              重试
            </button>
          </motion.div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white/50 backdrop-blur-sm border-t border-stone-200">
          <form onSubmit={handleSubmit}>
            <InputArea
              onSend={handleSend}
              disabled={isLoading || isStreaming}
              placeholder="告诉我可以为您规划什么..."
            />
          </form>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModalWrapper />
    </div>
  );
};

export default TamboChatContainer;
