import CONFIG from '../config/config.js';

let tokenClient;
let accessToken = null;
const TOKEN_KEY = 'google_access_token';
const TOKEN_EXPIRY_KEY = 'google_token_expiry';

// Initialize Google Identity Services
export function initializeAuth() {
    return new Promise((resolve) => {
        // Try to restore token across refreshes/tabs
        const savedToken = localStorage.getItem(TOKEN_KEY);
        const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
        
        if (savedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
            accessToken = savedToken;
            console.log('✅ Restored saved token');
        }
        
        // Check if script already loaded
        if (window.google?.accounts?.oauth2) {
            initTokenClient();
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            initTokenClient();
            resolve(true);
        };
        script.onerror = () => {
            console.error('Failed to load Google Identity Services');
            resolve(false);
        };
        document.head.appendChild(script);
    });
}

function initTokenClient() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: '', // Will be set in requestAuthorization
    });
}

// Request user authorization
export function requestAuthorization() {
    return new Promise((resolve, reject) => {
        const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

        if (accessToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
            gapi.client.setToken({ access_token: accessToken });
            resolve(true);
            return;
        }

        // Clear expired/incomplete token state before requesting a new one
        clearToken();

        try {
            const handleSuccess = (response) => {
                accessToken = response.access_token;
                
                // Save token to localStorage (expires in 1 hour)
                const expiryTime = Date.now() + (3600 * 1000); // 1 hour from now
                localStorage.setItem(TOKEN_KEY, accessToken);
                localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
                
                gapi.client.setToken({ access_token: accessToken });
                console.log('✅ Authorization successful');
                resolve(true);
            };

            tokenClient.callback = (response) => {
                if (response.error !== undefined) {
                    // If silent token request fails, fall back to interactive consent
                    if (response.error === 'interaction_required' || response.error === 'consent_required') {
                        tokenClient.callback = (interactiveResponse) => {
                            if (interactiveResponse.error !== undefined) {
                                console.error('Authorization error:', interactiveResponse);
                                reject(new Error(interactiveResponse.error));
                                return;
                            }

                            handleSuccess(interactiveResponse);
                        };

                        tokenClient.requestAccessToken({ prompt: 'consent' });
                        return;
                    }

                    console.error('Authorization error:', response);
                    reject(new Error(response.error));
                    return;
                }

                handleSuccess(response);
            };

            // Try silent token request first
            tokenClient.requestAccessToken({ prompt: '' });
        } catch (error) {
            console.error('Error requesting authorization:', error);
            reject(error);
        }
    });
}

// Check if user is authorized
export function isAuthorized() {
    // Check if token exists and hasn't expired
    const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    
    if (accessToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
        return true;
    }
    
    // Token expired, clear it
    if (tokenExpiry && Date.now() >= parseInt(tokenExpiry)) {
        clearToken();
    }
    
    return false;
}

// Get current access token
export function getAccessToken() {
    return accessToken;
}

// Clear token
function clearToken() {
    accessToken = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

// Sign out
export function signOut() {
    if (accessToken) {
        google.accounts.oauth2.revoke(accessToken, () => {
            console.log('Access token revoked');
        });
    }
    clearToken();
    gapi.client.setToken(null);
}

export default {
    initializeAuth,
    requestAuthorization,
    isAuthorized,
    getAccessToken,
    signOut,
};