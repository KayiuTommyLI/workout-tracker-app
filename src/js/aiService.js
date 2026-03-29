import CONFIG from '../config/config.js';

// Get AI workout recommendation using Gemini API
export async function getAIWorkoutRecommendation(userId, userProfile, equipment, recentWorkouts) {
    if (!CONFIG.GEMINI_API_KEY) {
        throw new Error('Gemini API key is not configured');
    }

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
        // Use the correct API endpoint for Gemini 2.5 Flash
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error response:', errorText);
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Gemini API response:', data);

        // Extract text from response
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            throw new Error('No text generated from Gemini API');
        }

        console.log('Generated text:', generatedText);

        // Parse JSON from the response (remove markdown code blocks if present)
        let jsonText = generatedText.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\n?/g, '');
        }

        const recommendation = JSON.parse(jsonText);

        // Validate the recommendation structure
        if (!recommendation.exercises || !Array.isArray(recommendation.exercises)) {
            throw new Error('Invalid recommendation format');
        }

        console.log('✅ AI recommendation generated successfully:', recommendation);
        return recommendation;

    } catch (error) {
        console.error('Error calling Gemini API:', error);

        // Return a fallback recommendation
        console.log('⚠️ Using fallback recommendation');
        return getFallbackRecommendation(equipment);
    }
}

// Fallback recommendation if AI fails
function getFallbackRecommendation(equipment) {
    const hasEquipment = equipment.length > 0;

    return {
        intensity: 'Moderate',
        justification: 'AI recommendation is currently unavailable. Here\'s a balanced full-body workout based on your available equipment. This workout targets all major muscle groups with compound movements.',
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