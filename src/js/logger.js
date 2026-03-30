// Simple logging utility to control console output
const isDev = import.meta.env.MODE === 'development' || true; // Enable in dev by default

export const logger = {
    /**
     * Debug level - only logs in development
     */
    debug: (msg, data) => {
        if (isDev) {
            console.debug(`[DEBUG] ${msg}`, data || '');
        }
    },

    /**
     * Info level - always logs
     */
    info: (msg, data) => {
        console.log(`[INFO] ${msg}`, data || '');
    },

    /**
     * Warning level
     */
    warn: (msg, data) => {
        console.warn(`[WARN] ${msg}`, data || '');
    },

    /**
     * Error level - always logs
     */
    error: (msg, err) => {
        console.error(`[ERROR] ${msg}`, err || '');
    },

    /**
     * Success level - for user-facing successes
     */
    success: (msg, data) => {
        console.log(`[✓] ${msg}`, data || '');
    },
};

export default logger;
