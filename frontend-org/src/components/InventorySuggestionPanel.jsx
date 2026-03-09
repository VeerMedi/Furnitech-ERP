import React, { useState, useEffect } from 'react';
import { Bell, X, ChevronRight } from 'lucide-react';
import InventorySuggestionCard from './InventorySuggestionCard';
import PORecommendationModal from './PORecommendationModal';
import api from '../services/api';
import './InventorySuggestionPanel.css';

const InventorySuggestionPanel = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isOpen, setIsOpen] = useState(false); // Start closed by default

    // Poll for suggestions every 60 seconds
    useEffect(() => {
        fetchSuggestions();
        const interval = setInterval(fetchSuggestions, 60000);
        return () => clearInterval(interval);
    }, []);

    // Auto-open when new suggestions arrive
    useEffect(() => {
        if (suggestions.length > 0 && !isOpen) {
            // Optional: auto-open when critical suggestions arrive
            const hasCritical = suggestions.some(s => s.priority === 'critical');
            if (hasCritical) {
                setIsOpen(true);
            }
        }
    }, [suggestions]);

    const fetchSuggestions = async () => {
        try {
            const response = await api.get('/inventory/suggestions');
            setSuggestions(response.data.data || []);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
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
            // Remove from local state
            setSuggestions(prev => prev.filter(s => s._id !== suggestionId));
        } catch (error) {
            console.error('Error dismissing suggestion:', error);
        }
    };

    const handlePOSuccess = () => {
        // Refresh suggestions after successful PO creation
        fetchSuggestions();
    };

    const togglePanel = () => {
        setIsOpen(!isOpen);
    };

    // Don't render anything if no suggestions and panel is closed
    if (suggestions.length === 0 && !isOpen) return null;

    return (
        <>
            {/* Floating Action Button - always visible when there are suggestions */}
            {suggestions.length > 0 && !isOpen && (
                <button
                    className="floating-suggestion-btn"
                    onClick={togglePanel}
                    aria-label="Open AI Recommendations"
                >
                    <Bell size={24} className="bell-icon" />
                    <span className="floating-badge">{suggestions.length}</span>
                    <span className="floating-pulse"></span>
                </button>
            )}

            {/* Sliding Panel */}
            <div className={`suggestion-panel ${isOpen ? 'open' : 'closed'}`}>
                {/* Header */}
                <div className="panel-header">
                    <div className="panel-title-section">
                        <Bell size={20} className="header-icon" />
                        <div className="panel-title-text">
                            <h3 className="panel-title">AI Recommendations</h3>
                            <p className="panel-subtitle">
                                {suggestions.length === 0
                                    ? 'All stock levels healthy'
                                    : `${suggestions.length} ${suggestions.length === 1 ? 'suggestion' : 'suggestions'}`}
                            </p>
                        </div>
                    </div>
                    <button
                        className="panel-close-btn"
                        onClick={togglePanel}
                        aria-label="Close panel"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="panel-body">
                    {suggestions.length === 0 ? (
                        <div className="no-suggestions">
                            <div className="no-suggestions-icon">✅</div>
                            <p className="no-suggestions-title">All Clear!</p>
                            <span className="no-suggestions-text">
                                All stock levels are healthy. No recommendations at this time.
                            </span>
                        </div>
                    ) : (
                        <div className="suggestions-list">
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
            </div>

            {/* Overlay when panel is open (for mobile/tablet) */}
            {isOpen && (
                <div
                    className="panel-overlay"
                    onClick={togglePanel}
                />
            )}

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

export default InventorySuggestionPanel;
