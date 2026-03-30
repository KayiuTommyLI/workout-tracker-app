// Get AI workout recommendation using Gemini API
export async function getAIWorkoutRecommendation(userId, userProfile, equipment, recentWorkouts) {
    // Prepare context for AI
    const equipmentList = equipment.map(e => e.equipmentName).join(', ');
    const recentWorkoutSummary = recentWorkouts.length > 0
        ? recentWorkouts.map(w => `${w.date}: ${w.exercises.join(', ')}`).join('\n')
        : 'No recent workouts';

    const prompt = `You are a professional fitness trainer. Generate a personalized workout recommendation.

User Profile:
- Gender: ${userProfile.gender || 'Not specified'}
- Weight: ${userProfile.weight || 'Not specified'} kg
- Height: ${userProfile.height || 'Not specified'} cm
- Available Equipment: ${equipmentList || 'None'}

Recent Workout History (last 7 days):
${recentWorkoutSummary}

Based on this information, suggest a workout for today. Consider:
1. Muscle recovery (avoid overtraining the same muscle groups)
2. Progressive overload
3. Available equipment
4. Balanced training split

Respond in JSON format with this structure:
{
    "intensity": "Moderate" | "High" | "Low",
    "justification": "Why this workout is recommended today (2-3 sentences)",
    "exercises": [
        {
            "name": "Exercise name",
            "sets": 3,
            "reps": 10,
            "weight": 50,
            "notes": "Form tips or progression advice"
        }
    ]
}

Include 4-6 exercises. Make it specific and actionable.`;

    try {
        const response = await fetch('/api/gemini-workout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI proxy error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        const generatedText = data.generatedText;

        if (!generatedText) {
            throw new Error('No text generated from AI service');
        }

        const jsonText = extractJsonObject(generatedText);
        const recommendation = normalizeRecommendation(JSON.parse(jsonText));

        // Validate the recommendation structure
        if (!recommendation.exercises || !Array.isArray(recommendation.exercises)) {
            throw new Error('Invalid recommendation format');
        }

        return {
            ...recommendation,
            source: 'live',
            fallbackReason: null,
        };

    } catch (error) {
        console.error('Error calling Gemini API:', error);

        const message = String(error?.message || '');
        let reason = 'AI recommendation is currently unavailable.';

        if (message.includes('project quota tier unavailable')) {
            reason = 'AI recommendation is unavailable because your Google project quota tier is not enabled for this API key.';
        } else if (message.includes('429')) {
            reason = 'AI recommendation is temporarily unavailable because the Gemini API quota/rate limit was exceeded.';
        } else if (message.includes('401') || message.includes('403')) {
            reason = 'AI recommendation is unavailable because API authentication/permission failed.';
        } else if (message.includes('500')) {
            reason = 'AI recommendation is unavailable due to a temporary server issue.';
        }

        // Return a fallback recommendation
        return getFallbackRecommendation(equipment, reason);
    }
}

function extractJsonObject(text) {
    const trimmed = String(text || '').trim();

    const withoutCodeFence = trimmed
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

    const firstBrace = withoutCodeFence.indexOf('{');
    const lastBrace = withoutCodeFence.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('No JSON object found in AI response');
    }

    return withoutCodeFence.slice(firstBrace, lastBrace + 1);
}

function normalizeRecommendation(recommendation) {
    const normalizedExercises = Array.isArray(recommendation?.exercises)
        ? recommendation.exercises
            .filter(ex => ex && ex.name)
            .map(ex => ({
                name: String(ex.name),
                sets: Number(ex.sets) > 0 ? Number(ex.sets) : 3,
                reps: Number(ex.reps) > 0 ? Number(ex.reps) : 10,
                weight: Number(ex.weight) >= 0 ? Number(ex.weight) : 0,
                notes: ex.notes ? String(ex.notes) : 'Focus on controlled form and progressive overload.',
            }))
        : [];

    let intensity = recommendation?.intensity;
    if (typeof intensity === 'number') {
        intensity = intensity >= 8 ? 'High' : intensity <= 4 ? 'Low' : 'Moderate';
    }
    if (!['Low', 'Moderate', 'High'].includes(intensity)) {
        intensity = 'Moderate';
    }

    return {
        intensity,
        justification: recommendation?.justification
            ? String(recommendation.justification)
            : 'Recommended based on your available equipment and recent training load.',
        exercises: normalizedExercises.slice(0, 6),
    };
}

// Fallback recommendation if AI fails
function getFallbackRecommendation(equipment, reason = 'AI recommendation is currently unavailable.') {
    const hasEquipment = equipment.length > 0;

    return {
        intensity: 'Moderate',
        justification: `${reason} Here\'s a balanced full-body workout based on your available equipment. This workout targets all major muscle groups with compound movements.`,
        source: 'fallback',
        fallbackReason: reason,
        exercises: hasEquipment ? [
            {
                name: 'Barbell Squat',
                sets: 4,
                reps: 10,
                weight: 60,
                notes: 'Keep your core tight and maintain proper form. Go as deep as comfortable.'
            },
            {
                name: 'Bench Press',
                sets: 4,
                reps: 8,
                weight: 50,
                notes: 'Press the bar in a straight line. Engage your core throughout.'
            },
            {
                name: 'Barbell Row',
                sets: 4,
                reps: 10,
                weight: 40,
                notes: 'Pull to your lower chest. Keep your back straight.'
            },
            {
                name: 'Overhead Press',
                sets: 3,
                reps: 8,
                weight: 35,
                notes: 'Press the bar overhead. Keep your core engaged.'
            },
            {
                name: 'Romanian Deadlift',
                sets: 3,
                reps: 12,
                weight: 50,
                notes: 'Focus on the stretch in your hamstrings. Keep the bar close to your body.'
            }
        ] : [
            {
                name: 'Bodyweight Squats',
                sets: 4,
                reps: 15,
                weight: 0,
                notes: 'No equipment needed. Focus on depth and control.'
            },
            {
                name: 'Push-ups',
                sets: 4,
                reps: 12,
                weight: 0,
                notes: 'Maintain a straight line from head to heels.'
            },
            {
                name: 'Lunges',
                sets: 3,
                reps: 12,
                weight: 0,
                notes: 'Alternate legs. Keep your front knee over your ankle.'
            },
            {
                name: 'Plank',
                sets: 3,
                reps: 60,
                weight: 0,
                notes: 'Hold for 60 seconds. Keep your core engaged.'
            }
        ]
    };
}

// Get user's recent workout context for AI
export async function getUserWorkoutContext(userId, days = 7) {
    // This would normally fetch from sheets, but for now return empty
    // The actual implementation is in sheetsAPI.js
    return [];
}

export default {
    getAIWorkoutRecommendation,
    getUserWorkoutContext,
};