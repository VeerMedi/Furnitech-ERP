import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, FileText, IndianRupee, CheckCircle,
  TrendingUp, Activity, Plus, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useEditPermission } from '../../components/ProtectedAction';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CRMDashboard = () => {
  const canEditCRM = useEditPermission('crm');
  const [stats, setStats] = useState({
    kpi: {
      totalLeads: 0,
      totalConverted: 0,
      quotationsPending: 0,
      quotationsApproved: 0,
      totalAdvanceReceived: 0
    },
    pipeline: [],
    recentActivities: [],
    historicalData: {
      leads: [],
      opportunities: [],
      pending: [],
      approved: [],
      advance: []
    }
  });
  const [loading, setLoading] = useState(true);

  // Fetch real CRM data from backend
  useEffect(() => {
    fetchCRMStats();
  }, []);

  const fetchCRMStats = async () => {
    try {
      // Fetch inquiries (active & history), quotations, and customers
      const [activeInqRes, historyInqRes, quotationsRes, customersRes] = await Promise.all([
        api.get('/inquiries'),
        api.get('/inquiries?showHistory=true'),
        api.get('/quotations'),
        api.get('/customers')
      ]);

      const activeInquiries = activeInqRes.data.data || [];
      const historyInquiries = historyInqRes.data.data || [];
      const quotations = quotationsRes.data.data || [];
      const customers = customersRes.data.data || [];

      // Filter converted from history
      const convertedInquiries = historyInquiries.filter(i => i.leadStatus === 'CONVERTED');

      // Combine for pipeline view - matches CRMStage logic
      const inquiries = [...activeInquiries, ...convertedInquiries];

      // Calculate KPIs

      // Calculate KPIs
      const totalLeads = inquiries.length;
      const totalConverted = inquiries.filter(i => i.leadStatus === 'CONVERTED').length;
      const quotationsPending = quotations.filter(q => {
        const status = (q.approvalStatus || q.status || '').toUpperCase();
        return status === 'PENDING' || status === '';
      }).length;
      const quotationsApproved = quotations.filter(q => {
        const status = (q.approvalStatus || q.status || '').toUpperCase();
        return status === 'APPROVED';
      }).length;

      // Calculate advance received from customers
      const totalAdvanceReceived = customers.reduce((sum, c) => {
        const advance = c.advancePaymentAmount || 0;

        return sum + advance;
      }, 0);

      // Group inquiries by status for pipeline
      const statusCounts = {
        NEW: 0,
        CONTACTED: 0,
        QUALIFIED: 0,
        UNQUALIFIED: 0,
        CONVERTED: 0,
        LOST: 0
      };

      const statusValues = {
        NEW: 0,
        CONTACTED: 0,
        QUALIFIED: 0,
        UNQUALIFIED: 0,
        CONVERTED: 0,
        LOST: 0
      };

      inquiries.forEach(inq => {

        const status = (inq.leadStatus || 'NEW').toUpperCase();
        if (statusCounts.hasOwnProperty(status)) {
          statusCounts[status]++;

          // Find ONLY APPROVED quotation for this lead - Robust matching
          const approvedQuo = quotations.find(q => {
            // 1. Direct Inquiry Link (Check both string and object.id formats)
            const qInquiryId = q.inquiry?._id || q.inquiry;
            const matchInquiry = qInquiryId && qInquiryId === inq._id;

            // 2. Customer Link for Converted Leads
            const qCustomerId = q.customer?._id || q.customer;
            const matchCustomer = inq.isOnboarded && inq.onboardedCustomer && qCustomerId === inq.onboardedCustomer;

            return (matchInquiry || matchCustomer);
          });

          if (approvedQuo && (approvedQuo.approvalStatus === 'APPROVED')) {
            let amount = approvedQuo.totalAmount || approvedQuo.grandTotal || 0;
            // Fallback: manual calculation if totalAmount field is missing
            if (amount === 0 && approvedQuo.items?.length > 0) {
              let taxable = 0;
              let tax = 0;
              approvedQuo.items.forEach(item => {
                const sub = (item.quantity * item.unitPrice) || 0;
                taxable += sub;
                tax += (sub * (item.taxPerUnit || 18) / 100);
              });
              amount = taxable + tax - (approvedQuo.discount || 0);
            }
            statusValues[status] += amount;
          }
        } else {
          statusCounts.NEW++;
        }
      });

      const pipeline = Object.keys(statusCounts).map(status => ({
        _id: status,
        count: statusCounts[status],
        value: statusValues[status]
      }));

      // Recent activities from inquiries
      const recentActivities = inquiries
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5)
        .map(inq => ({
          _id: inq._id,
          title: `${inq.customerName} - ${inq.productName || 'Inquiry'}`,
          status: inq.status?.toUpperCase() || 'NEW',
          updatedAt: inq.updatedAt,
          createdBy: { name: inq.createdBy?.firstName || 'Unknown' }
        }));

      // Historical data already calculated above

      // Calculate historical data for graphs (last 12 months)

      let historicalData = {
        leads: [],
        opportunities: [],
        pending: [],
        approved: [],
        advance: []
      };

      try {

        const now = new Date();

        for (let i = 11; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

          // Count inquiries created in this month
          const monthInquiries = inquiries.filter(inq => {
            const created = new Date(inq.createdAt);
            return created >= monthStart && created <= monthEnd;
          }).length;

          // Count quotations by status in this month
          const monthQuotations = quotations.filter(q => {
            const created = new Date(q.createdAt);
            return created >= monthStart && created <= monthEnd;
          });

          const monthPending = monthQuotations.filter(q => {
            const status = (q.approvalStatus || q.status || '').toUpperCase();
            return status === 'PENDING' || status === '';
          }).length;

          const monthApproved = monthQuotations.filter(q => {
            const status = (q.approvalStatus || q.status || '').toUpperCase();
            return status === 'APPROVED';
          }).length;

          // Advance from customers created this month
          const monthCustomers = customers.filter(c => {
            const created = new Date(c.createdAt);
            return created >= monthStart && created <= monthEnd;
          });

          const monthAdvance = monthCustomers.reduce((sum, c) => {
            return sum + (c.advancePaymentAmount || 0);
          }, 0);

          historicalData.leads.push(monthInquiries);
          historicalData.opportunities.push(monthInquiries);
          historicalData.pending.push(monthPending);
          historicalData.approved.push(monthApproved);
          historicalData.advance.push(Math.round(monthAdvance / 1000)); // In thousands
        }

      } catch (histErr) {
        console.error('❌ Historical calculation error:', histErr);
        // Keep empty arrays as fallback
      }

      setStats({
        kpi: {
          totalLeads,
          totalConverted,
          quotationsPending,
          quotationsApproved,
          totalAdvanceReceived
        },
        pipeline,
        recentActivities,
        historicalData
      });
    } catch (error) {
      console.error('Error fetching CRM stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate random trend data for demonstration graphs
  const generateTrendData = (baseValue, variance = 5) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(() => baseValue + Math.floor(Math.random() * variance) - variance / 2);
  };

  // Helper to get trend direction and percentage
  const getTrendColorAndPercentage = (data) => {
    const lastValue = data[data.length - 1];
    const previousValue = data[data.length - 2];
    const change = lastValue - previousValue;
    const percentage = previousValue !== 0 ? ((change / previousValue) * 100).toFixed(1) : 0;

    if (change > 0) return { color: 'text-green-500', icon: ArrowUp, percentage: `+${percentage}%` };
    if (change < 0) return { color: 'text-red-500', icon: ArrowDown, percentage: `${percentage}%` };
    return { color: 'text-gray-500', icon: Minus, percentage: '0%' };
  };

  const { kpi, pipeline, recentActivities } = stats;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">CRM Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your sales pipeline and customer relationships</p>
        </div>
        <div className="flex gap-2">
          <Link to="/crm/stage">
            <Button variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" /> Pipeline
            </Button>
          </Link>
          {canEditCRM && (
            <Link to="/quotations/new">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" /> New Quotation
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards with Animated Trend Graphs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Leads */}
        <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div className="flex items-center gap-1">
              {(() => {
                const data = stats.historicalData?.leads?.length ? stats.historicalData.leads : [0, 0];
                const trend = getTrendColorAndPercentage(data);
                const TrendIcon = trend.icon;
                return (
                  <>
                    <TrendIcon className={`w-4 h-4 ${trend.color}`} />
                    <span className={`text-xs font-semibold ${trend.color}`}>{trend.percentage}</span>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="mb-2">
            <p className="text-sm text-gray-600">Total Leads</p>
            <p className="text-3xl font-bold text-gray-900">{kpi.totalLeads}</p>
          </div>
          <div className="h-16">
            <Line
              data={{
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                  data: stats.historicalData?.leads || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4,
                  fill: true,
                  pointRadius: 0,
                  pointHoverRadius: 4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: true } },
                scales: {
                  x: { display: false },
                  y: { display: false }
                },
                animation: {
                  duration: 2000,
                  easing: 'easeInOutQuart',
                  delay: (context) => context.dataIndex * 50
                }
              }}
            />
          </div>
        </div>

        {/* Open Opportunities */}
        <div className="bg-white rounded-2xl p-6 border border-orange-200 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-8 h-8 text-orange-500" />
            <div className="flex items-center gap-1">
              {(() => {
                const data = stats.historicalData?.opportunities?.length ? stats.historicalData.opportunities : [0, 0];
                const trend = getTrendColorAndPercentage(data);
                const TrendIcon = trend.icon;
                return (
                  <>
                    <TrendIcon className={`w-4 h-4 ${trend.color}`} />
                    <span className={`text-xs font-semibold ${trend.color}`}>{trend.percentage}</span>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="mb-2">
            <p className="text-sm text-gray-600">Converted</p>
            <p className="text-3xl font-bold text-gray-900">{kpi.totalConverted}</p>
          </div>
          <div className="h-16">
            <Line
              data={{
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                  data: stats.historicalData?.opportunities || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                  borderColor: 'rgb(249, 115, 22)',
                  backgroundColor: 'rgba(249, 115, 22, 0.1)',
                  tension: 0.4,
                  fill: true,
                  pointRadius: 0,
                  pointHoverRadius: 4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: true } },
                scales: {
                  x: { display: false },
                  y: { display: false }
                },
                animation: {
                  duration: 2000,
                  easing: 'easeInOutQuart',
                  delay: (context) => context.dataIndex * 50
                }
              }}
            />
          </div>
        </div>

        {/* Quotations Pending */}
        <div className="bg-white rounded-2xl p-6 border border-yellow-200 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <FileText className="w-8 h-8 text-yellow-500" />
            <div className="flex items-center gap-1">
              {(() => {
                const data = stats.historicalData?.pending?.length ? stats.historicalData.pending : [0, 0];
                const trend = getTrendColorAndPercentage(data);
                const TrendIcon = trend.icon;
                return (
                  <>
                    <TrendIcon className={`w-4 h-4 ${trend.color}`} />
                    <span className={`text-xs font-semibold ${trend.color}`}>{trend.percentage}</span>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="mb-2">
            <p className="text-sm text-gray-600">Quotations Pending</p>
            <p className="text-3xl font-bold text-gray-900">{kpi.quotationsPending}</p>
          </div>
          <div className="h-16">
            <Line
              data={{
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                  data: stats.historicalData?.leads || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                  borderColor: 'rgb(234, 179, 8)',
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  tension: 0.4,
                  fill: true,
                  pointRadius: 0,
                  pointHoverRadius: 4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: true } },
                scales: {
                  x: { display: false },
                  y: { display: false }
                },
                animation: {
                  duration: 2000,
                  easing: 'easeInOutQuart',
                  delay: (context) => context.dataIndex * 50
                }
              }}
            />
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white rounded-2xl p-6 border border-green-200 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="flex items-center gap-1">
              {(() => {
                const data = stats.historicalData?.approved?.length ? stats.historicalData.approved : [0, 0];
                const trend = getTrendColorAndPercentage(data);
                const TrendIcon = trend.icon;
                return (
                  <>
                    <TrendIcon className={`w-4 h-4 ${trend.color}`} />
                    <span className={`text-xs font-semibold ${trend.color}`}>{trend.percentage}</span>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="mb-2">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-3xl font-bold text-gray-900">{kpi.quotationsApproved}</p>
          </div>
          <div className="h-16">
            <Line
              data={{
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                  data: stats.historicalData?.leads || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                  borderColor: 'rgb(34, 197, 94)',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  tension: 0.4,
                  fill: true,
                  pointRadius: 0,
                  pointHoverRadius: 4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: true } },
                scales: {
                  x: { display: false },
                  y: { display: false }
                },
                animation: {
                  duration: 2000,
                  easing: 'easeInOutQuart',
                  delay: (context) => context.dataIndex * 50
                }
              }}
            />
          </div>
        </div>

        {/* Advance Received */}
        <div className="bg-white rounded-2xl p-6 border border-purple-200 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <IndianRupee className="w-8 h-8 text-purple-500" />
            <div className="flex items-center gap-1">
              {(() => {
                const data = stats.historicalData?.advance?.length ? stats.historicalData.advance : [0, 0];
                const trend = getTrendColorAndPercentage(data);
                const TrendIcon = trend.icon;
                return (
                  <>
                    <TrendIcon className={`w-4 h-4 ${trend.color}`} />
                    <span className={`text-xs font-semibold ${trend.color}`}>{trend.percentage}</span>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="mb-2">
            <p className="text-sm text-gray-600">Advance Received</p>
            <p className="text-3xl font-bold text-gray-900">₹{(kpi.totalAdvanceReceived / 1000).toFixed(0)}k</p>
          </div>
          <div className="h-16">
            <Line
              data={{
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                  data: stats.historicalData?.leads || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                  borderColor: 'rgb(168, 85, 247)',
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  tension: 0.4,
                  fill: true,
                  pointRadius: 0,
                  pointHoverRadius: 4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: true } },
                scales: {
                  x: { display: false },
                  y: { display: false }
                },
                animation: {
                  duration: 2000,
                  easing: 'easeInOutQuart',
                  delay: (context) => context.dataIndex * 50
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Summary with Dotted Line Graph */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-red-200 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Pipeline Overview</h3>
          <div className="h-64">
            <Line
              data={{
                labels: pipeline.map(stage => stage._id),
                datasets: [{
                  label: 'Leads Count',
                  data: pipeline.map(stage => stage.count),
                  borderColor: 'rgb(239, 68, 68)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderWidth: 2,
                  tension: 0.4,
                  fill: false,
                  pointRadius: 8,
                  pointHoverRadius: 10,
                  pointBackgroundColor: [
                    'rgb(59, 130, 246)',   // NEW - Blue
                    'rgb(234, 179, 8)',    // CONTACTED - Yellow
                    'rgb(34, 197, 94)',    // QUALIFIED - Green
                    'rgb(239, 68, 68)',    // UNQUALIFIED - Red
                    'rgb(168, 85, 247)',   // CONVERTED - Purple
                    'rgb(107, 114, 128)'   // LOST - Gray
                  ],
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        const stage = pipeline[context.dataIndex];
                        return [
                          `Leads: ${stage.count}`,
                          `Value: ₹${stage.value.toLocaleString('en-IN')}`
                        ];
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)'
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                },
                animation: {
                  duration: 2500,
                  easing: 'easeInOutCubic',
                  delay: (context) => {
                    let delay = 0;
                    if (context.type === 'data' && context.mode === 'default') {
                      delay = context.dataIndex * 200;
                    }
                    return delay;
                  }
                }
              }}
            />
          </div>
          <div className="mt-4 grid grid-cols-6 gap-2">
            {pipeline.map((stage, idx) => (
              <div key={stage._id} className="text-center">
                <div className="text-xs text-gray-600">{stage.count} leads</div>
                <div className="text-xs font-semibold text-gray-800">₹{(stage.value / 1000).toFixed(0)}k</div>
              </div>
            ))}
          </div>

        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" /> Recent Activity
          </h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity._id} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                <p className="font-medium text-sm text-gray-900">{activity.title}</p>
                <p className="text-xs text-gray-600">
                  {activity.status} • {new Date(activity.updatedAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  by {activity.createdBy?.name || 'Unknown'}
                </p>
              </div>
            ))}
            {recentActivities.length === 0 && <p className="text-gray-600">No recent activities.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;
