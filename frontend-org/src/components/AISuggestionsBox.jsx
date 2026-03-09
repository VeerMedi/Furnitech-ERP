import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import InventorySuggestionCard from './InventorySuggestionCard';
import PORecommendationModal from './PORecommendationModal';
import api from '../services/api';
import { toast } from '../hooks/useToast';
import './AISuggestionsBox.css';

const AISuggestionsBox = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [loading, setLoading] = useState(true);

    // Fetch suggestions on mount
    useEffect(() => {
        fetchSuggestions();
        // Poll every 60 seconds
        const interval = setInterval(fetchSuggestions, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchSuggestions = async (forceRefresh = false) => {
        try {
            setLoading(true);

            // If manual refresh, trigger analysis first
            if (forceRefresh) {
                await api.post('/inventory/check-stock');
            }

            const response = await api.get('/inventory/suggestions');
            setSuggestions(response.data.data || []);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            if (forceRefresh && error.response?.status === 402) {
                toast.error(error.response.data.message || 'Insufficient tokens for refresh.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = (suggestion) => {
        setSelectedSuggestion(suggestion);
        setShowModal(true);
    };

    const handleDismiss = async (suggestionId) => {
        try {
            await api.post(`/inventory/suggestions/${suggestionId}/dismiss`, {
                notes: 'Dismissed from dashboard',
            });
            setSuggestions(prev => prev.filter(s => s._id !== suggestionId));
        } catch (error) {
            console.error('Error dismissing suggestion:', error);
        }
    };

    const handlePOSuccess = () => {
        fetchSuggestions();
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // Get priority badge color
    const getPriorityCount = () => {
        const critical = suggestions.filter(s => s.priority === 'critical').length;
        const high = suggestions.filter(s => s.priority === 'high').length;
        const medium = suggestions.filter(s => s.priority === 'medium').length;
        const low = suggestions.filter(s => s.priority === 'low').length;

        return { critical, high, medium, low, total: suggestions.length };
    };

    const counts = getPriorityCount();

    return (
        <>
            <div className="ai-suggestions-box">
                {/* Header */}
                <div className="suggestions-box-header">
                    <div className="header-left">
                        <div className="ai-icon-wrapper">
                            <Sparkles size={24} className="ai-icon" />
                        </div>
                        <div className="header-text">
                            <h2 className="box-title">AI Suggestions</h2>
                            <p className="box-subtitle">
                                {loading ? 'Loading...' :
                                    suggestions.length === 0 ? 'All stock levels healthy' :
                                        `${suggestions.length} recommendation${suggestions.length !== 1 ? 's' : ''} available`}
                            </p>
                        </div>
                    </div>
                    <div className="header-right">
                        {suggestions.length > 0 && (
                            <div className="priority-badges">
                                {counts.critical > 0 && (
                                    <span className="priority-badge critical">{counts.critical} Critical</span>
                                )}
                                {counts.high > 0 && (
                                    <span className="priority-badge high">{counts.high} High</span>
                                )}
                                {counts.medium > 0 && (
                                    <span className="priority-badge medium">{counts.medium} Medium</span>
                                )}
                            </div>
                        )}
                        <button
                            className="refresh-btn"
                            onClick={() => fetchSuggestions(true)}
                            title="Refresh suggestions"
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button
                            className="expand-btn"
                            onClick={toggleExpand}
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                    </div>
                </div>

                {/* Body */}
                {isExpanded && (
                    <div className="suggestions-box-body">
                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner-small"></div>
                                <p>Loading suggestions...</p>
                            </div>
                        ) : suggestions.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">✨</div>
                                <h3 className="empty-title">All Clear!</h3>
                                <p className="empty-text">
                                    Your inventory is well-stocked. No recommendations at this time.
                                </p>
                            </div>
                        ) : (
                            <div className="suggestions-grid">
                                {suggestions.map((suggestion) => (
                                    <InventorySuggestionCard
                                        key={suggestion._id}
                                        suggestion={suggestion}
                                        onConfirm={handleConfirm}
                                        onDismiss={handleDismiss}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* PO Modal */}
            {showModal && selectedSuggestion && (
                <PORecommendationModal
                    suggestion={selectedSuggestion}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedSuggestion(null);
                    }}
                    onSuccess={handlePOSuccess}
                />
            )}
        </>
    );
};

export default AISuggestionsBox;
