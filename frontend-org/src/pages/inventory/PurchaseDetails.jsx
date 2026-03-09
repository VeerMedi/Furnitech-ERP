import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from '../../hooks/useToast';
import { confirm } from '../../hooks/useConfirm';
import { ArrowLeft, Package, Calendar, User, IndianRupee, Edit, Trash2, CheckCircle, XCircle, History, TrendingUp } from 'lucide-react';

const PurchaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemHistory, setItemHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [editedPurchase, setEditedPurchase] = useState(null);

  useEffect(() => {
    fetchPurchaseDetails();
  }, [id]);

  const fetchPurchaseDetails = async () => {
    try {
      const response = await api.get(`/inventory/purchase/${id}`);
      setPurchase(response.data.data);
    } catch (error) {
      console.error('Error fetching purchase details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItemHistory = async (itemName) => {
    setLoadingHistory(true);
    try {
      const response = await api.get(`/inventory/item-history/${encodeURIComponent(itemName)}`);
      setItemHistory(response.data.data || []);
      setSelectedItem(itemName);
    } catch (error) {
      console.error('Error fetching item history:', error);
      setItemHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleApprove = async () => {
    const confirmed = await confirm('Are you sure you want to approve this purchase order?', 'Confirm Approval');
    if (!confirmed) {
      return;
    }

    setApproving(true);
    try {
      await api.put(`/inventory/purchase/${id}`, {
        poStatus: 'Approved',
        poDate: new Date().toISOString()
      });
      toast.success('Purchase order approved! ✅');
      fetchPurchaseDetails();
    } catch (error) {
      console.error('Error approving purchase:', error);
      toast.error('Failed to approve purchase order');
    } finally {
      setApproving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedPurchase({ ...purchase });
  };

  const handleSave = async () => {
    try {
      await api.put(`/inventory/purchase/${id}`, editedPurchase);
      toast.success('Purchase order updated! ✅');
      setIsEditing(false);
      fetchPurchaseDetails();
    } catch (error) {
      console.error('Error updating purchase:', error);
      toast.error('Failed to update purchase order');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedPurchase(null);
  };

  const handleFieldChange = (field, value) => {
    setEditedPurchase({ ...editedPurchase, [field]: value });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Approved': return 'bg-green-100 text-green-700 border-green-300';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-300';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-300';
      case 'Completed': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-gray-700">Purchase not found</p>
          <button
            onClick={() => navigate('/inventory/purchase')}
            className="mt-4 px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/inventory/purchase')}
            className="w-10 h-10 rounded-lg bg-white border border-red-200 flex items-center justify-center hover:bg-red-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-red-700" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Purchase Details</h1>
            <p className="text-gray-600 mt-1">{purchase.indentNo}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="px-6 py-3 bg-white text-red-700 border border-red-300 rounded-xl hover:bg-red-50 transition-colors font-medium flex items-center gap-2"
            >
              <Edit className="w-5 h-5" />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium flex items-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Save Changes
              </button>
            </>
          )}
          {purchase.poStatus !== 'Approved' && purchase.poStatus !== 'Completed' && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className={`px-6 py-3 bg-red-700 text-white rounded-xl hover:bg-red-800 transition-colors font-medium flex items-center gap-2 ${approving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <CheckCircle className="w-5 h-5" />
              {approving ? 'Approving...' : 'Approve'}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <User className="w-5 h-5 text-red-700" />
            </div>
            <p className="text-gray-600 text-sm">Customer</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{purchase.customer || 'N/A'}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-amber-200 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-700" />
            </div>
            <p className="text-gray-600 text-sm">Indent Date</p>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {new Date(purchase.indentDate).toLocaleDateString()}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-green-200 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-green-700" />
            </div>
            <p className="text-gray-600 text-sm">Total Amount</p>
          </div>
          <p className="text-xl font-bold text-gray-900">₹{purchase.totalAmount.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-700" />
            </div>
            <p className="text-gray-600 text-sm">Status</p>
          </div>
          {isEditing ? (
            <select
              value={editedPurchase?.poStatus || ''}
              onChange={(e) => handleFieldChange('poStatus', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Completed">Completed</option>
            </select>
          ) : (
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(purchase.poStatus)}`}>
              {purchase.poStatus}
            </span>
          )}
        </div>
      </div>

      {/* Purchase Information */}
      <div className="bg-white rounded-2xl p-6 mb-6 border border-red-200 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Purchase Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Order Name</p>
            {isEditing ? (
              <input
                type="text"
                value={editedPurchase?.orderName || ''}
                onChange={(e) => handleFieldChange('orderName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            ) : (
              <p className="text-base font-medium text-gray-900">{purchase.orderName || 'N/A'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Start Date</p>
            {isEditing ? (
              <input
                type="date"
                value={editedPurchase?.startDate ? new Date(editedPurchase.startDate).toISOString().split('T')[0] : ''}
                onChange={(e) => handleFieldChange('startDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            ) : (
              <p className="text-base font-medium text-gray-900">
                {purchase.startDate ? new Date(purchase.startDate).toLocaleDateString() : 'N/A'}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">End Date</p>
            {isEditing ? (
              <input
                type="date"
                value={editedPurchase?.endDate ? new Date(editedPurchase.endDate).toISOString().split('T')[0] : ''}
                onChange={(e) => handleFieldChange('endDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            ) : (
              <p className="text-base font-medium text-gray-900">
                {purchase.endDate ? new Date(purchase.endDate).toLocaleDateString() : 'N/A'}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Requirement Date</p>
            {isEditing ? (
              <input
                type="date"
                value={editedPurchase?.requirementDate ? new Date(editedPurchase.requirementDate).toISOString().split('T')[0] : ''}
                onChange={(e) => handleFieldChange('requirementDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            ) : (
              <p className="text-base font-medium text-gray-900">
                {purchase.requirementDate ? new Date(purchase.requirementDate).toLocaleDateString() : 'N/A'}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">PO Date</p>
            {isEditing ? (
              <input
                type="date"
                value={editedPurchase?.poDate ? new Date(editedPurchase.poDate).toISOString().split('T')[0] : ''}
                onChange={(e) => handleFieldChange('poDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            ) : (
              <p className="text-base font-medium text-gray-900">
                {purchase.poDate ? new Date(purchase.poDate).toLocaleDateString() : 'N/A'}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Expected Delivery Date</p>
            {isEditing ? (
              <input
                type="date"
                value={editedPurchase?.expectedDeliveryDate ? new Date(editedPurchase.expectedDeliveryDate).toISOString().split('T')[0] : ''}
                onChange={(e) => handleFieldChange('expectedDeliveryDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            ) : (
              <p className="text-base font-medium text-gray-900">
                {purchase.expectedDeliveryDate ? new Date(purchase.expectedDeliveryDate).toLocaleDateString() : 'N/A'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-red-200 shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-red-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-red-700" />
            Order Items - Click to View Purchase History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-red-700 text-white">
                <th className="px-6 py-4 text-left font-semibold">#</th>
                <th className="px-6 py-4 text-left font-semibold">Item Name</th>
                <th className="px-6 py-4 text-left font-semibold">Category</th>
                <th className="px-6 py-4 text-right font-semibold">Quantity</th>
                <th className="px-6 py-4 text-left font-semibold">Unit</th>
                <th className="px-6 py-4 text-right font-semibold">Rate</th>
                <th className="px-6 py-4 text-right font-semibold">Amount</th>
                <th className="px-6 py-4 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100">
              {purchase.items?.map((item, idx) => (
                <tr key={idx} className="hover:bg-red-50 transition-colors">
                  <td className="px-6 py-4 text-gray-700">{idx + 1}</td>
                  <td className="px-6 py-4 text-gray-900 font-medium">{item.itemName}</td>
                  <td className="px-6 py-4 text-gray-700">{item.category || 'N/A'}</td>
                  <td className="px-6 py-4 text-right text-gray-900 font-semibold">{item.quantity || 0}</td>
                  <td className="px-6 py-4 text-gray-700">{item.unit || 'PCS'}</td>
                  <td className="px-6 py-4 text-right text-gray-900">₹{(item.rate || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-gray-900 font-bold">
                    ₹{((item.quantity || 0) * (item.rate || 0)).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => fetchItemHistory(item.itemName)}
                      className="text-red-700 hover:text-red-900 transition-colors"
                      title="View Purchase History"
                    >
                      <History className="w-5 h-5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-red-50 border-t-2 border-red-300">
                <td colSpan="6" className="px-6 py-4 text-right text-gray-900 font-bold text-lg">Total Amount:</td>
                <td className="px-6 py-4 text-right text-red-700 font-bold text-xl">
                  ₹{purchase.totalAmount.toLocaleString()}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Purchase History */}
      {selectedItem && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-lg overflow-hidden mb-6 animate-fade-in-up">
          <div className="p-6 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-700" />
              Purchase History for "{selectedItem}"
            </h2>
            <p className="text-sm text-gray-600 mt-1">Complete purchase history showing all transactions for this item</p>
          </div>
          {loadingHistory ? (
            <div className="p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : itemHistory.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No purchase history found for this item</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-blue-700 text-white">
                    <th className="px-6 py-4 text-left font-semibold">#</th>
                    <th className="px-6 py-4 text-left font-semibold">Date</th>
                    <th className="px-6 py-4 text-left font-semibold">Transaction Type</th>
                    <th className="px-6 py-4 text-right font-semibold">Quantity</th>
                    <th className="px-6 py-4 text-left font-semibold">Unit</th>
                    <th className="px-6 py-4 text-right font-semibold">Rate/Cost</th>
                    <th className="px-6 py-4 text-right font-semibold">Total Amount</th>
                    <th className="px-6 py-4 text-left font-semibold">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {itemHistory.map((history, idx) => (
                    <tr key={idx} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 text-gray-700">{idx + 1}</td>
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        {new Date(history.transactionDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${history.transactionType === 'Purchase' ? 'bg-green-100 text-green-700' :
                          history.transactionType === 'Issue' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                          {history.transactionType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900 font-semibold">{history.quantity}</td>
                      <td className="px-6 py-4 text-gray-700">{history.unit}</td>
                      <td className="px-6 py-4 text-right text-gray-900">
                        ₹{(history.rate || history.cost || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900 font-bold">
                        ₹{((history.quantity || 0) * (history.rate || history.cost || 0)).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-700 text-sm">{history.referenceNo || 'N/A'}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan="3" className="px-6 py-4 text-right text-gray-900">Total Purchases:</td>
                    <td className="px-6 py-4 text-right text-blue-700">
                      {itemHistory.reduce((sum, h) => sum + (h.transactionType === 'Purchase' ? h.quantity : 0), 0)}
                    </td>
                    <td colSpan="2" className="px-6 py-4 text-right text-gray-900">Total Amount:</td>
                    <td className="px-6 py-4 text-right text-blue-700 font-bold text-lg">
                      ₹{itemHistory.reduce((sum, h) =>
                        sum + ((h.quantity || 0) * (h.rate || h.cost || 0)), 0
                      ).toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Timeline</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Indent Created</p>
              <p className="text-sm text-gray-600">{new Date(purchase.createdAt).toLocaleString()}</p>
            </div>
          </div>
          {purchase.poStatus !== 'Draft' && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Status: {purchase.poStatus}</p>
                <p className="text-sm text-gray-600">{new Date(purchase.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetails;
