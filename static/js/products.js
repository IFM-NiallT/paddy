/**
 * PADDY Products Page JavaScript
 * Handles interactive functionality for the products table including:
 * - Product searching
 * - Column resizing
 * - CSV export
 * - Event handling
 * - Product editing
 * 
 * Key Functions:
 * Initialization:
 * - initColumnResizers() - Sets up column resize functionality
 * - initSortHandlers() - Initializes sorting functionality
 * - initSearchHandlers() - Sets up search input handlers
 * - initEditFormHandlers() - Initializes edit form functionality
 * - initEditButtons() - Sets up edit button click handlers
 * - initOverlayHandler() - Handles modal overlay clicks
 * 
 * Sort Functionality:
 * - handleSortClick() - Handles sort column clicks
 * - updateSortIndicators() - Updates sort direction indicators
 * - fetchSortedData() - Fetches sorted data from server
 * 
 * Search Functionality:
 * - debounce() - Debounces search input
 * - searchProducts() - Handles product search
 * - performLocalSearch() - Performs client-side search
 * 
 * Table Functionality:
 * - getColumnCount() - Gets table column count
 * - createProductRow() - Creates table row for product
 * - updateTableWithResults() - Updates table with new data
 * - updatePaginationInfo() - Updates pagination controls
 * 
 * Edit Form System:
 * - openEditForm() - Opens edit form modal
 * - closeEditForm() - Closes edit form modal
 * - handleEditFormKeypress() - Handles edit form keypresses
 * - fetchProductDetails() - Fetches product details
 * - populateCurrentDetails() - Shows current product details
 * - populateEditForm() - Populates edit form fields
 * - createFieldGroup() - Creates form field group
 * - createFieldInput() - Creates form input field
 * - submitProductEdit() - Handles form submission
 * 
 * CSV Export:
 * - exportTableToCSV() - Exports table data to CSV
 * 
 * Utility Functions:
 * - escapeHtml() - Escapes HTML special characters
 * - showSuccessPopup() - Shows success message popup
 */

// ====================
// Initialization
// ====================

document.addEventListener('DOMContentLoaded', function() {
    initColumnResizers();
    initSearchHandlers();
    initEditFormHandlers();
    initSortHandlers();
});

// Column Resize System
function initColumnResizers() {
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

function initSortHandlers() {
    const headers = document.querySelectorAll('#productsTable th a');
    headers.forEach(header => {
        header.addEventListener('click', handleSortClick);
    });
}

function initSearchHandlers() {
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

    // Initialize other handlers
    initEditButtons();
    initOverlayHandler();
}

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

function initOverlayHandler() {
    const overlay = document.getElementById('editFormOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeEditForm);
    }
}

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

function reinitializeTableHandlers() {
    console.log('Reinitializing table handlers...');
    
    const table = document.querySelector('table');
    if (!table) {
        console.error('Table not found during reinitialization');
        return false;
    }

    // Re-initialize all table-related handlers
    initColumnResizers();
    initSortHandlers();
    initEditButtons();
    
    console.log('Table handlers reinitialized successfully');
    return true;
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    logTableStructure();
    
    const form = document.getElementById('editProductFormContainer');
    if (form) {
        form.removeEventListener('submit', submitProductEdit);
        form.addEventListener('submit', submitProductEdit);
    }
});

// ====================
// Sort Functionality
// ====================

function handleSortClick(event) {
    event.preventDefault();
    const url = event.target.href;
    
    console.log('Sort URL:', url);
    
    // Show loading state
    const tableBody = document.querySelector('#productsTable tbody');
    if (tableBody) {
        tableBody.style.opacity = '0.5';
    }
    
    fetchSortedData(url)
        .then(data => {
            console.log('Received sorted data:', data);
            if (data && data.Data) {
                // Update the URL without reloading
                window.history.pushState({}, '', url);
                // Update table with new data
                updateTableWithResults(data);
                // Update sort indicators based on the new URL
                updateSortIndicators(url);  // Pass the new URL
            }
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

function updateSortIndicators(newUrl) {
    // Get current sort state from URL
    const urlParams = new URLSearchParams(window.location.search);
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

async function searchProducts() {
    const searchInput = document.getElementById('productSearch');
    const filter = searchInput.value.toLowerCase().trim();
    
    if (filter.length < 3) {
        if (filter.length === 0) {
            const rows = document.getElementsByClassName('product-row');
            for (let row of rows) {
                row.style.display = "";
            }
        } else {
            performLocalSearch(filter);
        }
        return;
    }
    
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
        performLocalSearch(filter);
    }
}

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

// ====================
// Table Functionality
// ====================

function getColumnCount() {
    const headers = document.querySelectorAll('#productsTable thead th');
    return headers.length;
}

async function fetchFieldConfig(categoryId) {
    try {
        // Try multiple potential paths
        const paths = [
            '/static/json/product_attributes.json',
            '/json/product_attributes.json'
        ];
        let productAttributes = null;
        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    productAttributes = await response.json();
                    break;
                }
            } catch (pathError) {
                console.warn(`Failed to fetch from ${path}:`, pathError);
            }
        }
        if (!productAttributes) {
            throw new Error('Could not fetch product attributes from any path');
        }
        if (productAttributes[categoryId]) {
            categoryFieldConfig = productAttributes[categoryId].fields;
            console.log('Fetched field config:', categoryFieldConfig);
            return categoryFieldConfig;
        } else {
            console.error('No field configuration found for category:', categoryId);
            return null;
        }
    } catch (error) {
        console.error('Error fetching field config:', error);
        return null;
    }
}

function createProductRow(product) {
    const row = document.createElement('tr');
    row.className = 'product-row';
    row.setAttribute('data-product-id', product.ID);
   
    const headers = Array.from(document.querySelector('table thead th'));
   
    // Static fields
    let rowHTML = `
        <td>${escapeHtml(product.Code || '')}</td>
        <td data-full-text="${escapeHtml(product.Description || '')}">${escapeHtml(product.Description || '')}</td>
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
                <td data-full-text="${escapeHtml(String(value))}">
                    ${escapeHtml(String(value))}
                </td>
            `;
        });

    // Determine web status - More robust logic
    let isAvailable = false;
    console.log('Checking web status for product:', {
        ECommerceSettings: product.ECommerceSettings,
        web_status: product.web_status,
        WebStatus: product.WebStatus
    });

    // Check multiple possible sources of web status
    if (product.ECommerceSettings) {
        // Check if ECommerceSettings has a Value property
        isAvailable = product.ECommerceSettings.Value === 0 || 
                      product.ECommerceSettings.ECommerceStatus === '0' || 
                      product.ECommerceSettings.ECommerceStatus === 0;
    } 
    
    if (!isAvailable && product.web_status !== undefined) {
        // If not yet determined, check web_status
        isAvailable = product.web_status === '0' || product.web_status === 0;
    }
    
    if (!isAvailable && product.WebStatus !== undefined) {
        // Final fallback to WebStatus
        isAvailable = product.WebStatus === '0' || product.WebStatus === 0;
    }

    console.log('Final availability:', isAvailable);

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
        <td data-full-text="${escapeHtml(webCategory)}">
            ${escapeHtml(webCategory)}
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
    if (editBtn) {
        editBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            fetchProductDetails(product.ID);
        });
    }
   
    return row;
}

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
                await fetchFieldConfig(categoryId);
                window.categoryFieldConfig = categoryFieldConfig;
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
   
    updatePaginationInfo(data);
    initEditButtons();
}

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
            await fetchFieldConfig(updatedProduct.Category.ID);
            window.categoryFieldConfig = categoryFieldConfig;
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
        // Determine web status with more robust logic for nested ECommerceStatus
        let isAvailable = false;
        console.log('Checking web status for updated product:', {
            ECommerceSettings: updatedProduct.ECommerceSettings,
            web_status: updatedProduct.web_status,
            WebStatus: updatedProduct.WebStatus,
            'ECommerceSettings.ECommerceStatus': updatedProduct['ECommerceSettings.ECommerceStatus']
        });

        // Check the nested ECommerceStatus structure
        if (updatedProduct.ECommerceSettings && 
            updatedProduct.ECommerceSettings.ECommerceStatus) {
            const statusDetails = updatedProduct.ECommerceSettings.ECommerceStatus;
            
            // Check if statusDetails is an object with Name and Value
            if (typeof statusDetails === 'object') {
                isAvailable = statusDetails.Value === 0 || 
                              statusDetails.Name === 'Enabled';
            }
        }

        // Fallback to direct ECommerceStatus
        if (!isAvailable && updatedProduct['ECommerceSettings.ECommerceStatus']) {
            isAvailable = updatedProduct['ECommerceSettings.ECommerceStatus'] === 'Enabled';
        }

        console.log('Final availability:', isAvailable);

        const webStatusCell = cells[specialColumnIndices.webStatus];
        if (webStatusCell) {
            const statusSpan = webStatusCell.querySelector('.web-status-cell');
            if (statusSpan) {
                statusSpan.className = `web-status-cell ${isAvailable ? 'available' : 'not-available'}`;
                statusSpan.textContent = isAvailable ? 'Available' : 'Not Available';
                console.log('Updated web status cell:', {
                    className: statusSpan.className,
                    text: statusSpan.textContent
                });
            } else {
                console.warn('Web status span not found in cell');
            }
        } else {
            console.warn('Web status cell not found');
        }
    }

    // Visual feedback
    row.style.opacity = '0.99';
    requestAnimationFrame(() => {
        row.style.opacity = '1';
        row.style.opacity = '';  // Remove the inline style
    });

    // Try to reinitialize table handlers
    reinitializeTableHandlers();

    console.log('Row update completed for product:', productId);
}

function updatePaginationInfo(data) {
    const paginationContainer = document.querySelector('.pagination-container');
    if (paginationContainer) {
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
        
        paginationContainer.querySelectorAll('.pagination-arrow').forEach(arrow => {
            arrow.addEventListener('click', async (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                
                const urlParams = new URLSearchParams(window.location.search);
                urlParams.set('page', page);
                const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
                
                try {
                    const response = await fetch(newUrl, {
                        headers: {
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });
                    
                    // Log the full response for debugging
                    console.log('Full Response:', response);
                    console.log('Response Status:', response.status);
                    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
                    
                    // Check content type before parsing
                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        const text = await response.text();
                        console.error('Non-JSON response:', text);
                        throw new Error('Received non-JSON response');
                    }
                    
                    const data = await response.json();
                    
                    window.history.pushState({}, '', newUrl);
                    updateTableWithResults(data);
                    
                } catch (error) {
                    console.error('Error changing page:', error);
                    alert(`Failed to change page: ${error.message}`);
                }
            });
        });
    }
}

// ====================
// Edit Form System
// ====================

document.addEventListener('DOMContentLoaded', logTableStructure);

// Expose functions globally
window.openEditForm = openEditForm;
window.closeEditForm = closeEditForm;
window.fetchProductDetails = fetchProductDetails;

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

function handleEditFormKeypress(event) {
    if (event.key === 'Escape') {
        closeEditForm();
    }
}

function fetchProductDetails(productId) {
    if (!productId) {
        console.error('Invalid product ID');
        alert('Error: Invalid product ID');
        return;
    }

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

function populateCurrentDetails(product, dynamicFields) {
    const container = document.getElementById('currentProductDetails');
    if (!container) return;

    // Helper function to determine web status
    function getWebStatus(product) {
        if (product.ECommerceSettings?.ECommerceStatus) {
            const statusObj = product.ECommerceSettings.ECommerceStatus;
            // Handle the nested object format with Value and Name
            return (statusObj.Value === 0 || statusObj.Name === 'Enabled') ? 'Available' : 'Not Available';
        }
        return 'Not Available'; // Default state
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

        // Check for ECommerceStatus object with Value and Name properties
        if (product.ECommerceSettings && product.ECommerceSettings.ECommerceStatus) {
            const statusObj = product.ECommerceSettings.ECommerceStatus;
            
            // Check if it's the object format
            if (typeof statusObj === 'object') {
                isAvailable = statusObj.Value === 0 || statusObj.Name === 'Enabled';
                console.log('Status from object:', {
                    value: statusObj.Value,
                    name: statusObj.Name,
                    isAvailable: isAvailable
                });
            } else {
                // Handle string format
                isAvailable = statusObj === 'Enabled';
                console.log('Status from string:', {
                    status: statusObj,
                    isAvailable: isAvailable
                });
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

function renderFormField(field) {
    const fieldContainer = document.createElement('div');
    fieldContainer.classList.add('form-group');

    const label = document.createElement('label');
    label.classList.add('form-label');

    if (field.readonly) {
        label.textContent = field.label;
        fieldContainer.appendChild(label);

        const readOnlyDiv = document.createElement('div');
        readOnlyDiv.className = 'form-control readonly-input';
        readOnlyDiv.textContent = field.value || '';
        fieldContainer.appendChild(readOnlyDiv);

        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = field.name;
        hiddenInput.value = field.value || '';
        fieldContainer.appendChild(hiddenInput);
    } else if (field.type === 'checkbox') {
        const inputElement = document.createElement('input');
        inputElement.type = 'checkbox';
        inputElement.name = field.name;
        inputElement.id = field.name;
        inputElement.classList.add('form-control');
        inputElement.checked = field.value === true || field.value === 'true' || field.value === '0';

        label.appendChild(inputElement);
        label.appendChild(document.createTextNode(` ${field.label}`));
        fieldContainer.appendChild(label);
    } else {
        label.textContent = field.label;
        label.setAttribute('for', field.name);

        if (field.options) {
            const selectElement = document.createElement('select');
            selectElement.name = field.name;
            selectElement.id = field.name;
            selectElement.classList.add('form-control', 'form-select');

            field.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                if (option.value === field.value) {
                    optionElement.selected = true;
                }
                selectElement.appendChild(optionElement);
            });

            fieldContainer.appendChild(label);
            fieldContainer.appendChild(selectElement);
        } else {
            const inputElement = document.createElement('input');
            inputElement.type = field.type || 'text';
            inputElement.name = field.name;
            inputElement.id = field.name;
            inputElement.classList.add('form-control');
            inputElement.value = field.value || '';
            
            fieldContainer.appendChild(label);
            fieldContainer.appendChild(inputElement);
        }
    }

    return fieldContainer;
}

// ====================
// CSV Export System
// ====================

function exportTableToCSV() {
    const table = document.getElementById('productsTable');
    
    const headers = [];
    table.querySelectorAll('th').forEach(headerCell => {
        let headerText = headerCell.textContent.replace(/[↕↑↓]/g, '').trim();
        headers.push('"' + headerText + '"');
    });
    
    let csvContent = headers.join(',') + '\n';
    
    const rows = table.querySelectorAll('tbody tr:not([style*="display: none"])');
    rows.forEach(row => {
        const rowData = [];
        row.querySelectorAll('td').forEach((cell, index) => {
            let cellData = cell.getAttribute('data-full-text') || cell.textContent;
            
            if (index === 0) {
                cellData = `"'${cellData}"`;
            } else {
                cellData = '"' + cellData.replace(/"/g, '""') + '"';
            }
            rowData.push(cellData);
        });
        csvContent += rowData.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const categoryDesc = document.querySelector('h4').textContent.split('(')[0].trim();
    const date = new Date().toISOString().split('T')[0];
    const fileName = `${categoryDesc}_${date}.csv`;
    
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

// ====================
// Event Initializers
// ====================

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

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

function renderFormField(field) {
    const fieldContainer = document.createElement('div');
    fieldContainer.classList.add('form-group');

    const label = document.createElement('label');
    label.classList.add('form-label');

    if (field.readonly) {
        label.textContent = field.label;
        fieldContainer.appendChild(label);

        const readOnlyDiv = document.createElement('div');
        readOnlyDiv.className = 'form-control readonly-input';
        readOnlyDiv.textContent = field.value || '';
        fieldContainer.appendChild(readOnlyDiv);

        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = field.name;
        hiddenInput.value = field.value || '';
        fieldContainer.appendChild(hiddenInput);
    } else if (field.type === 'checkbox') {
        const inputElement = document.createElement('input');
        inputElement.type = 'checkbox';
        inputElement.name = field.name;
        inputElement.id = field.name;
        inputElement.classList.add('form-control');
        inputElement.checked = field.value === true || field.value === 'true' || field.value === '0';

        label.appendChild(inputElement);
        label.appendChild(document.createTextNode(` ${field.label}`));
        fieldContainer.appendChild(label);
    } else {
        label.textContent = field.label;
        label.setAttribute('for', field.name);

        if (field.options) {
            const selectElement = document.createElement('select');
            selectElement.name = field.name;
            selectElement.id = field.name;
            selectElement.classList.add('form-control', 'form-select');

            field.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                if (option.value === field.value) {
                    optionElement.selected = true;
                }
                selectElement.appendChild(optionElement);
            });

            fieldContainer.appendChild(label);
            fieldContainer.appendChild(selectElement);
        } else {
            const inputElement = document.createElement('input');
            inputElement.type = field.type || 'text';
            inputElement.name = field.name;
            inputElement.id = field.name;
            inputElement.classList.add('form-control');
            inputElement.value = field.value || '';
            
            fieldContainer.appendChild(label);
            fieldContainer.appendChild(inputElement);
        }
    }

    return fieldContainer;
}

async function submitProductEdit(event) {
    event.preventDefault();
   
    const form = event.target;
    const formContainer = document.getElementById('editProductForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const cancelButton = form.querySelector('.cancel');
    const productId = form.querySelector('#popupProductId')?.value;
    const webStatusSelect = form.querySelector('#popupWebStatus');

    if (!productId) {
        console.error('Product ID not found');
        showErrorMessage('Error: Product ID not found');
        return;
    }

    try {
        // Get form data
        const formData = new FormData(form);
        const updatedFields = Object.fromEntries(formData.entries());
        updatedFields.product_id = productId;

        // Explicitly handle web status
        if (webStatusSelect) {
            // Set ECommerceSettings.ECommerceStatus directly as a string
            updatedFields['ECommerceSettings.ECommerceStatus'] = 
                webStatusSelect.value === 'Available' ? 'Enabled' : 'Disabled';

            console.log('Web Status Update:', {
                webStatusSelect: webStatusSelect.value,
                ecommerceStatus: updatedFields['ECommerceSettings.ECommerceStatus']
            });
        }

        // Step 1: Send update request
        const updateResponse = await fetch(`/product/${productId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(updatedFields)
        });

        // Log full response details
        console.log('Update Response Status:', updateResponse.status);
        console.log('Update Response Headers:',
            Object.fromEntries(updateResponse.headers.entries())
        );

        // Check response body for more details
        const responseText = await updateResponse.text();
        console.log('Raw Response Body:', responseText);

        // Try to parse response as JSON
        let responseData;
        try {
            responseData = JSON.parse(responseText);
            console.log('Parsed Response Data:', responseData);
        } catch (parseError) {
            console.error('Failed to parse response:', parseError);
        }

        if (!updateResponse.ok) {
            throw new Error(responseText || 'Failed to update product');
        }

        // Step 2: Small delay to ensure server-side processing
        await new Promise(resolve => setTimeout(resolve, 200));

        // Step 3: Fetch fresh product data
        const detailsResponse = await fetch(`/product/${productId}/edit`);
        if (!detailsResponse.ok) {
            throw new Error('Failed to fetch updated product details');
        }

        const data = await detailsResponse.json();
        if (!data?.product) {
            throw new Error('Invalid product data received');
        }

        // Step 4: Update the table row
        await updateTableRow(productId, data.product);
       
        // Step 5: Show success message and close form
        showSuccessPopup('Product updated successfully');
        closeEditForm();

    } catch (error) {
        console.error('FULL Error in product update process:', error);
       
        // More detailed error message
        const errorMessage = error.message || 'Unknown error occurred';
        showErrorMessage(`Update failed: ${errorMessage}`);
    } finally {
        // Reset button states
        submitButton.disabled = false;
        submitButton.textContent = 'Save Changes';
        if (cancelButton) cancelButton.disabled = false;
    }
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger position-fixed';
    errorDiv.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 1rem;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;
    
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    // Add animation keyframes
    if (!document.querySelector('#error-animation')) {
        const style = document.createElement('style');
        style.id = 'error-animation';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        errorDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('editProductFormContainer');
    if (form) {
        form.removeEventListener('submit', submitProductEdit);
        form.addEventListener('submit', submitProductEdit);
    }
});

// Keep your existing showSuccessPopup function
function showSuccessPopup(message = 'Operation completed successfully', duration = 3000) {
    const popup = document.getElementById('successPopup');
    if (!popup) return;
    
    const content = popup.querySelector('.success-content');
    if (!content) return;
    
    if (popup.hideTimeout) {
        clearTimeout(popup.hideTimeout);
    }
    if (popup.fadeTimeout) {
        clearTimeout(popup.fadeTimeout);
    }
    
    content.textContent = message;
    popup.classList.remove('fade-out');
    popup.style.display = 'flex';
    
    popup.fadeTimeout = setTimeout(() => {
        popup.classList.add('fade-out');
        
        popup.hideTimeout = setTimeout(() => {
            popup.style.display = 'none';
            popup.classList.remove('fade-out');
        }, 300);
    }, duration);
}