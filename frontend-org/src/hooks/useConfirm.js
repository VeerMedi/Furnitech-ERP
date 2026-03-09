import { create } from 'zustand';

export const useConfirm = create((set) => ({
    isOpen: false,
    config: {},

    confirm: ({ title, message, confirmText, cancelText, type = 'danger' }) => {
        return new Promise((resolve) => {
            set({
                isOpen: true,
                config: {
                    title,
                    message,
                    confirmText,
                    cancelText,
                    type,
                    onConfirm: () => {
                        resolve(true);
                        set({ isOpen: false });
                    },
                    onCancel: () => {
                        resolve(false);
                        set({ isOpen: false });
                    },
                },
            });
        });
    },

    close: () => set({ isOpen: false }),
}));

// Global confirm helper
export const confirm = async (message, title = 'Confirm Action') => {
    return useConfirm.getState().confirm({
        title,
        message,
        confirmText: 'OK',
        cancelText: 'Cancel',
        type: 'danger'
    });
};
