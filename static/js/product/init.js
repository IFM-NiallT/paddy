/**
 * init.js - Main initialization for PADDY products page
 * 
 * This module initializes all functionality for the products page.
 * It coordinates between the different product modules and ensures
 * proper loading order and dependency management.
 */

// Import necessary modules (make sure the paths are correct)
import { productColumns } from './columns.js';
import { productSort, updateSortIndicators } from './sort.js';
import { productSearch } from './search.js';
import { productEdit } from './edit.js';
import { utils } from '../core/utils.js';
import { api } from '../core/api.js';
import { events } from '../core/events.js';
import { productTable } from './table.js';
import { csvExport } from '../export/csv.js';

// Create a namespace for product initialization
export const productInit = (function() {
  'use strict';

  /**
   * Check if all required dependencies are loaded
   * @returns {boolean} - Whether all dependencies are available
   */
  function checkDependencies() {
    // All dependencies should be imported via ES modules, 
    // but we can still check if they're defined for safety
    const dependencies = {
      utils: typeof utils !== 'undefined',
      api: typeof api !== 'undefined',
      events: typeof events !== 'undefined',
      productTable: typeof productTable !== 'undefined',
      productSearch: typeof productSearch !== 'undefined',
      productSort: typeof productSort !== 'undefined',
      productEdit: typeof productEdit !== 'undefined',
      productColumns: typeof productColumns !== 'undefined',
      csvExport: typeof csvExport !== 'undefined'
    };
    
    const missingDependencies = Object.keys(dependencies).filter(dep => !dependencies[dep]);
    
    if (missingDependencies.length > 0) {
      console.warn('Missing dependencies:', missingDependencies.join(', '));
      return false;
    }
    
    return true;
  }

  /**
   * Initialize all product page functionality
   */
  function initializeProductsPage() {
    console.log('Initializing products page...');
    
    try {
      // Initialize column resizing functionality
      if (productColumns) {
        productColumns.init();
      } else {
        console.warn('Column resizing module not available');
        initColumnResizers();  // Fallback to global function
      }
      
      // Initialize sorting functionality
      if (productSort) {
        productSort.init();
      } else {
        console.warn('Sort module not available');
        initSortHandlers();  // Fallback to global function
      }
      
      // Initialize search functionality
      if (productSearch) {
        productSearch.init();
      } else {
        console.warn('Search module not available');
        initSearchHandlers();  // Fallback to global function
      }
      
      // Initialize product editing functionality
      if (productEdit) {
        productEdit.init();
      } else {
        console.warn('Edit module not available');
        initEditFormHandlers();  // Fallback to global function
      }
      
      // Initialize table functionality
      if (productTable) {
        productTable.init();
        productTable.logTableStructure();
      }
      
      // Initialize CSV export functionality
      if (csvExport) {
        csvExport.init();
      }
      
      console.log('Products page initialization complete');
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }

  /**
   * Reinitialize all table handlers after table updates
   * @returns {boolean} - Whether reinitialization was successful
   */
  function reinitializeTableHandlers() {
    console.log('Reinitializing table handlers...');
    
    const table = document.querySelector('table');
    if (!table) {
      console.error('Table not found during reinitialization');
      return false;
    }

    try {
      // Re-initialize all table-related handlers
      if (productColumns) {
        productColumns.init();
      } else if (typeof window.initColumnResizers === 'function') {
        window.initColumnResizers();
      }
      
      if (productSort) {
        productSort.init();
      } else if (typeof window.initSortHandlers === 'function') {
        window.initSortHandlers();
      }
      
      if (productEdit) {
        productEdit.initEditButtons();
      } else if (typeof window.initEditButtons === 'function') {
        window.initEditButtons();
      }
      
      console.log('Table handlers reinitialized successfully');
      return true;
    } catch (error) {
      console.error('Error during table handler reinitialization:', error);
      return false;
    }
  }

  /**
   * Handle DOM content loaded event
   */
  function handleDOMContentLoaded() {
    // Check dependencies and initialize
    if (checkDependencies()) {
      initializeProductsPage();
    } else {
      console.warn('Initializing with missing dependencies');
      initializeProductsPage();
    }
  }

  // Return public methods
  return {
    checkDependencies,
    initializeProductsPage,
    reinitializeTableHandlers,
    handleDOMContentLoaded
  };
})();

// Expose functions to global scope for backward compatibility
window.initializeProductsPage = productInit.initializeProductsPage;
window.reinitializeTableHandlers = productInit.reinitializeTableHandlers;
window.checkDependencies = productInit.checkDependencies;

// Initialize on page load
document.addEventListener('DOMContentLoaded', productInit.handleDOMContentLoaded);

/**
 * Fallback functions for backward compatibility
 * These are used if the modular versions are not available
 */

// Column resize fallback
export function initColumnResizers() {
  console.log('Using fallback column resizer initialization');
  const table = document.getElementById('productsTable');
  
  if (!table) {
    console.debug('Products table not found, skipping column resizer initialization');
    return;
  }
  
  function initResizers() {
    const cols = table.querySelectorAll('th');
    
    if (!cols.length) {
      console.debug('No columns found in products table');
      return;
    }
    
    cols.forEach((col) => {
      const resizer = col.querySelector('.resizer');
      
      if (!resizer) {
        console.debug('Resizer not found for column', col);
        return;
      }
      
      let x = 0, w = 0;
      
      function mouseDownHandler(e) {
        x = e.clientX;
        w = parseInt(window.getComputedStyle(col).width, 10);
        
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        resizer.classList.add('resizing');
      }
      
      function mouseMoveHandler(e) {
        const dx = e.clientX - x;
        const newWidth = w + dx;
        
        if (newWidth > 50) {
          col.style.width = `${newWidth}px`;
          const index = Array.from(col.parentElement.children).indexOf(col);
          const cells = table.querySelectorAll(`td:nth-child(${index + 1})`);
          cells.forEach(cell => {
            cell.style.width = `${newWidth}px`;
          });
        }
      }
      
      function mouseUpHandler() {
        resizer.classList.remove('resizing');
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
      }
      
      resizer.addEventListener('mousedown', mouseDownHandler);
    });
  }
  
  initResizers();
  
  const resizers = table.querySelectorAll('.resizer');
  if (resizers.length) {
    resizers.forEach(resizer => {
      resizer.addEventListener('mousedown', (e) => { 
        e.stopPropagation(); 
      });
    });
  }
}

// Sort handlers fallback
export function initSortHandlers() {
  console.log('Using fallback sort handler initialization');
  const headers = document.querySelectorAll('#productsTable th a');
  headers.forEach(header => {
    header.addEventListener('click', window.handleSortClick || function() {
      console.warn('handleSortClick function not available');
    });
  });
  
  // Update sort indicators based on current URL
  if (typeof window.updateSortIndicators === 'function') {
    window.updateSortIndicators(window.location.href);
  }
}

// Search handlers fallback
export function initSearchHandlers() {
  console.log('Using fallback search handler initialization');
  const searchInput = document.getElementById('productSearch');
  if (searchInput) {
    const debouncedSearch = utils.debounce(window.searchProducts || function() {
      console.warn('searchProducts function not available');
    }, 300);
    
    searchInput.addEventListener('input', debouncedSearch);
    
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (typeof window.searchProducts === 'function') {
          window.searchProducts();
        }
      }
    });
  }
}

// Edit form handlers fallback
export function initEditFormHandlers() {
  console.log('Using fallback edit form handler initialization');

  // Directly get the form element
  const form = document.getElementById('productEditForm');
  if (!form) {
    console.warn('Edit form not found');
    return;
  }

  // Remove any existing listeners to prevent duplicates
  if (typeof window.submitProductEdit === 'function') {
    form.removeEventListener('submit', window.submitProductEdit);
    form.addEventListener('submit', window.submitProductEdit);
  } else {
    console.warn('submitProductEdit function not available');
  }

  // Find close button
  const closeButton = document.querySelector('#editProductModal .close-button, #editProductModal .btn-cancel');
  if (closeButton) {
    if (typeof window.closeEditForm === 'function') {
      closeButton.removeEventListener('click', window.closeEditForm);
      closeButton.addEventListener('click', function(e) {
        e.preventDefault();
        window.closeEditForm();
      });
    } else {
      console.warn('closeEditForm function not available');
    }
  }
}

// Edit buttons fallback
export function initEditButtons() {
  console.log('Using fallback edit button initialization');
  document.querySelectorAll('.edit-product-btn').forEach(button => {
    button.addEventListener('click', function(event) {
      event.stopPropagation();
      const row = event.target.closest('.product-row');
      if (row) {
        const productId = row.getAttribute('data-product-id');
        if (productId && typeof window.fetchProductDetails === 'function') {
          window.fetchProductDetails(productId);
        }
      }
    });
  });
}

// Overlay handler fallback
export function initOverlayHandler() {
  console.log('Using fallback overlay handler initialization');
  const overlay = document.getElementById('editFormOverlay');
  if (overlay && typeof window.closeEditForm === 'function') {
    overlay.addEventListener('click', window.closeEditForm);
  }
}

// Export the module if CommonJS module system is available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    productInit,
    initColumnResizers,
    initSortHandlers,
    initSearchHandlers,
    initEditFormHandlers,
    initEditButtons,
    initOverlayHandler
  };
}