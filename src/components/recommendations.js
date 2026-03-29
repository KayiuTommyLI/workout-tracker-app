import React, { useEffect, useState } from 'react';
import { getWorkoutHistory } from '../js/sheetsAPI';
import { calculateNextWorkout } from '../js/workoutCalculator';

const Recommendations = () => {
    const [recommendations, setRecommendations] = useState([]);

    useEffect(() => {
        const fetchWorkoutHistory = async () => {
            const history = await getWorkoutHistory();
            const nextWorkout = calculateNextWorkout(history);
            setRecommendations(nextWorkout);
        };

        fetchWorkoutHistory();
    }, []);

    return (
        <div className="recommendations">
            <h2>Next Day Workout Recommendations</h2>
            {recommendations.length > 0 ? (
                <ul>
                    {recommendations.map((rec, index) => (
                        <li key={index}>
                            {rec.sets} sets of {rec.reps} reps at {rec.weight} lbs
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No recommendations available. Please log your workouts.</p>
            )}
        </div>
    );
};

export default Recommendations;