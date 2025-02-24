/**
 * pagination.js - Product pagination functionality for PADDY
 * 
 * This module handles pagination for the products table:
 * - updatePaginationInfo() - Updates pagination controls
 * - handlePageChange() - Handles page navigation
 * - renderPagination() - Renders pagination controls
 */

// Create a namespace for pagination functionality
const productPagination = (function() {
    'use strict';
    
    // Check for required dependencies
    if (typeof utils === 'undefined') {
      console.error('Required dependency missing: utils');
    }
    
    /**
     * Update pagination information and controls
     * @param {Object} data - Pagination data with CurrentPage, TotalPages, etc.
     */
    function updatePaginationInfo(data) {
      const paginationContainer = document.querySelector('.pagination-container');
      if (!paginationContainer) {
        console.warn('Pagination container not found');
        return;
      }
      
      const start = (data.CurrentPage - 1) * data.ItemsPerPage + 1;
      const end = Math.min(data.CurrentPage * data.ItemsPerPage, data.TotalCount);
      
      let html = '';
      
      if (data.CurrentPage > 1) {
        html += `<a href="#" class="pagination-arrow" data-page="1" aria-label="Skip to first page">⏮️</a>`;
        html += `<a href="#" class="pagination-arrow" data-page="${data.CurrentPage-1}" aria-label="Previous page">⬅️</a>`;
      }
      
      html += `<span class="pagination-count">${start}-${end}/${data.TotalCount}</span>`;
      
      if (data.CurrentPage < data.TotalPages) {
        html += `<a href="#" class="pagination-arrow" data-page="${data.CurrentPage+1}" aria-label="Next page">➡️</a>`;
        html += `<a href="#" class="pagination-arrow" data-page="${data.TotalPages}" aria-label="Skip to last page">⏭️</a>`;
      }
      
      paginationContainer.innerHTML = html;
      
      // Add event listeners to pagination arrows
      paginationContainer.querySelectorAll('.pagination-arrow').forEach(arrow => {
        arrow.addEventListener('click', handlePageChange);
      });
    }
    
    /**
     * Handle page change events
     * @param {Event} event - Click event on pagination control
     */
    async function handlePageChange(event) {
      event.preventDefault();
      
      const page = parseInt(event.target.dataset.page);
      
      // Show loading indicator
      const tableBody = document.querySelector('#productsTable tbody');
      if (tableBody) {
        tableBody.style.opacity = '0.5';
      }
      
      try {
        // Build new URL with updated page parameter
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', page);
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        
        // Use API module if available
        let data;
        if (typeof api !== 'undefined' && api.fetchSortedData) {
          data = await api.fetchSortedData(newUrl);
        } else {
          // Fallback to direct fetch
          const response = await fetch(newUrl, {
            headers: {
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          
          // Check response type before parsing
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Received non-JSON response');
          }
          
          data = await response.json();
        }
        
        // Update browser history
        window.history.pushState({}, '', newUrl);
        
        // Update table with new data
        if (typeof productTable !== 'undefined' && productTable.updateTableWithResults) {
          productTable.updateTableWithResults(data);
        } else if (window.updateTableWithResults) {
          window.updateTableWithResults(data);
        }
      } catch (error) {
        console.error('Error changing page:', error);
        
        if (typeof utils !== 'undefined' && utils.showErrorMessage) {
          utils.showErrorMessage(`Failed to change page: ${error.message}`);
        } else {
          alert(`Failed to change page: ${error.message}`);
        }
      } finally {
        // Remove loading indicator
        if (tableBody) {
          tableBody.style.opacity = '1';
        }
      }
    }
    
    /**
     * Render pagination controls with more advanced options
     * @param {Object} data - Pagination data
     * @param {number} visiblePages - Number of page buttons to display
     */
    function renderPagination(data, visiblePages = 5) {
      const paginationContainer = document.querySelector('.pagination-container');
      if (!paginationContainer) {
        console.warn('Pagination container not found');
        return;
      }
      
      const currentPage = data.CurrentPage;
      const totalPages = data.TotalPages;
      const itemsPerPage = data.ItemsPerPage;
      const totalItems = data.TotalCount;
      
      // Calculate range of items being displayed
      const start = (currentPage - 1) * itemsPerPage + 1;
      const end = Math.min(currentPage * itemsPerPage, totalItems);
      
      let html = '<div class="pagination">';
      
      // Add "First" and "Previous" buttons
      if (currentPage > 1) {
        html += `<a href="#" class="pagination-arrow" data-page="1" aria-label="First page">«</a>`;
        html += `<a href="#" class="pagination-arrow" data-page="${currentPage-1}" aria-label="Previous page">‹</a>`;
      } else {
        html += `<span class="pagination-arrow disabled">«</span>`;
        html += `<span class="pagination-arrow disabled">‹</span>`;
      }
      
      // Calculate page range to show
      let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
      let endPage = Math.min(totalPages, startPage + visiblePages - 1);
      
      // Adjust if we're near the end
      if (endPage - startPage + 1 < visiblePages) {
        startPage = Math.max(1, endPage - visiblePages + 1);
      }
      
      // Add page numbers
      for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
          html += `<span class="pagination-page current">${i}</span>`;
        } else {
          html += `<a href="#" class="pagination-page" data-page="${i}">${i}</a>`;
        }
      }
      
      // Add "Next" and "Last" buttons
      if (currentPage < totalPages) {
        html += `<a href="#" class="pagination-arrow" data-page="${currentPage+1}" aria-label="Next page">›</a>`;
        html += `<a href="#" class="pagination-arrow" data-page="${totalPages}" aria-label="Last page">»</a>`;
      } else {
        html += `<span class="pagination-arrow disabled">›</span>`;
        html += `<span class="pagination-arrow disabled">»</span>`;
      }
      
      html += '</div>';
      
      // Add items info
      html += `<div class="pagination-info">Showing ${start}-${end} of ${totalItems} items</div>`;
      
      paginationContainer.innerHTML = html;
      
      // Add event listeners to pagination controls
      paginationContainer.querySelectorAll('.pagination-arrow:not(.disabled), .pagination-page:not(.current)').forEach(el => {
        el.addEventListener('click', handlePageChange);
      });
    }
    
    /**
     * Initialize pagination
     */
    function init() {
      // Check for pre-existing pagination data in page
      const paginationData = window.paginationData;
      if (paginationData) {
        updatePaginationInfo(paginationData);
      }
    }
    
    // Return public methods
    return {
      init,
      updatePaginationInfo,
      handlePageChange,
      renderPagination
    };
  })();
  
  // Export the productPagination module (if module system is available)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = productPagination;
  }