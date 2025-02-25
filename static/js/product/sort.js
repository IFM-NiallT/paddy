/**
 * sort.js - Product sorting functionality for PADDY
 * 
 * This module handles product sorting functionality:
 * - initSortHandlers() - Initializes sort handlers
 * - handleSortClick() - Handles sort column clicks
 * - updateSortIndicators() - Updates sort direction indicators
 */

import { utils } from '../core/utils.js';
import { api } from '../core/api.js';

// Create a namespace for sorting functionality
export const productSort = (function() {
  'use strict';
  
  /**
   * Initialize sort handlers
   */
  function initSortHandlers() {
    const headers = document.querySelectorAll('#productsTable th a');
    headers.forEach(header => {
      // Remove any existing event listeners to prevent duplicates
      header.removeEventListener('click', handleSortClick);
      header.addEventListener('click', handleSortClick);
    });
    
    // Initialize sort indicators based on current URL
    updateSortIndicators(window.location.href);
  }
  
  /**
   * Handle sort column click
   * @param {Event} event - Click event
   */
  function handleSortClick(event) {
    event.preventDefault();
    const url = event.target.href;
    
    console.log('Sort URL:', url);
    
    // Show loading state
    const tableBody = document.querySelector('#productsTable tbody');
    if (tableBody) {
      tableBody.style.opacity = '0.5';
    }
    
    // Use API module
    api.fetchSortedData(url)
      .then(data => {
        handleSortResponse(data, url);
      })
      .catch(error => {
        console.error('Error fetching sorted data:', error);
        utils.showErrorMessage('Failed to sort data: ' + error.message);
      })
      .finally(() => {
        if (tableBody) {
          tableBody.style.opacity = '1';
        }
      });
  }
  
  /**
   * Handle sort response data
   * @param {Object} data - Response data
   * @param {string} url - Sort URL
   */
  function handleSortResponse(data, url) {
    // Update browser history with the new URL
    window.history.pushState({}, '', url);
    
    // Update sort indicators
    updateSortIndicators(url);
    
    // Update table with new data
    if (typeof window.updateTableWithResults === 'function') {
      window.updateTableWithResults(data);
    } else {
      console.error('updateTableWithResults function not found');
    }
  }
  
  /**
   * Update sort indicators in table headers
   * @param {string} newUrl - URL with sort parameters
   */
  function updateSortIndicators(newUrl) {
    // Get current sort state from URL
    const url = new URL(newUrl, window.location.origin);
    const urlParams = new URLSearchParams(url.search);
    const currentSort = urlParams.get('sort');
    
    console.log('Current sort:', currentSort);
    
    // Remove all current sort classes
    document.querySelectorAll('#productsTable th').forEach(th => {
      th.classList.remove('current-sort', 'asc', 'dsc');
    });
    
    if (currentSort) {
      // Extract field and direction
      const match = currentSort.match(/(\w+)\[(asc|dsc)\]/);
      if (match) {
        const [, field, direction] = match;
        console.log('Parsed sort:', { field, direction });
        
        // Find the header for this field
        const header = Array.from(document.querySelectorAll('#productsTable th')).find(th => {
          const link = th.querySelector('a');
          return link && link.href.includes(`sort=${field}`);
        });
        
        if (header) {
          // Add current sort class and direction
          header.classList.add('current-sort', direction);
          
          // Update the link's href with the next sort direction
          const link = header.querySelector('a');
          if (link) {
            const nextDirection = direction === 'asc' ? 'dsc' : 'asc';
            const baseUrl = new URL(link.href);
            baseUrl.searchParams.set('sort', `${field}[${nextDirection}]`);
            link.href = baseUrl.toString();
            
            console.log('Updated link href:', link.href);
          }
        }
      }
    }
  }
  
  /**
   * Get current sort parameters
   * @returns {Object} - Sort parameters { field, direction }
   */
  function getCurrentSort() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentSort = urlParams.get('sort');
    
    if (currentSort) {
      const match = currentSort.match(/(\w+)\[(asc|dsc)\]/);
      if (match) {
        const [, field, direction] = match;
        return { field, direction };
      }
    }
    
    return { field: null, direction: null };
  }
  
  /**
   * Initialize everything related to sorting
   */
  function init() {
    initSortHandlers();
    console.log('Product sort functionality initialized');
  }
  
  // Return public methods
  return {
    init,
    handleSortClick,
    updateSortIndicators,
    getCurrentSort,
    handleSortResponse
  };
})();

// Expose functions globally for backward compatibility
window.updateSortIndicators = productSort.updateSortIndicators;
window.handleSortClick = productSort.handleSortClick;
window.initSortHandlers = productSort.init;

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', productSort.init);

// Export the updateSortIndicators function separately as needed by other modules
export const updateSortIndicators = productSort.updateSortIndicators;

// Export the module if CommonJS module system is available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { productSort, updateSortIndicators };
}