import React, { useState } from 'react';
import { Bot, User, AlertCircle, Copy, Check } from 'lucide-react';
import './aiChat.css';

const ChatMessage = ({ message, onSuggestionClick }) => {
    const { type, text, timestamp, suggestions, confidence } = message;
    const [copied, setCopied] = useState(false);

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (type === 'user') {
        return (
            <div className="chat-message user-message">
                <div className="message-avatar user-avatar">
                    <User size={16} />
                </div>
                <div className="message-content">
                    <div className="message-text">{text}</div>
                    <div className="message-time">{formatTime(timestamp)}</div>
                </div>
            </div>
        );
    }

    if (type === 'ai' || type === 'welcome') {
        return (
            <div className="chat-message ai-message">
                <div className="message-avatar ai-avatar">
                    <Bot size={16} />
                </div>
                <div className="message-content">
                    <div className="message-text">
                        {text.split('\n').map((line, i) => (
                            <React.Fragment key={i}>
                                {formatMessageLine(line)}
                                {i < text.split('\n').length - 1 && <br />}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Copy button for AI responses */}
                    <button
                        className="copy-button"
                        onClick={handleCopy}
                        title={copied ? 'Copied!' : 'Copy response'}
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>

                    {suggestions && suggestions.length > 0 && (
                        <div className="message-suggestions">
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    className="suggestion-chip"
                                    onClick={() => onSuggestionClick(suggestion)}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="message-footer">
                        <div className="message-time">{formatTime(timestamp)}</div>
                        {confidence !== undefined && confidence < 1 && (
                            <div className="message-confidence">
                                {Math.round(confidence * 100)}% confident
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (type === 'error') {
        return (
            <div className="chat-message error-message">
                <div className="message-avatar error-avatar">
                    <AlertCircle size={16} />
                </div>
                <div className="message-content">
                    <div className="message-text">{text}</div>
                    <div className="message-time">{formatTime(timestamp)}</div>
                </div>
            </div>
        );
    }

    return null;
};

// Helper function to format message lines with markdown-like styling
const formatMessageLine = (line) => {
    // Bold text (**text**)
    if (line.includes('**')) {
        const parts = line.split('**');
        return parts.map((part, i) =>
            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        );
    }

    // Bullets (• or -)
    if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return <span className="bullet-point">{line}</span>;
    }

    // Numbers (1. 2. etc.)
    if (/^\d+\./.test(line.trim())) {
        return <span className="numbered-point">{line}</span>;
    }

    return line;
};

export default ChatMessage;
