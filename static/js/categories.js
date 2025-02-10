/**
 * PADDY Categories Page JavaScript
 * Handles category search functionality
 */

// Search functionality
function searchCategories() {
    const searchInput = document.getElementById('categorySearch');
    const filter = searchInput.value.toLowerCase();
    const categoryItems = document.getElementsByClassName('category-item');

    for (let i = 0; i < categoryItems.length; i++) {
        const categoryName = categoryItems[i].getElementsByClassName('category-name')[0];
        const textValue = categoryName.textContent || categoryName.innerText;
        
        if (textValue.toLowerCase().indexOf(filter) > -1) {
            categoryItems[i].style.display = "";
        } else {
            categoryItems[i].style.display = "none";
        }
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('categorySearch');
    
    // Search as user types
    searchInput.addEventListener('input', searchCategories);
    
    // Search on Enter key
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchCategories();
        }
    });
});