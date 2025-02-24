/**
 * edit.js - Product editing functionality for PADDY
 * 
 * This module handles product editing functionality:
 * - initEditFormHandlers() - Initializes edit form handlers
 * - initEditButtons() - Sets up edit button click handlers
 * - openEditForm() - Opens edit form modal
 * - closeEditForm() - Closes edit form modal
 * - fetchProductDetails() - Fetches product details
 * - populateCurrentDetails() - Shows current product details
 * - populateEditForm() - Populates edit form fields
 * - submitProductEdit() - Handles form submission
 * - createFieldGroup() - Creates form field group
 * - isFieldReadOnly() - Checks if field is read-only
 */

// Create a namespace for product editing functionality
const productEdit = (function() {
    'use strict';
    
    // Check for required dependencies
    if (typeof utils === 'undefined') {
      console.error('Required dependency missing: utils');
    }
    
    /**
     * Initialize edit form handlers
     */
    function initEditFormHandlers() {
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
      
      // Initialize close button
      const closeButton = editFormContainer.querySelector('.close-button, .cancel');
      if (closeButton) {
        closeButton.removeEventListener('click', closeEditForm);
        closeButton.addEventListener('click', function(e) {
          e.preventDefault();
          closeEditForm();
        });
      }
    }
  
    /**
     * Initialize edit buttons
     */
    function initEditButtons() {
      document.querySelectorAll('.edit-product-btn').forEach(button => {
        // Remove existing listeners to prevent duplicates
        button.removeEventListener('click', handleEditButtonClick);
        button.addEventListener('click', handleEditButtonClick);
      });
    }
    
    /**
     * Handle edit button clicks
     * @param {Event} event - Click event
     */
    function handleEditButtonClick(event) {
      event.stopPropagation();
      const productId = event.target.getAttribute('data-product-id');
      // If no product ID on button, try to get from parent row
      if (!productId) {
        const row = event.target.closest('.product-row');
        if (row) {
          const rowProductId = row.getAttribute('data-product-id');
          if (rowProductId) {
            fetchProductDetails(rowProductId);
          }
        }
      } else {
        fetchProductDetails(productId);
      }
    }
  
    /**
     * Open edit form modal
     */
    function openEditForm() {
      const editForm = document.getElementById("editProductForm");
      const overlay = document.getElementById("editFormOverlay");
      
      if (editForm && overlay) {
        overlay.style.display = "block";
        editForm.style.display = "block";
        
        // Trigger reflow to enable CSS animations
        overlay.offsetHeight;
        editForm.offsetHeight;
        
        overlay.classList.add('active');
        editForm.classList.add('active');
        
        document.addEventListener('keydown', handleEditFormKeypress);
        
        // Focus the first input field in the form
        const firstInput = editForm.querySelector('input:not([type="hidden"])');
        if (firstInput) {
          firstInput.focus();
        }
      }
    }
  
    /**
     * Close edit form modal
     */
    function closeEditForm() {
      const editForm = document.getElementById("editProductForm");
      const overlay = document.getElementById("editFormOverlay");
      
      if (editForm && overlay) {
        overlay.classList.remove('active');
        editForm.classList.remove('active');
        
        document.removeEventListener('keydown', handleEditFormKeypress);
        
        // Wait for CSS animation to complete before hiding
        setTimeout(() => {
          overlay.style.display = "none";
          editForm.style.display = "none";
          
          // Reset the form fields
          const form = editForm.querySelector('form');
          if (form) {
            form.reset();
          }
        }, 300);
        
        // Return focus to the main content
        const mainContent = document.querySelector('main');
        if (mainContent) {
          mainContent.focus();
        }
      }
    }
  
    /**
     * Handle keypress events in edit form
     * @param {KeyboardEvent} event - Keyboard event
     */
    function handleEditFormKeypress(event) {
      if (event.key === 'Escape') {
        closeEditForm();
      }
    }
  
    /**
     * Fetch product details for editing
     * @param {string} productId - Product ID
     */
    function fetchProductDetails(productId) {
      if (!productId) {
        console.error('Invalid product ID');
        if (typeof utils !== 'undefined' && utils.showErrorMessage) {
          utils.showErrorMessage('Error: Invalid product ID');
        } else {
          alert('Error: Invalid product ID');
        }
        return;
      }
      
      // Show loading state
      const editForm = document.getElementById('editProductForm');
      if (editForm) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = '<div class="spinner"></div><p>Loading product details...</p>';
        
        // Clear previous loading indicators if any
        const existingIndicator = editForm.querySelector('.loading-indicator');
        if (existingIndicator) {
          existingIndicator.remove();
        }
        
        editForm.appendChild(loadingIndicator);
      }
  
      // Use API module if available
      if (typeof api !== 'undefined' && api.fetchProductDetails) {
        api.fetchProductDetails(productId)
          .then(data => {
            handleProductDetailsResponse(data);
          })
          .catch(error => {
            console.error('Error fetching product details:', error);
            if (typeof utils !== 'undefined' && utils.showErrorMessage) {
              utils.showErrorMessage(`Failed to load product details: ${error.message}`);
            } else {
              alert(`Failed to load product details: ${error.message}`);
            }
          })
          .finally(() => {
            // Remove loading indicator
            if (editForm) {
              const loadingIndicator = editForm.querySelector('.loading-indicator');
              if (loadingIndicator) {
                loadingIndicator.remove();
              }
            }
          });
      } else {
        // Fallback to direct fetch
        fetch(`/product/${productId}/edit`)
          .then(response => {
            console.log(`Response status: ${response.status}`);
  
            if (!response.ok) {
              return response.text().then(errorText => {
                console.error('Error response:', errorText);
                throw new Error(errorText || 'Failed to fetch product details');
              });
            }
            return response.json();
          })
          .then(data => {
            handleProductDetailsResponse(data);
          })
          .catch(error => {
            console.error('Error fetching product details:', error);
            if (typeof utils !== 'undefined' && utils.showErrorMessage) {
              utils.showErrorMessage(`Failed to load product details: ${error.message}`);
            } else {
              alert(`Failed to load product details: ${error.message}`);
            }
          })
          .finally(() => {
            // Remove loading indicator
            if (editForm) {
              const loadingIndicator = editForm.querySelector('.loading-indicator');
              if (loadingIndicator) {
                loadingIndicator.remove();
              }
            }
          });
      }
    }
    
    /**
     * Handle product details response
     * @param {Object} data - Product details data
     */
    function handleProductDetailsResponse(data) {
      if (!data || !data.product) {
        console.error('Invalid response data', data);
        throw new Error('Invalid product data received');
      }
  
      const product = data.product;
      populateCurrentDetails(product, data.dynamic_fields);
      populateEditForm(product, product.ID, data.dynamic_fields);
      openEditForm();
    }
  
    /**
     * Check if field is read-only
     * @param {string} fieldName - Field name
     * @returns {boolean} - Whether field is read-only
     */
    function isFieldReadOnly(fieldName) {
      const readOnlyFields = [
        'Code',
        'Description',
        'ImageCount',
        'popupProductName'
        // Add other read-only fields as needed
      ];
      return readOnlyFields.includes(fieldName);
    }
  
    /**
     * Populate current product details section
     * @param {Object} product - Product data
     * @param {Array} dynamicFields - Dynamic field definitions
     */
    function populateCurrentDetails(product, dynamicFields) {
      const container = document.getElementById('currentProductDetails');
      if (!container) return;
  
      // Helper function to determine web status
      function getWebStatus(product) {
        // Use the determineWebStatus function if available
        if (typeof productTable !== 'undefined' && productTable.determineWebStatus) {
          const isAvailable = productTable.determineWebStatus(product);
          return isAvailable ? 'Available' : 'Not Available';
        }
        
        // Fallback implementation
        // Check ECommerceSettings object first
        if (product.ECommerceSettings?.ECommerceStatus) {
          const statusObj = product.ECommerceSettings.ECommerceStatus;
          
          // Object format with Value/Name
          if (typeof statusObj === 'object') {
            const isAvailable = statusObj.Value === 0 || statusObj.Name === 'Enabled';
            return isAvailable ? 'Available' : 'Not Available';
          }
          
          // String format
          if (typeof statusObj === 'string') {
            return statusObj === 'Enabled' ? 'Available' : 'Not Available';
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
            
            return isAvailable ? 'Available' : 'Not Available';
          }
        }
  
        return 'Not Available';
      }
  
      const allFields = [
        { field: 'Code', label: 'Product Code' },
        { field: 'Description', label: 'Description' },
        { field: 'D_Classification', label: 'Classification' },
        { field: 'D_ThreadGender', label: 'Thread Gender' },
        { field: 'D_SizeA', label: 'Size A' },
        { field: 'D_SizeB', label: 'Size B' },
        { field: 'D_SizeC', label: 'Size C' },
        { field: 'D_SizeD', label: 'Size D' },
        { field: 'D_Orientation', label: 'Orientation' },
        { field: 'D_Configuration', label: 'Configuration' },
        { field: 'D_Grade', label: 'Grade' },
        { field: 'D_ManufacturerName', label: 'Manufacturer Name' },
        { field: 'D_Application', label: 'Application' },
        { field: 'D_WebCategory', label: 'Web Category' },
        { field: 'ECommerceStatus', label: 'Web Status', getValue: () => getWebStatus(product) }
      ];
  
      console.log('Current Product Details:', {
        productId: product.ID,
        ecommerceSettings: product.ECommerceSettings,
        ecommerceStatus: product.ECommerceSettings?.ECommerceStatus,
        webStatus: getWebStatus(product)
      });
  
      container.innerHTML = `
        <table class="table table-bordered">
          ${allFields.map(field => {
            let displayValue = field.getValue ?
              field.getValue() :
              (product[field.field] || '');
             
            // Special handling for web status display
            if (field.field === 'ECommerceStatus') {
              return `
                <tr>
                  <th>${field.label}</th>
                  <td>
                    <span class="web-status-cell ${displayValue === 'Available' ? 'available' : 'not-available'}">
                      ${displayValue}
                    </span>
                  </td>
                </tr>
              `;
            }
  
            return `
              <tr>
                <th>${field.label}</th>
                <td>${displayValue}</td>
              </tr>
            `;
          }).join('')}
        </table>
      `;
    }
  
    /**
     * Populate edit form with product data
     * @param {Object} product - Product data
     * @param {string} productId - Product ID
     * @param {Array} dynamicFields - Dynamic field definitions
     */
    function populateEditForm(product, productId, dynamicFields) {
      // Set read-only fields using textContent
      document.getElementById('popupProductCode').textContent = product.Code || '';
      document.getElementById('popupProductId').value = productId;
     
      // Handle product name (read-only)
      const productNameElement = document.getElementById('popupProductName');
      if (productNameElement) {
        productNameElement.textContent = product.Description || '';
      }
  
      const firstColumn = document.getElementById('popupFirstColumn');
      const secondColumn = document.getElementById('popupSecondColumn');
  
      firstColumn.innerHTML = '';
      secondColumn.innerHTML = '';
  
      if (Array.isArray(dynamicFields)) {
        const filteredDynamicFields = dynamicFields.filter(field =>
          field.name !== 'web_status' &&
          field.name !== 'extended_description'
        );
        const midpoint = Math.ceil(filteredDynamicFields.length / 2);
         
        filteredDynamicFields.forEach((field, index) => {
          field.value = product[field.name] !== undefined ? product[field.name] : '';
          field.readonly = isFieldReadOnly(field.name);
          const fieldGroup = createFieldGroup(field);
          (index < midpoint ? firstColumn : secondColumn).appendChild(fieldGroup);
        });
      }
  
      // Handle remaining fields
      const imageCountInput = document.getElementById('popupImageCount');
      if (imageCountInput) {
        imageCountInput.value = product.ImageCount || '';
        imageCountInput.setAttribute('readonly', 'readonly');
      }
  
      const webCategoryInput = document.getElementById('popupWebCategory');
      if (webCategoryInput) {
        webCategoryInput.value = product.D_WebCategory || '';
      }
  
      const extendedDescInput = document.getElementById('popupExtendedDescription');
      if (extendedDescInput) {
        extendedDescInput.value = product.extended_description || '';
      }
  
      // Enhanced web status handling logic
      const webStatusSelect = document.getElementById('popupWebStatus');
      if (webStatusSelect) {
        let isAvailable = false;
  
        // Use determineWebStatus function if available
        if (typeof productTable !== 'undefined' && productTable.determineWebStatus) {
          isAvailable = productTable.determineWebStatus(product);
        } else {
          // Fallback implementation
          // Check for ECommerceStatus object with Value and Name properties
          if (product.ECommerceSettings && product.ECommerceSettings.ECommerceStatus) {
            const statusObj = product.ECommerceSettings.ECommerceStatus;
            
            // Check if it's the object format
            if (typeof statusObj === 'object') {
              isAvailable = statusObj.Value === 0 || statusObj.Name === 'Enabled';
            } else {
              // Handle string format
              isAvailable = statusObj === 'Enabled';
            }
          }
          
          // Fallback checks if needed
          if (!isAvailable && product.web_status !== undefined) {
            isAvailable = product.web_status === 'Enabled' || 
                         product.web_status === '0' || 
                         product.web_status === 0;
          }
  
          if (!isAvailable && product.WebStatus !== undefined) {
            isAvailable = product.WebStatus === 'Enabled' || 
                         product.WebStatus === '0' || 
                         product.WebStatus === 0;
          }
        }
  
        console.log('Edit Form Web Status:', {
          ECommerceSettings: product.ECommerceSettings,
          statusObj: product.ECommerceSettings?.ECommerceStatus,
          web_status: product.web_status,
          WebStatus: product.WebStatus,
          finalIsAvailable: isAvailable
        });
  
        // Set the select value based on availability
        webStatusSelect.value = isAvailable ? 'Available' : 'Not Available';
      }
    }
  
    /**
     * Create form field group
     * @param {Object} field - Field definition
     * @returns {HTMLElement} - Form field group element
     */
    function createFieldGroup(field) {
      const group = document.createElement('div');
      group.className = 'form-group';
  
      const label = document.createElement('label');
      label.textContent = field.label || field.name;
      group.appendChild(label);
  
      if (field.readonly) {
        // Create read-only display element
        const readOnlyDiv = document.createElement('div');
        readOnlyDiv.className = 'form-control readonly-input';
        readOnlyDiv.textContent = field.value || '';
        group.appendChild(readOnlyDiv);
        
        // Add hidden input to preserve the value
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = field.name;
        hiddenInput.value = field.value || '';
        group.appendChild(hiddenInput);
      } else if (field.type === 'checkbox') {
        const inputElement = document.createElement('input');
        inputElement.type = 'checkbox';
        inputElement.name = field.name;
        inputElement.id = field.name;
        inputElement.className = 'form-control';
        inputElement.checked = field.value === true || field.value === 'true' || field.value === '0';
        
        label.appendChild(inputElement);
        label.appendChild(document.createTextNode(` ${field.label}`));
      } else if (field.type === 'select' && field.options) {
        const selectElement = document.createElement('select');
        selectElement.name = field.name;
        selectElement.id = field.name;
        selectElement.className = 'form-control form-select';
  
        field.options.forEach(option => {
          const optionElement = document.createElement('option');
          optionElement.value = option.value;
          optionElement.textContent = option.label;
          if (option.value === field.value) {
            optionElement.selected = true;
          }
          selectElement.appendChild(optionElement);
        });
        group.appendChild(selectElement);
      } else if (field.type === 'textarea') {
        const textarea = document.createElement('textarea');
        textarea.name = field.name;
        textarea.className = 'form-control';
        textarea.value = field.value || '';
        group.appendChild(textarea);
      } else {
        const input = document.createElement('input');
        input.type = field.type || 'text';
        input.name = field.name;
        input.className = 'form-control';
        input.value = field.value || '';
        group.appendChild(input);
      }
  
      return group;
    }
  
    /**
     * Handle form submission
     * @param {Event} event - Submit event
     */
    async function submitProductEdit(event) {
      event.preventDefault();
     
      const form = event.target;
      const submitButton = form.querySelector('button[type="submit"]');
      const cancelButton = form.querySelector('.cancel');
      const productId = form.querySelector('#popupProductId')?.value;
      const webStatusSelect = form.querySelector('#popupWebStatus');
  
      if (!productId) {
        console.error('Product ID not found');
        if (typeof utils !== 'undefined' && utils.showErrorMessage) {
          utils.showErrorMessage('Error: Product ID not found');
        } else {
          alert('Error: Product ID not found');
        }
        return;
      }
  
      // Disable buttons during update to prevent multiple submissions
      submitButton.disabled = true;
      submitButton.textContent = 'Saving...';
      if (cancelButton) cancelButton.disabled = true;
  
      try {
        // Create a clean payload object to ensure precise data transmission
        const updatedFields = {};
  
        // Manually add form fields to prevent unexpected transformations
        const formData = new FormData(form);
        for (let [key, value] of formData.entries()) {
          // Skip empty strings and the problematic web_status field
          if (value !== "" && key !== 'web_status') {
            updatedFields[key] = String(value).trim();
          }
        }
  
        // Explicitly add product ID
        updatedFields.product_id = productId;
  
        // Carefully handle web status update:
        // Map UI value ("Available") to "0" (available on web) and others to "1"
        if (webStatusSelect) {
          const rawStatus = webStatusSelect.value;
          const normalizedStatus = rawStatus === 'Available' ? '0' : '1';
          
          // Enhanced payload construction
          updatedFields.ECommerceSettings = {
            ECommerceStatus: {
              Value: parseInt(normalizedStatus),
              Name: normalizedStatus === '0' ? 'Enabled' : 'Disabled',
              isAvailable: normalizedStatus === '0'
            },
            // Preserve any existing extended description
            ...(updatedFields.ECommerceSettings || {})
          };
  
          console.log('Detailed Web Status Update', {
            rawInput: rawStatus,
            normalizedStatus,
            fullPayload: JSON.stringify(updatedFields, null, 2)
          });
        }
  
        // Use API module if available
        if (typeof api !== 'undefined' && api.submitProductEdit) {
          const result = await api.submitProductEdit(updatedFields);
          
          // Update the UI with the updated product
          if (result.success && result.product) {
            if (typeof productTable !== 'undefined' && productTable.updateTableRow) {
              await productTable.updateTableRow(productId, result.product);
            } else if (window.updateTableRow) {
              await window.updateTableRow(productId, result.product);
            }
            
            if (typeof utils !== 'undefined' && utils.showSuccessPopup) {
              utils.showSuccessPopup('Product updated successfully');
            } else {
              window.showSuccessPopup && window.showSuccessPopup('Product updated successfully');
            }
            
            closeEditForm();
          } else {
            throw new Error(result.message || 'Unknown error occurred');
          }
        } else {
          // Fallback to direct fetch
          console.log('Sending update request with payload:', {
            payloadKeys: Object.keys(updatedFields),
            fullPayload: JSON.stringify(updatedFields, null, 2),
            payloadTypes: Object.keys(updatedFields).reduce((acc, key) => {
              acc[key] = typeof updatedFields[key];
              return acc;
            }, {})
          });
          
          const updateResponse = await fetch(`/product/${productId}/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(updatedFields)
          });
  
          const responseText = await updateResponse.text();
          
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Response parsing error:', { 
              error: parseError, 
              rawText: responseText 
            });
            throw new Error('Invalid response format from server');
          }
  
          if (!updateResponse.ok) {
            const errorDetails = responseData?.error || responseText || 'Unspecified server error';
            throw new Error(errorDetails);
          }
  
          // Check for successful update message
          const successMessages = [
            "Product updated successfully", 
            "Ok", 
            "Success"
          ];
  
          if (successMessages.some(msg => responseData.message?.includes(msg))) {
            // Fetch updated product data
            const detailsResponse = await fetch(`/product/${productId}/edit`);
            
            if (!detailsResponse.ok) {
              throw new Error(`Failed to fetch updated details: ${detailsResponse.statusText}`);
            }
  
            const data = await detailsResponse.json();
  
            if (!data?.product) {
              throw new Error('Invalid or missing product data in response');
            }
  
            // Update the table row
            if (typeof productTable !== 'undefined' && productTable.updateTableRow) {
              await productTable.updateTableRow(productId, data.product);
            } else if (window.updateTableRow) {
              await window.updateTableRow(productId, data.product);
            }
            
            if (typeof utils !== 'undefined' && utils.showSuccessPopup) {
              utils.showSuccessPopup('Product updated successfully');
            } else {
              window.showSuccessPopup && window.showSuccessPopup('Product updated successfully');
            }
            
            closeEditForm();
          } else {
            throw new Error('Unexpected server response');
          }
        }
      } catch (error) {
        console.error('Product Update Error:', error);
        
        if (typeof utils !== 'undefined' && utils.showErrorMessage) {
          utils.showErrorMessage(`Update failed: ${error.message}`);
        } else {
          alert(`Update failed: ${error.message}`);
        }
      } finally {
        // Re-enable buttons
        submitButton.disabled = false;
        submitButton.textContent = 'Save Changes';
        if (cancelButton) cancelButton.disabled = false;
      }
    }
    
    /**
     * Initialize module
     */
    function init() {
      initEditFormHandlers();
      initEditButtons();
      console.log('Product edit functionality initialized');
    }
    
    // Return public methods
    return {
      init,
      initEditFormHandlers,
      initEditButtons,
      openEditForm,
      closeEditForm,
      fetchProductDetails,
      submitProductEdit
    };
  })();
  
  // Export the productEdit module (if module system is available)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = productEdit;
  }