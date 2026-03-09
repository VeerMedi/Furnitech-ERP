// Utility component to make any card draggable
import React from 'react';
import { GripVertical } from 'lucide-react';

export const DraggableCardWrapper = ({
    cardId,
    cardTitle,
    children,
    onDragStart,
    onDragEnd,
    className = "bg-white rounded-2xl p-6 border border-red-200 shadow-lg"
}) => {
    const handleDragStart = (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('cardId', cardId);
        e.dataTransfer.setData('cardTitle', cardTitle);
        if (onDragStart) onDragStart(cardId, cardTitle);
    };

    return (
        <div
            draggable="true"
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            className={`relative group ${className} cursor-grab active:cursor-grabbing hover:shadow-xl transition-all`}
        >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
            {children}
        </div>
    );
};

export default DraggableCardWrapper;
