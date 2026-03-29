import CONFIG from '../config/config.js';

let tokenClient;
let accessToken = null;

// Initialize Google Identity Services
export function initializeAuth() {
    return new Promise((resolve) => {
        // Try to restore token from localStorage
        const savedToken = localStorage.getItem('google_access_token');
        const tokenExpiry = localStorage.getItem('google_token_expiry');
        
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
        if (accessToken) {
            gapi.client.setToken({ access_token: accessToken });
            resolve(true);
            return;
        }

        try {
            tokenClient.callback = (response) => {
                if (response.error !== undefined) {
                    console.error('Authorization error:', response);
                    reject(new Error(response.error));
                    return;
                }
                
                accessToken = response.access_token;
                
                // Save token to localStorage (expires in 1 hour)
                const expiryTime = Date.now() + (3600 * 1000); // 1 hour from now
                localStorage.setItem('google_access_token', accessToken);
                localStorage.setItem('google_token_expiry', expiryTime.toString());
                
                gapi.client.setToken({ access_token: accessToken });
                console.log('✅ Authorization successful');
                resolve(true);
            };

            // Request access token
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (error) {
            console.error('Error requesting authorization:', error);
            reject(error);
        }
    });
}

// Check if user is authorized
export function isAuthorized() {
    // Check if token exists and hasn't expired
    const tokenExpiry = localStorage.getItem('google_token_expiry');
    
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
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
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