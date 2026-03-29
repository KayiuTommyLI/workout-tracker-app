import React, { useEffect, useState } from 'react';
import { fetchWorkoutData } from '../js/sheetsAPI';

const WorkoutLog = () => {
    const [workouts, setWorkouts] = useState([]);

    useEffect(() => {
        const getWorkoutData = async () => {
            const data = await fetchWorkoutData();
            setWorkouts(data);
        };
        getWorkoutData();
    }, []);

    return (
        <div className="workout-log">
            <h2>Your Workout History</h2>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Exercise</th>
                        <th>Sets</th>
                        <th>Reps</th>
                        <th>Weight</th>
                    </tr>
                </thead>
                <tbody>
                    {workouts.map((workout, index) => (
                        <tr key={index}>
                            <td>{workout.date}</td>
                            <td>{workout.exercise}</td>
                            <td>{workout.sets}</td>
                            <td>{workout.reps}</td>
                            <td>{workout.weight}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default WorkoutLog;