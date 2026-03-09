// Available Dashboard Cards Library
// Admin can choose which cards to display

export const CARD_CATEGORIES = {
    CORE: 'Core Metrics',
    SALES: 'Sales & CRM',
    PRODUCTION: 'Production',
    INVENTORY: 'Inventory & Materials',
    MACHINES: 'Machines & Equipment',
    TRANSPORT: 'Transport & Delivery',
};

export const AVAILABLE_CARDS = [
    // Core Metrics
    {
        id: 'total-customers',
        title: 'Total Customers',
        category: CARD_CATEGORIES.CORE,
        defaultSize: { w: 4, h: 2 },
        enabled: true, // Default visible
    },
    {
        id: 'active-inquiries',
        title: 'Active Inquiries',
        category: CARD_CATEGORIES.CORE,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },
    {
        id: 'pending-orders',
        title: 'Pending Orders',
        category: CARD_CATEGORIES.CORE,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },
    {
        id: 'products-overview',
        title: 'Products Overview',
        category: CARD_CATEGORIES.CORE,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },
    {
        id: 'total-orders',
        title: 'Total Orders',
        category: CARD_CATEGORIES.CORE,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },
    {
        id: 'todays-orders',
        title: "Today's Orders",
        category: CARD_CATEGORIES.CORE,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },
    {
        id: 'total-revenue',
        title: 'Total Revenue',
        category: CARD_CATEGORIES.CORE,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },
    {
        id: 'active-salesmen',
        title: 'Active Salesmen',
        category: CARD_CATEGORIES.SALES,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },
    {
        id: 'production-pending',
        title: 'Production Pending',
        category: CARD_CATEGORIES.PRODUCTION,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },

    // Sales Cards
    {
        id: 'monthly-revenue',
        title: 'Monthly Revenue',
        category: CARD_CATEGORIES.SALES,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },
    {
        id: 'todays-revenue',
        title: "Today's Revenue",
        category: CARD_CATEGORIES.SALES,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },

    // Inventory Cards
    {
        id: 'low-stock-alerts',
        title: 'Low Stock Alerts',
        category: CARD_CATEGORIES.INVENTORY,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },
    {
        id: 'raw-materials-status',
        title: 'Raw Materials Status',
        category: CARD_CATEGORIES.INVENTORY,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },

    // Machine Cards
    {
        id: 'machine-utilization',
        title: 'Machine Utilization',
        category: CARD_CATEGORIES.MACHINES,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },
    {
        id: 'maintenance-alerts',
        title: 'Maintenance Alerts',
        category: CARD_CATEGORIES.MACHINES,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },

    // Transport & Delivery Cards
    {
        id: 'pending-deliveries',
        title: 'Pending Deliveries',
        category: CARD_CATEGORIES.TRANSPORT,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },
    {
        id: 'completed-deliveries',
        title: 'Completed Deliveries',
        category: CARD_CATEGORIES.TRANSPORT,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },
    {
        id: 'in-transit',
        title: 'In Transit',
        category: CARD_CATEGORIES.TRANSPORT,
        defaultSize: { w: 4, h: 2 },
        enabled: true,
    },
];

// Get default layout
export const getDefaultLayout = () => {
    let x = 0;
    let y = 0;

    return AVAILABLE_CARDS
        .filter(card => card.enabled)
        .map((card, index) => {
            const layout = {
                i: card.id,
                x: x,
                y: y,
                w: card.defaultSize.w,
                h: card.defaultSize.h,
            };

            x += card.defaultSize.w;
            if (x >= 12) {
                x = 0;
                y += card.defaultSize.h;
            }

            return layout;
        });
};

// Save layout to localStorage
export const saveLayout = (layout, enabledCards) => {
    localStorage.setItem('adminDashboardLayout', JSON.stringify(layout));
    localStorage.setItem('adminDashboardCards', JSON.stringify(enabledCards));
};

// Load layout from localStorage
export const loadLayout = () => {
    const saved = localStorage.getItem('adminDashboardLayout');
    return saved ? JSON.parse(saved) : getDefaultLayout();
};

// Load enabled cards
export const loadEnabledCards = () => {
    const saved = localStorage.getItem('adminDashboardCards');
    if (saved) {
        return JSON.parse(saved);
    }
    return AVAILABLE_CARDS.filter(c => c.enabled).map(c => c.id);
};
