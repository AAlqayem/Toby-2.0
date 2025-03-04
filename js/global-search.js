/**
 * Global search functionality
 */
const globalSearch = {
    isOpen: false,
    lastShiftPressTime: 0,
    shiftPressCount: 0,
    selectedIndex: 0,
    searchResults: [],
    
    /**
     * Initialize global search
     */
    init: () => {
        // Create the search popup element
        globalSearch.createSearchPopup();
        
        // Add event listener for double shift key press
        document.addEventListener('keydown', globalSearch.handleKeyDown);
        document.addEventListener('keyup', globalSearch.handleKeyUp);
        
        // Add event listener for clicks outside the popup
        document.addEventListener('click', globalSearch.handleOutsideClick);
    },
    
    /**
     * Create the search popup element
     */
    createSearchPopup: () => {
        // Create backdrop
        const backdrop = utils.createElement('div', {
            className: 'global-search-backdrop'
        });
        backdrop.style.display = 'none';
        
        // Create the search popup container
        const searchPopup = utils.createElement('div', {
            className: 'global-search-popup'
        });
        searchPopup.style.display = 'none';
        
        // Create the search input
        const searchInputContainer = utils.createElement('div', {
            className: 'global-search-input-container'
        });
        
        const searchIcon = utils.createElement('span', {
            className: 'global-search-icon',
            textContent: '🔍'
        });
        
        const searchInput = utils.createElement('input', {
            className: 'global-search-input'
        });
        searchInput.setAttribute('type', 'text');
        searchInput.setAttribute('placeholder', 'Search across all collections...');
        
        // Create close button
        const closeButton = utils.createElement('div', {
            className: 'global-search-close'
        });
        closeButton.addEventListener('click', globalSearch.closeSearch);
        
        searchInputContainer.appendChild(searchIcon);
        searchInputContainer.appendChild(searchInput);
        
        // Create the results container
        const resultsContainer = utils.createElement('div', {
            className: 'global-search-results'
        });
        
        // Add event listeners
        searchInput.addEventListener('input', utils.debounce(globalSearch.handleSearch, 200));
        searchInput.addEventListener('keydown', globalSearch.handleResultsNavigation);
        
        // Prevent clicks inside the popup from closing it
        searchPopup.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Prevent clicks on backdrop from propagating
        backdrop.addEventListener('click', (e) => {
            e.stopPropagation();
            globalSearch.closeSearch();
        });
        
        // Append elements to the popup
        searchPopup.appendChild(searchInputContainer);
        searchPopup.appendChild(closeButton);
        searchPopup.appendChild(resultsContainer);
        
        // Add the popup and backdrop to the body
        document.body.appendChild(backdrop);
        document.body.appendChild(searchPopup);
        
        // Store references
        globalSearch.popup = searchPopup;
        globalSearch.backdrop = backdrop;
        globalSearch.input = searchInput;
        globalSearch.resultsContainer = resultsContainer;
    },
    
    /**
     * Handle clicks outside the popup
     * @param {MouseEvent} e - Mouse event
     */
    handleOutsideClick: (e) => {
        if (globalSearch.isOpen) {
            globalSearch.closeSearch();
        }
    },
    
    /**
     * Handle key down events for double shift detection
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown: (e) => {
        // Check for Shift key
        if (e.key === 'Shift') {
            const now = Date.now();
            
            // If last shift press was within 500ms, count as double press
            if (now - globalSearch.lastShiftPressTime < 500) {
                globalSearch.shiftPressCount++;
                
                // If double shift detected, open search
                if (globalSearch.shiftPressCount === 2) {
                    globalSearch.openSearch();
                    e.preventDefault();
                    globalSearch.shiftPressCount = 0;
                }
            } else {
                globalSearch.shiftPressCount = 1;
            }
            
            globalSearch.lastShiftPressTime = now;
        }
        
        // Handle Escape key to close search
        if (e.key === 'Escape' && globalSearch.isOpen) {
            globalSearch.closeSearch();
            e.preventDefault();
        }
    },
    
    /**
     * Handle key up events
     */
    handleKeyUp: (e) => {
        // Reset shift press count after a delay
        if (e.key === 'Shift') {
            setTimeout(() => {
                if (Date.now() - globalSearch.lastShiftPressTime > 500) {
                    globalSearch.shiftPressCount = 0;
                }
            }, 500);
        }
    },
    
    /**
     * Open the search popup
     */
    openSearch: () => {
        if (globalSearch.isOpen) return;
        
        // Show the backdrop and popup
        globalSearch.backdrop.style.display = 'block';
        globalSearch.popup.style.display = 'block';
        
        // Trigger reflow to ensure transitions work
        globalSearch.backdrop.offsetHeight;
        globalSearch.popup.offsetHeight;
        
        // Add visible class to trigger animations
        globalSearch.backdrop.classList.add('visible');
        globalSearch.popup.classList.add('visible');
        
        globalSearch.input.value = '';
        globalSearch.input.focus();
        globalSearch.isOpen = true;
        globalSearch.selectedIndex = 0;
        globalSearch.searchResults = [];
        globalSearch.resultsContainer.innerHTML = '';
        
        // Add a class to the body to prevent scrolling
        document.body.classList.add('global-search-open');
    },
    
    /**
     * Close the search popup
     */
    closeSearch: () => {
        if (!globalSearch.isOpen) return;
        
        // Remove visible class to trigger animations
        globalSearch.backdrop.classList.remove('visible');
        globalSearch.popup.classList.remove('visible');
        
        // Wait for animations to complete before hiding
        setTimeout(() => {
            globalSearch.popup.style.display = 'none';
            globalSearch.backdrop.style.display = 'none';
            
            // Clear results
            globalSearch.resultsContainer.innerHTML = '';
        }, 250); // Match the CSS transition duration
        
        globalSearch.isOpen = false;
        globalSearch.selectedIndex = 0;
        globalSearch.searchResults = [];
        
        // Remove the class from the body
        document.body.classList.remove('global-search-open');
    },
    
    /**
     * Handle search input
     */
    handleSearch: () => {
        const query = globalSearch.input.value.trim();
        
        if (!query) {
            globalSearch.resultsContainer.innerHTML = '';
            globalSearch.searchResults = [];
            globalSearch.selectedIndex = 0;
            return;
        }
        
        // Get all items from all collections
        const allItems = [];
        collections.data.forEach(collection => {
            if (collection.items && Array.isArray(collection.items)) {
                collection.items.forEach(item => {
                    allItems.push({
                        ...item,
                        collectionId: collection.id,
                        collectionName: collection.name
                    });
                });
            }
        });
        
        // Perform fuzzy search
        globalSearch.searchResults = fuzzySearch.search(
            query, 
            allItems, 
            item => `${item.title} ${item.url}`
        );
        
        // Render results
        globalSearch.renderResults();
        
        // Select the first result
        globalSearch.selectedIndex = globalSearch.searchResults.length > 0 ? 0 : -1;
        globalSearch.updateSelectedResult();
    },
    
    /**
     * Render search results
     */
    renderResults: () => {
        globalSearch.resultsContainer.innerHTML = '';
        
        if (globalSearch.searchResults.length === 0) {
            const noResults = utils.createElement('div', {
                className: 'global-search-no-results',
                textContent: 'No results found'
            });
            globalSearch.resultsContainer.appendChild(noResults);
            return;
        }
        
        globalSearch.searchResults.forEach((item, index) => {
            const resultItem = utils.createElement('div', {
                className: 'global-search-result-item'
            });
            
            // Add data attribute for identification
            resultItem.setAttribute('data-index', index);
            
            // Create favicon
            const favicon = utils.createElement('img', {
                className: 'favicon'
            });
            favicon.src = item.favicon || 'icons/default-favicon.png';
            favicon.addEventListener('error', (e) => {
                e.target.src = 'icons/default-favicon.png';
            });
            
            // Create title
            const title = utils.createElement('div', {
                className: 'global-search-result-title',
                textContent: item.title
            });
            
            // Create collection name
            const collection = utils.createElement('div', {
                className: 'global-search-result-collection',
                textContent: item.collectionName
            });
            
            // Create URL
            const url = utils.createElement('div', {
                className: 'global-search-result-url',
                textContent: item.url
            });
            
            // Append elements
            resultItem.appendChild(favicon);
            
            const contentContainer = utils.createElement('div', {
                className: 'global-search-result-content'
            });
            contentContainer.appendChild(title);
            contentContainer.appendChild(url);
            
            resultItem.appendChild(contentContainer);
            resultItem.appendChild(collection);
            
            // Add click event
            resultItem.addEventListener('click', () => {
                globalSearch.openResult(item);
            });
            
            // Add mouseover event to update selection
            resultItem.addEventListener('mouseover', () => {
                globalSearch.selectedIndex = index;
                globalSearch.updateSelectedResult();
            });
            
            globalSearch.resultsContainer.appendChild(resultItem);
            
            // Stagger the animation of each result item
            setTimeout(() => {
                resultItem.classList.add('animated');
            }, 50 * index);
        });
    },
    
    /**
     * Handle keyboard navigation in results
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleResultsNavigation: (e) => {
        if (globalSearch.searchResults.length === 0) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                globalSearch.selectedIndex = Math.min(
                    globalSearch.selectedIndex + 1, 
                    globalSearch.searchResults.length - 1
                );
                globalSearch.updateSelectedResult();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                globalSearch.selectedIndex = Math.max(globalSearch.selectedIndex - 1, 0);
                globalSearch.updateSelectedResult();
                break;
                
            case 'Enter':
                e.preventDefault();
                if (globalSearch.selectedIndex >= 0 && 
                    globalSearch.selectedIndex < globalSearch.searchResults.length) {
                    globalSearch.openResult(globalSearch.searchResults[globalSearch.selectedIndex]);
                }
                break;
        }
    },
    
    /**
     * Update the selected result
     */
    updateSelectedResult: () => {
        // Remove selected class from all results
        const allResults = globalSearch.resultsContainer.querySelectorAll('.global-search-result-item');
        allResults.forEach(result => {
            result.classList.remove('selected');
        });
        
        // Add selected class to the selected result
        if (globalSearch.selectedIndex >= 0 && 
            globalSearch.selectedIndex < globalSearch.searchResults.length) {
            const selectedResult = globalSearch.resultsContainer.querySelector(
                `.global-search-result-item[data-index="${globalSearch.selectedIndex}"]`
            );
            
            if (selectedResult) {
                selectedResult.classList.add('selected');
                
                // Scroll into view if needed
                const containerRect = globalSearch.resultsContainer.getBoundingClientRect();
                const resultRect = selectedResult.getBoundingClientRect();
                
                if (resultRect.bottom > containerRect.bottom) {
                    selectedResult.scrollIntoView({ block: 'end', behavior: 'smooth' });
                } else if (resultRect.top < containerRect.top) {
                    selectedResult.scrollIntoView({ block: 'start', behavior: 'smooth' });
                }
            }
        }
    },
    
    /**
     * Open a result
     * @param {Object} item - The item to open
     */
    openResult: (item) => {
        if (item && item.url) {
            // Add a small animation before opening
            const resultElement = globalSearch.resultsContainer.querySelector(
                `.global-search-result-item[data-index="${globalSearch.selectedIndex}"]`
            );
            
            if (resultElement) {
                resultElement.style.transform = 'scale(0.95)';
                resultElement.style.opacity = '0.8';
                
                setTimeout(() => {
                    window.open(item.url, '_blank');
                    globalSearch.closeSearch();
                }, 150);
            } else {
                window.open(item.url, '_blank');
                globalSearch.closeSearch();
            }
        }
    }
};
