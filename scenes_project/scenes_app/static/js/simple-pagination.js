/**
 * Simple Pagination System - Fallback for when advanced pagination fails
 */

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if advanced pagination is not available
    if (!window.advancedPagination) {
        initSimplePagination();
    }
});

function initSimplePagination() {
    console.log('Initializing simple pagination fallback');
    
    // Handle pagination button clicks
    document.addEventListener('click', function(e) {
        const paginationBtn = e.target.closest('.pagination-btn');
        if (paginationBtn && paginationBtn.dataset.page) {
            e.preventDefault();
            
            const page = paginationBtn.dataset.page;
            const currentUrl = new URL(window.location);
            currentUrl.searchParams.set('page', page);
            
            // Show loading state
            paginationBtn.classList.add('opacity-50');
            paginationBtn.disabled = true;
            
            // Navigate to new page
            window.location.href = currentUrl.toString();
        }
    });
    
    // Handle page size selector
    const pageSizeSelector = document.getElementById('page-size-selector');
    if (pageSizeSelector) {
        pageSizeSelector.addEventListener('change', function() {
            const currentUrl = new URL(window.location);
            currentUrl.searchParams.set('page_size', this.value);
            currentUrl.searchParams.set('page', '1'); // Reset to first page
            window.location.href = currentUrl.toString();
        });
    }
    
    // Handle jump to page
    const jumpToPageBtn = document.getElementById('jump-to-page-btn');
    const jumpToPageInput = document.getElementById('jump-to-page');
    
    if (jumpToPageBtn && jumpToPageInput) {
        function jumpToPage() {
            const page = parseInt(jumpToPageInput.value);
            const maxPage = parseInt(jumpToPageInput.max);
            
            if (page >= 1 && page <= maxPage) {
                const currentUrl = new URL(window.location);
                currentUrl.searchParams.set('page', page);
                
                jumpToPageBtn.classList.add('opacity-50');
                jumpToPageBtn.disabled = true;
                
                window.location.href = currentUrl.toString();
            } else {
                jumpToPageInput.focus();
                jumpToPageInput.select();
            }
        }
        
        jumpToPageBtn.addEventListener('click', function(e) {
            e.preventDefault();
            jumpToPage();
        });
        
        jumpToPageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                jumpToPage();
            }
        });
    }
    
    // Handle keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Only handle keyboard navigation when not typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }
        
        const currentUrl = new URL(window.location);
        const currentPage = parseInt(currentUrl.searchParams.get('page') || '1');
        const maxPage = getMaxPageFromDOM();
        
        let newPage = null;
        
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                if (currentPage > 1) {
                    newPage = currentPage - 1;
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (currentPage < maxPage) {
                    newPage = currentPage + 1;
                }
                break;
            case 'Home':
                e.preventDefault();
                if (currentPage > 1) {
                    newPage = 1;
                }
                break;
            case 'End':
                e.preventDefault();
                if (currentPage < maxPage) {
                    newPage = maxPage;
                }
                break;
        }
        
        if (newPage) {
            currentUrl.searchParams.set('page', newPage);
            window.location.href = currentUrl.toString();
        }
    });
}

function getMaxPageFromDOM() {
    // Try to get max page from jump input
    const jumpInput = document.getElementById('jump-to-page');
    if (jumpInput && jumpInput.max) {
        return parseInt(jumpInput.max);
    }
    
    // Try to get from pagination buttons
    const paginationBtns = document.querySelectorAll('.pagination-btn[data-page]');
    let maxPage = 1;
    
    paginationBtns.forEach(btn => {
        const page = parseInt(btn.dataset.page);
        if (!isNaN(page) && page > maxPage) {
            maxPage = page;
        }
    });
    
    return maxPage;
}

// Export for external use
window.simplePagination = {
    init: initSimplePagination,
    getMaxPage: getMaxPageFromDOM
};