import React from 'react';
import ReactDOM from 'react-dom';
import { BarChart3 } from 'lucide-react';

const GraphDropZone = ({ visible, onDrop }) => {
    if (!visible) return null;

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const cardId = e.dataTransfer.getData('cardId');
        const cardTitle = e.dataTransfer.getData('cardTitle');
        if (onDrop) onDrop(cardId, cardTitle);
    };

    return ReactDOM.createPortal(
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999]">
            <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce"
            >
                <div className="p-3 bg-white/20 rounded-lg">
                    <BarChart3 className="w-8 h-8" />
                </div>
                <div>
                    <p className="font-bold text-lg">Drop Here for Analytics</p>
                    <p className="text-sm text-red-100">View 12-month trend graph</p>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GraphDropZone;
