import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const DraggableAIButton = () => {
    const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [collapseSide, setCollapseSide] = useState(null); // 'left' or 'right'

    const EDGE_THRESHOLD = 150; // Distance from edge to trigger collapse

    // Drag handlers
    const handleMouseDown = (e) => {
        if (isCollapsed) return;
        e.preventDefault();
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        setPosition({
            x: newX,
            y: newY
        });
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);

        // Check if near edge
        const screenWidth = window.innerWidth;

        if (position.x < EDGE_THRESHOLD) {
            // Near left edge - collapse to left
            setIsCollapsed(true);
            setCollapseSide('left');
        } else if (position.x + 80 > screenWidth - EDGE_THRESHOLD) {
            // Near right edge - collapse to right
            setIsCollapsed(true);
            setCollapseSide('right');
        }
    };

    const handleExpand = () => {
        setIsCollapsed(false);
        const screenWidth = window.innerWidth;

        if (collapseSide === 'left') {
            setPosition({ x: 20, y: position.y });
        } else {
            setPosition({ x: screenWidth - 100, y: position.y });
        }
        setCollapseSide(null);
    };

    const handleClick = () => {
        if (!isDragging) {
            // Open AI Assistant or whatever action
            console.log('Opening AI Assistant...');
            // You can add your click logic here
        }
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset, position]);

    // Collapsed state - Arrow button on edge
    if (isCollapsed) {
        return (
            <button
                onClick={handleExpand}
                className={`fixed top-1/2 transform -translate-y-1/2 bg-gradient-to-b from-red-600 to-red-700 text-white p-3 shadow-2xl hover:scale-110 transition-all z-[9999] ${collapseSide === 'left' ? 'left-0 rounded-r-xl' : 'right-0 rounded-l-xl'
                    }`}
                style={{ top: `${position.y}px` }}
                title="Expand AI Support"
            >
                {collapseSide === 'left' ? (
                    <ChevronRight className="w-6 h-6" />
                ) : (
                    <ChevronLeft className="w-6 h-6" />
                )}
            </button>
        );
    }

    // Expanded state - Circular floating button
    return (
        <button
            className="fixed w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-full shadow-2xl hover:scale-110 transition-all z-[9999] flex items-center justify-center group"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            title="AI Support (Drag to screen edges)"
        >
            <MessageCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
    );
};

export default DraggableAIButton;
