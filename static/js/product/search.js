/**
 * search.js - Product search functionality for PADDY
 * 
 * This module handles product search functionality:
 * - initSearchHandlers() - Initializes search handlers
 * - searchProducts() - Performs product search
 * - performLocalSearch() - Performs local (client-side) search
 */

// Create a namespace for search functionality
const productSearch = (function() {
    'use strict';
    
    // Check for required dependencies
    if (typeof utils === 'undefined') {
      console.error('Required dependency missing: utils');
    }
    
    /**
     * Initialize search handlers
     */
    function initSearchHandlers() {
      const searchInput = document.getElementById('productSearch');
      if (searchInput) {
        const debouncedSearch = utils.debounce(searchProducts, 300);
        searchInput.addEventListener('input', debouncedSearch);
        
        searchInput.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            searchProducts();
          }
        });
        
        // Initialize with URL parameters if present
        const urlParams = new URLSearchParams(window.location.search);
        const searchTerm = urlParams.get('search');
        if (searchTerm) {
          searchInput.value = searchTerm;
          // Trigger search
          searchProducts();
        }
      }
    }
    
    /**
     * Perform product search (API or local)
     */
    async function searchProducts() {
      const searchInput = document.getElementById('productSearch');
      const filter = searchInput.value.toLowerCase().trim();
      
      // If search term is empty or very short, handle locally
      if (filter.length < 3) {
        if (filter.length === 0) {
          const rows = document.getElementsByClassName('product-row');
          for (let row of rows) {
            row.style.display = "";
          }
          
          // Update URL (remove search parameter)
          const url = new URL(window.location);
          url.searchParams.delete('search');
          window.history.replaceState({}, '', url);
        } else {
          performLocalSearch(filter);
        }
        return;
      }
      
      // Update URL with search parameter
      const url = new URL(window.location);
      url.searchParams.set('search', filter);
      window.history.replaceState({}, '', url);
      
      // Get category ID from URL path
      const pathParts = window.location.pathname.split('/');
      const categoryId = pathParts[pathParts.indexOf('products') + 1];
      
      console.log('Search Details:', {
        filter: filter,
        categoryId: categoryId,
        searchURL: `/api/search?category=${categoryId}&code=${encodeURIComponent(filter)}`
      });
      
      // Show loading state
      const tableBody = document.querySelector('#productsTable tbody');
      if (tableBody) {
        tableBody.style.opacity = '0.5';
      }
      
      try {
        // Use API module if available
        let data;
        if (typeof api !== 'undefined' && api.searchProducts) {
          data = await api.searchProducts(filter, categoryId);
        } else {
          // Fallback to direct fetch
          const response = await fetch(`/api/search?category=${categoryId}&code=${encodeURIComponent(filter)}`);
          
          if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
          }
          
          data = await response.json();
          
          if (!data || !data.Data) {
            console.error('Invalid response format', data);
            throw new Error('Invalid response format');
          }
        }
        
        // Update the table with search results
        if (typeof productTable !== 'undefined' && productTable.updateTableWithResults) {
          productTable.updateTableWithResults(data);
        } else if (window.updateTableWithResults) {
          window.updateTableWithResults(data);
        } else {
          console.error('Unable to update table: updateTableWithResults not found');
        }
        
      } catch (error) {
        console.error('Search Error:', error);
        // Fall back to local search if API search fails
        performLocalSearch(filter);
      } finally {
        // Reset loading state
        if (tableBody) {
          tableBody.style.opacity = '1';
        }
      }
    }
    
    /**
     * Perform local (client-side) search
     * @param {string} filter - Search term
     */
    function performLocalSearch(filter) {
      console.log('Performing local search with filter:', filter);
      
      const rows = document.getElementsByClassName('product-row');
      let matchCount = 0;
      
      for (let row of rows) {
        const cells = row.getElementsByTagName('td');
        let found = false;
        
        for (let cell of cells) {
          // Check either displayed text or full text stored in data attribute
          const displayText = cell.textContent || cell.innerText;
          const fullText = cell.getAttribute('data-full-text') || displayText;
          
          if (displayText.toLowerCase().indexOf(filter) > -1 || 
              fullText.toLowerCase().indexOf(filter) > -1) {
            found = true;
            break;
          }
        }
        
        row.style.display = found ? "" : "none";
        if (found) matchCount++;
      }
      
      console.log(`Local search complete. Found ${matchCount} matching rows.`);
      
      // Show no results message if needed
      const tbody = document.querySelector('#productsTable tbody');
      if (tbody && matchCount === 0) {
        const existingNoResults = tbody.querySelector('.no-results-row');
        if (!existingNoResults) {
          const noResultsRow = document.createElement('tr');
          noResultsRow.className = 'no-results-row';
          
          const columnCount = typeof productTable !== 'undefined' ? 
            productTable.getColumnCount() : 
            document.querySelectorAll('#productsTable thead th').length;
            
          noResultsRow.innerHTML = `
            <td colspan="${columnCount}" class="text-center py-4">
              No results found for "${filter}"
            </td>
          `;
          tbody.appendChild(noResultsRow);
        }
      } else if (tbody) {
        // Remove any existing no results message
        const existingNoResults = tbody.querySelector('.no-results-row');
        if (existingNoResults) {
          existingNoResults.remove();
        }
      }
      
      // Update URL with search parameter
      const url = new URL(window.location);
      if (filter && filter.length > 0) {
        url.searchParams.set('search', filter);
      } else {
        url.searchParams.delete('search');
      }
      window.history.replaceState({}, '', url);
    }
    
    /**
     * Clear search input and reset table
     */
    function clearSearch() {
      const searchInput = document.getElementById('productSearch');
      if (searchInput) {
        searchInput.value = '';
        
        // Reset all rows to visible
        const rows = document.getElementsByClassName('product-row');
        for (let row of rows) {
          row.style.display = "";
        }
        
        // Remove any no results message
        const tbody = document.querySelector('#productsTable tbody');
        if (tbody) {
          const existingNoResults = tbody.querySelector('.no-results-row');
          if (existingNoResults) {
            existingNoResults.remove();
          }
        }
        
        // Update URL (remove search parameter)
        const url = new URL(window.location);
        url.searchParams.delete('search');
        window.history.replaceState({}, '', url);
      }
    }
    
    /**
     * Initialize clear search button
     */
    function initClearSearchButton() {
      const clearButton = document.getElementById('clearSearch');
      if (clearButton) {
        clearButton.addEventListener('click', function(e) {
          e.preventDefault();
          clearSearch();
        });
      }
    }
    
    /**
     * Initialize everything related to search
     */
    function init() {
      initSearchHandlers();
      initClearSearchButton();
      console.log('Product search functionality initialized');
    }
    
    // Return public methods
    return {
      init,
      search: searchProducts,
      performLocalSearch,
      clearSearch
    };
  })();
  
  // Export the productSearch module (if module system is available)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = productSearch;
  }