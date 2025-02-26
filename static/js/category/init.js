/**
 * init.js - Initialization Functions
 * Initializes all category page functionality
 */

// Create a namespace for category initialization
const categoryInit = (function() {
    'use strict';
   
    /**
     * Initialize all category page functionality
     */
    function init() {
        console.log('Initializing category page...');
       
        // Initialize Bootstrap modal
        const searchModalElement = document.getElementById("searchProductsModal");
        if (searchModalElement && window.bootstrap) {
            window.searchModal = new bootstrap.Modal(searchModalElement);
        }
       
        // Initialize search functionality using global object
        if (typeof window.categorySearch !== 'undefined') {
            window.categorySearch.init();
        }
       
        // Initialize sort functionality using global object
        if (typeof window.categorySort !== 'undefined') {
            window.categorySort.init();
        }
       
        // Initialize "Search All Products" button
        const searchAllButton = document.getElementById("searchAllProducts");
        if (searchAllButton && window.searchModal) {
            searchAllButton.addEventListener("click", function() {
                window.searchModal.show();
                const modalSearchInput = document.getElementById("modalProductSearch");
                if (modalSearchInput) {
                    modalSearchInput.focus();
                }
            });
        }
       
        // Initialize overlay handler if available via global object
        if (typeof window.events !== 'undefined' && window.events.initOverlayHandler) {
            window.events.initOverlayHandler();
        } else if (typeof window.initOverlayHandler === 'function') {
            window.initOverlayHandler();
        }
       
        console.log('Category page initialization complete');
    }
   
    // Return public methods
    return {
        init
    };
})();

// Expose globally
window.categoryInit = categoryInit;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", categoryInit.init);

// Export the module if CommonJS module system is available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { categoryInit };
}