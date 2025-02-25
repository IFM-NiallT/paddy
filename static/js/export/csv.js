/**
 * csv.js - CSV Export Functionality for PADDY
 * Handles exporting table data to CSV format
 */

import { utils } from '../core/utils.js';

export const csvExport = (function() {
    'use strict';

    /**
     * Export the products table to a CSV file
     * Generates a CSV file from the current table data and triggers a download
     */
    function exportTableToCSV() {
        const table = document.querySelector('.products-table');
       
        if (!table) {
            console.error('Products table not found');
            
            // Use utils module for error message
            utils.showErrorMessage('Unable to export CSV: Table not found');
            return;
        }
       
        // Get headers, removing any sort icons
        const headers = Array.from(table.querySelectorAll('th')).map(headerCell => {
            let headerText = headerCell.textContent.replace(/[↕↑↓]/g, '').trim();
            return `"${headerText}"`;
        });
       
        // Create CSV header row
        let csvContent = headers.join(',') + '\n';
       
        // Process only visible rows (filter out any hidden rows)
        const rows = table.querySelectorAll('tbody tr:not([style*="display: none"])');
        rows.forEach(row => {
            const rowData = Array.from(row.querySelectorAll('td')).map((cell, index) => {
                // Use data-full-text attribute if available, otherwise use cell content
                let cellData = cell.getAttribute('data-full-text') || cell.textContent.trim();
               
                // Special handling for product codes (first column)
                if (index === 0) {
                    // Prefixing with apostrophe prevents Excel from interpreting codes as formulas
                    cellData = `"'${cellData}"`;
                } else {
                    // Escape double quotes by doubling them (CSV standard)
                    cellData = `"${cellData.replace(/"/g, '""')}"`;
                }
                return cellData;
            });
            
            csvContent += rowData.join(',') + '\n';
        });
       
        // Generate filename
        const fileName = getExportFileName();
       
        // Download the CSV
        downloadCsv(csvContent, fileName);
    }

    /**
     * Generate export filename based on category and current date
     * @returns {string} Filename for CSV export
     */
    function getExportFileName() {
        // Try to get category description from page header
        const categoryDesc = document.querySelector('.section-header h4');
        const baseName = categoryDesc 
            ? categoryDesc.textContent.split('(')[0].trim().replace(/\s+/g, '_')
            : 'Products';
        
        // Get current date
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        
        return `${baseName}_Export_${date}.csv`;
    }

    /**
     * Download CSV file
     * @param {string} csvContent - CSV content to download
     * @param {string} fileName - Filename for the CSV
     */
    function downloadCsv(csvContent, fileName) {
        // Create a Blob with CSV content
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Create download link
        const link = document.createElement('a');
        
        // Handle different browser download mechanisms
        if (navigator.msSaveBlob) {
            // IE10+
            navigator.msSaveBlob(blob, fileName);
        } else {
            // Other browsers
            link.href = window.URL.createObjectURL(blob);
            link.setAttribute('download', fileName);
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // Show success message
        utils.showSuccessPopup(`Exported ${fileName}`);
    }

    /**
     * Initialize CSV export functionality
     */
    function init() {
        // Add event listener to export button if it exists
        const exportButton = document.querySelector('[onclick="exportTableToCSV()"]');
        if (exportButton) {
            // Remove inline onclick handler
            exportButton.removeAttribute('onclick');
            // Add proper event listener
            exportButton.addEventListener('click', exportTableToCSV);
        }

        console.log('CSV export module initialized');
    }

    // Public API
    return {
        exportTableToCSV,
        init
    };
})();

// Expose globally for backward compatibility
window.csvExport = csvExport;
window.exportTableToCSV = csvExport.exportTableToCSV;

// Initialize on load
document.addEventListener('DOMContentLoaded', csvExport.init);

// Export the module if using CommonJS module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { csvExport };
}