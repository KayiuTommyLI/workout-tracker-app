// PWA Service Worker Registration
// This file handles Progressive Web App functionality

// Check if service workers are supported
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Register service worker when available
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => {
        //         console.log('Service Worker registered:', registration);
        //     })
        //     .catch(error => {
        //         console.log('Service Worker registration failed:', error);
        //     });
    });
}

// Handle install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.style.display = 'block';

        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to install prompt: ${outcome}`);
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });
    }
});

console.log('PWA module loaded');

// Development safeguard: remove stale service workers/cache on localhost
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    window.addEventListener('load', async () => {
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(registration => registration.unregister()));
            }

            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
            }

            console.log('🧹 Dev cache cleanup complete');
        } catch (error) {
            console.warn('Dev cache cleanup failed:', error);
        }
    });
}
