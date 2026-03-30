require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const PORT = process.env.API_PORT || 8787;

// Configuration
const CONFIG = {
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    GEMINI_TEMPERATURE: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
    GEMINI_MAX_TOKENS: parseInt(process.env.GEMINI_MAX_TOKENS || '2048', 10),
    REQUEST_TIMEOUT_MS: parseInt(process.env.API_REQUEST_TIMEOUT_MS || '30000', 10),
    BODY_SIZE_LIMIT: process.env.API_BODY_SIZE_LIMIT || '1mb',
    PROMPT_MAX_LENGTH: parseInt(process.env.API_PROMPT_MAX_LENGTH || '5000', 10),
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '60000', 10),
    RATE_LIMIT_MAX: parseInt(process.env.API_RATE_LIMIT_MAX || '5', 10),
};

// Request logging
app.use(morgan('combined', {
    skip: (req) => req.path === '/api/health',
}));

// Body parser with size limit
app.use(express.json({ limit: CONFIG.BODY_SIZE_LIMIT }));

// Health check endpoint (no rate limiting)
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Rate limiting for AI requests
const geminiLimiter = rateLimit({
    windowMs: CONFIG.RATE_LIMIT_WINDOW_MS,
    max: CONFIG.RATE_LIMIT_MAX,
    message: {
        error: 'Too many workout recommendations requested. Please wait a minute.',
        retryAfter: Math.ceil(CONFIG.RATE_LIMIT_WINDOW_MS / 1000),
    },
    standardHeaders: true, // Return RateLimit-* headers
    legacyHeaders: false,  // Disable X-RateLimit-* headers
    keyGenerator: (req) => req.ip || req.socket.remoteAddress, // Use IP for rate limiting
});

app.post('/api/gemini-workout', geminiLimiter, async (req, res) => {
    try {
        const geminiApiKey = process.env.GEMINI_API_KEY;

        if (!geminiApiKey) {
            console.error('[ERROR] Gemini API key not configured');
            return res.status(500).json({ error: 'Server Gemini API key is not configured.' });
        }

        const { prompt } = req.body || {};
        
        // Validate prompt
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return res.status(400).json({ error: 'Invalid or empty prompt payload.' });
        }

        if (prompt.length > CONFIG.PROMPT_MAX_LENGTH) {
            return res.status(400).json({
                error: `Prompt too long. Maximum ${CONFIG.PROMPT_MAX_LENGTH} characters allowed.`,
            });
        }

        console.log(`[INFO] Processing workout recommendation request (${prompt.length} chars)`);

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: CONFIG.GEMINI_TEMPERATURE,
                            maxOutputTokens: CONFIG.GEMINI_MAX_TOKENS,
                        },
                    }),
                    signal: controller.signal,
                }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[ERROR] Gemini API returned ${response.status}:`, errorText.slice(0, 200));
                return res.status(response.status).json({
                    error: 'Gemini API request failed.',
                    details: errorText.slice(0, 500),
                });
            }

            const data = await response.json();
            const generatedText =
                data?.candidates?.[0]?.content?.parts
                    ?.map(part => (typeof part?.text === 'string' ? part.text : ''))
                    .join('')
                    .trim() || '';

            if (!generatedText) {
                console.warn('[WARN] Gemini returned no generated text');
                return res.status(502).json({
                    error: 'No generated text returned by Gemini.',
                    finishReason: data?.candidates?.[0]?.finishReason || null,
                    promptFeedback: data?.promptFeedback || null,
                });
            }

            console.log(`[INFO] Successfully generated ${generatedText.length} character response`);
            res.json({ generatedText });
        } catch (fetchError) {
            clearTimeout(timeoutId);

            if (fetchError.name === 'AbortError') {
                console.error(`[ERROR] Request timeout after ${CONFIG.REQUEST_TIMEOUT_MS}ms`);
                return res.status(504).json({
                    error: 'Request timeout. Gemini API took too long to respond.',
                });
            }

            console.error('[ERROR] Fetch error:', fetchError.message);
            return res.status(502).json({
                error: 'Failed to communicate with Gemini API.',
                details: fetchError.message.slice(0, 200),
            });
        }
    } catch (error) {
        console.error('[ERROR] Unexpected proxy error:', error.message);
        res.status(500).json({ error: 'Unexpected server error.' });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[ERROR] Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
    console.log(`[✓] Gemini proxy server listening on http://localhost:${PORT}`);
    console.log(`[INFO] Rate limit: ${CONFIG.RATE_LIMIT_MAX} requests per ${CONFIG.RATE_LIMIT_WINDOW_MS / 1000}s`);
    console.log(`[INFO] Request timeout: ${CONFIG.REQUEST_TIMEOUT_MS}ms`);
});

