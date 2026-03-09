import React, { useState, useEffect } from 'react';
import { Plus, Search, Upload, Edit2, X } from 'lucide-react';
import { customerAPI } from '../../services/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';
import { toast } from '../../hooks/useToast';

const AdvancePayment = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [newAdvanceAmount, setNewAdvanceAmount] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchCustomersWithAdvancePayments();
  }, []);

  const fetchCustomersWithAdvancePayments = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getAll();
      const allCustomers = response.data.data || [];

      // Filter customers with Paid or Partial advance payment status
      const filteredCustomers = allCustomers.filter(customer =>
        customer.advancePaymentStatus === 'Paid' ||
        customer.advancePaymentStatus === 'Partial'
      );

      setCustomers(filteredCustomers);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      // Silent error - just log it
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (customer) => {
    setEditingCustomer(customer);
    setNewAdvanceAmount(customer.advancePaymentAmount?.toString() || '0');
    setEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditModalOpen(false);
    setEditingCustomer(null);
    setNewAdvanceAmount('');
  };

  const handleUpdateAdvancePayment = async () => {
    if (!editingCustomer) return;

    const amount = parseFloat(newAdvanceAmount);
    if (isNaN(amount) || amount < 0) {
      toast.warning('Please enter a valid amount');
      return;
    }

    try {
      setUpdating(true);

      const response = await customerAPI.updateAdvancePayment(editingCustomer._id, {
        advancePaymentAmount: amount
      });

      toast.success(response.data.message || 'Advance payment updated! ✅');

      // Refresh the customer list
      await fetchCustomersWithAdvancePayments();

      handleCloseModal();
    } catch (error) {
      console.error('Failed to update advance payment:', error);
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      customer.firstName?.toLowerCase().includes(searchLower) ||
      customer.lastName?.toLowerCase().includes(searchLower) ||
      customer.companyName?.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(search) ||
      customer.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Advance Payments</h1>
          <p className="text-sm text-gray-600 mt-1">Customers with Paid or Partial advance payment status</p>
        </div>
        <div className="w-64">
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-red-200 shadow-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-red-50 text-gray-700 font-semibold">
              <tr>
                <th className="px-6 py-4">Customer Code</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Payment Status</th>
                <th className="px-6 py-4">Advance Amount</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer._id} className="hover:bg-red-50 transition-colors">
                  <td className="px-6 py-4 text-gray-600">{customer.customerCode || 'N/A'}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {customer.firstName || customer.lastName
                      ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                      : customer.companyName || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{customer.phone || 'N/A'}</td>
                  <td className="px-6 py-4 text-gray-600">{customer.email || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${customer.advancePaymentStatus === 'Paid' ? 'bg-green-100 text-green-700' :
                      'bg-yellow-100 text-yellow-700'
                      }`}>
                      {customer.advancePaymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    ₹{customer.advancePaymentAmount?.toLocaleString('en-IN') || '0'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {customer.type || customer.customerType || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleEditClick(customer)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Advance Payment"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    No customers with advance payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Advance Payment</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name
                </label>
                <p className="text-gray-900 font-semibold">
                  {editingCustomer?.companyName ||
                    `${editingCustomer?.firstName || ''} ${editingCustomer?.lastName || ''}`.trim() ||
                    'Unknown'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Code
                </label>
                <p className="text-gray-600">{editingCustomer?.customerCode || 'N/A'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advance Payment Amount (₹)
                </label>
                <input
                  type="number"
                  value={newAdvanceAmount}
                  onChange={(e) => setNewAdvanceAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will update all related orders and balances
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAdvancePayment}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Update Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancePayment;
