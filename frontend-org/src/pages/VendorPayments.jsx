import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, IndianRupee, CreditCard, AlertCircle } from 'lucide-react';
import EditVendorPaymentModal from '../components/EditVendorPaymentModal';
import { vendorAPI } from '../services/api';
import { useEditPermission } from '../components/ProtectedAction';
import { toast } from '../hooks/useToast';

export default function VendorPayments() {
  const navigate = useNavigate();
  const canEditVendors = useEditPermission('vendors') || useEditPermission('vendors-details') || useEditPermission('vendors-payments');
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalOrderValue: 0,
    totalPaid: 0,
    totalBalance: 0
  });
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Always load from database first
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);

      console.log('🔍 [VendorPayments] Loading from DATABASE (primary source)...');

      // PRIMARY: Load from database
      const response = await vendorAPI.getAll();
      const vendors = response.data.data || response.data;

      console.log('✅ [VendorPayments] Database response:', vendors?.length || 0, 'vendors');

      if (vendors && vendors.length > 0) {
        // Convert vendor purchase history to payment records
        const paymentRecords = [];
        vendors.forEach(vendor => {
          if (vendor.purchaseHistory && vendor.purchaseHistory.length > 0) {
            vendor.purchaseHistory.forEach((purchase, index) => {
              // Calculate GST (18% of total amount)
              const gstAmount = Math.round(purchase.totalAmount * 0.18);
              const totalWithGst = purchase.totalAmount + gstAmount;
              const balanceAmount = totalWithGst - purchase.amountPaid;

              paymentRecords.push({
                _id: `${vendor._id}-${index}`,
                vendorId: vendor.vendorId,
                vendorName: vendor.vendorName,
                contact: vendor.contactNumber,
                email: vendor.email,
                orderName: `ORD-${vendor.vendorId}-${String(index + 1).padStart(3, '0')}`,
                jobType: purchase.itemName,
                startDate: purchase.purchaseDate,
                dispatchDate: purchase.purchaseDate,
                status: purchase.status === 'Paid' ? 'Completed' :
                  purchase.status === 'Partial' ? 'In Progress' :
                    'Pending',
                orderValue: purchase.totalAmount,
                gst: gstAmount,
                totalAmount: totalWithGst,
                paidAmount: purchase.amountPaid,
                balanceAmount: balanceAmount,
                vendorStatus: vendor.status || 'Active',
                paymentStatus: vendor.paymentStatus
              });
            });
          }
        });

        setPayments(paymentRecords);
        calculateStats(paymentRecords);

        // Cache to localStorage
        try {
          localStorage.setItem('vendorPaymentData', JSON.stringify(paymentRecords));
          localStorage.setItem('vendorData', JSON.stringify(vendors));
        } catch (storageError) {
          console.warn('Failed to cache payment data:', storageError);
        }
      } else {
        // No data in database, try localStorage fallback
        console.log('No vendors in database, checking localStorage...');
        const cachedVendors = localStorage.getItem('vendorData');

        if (cachedVendors) {
          const vendors = JSON.parse(cachedVendors);
          const paymentRecords = [];

          vendors.forEach(vendor => {
            if (vendor.purchaseHistory && vendor.purchaseHistory.length > 0) {
              vendor.purchaseHistory.forEach((purchase, index) => {
                const gstAmount = Math.round(purchase.totalAmount * 0.18);
                const totalWithGst = purchase.totalAmount + gstAmount;
                const balanceAmount = totalWithGst - purchase.amountPaid;

                paymentRecords.push({
                  _id: `${vendor._id}-${index}`,
                  vendorId: vendor.vendorId,
                  vendorName: vendor.vendorName,
                  contact: vendor.contactNumber,
                  email: vendor.email,
                  orderName: `ORD-${vendor.vendorId}-${String(index + 1).padStart(3, '0')}`,
                  jobType: purchase.itemName,
                  startDate: purchase.purchaseDate,
                  dispatchDate: purchase.purchaseDate,
                  status: purchase.status === 'Paid' ? 'Completed' :
                    purchase.status === 'Partial' ? 'In Progress' :
                      'Pending',
                  orderValue: purchase.totalAmount,
                  gst: gstAmount,
                  totalAmount: totalWithGst,
                  paidAmount: purchase.amountPaid,
                  balanceAmount: balanceAmount,
                  vendorStatus: vendor.status || 'Active',
                  paymentStatus: vendor.paymentStatus
                });
              });
            }
          });

          setPayments(paymentRecords);
          calculateStats(paymentRecords);
          console.log('Loaded payment data from localStorage cache');
        } else {
          setPayments([]);
          setStats({
            totalOrders: 0,
            totalOrderValue: 0,
            totalPaid: 0,
            totalBalance: 0
          });
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading payments from database:', error);

      // On API error, try localStorage fallback
      console.log('Database error, attempting localStorage fallback...');
      try {
        const cachedVendors = localStorage.getItem('vendorData');
        if (cachedVendors) {
          const vendors = JSON.parse(cachedVendors);
          const paymentRecords = [];

          vendors.forEach(vendor => {
            if (vendor.purchaseHistory && vendor.purchaseHistory.length > 0) {
              vendor.purchaseHistory.forEach((purchase, index) => {
                const gstAmount = Math.round(purchase.totalAmount * 0.18);
                const totalWithGst = purchase.totalAmount + gstAmount;
                const balanceAmount = totalWithGst - purchase.amountPaid;

                paymentRecords.push({
                  _id: `${vendor._id}-${index}`,
                  vendorId: vendor.vendorId,
                  vendorName: vendor.vendorName,
                  contact: vendor.contactNumber,
                  email: vendor.email,
                  orderName: `ORD-${vendor.vendorId}-${String(index + 1).padStart(3, '0')}`,
                  jobType: purchase.itemName,
                  startDate: purchase.purchaseDate,
                  dispatchDate: purchase.purchaseDate,
                  status: purchase.status === 'Paid' ? 'Completed' :
                    purchase.status === 'Partial' ? 'In Progress' :
                      'Pending',
                  orderValue: purchase.totalAmount,
                  gst: gstAmount,
                  totalAmount: totalWithGst,
                  paidAmount: purchase.amountPaid,
                  balanceAmount: balanceAmount,
                  vendorStatus: vendor.status || 'Active',
                  paymentStatus: vendor.paymentStatus
                });
              });
            }
          });

          setPayments(paymentRecords);
          calculateStats(paymentRecords);
          console.log('Loaded payment data from localStorage after API error');
        } else {
          setPayments([]);
          setStats({
            totalOrders: 0,
            totalOrderValue: 0,
            totalPaid: 0,
            totalBalance: 0
          });
        }
      } catch (fallbackError) {
        console.error('localStorage fallback also failed:', fallbackError);
        setPayments([]);
        setStats({
          totalOrders: 0,
          totalOrderValue: 0,
          totalPaid: 0,
          totalBalance: 0
        });
      }

      setLoading(false);
    }
  };

  const generateSamplePayments = () => {
    // This matches the vendor details sample data structure
    const samplePayments = [];
    setPayments(samplePayments);
    calculateStats(samplePayments);
  };

  const calculateStats = (data) => {
    const stats = {
      totalOrders: data.length,
      totalOrderValue: data.reduce((sum, p) => sum + p.orderValue, 0),
      totalPaid: data.reduce((sum, p) => sum + p.paidAmount, 0),
      totalBalance: data.reduce((sum, p) => sum + p.balanceAmount, 0)
    };
    setStats(stats);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'In Progress':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Pending':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleEditPayment = (payment) => {
    setSelectedPayment(payment);
    setShowEditModal(true);
  };

  const handleSavePayment = async (updatedPayment) => {
    // Update payments list
    const updatedPayments = payments.map(p =>
      p._id === updatedPayment._id ? updatedPayment : p
    );
    setPayments(updatedPayments);
    calculateStats(updatedPayments);
    localStorage.setItem('vendorPaymentData', JSON.stringify(updatedPayments));

    // Sync back to vendor data in localStorage
    const savedVendors = localStorage.getItem('vendorData');
    if (savedVendors) {
      const vendors = JSON.parse(savedVendors);

      // Find the vendor and update their purchase history
      const updatedVendors = vendors.map(vendor => {
        if (vendor.vendorId === updatedPayment.vendorId) {
          // Update the specific purchase in history
          const updatedHistory = vendor.purchaseHistory.map(purchase => {
            const purchaseOrderName = `ORD-${vendor.vendorId}-${String(vendor.purchaseHistory.indexOf(purchase) + 1).padStart(3, '0')}`;

            if (purchaseOrderName === updatedPayment.orderName) {
              return {
                ...purchase,
                itemName: updatedPayment.jobType,
                purchaseDate: updatedPayment.startDate,
                totalAmount: updatedPayment.orderValue,
                amountPaid: updatedPayment.paidAmount,
                balance: updatedPayment.balanceAmount - Math.round(updatedPayment.orderValue * 0.18),
                status: updatedPayment.status === 'Completed' ? 'Paid' :
                  updatedPayment.status === 'In Progress' ? 'Partial' :
                    'Pending'
              };
            }
            return purchase;
          });

          // Recalculate vendor totals
          const newTotalAmount = updatedHistory.reduce((sum, p) => sum + p.totalAmount, 0);
          const newPaidAmount = updatedHistory.reduce((sum, p) => sum + p.amountPaid, 0);
          const newBalance = newTotalAmount - newPaidAmount;

          // Determine payment status
          let paymentStatus = 'Pending';
          if (newBalance === 0) paymentStatus = 'Done';
          else if (newPaidAmount > 0 && newBalance > 0) paymentStatus = 'Half';
          else if (newBalance > 0 && newPaidAmount === 0) paymentStatus = 'Pending';

          return {
            ...vendor,
            purchaseHistory: updatedHistory,
            totalAmount: newTotalAmount,
            paidAmount: newPaidAmount,
            balance: newBalance,
            paymentStatus: paymentStatus
          };
        }
        return vendor;
      });

      localStorage.setItem('vendorData', JSON.stringify(updatedVendors));

      // Sync to database
      try {
        const vendorToUpdate = updatedVendors.find(v => v.vendorId === updatedPayment.vendorId);
        if (vendorToUpdate && vendorToUpdate._id) {
          await vendorAPI.update(vendorToUpdate._id, vendorToUpdate);
          console.log('Vendor payment data synced to database');
        }
      } catch (error) {
        console.error('Error syncing to database:', error);
        // Continue even if database sync fails
      }
    }

    setShowEditModal(false);
    setSelectedPayment(null);
    toast.success('Payment updated! ✅');
    loadPayments();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Vendor Payments</h1>
          <p className="text-sm text-gray-600 mt-1">Track and manage vendor order payments</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Order Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalOrderValue)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <IndianRupee className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Paid</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalPaid)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CreditCard className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Balance</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalBalance)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatch Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-6 py-4 text-center text-gray-500">No payment records found</td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.vendorId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.vendorName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.contact}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.orderName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.jobType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.startDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.dispatchDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadgeColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(payment.orderValue)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleEditPayment(payment)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Payment"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Payment Modal */}
      {showEditModal && selectedPayment && (
        <EditVendorPaymentModal
          payment={selectedPayment}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPayment(null);
          }}
          onSave={handleSavePayment}
          readOnly={!canEditVendors}
        />
      )}
    </div>
  );
}
