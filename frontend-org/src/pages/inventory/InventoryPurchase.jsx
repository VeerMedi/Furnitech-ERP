import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FileText, Package, Truck, Plus, Filter, Search, Eye, BarChart3, TrendingDown } from 'lucide-react';

const InventoryPurchase = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('indent');
  const [purchases, setPurchases] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [stockIssues, setStockIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (activeTab === 'stocks') {
      fetchStockData();
    } else if (activeTab === 'issue') {
      fetchStockIssues();
    } else {
      fetchPurchases();
    }
  }, [activeTab, statusFilter]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/inventory/purchase/list?type=${activeTab}`);
      setPurchases(response.data.data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockData = async () => {
    setLoading(true);
    try {
      // For now, using mock data. Replace with actual API call when backend is ready
      const mockStocks = [
        { id: 1, productNo: 'PLY-001', name: 'Marine Plywood 18mm', category: 'Panel', minimal: 50, available: 125, upcoming: 200, unit: 'SHEET', reorderLevel: 50 },
        { id: 2, productNo: 'LAM-001', name: 'High Gloss Laminate White', category: 'Laminate', minimal: 100, available: 450, upcoming: 300, unit: 'SHEET', reorderLevel: 100 },
        { id: 3, productNo: 'HBD-001', name: 'HBD Board 18mm', category: 'HBD', minimal: 80, available: 95, upcoming: 150, unit: 'SHEET', reorderLevel: 80 },
        { id: 4, productNo: 'GLS-001', name: '5mm Clear Glass', category: 'Glass', minimal: 30, available: 65, upcoming: 100, unit: 'SQ.FT', reorderLevel: 30 },
        { id: 5, productNo: 'HRD-001', name: 'SS Handle 6inch', category: 'Hardware', minimal: 200, available: 540, upcoming: 500, unit: 'PCS', reorderLevel: 200 },
        { id: 6, productNo: 'FAB-001', name: 'Premium Fabric Beige', category: 'Fabric', minimal: 50, available: 180, upcoming: 100, unit: 'MTR', reorderLevel: 50 },
        { id: 7, productNo: 'ALU-001', name: 'Aluminum Profile 2inch', category: 'Aluminum', minimal: 100, available: 320, upcoming: 250, unit: 'MTR', reorderLevel: 100 },
        { id: 8, productNo: 'HND-001', name: 'Brass Handle Antique', category: 'Handles', minimal: 150, available: 75, upcoming: 300, unit: 'PCS', reorderLevel: 150 },
        { id: 9, productNo: 'PNL-001', name: 'Processed Panel Oak Veneer', category: 'Processed Panel', minimal: 40, available: 110, upcoming: 80, unit: 'SHEET', reorderLevel: 40 },
        { id: 10, productNo: 'PLY-002', name: 'Commercial Plywood 12mm', category: 'Panel', minimal: 60, available: 220, upcoming: 150, unit: 'SHEET', reorderLevel: 60 },
      ];
      setStockData(mockStocks);
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockIssues = async () => {
    setLoading(true);
    try {
      // Mock data for stock issues
      const mockIssues = [
        { id: 1, issueNo: 'ISS-2025-0001', productNo: 'PLY-001', name: 'Marine Plywood 18mm', category: 'Panel', quantity: 25, unit: 'SHEET', issuedTo: 'Production Unit A', date: '2025-12-01', purpose: 'Order #ORD-2025-045' },
        { id: 2, issueNo: 'ISS-2025-0002', productNo: 'LAM-001', name: 'High Gloss Laminate White', category: 'Laminate', quantity: 50, unit: 'SHEET', issuedTo: 'Production Unit B', date: '2025-12-02', purpose: 'Order #ORD-2025-046' },
        { id: 3, issueNo: 'ISS-2025-0003', productNo: 'HRD-001', name: 'SS Handle 6inch', category: 'Hardware', quantity: 100, unit: 'PCS', issuedTo: 'Assembly Line 1', date: '2025-12-02', purpose: 'Order #ORD-2025-047' },
        { id: 4, issueNo: 'ISS-2025-0004', productNo: 'HBD-001', name: 'HBD Board 18mm', category: 'HBD', quantity: 30, unit: 'SHEET', issuedTo: 'Production Unit A', date: '2025-12-03', purpose: 'Order #ORD-2025-048' },
        { id: 5, issueNo: 'ISS-2025-0005', productNo: 'GLS-001', name: '5mm Clear Glass', category: 'Glass', quantity: 150, unit: 'SQ.FT', issuedTo: 'Glass Cutting Unit', date: '2025-12-03', purpose: 'Order #ORD-2025-049' },
        { id: 6, issueNo: 'ISS-2025-0006', productNo: 'FAB-001', name: 'Premium Fabric Beige', category: 'Fabric', quantity: 80, unit: 'MTR', issuedTo: 'Upholstery Unit', date: '2025-12-04', purpose: 'Order #ORD-2025-050' },
        { id: 7, issueNo: 'ISS-2025-0007', productNo: 'ALU-001', name: 'Aluminum Profile 2inch', category: 'Aluminum', quantity: 120, unit: 'MTR', issuedTo: 'Frame Assembly', date: '2025-12-04', purpose: 'Order #ORD-2025-051' },
        { id: 8, issueNo: 'ISS-2025-0008', productNo: 'HND-001', name: 'Brass Handle Antique', category: 'Handles', quantity: 200, unit: 'PCS', issuedTo: 'Assembly Line 2', date: '2025-12-04', purpose: 'Order #ORD-2025-052' },
      ];
      setStockIssues(mockIssues);
    } catch (error) {
      console.error('Error fetching stock issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.indentNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.orderName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || purchase.poStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Draft': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Approved': return 'bg-green-100 text-green-700 border-green-300';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-300';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-300';
      case 'Completed': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase Management</h1>
          <p className="text-gray-600 mt-1">Manage indents, purchase orders, and goods receipt notes</p>
        </div>
        <button
          onClick={() => navigate('/inventory/purchase/new')}
          className="px-6 py-3 bg-red-700 text-white rounded-xl hover:bg-red-800 transition-colors font-medium flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create New Indent
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 bg-white rounded-xl p-2 border border-red-200 shadow-lg overflow-x-auto">
        <button
          onClick={() => setActiveTab('indent')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeTab === 'indent' 
              ? 'bg-red-700 text-white' 
              : 'text-gray-600 hover:bg-red-50'
          }`}
        >
          <FileText className="w-5 h-5" />
          Purchase Indent
        </button>
        <button
          onClick={() => setActiveTab('po')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeTab === 'po' 
              ? 'bg-red-700 text-white' 
              : 'text-gray-600 hover:bg-red-50'
          }`}
        >
          <Package className="w-5 h-5" />
          Purchase Order
        </button>
        <button
          onClick={() => setActiveTab('grn')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeTab === 'grn' 
              ? 'bg-red-700 text-white' 
              : 'text-gray-600 hover:bg-red-50'
          }`}
        >
          <Truck className="w-5 h-5" />
          GRN
        </button>
        <button
          onClick={() => setActiveTab('stocks')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeTab === 'stocks' 
              ? 'bg-red-700 text-white' 
              : 'text-gray-600 hover:bg-red-50'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          Inventory Stocks
        </button>
        <button
          onClick={() => setActiveTab('issue')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeTab === 'issue' 
              ? 'bg-red-700 text-white' 
              : 'text-gray-600 hover:bg-red-50'
          }`}
        >
          <TrendingDown className="w-5 h-5" />
          Stock Issue
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 mb-6 border border-red-200 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by indent no, customer, order..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
            >
              <option value="all">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {activeTab === 'stocks' ? (
        <div className="bg-white rounded-xl border border-red-200 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-red-700 text-white">
                  <th className="px-6 py-4 text-left font-semibold">Product No</th>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Category</th>
                  <th className="px-6 py-4 text-right font-semibold">Minimal</th>
                  <th className="px-6 py-4 text-right font-semibold">Available</th>
                  <th className="px-6 py-4 text-right font-semibold">Upcoming</th>
                  <th className="px-6 py-4 text-center font-semibold">Unit</th>
                  <th className="px-6 py-4 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : stockData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      No stock data found
                    </td>
                  </tr>
                ) : (
                  stockData.filter(stock => 
                    stock.productNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    stock.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    stock.category?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((stock) => {
                    const isLowStock = stock.available <= stock.minimal;
                    const isGoodStock = stock.available > stock.minimal * 2;
                    return (
                      <tr key={stock.id} className="hover:bg-red-50 transition-colors">
                        <td className="px-6 py-4 text-gray-900 font-medium">{stock.productNo}</td>
                        <td className="px-6 py-4 text-gray-700">{stock.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {stock.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">{stock.minimal}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-semibold ${isLowStock ? 'text-red-600' : isGoodStock ? 'text-green-600' : 'text-yellow-600'}`}>
                            {stock.available}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">{stock.upcoming}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            {stock.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isLowStock ? (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium border border-red-300">
                              Low Stock
                            </span>
                          ) : isGoodStock ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-300">
                              Good Stock
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium border border-yellow-300">
                              Moderate
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'issue' ? (
        <div className="bg-white rounded-xl border border-red-200 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-red-700 text-white">
                  <th className="px-6 py-4 text-left font-semibold">Issue No</th>
                  <th className="px-6 py-4 text-left font-semibold">Product No</th>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Category</th>
                  <th className="px-6 py-4 text-right font-semibold">Quantity</th>
                  <th className="px-6 py-4 text-left font-semibold">Unit</th>
                  <th className="px-6 py-4 text-left font-semibold">Issued To</th>
                  <th className="px-6 py-4 text-left font-semibold">Date</th>
                  <th className="px-6 py-4 text-left font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : stockIssues.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                      No stock issues found
                    </td>
                  </tr>
                ) : (
                  stockIssues.filter(issue => 
                    issue.issueNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    issue.productNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    issue.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    issue.issuedTo?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((issue) => (
                    <tr key={issue.id} className="hover:bg-red-50 transition-colors">
                      <td className="px-6 py-4 text-gray-900 font-medium">{issue.issueNo}</td>
                      <td className="px-6 py-4 text-gray-700">{issue.productNo}</td>
                      <td className="px-6 py-4 text-gray-700">{issue.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {issue.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900 font-semibold">{issue.quantity}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {issue.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{issue.issuedTo}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(issue.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{issue.purpose}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-red-200 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-red-700 text-white">
                  <th className="px-6 py-4 text-left font-semibold">Indent No</th>
                  <th className="px-6 py-4 text-left font-semibold">Customer</th>
                  <th className="px-6 py-4 text-left font-semibold">Order Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Date</th>
                  <th className="px-6 py-4 text-left font-semibold">Items</th>
                  <th className="px-6 py-4 text-left font-semibold">Amount</th>
                  <th className="px-6 py-4 text-left font-semibold">Status</th>
                  <th className="px-6 py-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      No {activeTab === 'indent' ? 'indents' : activeTab === 'po' ? 'purchase orders' : 'GRNs'} found
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <tr key={purchase._id} className="hover:bg-red-50 transition-colors">
                      <td className="px-6 py-4 text-gray-900 font-medium">{purchase.indentNo}</td>
                      <td className="px-6 py-4 text-gray-700">{purchase.customer || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-700">{purchase.orderName || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {new Date(purchase.indentDate || purchase.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{purchase.items?.length || 0}</td>
                      <td className="px-6 py-4 text-gray-900 font-semibold">
                        ₹{purchase.totalAmount?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(purchase.poStatus)}`}>
                          {purchase.poStatus || 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => navigate(`/inventory/purchase/${purchase._id}`)}
                          className="text-red-700 hover:text-red-900 transition-colors"
                        >
                          <Eye className="w-5 h-5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPurchase;
