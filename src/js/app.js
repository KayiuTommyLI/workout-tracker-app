import { 
    initializeGoogleSheets, 
    getUsers,
    getUserById,
    addUser,
    getExercises,
    getWorkoutPlans,
    getPlanExercises,
    createWorkoutSession,
    logWorkoutSet,
    getUserSessions,
    getUserExerciseHistory,
    saveRecommendation,
    getUserRecommendations,
    getEquipment,
    getUserEquipment,
    endWorkoutSession,
    getSessionLogs,
    getExerciseStats
} from './sheetsAPI.js';
import { calculateRecommendations } from './workoutCalculator.js';
import { formatDate, validateWorkoutInput, escapeHtml } from './utils.js';
import { getAIWorkoutRecommendation, getUserWorkoutContext } from './aiService.js';
import { initializeAnalytics } from './analytics.js';
import { initializeEquipmentManager } from './equipmentManager.js';
import { initializeAuth, requestAuthorization, isAuthorized, signOut } from './auth.js';

// Global state
let currentUser = null;
let currentSession = null;
let currentExercises = [];
let currentPlan = null;
let restTimer = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initialized');
    
    try {
        // Initialize Google Sheets API first
        await initializeGoogleSheets();
        console.log('✅ Google Sheets API initialized');
        
        // Initialize Google Identity Services (for OAuth)
        await initializeAuth();
        console.log('✅ Google Identity Services initialized');
        
        // Add sign-in button
        addAuthButton();
        
        // Load or create user (for demo, we'll use a default user)
        await loadUser();
        
        // Load initial data
        await loadDashboard();
        
    } catch (error) {
        console.error('Error initializing app:', error);
        displayError('Failed to initialize app. Please check your API configuration.');
    }
});

// Add authentication button
function addAuthButton() {
    const app = document.getElementById('app');
    const authDiv = document.createElement('div');
    authDiv.id = 'auth-section';
    
    if (isAuthorized()) {
        authDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #4CAF50;">✅ Signed in - You can save workout data</span>
                <button id="sign-out-btn" class="btn-secondary">Sign Out</button>
            </div>
        `;
    } else {
        authDiv.innerHTML = `
            <div style="text-align: center;">
                <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
                    ⚠️ Sign in with Google to save workout data and equipment
                </p>
                <button id="sign-in-btn" class="btn-primary">🔐 Sign In with Google</button>
            </div>
        `;
    }
    
    const header = document.querySelector('header');
    if (header && header.nextSibling) {
        header.parentNode.insertBefore(authDiv, header.nextSibling);
    }
    
    // Add event listeners
    const signInBtn = document.getElementById('sign-in-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    
    if (signInBtn) {
        signInBtn.addEventListener('click', async () => {
            try {
                const authorized = await requestAuthorization();
                if (authorized) {
                    showToast('✅ Successfully signed in!');
                    document.getElementById('auth-section').remove();
                    addAuthButton();
                }
            } catch (error) {
                console.error('Sign in error:', error);
                alert('Failed to sign in. Please try again.');
            }
        });
    }
    
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            signOut();
            showToast('Signed out successfully');
            document.getElementById('auth-section').remove();
            addAuthButton();
        });
    }
}

// Show toast notification
function showToast(message) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Load or create a default user
async function loadUser() {
    const users = await getUsers();
    console.log('Users:', users);
    
    if (users.length === 0) {
        currentUser = {
            userId: 'U000000',
            username: 'Guest User',
            email: 'guest@example.com',
            height: null,
            weight: null,
            gender: null,
            dateJoined: new Date().toISOString().split('T')[0],
            lastActive: new Date().toISOString().split('T')[0],
            equipment: '',
        };
        console.log('Using guest user:', currentUser);
        displayUserInfo();
        showCreateUserPrompt();
    } else {
        currentUser = users[0];
        console.log('Using existing user:', currentUser);
        displayUserInfo();
    }
}

// Show prompt to create user account
function showCreateUserPrompt() {
    if (!isAuthorized()) {
        const container = document.querySelector('.container');
        if (container) {
            const notice = document.createElement('div');
            notice.style.cssText = 'background: #fff3cd; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #ffc107;';
            notice.innerHTML = `
                <strong>👋 Welcome!</strong><br>
                <p style="margin: 10px 0;">Sign in with Google to create your profile and start tracking workouts.</p>
            `;
            container.insertBefore(notice, container.firstChild);
        }
    }
}

// Display user information
function displayUserInfo() {
    const app = document.querySelector('.container');
    let userInfoDiv = document.getElementById('user-info');
    
    if (!userInfoDiv) {
        userInfoDiv = document.createElement('div');
        userInfoDiv.id = 'user-info';
        userInfoDiv.className = 'user-info';
        app.insertBefore(userInfoDiv, app.firstChild);
    }
    
    userInfoDiv.innerHTML = `
        <h2>Welcome, ${escapeHtml(currentUser.username)}! 👋</h2>
        <p>Height: ${escapeHtml(currentUser.height || 'Not set')} cm | Weight: ${escapeHtml(currentUser.weight || 'Not set')} kg | Gender: ${escapeHtml(currentUser.gender || 'Not set')}</p>
    `;
}

// Display error message
function displayError(message) {
    const app = document.getElementById('app');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    app.appendChild(errorDiv);
}

// Load dashboard data
async function loadDashboard() {
    // Load recent sessions
    const sessions = await getUserSessions(currentUser.userId, 5);
    console.log('Recent sessions:', sessions);
    
    // Initialize equipment manager
    await initializeEquipmentManager(currentUser.userId);
    
    // Display workout options (AI + Manual)
    displayWorkoutOptions();
    
    // Display recent sessions
    displayRecentSessions(sessions);
    
    // Initialize analytics dashboard
    await initializeAnalytics(currentUser.userId);
}

// Display workout options (AI or Manual)
function displayWorkoutOptions() {
    const container = document.getElementById('workout-form');
    if (!container) return;
    
    container.innerHTML = `
        <div class="workout-options">
            <h3>🏋️ Start Your Workout</h3>
            <p class="options-description">Choose how you want to create your workout today</p>
            
            <div class="options-grid">
                <div class="option-card ai-option">
                    <div class="option-icon">🤖</div>
                    <h4>AI-Powered Workout</h4>
                    <p>Let AI analyze your history and equipment to suggest the perfect workout</p>
                    <p id="ai-status-indicator" class="options-description">AI: Not requested yet</p>
                    <button id="ai-workout-btn" class="btn-primary">
                        ✨ Get AI Recommendation
                    </button>
                </div>
                
                <div class="option-card manual-option">
                    <div class="option-icon">📝</div>
                    <h4>Manual Workout</h4>
                    <p>Select exercises yourself and create a custom workout</p>
                    <button id="manual-workout-btn" class="btn-primary">
                        🔧 Create Custom Workout
                    </button>
                </div>
            </div>
            
            <div id="workout-creator"></div>
        </div>
    `;
    
    // Add event listeners
    document.getElementById('ai-workout-btn').addEventListener('click', getAIRecommendation);
    document.getElementById('manual-workout-btn').addEventListener('click', showManualWorkoutCreator);
}

// Get AI recommendation
async function getAIRecommendation() {
    const aiButton = document.getElementById('ai-workout-btn');
    aiButton.disabled = true;
    aiButton.textContent = '🤖 Generating recommendation...';
    
    try {
        const equipment = await getUserEquipment(currentUser.userId);
        
        if (equipment.length === 0) {
            alert('Please select your gym equipment first!');
            aiButton.disabled = false;
            aiButton.textContent = '✨ Get AI Recommendation';
            return;
        }
        
        const recentWorkouts = await getUserWorkoutContext(currentUser.userId, 7);
        const recommendation = await getAIWorkoutRecommendation(
            currentUser.userId,
            currentUser,
            equipment,
            recentWorkouts
        );

        const statusIndicator = document.getElementById('ai-status-indicator');
        if (statusIndicator) {
            if (recommendation.source === 'fallback') {
                const reason = recommendation.fallbackReason ? ` (${recommendation.fallbackReason})` : '';
                statusIndicator.textContent = `AI: Fallback${reason}`;
            } else {
                statusIndicator.textContent = 'AI: Live';
            }
        }
        
        console.log('AI Recommendation:', recommendation);
        displayAIRecommendation(recommendation);
        
    } catch (error) {
        console.error('Error getting AI recommendation:', error);
        alert('Failed to get AI recommendation. Please check your Gemini API key.');
    } finally {
        aiButton.disabled = false;
        aiButton.textContent = '✨ Get AI Recommendation';
    }
}

// Display AI recommendation
function displayAIRecommendation(recommendation) {
    const creator = document.getElementById('workout-creator');
    if (!creator) return;
    
    creator.innerHTML = `
        <div class="ai-recommendation">
            <div class="recommendation-header">
                <h3>🎯 AI Workout Recommendation</h3>
                <span class="intensity-badge">${escapeHtml(recommendation.intensity || 'Moderate')} Intensity</span>
            </div>
            <p class="options-description">
                ${recommendation.source === 'fallback'
                    ? `AI: Fallback${recommendation.fallbackReason ? ` (${escapeHtml(recommendation.fallbackReason)})` : ''}`
                    : 'AI: Live'}
            </p>
            
            <div class="justification">
                <h4>📊 Why this workout?</h4>
                <p>${escapeHtml(recommendation.justification || '')}</p>
            </div>
            
            <div class="workout-plan">
                <h4>💪 Recommended Exercises</h4>
                ${recommendation.exercises.map((ex, idx) => `
                    <div class="exercise-recommendation">
                        <h5>${idx + 1}. ${escapeHtml(ex.name)}</h5>
                        <p><strong>Sets:</strong> ${Number(ex.sets) || 0} | <strong>Reps:</strong> ${Number(ex.reps) || 0} | <strong>Weight:</strong> ${Number(ex.weight) || 0}kg</p>
                        <p><em>${escapeHtml(ex.notes || '')}</em></p>
                    </div>
                `).join('')}
            </div>
            
            <div class="recommendation-actions">
                <button onclick="window.acceptAIWorkout()" class="btn-primary">✅ Start This Workout</button>
                <button onclick="window.rejectAIWorkout()" class="btn-secondary">🔄 Get Different Recommendation</button>
                <button onclick="window.cancelRecommendation()" class="btn-secondary">❌ Cancel</button>
            </div>
        </div>
    `;
}

// Accept AI workout
window.acceptAIWorkout = async function() {
    if (!isAuthorized()) {
        alert('Please sign in to start a workout.');
        return;
    }
    
    showToast('✨ Starting AI-recommended workout...');
    // TODO: Parse AI recommendation and start workout
    alert('Feature coming soon: Will convert AI recommendation to active workout');
};

// Reject AI workout
window.rejectAIWorkout = async function() {
    showToast('🔄 Getting new recommendation...');
    await getAIRecommendation();
};

// Cancel recommendation
window.cancelRecommendation = function() {
    document.getElementById('workout-creator').innerHTML = '';
};

// Show manual workout creator
async function showManualWorkoutCreator() {
    const creator = document.getElementById('workout-creator');
    if (!creator) return;
    
    const allExercises = await getExercises();
    const userEquipment = await getUserEquipment(currentUser.userId);
    const userEquipmentIds = userEquipment.map(e => e.equipmentId);
    
    // Filter exercises by user's equipment
    const availableExercises = allExercises.filter(ex => 
        userEquipmentIds.includes(ex.requiredEquipment) || ex.requiredEquipment === 'None'
    );
    
    creator.innerHTML = `
        <div class="manual-workout-creator">
            <div class="creator-header">
                <h3>📝 Create Custom Workout</h3>
                <button class="btn-secondary" onclick="window.cancelManualWorkout()">❌ Cancel</button>
            </div>
            
            <div class="exercise-selector">
                <h4>Select Exercises:</h4>
                <div class="exercises-list">
                    ${availableExercises.map(ex => `
                        <label class="exercise-select-item">
                            <input type="checkbox" class="exercise-checkbox" value="${escapeHtml(ex.exerciseId)}">
                            <div class="exercise-info">
                                <strong>${escapeHtml(ex.exerciseName)}</strong>
                                <span class="muscle-tag">${escapeHtml(ex.muscleGroup)}</span>
                                <p>${escapeHtml(ex.description || '')}</p>
                            </div>
                        </label>
                    `).join('')}
                </div>
            </div>
            
            <div class="selected-exercises">
                <h4>Selected Exercises: <span id="selected-count">0</span></h4>
                <div id="selected-list"></div>
            </div>
            
            <button id="start-manual-workout" class="btn-primary" disabled>
                🏋️ Start Workout (<span id="exercise-count">0</span> exercises)
            </button>
        </div>
    `;
    
    // Add event listeners
    const checkboxes = creator.querySelectorAll('.exercise-checkbox');
    const selectedList = document.getElementById('selected-list');
    const selectedCount = document.getElementById('selected-count');
    const exerciseCount = document.getElementById('exercise-count');
    const startButton = document.getElementById('start-manual-workout');
    
    let selectedExercises = [];
    
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) {
                const exercise = availableExercises.find(ex => ex.exerciseId === cb.value);
                if (exercise) {
                    selectedExercises.push(exercise);
                }
            } else {
                const exerciseId = cb.value;
                selectedExercises = selectedExercises.filter(ex => ex.exerciseId !== exerciseId);
            }
            
            // Update display
            selectedCount.textContent = selectedExercises.length;
            exerciseCount.textContent = selectedExercises.length;
            startButton.disabled = selectedExercises.length === 0;
            
            // Show selected exercises
            selectedList.innerHTML = selectedExercises.map(ex => `
                <div class="selected-exercise-tag">
                    ${escapeHtml(ex.exerciseName)}
                    <button class="remove-exercise" data-id="${escapeHtml(ex.exerciseId)}">×</button>
                </div>
            `).join('');
            
            // Add remove handlers
            selectedList.querySelectorAll('.remove-exercise').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const checkbox = creator.querySelector(`input[value="${id}"]`);
                    if (checkbox) checkbox.checked = false;
                    selectedExercises = selectedExercises.filter(ex => ex.exerciseId !== id);
                    
                    // Update display again
                    selectedCount.textContent = selectedExercises.length;
                    exerciseCount.textContent = selectedExercises.length;
                    startButton.disabled = selectedExercises.length === 0;
                    
                    selectedList.innerHTML = selectedExercises.map(ex => `
                        <div class="selected-exercise-tag">
                            ${escapeHtml(ex.exerciseName)}
                            <button class="remove-exercise" data-id="${escapeHtml(ex.exerciseId)}">×</button>
                        </div>
                    `).join('');
                });
            });
        });
    });
    
    // Start manual workout
    startButton.addEventListener('click', () => {
        startManualWorkout(selectedExercises);
    });
}

// Cancel manual workout
window.cancelManualWorkout = function() {
    document.getElementById('workout-creator').innerHTML = '';
};

// Start manual workout with selected exercises
async function startManualWorkout(exercises) {
    if (!isAuthorized()) {
        alert('Please sign in to start a workout.');
        return;
    }
    
    if (exercises.length === 0) {
        alert('Please select at least one exercise.');
        return;
    }
    
    try {
        showToast('🏋️ Starting manual workout...');
        
        // Create a custom plan
        const customPlan = {
            planId: 'CUSTOM_' + Date.now(),
            planName: 'Custom Workout',
            description: 'User-created workout',
        };
        
        // Set current exercises with default sets/reps
        currentExercises = exercises.map(ex => ({
            ...ex,
            defaultSets: 3,
            defaultReps: 10,
            restSeconds: 90,
        }));
        
        // Create session
        const sessionId = await createWorkoutSession(currentUser.userId, customPlan.planId);
        currentSession = {
            sessionId,
            planId: customPlan.planId,
            startTime: new Date(),
            completedExercises: new Set(),
        };
        currentPlan = customPlan;
        
        console.log('Manual workout started:', currentSession);
        
        // Display workout interface
        displayWorkoutInterface();
        
    } catch (error) {
        console.error('Error starting manual workout:', error);
        alert('Failed to start workout. Please make sure you are signed in.');
    }
}

// Display recent workout sessions
function displayRecentSessions(sessions) {
    const container = document.getElementById('workout-log');
    if (!container) return;
    
    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="recent-sessions">
                <h3>📊 Recent Workouts</h3>
                <p class="no-data">No workouts yet. Start your first workout above!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="recent-sessions">
            <h3>📊 Recent Workouts</h3>
            <div class="sessions-list">
                ${sessions.map(session => `
                    <div class="session-card">
                        <div class="session-header">
                            <strong>${escapeHtml(session.date)}</strong>
                            <span class="completion-badge">${Number(session.completionRate) || 0}% Complete</span>
                        </div>
                        <p><strong>Time:</strong> ${escapeHtml(session.startTime)} - ${escapeHtml(session.endTime || 'In Progress')}</p>
                        <p><strong>Plan:</strong> ${escapeHtml(session.planId)}</p>
                        ${session.notes ? `<p><em>${escapeHtml(session.notes)}</em></p>` : ''}
                        <button class="btn-small view-session-btn" data-session-id="${escapeHtml(session.sessionId)}">
                            👁️ View Details
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Add click handlers
    document.querySelectorAll('.view-session-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const sessionId = e.target.dataset.sessionId;
            await viewSessionDetails(sessionId);
        });
    });
}

// Display workout interface
function displayWorkoutInterface() {
    const container = document.getElementById('workout-form');
    if (!container) return;
    
    container.innerHTML = `
        <div class="active-workout">
            <div class="workout-header">
                <h2>🏋️ Active Workout: ${escapeHtml(currentPlan.planName)}</h2>
                <button id="end-workout-btn" class="btn-secondary">🏁 End Workout</button>
            </div>
            
            <div class="workout-progress">
                <p><strong>Exercises:</strong> <span id="progress-text">0 / ${currentExercises.length}</span></p>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
                </div>
            </div>
            
            <div class="exercises-container">
                ${currentExercises.map((ex, idx) => `
                    <div class="exercise-card" data-exercise-index="${idx}">
                        <div class="exercise-header">
                            <h3>${idx + 1}. ${escapeHtml(ex.exerciseName)}</h3>
                            <span class="exercise-muscle">${escapeHtml(ex.muscleGroup)}</span>
                        </div>
                        
                        <div class="exercise-stats" id="stats-${ex.exerciseId}">
                            <p class="loading">Loading previous performance...</p>
                        </div>
                        
                        <div class="exercise-plan">
                            <p><strong>Plan:</strong> ${ex.defaultSets} sets × ${ex.defaultReps} reps | Rest: ${ex.restSeconds}s</p>
                        </div>
                        
                        <div class="sets-container" id="sets-${ex.exerciseId}">
                            ${Array.from({ length: ex.defaultSets }, (_, i) => `
                                <div class="set-row">
                                    <span class="set-number">Set ${i + 1}</span>
                                    <input type="number" placeholder="Reps" class="input-reps" data-set="${i + 1}" min="1">
                                    <input type="number" placeholder="Weight (kg)" class="input-weight" data-set="${i + 1}" step="0.5" min="0">
                                    <select class="input-rpe" data-set="${i + 1}">
                                        <option value="">RPE</option>
                                        ${Array.from({ length: 10 }, (_, j) => `<option value="${j + 1}">${j + 1}</option>`).join('')}
                                    </select>
                                    <button class="btn-log-set" data-exercise-id="${ex.exerciseId}" data-set="${i + 1}">
                                        ✓ Log
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="rest-timer" id="timer-${ex.exerciseId}" style="display: none;">
                            <p>⏱️ Rest: <span class="timer-display">0:00</span></p>
                            <button class="btn-small skip-rest">Skip Rest</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Load exercise history for each exercise
    currentExercises.forEach(async (ex) => {
        await displayExerciseHistory(ex.exerciseId);
    });
    
    // Add event listeners
    document.getElementById('end-workout-btn').addEventListener('click', endWorkout);
    
    document.querySelectorAll('.btn-log-set').forEach(btn => {
        btn.addEventListener('click', logSet);
    });
    
    // Scroll to workout
    container.scrollIntoView({ behavior: 'smooth' });
}

// Display exercise history
async function displayExerciseHistory(exerciseId) {
    const statsDiv = document.getElementById(`stats-${exerciseId}`);
    if (!statsDiv) return;
    
    try {
        const history = await getUserExerciseHistory(currentUser.userId, exerciseId, 1);
        
        if (history.length === 0) {
            statsDiv.innerHTML = '<p class="no-data">No previous data for this exercise</p>';
            return;
        }
        
        const lastWorkout = history[history.length - 1];
        statsDiv.innerHTML = `
            <p class="last-workout">
                <strong>Last workout:</strong> ${lastWorkout.reps} reps @ ${lastWorkout.weight}kg 
                (RPE: ${lastWorkout.rpe || 'N/A'})
            </p>
        `;
    } catch (error) {
        console.error('Error loading exercise history:', error);
        statsDiv.innerHTML = '<p class="error">Failed to load history</p>';
    }
}

// Log a set
async function logSet(e) {
    const btn = e.target;
    const exerciseId = btn.dataset.exerciseId;
    const setNumber = parseInt(btn.dataset.set);
    
    const setRow = btn.closest('.set-row');
    const reps = parseInt(setRow.querySelector('.input-reps').value);
    const weight = parseFloat(setRow.querySelector('.input-weight').value);
    const rpe = parseInt(setRow.querySelector('.input-rpe').value) || null;
    
    if (!reps || weight === null || weight === undefined) {
        alert('Please enter both reps and weight');
        return;
    }
    
    try {
        btn.disabled = true;
        btn.textContent = '⏳';
        
        await logWorkoutSet(
            currentSession.sessionId,
            currentUser.userId,
            exerciseId,
            setNumber,
            reps,
            weight,
            rpe
        );
        
        btn.textContent = '✅';
        btn.classList.add('logged');
        
        // Disable inputs
        setRow.querySelectorAll('input, select').forEach(input => {
            input.disabled = true;
        });
        
        // Check if all sets for this exercise are logged
        const allSets = document.querySelectorAll(`[data-exercise-id="${exerciseId}"]`);
        const loggedSets = Array.from(allSets).filter(b => b.classList.contains('logged'));
        
        if (loggedSets.length === allSets.length) {
            currentSession.completedExercises.add(exerciseId);
            updateProgress();
            
            // Start rest timer
            const exercise = currentExercises.find(ex => ex.exerciseId === exerciseId);
            if (exercise) {
                startRestTimer(exerciseId, exercise.restSeconds);
            }
        }
        
        showToast(`✅ Set ${setNumber} logged!`);
        
    } catch (error) {
        console.error('Error logging set:', error);
        alert('Failed to log set. Please make sure you are signed in.');
        btn.disabled = false;
        btn.textContent = '✓ Log';
    }
}

// Update workout progress
function updateProgress() {
    const completed = currentSession.completedExercises.size;
    const total = currentExercises.length;
    const percentage = (completed / total) * 100;
    
    document.getElementById('progress-text').textContent = `${completed} / ${total}`;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
}

// Start rest timer
function startRestTimer(exerciseId, seconds) {
    const timerDiv = document.getElementById(`timer-${exerciseId}`);
    if (!timerDiv) return;
    
    timerDiv.style.display = 'block';
    const display = timerDiv.querySelector('.timer-display');
    
    let remaining = seconds;
    
    const updateDisplay = () => {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    updateDisplay();
    
    restTimer = setInterval(() => {
        remaining--;
        updateDisplay();
        
        if (remaining <= 0) {
            clearInterval(restTimer);
            timerDiv.style.display = 'none';
            showToast('✅ Rest complete! Ready for next exercise.');
            
            // Play notification sound (optional)
            if ('vibrate' in navigator) {
                navigator.vibrate(200);
            }
        }
    }, 1000);
    
    // Skip rest button
    timerDiv.querySelector('.skip-rest').addEventListener('click', () => {
        clearInterval(restTimer);
        timerDiv.style.display = 'none';
    });
}

// End workout
async function endWorkout() {
    if (!confirm('Are you sure you want to end this workout?')) {
        return;
    }
    
    if (restTimer) {
        clearInterval(restTimer);
    }
    
    try {
        const completed = currentSession.completedExercises.size;
        const total = currentExercises.length;
        const completionRate = Math.round((completed / total) * 100);
        
        await endWorkoutSession(currentSession.sessionId, completionRate);
        
        showToast(`🎉 Workout complete! ${completionRate}% finished.`);
        
        // Show summary
        await showWorkoutSummary();
        
        // Reset state
        currentSession = null;
        currentExercises = [];
        currentPlan = null;
        
        // Reload dashboard
        await loadDashboard();
        
    } catch (error) {
        console.error('Error ending workout:', error);
        alert('Failed to end workout properly.');
    }
}

// Show workout summary
async function showWorkoutSummary() {
    const logs = await getSessionLogs(currentSession.sessionId);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>🎉 Workout Complete!</h2>
            <h3>Summary</h3>
            <div class="summary-stats">
                <p><strong>Duration:</strong> ${Math.round((new Date() - currentSession.startTime) / 60000)} minutes</p>
                <p><strong>Total Sets:</strong> ${logs.length}</p>
                <p><strong>Exercises Completed:</strong> ${currentSession.completedExercises.size} / ${currentExercises.length}</p>
            </div>
            
            <h4>Sets Logged:</h4>
            <div class="summary-exercises">
                ${Array.from(currentSession.completedExercises).map(exId => {
                    const exercise = currentExercises.find(ex => ex.exerciseId === exId);
                    const exLogs = logs.filter(log => log.exerciseId === exId);
                    const totalVolume = exLogs.reduce((sum, log) => sum + (log.reps * log.weight), 0);
                    
                    return `
                        <div class="summary-exercise">
                            <h5>${escapeHtml(exercise.exerciseName)}</h5>
                            <p>${Number(exLogs.length) || 0} sets | Total volume: ${Number(totalVolume) || 0}kg</p>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <button class="btn-primary" id="close-summary">Close</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('close-summary').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// View session details
async function viewSessionDetails(sessionId) {
    try {
        const logs = await getSessionLogs(sessionId);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>📊 Workout Details</h3>
                <p><strong>Session ID:</strong> ${escapeHtml(sessionId)}</p>
                <p><strong>Total Sets:</strong> ${Number(logs.length) || 0}</p>
                
                <h4>Sets Logged:</h4>
                <div class="logs-list">
                    ${logs.map(log => `
                        <div class="log-item">
                            <p><strong>Exercise:</strong> ${escapeHtml(log.exerciseId)}</p>
                            <p>Set ${Number(log.setNumber) || 0}: ${Number(log.reps) || 0} reps @ ${Number(log.weight) || 0}kg (RPE: ${escapeHtml(log.rpe || 'N/A')})</p>
                            <p class="log-time">${escapeHtml(new Date(log.timestamp).toLocaleString())}</p>
                        </div>
                    `).join('')}
                </div>
                
                <button class="btn-primary" id="close-details">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('close-details').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    } catch (error) {
        console.error('Error viewing session details:', error);
        alert('Failed to load session details.');
    }
}