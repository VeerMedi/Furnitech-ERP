import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, User, MapPin, Phone, Calendar, Clock, CheckCircle, AlertCircle, Edit2 } from 'lucide-react';
import EditTransportDetails from '../components/EditTransportDetails';
import api from '../services/api';
import { useEditPermission } from '../components/ProtectedAction';

export default function TransportDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const canEditTransport = useEditPermission('transport');
  const [transport, setTransport] = useState(location.state?.transport || null);
  const [loading, setLoading] = useState(!transport);
  const [error, setError] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  const openEdit = () => setShowEdit(true);
  const closeEdit = () => setShowEdit(false);

  const handleSave = (updated) => {
    setTransport(updated);
    closeEdit();
    // Update the location state so changes persist when navigating back
    navigate(`/transport/${id}`, { state: { transport: updated }, replace: true });
  };

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);

    if (!transport) {
      fetchTransportDetails();
    }
  }, [id, transport]);

  const fetchTransportDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/transports/${id}`);
      setTransport(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching transport details:', err);
      setError('Failed to load transport details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Delivered': 'bg-green-100 text-green-800',
      'En Route': 'bg-blue-100 text-blue-800',
      'Scheduled': 'bg-yellow-100 text-yellow-800',
      'Delayed': 'bg-red-100 text-red-800',
      'Cancelled': 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const statusLogs = [
    { status: 'Scheduled', timestamp: '2025-12-05 08:00', notes: 'Order scheduled for delivery' },
    { status: 'Confirmed', timestamp: '2025-12-05 09:30', notes: 'Driver assigned and confirmed' },
    { status: 'En Route', timestamp: '2025-12-05 10:15', notes: 'Vehicle departed from warehouse' },
    { status: 'Delivered', timestamp: '2025-12-05 14:45', notes: 'Package delivered and signed' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-gray-600">Loading transport details...</div>
        </div>
      </div>
    );
  }

  if (error || !transport) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/transport')}
            className="flex items-center gap-2 text-maroon-600 hover:text-maroon-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Transport
          </button>
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error || 'Transport details not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/transport')}
          className="flex items-center gap-2 text-maroon-600 hover:text-maroon-700"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Transport Dashboard
        </button>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {canEditTransport && (
            <div className="lg:col-span-3 flex justify-end mb-2">
              <button onClick={openEdit} className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium">
                Edit
              </button>
            </div>
          )}
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Product Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Product ID</p>
                  <p className="text-lg font-semibold text-gray-900">{transport.productId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Product Name</p>
                  <p className="text-lg font-semibold text-gray-900">{transport.productName}</p>
                </div>
              </div>
            </div>

            {/* Client Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-maroon-600" />
                Client Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Client Name</p>
                  <p className="text-base font-semibold text-gray-900">{transport.clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Address</p>
                  <p className="text-base text-gray-900">{transport.clientAddress}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Contact</p>
                    <p className="text-base font-semibold text-gray-900">{transport.clientContact}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-maroon-600" />
                Vehicle Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Vehicle Type</p>
                  <p className="text-lg font-semibold text-gray-900">{transport.vehicleType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vehicle Number</p>
                  <p className="text-lg font-semibold text-gray-900">{transport.vehicleNumber}</p>
                </div>
              </div>
            </div>

            {/* Driver Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-maroon-600" />
                Driver Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Driver Name</p>
                  <p className="text-base font-semibold text-gray-900">{transport.driverName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Driver ID</p>
                  <p className="text-base font-semibold text-gray-900">{transport.driverId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Contact</p>
                    <p className="text-base font-semibold text-gray-900">{transport.driverContact}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Metrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Delivery Metrics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-600">Distance To Covered</p>
                  <p className="text-2xl font-bold text-blue-600">{transport.distance} km</p>
                </div>
                {/* <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-gray-600">Estimated Time</p>
                  <p className="text-2xl font-bold text-green-600">{Math.round(transport.distance / 50)} hrs</p>
                </div> */}
              </div>
            </div>
          </div>

          {/* Right Column - Status and Timeline */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Current Status</h2>
              <div className={`px-4 py-3 rounded-lg text-center font-bold text-lg ${getStatusColor(transport.status)}`}>
                {transport.status}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Date:</span>
                  <span className="font-semibold text-gray-900">{transport.deliveryDate}</span>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            {/* Status Timeline */}
            {/* <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Status Timeline</h2>
              <div className="space-y-4">
                {statusLogs.map((log, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-maroon-100 rounded-full flex items-center justify-center">
                        {log.status === 'Delivered' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-maroon-600" />
                        )}
                      </div>
                      {index < statusLogs.length - 1 && (
                        <div className="w-0.5 h-12 bg-gray-200 mt-1" />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-gray-900">{log.status}</p>
                      <p className="text-xs text-gray-500">{log.timestamp}</p>
                      <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div> */}
          </div>
        </div>
      </div>
      {showEdit && (
        <EditTransportDetails transport={transport} onClose={closeEdit} onSave={handleSave} />
      )}
    </div>
  );
}
