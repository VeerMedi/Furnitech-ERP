import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    const icons = {
        success: <CheckCircle className="w-6 h-6" />,
        error: <XCircle className="w-6 h-6" />,
        warning: <AlertCircle className="w-6 h-6" />,
        info: <Info className="w-6 h-6" />,
    };

    const styles = {
        success: {
            bg: 'bg-gradient-to-r from-green-500 to-emerald-600',
            text: 'text-white',
            icon: 'text-white',
        },
        error: {
            bg: 'bg-gradient-to-r from-red-600 to-rose-700',
            text: 'text-white',
            icon: 'text-white',
        },
        warning: {
            bg: 'bg-gradient-to-r from-amber-500 to-orange-600',
            text: 'text-white',
            icon: 'text-white',
        },
        info: {
            bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
            text: 'text-white',
            icon: 'text-white',
        },
    };

    React.useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const config = styles[type] || styles.info;

    return (
        <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 25
                }
            }}
            exit={{
                opacity: 0,
                y: -50,
                scale: 0.9,
                transition: { duration: 0.2 }
            }}
            className={`
        ${config.bg} ${config.text} 
        rounded-2xl shadow-2xl px-6 py-4 
        flex items-center gap-4 
        backdrop-blur-xl
        border border-white/20
        max-w-md w-full
        mx-4
      `}
        >
            <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className={config.icon}
            >
                {icons[type]}
            </motion.div>

            <p className="flex-1 font-medium text-sm leading-relaxed">
                {message}
            </p>

            <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
            >
                <X className="w-5 h-5" />
            </motion.button>
        </motion.div>
    );
};

// Toast Container Component
export const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-6 left-0 right-0 z-[9999] flex flex-col items-center gap-3 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast
                            message={toast.message}
                            type={toast.type}
                            onClose={() => removeToast(toast.id)}
                            duration={toast.duration}
                        />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default Toast;
