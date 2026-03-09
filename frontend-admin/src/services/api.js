import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
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

// Organization APIs
export const organizationAPI = {
  getAll: (params) => api.get('/admin/organizations', { params }),
  getOne: (id) => api.get(`/admin/organizations/${id}`),
  create: (data) => api.post('/admin/organizations', data),
  update: (id, data) => api.put(`/admin/organizations/${id}`, data),
  updateFeatures: (id, data) => api.put(`/admin/organizations/${id}/features`, data),
  delete: (id) => api.delete(`/admin/organizations/${id}`),
  addAdmin: (id, data) => api.post(`/admin/organizations/${id}/admins`, data),
  updateAdmin: (id, adminId, data) => api.put(`/admin/organizations/${id}/admins/${adminId}`, data),
  removeAdmin: (id, email) => api.delete(`/admin/organizations/${id}/admins/${email}`),
};

// Feature APIs
export const featureAPI = {
  getAll: () => api.get('/admin/features'),
  create: (data) => api.post('/admin/features', data),
};

// Stats APIs
export const statsAPI = {
  getSystemStats: () => api.get('/admin/stats'),
};

// Payments APIs
export const paymentsAPI = {
  getAll: () => api.get('/admin/payments'),
  getSubscriptions: () => api.get('/admin/subscriptions'),
};

export default api;
