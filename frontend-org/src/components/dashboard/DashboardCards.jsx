import React from 'react';
import { Users, FileText, Package, ShoppingCart, TrendingUp, TrendingDown, Minus, IndianRupee, Armchair, UserCheck, Factory, AlertTriangle, Wrench, Truck } from 'lucide-react';

// Reusable Card Wrapper
export const DashboardCard = ({ children, className = '' }) => {
    return (
        <div className={`bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow ${className}`}>
            {children}
        </div>
    );
};

// Card Components for each metric
export const TotalCustomersCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                    <Users className="w-6 h-6 text-blue-500" />
                </div>
                {stats?.customerGrowth && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${stats.customerGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {stats.customerGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {Math.abs(stats.customerGrowth)}%
                    </div>
                )}
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Customers</h3>
            <p className="text-3xl font-bold text-foreground">{stats?.totalCustomers || 0}</p>
            {stats?.customerGrowthText && (
                <p className="text-xs text-muted-foreground mt-2">{stats.customerGrowthText}</p>
            )}
        </div>
    </DashboardCard>
);

export const ActiveInquiriesCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-500/10 rounded-xl">
                    <FileText className="w-6 h-6 text-yellow-600" />
                </div>
                {stats?.inquiryGrowth && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${stats.inquiryGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {stats.inquiryGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {Math.abs(stats.inquiryGrowth)}%
                    </div>
                )}
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Active Inquiries</h3>
            <p className="text-3xl font-bold text-foreground">{stats?.activeInquiries || 0}</p>
            <p className="text-xs text-muted-foreground mt-2">
                {stats?.inquiryGrowthText || 'from last month'}
            </p>
        </div>
    </DashboardCard>
);

export const PendingOrdersCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-500/10 rounded-xl">
                    <Package className="w-6 h-6 text-red-600" />
                </div>
                {stats?.orderGrowth && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${stats.orderGrowth <= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {stats.orderGrowth <= 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                        {Math.abs(stats.orderGrowth)}%
                    </div>
                )}
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Pending Orders</h3>
            <p className="text-3xl font-bold text-foreground">{stats?.pendingOrders || 0}</p>
            <p className="text-xs text-muted-foreground mt-2">
                {stats?.orderGrowthText || 'from last month'}
            </p>
        </div>
    </DashboardCard>
);

export const ProductsOverviewCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                    <Armchair className="w-6 h-6 text-purple-600" />
                </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Products Overview</h3>
            <p className="text-3xl font-bold text-foreground">{stats?.totalProducts || 0}</p>
            <p className="text-xs text-muted-foreground mt-2">All products available</p>
        </div>
    </DashboardCard>
);

export const TotalOrdersCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-500/10 rounded-xl">
                    <ShoppingCart className="w-6 h-6 text-indigo-600" />
                </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Orders</h3>
            <p className="text-3xl font-bold text-foreground">{stats?.totalOrders || 0}</p>
            <p className="text-xs text-muted-foreground mt-2">{stats?.totalOrdersText || 'All time'}</p>
        </div>
    </DashboardCard>
);

export const TodaysOrdersCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/10 rounded-xl">
                    <Package className="w-6 h-6 text-green-600" />
                </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Today's Orders</h3>
            <p className="text-3xl font-bold text-foreground">{stats?.todaysOrders || 0}</p>
            <p className="text-xs text-muted-foreground mt-2">New orders today</p>
        </div>
    </DashboardCard>
);

export const TotalRevenueCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                    <IndianRupee className="w-6 h-6 text-emerald-600" />
                </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</h3>
            <p className="text-3xl font-bold text-foreground">
                ₹{(stats?.totalRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
                ₹{(stats?.monthlyRevenue || 0).toLocaleString('en-IN')} this month
            </p>
        </div>
    </DashboardCard>
);

export const ActiveSalesmenCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-cyan-500/10 rounded-xl">
                    <UserCheck className="w-6 h-6 text-cyan-600" />
                </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Active Salesmen</h3>
            <p className="text-3xl font-bold text-foreground">{stats?.activeSalesmen || 0}</p>
            <p className="text-xs text-muted-foreground mt-2">Sales team members</p>
        </div>
    </DashboardCard>
);

export const ProductionPendingCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                    <Factory className="w-6 h-6 text-orange-600" />
                </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Production Pending</h3>
            <p className="text-3xl font-bold text-foreground">{stats?.productionPending || 0}</p>
            <p className="text-xs text-muted-foreground mt-2">Orders in workflow</p>
        </div>
    </DashboardCard>
);

// Additional Cards
export const MonthlyRevenueCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-teal-500/10 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-teal-600" />
                </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Monthly Revenue</h3>
            <p className="text-3xl font-bold text-foreground">
                ₹{(stats?.monthlyRevenue || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Current month</p>
        </div>
    </DashboardCard>
);

export const TodaysRevenueCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-lime-500/10 rounded-xl">
                    <IndianRupee className="w-6 h-6 text-lime-600" />
                </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Today's Revenue</h3>
            <p className="text-3xl font-bold text-foreground">
                ₹{(stats?.todaysRevenue || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Earnings today</p>
        </div>
    </DashboardCard>
);

export const LowStockAlertsCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-500/10 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Low Stock Alerts</h3>
            <p className="text-3xl font-bold text-foreground">{stats?.lowStock || 0}</p>
            <p className="text-xs text-red-600 mt-2 font-medium">
                {stats?.lowStock > 0 ? 'Attention required' : 'All good'}
            </p>
        </div>
    </DashboardCard>
);

export const RawMaterialsStatusCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-500/10 rounded-xl">
                    <Package className="w-6 h-6 text-amber-600" />
                </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Raw Materials</h3>
            <p className="text-3xl font-bold text-foreground">{stats?.rawMaterialsCount || 0}</p>
            <p className="text-xs text-muted-foreground mt-2">Materials in inventory</p>
        </div>
    </DashboardCard>
);

export const MachineUtilizationCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-violet-500/10 rounded-xl">
                    <Wrench className="w-6 h-6 text-violet-600" />
                </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Machine Utilization</h3>
            <p className="text-3xl font-bold text-foreground">{stats?.machineUtilization || 0}%</p>
            <p className="text-xs text-muted-foreground mt-2">Average utilization</p>
        </div>
    </DashboardCard>
);

export const MaintenanceAlertsCard = ({ stats }) => (
    <DashboardCard>
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-rose-500/10 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Maintenance Due</h3>
            <p className="text-3xl font-bold text-foreground">{stats?.maintenanceDue || 0}</p>
            <p className="text-xs text-muted-foreground mt-2">Machines need servicing</p>
        </div>
    </DashboardCard>
);

// Card Renderer - maps card ID to component
export const renderCard = (cardId, stats) => {
    const cardMap = {
        'total-customers': <TotalCustomersCard stats={stats} />,
        'active-inquiries': <ActiveInquiriesCard stats={stats} />,
        'pending-orders': <PendingOrdersCard stats={stats} />,
        'products-overview': <ProductsOverviewCard stats={stats} />,
        'total-orders': <TotalOrdersCard stats={stats} />,
        'todays-orders': <TodaysOrdersCard stats={stats} />,
        'total-revenue': <TotalRevenueCard stats={stats} />,
        'active-salesmen': <ActiveSalesmenCard stats={stats} />,
        'production-pending': <ProductionPendingCard stats={stats} />,
        'monthly-revenue': <MonthlyRevenueCard stats={stats} />,
        'todays-revenue': <TodaysRevenueCard stats={stats} />,
        'low-stock-alerts': <LowStockAlertsCard stats={stats} />,
        'raw-materials-status': <RawMaterialsStatusCard stats={stats} />,
        'machine-utilization': <MachineUtilizationCard stats={stats} />,
        'maintenance-alerts': <MaintenanceAlertsCard stats={stats} />,
    };

    return cardMap[cardId] || null;
};
