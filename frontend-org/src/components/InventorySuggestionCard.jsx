import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle, TrendingDown, Lightbulb, Settings, Check, X as XIcon } from 'lucide-react';
import api from '../services/api';
import './InventorySuggestionCard.css';

const InventorySuggestionCard = ({ suggestion, onConfirm, onDismiss, onSettingsUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [minStock, setMinStock] = useState(suggestion.minThreshold || 0);
    const [reorderQty, setReorderQty] = useState(suggestion.suggestedQuantity || 0);
    const [saving, setSaving] = useState(false);

    const getPriorityConfig = () => {
        switch (suggestion.priority) {
            case 'critical':
                return {
                    icon: AlertTriangle,
                    bgColor: 'white',
                    borderColor: '#dc2626',
                    badgeColor: '#dc2626',
                    badgeText: 'CRITICAL',
                };
            case 'high':
                return {
                    icon: AlertCircle,
                    bgColor: 'white',
                    borderColor: '#ea580c',
                    badgeColor: '#ea580c',
                    badgeText: 'HIGH',
                };
            case 'medium':
                return {
                    icon: TrendingDown,
                    bgColor: 'white',
                    borderColor: '#f59e0b',
                    badgeColor: '#f59e0b',
                    badgeText: 'MEDIUM',
                };
            default:
                return {
                    icon: Lightbulb,
                    bgColor: 'white',
                    borderColor: '#3b82f6',
                    badgeColor: '#3b82f6',
                    badgeText: 'LOW',
                };
        }
    };

    const config = getPriorityConfig();
    const Icon = config.icon;

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            const response = await api.patch(`/inventory/items/${suggestion.rawMaterial}/reorder-settings`, {
                minStockLevel: minStock,
                reorderQuantity: reorderQty
            });

            if (response.data.success) {
                setIsEditing(false);
                if (onSettingsUpdate) {
                    onSettingsUpdate();
                }
                alert('✅ Reorder settings updated successfully!');
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            alert('❌ Failed to update settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setMinStock(suggestion.minThreshold || 0);
        setReorderQty(suggestion.suggestedQuantity || 0);
        setIsEditing(false);
    };

    return (
        <div
            className="inventory-suggestion-card"
            style={{
                background: config.bgColor,
                borderLeft: `4px solid ${config.borderColor}`,
            }}
        >
            <button
                className="suggestion-close-btn"
                onClick={() => onDismiss(suggestion._id)}
                aria-label="Dismiss suggestion"
            >
                <X size={16} />
            </button>

            <div className="suggestion-header">
                <div className="suggestion-icon" style={{ color: config.borderColor }}>
                    <Icon size={24} />
                </div>
                <span
                    className="suggestion-priority-badge"
                    style={{ backgroundColor: config.badgeColor }}
                >
                    {config.badgeText}
                </span>
                <button
                    className="suggestion-settings-btn"
                    onClick={() => setIsEditing(!isEditing)}
                    title="Configure reorder settings"
                    style={{ marginLeft: 'auto', color: config.borderColor }}
                >
                    <Settings size={18} />
                </button>
            </div>

            <div className="suggestion-message">
                {suggestion.message}
            </div>

            <div className="suggestion-details">
                <div className="detail-row">
                    <span className="detail-label">Material:</span>
                    <span className="detail-value font-semibold">{suggestion.materialName}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Current Stock:</span>
                    <span className="detail-value" style={{ color: config.borderColor }}>
                        {suggestion.currentStock} {suggestion.unit}
                    </span>
                </div>

                <div className="detail-row">
                    <span className="detail-label">Minimum Level:</span>
                    {isEditing ? (
                        <input
                            type="number"
                            className="detail-input"
                            value={minStock}
                            onChange={(e) => setMinStock(Number(e.target.value))}
                            min="0"
                        />
                    ) : (
                        <span className="detail-value">{suggestion.minThreshold} {suggestion.unit}</span>
                    )}
                </div>

                <div className="detail-row">
                    <span className="detail-label">Suggested Quantity:</span>
                    {isEditing ? (
                        <input
                            type="number"
                            className="detail-input"
                            value={reorderQty}
                            onChange={(e) => setReorderQty(Number(e.target.value))}
                            min="1"
                        />
                    ) : (
                        <span className="detail-value font-semibold">
                            {suggestion.suggestedQuantity} {suggestion.unit}
                        </span>
                    )}
                </div>
            </div>

            {isEditing && (
                <div className="suggestion-edit-controls">
                    <button
                        className="edit-btn edit-btn-save"
                        onClick={handleSaveSettings}
                        disabled={saving}
                    >
                        <Check size={16} />
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        className="edit-btn edit-btn-cancel"
                        onClick={handleCancelEdit}
                        disabled={saving}
                    >
                        <XIcon size={16} />
                        Cancel
                    </button>
                </div>
            )}

            {!isEditing && (
                <div className="suggestion-actions">
                    <button
                        className="suggestion-btn suggestion-btn-confirm"
                        onClick={() => onConfirm(suggestion)}
                    >
                        Confirm & Create PO
                    </button>
                    <button
                        className="suggestion-btn suggestion-btn-ignore"
                        onClick={() => onDismiss(suggestion._id)}
                    >
                        Ignore for now
                    </button>
                </div>
            )}

            <div className="suggestion-timestamp">
                Detected: {new Date(suggestion.metadata?.detectedAt).toLocaleString()}
            </div>
        </div>
    );
};

export default InventorySuggestionCard;
