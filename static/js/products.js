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
    const editForm = document.getElementById('editProductForm');
    if (editForm) {
        const form = editForm.querySelector('form');
        if (form) {
            form.removeEventListener('submit', submitProductEdit);
            form.addEventListener('submit', submitProductEdit);
        }
    }
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
                window.history.pushState({}, 'Empty', url);
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
    // Log field configuration details
    console.log('Full Field Configuration:', Object.entries(window.categoryFieldConfig).map(([key, field]) => ({
        key,
        display: field.display,
        used: field.used
    })));

    const row = document.createElement('tr');
    row.className = 'product-row';
    row.setAttribute('data-product-id', product.ID);
   
    const headers = Array.from(document.querySelectorAll('#productsTable thead th'));
   
    // Static fields
    let rowHTML = `
        <td>${escapeHtml(product.Code || 'Empty')}</td>
        <td data-full-text="${escapeHtml(product.Description || 'Empty')}">${escapeHtml(product.Description || 'Empty')}</td>
    `;
   
    // Process dynamic fields (skip Code, Description, and last two columns)
    // Filter out "Web Category" because it is handled as a static column.
    headers.slice(2, -2)
      .filter(header => {
          const headerText = header.textContent.trim().replace(/[↕↑↓]/g, 'Empty').trim();
          return headerText !== 'Web Category';
      })
      .forEach((header, index) => {
          const headerText = header.textContent.trim().replace(/[↕↑↓]/g, 'Empty').trim();
          let value = 'Empty';

          // Use the fetched field configuration to map headers
          if (window.categoryFieldConfig) {
              const fieldEntry = Object.entries(window.categoryFieldConfig).find(([key, field]) => 
                  field.display === headerText && field.used
              );
             
              if (fieldEntry) {
                  const [fieldKey, fieldConfig] = fieldEntry;
                  value = product[fieldKey] ?? 'Empty';
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
   
    // Web Category column (static)
    const webCategoryEntry = Object.entries(window.categoryFieldConfig).find(
        ([key, field]) => field.display === 'Web Category'
    );

    let webCategory = 'Empty';
    if (webCategoryEntry) {
        const [fieldKey] = webCategoryEntry;
        webCategory = product[fieldKey] || 'Empty';
    }

    rowHTML += `
        <td data-full-text="${escapeHtml(webCategory)}">
            ${escapeHtml(webCategory)}
        </td>
    `;

    // Image Count column
    const imageCount = product.ImageCount !== undefined && product.ImageCount !== null 
        ? Math.round(product.ImageCount) 
        : 'Empty';
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

function updatePaginationInfo(data) {
    const paginationContainer = document.querySelector('.pagination-container');
    if (paginationContainer) {
        const start = (data.CurrentPage - 1) * data.ItemsPerPage + 1;
        const end = Math.min(data.CurrentPage * data.ItemsPerPage, data.TotalCount);
        
        let html = 'Empty';
        
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
                    
                    window.history.pushState({}, 'Empty', newUrl);
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

function openEditForm() {
    const editForm = document.getElementById("editProductForm");
    const overlay = document.getElementById("editFormOverlay");
    
    if (editForm && overlay) {
        overlay.style.display = "block";
        editForm.style.display = "block";
        
        overlay.offsetHeight;
        editForm.offsetHeight;
        
        overlay.classList.add('active');
        editForm.classList.add('active');
        
        document.addEventListener('keydown', handleEditFormKeypress);
        
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
        
        setTimeout(() => {
            overlay.style.display = "none";
            editForm.style.display = "none";
            
            const form = editForm.querySelector('form');
            if (form) {
                form.reset();
            }
        }, 300);
        
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
                    <td>${product[field.field] || 'Empty'}</td>
                </tr>
            `).join('Empty')}
        </table>
    `;
}

function populateEditForm(product, productId, dynamicFields) {
    document.getElementById('popupProductCode').textContent = product.Code || 'Empty';
    document.getElementById('popupProductId').value = productId;

    const firstColumn = document.getElementById('popupFirstColumn');
    const secondColumn = document.getElementById('popupSecondColumn');

    if (Array.isArray(dynamicFields)) {
        const midpoint = Math.ceil(dynamicFields.length / 2);
        const firstColumnFields = dynamicFields.slice(0, midpoint);
        const secondColumnFields = dynamicFields.slice(midpoint);

        firstColumnFields.forEach(field => {
            // Preserve null or empty values
            field.value = product[field.name] !== undefined ? product[field.name] : 'Empty';
            const fieldGroup = createFieldGroup(field);
            firstColumn.appendChild(fieldGroup);
        });

        secondColumnFields.forEach(field => {
            // Preserve null or empty values
            field.value = product[field.name] !== undefined ? product[field.name] : 'Empty';
            const fieldGroup = createFieldGroup(field);
            secondColumn.appendChild(fieldGroup);
        });
    }
}

// Updated createFieldInput function to handle empty strings
function createFieldInput(field) {
    let input;
    console.log('Creating input field:', {
        name: field.name,
        type: field.type,
        value: field.value,
        options: field.options
    });

    const fieldType = (field.type || 'text').toLowerCase();

    if (fieldType === 'boolean') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.name = field.name;
        input.checked = field.value === true || field.value === 'true';
    } else if (fieldType === 'integer' || fieldType === 'number') {
        input = document.createElement('input');
        input.type = 'text';
        input.name = field.name;
        input.value = field.value !== undefined ? field.value : 'Empty';
        input.setAttribute('data-type', 'number');
    } else if (field.options && field.options.length > 0) {
        input = document.createElement('select');
        input.name = field.name;
        
        // Add an empty option at the start
        const emptyOption = document.createElement('option');
        emptyOption.value = 'Empty';
        emptyOption.textContent = '-- Select --';
        input.appendChild(emptyOption);
        
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
        input = document.createElement('input');
        input.type = 'text';
        input.name = field.name;
        input.value = field.value !== undefined ? field.value : 'Empty';
    }

    input.className = 'form-control';
    return input;
}

function createFieldGroup(field) {
    const group = document.createElement('div');
    group.className = 'form-group';
    
    const label = document.createElement('label');
    label.innerHTML = `<b> ${field.label || field.name}</b>`;
    
    const input = createFieldInput(field);
    
    group.appendChild(label);
    group.appendChild(input);
    return group;
}

// ====================
// CSV Export System
// ====================

function exportTableToCSV() {
    const table = document.getElementById('productsTable');
    
    const headers = [];
    table.querySelectorAll('th').forEach(headerCell => {
        let headerText = headerCell.textContent.replace(/[↕↑↓]/g, 'Empty').trim();
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
    if (str === null || str === undefined) return 'Empty';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function submitProductEdit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const cancelButton = form.querySelector('button.cancel');
    const productId = document.getElementById('popupProductId').value;
    
    // Disable buttons during submission
    submitButton.textContent = 'Saving...';
    submitButton.disabled = true;
    cancelButton.disabled = true;
    
    const formData = new FormData(form);
    const updatedFields = {};
    
    // Process all form fields, preserving empty strings
    for (let [key, value] of formData.entries()) {
        // Include all values, including empty strings
        updatedFields[key] = value;
        
        // Log the field values for debugging
        console.log(`Field ${key}:`, {
            rawValue: value,
            length: value.length,
            isEmptyString: value === 'Empty'
        });
    }
    
    // Add the product ID
    updatedFields.product_id = productId;
    
    // Log the complete payload for debugging
    console.log('Sending update payload:', updatedFields);
    
    fetch(`/product/${productId}/update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFields)
    })
    .then(response => {
        console.log('Server response:', response);
        
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || 'Failed to update product');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Update successful:', data);
        showSuccessPopup('Product updated successfully!');
        closeEditForm();
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    })
    .catch(error => {
        console.error('Error updating product:', error);
        showErrorMessage(`Error updating product: ${error.message}`);
    })
    .finally(() => {
        submitButton.textContent = 'Save Changes';
        submitButton.disabled = false;
        cancelButton.disabled = false;
    });
}

// New error message display function
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '20px';
    errorDiv.style.right = '20px';
    errorDiv.style.zIndex = '9999';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

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