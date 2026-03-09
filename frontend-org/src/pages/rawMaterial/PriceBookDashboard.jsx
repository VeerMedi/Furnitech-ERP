import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Edit2, TrendingUp, TrendingDown, Minus, Calendar, IndianRupee, Package, User, Download, RefreshCw, History } from 'lucide-react';
import api, { vendorAPI } from '../../services/api';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { toast } from '../../hooks/useToast';

const PriceBookDashboard = () => {
  const navigate = useNavigate();
  const { category } = useParams();
  const [priceBookData, setPriceBookData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(category?.toUpperCase() || 'ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const categories = ['ALL', 'PANEL', 'LAMINATE', 'EDGEBAND', 'HARDWARE', 'GLASS', 'FABRIC', 'ALUMINIUM', 'PROCESSED_PANEL', 'HANDLES'];

  useEffect(() => {
    // Always load from database first
    fetchPriceBookData();
  }, []);

  useEffect(() => {
    // Update category filter if URL parameter changes
    if (category && category !== 'all') {
      setCategoryFilter(category.toUpperCase());
    } else {
      setCategoryFilter('ALL');
    }
  }, [category]);

  useEffect(() => {
    filterData();
  }, [searchTerm, categoryFilter, priceBookData]);

  const fetchPriceBookData = async (forceRefresh = false) => {
    try {
      setLoading(true);

      console.log('🔍 [PriceBook] Loading from DATABASE (primary source)...');

      // PRIMARY: Load from database
      const timestamp = forceRefresh ? `?t=${Date.now()}` : '';
      const response = await api.get(`/rawmaterial/price-book${timestamp}`);

      if (response.data && response.data.data) {
        console.log('✅ [PriceBook] Database response:', response.data.data.length, 'materials');
        setPriceBookData(response.data.data);
        setFilteredData(response.data.data);

        // BACKUP: Cache to localStorage for offline fallback only
        try {
          localStorage.setItem('priceBookData', JSON.stringify(response.data.data));
          localStorage.setItem('priceBookDataTimestamp', Date.now().toString());
          console.log('💾 [PriceBook] Backed up to localStorage');
        } catch (storageError) {
          console.warn('[PriceBook] Failed to backup to localStorage:', storageError);
        }
      }
    } catch (error) {
      console.error('Error fetching price book data:', error);
      // Fallback to localStorage if API fails
      const cachedData = localStorage.getItem('priceBookData');
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          setPriceBookData(parsed);
          setFilteredData(parsed);
          console.log('Loaded price book from cache');
        } catch (parseError) {
          console.error('Failed to parse cached price book:', parseError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...priceBookData];

    // Category filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.materialCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.specifications?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.specifications?.finish?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const getPriceTrend = (priceHistory) => {
    if (!priceHistory || priceHistory.length < 2) {
      return { icon: Minus, color: 'text-gray-500', change: '0%', trend: 'stable' };
    }

    const sortedHistory = [...priceHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestPrice = sortedHistory[0].price;
    const previousPrice = sortedHistory[1].price;
    const change = ((latestPrice - previousPrice) / previousPrice) * 100;

    if (change > 0) {
      return { icon: TrendingUp, color: 'text-red-500', change: `+${change.toFixed(1)}%`, trend: 'up' };
    } else if (change < 0) {
      return { icon: TrendingDown, color: 'text-green-500', change: `${change.toFixed(1)}%`, trend: 'down' };
    }
    return { icon: Minus, color: 'text-gray-500', change: '0%', trend: 'stable' };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    const value = parseFloat(amount);
    if (isNaN(value) || value === null || value === undefined) {
      return '₹0';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleViewHistory = (item) => {
    setSelectedItem(item);
    setShowHistoryModal(true);
  };

  const exportToCSV = () => {
    const headers = ['Material Code', 'Name', 'Category', 'Current Price', 'UOM', 'Brand', 'Finish', 'Last Updated', 'Vendor'];
    const csvData = filteredData.map(item => [
      item.materialCode || '',
      item.name,
      item.category,
      item.currentPrice,
      item.uom,
      item.specifications?.brand || '',
      item.specifications?.finish || '',
      formatDate(item.lastUpdated),
      item.priceHistory?.[0]?.vendor || ''
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-book-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Price Book {category && category !== 'all' ? `- ${category.charAt(0).toUpperCase() + category.slice(1)}` : ''}
            </h1>
            <p className="text-gray-600 mt-1">Track material prices, vendors, and purchase history</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/raw-material/price-book')}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              ← Back to Categories
            </Button>
            <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={fetchPriceBookData} className="bg-red-700 hover:bg-red-800">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="mb-6 p-4">
        <div className="flex gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, code, brand, finish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Price Book Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specifications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-6 py-12 text-center text-gray-500">
                    No materials found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => {
                  const trend = getPriceTrend(item.priceHistory);
                  const TrendIcon = trend.icon;
                  const latestPurchase = item.priceHistory?.[0] || {};

                  return (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-900">{item.materialCode || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.uom}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {item.specifications?.brand && <div><strong>Brand:</strong> {item.specifications.brand}</div>}
                          {item.specifications?.finish && <div><strong>Finish:</strong> {item.specifications.finish}</div>}
                          {item.specifications?.color && <div><strong>Color:</strong> {item.specifications.color}</div>}
                          {item.specifications?.thickness && <div><strong>Thickness:</strong> {item.specifications.thickness}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.specifications?.length && <div>L: {item.specifications.length}</div>}
                          {item.specifications?.width && <div>W: {item.specifications.width}</div>}
                          {!item.specifications?.length && !item.specifications?.width && <span className="text-gray-400">N/A</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.costPrice || 0)}</div>
                        <div className="text-xs text-gray-500">per {item.uom}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-700">{formatCurrency(item.sellingPrice || (item.costPrice ? item.costPrice * 1.2 : 0))}</div>
                        <div className="text-xs text-gray-500">per {item.uom}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1 ${trend.color}`}>
                          <TrendIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">{trend.change}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{latestPurchase.vendor || 'N/A'}</div>
                        {latestPurchase.vendorContact && (
                          <div className="text-xs text-gray-500">{latestPurchase.vendorContact}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {formatDate(item.lastUpdated || item.updatedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} materials
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 border rounded-md ${currentPage === i + 1
                    ? 'bg-red-700 text-white border-red-600'
                    : 'border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Modal - Will be implemented separately */}
      {showEditModal && selectedItem && (
        <EditPriceModal
          item={selectedItem}
          onClose={() => {
            setShowEditModal(false);
            setSelectedItem(null);
          }}
          onUpdate={fetchPriceBookData}
        />
      )}

      {/* History Modal */}
      {showHistoryModal && selectedItem && (
        <PurchaseHistoryModal
          item={selectedItem}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
};

// Edit Price Modal Component
const EditPriceModal = ({ item, onClose, onUpdate }) => {
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);

  // Get latest purchase history for pre-filling vendor details
  const latestPurchase = item.priceHistory && item.priceHistory.length > 0
    ? item.priceHistory[0]
    : null;

  const [formData, setFormData] = useState({
    name: item.name || '',
    materialCode: item.materialCode || '',
    category: item.category || '',
    brand: item.specifications?.brand || '',
    finish: item.specifications?.finish || '',
    color: item.specifications?.color || '',
    thickness: item.specifications?.thickness || '',
    length: item.specifications?.length || '',
    width: item.specifications?.width || '',
    height: item.specifications?.height || '',
    uom: item.uom || 'PCS',
    price: item.costPrice !== undefined && item.costPrice !== null ? item.costPrice : '',
    sellingPrice: 0,
    vendor: latestPurchase?.vendor || '',
    vendorContact: latestPurchase?.vendorContact || '',
    quantity: latestPurchase?.quantity || '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await vendorAPI.getAll();
      const vendorData = response.data.data || response.data || [];
      setVendors(vendorData);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      // Fallback to localStorage
      const cachedVendors = localStorage.getItem('vendorData');
      if (cachedVendors) {
        try {
          setVendors(JSON.parse(cachedVendors));
        } catch (e) {
          console.error('Failed to parse cached vendors');
        }
      }
    }
  };

  const handleVendorNameChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, vendor: value });

    if (value.length > 0) {
      // Filter vendors based on input
      const filtered = vendors.filter(v =>
        v.vendorName.toLowerCase().includes(value.toLowerCase()) ||
        v.vendorId.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredVendors(filtered);
      setShowVendorSuggestions(filtered.length > 0);
    } else {
      setShowVendorSuggestions(false);
      setFilteredVendors([]);
    }
  };

  const selectVendor = (vendor) => {
    console.log('🔍 Selecting vendor:', vendor.vendorName);
    console.log('📦 Item to match:', item);
    console.log('📋 Purchase History:', vendor.purchaseHistory);

    // Find matching purchase history entry for this item
    // Try multiple matching strategies
    const matchingPurchase = vendor.purchaseHistory?.find(p => {
      const itemNameMatch = p.itemName?.toLowerCase().includes(item.name?.toLowerCase()) ||
        item.name?.toLowerCase().includes(p.itemName?.toLowerCase());
      const materialNameMatch = p.materialName?.toLowerCase().includes(item.name?.toLowerCase()) ||
        item.name?.toLowerCase().includes(p.materialName?.toLowerCase());
      const brandMatch = p.brand?.toLowerCase() === item.specifications?.brand?.toLowerCase();
      const categoryMatch = p.category?.toLowerCase() === item.category?.toLowerCase();

      console.log(`Checking purchase: ${p.itemName || p.materialName}`, {
        itemNameMatch,
        materialNameMatch,
        brandMatch,
        categoryMatch,
        totalAmount: p.totalAmount,
        unitPrice: p.unitPrice
      });

      return itemNameMatch || materialNameMatch || brandMatch || categoryMatch;
    });

    console.log('✅ Matching Purchase Found:', matchingPurchase);

    // Auto-fill cost price from purchase history's ONLY totalAmount (not unitPrice)
    // Parse to number to ensure it's not a string
    let costPriceFromPurchase = ''; // default to empty/0

    if (matchingPurchase) {
      // ONLY use totalAmount - no fallback to unitPrice
      if (matchingPurchase.totalAmount !== undefined && matchingPurchase.totalAmount !== null && matchingPurchase.totalAmount !== 0) {
        costPriceFromPurchase = parseFloat(matchingPurchase.totalAmount);
        console.log('💰 Using totalAmount:', costPriceFromPurchase);
      } else {
        console.log('⚠️ No totalAmount found, cost price will be empty');
      }
    }

    console.log('💰 Final Cost Price to set:', costPriceFromPurchase);

    setFormData(prev => ({
      ...prev,
      vendor: vendor.vendorName,
      vendorContact: vendor.contactNumber || '',
      quantity: matchingPurchase?.quantity || '',
      price: costPriceFromPurchase,
    }));

    setShowVendorSuggestions(false);
    setFilteredVendors([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Parse numeric fields before sending
      const submitData = {
        ...formData,
        price: formData.price !== '' && formData.price !== null && formData.price !== undefined ? parseFloat(formData.price) : undefined,
        sellingPrice: formData.sellingPrice !== '' && formData.sellingPrice !== null && formData.sellingPrice !== undefined ? parseFloat(formData.sellingPrice) : undefined,
        quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
      };

      console.log('📤 Submitting form data:', submitData);
      console.log('💰 Cost Price:', submitData.price);
      console.log('💵 Selling Price:', submitData.sellingPrice);

      const response = await api.post(`/rawmaterial/price-book/${item._id}/update-price`, submitData);
      console.log('✅ Update response:', response.data);
      console.log('💰 Saved Cost Price:', response.data.data?.costPrice);
      console.log('💵 Saved Selling Price:', response.data.data?.sellingPrice);

      // Clear ALL caches
      localStorage.removeItem('priceBookData');
      localStorage.removeItem('priceBookDataTimestamp');

      // Close modal AFTER data refresh

      // Immediately update the local state with new values
      const updatedMaterial = response.data.data;
      console.log('🔄 Updating local state with:', updatedMaterial);

      // Force immediate refresh from API
      await onUpdate(true);

      // Small delay before closing modal to ensure state updates
      setTimeout(() => {
        onClose();
        toast.success('Material updated successfully! ✅');
      }, 300);

    } catch (error) {
      console.error('Error updating material:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Failed to update material: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Edit Material</h2>
              <p className="text-sm text-gray-600 mt-1">Update material details and pricing</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Material Basic Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                    placeholder="e.g., Plywood Panel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material Code</label>
                  <input
                    type="text"
                    value={formData.materialCode}
                    onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., PLY-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="PANEL">Panel</option>
                    <option value="LAMINATE">Laminate</option>
                    <option value="EDGEBAND">Edgeband</option>
                    <option value="HARDWARE">Hardware</option>
                    <option value="GLASS">Glass</option>
                    <option value="FABRIC">Fabric</option>
                    <option value="ALUMINIUM">Aluminium</option>
                    <option value="PROCESSED_PANEL">Processed Panel</option>
                    <option value="HANDLES">Handles</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure *</label>
                  <select
                    value={formData.uom}
                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="PCS">PCS</option>
                    <option value="SHEET">SHEET</option>
                    <option value="SQM">SQM</option>
                    <option value="SQF">SQF</option>
                    <option value="METER">METER</option>
                    <option value="FEET">FEET</option>
                    <option value="KG">KG</option>
                    <option value="LITER">LITER</option>
                    <option value="BOX">BOX</option>
                    <option value="SET">SET</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Specifications */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Specifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., Greenply"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Finish</label>
                  <input
                    type="text"
                    value={formData.finish}
                    onChange={(e) => setFormData({ ...formData, finish: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., Matte, Glossy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., White, Brown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thickness</label>
                  <input
                    type="text"
                    value={formData.thickness}
                    onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., 18mm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Length</label>
                  <input
                    type="text"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., 2440mm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                  <input
                    type="text"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., 1220mm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                  <input
                    type="text"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., 760mm"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                    placeholder="Purchase/Cost price"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Selling price to customers"
                  />
                </div>
              </div>
            </div>

            {/* Vendor Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Vendor & Purchase Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={handleVendorNameChange}
                    onFocus={() => {
                      if (filteredVendors.length > 0) setShowVendorSuggestions(true);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                    placeholder="Start typing vendor name..."
                    autoComplete="off"
                  />

                  {/* Vendor Suggestions Dropdown */}
                  {showVendorSuggestions && filteredVendors.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredVendors.map((vendor) => {
                        // Improved matching logic
                        const matchingPurchase = vendor.purchaseHistory?.find(p => {
                          const itemNameMatch = p.itemName?.toLowerCase().includes(item.name?.toLowerCase()) ||
                            item.name?.toLowerCase().includes(p.itemName?.toLowerCase());
                          const materialNameMatch = p.materialName?.toLowerCase().includes(item.name?.toLowerCase()) ||
                            item.name?.toLowerCase().includes(p.materialName?.toLowerCase());
                          const brandMatch = p.brand?.toLowerCase() === item.specifications?.brand?.toLowerCase();
                          const categoryMatch = p.category?.toLowerCase() === item.category?.toLowerCase();
                          return itemNameMatch || materialNameMatch || brandMatch || categoryMatch;
                        });

                        return (
                          <div
                            key={vendor._id}
                            onClick={() => selectVendor(vendor)}
                            className="px-3 py-2 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-gray-900">{vendor.vendorName}</p>
                                <p className="text-xs text-gray-600">{vendor.vendorId} • {vendor.contactNumber}</p>
                              </div>
                              {matchingPurchase && (
                                <div className="text-right">
                                  <p className="text-xs text-green-600 font-semibold">✓ Has Purchase</p>
                                  <p className="text-xs text-gray-500">Qty: {matchingPurchase.quantity}</p>
                                  <p className="text-xs font-semibold text-gray-700">₹{matchingPurchase.totalAmount || matchingPurchase.unitPrice}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Type to see suggestions with purchase history</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Contact</label>
                  <input
                    type="text"
                    value={formData.vendorContact}
                    onChange={(e) => setFormData({ ...formData, vendorContact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Vendor contact number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Purchased</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Auto-filled from purchase history"
                  />
                </div>

              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Any additional notes about this purchase..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`flex-1 flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <IndianRupee className="w-4 h-4 mr-2" /> {saving ? 'Updating...' : 'Update Material'}
              </button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

// Purchase History Modal Component
const PurchaseHistoryModal = ({ item, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Purchase History</h2>
              <p className="text-sm text-gray-600 mt-1">{item.name} ({item.materialCode})</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Material Info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-6 border border-blue-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Category</p>
                <p className="font-semibold text-gray-900">{item.category}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Current Price</p>
                <p className="font-semibold text-gray-900">₹{item.currentPrice}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Unit</p>
                <p className="font-semibold text-gray-900">{item.uom}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Purchases</p>
                <p className="font-semibold text-gray-900">{item.priceHistory?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* Purchase History List */}
          {item.priceHistory && item.priceHistory.length > 0 ? (
            <div className="space-y-4">
              {item.priceHistory.slice().reverse().map((history, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-semibold text-gray-900">
                          {new Date(history.date).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 ml-6">
                        {new Date(history.date).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">₹{history.price.toLocaleString('en-IN')}</div>
                      <div className="text-xs text-gray-500">per {item.uom}</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium text-gray-700">Vendor: </span>
                        <span className="text-gray-900">{history.vendor}</span>
                        {history.vendorContact && (
                          <span className="text-gray-500 ml-2">({history.vendorContact})</span>
                        )}
                      </div>
                    </div>

                    {history.quantity && (
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">
                          Quantity: <span className="font-semibold text-gray-900">{history.quantity} {item.uom}</span>
                        </span>
                      </div>
                    )}

                    {history.quantity && history.price && (
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">
                          Total Value: <span className="font-semibold text-green-700">₹{(history.quantity * history.price).toLocaleString('en-IN')}</span>
                        </span>
                      </div>
                    )}

                    {history.notes && (
                      <div className="flex items-start gap-2 mt-3 pt-3 border-t border-gray-200">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Note: </span>
                          <span className="text-gray-600">{history.notes}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No purchase history available</p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PriceBookDashboard;
