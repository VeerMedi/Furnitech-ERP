import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../hooks/useToast';
import api from '../services/api';
import {
  TrendingUp,
  Users,
  FileText,
  IndianRupee,
  Target,
  Award,
  Calendar,
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const HOSDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInquiries: 0,
    totalLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
    totalRevenue: 0,
    avgDealSize: 0,
    topSalesmen: [],
    recentInquiries: [],
    salesByPlatform: [],
    monthlyTarget: 0,
    achievedTarget: 0,
    targetPercentage: 0
  });

  useEffect(() => {
    // Check if user is HOS
    if (user?.userRole !== 'Head of Sales (HOD)') {
      toast.error('Access Denied: HOS Dashboard is only for Head of Sales');
      navigate('/dashboard');
      return;
    }

    fetchHOSData();
  }, [user?.userRole]); // Only depend on userRole to avoid infinite loop

  const fetchHOSData = async () => {
    try {
      setLoading(true);

      // Fetch inquiries data
      const inquiriesRes = await api.get('/inquiries');
      const inquiries = inquiriesRes.data?.inquiries || [];

      // Calculate HOS-specific metrics from inquiries
      const totalInquiries = inquiries.length;
      const convertedLeads = inquiries.filter(inq => inq.leadStatus === 'CONVERTED').length;
      const conversionRate = totalInquiries > 0 ? ((convertedLeads / totalInquiries) * 100).toFixed(1) : 0;

      // Calculate total revenue from inquiries (using probability as rough estimate)
      const estimatedRevenue = inquiries.reduce((sum, inq) => {
        const estimate = inq.estimatedTotal || 0;
        return sum + estimate;
      }, 0);

      // Group inquiries by lead platform
      const platformCounts = inquiries.reduce((acc, inq) => {
        const platform = inq.leadPlatform || 'Other';
        acc[platform] = (acc[platform] || 0) + 1;
        return acc;
      }, {});

      const salesByPlatform = Object.entries(platformCounts)
        .map(([platform, count]) => ({ platform, count }))
        .sort((a, b) => b.count - a.count);

      // Get recent inquiries (last 10)
      const recentInquiries = inquiries
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);

      // Mock data for salesmen performance (replace with actual API when available)
      const topSalesmen = [
        { name: 'Salesman 1', inquiries: 45, conversions: 12, revenue: 450000 },
        { name: 'Salesman 2', inquiries: 38, conversions: 9, revenue: 380000 },
        { name: 'Salesman 3', inquiries: 32, conversions: 8, revenue: 320000 },
        { name: 'Salesman 4', inquiries: 28, conversions: 6, revenue: 280000 },
        { name: 'Salesman 5', inquiries: 25, conversions: 5, revenue: 250000 }
      ];

      // Mock target data (replace with actual API)
      const monthlyTarget = 2000000; // 20 Lakhs
      const achievedTarget = estimatedRevenue;
      const targetPercentage = monthlyTarget > 0 ? ((achievedTarget / monthlyTarget) * 100).toFixed(1) : 0;

      setStats({
        totalInquiries,
        totalLeads: totalInquiries,
        convertedLeads,
        conversionRate,
        totalRevenue: estimatedRevenue,
        avgDealSize: convertedLeads > 0 ? Math.round(estimatedRevenue / convertedLeads) : 0,
        topSalesmen,
        recentInquiries,
        salesByPlatform,
        monthlyTarget,
        achievedTarget,
        targetPercentage
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching HOS data:', error);
      toast.error('Failed to load HOS Dashboard data');
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'NEW': 'bg-blue-100 text-blue-800',
      'CONTACTED': 'bg-yellow-100 text-yellow-800',
      'QUALIFIED': 'bg-purple-100 text-purple-800',
      'CONVERTED': 'bg-green-100 text-green-800',
      'LOST': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'high': 'text-red-600',
      'medium': 'text-yellow-600',
      'low': 'text-green-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">HOS Dashboard</h1>
        <p className="text-gray-600">Welcome, {user?.firstName} {user?.lastName} - Head of Sales</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Inquiries */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Inquiries</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.totalInquiries}</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Converted Leads */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Converted Leads</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.convertedLeads}</h3>
              <p className="text-xs text-green-600 mt-1">Conversion: {stats.conversionRate}%</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <h3 className="text-3xl font-bold text-gray-800">₹{(stats.totalRevenue / 100000).toFixed(1)}L</h3>
              <p className="text-xs text-gray-600 mt-1">Avg: ₹{(stats.avgDealSize / 1000).toFixed(0)}K</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <IndianRupee className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Monthly Target */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Monthly Target</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.targetPercentage}%</h3>
              <p className="text-xs text-gray-600 mt-1">₹{(stats.achievedTarget / 100000).toFixed(1)}L / ₹{(stats.monthlyTarget / 100000).toFixed(0)}L</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Target className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Salesmen Performance */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Award className="w-6 h-6 mr-2 text-yellow-500" />
            Top Salesmen Performance
          </h2>
          <div className="space-y-4">
            {stats.topSalesmen.map((salesman, index) => (
              <div key={index} className="border-b pb-3 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                      }`}>
                      {index + 1}
                    </span>
                    <span className="ml-3 font-semibold text-gray-800">{salesman.name}</span>
                  </div>
                  <span className="text-green-600 font-bold">₹{(salesman.revenue / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 ml-11">
                  <span>{salesman.inquiries} Inquiries</span>
                  <span>{salesman.conversions} Conversions</span>
                  <span>{((salesman.conversions / salesman.inquiries) * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sales by Platform */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-blue-500" />
            Sales by Lead Platform
          </h2>
          <div className="space-y-3">
            {stats.salesByPlatform.slice(0, 8).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">{item.platform}</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(item.count / stats.totalInquiries) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-gray-800 font-bold w-12 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Inquiries Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Clock className="w-6 h-6 mr-2 text-gray-500" />
          Recent Inquiries
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentInquiries.map((inquiry) => (
                <tr key={inquiry._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/inquiries')}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{inquiry.meta?.customerName || inquiry.companyName}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{inquiry.companyName || '-'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{inquiry.meta?.contact || '-'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{inquiry.leadPlatform || 'Other'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(inquiry.leadStatus)}`}>
                      {inquiry.leadStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${getPriorityColor(inquiry.priority)}`}>
                      {inquiry.priority?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {new Date(inquiry.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HOSDashboard;
