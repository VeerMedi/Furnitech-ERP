import { useEffect } from 'react';

/**
 * Auto-Hide Scrollbars Hook
 * 
 * Hides scrollbars after 1 second of scroll inactivity
 * Shows scrollbars during scroll
 */
export const useAutoHideScrollbars = () => {
    useEffect(() => {
        const scrollTimers = new Map();

        const handleScroll = (e) => {
            const target = e.target === document ? document.documentElement : e.target;

            // Skip if target doesn't have scroll or classList
            if (!target || !target.classList) return;

            // Add scrolling class to show scrollbar
            target.classList.add('scrolling');

            // Clear previous timeout for this specific element
            if (scrollTimers.has(target)) {
                clearTimeout(scrollTimers.get(target));
            }

            // Set new timeout to hide scrollbar after 1 second
            const timer = setTimeout(() => {
                target.classList.remove('scrolling');
                scrollTimers.delete(target);
            }, 1000); // 1 second delay

            scrollTimers.set(target, timer);
        };

        // Add scroll listener with capture phase to catch ALL scroll events
        window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

        // Cleanup
        return () => {
            window.removeEventListener('scroll', handleScroll, { capture: true });
            // Clear all timers
            scrollTimers.forEach(timer => clearTimeout(timer));
            scrollTimers.clear();
        };
    }, []);
};
