/**
 * init.js - Main initialization for PADDY products page
 * 
 * This module initializes all functionality for the products page.
 * It coordinates between the different product modules and ensures
 * proper loading order and dependency management.
 */

// Create a namespace for product initialization
const productInit = (function() {
  'use strict';

  /**
   * Check if all required dependencies are loaded
   * @returns {boolean} - Whether all dependencies are available
   */
  function checkDependencies() {
    // All dependencies should be accessible via the window object
    const dependencies = {
      utils: typeof window.utils !== 'undefined',
      api: typeof window.api !== 'undefined',
      events: typeof window.events !== 'undefined',
      productTable: typeof window.productTable !== 'undefined',
      productSearch: typeof window.productSearch !== 'undefined',
      productSort: typeof window.productSort !== 'undefined',
      productEdit: typeof window.productEdit !== 'undefined',
      productColumns: typeof window.productColumns !== 'undefined',
      csvExport: typeof window.csvExport !== 'undefined'
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
      if (window.productColumns) {
        window.productColumns.init();
      } else {
        console.warn('Column resizing module not available');
        initColumnResizers();  // Fallback to global function
      }
      
      // Initialize sorting functionality
      if (window.productSort) {
        window.productSort.init();
      } else {
        console.warn('Sort module not available');
        initSortHandlers();  // Fallback to global function
      }
      
      // Initialize search functionality
      if (window.productSearch) {
        window.productSearch.init();
      } else {
        console.warn('Search module not available');
        initSearchHandlers();  // Fallback to global function
      }
      
      // Initialize product editing functionality
      if (window.productEdit) {
        window.productEdit.init();
      } else {
        console.warn('Edit module not available');
        initEditFormHandlers();  // Fallback to global function
      }
      
      // Initialize table functionality
      if (window.productTable) {
        window.productTable.init();
        window.productTable.logTableStructure();
      }
      
      // Initialize CSV export functionality
      if (window.csvExport) {
        window.csvExport.init();
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
      if (window.productColumns) {
        window.productColumns.init();
      } else if (typeof window.initColumnResizers === 'function') {
        window.initColumnResizers();
      }
      
      if (window.productSort) {
        window.productSort.init();
      } else if (typeof window.initSortHandlers === 'function') {
        window.initSortHandlers();
      }
      
      if (window.productEdit) {
        window.productEdit.initEditButtons();
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
window.productInit = productInit;
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
function initColumnResizers() {
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
window.initColumnResizers = initColumnResizers;

// Sort handlers fallback
function initSortHandlers() {
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
window.initSortHandlers = initSortHandlers;

// Search handlers fallback
function initSearchHandlers() {
  console.log('Using fallback search handler initialization');
  const searchInput = document.getElementById('productSearch');
  if (searchInput) {
    const debouncedSearch = window.utils.debounce(window.searchProducts || function() {
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
window.initSearchHandlers = initSearchHandlers;

// Edit form handlers fallback
function initEditFormHandlers() {
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
window.initEditFormHandlers = initEditFormHandlers;

// Edit buttons fallback
function initEditButtons() {
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
window.initEditButtons = initEditButtons;

// Overlay handler fallback
function initOverlayHandler() {
  console.log('Using fallback overlay handler initialization');
  const overlay = document.getElementById('editFormOverlay');
  if (overlay && typeof window.closeEditForm === 'function') {
    overlay.addEventListener('click', window.closeEditForm);
  }
}
window.initOverlayHandler = initOverlayHandler;

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