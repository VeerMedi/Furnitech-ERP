import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Truck, Calendar, Phone, AlertCircle, CheckCircle, Clock, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { transportAPI } from '../services/api';
import { useEditPermission } from '../components/ProtectedAction';

export default function TransportDashboard() {
  const navigate = useNavigate();
  const canEditTransport = useEditPermission('transport');
  const [transports, setTransports] = useState([]);
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    pendingDispatches: 0,
    completedDeliveries: 0,
    vehicleUtilization: 0,
  });
  const [deliveryTrendData, setDeliveryTrendData] = useState([]);
  const [vehicleStatusData, setVehicleStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Clear old invalid cache data on component mount
    const cachedData = localStorage.getItem('transportData');
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        // Check if data has invalid IDs (sample data)
        const hasInvalidIds = parsedData.some(item =>
          !item._id || item._id.length !== 24 || /^\d+$/.test(item._id) // Check for numeric IDs like "1", "2"
        );

        if (hasInvalidIds) {
          console.log('Clearing invalid sample transport data from cache');
          localStorage.removeItem('transportData');
          localStorage.removeItem('transportDataTimestamp');
        }
      } catch (e) {
        console.log('Clearing corrupted transport cache');
        localStorage.removeItem('transportData');
        localStorage.removeItem('transportDataTimestamp');
      }
    }

    fetchTransportData();
  }, []);

  const fetchTransportData = async () => {
    try {
      setLoading(true);

      // Try to load from database first
      const response = await transportAPI.getAll();
      const data = response.data.data || response.data || [];

      if (data && data.length > 0) {
        setTransports(data);
        calculateStats(data);

        // Cache to localStorage (clear old sample data)
        try {
          localStorage.removeItem('transportData'); // Clear old data first
          localStorage.setItem('transportData', JSON.stringify(data));
          localStorage.setItem('transportDataTimestamp', Date.now().toString());
          console.log('Cached transport data from database');
        } catch (storageError) {
          console.warn('Failed to cache transport data:', storageError);
        }
      } else {
        // No data in database, check if we have cached DB data (not sample data)
        console.log('No transports in database, checking localStorage...');
        const cachedData = localStorage.getItem('transportData');
        const cachedTimestamp = localStorage.getItem('transportDataTimestamp');

        if (cachedData && cachedTimestamp) {
          try {
            const parsedData = JSON.parse(cachedData);
            // Validate that cached data has real MongoDB IDs (not sample data)
            const hasValidIds = parsedData.every(item =>
              item._id && item._id.length === 24 // MongoDB ObjectId length
            );

            if (hasValidIds) {
              setTransports(parsedData);
              calculateStats(parsedData);
              console.log('Loaded transport data from localStorage cache');
            } else {
              // Clear invalid cache
              console.log('Clearing invalid sample data from cache');
              localStorage.removeItem('transportData');
              localStorage.removeItem('transportDataTimestamp');
              setTransports([]);
              setStats({
                totalDeliveries: 0,
                pendingDispatches: 0,
                completedDeliveries: 0,
                vehicleUtilization: 0,
              });
            }
          } catch (parseError) {
            console.error('Failed to parse cached transport data:', parseError);
            localStorage.removeItem('transportData');
            setTransports([]);
            setStats({
              totalDeliveries: 0,
              pendingDispatches: 0,
              completedDeliveries: 0,
              vehicleUtilization: 0,
            });
          }
        } else {
          setTransports([]);
          setStats({
            totalDeliveries: 0,
            pendingDispatches: 0,
            completedDeliveries: 0,
            vehicleUtilization: 0,
          });
        }
      }

      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching transport data from database:', err);

      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }

      // On API error, try localStorage fallback (only if valid DB data)
      console.log('Database error, attempting localStorage fallback...');
      try {
        const cachedData = localStorage.getItem('transportData');
        const cachedTimestamp = localStorage.getItem('transportDataTimestamp');

        if (cachedData && cachedTimestamp) {
          const parsedData = JSON.parse(cachedData);
          // Validate that cached data has real MongoDB IDs
          const hasValidIds = parsedData.every(item =>
            item._id && item._id.length === 24
          );

          if (hasValidIds) {
            setTransports(parsedData);
            calculateStats(parsedData);
            console.log('Loaded transport data from localStorage after API error');
            setError('Using cached data. Unable to connect to server.');
          } else {
            // Clear invalid cache
            localStorage.removeItem('transportData');
            localStorage.removeItem('transportDataTimestamp');
            setTransports([]);
            setStats({
              totalDeliveries: 0,
              pendingDispatches: 0,
              completedDeliveries: 0,
              vehicleUtilization: 0,
            });
            setError('No transport data available.');
          }
        } else {
          setTransports([]);
          setStats({
            totalDeliveries: 0,
            pendingDispatches: 0,
            completedDeliveries: 0,
            vehicleUtilization: 0,
          });
          setError('No transport data available.');
        }
      } catch (fallbackError) {
        console.error('localStorage fallback also failed:', fallbackError);
        setTransports([]);
        setStats({
          totalDeliveries: 0,
          pendingDispatches: 0,
          completedDeliveries: 0,
          vehicleUtilization: 0,
        });
        setError('Failed to load transport data.');
      }

      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const stats = {
      totalDeliveries: data.length,
      pendingDispatches: data.filter(t => t.status === 'Scheduled').length,
      completedDeliveries: data.filter(t => t.status === 'Delivered').length,
      vehicleUtilization: Math.round((data.filter(t => ['En Route', 'Delivered'].includes(t.status)).length / Math.max(data.length, 1)) * 100),
    };
    setStats(stats);
  };

  const generateChartData = (data) => {
    const trendData = [
      { day: 'Mon', deliveries: 8 },
      { day: 'Tue', deliveries: 12 },
      { day: 'Wed', deliveries: 15 },
      { day: 'Thu', deliveries: 10 },
      { day: 'Fri', deliveries: 18 },
      { day: 'Sat', deliveries: 6 },
      { day: 'Sun', deliveries: 4 },
    ];
    setDeliveryTrendData(trendData);

    const statusData = [
      { name: 'Delivered', value: data.filter(t => t.status === 'Delivered').length || 2 },
      { name: 'En Route', value: data.filter(t => t.status === 'En Route').length || 1 },
      { name: 'Scheduled', value: data.filter(t => t.status === 'Scheduled').length || 1 },
      { name: 'Delayed', value: data.filter(t => t.status === 'Delayed').length || 1 },
    ];
    setVehicleStatusData(statusData);
  };

  // charts removed per UX request; generateChartData retained but no longer used

  const handleRowClick = (transport) => {
    // row click navigation disabled — use Status/Edit buttons instead
  };

  const handleStatusClick = (transport) => {
    // open status/details page or modal — use existing transport details route
    navigate(`/transport/${transport._id}`, { state: { transport } });
  };

  const handleEditClick = (transport) => {
    // open inline edit modal or drawer — placeholder for now
    // you can implement modal open here
    console.log('Edit clicked for', transport._id);
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'En Route':
        return <Truck className="w-4 h-4" />;
      case 'Delayed':
        return <AlertCircle className="w-4 h-4" />;
      case 'Scheduled':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transport Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage deliveries and vehicle fleet</p>
          </div>
          {canEditTransport && (
            <button
              onClick={() => navigate('/delivery-orders/new')}
              className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium"
            >
              + Create Delivery Order
            </button>
          )}
        </div>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Deliveries</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalDeliveries}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending Dispatches</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingDispatches}</p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Completed Deliveries</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completedDeliveries}</p>
              </div>
              <Truck className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-maroon-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Vehicle Utilization</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.vehicleUtilization}%</p>
              </div>
              <Truck className="w-8 h-8 text-maroon-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Charts removed as requested; keeping layout intact */}

        {/* Transport Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Active Transports</h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-600">Loading transport data...</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Client Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Distance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transports.map((transport) => (
                    <tr
                      key={transport._id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{transport.productId}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{transport.productName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{transport.clientName}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-900">{transport.vehicleNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-900">{transport.driverName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit ${getStatusColor(transport.status)}`}>
                          {getStatusIcon(transport.status)}
                          <span className="font-medium">{transport.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{transport.distance} km</td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStatusClick(transport); }}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
