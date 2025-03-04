// Wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize storage first
        if (!chrome.storage) {
            throw new Error('Chrome storage API not available');
        }

        // Initialize themes
        if (!themes || typeof themes.init !== 'function') {
            throw new Error('Themes module not properly loaded');
        }
        await themes.init();

        // Initialize collections
        if (!collections || typeof collections.init !== 'function') {
            throw new Error('Collections module not properly loaded');
        }
        await collections.init();

        // Initialize tabs
        if (!tabs || typeof tabs.init !== 'function') {
            throw new Error('Tabs module not properly loaded');
        }
        await tabs.init();

        // Initialize search
        if (!search || typeof search.init !== 'function') {
            throw new Error('Search module not properly loaded');
        }
        search.init();
        
        // Initialize global search
        if (!globalSearch || typeof globalSearch.init !== 'function') {
            throw new Error('Global search module not properly loaded');
        }
        globalSearch.init();

        // Set up keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Focus search input when pressing '/'
            if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // Refresh tabs when pressing 'r'
            if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                const refreshBtn = document.getElementById('refreshTabs');
                if (refreshBtn) {
                    refreshBtn.click();
                }
            }
        });

        // Set up drag and drop for the collections container
        const collectionsContainer = document.getElementById('collections');
        if (collectionsContainer) {
            collectionsContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
        }

        // Set up import/export buttons
        const importBtn = document.getElementById('importCollections');
        const exportBtn = document.getElementById('exportCollections');
        
        if (importBtn) {
            importBtn.addEventListener('click', collections.importCollections);
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', collections.exportCollections);
        }

        // Initialize tooltips
        const buttons = document.querySelectorAll('button[title]');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = e.target.getAttribute('title');
                document.body.appendChild(tooltip);

                const rect = e.target.getBoundingClientRect();
                tooltip.style.top = `${rect.bottom + 5}px`;
                tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;

                button.addEventListener('mouseleave', () => {
                    tooltip.remove();
                }, { once: true });
            });
        });

    } catch (error) {
        console.error('Error initializing new tab page:', error);
        // Display error message to user
        const container = document.querySelector('.app-container');
        if (container) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = 'An error occurred while loading the page. Please refresh or check the console for details.';
            container.prepend(errorMessage);
        }
    }
}); 