import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader, X, Minimize2, Maximize2, Brain } from 'lucide-react';
import { useAIChat } from '../hooks/useK8sResource';

const AIAssistant = ({ clusterData, isOpen, onClose, onToggle }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I\'m your Kubernetes AI assistant. I can help you with:\n\n• **Pod troubleshooting** - Analyze failing pods\n• **YAML configuration** - Write and edit Kubernetes manifests\n• **Best practices** - Recommend optimizations\n• **Cluster analysis** - Review resource usage\n\nWhat would you like to help with?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const chatMutation = useAIChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage = { 
      role: 'user', 
      content: input, 
      timestamp: new Date() 
    };
    
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = input;
    setInput('');

    try {
      // Create summarized context to prevent large payloads
      const summarizedContext = createSummarizedContext(clusterData);
      
      // If context is still too large, create minimal context
      const contextStr = JSON.stringify(summarizedContext);
      const sizeInBytes = new Blob([contextStr]).size;
      
      let finalContext = summarizedContext;
      if (sizeInBytes > 100000) { // If over 100KB, create minimal context
        console.warn('⚠️ Context still too large, creating minimal context');
        finalContext = {
          timestamp: new Date().toISOString(),
          message: "Context too large - using minimal context"
        };
      }
      
      const response = await chatMutation.mutateAsync({
        message: messageToSend,
        context: finalContext
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.answer,
        followUp: response.followUpQuestions || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again or check if the AI service is configured properly.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFollowUpClick = (question) => {
    setInput(question);
  };

  const formatMessage = (content) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
  };

  // Helper function to create summarized context
  const createSummarizedContext = (data) => {
    // Ultra-minimal context to debug 413 issues
    return {
      timestamp: new Date().toISOString(),
      summary: 'minimal context for debugging'
    };
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 z-50 group"
        title="Open AI Assistant"
      >
        <Brain className="w-6 h-6" />
        <span className="absolute -top-2 -right-2 bg-green-500 w-3 h-3 rounded-full animate-pulse"></span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl border z-50 transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-blue-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800">AI Assistant</h3>
          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Online</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-96">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.isError
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div
                    className="text-sm whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                  />
                  {message.followUp && message.followUp.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-xs text-gray-600 font-medium">Suggested questions:</div>
                      {message.followUp.map((question, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleFollowUpClick(question)}
                          className="block w-full text-left text-xs p-2 bg-white rounded border hover:bg-gray-50 transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-gray-50 rounded-b-lg">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about Kubernetes..."
                className="flex-1 resize-none border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-20"
                rows="1"
                disabled={chatMutation.isPending}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || chatMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistant; 