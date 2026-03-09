import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Mail, Building, FileText, IndianRupee, Package, Edit, Plus } from 'lucide-react';
import EditVendorDetails from '../components/EditVendorDetails';
import EditPurchaseHistoryModal from '../components/EditPurchaseHistoryModal';
import { useEditPermission } from '../components/ProtectedAction';

export default function VendorProfile() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const canEditVendors = useEditPermission('vendors') || useEditPermission('vendors-details') || useEditPermission('vendors-payments');
  const [vendor, setVendor] = useState(location.state?.vendor || null);
  const [loading, setLoading] = useState(!vendor);
  const [showEdit, setShowEdit] = useState(false);
  const [showEditPurchaseHistory, setShowEditPurchaseHistory] = useState(false);
  const [editingPurchaseIndex, setEditingPurchaseIndex] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Load vendor data - database is primary source
    if (!vendor) {
      const savedVendors = localStorage.getItem('vendorData');
      if (savedVendors) {
        const vendors = JSON.parse(savedVendors);
        const found = vendors.find(v => v._id === id);
        if (found) {
          setVendor(found);
        }
      }
      setLoading(false);
    }
  }, [id, vendor]);

  const handleEditPurchaseHistory = (index, purchase) => {
    setEditingPurchaseIndex(index);
    setEditingPurchase(purchase);
    setShowEditPurchaseHistory(true);
  };

  const handleSave = (updated) => {
    setVendor(updated);
    setShowEdit(false);

    const savedVendors = localStorage.getItem('vendorData');
    if (savedVendors) {
      const vendors = JSON.parse(savedVendors);
      const index = vendors.findIndex(v => v._id === id);
      if (index !== -1) {
        vendors[index] = updated;
        localStorage.setItem('vendorData', JSON.stringify(vendors));
      }
    }
  };

  const handleSavePurchaseHistory = (updatedPurchase) => {
    let updatedHistory;
    let updatedVendor;

    if (editingPurchaseIndex === -1) {
      // Adding new purchase history
      updatedHistory = [...vendor.purchaseHistory, updatedPurchase];
      const newTotalAmount = vendor.totalAmount + parseFloat(updatedPurchase.totalAmount);
      const newPaidAmount = vendor.paidAmount + parseFloat(updatedPurchase.amountPaid);
      const newBalance = newTotalAmount - newPaidAmount;

      let paymentStatus = 'Pending';
      if (newBalance === 0 && newTotalAmount > 0) {
        paymentStatus = 'Done';
      } else if (newPaidAmount > 0) {
        paymentStatus = 'Half';
      }

      updatedVendor = {
        ...vendor,
        purchaseHistory: updatedHistory,
        totalAmount: newTotalAmount,
        paidAmount: newPaidAmount,
        balance: newBalance,
        paymentStatus
      };
    } else {
      // Editing existing purchase history
      updatedHistory = [...vendor.purchaseHistory];
      updatedHistory[editingPurchaseIndex] = updatedPurchase;

      updatedVendor = {
        ...vendor,
        purchaseHistory: updatedHistory
      };
    }

    setVendor(updatedVendor);
    setShowEditPurchaseHistory(false);
    setEditingPurchaseIndex(null);
    setEditingPurchase(null);

    const savedVendors = localStorage.getItem('vendorData');
    if (savedVendors) {
      const vendors = JSON.parse(savedVendors);
      const index = vendors.findIndex(v => v._id === id);
      if (index !== -1) {
        vendors[index] = updatedVendor;
        localStorage.setItem('vendorData', JSON.stringify(vendors));
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      'Done': 'bg-green-100 text-green-800',
      'Half': 'bg-blue-100 text-blue-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'On Hold': 'bg-gray-100 text-gray-800',
      'Overdue': 'bg-red-100 text-red-800',
      'Paid': 'bg-green-100 text-green-800',
      'Partial': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading || !vendor) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate('/vendors')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            Back to Vendors
          </button>
          <div className="text-center text-gray-600 mt-8">{loading ? 'Loading...' : 'Vendor not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/vendors')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Vendor Dashboard
        </button>

        <div className="mt-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{vendor.vendorName}</h1>
            <p className="text-gray-600 mt-1">Vendor ID: {vendor.vendorId}</p>
          </div>
          {canEditVendors && (
            <button
              onClick={() => setShowEdit(true)}
              className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium"
            >
              Edit
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="w-5 h-5" />
                Vendor Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Contact Number</p>
                  <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    {vendor.contactNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Alt Contact</p>
                  <p className="text-base font-semibold text-gray-900">{vendor.altContactNumber || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    {vendor.email}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    {vendor.address}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">City</p>
                  <p className="text-base font-semibold text-gray-900">{vendor.city}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">State</p>
                  <p className="text-base font-semibold text-gray-900">{vendor.state}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pincode</p>
                  <p className="text-base font-semibold text-gray-900">{vendor.pincode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">GST Number</p>
                  <p className="text-base font-semibold text-gray-900">{vendor.gstNumber}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Purchase History
                </h2>
                {canEditVendors && (
                  <button
                    onClick={() => {
                      setEditingPurchaseIndex(-1);
                      setEditingPurchase({
                        purchaseDate: '',
                        itemName: '',
                        brand: '',
                        finish: '',
                        thickness: '',
                        materialName: '',
                        length: '',
                        width: '',
                        quantity: 0,
                        unitPrice: 0,
                        totalAmount: 0,
                        amountPaid: 0,
                        balance: 0,
                        status: 'Pending'
                      });
                      setShowEditPurchaseHistory(true);
                    }}
                    className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Purchase History
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Finish</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Thickness</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Length</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Width</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vendor.purchaseHistory && vendor.purchaseHistory.length > 0 ? (
                      vendor.purchaseHistory.map((purchase, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{purchase.itemName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{purchase.brand || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{purchase.finish || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{purchase.thickness || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{purchase.materialName || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{purchase.length || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{purchase.width || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{purchase.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(purchase.unitPrice)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(purchase.totalAmount)}</td>
                          <td className="px-4 py-3 text-sm text-green-600 font-medium">{formatCurrency(purchase.amountPaid)}</td>
                          <td className="px-4 py-3 text-sm text-red-600 font-medium">{formatCurrency(purchase.balance)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(purchase.status)}`}>
                              {purchase.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {canEditVendors && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPurchaseHistory(index, purchase);
                                }}
                                className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                                title="Edit Purchase History"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="15" className="px-4 py-6 text-center text-sm text-gray-500">
                          No purchase history available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Payment Status
              </h2>
              <div className="flex justify-center mb-4">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getPaymentStatusColor(vendor.paymentStatus)}`}>
                  {vendor.paymentStatus}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <IndianRupee className="w-5 h-5" />
                Payment Breakdown
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(vendor.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="text-xl font-bold text-green-600">{formatCurrency(vendor.paidAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Remaining Balance</span>
                  <span className="text-xl font-bold text-red-600">{formatCurrency(vendor.balance)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showEdit && (
          <EditVendorDetails
            vendor={vendor}
            onClose={() => setShowEdit(false)}
            onSave={handleSave}
          />
        )}

        {showEditPurchaseHistory && editingPurchase && (
          <EditPurchaseHistoryModal
            vendor={vendor}
            purchase={editingPurchase}
            purchaseIndex={editingPurchaseIndex}
            onClose={() => {
              setShowEditPurchaseHistory(false);
              setEditingPurchaseIndex(null);
              setEditingPurchase(null);
            }}
            onSave={handleSavePurchaseHistory}
          />
        )}
      </div>
    </div>
  );
}
