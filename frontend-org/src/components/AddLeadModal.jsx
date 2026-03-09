import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import Input from './Input';

const STAGES = [
    { value: 'NEW', label: 'New' },
    { value: 'CONTACTED', label: 'Contacted' },
    { value: 'QUALIFIED', label: 'Qualified' },
    { value: 'UNQUALIFIED', label: 'Unqualified' },
    { value: 'CONVERTED', label: 'Converted' },
    { value: 'LOST', label: 'Lost' },
];

const AddLeadModal = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        title: '',
        contact: {
            name: '',
            email: '',
            phone: '',
        },
        company: '',
        status: 'NEW',
        estimatedValue: '',
        probability: '50',
        notes: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name.startsWith('contact.')) {
            const contactField = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                contact: {
                    ...prev.contact,
                    [contactField]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Validate required fields
            if (!formData.title || !formData.contact.name || !formData.contact.email) {
                setError('Please fill in all required fields');
                setLoading(false);
                return;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.contact.email)) {
                setError('Please enter a valid email address');
                setLoading(false);
                return;
            }

            // Validate probability
            const prob = parseInt(formData.probability);
            if (prob < 0 || prob > 100) {
                setError('Probability must be between 0 and 100');
                setLoading(false);
                return;
            }

            // Prepare data for API - match backend Lead model structure
            const leadData = {
                title: formData.title,
                contact: {
                    name: formData.contact.name,
                    email: formData.contact.email,
                    phone: formData.contact.phone || undefined,
                },
                status: formData.status,
                estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
                probability: parseInt(formData.probability),
                notes: formData.notes || undefined,
                description: formData.company ? `Company: ${formData.company}` : undefined,
            };

            // Remove undefined fields
            Object.keys(leadData).forEach(key => {
                if (leadData[key] === undefined) {
                    delete leadData[key];
                }
            });

            // Import api dynamically to avoid circular dependencies
            const { default: api } = await import('../services/api');
            await api.post('/crm/leads', leadData);

            // Reset form
            setFormData({
                title: '',
                contact: {
                    name: '',
                    email: '',
                    phone: '',
                },
                company: '',
                status: 'NEW',
                estimatedValue: '',
                probability: '50',
                notes: '',
            });

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error creating lead:', err);
            console.error('Backend response:', err.response?.data);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to create lead';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl border border-gray-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">Add New Lead</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="px-6 py-4">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="e.g., Acme Corp - Office Furniture"
                                    required
                                />
                            </div>

                            {/* Contact Information */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contact Name <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        name="contact.name"
                                        value={formData.contact.name}
                                        onChange={handleChange}
                                        placeholder="John Smith"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contact Email <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        type="email"
                                        name="contact.email"
                                        value={formData.contact.email}
                                        onChange={handleChange}
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contact Phone
                                    </label>
                                    <Input
                                        name="contact.phone"
                                        value={formData.contact.phone}
                                        onChange={handleChange}
                                        placeholder="+1 (555) 123-4567"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Company
                                    </label>
                                    <Input
                                        name="company"
                                        value={formData.company}
                                        onChange={handleChange}
                                        placeholder="Acme Corporation"
                                    />
                                </div>
                            </div>

                            {/* Status/Stage */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Stage
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    {STAGES.map(stage => (
                                        <option key={stage.value} value={stage.value}>
                                            {stage.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Estimated Value and Probability */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Estimated Value ($)
                                    </label>
                                    <Input
                                        type="number"
                                        name="estimatedValue"
                                        value={formData.estimatedValue}
                                        onChange={handleChange}
                                        placeholder="15000"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Probability (%)
                                    </label>
                                    <Input
                                        type="number"
                                        name="probability"
                                        value={formData.probability}
                                        onChange={handleChange}
                                        placeholder="50"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows="3"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="Additional information about this lead..."
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                loading={loading}
                                disabled={loading}
                                className="bg-red-500 hover:bg-red-600"
                            >
                                {loading ? 'Creating...' : 'Create Lead'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddLeadModal;
