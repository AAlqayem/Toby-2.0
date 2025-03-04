const search = {
    init: () => {
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', utils.debounce(search.handleSearch, 300));
    },

    handleSearch: (event) => {
        const query = event.target.value.toLowerCase();
        const collectionsContainer = document.getElementById('collections');
        const collections = collectionsContainer.getElementsByClassName('collection');

        Array.from(collections).forEach(collection => {
            const collectionTitle = collection.querySelector('.collection-title').textContent.toLowerCase();
            const items = collection.getElementsByClassName('item');
            let isVisible = false;

            // Check collection title
            if (collectionTitle.includes(query)) {
                isVisible = true;
            } else {
                // Check items in collection
                Array.from(items).forEach(item => {
                    const itemTitle = item.querySelector('span').textContent.toLowerCase();
                    if (itemTitle.includes(query)) {
                        isVisible = true;
                    }
                });
            }

            collection.style.display = isVisible ? 'block' : 'none';
        });
    }
}; 