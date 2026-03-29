import CONFIG from '../config/config.js';

// Calculate workout recommendations based on previous data
export function calculateRecommendations(exerciseHistory) {
    if (!exerciseHistory || exerciseHistory.length === 0) {
        return {
            sets: 3,
            reps: 10,
            weight: 0,
            reasoning: 'No history available. Starting with standard beginner protocol.',
        };
    }

    // Group by session to get the last workout
    const sessions = groupBySession(exerciseHistory);
    const lastSession = sessions[sessions.length - 1];
    
    // Calculate averages from last session
    const avgWeight = average(lastSession.map(s => s.weight));
    const avgReps = average(lastSession.map(s => s.reps));
    const avgRPE = average(lastSession.map(s => s.rpe));
    const sets = lastSession.length;

    let recommendedWeight = avgWeight;
    let recommendedReps = Math.round(avgReps);
    let recommendedSets = sets;
    let reasoning = '';

    // Progressive overload logic based on RPE
    if (avgRPE < CONFIG.RPE_THRESHOLD_FOR_INCREASE) {
        // User found it easy, increase weight
        const increment = Math.max(
            avgWeight * (CONFIG.WEIGHT_INCREMENT_PERCENTAGE / 100),
            CONFIG.MIN_WEIGHT_INCREMENT
        );
        recommendedWeight = Math.round((avgWeight + increment) * 2) / 2; // Round to nearest 0.5
        reasoning = `Last session RPE was ${avgRPE.toFixed(1)}/10. Increasing weight by ${increment.toFixed(1)}kg for progressive overload.`;
    } else if (avgRPE >= 9) {
        // Too hard, reduce weight or increase reps for volume
        if (avgReps < 12) {
            recommendedReps = Math.min(avgReps + 2, 12);
            reasoning = `Last session RPE was ${avgRPE.toFixed(1)}/10 (very hard). Increasing reps to ${recommendedReps} before adding weight.`;
        } else {
            recommendedWeight = Math.round((avgWeight * 0.95) * 2) / 2;
            reasoning = `Last session RPE was ${avgRPE.toFixed(1)}/10 (very hard). Reducing weight by 5% for better form.`;
        }
    } else {
        // RPE is in good range (7-8), maintain current load
        reasoning = `Last session RPE was ${avgRPE.toFixed(1)}/10 (optimal). Maintaining current weight to consolidate strength.`;
    }

    return {
        sets: recommendedSets,
        reps: recommendedReps,
        weight: recommendedWeight,
        reasoning: reasoning,
        previousStats: {
            avgWeight,
            avgReps,
            avgRPE,
            sets,
        },
    };
}

// Group exercise history by session
function groupBySession(history) {
    const sessionMap = {};
    
    history.forEach(log => {
        if (!sessionMap[log.sessionId]) {
            sessionMap[log.sessionId] = [];
        }
        sessionMap[log.sessionId].push(log);
    });
    
    return Object.values(sessionMap);
}

// Calculate average
function average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

// Calculate total volume for a workout
export function calculateVolume(reps, sets, weight) {
    return reps * sets * weight;
}

// Calculate one-rep max (1RM) using Epley formula
export function calculateOneRepMax(weight, reps) {
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
}

// Calculate estimated calories burned (rough estimate)
export function estimateCaloriesBurned(duration, intensity, weight) {
    // MET values: Light=3, Moderate=5, Intense=8
    const metValues = {
        light: 3,
        moderate: 5,
        intense: 8,
    };
    
    const met = metValues[intensity] || 5;
    const hours = duration / 60;
    
    // Calories = MET × weight (kg) × time (hours)
    return Math.round(met * weight * hours);
}

// Generate weekly training split recommendation
export function recommendTrainingSplit(fitnessLevel, daysAvailable) {
    const splits = {
        beginner: {
            3: 'Full Body (Mon/Wed/Fri)',
            4: 'Upper/Lower Split',
            5: 'Upper/Lower/Full Body',
        },
        intermediate: {
            3: 'Full Body or Push/Pull/Legs',
            4: 'Upper/Lower Split',
            5: 'Push/Pull/Legs/Upper/Lower',
            6: 'Push/Pull/Legs (twice per week)',
        },
        advanced: {
            4: 'Upper/Lower Split',
            5: 'Push/Pull/Legs/Upper/Lower',
            6: 'Push/Pull/Legs (twice per week)',
        },
    };
    
    return splits[fitnessLevel]?.[daysAvailable] || 'Custom split recommended';
}

export default {
    calculateRecommendations,
    calculateVolume,
    calculateOneRepMax,
    estimateCaloriesBurned,
    recommendTrainingSplit,
};