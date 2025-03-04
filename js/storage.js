const storage = {
    /**
     * Save data to Chrome storage
     * @param {Object} data - Data to save
     * @returns {Promise} Promise that resolves when data is saved
     */
    save: async (data) => {
        return new Promise((resolve, reject) => {
            // Use local storage instead of sync for larger data capacity
            chrome.storage.local.set(data, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    },

    /**
     * Load data from Chrome storage
     * @param {string|Array} keys - Key or array of keys to load
     * @returns {Promise} Promise that resolves with loaded data
     */
    load: async (keys) => {
        return new Promise((resolve, reject) => {
            // Use local storage instead of sync for larger data capacity
            chrome.storage.local.get(keys, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result);
                }
            });
        });
    },

    /**
     * Remove data from Chrome storage
     * @param {string|Array} keys - Key or array of keys to remove
     * @returns {Promise} Promise that resolves when data is removed
     */
    remove: async (keys) => {
        return new Promise((resolve, reject) => {
            // Use local storage instead of sync for larger data capacity
            chrome.storage.local.remove(keys, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    },

    /**
     * Clear all data from Chrome storage
     * @returns {Promise} Promise that resolves when storage is cleared
     */
    clear: async () => {
        return new Promise((resolve, reject) => {
            // Use local storage instead of sync for larger data capacity
            chrome.storage.local.clear(() => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }
}; 