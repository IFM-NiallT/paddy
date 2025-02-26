/**
 * utils.js - Core utility functions for PADDY
 *
 * This module provides utility functions used across the application:
 * - debounce() - Debounces function calls
 * - escapeHtml() - Escapes HTML special characters
 * - showSuccessPopup() - Shows success message popup
 * - showErrorMessage() - Shows error message popup
 */

// Create a namespace for utilities to avoid global scope pollution
const utils = (function() {
  'use strict';
 
  /**
   * Debounce function to limit how often a function is called
   * @param {Function} func - Function to debounce
   * @param {number} wait - Milliseconds to wait
   * @returns {Function} - Debounced function
   */
  function debounce(func, wait = 300) {
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
   * Sanitize a string for safe HTML insertion
   * @param {string} str - Text to sanitize
   * @returns {string} - Sanitized text
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
 
  /**
   * Show success message popup
   * @param {string} message - Success message
   * @param {number} duration - Duration in milliseconds
   */
  function showSuccessPopup(message = 'Operation completed successfully', duration = 3000) {
    const popup = document.getElementById('successPopup');
    if (!popup) return;
   
    const content = popup.querySelector('.popup-message') || popup;
    if (!content) return;
   
    if (popup.hideTimeout) {
      clearTimeout(popup.hideTimeout);
    }
    if (popup.fadeTimeout) {
      clearTimeout(popup.fadeTimeout);
    }
   
    content.textContent = message;
    popup.classList.remove('fade-out');
    popup.classList.add('active');
    popup.style.display = 'flex';
   
    popup.fadeTimeout = setTimeout(() => {
      popup.classList.remove('active');
      popup.classList.add('fade-out');
     
      popup.hideTimeout = setTimeout(() => {
        popup.style.display = 'none';
        popup.classList.remove('fade-out');
      }, 300);
    }, duration);
  }
 
  /**
   * Show error message popup
   * @param {string} message - Error message
   */
  function showErrorMessage(message) {
    // Try to find an existing error container first
    const errorContainer = document.getElementById('form-errors');
    
    if (errorContainer) {
      // Use existing error container if available
      const messageElement = errorContainer.querySelector('.alert-message') || errorContainer;
      messageElement.textContent = message;
      errorContainer.style.display = 'block';
      
      setTimeout(() => {
        errorContainer.style.display = 'none';
      }, 5000);
    } else {
      // Create a floating error message if no container exists
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
          @keyframes slideOut {
            from { transform: translateX(0); }
            to { transform: translateX(100%); }
          }
        `;
        document.head.appendChild(style);
      }
     
      setTimeout(() => {
        errorDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => errorDiv.remove(), 300);
      }, 5000);
    }
  }
 
  // Return public methods
  return {
    debounce,
    escapeHtml,
    showSuccessPopup,
    showErrorMessage
  };
})();

// Expose utils and key functions globally for backward compatibility
window.utils = utils;
window.debounce = utils.debounce;
window.escapeHtml = utils.escapeHtml;
window.showSuccessPopup = utils.showSuccessPopup;
window.showErrorMessage = utils.showErrorMessage;

// Export the utils module (if CommonJS module system is available)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { utils };
}