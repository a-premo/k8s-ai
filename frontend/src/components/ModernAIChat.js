import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Send, 
  Bot, 
  User, 
  Lightbulb, 
  AlertTriangle, 
  TrendingUp,
  Zap,
  Clock,
  Shield,
  Database,
  Activity
} from 'lucide-react';
import { useAIChat, useAIAnalysis } from '../hooks/useK8sResource';

const ModernAIChat = ({ isOpen, onClose, k8sData, currentCluster }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m your K8s AI Assistant. I can help you analyze your cluster, troubleshoot issues, and provide recommendations. What would you like to know?',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { mutate: sendChatMessage } = useAIChat();
  const { mutate: getAnalysis } = useAIAnalysis();

  // Smart prompts based on cluster data
  const smartPrompts = [
    {
      icon: AlertTriangle,
      title: "Pod Issues",
      prompt: "Why are my pods restarting?",
      description: "Analyze pod restart patterns"
    },
    {
      icon: TrendingUp,
      title: "Resource Usage",
      prompt: `What is the total resource usage in ${currentCluster?.displayName || 'current'} cluster?`,
      description: "Get cluster resource overview"
    },
    {
      icon: Shield,
      title: "Security",
      prompt: "Are there any security issues in my cluster?",
      description: "Security recommendations"
    },
    {
      icon: Database,
      title: "Storage",
      prompt: "How is my persistent storage performing?",
      description: "Storage analysis and optimization"
    },
    {
      icon: Activity,
      title: "Performance",
      prompt: "Which pods are using the most resources?",
      description: "Performance bottleneck analysis"
    },
    {
      icon: Zap,
      title: "Optimization",
      prompt: "How can I optimize my cluster for better performance?",
      description: "Get optimization suggestions"
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = useCallback(async (messageText = inputMessage) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Create summarized context to prevent large payloads
      const summarizedContext = createSummarizedContext(k8sData, currentCluster);
      
      // If context is still too large, create minimal context
      const contextStr = JSON.stringify(summarizedContext);
      const sizeInBytes = new Blob([contextStr]).size;
      
      let finalContext = summarizedContext;
      if (sizeInBytes > 100000) { // If over 100KB, create minimal context
        console.warn('⚠️ Context still too large, creating minimal context');
        finalContext = {
          timestamp: new Date().toISOString(),
          cluster: currentCluster ? {
            name: currentCluster.name,
            displayName: currentCluster.displayName,
            status: currentCluster.status
          } : null,
          message: "Context too large - using minimal context"
        };
      }
      
      const response = await new Promise((resolve) => {
        sendChatMessage(
          {
            message: messageText.trim(),
            context: finalContext
          },
          {
            onSuccess: (data) => resolve(data),
            onError: (error) => {
              console.error('AI Chat error:', error);
              resolve({
                answer: "I'm sorry, I'm having trouble processing your request right now. Please try again later or check your connection.",
                context: "Error response"
              });
            }
          }
        );
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.answer || "I'm having trouble processing that request. Could you try rephrasing it?",
        timestamp: new Date(),
        followUp: response.followUpQuestions || [],
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: "I'm sorry, there was an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, isLoading, sendChatMessage, currentCluster, k8sData]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSmartPrompt = (prompt) => {
    setInputMessage(prompt);
    handleSendMessage(prompt);
  };

  // Helper function to create summarized context
  const createSummarizedContext = (data, cluster) => {
    // Ultra-minimal context to debug 413 issues
    return {
      timestamp: new Date().toISOString(),
      cluster: cluster?.name || 'dev',
      summary: 'minimal context for debugging'
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Chat Panel */}
      <div className="relative w-full max-w-md h-[600px] glassmorphic-panel rounded-xl shadow-xl animate-scale-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">AI Assistant</h3>
              <p className="text-xs text-gray-400">
                {currentCluster?.displayName || 'Current'} Cluster
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : ''}`}>
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white ml-auto'
                      : 'bg-white/10 text-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.followUp && message.followUp.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-400">Follow-up questions:</p>
                      {message.followUp.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => handleSmartPrompt(question)}
                          className="block w-full text-left text-xs p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 px-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>

              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white/10 text-gray-200 px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Smart Prompts */}
        {messages.length <= 1 && (
          <div className="px-4 py-2 border-t border-gray-700/50">
            <p className="text-xs text-gray-400 mb-3">Quick questions:</p>
            <div className="grid grid-cols-2 gap-2">
              {smartPrompts.slice(0, 4).map((prompt, index) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleSmartPrompt(prompt.prompt)}
                    className="flex items-center gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-left"
                  >
                    <Icon className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-white font-medium">{prompt.title}</p>
                      <p className="text-xs text-gray-400">{prompt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-700/50">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your cluster..."
                className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm text-white placeholder-gray-400"
                rows="2"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernAIChat; 