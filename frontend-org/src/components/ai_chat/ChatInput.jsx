import React, { useState } from 'react';
import { Send, Mic } from 'lucide-react';
import './aiChat.css';

const ChatInput = ({ onSendMessage, isLoading, disabled }) => {
    const [input, setInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form className="chat-input-container" onSubmit={handleSubmit}>
            <div className="input-wrapper">
                <input
                    type="text"
                    className="chat-input"
                    placeholder="Ask me anything about your ERP..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={disabled || isLoading}
                    maxLength={500}
                />

                <div className="input-actions">
                    {/* Microphone (disabled for now) */}
                    <button
                        type="button"
                        className="input-action-btn mic-btn"
                        disabled
                        title="Voice input (coming soon)"
                    >
                        <Mic size={18} />
                    </button>

                    {/* Send button */}
                    <button
                        type="submit"
                        className="input-action-btn send-btn"
                        disabled={!input.trim() || isLoading}
                        title="Send message"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>

            {input.length > 400 && (
                <div className="character-count">
                    {input.length}/500
                </div>
            )}
        </form>
    );
};

export default ChatInput;
