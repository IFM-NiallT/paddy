/**
 * PADDY Categories Page JavaScript
 * Handles category search functionality
 */

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

// Search products across all categories
async function searchAllProducts() {
    const searchInput = document.getElementById('productSearch');
    const query = searchInput.value.trim();
    const resultsBody = document.getElementById('productResultsBody');
    
    // Add loading state
    const searchWrapper = document.getElementById('productSearchWrapper');
    searchWrapper.classList.add('loading');
    
    // Show loading state in table
    resultsBody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center">
                <div class="py-4">Searching products...</div>
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`/api/search/all?code=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();
        updateProductResults(data);
    } catch (error) {
        console.error('Search error:', error);
        resultsBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    <div class="py-4 text-danger">Error searching products. Please try again.</div>
                </td>
            </tr>
        `;
    } finally {
        // Remove loading state
        searchWrapper.classList.remove('loading');
    }
}

// Update product results table
function updateProductResults(data) {
    const tbody = document.getElementById('productResultsBody');
    tbody.innerHTML = '';

    if (!data.Data || data.Data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    <div class="py-4">No products found</div>
                </td>
            </tr>
        `;
        return;
    }

    data.Data.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(product.Code)}</td>
            <td>${escapeHtml(product.Description)}</td>
            <td>${escapeHtml(product.Category?.Description || 'N/A')}</td>
            <td>
                <div class="button-container">
                    <button class="btn-uni btn-sm" onclick="window.location.href='/products/${product.Category?.ID}'">
                        View
                    </button>
                    <button class="btn-uni btn-sm edit-product-btn" onclick="fetchProductDetails(${product.ID})">
                        Edit
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// HTML escape utility
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Toggle search mode
function toggleSearchMode(show) {
    const categoryGrid = document.getElementById('category-grid');
    const searchResults = document.getElementById('productSearchResults');
    const categorySearchWrapper = document.getElementById('categorySearchWrapper');
    const productSearchWrapper = document.getElementById('productSearchWrapper');
    const searchAllButton = document.getElementById('searchAllProducts');
    
    if (show) {
        // Switch to product search view
        categoryGrid.style.display = 'none';
        searchResults.style.display = 'block';
        categorySearchWrapper.style.display = 'none';
        productSearchWrapper.style.display = 'block';
        searchAllButton.style.display = 'none';
        document.getElementById('productSearch').focus();
    } else {
        // Switch to category view
        categoryGrid.style.display = 'flex';
        searchResults.style.display = 'none';
        categorySearchWrapper.style.display = 'block';
        productSearchWrapper.style.display = 'none';
        searchAllButton.style.display = 'block';
        document.getElementById('categorySearch').focus();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const categorySearchInput = document.getElementById('categorySearch');
    const productSearchInput = document.getElementById('productSearch');
    const searchAllButton = document.getElementById('searchAllProducts');
    
    // Category search
    if (categorySearchInput) {
        categorySearchInput.addEventListener('input', searchCategories);
        categorySearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchCategories();
            }
        });
    }

    // Product search
    if (productSearchInput) {
        const debouncedProductSearch = debounce(searchAllProducts, 300);
        productSearchInput.addEventListener('input', debouncedProductSearch);
        productSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchAllProducts();
            }
        });
    }

    // Search all products button
    if (searchAllButton) {
        searchAllButton.addEventListener('click', function() {
            toggleSearchMode(true);
        });
    }
});