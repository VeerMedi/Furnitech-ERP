// Process assignment section component for Production Manager
// This will be added below each production workflow step in PreProductionOrderDetails.jsx

import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { Users, Check } from 'lucide-react';

export const ProcessAssignment = ({ process, processLabel, currentAssignment, onAssign, productType }) => {
    const [workers, setWorkers] = useState([]);
    const [selectedWorker, setSelectedWorker] = useState(currentAssignment || '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchWorkers();
    }, [process]);

    useEffect(() => {
        // Update selected worker when currentAssignment changes
        setSelectedWorker(currentAssignment || '');
    }, [currentAssignment]);

    const fetchWorkers = async () => {
        try {
            setLoading(true);
            const response = await userAPI.getProductionWorkers(process, productType);
            setWorkers(response.data.data || []);
        } catch (error) {
            console.error(`Failed to fetch workers for ${process}:`, error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = () => {
        if (selectedWorker) {
            onAssign(process, selectedWorker, productType);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-semibold text-gray-700">
                    Worker Assignment
                </label>
            </div>

            <div className="space-y-2">
                <select
                    value={selectedWorker}
                    onChange={(e) => setSelectedWorker(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                    disabled={loading}
                >
                    <option value="">-- Select Worker --</option>
                    {workers.map((worker) => (
                        <option key={worker._id} value={worker._id}>
                            {worker.firstName} {worker.lastName}
                        </option>
                    ))}
                </select>

                <button
                    onClick={handleAssign}
                    disabled={!selectedWorker || loading}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {currentAssignment ? 'Update Assignment' : 'Assign Worker'}
                </button>

                {currentAssignment && (
                    <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                        <Check className="w-4 h-4" />
                        <span className="font-medium">Worker assigned to this process</span>
                    </div>
                )}
            </div>
        </div>
    );
};
