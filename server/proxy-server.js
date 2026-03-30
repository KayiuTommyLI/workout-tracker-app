require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.API_PORT || 8787;

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});

app.post('/api/gemini-workout', async (req, res) => {
    try {
        const geminiApiKey = process.env.GEMINI_API_KEY;

        if (!geminiApiKey) {
            return res.status(500).json({ error: 'Server Gemini API key is not configured.' });
        }

        const { prompt } = req.body || {};
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: 'Invalid prompt payload.' });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: 'Gemini API request failed.', details: errorText });
        }

        const data = await response.json();
        const generatedText =
            data?.candidates?.[0]?.content?.parts
                ?.map(part => (typeof part?.text === 'string' ? part.text : ''))
                .join('')
                .trim() || '';

        if (!generatedText) {
            return res.status(502).json({
                error: 'No generated text returned by Gemini.',
                finishReason: data?.candidates?.[0]?.finishReason || null,
                promptFeedback: data?.promptFeedback || null,
            });
        }

        res.json({ generatedText });
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Unexpected proxy error.' });
    }
});

app.listen(PORT, () => {
    console.log(`Gemini proxy server listening on http://localhost:${PORT}`);
});
