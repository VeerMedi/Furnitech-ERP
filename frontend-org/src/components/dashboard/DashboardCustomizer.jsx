import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Plus, Minus, Grid3x3, RotateCcw } from 'lucide-react';
import { AVAILABLE_CARDS, CARD_CATEGORIES, getDefaultLayout } from './CardLibrary';
import { confirm } from '../../hooks/useConfirm';

const DashboardCustomizer = ({ isOpen, onClose, enabledCards, onToggleCard, onResetLayout }) => {
    const [selectedCategory, setSelectedCategory] = useState('all');

    if (!isOpen) return null;

    const categories = ['all', ...Object.values(CARD_CATEGORIES)];

    const filteredCards = selectedCategory === 'all'
        ? AVAILABLE_CARDS
        : AVAILABLE_CARDS.filter(card => card.category === selectedCategory);

    const groupedCards = categories.reduce((acc, category) => {
        if (category === 'all') return acc;
        acc[category] = AVAILABLE_CARDS.filter(card => card.category === category);
        return acc;
    }, {});

    return ReactDOM.createPortal(
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border shadow-2xl z-[9999] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-border">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Grid3x3 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">Customize Dashboard</h2>
                                <p className="text-sm text-muted-foreground">Add or remove cards</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Reset Button */}
                    <button
                        onClick={async () => {
                            const confirmed = await confirm(
                                'Are you sure you want to reset the dashboard to default layout?',
                                'Reset Dashboard'
                            );
                            if (confirmed) {
                                onResetLayout();
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm font-medium"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset to Default
                    </button>
                </div>

                {/* Cards by Category */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {Object.entries(groupedCards).map(([category, cards]) => (
                        <div key={category}>
                            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <div className="w-1 h-4 bg-primary rounded-full" />
                                {category}
                            </h3>
                            <div className="space-y-2">
                                {cards.map(card => {
                                    const isEnabled = enabledCards.includes(card.id);

                                    return (
                                        <button
                                            key={card.id}
                                            onClick={() => onToggleCard(card.id)}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${isEnabled
                                                ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                                                : 'bg-muted/30 border-border hover:bg-muted/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded ${isEnabled ? 'bg-primary/10' : 'bg-muted'
                                                    }`}>
                                                    {isEnabled ? (
                                                        <Minus className="w-4 h-4 text-primary" />
                                                    ) : (
                                                        <Plus className="w-4 h-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <span className={`text-sm font-medium ${isEnabled ? 'text-foreground' : 'text-muted-foreground'
                                                    }`}>
                                                    {card.title}
                                                </span>
                                            </div>

                                            {isEnabled && (
                                                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                                                    Active
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Stats */}
                <div className="p-6 border-t border-border bg-muted/30">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Active Cards</span>
                        <span className="font-semibold text-foreground">{enabledCards.length} / {AVAILABLE_CARDS.length}</span>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

export default DashboardCustomizer;
