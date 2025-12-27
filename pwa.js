// ========== PWA FUNCTIONALITY ==========

// DOM Elements
const installButton = document.getElementById('install-button');
const installHelpBtn = document.getElementById('install-help-btn');
const installModal = document.getElementById('install-modal');
const closeInstallModal = document.getElementById('close-install-modal');
const pwaBadge = document.getElementById('pwa-badge');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const shareBtn = document.getElementById('share-btn');
const offlineOverlay = document.getElementById('offline-overlay');
const connectionStatus = document.getElementById('connection-status');
const connectionText = document.getElementById('connection-text');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notification-text');

// PWA variables
let deferredPrompt;

// Initialize PWA features
function initPWA() {
    // Register Service Worker
    registerServiceWorker();
    
    // Setup install prompt
    setupInstallPrompt();
    
    // Setup fullscreen
    setupFullscreen();
    
    // Setup sharing
    setupSharing();
    
    // Setup offline detection
    setupOfflineDetection();
    
    // Setup install help modal
    setupInstallModal();
    
    // Check if already installed
    checkIfInstalled();
}

// Register Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Register the service worker from a dedicated file (avoids blob URL protocol issues)
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                    showNotification('App is ready to work offline!');
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        });
    }
}

// Setup install prompt
function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        
        // Show the install button
        installButton.classList.remove('hidden');
        
        // Show notification
        showNotification('You can install Robo Companion as an app!');
        
        // Update PWA badge
        pwaBadge.innerHTML = '<i class="fas fa-download"></i> <span>Installable</span>';
        pwaBadge.style.background = 'rgba(52, 152, 219, 0.2)';
        pwaBadge.style.color = '#3498db';
    });
    
    // Install button click handler
    installButton.addEventListener('click', () => {
        if (!deferredPrompt) {
            // If no deferred prompt, show install instructions
            installModal.classList.add('show');
            return;
        }
        
        // Hide the install button
        installButton.classList.add('hidden');
        
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                showNotification('Robo Companion installed successfully!');
                pwaBadge.innerHTML = '<i class="fas fa-check-circle"></i> <span>Installed</span>';
                pwaBadge.className = 'pwa-badge installed';
            } else {
                console.log('User dismissed the install prompt');
                // Show button again after a delay
                setTimeout(() => {
                    installButton.classList.remove('hidden');
                }, 3000);
            }
            deferredPrompt = null;
        });
    });
}

// Check if app is already installed
function checkIfInstalled() {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
        installButton.classList.add('hidden');
        pwaBadge.innerHTML = '<i class="fas fa-check-circle"></i> <span>Installed</span>';
        pwaBadge.className = 'pwa-badge installed';
        document.getElementById('pwa-info').textContent = "Running as installed app!";
        document.getElementById('pwa-info').style.color = "#4CAF50";
    }
    
    // Listen for app installed event
    window.addEventListener('appinstalled', (evt) => {
        console.log('App was installed');
        installButton.classList.add('hidden');
        pwaBadge.innerHTML = '<i class="fas fa-check-circle"></i> <span>Installed</span>';
        pwaBadge.className = 'pwa-badge installed';
        document.getElementById('pwa-info').textContent = "App installed successfully!";
        document.getElementById('pwa-info').style.color = "#4CAF50";
        showNotification('App installed successfully! Launch from home screen.');
    });
}

// Setup fullscreen
function setupFullscreen() {
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
                showNotification('Fullscreen not supported or denied');
            });
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            fullscreenBtn.title = 'Exit Fullscreen';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                fullscreenBtn.title = 'Toggle Fullscreen';
            }
        }
    });
    
    // Update fullscreen button when exiting via ESC key
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            fullscreenBtn.title = 'Toggle Fullscreen';
        }
    });
}

// Setup sharing
function setupSharing() {
    shareBtn.addEventListener('click', () => {
        if (navigator.share) {
            navigator.share({
                title: 'Robo Companion',
                text: 'Check out this interactive robot companion PWA!',
                url: window.location.href
            }).then(() => {
                console.log('Thanks for sharing!');
            }).catch(err => {
                console.log('Error sharing:', err);
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href).then(() => {
                showNotification('Link copied to clipboard!');
            });
        }
    });
}

// Setup offline detection
function setupOfflineDetection() {
    window.addEventListener('online', () => {
        offlineOverlay.classList.remove('show');
        connectionText.textContent = "Online - App is ready to work offline";
        connectionStatus.className = 'connection-status online';
        showNotification('You are back online!');
    });
    
    window.addEventListener('offline', () => {
        offlineOverlay.classList.add('show');
        connectionText.textContent = "Offline - Working in offline mode";
        connectionStatus.className = 'connection-status offline';
        showNotification('You are offline. Robo still works!');
    });
    
    // Check initial connection status
    if (!navigator.onLine) {
        window.dispatchEvent(new Event('offline'));
    }
}

// Setup install modal
function setupInstallModal() {
    installHelpBtn.addEventListener('click', () => {
        installModal.classList.add('show');
    });
    
    closeInstallModal.addEventListener('click', () => {
        installModal.classList.remove('show');
    });
    
    // Close modal when clicking outside
    installModal.addEventListener('click', (e) => {
        if (e.target === installModal) {
            installModal.classList.remove('show');
        }
    });
}

// Show notification
function showNotification(message) {
    notificationText.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Initialize PWA when page loads
document.addEventListener('DOMContentLoaded', initPWA);