import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger' // 'danger', 'warning', 'info'
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: 'from-red-600 to-rose-700',
            button: 'bg-red-600 hover:bg-red-700',
            icon: 'text-red-600',
        },
        warning: {
            bg: 'from-amber-500 to-orange-600',
            button: 'bg-amber-600 hover:bg-amber-700',
            icon: 'text-amber-600',
        },
        info: {
            bg: 'from-blue-500 to-indigo-600',
            button: 'bg-blue-600 hover:bg-blue-700',
            icon: 'text-blue-600',
        },
    };

    const config = colors[type] || colors.danger;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{
                        scale: 1,
                        opacity: 1,
                        y: 0,
                        transition: {
                            type: "spring",
                            stiffness: 300,
                            damping: 25
                        }
                    }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                >
                    {/* Header with gradient */}
                    <div className={`bg-gradient-to-r ${config.bg} p-6 text-white`}>
                        <div className="flex items-center gap-4">
                            <motion.div
                                initial={{ rotate: -180, scale: 0 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ delay: 0.1, type: "spring" }}
                                className="bg-white/20 p-3 rounded-full"
                            >
                                <AlertTriangle className="w-6 h-6" />
                            </motion.div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold">{title}</h3>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="text-white/80 hover:text-white transition-colors p-1"
                            >
                                <X className="w-5 h-5" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <p className="text-gray-700 leading-relaxed text-base">
                            {message}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-200">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onClose}
                            className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                        >
                            {cancelText}
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-5 py-2.5 ${config.button} text-white rounded-lg transition-colors font-medium shadow-lg`}
                        >
                            {confirmText}
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ConfirmDialog;
