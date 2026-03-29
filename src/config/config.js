// Debug: Log environment variables
// console.log('Environment variables:', {
//     API_KEY: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY,
//     SHEET_ID: import.meta.env.VITE_GOOGLE_SHEETS_ID,
//     CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
//     ALL_ENV: import.meta.env
// });

const CONFIG = {
    GOOGLE_SHEETS_API_KEY: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY,
    GOOGLE_SHEETS_ID: import.meta.env.VITE_GOOGLE_SHEETS_ID,
    GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
    
    // Sheet names and ranges
    SHEETS: {
        USERS: 'Users!A1:I',  // Changed from A1:H to A1:I to include Equipment column
        WEIGHT_HISTORY: 'WeightHistory!A1:E',
        EQUIPMENT: 'Equipment!A1:D',
        EXERCISES: 'Exercises!A1:F',
        WORKOUT_PLANS: 'WorkoutPlans!A1:F',
        PLAN_EXERCISES: 'PlanExercises!A1:G',
        WORKOUT_SESSIONS: 'WorkoutSessions!A1:H',
        WORKOUT_LOGS: 'WorkoutLogs!A1:J',
        AI_RECOMMENDATIONS: 'AIRecommendations!A1:H',
    },
    
    // App settings
    RECOMMENDATIONS_COUNT: 3,
    DEFAULT_REST_SECONDS: 90,
    
    // Progressive overload settings
    WEIGHT_INCREMENT_PERCENTAGE: 5, // 5% increase
    MIN_WEIGHT_INCREMENT: 2.5, // Minimum 2.5kg increase
    
    // RPE (Rate of Perceived Exertion) scale 1-10
    RPE_THRESHOLD_FOR_INCREASE: 7, // Increase weight if RPE < 7
};

// Validate configuration
if (!CONFIG.GOOGLE_SHEETS_API_KEY || CONFIG.GOOGLE_SHEETS_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ Google Sheets API Key is not configured!');
}

if (!CONFIG.GOOGLE_SHEETS_ID || CONFIG.GOOGLE_SHEETS_ID === 'YOUR_SHEET_ID_HERE') {
    console.error('❌ Google Sheets ID is not configured!');
}

if (!CONFIG.GEMINI_API_KEY) {
    console.warn('⚠️ Gemini API Key is not configured. AI features will be disabled.');
}

console.log('CONFIG loaded:', CONFIG);

export default CONFIG;