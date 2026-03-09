/**
 * Logger Utility
 * Controls console logging based on environment
 * In production, only errors are shown
 */

const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  warn: (...args) => {
    console.warn(...args);
  },
  
  error: (...args) => {
    console.error(...args);
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

// Override console.log globally for cleaner console
if (!isDevelopment) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}

export default logger;
