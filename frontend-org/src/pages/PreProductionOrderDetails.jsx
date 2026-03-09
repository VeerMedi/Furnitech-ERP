import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, MapPin, Package, Calendar, FileText, Download, AlertCircle, Hammer, Wrench } from 'lucide-react';
import { orderAPI, drawingAPI } from '../services/api';
import { ProcessAssignment } from '../components/ProcessAssignment';
import { toast } from '../hooks/useToast';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function PreProductionOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(!order);
  const [loadingDrawings, setLoadingDrawings] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);

    // Check user role for assignment features
    // Robust Role Extraction with Smart Mapping
    const authData = localStorage.getItem('auth');
    const orgUser = localStorage.getItem('orgUser');

    let role = '';

    // 1. Try User Login first
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        role = parsed.user?.userRole || '';
      } catch (e) {
        console.error('Failed to parse auth data:', e);
      }
    }

    // 2. Try Organization Login with Role Deduction
    if (!role && orgUser) {
      try {
        const parsed = JSON.parse(orgUser);
        let assumedRole = parsed.userRole || '';

        if (!assumedRole) {
          const identifier = (parsed.email || parsed.firstName || '').toLowerCase();

          // Steel Workers
          if (identifier.includes('bending') && identifier.includes('steel')) assumedRole = 'Steel (Bending)';
          else if (identifier.includes('cnc')) assumedRole = 'Steel (CNC Cutting)';
          else if (identifier.includes('steel') && identifier.includes('cutting')) assumedRole = 'Steel (Steel Cutting)';
          else if (identifier.includes('welding') || identifier.includes('weld')) assumedRole = 'Steel (Welding)';
          else if (identifier.includes('steel') && identifier.includes('finish')) assumedRole = 'Steel (Finishing)';

          // Wood Workers
          else if (identifier.includes('beam') || identifier.includes('saw')) assumedRole = 'Wood (Beam Saw)';
          else if (identifier.includes('edge') && identifier.includes('bend')) assumedRole = 'Wood (Edge Bending)';
          else if (identifier.includes('profil')) assumedRole = 'Wood (Profiling)';
          else if (identifier.includes('groom')) assumedRole = 'Wood (Grooming)';
          else if (identifier.includes('boring') || identifier.includes('drill')) assumedRole = 'Wood (Boring Machine)';
          else if (identifier.includes('wood') && identifier.includes('finish')) assumedRole = 'Wood (Finishing)';

          // Common
          else if (identifier.includes('pack')) assumedRole = 'Packaging';
          else assumedRole = 'Organization Admin'; // Fallback for generic
        }
        role = assumedRole;
      } catch (e) {
        console.error('Failed to parse orgUser:', e);
      }
    }

    setUserRole(role);

    if (!order) {
      loadOrderDetails();
    }
  }, [id]);

  useEffect(() => {
    if (order) {
      loadDrawings();
    }
  }, [order]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOne(id);
      const orderData = response.data.data || response.data;
      setOrder(orderData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading order details:', error);
      setLoading(false);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const loadDrawings = async () => {
    try {
      setLoadingDrawings(true);
      // Fetch all drawings using the API service
      const response = await drawingAPI.getAll();
      const allDrawings = response.data.data || response.data || [];

      // Filter drawings for this order's customer
      if (order?.customer?._id) {
        const customerDrawings = allDrawings.filter(
          drawing => drawing.customer && drawing.customer._id === order.customer._id
        );
        setDrawings(customerDrawings);
      } else {
        setDrawings([]);
      }

      setLoadingDrawings(false);
    } catch (error) {
      console.error('Error loading drawings:', error);
      setDrawings([]);
      setLoadingDrawings(false);
    }
  };

  const handleDownload = async (drawingUrl, fileName) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${drawingUrl}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleWorkerAssignment = async (process, workerId, productType) => {
    try {
      setSavingAssignment(true);

      const assignmentField = ['Wood', 'WOOD'].includes(productType) ? 'woodWorkflowAssignments' : 'steelWorkflowAssignments';

      const updateData = {
        [assignmentField]: {
          ...order[assignmentField],
          [process]: workerId
        }
      };

      await orderAPI.update(id, updateData);

      // Update local state
      setOrder(prev => ({
        ...prev,
        [assignmentField]: {
          ...prev[assignmentField],
          [process]: workerId
        }
      }));

      toast.success('Worker assigned! ✅');
    } catch (error) {
      console.error('Failed to assign worker:', error);
      toast.error('Failed to assign worker');
    } finally {
      setSavingAssignment(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getStatusColor = (status) => {
    const colors = {
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'PROCESSING': 'bg-yellow-100 text-yellow-800',
      'READY': 'bg-green-100 text-green-800',
      'DELIVERED': 'bg-gray-100 text-gray-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'URGENT': 'bg-red-100 text-red-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'MEDIUM': 'bg-blue-100 text-blue-800',
      'LOW': 'bg-gray-100 text-gray-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getProductTypeColor = (type) => {
    if (!type) return 'bg-gray-100 text-gray-800';
    if (['Wood', 'WOOD'].includes(type)) return 'bg-amber-100 text-amber-800';
    if (['Steel', 'STEEL'].includes(type)) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  // --- Start: Role & Workflow Helpers ---
  const WORKER_ROLE_MAP_STEEL = {
    'steelCutting': ['Steel (Steel Cutting)', 'Steel Cutting', 'Cutting', 'Steel Cutter', 'Sheet Cutter'],
    'cncCutting': ['Steel (CNC Cutting)', 'CNC Cutting', 'CNC', 'CNC Operator', 'Laser Cutting'],
    'bending': ['Steel (Bending)', 'Bending', 'Bending Machine', 'Press Brake'],
    'welding': ['Steel (Welding)', 'Welding', 'Welder', 'Fabricator'],
    'finishing': ['Steel (Finishing)', 'Finishing', 'Finisher', 'Painter', 'Powder Coating'],
    'packaging': ['Packaging', 'Packing', 'Packer', 'Steel (Packing)', 'Steel (Packaging)', 'Dispatch', 'Logistics']
  };

  const STEEL_STEPS_ORDER = ['steelCutting', 'cncCutting', 'bending', 'welding', 'finishing', 'packaging'];

  // Wood Worker Role Mapping
  const WORKER_ROLE_MAP_WOOD = {
    'beamSaw': ['Wood (Beam Saw)', 'Beam Saw', 'Panel Cutter', 'Saw Operator'],
    'edgeBending': ['Wood (Edge Bending)', 'Edge Bending', 'Edge Bander', 'Edge Band Operator'],
    'profiling': ['Wood (Profiling)', 'Profiling', 'Profile Cutter', 'CNC Router'],
    'grooming': ['Wood (Grooming)', 'Grooming', 'Sanding', 'Surface Preparation'],
    'boringMachine': ['Wood (Boring Machine)', 'Boring Machine', 'Drilling', 'Hole Boring'],
    'finish': ['Wood (Finishing)', 'Finishing', 'Finisher', 'Polish', 'Lacquer'],
    'packaging': ['Packaging', 'Packing', 'Packer', 'Wood (Packing)', 'Wood (Packaging)', 'Dispatch', 'Logistics']
  };

  const WOOD_STEPS_ORDER = ['beamSaw', 'edgeBending', 'profiling', 'grooming', 'boringMachine', 'finish', 'packaging'];

  // Organization Admin added to Manager list for full access
  const isProductionManager = ['Production Manager', 'Production', 'Organization Admin'].includes(userRole);
  const isAdmin = ['Admin', 'Super Admin', 'Administrator'].includes(userRole);

  const canUpdateStep = (stepKey, productType) => {
    if (isAdmin) return false;
    if (isProductionManager) return true;
    if (userRole === 'Salesman') return false; // Read-only for Salesman

    // Determine which role map and steps order to use
    const isWood = ['Wood', 'WOOD'].includes(productType || order.productType || order.customer?.productType);
    const roleMap = isWood ? WORKER_ROLE_MAP_WOOD : WORKER_ROLE_MAP_STEEL;
    const stepsOrder = isWood ? WOOD_STEPS_ORDER : STEEL_STEPS_ORDER;
    const workflowField = isWood ? 'woodWorkflowStatus' : 'steelWorkflowStatus';

    const allowed = roleMap[stepKey] || [];
    const hasRolePermission = allowed.includes(userRole);

    if (!hasRolePermission) return false;

    // 🔒 SEQUENTIAL WORKFLOW: Check if previous step is completed
    const currentStepIndex = stepsOrder.indexOf(stepKey);

    // First step is always enabled (if user has role permission)
    if (currentStepIndex === 0) return true;

    // For other steps, check if previous step is completed
    const previousStepKey = stepsOrder[currentStepIndex - 1];
    const previousStepCompleted = order[workflowField]?.[previousStepKey] === true;

    return previousStepCompleted;
  };

  const shouldDisplayStep = (stepKey, productType) => {
    // Admins, Managers, and Salesmen see all steps
    if (isAdmin || isProductionManager || userRole === 'Salesman') return true;

    // Determine which role map and steps order to use
    const isWood = ['Wood', 'WOOD'].includes(productType || order.productType || order.customer?.productType);
    const roleMap = isWood ? WORKER_ROLE_MAP_WOOD : WORKER_ROLE_MAP_STEEL;
    const stepsOrder = isWood ? WOOD_STEPS_ORDER : STEEL_STEPS_ORDER;
    const workflowField = isWood ? 'woodWorkflowStatus' : 'steelWorkflowStatus';

    // Check if this worker has permission for this specific step
    const allowed = roleMap[stepKey] || [];
    const hasPermissionForThisStep = allowed.includes(userRole);

    // If worker has permission for this step, show it
    if (hasPermissionForThisStep) return true;

    // Also show if step is already completed (read-only for other workers)
    const stepCompleted = order[workflowField]?.[stepKey] === true;
    if (stepCompleted) return true;

    // Otherwise hide the step
    return false;
  };

  const handleStatusChange = async (field, stepKey, currentVal) => {
    // Determine product type for permission check
    const productType = order.productType || order.customer?.productType;

    if (!canUpdateStep(stepKey, productType)) return;

    try {
      const updatedStatus = {
        ...order[field],
        [stepKey]: !currentVal
      };

      const updatePayload = { [field]: updatedStatus };

      // 🎯 AUTO-MOVE: If packaging is being marked as complete → Move to Post-Production
      if (stepKey === 'packaging' && !currentVal === true) {
        updatePayload.orderStatus = 'COMPLETED';  // Valid enum value
        updatePayload.deliveryStatus = 'READY_FOR_DISPATCH';  // Separate delivery tracking field
        updatePayload.packagingStatus = 'COMPLETED';
        updatePayload.packagingCompletedDate = new Date().toISOString();

        console.log('📦 Packaging completed! Moving order to Post-Production...');
      }

      await orderAPI.update(id, updatePayload);

      setOrder(prev => ({
        ...prev,
        ...updatePayload,
        [field]: updatedStatus
      }));

      // Show success message if moved to post-production
      if (stepKey === 'packaging' && !currentVal === true) {
        toast.success('✅ Packaging completed! Order moved to Post-Production.');
      }
    } catch (error) {
      console.error('Status update failed:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDeliveryStatusChange = async (field, newValue) => {
    try {
      const updatedStatus = {
        ...order[field],
        deliveryStatusWorkflow: newValue
      };

      const updatePayload = { [field]: updatedStatus };

      await orderAPI.update(id, updatePayload);

      setOrder(prev => ({
        ...prev,
        ...updatePayload,
        [field]: updatedStatus
      }));

      toast.success('Delivery status updated successfully');
    } catch (error) {
      console.error('Delivery status update failed:', error);
      toast.error('Failed to update delivery status');
    }
  };
  // --- End: Helpers ---

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">Loading...</div>;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Order not found</p>
            <button
              onClick={() => navigate('/production/pre-production')}
              className="mt-4 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800"
            >
              Back to Pre-Production
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Simple Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/production/pre-production')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Back to Pre-Production</span>
          </button>

          {/* Clean Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">Order #{order.orderNumber}</h1>
                <p className="text-sm text-gray-500">Order Details</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Order Date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(order.orderDate)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Cards - Subtle Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Priority */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-2">Priority</p>
            <span className={`px-3 py-1 rounded text-xs font-medium ${getPriorityColor(order.priority)}`}>
              {order.priority}
            </span>
          </div>

          {/* Product Type */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-2">Product Type</p>
            <span className={`px-3 py-1 rounded text-xs font-medium ${getProductTypeColor(order.productType || order.customer?.productType)}`}>
              {order.productType || order.customer?.productType || 'N/A'}
            </span>
          </div>

          {/* Order Status */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-2">Order Status</p>
            <span className={`px-3 py-1 rounded text-xs font-medium ${getStatusColor(order.orderStatus)}`}>
              {order.orderStatus}
            </span>
          </div>
        </div>

        {/* Customer Information - Modern Card */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
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
                    {order.customer?.firstName && order.customer?.lastName
                      ? `${order.customer.firstName} ${order.customer.lastName}`
                      : 'N/A'}
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
                    {order.deliveryAddress?.street && order.deliveryAddress?.city
                      ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}`
                      : order.customer?.address
                        ? typeof order.customer.address === 'object'
                          ? `${order.customer.address.street || ''} ${order.customer.address.city || ''}`.trim() || 'N/A'
                          : order.customer.address
                        : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dates Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h2 className="text-sm font-medium text-gray-500">Order Date</h2>
            </div>
            <p className="text-xl font-semibold text-gray-900">{formatDate(order.orderDate)}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h2 className="text-sm font-medium text-gray-500">Expected Delivery</h2>
            </div>
            <p className="text-xl font-semibold text-gray-900">{formatDate(order.expectedDeliveryDate)}</p>
          </div>
        </div>

        {/* Product Details Block */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Package className="w-5 h-5 mr-2 text-gray-500" />
              Product Details
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specs</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <React.Fragment key={index}>
                      <tr className={item.bom && item.bom.length > 0 ? "bg-white border-b-0" : "bg-white border-b border-gray-200"}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">{item.itemNumber || index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 align-top">
                          {item.product?.name || item.description || 'Unknown Product'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 align-top">{item.quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 align-top">
                          {item.specifications ? (
                            typeof item.specifications === 'string' ? (
                              <span className="text-xs">{item.specifications}</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {Object.entries(item.specifications).map(([key, value]) => (
                                  <span key={key} className="text-xs">
                                    <span className="font-medium">{key}:</span> {value}
                                  </span>
                                ))}
                              </div>
                            )
                          ) : 'N/A'}
                        </td>
                      </tr>
                      {item.bom && item.bom.length > 0 && (
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <td colSpan="4" className="px-6 py-3 pl-12">
                            <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center">
                              <Package className="w-3 h-3 mr-1" />
                              Assigned Raw Materials (BOM)
                            </div>
                            <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Material</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty Required</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Length</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Width</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Height</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {item.bom.map((bomItem, bIndex) => (
                                    <tr key={bIndex}>
                                      <td className="px-4 py-2 text-xs text-gray-900 font-medium">
                                        {bomItem.material?.itemName || bomItem.material?.name || 'Unknown Material'}
                                      </td>
                                      <td className="px-4 py-2 text-xs text-gray-500">
                                        {bomItem.material?.category || '-'}
                                      </td>
                                      <td className="px-4 py-2 text-xs text-gray-900 font-bold">
                                        {bomItem.requiredQuantity} {bomItem.material?.unit || ''}
                                      </td>
                                      <td className="px-4 py-2 text-xs text-gray-500">
                                        {bomItem.length || '-'}
                                      </td>
                                      <td className="px-4 py-2 text-xs text-gray-500">
                                        {bomItem.width || '-'}
                                      </td>
                                      <td className="px-4 py-2 text-xs text-gray-500">
                                        {bomItem.height || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">No items found in this order</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Order Notes</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* Production Notes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">Production</span>
                </div>
                <p className="text-sm text-gray-700">
                  {order.productionNotes || 'No production notes available'}
                </p>
              </div>

              {/* Customer Notes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">Customer</span>
                </div>
                <p className="text-sm text-gray-700">
                  {order.customerNotes || 'No customer notes available'}
                </p>
              </div>

              {/* Internal Notes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">Internal</span>
                </div>
                <p className="text-sm text-gray-700">
                  {order.internalNotes || 'No internal notes available'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Wood Type Production Workflow - Horizontal Progress Steps */}
        {['Wood', 'WOOD'].includes(order.productType || order.customer?.productType) && (
          <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Production Workflow</h2>
              <p className="text-sm text-gray-500 mt-1">Track your wood manufacturing progress</p>
            </div>

            <div className="p-8">
              {/* Desktop View - Horizontal Stepper */}
              <div className="hidden md:block">
                <div className="relative">
                  {/* Progress Bar Background */}
                  <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200" style={{ marginLeft: '2rem', marginRight: '2rem' }}></div>

                  <div className="grid grid-cols-8 gap-4 relative">
                    {/* Step 1: Beam Saw */}
                    {shouldDisplayStep('beamSaw', 'Wood') && (
                      <div className="text-center">
                        <div className="flex flex-col items-center mb-3">
                          <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                            <span className="text-white text-lg font-bold">1</span>
                          </div>
                          <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                            <h3 className="font-bold text-gray-900 mb-2">Beam Saw</h3>
                            <p className="text-xs text-gray-600 mb-3">Panel cutting & sizing</p>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                                checked={!!order.woodWorkflowStatus?.beamSaw}
                                onChange={() => handleStatusChange('woodWorkflowStatus', 'beamSaw', !!order.woodWorkflowStatus?.beamSaw)}
                                disabled={!canUpdateStep('beamSaw', 'Wood')}
                              />
                            </div>

                            {/* Worker Assignment - Only for Production Manager */}
                            {(userRole === 'Production Manager' || userRole === 'Production') && (
                              <ProcessAssignment
                                process="beamSaw"
                                processLabel="Beam Saw"
                                currentAssignment={order.woodWorkflowAssignments?.beamSaw}
                                onAssign={handleWorkerAssignment}
                                productType="Wood"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Edge Bending */}
                    {shouldDisplayStep('edgeBending', 'Wood') && (
                      <div className="text-center">
                        <div className="flex flex-col items-center mb-3">
                          <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                            <span className="text-white text-lg font-bold">2</span>
                          </div>
                          <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                            <h3 className="font-bold text-gray-900 mb-2">Edge Bending</h3>
                            <p className="text-xs text-gray-600 mb-3">Edge band application</p>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                                checked={!!order.woodWorkflowStatus?.edgeBending}
                                onChange={() => handleStatusChange('woodWorkflowStatus', 'edgeBending', !!order.woodWorkflowStatus?.edgeBending)}
                                disabled={!canUpdateStep('edgeBending', 'Wood')}
                              />
                            </div>

                            {(userRole === 'Production Manager' || userRole === 'Production') && (
                              <ProcessAssignment
                                process="edgeBending"
                                processLabel="Edge Bending"
                                currentAssignment={order.woodWorkflowAssignments?.edgeBending}
                                onAssign={handleWorkerAssignment}
                                productType="Wood"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Profiling */}
                    {shouldDisplayStep('profiling', 'Wood') && (
                      <div className="text-center">
                        <div className="flex flex-col items-center mb-3">
                          <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                            <span className="text-white text-lg font-bold">3</span>
                          </div>
                          <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                            <h3 className="font-bold text-gray-900 mb-2">Profiling</h3>
                            <p className="text-xs text-gray-600 mb-3">Surface profiling & shaping</p>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                                checked={!!order.woodWorkflowStatus?.profiling}
                                onChange={() => handleStatusChange('woodWorkflowStatus', 'profiling', !!order.woodWorkflowStatus?.profiling)}
                                disabled={!canUpdateStep('profiling', 'Wood')}
                              />
                            </div>

                            {(userRole === 'Production Manager' || userRole === 'Production') && (
                              <ProcessAssignment
                                process="profiling"
                                processLabel="Profiling"
                                currentAssignment={order.woodWorkflowAssignments?.profiling}
                                onAssign={handleWorkerAssignment}
                                productType="Wood"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Grooming */}
                    {shouldDisplayStep('grooming', 'Wood') && (
                      <div className="text-center">
                        <div className="flex flex-col items-center mb-3">
                          <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                            <span className="text-white text-lg font-bold">4</span>
                          </div>
                          <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                            <h3 className="font-bold text-gray-900 mb-2">Grooming</h3>
                            <p className="text-xs text-gray-600 mb-3">Surface smoothing & preparation</p>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                                checked={!!order.woodWorkflowStatus?.grooming}
                                onChange={() => handleStatusChange('woodWorkflowStatus', 'grooming', !!order.woodWorkflowStatus?.grooming)}
                                disabled={!canUpdateStep('grooming', 'Wood')}
                              />
                            </div>

                            {(userRole === 'Production Manager' || userRole === 'Production') && (
                              <ProcessAssignment
                                process="grooming"
                                processLabel="Grooming"
                                currentAssignment={order.woodWorkflowAssignments?.grooming}
                                onAssign={handleWorkerAssignment}
                                productType="Wood"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 5: Boring Machine */}
                    {shouldDisplayStep('boringMachine', 'Wood') && (
                      <div className="text-center">
                        <div className="flex flex-col items-center mb-3">
                          <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                            <span className="text-white text-lg font-bold">5</span>
                          </div>
                          <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                            <h3 className="font-bold text-gray-900 mb-2">Boring Machine</h3>
                            <p className="text-xs text-gray-600 mb-3">Hole drilling process</p>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                                checked={!!order.woodWorkflowStatus?.boringMachine}
                                onChange={() => handleStatusChange('woodWorkflowStatus', 'boringMachine', !!order.woodWorkflowStatus?.boringMachine)}
                                disabled={!canUpdateStep('boringMachine', 'Wood')}
                              />
                            </div>

                            {(userRole === 'Production Manager' || userRole === 'Production') && (
                              <ProcessAssignment
                                process="boringMachine"
                                processLabel="Boring Machine"
                                currentAssignment={order.woodWorkflowAssignments?.boringMachine}
                                onAssign={handleWorkerAssignment}
                                productType="Wood"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 6: Finish */}
                    {shouldDisplayStep('finish', 'Wood') && (
                      <div className="text-center">
                        <div className="flex flex-col items-center mb-3">
                          <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                            <span className="text-white text-lg font-bold">6</span>
                          </div>
                          <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                            <h3 className="font-bold text-gray-900 mb-2">Finish</h3>
                            <p className="text-xs text-gray-600 mb-3">Quality & touches</p>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                                checked={!!order.woodWorkflowStatus?.finish}
                                onChange={() => handleStatusChange('woodWorkflowStatus', 'finish', !!order.woodWorkflowStatus?.finish)}
                                disabled={!canUpdateStep('finish', 'Wood')}
                              />
                            </div>

                            {(userRole === 'Production Manager' || userRole === 'Production') && (
                              <ProcessAssignment
                                process="finish"
                                processLabel="Finish"
                                currentAssignment={order.woodWorkflowAssignments?.finish}
                                onAssign={handleWorkerAssignment}
                                productType="Wood"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 7: Packaging */}
                    {shouldDisplayStep('packaging', 'Wood') && (
                      <div className="text-center">
                        <div className="flex flex-col items-center mb-3">
                          <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                            <span className="text-white text-lg font-bold">7</span>
                          </div>
                          <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                            <h3 className="font-bold text-gray-900 mb-2">Packaging</h3>
                            <p className="text-xs text-gray-600 mb-3">Ready for delivery</p>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                                checked={!!order.woodWorkflowStatus?.packaging}
                                onChange={() => handleStatusChange('woodWorkflowStatus', 'packaging', !!order.woodWorkflowStatus?.packaging)}
                                disabled={!canUpdateStep('packaging', 'Wood')}
                              />
                            </div>

                            {(userRole === 'Production Manager' || userRole === 'Production') && (
                              <ProcessAssignment
                                process="packaging"
                                processLabel="Packaging"
                                currentAssignment={order.woodWorkflowAssignments?.packaging}
                                onAssign={handleWorkerAssignment}
                                productType="Wood"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 8: Delivery Status */}
                    <div className="text-center">
                      <div className="flex flex-col items-center mb-3">
                        <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                          <span className="text-white text-lg font-bold">8</span>
                        </div>
                        <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                          <h3 className="font-bold text-gray-900 mb-2">Delivery Status</h3>
                          <p className="text-xs text-gray-600 mb-3">Track delivery progress</p>
                          <div className="flex justify-center">
                            <select
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary"
                              value={order.woodWorkflowStatus?.deliveryStatusWorkflow || ''}
                              onChange={(e) => handleDeliveryStatusChange('woodWorkflowStatus', e.target.value)}
                              disabled={!order.woodWorkflowStatus?.packaging}
                            >
                              <option value="">Select Status</option>
                              <option value="Ready to Delivered">Ready to Delivered</option>
                              <option value="Out of Delivery">Out of Delivery</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile View - Vertical Steps */}
              <div className="md:hidden space-y-4">
                {/* Step 1 */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-900">Beam Saw</h3>
                      <input type="checkbox" className="w-5 h-5 text-primary border-gray-300 rounded" disabled />
                    </div>
                    <p className="text-sm text-gray-600">Panel cutting & sizing</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-900">Edge Bending</h3>
                      <input type="checkbox" className="w-5 h-5 text-primary border-gray-300 rounded" disabled />
                    </div>
                    <p className="text-sm text-gray-600">Edge band application</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <span className="text-white font-bold">3</span>
                  </div>
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-900">Boring Machine</h3>
                      <input type="checkbox" className="w-5 h-5 text-primary border-gray-300 rounded" disabled />
                    </div>
                    <p className="text-sm text-gray-600">Hole drilling process</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <span className="text-white font-bold">4</span>
                  </div>
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-900">Finish</h3>
                      <input type="checkbox" className="w-5 h-5 text-primary border-gray-300 rounded" disabled />
                    </div>
                    <p className="text-sm text-gray-600">Quality & final touches</p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <span className="text-white font-bold">5</span>
                  </div>
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-900">Packaging</h3>
                      <input type="checkbox" className="w-5 h-5 text-primary border-gray-300 rounded" disabled />
                    </div>
                    <p className="text-sm text-gray-600">Ready for delivery</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Steel Type Production Workflow - Horizontal Progress Steps */}
        {['Steel', 'STEEL'].includes(order.productType || order.customer?.productType) && (
          <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Production Workflow</h2>
              <p className="text-sm text-gray-500 mt-1">Track your steel manufacturing progress</p>
            </div>

            <div className="p-8">
              {/* Desktop View - Horizontal Stepper */}
              <div className="hidden md:block">
                <div className="relative">
                  {/* Progress Bar Background */}
                  <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200" style={{ marginLeft: '2rem', marginRight: '2rem' }}></div>

                  <div className="grid grid-cols-7 gap-4 relative">
                    {/* Step 1: Steel Cutting */}
                    {shouldDisplayStep('steelCutting') && (
                      <div className="text-center">
                        <div className="flex flex-col items-center mb-3">
                          <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                            <span className="text-white text-lg font-bold">1</span>
                          </div>
                          <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                            <h3 className="font-bold text-gray-900 mb-2">Steel Cutting</h3>
                            <p className="text-xs text-gray-600 mb-3">Steel sheet cutting</p>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                                checked={!!order.steelWorkflowStatus?.steelCutting}
                                onChange={() => handleStatusChange('steelWorkflowStatus', 'steelCutting', !!order.steelWorkflowStatus?.steelCutting)}
                                disabled={!canUpdateStep('steelCutting')}
                              />
                            </div>

                            {(isProductionManager) && (
                              <ProcessAssignment
                                process="steelCutting"
                                processLabel="Steel Cutting"
                                currentAssignment={order.steelWorkflowAssignments?.steelCutting}
                                onAssign={handleWorkerAssignment}
                                productType="Steel"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 2: CNC Cutting */}
                    {shouldDisplayStep('cncCutting') && (
                      <div className="text-center">
                        <div className="flex flex-col items-center mb-3">
                          <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                            <span className="text-white text-lg font-bold">2</span>
                          </div>
                          <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                            <h3 className="font-bold text-gray-900 mb-2">CNC Cutting</h3>
                            <p className="text-xs text-gray-600 mb-3">Precision CNC work</p>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                                checked={!!order.steelWorkflowStatus?.cncCutting}
                                onChange={() => handleStatusChange('steelWorkflowStatus', 'cncCutting', !!order.steelWorkflowStatus?.cncCutting)}
                                disabled={!canUpdateStep('cncCutting')}
                              />
                            </div>

                            {(isProductionManager) && (
                              <ProcessAssignment
                                process="cncCutting"
                                processLabel="CNC Cutting"
                                currentAssignment={order.steelWorkflowAssignments?.cncCutting}
                                onAssign={handleWorkerAssignment}
                                productType="Steel"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Bending */}
                    {shouldDisplayStep('bending') && (
                      <div className="text-center">
                        <div className="flex flex-col items-center mb-3">
                          <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                            <span className="text-white text-lg font-bold">3</span>
                          </div>
                          <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                            <h3 className="font-bold text-gray-900 mb-2">Bending</h3>
                            <p className="text-xs text-gray-600 mb-3">Metal bending process</p>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                                checked={!!order.steelWorkflowStatus?.bending}
                                onChange={() => handleStatusChange('steelWorkflowStatus', 'bending', !!order.steelWorkflowStatus?.bending)}
                                disabled={!canUpdateStep('bending')}
                              />
                            </div>

                            {(isProductionManager) && (
                              <ProcessAssignment
                                process="bending"
                                processLabel="Bending"
                                currentAssignment={order.steelWorkflowAssignments?.bending}
                                onAssign={handleWorkerAssignment}
                                productType="Steel"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Welding */}
                    {shouldDisplayStep('welding') && (
                      <div className="text-center">
                        <div className="flex flex-col items-center mb-3">
                          <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                            <span className="text-white text-lg font-bold">4</span>
                          </div>
                          <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                            <h3 className="font-bold text-gray-900 mb-2">Welding</h3>
                            <p className="text-xs text-gray-600 mb-3">Welding & joining</p>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                                checked={!!order.steelWorkflowStatus?.welding}
                                onChange={() => handleStatusChange('steelWorkflowStatus', 'welding', !!order.steelWorkflowStatus?.welding)}
                                disabled={!canUpdateStep('welding')}
                              />
                            </div>

                            {(isProductionManager) && (
                              <ProcessAssignment
                                process="welding"
                                processLabel="Welding"
                                currentAssignment={order.steelWorkflowAssignments?.welding}
                                onAssign={handleWorkerAssignment}
                                productType="Steel"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 5: Finishing */}
                    {shouldDisplayStep('finishing') && (
                      <div className="text-center">
                        <div className="flex flex-col items-center mb-3">
                          <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                            <span className="text-white text-lg font-bold">5</span>
                          </div>
                          <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                            <h3 className="font-bold text-gray-900 mb-2">Finishing</h3>
                            <p className="text-xs text-gray-600 mb-3">Surface finishing</p>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                                checked={!!order.steelWorkflowStatus?.finishing}
                                onChange={() => handleStatusChange('steelWorkflowStatus', 'finishing', !!order.steelWorkflowStatus?.finishing)}
                                disabled={!canUpdateStep('finishing')}
                              />
                            </div>

                            {(isProductionManager) && (
                              <ProcessAssignment
                                process="finishing"
                                processLabel="Finishing"
                                currentAssignment={order.steelWorkflowAssignments?.finishing}
                                onAssign={handleWorkerAssignment}
                                productType="Steel"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 6: Packaging */}
                    {shouldDisplayStep('packaging') && (
                      <div className="text-center">
                        <div className="flex flex-col items-center mb-3">
                          <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                            <span className="text-white text-lg font-bold">6</span>
                          </div>
                          <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                            <h3 className="font-bold text-gray-900 mb-2">Packaging</h3>
                            <p className="text-xs text-gray-600 mb-3">Ready for delivery</p>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                                checked={!!order.steelWorkflowStatus?.packaging}
                                onChange={() => handleStatusChange('steelWorkflowStatus', 'packaging', !!order.steelWorkflowStatus?.packaging)}
                                disabled={!canUpdateStep('packaging')}
                              />
                            </div>

                            {(isProductionManager) && (
                              <ProcessAssignment
                                process="packaging"
                                processLabel="Packaging"
                                currentAssignment={order.steelWorkflowAssignments?.packaging}
                                onAssign={handleWorkerAssignment}
                                productType="Steel"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 7: Delivery Status */}
                    <div className="text-center">
                      <div className="flex flex-col items-center mb-3">
                        <div className="w-16 h-16 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg mb-3 relative z-10">
                          <span className="text-white text-lg font-bold">7</span>
                        </div>
                        <div className="w-full bg-white border-2 border-primary rounded-lg p-4 transition-all">
                          <h3 className="font-bold text-gray-900 mb-2">Delivery Status</h3>
                          <p className="text-xs text-gray-600 mb-3">Track delivery progress</p>
                          <div className="flex justify-center">
                            <select
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary"
                              value={order.steelWorkflowStatus?.deliveryStatusWorkflow || ''}
                              onChange={(e) => handleDeliveryStatusChange('steelWorkflowStatus', e.target.value)}
                              disabled={!order.steelWorkflowStatus?.packaging}
                            >
                              <option value="">Select Status</option>
                              <option value="Ready to Delivered">Ready to Delivered</option>
                              <option value="Out of Delivery">Out of Delivery</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile View - Vertical Steps */}
              <div className="md:hidden space-y-4">
                {/* Step 1 */}
                {shouldDisplayStep('steelCutting') && (
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-md">
                      <span className="text-white font-bold">1</span>
                    </div>
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">Steel Cutting</h3>
                        <input
                          type="checkbox"
                          className="w-5 h-5 text-primary border-gray-300 rounded"
                          checked={!!order.steelWorkflowStatus?.steelCutting}
                          onChange={() => handleStatusChange('steelWorkflowStatus', 'steelCutting', !!order.steelWorkflowStatus?.steelCutting)}
                          disabled={!canUpdateStep('steelCutting')}
                        />
                      </div>
                      <p className="text-sm text-gray-600">Steel sheet cutting</p>
                    </div>
                  </div>
                )}

                {/* Step 2 */}
                {shouldDisplayStep('cncCutting') && (
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-md">
                      <span className="text-white font-bold">2</span>
                    </div>
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">CNC Cutting</h3>
                        <input
                          type="checkbox"
                          className="w-5 h-5 text-primary border-gray-300 rounded"
                          checked={!!order.steelWorkflowStatus?.cncCutting}
                          onChange={() => handleStatusChange('steelWorkflowStatus', 'cncCutting', !!order.steelWorkflowStatus?.cncCutting)}
                          disabled={!canUpdateStep('cncCutting')}
                        />
                      </div>
                      <p className="text-sm text-gray-600">Precision CNC work</p>
                    </div>
                  </div>
                )}

                {/* Step 3 */}
                {shouldDisplayStep('bending') && (
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-md">
                      <span className="text-white font-bold">3</span>
                    </div>
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">Bending</h3>
                        <input
                          type="checkbox"
                          className="w-5 h-5 text-primary border-gray-300 rounded"
                          checked={!!order.steelWorkflowStatus?.bending}
                          onChange={() => handleStatusChange('steelWorkflowStatus', 'bending', !!order.steelWorkflowStatus?.bending)}
                          disabled={!canUpdateStep('bending')}
                        />
                      </div>
                      <p className="text-sm text-gray-600">Metal bending process</p>
                    </div>
                  </div>
                )}

                {/* Step 4 */}
                {shouldDisplayStep('welding') && (
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-md">
                      <span className="text-white font-bold">4</span>
                    </div>
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">Welding</h3>
                        <input
                          type="checkbox"
                          className="w-5 h-5 text-primary border-gray-300 rounded"
                          checked={!!order.steelWorkflowStatus?.welding}
                          onChange={() => handleStatusChange('steelWorkflowStatus', 'welding', !!order.steelWorkflowStatus?.welding)}
                          disabled={!canUpdateStep('welding')}
                        />
                      </div>
                      <p className="text-sm text-gray-600">Welding & joining</p>
                    </div>
                  </div>
                )}

                {/* Step 5 */}
                {shouldDisplayStep('finishing') && (
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-md">
                      <span className="text-white font-bold">5</span>
                    </div>
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">Finishing</h3>
                        <input
                          type="checkbox"
                          className="w-5 h-5 text-primary border-gray-300 rounded"
                          checked={!!order.steelWorkflowStatus?.finishing}
                          onChange={() => handleStatusChange('steelWorkflowStatus', 'finishing', !!order.steelWorkflowStatus?.finishing)}
                          disabled={!canUpdateStep('finishing')}
                        />
                      </div>
                      <p className="text-sm text-gray-600">Surface finishing</p>
                    </div>
                  </div>
                )}

                {/* Step 6 */}
                {shouldDisplayStep('packaging') && (
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-md">
                      <span className="text-white font-bold">6</span>
                    </div>
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">Packaging</h3>
                        <input
                          type="checkbox"
                          className="w-5 h-5 text-primary border-gray-300 rounded"
                          checked={!!order.steelWorkflowStatus?.packaging}
                          onChange={() => handleStatusChange('steelWorkflowStatus', 'packaging', !!order.steelWorkflowStatus?.packaging)}
                          disabled={!canUpdateStep('packaging')}
                        />
                      </div>
                      <p className="text-sm text-gray-600">Ready for delivery</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Uploaded Files from Drawing Dashboard */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Drawing Files & Attachments</h2>
          </div>
          <div className="p-6">
            {loadingDrawings ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900"></div>
                <p className="text-gray-500 text-sm mt-3">Loading files...</p>
              </div>
            ) : drawings.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No files uploaded for this customer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drawings.map((drawing, index) => (
                  <div key={drawing._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-8 h-8 bg-gray-900 text-white rounded flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{drawing.fileName}</h4>
                        <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                          <span>{drawing.fileType}</span>
                          <span>•</span>
                          <span>{formatFileSize(drawing.fileSize)}</span>
                          <span>•</span>
                          <span>{formatDate(drawing.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(drawing.drawingUrl, drawing.fileName)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium ml-4 flex-shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
}
