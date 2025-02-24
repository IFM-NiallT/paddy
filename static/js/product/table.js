/**
 * table.js - Product table functionality for PADDY
 * 
 * This module handles product table functionality:
 * - getColumnCount() - Gets table column count
 * - createProductRow() - Creates table row for product
 * - updateTableWithResults() - Updates table with new data
 * - updateTableRow() - Updates a single table row
 * - logTableStructure() - Logs table structure for debugging
 * - determineWebStatus() - Determines product web status
 */

// Create a namespace for table functionality
const productTable = (function() {
    'use strict';
    
    // Check for required dependencies
    if (typeof utils === 'undefined') {
      console.error('Required dependency missing: utils');
    }
    
    /**
     * Get the number of columns in the products table
     * @returns {number} - Column count
     */
    function getColumnCount() {
      const headers = document.querySelectorAll('#productsTable thead th');
      return headers.length;
    }
    
    /**
     * Log table structure for debugging
     */
    function logTableStructure() {
      const table = document.querySelector('table');
      if (!table) {
        console.warn('No table found in document');
        return;
      }
      
      const headers = Array.from(table.querySelectorAll('thead th'))
        .map((th, i) => ({
          index: i,
          text: th.textContent.trim().replace(/[↕↑↓]/g, '').trim()
        }));
      
      console.log('Table Headers:', headers);
      
      const sampleRow = table.querySelector('tbody tr');
      if (sampleRow) {
        const cells = Array.from(sampleRow.cells)
          .map((cell, i) => ({
            index: i,
            content: cell.textContent.trim(),
            headerName: headers[i]?.text
          }));
        console.log('Sample Row:', cells);
      }
    }
    
    /**
     * Determine web status for a product
     * @param {Object} product - Product data
     * @returns {boolean} - Whether product is available on web
     */
    function determineWebStatus(product) {
      console.log('Web Status Detection - Raw Product:', product);
  
      // Check ECommerceSettings object first
      if (product.ECommerceSettings?.ECommerceStatus) {
        const statusObj = product.ECommerceSettings.ECommerceStatus;
        
        // Object format with Value/Name
        if (typeof statusObj === 'object') {
          const isAvailable = statusObj.Value === 0 || statusObj.Name === 'Enabled';
          console.log('Object Status Check:', {
            statusValue: statusObj.Value,
            statusName: statusObj.Name,
            isAvailable: isAvailable
          });
          return isAvailable;
        }
        
        // String format
        if (typeof statusObj === 'string') {
          const isAvailable = statusObj === 'Enabled';
          console.log('String Status Check:', {
            statusValue: statusObj,
            isAvailable: isAvailable
          });
          return isAvailable;
        }
      }
  
      // Fallback checks
      const directStatusCheck = [
        product['ECommerceSettings.ECommerceStatus'],
        product.web_status,
        product.WebStatus
      ];
  
      for (let status of directStatusCheck) {
        if (status !== undefined) {
          const isAvailable = 
            status === 'Enabled' || 
            status === '0' || 
            status === 0 || 
            status === true;
          
          console.log('Fallback Status Check:', {
            statusValue: status,
            isAvailable: isAvailable
          });
          
          return isAvailable;
        }
      }
  
      console.warn('No valid web status found, defaulting to not available');
      return false;
    }
    
    /**
     * Create a table row for a product
     * @param {Object} product - Product data
     * @returns {HTMLElement} - Created row element
     */
    function createProductRow(product) {
      const row = document.createElement('tr');
      row.className = 'product-row';
      row.setAttribute('data-product-id', product.ID);
     
      const headers = Array.from(document.querySelector('table thead th'));
     
      // Static fields
      let rowHTML = `
        <td>${utils.escapeHtml(product.Code || '')}</td>
        <td data-full-text="${utils.escapeHtml(product.Description || '')}">${utils.escapeHtml(product.Description || '')}</td>
      `;
     
      // Process dynamic fields (skip Code, Description, and last three columns)
      headers.slice(2, -3)
        .filter(header => {
          const headerText = header.textContent.trim().replace(/[↕↑↓]/g, '').trim();
          return headerText !== 'Web Category';
        })
        .forEach((header, index) => {
          const headerText = header.textContent.trim().replace(/[↕↑↓]/g, '').trim();
          let value = '';
  
          if (window.categoryFieldConfig) {
            const fieldEntry = Object.entries(window.categoryFieldConfig).find(([key, field]) =>
              field.display === headerText && field.used
            );
             
            if (fieldEntry) {
              const [fieldKey, fieldConfig] = fieldEntry;
              value = product[fieldKey] ?? '';
              console.log(`Matched field configuration for "${headerText}":`, {
                fieldKey,
                fieldConfig,
                value
              });
            } else {
              console.warn(`No matching field found for header: "${headerText}"`);
            }
          }
             
          rowHTML += `
            <td data-full-text="${utils.escapeHtml(String(value))}">
              ${utils.escapeHtml(String(value))}
            </td>
          `;
        });
  
      // Determine web status
      const isAvailable = determineWebStatus(product);
      console.log('Web Status Determination:', {
        productId: product.ID,
        ECommerceSettings: product.ECommerceSettings,
        ecommerceStatus: product.ECommerceSettings?.ECommerceStatus,
        isAvailable: isAvailable
      });
  
      // Add Web Status column with proper styling
      rowHTML += `
        <td>
          <span class="web-status-cell ${isAvailable ? 'available' : 'not-available'}">
            ${isAvailable ? 'Available' : 'Not Available'}
          </span>
        </td>
      `;
  
      // Web Category column
      const webCategoryEntry = Object.entries(window.categoryFieldConfig || {}).find(
        ([key, field]) => field.display === 'Web Category'
      );
      let webCategory = '';
      if (webCategoryEntry) {
        const [fieldKey] = webCategoryEntry;
        webCategory = product[fieldKey] || '';
      }
      rowHTML += `
        <td data-full-text="${utils.escapeHtml(webCategory)}">
          ${utils.escapeHtml(webCategory)}
        </td>
      `;
  
      // Image Count column
      const imageCount = product.ImageCount !== undefined && product.ImageCount !== null
        ? Math.round(product.ImageCount)
        : '';
      rowHTML += `
        <td data-full-text="${imageCount}">
          ${imageCount}
        </td>
      `;
     
      // Actions column
      rowHTML += `
        <td>
          <button class="btn-uni edit-product-btn" data-product-id="${product.ID}">
            Edit Product
          </button>
        </td>
      `;
     
      row.innerHTML = rowHTML;
     
      // Add event listener directly here to ensure it's always attached
      const editBtn = row.querySelector('.edit-product-btn');
      if (editBtn && typeof productEdit !== 'undefined') {
        editBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          productEdit.fetchProductDetails(product.ID);
        });
      }
     
      return row;
    }
    
    /**
     * Update table with new results
     * @param {Object} data - Data containing product information
     */
    async function updateTableWithResults(data) {
      console.log('Updating table with data:', data);
     
      const tbody = document.querySelector('#productsTable tbody');
      if (!tbody) {
        console.error('Table body not found');
        return;
      }
      
      // Get category ID and fetch field config if needed
      if (data.Data && data.Data.length > 0 && data.Data[0].Category) {
        const categoryId = data.Data[0].Category.ID;
        console.log('Category ID:', categoryId);
         
        // Await the field config fetch if not already loaded
        if (!window.categoryFieldConfig) {
          try {
            window.categoryFieldConfig = await api.fetchFieldConfig(categoryId);
          } catch (error) {
            console.error('Failed to fetch field config:', error);
          }
        }
      }
     
      tbody.innerHTML = '';
     
      if (!data.Data || data.Data.length === 0) {
        console.warn('No results found');
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
          <td colspan="${getColumnCount()}" class="text-center py-4">
            No results found
          </td>
        `;
        tbody.appendChild(noResultsRow);
        return;
      }
     
      data.Data.forEach(product => {
        const row = createProductRow(product);
        tbody.appendChild(row);
      });
     
      // Update pagination
      if (typeof productPagination !== 'undefined') {
        productPagination.updatePaginationInfo(data);
      }
      
      // Re-initialize edit buttons
      if (typeof productEdit !== 'undefined') {
        productEdit.initEditButtons();
      }
    }
    
    /**
     * Update a single table row
     * @param {string} productId - Product ID
     * @param {Object} updatedProduct - Updated product data
     */
    async function updateTableRow(productId, updatedProduct) {
      console.log('Starting table row update for product:', productId, updatedProduct);
      
      if (!productId || !updatedProduct) {
        console.error('Missing required data for table update:', { productId, updatedProduct });
        return;
      }
  
      // Try to find the table
      const table = document.querySelector('table');
      if (!table) {
        console.error('Table not found');
        return;
      }
  
      const row = table.querySelector(`tr[data-product-id="${productId}"]`);
      console.log('Looking for row with product ID:', productId);
      
      if (!row) {
        console.error('Row not found for product:', productId);
        const allRows = table.querySelectorAll('tr[data-product-id]');
        console.log('Available product rows:', Array.from(allRows).map(r => r.getAttribute('data-product-id')));
        return;
      }
  
      // Get headers and find special column indices
      const headers = Array.from(table.querySelectorAll('thead th'))
        .map(th => th.textContent.trim().replace(/[↕↑↓]/g, '').trim());
      console.log('Found headers:', headers);
  
      // Find indices for special columns
      const specialColumnIndices = {
        images: headers.findIndex(h => h.includes('Images')),
        webStatus: headers.findIndex(h => h.includes('Web Status')),
        actions: headers.findIndex(h => h.includes('Actions'))
      };
      console.log('Special column indices:', specialColumnIndices);
  
      const cells = row.getElementsByTagName('td');
      console.log('Found cells:', cells.length);
  
      // Helper function to update a cell
      const updateCell = (cell, value, fieldName) => {
        if (cell) {
          const oldValue = cell.textContent;
          const displayValue = value !== undefined && value !== null ? value : '';
          
          // Update both text content and data attribute
          cell.textContent = displayValue;
          cell.setAttribute('data-full-text', displayValue);
          
          console.log(`Updated cell ${fieldName}:`, {
            oldValue,
            newValue: displayValue,
            success: cell.textContent === displayValue
          });
        }
      };
  
      // Update static fields
      console.log('Updating static fields...');
      updateCell(cells[0], updatedProduct.Code, 'Code');
      updateCell(cells[1], updatedProduct.Description, 'Description');
  
      // Ensure we have the category field configuration
      if (!window.categoryFieldConfig && updatedProduct.Category) {
        console.log('Fetching missing category field config...');
        try {
          await api.fetchFieldConfig(updatedProduct.Category.ID);
        } catch (error) {
          console.error('Failed to fetch field configuration:', error);
          return;
        }
      }
  
      // Update dynamic fields
      let cellIndex = 2;
      console.log('Updating dynamic fields...');
      
      // Process all columns between Description and Images
      for (let i = 2; i < specialColumnIndices.images; i++) {
        const header = headers[i];
        if (cells[i] && window.categoryFieldConfig) {
          const fieldEntry = Object.entries(window.categoryFieldConfig)
            .find(([key, field]) => field.display === header && field.used);
  
          if (fieldEntry) {
            const [fieldKey] = fieldEntry;
            console.log(`Updating dynamic field: ${header} (${fieldKey}) at index ${i}`);
            updateCell(cells[i], updatedProduct[fieldKey], fieldKey);
          }
        }
        cellIndex++;
      }
  
      // Update special columns in their correct positions
      if (specialColumnIndices.images > -1) {
        const imageCount = updatedProduct.ImageCount !== undefined ? 
          Math.round(updatedProduct.ImageCount) : '';
        console.log('Updating Image Count at index:', specialColumnIndices.images);
        updateCell(cells[specialColumnIndices.images], imageCount, 'Image Count');
      }
  
      if (specialColumnIndices.webStatus > -1) {
        let isAvailable = determineWebStatus(updatedProduct);
  
        console.log('Final status determination:', {
          isAvailable: isAvailable,
          productId: updatedProduct.ID
        });
  
        const webStatusCell = cells[specialColumnIndices.webStatus];
        if (webStatusCell) {
          const statusSpan = webStatusCell.querySelector('.web-status-cell');
          if (statusSpan) {
            const oldClass = statusSpan.className;
            const oldText = statusSpan.textContent;
            
            statusSpan.className = `web-status-cell ${isAvailable ? 'available' : 'not-available'}`;
            statusSpan.textContent = isAvailable ? 'Available' : 'Not Available';
            
            console.log('Web status cell updated:', {
              oldClass: oldClass,
              newClass: statusSpan.className,
              oldText: oldText,
              newText: statusSpan.textContent
            });
          } else {
            // If span doesn't exist, create it
            const newSpan = document.createElement('span');
            newSpan.className = `web-status-cell ${isAvailable ? 'available' : 'not-available'}`;
            newSpan.textContent = isAvailable ? 'Available' : 'Not Available';
            webStatusCell.innerHTML = '';
            webStatusCell.appendChild(newSpan);
            console.log('Created new web status span');
          }
        } else {
          console.warn('Web status cell not found at index:', specialColumnIndices.webStatus);
        }
      }
  
      // Visual feedback
      row.style.opacity = '0.99';
      requestAnimationFrame(() => {
        row.style.opacity = '1';
        row.style.opacity = '';  // Remove the inline style
      });
  
      // Try to reinitialize table handlers
      if (typeof productInit !== 'undefined' && productInit.reinitializeTableHandlers) {
        productInit.reinitializeTableHandlers();
      } else if (window.reinitializeTableHandlers) {
        window.reinitializeTableHandlers();
      }
  
      console.log('Row update completed for product:', productId);
    }
    
    // Return public methods
    return {
      getColumnCount,
      createProductRow,
      updateTableWithResults,
      updateTableRow,
      logTableStructure,
      determineWebStatus
    };
  })();
  
  // Export the productTable module (if module system is available)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = productTable;
  }