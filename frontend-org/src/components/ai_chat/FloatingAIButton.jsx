import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import ChatPanel from './ChatPanel';
import './aiChat.css';

const FloatingAIButton = ({ userRole = 'poc' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [hasNewMessages, setHasNewMessages] = useState(false);
    const [position, setPosition] = useState({
        x: window.innerWidth - 100,  // Bottom-right corner
        y: window.innerHeight - 100
    });
    const [isDragging, setIsDragging] = useState(false);
    const [hasDragged, setHasDragged] = useState(false); // Track if actually dragged
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [collapseSide, setCollapseSide] = useState(null); // 'left' or 'right'

    const EDGE_THRESHOLD = 10; // Distance from edge to trigger collapse (Must be very close to touch)

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setHasNewMessages(false);
        }
    };

    // Drag handlers
    const handleMouseDown = (e) => {
        if (isCollapsed || isOpen) return; // Don't drag when collapsed or chat is open
        e.preventDefault();
        setIsDragging(true);
        setHasDragged(false); // Reset drag flag
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        setHasDragged(true); // User is actually dragging

        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;

        // Screen boundaries
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const buttonSize = 64;
        const padding = 10;

        // Constrain X
        if (newX < padding) newX = padding;
        if (newX + buttonSize > screenWidth - padding) newX = screenWidth - buttonSize - padding;

        // Constrain Y
        if (newY < padding) newY = padding;
        if (newY + buttonSize > screenHeight - padding) newY = screenHeight - buttonSize - padding;

        setPosition({
            x: newX,
            y: newY
        });
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);

        // ONLY check edge if user actually dragged (not just clicked)
        if (!hasDragged) return;

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
        if (!isDragging && !hasDragged) {
            toggleChat();
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

    useEffect(() => {
        const handleOpenChat = () => {
            setIsOpen(true);
        };

        window.addEventListener('open-ai-chat', handleOpenChat);
        return () => window.removeEventListener('open-ai-chat', handleOpenChat);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+K or Cmd+K to toggle chat
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                toggleChat();
            }
            // Esc to close chat
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Collapsed state - Arrow button on edge
    if (isCollapsed) {
        return (
            <>
                {/* Chat Panel */}
                {isOpen && (
                    <ChatPanel
                        userRole={userRole}
                        onClose={() => setIsOpen(false)}
                        buttonPosition={position}
                    />
                )}

                {/* Collapsed Arrow Button - Transparent with Blur */}
                <button
                    onClick={handleExpand}
                    className={`fixed transform -translate-y-1/2 bg-white/10 backdrop-blur-sm text-red-700 p-1 rounded-full hover:scale-125 transition-all z-[9999] ${collapseSide === 'left' ? '-left-2' : '-right-2'
                        }`}
                    style={{ top: `${position.y}px` }}
                    title="Expand AI Support"
                >
                    {collapseSide === 'left' ? (
                        <ChevronRight className="w-8 h-8 drop-shadow-md" />
                    ) : (
                        <ChevronLeft className="w-8 h-8 drop-shadow-md" />
                    )}
                </button>
            </>
        );
    }

    return (
        <>
            {/* Chat Panel */}
            {isOpen && (
                <ChatPanel
                    userRole={userRole}
                    onClose={() => setIsOpen(false)}
                    buttonPosition={position}
                />
            )}

            {/* Floating Button - Draggable */}
            <button
                className={`floating-ai-button ${isOpen ? 'active' : ''}`}
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    cursor: isDragging ? 'grabbing' : (isOpen ? 'pointer' : 'grab'),
                    position: 'fixed',
                    transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' // Disable transition during drag
                }}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
                title="THH Pilot  - System Guide (Drag to edges) (Ctrl+K)"
            >
                {isOpen ? (
                    <X size={24} />
                ) : (
                    <>
                        <MessageCircle size={24} />
                        {hasNewMessages && <span className="notification-badge"></span>}
                    </>
                )}
            </button>
        </>
    );
};

export default FloatingAIButton;
