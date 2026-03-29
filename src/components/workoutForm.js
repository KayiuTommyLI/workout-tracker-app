import React, { useState } from 'react';

const WorkoutForm = ({ onSubmit }) => {
    const [exercise, setExercise] = useState('');
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [weight, setWeight] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (exercise && sets && reps && weight) {
            onSubmit({ exercise, sets: parseInt(sets), reps: parseInt(reps), weight: parseFloat(weight) });
            setExercise('');
            setSets('');
            setReps('');
            setWeight('');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Exercise:</label>
                <input
                    type="text"
                    value={exercise}
                    onChange={(e) => setExercise(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>Sets:</label>
                <input
                    type="number"
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>Reps:</label>
                <input
                    type="number"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>Weight (lbs):</label>
                <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    required
                />
            </div>
            <button type="submit">Add Workout</button>
        </form>
    );
};

export default WorkoutForm;