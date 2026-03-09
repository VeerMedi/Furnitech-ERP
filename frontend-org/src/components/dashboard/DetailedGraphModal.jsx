import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';

const DetailedGraphModal = ({ isOpen, onClose, cardTitle, chartData, trend }) => {
    if (!isOpen) return null;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                displayColors: false,
                callbacks: {
                    label: (context) => `Value: ${context.parsed.y}`
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    color: '#6B7280',
                    font: {
                        size: 11
                    }
                }
            },
            y: {
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    color: '#6B7280',
                    font: {
                        size: 11
                    }
                },
                beginAtZero: true
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    };

    // Safely format trend percentage
    const formatTrendPercentage = (percentage) => {
        if (percentage === Infinity || percentage === -Infinity || isNaN(percentage)) {
            return '—';
        }
        return `${Math.abs(percentage)}%`;
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
                    >
                        {/* Modal Content Wrapper - Enable pointer events */}
                        <div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{cardTitle}</h2>
                                    <p className="text-sm text-gray-500 mt-1">12-Month Historical Trend</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {/* Trend Info */}
                                {trend && (
                                    <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-sm text-gray-600 font-medium">Trend Analysis</span>
                                                <p className="text-xs text-gray-500 mt-1">Month-over-month comparison</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-2xl font-bold ${trend.textColor || 'text-gray-700'}`}>
                                                    {trend.trend === 'down' ? '-' : '+'}
                                                    {formatTrendPercentage(trend.percentage)}
                                                </span>
                                                <p className="text-xs text-gray-500 mt-1 capitalize">{trend.trend || 'stable'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Graph */}
                                <div className="h-[400px] bg-white rounded-lg">
                                    {chartData && chartData.datasets && chartData.datasets.length > 0 ? (
                                        <Line data={chartData} options={chartOptions} />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            <div className="text-center">
                                                <p className="text-lg font-medium">No data available</p>
                                                <p className="text-sm mt-2">Graph data not found</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-200 bg-gray-50">
                                <button
                                    onClick={onClose}
                                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default DetailedGraphModal;
