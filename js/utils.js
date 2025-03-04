const utils = {
    /**
     * Generate a unique ID
     * @returns {string} Unique ID
     */
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Create an element with given properties
     * @param {string} tag - HTML tag name
     * @param {Object} props - Properties to set on the element
     * @returns {HTMLElement} Created element
     */
    createElement: (tag, props = {}) => {
        const element = document.createElement(tag);
        
        // Handle standard properties
        Object.entries(props).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'src' || key === 'href' || key === 'type' || key === 'value' || key === 'title') {
                // Handle safe attributes
                element.setAttribute(key, value);
            } else if (key === 'data-id') {
                element.setAttribute('data-id', value);
            }
        });

        return element;
    },

    /**
     * Add drag and drop functionality to an element
     * @param {HTMLElement} element - Element to make draggable
     * @param {Object} data - Data to transfer
     */
    makeDraggable: (element, data) => {
        element.setAttribute('draggable', true);
        element.addEventListener('dragstart', (e) => {
            // Stop propagation to prevent parent elements from also being dragged
            e.stopPropagation();
            
            e.dataTransfer.setData('text/plain', JSON.stringify(data));
            element.classList.add('dragging');
            
            // Add a visual indicator that this item is being dragged
            setTimeout(() => {
                element.style.opacity = '0.4';
            }, 0);
        });
        
        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
            element.style.opacity = '1';
        });
    },

    /**
     * Make an element a drop target
     * @param {HTMLElement} element - Element to make droppable
     * @param {Function} onDrop - Callback function when item is dropped
     */
    makeDroppable: (element, onDrop) => {
        let dragLeaveTimer;
        
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            clearTimeout(dragLeaveTimer);
            element.classList.add('drag-over');
            
            // Add drag-target class to collections when dragging over
            if (element.classList.contains('collection')) {
                element.classList.add('drag-target');
            }
        });

        element.addEventListener('dragleave', () => {
            // Add a short delay before removing the class to prevent flickering
            dragLeaveTimer = setTimeout(() => {
                element.classList.remove('drag-over');
                element.classList.remove('drag-target');
            }, 50); // 50ms delay
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            clearTimeout(dragLeaveTimer);
            element.classList.remove('drag-over');
            element.classList.remove('drag-target');
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                onDrop(data);
            } catch (error) {
                console.error('Error handling drop:', error);
            }
        });
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}; 