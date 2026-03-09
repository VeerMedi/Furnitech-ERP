import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import api from '../../services/api';
import { Package, Lock, TrendingUp, TrendingDown, Minus, FileText, CheckCircle, Truck, Activity } from 'lucide-react';
import AISuggestionsBox from '../../components/AISuggestionsBox';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const InventoryDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/inventory/dashboard/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // Use real monthly data if available, otherwise flat line
  const monthlyTransactionsTrend = stats?.monthlyData?.map(m => m.total) || [];

  // Helper to get consistent data or flat line
  const getRealOrFlatData = (currentValue) => {
    // If we have specific history, use it (Not available in current API response based on code)
    // So we return a flat line of the current value to indicate "Stable" or "Unknown history"
    // instad of misleading random fluctuations.
    // If monthlyTransactionsTrend exists, we could use it as a proxy for "Activity" cards but not Stock levels.
    return [currentValue || 0, currentValue || 0];
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Create real stable data for each stat card
  // TODO: Update API to return historical snapshots for true history. 
  // For now, stable trend (0%) is better than fake random numbers.

  const totalStockData = getRealOrFlatData(stats?.stats?.totalStock);
  const totalStockTrend = getTrendColorAndPercentage(totalStockData);

  const blockedStockData = getRealOrFlatData(stats?.stats?.blockedStock);
  const blockedStockTrend = getTrendColorAndPercentage(blockedStockData);

  const upcomingStockData = getRealOrFlatData(stats?.stats?.upcomingStock);
  const upcomingStockTrend = getTrendColorAndPercentage(upcomingStockData);

  const issuedData = getRealOrFlatData(stats?.stats?.issued);
  const issuedTrend = getTrendColorAndPercentage(issuedData);

  const returnedData = getRealOrFlatData(stats?.stats?.returned);
  const returnedTrend = getTrendColorAndPercentage(returnedData);

  const posCreatedData = getRealOrFlatData(stats?.stats?.posCreated);
  const posCreatedTrend = getTrendColorAndPercentage(posCreatedData);

  const posApprovedData = getRealOrFlatData(stats?.stats?.posApproved);
  const posApprovedTrend = getTrendColorAndPercentage(posApprovedData);

  const grnsCreatedData = getRealOrFlatData(stats?.stats?.grnsCreated);
  const grnsCreatedTrend = getTrendColorAndPercentage(grnsCreatedData);

  // Chart configurations for small trend lines
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

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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

  const stockDonutData = {
    labels: ['Total Stock', 'Blocked', 'Available'],
    datasets: [{
      data: [
        stats?.stats?.totalStock || 0,
        stats?.stats?.blockedStock || 0,
        (stats?.stats?.totalStock || 0) - (stats?.stats?.blockedStock || 0)
      ],
      backgroundColor: ['hsl(349, 66%, 35%)', '#fbbf24', '#10b981'],
      borderWidth: 0
    }]
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="text-gray-600 mt-1">Complete overview of stock and purchase management</p>
        </div>
        <button
          onClick={() => navigate('/inventory/purchase')}
          className="px-6 py-3 text-white rounded-xl hover:opacity-90 transition-all font-medium shadow-lg"
          style={{ backgroundColor: 'hsl(349, 66%, 35%)' }}
        >
          View Purchases
        </button>
      </div>

      {/* AI Suggestions Section */}
      <AISuggestionsBox />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Stock</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.stats?.totalStock || 0}</p>
              <p className={`text-sm ${totalStockTrend.textColor} mt-1 flex items-center gap-1`}>
                {totalStockTrend.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {totalStockTrend.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                {totalStockTrend.trend === 'stable' && <Minus className="w-4 h-4" />}
                {totalStockTrend.trend === 'down' ? '-' : '+'}{totalStockTrend.percentage}% from last period
              </p>
            </div>
          </div>
          <div className="h-24">
            <Line data={createTrendChart(totalStockData, totalStockTrend)} options={lineChartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Blocked Stock</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.stats?.blockedStock || 0}</p>
              <p className={`text-sm ${blockedStockTrend.textColor} mt-1 flex items-center gap-1`}>
                {blockedStockTrend.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {blockedStockTrend.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                {blockedStockTrend.trend === 'stable' && <Minus className="w-4 h-4" />}
                {blockedStockTrend.trend === 'down' ? '-' : '+'}{blockedStockTrend.percentage}% from last period
              </p>
            </div>
          </div>
          <div className="h-24">
            <Line data={createTrendChart(blockedStockData, blockedStockTrend)} options={lineChartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Upcoming Stock</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.stats?.upcomingStock || 0}</p>
              <p className={`text-sm ${upcomingStockTrend.textColor} mt-1 flex items-center gap-1`}>
                {upcomingStockTrend.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {upcomingStockTrend.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                {upcomingStockTrend.trend === 'stable' && <Minus className="w-4 h-4" />}
                {upcomingStockTrend.trend === 'down' ? '-' : '+'}{upcomingStockTrend.percentage}% from last period
              </p>
            </div>
          </div>
          <div className="h-24">
            <Line data={createTrendChart(upcomingStockData, upcomingStockTrend)} options={lineChartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Issued</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.stats?.issued || 0}</p>
              <p className={`text-sm ${issuedTrend.textColor} mt-1 flex items-center gap-1`}>
                {issuedTrend.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {issuedTrend.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                {issuedTrend.trend === 'stable' && <Minus className="w-4 h-4" />}
                {issuedTrend.trend === 'down' ? '-' : '+'}{issuedTrend.percentage}% from last period
              </p>
            </div>
          </div>
          <div className="h-24">
            <Line data={createTrendChart(issuedData, issuedTrend)} options={lineChartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Returned</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.stats?.returned || 0}</p>
              <p className={`text-sm ${returnedTrend.textColor} mt-1 flex items-center gap-1`}>
                {returnedTrend.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {returnedTrend.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                {returnedTrend.trend === 'stable' && <Minus className="w-4 h-4" />}
                {returnedTrend.trend === 'down' ? '-' : '+'}{returnedTrend.percentage}% from last period
              </p>
            </div>
          </div>
          <div className="h-24">
            <Line data={createTrendChart(returnedData, returnedTrend)} options={lineChartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">PO Created</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.stats?.posCreated || 0}</p>
              <p className={`text-sm ${posCreatedTrend.textColor} mt-1 flex items-center gap-1`}>
                {posCreatedTrend.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {posCreatedTrend.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                {posCreatedTrend.trend === 'stable' && <Minus className="w-4 h-4" />}
                {posCreatedTrend.trend === 'down' ? '-' : '+'}{posCreatedTrend.percentage}% from last period
              </p>
            </div>
          </div>
          <div className="h-24">
            <Line data={createTrendChart(posCreatedData, posCreatedTrend)} options={lineChartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">PO Approved</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.stats?.posApproved || 0}</p>
              <p className={`text-sm ${posApprovedTrend.textColor} mt-1 flex items-center gap-1`}>
                {posApprovedTrend.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {posApprovedTrend.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                {posApprovedTrend.trend === 'stable' && <Minus className="w-4 h-4" />}
                {posApprovedTrend.trend === 'down' ? '-' : '+'}{posApprovedTrend.percentage}% from last period
              </p>
            </div>
          </div>
          <div className="h-24">
            <Line data={createTrendChart(posApprovedData, posApprovedTrend)} options={lineChartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">GRN Created</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.stats?.grnsCreated || 0}</p>
              <p className={`text-sm ${grnsCreatedTrend.textColor} mt-1 flex items-center gap-1`}>
                {grnsCreatedTrend.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {grnsCreatedTrend.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                {grnsCreatedTrend.trend === 'stable' && <Minus className="w-4 h-4" />}
                {grnsCreatedTrend.trend === 'down' ? '-' : '+'}{grnsCreatedTrend.percentage}% from last period
              </p>
            </div>
          </div>
          <div className="h-24">
            <Line data={createTrendChart(grnsCreatedData, grnsCreatedTrend)} options={lineChartOptions} />
          </div>
        </div>
      </div>

      {/* Stock Distribution Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-lg mb-6" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Stock Distribution Overview</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 flex items-center justify-center">
            <Doughnut data={stockDonutData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                  position: 'bottom',
                  labels: {
                    padding: 20,
                    font: { size: 14, weight: '600' },
                    usePointStyle: true,
                    pointStyle: 'circle',
                    color: '#374151',
                  }
                },
                tooltip: {
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  padding: 16,
                  borderRadius: 12,
                  displayColors: true,
                  titleFont: { size: 14, weight: 'bold' },
                  bodyFont: { size: 13 },
                  callbacks: {
                    label: (context) => {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const percentage = ((value / total) * 100).toFixed(1);
                      return ` ${label}: ${value.toLocaleString()} units (${percentage}%)`;
                    }
                  }
                },
              },
              animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1500,
                easing: 'easeInOutQuart'
              },
              cutout: '65%',
            }} />
          </div>
          <div className="flex flex-col justify-center space-y-4">
            <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-5 border-l-4 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105" style={{ borderColor: 'hsl(349, 66%, 35%)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">Total Stock Units</p>
                <Package className="w-5 h-5" style={{ color: 'hsl(349, 66%, 35%)' }} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats?.stats?.totalStock?.toLocaleString() || 0}</p>
              <div className="mt-2 h-1 bg-red-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-5 border-l-4 border-yellow-500 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">Blocked Units</p>
                <Lock className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats?.stats?.blockedStock?.toLocaleString() || 0}</p>
              <div className="mt-2 h-1 bg-yellow-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full" style={{ width: `${((stats?.stats?.blockedStock || 0) / (stats?.stats?.totalStock || 1)) * 100}%` }}></div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-5 border-l-4 border-green-500 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">Available Units</p>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{((stats?.stats?.totalStock || 0) - (stats?.stats?.blockedStock || 0)).toLocaleString()}</p>
              <div className="mt-2 h-1 bg-green-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full" style={{ width: `${(((stats?.stats?.totalStock || 0) - (stats?.stats?.blockedStock || 0)) / (stats?.stats?.totalStock || 1)) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 shadow-lg" style={{ border: '2px solid hsl(349, 66%, 35%)' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 animate-bounce-subtle" style={{ color: 'hsl(349, 66%, 35%)' }} />
            Recent Activity
          </h3>
          <span className="text-sm text-gray-500 animate-pulse">{stats?.recentTransactions?.length || 0} transactions</span>
        </div>
        <div className="space-y-3">
          {stats?.recentTransactions?.slice(0, 8).map((transaction, idx) => (
            <div
              key={idx}
              className="group flex items-center justify-between py-4 px-5 rounded-xl border-2 transition-all duration-500 hover:shadow-xl hover:scale-[1.03] hover:-translate-y-1 cursor-pointer animate-slide-in-right relative overflow-hidden"
              style={{
                backgroundColor: 'hsl(349, 66%, 98%)',
                borderColor: 'hsl(349, 66%, 85%)',
                animationDelay: `${idx * 80}ms`
              }}
            >
              {/* Animated background on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 transform -translate-x-full group-hover:translate-x-full" style={{ transition: 'transform 0.8s ease' }}></div>

              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 animate-pulse-ring ${transaction.transactionType === 'Purchase' ? 'bg-gradient-to-br from-green-100 to-green-200 group-hover:from-green-200 group-hover:to-green-300' :
                  transaction.transactionType === 'Issue' ? 'bg-gradient-to-br from-red-100 to-red-200 group-hover:from-red-200 group-hover:to-red-300' : 'bg-gradient-to-br from-blue-100 to-blue-200 group-hover:from-blue-200 group-hover:to-blue-300'
                  }`}>
                  <Activity className={`w-6 h-6 transition-transform duration-300 group-hover:scale-125 ${transaction.transactionType === 'Purchase' ? 'text-green-700' :
                    transaction.transactionType === 'Issue' ? 'text-red-700' : 'text-blue-700'
                    }`} />
                </div>
                <div className="transition-transform duration-300 group-hover:translate-x-2">
                  <p className="font-semibold text-gray-900 group-hover:text-gray-950 transition-colors">{transaction.itemName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full transition-all duration-300 group-hover:scale-110 ${transaction.transactionType === 'Purchase' ? 'bg-green-100 text-green-700 group-hover:bg-green-200' :
                      transaction.transactionType === 'Issue' ? 'bg-red-100 text-red-700 group-hover:bg-red-200' : 'bg-blue-100 text-blue-700 group-hover:bg-blue-200'
                      }`}>
                      {transaction.transactionType}
                    </span>
                    <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors font-medium">{transaction.quantity} {transaction.unit}</p>
                  </div>
                </div>
              </div>
              <div className="text-right relative z-10 transition-transform duration-300 group-hover:-translate-x-2">
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{new Date(transaction.transactionDate).toLocaleDateString()}</p>
                <p className="text-xs text-gray-500 mt-1 group-hover:text-gray-600 transition-colors">{transaction.referenceNo || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;
