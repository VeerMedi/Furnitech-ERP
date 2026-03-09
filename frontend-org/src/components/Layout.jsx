import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useAuthStore } from '../stores/authStore';
import { rawMaterialAPI } from '../services/api';
import { LayoutDashboard, Users as UsersIcon, UserCircle, Armchair, FileText, IndianRupee, Package, ClipboardList, Factory, LogOut, Box, ChevronDown, ChevronRight, Warehouse, Wrench, Truck, Building2, Users, PenTool, Bot, TrendingUp, Bell } from 'lucide-react';
import FloatingAIButton from './ai_chat/FloatingAIButton';

import { getEnabledDashboards } from '../utils/featureMapping';
import { ToastContainer } from './Toast';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from './ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';

// Base menu items (without dynamic Raw Material categories)
const baseMenuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers', path: '/customers', icon: Building2 },
  {
    label: 'CRM',
    path: '/crm',
    icon: UsersIcon,
    subItems: [
      { label: 'Dashboard', path: '/crm/dashboard' },
      { label: 'Pipeline', path: '/crm/stage' },
      { label: 'Advance Payments', path: '/crm/payments' },
    ]
  },
  { label: 'Products', path: '/products', icon: Armchair },
  { label: 'Inquiries', path: '/inquiries', icon: FileText },
  { label: 'POC Assignment', path: '/poc-assignment', icon: UserCircle },
  { label: 'Salesman Dashboard', path: '/salesman-dashboard', icon: Users },
  { label: 'Quotations', path: '/quotations', icon: IndianRupee },
  { label: 'Orders', path: '/orders', icon: Package },
  // DISABLED - Drawing Approval Workflow Removed
  // { label: 'Drawing', path: '/drawings', icon: PenTool },
  { label: 'Machines', path: '/machines', icon: Wrench },
  { label: 'AI Alerts', path: '/ai-alerts', icon: Bell },
  { label: 'Customer Insights', path: '/customer-insights', icon: TrendingUp },
  {
    label: 'Production',
    path: '/production',
    icon: Factory,
    subItems: [
      { label: 'Pre-Production', path: '/production/pre-production' },
      { label: 'Post-Production', path: '/production/post-production' },
    ]
  },
  { label: 'Transport', path: '/transport', icon: Truck },
  {
    label: 'Vendors',
    path: '/vendors',
    icon: Building2,
    subItems: [
      { label: 'Vendor Details', path: '/vendors/details' },
      { label: 'Vendor Payments', path: '/vendors/payments' },
    ]
  },
  {
    label: 'Management',
    path: '/management',
    icon: Users,
    subItems: [
      { label: 'Staff', path: '/management/staff' },
      { label: 'Employee', path: '/management/employee' },
    ]
  },
  { label: 'Users / Permissions', path: '/users', icon: UserCircle },
  // Raw Material will be dynamically inserted here
  {
    label: 'Inventory Management',
    path: '/inventory-management',
    icon: Warehouse,
    subItems: [
      { label: 'Dashboard', path: '/inventory-management' },
      { label: 'Purchase', path: '/inventory/purchase' },
      { label: 'Purchase Orders', path: '/inventory/orders' },
    ]
  },
];

const Layout = () => {
  const { user, organization, logout, refreshUser } = useAuthStore();
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [menuItems, setMenuItems] = useState(baseMenuItems);

  // Check if mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Initialize state - closed on mobile, open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('isSidebarOpen');
    const isCurrentlyMobile = window.innerWidth < 1024;

    // On mobile, always start closed
    if (isCurrentlyMobile) return false;

    // On desktop, use saved preference or default to true
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Handle window resize to detect mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      // If switching to mobile, close sidebar
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save to localStorage only on desktop
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('isSidebarOpen', JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen, isMobile]);

  // 🚀 Fetch Dynamic Categories on Mount
  useEffect(() => {
    fetchDynamicCategories();
  }, []);

  const fetchDynamicCategories = async () => {
    try {
      const response = await rawMaterialAPI.getAllCategories();
      const categories = response.data.data.categories || [];

      // Convert categories to subItems format
      const categorySubItems = [
        { label: 'Dashboard', path: '/raw-material' },
        { label: 'Price Book', path: '/raw-material/price-book' },
        ...categories.map(cat => ({
          label: `${cat.category.charAt(0) + cat.category.slice(1).toLowerCase()} (${cat.count})`,
          path: `/raw-material/${cat.category.toLowerCase()}`
        }))
      ];

      setDynamicCategories(categorySubItems);

      // Insert Raw Material menu with dynamic categories
      const rawMaterialMenu = {
        label: 'Raw Material',
        path: '/raw-material',
        icon: Box,
        subItems: categorySubItems
      };

      // Insert before Inventory Management (last item)
      const updatedMenuItems = [
        ...baseMenuItems.slice(0, -1), // All except last
        rawMaterialMenu,
        baseMenuItems[baseMenuItems.length - 1] // Last item (Inventory)
      ];

      setMenuItems(updatedMenuItems);

    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to base menu if API fails
      setMenuItems(baseMenuItems);
    }
  };

  // Refresh user and organization data on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Filter menu items based on organization features AND user dashboard permissions
  const getFilteredMenuItems = () => {
    // Hardcoded bypass for main admin account (Jasleen)
    // This account always has full access regardless of permissions
    if (user?.email === 'jasleen@example.com' ||
      user?.email === 'admin@vlite.com' ||
      user?.email?.toLowerCase().includes('jasleen')) {
      return menuItems;
    }

    // System admins have access to all dashboards
    if (user?.isSystemAdmin === true) {
      return menuItems;
    }

    // Get dashboards enabled at organization level (from superadmin feature toggles)
    const orgEnabledDashboards = organization?.enabledFeatures
      ? getEnabledDashboards(organization.enabledFeatures)
      : [];

    console.log('🔍 Organization enabled dashboards:', orgEnabledDashboards);
    console.log('🔍 Organization features:', organization?.enabledFeatures);
    console.log('🔍 User dashboard permissions:', user?.dashboardPermissions);

    // If no features are enabled for the organization, no dashboards are available
    if (orgEnabledDashboards.length === 0) {
      console.warn('⚠️ No features enabled for this organization');
      return [];
    }

    // Organization admins (logged in as org admin user) get access to all enabled features
    // Check if this is an organization admin by checking the user structure
    const isOrgAdmin = !user?.dashboardPermissions && user?.organizationId;

    if (isOrgAdmin) {
      console.log('✅ Organization admin detected - showing all enabled features');
      // Filter menu items based only on organization features
      return menuItems.filter(item => {
        const dashboardKey = item.path.replace('/', '');
        const hasFeature = orgEnabledDashboards.includes(dashboardKey);

        if (item.subItems && item.subItems.length > 0) {
          const filteredSubItems = item.subItems.filter(subItem => {
            const subItemKey = subItem.path.split('/').filter(Boolean).join('-');
            return orgEnabledDashboards.includes(subItemKey) || orgEnabledDashboards.includes(dashboardKey);
          });

          if (filteredSubItems.length > 0) {
            return { ...item, subItems: filteredSubItems };
          }
        }

        return hasFeature;
      }).map(item => {
        if (item.subItems && item.subItems.length > 0) {
          const dashboardKey = item.path.replace('/', '');
          const filteredSubItems = item.subItems.filter(subItem => {
            const subItemKey = subItem.path.split('/').filter(Boolean).join('-');
            return orgEnabledDashboards.includes(subItemKey) || orgEnabledDashboards.includes(dashboardKey);
          });

          if (filteredSubItems.length > 0) {
            return { ...item, subItems: filteredSubItems };
          }
        }
        return item;
      });
    }

    // If no user dashboard permissions defined, show NO dashboards (user has no access)
    if (!user?.dashboardPermissions || user.dashboardPermissions.length === 0) {
      console.warn('⚠️ User has no dashboard permissions');
      return [];
    }

    // Get allowed dashboards at user level
    const userAllowedDashboards = user.dashboardPermissions.map(p => p.dashboard);

    // Role-based filtering for specific dashboards
    const userRole = user?.userRole;

    console.log('🔍 User allowed dashboards:', userAllowedDashboards);

    // Dashboard must be enabled at BOTH organization level AND user level
    const allowedDashboards = userAllowedDashboards.filter(dashboard =>
      orgEnabledDashboards.includes(dashboard)
    );

    console.log('✅ Final allowed dashboards:', allowedDashboards);

    // Filter menu items and their subItems
    return menuItems.filter(item => {
      const dashboardKey = item.path.replace('/', '');

      // Hide POC Assignment from Salesman
      if (userRole === 'Salesman' && dashboardKey === 'poc-assignment') {
        return false;
      }

      // Hide Salesman Dashboard from specific user
      if (user?.email === 'jasleen@vlite.com' && dashboardKey === 'salesman-dashboard') {
        console.log('🚫 Hiding Salesman Dashboard from jasleen@vlite.com');
        return false;
      }

      // Hide Salesman Dashboard from POC
      if (userRole === 'POC' && dashboardKey === 'salesman-dashboard') {
        return false;
      }

      // Hide main Dashboard from role-based users (they have their own dashboards)
      if (dashboardKey === 'dashboard') {
        // DISABLED - Drawing workflow removed, so Design roles removed
        if (userRole === 'POC' || userRole === 'Salesman') {
          return false;
        }
      }

      // Check if user has direct permission for this dashboard
      const hasDirectPermission = allowedDashboards.includes(dashboardKey);

      // Check if user has permission for any subItems
      if (item.subItems && item.subItems.length > 0) {
        const hasSubItemPermission = item.subItems.some(subItem => {
          // Extract key from subItem path
          const subItemKey = subItem.path.split('/').filter(Boolean).join('-');
          return allowedDashboards.includes(subItemKey);
        });

        // If user has permission for any subItem, filter the subItems
        if (hasSubItemPermission || hasDirectPermission) {
          // Filter subItems to only show the ones user has permission for
          const filteredSubItems = item.subItems.filter(subItem => {
            const subItemKey = subItem.path.split('/').filter(Boolean).join('-');
            return allowedDashboards.includes(subItemKey) || allowedDashboards.includes(dashboardKey);
          });

          // Return modified item with filtered subItems
          if (filteredSubItems.length > 0) {
            return { ...item, subItems: filteredSubItems };
          }
        }
      }

      return hasDirectPermission;
    }).map(item => {
      // For items with subItems, ensure we return the filtered version
      if (item.subItems && item.subItems.length > 0) {
        const dashboardKey = item.path.replace('/', '');
        const filteredSubItems = item.subItems.filter(subItem => {
          const subItemKey = subItem.path.split('/').filter(Boolean).join('-');
          return allowedDashboards.includes(subItemKey) || allowedDashboards.includes(dashboardKey);
        });

        if (filteredSubItems.length > 0) {
          return { ...item, subItems: filteredSubItems };
        }
      }
      return item;
    });
  };

  // Reorder menu items based on user role - put primary dashboard at the top
  const reorderMenuByRole = (items) => {
    const userRole = user?.userRole;
    if (!userRole || items.length === 0) return items;

    // Bypass reordering for main admin accounts - they should see default order
    if (user?.email === 'jasleen@example.com' ||
      user?.email === 'admin@vlite.com' ||
      user?.email?.toLowerCase().includes('jasleen') ||
      user?.isSystemAdmin === true) {
      return items; // Keep original order for admins
    }

    // Only reorder for specific role-based users (not general Admin role)
    const rolesRequiringReorder = ['POC', 'Salesman', 'Design', 'Design Dept Head'];
    if (!rolesRequiringReorder.includes(userRole)) {
      return items; // Don't reorder for other roles
    }

    // Define primary dashboard path for each role
    const roleDashboardMap = {
      'POC': ['/inquiries', '/poc-assignment'], // Inquiries first, POC Assignment second
      'Salesman': '/salesman-dashboard',
      // DISABLED - Drawing workflow removed
      // 'Design': '/drawings',
      // 'Design Dept Head': '/design-assignment',
    };

    const primaryDashboards = roleDashboardMap[userRole];
    if (!primaryDashboards) return items;

    // Handle POC special case with multiple dashboards to prioritize
    if (userRole === 'POC' && Array.isArray(primaryDashboards)) {
      let reorderedItems = [...items];

      // Move POC Assignment second (do this first so it ends up in correct position)
      const pocAssignmentIndex = reorderedItems.findIndex(item => item.path === '/poc-assignment');
      if (pocAssignmentIndex > -1) { // Use -1 to check if found
        const [pocAssignment] = reorderedItems.splice(pocAssignmentIndex, 1);
        reorderedItems.unshift(pocAssignment);
      }

      // Move Inquiries first (do this last so it ends up at top)
      const inquiriesIndex = reorderedItems.findIndex(item => item.path === '/inquiries');
      if (inquiriesIndex > -1) { // Use -1 to check if found
        const [inquiries] = reorderedItems.splice(inquiriesIndex, 1);
        reorderedItems.unshift(inquiries);
      }

      return reorderedItems;
    }

    // Handle other roles with single primary dashboard
    const primaryDashboardPath = primaryDashboards;
    const primaryDashboardIndex = items.findIndex(item => item.path === primaryDashboardPath);

    // If found and not already at top, move it to the top
    if (primaryDashboardIndex > 0) {
      const reorderedItems = [...items];
      const [primaryDashboard] = reorderedItems.splice(primaryDashboardIndex, 1);
      reorderedItems.unshift(primaryDashboard);
      return reorderedItems;
    }

    return items;
  };

  const filteredMenuItems = getFilteredMenuItems();
  const orderedMenuItems = reorderMenuByRole(filteredMenuItems);

  const location = useLocation();
  const { toasts, removeToast } = useToast();
  const { isOpen, config, close } = useConfirm();
  const mainContentRef = React.useRef(null);

  // Aggressive scroll to top on route change
  useEffect(() => {
    const scrollToTop = () => {
      // Scroll window
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

      // Scroll main container using ref
      if (mainContentRef.current) {
        mainContentRef.current.scrollTop = 0;
      }

      // Also try querySelector as backup
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.scrollTop = 0;
      }
    };

    // Immediate scroll
    scrollToTop();

    // Backup scrolls with delays to catch late-loading content
    const timeouts = [
      setTimeout(scrollToTop, 0),
      setTimeout(scrollToTop, 10),
      setTimeout(scrollToTop, 50),
      setTimeout(scrollToTop, 100),
    ];

    return () => timeouts.forEach(clearTimeout);
  }, [location.pathname]);

  // Auto-close removed to keep sidebar persistent on navigation
  // useEffect(() => {
  //   setIsSidebarOpen(false);
  // }, [location.pathname]);

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ConfirmDialog
        isOpen={isOpen}
        onClose={config.onCancel || close}
        onConfirm={config.onConfirm || close}
        title={config.title}
        message={config.message}
        confirmText={config.confirmText}
        cancelText={config.cancelText}
        type={config.type}
      />

      <div className="flex h-screen bg-background overflow-hidden">

        {/* Sidebar Wrapper - Handles Push/Shrink Animation */}
        <div
          className={`
            bg-card border-r border-border h-full flex-shrink-0 transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}
          `}
        >
          {/* We pass a prop or wrap Sidebar to ensure its internal width doesn't fight the container */}
          <div className="w-64 h-full">
            <Sidebar
              items={orderedMenuItems}
              onLinkClick={() => {
                // Close sidebar on mobile when link is clicked
                if (isMobile) {
                  setIsSidebarOpen(false);
                }
              }}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-10">
            <div className="flex items-center gap-4">
              {/* Hamburger Toggle Button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 -ml-2 rounded-md hover:bg-red-50 hover:text-red-700 transition-colors"
                aria-label="Toggle Menu"
              >
                <UsersIcon className="w-6 h-6 hidden" /> {/* Hidden Fallback */}
                {/* We use the Menu icon from lucide-react, assuming it's imported as 'LayoutDashboard' or we need to add it to imports */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
              </button>

              {/* Mobile/Collapsed Brand */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Organization Portal</span>
              </div>
            </div>

            <div className="flex items-center gap-4">

              <div className="text-sm text-right hidden sm:block">
                <p className="font-medium text-foreground">{user?.email}</p>
                <p className="text-muted-foreground">{user?.userRole || user?.role?.name || 'User'}</p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main ref={mainContentRef} className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6">
              <Outlet />
            </div>

            {/* Footer */}
            <Footer />
          </main>
        </div>

        {/* Floating AI Support Button */}
        <FloatingAIButton userRole="poc" />
      </div>
    </>
  );
};

export default Layout;
