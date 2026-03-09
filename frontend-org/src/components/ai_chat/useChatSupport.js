import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';

const STORAGE_KEY = 'ai_chat_history';
const MAX_STORED_MESSAGES = 50;

// Example questions for quick start
const EXAMPLE_QUESTIONS = [
  "How do I create a quotation?",
  "How do I approve a quotation?",
  "Show me production status",
  "How do I set reorder levels?",
  "What is Smart Task Automation?",
  "Get sales performance tips"
];

const useChatSupport = (userRole = 'poc', userId = 'anonymous') => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [welcomeData, setWelcomeData] = useState(null);
  const [exampleQuestions, setExampleQuestions] = useState(EXAMPLE_QUESTIONS);
  const messagesEndRef = useRef(null);

  // Load conversation from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return; // Don't fetch welcome if we have history
        }
      } catch (e) {
        console.error('Failed to parse stored messages:', e);
      }
    }
    fetchWelcomeData();
  }, []);

  // Save conversation to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      const toStore = messages.slice(-MAX_STORED_MESSAGES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    }
  }, [messages]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Smart scroll: only auto-scroll if user is already near the bottom
  useEffect(() => {
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (!messagesContainer) return;

    const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages]);

  const fetchWelcomeData = async () => {
    try {
      const response = await api.get(`/ai/support/welcome?role=${userRole}`);
      if (response.data.success || response.data.welcome_message) {
        setWelcomeData(response.data);

        // Add welcome message to chat with example questions
        setMessages([{
          id: 'welcome',
          type: 'welcome',
          text: response.data.welcome_message,
          timestamp: new Date(),
          suggestions: response.data.quick_actions || exampleQuestions.slice(0, 3)
        }]);
      }
    } catch (err) {
      console.error('Failed to fetch welcome data:', err);
    }
  };

  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim()) return;

    // Add user message
    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Set loading
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/ai/support/query', {
        user_id: userId,
        role: userRole,
        message: messageText
      });

      console.log('📥 API Response:', response.data);

      if (response.data.success || response.data.reply) {
        // Add AI response
        const aiMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          text: response.data.reply,
          timestamp: new Date(),
          suggestions: response.data.suggestions || [],
          confidence: response.data.confidence,
          source: response.data.source
        };
        console.log('💬 AI Message created:', aiMessage);
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(response.data.error || 'Failed to get response');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      console.error('Error Details:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to get response. Please try again.');

      // Add error message
      const errorMessage = {
        id: `error-${Date.now()}`,
        type: 'error',
        text: err.response?.data?.message ? `Error: ${err.response.data.message}` : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [userRole, userId]);

  const sendSuggestion = useCallback(async (suggestionText) => {
    await sendMessage(suggestionText);
  }, [sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    fetchWelcomeData();
  }, [userRole]);

  return {
    messages,
    isLoading,
    error,
    welcomeData,
    exampleQuestions,
    sendMessage,
    sendSuggestion,
    clearMessages,
    messagesEndRef
  };
};

export default useChatSupport;
