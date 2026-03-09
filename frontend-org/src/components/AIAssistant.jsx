import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';
import ChatHistorySidebar from './ai_chat/ChatHistorySidebar';

const AIAssistant = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hey there! 👋 What's on your mind today?",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [showHistory, setShowHistory] = useState(false); // Sidebar hidden by default
    const [sessionId, setSessionId] = useState(() => {
        // Try to restore session from localStorage
        return localStorage.getItem('ai_chat_session') ||
            `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    });
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Smart scroll: only auto-scroll if user is already near the bottom
    useEffect(() => {
        const messagesContainer = messagesEndRef.current?.parentElement;
        if (!messagesContainer) return;

        // Check if user is near bottom (within 100px)
        const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;

        // Only auto-scroll if user was already at the bottom
        if (isNearBottom) {
            scrollToBottom();
        }
    }, [messages]);

    // Load messages from localStorage on mount
    useEffect(() => {
        const savedMessages = localStorage.getItem('ai_chat_messages');
        if (savedMessages) {
            try {
                const parsed = JSON.parse(savedMessages);
                setMessages(parsed.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                })));
            } catch (error) {
                console.error('Failed to load saved messages:', error);
            }
        }
    }, []);

    // Save to backend and localStorage after messages change
    useEffect(() => {
        if (messages.length > 1) { // More than just welcome message
            // Save to localStorage
            localStorage.setItem('ai_chat_messages', JSON.stringify(messages));
            localStorage.setItem('ai_chat_session', sessionId);

            // Save to backend (debounced)
            const saveTimeout = setTimeout(() => {
                saveConversation();
            }, 1000);

            return () => clearTimeout(saveTimeout);
        }
    }, [messages, sessionId]);

    const saveConversation = async () => {
        try {
            // Filter out any messages with undefined/empty content
            const validMessages = messages.filter(msg =>
                msg && msg.role && msg.content && msg.content.trim() !== ''
            );

            if (validMessages.length === 0) {
                return; // Don't save if no valid messages
            }

            await api.post('/ai-chat/save', {
                sessionId,
                messages: validMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp
                })),
                title: validMessages.find(m => m.role === 'user')?.content.substring(0, 50) || 'New Chat'
            });
        } catch (error) {
            console.error('Failed to save conversation:', error);
        }
    };

    const loadConversation = async (sessionIdToLoad) => {
        try {
            const response = await api.get(`/ai-chat/history/${sessionIdToLoad}`);
            if (response.data.success) {
                const conv = response.data.conversation;
                setMessages(conv.messages.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                })));
                setSessionId(sessionIdToLoad);
                localStorage.setItem('ai_chat_session', sessionIdToLoad);
                localStorage.setItem('ai_chat_messages', JSON.stringify(conv.messages));
                setShowHistory(false); // Hide sidebar after loading
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    };

    const startNewChat = () => {
        const newSessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);
        setMessages([{
            role: 'assistant',
            content: "Hey there! 👋 What's on your mind today?",
            timestamp: new Date()
        }]);
        localStorage.setItem('ai_chat_session', newSessionId);
        localStorage.setItem('ai_chat_messages', JSON.stringify([{
            role: 'assistant',
            content: "Hey there! 👋 What's on your mind today?",
            timestamp: new Date()
        }]));
        setShowHistory(false); // Hide sidebar after new chat
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isThinking) return;

        const userMessage = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsThinking(true);

        try {
            const response = await api.post('/ai-chat/query', {
                question: userMessage.content
            });

            const aiMessage = {
                role: 'assistant',
                content: response.data.answer || response.data.reply,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('AI query error:', error);
            const errorMessage = {
                role: 'assistant',
                content: "Sorry, I couldn't process that. Please try again.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsThinking(false);
        }
    };

    const ThinkingDots = () => (
        <div className="flex space-x-2 p-4">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 flex h-[500px]">
            {/* Chat History Sidebar - Conditionally rendered */}
            {showHistory && (
                <ChatHistorySidebar
                    onSelectConversation={loadConversation}
                    onNewChat={startNewChat}
                    currentSessionId={sessionId}
                />
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-amber-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            {/* History Toggle Button */}
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                                title="Toggle chat history"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 text-gray-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <Sparkles className="w-5 h-5 text-red-700" />
                            <h3 className="font-semibold text-gray-800">AI Assistant</h3>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-9">Ask me anything about your business</p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" onScroll={(e) => {
                    const container = e.target;
                    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
                    // You can add state here to show/hide scroll button
                }}>
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                    ? 'bg-red-700 text-white'
                                    : 'bg-gray-100 text-gray-800'
                                    }`}
                            >
                                <div className="text-sm prose prose-sm max-w-none">
                                    {message.role === 'assistant' ? (
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                                em: ({ children }) => <em className="italic">{children}</em>,
                                            }}
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    ) : (
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                    )}
                                </div>
                                <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-red-100' : 'text-gray-500'
                                    }`}>
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-2xl">
                                <ThinkingDots />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question..."
                            disabled={isThinking}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isThinking}
                            className="px-6 py-3 bg-red-700 text-white rounded-full hover:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AIAssistant;
