import React, { useState, useEffect } from 'react';
import { Search, X, Package, Layers, Type } from 'lucide-react';

const ItemSelectorModal = ({ isOpen, onClose, onSelect, products = [], rawMaterials = [] }) => {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('products'); // 'products', 'materials', 'custom', 'text'
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState([]);

    // Custom item form state
    const [customItem, setCustomItem] = useState({
        description: '',
        quantity: 1,
        price: 0
    });

    // Text field state
    const [textContent, setTextContent] = useState('');

    useEffect(() => {
        if (activeTab === 'custom') return;

        let items = activeTab === 'products' ? products : rawMaterials;
        if (searchTerm) {
            items = items.filter(item =>
                item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFilteredItems(items);
    }, [activeTab, searchTerm, products, rawMaterials]);

    const handleSelect = (item) => {
        onSelect(item, activeTab);
        onClose();
        // Reset custom form
        setCustomItem({ description: '', quantity: 1, price: 0 });
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        if (!customItem.description) return;

        handleSelect({
            name: customItem.description,
            price: parseFloat(customItem.price) || 0,
            quantity: parseFloat(customItem.quantity) || 1,
            isCustom: true
        });
    };

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!textContent.trim()) return;

        handleSelect({
            name: textContent,
            price: 0,
            quantity: 0,
            isText: true
        });
        setTextContent('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-3xl h-[80vh] flex flex-col shadow-xl">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">Select Item</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs & Search */}
                <div className="p-4 border-b bg-gray-50 space-y-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'products' ? 'bg-red-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <Package className="w-4 h-4" />
                            Products
                        </button>
                        <button
                            onClick={() => setActiveTab('materials')}
                            className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'materials' ? 'bg-red-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <Layers className="w-4 h-4" />
                            Raw Materials
                        </button>
                        <button
                            onClick={() => setActiveTab('custom')}
                            className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'custom' ? 'bg-red-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <span className="w-4 h-4 font-bold flex items-center justify-center">+</span>
                            Custom
                        </button>
                        <button
                            onClick={() => setActiveTab('text')}
                            className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'text' ? 'bg-red-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <Type className="w-4 h-4" />
                            Add Text
                        </button>
                    </div>

                    {activeTab !== 'custom' && activeTab !== 'text' && (
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab === 'products' ? 'products' : 'materials'}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'text' ? (
                        <form onSubmit={handleTextSubmit} className="max-w-md mx-auto space-y-4 pt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Text Content *</label>
                                <textarea
                                    value={textContent}
                                    onChange={e => setTextContent(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    rows="6"
                                    placeholder="Enter text to add to quotation..."
                                    required
                                    autoFocus
                                />
                                <p className="text-xs text-gray-500 mt-1">This will be added as a text-only field in your quotation.</p>
                            </div>
                            <button
                                type="submit"
                                className="w-full mt-6 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors font-medium shadow-sm"
                            >
                                Add Text
                            </button>
                        </form>
                    ) : activeTab === 'custom' ? (
                        <form onSubmit={handleCustomSubmit} className="max-w-md mx-auto space-y-4 pt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                <textarea
                                    value={customItem.description}
                                    onChange={e => setCustomItem({ ...customItem, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    rows="4"
                                    placeholder="Enter item description..."
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        value={customItem.quantity}
                                        onChange={e => setCustomItem({ ...customItem, quantity: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                                        min="1"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate / Unit Price</label>
                                    <input
                                        type="number"
                                        value={customItem.price}
                                        onChange={e => setCustomItem({ ...customItem, price: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full mt-6 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors font-medium shadow-sm"
                            >
                                Add Custom Item
                            </button>
                        </form>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {filteredItems.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleSelect(item)}
                                    className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                                >
                                    <div>
                                        <p className="font-semibold text-gray-800">{item.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {activeTab === 'products'
                                                ? `Price: ₹${item.pricing?.sellingPrice || item.price || 0}`
                                                : `Stock: ${item.currentStock || 0} ${item.uom || ''} | Cost: ₹${item.costPrice || 0}`
                                            }
                                        </p>
                                        {/* Show dimensions if available - helps for 'fetch dimensions' request */}
                                        {(item.specifications || item.dimensions) && (
                                            <p className="text-xs text-gray-400 mt-1 font-mono">
                                                {item.specifications?.height || item.dimensions?.height ? `H:${item.specifications?.height || item.dimensions?.height}` : ''}
                                                {' '}
                                                {item.specifications?.width || item.dimensions?.width ? `W:${item.specifications?.width || item.dimensions?.width}` : ''}
                                                {' '}
                                                {item.specifications?.thickness || item.dimensions?.depth || item.dimensions?.thickness ? `D:${item.specifications?.thickness || item.dimensions?.depth || item.dimensions?.thickness}` : ''}
                                            </p>
                                        )}
                                    </div>
                                    <button className="px-3 py-1 bg-red-50 text-red-600 rounded opacity-0 group-hover:opacity-100 text-sm font-medium">
                                        Select
                                    </button>
                                </div>
                            ))}
                            {filteredItems.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    No items found.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ItemSelectorModal;
