import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler } from 'chart.js';
import api, { rawMaterialAPI } from '../../services/api';
import Button from '../../components/Button';
import { TrendingUp, TrendingDown, Minus, Package, AlertCircle, CheckCircle, XCircle, BookOpen, Upload, Trash2 } from 'lucide-react';
import { toast } from '../../hooks/useToast';
import { confirm } from '../../hooks/useConfirm';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler);

const RawMaterialDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, byCategory: {}, byStatus: {}, totalValue: 0 });
  const [historicalStats, setHistoricalStats] = useState({
    total: [],
    active: [],
    outOfStock: []
  });
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState('intelligent'); // 'intelligent' or 'strict'
  const [lastImport, setLastImport] = useState(null);  // 🚀 LAST IMPORT INFO
  const [undoing, setUndoing] = useState(false);       // 🚀 UNDO IN PROGRESS

  useEffect(() => {
    fetchData();
    fetchLastImport(); // 🚀 FETCH LAST IMPORT INFO
  }, []);


  const calculateHistory = (allMaterials) => {
    try {
      const now = new Date();
      const history = {
        total: [],
        active: [],
        outOfStock: []
      };

      for (let i = 11; i >= 0; i--) {
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

        // Filter materials that existed at this point (createdAt <= monthEnd)
        const existing = allMaterials.filter(m => {
          const created = new Date(m.createdAt || m.updatedAt || new Date());
          return created <= monthEnd;
        });

        // 1. Total Materials Count
        history.total.push(existing.length);

        // 2. Active Count (Proxy: Using current status logic, but ideally status history)
        // Calculating "How many of the currently active materials existed back then?"
        const activeCount = existing.filter(m => m.status === 'ACTIVE').length;
        history.active.push(activeCount);

        // 3. Out of Stock (Materials with 0 stock that existed then)
        // Since stock history isn't tracked, we check if CURRENT stock is 0 and it existed then.
        // This is a proxy.
        const oosCount = existing.filter(m => (m.currentStock || 0) <= 0).length;
        history.outOfStock.push(oosCount);
      }
      setHistoricalStats(history);
    } catch (err) {
      console.error('Error calculating history:', err);
    }
  };

  const fetchData = async () => {
    try {
      console.log('Fetching raw material data...');
      const [statsRes, materialsRes] = await Promise.all([
        api.get('/rawmaterial/stats/dashboard'),
        api.get('/rawmaterial')
      ]);
      console.log('Stats Response:', statsRes.data);
      console.log('Materials Response:', materialsRes.data);

      if (statsRes.data && statsRes.data.data) {
        setStats(statsRes.data.data);
      }
      if (materialsRes.data && materialsRes.data.data) {
        const allMaterials = materialsRes.data.data;
        setMaterials(allMaterials.slice(0, 10)); // Top 10 for table
        calculateHistory(allMaterials); // Calculate history from ALL data
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      console.error('Error details:', error.response || error.message);
      setError(error.response?.data?.message || error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xls|xlsx)$/i)) {
      toast.warning('Please select a valid Excel file (.xls or .xlsx)');
      event.target.value = '';
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Choose endpoint based on import mode
      const endpoint = importMode === 'strict'
        ? '/rawmaterial/import-strict'
        : '/rawmaterial/import';

      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Import response:', response.data);

      setImportResult({
        success: true,
        data: response.data.data,
        message: response.data.message,
        errors: response.data.errors || [],
        mode: importMode,
      });

      // Refresh data after successful import
      await fetchData();
      setShowImportModal(true);
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        message: error.response?.data?.message || 'Failed to import file',
        errors: error.response?.data?.errors || [error.message],
        mode: importMode,
        errorDetail: error.response?.data?.error,
      });
      setShowImportModal(true);
    } finally {
      setImporting(false);
      event.target.value = ''; // Reset file input
    }
  };

  // 🚀 FETCH LAST IMPORT INFO
  const fetchLastImport = async () => {
    try {
      const response = await rawMaterialAPI.getLastImport();
      setLastImport(response.data.data);
    } catch (error) {
      // No recent import found - that's okay
      setLastImport(null);
    }
  };

  // 🚀 UNDO LAST IMPORT
  const handleUndoLastImport = async () => {
    if (!lastImport) return;

    const confirmed = await confirm(
      `Are you sure you want to delete ${lastImport.count} materials imported on ${new Date(lastImport.importedAt).toLocaleString()}?\n\nThis action cannot be undone!`,
      'Undo Last Import'
    );

    if (!confirmed) return;

    try {
      setUndoing(true);
      const response = await rawMaterialAPI.undoLastImport();

      toast.success(`Successfully deleted ${response.data.data.deletedCount} materials from last import! ✅`);

      // Refresh data
      fetchData();
      fetchLastImport();

    } catch (error) {
      toast.error('Error undoing import: ' + (error.response?.data?.message || error.message));
    } finally {
      setUndoing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
    </div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Error: {error}</p>
          <Button onClick={fetchData}>Retry</Button>
        </div>
      </div>
    );
  }

  const categories = ['PANEL', 'LAMINATE', 'EDGEBAND', 'HARDWARE', 'GLASS', 'FABRIC', 'ALUMINIUM', 'PROCESSED_PANEL', 'HANDLES'];

  // Generate smooth trend data for materials
  const generateMaterialTrend = (baseValue) => {
    return Array.from({ length: 12 }, (_, i) => {
      const variance = Math.sin(i / 2) * 10 + Math.random() * 5;
      return Math.max(0, Math.floor(baseValue + variance));
    });
  };

  // Function to determine trend and color based on data
  const getTrendColorAndPercentage = (data) => {
    if (data.length < 2) return { color: 'rgb(234, 179, 8)', bgColor: 'rgba(234, 179, 8, 0.1)', percentage: 0, trend: 'stable', textColor: 'text-amber-600' };

    const firstHalf = data.slice(0, 6);
    const secondHalf = data.slice(6, 12);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;

    // Determine trend: up (>3%), stable (-3% to 3%), down (<-3%)
    if (percentChange > 3) {
      return {
        color: 'rgb(34, 197, 94)',
        bgColor: 'rgba(34, 197, 94, 0.1)',
        percentage: percentChange.toFixed(1),
        trend: 'up',
        textColor: 'text-green-600'
      };
    } else if (percentChange < -3) {
      return {
        color: 'rgb(239, 68, 68)',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        percentage: Math.abs(percentChange).toFixed(1),
        trend: 'down',
        textColor: 'text-red-600'
      };
    } else {
      return {
        color: 'rgb(234, 179, 8)',
        bgColor: 'rgba(234, 179, 8, 0.1)',
        percentage: Math.abs(percentChange).toFixed(1),
        trend: 'stable',
        textColor: 'text-amber-600'
      };
    }
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Total Materials Trend
  const totalMaterialsData = (historicalStats.total && historicalStats.total.length > 0)
    ? historicalStats.total
    : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const totalMaterialsTrendInfo = getTrendColorAndPercentage(totalMaterialsData);

  const totalMaterialsTrend = {
    labels: months,
    datasets: [
      {
        label: 'Total Materials',
        data: totalMaterialsData,
        borderColor: totalMaterialsTrendInfo.color,
        backgroundColor: totalMaterialsTrendInfo.bgColor,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  };

  // Active Materials Trend
  const activeMaterialsData = (historicalStats.active && historicalStats.active.length > 0)
    ? historicalStats.active
    : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const activeMaterialsTrendInfo = getTrendColorAndPercentage(activeMaterialsData);

  const activeMaterialsTrend = {
    labels: months,
    datasets: [
      {
        label: 'Active Materials',
        data: activeMaterialsData,
        borderColor: activeMaterialsTrendInfo.color,
        backgroundColor: activeMaterialsTrendInfo.bgColor,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  };

  // Out of Stock Trend
  const outOfStockData = (historicalStats.outOfStock && historicalStats.outOfStock.length > 0)
    ? historicalStats.outOfStock
    : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const outOfStockTrendInfo = getTrendColorAndPercentage(outOfStockData);

  const outOfStockTrend = {
    labels: months,
    datasets: [
      {
        label: 'Out of Stock',
        data: outOfStockData,
        borderColor: outOfStockTrendInfo.color,
        backgroundColor: outOfStockTrendInfo.bgColor,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  };

  // Category comparison bar chart
  const categoryBarData = {
    labels: categories.slice(0, 6),
    datasets: [
      {
        label: 'Stock Count',
        data: categories.slice(0, 6).map(cat => stats.byCategory?.[cat] || 0),
        backgroundColor: 'rgba(153, 27, 27, 0.8)',
        borderRadius: 8,
        barThickness: 32,
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        borderRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      x: {
        display: false,
        grid: {
          display: false,
        },
      },
      y: {
        display: false,
        grid: {
          display: false,
        },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        borderRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
        },
      },
    },
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Raw Material Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview of inventory and material statistics</p>
        </div>
        <div className="flex gap-3 items-start">
          {/* Import Mode Selector */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-2">Import Mode:</p>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="intelligent"
                  checked={importMode === 'intelligent'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">🧠 Intelligent (Flexible)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="strict"
                  checked={importMode === 'strict'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="w-4 h-4 text-red-600"
                />
                <span className="text-sm text-gray-700">📋 Template (Strict)</span>
              </label>
            </div>
            <p className="text-xs text-gray-500">
              {importMode === 'intelligent'
                ? '✨ AI-powered parser for any Excel format'
                : '📋 Requires exact template format'}
            </p>
          </div>

          {/* Import Button */}
          <div className="relative">
            <input
              type="file"
              id="excel-upload"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileImport}
              disabled={importing}
            />
            <Button
              onClick={() => document.getElementById('excel-upload').click()}
              disabled={importing}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg disabled:opacity-50"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Import Excel
                </>
              )}
            </Button>
          </div>

          {/* Download Template Button - Only show in strict mode */}
          {importMode === 'strict' && (
            <Button
              onClick={async () => {
                try {
                  const token = localStorage.getItem('orgToken');
                  const response = await fetch('/api/rawmaterial/download-template', {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'x-tenant-id': localStorage.getItem('tenantId'),
                    }
                  });
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'Raw_Material_Import_Template.xlsx';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  console.error('Template download error:', error);
                  toast.error('Failed to download template');
                }
              }}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg"
            >
              📥 Download Template
            </Button>
          )}
          <Button
            onClick={() => navigate('/raw-material/price-book')}
            className="bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white shadow-lg"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            View Price Book
          </Button>
        </div>
      </div>

      {/* 🚀 UNDO LAST IMPORT BANNER */}
      {lastImport && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 text-lg">
                  Last Import: {lastImport.count} materials
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Imported on {new Date(lastImport.importedAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
            </div>

            <button
              onClick={handleUndoLastImport}
              disabled={undoing}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md font-semibold"
            >
              {undoing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Undo Last Import</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Top Stats Cards with Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Materials */}
        <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Materials</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total || 0}</p>
              <p className={`text-sm ${totalMaterialsTrendInfo.textColor} mt-1 flex items-center gap-1`}>
                {totalMaterialsTrendInfo.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {totalMaterialsTrendInfo.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                {totalMaterialsTrendInfo.trend === 'stable' && <Minus className="w-4 h-4" />}
                {totalMaterialsTrendInfo.trend === 'down' ? '-' : '+'}{totalMaterialsTrendInfo.percentage}% from last month
              </p>
            </div>
          </div>
          <div className="h-24">
            <Line data={totalMaterialsTrend} options={lineChartOptions} />
          </div>
        </div>

        {/* Active Materials */}
        <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Active Materials</p>
              <p className="text-3xl font-bold text-gray-900">{stats.byStatus?.ACTIVE || 0}</p>
              <p className={`text-sm ${activeMaterialsTrendInfo.textColor} mt-1 flex items-center gap-1`}>
                {activeMaterialsTrendInfo.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {activeMaterialsTrendInfo.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                {activeMaterialsTrendInfo.trend === 'stable' && <Minus className="w-4 h-4" />}
                {activeMaterialsTrendInfo.trend === 'down' ? '-' : '+'}{activeMaterialsTrendInfo.percentage}% from last month
              </p>
            </div>
          </div>
          <div className="h-24">
            <Line data={activeMaterialsTrend} options={lineChartOptions} />
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Out of Stock</p>
              <p className="text-3xl font-bold text-gray-900">{stats.byStatus?.OUT_OF_STOCK || 0}</p>
              <p className={`text-sm ${outOfStockTrendInfo.textColor} mt-1 flex items-center gap-1`}>
                {outOfStockTrendInfo.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {outOfStockTrendInfo.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                {outOfStockTrendInfo.trend === 'stable' && <Minus className="w-4 h-4" />}
                {outOfStockTrendInfo.trend === 'down' ? '-' : '+'}{outOfStockTrendInfo.percentage}% from last month
              </p>
            </div>
          </div>
          <div className="h-24">
            <Line data={outOfStockTrend} options={lineChartOptions} />
          </div>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-green-200 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-2">Active Status</p>
              <p className="text-2xl font-bold text-green-600">{stats.byStatus?.ACTIVE || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-amber-200 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-2">Discontinued</p>
              <p className="text-2xl font-bold text-amber-600">{stats.byStatus?.DISCONTINUED || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-2">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats.byStatus?.OUT_OF_STOCK || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Category Distribution Bar Chart */}
        <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Category Distribution</h2>
          <p className="text-sm text-gray-600 mb-4">Stock levels by material category</p>
          <div className="h-64">
            <Bar data={categoryBarData} options={barChartOptions} />
          </div>
        </div>

        {/* Category Grid */}
        <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Material Categories</h2>
          <p className="text-sm text-gray-600 mb-4">Overview of all categories</p>
          <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
            {categories.map((category, index) => (
              <div key={category} className="bg-red-50 rounded-lg p-4 hover:bg-red-100 transition-colors border border-red-100">
                <p className="text-xs text-gray-600 mb-1">{category}</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.byCategory[category] || 0}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Materials Table */}
      <div className="bg-white rounded-2xl border border-red-200 shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100">
          <h2 className="text-xl font-semibold text-gray-900">Recent Materials</h2>
          <p className="text-sm text-gray-600 mt-1">Latest updates in inventory</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-red-100">
            <thead className="bg-red-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Height</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-red-50">
              {materials.map((material) => (
                <tr key={material._id} className="hover:bg-red-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{material.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{material.currentStock}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{material.uom}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₹{material.costPrice}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{material.specifications?.height || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{material.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${material.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                      material.status === 'DISCONTINUED' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                      {material.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Result Modal */}
      {showImportModal && importResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className={`p-6 border-b ${importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-2xl font-bold ${importResult.success ? 'text-green-900' : 'text-red-900'}`}>
                    {importResult.success ? '✓ Import Successful' : '✗ Import Failed'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Mode: {importResult.mode === 'strict' ? '📋 Template (Strict)' : '🧠 Intelligent (Flexible)'}
                  </p>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <p className={`mt-2 ${importResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {importResult.message}
              </p>
              {importResult.errorDetail && (
                <p className="mt-1 text-sm text-red-600">
                  {importResult.errorDetail}
                </p>
              )}
            </div>

            <div className="p-6">
              {importResult.success && importResult.data && (
                <div className="space-y-4">
                  {/* Intelligent Mode Stats */}
                  {importResult.mode === 'intelligent' ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-blue-600 mb-1">Rows Scanned</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {importResult.data.total_rows_scanned || importResult.data.totalRows || 0}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <p className="text-sm text-purple-600 mb-1">Materials Detected</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {importResult.data.total_raw_materials_detected || importResult.data.validRows || 0}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <p className="text-sm text-green-600 mb-1">Inserted</p>
                        <p className="text-2xl font-bold text-green-900">
                          {importResult.data.total_rows_inserted || importResult.data.imported || 0}
                        </p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <p className="text-sm text-amber-600 mb-1">Skipped</p>
                        <p className="text-2xl font-bold text-amber-900">
                          {importResult.data.total_rows_skipped || 0}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Strict Mode Stats */
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-blue-600 mb-1">Total Rows</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {importResult.data.total_rows_read || importResult.data.totalRows || 0}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <p className="text-sm text-green-600 mb-1">Imported</p>
                        <p className="text-2xl font-bold text-green-900">
                          {importResult.data.total_rows_inserted || importResult.data.imported || 0}
                        </p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <p className="text-sm text-amber-600 mb-1">Valid Rows</p>
                        <p className="text-2xl font-bold text-amber-900">
                          {importResult.data.validRows || 0}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <p className="text-sm text-red-600 mb-1">Skipped</p>
                        <p className="text-2xl font-bold text-red-900">
                          {importResult.data.total_rows_skipped || importResult.data.failed || 0}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Assumptions (Intelligent Mode Only) */}
                  {importResult.mode === 'intelligent' && importResult.data.assumptions_made && importResult.data.assumptions_made.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Assumptions Made</h3>
                      <div className="bg-blue-50 rounded-lg border border-blue-200 max-h-48 overflow-y-auto">
                        <ul className="divide-y divide-blue-200">
                          {importResult.data.assumptions_made.slice(0, 10).map((assumption, index) => (
                            <li key={index} className="p-3 text-sm text-blue-800">
                              ℹ️ {assumption}
                            </li>
                          ))}
                          {importResult.data.assumptions_made.length > 10 && (
                            <li className="p-3 text-sm text-blue-600 italic">
                              ... and {importResult.data.assumptions_made.length - 10} more assumptions
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {importResult.success ? 'Warnings & Skipped Rows' : 'Errors'}
                  </h3>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                    <ul className="divide-y divide-gray-200">
                      {importResult.errors.slice(0, 20).map((error, index) => (
                        <li key={index} className="p-3 text-sm text-gray-700">
                          {error}
                        </li>
                      ))}
                      {importResult.errors.length > 20 && (
                        <li className="p-3 text-sm text-gray-500 italic">
                          ... and {importResult.errors.length - 20} more errors
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setShowImportModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RawMaterialDashboard;
