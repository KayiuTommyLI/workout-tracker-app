import { Chart, registerables } from 'chart.js';
import { getWeightHistory, getExerciseStats, getExercises } from './sheetsAPI.js';

// Register Chart.js components
Chart.register(...registerables);

let weightChart = null;
let strengthChart = null;

// Initialize analytics dashboard
export async function initializeAnalytics(userId) {
    const analyticsContainer = document.getElementById('analytics-container');
    if (!analyticsContainer) {
        console.error('Analytics container not found');
        return;
    }
    
    analyticsContainer.innerHTML = `
        <div class="analytics-dashboard">
            <h2>📊 Progress Analytics</h2>
            
            <!-- Weight Tracking Section -->
            <div class="analytics-section">
                <div class="section-header">
                    <h3>Weight History</h3>
                    <button id="add-weight-btn" class="btn-small">+ Add Weight</button>
                </div>
                <canvas id="weight-chart"></canvas>
            </div>
            
            <!-- Strength Progression Section -->
            <div class="analytics-section">
                <div class="section-header">
                    <h3>Strength Progression</h3>
                    <div class="controls">
                        <select id="exercise-selector">
                            <option value="">Select an exercise...</option>
                        </select>
                        <select id="metric-selector">
                            <option value="maxWeight">Max Weight</option>
                            <option value="totalVolume">Total Volume</option>
                            <option value="estimated1RM">Estimated 1RM</option>
                        </select>
                    </div>
                </div>
                <canvas id="strength-chart"></canvas>
            </div>
        </div>
    `;
    
    // Load weight history chart
    await loadWeightChart(userId);
    
    // Setup exercise selector
    await setupExerciseSelector(userId);
    
    // Setup add weight button
    setupAddWeightButton(userId);
}

// Load weight history chart
async function loadWeightChart(userId) {
    try {
        const weightHistory = await getWeightHistory(userId);
        
        if (weightHistory.length === 0) {
            console.log('No weight history found');
            return;
        }
        
        const ctx = document.getElementById('weight-chart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (weightChart) {
            weightChart.destroy();
        }
        
        weightChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weightHistory.map(entry => entry.date),
                datasets: [{
                    label: 'Weight (kg)',
                    data: weightHistory.map(entry => entry.weight),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const entry = weightHistory[context.dataIndex];
                                return entry.notes ? `Note: ${entry.notes}` : '';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Weight (kg)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading weight chart:', error);
    }
}

// Setup exercise selector for strength progression
async function setupExerciseSelector(userId) {
    try {
        const exercises = await getExercises();
        const selector = document.getElementById('exercise-selector');
        const metricSelector = document.getElementById('metric-selector');
        
        if (!selector) return;
        
        // Populate exercise dropdown
        exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.exerciseId;
            option.textContent = exercise.exerciseName;
            selector.appendChild(option);
        });
        
        // Handle selection change
        selector.addEventListener('change', async () => {
            const exerciseId = selector.value;
            const metric = metricSelector.value;
            
            if (exerciseId) {
                await loadStrengthChart(userId, exerciseId, metric);
            }
        });
        
        metricSelector.addEventListener('change', async () => {
            const exerciseId = selector.value;
            const metric = metricSelector.value;
            
            if (exerciseId) {
                await loadStrengthChart(userId, exerciseId, metric);
            }
        });
    } catch (error) {
        console.error('Error setting up exercise selector:', error);
    }
}

// Load strength progression chart
async function loadStrengthChart(userId, exerciseId, metric = 'maxWeight') {
    try {
        const stats = await getExerciseStats(userId, exerciseId);
        
        if (!stats || stats.length === 0) {
            console.log('No stats found for this exercise');
            return;
        }
        
        const ctx = document.getElementById('strength-chart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (strengthChart) {
            strengthChart.destroy();
        }
        
        const metricLabels = {
            maxWeight: 'Max Weight (kg)',
            totalVolume: 'Total Volume (kg)',
            estimated1RM: 'Estimated 1RM (kg)'
        };
        
        strengthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: stats.map(s => s.date),
                datasets: [{
                    label: metricLabels[metric],
                    data: stats.map(s => s[metric]),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.1,
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const stat = stats[context.dataIndex];
                                return `Sets: ${stat.sets} | Avg Reps: ${stat.avgReps.toFixed(1)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: metricLabels[metric]
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading strength chart:', error);
    }
}

// Setup add weight button
function setupAddWeightButton(userId) {
    const addBtn = document.getElementById('add-weight-btn');
    if (!addBtn) return;
    
    addBtn.addEventListener('click', () => {
        showAddWeightModal(userId);
    });
}

// Show modal to add weight entry
function showAddWeightModal(userId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Add Weight Entry</h3>
            <form id="add-weight-form">
                <div class="form-group">
                    <label>Weight (kg):</label>
                    <input type="number" id="weight-input" step="0.1" required>
                </div>
                <div class="form-group">
                    <label>Notes (optional):</label>
                    <input type="text" id="notes-input" placeholder="e.g., Morning weigh-in">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Save</button>
                    <button type="button" class="btn-secondary" id="cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    document.getElementById('add-weight-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const weight = parseFloat(document.getElementById('weight-input').value);
        const notes = document.getElementById('notes-input').value;
        
        try {
            const { addWeightEntry } = await import('./sheetsAPI.js');
            await addWeightEntry(userId, weight, notes);
            
            // Reload chart
            await loadWeightChart(userId);
            
            // Close modal
            document.body.removeChild(modal);
            
            alert('Weight entry added successfully!');
        } catch (error) {
            console.error('Error adding weight entry:', error);
            alert('Failed to add weight entry');
        }
    });
    
    // Handle cancel
    document.getElementById('cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

export default {
    initializeAnalytics,
};