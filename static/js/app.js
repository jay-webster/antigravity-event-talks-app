document.addEventListener('DOMContentLoaded', () => {
    // Load Saved Theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
    }

    // State Variables
    let allReleases = [];
    let activeCategory = 'all';
    let searchQuery = '';
    let selectedRelease = null;
    let lastActiveElement = null;

    // DOM Elements
    const timelineContainer = document.getElementById('timeline-container');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const emptyState = document.getElementById('empty-state');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = refreshBtn.querySelector('.spinner-icon');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const syncStatus = document.getElementById('sync-status');
    const syncStatusText = syncStatus.querySelector('.status-text');
    const syncStatusDot = syncStatus.querySelector('.status-dot');
    
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const categoryChips = document.querySelectorAll('.filter-chip');
    
    // Stats Elements
    const statTotal = document.getElementById('stat-total');
    const statFeatures = document.getElementById('stat-features');
    const statFixes = document.getElementById('stat-fixes');
    const statAlerts = document.getElementById('stat-alerts');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const tweetSubmitBtn = document.getElementById('tweet-submit-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCountEl = document.getElementById('char-count');
    const progressRingIndicator = document.getElementById('progress-ring-indicator');

    // Progress Ring Constants
    const RING_RADIUS = 9;
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ~56.55
    progressRingIndicator.style.strokeDasharray = `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
    progressRingIndicator.style.strokeDashoffset = RING_CIRCUMFERENCE;

    // ==========================================================================
    // Fetch Data from API
    // ==========================================================================
    async function fetchReleases(forceRefresh = false) {
        setLoadingState(true);
        
        const url = forceRefresh ? '/api/releases?refresh=true' : '/api/releases';
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Server returned HTTP ${response.status}`);
            }
            const data = await response.json();
            
            allReleases = data.releases || [];
            updateSyncStatus(data.source, data.last_updated);
            
            // Render Dashboard & Updates
            calculateStats();
            renderTimeline();
            
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showErrorState(error.message);
        } finally {
            setLoadingState(false);
        }
    }

    // ==========================================================================
    // UI Loading & State Management
    // ==========================================================================
    function setLoadingState(isLoading) {
        if (isLoading) {
            skeletonLoader.style.display = 'flex';
            timelineContainer.style.display = 'none';
            emptyState.style.display = 'none';
            refreshIcon.classList.add('spinning');
            refreshBtn.disabled = true;
        } else {
            skeletonLoader.style.display = 'none';
            refreshIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }

    function showErrorState(message) {
        timelineContainer.innerHTML = '';
        timelineContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        
        const emptyTitle = emptyState.querySelector('h3');
        const emptyDesc = emptyState.querySelector('p');
        emptyTitle.textContent = 'Failed to load updates';
        emptyDesc.textContent = `Error: ${message}. Click Refresh to try again.`;
        
        syncStatusText.textContent = 'Sync Failed';
        syncStatusDot.className = 'status-dot red';
    }

    function updateSyncStatus(source, lastUpdated) {
        if (lastUpdated) {
            const date = new Date(lastUpdated);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            syncStatusText.textContent = `Synced: ${timeStr} (${source === 'live' ? 'live' : 'cached'})`;
            syncStatusDot.className = 'status-dot green';
        } else {
            syncStatusText.textContent = 'Unknown Sync';
            syncStatusDot.className = 'status-dot orange';
        }
    }

    // ==========================================================================
    // Calculation of Dashboard Stats
    // ==========================================================================
    function calculateStats() {
        let featuresCount = 0;
        let fixesCount = 0;
        let alertsCount = 0;

        allReleases.forEach(item => {
            const type = item.type.toLowerCase();
            if (type === 'feature') {
                featuresCount++;
            } else if (type === 'bug fix' || type === 'fix') {
                fixesCount++;
            } else if (['deprecation', 'breaking change', 'notice'].includes(type)) {
                alertsCount++;
            }
        });

        statTotal.textContent = allReleases.length;
        statFeatures.textContent = featuresCount;
        statFixes.textContent = fixesCount;
        statAlerts.textContent = alertsCount;
    }

    // ==========================================================================
    // Timeline Card Rendering
    // ==========================================================================
    function renderTimeline() {
        // Filter elements
        const filtered = allReleases.filter(item => {
            // Category check
            const matchesCategory = activeCategory === 'all' || 
                item.type.toLowerCase() === activeCategory.toLowerCase();
            
            // Search query check
            const matchesSearch = !searchQuery || 
                item.plain_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.date.toLowerCase().includes(searchQuery.toLowerCase());
                
            return matchesCategory && matchesSearch;
        });

        // Toggle Empty State
        if (filtered.length === 0) {
            timelineContainer.style.display = 'none';
            emptyState.style.display = 'flex';
            
            const emptyTitle = emptyState.querySelector('h3');
            const emptyDesc = emptyState.querySelector('p');
            emptyTitle.textContent = 'No release notes found';
            emptyDesc.textContent = "We couldn't find any updates matching your search terms or filters. Try adjusting your settings.";
            return;
        }

        emptyState.style.display = 'none';
        timelineContainer.style.display = 'block';

        // Render Cards
        timelineContainer.innerHTML = '';
        filtered.forEach((item, index) => {
            const cardEl = document.createElement('article');
            cardEl.className = 'timeline-item';
            cardEl.setAttribute('data-type', item.type);
            cardEl.style.animationDelay = `${Math.min(index * 0.05, 0.5)}s`;
            
            // Format ID for clean display
            const displayId = `BQ-${item.id.split('#')[1] || index}`;
            
            cardEl.innerHTML = `
                <div class="timeline-node"></div>
                <div class="release-card">
                    <div class="card-header">
                        <div class="card-meta-left">
                            <span class="category-badge" data-type="${item.type}">${item.type}</span>
                            <time class="card-date">${item.date}</time>
                        </div>
                        <span class="card-index">${displayId}</span>
                    </div>
                    <div class="card-body">
                        ${item.content}
                    </div>
                    <div class="card-footer">
                        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="btn btn-doc">
                            <span>Official Docs</span>
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                <polyline points="15 3 21 3 21 9"/>
                                <line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                        </a>
                        <div class="card-actions-right">
                            <button class="btn btn-copy" data-id="${item.id}">
                                <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                <span>Copy</span>
                            </button>
                            <button class="btn btn-tweet" data-id="${item.id}">
                                <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                                <span>Tweet This</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add click listener for copy button
            const copyBtn = cardEl.querySelector('.btn-copy');
            copyBtn.addEventListener('click', () => {
                const copyText = `BigQuery Update (${item.date}) - [${item.type}]: ${item.plain_text}\n\nRead more: ${item.link}`;
                copyToClipboard(copyText, copyBtn);
            });
            
            // Add click listener for Tweet button
            const tweetBtn = cardEl.querySelector('.btn-tweet');
            tweetBtn.addEventListener('click', () => openTweetModal(item));
            
            timelineContainer.appendChild(cardEl);
        });
    }

    // ==========================================================================
    // Search and Filter Handlers
    // ==========================================================================
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        renderTimeline();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderTimeline();
    });

    categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Toggle active state
            categoryChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            activeCategory = chip.getAttribute('data-category');
            renderTimeline();
        });
    });

    themeToggleBtn.addEventListener('click', () => {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        }
    });

    refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });

    exportCsvBtn.addEventListener('click', () => {
        exportToCSV();
    });

    // ==========================================================================
    // Clipboard and Export Utilities
    // ==========================================================================
    async function copyToClipboard(text, buttonEl) {
        try {
            await navigator.clipboard.writeText(text);
            const originalHTML = buttonEl.innerHTML;
            buttonEl.innerHTML = `
                <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Copied!</span>
            `;
            buttonEl.style.borderColor = 'var(--color-feature)';
            buttonEl.style.color = 'var(--color-feature)';
            
            setTimeout(() => {
                buttonEl.innerHTML = originalHTML;
                buttonEl.style.borderColor = '';
                buttonEl.style.color = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    }

    function exportToCSV() {
        const filtered = allReleases.filter(item => {
            const matchesCategory = activeCategory === 'all' || 
                item.type.toLowerCase() === activeCategory.toLowerCase();
            const matchesSearch = !searchQuery || 
                item.plain_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.date.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
        
        if (filtered.length === 0) {
            alert("No data available to export.");
            return;
        }
        
        const headers = ["Date", "Type", "Link", "Description"];
        const rows = filtered.map(item => [
            item.date,
            item.type,
            item.link,
            item.plain_text
        ]);
        
        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
        ].join("\n");
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        
        const dateStr = new Date().toISOString().split('T')[0];
        link.setAttribute("download", `bigquery_release_notes_${dateStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ==========================================================================
    // Tweet Composer Modal Logic
    // ==========================================================================
    function openTweetModal(item) {
        selectedRelease = item;
        lastActiveElement = document.activeElement;
        
        // 1. Generate text snippet
        const maxDescLen = 160; // Leave room for prefix, link, and tags
        let cleanText = item.plain_text;
        if (cleanText.length > maxDescLen) {
            cleanText = cleanText.substring(0, maxDescLen).trim() + '...';
        }

        // Standard pre-formatted text
        const prefix = `BigQuery Update (${item.date}): `;
        const suffix = `\n\nRead details: ${item.link}\n#BigQuery #GoogleCloud`;
        
        // Set textarea default
        tweetTextarea.value = `${prefix}${cleanText}${suffix}`;
        
        // Update character counter and modal UI
        updateCharCounter();
        
        // Open Modal
        tweetModal.classList.add('open');
        tweetTextarea.focus();
        
        // Position cursor before the link
        const cursorIndex = prefix.length + cleanText.length;
        tweetTextarea.setSelectionRange(cursorIndex, cursorIndex);
    }

    function closeTweetModal() {
        tweetModal.classList.remove('open');
        selectedRelease = null;
        if (lastActiveElement) {
            lastActiveElement.focus();
        }
    }

    function updateCharCounter() {
        const text = tweetTextarea.value;
        const charCount = text.length;
        
        charCountEl.textContent = `${charCount} / 280`;

        // Update progress circle indicator
        const percentage = Math.min(charCount / 280, 1) * 100;
        const offset = RING_CIRCUMFERENCE - (percentage / 100) * RING_CIRCUMFERENCE;
        progressRingIndicator.style.strokeDashoffset = offset;

        // Apply warning styling
        if (charCount > 280) {
            charCountEl.className = 'char-count danger';
            progressRingIndicator.style.stroke = '#f43f5e'; // Red
            tweetSubmitBtn.disabled = true;
        } else if (charCount >= 250) {
            charCountEl.className = 'char-count warning';
            progressRingIndicator.style.stroke = '#f59e0b'; // Amber
            tweetSubmitBtn.disabled = false;
        } else {
            charCountEl.className = 'char-count';
            progressRingIndicator.style.stroke = '#38bdf8'; // Blue
            tweetSubmitBtn.disabled = false;
        }
    }

    tweetTextarea.addEventListener('input', updateCharCounter);

    modalCloseBtn.addEventListener('click', closeTweetModal);
    modalCancelBtn.addEventListener('click', closeTweetModal);
    
    // Close modal on click outside of container
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Keyboard Shortcuts & Focus Trapping
    document.addEventListener('keydown', (e) => {
        // 1. Escape key to close modal
        if (e.key === 'Escape' && tweetModal.classList.contains('open')) {
            closeTweetModal();
        }

        // 2. '/' key to focus search input
        const activeEl = document.activeElement;
        const isEditing = activeEl && (
            activeEl.tagName === 'INPUT' || 
            activeEl.tagName === 'TEXTAREA' || 
            activeEl.isContentEditable
        );
        if (e.key === '/' && !isEditing) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });

    // Modal Focus trapping
    tweetModal.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const focusables = tweetModal.querySelectorAll('button:not([disabled]), textarea:not([disabled])');
            if (focusables.length === 0) return;

            const firstEl = focusables[0];
            const lastEl = focusables[focusables.length - 1];

            if (e.shiftKey) { // Shift + Tab
                if (document.activeElement === firstEl) {
                    lastEl.focus();
                    e.preventDefault();
                }
            } else { // Tab
                if (document.activeElement === lastEl) {
                    firstEl.focus();
                    e.preventDefault();
                }
            }
        }
    });

    tweetSubmitBtn.addEventListener('click', () => {
        const tweetText = tweetTextarea.value;
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        
        // Open Twitter in new window
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
        
        closeTweetModal();
    });

    // ==========================================================================
    // Initialization
    // ==========================================================================
    fetchReleases();
});
