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
// Search Functionality
// ====================

/**
 * Filters the product table based on search input
 * Searches across all columns and hides non-matching rows
 */
function searchProducts() {
    const searchInput = document.getElementById('productSearch');
    const filter = searchInput.value.toLowerCase();
    const rows = document.getElementsByClassName('product-row');
    
    // Iterate through each row to check for matches
    for (let row of rows) {
        const cells = row.getElementsByTagName('td');
        let found = false;
        
        // Check each cell in the row for matching text
        for (let cell of cells) {
            const text = cell.textContent || cell.innerText;
            if (text.toLowerCase().indexOf(filter) > -1) {
                found = true;
                break;
            }
        }
        
        // Show/hide the row based on search match
        row.style.display = found ? "" : "none";
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

    container.innerHTML = `
        <table class="table table-bordered">
            <tr>
                <th>Product Code</th>
                <td>${product.Code || 'N/A'}</td>
            </tr>
            <tr>
                <th>Description</th>
                <td>${product.Description || 'N/A'}</td>
            </tr>
            ${(dynamicFields || []).map(field => `
                <tr>
                    <th>${field.label || field.name}</th>
                    <td>${field.value || 'N/A'}</td>
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
    document.getElementById('popupProductId').value = productId;
    document.getElementById('popupProductCode').value = product.Code || '';
    document.getElementById('popupProductDescription').value = product.Description || '';

    const container = document.getElementById('popupDynamicFields');
    if (!container) return;

    container.innerHTML = '';
    dynamicFields.forEach(field => {
        container.appendChild(createFieldGroup(field));
    });
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
        // Create a number input for integer/number fields.
        input = document.createElement('input');
        input.type = 'number';
        input.name = field.name;
        input.value = field.value !== null && field.value !== undefined ? field.value : '';
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
 * This includes search, column resizing, form submission, and edit buttons
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize column resizing functionality for the main products table
    initColumnResizers();
    
    // Set up search functionality with both input and Enter key handling
    initSearchHandlers();
    
    // Initialize all edit form related functionality
    initEditFormHandlers();
});

/**
 * Initializes search-related event handlers
 * Handles both real-time search input and Enter key submission
 */
function initSearchHandlers() {
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        // Real-time search as user types
        searchInput.addEventListener('input', searchProducts);
        
        // Handle Enter key for immediate search
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchProducts();
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

    // Set up edit button handlers for each product row
    initEditButtons();
    
    // Set up overlay click handler for form dismissal
    initOverlayHandler();
}

/**
 * Initializes click handlers for all edit buttons in the product table
 * Each button triggers the product edit form with the correct product data
 */
function initEditButtons() {
    document.querySelectorAll('.edit-product-btn').forEach(button => {
        button.addEventListener('click', function(event) {
            // Prevent event bubbling
            event.stopPropagation();
            
            // Find the parent row to get the product ID
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
 * Initializes the overlay click handler
 * Allows users to close the form by clicking outside of it
 */
function initOverlayHandler() {
    const overlay = document.getElementById('editFormOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeEditForm);
    }
}

/**
 * Shows a success popup message that automatically disappears
 * @param {string} message - The message to display
 * @param {number} duration - How long to show the message (in ms)
 */
function showSuccessPopup(message = 'Operation completed successfully', duration = 300) {
    const popup = document.getElementById('successPopup');
    if (!popup) return; // Exit if popup element doesn't exist
    
    const content = popup.querySelector('.success-content');
    if (!content) return; // Exit if content element doesn't exist
    
    // Set the message
    content.textContent = message;
    
    // Remove any existing fade-out class
    popup.classList.remove('fade-out');
    
    // Show the popup
    popup.style.display = 'flex';
    
    // Set a timeout to start the fade out animation
    setTimeout(() => {
        popup.classList.add('fade-out');
        
        // Hide the popup after animation completes
        setTimeout(() => {
            popup.style.display = 'none';
            popup.classList.remove('fade-out');
        }, 300); // Match this with CSS animation duration
    }, duration);
}