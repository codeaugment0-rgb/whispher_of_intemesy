/**
 * Advanced Pagination System
 * Features: AJAX loading, keyboard navigation, page size control, jump to page
 */

class AdvancedPagination {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.pageSize = 10;
        this.isLoading = false;
        this.loadingTimeout = null;
        this.baseUrl = window.location.pathname;
        this.urlParams = new URLSearchParams(window.location.search);

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupKeyboardNavigation();
        this.updateFromURL();
    }

    bindEvents() {
        // Pagination button clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.pagination-btn')) {
                e.preventDefault();
                const page = parseInt(e.target.closest('.pagination-btn').dataset.page);
                if (page && !this.isLoading) {
                    this.goToPage(page);
                }
            }
        });

        // Page size selector
        document.addEventListener('change', (e) => {
            if (e.target.id === 'page-size-selector') {
                this.changePageSize(parseInt(e.target.value));
            }
        });

        // Jump to page functionality
        document.addEventListener('click', (e) => {
            if (e.target.id === 'jump-to-page-btn') {
                e.preventDefault();
                const pageInput = document.getElementById('jump-to-page');
                const page = parseInt(pageInput.value);
                if (page >= 1 && page <= this.totalPages && !this.isLoading) {
                    this.goToPage(page);
                }
            }
        });

        // Enter key on jump to page input
        document.addEventListener('keydown', (e) => {
            if (e.target.id === 'jump-to-page' && e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('jump-to-page-btn').click();
            }
        });



        // Browser back/forward navigation
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.loadPage(e.state.page, e.state.pageSize, false);
            } else {
                this.updateFromURL();
            }
        });
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Only handle keyboard navigation when not typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    if (this.currentPage > 1 && !this.isLoading) {
                        this.goToPage(this.currentPage - 1);
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (this.currentPage < this.totalPages && !this.isLoading) {
                        this.goToPage(this.currentPage + 1);
                    }
                    break;
                case 'Home':
                    e.preventDefault();
                    if (this.currentPage > 1 && !this.isLoading) {
                        this.goToPage(1);
                    }
                    break;
                case 'End':
                    e.preventDefault();
                    if (this.currentPage < this.totalPages && !this.isLoading) {
                        this.goToPage(this.totalPages);
                    }
                    break;
            }
        });
    }

    updateFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentPage = parseInt(urlParams.get('page')) || 1;
        this.pageSize = parseInt(urlParams.get('page_size')) || 10;

        // Update page size selector if it exists
        const pageSizeSelector = document.getElementById('page-size-selector');
        if (pageSizeSelector) {
            pageSizeSelector.value = this.pageSize;
        }
    }

    goToPage(page, pageSize = null) {
        if (pageSize === null) {
            pageSize = this.pageSize;
        }

        this.loadPage(page, pageSize, true);
    }

    changePageSize(newPageSize) {
        // Calculate what page we should be on with the new page size
        const currentItemIndex = (this.currentPage - 1) * this.pageSize;
        const newPage = Math.floor(currentItemIndex / newPageSize) + 1;

        this.pageSize = newPageSize;
        this.goToPage(newPage, newPageSize);
    }

    async loadPage(page, pageSize, updateHistory = true) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            // Build URL parameters
            const params = new URLSearchParams(window.location.search);
            params.set('page', page);
            params.set('page_size', pageSize);

            const url = `${this.baseUrl}?${params.toString()}`;

            const response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': window.csrfToken
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Update page content
            this.updateContent(data);

            // Update URL and browser history
            if (updateHistory) {
                const newUrl = `${this.baseUrl}?${params.toString()}`;
                history.pushState(
                    { page: page, pageSize: pageSize },
                    '',
                    newUrl
                );
            }

            // Update internal state
            this.currentPage = data.current_page;
            this.totalPages = data.total_pages;
            this.pageSize = data.page_size;

            // Scroll to top smoothly
            this.scrollToTop();

            // Show success feedback
            this.showSuccessFeedback(data);

        } catch (error) {
            console.error('Pagination error:', error);
            this.showErrorFeedback();
        } finally {
            // Always ensure loading is hidden and state is reset
            this.isLoading = false;
            this.hideLoading();

            // Force cleanup any remaining loading states
            setTimeout(() => {
                this.forceCleanupLoading();
            }, 100);
        }
    }



    updateContent(data) {
        // Find the main content container (either grid or no-results div)
        const contentContainer = document.querySelector('.grid') || document.querySelector('.text-center.py-12');
        const parentContainer = contentContainer ? contentContainer.parentElement : null;

        if (parentContainer && data.html) {
            // Create a temporary container to parse the new HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data.html;

            // Find the new content (grid or no-results)
            const newContent = tempDiv.querySelector('.grid') || tempDiv.querySelector('.text-center.py-12');

            if (newContent) {
                // Replace the old content with new content
                contentContainer.replaceWith(newContent);
            }
        }

        // Update pagination separately if provided
        if (data.pagination_html) {
            const currentPagination = document.querySelector('.pagination-container');
            if (currentPagination) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = data.pagination_html;
                const newPagination = tempDiv.querySelector('.pagination-container');
                if (newPagination) {
                    currentPagination.replaceWith(newPagination);
                }
            }
        }

        // Update stats in hero section if present
        this.updateStats(data);
    }

    updateStats(data) {
        // Update total scenes count
        const totalScenesEl = document.querySelector('[data-stat="total-scenes"]');
        if (totalScenesEl) {
            totalScenesEl.textContent = data.total_items;
        }

        // Update current page display
        const currentPageEls = document.querySelectorAll('[data-stat="current-page"]');
        currentPageEls.forEach(el => {
            el.textContent = data.current_page;
        });

        // Update total pages display
        const totalPagesEls = document.querySelectorAll('[data-stat="total-pages"]');
        totalPagesEls.forEach(el => {
            el.textContent = data.total_pages;
        });

        // Update the showing of X-Y of Z text
        const showingInfoEl = document.querySelector('.stats-info span');
        if (showingInfoEl && data.start_index && data.end_index) {
            showingInfoEl.textContent = `Showing ${data.start_index}-${data.end_index} of ${data.total_items}`;
        }
    }

    showLoading() {
        // Create or show loading overlay
        this.createLoadingOverlay();

        // Add loading state to pagination buttons
        const paginationBtns = document.querySelectorAll('.pagination-btn');
        paginationBtns.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        });

        // Add loading class to main content
        const mainContent = document.getElementById('main');
        if (mainContent) {
            mainContent.classList.add('pagination-loading');
        }

        // Safety timeout to force hide loading after 10 seconds
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
        }
        this.loadingTimeout = setTimeout(() => {
            console.warn('Loading timeout reached, forcing cleanup');
            this.forceCleanupLoading();
        }, 10000);
    }

    hideLoading() {
        // Clear loading timeout
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }

        // Remove loading overlay
        const loadingOverlay = document.getElementById('pagination-loading');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }

        // Remove loading state from pagination buttons
        const paginationBtns = document.querySelectorAll('.pagination-btn');
        paginationBtns.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        });

        // Remove loading class from main content
        const mainContent = document.getElementById('main');
        if (mainContent) {
            mainContent.classList.remove('pagination-loading');
        }
    }

    createLoadingOverlay() {
        // Remove existing overlay if present
        const existingOverlay = document.getElementById('pagination-loading');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Create new loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'pagination-loading';
        loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-25 z-50 flex items-center justify-center';
        loadingOverlay.innerHTML = `
            <div class="bg-white rounded-xl p-6 shadow-xl">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span class="text-gray-700 font-medium">Loading scenes...</span>
                </div>
            </div>
        `;

        document.body.appendChild(loadingOverlay);
    }

    forceCleanupLoading() {
        // Force remove any loading overlays
        const loadingOverlays = document.querySelectorAll('#pagination-loading');
        loadingOverlays.forEach(overlay => overlay.remove());

        // Force remove loading states from buttons
        const paginationBtns = document.querySelectorAll('.pagination-btn');
        paginationBtns.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        });

        // Force remove loading class from main content
        const mainContent = document.getElementById('main');
        if (mainContent) {
            mainContent.classList.remove('pagination-loading');
        }

        // Reset loading state
        this.isLoading = false;
    }

    scrollToTop() {
        const mainContent = document.getElementById('main');
        if (mainContent) {
            mainContent.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        } else {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }

    showSuccessFeedback(data) {
        // Create a subtle success indicator
        const indicator = document.createElement('div');
        indicator.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
        indicator.textContent = `Page ${data.current_page} loaded`;

        document.body.appendChild(indicator);

        // Animate in
        setTimeout(() => {
            indicator.classList.remove('translate-x-full');
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            indicator.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(indicator);
            }, 300);
        }, 2000);
    }

    showErrorFeedback() {
        // Show error toast
        if (window.Toastify) {
            Toastify({
                text: "Failed to load page. Please try again.",
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "#ef4444",
            }).showToast();
        } else {
            alert('Failed to load page. Please try again.');
        }
    }

    // Public method to refresh current page
    refresh() {
        this.loadPage(this.currentPage, this.pageSize, false);
    }

    // Public method to get current state
    getState() {
        return {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            pageSize: this.pageSize,
            isLoading: this.isLoading
        };
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on pages with pagination
    if (document.querySelector('.pagination-btn') || document.getElementById('page-size-selector')) {
        window.advancedPagination = new AdvancedPagination();
    }
});

// Expose for external use
window.AdvancedPagination = AdvancedPagination;