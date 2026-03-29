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
