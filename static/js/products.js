/**
 * PADDY Products Page JavaScript
 * Handles interactive functionality for the products table including:
 * - Product searching
 * - Column resizing
 * - CSV export
 * - Event handling
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
function initColumnResizers() {
    const table = document.getElementById('productsTable');
    
    function initResizers() {
        const cols = table.querySelectorAll('th');
        
        cols.forEach((col) => {
            const resizer = col.querySelector('.resizer');
            let x = 0, w = 0;
            
            // Handle mouse down on resizer
            function mouseDownHandler(e) {
                x = e.clientX;
                w = parseInt(window.getComputedStyle(col).width, 10);
                
                // Add event listeners for dragging
                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
                resizer.classList.add('resizing');
            }
            
            // Handle column resizing during mouse move
            function mouseMoveHandler(e) {
                const dx = e.clientX - x;
                const newWidth = w + dx;
                
                // Only resize if width is above minimum
                if (newWidth > 50) {
                    col.style.width = `${newWidth}px`;
                    
                    // Resize all cells in this column
                    const index = Array.from(col.parentElement.children).indexOf(col);
                    table.querySelectorAll(`td:nth-child(${index + 1})`).forEach(cell => {
                        cell.style.width = `${newWidth}px`;
                    });
                }
            }
            
            // Clean up event listeners on mouse up
            function mouseUpHandler() {
                resizer.classList.remove('resizing');
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            }
            
            resizer.addEventListener('mousedown', mouseDownHandler);
        });
    }
    
    // Initialize resizers and prevent header click when resizing
    initResizers();
    table.querySelectorAll('.resizer').forEach(resizer => {
        resizer.addEventListener('mousedown', (e) => { e.stopPropagation(); });
    });
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
// Event Initializers
// ===================

/**
 * Initialize all event listeners when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize column resizing
    initColumnResizers();
    
    // Set up search event listeners
    const searchInput = document.getElementById('productSearch');
    searchInput.addEventListener('input', searchProducts);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchProducts();
    });
});