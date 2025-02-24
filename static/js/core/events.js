/**
 * events.js - Common event handlers for PADDY
 * 
 * This module provides event handling functionality:
 * - initOverlayHandler() - Initializes modal overlay handlers
 * - handleEditFormKeypress() - Handles keypress events for edit form
 * - registerGlobalHandlers() - Registers global event handlers
 */

// Create a namespace for event handling
const events = (function() {
    'use strict';
    
    // Check for required dependencies
    if (typeof utils === 'undefined') {
      console.error('Required dependency missing: utils');
    }
    
    /**
     * Initialize overlay click handler
     * Closes modals when clicking outside content area
     */
    function initOverlayHandler() {
      const overlay = document.getElementById('editFormOverlay');
      if (overlay) {
        overlay.addEventListener('click', function(event) {
          // Only close if clicking the overlay itself, not its children
          if (event.target === overlay) {
            if (typeof productEdit !== 'undefined') {
              productEdit.closeEditForm();
            } else if (window.closeEditForm) {
              window.closeEditForm();
            }
          }
        });
      }
    }
    
    /**
     * Handle keypress events for edit form
     * @param {KeyboardEvent} event - Keyboard event
     */
    function handleEditFormKeypress(event) {
      if (event.key === 'Escape') {
        if (typeof productEdit !== 'undefined') {
          productEdit.closeEditForm();
        } else if (window.closeEditForm) {
          window.closeEditForm();
        }
      }
    }
    
    /**
     * Register global keyboard event handlers
     */
    function registerGlobalHandlers() {
      // Handle escape key for modal dialogs
      document.addEventListener('keydown', function(event) {
        // Only handle if a modal is currently open
        const overlay = document.getElementById('editFormOverlay');
        if (overlay && overlay.style.display === 'block') {
          handleEditFormKeypress(event);
        }
      });
      
      // Prevent form submission on enter key in search fields
      document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && event.target.matches('input[type="search"], #productSearch')) {
          event.preventDefault();
          // Trigger search if search module is available
          if (typeof productSearch !== 'undefined') {
            productSearch.search();
          }
        }
      });
    }
    
    /**
     * Initialize export button handlers
     */
    function initExportHandlers() {
      const exportButton = document.getElementById('exportCsvBtn');
      if (exportButton) {
        exportButton.addEventListener('click', function(event) {
          event.preventDefault();
          if (typeof csvExport !== 'undefined') {
            csvExport.exportTableToCSV();
          } else if (window.exportTableToCSV) {
            window.exportTableToCSV();
          }
        });
      }
    }
    
    /**
     * Handle page load events
     */
    function handleDOMContentLoaded() {
      // Log table structure for debugging
      if (typeof productTable !== 'undefined' && productTable.logTableStructure) {
        productTable.logTableStructure();
      }
      
      // Initialize overlay handlers
      initOverlayHandler();
      
      // Initialize export buttons
      initExportHandlers();
      
      // Register global handlers
      registerGlobalHandlers();
      
      console.log('Global event handlers initialized');
    }
    
    // Add DOMContentLoaded listener
    document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
    
    // Return public methods
    return {
      initOverlayHandler,
      handleEditFormKeypress,
      registerGlobalHandlers,
      initExportHandlers
    };
  })();
  
  // Export the events module (if module system is available)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = events;
  }