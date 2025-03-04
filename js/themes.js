const themes = {
    /**
     * Initialize theme
     */
    init: async () => {
        const { theme } = await storage.load('theme') || { theme: 'light' };
        themes.setTheme(theme);
        
        // Set up theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            themes.setTheme(newTheme);
        });
    },

    /**
     * Set theme
     * @param {string} theme - Theme name ('light' or 'dark')
     */
    setTheme: async (theme) => {
        document.body.setAttribute('data-theme', theme);
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        await storage.save({ theme });
    },

    /**
     * Get current theme
     * @returns {string} Current theme name
     */
    getCurrentTheme: () => {
        return document.body.getAttribute('data-theme') || 'light';
    }
}; 