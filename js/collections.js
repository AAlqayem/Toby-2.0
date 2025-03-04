const collections = {
    data: [],
    selectedItem: null,
    collapsedCollections: {}, // Store collapsed state of collections

    /**
     * Initialize collections
     */
    init: async () => {
        try {
            const result = await storage.load('collections');
            collections.data = result?.collections || [];
            
            // Load collapsed state
            const collapsedState = await storage.load('collapsedCollections');
            collections.collapsedCollections = collapsedState?.collapsedCollections || {};
            
            collections.render();

            // Set up new collection button
            const newCollectionBtn = document.getElementById('newCollection');
            if (newCollectionBtn) {
                newCollectionBtn.addEventListener('click', collections.showCreateModal);
            }

            // Make collections container droppable
            const collectionsContainer = document.getElementById('collections');
            if (collectionsContainer) {
                utils.makeDroppable(collectionsContainer, collections.handleDrop);
                
                // Variables for auto-scrolling during drag
                let autoScrollInterval = null;
                const scrollThreshold = 300; 
                let isDragging = false; // Track if we're currently dragging a collection
                
                // Function to determine scroll speed based on distance from edge
                const getScrollSpeed = (distance, threshold) => {
                    // Calculate a value between 5 and 20 based on how close to the edge
                    // Closer to edge = faster scrolling
                    const maxSpeed = 25; 
                    const minSpeed = 5;
                    const speedRange = maxSpeed - minSpeed;
                    
                    // Convert distance to a percentage of the threshold (0 = at edge, 1 = at threshold)
                    const percentage = Math.min(distance / threshold, 1);
                    
                    // Invert and scale: 0% distance = max speed, 100% distance = min speed
                    return Math.floor(maxSpeed - (percentage * speedRange));
                };
                
                // Function to handle auto-scrolling
                const handleAutoScroll = (e) => {
                    // Only process if we're dragging
                    if (!isDragging) return;
                    
                    // Get window dimensions and mouse position
                    const windowHeight = window.innerHeight;
                    const mouseY = e.clientY;
                    
                    // Clear any existing scroll interval
                    if (autoScrollInterval) {
                        clearInterval(autoScrollInterval);
                        autoScrollInterval = null;
                    }
                    
                    // If near top of window, scroll up
                    if (mouseY < scrollThreshold) {
                        const distanceFromEdge = mouseY;
                        const speed = getScrollSpeed(distanceFromEdge, scrollThreshold);
                        
                        autoScrollInterval = setInterval(() => {
                            collectionsContainer.scrollTop -= speed;
                            // Stop scrolling if we've reached the top
                            if (collectionsContainer.scrollTop <= 0) {
                                clearInterval(autoScrollInterval);
                                autoScrollInterval = null;
                            }
                        }, 20);
                    } 
                    // If near bottom of window, scroll down
                    else if (mouseY > windowHeight - scrollThreshold) {
                        const distanceFromEdge = windowHeight - mouseY;
                        const speed = getScrollSpeed(distanceFromEdge, scrollThreshold);
                        
                        autoScrollInterval = setInterval(() => {
                            collectionsContainer.scrollTop += speed;
                            // Stop scrolling if we've reached the bottom
                            if (collectionsContainer.scrollTop + collectionsContainer.clientHeight >= collectionsContainer.scrollHeight) {
                                clearInterval(autoScrollInterval);
                                autoScrollInterval = null;
                            }
                        }, 20);
                    }
                };
                
                // Add ability to reorder collections with drag-and-drop
                collectionsContainer.addEventListener('dragover', (e) => {
                    // Only handle collection drags here
                    const draggedItem = document.querySelector('.collection.dragging');
                    if (!draggedItem) return;
                    
                    e.preventDefault();
                    
                    // Handle auto-scrolling
                    handleAutoScroll(e);
                    
                    // Find the collection we're dragging over
                    const allCollections = [...collectionsContainer.querySelectorAll('.collection:not(.dragging)')];
                    const closestCollection = allCollections.reduce((closest, child) => {
                        const box = child.getBoundingClientRect();
                        const offset = e.clientY - (box.top + box.height / 2);
                        
                        if (offset < 0 && offset > closest.offset) {
                            return { offset, element: child };
                        } else {
                            return closest;
                        }
                    }, { offset: Number.NEGATIVE_INFINITY }).element;
                    
                    // Remove existing drop indicators
                    const existingIndicator = document.querySelector('.collection-drop-indicator');
                    if (existingIndicator) {
                        existingIndicator.remove();
                    }
                    
                    if (closestCollection) {
                        // Create drop indicator
                        const indicator = utils.createElement('div', {
                            className: 'collection-drop-indicator'
                        });
                        collectionsContainer.insertBefore(indicator, closestCollection);
                        
                        // Position the dragged item without changing its collapsed state
                        closestCollection.before(draggedItem);
                    } else if (allCollections.length > 0) {
                        // If we're at the end of the list
                        const lastCollection = allCollections[allCollections.length - 1];
                        
                        // Create drop indicator
                        const indicator = utils.createElement('div', {
                            className: 'collection-drop-indicator'
                        });
                        lastCollection.after(indicator);
                        lastCollection.after(draggedItem);
                    }
                    
                    // Update data array immediately to match DOM order
                    collections.data = [...document.querySelectorAll('.collection')].map(
                        el => collections.data.find(c => c.id === el.dataset.id)
                    ).filter(Boolean);
                });
                
                // Handle dragging outside the container - add event listener to the document
                document.addEventListener('dragover', (e) => {
                    // Only process if we have a dragging collection
                    const draggedItem = document.querySelector('.collection.dragging');
                    if (!draggedItem) return;
                    
                    e.preventDefault();
                    handleAutoScroll(e);
                });
                
                // Stop auto-scrolling when dragging ends or leaves the container
                collectionsContainer.addEventListener('dragleave', () => {
                    // Don't clear interval here as we want scrolling to continue 
                    // even if mouse leaves the container
                });
                
                // Function to start dragging
                const startDragging = () => {
                    isDragging = true;
                };
                
                // Function to stop dragging
                const stopDragging = () => {
                    isDragging = false;
                    if (autoScrollInterval) {
                        clearInterval(autoScrollInterval);
                        autoScrollInterval = null;
                    }
                };
                
                collectionsContainer.addEventListener('dragstart', startDragging);
                collectionsContainer.addEventListener('dragend', (e) => {
                    stopDragging();
                    
                    const indicator = document.querySelector('.collection-drop-indicator');
                    if (indicator) {
                        indicator.remove();
                    }
                    collections.save();
                });
                
                // Also handle drop to stop auto-scrolling
                collectionsContainer.addEventListener('drop', stopDragging);
                
                // Handle document-level dragend and drop events to ensure cleanup
                document.addEventListener('dragstart', startDragging);
                document.addEventListener('dragend', stopDragging);
                document.addEventListener('drop', stopDragging);
            }

            // Add keyboard event listener for reordering
            document.addEventListener('keydown', collections.handleKeyPress);
            
            // Add click event listener to deselect items when clicking outside
            document.addEventListener('click', collections.handleDocumentClick);
        } catch (error) {
            console.error('Error initializing collections:', error);
            collections.data = [];
        }
    },

    /**
     * Handle keyboard events for reordering
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyPress: async (e) => {
        if (!collections.selectedItem) return;

        const { collectionId, itemId } = collections.selectedItem;
        const collection = collections.data.find(c => c.id === collectionId);
        if (!collection) return;

        const currentIndex = collection.items.findIndex(item => item.id === itemId);
        if (currentIndex === -1) return;

        let newIndex = currentIndex;

        if (e.key === 'ArrowLeft' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else if (e.key === 'ArrowRight' && currentIndex < collection.items.length - 1) {
            newIndex = currentIndex + 1;
        } else {
            return;
        }

        // Get the current item element and its container
        const itemsContainer = document.querySelector(`.collection[data-id="${collectionId}"] .collection-items`);
        const currentItem = itemsContainer.querySelector(`.item[data-id="${itemId}"]`);
        const targetItem = Array.from(itemsContainer.children)[newIndex];
        if (!currentItem || !targetItem || !itemsContainer) return;

        // Calculate positions for smooth animation
        const currentRect = currentItem.getBoundingClientRect();
        const targetRect = targetItem.getBoundingClientRect();
        const deltaX = targetRect.left - currentRect.left;
        const deltaY = targetRect.top - currentRect.top;

        // Animate current item
        currentItem.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        currentItem.classList.add('reordering');

        // Animate target item
        targetItem.style.transform = `translate(${-deltaX}px, ${-deltaY}px)`;
        targetItem.classList.add('reordering');

        // Update data array
        const [item] = collection.items.splice(currentIndex, 1);
        collection.items.splice(newIndex, 0, item);

        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, 200));

        // Update DOM without re-rendering
        if (newIndex > currentIndex) {
            targetItem.insertAdjacentElement('afterend', currentItem);
        } else {
            targetItem.insertAdjacentElement('beforebegin', currentItem);
        }

        // Reset transforms
        currentItem.style.transform = '';
        targetItem.style.transform = '';
        currentItem.classList.remove('reordering');
        targetItem.classList.remove('reordering');

        // Save changes
        await collections.save();
    },

    /**
     * Handle document click to deselect items
     * @param {MouseEvent} e - Mouse event
     */
    handleDocumentClick: (e) => {
        // If no item is selected, do nothing
        if (!collections.selectedItem) return;
        
        // Check if click was on an item or its child elements
        const clickedOnItem = e.target.closest('.item');
        const clickedOnSelectBtn = e.target.closest('.select-btn');
        
        // If clicked outside an item or on a different item than the selected one, deselect
        if (!clickedOnItem && !clickedOnSelectBtn) {
            collections.deselectItem();
        }
    },
    
    /**
     * Deselect the currently selected item
     */
    deselectItem: () => {
        // Clear previous selection
        const previousSelected = document.querySelector('.item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }
        
        // Reset selected item
        collections.selectedItem = null;
    },

    /**
     * Select an item
     * @param {string} collectionId - Collection ID
     * @param {string} itemId - Item ID
     */
    selectItem: (collectionId, itemId) => {
        // Check if the same item is being selected again
        if (collections.selectedItem && 
            collections.selectedItem.collectionId === collectionId && 
            collections.selectedItem.itemId === itemId) {
            // If the same item is clicked, deselect it
            collections.deselectItem();
            return;
        }
        
        // Clear previous selection
        const previousSelected = document.querySelector('.item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        // Update selected item
        collections.selectedItem = { collectionId, itemId };

        // Add selected class to new item
        const newSelected = document.querySelector(`.item[data-id="${itemId}"]`);
        if (newSelected) {
            newSelected.classList.add('selected');
        }
    },

    /**
     * Show create collection modal
     */
    showCreateModal: () => {
        const modal = collections.createModal('Create New Collection', '', (name) => {
            collections.create(name);
        });
        document.body.appendChild(modal);
    },

    /**
     * Show edit collection modal
     * @param {string} id - Collection ID
     * @param {string} currentName - Current collection name
     */
    showEditModal: (id, currentName) => {
        const modal = collections.createModal('Edit Collection', currentName, (name) => {
            collections.update(id, { name });
        });
        document.body.appendChild(modal);
    },

    /**
     * Show edit item modal
     * @param {string} collectionId - Collection ID
     * @param {string} itemId - Item ID
     * @param {Object} currentItem - Current item data
     */
    showEditItemModal: (collectionId, itemId, currentItem) => {
        const modal = collections.createItemModal('Edit Item', currentItem, (item) => {
            collections.updateItem(collectionId, itemId, item);
        });
        document.body.appendChild(modal);
    },

    /**
     * Create a modal element
     * @param {string} title - Modal title
     * @param {string} defaultValue - Default input value
     * @param {Function} onConfirm - Callback function when confirmed
     * @returns {HTMLElement} Modal element
     */
    createModal: (title, defaultValue, onConfirm) => {
        const overlay = utils.createElement('div', { className: 'modal-overlay' });
        const modal = utils.createElement('div', { className: 'modal' });

        const header = utils.createElement('div', { className: 'modal-header' });
        const titleEl = utils.createElement('h3', {
            className: 'modal-title',
            textContent: title
        });
        header.appendChild(titleEl);

        const content = utils.createElement('div', { className: 'modal-content' });
        const input = utils.createElement('input', {
            className: 'modal-input',
            type: 'text',
            value: defaultValue,
            placeholder: 'Enter name'
        });
        content.appendChild(input);

        const actions = utils.createElement('div', { className: 'modal-actions' });
        const cancelBtn = utils.createElement('button', {
            className: 'modal-button cancel',
            textContent: 'Cancel'
        });
        const confirmBtn = utils.createElement('button', {
            className: 'modal-button confirm',
            textContent: 'Confirm'
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);

        modal.appendChild(header);
        modal.appendChild(content);
        modal.appendChild(actions);
        overlay.appendChild(modal);

        const closeModal = () => {
            document.body.removeChild(overlay);
        };

        cancelBtn.addEventListener('click', closeModal);
        confirmBtn.addEventListener('click', () => {
            const value = input.value.trim();
            if (value) {
                onConfirm(value);
                closeModal();
            }
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const value = input.value.trim();
                if (value) {
                    onConfirm(value);
                    closeModal();
                }
            }
        });

        return overlay;
    },

    /**
     * Create a modal for editing items
     * @param {string} title - Modal title
     * @param {Object} currentItem - Current item data
     * @param {Function} onConfirm - Callback function when confirmed
     * @returns {HTMLElement} Modal element
     */
    createItemModal: (title, currentItem, onConfirm) => {
        const overlay = utils.createElement('div', { className: 'modal-overlay' });
        const modal = utils.createElement('div', { className: 'modal' });

        const header = utils.createElement('div', { className: 'modal-header' });
        const titleEl = utils.createElement('h3', {
            className: 'modal-title',
            textContent: title
        });
        header.appendChild(titleEl);

        const content = utils.createElement('div', { className: 'modal-content' });
        
        const titleInput = utils.createElement('input', {
            className: 'modal-input',
            type: 'text',
            value: currentItem.title,
            placeholder: 'Enter title'
        });

        const urlInput = utils.createElement('input', {
            className: 'modal-input',
            type: 'text',
            value: currentItem.url,
            placeholder: 'Enter URL'
        });

        content.appendChild(titleInput);
        content.appendChild(urlInput);

        const actions = utils.createElement('div', { className: 'modal-actions' });
        const cancelBtn = utils.createElement('button', {
            className: 'modal-button cancel',
            textContent: 'Cancel'
        });
        const confirmBtn = utils.createElement('button', {
            className: 'modal-button confirm',
            textContent: 'Confirm'
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);

        modal.appendChild(header);
        modal.appendChild(content);
        modal.appendChild(actions);
        overlay.appendChild(modal);

        const closeModal = () => {
            document.body.removeChild(overlay);
        };

        cancelBtn.addEventListener('click', closeModal);
        confirmBtn.addEventListener('click', () => {
            const title = titleInput.value.trim();
            const url = urlInput.value.trim();
            if (title && url) {
                onConfirm({ title, url, favicon: currentItem.favicon });
                closeModal();
            }
        });

        return overlay;
    },

    /**
     * Create a new collection
     * @param {string} name - Collection name
     */
    create: async (name) => {
        try {
            if (!name) return;
            
            const newCollection = {
                id: utils.generateId(),
                name,
                items: []
            };
            
            // Add to beginning of array instead of end
            collections.data.unshift(newCollection);
            
            await collections.save();
            collections.render();
        } catch (error) {
            console.error('Error creating collection:', error);
        }
    },

    /**
     * Delete a collection
     * @param {string} id - Collection ID
     */
    delete: async (id) => {
        try {
            const collectionIndex = collections.data.findIndex(c => c.id === id);
            
            if (collectionIndex === -1) {
                console.error('Collection not found:', id);
                return;
            }
            
            const collection = collections.data[collectionIndex];
            
            // Initial confirmation with collection name
            const confirmDelete = confirm(`Are you sure you want to delete the collection "${collection.name}"?`);
            
            if (!confirmDelete) {
                return;
            }
            
            // Additional warning if collection has items
            if (collection.items && collection.items.length > 0) {
                const itemCount = collection.items.length;
                const confirmWithItems = confirm(`This collection contains ${itemCount} item${itemCount !== 1 ? 's' : ''}. Are you sure you want to delete it?`);
                
                if (!confirmWithItems) {
                    return;
                }
            }
            
            collections.data = collections.data.filter(c => c.id !== id);
            await collections.save();
            collections.render();
        } catch (error) {
            console.error('Error deleting collection:', error);
        }
    },

    /**
     * Update a collection
     * @param {string} id - Collection ID
     * @param {Object} updates - Updates to apply
     */
    update: async (id, updates) => {
        try {
            collections.data = collections.data.map(c => 
                c.id === id ? { ...c, ...updates } : c
            );
            await collections.save();
            collections.render();
        } catch (error) {
            console.error('Error updating collection:', error);
        }
    },

    /**
     * Add item to collection
     * @param {string} collectionId - Collection ID
     * @param {Object} item - Item to add
     * @param {boolean} [checkDuplicates=true] - Whether to check for duplicates
     */
    addItem: async (collectionId, item, checkDuplicates = true) => {
        try {
            const collection = collections.data.find(c => c.id === collectionId);
            if (collection) {
                // Check for duplicates within the same collection
                if (checkDuplicates) {
                    const duplicate = collection.items.find(i => i.url === item.url);
                    if (duplicate) {
                        console.log('Item already exists in this collection');
                        return; // Item already exists in this collection
                    }
                    
                    // Check other collections and remove duplicates if they exist
                    for (const otherCollection of collections.data) {
                        if (otherCollection.id !== collectionId) {
                            const duplicateIndex = otherCollection.items.findIndex(i => i.url === item.url);
                            if (duplicateIndex !== -1) {
                                // Remove the item from the other collection
                                otherCollection.items.splice(duplicateIndex, 1);
                            }
                        }
                    }
                }
                
                // Add the item to the target collection
                collection.items.push({
                    id: utils.generateId(),
                    ...item
                });
                await collections.save();
                collections.render();
            }
        } catch (error) {
            console.error('Error adding item to collection:', error);
        }
    },

    /**
     * Remove item from collection
     * @param {string} collectionId - Collection ID
     * @param {string} itemId - Item ID
     */
    removeItem: async (collectionId, itemId) => {
        try {
            const collection = collections.data.find(c => c.id === collectionId);
            if (!collection) {
                console.error('Collection not found:', collectionId);
                return;
            }
            
            const item = collection.items.find(i => i.id === itemId);
            if (!item) {
                console.error('Item not found in collection:', itemId);
                return;
            }
            
            // Show confirmation dialog
            const confirmRemoval = confirm(`Are you sure you want to remove "${item.title}" from "${collection.name}"?`);
            
            if (confirmRemoval) {
                collection.items = collection.items.filter(item => item.id !== itemId);
                await collections.save();
                collections.render();
            }
        } catch (error) {
            console.error('Error removing item from collection:', error);
        }
    },

    /**
     * Handle drop event
     * @param {Object} data - Dropped data
     */
    handleDrop: (data) => {
        try {
            if (data.type === 'tab') {
                collections.addItem(data.targetCollectionId, {
                    title: data.title,
                    url: data.url,
                    favicon: data.favicon
                });
            } else if (data.type === 'item') {
                // If this is an item from another collection
                if (data.collectionId !== data.targetCollectionId) {
                    // First, get the item data from the source collection
                    const sourceCollection = collections.data.find(c => c.id === data.collectionId);
                    const targetCollection = collections.data.find(c => c.id === data.targetCollectionId);
                    
                    if (sourceCollection && targetCollection) {
                        const itemIndex = sourceCollection.items.findIndex(item => item.id === data.itemId);
                        if (itemIndex !== -1) {
                            const item = sourceCollection.items[itemIndex];
                            
                            // Add item to target collection (will handle duplicate check)
                            collections.addItem(data.targetCollectionId, {
                                title: item.title,
                                url: item.url,
                                favicon: item.favicon
                            });
                            
                            // Remove item from source collection
                            sourceCollection.items.splice(itemIndex, 1);
                            collections.save();
                            
                            // Show notification
                            collections.showNotification(
                                `Moved "${item.title}" from "${sourceCollection.name}" to "${targetCollection.name}"`,
                                'success'
                            );
                            // Rendering will happen in addItem
                        }
                    }
                }
            } else if (data.type === 'collection') {
                // Collection reordering is handled by event listeners in init
                // This is just for completeness if we need to handle collection drops elsewhere
                collections.save();
            }
        } catch (error) {
            console.error('Error handling drop:', error);
            collections.showNotification('Error moving item', 'error');
        }
    },

    /**
     * Toggle collapse state of a collection
     * @param {string} collectionId - Collection ID
     */
    toggleCollapse: function(collectionId) {
        const collectionEl = document.querySelector(`.collection[data-id="${collectionId}"]`);
        if (!collectionEl) return;
        
        // Prevent multiple toggle actions during animation
        if (collectionEl.classList.contains('expanding') || 
            collectionEl.classList.contains('collapsing')) {
            return;
        }
        
        // Get the items container
        const itemsContainer = collectionEl.querySelector('.collection-items');
        if (!itemsContainer) return;
        
        // Get current state
        const isCollapsed = collectionEl.classList.contains('collapsed');
        
        // Update collapse icon immediately
        const collapseIcon = collectionEl.querySelector('.collapse-icon');
        if (collapseIcon) {
            collapseIcon.title = isCollapsed ? 'Collapse' : 'Expand';
            collapseIcon.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
            collapseIcon.setAttribute('aria-label', isCollapsed ? 'Collapse collection' : 'Expand collection');
        }
        
        if (isCollapsed) {
            // If expanding
            
            // Reset any inline styles that may have been set during initial render
            itemsContainer.style.removeProperty('max-height');
            itemsContainer.style.removeProperty('opacity');
            
            // Set item indices for staggered animation
            const items = collectionEl.querySelectorAll('.item');
            items.forEach((item, index) => {
                item.style.setProperty('--item-index', index);
            });
            
            // Begin the expand animation
            collectionEl.classList.add('expanding');
            collectionEl.classList.remove('collapsed');
            
            // Remove expanding class after animation completes
            setTimeout(() => {
                collectionEl.classList.remove('expanding');
            }, 400); // Slightly longer than the animation duration
        } else {
            // If collapsing
            
            // Begin the collapse animation
            collectionEl.classList.add('collapsing');
            
            // Add the collapsed class after a short delay
            setTimeout(() => {
                collectionEl.classList.add('collapsed');
                
                // Remove collapsing class after animation completes
                setTimeout(() => {
                    collectionEl.classList.remove('collapsing');
                }, 200);
            }, 10);
        }
        
        // Update our storage
        collections.collapsedCollections[collectionId] = !isCollapsed;
        collections.save();
    },

    /**
     * Save collections to storage
     */
    save: async () => {
        try {
            await storage.save({ collections: collections.data });
            await storage.save({ collapsedCollections: collections.collapsedCollections });
        } catch (error) {
            console.error('Error saving collections:', error);
        }
    },

    /**
     * Update an item in a collection
     * @param {string} collectionId - Collection ID
     * @param {string} itemId - Item ID
     * @param {Object} updates - Updates to apply
     */
    updateItem: async (collectionId, itemId, updates) => {
        try {
            const collection = collections.data.find(c => c.id === collectionId);
            if (collection) {
                collection.items = collection.items.map(item =>
                    item.id === itemId ? { ...item, ...updates } : item
                );
                await collections.save();
                collections.render();
            }
        } catch (error) {
            console.error('Error updating item:', error);
        }
    },

    /**
     * Show a notification message
     * @param {string} message - Message to show
     * @param {string} type - Type of notification ('success', 'error', 'info')
     */
    showNotification: (message, type = 'info') => {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = utils.createElement('div', {
                className: 'notification',
                id: 'notification'
            });
            document.body.appendChild(notification);
        }

        // Set notification content and type
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';

        // Automatically hide after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.style.display = 'none';
                notification.style.opacity = '1';
            }, 300);
        }, 3000);
    },

    /**
     * Render collections
     */
    render: () => {
        try {
            const container = document.getElementById('collections');
            if (!container) return;
            
            container.innerHTML = '';

            if (!Array.isArray(collections.data)) {
                collections.data = [];
                return;
            }

            collections.data.forEach(collection => {
                const collectionEl = utils.createElement('div', {
                    className: 'collection',
                    'data-id': collection.id
                });
                
                // Create collection items container first but don't add it yet
                const collectionItems = utils.createElement('div', {
                    className: 'collection-items'
                });
                
                // Pre-hide content of collapsed collections before adding to DOM
                // This prevents the flash of content on page load
                if (collections.collapsedCollections[collection.id]) {
                    // Add collapsed class right away to prevent flash
                    collectionEl.classList.add('collapsed');
                    // Set initial state of collection items
                    collectionItems.style.maxHeight = '0';
                    collectionItems.style.opacity = '0';
                }
                
                const header = utils.createElement('div', {
                    className: 'collection-header'
                });

                // Make only the header draggable for collection reordering
                header.setAttribute('draggable', true);
                header.addEventListener('dragstart', (e) => {
                    // Store the initial state before dragging starts
                    const wasCollapsed = collectionEl.classList.contains('collapsed');
                    collectionEl.dataset.wasCollapsed = wasCollapsed ? 'true' : 'false';
                    
                    collectionEl.classList.add('dragging');
                    // Set data for compatibility with dropzones
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'collection',
                        collectionId: collection.id
                    }));
                    
                    // Delay to ensure drag effect is visible
                    setTimeout(() => {
                        collectionEl.style.opacity = '0.4';
                    }, 0);
                });
                
                header.addEventListener('dragend', () => {
                    collectionEl.classList.remove('dragging');
                    collectionEl.style.opacity = '1';
                    
                    // Restore collapsed state if necessary
                    const wasCollapsed = collectionEl.dataset.wasCollapsed === 'true';
                    if (wasCollapsed && !collectionEl.classList.contains('collapsed')) {
                        collectionEl.classList.add('collapsed');
                    } else if (!wasCollapsed && collectionEl.classList.contains('collapsed')) {
                        collectionEl.classList.remove('collapsed');
                    }
                    
                    collections.save(); // Save the new order
                });

                const titleContainer = utils.createElement('div', {
                    className: 'collection-title-container',
                    style: 'display: flex; align-items: center; gap: 8px;'
                });

                const title = utils.createElement('div', {
                    className: 'collection-title',
                    textContent: collection.name
                });

                titleContainer.appendChild(title);

                const buttonsContainer = utils.createElement('div', {
                    className: 'collection-header-buttons'
                });

                const editBtn = utils.createElement('button', {
                    className: 'edit-collection btn-ripple',
                    textContent: '✎',
                    title: 'Edit collection'
                });

                const deleteBtn = utils.createElement('button', {
                    className: 'delete-collection btn-ripple',
                    textContent: '🗑️',
                    title: 'Delete collection'
                });

                const collapseIcon = utils.createElement('button', {
                    className: 'collapse-icon btn-ripple',
                    textContent: '▼',
                    title: collections.collapsedCollections[collection.id] ? 'Expand' : 'Collapse',
                    'aria-expanded': collections.collapsedCollections[collection.id] ? 'false' : 'true',
                    'aria-label': collections.collapsedCollections[collection.id] ? 'Expand collection' : 'Collapse collection'
                });

                collapseIcon.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent other click handlers
                    collections.toggleCollapse(collection.id);
                });

                // Also allow clicking on the collection header to toggle collapse
                titleContainer.addEventListener('dblclick', (e) => {
                    collections.toggleCollapse(collection.id);
                });

                editBtn.addEventListener('click', () => collections.showEditModal(collection.id, collection.name));
                deleteBtn.addEventListener('click', () => {
                    collections.delete(collection.id);
                });

                buttonsContainer.appendChild(editBtn);
                buttonsContainer.appendChild(deleteBtn);
                buttonsContainer.appendChild(collapseIcon);

                header.appendChild(titleContainer);
                header.appendChild(buttonsContainer);

                collectionEl.appendChild(header);
                collectionEl.appendChild(collectionItems);

                if (Array.isArray(collection.items)) {
                    collection.items.forEach(item => {
                        const itemEl = utils.createElement('div', {
                            className: `item${collections.selectedItem?.itemId === item.id ? ' selected' : ''}`,
                            'data-id': item.id
                        });
                        
                        const favicon = utils.createElement('img', {
                            className: 'favicon',
                            src: item.favicon || 'icons/default-favicon.png'
                        });

                        favicon.addEventListener('error', (e) => {
                            e.target.src = 'icons/default-favicon.png';
                        });

                        const itemTitle = utils.createElement('span', {
                            className: 'title',
                            textContent: item.title
                        });

                        const selectBtn = utils.createElement('button', {
                            className: 'select-btn',
                            textContent: '⋮',
                            title: 'Select for reordering'
                        });

                        selectBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            collections.selectItem(collection.id, item.id);
                        });

                        const editBtn = utils.createElement('button', {
                            className: 'edit-btn',
                            textContent: '✎'
                        });

                        editBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            collections.showEditItemModal(collection.id, item.id, item);
                        });

                        const removeBtn = utils.createElement('button', {
                            className: 'remove-item',
                            textContent: '×'
                        });

                        removeBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            collections.removeItem(collection.id, item.id);
                        });

                        itemEl.appendChild(favicon);
                        itemEl.appendChild(itemTitle);
                        itemEl.appendChild(selectBtn);
                        itemEl.appendChild(editBtn);
                        itemEl.appendChild(removeBtn);

                        itemEl.addEventListener('click', () => {
                            chrome.tabs.create({ url: item.url });
                        });

                        // Make item draggable
                        utils.makeDraggable(itemEl, {
                            type: 'item',
                            collectionId: collection.id,
                            itemId: item.id,
                            title: item.title,
                            url: item.url,
                            favicon: item.favicon
                        });

                        collectionItems.appendChild(itemEl);
                    });
                }

                container.appendChild(collectionEl);

                utils.makeDroppable(collectionEl, (data) => {
                    // Pass the collection id to the handleDrop function
                    data.targetCollectionId = collection.id;
                    collections.handleDrop(data);
                });
            });
        } catch (error) {
            console.error('Error rendering collections:', error);
        }
    },

    /**
     * Export collections to JSON file
     */
    exportCollections: () => {
        try {
            // Create a JSON string of the collections data
            const collectionsData = JSON.stringify(collections.data, null, 2);
            
            // Create a Blob with the JSON data
            const blob = new Blob([collectionsData], { type: 'application/json' });
            
            // Create a URL for the Blob
            const url = URL.createObjectURL(blob);
            
            // Create a temporary anchor element to trigger the download
            const a = document.createElement('a');
            a.href = url;
            a.download = `toby-collections-${new Date().toISOString().split('T')[0]}.json`;
            
            // Append the anchor to the body, click it, and remove it
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('Error exporting collections:', error);
            alert('Failed to export collections. Please try again.');
        }
    },

    /**
     * Import collections from JSON file
     */
    importCollections: () => {
        try {
            // Create a file input element
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            
            // Add change event listener to handle the selected file
            fileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                // Read the file content
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        // Parse the JSON data
                        const rawData = JSON.parse(e.target.result);
                        let importedData;
                        
                        // Helper function to extract domain and create favicon
                        const createFaviconFromUrl = (urlString) => {
                            try {
                                const url = new URL(urlString);
                                const domain = url.hostname;
                                return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                            } catch (error) {
                                console.warn('Error generating favicon for URL:', urlString, error);
                                return 'icons/default-favicon.png';
                            }
                        };
                        
                        // Handle different JSON formats
                        if (Array.isArray(rawData)) {
                            // Original format: array of collections
                            importedData = rawData.map(collection => {
                                // Make sure all items have favicons
                                if (collection.items && Array.isArray(collection.items)) {
                                    collection.items = collection.items.map(item => {
                                        // Only add favicon if it doesn't exist and URL is valid
                                        if (!item.favicon && item.url) {
                                            item.favicon = createFaviconFromUrl(item.url);
                                        }
                                        return item;
                                    });
                                }
                                return collection;
                            });
                        } else if (rawData.version && Array.isArray(rawData.lists)) {
                            // New format with version and lists
                            importedData = rawData.lists.map(list => {
                                return {
                                    id: utils.generateId(),
                                    name: list.title,
                                    items: list.cards.map(card => {
                                        return {
                                            id: utils.generateId(),
                                            title: card.customTitle || card.title,
                                            url: card.url,
                                            description: card.customDescription || '',
                                            favicon: createFaviconFromUrl(card.url)
                                        };
                                    })
                                };
                            });
                        } else {
                            throw new Error('Invalid import format. Expected an array of collections or a JSON object with version and lists.');
                        }
                        
                        // Validate the imported data
                        if (!Array.isArray(importedData)) {
                            throw new Error('Failed to process import data.');
                        }
                        
                        // Confirm import with the user
                        if (confirm(`Import ${importedData.length} collections? This will merge with your existing collections.`)) {
                            // Merge the imported collections with existing ones
                            // Add only collections that don't exist (based on ID)
                            const existingIds = collections.data.map(c => c.id);
                            const newCollections = importedData.filter(c => !existingIds.includes(c.id));
                            
                            collections.data = [...collections.data, ...newCollections];
                            
                            // Save and render the updated collections
                            await collections.save();
                            collections.render();
                            
                            alert(`Successfully imported ${newCollections.length} new collections.`);
                        }
                    } catch (error) {
                        console.error('Error processing import file:', error);
                        alert('Failed to import collections. The file may be invalid or corrupted.');
                    }
                };
                
                reader.readAsText(file);
            });
            
            // Trigger the file selection dialog
            fileInput.click();
        } catch (error) {
            console.error('Error importing collections:', error);
            alert('Failed to import collections. Please try again.');
        }
    },
}; 