import React, { useEffect } from 'react';
import { X, RotateCcw, Sparkles } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import useChatSupport from './useChatSupport';
import './aiChat.css';

const ChatPanel = ({ userRole, onClose, buttonPosition }) => {
    const {
        messages,
        isLoading,
        error,
        sendMessage,
        sendSuggestion,
        clearMessages,
        messagesEndRef
    } = useChatSupport(userRole);

    // Calculate chat panel position based on button position
    const chatPanelStyle = buttonPosition ? (() => {
        const panelWidth = 420;
        const panelHeight = 650;
        const buttonSize = 64; // Approx size of button
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const margin = 20;
        const padding = 10;

        let left, top;

        // Horizontal Positioning: Open to the side containing the most space
        // Or simply: Left half -> open Right, Right half -> open Left
        if (buttonPosition.x < screenWidth / 2) {
            // Button on Left side -> Open to the RIGHT
            left = buttonPosition.x + buttonSize + margin;
        } else {
            // Button on Right side -> Open to the LEFT
            left = buttonPosition.x - panelWidth - margin;
        }

        // Vertical Positioning: Smart Up/Down
        if (buttonPosition.y < screenHeight / 2) {
            // Button is in Top Half -> Open DOWNWARDS (Align Top of Panel with Top of Button)
            top = buttonPosition.y;
        } else {
            // Button is in Bottom Half -> Open UPWARDS (Align Bottom of Panel with Bottom of Button)
            top = (buttonPosition.y + buttonSize) - panelHeight;
        }

        // --- Boundary Checks ---

        // Top boundary (prevent going off-screen top)
        if (top < padding) {
            top = padding;
        }

        // Bottom boundary (prevent going off-screen bottom)
        if (top + panelHeight > screenHeight - padding) {
            top = screenHeight - panelHeight - padding;
        }

        // Left boundary (prevent going off-screen left)
        if (left < padding) {
            left = padding;
        }

        // Right boundary (prevent going off-screen right)
        if (left + panelWidth > screenWidth - padding) {
            left = screenWidth - panelWidth - padding;
        }

        return {
            left: `${left}px`,
            top: `${top}px`,
            right: 'auto', // Override CSS
            bottom: 'auto'  // Override CSS
        };
    })() : {};

    return (
        <div className="chat-panel" style={chatPanelStyle}>
            {/* Header */}
            <div className="chat-header">
                <div className="chat-title">
                    <Sparkles size={20} className="title-icon" />
                    <h3>THH Pilot  - System Guide</h3>
                </div>
                <div className="chat-header-actions">
                    <button
                        className="header-action-btn"
                        onClick={clearMessages}
                        title="Clear conversation"
                    >
                        <RotateCcw size={18} />
                    </button>
                    <button
                        className="header-action-btn close-btn"
                        onClick={onClose}
                        title="Close chat"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Role Indicator */}
            <div className="role-indicator">
                <div className="role-badge">{userRole.toUpperCase()}</div>
                <span className="role-text">Your personal system guide</span>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.map((message) => (
                    <ChatMessage
                        key={message.id}
                        message={message}
                        onSuggestionClick={sendSuggestion}
                    />
                ))}

                {isLoading && (
                    <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Error Display */}
            {error && (
                <div className="chat-error">
                    {error}
                </div>
            )}

            {/* Input */}
            <ChatInput
                onSendMessage={sendMessage}
                isLoading={isLoading}
                disabled={false}
            />

            {/* Footer */}
            <div className="chat-footer">
                <span>AI-powered support for Vlite Furniture ERP</span>
            </div>
        </div>
    );
};

export default ChatPanel;
