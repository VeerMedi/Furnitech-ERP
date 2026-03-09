import React, { useState, useEffect } from 'react';
import { X, Calendar, Package, User, FileText, IndianRupee, Clock, Star } from 'lucide-react';
import api from '../services/api';
import './PORecommendationModal.css';

const PORecommendationModal = ({ suggestion, onClose, onSuccess }) => {
    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [formData, setFormData] = useState({
        quantity: suggestion.suggestedQuantity || 0,
        unitPrice: 0,
        expectedDeliveryDate: '',
        notes: '',
    });
    const [loading, setLoading] = useState(false);
    const [loadingVendors, setLoadingVendors] = useState(true);
    const [showSummary, setShowSummary] = useState(false);

    // Fetch vendor recommendations
    useEffect(() => {
        fetchVendorRecommendations();
    }, [suggestion]);

    //Auto-select first vendor and populate unit price
    useEffect(() => {
        if (vendors.length > 0 && !selectedVendor) {
            const firstVendor = vendors[0];
            setSelectedVendor(firstVendor);
            setFormData(prev => ({
                ...prev,
                unitPrice: firstVendor.lastPrice || 0,
            }));

            // Calculate expected delivery date
            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + (firstVendor.avgDeliveryTime || 7));
            setFormData(prev => ({
                ...prev,
                expectedDeliveryDate: deliveryDate.toISOString().split('T')[0],
            }));
        }
    }, [vendors]);

    const fetchVendorRecommendations = async () => {
        try {
            setLoadingVendors(true);
            const response = await api.get(`/inventory/vendors/recommend/${suggestion.rawMaterial}`);
            setVendors(response.data.data || []);
        } catch (error) {
            console.error('Error fetching vendor recommendations:', error);
        } finally {
            setLoadingVendors(false);
        }
    };

    const handleVendorChange = (vendorId) => {
        const vendor = vendors.find(v => v.vendorId === vendorId);
        if (vendor) {
            setSelectedVendor(vendor);
            setFormData(prev => ({
                ...prev,
                unitPrice: vendor.lastPrice || prev.unitPrice,
            }));

            // Update expected delivery date
            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + (vendor.avgDeliveryTime || 7));
            setFormData(prev => ({
                ...prev,
                expectedDeliveryDate: deliveryDate.toISOString().split('T')[0],
            }));
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const calculateTotal = () => {
        return (formData.quantity * formData.unitPrice).toFixed(2);
    };

    const handleProceedToSummary = () => {
        if (!selectedVendor || !formData.quantity || !formData.unitPrice) {
            alert('Please select a vendor and fill in all required fields');
            return;
        }
        setShowSummary(true);
    };

    const handleCreatePO = async () => {
        if (!selectedVendor) {
            alert('Please select a vendor');
            return;
        }

        try {
            setLoading(true);

            await api.post(`/inventory/suggestions/${suggestion._id}/confirm`, {
                vendorId: selectedVendor.vendorId,
                quantity: parseFloat(formData.quantity),
                unitPrice: parseFloat(formData.unitPrice),
                expectedDeliveryDate: formData.expectedDeliveryDate,
                notes: formData.notes,
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating PO:', error);
            alert('Failed to create Purchase Order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loadingVendors) {
        return (
            <div className="modal-overlay">
                <div className="po-modal">
                    <div className="modal-loading">
                        <div className="spinner"></div>
                        <p>Loading vendor recommendations...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="po-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="po-modal-header">
                    <h2 className="po-modal-title">
                        {showSummary ? 'Confirm Purchase Order' : 'Create Purchase Order'}
                    </h2>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="po-modal-body">
                    {!showSummary ? (
                        <>
                            {/* Material Information (Read-Only) */}
                            <div className="po-section">
                                <h3 className="section-title">Material Information</h3>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <Package className="info-icon" size={18} />
                                        <div>
                                            <label className="info-label">Material Name</label>
                                            <p className="info-value">{suggestion.materialName}</p>
                                        </div>
                                    </div>
                                    <div className="info-item">
                                        <div>
                                            <label className="info-label">Current Stock</label>
                                            <p className="info-value warning">{suggestion.currentStock} {suggestion.unit}</p>
                                        </div>
                                    </div>
                                    <div className="info-item">
                                        <div>
                                            <label className="info-label">Minimum Threshold</label>
                                            <p className="info-value">{suggestion.minThreshold} {suggestion.unit}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Order Details (Editable) */}
                            <div className="po-section">
                                <h3 className="section-title">Order Details</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">
                                            Suggested Order Quantity ({suggestion.unit})
                                        </label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.quantity}
                                            onChange={(e) => handleInputChange('quantity', e.target.value)}
                                            min="1"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">
                                            <IndianRupee size={14} className="inline" /> Unit Price
                                        </label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.unitPrice}
                                            onChange={(e) => handleInputChange('unitPrice', e.target.value)}
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">
                                            <Calendar size={14} className="inline" /> Expected Delivery Date
                                        </label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.expectedDeliveryDate}
                                            onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">
                                        <FileText size={14} className="inline" /> Notes (Optional)
                                    </label>
                                    <textarea
                                        className="form-textarea"
                                        value={formData.notes}
                                        onChange={(e) => handleInputChange('notes', e.target.value)}
                                        rows="3"
                                        placeholder="Add any additional notes..."
                                    />
                                </div>
                            </div>

                            {/* Vendor Selection */}
                            <div className="po-section">
                                <h3 className="section-title">Select Vendor</h3>
                                <div className="vendor-list">
                                    {vendors.length === 0 ? (
                                        <p className="no-vendors">No vendors available for this material</p>
                                    ) : (
                                        vendors.map((vendor) => (
                                            <div
                                                key={vendor.vendorId}
                                                className={`vendor-card ${selectedVendor?.vendorId === vendor.vendorId ? 'selected' : ''}`}
                                                onClick={() => handleVendorChange(vendor.vendorId)}
                                            >
                                                <div className="vendor-header">
                                                    <div className="vendor-name-section">
                                                        <User size={20} className="vendor-icon" />
                                                        <span className="vendor-name">{vendor.vendorName}</span>
                                                        {vendor.isPreferred && (
                                                            <span className="preferred-badge">
                                                                <Star size={14} fill="currentColor" /> Preferred
                                                            </span>
                                                        )}
                                                    </div>
                                                    {selectedVendor?.vendorId === vendor.vendorId && (
                                                        <div className="selected-check">✓</div>
                                                    )}
                                                </div>
                                                <div className="vendor-details">
                                                    {vendor.lastPrice && (
                                                        <span className="vendor-detail">
                                                            <IndianRupee size={14} /> ₹{vendor.lastPrice}/unit
                                                        </span>
                                                    )}
                                                    {vendor.avgDeliveryTime && (
                                                        <span className="vendor-detail">
                                                            <Clock size={14} /> Avg {vendor.avgDeliveryTime} days
                                                        </span>
                                                    )}
                                                    {vendor.rating && (
                                                        <span className="vendor-detail">
                                                            ⭐ {vendor.rating}/5
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Summary View */
                        <div className="po-summary">
                            <div className="summary-section">
                                <h3 className="summary-title">Order Summary</h3>
                                <div className="summary-grid">
                                    <div className="summary-row">
                                        <span>Material:</span>
                                        <strong>{suggestion.materialName}</strong>
                                    </div>
                                    <div className="summary-row">
                                        <span>Quantity:</span>
                                        <strong>{formData.quantity} {suggestion.unit}</strong>
                                    </div>
                                    <div className="summary-row">
                                        <span>Unit Price:</span>
                                        <strong>₹{formData.unitPrice}</strong>
                                    </div>
                                    <div className="summary-row total">
                                        <span>Estimated Total:</span>
                                        <strong>₹{calculateTotal()}</strong>
                                    </div>
                                    <div className="summary-row">
                                        <span>Vendor:</span>
                                        <strong>{selectedVendor?.vendorName}</strong>
                                    </div>
                                    <div className="summary-row">
                                        <span>Expected Delivery:</span>
                                        <strong>{new Date(formData.expectedDeliveryDate).toLocaleDateString()}</strong>
                                    </div>
                                    {formData.notes && (
                                        <div className="summary-row full">
                                            <span>Notes:</span>
                                            <p className="notes-text">{formData.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="po-modal-footer">
                    {!showSummary ? (
                        <>
                            <button className="po-btn po-btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button className="po-btn po-btn-primary" onClick={handleProceedToSummary}>
                                Review Order
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="po-btn po-btn-secondary" onClick={() => setShowSummary(false)}>
                                Back to Edit
                            </button>
                            <button
                                className="po-btn po-btn-success"
                                onClick={handleCreatePO}
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Purchase Order'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PORecommendationModal;
