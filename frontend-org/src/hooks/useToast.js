import { create } from 'zustand';

let toastId = 0;

export const useToast = create((set) => ({
    toasts: [],

    addToast: (message, type = 'success', duration = 3000) => {
        const id = ++toastId;
        set((state) => ({
            toasts: [...state.toasts, { id, message, type, duration }]
        }));
        return id;
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((toast) => toast.id !== id)
        }));
    },

    // Convenience methods
    success: (message, duration) => {
        return useToast.getState().addToast(message, 'success', duration);
    },

    error: (message, duration) => {
        return useToast.getState().addToast(message, 'error', duration);
    },

    warning: (message, duration) => {
        return useToast.getState().addToast(message, 'warning', duration);
    },

    info: (message, duration) => {
        return useToast.getState().addToast(message, 'info', duration);
    },
}));

// Global toast helper (can be used anywhere, even outside React components)
export const toast = {
    success: (message, duration = 3000) => useToast.getState().success(message, duration),
    error: (message, duration = 3000) => useToast.getState().error(message, duration),
    warning: (message, duration = 3000) => useToast.getState().warning(message, duration),
    info: (message, duration = 3000) => useToast.getState().info(message, duration),
};
