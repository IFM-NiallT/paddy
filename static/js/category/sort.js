/**
 * sort.js - Category Sorting Functions
 */
// Create a namespace for category sorting functionality
const categorySort = (function() {
    'use strict';
   
    /**
     * Sort categories function
     * @param {string} sortType - Type of sort to apply
     */
    function sortCategories(sortType) {
        const categoryGrid = document.getElementById("category-grid");
        if (!categoryGrid) {
            console.warn('Category grid not found');
            return;
        }
       
        const categories = Array.from(categoryGrid.getElementsByClassName("category-item"));
        categories.sort((a, b) => {
            const aNameElement = a.querySelector(".category-name");
            const bNameElement = b.querySelector(".category-name");
           
            if (!aNameElement || !bNameElement) return 0;
           
            const aName = aNameElement.textContent.trim();
            const bName = bNameElement.textContent.trim();
            const aCode = aNameElement.getAttribute("data-code") || "";
            const bCode = bNameElement.getAttribute("data-code") || "";
           
            switch (sortType) {
                case "alpha-asc":
                    return aName.localeCompare(bName);
                case "alpha-desc":
                    return bName.localeCompare(aName);
                case "code-asc":
                    return aCode.localeCompare(bCode);
                case "code-desc":
                    return bCode.localeCompare(aCode);
                default:
                    return 0;
            }
        });
       
        // Clear and re-append sorted items
        categories.forEach((category) => categoryGrid.appendChild(category));
    }
   
    /**
     * Initialize sort functionality
     */
    function init() {
        const sortSelect = document.getElementById("sortSelect");
        if (sortSelect) {
            sortSelect.addEventListener("change", function() {
                sortCategories(this.value);
            });
        }
        console.log('Category sort initialized');
    }
   
    // Return public methods
    return {
        init,
        sortCategories
    };
})();

// Expose sort function globally for backward compatibility
window.categorySort = categorySort;
window.sortCategories = categorySort.sortCategories;

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', categorySort.init);

// Export the module if CommonJS module system is available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { categorySort };
}