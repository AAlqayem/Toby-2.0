/**
 * Fuzzy search implementation
 */
const fuzzySearch = {
    /**
     * Perform a fuzzy search on a string
     * @param {string} needle - The search term
     * @param {string} haystack - The string to search in
     * @returns {boolean} True if the search term is found in the string
     */
    match: (needle, haystack) => {
        if (!needle || !haystack) return false;
        
        needle = needle.toLowerCase();
        haystack = haystack.toLowerCase();
        
        let n = 0;
        let h = 0;
        
        while (n < needle.length && h < haystack.length) {
            if (needle[n] === haystack[h]) {
                n++;
            }
            h++;
        }
        
        return n === needle.length;
    },
    
    /**
     * Score a match based on how closely the search term matches the string
     * Lower score is better
     * @param {string} needle - The search term
     * @param {string} haystack - The string to search in
     * @returns {number} The score of the match (lower is better)
     */
    score: (needle, haystack) => {
        if (!needle || !haystack) return Infinity;
        
        needle = needle.toLowerCase();
        haystack = haystack.toLowerCase();
        
        // If exact match at start, best score
        if (haystack.startsWith(needle)) {
            return 0;
        }
        
        // If contains as a substring, good score
        if (haystack.includes(needle)) {
            return 1;
        }
        
        let score = 0;
        let lastIndex = -1;
        let n = 0;
        
        // Calculate score based on character positions and gaps
        for (let i = 0; i < needle.length; i++) {
            const c = needle[i];
            const index = haystack.indexOf(c, lastIndex + 1);
            
            if (index === -1) {
                return Infinity; // Character not found
            }
            
            // Penalize for gaps between characters
            score += (index - lastIndex - 1);
            
            // Penalize more for gaps at the beginning
            if (lastIndex === -1 && index > 0) {
                score += index * 2;
            }
            
            lastIndex = index;
            n++;
        }
        
        return score;
    },
    
    /**
     * Search for items matching the query and sort by relevance
     * @param {string} query - The search query
     * @param {Array} items - The items to search in
     * @param {Function} getSearchableText - Function to get the text to search in from an item
     * @returns {Array} The matching items sorted by relevance
     */
    search: (query, items, getSearchableText) => {
        if (!query || !items || !items.length) {
            return [];
        }
        
        // Filter items that match the query
        const matches = items.filter(item => {
            const text = getSearchableText(item);
            return fuzzySearch.match(query, text);
        });
        
        // Score and sort matches
        return matches.sort((a, b) => {
            const textA = getSearchableText(a);
            const textB = getSearchableText(b);
            const scoreA = fuzzySearch.score(query, textA);
            const scoreB = fuzzySearch.score(query, textB);
            return scoreA - scoreB;
        });
    }
};
