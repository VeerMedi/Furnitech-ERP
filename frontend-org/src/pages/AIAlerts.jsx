import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, Bell, RefreshCw, CheckCircle, X, Calendar, Clock, Wrench } from 'lucide-react';
import api from '../services/api';

const AIAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({ critical: 0, high: 0, medium: 0, low: 0 });
  const [loading, setLoading] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('all');

  useEffect(() => {
    fetchMaintenanceAlerts();
    // Fetch alerts every 5 minutes
    const interval = setInterval(fetchMaintenanceAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchMaintenanceAlerts = async () => {
    try {
      setLoading(true);
      console.log('🔔 Fetching maintenance alerts...');
      const response = await api.get('/machines/maintenance/alerts');
      
      console.log('🔔 Maintenance alerts response:', response.data);
      
      if (response.data.success) {
        const { data, summary: alertSummary } = response.data;
        
        console.log('🔔 Total alerts received:', data.length);
        console.log('🔔 Alert summary:', alertSummary);
        
        // Filter out dismissed alerts
        const dismissed = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
        const filteredAlerts = data.filter(alert => 
          !dismissed.includes(alert.machineId.toString())
        );
        
        console.log('🔔 Dismissed alerts:', dismissed);
        console.log('🔔 Filtered alerts (after removing dismissed):', filteredAlerts.length);
        
        setAlerts(filteredAlerts);
        setSummary(alertSummary);
        setDismissedAlerts(dismissed);
      }
    } catch (error) {
      console.error('❌ Error fetching maintenance alerts:', error);
      console.error('❌ Error details:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (machineId) => {
    const dismissed = [...dismissedAlerts, machineId.toString()];
    localStorage.setItem('dismissedAlerts', JSON.stringify(dismissed));
    setDismissedAlerts(dismissed);
    setAlerts(alerts.filter(alert => alert.machineId !== machineId));
  };

  const clearAllDismissed = () => {
    localStorage.removeItem('dismissedAlerts');
    setDismissedAlerts([]);
    fetchMaintenanceAlerts();
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="w-6 h-6 text-red-600" />;
      case 'HIGH':
        return <AlertCircle className="w-6 h-6 text-orange-600" />;
      case 'MEDIUM':
        return <Info className="w-6 h-6 text-yellow-600" />;
      case 'LOW':
        return <Info className="w-6 h-6 text-blue-600" />;
      default:
        return <Bell className="w-6 h-6 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'HIGH':
        return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
      case 'MEDIUM':
        return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
      case 'LOW':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      default:
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600 text-white';
      case 'HIGH':
        return 'bg-orange-600 text-white';
      case 'MEDIUM':
        return 'bg-yellow-600 text-white';
      case 'LOW':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const filteredAlerts = filterSeverity === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.severity === filterSeverity);

  const totalAlerts = alerts.length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-600" />
              AI Alerts
            </h1>
            <p className="text-gray-600 mt-2">
              Smart maintenance alerts powered by AI for your machines
            </p>
          </div>
          <button
            onClick={fetchMaintenanceAlerts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setFilterSeverity('all')}
            className={`p-4 rounded-lg border-2 transition-all ${
              filterSeverity === 'all' 
                ? 'border-blue-600 bg-blue-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{totalAlerts}</p>
              </div>
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
          </button>

          <button
            onClick={() => setFilterSeverity('CRITICAL')}
            className={`p-4 rounded-lg border-2 transition-all ${
              filterSeverity === 'CRITICAL' 
                ? 'border-red-600 bg-red-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </button>

          <button
            onClick={() => setFilterSeverity('HIGH')}
            className={`p-4 rounded-lg border-2 transition-all ${
              filterSeverity === 'HIGH' 
                ? 'border-orange-600 bg-orange-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High</p>
                <p className="text-2xl font-bold text-orange-600">{summary.high}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </button>

          <button
            onClick={() => setFilterSeverity('MEDIUM')}
            className={`p-4 rounded-lg border-2 transition-all ${
              filterSeverity === 'MEDIUM' 
                ? 'border-yellow-600 bg-yellow-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Medium</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.medium}</p>
              </div>
              <Info className="w-8 h-8 text-yellow-600" />
            </div>
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {filterSeverity === 'all' ? 'All Alerts' : `${filterSeverity} Priority Alerts`}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Showing {filteredAlerts.length} of {totalAlerts} alerts
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="font-medium">Loading alerts...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">
              {filterSeverity === 'all' 
                ? 'All machines are up to date!' 
                : `No ${filterSeverity.toLowerCase()} priority alerts`}
            </p>
            <p className="text-sm mt-2">
              {totalAlerts === 0 && dismissedAlerts.length > 0 && (
                <button
                  onClick={clearAllDismissed}
                  className="mt-4 text-blue-600 hover:text-blue-700 underline"
                >
                  Show dismissed alerts
                </button>
              )}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.machineId}
                className={`p-6 transition-all border-l-4 ${
                  alert.severity === 'CRITICAL' ? 'border-l-red-600' :
                  alert.severity === 'HIGH' ? 'border-l-orange-600' :
                  alert.severity === 'MEDIUM' ? 'border-l-yellow-600' :
                  'border-l-blue-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {alert.machineName}
                      </h3>
                      <span className="text-sm text-gray-500 font-mono">
                        {alert.machineCode}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityBadgeColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                    
                    <p className="text-base text-gray-700 font-medium mb-4">
                      {alert.message}
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Wrench className="w-4 h-4" />
                        <span className="font-medium">{alert.machineType.replace(/_/g, ' ')}</span>
                      </div>
                      
                      {alert.location?.workshop && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Info className="w-4 h-4" />
                          <span>{alert.location.workshop}</span>
                        </div>
                      )}
                      
                      {alert.nextMaintenanceDate && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(alert.nextMaintenanceDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      {alert.totalOperatingHours > 0 && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{alert.totalOperatingHours.toFixed(1)}h</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => dismissAlert(alert.machineId)}
                    className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Dismiss alert"
                  >
                    <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">About AI Alerts</p>
            <p>
              These alerts are automatically generated based on machine operating hours, 
              maintenance schedules, and predictive analytics. Keep your equipment running 
              smoothly by addressing alerts promptly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAlerts;
