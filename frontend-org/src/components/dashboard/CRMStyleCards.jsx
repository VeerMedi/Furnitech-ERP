// Dashboard Card Components - CRM Style
// Import this file after reviewing and use these components
// Total Customers Card - CRM Style
const TotalCustomersCard = ({ stats, customerTrend, customerTrendData, enabled }) => {
    if (!enabled) return null;

    return (
        <DraggableCardWrapper
            cardId="total-customers"
            cardTitle="Total Customers"
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                    <Users className="w-8 h-8 text-blue-500" />
                    <div className="flex items-center gap-1">
                        {customerTrend.trend === 'up' && <TrendingUp className={`w-4 h-4 ${customerTrend.textColor}`} />}
                        {customerTrend.trend === 'down' && <TrendingDown className={`w-4 h-4 ${customerTrend.textColor}`} />}
                        {customerTrend.trend === 'stable' && <Minus className={`w-4 h-4 ${customerTrend.textColor}`} />}
                        <span className={`text-xs font-semibold ${customerTrend.textColor}`}>
                            {customerTrend.trend === 'down' ? '-' : '+'}{customerTrend.percentage}%
                        </span>
                    </div>
                </div>
                <div className="mb-2">
                    <p className="text-sm text-gray-600">Total Customers</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.customers || 0}</p>
                </div>
                <div className="h-16">
                    <Line data={customerTrendData} options={{
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
                    }} />
                </div>
            </div>
        </DraggableCardWrapper>
    );
};

// Active Inquiries Card - CRM Style
const ActiveInquiriesCard = ({ stats, inquiryTrend, inquiryTrendData, enabled }) => {
    if (!enabled) return null;

    return (
        <DraggableCardWrapper
            cardId="active-inquiries"
            cardTitle="Active Inquiries"
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="bg-white rounded-2xl p-6 border border-green-200 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                    <FileText className="w-8 h-8 text-green-500" />
                    <div className="flex items-center gap-1">
                        {inquiryTrend.trend === 'up' && <TrendingUp className={`w-4 h-4 ${inquiryTrend.textColor}`} />}
                        {inquiryTrend.trend === 'down' && <TrendingDown className={`w-4 h-4 ${inquiryTrend.textColor}`} />}
                        {inquiryTrend.trend === 'stable' && <Minus className={`w-4 h-4 ${inquiryTrend.textColor}`} />}
                        <span className={`text-xs font-semibold ${inquiryTrend.textColor}`}>
                            {inquiryTrend.trend === 'down' ? '-' : '+'}{inquiryTrend.percentage}%
                        </span>
                    </div>
                </div>
                <div className="mb-2">
                    <p className="text-sm text-gray-600">Active Inquiries</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.inquiries || 0}</p>
                </div>
                <div className="h-16">
                    <Line data={inquiryTrendData} options={{
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
                    }} />
                </div>
            </div>
        </DraggableCardWrapper>
    );
};

// Pending Orders Card - CRM Style  
const PendingOrdersCard = ({ stats, orderTrend, orderTrendData, enabled }) => {
    if (!enabled) return null;

    return (
        <DraggableCardWrapper
            cardId="pending-orders"
            cardTitle="Pending Orders"
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                    <Package className="w-8 h-8 text-red-500" />
                    <div className="flex items-center gap-1">
                        {orderTrend.trend === 'up' && <TrendingUp className={`w-4 h-4 ${orderTrend.textColor}`} />}
                        {orderTrend.trend === 'down' && <TrendingDown className={`w-4 h-4 ${orderTrend.textColor}`} />}
                        {orderTrend.trend === 'stable' && <Minus className={`w-4 h-4 ${orderTrend.textColor}`} />}
                        <span className={`text-xs font-semibold ${orderTrend.textColor}`}>
                            {orderTrend.trend === 'down' ? '-' : '+'}{orderTrend.percentage}%
                        </span>
                    </div>
                </div>
                <div className="mb-2">
                    <p className="text-sm text-gray-600">Pending Orders</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.orders || 0}</p>
                </div>
                <div className="h-16">
                    <Line data={orderTrendData} options={{
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
                    }} />
                </div>
            </div>
        </DraggableCardWrapper>
    );
};

export { TotalCustomersCard, ActiveInquiriesCard, PendingOrdersCard };
