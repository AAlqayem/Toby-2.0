/**
 * Favicon Handler - Improves visibility of favicons by detecting and handling white icons
 */
const faviconHandler = {
    /**
     * Initialize the favicon handler
     */
    init: () => {
        // Add event listeners to all favicon images
        document.addEventListener('DOMContentLoaded', faviconHandler.setupListeners);
        
        // Also handle favicons that are added dynamically
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const favicons = node.querySelectorAll('img.favicon');
                            favicons.forEach(favicon => {
                                faviconHandler.setupFaviconListener(favicon);
                            });
                        }
                    }
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },
    
    /**
     * Set up listeners for all favicons
     */
    setupListeners: () => {
        const favicons = document.querySelectorAll('img.favicon');
        favicons.forEach(favicon => {
            faviconHandler.setupFaviconListener(favicon);
        });
    },
    
    /**
     * Set up a listener for a single favicon
     * @param {HTMLImageElement} favicon - The favicon image element
     */
    setupFaviconListener: (favicon) => {
        // Only add the listener once
        if (favicon.dataset.handlerInitialized) return;
        favicon.dataset.handlerInitialized = 'true';
        
        // Handle load event to detect white favicons
        favicon.addEventListener('load', () => {
            // Skip if the favicon is the default one
            if (favicon.src.includes('default-favicon.png')) return;
            
            // Check if we're in light theme
            const isLightTheme = document.body.getAttribute('data-theme') === 'light';
            
            // Only apply special handling in light theme for non-specific sites
            if (isLightTheme && 
                !favicon.src.includes('github.com') &&
                !favicon.src.includes('twitter.com') &&
                !favicon.src.includes('x.com') &&
                !favicon.src.includes('figma.com') &&
                !favicon.src.includes('notion.so') &&
                !favicon.src.includes('slack.com')) {
                
                // Try to detect if this is a predominantly white favicon
                faviconHandler.detectWhiteFavicon(favicon);
            }
        });
        
        // Handle error event
        favicon.addEventListener('error', (e) => {
            e.target.src = 'icons/default-favicon.png';
        });
    },
    
    /**
     * Detect if a favicon is predominantly white and apply special styling if needed
     * @param {HTMLImageElement} favicon - The favicon image element
     */
    detectWhiteFavicon: (favicon) => {
        try {
            // Create a canvas to analyze the favicon
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size to match favicon
            canvas.width = favicon.width || 16;
            canvas.height = favicon.height || 16;
            
            // Draw the favicon on the canvas
            ctx.drawImage(favicon, 0, 0, canvas.width, canvas.height);
            
            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Count white/light pixels
            let lightPixelCount = 0;
            let totalPixels = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];
                
                // Skip transparent pixels
                if (a < 50) continue;
                
                // Check if the pixel is light (high brightness)
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                if (brightness > 0.8) {
                    lightPixelCount++;
                }
                
                totalPixels++;
            }
            
            // If more than 70% of non-transparent pixels are light, apply special styling
            if (totalPixels > 0 && (lightPixelCount / totalPixels) > 0.7) {
                favicon.classList.add('white-favicon');
                favicon.style.filter = 'invert(0.7) brightness(0.3) contrast(1.1)';
                favicon.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            }
        } catch (error) {
            console.error('Error analyzing favicon:', error);
        }
    }
};

// Initialize the favicon handler
faviconHandler.init();
