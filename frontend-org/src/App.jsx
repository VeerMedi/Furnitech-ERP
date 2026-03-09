import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
// import CreateOrganization from './pages/CreateOrganization'; // DISABLED - Single Tenant
// import SelectOrganization from './pages/SelectOrganization'; // DISABLED - Single Tenant
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import HOSDashboard from './pages/HOSDashboard';
import Products from './pages/Products';
import Inquiries from './pages/Inquiries';
import Quotations from './pages/Quotations';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Production from './pages/Production';
import PreProductionDashboard from './pages/PreProductionDashboard';
import PostProductionDashboard from './pages/PostProductionDashboard';
import PreProductionOrderDetails from './pages/PreProductionOrderDetails';
import EditPreProductionOrder from './pages/EditPreProductionOrder';
import PostProductionOrderDetails from './pages/PostProductionOrderDetails';
import Users from './pages/Users';
import UserAccess from './pages/UserAccess';
import EditUser from './pages/EditUser';
import PermissionAccess from './pages/PermissionAccess';
import RawMaterialDashboard from './pages/rawMaterial/RawMaterialDashboard';
import PriceBookSelection from './pages/rawMaterial/PriceBookSelection';
import PriceBookDashboard from './pages/rawMaterial/PriceBookDashboard';
import PanelPage from './pages/rawMaterial/PanelPage';
import LaminatePage from './pages/rawMaterial/LaminatePage';
import HBDPage from './pages/rawMaterial/HBDPage';
import HardwarePage from './pages/rawMaterial/HardwarePage';
import GlassPage from './pages/rawMaterial/GlassPage';
import FabricPage from './pages/rawMaterial/FabricPage';
import AluminumPage from './pages/rawMaterial/AluminumPage';
import ProcessedPanelPage from './pages/rawMaterial/ProcessedPanelPage';
import HandlesPage from './pages/rawMaterial/HandlesPage';
import DynamicCategoryPage from './pages/rawMaterial/DynamicCategoryPage'; // 🚀 UNIVERSAL CATEGORY PAGE
import InventoryDashboard from './pages/inventory/InventoryDashboard';
import InventoryPurchase from './pages/inventory/InventoryPurchase';
import PurchaseDetails from './pages/inventory/PurchaseDetails';
import PurchaseOrderList from './pages/inventory/PurchaseOrderList';
import NewIndent from './pages/inventory/NewIndent';
import MachineDashboard from './pages/MachineDashboard';
import TransportDashboard from './pages/TransportDashboard';
import TransportDetails from './pages/TransportDetails';
import CreateDeliveryOrder from './pages/CreateDeliveryOrder';
import DeliveryOrderList from './pages/DeliveryOrderList';
import VendorDashboard from './pages/VendorDashboard';
import VendorDetails from './pages/VendorDetails';
import VendorPayments from './pages/VendorPayments';
import VendorProfile from './pages/VendorProfile';
import CreateVendor from './pages/CreateVendor';
import StaffManagementPage from './pages/StaffManagementPage';
import EmployeeManagementPage from './pages/EmployeeManagementPage';
import OrderDetails from './pages/OrderDetails';
import CreateOrder from './pages/CreateOrder';
import EditOrder from './pages/EditOrder';
import CRMDashboard from './pages/crm/CRMDashboard';
import CRMStage from './pages/crm/CRMStage';
import AdvancePayment from './pages/crm/AdvancePayment';
import QuotationFormPage from './pages/quotations/QuotationForm';
import QuotationListPage from './pages/quotations/QuotationList';
import QuotationViewPage from './pages/quotations/QuotationView';
// DISABLED - Drawing Approval Workflow Removed
// import DrawingDashboard from './pages/DrawingDashboard';
// import DrawingCustomerDetails from './pages/DrawingCustomerDetails';
// import AdminDrawingDashboard from './pages/AdminDrawingDashboard';
// import DesignDeptHeadDashboard from './pages/DesignDeptHeadDashboard';
// import SalesmanDrawingDashboard from './pages/SalesmanDrawingDashboard';
import POCAssignment from './pages/POCAssignment';
import SalesmanDashboard from './pages/SalesmanDashboard';
// import SmartAutomation from './components/SmartAutomation';
import CustomerInsights from './pages/CustomerInsights';
import AIAlerts from './pages/AIAlerts';
import PricingPage from './pages/PricingPage';
// import DrawingApprovalPage from './pages/DrawingApprovalPage'; // DISABLED
import Layout from './components/Layout';
import SubscriptionGuard from './components/SubscriptionGuard';
import { useAutoHideScrollbars } from './hooks/useAutoHideScrollbars';

const PrivateRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
};


// Custom scroll restoration component
const ScrollRestoration = () => {
  const location = window.location;

  React.useEffect(() => {
    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  React.useEffect(() => {
    // Force scroll to top on every route change
    window.scrollTo(0, 0);

    // Also scroll main content containers to top
    const mainContent = document.querySelector('.main-content');
    const layoutContent = document.querySelector('[role="main"]');

    if (mainContent) mainContent.scrollTop = 0;
    if (layoutContent) layoutContent.scrollTop = 0;

    // Scroll all scrollable containers to top
    document.querySelectorAll('[data-scroll-container]').forEach(container => {
      container.scrollTop = 0;
    });
  }, [location.pathname]); // Run on route change

  return null;
};

function App() {
  // Enable auto-hide scrollbars globally
  useAutoHideScrollbars();

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollRestoration />
      <Routes>
        {/* Organization routes DISABLED - Single Tenant Mode */}
        {/* <Route path="/create-organization" element={<CreateOrganization />} /> */}
        {/* <Route path="/select-organization" element={<SelectOrganization />} /> */}

        {/* Public Routes (No Authentication Required) */}
        {/* DISABLED - Drawing Approval Workflow Removed */}
        {/* <Route path="/drawings/approve/:token" element={<DrawingApprovalPage />} /> */}

        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <SubscriptionGuard>
                <Layout />
              </SubscriptionGuard>
            </PrivateRoute>
          }
        >
          <Route index element={
            <Navigate to={
              (() => {
                const storedUser = JSON.parse(localStorage.getItem('orgUser') || '{}');
                const userRole = storedUser?.userRole;
                const userEmail = storedUser?.email;

                // jasleen@vlite.com always goes to admin dashboard
                if (userEmail === 'jasleen@vlite.com') return '/dashboard';

                if (userRole === 'Salesman') return '/salesman-dashboard';
                if (userRole === 'POC') return '/poc-assignment';
                // DISABLED - Drawing workflow removed
                // if (userRole === 'Design Dept Head') return '/design-assignment';
                // if (userRole === 'Design') return '/drawings';
                return '/dashboard';
              })()
            } replace />
          } />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="hos-dashboard" element={<HOSDashboard />} />
          <Route path="crm/dashboard" element={<CRMDashboard />} />
          <Route path="crm/stage" element={<CRMStage />} />
          <Route path="crm/payments" element={<AdvancePayment />} />
          <Route path="customers" element={<Customers />} />
          <Route path="products" element={<Products />} />
          <Route path="inquiries" element={<Inquiries />} />
          <Route path="quotations" element={<QuotationListPage />} />
          <Route path="quotations/new" element={<QuotationFormPage />} />
          <Route path="quotations/:id" element={<QuotationViewPage />} />
          <Route path="quotations/:id/edit" element={<QuotationFormPage />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/create" element={<CreateOrder />} />
          <Route path="/orders/:id" element={<OrderDetails />} />
          <Route path="/orders/:id/edit" element={<EditOrder />} />
          <Route path="machines" element={<MachineDashboard />} />
          <Route path="production">
            <Route index element={<Navigate to="/production/pre-production" replace />} />
            <Route path="pre-production" element={<PreProductionDashboard />} />
            <Route path="pre-production/:id" element={<PreProductionOrderDetails />} />
            <Route path="pre-production/:id/edit" element={<EditPreProductionOrder />} />
            <Route path="post-production" element={<PostProductionDashboard />} />
            <Route path="post-production/:id" element={<PostProductionOrderDetails />} />
          </Route>
          <Route path="users" element={<UserAccess />} />
          <Route path="users/edit/:userId" element={<EditUser />} />
          <Route path="users/permissions" element={<PermissionAccess />} />
          <Route path="users/permissions/:userId" element={<PermissionAccess />} />
          <Route path="raw-material" element={<RawMaterialDashboard />} />
          <Route path="raw-material/price-book" element={<PriceBookSelection />} />
          <Route path="raw-material/price-book/:category" element={<PriceBookDashboard />} />
          <Route path="raw-material/panel" element={<PanelPage />} />
          <Route path="raw-material/laminate" element={<LaminatePage />} />
          <Route path="raw-material/hbd" element={<HBDPage />} />
          <Route path="raw-material/hardware" element={<HardwarePage />} />
          <Route path="raw-material/glass" element={<GlassPage />} />
          <Route path="raw-material/fabric" element={<FabricPage />} />
          <Route path="raw-material/aluminum" element={<AluminumPage />} />
          <Route path="raw-material/processed-panel" element={<ProcessedPanelPage />} />
          <Route path="raw-material/handles" element={<HandlesPage />} />
          {/* 🚀 CATCH-ALL for ANY dynamic category (e.g., COMPONENT, FASTENERS, etc.) */}
          <Route path="raw-material/:category" element={<DynamicCategoryPage />} />
          <Route path="inventory-management" element={<InventoryDashboard />} />
          <Route path="inventory/purchase" element={<InventoryPurchase />} />
          <Route path="inventory/purchase/new" element={<NewIndent />} />
          <Route path="inventory/purchase/:id" element={<PurchaseDetails />} />
          <Route path="inventory/orders" element={<PurchaseOrderList />} />
          <Route path="transport" element={<TransportDashboard />} />
          <Route path="transport/:id" element={<TransportDetails />} />
          <Route path="delivery-orders" element={<DeliveryOrderList />} />
          <Route path="delivery-orders/new" element={<CreateDeliveryOrder />} />
          <Route path="vendors">
            <Route index element={<Navigate to="/vendors/details" replace />} />
            <Route path="details" element={<VendorDetails />} />
            <Route path="payments" element={<VendorPayments />} />
            <Route path="new" element={<CreateVendor />} />
            <Route path=":id" element={<VendorProfile />} />
          </Route>
          <Route path="management/staff" element={<StaffManagementPage />} />
          <Route path="management/employee" element={<EmployeeManagementPage />} />
          {/* Redirect old staff-management route to new path */}
          <Route path="staff-management" element={<Navigate to="/management/staff" replace />} />
          {/* DISABLED - Drawing Dashboard Routes (Workflow Removed) */}
          {/* <Route path="drawings" element={<DrawingDashboard />} /> */}
          {/* <Route path="drawings/:customerId" element={<DrawingCustomerDetails />} /> */}
          {/* <Route path="admin-drawings" element={<AdminDrawingDashboard />} /> */}
          {/* <Route path="design-assignment" element={<DesignDeptHeadDashboard />} /> */}
          {/* <Route path="salesman-drawings" element={<SalesmanDrawingDashboard />} /> */}

          {/* POC Assignment Dashboard */}
          <Route path="poc-assignment" element={<POCAssignment />} />
          {/* Salesman Dashboard */}
          <Route path="salesman-dashboard" element={<SalesmanDashboard />} />
          {/* Smart Automation Routes */}
          {/* <Route path="smart-automation" element={<SmartAutomation />} /> */}
          {/* Customer Insights Routes */}
          <Route path="customer-insights" element={<CustomerInsights />} />
          {/* AI Alerts Routes */}
          <Route path="ai-alerts" element={<AIAlerts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
