/**
 * csv.js - CSV Export Functionality for PADDY
 * Handles exporting table data to CSV format
 */

/**
 * Export the products table to a CSV file
 * Generates a CSV file from the current table data and triggers a download
 */
function exportTableToCSV() {
    const table = document.getElementById('productsTable');
    
    if (!table) {
        console.error('Products table not found');
        return;
    }
    
    // Get headers, removing any sort icons
    const headers = [];
    table.querySelectorAll('th').forEach(headerCell => {
        let headerText = headerCell.textContent.replace(/[↕↑↓]/g, '').trim();
        headers.push('"' + headerText + '"');
    });
    
    // Create CSV header row
    let csvContent = headers.join(',') + '\n';
    
    // Process only visible rows (filter out any hidden rows)
    const rows = table.querySelectorAll('tbody tr:not([style*="display: none"])');
    rows.forEach(row => {
        const rowData = [];
        row.querySelectorAll('td').forEach((cell, index) => {
            // Use data-full-text attribute if available, otherwise use cell content
            let cellData = cell.getAttribute('data-full-text') || cell.textContent;
            
            // Special handling for product codes (first column)
            if (index === 0) {
                // Prefixing with apostrophe prevents Excel from interpreting codes as formulas
                cellData = `"'${cellData}"`;
            } else {
                // Escape double quotes by doubling them (CSV standard)
                cellData = '"' + cellData.replace(/"/g, '""') + '"';
            }
            rowData.push(cellData);
        });
        csvContent += rowData.join(',') + '\n';
    });
    
    // Create a Blob and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Generate filename from category name and current date
    const categoryDesc = document.querySelector('h4').textContent.split('(')[0].trim();
    const date = new Date().toISOString().split('T')[0];
    const fileName = `${categoryDesc}_${date}.csv`;
    
    // Handle browser differences for downloading
    if (navigator.msSaveBlob) {
        // IE10+
        navigator.msSaveBlob(blob, fileName);
    } else {
        // Other browsers
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Export the function to make it available to other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { exportTableToCSV };
} else {
    // Expose to window object if not using modules
    window.exportTableToCSV = exportTableToCSV;
}