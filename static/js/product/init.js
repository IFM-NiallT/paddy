/**
 * init.js - Main initialization for PADDY products page
 * 
 * This module initializes all functionality for the products page.
 * It coordinates between the different product modules and ensures
 * proper loading order and dependency management.
 */

// Create a namespace for products initialization
const productInit = (function() {
    'use strict';
    
    /**
     * Check if all required dependencies are loaded
     * @returns {boolean} - Whether all dependencies are available
     */
    function checkDependencies() {
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
      
      // Initialize core components
      if (typeof productColumns !== 'undefined') {
        productColumns.init();
      } else {
        console.warn('Column resizing module not available');
        initColumnResizers();  // Fallback to global function
      }
      
      // Initialize sorting functionality
      if (typeof productSort !== 'undefined') {
        productSort.init();
      } else {
        console.warn('Sort module not available');
        initSortHandlers();  // Fallback to global function
      }
      
      // Initialize search functionality
      if (typeof productSearch !== 'undefined') {
        productSearch.init();
      } else {
        console.warn('Search module not available');
        initSearchHandlers();  // Fallback to global function
      }
      
      // Initialize product editing functionality
      if (typeof productEdit !== 'undefined') {
        productEdit.init();
      } else {
        console.warn('Edit module not available');
        initEditFormHandlers();  // Fallback to global function
      }
      
      // Initialize table event handlers
      if (typeof productTable !== 'undefined' && productTable.logTableStructure) {
        productTable.logTableStructure();
      }
      
      console.log('Products page initialization complete');
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
  
      // Re-initialize all table-related handlers
      if (typeof productColumns !== 'undefined') {
        productColumns.init();
      } else {
        initColumnResizers();
      }
      
      if (typeof productSort !== 'undefined') {
        productSort.init();
      } else {
        initSortHandlers();
      }
      
      if (typeof productEdit !== 'undefined') {
        productEdit.initEditButtons();
      } else {
        initEditButtons();
      }
      
      console.log('Table handlers reinitialized successfully');
      return true;
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
      
      // Expose needed functions to global scope for backwards compatibility
      window.reinitializeTableHandlers = reinitializeTableHandlers;
    }
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
    
    // Return public methods
    return {
      init: initializeProductsPage,
      reinitializeTableHandlers,
      checkDependencies
    };
  })();
  
  // Export the productInit module (if module system is available)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = productInit;
  }
  
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
  
  // Sort handlers fallback
  function initSortHandlers() {
    console.log('Using fallback sort handler initialization');
    const headers = document.querySelectorAll('#productsTable th a');
    headers.forEach(header => {
      header.addEventListener('click', handleSortClick);
    });
    
    // Update sort indicators based on current URL
    updateSortIndicators(window.location.href);
  }
  
  // Search handlers fallback
  function initSearchHandlers() {
    console.log('Using fallback search handler initialization');
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
      const debouncedSearch = debounce(searchProducts, 300);
      searchInput.addEventListener('input', debouncedSearch);
      
      searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          searchProducts();
        }
      });
    }
  }
  
  // Edit form handlers fallback
  function initEditFormHandlers() {
    console.log('Using fallback edit form handler initialization');
    const editFormContainer = document.getElementById('editProductForm');
    if (!editFormContainer) {
      console.warn('Edit form container not found');
      return;
    }
  
    const form = editFormContainer.querySelector('form');
    if (!form) {
      console.warn('Form element not found in container');
      return;
    }
  
    // Remove any existing listeners to prevent duplicates
    form.removeEventListener('submit', submitProductEdit);
    form.addEventListener('submit', submitProductEdit);
  
    // Initialize other handlers
    initEditButtons();
    initOverlayHandler();
  }
  
  // Edit buttons fallback
  function initEditButtons() {
    console.log('Using fallback edit button initialization');
    document.querySelectorAll('.edit-product-btn').forEach(button => {
      button.addEventListener('click', function(event) {
        event.stopPropagation();
        const row = event.target.closest('.product-row');
        if (row) {
          const productId = row.getAttribute('data-product-id');
          if (productId) {
            fetchProductDetails(productId);
          }
        }
      });
    });
  }
  
  // Overlay handler fallback
  function initOverlayHandler() {
    console.log('Using fallback overlay handler initialization');
    const overlay = document.getElementById('editFormOverlay');
    if (overlay) {
      overlay.addEventListener('click', closeEditForm);
    }
  }