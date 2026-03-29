// Format date to readable string
export function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

// Format time to readable string
export function formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Validate workout input
export function validateWorkoutInput(exercise, reps, weight) {
    if (!exercise || exercise.trim() === '') {
        throw new Error('Exercise name is required');
    }
    
    if (isNaN(reps) || reps <= 0) {
        throw new Error('Reps must be a positive number');
    }
    
    if (isNaN(weight) || weight < 0) {
        throw new Error('Weight must be a non-negative number');
    }
    
    return true;
}

// Sort workouts by date
export function sortByDate(workouts, descending = true) {
    return workouts.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return descending ? dateB - dateA : dateA - dateB;
    });
}

export default {
    formatDate,
    formatTime,
    validateWorkoutInput,
    sortByDate,
};