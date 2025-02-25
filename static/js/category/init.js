/**
 * init.js - Initialization Functions
 * Initializes all category page functionality
 */

import { utils } from '../core/utils.js';
import { events } from '../core/events.js';
import { categorySearch } from './search.js';
import { categorySort } from './sort.js';

// Create a namespace for category initialization
export const categoryInit = (function() {
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
        
        // Initialize search functionality
        if (typeof categorySearch !== 'undefined') {
            categorySearch.init();
        }
        
        // Initialize sort functionality
        if (typeof categorySort !== 'undefined') {
            categorySort.init();
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
        
        // Initialize overlay handler if available
        if (typeof events !== 'undefined' && events.initOverlayHandler) {
            events.initOverlayHandler();
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

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", categoryInit.init);

// Export the module if CommonJS module system is available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { categoryInit };
}