import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line as RechartsLine, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend as ChartLegend, Filler } from 'chart.js';
import { TrendingUp, TrendingDown, Minus, Eye } from 'lucide-react';
import api from '../services/api';

import { toast } from '../hooks/useToast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, ChartLegend, Filler);

const MachineDashboard = () => {
  const [machines, setMachines] = useState([]);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [historicalStats, setHistoricalStats] = useState({
    total: [],
    operational: [],
    maintenance: [],
    breakdown: [],
    utilization: [] // For average utilization history
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingMachine, setEditingMachine] = useState(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editedMachine, setEditedMachine] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMachine, setNewMachine] = useState({
    name: '',
    machineCode: '',
    type: 'ASSEMBLY_TABLE',
    operationalStatus: 'OPERATIONAL',
    manufacturer: '',
    model: '',
    serialNumber: '',
    location: '',
    performance: {
      utilizationRate: 0,
      totalOperatingHours: 0
    },
    maintenance: {
      lastMaintenanceDate: '',
      nextMaintenanceDate: ''
    }
  });
  const [serviceData, setServiceData] = useState({
    serviceStatus: 'Good',
    serviceDate: '',
    description: ''
  });

  useEffect(() => {
    fetchMachines();
    fetchStats();
    fetchChartData();
  }, []);


  const calculateHistory = (machinesList) => {
    try {
      const now = new Date();
      const history = {
        total: [],
        operational: [],
        maintenance: [],
        breakdown: [],
        utilization: []
      };

      // Calculate for last 12 months
      for (let i = 11; i >= 0; i--) {
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

        // Filter machines that existed at this point in time
        const existingMachines = machinesList.filter(m => {
          const created = new Date(m.createdAt || new Date()); // Fallback to now if missing
          return created <= monthEnd;
        });

        // 1. Total Machines
        history.total.push(existingMachines.length);

        // 2. Operational (Proxy: count of currently operational machines that existed then)
        // Ideally we'd have a status history log, but for now we track fleet growth of this segment
        const opCount = existingMachines.filter(m => m.operationalStatus === 'OPERATIONAL').length;
        history.operational.push(opCount);

        // 3. Maintenance
        const maintCount = existingMachines.filter(m => m.operationalStatus === 'UNDER_MAINTENANCE').length;
        history.maintenance.push(maintCount);

        // 4. Breakdown
        const breakCount = existingMachines.filter(m => m.operationalStatus === 'BREAKDOWN').length;
        history.breakdown.push(breakCount);

        // 5. Avg Utilization
        const totalUtil = existingMachines.reduce((sum, m) => sum + (m.performance?.utilizationRate || 0), 0);
        const avgUtil = existingMachines.length > 0 ? Math.round(totalUtil / existingMachines.length) : 0;
        history.utilization.push(avgUtil);
      }

      console.log('📊 Calculated Historical Stats:', history);
      setHistoricalStats(history);
    } catch (err) {
      console.error('Error calculating history:', err);
    }
  };

  const fetchMachines = async () => {
    try {
      setLoading(true);
      console.log('Fetching machines...');
      console.log('TenantId:', localStorage.getItem('tenantId'));
      console.log('Token:', localStorage.getItem('orgToken')?.substring(0, 20) + '...');

      const response = await api.get('/machines', {
        params: {
          search: searchTerm,
          type: typeFilter,
          status: statusFilter
        }
      });

      console.log('Machines API Response:', response.data);
      console.log('Machines count:', response.data.data?.length || 0);

      const fetchedMachines = response.data.data || [];
      setMachines(fetchedMachines);
      calculateHistory(fetchedMachines);
    } catch (error) {
      console.error('Error fetching machines:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/machines/dashboard/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      const response = await api.get('/machines/chart/usage');
      setChartData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const handleServiceStatusChange = async () => {
    try {
      await api.put(`/machines/${selectedMachine._id}/service`, serviceData);
      setShowServiceModal(false);
      fetchMachines();
      fetchStats();
    } catch (error) {
      console.error('Error updating service status:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPERATIONAL': return 'bg-green-100 text-green-800';
      case 'UNDER_MAINTENANCE': return 'bg-yellow-100 text-yellow-800';
      case 'BREAKDOWN': return 'bg-red-100 text-red-800';
      case 'IDLE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getServiceStatusValue = (operationalStatus) => {
    switch (operationalStatus) {
      case 'OPERATIONAL': return 'Good';
      case 'BREAKDOWN': return 'Repair Needed';
      case 'UNDER_MAINTENANCE': return 'Under Service';
      case 'IDLE': return 'Replacement Required';
      default: return 'Good';
    }
  };

  const getServiceStatusByDate = (lastServiceDate, nextServiceDate) => {
    if (!nextServiceDate) return 'Good'; // No service scheduled

    const now = new Date();
    const nextDate = new Date(nextServiceDate);
    const daysUntilService = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));

    // If service date has passed (overdue)
    if (daysUntilService < 0) {
      const daysOverdue = Math.abs(daysUntilService);
      if (daysOverdue > 30) return 'Replacement Required'; // More than 30 days overdue
      if (daysOverdue > 7) return 'Repair Needed'; // More than 7 days overdue
      return 'Under Service'; // Less than 7 days overdue
    }

    // If service is upcoming
    if (daysUntilService <= 7) return 'Under Service'; // Service due within a week
    if (daysUntilService <= 30) return 'Good'; // Service due within a month
    return 'Good'; // Service scheduled for later
  };

  const getServiceStatusColor = (status) => {
    switch (status) {
      case 'Good': return 'bg-green-100 text-green-800';
      case 'Under Service': return 'bg-yellow-100 text-yellow-800';
      case 'Repair Needed': return 'bg-orange-100 text-orange-800';
      case 'Replacement Required': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString();
    } catch (e) {
      return 'N/A';
    }
  };

  const machineTypes = [
    'CNC_MACHINE',
    'PANEL_SAW',
    'EDGEBANDING_MACHINE',
    'DRILLING_MACHINE',
    'SANDING_MACHINE',
    'PRESSING_MACHINE',
    'SPRAY_BOOTH',
    'ASSEMBLY_TABLE'
  ];

  // Generate smooth trend data for metrics
  const generateTrendData = (baseValue) => {
    return Array.from({ length: 12 }, (_, i) => {
      const variance = Math.sin(i / 2) * 8 + Math.random() * 4;
      return Math.max(0, Math.floor(baseValue + variance));
    });
  };

  // Analyze trend and return styling info
  const getTrendColorAndPercentage = (data) => {
    if (!data || data.length < 2) {
      return { color: 'rgb(251, 191, 36)', bgColor: 'rgba(251, 191, 36, 0.1)', percentage: 0, trend: 'stable', icon: Minus, textColor: 'text-amber-600' };
    }

    const midPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midPoint);
    const secondHalf = data.slice(midPoint);

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const percentChange = ((avgSecond - avgFirst) / avgFirst) * 100;

    if (percentChange > 3) {
      return {
        color: 'rgb(34, 197, 94)',
        bgColor: 'rgba(34, 197, 94, 0.1)',
        percentage: percentChange.toFixed(1),
        trend: 'up',
        icon: TrendingUp,
        textColor: 'text-green-600'
      };
    } else if (percentChange < -3) {
      return {
        color: 'rgb(239, 68, 68)',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        percentage: Math.abs(percentChange).toFixed(1),
        trend: 'down',
        icon: TrendingDown,
        textColor: 'text-red-600'
      };
    }

    return {
      color: 'rgb(251, 191, 36)',
      bgColor: 'rgba(251, 191, 36, 0.1)',
      percentage: Math.abs(percentChange).toFixed(1),
      trend: 'stable',
      icon: Minus,
      textColor: 'text-amber-600'
    };
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Chart configuration for trend lines - stable object
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        borderRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      x: { display: false, grid: { display: false } },
      y: { display: false, grid: { display: false } },
    },
  };

  // Helper to create trend chart data
  const createTrendChart = (data, trendInfo) => ({
    labels: months,
    datasets: [{
      data: data,
      borderColor: trendInfo.color,
      backgroundColor: trendInfo.bgColor,
      tension: 0.4,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 6,
      borderWidth: 2,
    }]
  });

  // Generate stable trend data
  const generateStableTrendData = (baseValue, seed) => {
    return Array.from({ length: 12 }, (_, i) => {
      const seededRandom = Math.sin(seed + i) * 10000;
      const variance = Math.sin(i / 2) * 8 + (seededRandom - Math.floor(seededRandom)) * 4;
      return Math.max(0, Math.floor(baseValue + variance));
    });
  };

  // Render stat card
  const renderStatCard = (title, value, color, historicalData) => {
    const trendData = (historicalData && historicalData.length > 0) ? historicalData : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const trend = getTrendColorAndPercentage(trendData);
    const TrendIcon = trend.icon;

    return (
      <div key={title} className="bg-white rounded-2xl p-6 shadow-lg hover-lift transition-all duration-300" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-600 text-sm mb-1">{title}</p>
            <p className={`text-3xl font-bold ${color} transition-all duration-300`}>{value}</p>
            <p className={`text-sm ${trend.textColor} mt-1 flex items-center gap-1`}>
              <TrendIcon className="w-4 h-4 animate-bounce-subtle" />
              {trend.trend === 'down' ? '-' : '+'}{trend.percentage}% from last period
            </p>
          </div>
        </div>
        <div className="h-24">
          <Line data={createTrendChart(trendData, trend)} options={lineChartOptions} />
        </div>
      </div>
    );
  };

  const conditionBreakdownData = stats ? [
    { name: 'Operational', value: stats.operationalMachines, color: '#22c55e' },
    { name: 'Under Maintenance', value: stats.underMaintenanceMachines, color: '#eab308' },
    { name: 'Breakdown', value: stats.breakdownMachines, color: '#ef4444' },
    { name: 'Idle', value: stats.idleMachines, color: '#9ca3af' }
  ] : [];

  // Filter machines by search term (Machine ID or Name)
  const filteredMachines = machines.filter(machine => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      machine.machineCode?.toLowerCase().includes(searchLower) ||
      machine.name?.toLowerCase().includes(searchLower);
    const matchesType = !typeFilter || machine.type === typeFilter;
    const matchesStatus = !statusFilter || machine.operationalStatus === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Machines</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all machinery</p>
        </div>
        <div className="flex items-center gap-3">

          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 text-white rounded-xl hover:opacity-90 hover:scale-105 transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
            style={{ backgroundColor: 'hsl(349, 66%, 35%)' }}
          >
            + Add Machine
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6 animate-fade-in-up">
          {renderStatCard('Total Machines', stats.totalMachines, 'text-gray-900', historicalStats.total)}
          {renderStatCard('Active Machines', stats.operationalMachines, 'text-green-600', historicalStats.operational)}
          {renderStatCard('Under Service', stats.underMaintenanceMachines, 'text-yellow-600', historicalStats.maintenance)}
          {renderStatCard('In Repair', stats.breakdownMachines, 'text-red-600', historicalStats.breakdown)}
          {renderStatCard('Avg Utilization', `${Math.round(stats.averageUtilization)}%`, 'text-blue-600', historicalStats.utilization)}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        {/* Machine Condition Breakdown */}
        {stats && conditionBreakdownData.some(d => d.value > 0) && (
          <div className="bg-white rounded-2xl p-6 shadow-lg hover-lift transition-all duration-300" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Machine Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={conditionBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={2000}
                  animationEasing="ease-in-out"
                  isAnimationActive={true}
                >
                  {conditionBreakdownData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      style={{
                        filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '2px solid hsl(349, 66%, 35%)',
                    borderRadius: '12px',
                    padding: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  animationDuration={300}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: '20px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Machine Usage Chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg hover-lift transition-all duration-300" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Machine Utilization Rates</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity={1} />
                    <stop offset="100%" stopColor="#991b1b" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#fee2e2"
                  vertical={false}
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="name"
                  angle={0}
                  textAnchor="middle"
                  height={40}
                  tick={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '2px solid hsl(349, 66%, 35%)',
                    borderRadius: '12px',
                    padding: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  cursor={{ fill: 'rgba(220, 38, 38, 0.1)' }}
                  animationDuration={300}
                />
                <Bar
                  dataKey="utilizationRate"
                  fill="url(#barGradient)"
                  radius={[8, 8, 0, 0]}
                  animationBegin={0}
                  animationDuration={2000}
                  animationEasing="ease-in-out"
                  isAnimationActive={true}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg mb-6 animate-fade-in-up" style={{ border: '2px solid hsl(349, 66%, 35%)', animationDelay: '0.3s' }}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by Machine ID or Machine Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Types</option>
            {machineTypes.map(type => (
              <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Status</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="BREAKDOWN">Breakdown</option>
            <option value="IDLE">Idle</option>
          </select>
          <button
            onClick={fetchMachines}
            className="px-6 py-2.5 bg-red-700 text-white rounded-lg hover:bg-red-800 hover:scale-105 transition-all duration-300 font-medium whitespace-nowrap shadow-md hover:shadow-lg"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Machines Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-fade-in-up" style={{ border: '2px solid hsl(349, 66%, 35%)', animationDelay: '0.4s' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-red-50 border-b border-red-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Machine ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Machine Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Condition</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Current Usage</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Service Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Service Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-600">
                    {loading ? 'Loading machines...' : 'No machines found'}
                  </td>
                </tr>
              ) : (
                filteredMachines.map((machine, index) => (
                  <tr
                    key={machine._id}
                    className="border-b border-gray-100 hover:bg-red-50 transition-all duration-300 animate-table-row"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{machine.machineCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{machine.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{machine.type.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(machine.operationalStatus)}`}>
                        {machine.operationalStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {machine.performance?.utilizationRate || 0}% / {machine.performance?.totalOperatingHours || 0}h
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getServiceStatusColor(getServiceStatusByDate(machine.maintenance?.lastMaintenanceDate, machine.maintenance?.nextMaintenanceDate))}`}>
                        {getServiceStatusByDate(machine.maintenance?.lastMaintenanceDate, machine.maintenance?.nextMaintenanceDate)}
                      </span>
                      <span className="text-xs text-gray-500 block mt-1">(Display Status)</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {machine.maintenance?.lastMaintenanceDate
                        ? formatDate(machine.maintenance.lastMaintenanceDate)
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => {
                          setSelectedMachine(machine);
                          setEditedMachine({ ...machine });
                          setShowDetailsModal(true);
                        }}
                        className="text-red-700 hover:text-red-900 hover:bg-red-50 p-2 rounded-lg transition-all duration-300"
                        title="View & Edit Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Machine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Add New Machine</h2>
                <p className="text-sm text-gray-500 mt-1">Enter machine details</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewMachine({
                    name: '',
                    machineCode: '',
                    type: 'ASSEMBLY_TABLE',
                    operationalStatus: 'OPERATIONAL',
                    manufacturer: '',
                    model: '',
                    serialNumber: '',
                    location: '',
                    performance: { utilizationRate: 0, totalOperatingHours: 0 },
                    maintenance: { lastMaintenanceDate: '', nextMaintenanceDate: '' }
                  });
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Machine Name *</label>
                  <input
                    type="text"
                    value={newMachine.name}
                    onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g., Packing Bench PB-200"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Machine ID *</label>
                  <input
                    type="text"
                    value={newMachine.machineCode}
                    onChange={(e) => setNewMachine({ ...newMachine, machineCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g., MCH0020"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Type *</label>
                  <select
                    value={newMachine.type}
                    onChange={(e) => setNewMachine({ ...newMachine, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="ASSEMBLY_TABLE">Assembly Table</option>
                    <option value="CNC_MACHINE">CNC Machine</option>
                    <option value="SPRAY_BOOTH">Spray Booth</option>
                    <option value="PANEL_SAW">Panel Saw</option>
                    <option value="EDGEBANDING_MACHINE">Edgebanding Machine</option>
                    <option value="DRILLING_MACHINE">Drilling Machine</option>
                    <option value="SANDING_MACHINE">Sanding Machine</option>
                    <option value="PRESSING_MACHINE">Pressing Machine</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                  <select
                    value={newMachine.operationalStatus}
                    onChange={(e) => setNewMachine({ ...newMachine, operationalStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="OPERATIONAL">Operational</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                    <option value="BREAKDOWN">Breakdown</option>
                    <option value="IDLE">Idle</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Manufacturer</label>
                  <input
                    type="text"
                    value={newMachine.manufacturer}
                    onChange={(e) => setNewMachine({ ...newMachine, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g., SCM Group"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Model</label>
                  <input
                    type="text"
                    value={newMachine.model}
                    onChange={(e) => setNewMachine({ ...newMachine, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g., Tech Z5"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Serial Number</label>
                  <input
                    type="text"
                    value={newMachine.serialNumber}
                    onChange={(e) => setNewMachine({ ...newMachine, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g., SN12345678"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Location</label>
                  <input
                    type="text"
                    value={newMachine.location}
                    onChange={(e) => setNewMachine({ ...newMachine, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g., Assembly Area Station 1 Ground Floor"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Utilization Rate (%)</label>
                  <input
                    type="number"
                    value={newMachine.performance.utilizationRate}
                    onChange={(e) => setNewMachine({
                      ...newMachine,
                      performance: { ...newMachine.performance, utilizationRate: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Operating Hours</label>
                  <input
                    type="number"
                    value={newMachine.performance.totalOperatingHours}
                    onChange={(e) => setNewMachine({
                      ...newMachine,
                      performance: { ...newMachine.performance, totalOperatingHours: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Last Service Date</label>
                  <input
                    type="date"
                    value={newMachine.maintenance.lastMaintenanceDate}
                    onChange={(e) => setNewMachine({
                      ...newMachine,
                      maintenance: { ...newMachine.maintenance, lastMaintenanceDate: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Next Service Date</label>
                  <input
                    type="date"
                    value={newMachine.maintenance.nextMaintenanceDate}
                    onChange={(e) => setNewMachine({
                      ...newMachine,
                      maintenance: { ...newMachine.maintenance, nextMaintenanceDate: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Set this date to get maintenance reminders in the notification bell
                  </p>
                </div>
              </div>
            </div>

            {/* Notification Alert Info */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>📅 Maintenance Notifications:</strong> You'll receive alerts when:
              </p>
              <ul className="text-xs text-blue-700 mt-1 ml-4 list-disc space-y-0.5">
                <li>Maintenance is <strong className="text-red-600">overdue</strong> (Critical)</li>
                <li>Due <strong className="text-orange-600">today or tomorrow</strong> (High)</li>
                <li>Due <strong className="text-yellow-600">within 7 days</strong> (Medium)</li>
                <li>Due <strong className="text-blue-600">within 14 days</strong> (Low)</li>
              </ul>
              <p className="text-xs text-blue-600 mt-2">
                Check the 🔔 bell icon in the header for real-time maintenance alerts!
              </p>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewMachine({
                    name: '',
                    machineCode: '',
                    type: 'ASSEMBLY_TABLE',
                    operationalStatus: 'OPERATIONAL',
                    manufacturer: '',
                    model: '',
                    serialNumber: '',
                    location: '',
                    performance: { utilizationRate: 0, totalOperatingHours: 0 },
                    maintenance: { lastMaintenanceDate: '', nextMaintenanceDate: '' }
                  });
                }}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!newMachine.name || !newMachine.machineCode) {
                      toast.warning('Please fill in required fields: Machine Name and Machine ID');
                      return;
                    }

                    // Format data to match backend schema
                    const machineData = {
                      name: newMachine.name,
                      machineCode: newMachine.machineCode,
                      type: newMachine.type,
                      operationalStatus: newMachine.operationalStatus,
                      specifications: {
                        manufacturer: newMachine.manufacturer,
                        model: newMachine.model,
                        serialNumber: newMachine.serialNumber
                      },
                      location: {
                        workshop: newMachine.location || 'Main Workshop'
                      },
                      performance: {
                        utilizationRate: newMachine.performance.utilizationRate || 0,
                        totalOperatingHours: newMachine.performance.totalOperatingHours || 0
                      },
                      maintenance: {
                        lastMaintenanceDate: newMachine.maintenance.lastMaintenanceDate || undefined,
                        nextMaintenanceDate: newMachine.maintenance.nextMaintenanceDate || undefined,
                        maintenanceFrequencyDays: 90 // Default 90 days
                      }
                    };

                    await api.post('/machines', machineData);
                    setShowAddModal(false);
                    setNewMachine({
                      name: '',
                      machineCode: '',
                      type: 'ASSEMBLY_TABLE',
                      operationalStatus: 'OPERATIONAL',
                      manufacturer: '',
                      model: '',
                      serialNumber: '',
                      location: '',
                      performance: { utilizationRate: 0, totalOperatingHours: 0 },
                      maintenance: { lastMaintenanceDate: '', nextMaintenanceDate: '' }
                    });
                    fetchMachines();
                    fetchStats();
                    fetchChartData();
                    toast.success('Machine created successfully! Check the notification bell for maintenance reminders. ✅');
                  } catch (error) {
                    console.error('Failed to create machine:', error);
                    toast.error('Failed to create machine: ' + (error.response?.data?.message || error.message));
                  }
                }}
                className="px-6 py-2.5 bg-red-700 text-white rounded-lg hover:bg-red-800 hover:scale-105 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
              >
                Add Machine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Status Modal */}
      {showServiceModal && selectedMachine && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Update Service Status</h2>
            <p className="text-sm text-gray-600 mb-6">{selectedMachine.name}</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">Service Status</label>
                <select
                  value={serviceData.serviceStatus}
                  onChange={(e) => setServiceData({ ...serviceData, serviceStatus: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option>Good</option>
                  <option>Repair Needed</option>
                  <option>Under Service</option>
                  <option>Replacement Required</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">Service Date</label>
                <input
                  type="date"
                  value={serviceData.serviceDate}
                  onChange={(e) => setServiceData({ ...serviceData, serviceDate: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">Description</label>
                <textarea
                  value={serviceData.description}
                  onChange={(e) => setServiceData({ ...serviceData, description: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows="3"
                  placeholder="Enter service details..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleServiceStatusChange}
                  className="flex-1 px-4 py-2.5 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium"
                >
                  Update
                </button>
                <button
                  onClick={() => setShowServiceModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editable Details Modal */}
      {showDetailsModal && selectedMachine && editedMachine && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedMachine.name || 'Unknown'}</h2>
                <p className="text-sm text-gray-500 mt-1">Edit Machine Details</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setEditedMachine(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Machine Name</label>
                  <input
                    type="text"
                    value={editedMachine.name || ''}
                    onChange={(e) => setEditedMachine({ ...editedMachine, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Machine ID</label>
                  <input
                    type="text"
                    value={editedMachine.machineCode || ''}
                    onChange={(e) => setEditedMachine({ ...editedMachine, machineCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Type</label>
                  <select
                    value={editedMachine.type || ''}
                    onChange={(e) => setEditedMachine({ ...editedMachine, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="ASSEMBLY_TABLE">Assembly Table</option>
                    <option value="CNC_MACHINE">CNC Machine</option>
                    <option value="SPRAY_BOOTH">Spray Booth</option>
                    <option value="PANEL_SAW">Panel Saw</option>
                    <option value="EDGEBANDING_MACHINE">Edgebanding Machine</option>
                    <option value="DRILLING_MACHINE">Drilling Machine</option>
                    <option value="SANDING_MACHINE">Sanding Machine</option>
                    <option value="PRESSING_MACHINE">Pressing Machine</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                  <select
                    value={editedMachine.operationalStatus || ''}
                    onChange={(e) => setEditedMachine({ ...editedMachine, operationalStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="OPERATIONAL">Operational</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                    <option value="BREAKDOWN">Breakdown</option>
                    <option value="IDLE">Idle</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Manufacturer</label>
                  <input
                    type="text"
                    value={editedMachine.manufacturer || ''}
                    onChange={(e) => setEditedMachine({ ...editedMachine, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Model</label>
                  <input
                    type="text"
                    value={editedMachine.model || ''}
                    onChange={(e) => setEditedMachine({ ...editedMachine, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Serial Number</label>
                  <input
                    type="text"
                    value={editedMachine.serialNumber || ''}
                    onChange={(e) => setEditedMachine({ ...editedMachine, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Location</label>
                  <input
                    type="text"
                    value={typeof editedMachine.location === 'object'
                      ? `${editedMachine.location.workshop || ''} ${editedMachine.location.bay || ''} ${editedMachine.location.floor || ''}`.trim()
                      : editedMachine.location || ''}
                    onChange={(e) => setEditedMachine({ ...editedMachine, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g., Assembly Area Station 1 Ground Floor"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Utilization Rate (%)</label>
                  <input
                    type="number"
                    value={editedMachine.performance?.utilizationRate || 0}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Operating Hours</label>
                  <input
                    type="number"
                    value={editedMachine.performance?.totalOperatingHours || 0}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Last Service Date</label>
                  <input
                    type="date"
                    value={editedMachine.maintenance?.lastMaintenanceDate?.split('T')[0] || ''}
                    onChange={(e) => setEditedMachine({
                      ...editedMachine,
                      maintenance: { ...editedMachine.maintenance, lastMaintenanceDate: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Next Service Date</label>
                  <input
                    type="date"
                    value={editedMachine.maintenance?.nextMaintenanceDate?.split('T')[0] || ''}
                    onChange={(e) => setEditedMachine({
                      ...editedMachine,
                      maintenance: { ...editedMachine.maintenance, nextMaintenanceDate: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setEditedMachine(null);
                }}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await api.put(`/machines/${selectedMachine._id}`, editedMachine);
                    setShowDetailsModal(false);
                    setEditedMachine(null);
                    fetchMachines();
                    fetchStats();
                    fetchChartData();
                  } catch (error) {
                    console.error('Failed to update machine:', error);
                    toast.error('Failed to update machine details');
                  }
                }}
                className="px-6 py-2.5 bg-red-700 text-white rounded-lg hover:bg-red-800 hover:scale-105 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineDashboard;
