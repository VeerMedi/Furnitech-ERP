import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, Truck, FileText, CheckCircle, Calendar, MapPin,
  Phone, User, IndianRupee, Download, AlertCircle, Edit2, Clock, Mail, Loader2, X, Eye
} from 'lucide-react';
import { orderAPI, transportAPI } from '../services/api';
import { useEditPermission } from '../components/ProtectedAction';
import { toast } from '../hooks/useToast';

export default function PostProductionOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  // Check both parent and specific production permissions
  const canEditProduction = useEditPermission('production') || useEditPermission('production-post-production');
  const [order, setOrder] = useState(null);
  const [transport, setTransport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    packagingStatus: '',
    packagingCompletedDate: '',
    dispatchDate: '',
    expectedDeliveryDate: '',
    courierDetails: {
      courierName: '',
      trackingNumber: '',
      contactNumber: ''
    }
  });

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOne(id);
      const orderData = response.data.data || response.data;
      setOrder(orderData);

      // Fetch transport details if transportId exists
      if (orderData.transportId) {
        try {
          const transportResponse = await transportAPI.getOne(orderData.transportId);
          setTransport(transportResponse.data.data || transportResponse.data);
        } catch (err) {
          console.log('No transport found for this order');
        }
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not Set';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not Set';
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeliveryStatusBadge = (status) => {
    const badges = {
      'READY_FOR_DISPATCH': { label: 'Ready for Dispatch', class: 'bg-blue-100 text-blue-800', icon: Package },
      'IN_TRANSIT': { label: 'In Transit', class: 'bg-yellow-100 text-yellow-800', icon: Truck },
      'OUT_FOR_DELIVERY': { label: 'Out for Delivery', class: 'bg-purple-100 text-purple-800', icon: Truck },
      'DELIVERED': { label: 'Delivered', class: 'bg-green-100 text-green-800', icon: CheckCircle },
      'FAILED_DELIVERY': { label: 'Failed Delivery', class: 'bg-red-100 text-red-800', icon: AlertCircle },
    };
    return badges[status] || { label: status, class: 'bg-gray-100 text-gray-800', icon: Package };
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      'PENDING': { label: 'Pending', class: 'bg-red-100 text-red-800' },
      'PARTIAL': { label: 'Partial', class: 'bg-yellow-100 text-yellow-800' },
      'COMPLETED': { label: 'Paid', class: 'bg-green-100 text-green-800' },
    };
    return badges[status] || { label: status, class: 'bg-gray-100 text-gray-800' };
  };

  const getPackagingStatusBadge = (status) => {
    const badges = {
      'NOT_STARTED': { label: 'Not Started', class: 'bg-gray-100 text-gray-800' },
      'IN_PROGRESS': { label: 'In Progress', class: 'bg-blue-100 text-blue-800' },
      'COMPLETED': { label: 'Completed', class: 'bg-green-100 text-green-800' },
    };
    return badges[status] || { label: status, class: 'bg-gray-100 text-gray-800' };
  };

  const handleOpenInvoicePreview = async () => {
    try {
      // Refetch order data to get latest advance payment
      console.log('🔄 Refreshing order data for invoice preview...');
      const response = await orderAPI.getOne(id);
      const freshOrder = response.data.data || response.data;

      // Update order state with fresh data
      setOrder(freshOrder);

      console.log('💰 Fresh advance payment:', freshOrder.advanceReceived);

      // Initialize invoice data from FRESH order
      const data = {
        invoiceNumber: freshOrder.invoice?.invoiceNumber || `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
        invoiceDate: freshOrder.invoice?.invoiceDate || new Date().toISOString().split('T')[0],
        orderNumber: freshOrder.orderNumber,
        orderDate: new Date(freshOrder.orderDate).toISOString().split('T')[0],

        // Customer Details
        customerName: `${freshOrder.customer?.firstName || ''} ${freshOrder.customer?.lastName || ''}`.trim(),
        customerPhone: freshOrder.customer?.phone || '',
        customerEmail: freshOrder.customer?.email || '',
        customerAddress: freshOrder.customer?.deliveryAddress
          ? [
            freshOrder.customer.deliveryAddress.street,
            freshOrder.customer.deliveryAddress.city,
            freshOrder.customer.deliveryAddress.state
              ? `${freshOrder.customer.deliveryAddress.state} - ${freshOrder.customer.deliveryAddress.pincode || ''}`
              : freshOrder.customer.deliveryAddress.pincode
          ].filter(Boolean).join(', ')
          : freshOrder.customer?.address || '',

        // Company Details
        companyName: 'Vlite Furnitures',
        companyAddress: 'Manufacturing Unit, Industrial Area, Sector 24',
        companyPhone: '+91 98765 43210',
        companyEmail: 'info@vlitefurnitures.com',
        companyGST: '24XXXXX1234X1Z5',

        // Items
        items: freshOrder.items.map(item => ({
          description: item.description || item.product?.name || 'Product',
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || 0
        })),

        // Financial - Use fresh data
        totalAmount: freshOrder.totalAmount || 0,
        advanceReceived: freshOrder.advanceReceived || 0,
        balanceAmount: (freshOrder.totalAmount || 0) - (freshOrder.advanceReceived || 0),
        gstRate: 18,

        // Footer & Terms
        terms: [
          'Payment is due within 30 days from invoice date.',
          'Goods once sold will not be taken back.',
          'Interest @ 18% per annum will be charged on delayed payments.',
          'Subject to local jurisdiction only.'
        ],
        footerCompanyName: 'Vlite Furnitures',
        authorizedSignatory: 'Authorized Signatory',
        amountInWords: '',
      };

      setInvoiceData(data);
      setShowInvoicePreview(true);
    } catch (error) {
      console.error('Error loading invoice preview:', error);
      toast.error('Failed to load invoice preview');
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      setGeneratingInvoice(true);
      setShowInvoicePreview(false);

      // Send edited invoice data to backend
      await orderAPI.generateInvoice(id, invoiceData);

      toast.success('Invoice generated! ✅');
      // Refresh order details to show the generated invoice
      await fetchOrderDetails();
    } catch (err) {
      console.error('Error generating invoice:', err);
      toast.error('Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handlePreviewAndDownload = () => {
    // Open preview modal with existing invoice data
    handleOpenInvoicePreview();
  };

  const handleDownloadInvoice = async () => {
    try {
      setDownloadingInvoice(true);
      console.log('Downloading invoice for order:', id);
      console.log('Order invoice data:', order.invoice);

      const response = await orderAPI.downloadInvoice(id);

      console.log('Download response:', response);

      // Create blob from response
      const blob = new Blob([response.data], { type: 'application/pdf' });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${order.invoice?.invoiceNumber || order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Invoice downloaded! ✅');
      setShowInvoicePreview(false); // Close modal after download
    } catch (err) {
      console.error('Error downloading invoice:', err);
      console.error('Error response:', err.response?.data);

      // Try to read the error blob if it's JSON
      if (err.response?.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result);
            toast.error('Failed to download invoice');
          } catch {
            toast.error('Failed to download invoice');
          }
        };
        reader.readAsText(err.response.data);
      } else {
        toast.error('Failed to download invoice');
      }
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleOpenEditModal = () => {
    setEditFormData({
      packagingStatus: order.packagingStatus || 'NOT_STARTED',
      packagingCompletedDate: order.packagingCompletedDate ? order.packagingCompletedDate.split('T')[0] : '',
      dispatchDate: order.dispatchDate ? order.dispatchDate.split('T')[0] : '',
      expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.split('T')[0] : '',
      courierDetails: {
        courierName: order.courierDetails?.courierName || '',
        trackingNumber: order.courierDetails?.trackingNumber || '',
        contactNumber: order.courierDetails?.contactNumber || ''
      }
    });
    setShowEditModal(true);
  };

  const handleUpdatePackaging = async (e) => {
    e.preventDefault();
    try {
      await orderAPI.update(id, editFormData);
      toast.success('Updated! ✅');
      setShowEditModal(false);
      await fetchOrderDetails();
    } catch (err) {
      console.error('Error updating packaging details:', err);
      toast.error('Failed to update');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-primary"></div>
            <p className="text-gray-600 mt-4">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/production/post-production')}
            className="flex items-center gap-2 text-primary hover:text-primary/80 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Post-Production
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error || 'Order not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const deliveryBadge = getDeliveryStatusBadge(order.deliveryStatus || 'READY_FOR_DISPATCH');
  const DeliveryIcon = deliveryBadge.icon;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/production/post-production')}
          className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Post-Production
        </button>

        {/* Order Header Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{order.orderNumber}</h1>
              <p className="text-sm text-gray-500 mt-1">Post-Production Tracking</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Product Type</p>
                {(() => {
                  const pType = order.productType || order.customer?.productType || 'N/A';
                  let badgeClass = 'bg-gray-100 text-gray-800';
                  if (['Wood', 'WOOD'].includes(pType)) badgeClass = 'bg-amber-100 text-amber-800';
                  if (['Steel', 'STEEL'].includes(pType)) badgeClass = 'bg-blue-100 text-blue-800';
                  return (
                    <span className={`px-3 py-1 rounded font-medium ${badgeClass}`}>
                      {pType}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Delivery Status</span>
                <DeliveryIcon className="w-5 h-5 text-gray-400" />
              </div>
              <span className={`inline-block px-3 py-1 rounded font-medium text-sm ${deliveryBadge.class}`}>
                {deliveryBadge.label}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Payment Status</span>
                <IndianRupee className="w-5 h-5 text-gray-400" />
              </div>
              <span className={`inline-block px-3 py-1 rounded font-medium text-sm ${getPaymentStatusBadge(order.paymentStatus).class}`}>
                {getPaymentStatusBadge(order.paymentStatus).label}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Packaging Status</span>
                <Package className="w-5 h-5 text-gray-400" />
              </div>
              <span className={`inline-block px-3 py-1 rounded font-medium text-sm ${getPackagingStatusBadge(order.packagingStatus || 'NOT_STARTED').class}`}>
                {getPackagingStatusBadge(order.packagingStatus || 'NOT_STARTED').label}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Customer Name</p>
                      <p className="text-sm font-medium text-gray-900">
                        {order.customer?.firstName} {order.customer?.lastName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                      <p className="text-sm font-medium text-gray-900">{order.customer?.phone || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Email Address</p>
                      <p className="text-sm font-medium text-gray-900 break-all">{order.customer?.email || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Delivery Address</p>
                      <p className="text-sm font-medium text-gray-900">
                        {(() => {
                          // First try order.deliveryAddress
                          if (order.deliveryAddress?.street && order.deliveryAddress?.city) {
                            return `${order.deliveryAddress.street}, ${order.deliveryAddress.city}`;
                          }

                          // Then try order.customer?.address
                          const customerAddress = order.customer?.address;
                          if (customerAddress) {
                            // If it's an object, format it
                            if (typeof customerAddress === 'object') {
                              const parts = [
                                customerAddress.street,
                                customerAddress.area,
                                customerAddress.city,
                                customerAddress.state,
                                customerAddress.zipCode
                              ].filter(Boolean);
                              return parts.length > 0 ? parts.join(', ') : 'N/A';
                            }
                            // If it's a string, return it directly
                            return customerAddress;
                          }

                          return 'N/A';
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Packaging & Dispatch Section */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Packaging & Dispatch</h2>
                {canEditProduction && (
                  <button
                    onClick={handleOpenEditModal}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Update
                  </button>
                )}
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Packaging Status</p>
                    <span className={`inline-block px-3 py-1 rounded font-medium text-sm ${getPackagingStatusBadge(order.packagingStatus || 'NOT_STARTED').class}`}>
                      {getPackagingStatusBadge(order.packagingStatus || 'NOT_STARTED').label}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Packaging Completed</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(order.packagingCompletedDate)}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Dispatch Date</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(order.dispatchDate)}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Expected Delivery</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(order.expectedDeliveryDate)}</p>
                  </div>
                </div>

                {/* Courier Details */}
                {order.courierDetails?.courierName && (
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Courier Details</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Courier Name</p>
                        <p className="text-sm font-medium text-gray-900">{order.courierDetails.courierName}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Tracking Number</p>
                        <p className="text-sm font-medium text-gray-900">{order.courierDetails.trackingNumber || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Contact</p>
                        <p className="text-sm font-medium text-gray-900">{order.courierDetails.contactNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transport Integration Button */}
                {canEditProduction && !order.transportId && order.packagingStatus === 'COMPLETED' && (
                  <button
                    onClick={() => navigate('/delivery-orders/new', {
                      state: {
                        orderData: {
                          orderNumber: order.orderNumber,
                          orderId: order._id,
                          productId: order.orderNumber,
                          productName: order.items?.map(item => item.description || item.product?.name).join(', ') || 'Product',
                          clientName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(),
                          clientAddress: order.deliveryAddress?.street && order.deliveryAddress?.city
                            ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state || ''} ${order.deliveryAddress.zipCode || ''}`.trim()
                            : order.customer?.address || '',
                          clientContact: order.customer?.phone || '',
                          deliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toISOString().split('T')[0] : '',
                          items: order.items || []
                        }
                      }
                    })}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
                  >
                    <Truck className="w-5 h-5" />
                    🚚 Create Dispatch / Delivery Order
                  </button>
                )}

                {order.transportId && (
                  <button
                    onClick={() => navigate(`/transport/${order.transportId}`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <Truck className="w-5 h-5" />
                    View Transport Details
                  </button>
                )}
              </div>
            </div>

            {/* Invoice & Documentation */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Invoice & Documentation</h2>
                {canEditProduction && (
                  <button
                    onClick={handleOpenInvoicePreview}
                    disabled={generatingInvoice}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye className="w-4 h-4" />
                    {order.invoice?.invoiceNumber ? 'Edit & Regenerate Invoice' : 'Preview & Generate Invoice'}
                  </button>
                )}
              </div>
              <div className="p-6">
                {order.invoice?.invoiceNumber ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <p className="text-xs text-green-600 mb-1">Invoice Number</p>
                        <p className="text-sm font-bold text-green-900">{order.invoice.invoiceNumber}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Invoice Date</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(order.invoice.invoiceDate)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <span className="inline-block px-3 py-1 rounded font-medium text-xs bg-blue-100 text-blue-800">
                          {order.invoiceStatus || 'GENERATED'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                        <p className="text-xl font-bold text-gray-900">₹{order.totalAmount?.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Payment Status</p>
                        <span className={`inline-block px-3 py-1 rounded font-medium text-sm ${getPaymentStatusBadge(order.paymentStatus).class}`}>
                          {getPaymentStatusBadge(order.paymentStatus).label}
                        </span>
                      </div>
                    </div>


                    {order.invoice?.invoiceNumber && (
                      <div className="space-y-3">
                        {/* Preview & Download Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Preview Button */}
                          <button
                            onClick={() => window.open(`${import.meta.env.VITE_BACKEND_URL}${order.invoice.invoiceUrl}`, '_blank')}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors font-medium"
                          >
                            <Eye className="w-5 h-5" />
                            Preview
                          </button>

                          {/* Download Button */}
                          <button
                            onClick={handleDownloadInvoice}
                            disabled={downloadingInvoice}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                          >
                            {downloadingInvoice ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="w-5 h-5" />
                                Download
                              </>
                            )}
                          </button>
                        </div>


                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Invoice not generated yet</p>
                    <p className="text-gray-400 text-xs mt-1">Click "Generate Invoice" to create invoice document</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Delivery Status Timeline */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Delivery Timeline</h2>
              </div>
              <div className="p-6">
                {order.deliveryStatusLogs && order.deliveryStatusLogs.length > 0 ? (
                  <div className="space-y-4">
                    {order.deliveryStatusLogs.map((log, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-primary" />
                          </div>
                          {index < order.deliveryStatusLogs.length - 1 && (
                            <div className="w-0.5 h-12 bg-gray-200 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="font-medium text-gray-900 text-sm">{log.status}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(log.timestamp)}</p>
                          {log.location && (
                            <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {log.location}
                            </p>
                          )}
                          {log.notes && (
                            <p className="text-sm text-gray-600 mt-2">{log.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No delivery updates yet</p>
                    <p className="text-gray-400 text-xs mt-1">Timeline will appear when order is dispatched</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dates Information */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Important Dates</h2>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Order Date</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(order.orderDate)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-sm text-gray-600">Production Completed</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(order.packagingCompletedDate)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-sm text-gray-600">Dispatch Date</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(order.dispatchDate)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-sm text-gray-600">Expected Delivery</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(order.expectedDeliveryDate)}</span>
                </div>
                {order.actualDeliveryDate && (
                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <span className="text-sm text-gray-600">Actual Delivery</span>
                    <span className="text-sm font-bold text-green-600">{formatDate(order.actualDeliveryDate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Signature */}
            {order.customerSignature?.signatureUrl && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-lg font-semibold text-gray-900">Customer Confirmation</h2>
                </div>
                <div className="p-6">
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <img
                      src={order.customerSignature.signatureUrl}
                      alt="Customer Signature"
                      className="w-full h-24 object-contain"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Signed By:</span>
                      <span className="font-medium text-gray-900">{order.customerSignature.signedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Signed At:</span>
                      <span className="font-medium text-gray-900">{formatDateTime(order.customerSignature.signedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Preview & Edit Modal */}
      {
        showInvoicePreview && invoiceData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Invoice Preview & Edit</h2>
                  <p className="text-sm text-gray-500 mt-1">Review and edit invoice details before generating</p>
                </div>
                <button
                  onClick={() => setShowInvoicePreview(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Company Details Section */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Company Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Company Name</label>
                        <input
                          type="text"
                          value={invoiceData.companyName}
                          onChange={(e) => setInvoiceData({ ...invoiceData, companyName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">GST Number</label>
                        <input
                          type="text"
                          value={invoiceData.companyGST}
                          onChange={(e) => setInvoiceData({ ...invoiceData, companyGST: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                        <input
                          type="text"
                          value={invoiceData.companyAddress}
                          onChange={(e) => setInvoiceData({ ...invoiceData, companyAddress: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="text"
                          value={invoiceData.companyPhone}
                          onChange={(e) => setInvoiceData({ ...invoiceData, companyPhone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={invoiceData.companyEmail}
                          onChange={(e) => setInvoiceData({ ...invoiceData, companyEmail: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Invoice Details Section */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h3 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Invoice Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Number</label>
                        <input
                          type="text"
                          value={invoiceData.invoiceNumber}
                          onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Date</label>
                        <input
                          type="date"
                          value={invoiceData.invoiceDate}
                          onChange={(e) => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Order Number</label>
                        <input
                          type="text"
                          value={invoiceData.orderNumber}
                          onChange={(e) => setInvoiceData({ ...invoiceData, orderNumber: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Order Date</label>
                        <input
                          type="date"
                          value={invoiceData.orderDate}
                          onChange={(e) => setInvoiceData({ ...invoiceData, orderDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Customer Details Section */}
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <h3 className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Customer Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name</label>
                        <input
                          type="text"
                          value={invoiceData.customerName}
                          onChange={(e) => setInvoiceData({ ...invoiceData, customerName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="text"
                          value={invoiceData.customerPhone}
                          onChange={(e) => setInvoiceData({ ...invoiceData, customerPhone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={invoiceData.customerEmail}
                          onChange={(e) => setInvoiceData({ ...invoiceData, customerEmail: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                        <input
                          type="text"
                          value={invoiceData.customerAddress}
                          onChange={(e) => setInvoiceData({ ...invoiceData, customerAddress: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Items Section */}
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h3 className="text-sm font-bold text-yellow-900 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Invoice Items
                    </h3>
                    <div className="space-y-3">
                      {invoiceData.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 bg-white p-3 rounded-lg border border-yellow-300">
                          <div className="col-span-5">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => {
                                const newItems = [...invoiceData.items];
                                newItems[index].description = e.target.value;
                                setInvoiceData({ ...invoiceData, items: newItems });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...invoiceData.items];
                                newItems[index].quantity = parseFloat(e.target.value) || 0;
                                newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
                                setInvoiceData({ ...invoiceData, items: newItems });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const newItems = [...invoiceData.items];
                                newItems[index].unitPrice = parseFloat(e.target.value) || 0;
                                newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
                                setInvoiceData({ ...invoiceData, items: newItems });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                            <input
                              type="number"
                              value={item.totalPrice}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-100 font-bold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Details Section */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-300">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <IndianRupee className="w-4 h-4" />
                      Financial Details
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Total Amount</label>
                          <input
                            type="number"
                            value={invoiceData.totalAmount}
                            onChange={(e) => setInvoiceData({ ...invoiceData, totalAmount: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">GST Rate (%)</label>
                          <input
                            type="number"
                            value={invoiceData.gstRate}
                            onChange={(e) => setInvoiceData({ ...invoiceData, gstRate: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Advance Received</label>
                          <input
                            type="number"
                            value={invoiceData.advanceReceived}
                            onChange={(e) => {
                              const advance = parseFloat(e.target.value) || 0;
                              setInvoiceData({
                                ...invoiceData,
                                advanceReceived: advance,
                                balanceAmount: invoiceData.totalAmount - advance
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Balance Amount</label>
                          <input
                            type="number"
                            value={invoiceData.balanceAmount}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold bg-red-50"
                          />
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="bg-white border border-gray-300 rounded-lg p-3 mt-3">
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-gray-600">Subtotal (before GST):</span>
                          <span className="font-medium">₹{(invoiceData.totalAmount / (1 + invoiceData.gstRate / 100)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-gray-600">CGST ({invoiceData.gstRate / 2}%):</span>
                          <span className="font-medium">₹{((invoiceData.totalAmount * invoiceData.gstRate / (100 + invoiceData.gstRate)) / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-gray-600">SGST ({invoiceData.gstRate / 2}%):</span>
                          <span className="font-medium">₹{((invoiceData.totalAmount * invoiceData.gstRate / (100 + invoiceData.gstRate)) / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-gray-300">
                          <span>Grand Total:</span>
                          <span className="text-primary">₹{invoiceData.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions Section */}
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <h3 className="text-sm font-bold text-orange-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Terms & Conditions
                    </h3>
                    <div className="space-y-2">
                      {invoiceData.terms.map((term, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <span className="text-xs font-medium text-gray-700 mt-2">{index + 1}.</span>
                          <textarea
                            value={term}
                            onChange={(e) => {
                              const newTerms = [...invoiceData.terms];
                              newTerms[index] = e.target.value;
                              setInvoiceData({ ...invoiceData, terms: newTerms });
                            }}
                            rows={2}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newTerms = [...invoiceData.terms, 'New term'];
                          setInvoiceData({ ...invoiceData, terms: newTerms });
                        }}
                        className="text-sm text-primary hover:text-primary/80 font-medium"
                      >
                        + Add Term
                      </button>
                    </div>
                  </div>

                  {/* Footer Section */}
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                    <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                      <Edit2 className="w-4 h-4" />
                      Invoice Footer
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Footer Company Name</label>
                        <input
                          type="text"
                          value={invoiceData.footerCompanyName}
                          onChange={(e) => setInvoiceData({ ...invoiceData, footerCompanyName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="For Company Name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Signatory Text</label>
                        <input
                          type="text"
                          value={invoiceData.authorizedSignatory}
                          onChange={(e) => setInvoiceData({ ...invoiceData, authorizedSignatory: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Authorized Signatory"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowInvoicePreview(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Cancel
                </button>
                {order.invoice?.invoiceUrl ? (
                  <>
                    <button
                      onClick={handleGenerateInvoice}
                      disabled={generatingInvoice}
                      className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingInvoice ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-5 h-5" />
                          Regenerate Invoice
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadInvoice}
                      disabled={downloadingInvoice}
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloadingInvoice ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          Download PDF
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleGenerateInvoice}
                    disabled={generatingInvoice}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingInvoice ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
                        Generate Invoice PDF
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Edit Packaging & Dispatch Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Update Packaging & Dispatch</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleUpdatePackaging} className="p-6 space-y-6">
              {/* Packaging Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Packaging Status
                </label>
                <select
                  value={editFormData.packagingStatus}
                  onChange={(e) => setEditFormData({ ...editFormData, packagingStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Packaging Completed
                  </label>
                  <input
                    type="date"
                    value={editFormData.packagingCompletedDate}
                    onChange={(e) => setEditFormData({ ...editFormData, packagingCompletedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dispatch Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.dispatchDate}
                    onChange={(e) => setEditFormData({ ...editFormData, dispatchDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Delivery
                  </label>
                  <input
                    type="date"
                    value={editFormData.expectedDeliveryDate}
                    onChange={(e) => setEditFormData({ ...editFormData, expectedDeliveryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Courier Details */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Courier Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Courier Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.courierDetails.courierName}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        courierDetails: { ...editFormData.courierDetails, courierName: e.target.value }
                      })}
                      placeholder="e.g., Blue Dart"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tracking Number
                    </label>
                    <input
                      type="text"
                      value={editFormData.courierDetails.trackingNumber}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        courierDetails: { ...editFormData.courierDetails, trackingNumber: e.target.value }
                      })}
                      placeholder="e.g., BD123456789"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={editFormData.courierDetails.contactNumber}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        courierDetails: { ...editFormData.courierDetails, contactNumber: e.target.value }
                      })}
                      placeholder="e.g., 9876543210"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div >
  );
}
