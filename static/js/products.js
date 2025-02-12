/**
 * PADDY Products Page JavaScript
 * Handles interactive functionality for the products table including:
 * - Product searching
 * - Column resizing
 * - CSV export
 * - Event handling
 * - Product editing
 */

// ====================
// Sort Functionality
// ====================

/**
 * Initializes sorting functionality for the table headers
 */
function initSortHandlers() {
    const headers = document.querySelectorAll('#productsTable th a');
    headers.forEach(header => {
        header.addEventListener('click', handleSortClick);
    });
}

/**
 * Handles the sort operation when a header link is clicked
 * @param {Event} event - The click event
 */
function handleSortClick(event) {
    event.preventDefault();
    const url = event.target.href;
    
    fetchSortedData(url)
        .then(data => {
            if (data && data.Data) {
                // Update the URL without reloading
                window.history.pushState({}, '', url);
                // Update table with new data
                updateTableWithResults(data);
                // Update sort indicators based on the new URL
                updateSortIndicators();
            }
        })
        .catch(error => {
            console.error('Error fetching sorted data:', error);
        });
}

/**
 * Fetches sorted data from the server
 * @param {string} url - The URL with sort parameters
 * @returns {Promise} Promise resolving to the sorted data
 */
async function fetchSortedData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Sort request failed: ${response.status}`);
    }
    return response.json();
}

/**
 * Updates sort indicators based on current URL parameters
 */
function updateSortIndicators() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentSort = urlParams.get('sort');
    
    // Remove all current-sort classes
    document.querySelectorAll('#productsTable th').forEach(th => {
        th.classList.remove('current-sort', 'asc', 'dsc');
    });
    
    if (currentSort) {
        // Extract field and direction from sort parameter
        const match = currentSort.match(/\((.*?)\)\[(.*?)\]/);
        if (match) {
            const [, field, direction] = match;
            // Find and update the corresponding header
            const header = Array.from(document.querySelectorAll('#productsTable th')).find(th => {
                const link = th.querySelector('a');
                return link && link.href.includes(`(${field})`);
            });
            
            if (header) {
                header.classList.add('current-sort', direction);
            }
        }
    }
}

// ====================
// Search Functionality
// ====================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Filters the product table based on search input
 * Searches using API first, falls back to local search if needed
 */
async function searchProducts() {
    const searchInput = document.getElementById('productSearch');
    const filter = searchInput.value.toLowerCase().trim();
    
    // If filter is less than 3 characters, perform local search or reset table
    if (filter.length < 3) {
        if (filter.length === 0) {
            // If completely empty, show all rows
            const rows = document.getElementsByClassName('product-row');
            for (let row of rows) {
                row.style.display = "";
            }
        } else {
            // If less than 3 characters, perform local search
            performLocalSearch(filter);
        }
        return;
    }
    
    // Get current category ID from URL
    const pathParts = window.location.pathname.split('/');
    const categoryId = pathParts[pathParts.indexOf('products') + 1];
    
    console.log('Search Details:', {
        filter: filter,
        categoryId: categoryId,
        searchURL: `/api/search?category=${categoryId}&code=${encodeURIComponent(filter)}`
    });
    
    try {
        const response = await fetch(`/api/search?category=${categoryId}&code=${encodeURIComponent(filter)}`);
        console.log('Full Response:', response);
        
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Parsed Data:', data);
        
        if (!data || !data.Data) {
            console.error('Invalid response format', data);
            throw new Error('Invalid response format');
        }
        
        updateTableWithResults(data);
        
    } catch (error) {
        console.error('Complete Search Error:', error);
        // Fall back to local search
        performLocalSearch(filter);
    }
}

/**
 * Performs local search as fallback when API search fails
 * @param {string} filter - The search term
 */
function performLocalSearch(filter) {
    const rows = document.getElementsByClassName('product-row');
    
    for (let row of rows) {
        const cells = row.getElementsByTagName('td');
        let found = false;
        
        for (let cell of cells) {
            const text = cell.textContent || cell.innerText;
            if (text.toLowerCase().indexOf(filter) > -1) {
                found = true;
                break;
            }
        }
        
        row.style.display = found ? "" : "none";
    }
}

/**
 * Updates the table with search results
 * @param {Object} data - The API response data
 */
function updateTableWithResults(data) {
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (!data.Data || data.Data.length === 0) {
        // Add a "no results" row
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="${getColumnCount()}" class="text-center py-4">
                No results found
            </td>
        `;
        tbody.appendChild(noResultsRow);
        return;
    }
    
    // Add new rows
    data.Data.forEach(product => {
        const row = createProductRow(product);
        tbody.appendChild(row);
    });
    
    // Update pagination if it exists
    updatePaginationInfo(data);
}

/**
 * Creates a table row from product data
 * @param {Object} product - The product data
 * @returns {HTMLElement} The created table row
 */
function createProductRow(product) {
    const row = document.createElement('tr');
    row.className = 'product-row';
    row.setAttribute('data-product-id', product.ID);
    
    // Get headers to match the column structure
    const headers = Array.from(document.querySelectorAll('#productsTable thead th'));
    
    let rowHTML = `
        <td>${escapeHtml(product.Code || '')}</td>
        <td data-full-text="${escapeHtml(product.Description || '')}">${escapeHtml(product.Description || '')}</td>
    `;
    
    // Add dynamic fields (skip first 2 columns [Code, Description] and last column [Actions])
    headers.slice(2, -1).forEach(header => {
        const fieldName = header.textContent.trim().replace(/[↕↑↓]/g, '').trim();
        let value = 'N/A';
        
        // Handle special cases
        if (fieldName === 'Web Category') {
            value = product.D_WebCategory || 'N/A';
        } else if (fieldName === 'Image Count') {
            value = product.ImageCount || 'N/A';
        } else {
            // Look for matching field in product data
            const fieldKey = Object.keys(product).find(key => {
                if (key.startsWith('D_')) {
                    const cleanKey = key.replace('D_', '').toLowerCase();
                    const cleanHeader = fieldName.replace(/\s+/g, '').toLowerCase();
                    return cleanKey === cleanHeader;
                }
                return false;
            });
            
            if (fieldKey) {
                value = product[fieldKey] || 'N/A';
            }
        }
        
        rowHTML += `
            <td data-full-text="${escapeHtml(value)}">
                ${escapeHtml(value)}
            </td>
        `;
    });
    
    // Add Edit button
    rowHTML += `
        <td>
            <button class="btn-uni edit-product-btn" data-product-id="${product.ID}">
                Edit Product
            </button>
        </td>
    `;
    
    row.innerHTML = rowHTML;
    
    // Add edit button event listener
    const editBtn = row.querySelector('.edit-product-btn');
    if (editBtn) {
        editBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            fetchProductDetails(product.ID);
        });
    }
    
    return row;
}

/**
 * Get the total number of columns in the table
 * @returns {number} The column count
 */
function getColumnCount() {
    const headers = document.querySelectorAll('#productsTable thead th');
    return headers.length;
}

/**
 * Updates pagination information after search
 * @param {Object} data - The API response data
 */
function updatePaginationInfo(data) {
    const paginationContainer = document.querySelector('.pagination-container');
    if (paginationContainer) {
        const start = (data.CurrentPage - 1) * data.ItemsPerPage + 1;
        const end = Math.min(data.CurrentPage * data.ItemsPerPage, data.TotalCount);
        
        let html = '';
        
        // First page and Previous page buttons
        if (data.CurrentPage > 1) {
            html += `<a href="#" class="pagination-arrow" data-page="1" aria-label="Skip to first page">⏮️</a>`;
            html += `<a href="#" class="pagination-arrow" data-page="${data.CurrentPage-1}" aria-label="Previous page">⬅️</a>`;
        }
        
        // Page count
        html += `<span class="pagination-count">${start}-${end}/${data.TotalCount}</span>`;
        
        // Next page and Last page buttons
        if (data.CurrentPage < data.TotalPages) {
            html += `<a href="#" class="pagination-arrow" data-page="${data.CurrentPage+1}" aria-label="Next page">➡️</a>`;
            html += `<a href="#" class="pagination-arrow" data-page="${data.TotalPages}" aria-label="Skip to last page">⏭️</a>`;
        }
        
        paginationContainer.innerHTML = html;
        
        // Add click handlers for pagination
        paginationContainer.querySelectorAll('.pagination-arrow').forEach(arrow => {
            arrow.addEventListener('click', async (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                
                // Get current URL and update page parameter
                const urlParams = new URLSearchParams(window.location.search);
                urlParams.set('page', page);
                const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
                
                try {
                    const response = await fetch(newUrl);
                    if (!response.ok) throw new Error('Failed to fetch data');
                    const data = await response.json();
                    
                    // Update URL without page reload
                    window.history.pushState({}, '', newUrl);
                    
                    // Update table with new data
                    updateTableWithResults(data);
                } catch (error) {
                    console.error('Error changing page:', error);
                }
            });
        });
    }
}

/**
 * Escapes HTML special characters
 * @param {string} str - The string to escape
 * @returns {string} The escaped string
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Initialize search handlers
function initSearchHandlers() {
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        // Debounced search for typing
        const debouncedSearch = debounce(searchProducts, 500);
        searchInput.addEventListener('input', debouncedSearch);
        
        // Immediate search on Enter
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchProducts();
            }
        });
    }
}

// =====================
// Column Resize System
// =====================

/**
 * Initializes the column resize functionality for the products table
 * Allows users to drag column headers to adjust column widths
 */
/**
 * Initializes the column resize functionality for the products table.
 * This function adds resize handles to the main products table columns,
 * allowing users to adjust column widths by dragging.
 */
function initColumnResizers() {
    // First, find our main products table
    const table = document.getElementById('productsTable');
    
    // Exit early if we don't find the table - prevents errors
    if (!table) {
        console.debug('Products table not found, skipping column resizer initialization');
        return;
    }
    
    /**
     * Sets up resize handlers for all columns in the table.
     * Creates event listeners for mouse interactions on the resize handles.
     */
    function initResizers() {
        const cols = table.querySelectorAll('th');
        
        // If no columns found, exit early
        if (!cols.length) {
            console.debug('No columns found in products table');
            return;
        }
        
        cols.forEach((col) => {
            const resizer = col.querySelector('.resizer');
            
            // Skip if this column doesn't have a resizer element
            if (!resizer) {
                console.debug('Resizer not found for column', col);
                return;
            }
            
            let x = 0, w = 0;
            
            /**
             * Handles the initial mouse down event on a resizer.
             * Captures the starting position and sets up drag handling.
             */
            function mouseDownHandler(e) {
                x = e.clientX;
                w = parseInt(window.getComputedStyle(col).width, 10);
                
                // Add event listeners for dragging
                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
                resizer.classList.add('resizing');
            }
            
            /**
             * Handles the mouse movement during column resizing.
             * Calculates and applies the new column width.
             */
            function mouseMoveHandler(e) {
                const dx = e.clientX - x;
                const newWidth = w + dx;
                
                // Only resize if width is above minimum
                if (newWidth > 50) {
                    col.style.width = `${newWidth}px`;
                    
                    // Find column index for resizing related cells
                    const index = Array.from(col.parentElement.children).indexOf(col);
                    
                    // Resize all cells in this column
                    const cells = table.querySelectorAll(`td:nth-child(${index + 1})`);
                    cells.forEach(cell => {
                        cell.style.width = `${newWidth}px`;
                    });
                }
            }
            
            /**
             * Handles the mouse up event after resizing.
             * Cleans up event listeners and visual states.
             */
            function mouseUpHandler() {
                resizer.classList.remove('resizing');
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            }
            
            // Attach the mousedown handler to the resizer
            resizer.addEventListener('mousedown', mouseDownHandler);
        });
    }
    
    // Initialize the resizers
    initResizers();
    
    // Add click-prevention handlers to all resizers
    const resizers = table.querySelectorAll('.resizer');
    if (resizers.length) {
        resizers.forEach(resizer => {
            resizer.addEventListener('mousedown', (e) => { 
                e.stopPropagation(); 
            });
        });
    }
}

// =================
// CSV Export System
// =================

/**
 * Exports the visible table data to a CSV file
 * Includes all columns and respects current search filtering
 */
function exportTableToCSV() {
    const table = document.getElementById('productsTable');
    
    // Get and format headers
    const headers = [];
    table.querySelectorAll('th').forEach(headerCell => {
        let headerText = headerCell.textContent.replace(/[↕↑↓]/g, '').trim();
        headers.push('"' + headerText + '"');
    });
    
    // Start CSV content with headers
    let csvContent = headers.join(',') + '\n';
    
    // Add visible rows only (respects search filtering)
    const rows = table.querySelectorAll('tbody tr:not([style*="display: none"])');
    rows.forEach(row => {
        const rowData = [];
        row.querySelectorAll('td').forEach((cell, index) => {
            let cellData = cell.getAttribute('data-full-text') || cell.textContent;
            
            // Special handling for code column to preserve leading zeros
            if (index === 0) {
                cellData = `"'${cellData}"`;
            } else {
                cellData = '"' + cellData.replace(/"/g, '""') + '"';
            }
            rowData.push(cellData);
        });
        csvContent += rowData.join(',') + '\n';
    });
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const categoryDesc = document.querySelector('h4').textContent.split('(')[0].trim();
    const date = new Date().toISOString().split('T')[0];
    const fileName = `${categoryDesc}_${date}.csv`;
    
    // Handle different browser download methods
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, fileName);
    } else {
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ===================
// Product Edit System
// ===================

/**
 * Handles all modal-related functionality for the edit form
 * Contains functions for opening, closing, and keyboard interaction
 */

/**
 * Opens the edit form popup and initializes modal behavior
 * Shows the overlay backdrop and sets up keyboard event listeners
 * Uses CSS transitions for smooth animation
 */

function openEditForm() {
    const editForm = document.getElementById("editProductForm");
    const overlay = document.getElementById("editFormOverlay");
    
    if (editForm && overlay) {
        // First set display to block (needed before transitions can work)
        overlay.style.display = "block";
        editForm.style.display = "block";
        
        // Force a browser reflow to enable the transition
        overlay.offsetHeight;
        editForm.offsetHeight;
        
        // Add active class to trigger transitions
        overlay.classList.add('active');
        editForm.classList.add('active');
        
        // Add keyboard event listener for modal interaction
        document.addEventListener('keydown', handleEditFormKeypress);
        
        // Focus the first input field for better accessibility
        const firstInput = editForm.querySelector('input:not([type="hidden"])');
        if (firstInput) {
            firstInput.focus();
        }
    }
}

/**
 * Closes the edit form popup and cleans up modal behavior
 * Hides overlay, removes event listeners, and resets form state
 * Handles transition completion before hiding elements
 */
function closeEditForm() {
    const editForm = document.getElementById("editProductForm");
    const overlay = document.getElementById("editFormOverlay");
    
    if (editForm && overlay) {
        // Remove active class to trigger transitions
        overlay.classList.remove('active');
        editForm.classList.remove('active');
        
        // Remove keyboard event listener
        document.removeEventListener('keydown', handleEditFormKeypress);
        
        // Wait for transitions to complete before hiding elements
        setTimeout(() => {
            overlay.style.display = "none";
            editForm.style.display = "none";
            
            // Reset form data to prevent stale values
            const form = editForm.querySelector('form');
            if (form) {
                form.reset();
            }
        }, 300); // Match this with CSS transition duration
        
        // Return focus to the main content area
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.focus();
        }
    }
}

/**
 * Handles keyboard events for the edit form modal
 * Currently supports Escape key for closing the modal
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleEditFormKeypress(event) {
    if (event.key === 'Escape') {
        closeEditForm();
    }
}

/**
 * Fetches product details from the server and populates the edit form
 * @param {string} productId - The ID of the product to edit
 */
function fetchProductDetails(productId) {
    // Validate product ID before proceeding
    if (!productId) {
        console.error('Invalid product ID');
        alert('Error: Invalid product ID');
        return;
    }

    // Fetch product details from server
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
            if (!data || !data.product) {
                console.error('Invalid response data', data);
                throw new Error('Invalid product data received');
            }

            const product = data.product;
            populateCurrentDetails(product, data.dynamic_fields);
            populateEditForm(product, productId, data.dynamic_fields);
            openEditForm();
        })
        .catch(error => {
            console.error('Error fetching product details:', error);
            alert(`Failed to load product details: ${error.message}`);
        });
}

/**
 * Populates the current product details section in the edit form
 * @param {Object} product - The product data
 * @param {Array} dynamicFields - Array of dynamic field configurations
 */
function populateCurrentDetails(product, dynamicFields) {
    const container = document.getElementById('currentProductDetails');
    if (!container) return;

    // Define all possible fields and their display labels
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
        { field: 'D_WebCategory', label: 'Web Category' }
    ];

    container.innerHTML = `
        <table class="table table-bordered">
            ${allFields.map(field => `
                <tr>
                    <th>${field.label}</th>
                    <td>${product[field.field] || 'N/A'}</td>
                </tr>
            `).join('')}
        </table>
    `;
}

/**
 * Populates the edit form with the product data
 * @param {Object} product - The product data
 * @param {string} productId - The product ID
 * @param {Array} dynamicFields - Array of dynamic field configurations
 */
function populateEditForm(product, productId, dynamicFields) {
    // Set the product code in the header and hidden input
    document.getElementById('popupProductCode').textContent = product.Code || '';
    document.getElementById('popupProductId').value = productId;

    // Get the first and second columns for dynamic fields
    const firstColumn = document.getElementById('popupFirstColumn');
    const secondColumn = document.getElementById('popupSecondColumn');

    // Clear any existing content
    firstColumn.innerHTML = '';
    secondColumn.innerHTML = '';

    // Use the dynamic_fields from the API response
    if (Array.isArray(dynamicFields)) {
        // Split fields between two columns
        const midpoint = Math.ceil(dynamicFields.length / 2);
        const firstColumnFields = dynamicFields.slice(0, midpoint);
        const secondColumnFields = dynamicFields.slice(midpoint);

        // Populate first column
        firstColumnFields.forEach(field => {
            // Assign the current product value to the field
            field.value = product[field.name] || '';
            const fieldGroup = createFieldGroup(field);
            firstColumn.appendChild(fieldGroup);
        });

        // Populate second column
        secondColumnFields.forEach(field => {
            // Assign the current product value to the field
            field.value = product[field.name] || '';
            const fieldGroup = createFieldGroup(field);
            secondColumn.appendChild(fieldGroup);
        });
    }
}

/**
 * Creates a form group for a dynamic field
 * @param {Object} field - The field configuration
 * @returns {HTMLElement} The created form group element
 */
function createFieldGroup(field) {
    const group = document.createElement('div');
    group.className = 'form-group';
    
    const label = document.createElement('label');
    label.innerHTML = `<b>Update ${field.label || field.name}</b>`;
    
    const input = createFieldInput(field);
    
    group.appendChild(label);
    group.appendChild(input);
    return group;
}

/**
 * Handles form submission for product updates
 * @param {Event} event - The form submission event
 */
function submitProductEdit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const cancelButton = form.querySelector('button.cancel');
    const productId = document.getElementById('popupProductId').value;
    
    submitButton.textContent = 'Saving...';
    submitButton.disabled = true;
    cancelButton.disabled = true;
    
    const formData = new FormData(form);
    const updatedFields = {};
    
    for (let [key, value] of formData.entries()) {
        if (value.trim() !== '') {
            updatedFields[key] = value;
        }
    }
    
    updatedFields.product_id = productId;
    
    fetch(`/product/${productId}/update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFields)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || 'Failed to update product');
            });
        }
        return response.json();
    })
    .then(data => {
        showSuccessPopup('Product updated successfully!');
        closeEditForm();
        setTimeout(() => {
            window.location.reload();
        }, 10); // Give time for the user to see the success message
    })
    .catch(error => {
        console.error('Error updating product:', error);
        alert(`Failed to update product: ${error.message}`);
    })
    .finally(() => {
        submitButton.textContent = 'Save Changes';
        submitButton.disabled = false;
        cancelButton.disabled = false;
    });
}

/**
 * Creates an input element for a dynamic field based on its type.
 * @param {Object} field - The field configuration object.
 * @returns {HTMLElement} The input element.
 */
function createFieldInput(field) {
    let input;

    // Add debug log to see exact field configuration
    console.log('Creating input field:', {
        name: field.name,
        type: field.type,
        value: field.value,
        options: field.options
    });

    // Ensure the type is in lowercase for consistency.
    const fieldType = (field.type || 'text').toLowerCase();

    if (fieldType === 'boolean') {
        // Create a checkbox input for boolean fields.
        input = document.createElement('input');
        input.type = 'checkbox';
        input.name = field.name;
        // Set the checkbox state based on the field value.
        input.checked = field.value === true || field.value === 'true';
    } else if (fieldType === 'integer' || fieldType === 'number') {
        // Changed to text type to allow special characters
        input = document.createElement('input');
        input.type = 'text';  // Changed from 'number' to 'text'
        input.name = field.name;
        input.value = field.value !== null && field.value !== undefined ? field.value : '';
        input.setAttribute('data-type', 'number'); // Mark as originally a number field
    } else if (field.options && field.options.length > 0) {
        // If options are provided, create a select element.
        input = document.createElement('select');
        input.name = field.name;
        field.options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            if (field.value == option.value) {
                opt.selected = true;
            }
            input.appendChild(opt);
        });
    } else {
        // Default to a text input.
        input = document.createElement('input');
        input.type = 'text';
        input.name = field.name;
        input.value = field.value !== null && field.value !== undefined ? field.value : '';
    }

    // Add a common class for styling.
    input.className = 'form-control';
    return input;
}

/**
 * Shows a success popup message that automatically disappears
 * @param {string} message - The message to display
 * @param {number} duration - How long to show the message (in ms)
 */
function showSuccessPopup(message = 'Operation completed successfully', duration = 3000) {
    const popup = document.getElementById('successPopup');
    if (!popup) return;
    
    const content = popup.querySelector('.success-content');
    if (!content) return;
    
    // Clear any existing timeouts
    if (popup.hideTimeout) {
        clearTimeout(popup.hideTimeout);
    }
    if (popup.fadeTimeout) {
        clearTimeout(popup.fadeTimeout);
    }
    
    // Set the message
    content.textContent = message;
    
    // Remove any existing fade-out class and ensure display is flex
    popup.classList.remove('fade-out');
    popup.style.display = 'flex';
    
    // Set timeouts for fade out and hide
    popup.fadeTimeout = setTimeout(() => {
        popup.classList.add('fade-out');
        
        popup.hideTimeout = setTimeout(() => {
            popup.style.display = 'none';
            popup.classList.remove('fade-out');
        }, 300);
    }, duration);
}

// Only show success popup after form submission
function submitProductEdit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const cancelButton = form.querySelector('button.cancel');
    const productId = document.getElementById('popupProductId').value;
    
    submitButton.textContent = 'Saving...';
    submitButton.disabled = true;
    cancelButton.disabled = false;
    
    const formData = new FormData(form);
    const updatedFields = {};
    
    for (let [key, value] of formData.entries()) {
        if (value.trim() !== '') {
            // Get the input element to check its original type
            const input = form.querySelector(`[name="${key}"]`);
            // Convert to string to preserve special characters
            updatedFields[key] = String(value).trim();
        }
    }
    
    updatedFields.product_id = productId;
    
    fetch(`/product/${productId}/update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFields)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || 'Failed to update product');
            });
        }
        return response.json();
    })
    .then(data => {
        // First show success popup
        const popup = document.getElementById('successPopup');
        if (popup) {
            const content = popup.querySelector('.success-content');
            content.textContent = 'Product updated successfully!';
            popup.style.display = 'flex';
            popup.classList.remove('fade-out');
            
            // Hide popup after 3 seconds
            setTimeout(() => {
                popup.classList.add('fade-out');
                setTimeout(() => {
                    popup.style.display = 'none';
                }, 300);
            }, 3000);
        }
        
        // Close form and reload page after brief delay
        closeEditForm();
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    })
    .catch(error => {
        console.error('Error updating product:', error);
        alert(`Failed to update product: ${error.message}`);
    })
    .finally(() => {
        submitButton.textContent = 'Save Changes';
        submitButton.disabled = false;
        cancelButton.disabled = false;
    });
}

// ===================
// Event Initializers
// ===================

/**
 * Initialize all event listeners when the DOM is loaded
 * Sets up all necessary event handlers for the application's functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize column resizing functionality
    initColumnResizers();
    
    // Set up search functionality
    initSearchHandlers();
    
    // Initialize edit form functionality
    initEditFormHandlers();
    
    // Initialize sorting functionality
    initSortHandlers();
});

/**
 * Initializes search-related event handlers
 * Handles both real-time search input and Enter key submission
 */
function initSearchHandlers() {
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        // Real-time search as user types (with debounce)
        const debouncedSearch = debounce(searchProducts, 300);
        searchInput.addEventListener('input', debouncedSearch);
        
        // Handle Enter key for immediate search
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchProducts();
            }
        });
    }
}

/**
 * Initializes all edit form related event handlers
 * Sets up form submission, edit buttons, and overlay click handling
 */
function initEditFormHandlers() {
    // Set up form submission handler
    const editForm = document.getElementById('editProductForm');
    if (editForm) {
        const form = editForm.querySelector('form');
        if (form) {
            // Remove any existing handlers to prevent duplicates
            form.removeEventListener('submit', submitProductEdit);
            // Add the submit handler
            form.addEventListener('submit', submitProductEdit);
        }
    }

    // Set up edit button handlers
    initEditButtons();
    
    // Set up overlay click handler
    initOverlayHandler();
}

/**
 * Initializes click handlers for all edit buttons in the product table
 */
function initEditButtons() {
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

/**
 * Initializes the overlay click handler for closing the edit form
 */
function initOverlayHandler() {
    const overlay = document.getElementById('editFormOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeEditForm);
    }
}

/**
 * Initializes sorting functionality for the table headers
 */
function initSortHandlers() {
    const headers = document.querySelectorAll('#productsTable th a');
    headers.forEach(header => {
        header.addEventListener('click', handleSortClick);
    });
}

/**
 * Handles the sort operation when a header link is clicked
 * @param {Event} event - The click event
 */
function handleSortClick(event) {
    event.preventDefault();
    const url = event.target.href;
    
    // Show loading state
    const tableBody = document.querySelector('#productsTable tbody');
    if (tableBody) {
        tableBody.style.opacity = '0.5';
    }
    
    fetchSortedData(url)
        .then(data => {
            if (data && data.Data) {
                // Update the URL without reloading
                window.history.pushState({}, '', url);
                // Update table with new data
                updateTableWithResults(data);
                // Update sort indicators based on the new URL
                updateSortIndicators();
            }
        })
        .catch(error => {
            console.error('Error fetching sorted data:', error);
        })
        .finally(() => {
            // Remove loading state
            if (tableBody) {
                tableBody.style.opacity = '1';
            }
        });
}

/**
 * Fetches sorted data from the server
 * @param {string} url - The URL with sort parameters
 * @returns {Promise} Promise resolving to the sorted data
 */
async function fetchSortedData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Sort request failed: ${response.status}`);
    }
    return response.json();
}

/**
 * Updates sort indicators based on current URL parameters
 */
function updateSortIndicators() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentSort = urlParams.get('sort');
    
    // Remove all current-sort classes
    document.querySelectorAll('#productsTable th').forEach(th => {
        th.classList.remove('current-sort', 'asc', 'dsc');
    });
    
    if (currentSort) {
        // Extract field and direction from sort parameter
        const match = currentSort.match(/\((.*?)\)\[(.*?)\]/);
        if (match) {
            const [, field, direction] = match;
            // Find and update the corresponding header
            const header = Array.from(document.querySelectorAll('#productsTable th')).find(th => {
                const link = th.querySelector('a');
                return link && link.href.includes(`(${field})`);
            });
            
            if (header) {
                header.classList.add('current-sort', direction);
            }
        }
    }
}

/**
 * Updates the table with new results
 * @param {Object} data - The data containing products and pagination info
 */
function updateTableWithResults(data) {
    console.log('Updating table with data:', data);
    
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (!data.Data || data.Data.length === 0) {
        console.warn('No results found');
        // Add a "no results" row
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="${getColumnCount()}" class="text-center py-4">
                No results found
            </td>
        `;
        tbody.appendChild(noResultsRow);
        return;
    }
    
    // Add new rows
    data.Data.forEach(product => {
        const row = createProductRow(product);
        tbody.appendChild(row);
    });
    
    // Update pagination if it exists
    updatePaginationInfo(data);
    
    // Re-initialize edit buttons for new rows
    initEditButtons();
}

/**
 * Updates pagination information
 * @param {Object} data - The data containing pagination details
 */
function updatePaginationInfo(data) {
    const paginationCount = document.querySelector('.pagination-count');
    if (paginationCount) {
        const start = (data.CurrentPage - 1) * data.ItemsPerPage + 1;
        const end = Math.min(data.CurrentPage * data.ItemsPerPage, data.TotalCount);
        paginationCount.textContent = `${start}-${end}/${data.TotalCount}`;
    }
    
    // Update pagination arrows if they exist
    const prevArrow = document.querySelector('.pagination-arrow:first-child');
    const nextArrow = document.querySelector('.pagination-arrow:last-child');
    
    if (prevArrow) {
        prevArrow.style.visibility = data.CurrentPage > 1 ? 'visible' : 'hidden';
    }
    if (nextArrow) {
        nextArrow.style.visibility = data.CurrentPage < data.TotalPages ? 'visible' : 'hidden';
    }
}

/**
 * Utility function to get the total number of columns in the table
 * @returns {number} The number of columns
 */
function getColumnCount() {
    const headers = document.querySelectorAll('#productsTable thead th');
    return headers.length;
}

/**
 * Creates a row element for a product
 * @param {Object} product - The product data
 * @returns {HTMLElement} The created row element
 */
function createProductRow(product) {
    const row = document.createElement('tr');
    row.className = 'product-row';
    row.setAttribute('data-product-id', product.ID);
    
    // Get headers to match the column structure
    const headers = Array.from(document.querySelectorAll('#productsTable thead th'));
    
    let rowHTML = `
        <td>${escapeHtml(product.Code || '')}</td>
        <td data-full-text="${escapeHtml(product.Description || '')}">${escapeHtml(product.Description || '')}</td>
    `;
    
    // Add dynamic fields (skip first 2 columns [Code, Description] and last column [Actions])
    headers.slice(2, -1).forEach(header => {
        const fieldName = header.textContent.trim().replace(/[↕↑↓]/g, '').trim();
        let value = 'N/A';
        
        // Handle special cases
        if (fieldName === 'Web Category') {
            value = product.D_WebCategory || 'N/A';
        } else if (fieldName === 'Image Count') {
            value = product.ImageCount || 'N/A';
        } else {
            // Look for matching field in product data
            const fieldKey = Object.keys(product).find(key => {
                if (key.startsWith('D_')) {
                    const cleanKey = key.replace('D_', '').toLowerCase();
                    const cleanHeader = fieldName.replace(/\s+/g, '').toLowerCase();
                    return cleanKey === cleanHeader;
                }
                return false;
            });
            
            if (fieldKey) {
                value = product[fieldKey] || 'N/A';
            }
        }
        
        rowHTML += `
            <td data-full-text="${escapeHtml(value)}">
                ${escapeHtml(value)}
            </td>
        `;
    });
    
    // Add Edit button
    rowHTML += `
        <td>
            <button class="btn-uni edit-product-btn" data-product-id="${product.ID}">
                Edit Product
            </button>
        </td>
    `;
    
    row.innerHTML = rowHTML;
    
    // Add edit button event listener
    const editBtn = row.querySelector('.edit-product-btn');
    if (editBtn) {
        editBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            fetchProductDetails(product.ID);
        });
    }
    
    return row;
}
/**
 * Utility function to debounce function calls
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce delay in milliseconds
 * @returns {Function} The debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Shows a success popup message
 * @param {string} message - The message to display
 * @param {number} duration - How long to show the message (in ms)
 */
function showSuccessPopup(message = 'Operation completed successfully', duration = 300) {
    const popup = document.getElementById('successPopup');
    if (!popup) return;
    
    const content = popup.querySelector('.success-content');
    if (!content) return;
    
    content.textContent = message;
    popup.classList.remove('fade-out');
    popup.style.display = 'flex';
    
    setTimeout(() => {
        popup.classList.add('fade-out');
        setTimeout(() => {
            popup.style.display = 'none';
            popup.classList.remove('fade-out');
        }, 300);
    }, duration);
}