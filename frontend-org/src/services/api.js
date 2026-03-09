import axios from 'axios';

// Use relative URLs in development to go through Vite proxy
// In production, this will use the same domain as the frontend
const API_URL = import.meta.env.VITE_API_URL || '/api';

console.log('[api] baseURL =', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token and tenant ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('orgToken');
    let tenantId = localStorage.getItem('tenantId');

    // Fallback: Try to get tenantId from user object if not in localStorage
    if (!tenantId) {
      const userStr = localStorage.getItem('orgUser');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          tenantId = user.organizationId;
          // Store it for future use
          if (tenantId) {
            localStorage.setItem('tenantId', tenantId);
            console.warn('⚠️ TenantId was missing from localStorage, retrieved from user object:', tenantId);
          }
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
        }
      }
    }

    console.log('API Request:', config.url);
    console.log('  - TenantId:', tenantId);
    console.log('  - Token exists:', !!token);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (tenantId) {
      config.headers['x-tenant-id'] = tenantId;
    } else {
      console.error('❌ CRITICAL: No tenantId available for API request! Please re-login.');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('orgToken');
      localStorage.removeItem('orgUser');
      localStorage.removeItem('tenantId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Customer APIs
export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getOne: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  updateAdvancePayment: (id, data) => api.put(`/customers/${id}/advance-payment`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Product APIs
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  // Import methods
  importProducts: (formData) => api.post('/products/import', formData, {
    headers: {
      'Content-Type': undefined // Let axios set multipart/form-data with boundary automatically
    }
  }),
  getLastImport: () => api.get('/products/last-import'),
  undoLastImport: () => api.delete('/products/undo-last-import'),
  downloadTemplate: (category) => api.get('/products/download-template', {
    params: category ? { category } : {},
    responseType: 'blob'
  }),
  exportSelectedProducts: (productIds) => api.post('/products/export-template', { productIds }, { responseType: 'blob' }),
};

// Inquiry APIs
export const inquiryAPI = {
  getAll: (params) => api.get('/inquiries', { params }),
  getOne: (id) => api.get(`/inquiries/${id}`),
  create: (data) => api.post('/inquiries', data),
  update: (id, data) => api.put(`/inquiries/${id}`, data),
  delete: (id) => api.delete(`/inquiries/${id}`),
  onboard: (id) => api.post(`/inquiries/${id}/onboard`),
  unonboard: (id) => api.post(`/inquiries/${id}/unonboard`),
  uploadLayoutPlan: (id, formData) => api.post(`/inquiries/${id}/upload-layout-plan`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  sendReminders: (data) => api.post('/inquiries/reminders/send', data), // data: { daysThreshold, timeUnit }
  getReminderSettings: () => api.get('/inquiries/reminders/settings'),
  saveReminderSettings: (data) => api.post('/inquiries/reminders/settings', data),
  disableReminderSettings: () => api.delete('/inquiries/reminders/settings'),
};

// Quotation APIs
export const quotationAPI = {
  getAll: (params) => api.get('/quotations', { params }),
  getOne: (id) => api.get(`/quotations/${id}`),
  create: (data) => api.post('/quotations', data),
  update: (id, data) => api.put(`/quotations/${id}`, data),
  approve: (id) => api.patch(`/quotations/${id}/approve`),
  reject: (id, data) => api.patch(`/quotations/${id}/reject`, data),
  sendEmail: (id) => api.post(`/quotations/${id}/send`),
  getPDF: (id) => api.get(`/quotations/${id}/pdf`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/quotations/${id}`),
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentActivities: () => api.get('/dashboard/activities'),
  getCardHistory: (cardType) => api.get(`/dashboard/card-history/${cardType}`),
};

// Inventory APIs
export const inventoryAPI = {
  getDashboardStats: () => api.get('/inventory/dashboard/stats'),
  getAllInventory: (params) => api.get('/inventory/items', { params }),
  getPurchaseList: (params) => api.get('/inventory/purchase/list', { params }),
  getPurchaseDetails: (id) => api.get(`/inventory/purchase/${id}`),
  getPurchaseOrders: (params) => api.get('/inventory/purchase-orders', { params }),
  createPurchaseIndent: (data) => api.post('/inventory/purchase/indent', data),
  getItemPurchaseHistory: (itemName) => api.get(`/inventory/item-history/${itemName}`),
};

// Transport APIs
export const transportAPI = {
  getAll: (params) => api.get('/transports', { params }),
  getOne: (id) => api.get(`/transports/${id}`),
  create: (data) => api.post('/transports', data),
  update: (id, data) => api.put(`/transports/${id}`, data),
  delete: (id) => api.delete(`/transports/${id}`),
};

// Vendor APIs
export const vendorAPI = {
  getAll: (params) => api.get('/vendors', { params }),
  getOne: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
  addPurchase: (id, data) => api.post(`/vendors/${id}/purchase`, data),
  updatePayment: (id, data) => api.post(`/vendors/${id}/payment`, data),
  updatePurchaseHistory: (vendorId, purchaseId, data) => api.put(`/vendors/${vendorId}/purchase/${purchaseId}`, data),
};

// Staff APIs
export const staffAPI = {
  getAll: (params) => api.get('/staff', { params }),
  getOne: (id) => api.get(`/staff/${id}`),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
};

// Order APIs
export const orderAPI = {
  getStats: () => api.get('/orders/stats'),
  getAll: (params) => api.get('/orders', { params }),
  getOne: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  updateStatus: (id, data) => api.patch(`/orders/${id}/status`, data),
  addPayment: (id, data) => api.post(`/orders/${id}/payment`, data),
  delete: (id) => api.delete(`/orders/${id}`),
  generateInvoice: (id, invoiceData) => api.post(`/orders/${id}/invoice/generate`, { invoiceData }),
  downloadInvoice: (id) => api.get(`/orders/${id}/invoice/download`, {
    responseType: 'blob', // Important for file download
  }),
};

export const drawingAPI = {
  getAll: () => api.get('/drawings'),
  getForSPOC: (spocId) => api.get(`/drawings/spoc/${spocId}`),
  upload: (formData) => api.post('/drawings/upload-to-spoc', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Drawing Dashboard endpoints
  getCustomersFromOrders: () => api.get('/drawings/customers-from-orders'),
  getOrderDetailsForCustomer: (customerId) => api.get(`/drawings/customer/${customerId}/orders`),
  uploadFiles: (formData) => api.post('/drawings/upload-files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getForSalesman: (salesmanName) => api.get(`/drawings/salesman/${encodeURIComponent(salesmanName)}`),
  getDesignTeam: () => api.get('/drawings/design-team'),
  assignDesigner: (data) => api.post('/drawings/assign-designer', data),
  getSalesmanDashboard: () => api.get('/drawings/salesman-dashboard'),
  approve: (id) => api.put(`/drawings/${id}/approve`),
  reject: (id, reason) => api.put(`/drawings/${id}/reject`, { reason }),
  markCustomerComplete: (customerId) => api.put(`/drawings/customer/${customerId}/mark-complete`),
  undoCustomerComplete: (customerId) => api.put(`/drawings/customer/${customerId}/undo-complete`),

  // Client approval workflow
  sendApprovalEmail: (drawingId) => api.post(`/drawings/${drawingId}/send-approval-email`),
};

// Raw Material APIs
export const rawMaterialAPI = {
  getAll: (params) => api.get('/rawmaterial', { params }),
  getSpecificationFields: () => api.get('/rawmaterial/metadata/specification-fields'),
  getSpecificationStats: () => api.get('/rawmaterial/metadata/specification-stats'),
  getAllCategories: () => api.get('/rawmaterial/metadata/categories'), // 🚀 DYNAMIC CATEGORIES
  getLastImport: () => api.get('/rawmaterial/import/last'),            // 🔍 GET last import
  undoLastImport: () => api.delete('/rawmaterial/import/last'),        // 🗑️ UNDO last import
};

// User APIs
export const userAPI = {
  getProductionWorkers: (process, productType) => api.get('/users/production-workers', { params: { process, productType } }),
};

export default api;
