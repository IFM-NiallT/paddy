/**
 * sort.js - Product sorting functionality for PADDY
 * 
 * This module handles product sorting functionality:
 * - initSortHandlers() - Initializes sort handlers
 * - handleSortClick() - Handles sort column clicks
 * - updateSortIndicators() - Updates sort direction indicators
 */

// Create a namespace for sorting functionality
const productSort = (function() {
    'use strict';
    
    // Check for required dependencies
    if (typeof utils === 'undefined') {
      console.error('Required dependency missing: utils');
    }
    
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
      
      // Use API module if available
      if (typeof api !== 'undefined' && api.fetchSortedData) {
        api.fetchSortedData(url)
          .then(data => {
            handleSortResponse(data, url);
          })
          .catch(error => {
            console.error('Error fetching sorted data:', error);
            if (typeof utils !== 'undefined') {
              utils.showErrorMessage('Failed to sort data: ' + error.message);
            }
          })
          .finally(() => {
            if (tableBody) {
              tableBody.style.opacity = '1';
            }
          });
      } else {
        // Fallback to direct fetch
        fetchSortedData(url)
          .then(data => {
            handleSortResponse(data, url);
          })
          .catch(error => {
            console.error('Error fetching sorted data:', error);
          })
          .finally(() => {
            if (tableBody) {
              tableBody.style.opacity = '1';
            }
          });
      }
    }
    
    /**
     * Handle sort response
     * @param {Object} data - Response data
     * @param {string} url - Sort URL
     */
    function handleSortResponse(data, url) {
      console.log('Received sorted data:', data);
      if (data && data.Data) {
        // Update the URL without reloading
        window.history.pushState({}, '', url);
        
        // Update table with new data
        if (typeof productTable !== 'undefined' && productTable.updateTableWithResults) {
          productTable.updateTableWithResults(data);
        } else if (window.updateTableWithResults) {
          window.updateTableWithResults(data);
        }
        
        // Update sort indicators based on the new URL
        updateSortIndicators(url);
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
     * Fetch sorted data directly (fallback if API module not available)
     * @param {string} url - URL to fetch data from
     * @returns {Promise<Object>} - Promise with sorted data
     */
    async function fetchSortedData(url) {
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Received non-JSON response:', contentType);
          const text = await response.text();
          console.error('Response text:', text);
          throw new Error('Received non-JSON response');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    }
    
    // Return public methods
    return {
      init: initSortHandlers,
      handleSortClick,
      updateSortIndicators,
      getCurrentSort
    };
  })();
  
  // Export the productSort module (if module system is available)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = productSort;
  }