import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Calendar,
  IndianRupee,
  FileText,
  Clock,
  CheckCircle,
  Edit,
  Download
} from 'lucide-react';
import { orderAPI } from '../services/api';
import { useEditPermission } from '../components/ProtectedAction';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from '../hooks/useToast';

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canEditOrders = useEditPermission('orders');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      console.log('🔍 [OrderDetails] Loading from DATABASE (primary source)...');
      const response = await orderAPI.getOne(id);
      setOrder(response.data.data);

      // BACKUP: Cache to localStorage for offline fallback only
      try {
        localStorage.setItem(`orderDetails_${id}`, JSON.stringify(response.data.data));
        console.log('💾 [OrderDetails] Cached to localStorage');
      } catch (storageError) {
        console.warn('Failed to cache to localStorage:', storageError);
      }
    } catch (error) {
      console.error('❌ [OrderDetails] Error fetching from database:', error);

      // FALLBACK: Try localStorage only if database fails
      try {
        const cachedOrder = localStorage.getItem(`orderDetails_${id}`);
        if (cachedOrder) {
          console.log('📦 [OrderDetails] Loading from localStorage (fallback)');
          setOrder(JSON.parse(cachedOrder));
        } else {
          toast.error('Failed to load order');
        }
      } catch (storageError) {
        console.error('Failed to load from localStorage:', storageError);
        toast.error('Failed to load order');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      'CONFIRMED': 'bg-blue-100 text-blue-800 border-blue-300',
      'IN_PRODUCTION': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'COMPLETED': 'bg-green-100 text-green-800 border-green-300',
      'DELIVERED': 'bg-purple-100 text-purple-800 border-purple-300',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-300',
      'ON_HOLD': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    const convertLessThanThousand = (n) => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    };

    if (num < 1000) return convertLessThanThousand(num);
    if (num < 100000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      return convertLessThanThousand(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + convertLessThanThousand(remainder) : '');
    }
    if (num < 10000000) {
      const lakhs = Math.floor(num / 100000);
      const remainder = num % 100000;
      return convertLessThanThousand(lakhs) + ' Lakh' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }
    const crores = Math.floor(num / 10000000);
    const remainder = num % 10000000;
    return convertLessThanThousand(crores) + ' Crore' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
  };

  const handleExport = () => {
    if (!order) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // ========== COMPANY HEADER ==========
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38); // Red color
    doc.text('Vlite Furnitures', 14, yPos);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Manufacturing Unit, Industrial Area', 14, yPos + 8);
    doc.text('Phone: +91 XXXXXXXXXX', 14, yPos + 13);
    doc.text('Email: info@vlitefurnitures.com', 14, yPos + 18);
    doc.text('GST No: XXXXXXXXXXXX', 14, yPos + 23);

    // ========== ORDER DETAILS (Right Side) ==========
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('ORDER DETAILS', pageWidth - 14, yPos, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Order No: ${order.orderNumber}`, pageWidth - 14, yPos + 10, { align: 'right' });
    doc.text(`Order Date: ${new Date(order.orderDate).toLocaleDateString('en-IN')}`, pageWidth - 14, yPos + 15, { align: 'right' });
    doc.text(`Status: ${order.orderStatus?.replace('_', ' ') || 'N/A'}`, pageWidth - 14, yPos + 20, { align: 'right' });
    doc.text(`Priority: ${order.priority || 'N/A'}`, pageWidth - 14, yPos + 25, { align: 'right' });

    yPos = 55;

    // Draw horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, yPos, pageWidth - 14, yPos);

    yPos += 8;

    // ========== CUSTOMER DETAILS (Left) ==========
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('Bill To:', 14, yPos);

    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const customerName = order.customer?.firstName && order.customer?.lastName
      ? `${order.customer.firstName} ${order.customer.lastName}`
      : order.customer?.name || 'N/A';

    doc.text(customerName, 14, yPos);
    yPos += 5;
    doc.text(order.customer?.phone || '', 14, yPos);
    yPos += 5;
    if (order.customer?.email) {
      doc.text(order.customer.email, 14, yPos);
      yPos += 5;
    }

    // ========== DELIVERY DETAILS (Right) ==========
    let rightYPos = 63;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('Deliver To:', pageWidth / 2 + 5, rightYPos);

    rightYPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(customerName, pageWidth / 2 + 5, rightYPos);

    if (order.deliveryAddress) {
      rightYPos += 5;
      if (order.deliveryAddress.street) {
        doc.text(order.deliveryAddress.street, pageWidth / 2 + 5, rightYPos, { maxWidth: 85 });
        rightYPos += 5;
      }
      if (order.deliveryAddress.area) {
        doc.text(order.deliveryAddress.area, pageWidth / 2 + 5, rightYPos, { maxWidth: 85 });
        rightYPos += 5;
      }
      const cityState = `${order.deliveryAddress.city || ''}, ${order.deliveryAddress.state || ''} - ${order.deliveryAddress.zipCode || ''}`;
      doc.text(cityState, pageWidth / 2 + 5, rightYPos, { maxWidth: 85 });
      rightYPos += 5;
    }
    doc.text(`Phone: ${order.customer?.phone || ''}`, pageWidth / 2 + 5, rightYPos);

    yPos = Math.max(yPos, rightYPos) + 8;

    // Draw horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, pageWidth - 14, yPos);

    yPos += 5;

    // ========== ITEMS TABLE ==========
    const tableTop = yPos;
    const itemsData = order.items?.map(item => [
      item.description || 'N/A',
      item.quantity || 0,
      `₹${(item.unitPrice || 0).toLocaleString('en-IN')}`,
      `₹${(item.totalPrice || 0).toLocaleString('en-IN')}`,
    ]) || [];

    autoTable(doc, {
      startY: tableTop,
      head: [['Description', 'Qty', 'Unit Price', 'Amount']],
      body: itemsData,
      theme: 'grid',
      headStyles: {
        fillColor: [220, 38, 38],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // ========== TOTALS SECTION ==========
    const rightX = pageWidth - 14;
    const labelX = pageWidth - 80;

    // Calculate GST
    const subtotal = order.totalAmount || 0;
    const gstRate = 18;
    const gstAmount = (subtotal * gstRate) / (100 + gstRate);
    const amountBeforeGST = subtotal - gstAmount;
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    doc.text('Subtotal:', labelX, yPos);
    doc.text(`₹${amountBeforeGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, yPos, { align: 'right' });
    yPos += 6;

    doc.text(`CGST (${gstRate / 2}%):`, labelX, yPos);
    doc.text(`₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, yPos, { align: 'right' });
    yPos += 6;

    doc.text(`SGST (${gstRate / 2}%):`, labelX, yPos);
    doc.text(`₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, yPos, { align: 'right' });
    yPos += 6;

    // Draw line before total
    doc.setDrawColor(200, 200, 200);
    doc.line(labelX - 5, yPos, rightX, yPos);
    yPos += 5;

    // Grand Total
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', labelX, yPos);
    doc.text(`₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, yPos, { align: 'right' });
    yPos += 8;

    // Payment Info
    if (order.advanceReceived > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Advance Paid:', labelX, yPos);
      doc.text(`₹${order.advanceReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, yPos, { align: 'right' });
      yPos += 6;

      doc.setFont('helvetica', 'bold');
      doc.text('Balance Due:', labelX, yPos);
      doc.text(`₹${order.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, yPos, { align: 'right' });
      yPos += 8;
    }

    // Amount in Words
    yPos += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Amount in Words: ${numberToWords(Math.round(subtotal))} Rupees Only`, 14, yPos, { maxWidth: pageWidth - 28 });

    yPos += 15;

    // ========== TERMS & CONDITIONS ==========
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('Terms & Conditions:', 14, yPos);

    yPos += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const terms = [
      'Payment is due within 30 days from order date.',
      'Goods once sold will not be taken back.',
      'Interest @ 18% per annum will be charged on delayed payments.',
      'Subject to local jurisdiction only.'
    ];

    terms.forEach((term, index) => {
      doc.text(`${index + 1}. ${term}`, 14, yPos);
      yPos += 5;
    });

    // ========== SIGNATURE SECTION ==========
    const signatureY = pageHeight - 40;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('For Vlite Furnitures', pageWidth - 60, signatureY);

    doc.setDrawColor(0, 0, 0);
    doc.line(pageWidth - 60, signatureY + 15, pageWidth - 14, signatureY + 15);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signatory', pageWidth - 60, signatureY + 20);

    // ========== FOOTER ==========
    doc.setFontSize(7);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Save the PDF
    doc.save(`Order_${order.orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Order not found</p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 text-red-600 hover:text-red-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
            <p className="text-gray-600 mt-1">Order ID: {order.orderNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEditOrders && (
            <button
              onClick={() => navigate(`/orders/${id}/edit`)}
              className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Order
            </button>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Order Status
        </h2>
        <div className="flex items-center gap-4">
          <span className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 ${getStatusColor(order.orderStatus)}`}>
            {order.orderStatus?.replace('_', ' ')}
          </span>
          <div className="text-sm text-gray-600">
            Last updated: {formatDateTime(order.updatedAt)}
          </div>
        </div>

        {/* Status History */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Status History</h3>
            <div className="space-y-2">
              {order.statusHistory.map((history, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-red-700"></div>
                  <span className="font-medium text-gray-700">{history.status?.replace('_', ' ')}</span>
                  <span className="text-gray-500">-</span>
                  <span className="text-gray-600">{formatDateTime(history.changedAt)}</span>
                  {history.notes && <span className="text-gray-500 italic">({history.notes})</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium text-gray-900">
                  {order.customer?.firstName && order.customer?.lastName
                    ? `${order.customer.firstName} ${order.customer.lastName}`
                    : order.customer?.name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{order.customer?.phone}</p>
              </div>
              {order.customer?.email && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{order.customer?.email}</p>
                </div>
              )}
              {order.customer?.companyName && (
                <div>
                  <p className="text-sm text-gray-600">Company Name</p>
                  <p className="font-medium text-gray-900">{order.customer?.companyName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Delivery Address
            </h2>
            <div className="text-gray-700">
              {order.deliveryAddress?.street && <p>{order.deliveryAddress.street}</p>}
              {order.deliveryAddress?.area && <p>{order.deliveryAddress.area}</p>}
              <p>
                {order.deliveryAddress?.city}, {order.deliveryAddress?.state} - {order.deliveryAddress?.zipCode}
              </p>
            </div>
          </div>

          {/* Product List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Items ({order.items?.length || 0})
            </h2>
            <div className="space-y-4">
              {order.items?.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.description}
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{item.description}</h4>
                      {item.specifications && (
                        <div className="text-sm text-gray-600 mt-1">
                          {item.specifications.dimensions && <p>Dimensions: {item.specifications.dimensions}</p>}
                          {item.specifications.material && <p>Material: {item.specifications.material}</p>}
                          {item.specifications.color && <p>Color: {item.specifications.color}</p>}
                          {item.specifications.finish && <p>Finish: {item.specifications.finish}</p>}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-600">Qty: <span className="font-medium text-gray-900">{item.quantity}</span></span>
                        <span className="text-gray-600">Unit Price: <span className="font-medium text-gray-900">{formatCurrency(item.unitPrice)}</span></span>
                        <span className="text-gray-600">Total: <span className="font-semibold text-gray-900">{formatCurrency(item.totalPrice)}</span></span>
                      </div>
                      {item.productionStatus && (
                        <div className="mt-2">
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                            {item.productionStatus.replace('_', ' ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {(order.productionNotes || order.customerNotes || order.internalNotes) && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Notes
              </h2>
              <div className="space-y-3">
                {order.productionNotes && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Production Notes:</p>
                    <p className="text-gray-600">{order.productionNotes}</p>
                  </div>
                )}
                {order.customerNotes && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Customer Notes:</p>
                    <p className="text-gray-600">{order.customerNotes}</p>
                  </div>
                )}
                {order.internalNotes && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Internal Notes:</p>
                    <p className="text-gray-600">{order.internalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <IndianRupee className="w-5 h-5" />
              Order Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(order.totalAmount)}</span>
              </div>
              {order.advanceReceived > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Advance Paid</span>
                    <span className="font-medium text-green-600">{formatCurrency(order.advanceReceived)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Balance</span>
                    <span className="font-medium text-red-600">{formatCurrency(order.balanceAmount)}</span>
                  </div>
                </>
              )}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total Amount</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
              <div className="pt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${order.paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                  order.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                  Payment: {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Important Dates
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Order Date</p>
                <p className="font-medium text-gray-900">{new Date(order.orderDate).toLocaleDateString('en-IN')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Expected Delivery</p>
                <p className="font-medium text-gray-900">{new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN')}</p>
              </div>
              {order.actualDeliveryDate && (
                <div>
                  <p className="text-sm text-gray-600">Actual Delivery</p>
                  <p className="font-medium text-green-600">{formatDate(order.actualDeliveryDate)}</p>
                </div>
              )}
              {order.installationDate && (
                <div>
                  <p className="text-sm text-gray-600">Installation Date</p>
                  <p className="font-medium text-gray-900">{formatDate(order.installationDate)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Priority */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Priority</h2>
            <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${order.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
              order.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                order.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
              }`}>
              {order.priority}
            </span>
          </div>

          {/* Product Type */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Product Type</h2>
            <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${(order.customer?.productType || order.productType) === 'Wood' ? 'bg-amber-100 text-amber-800' :
              (order.customer?.productType || order.productType) === 'Steel' ? 'bg-gray-100 text-gray-800' :
                'bg-red-100 text-red-800'
              }`}>
              {order.customer?.productType || order.productType || 'Not Set'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
