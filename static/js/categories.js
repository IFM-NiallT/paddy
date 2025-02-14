/**
 * PADDY Categories Page JavaScript
 * Handles category search functionality and modal integration
 */

// Initialize modal variable
let searchModal = null;

// Search functionality for categories
function searchCategories() {
    const searchInput = document.getElementById('categorySearch');
    const filter = searchInput.value.toLowerCase();
    const categoryItems = document.getElementsByClassName('category-item');
    let hasResults = false;

    for (let i = 0; i < categoryItems.length; i++) {
        const categoryName = categoryItems[i].getElementsByClassName('category-name')[0];
        const textValue = categoryName.textContent || categoryName.innerText;
        
        if (textValue.toLowerCase().indexOf(filter) > -1) {
            categoryItems[i].style.display = "";
            hasResults = true;
        } else {
            categoryItems[i].style.display = "none";
        }
    }

    // Show no results message if needed
    const existingMessage = document.getElementById('noCategoriesMessage');
    if (!hasResults && filter && !existingMessage) {
        const message = document.createElement('div');
        message.id = 'noCategoriesMessage';
        message.className = 'no-results';
        message.textContent = 'No matching categories found';
        document.getElementById('category-grid').appendChild(message);
    } else if ((hasResults || !filter) && existingMessage) {
        existingMessage.remove();
    }
}

// Sort categories function
function sortCategories(sortType) {
    const categoryGrid = document.getElementById('category-grid');
    const categories = Array.from(categoryGrid.getElementsByClassName('category-item'));

    categories.sort((a, b) => {
        const aName = a.querySelector('.category-name').textContent.trim();
        const bName = b.querySelector('.category-name').textContent.trim();
        const aCode = a.querySelector('.category-name').getAttribute('data-code') || '';
        const bCode = b.querySelector('.category-name').getAttribute('data-code') || '';

        switch(sortType) {
            case 'alpha-asc':
                return aName.localeCompare(bName);
            case 'alpha-desc':
                return bName.localeCompare(aName);
            case 'code-asc':
                return aCode.localeCompare(bCode);
            case 'code-desc':
                return bCode.localeCompare(aCode);
            default:
                return 0;
        }
    });

    // Clear and re-append sorted items
    categories.forEach(category => categoryGrid.appendChild(category));
}

// Set column layout function
function setColumnLayout(columns) {
    const categoryGrid = document.getElementById('category-grid');
    
    if (columns === 'auto') {
        // Remove any explicit column setting and let the responsive CSS handle it
        categoryGrid.style.gridTemplateColumns = '';
        // Make sure the default responsive classes are applied
        categoryGrid.className = 'category-grid';
    } else {
        // Set explicit number of columns
        categoryGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    }
}

// Toggle category details function
function toggleCategoryDetails(button) {
    const detailsElements = document.querySelectorAll('.category-details');
    const isShowing = button.classList.contains('active');
    
    // Toggle button state
    button.classList.toggle('active');
    
    // Toggle details visibility with animation
    detailsElements.forEach(element => {
        if (isShowing) {
            // Hide details
            element.style.opacity = '0';
            setTimeout(() => {
                element.style.display = 'none';
                element.classList.remove('show');
            }, 200);
        } else {
            // Show details
            element.style.display = 'flex';
            element.classList.add('show');
            // Small delay to ensure display: flex is applied before transition
            setTimeout(() => {
                element.style.opacity = '1';
            }, 10);
        }
    });

    // Update local storage preference
    localStorage.setItem('categoryDetailsVisible', !isShowing);
}

// Debounce function for search
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

// Search products across all categories (Modal version)
async function searchProductsModal() {
    const searchInput = document.getElementById('modalProductSearch');
    const query = searchInput.value.trim();
    const cardGrid = document.getElementById('productCardGrid');
    const tableBody = document.getElementById('modalProductResultsBody');
    
    // Add loading state
    searchInput.classList.add('loading');
    
    // Show loading state in both views
    cardGrid.innerHTML = `<div class="loading-message">Searching products...</div>`;
    tableBody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center">
                <div class="py-4">Searching products...</div>
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`/api/search/all?code=${encodeURIComponent(query)}&description=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();
        updateModalResults(data);
    } catch (error) {
        console.error('Search error:', error);
        showErrorState();
    } finally {
        searchInput.classList.remove('loading');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap modal
    searchModal = new bootstrap.Modal(document.getElementById('searchProductsModal'));
    
    const categorySearchInput = document.getElementById('categorySearch');
    const modalSearchInput = document.getElementById('modalProductSearch');
    const searchAllButton = document.getElementById('searchAllProducts');
    const sortSelect = document.getElementById('sortSelect');
    const columnSelect = document.getElementById('columnSelect');
    const toggleButton = document.getElementById('toggleCategoryDetails');
    
    // Category search
    if (categorySearchInput) {
        categorySearchInput.addEventListener('input', debounce(searchCategories, 300));
        categorySearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchCategories();
            }
        });
    }

    // Modal product search
    if (modalSearchInput) {
        modalSearchInput.addEventListener('input', debounce(searchProductsModal, 300));
        modalSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchProductsModal();
            }
        });
    }

    // Sort dropdown
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            sortCategories(this.value);
        });
    }

    // Column layout dropdown
    if (columnSelect) {
        columnSelect.addEventListener('change', function() {
            setColumnLayout(this.value);
        });
    }

    // Search all products button
    if (searchAllButton) {
        searchAllButton.addEventListener('click', function() {
            searchModal.show();
            modalSearchInput.focus();
        });
    }

    // Toggle details button
    if (toggleButton) {
        toggleButton.addEventListener('click', function() {
            toggleCategoryDetails(this);
        });
    }

    // Check if details should be shown based on last user preference
    const shouldShowDetails = localStorage.getItem('categoryDetailsVisible') === 'true';
    if (shouldShowDetails && toggleButton) {
        toggleCategoryDetails(toggleButton);
    }
});

// HTML escape utility
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}