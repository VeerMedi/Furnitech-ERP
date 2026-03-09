import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import './AutomationSuggestions.css';

const AutomationSuggestions = ({ role = null }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchSuggestions();
        // Poll for new suggestions every 30 seconds
        const interval = setInterval(fetchSuggestions, 30000);
        return () => clearInterval(interval);
    }, [role]);

    const fetchSuggestions = async () => {
        try {
            setLoading(true);
            const url = role
                ? `/api/automation/suggestions?role=${role}`
                : '/api/automation/suggestions';

            const response = await axios.get(url);
            setSuggestions(response.data.suggestions || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching suggestions:', err);
            setError('Failed to load suggestions');
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (suggestionId) => {
        try {
            const response = await axios.post('/api/automation/confirm', {
                suggestion_id: suggestionId,
                confirmed: true
            });

            if (response.data.success) {
                // Show success message
                alert(`✅ Task created successfully! Task ID: ${response.data.task_id}`);
                // Refresh suggestions
                fetchSuggestions();
            }
        } catch (err) {
            console.error('Error confirming suggestion:', err);
            alert('❌ Failed to confirm suggestion');
        }
    };

    const handleDismiss = async (suggestionId) => {
        try {
            const response = await axios.post('/api/automation/confirm', {
                suggestion_id: suggestionId,
                confirmed: false
            });

            if (response.data.success) {
                // Refresh suggestions
                fetchSuggestions();
            }
        } catch (err) {
            console.error('Error dismissing suggestion:', err);
            alert('❌ Failed to dismiss suggestion');
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'priority-high';
            case 'medium': return 'priority-medium';
            case 'low': return 'priority-low';
            default: return 'priority-medium';
        }
    };

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'high': return <AlertCircle size={20} />;
            case 'medium': return <TrendingUp size={20} />;
            case 'low': return <Clock size={20} />;
            default: return <TrendingUp size={20} />;
        }
    };

    if (loading && suggestions.length === 0) {
        return (
            <div className="suggestions-container">
                <div className="suggestions-header">
                    <h3>🤖 AI Automation Suggestions</h3>
                </div>
                <div className="suggestions-loading">
                    <div className="spinner"></div>
                    <p>Loading suggestions...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="suggestions-container">
                <div className="suggestions-header">
                    <h3>🤖 AI Automation Suggestions</h3>
                </div>
                <div className="suggestions-error">
                    <AlertCircle size={32} />
                    <p>{error}</p>
                    <button onClick={fetchSuggestions} className="retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) {
        return (
            <div className="suggestions-container">
                <div className="suggestions-header">
                    <h3>🤖 AI Automation Suggestions</h3>
                    <span className="suggestion-count">0</span>
                </div>
                <div className="suggestions-empty">
                    <CheckCircle size={48} color="#43e97b" />
                    <p>All caught up! No pending suggestions.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="suggestions-container">
            <div className="suggestions-header">
                <h3>🤖 AI Automation Suggestions</h3>
                <span className="suggestion-count">{suggestions.length}</span>
            </div>

            <div className="suggestions-list">
                {suggestions.map((suggestion) => (
                    <div
                        key={suggestion.id}
                        className={`suggestion-card ${getPriorityColor(suggestion.priority)}`}
                    >
                        <div className="suggestion-priority">
                            {getPriorityIcon(suggestion.priority)}
                            <span className="priority-label">
                                {suggestion.priority?.toUpperCase() || 'MEDIUM'}
                            </span>
                        </div>

                        <div className="suggestion-content">
                            <div className="suggestion-message">
                                {suggestion.message}
                            </div>

                            <div className="suggestion-metadata">
                                <span className="suggestion-role">
                                    👤 {suggestion.role}
                                </span>
                                <span className="suggestion-type">
                                    ⚡ {suggestion.action?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                <span className="suggestion-entity">
                                    📋 {suggestion.entity_id}
                                </span>
                            </div>
                        </div>

                        <div className="suggestion-actions">
                            <button
                                onClick={() => handleConfirm(suggestion.id)}
                                className="btn-confirm"
                                title="Confirm and create task"
                            >
                                <CheckCircle size={18} />
                                Confirm
                            </button>
                            <button
                                onClick={() => handleDismiss(suggestion.id)}
                                className="btn-dismiss"
                                title="Dismiss suggestion"
                            >
                                <XCircle size={18} />
                                Dismiss
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="suggestions-footer">
                <button onClick={fetchSuggestions} className="refresh-btn">
                    🔄 Refresh
                </button>
            </div>
        </div>
    );
};

export default AutomationSuggestions;
