import { create } from 'zustand';
import { authAPI } from '../services/api';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('orgUser') || 'null'),
  token: localStorage.getItem('orgToken'),
  tenantId: localStorage.getItem('tenantId'),
  organization: JSON.parse(localStorage.getItem('organization') || 'null'),
  isAuthenticated: !!localStorage.getItem('orgToken'),
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      // For org portal, we need to get organization ID first or pass it
      // For now, we'll get it from the server response after a basic login attempt
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;

      localStorage.setItem('orgToken', token);
      localStorage.setItem('orgUser', JSON.stringify(user));

      if (user.organizationId) {
        localStorage.setItem('tenantId', user.organizationId);
      }

      set({
        user,
        token,
        tenantId: user.organizationId,
        isAuthenticated: true,
        isLoading: false,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('orgToken');
      localStorage.removeItem('orgUser');
      localStorage.removeItem('tenantId');
      localStorage.removeItem('organization');

      // Clear session storage to reset welcome toast flag
      sessionStorage.clear();

      set({
        user: null,
        token: null,
        tenantId: null,
        organization: null,
        isAuthenticated: false,
      });
    }
  },

  refreshUser: async () => {
    try {
      const token = localStorage.getItem('orgToken');
      if (!token) return;

      // Fetch current user data from backend
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': localStorage.getItem('tenantId'),
        },
      });

      if (response.ok) {
        const data = await response.json();
        const updatedUser = data.data || data.user;
        const organization = data.organization;

        // Update localStorage and state
        localStorage.setItem('orgUser', JSON.stringify(updatedUser));
        if (organization) {
          localStorage.setItem('organization', JSON.stringify(organization));
        }
        set({
          user: updatedUser,
          organization: organization
        });

        console.log('User data refreshed:', updatedUser);
        console.log('Organization data:', organization);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
