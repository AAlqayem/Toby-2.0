const tabs = {
    /**
     * Initialize tabs
     */
    init: async () => {
        // Initial load of tabs
        await tabs.loadOpenTabs();
        
        // Add listeners for tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete') {
                tabs.loadOpenTabs();
            }
        });
        chrome.tabs.onRemoved.addListener(tabs.loadOpenTabs);
        chrome.tabs.onMoved.addListener(tabs.loadOpenTabs);
        chrome.tabs.onActivated.addListener(tabs.loadOpenTabs);
        chrome.tabs.onCreated.addListener(tabs.loadOpenTabs);

        // Set up refresh button
        const refreshBtn = document.getElementById('refreshTabs');
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('spinning');
            await tabs.loadOpenTabs();
            setTimeout(() => {
                refreshBtn.classList.remove('spinning');
            }, 500);
        });
    },

    /**
     * Load open tabs from Chrome
     */
    loadOpenTabs: async () => {
        try {
            const [openTabs, activeTab] = await Promise.all([
                new Promise(resolve => chrome.tabs.query({}, resolve)),
                new Promise(resolve => chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0])))
            ]);

            const container = document.getElementById('openTabsList');
            if (!container) return;
            
            container.innerHTML = '';

            // Show total tab count
            const totalCount = utils.createElement('div', {
                className: 'tabs-total-count',
                textContent: `Total Tabs: ${openTabs.length}`
            });
            container.appendChild(totalCount);

            // Show active tab at the top
            if (activeTab) {
                const activeTabEl = createTabElement(activeTab, true);
                container.appendChild(activeTabEl);
                
                const separator = utils.createElement('div', {
                    className: 'tabs-separator',
                    textContent: 'Other Tabs'
                });
                container.appendChild(separator);
            }

            // Group remaining tabs by domain
            const tabsByDomain = {};
            openTabs
                .filter(tab => tab.id !== activeTab?.id)
                .forEach(tab => {
                    try {
                        const url = new URL(tab.url);
                        const domain = url.hostname || 'other';
                        if (!tabsByDomain[domain]) {
                            tabsByDomain[domain] = [];
                        }
                        tabsByDomain[domain].push(tab);
                    } catch (e) {
                        if (!tabsByDomain['other']) {
                            tabsByDomain['other'] = [];
                        }
                        tabsByDomain['other'].push(tab);
                    }
                });

            // Sort domains by tab count (descending) and alphabetically
            const sortedDomains = Object.keys(tabsByDomain).sort((a, b) => {
                const countDiff = tabsByDomain[b].length - tabsByDomain[a].length;
                return countDiff !== 0 ? countDiff : a.localeCompare(b);
            });

            sortedDomains.forEach(domain => {
                const domainTabs = tabsByDomain[domain];
                if (domainTabs.length === 0) return;

                const domainGroup = createDomainGroup(domain, domainTabs);
                container.appendChild(domainGroup);
            });
        } catch (error) {
            console.error('Error loading tabs:', error);
        }
    }
};

/**
 * Create a tab element
 * @param {Object} tab - Tab data
 * @param {boolean} isActive - Whether this is the active tab
 * @returns {HTMLElement} Created tab element
 */
function createTabElement(tab, isActive) {
    const tabEl = utils.createElement('div', {
        className: `tab-item ${isActive ? 'active' : ''}`
    });

    const favicon = utils.createElement('img', {
        className: 'favicon',
        src: tab.favIconUrl || 'icons/default-favicon.png'
    });

    // Add error handler for favicon
    favicon.addEventListener('error', (e) => {
        e.target.src = 'icons/default-favicon.png';
    });

    const title = utils.createElement('span', {
        className: 'title',
        textContent: tab.title || 'Untitled'
    });

    const closeBtn = utils.createElement('button', {
        className: 'close-tab',
        textContent: '×',
        title: 'Close tab'
    });

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chrome.tabs.remove(tab.id);
    });

    tabEl.appendChild(favicon);
    tabEl.appendChild(title);
    tabEl.appendChild(closeBtn);

    tabEl.addEventListener('click', () => {
        chrome.tabs.update(tab.id, { active: true });
    });

    utils.makeDraggable(tabEl, {
        type: 'tab',
        title: tab.title,
        url: tab.url,
        favicon: tab.favIconUrl
    });

    return tabEl;
}

function createDomainGroup(domain, tabs) {
    const domainGroup = utils.createElement('div', {
        className: 'domain-group'
    });

    const domainHeader = utils.createElement('div', {
        className: 'domain-header'
    });

    const domainTitle = utils.createElement('span', {
        className: 'domain-title',
        textContent: domain === 'other' ? 'Other' : domain
    });

    const tabCount = utils.createElement('span', {
        className: 'tab-count',
        textContent: tabs.length
    });

    domainHeader.appendChild(domainTitle);
    domainHeader.appendChild(tabCount);
    domainGroup.appendChild(domainHeader);

    const tabsGroup = utils.createElement('div', {
        className: 'tabs-group'
    });

    tabs.forEach(tab => {
        const tabEl = createTabElement(tab, false);
        tabsGroup.appendChild(tabEl);
    });

    domainGroup.appendChild(tabsGroup);
    return domainGroup;
} 