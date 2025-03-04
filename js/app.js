document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize themes
        await themes.init();

        // Initialize collections
        await collections.init();

        // Initialize tabs
        await tabs.init();

        // Set up auto-refresh of open tabs
        setInterval(tabs.loadOpenTabs, 5000);
        
        // Set up import/export buttons
        const importBtn = document.getElementById('importCollections');
        const exportBtn = document.getElementById('exportCollections');
        
        if (importBtn) {
            importBtn.addEventListener('click', collections.importCollections);
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', collections.exportCollections);
        }
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});