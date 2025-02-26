/**
 * columns.js - Column resizing functionality for PADDY products table
 * 
 * This module handles column resizing:
 * - initColumnResizers() - Initializes column resize functionality
 * - saveColumnWidths() - Saves column widths to localStorage
 * - loadColumnWidths() - Loads column widths from localStorage
 */

// Create a namespace for column functionality
const productColumns = (function() {
  'use strict';
  
  // Private variables
  const STORAGE_KEY = 'paddyTableColumnWidths';
  let isResizing = false;
  
  /**
   * Initialize column resizers
   */
  function initColumnResizers() {
    const table = document.getElementById('productsTable');
    
    if (!table) {
      console.debug('Products table not found, skipping column resizer initialization');
      return;
    }
    
    function setupResizers() {
      const cols = table.querySelectorAll('th');
      
      if (!cols.length) {
        console.debug('No columns found in products table');
        return;
      }
      
      // Load saved column widths
      loadColumnWidths();
      
      cols.forEach((col) => {
        // Create resizer if it doesn't exist
        let resizer = col.querySelector('.resizer');
        if (!resizer) {
          resizer = document.createElement('div');
          resizer.className = 'resizer';
          col.appendChild(resizer);
        }
        
        let x = 0, w = 0;
        
        function mouseDownHandler(e) {
          e.preventDefault();
          e.stopPropagation();
          
          x = e.clientX;
          w = parseInt(window.getComputedStyle(col).width, 10);
          
          document.addEventListener('mousemove', mouseMoveHandler);
          document.addEventListener('mouseup', mouseUpHandler);
          document.body.style.cursor = 'col-resize';
          resizer.classList.add('resizing');
          isResizing = true;
          
          // Add a class to the table during resize
          table.classList.add('resizing');
        }
        
        function mouseMoveHandler(e) {
          if (!isResizing) return;
          
          const dx = e.clientX - x;
          const newWidth = Math.max(50, w + dx); // Ensure minimum width of 50px
          
          col.style.width = `${newWidth}px`;
          const index = Array.from(col.parentElement.children).indexOf(col);
          const cells = table.querySelectorAll(`td:nth-child(${index + 1})`);
          cells.forEach(cell => {
            cell.style.width = `${newWidth}px`;
          });
        }
        
        function mouseUpHandler() {
          document.removeEventListener('mousemove', mouseMoveHandler);
          document.removeEventListener('mouseup', mouseUpHandler);
          document.body.style.cursor = '';
          resizer.classList.remove('resizing');
          table.classList.remove('resizing');
          isResizing = false;
          
          // Save column widths after resizing
          saveColumnWidths();
        }
        
        // Remove existing event listener to prevent duplicates
        resizer.removeEventListener('mousedown', mouseDownHandler);
        resizer.addEventListener('mousedown', mouseDownHandler);
      });
    }
    
    setupResizers();
    
    // Handle window resize event
    window.addEventListener('resize', window.utils.debounce(setupResizers, 250));
    
    // Ensure resizers don't trigger table header sorting
    const resizers = table.querySelectorAll('.resizer');
    if (resizers.length) {
      resizers.forEach(resizer => {
        resizer.addEventListener('click', (e) => { 
          e.stopPropagation(); 
        });
      });
    }
  }
  
  /**
   * Save column widths to localStorage
   */
  function saveColumnWidths() {
    try {
      const table = document.getElementById('productsTable');
      if (!table) return;
      
      const headers = table.querySelectorAll('th');
      if (!headers.length) return;
      
      const widths = {};
      let categoryId = getCategoryId();
      
      headers.forEach((header, index) => {
        const headerText = header.textContent.trim().replace(/[↕↑↓]/g, '').trim();
        const width = header.style.width || window.getComputedStyle(header).width;
        
        if (width) {
          widths[headerText] = width;
        }
      });
      
      // Group widths by category ID
      let savedWidths = {};
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          savedWidths = JSON.parse(savedData);
        }
      } catch (e) {
        console.error('Error parsing saved column widths:', e);
      }
      
      savedWidths[categoryId] = widths;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedWidths));
      
      console.debug('Saved column widths for category', categoryId, widths);
    } catch (error) {
      console.error('Error saving column widths:', error);
    }
  }
  
  /**
   * Load column widths from localStorage
   */
  function loadColumnWidths() {
    try {
      const table = document.getElementById('productsTable');
      if (!table) return;
      
      const headers = table.querySelectorAll('th');
      if (!headers.length) return;
      
      let categoryId = getCategoryId();
      const savedData = localStorage.getItem(STORAGE_KEY);
      
      if (!savedData) return;
      
      const savedWidths = JSON.parse(savedData);
      const categoryWidths = savedWidths[categoryId];
      
      if (!categoryWidths) return;
      
      headers.forEach((header) => {
        const headerText = header.textContent.trim().replace(/[↕↑↓]/g, '').trim();
        const savedWidth = categoryWidths[headerText];
        
        if (savedWidth) {
          header.style.width = savedWidth;
          
          const index = Array.from(header.parentElement.children).indexOf(header);
          const cells = table.querySelectorAll(`td:nth-child(${index + 1})`);
          cells.forEach(cell => {
            cell.style.width = savedWidth;
          });
        }
      });
      
      console.debug('Loaded column widths for category', categoryId, categoryWidths);
    } catch (error) {
      console.error('Error loading column widths:', error);
    }
  }
  
  /**
   * Get current category ID from URL
   * @returns {string} - Category ID or 'default'
   */
  function getCategoryId() {
    try {
      const pathParts = window.location.pathname.split('/');
      const categoryIndex = pathParts.indexOf('products') + 1;
      
      if (categoryIndex > 0 && categoryIndex < pathParts.length) {
        return pathParts[categoryIndex];
      }
    } catch (e) {
      console.error('Error extracting category ID:', e);
    }
    
    return 'default';
  }
  
  /**
   * Reset column widths to default
   */
  function resetColumnWidths() {
    try {
      const table = document.getElementById('productsTable');
      if (!table) return;
      
      const headers = table.querySelectorAll('th');
      if (!headers.length) return;
      
      headers.forEach((header) => {
        header.style.width = '';
        
        const index = Array.from(header.parentElement.children).indexOf(header);
        const cells = table.querySelectorAll(`td:nth-child(${index + 1})`);
        cells.forEach(cell => {
          cell.style.width = '';
        });
      });
      
      // Remove saved widths for current category
      let categoryId = getCategoryId();
      const savedData = localStorage.getItem(STORAGE_KEY);
      
      if (savedData) {
        try {
          const savedWidths = JSON.parse(savedData);
          if (savedWidths[categoryId]) {
            delete savedWidths[categoryId];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedWidths));
          }
        } catch (e) {
          console.error('Error updating saved column widths:', e);
        }
      }
      
      console.debug('Reset column widths for category', categoryId);
    } catch (error) {
      console.error('Error resetting column widths:', error);
    }
  }
  
  /**
   * Initialize everything related to columns
   */
  function init() {
    initColumnResizers();
    
    // Add reset button if configured
    const resetButton = document.getElementById('resetColumnWidths');
    if (resetButton) {
      resetButton.addEventListener('click', (e) => {
        e.preventDefault();
        resetColumnWidths();
      });
    }
    
    console.log('Product columns functionality initialized');
  }
  
  // Return public methods
  return {
    init,
    initColumnResizers,
    saveColumnWidths,
    loadColumnWidths,
    resetColumnWidths
  };
})();

// Expose productColumns globally for backward compatibility  
window.productColumns = productColumns;
window.initColumnResizers = productColumns.initColumnResizers;
window.saveColumnWidths = productColumns.saveColumnWidths;
window.loadColumnWidths = productColumns.loadColumnWidths;
window.resetColumnWidths = productColumns.resetColumnWidths;

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', productColumns.init);

// Export the module if CommonJS module system is available
if (typeof module !== 'undefined' && module.exports) {
module.exports = { productColumns };
}