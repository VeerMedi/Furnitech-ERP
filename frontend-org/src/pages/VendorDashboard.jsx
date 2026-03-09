import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Package, IndianRupee, AlertCircle, CheckCircle } from 'lucide-react';
import { vendorAPI } from '../services/api';
import { useEditPermission } from '../components/ProtectedAction';

export default function VendorDashboard() {
  const navigate = useNavigate();
  const canEditVendors = useEditPermission('vendors');
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({
    totalVendors: 0,
    totalPayable: 0,
    totalPaid: 0,
    totalPending: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Always load from database first
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);

      console.log('🔍 [VendorDashboard] Loading from DATABASE (primary source)...');

      // PRIMARY: Load from database
      const response = await vendorAPI.getAll();
      const data = response.data.data || response.data;

      console.log('✅ [VendorDashboard] Database response:', data?.length || 0, 'vendors');

      if (data && data.length > 0) {
        setVendors(data);
        calculateStats(data);

        // BACKUP: Cache to localStorage for offline fallback only
        try {
          localStorage.setItem('vendorData', JSON.stringify(data));
          localStorage.setItem('vendorDataTimestamp', Date.now().toString());
          console.log('💾 [VendorDashboard] Backed up to localStorage');
        } catch (storageError) {
          console.warn('[VendorDashboard] Failed to backup to localStorage:', storageError);
        }
      } else {
        // No data in database, try localStorage fallback
        console.log('No vendors in database, checking localStorage...');
        const cachedData = localStorage.getItem('vendorData');

        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            setVendors(parsedData);
            calculateStats(parsedData);
            console.log('Loaded vendors from localStorage cache');
          } catch (parseError) {
            console.error('Failed to parse cached vendor data:', parseError);
            setVendors([]);
            setStats({
              totalVendors: 0,
              totalPayable: 0,
              totalPaid: 0,
              totalPending: 0
            });
          }
        } else {
          setVendors([]);
          setStats({
            totalVendors: 0,
            totalPayable: 0,
            totalPaid: 0,
            totalPending: 0
          });
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading vendors from database:', error);

      if (error.response?.status === 401) {
        navigate('/login');
        return;
      }

      // On API error, try localStorage fallback
      console.log('Database error, attempting localStorage fallback...');
      try {
        const cachedData = localStorage.getItem('vendorData');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          setVendors(parsedData);
          calculateStats(parsedData);
          console.log('Loaded vendors from localStorage after API error');
        } else {
          setVendors([]);
          setStats({
            totalVendors: 0,
            totalPayable: 0,
            totalPaid: 0,
            totalPending: 0
          });
        }
      } catch (fallbackError) {
        console.error('localStorage fallback also failed:', fallbackError);
        setVendors([]);
        setStats({
          totalVendors: 0,
          totalPayable: 0,
          totalPaid: 0,
          totalPending: 0
        });
      }

      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const stats = {
      totalVendors: data.length,
      totalPayable: data.reduce((sum, v) => sum + v.totalAmount, 0),
      totalPaid: data.reduce((sum, v) => sum + v.paidAmount, 0),
      totalPending: data.reduce((sum, v) => sum + v.balance, 0)
    };
    setStats(stats);
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      'Done': 'bg-green-100 text-green-800',
      'Half': 'bg-blue-100 text-blue-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'On Hold': 'bg-gray-100 text-gray-800',
      'Overdue': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendor Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage vendor relationships and payments</p>
          </div>
          {canEditVendors && (
            <button
              onClick={() => navigate('/vendors/new')}
              className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium"
            >
              + Create New Vendor
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Vendors</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalVendors}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Payable</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.totalPayable)}</p>
              </div>
              <IndianRupee className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Paid</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.totalPaid)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Pending</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.totalPending)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">All Vendors</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendors.map((vendor) => (
                  <tr
                    key={vendor._id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/vendors/${vendor._id}`, { state: { vendor } })}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.vendorId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vendor.vendorName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{vendor.contactNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{vendor.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(vendor.paymentStatus)}`}>
                        {vendor.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(vendor.totalAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{formatCurrency(vendor.paidAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{formatCurrency(vendor.balance)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/vendors/${vendor._id}`, { state: { vendor } });
                        }}
                        className="p-2 bg-maroon-100 text-maroon-700 rounded hover:bg-maroon-200 transition"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
