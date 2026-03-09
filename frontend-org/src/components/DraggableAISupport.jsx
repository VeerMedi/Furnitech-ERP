import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, X, MessageCircle } from 'lucide-react';

const DraggableAISupport = () => {
    const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 120 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [collapseSide, setCollapseSide] = useState(null); // 'left' or 'right'
    const widgetRef = useRef(null);

    const EDGE_THRESHOLD = 100; // Distance from edge to trigger collapse
    const WIDGET_WIDTH = 400;

    // Drag handlers
    const handleMouseDown = (e) => {
        if (isCollapsed) return;
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
            // Near left edge
            setIsCollapsed(true);
            setCollapseSide('left');
            setPosition({ x: 0, y: position.y });
        } else if (position.x + WIDGET_WIDTH > screenWidth - EDGE_THRESHOLD) {
            // Near right edge
            setIsCollapsed(true);
            setCollapseSide('right');
            setPosition({ x: screenWidth - 60, y: position.y });
        }
    };

    const handleExpand = () => {
        setIsCollapsed(false);
        const screenWidth = window.innerWidth;

        if (collapseSide === 'left') {
            setPosition({ x: 20, y: position.y });
        } else {
            setPosition({ x: screenWidth - WIDGET_WIDTH - 20, y: position.y });
        }
        setCollapseSide(null);
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

    // Collapsed state - Arrow button
    if (isCollapsed) {
        return (
            <button
                onClick={handleExpand}
                className={`fixed top-1/2 transform -translate-y-1/2 bg-gradient-to-b from-red-600 to-red-700 text-white p-4 shadow-2xl hover:scale-110 transition-all z-50 ${collapseSide === 'left' ? 'left-0 rounded-r-xl' : 'right-0 rounded-l-xl'
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

    // Expanded state - Full widget
    return (
        <div
            ref={widgetRef}
            className="fixed bg-gradient-to-br from-red-600 to-red-700 text-white rounded-2xl shadow-2xl p-6 z-50"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: '400px',
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">THH Pilot </h3>
                        <p className="text-xs text-white/80">Your System Guide</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsCollapsed(true)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                        <MessageCircle className="w-5 h-5 mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold mb-1">Stuck? Ask THH Pilot !</h4>
                            <p className="text-sm text-white/90">
                                I can help you create orders, check status, or find any feature in the system.
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    className="w-full bg-white text-red-700 font-semibold py-3 px-4 rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center space-x-2"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-ai-chat'));
                    }}
                >
                    <MessageCircle className="w-5 h-5" />
                    <span>Start Chat</span>
                </button>

                <p className="text-xs text-center text-white/70">
                    Drag me to screen edges to minimize
                </p>
            </div>
        </div>
    );
};

export default DraggableAISupport;
