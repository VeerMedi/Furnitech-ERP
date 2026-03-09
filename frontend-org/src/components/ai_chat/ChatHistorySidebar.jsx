import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiTrash2, FiMessageSquare, FiX, FiMenu } from 'react-icons/fi';
import './ChatHistorySidebar.css';

const ChatHistorySidebar = ({ onSelectConversation, onNewChat, currentSessionId }) => {
    const [conversations, setConversations] = useState({
        today: [],
        yesterday: [],
        lastWeek: [],
        lastMonth: [],
        older: []
    });
    const [isOpen, setIsOpen] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const response = await api.get('/ai-chat/history');
            if (response.data.success) {
                setConversations(response.data.conversations);
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteConversation = async (sessionId, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this conversation?')) return;

        try {
            await api.delete(`/ai-chat/history/${sessionId}`);
            loadHistory(); // Reload history
        } catch (error) {
            console.error('Failed to delete conversation:', error);
            alert('Failed to delete conversation');
        }
    };

    const clearAllHistory = async () => {
        if (!window.confirm('Clear all conversation history? This cannot be undone.')) return;

        try {
            await api.delete('/ai-chat/history');
            setConversations({
                today: [],
                yesterday: [],
                lastWeek: [],
                lastMonth: [],
                older: []
            });
            onNewChat(); // Start new chat
        } catch (error) {
            console.error('Failed to clear history:', error);
            alert('Failed to clear history');
        }
    };

    const renderConversationList = (list, title) => {
        if (list.length === 0) return null;

        return (
            <div className="history-group">
                <div className="group-title">{title}</div>
                {list.map((conv) => (
                    <div
                        key={conv.sessionId}
                        className={`history-item ${conv.sessionId === currentSessionId ? 'active' : ''}`}
                        onClick={() => onSelectConversation(conv.sessionId)}
                    >
                        <FiMessageSquare className="message-icon" />
                        <div className="conversation-info">
                            <div className="conversation-title">{conv.title}</div>
                            <div className="conversation-meta">{conv.messageCount} messages</div>
                        </div>
                        <button
                            className="delete-btn"
                            onClick={(e) => deleteConversation(conv.sessionId, e)}
                            title="Delete conversation"
                        >
                            <FiTrash2 />
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    if (!isOpen) {
        return null; // Don't show toggle button
    }

    return (
        <div className="chat-history-sidebar">
            <div className="sidebar-header">
                <h3>Chat History</h3>
                <button className="close-btn" onClick={() => setIsOpen(false)}>
                    <FiX />
                </button>
            </div>

            <button className="new-chat-btn" onClick={onNewChat}>
                <FiMessageSquare /> New Chat
            </button>

            <div className="history-list">
                {loading ? (
                    <div className="loading">Loading...</div>
                ) : (
                    <>
                        {renderConversationList(conversations.today, 'Today')}
                        {renderConversationList(conversations.yesterday, 'Yesterday')}
                        {renderConversationList(conversations.lastWeek, 'Last 7 Days')}
                        {renderConversationList(conversations.lastMonth, 'Last 30 Days')}
                        {renderConversationList(conversations.older, 'Older')}

                        {Object.values(conversations).every(arr => arr.length === 0) && !loading && (
                            <div className="empty-state">
                                <FiMessageSquare size={48} />
                                <p>No conversation history yet</p>
                                <p className="hint">Start chatting to create history</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {Object.values(conversations).some(arr => arr.length > 0) && (
                <button className="clear-history-btn" onClick={clearAllHistory}>
                    <FiTrash2 /> Clear All History
                </button>
            )}
        </div>
    );
};

export default ChatHistorySidebar;
