import CONFIG from '../config/config.js';
import { isAuthorized, requestAuthorization, getAccessToken } from './auth.js';

let gapiLoaded = false;

// Load the Google API client library
export function loadGapi() {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            gapi.load('client', async () => {
                await gapi.client.init({
                    apiKey: CONFIG.GOOGLE_SHEETS_API_KEY,
                    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
                });
                
                // Set token if user is already authorized
                const token = getAccessToken();
                if (token) {
                    gapi.client.setToken({ access_token: token });
                }
                
                gapiLoaded = true;
                resolve();
            });
        };
        document.head.appendChild(script);
    });
}

// Initialize Google Sheets API
export async function initializeGoogleSheets() {
    await loadGapi();
    console.log('Google Sheets API ready');
}

// Ensure user is authorized for write operations
async function ensureAuthorized() {
    if (!isAuthorized()) {
        const authorized = await requestAuthorization();
        if (!authorized) {
            throw new Error('User authorization required');
        }
    } else {
        // Make sure token is set in gapi client
        const token = getAccessToken();
        if (token) {
            gapi.client.setToken({ access_token: token });
        }
    }
}

// ==================== GENERIC READ/WRITE FUNCTIONS ====================

// Read data from any sheet (no auth required)
export async function readSheet(sheetRange) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: CONFIG.GOOGLE_SHEETS_ID,
            range: sheetRange,
        });
        return response.result.values || [];
    } catch (error) {
        console.error(`Error reading ${sheetRange}:`, error);
        return [];
    }
}

// Append data to any sheet (requires auth)
export async function appendToSheet(sheetRange, values) {
    try {
        await ensureAuthorized();
        
        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: CONFIG.GOOGLE_SHEETS_ID,
            range: sheetRange,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values],
            },
        });
        return response.result;
    } catch (error) {
        console.error(`Error appending to ${sheetRange}:`, error);
        throw error;
    }
}

// Update specific row (requires auth)
export async function updateRow(sheetRange, values) {
    try {
        await ensureAuthorized();
        
        const response = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: CONFIG.GOOGLE_SHEETS_ID,
            range: sheetRange,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values],
            },
        });
        return response.result;
    } catch (error) {
        console.error(`Error updating ${sheetRange}:`, error);
        throw error;
    }
}

// ==================== USER FUNCTIONS ====================

// Get all users
export async function getUsers() {
    const data = await readSheet(CONFIG.SHEETS.USERS);
    if (data.length <= 1) return []; // Only header or empty
    
    return data.slice(1).map(row => ({
        userId: row[0],
        username: row[1],
        email: row[2],
        height: row[3] ? parseFloat(row[3]) : null,
        weight: row[4] ? parseFloat(row[4]) : null,
        gender: row[5] || null,
        dateJoined: row[6],
        lastActive: row[7],
        equipment: row[8] || '', // Equipment column
    }));
}

// Get user by ID
export async function getUserById(userId) {
    const users = await getUsers();
    const user = users.find(u => u.userId === userId);
    console.log('getUserById result:', user);
    return user;
}

// Add new user
export async function addUser(username, email, height = null, weight = null, gender = null) {
    const userId = 'U' + Date.now().toString().slice(-6);
    const dateJoined = new Date().toISOString().split('T')[0];
    
    await appendToSheet(CONFIG.SHEETS.USERS, [
        userId,
        username,
        email,
        height || '',
        weight || '',
        gender || '',
        dateJoined,
        dateJoined,
        '', // equipment
    ]);
    
    return userId;
}

// Update user profile
export async function updateUserProfile(userId, updates) {
    // Validate and sanitize user updates
    const sanitized = validateUserUpdates(updates);
    
    const users = await readSheet(CONFIG.SHEETS.USERS);
    const rowIndex = users.findIndex(row => row[0] === userId);
    
    if (rowIndex === -1) throw new Error('User not found');
    
    const user = users[rowIndex];
    const updatedUser = [
        user[0], // UserID
        sanitized.username !== undefined ? sanitized.username : (user[1] || ''),
        sanitized.email !== undefined ? sanitized.email : (user[2] || ''),
        sanitized.height !== undefined ? sanitized.height : (user[3] || ''),
        sanitized.weight !== undefined ? sanitized.weight : (user[4] || ''),
        sanitized.gender !== undefined ? sanitized.gender : (user[5] || ''),
        user[6] || '', // DateJoined
        new Date().toISOString().split('T')[0], // LastActive
        sanitized.equipment !== undefined ? sanitized.equipment : (user[8] || ''), // Equipment
    ];
    
    console.log('Updating user profile for userId:', userId);
    await updateRow(`Users!A${rowIndex + 1}:I${rowIndex + 1}`, updatedUser);
}

/**
 * Validate and sanitize user profile updates
 * @param {Object} updates - Raw user update object
 * @returns {Object} Sanitized updates safe for database
 */
function validateUserUpdates(updates) {
    const sanitized = {};
    
    // Validate username
    if (updates.username !== undefined) {
        const username = String(updates.username || '').trim();
        if (username.length > 100) {
            throw new Error('Username too long (max 100 characters)');
        }
        if (username.length > 0) {
            sanitized.username = username;
        }
    }
    
    // Validate email
    if (updates.email !== undefined) {
        const email = String(updates.email || '').trim();
        if (email.length > 150) {
            throw new Error('Email too long (max 150 characters)');
        }
        if (email.length > 0 && !isValidEmail(email)) {
            throw new Error('Invalid email format');
        }
        if (email.length > 0) {
            sanitized.email = email;
        }
    }
    
    // Validate height (cm)
    if (updates.height !== undefined) {
        const height = updates.height === '' || updates.height === null ? null : parseFloat(updates.height);
        if (height !== null && (isNaN(height) || height < 0 || height > 300)) {
            throw new Error('Invalid height (must be 0-300 cm)');
        }
        sanitized.height = height;
    }
    
    // Validate weight (kg)
    if (updates.weight !== undefined) {
        const weight = updates.weight === '' || updates.weight === null ? null : parseFloat(updates.weight);
        if (weight !== null && (isNaN(weight) || weight < 0 || weight > 500)) {
            throw new Error('Invalid weight (must be 0-500 kg)');
        }
        sanitized.weight = weight;
    }
    
    // Validate gender (enum)
    if (updates.gender !== undefined) {
        const gender = String(updates.gender || '').trim();
        const validGenders = ['Male', 'Female', 'Other', ''];
        if (gender && !validGenders.includes(gender)) {
            throw new Error('Invalid gender value');
        }
        if (gender) {
            sanitized.gender = gender;
        }
    }
    
    // Validate equipment (comma-separated IDs)
    if (updates.equipment !== undefined) {
        const equipment = String(updates.equipment || '').trim();
        if (equipment.length > 500) {
            throw new Error('Equipment list too long');
        }
        if (equipment) {
            // Basic validation: comma-separated alphanumeric IDs
            const ids = equipment.split(',').map(id => id.trim());
            const validIds = ids.every(id => /^[A-Z0-9]+$/.test(id));
            if (!validIds) {
                throw new Error('Invalid equipment ID format');
            }
            sanitized.equipment = equipment;
        }
    }
    
    return sanitized;
}

/**
 * Basic email validation regex
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ==================== USER EQUIPMENT FUNCTIONS ====================

// Get user's selected equipment
export async function getUserEquipment(userId) {
    try {
        console.log('Getting equipment for user:', userId);
        
        const user = await getUserById(userId);
        console.log('User data:', user);
        
        if (!user) {
            console.warn('User not found');
            return [];
        }
        
        if (!user.equipment || user.equipment.trim() === '') {
            console.log('No equipment set for user');
            return [];
        }
        
        const allEquipment = await getEquipment();
        console.log('All equipment:', allEquipment);
        
        const userEquipmentIds = user.equipment.split(',').map(id => id.trim()).filter(id => id);
        console.log('User equipment IDs:', userEquipmentIds);
        
        const filteredEquipment = allEquipment.filter(eq => userEquipmentIds.includes(eq.equipmentId));
        console.log('Filtered equipment:', filteredEquipment);
        
        return filteredEquipment;
    } catch (error) {
        console.error('Error fetching user equipment:', error);
        return [];
    }
}

// Update user's equipment selection
export async function updateUserEquipment(userId, equipmentIds) {
    try {
        const equipmentString = equipmentIds.join(',');
        console.log('Updating user equipment to:', equipmentString);
        
        await updateUserProfile(userId, { equipment: equipmentString });
        
        console.log('User equipment updated successfully');
        return true;
    } catch (error) {
        console.error('Error updating user equipment:', error);
        throw error;
    }
}

// ==================== EQUIPMENT FUNCTIONS ====================

// Get all equipment
export async function getEquipment() {
    const data = await readSheet(CONFIG.SHEETS.EQUIPMENT);
    if (data.length <= 1) return [];
    
    return data.slice(1).map(row => ({
        equipmentId: row[0],
        equipmentName: row[1],
        category: row[2],
        description: row[3],
    }));
}

// Add equipment
export async function addEquipment(name, category, description) {
    const equipmentId = 'E' + Date.now().toString().slice(-6);
    
    await appendToSheet(CONFIG.SHEETS.EQUIPMENT, [
        equipmentId,
        name,
        category,
        description,
    ]);
    
    return equipmentId;
}

// ==================== EXERCISE FUNCTIONS ====================

// Get all exercises
export async function getExercises() {
    const data = await readSheet(CONFIG.SHEETS.EXERCISES);
    if (data.length <= 1) return [];
    
    return data.slice(1).map(row => ({
        exerciseId: row[0],
        exerciseName: row[1],
        muscleGroup: row[2],
        equipmentId: row[3] ? row[3].split(',') : [],
        difficulty: row[4],
        instructions: row[5],
    }));
}

// Get exercises by muscle group
export async function getExercisesByMuscleGroup(muscleGroup) {
    const exercises = await getExercises();
    return exercises.filter(ex => ex.muscleGroup === muscleGroup);
}

// Add exercise
export async function addExercise(name, muscleGroup, equipmentIds, difficulty, instructions) {
    const exerciseId = 'EX' + Date.now().toString().slice(-6);
    
    await appendToSheet(CONFIG.SHEETS.EXERCISES, [
        exerciseId,
        name,
        muscleGroup,
        equipmentIds.join(','),
        difficulty,
        instructions,
    ]);
    
    return exerciseId;
}

// ==================== WORKOUT PLAN FUNCTIONS ====================

// Get all workout plans
export async function getWorkoutPlans() {
    const data = await readSheet(CONFIG.SHEETS.WORKOUT_PLANS);
    if (data.length <= 1) return [];
    
    return data.slice(1).map(row => ({
        planId: row[0],
        planName: row[1],
        targetMuscles: row[2],
        difficulty: row[3],
        daysPerWeek: parseInt(row[4]),
        description: row[5],
    }));
}

// Get exercises for a specific plan
export async function getPlanExercises(planId) {
    const data = await readSheet(CONFIG.SHEETS.PLAN_EXERCISES);
    if (data.length <= 1) return [];
    
    return data.slice(1)
        .filter(row => row[0] === planId)
        .map(row => ({
            planId: row[0],
            exerciseId: row[1],
            dayNumber: parseInt(row[2]),
            order: parseInt(row[3]),
            defaultSets: parseInt(row[4]),
            defaultReps: parseInt(row[5]),
            restSeconds: parseInt(row[6]),
        }));
}

// ==================== WORKOUT SESSION FUNCTIONS ====================

// Create new workout session
export async function createWorkoutSession(userId, planId, notes = '') {
    const sessionId = 'S' + Date.now().toString();
    const date = new Date().toISOString().split('T')[0];
    const startTime = new Date().toTimeString().slice(0, 5);
    
    await appendToSheet(CONFIG.SHEETS.WORKOUT_SESSIONS, [
        sessionId,
        userId,
        planId,
        date,
        startTime,
        '', // EndTime - filled when session ends
        notes,
        '0%', // CompletionRate - updated as exercises are logged
    ]);
    
    return sessionId;
}

// End workout session
export async function endWorkoutSession(sessionId, completionRate) {
    const sessions = await readSheet(CONFIG.SHEETS.WORKOUT_SESSIONS);
    const rowIndex = sessions.findIndex(row => row[0] === sessionId);
    
    if (rowIndex === -1) throw new Error('Session not found');
    
    const session = sessions[rowIndex];
    const endTime = new Date().toTimeString().slice(0, 5);
    
    session[5] = endTime;
    session[7] = `${completionRate}%`;
    
    await updateRow(`WorkoutSessions!A${rowIndex + 1}:H${rowIndex + 1}`, session);
}

// Get user's workout sessions
export async function getUserSessions(userId, limit = 10) {
    const data = await readSheet(CONFIG.SHEETS.WORKOUT_SESSIONS);
    if (data.length <= 1) return [];
    
    return data.slice(1)
        .filter(row => row[1] === userId)
        .map(row => ({
            sessionId: row[0],
            userId: row[1],
            planId: row[2],
            date: row[3],
            startTime: row[4],
            endTime: row[5],
            notes: row[6],
            completionRate: row[7],
        }))
        .slice(0, limit);
}

// ==================== WORKOUT LOG FUNCTIONS ====================

// Log a set
export async function logWorkoutSet(sessionId, userId, exerciseId, setNumber, reps, weight, rpe, notes = '') {
    const logId = 'L' + Date.now().toString();
    const timestamp = new Date().toISOString();
    
    await appendToSheet(CONFIG.SHEETS.WORKOUT_LOGS, [
        logId,
        sessionId,
        userId,
        exerciseId,
        setNumber,
        reps,
        weight,
        rpe,
        timestamp,
        notes,
    ]);
    
    return logId;
}

// Get logs for a session
export async function getSessionLogs(sessionId) {
    const data = await readSheet(CONFIG.SHEETS.WORKOUT_LOGS);
    if (data.length <= 1) return [];
    
    return data.slice(1)
        .filter(row => row[1] === sessionId)
        .map(row => ({
            logId: row[0],
            sessionId: row[1],
            userId: row[2],
            exerciseId: row[3],
            setNumber: parseInt(row[4]),
            reps: parseInt(row[5]),
            weight: parseFloat(row[6]),
            rpe: parseInt(row[7]),
            timestamp: row[8],
            notes: row[9],
        }));
}

// Get user's exercise history
export async function getUserExerciseHistory(userId, exerciseId, limit = 20) {
    const data = await readSheet(CONFIG.SHEETS.WORKOUT_LOGS);
    if (data.length <= 1) return [];
    
    return data.slice(1)
        .filter(row => row[2] === userId && row[3] === exerciseId)
        .map(row => ({
            logId: row[0],
            sessionId: row[1],
            setNumber: parseInt(row[4]),
            reps: parseInt(row[5]),
            weight: parseFloat(row[6]),
            rpe: parseInt(row[7]),
            timestamp: row[8],
            notes: row[9],
        }))
        .slice(0, limit);
}

// ==================== AI RECOMMENDATION FUNCTIONS ====================

// Save AI recommendation
export async function saveRecommendation(userId, exerciseId, sets, reps, weight, reasoning) {
    const recommendationId = 'R' + Date.now().toString();
    const date = new Date().toISOString().split('T')[0];
    
    await appendToSheet(CONFIG.SHEETS.AI_RECOMMENDATIONS, [
        recommendationId,
        userId,
        exerciseId,
        date,
        sets,
        reps,
        weight,
        reasoning,
    ]);
    
    return recommendationId;
}

// Get recommendations for user
export async function getUserRecommendations(userId, exerciseId = null) {
    const data = await readSheet(CONFIG.SHEETS.AI_RECOMMENDATIONS);
    if (data.length <= 1) return [];
    
    let filtered = data.slice(1).filter(row => row[1] === userId);
    
    if (exerciseId) {
        filtered = filtered.filter(row => row[2] === exerciseId);
    }
    
    return filtered.map(row => ({
        recommendationId: row[0],
        userId: row[1],
        exerciseId: row[2],
        date: row[3],
        recommendedSets: parseInt(row[4]),
        recommendedReps: parseInt(row[5]),
        recommendedWeight: parseFloat(row[6]),
        reasoning: row[7],
    }));
}

// ==================== WEIGHT HISTORY FUNCTIONS ====================

// Get user's weight history
export async function getWeightHistory(userId, limit = 50) {
    try {
        const data = await readSheet(CONFIG.SHEETS.WEIGHT_HISTORY);
        if (data.length <= 1) return [];
        
        return data.slice(1)
            .filter(row => row[1] === userId)
            .map(row => ({
                entryId: row[0],
                userId: row[1],
                date: row[2],
                weight: parseFloat(row[3]),
                notes: row[4] || '',
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-limit);
    } catch (error) {
        console.error('Error fetching weight history:', error);
        return [];
    }
}

// Add weight entry
export async function addWeightEntry(userId, weight, notes = '') {
    const entryId = 'W' + Date.now().toString();
    const date = new Date().toISOString().split('T')[0];
    
    try {
        await appendToSheet(CONFIG.SHEETS.WEIGHT_HISTORY, [
            entryId,
            userId,
            date,
            weight,
            notes,
        ]);
        
        // Update user's current weight in Users sheet
        await updateUserProfile(userId, { weight });
        
        return entryId;
    } catch (error) {
        console.error('Error adding weight entry:', error);
        throw error;
    }
}

// ==================== ANALYTICS FUNCTIONS ====================

// Get exercise statistics
export async function getExerciseStats(userId, exerciseId) {
    try {
        const history = await getUserExerciseHistory(userId, exerciseId, 100);
        
        if (history.length === 0) return null;
        
        // Group by session/date
        const sessionMap = {};
        history.forEach(log => {
            if (!sessionMap[log.sessionId]) {
                sessionMap[log.sessionId] = {
                    sessionId: log.sessionId,
                    timestamp: log.timestamp,
                    sets: [],
                };
            }
            sessionMap[log.sessionId].sets.push(log);
        });
        
        // Calculate stats for each session
        const sessions = Object.values(sessionMap).map(session => {
            const weights = session.sets.map(s => s.weight);
            const reps = session.sets.map(s => s.reps);
            
            const maxWeight = Math.max(...weights);
            const totalVolume = session.sets.reduce((sum, set) => sum + (set.reps * set.weight), 0);
            
            // Calculate estimated 1RM (using Epley formula)
            const best1RM = Math.max(...session.sets.map(set => {
                if (set.reps === 1) return set.weight;
                return set.weight * (1 + set.reps / 30);
            }));
            
            return {
                date: new Date(session.timestamp).toISOString().split('T')[0],
                maxWeight,
                totalVolume,
                estimated1RM: Math.round(best1RM * 10) / 10,
                sets: session.sets.length,
                avgReps: reps.reduce((a, b) => a + b, 0) / reps.length,
            };
        });
        
        return sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
        console.error('Error calculating exercise stats:', error);
        return null;
    }
}

export default {
    initializeGoogleSheets,
    readSheet,
    appendToSheet,
    updateRow,
    getUsers,
    getUserById,
    addUser,
    updateUserProfile,
    getUserEquipment,
    updateUserEquipment,
    getWeightHistory,
    addWeightEntry,
    getEquipment,
    addEquipment,
    getExercises,
    getExercisesByMuscleGroup,
    addExercise,
    getWorkoutPlans,
    getPlanExercises,
    createWorkoutSession,
    endWorkoutSession,
    getUserSessions,
    logWorkoutSet,
    getSessionLogs,
    getUserExerciseHistory,
    getExerciseStats,
    saveRecommendation,
    getUserRecommendations,
};