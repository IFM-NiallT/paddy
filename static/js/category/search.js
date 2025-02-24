/**
 * search.js - Comprehensive Search Functionality
 * Handles both category search and modal product search
 */

// Utility: Debounce function to limit rapid function calls
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

// Utility: HTML escape function
function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// Category Search Functionality
function searchCategories() {
    const searchInput = document.getElementById("categorySearch");
    const filter = searchInput.value.toLowerCase();
    const categoryItems = document.getElementsByClassName("category-item");
    let hasResults = false;

    for (let i = 0; i < categoryItems.length; i++) {
        const categoryName = categoryItems[i].getElementsByClassName("category-name")[0];
        const textValue = categoryName.textContent || categoryName.innerText;

        if (textValue.toLowerCase().indexOf(filter) > -1) {
            categoryItems[i].style.display = "";
            hasResults = true;
        } else {
            categoryItems[i].style.display = "none";
        }
    }

    // Show/hide no results message
    const existingMessage = document.getElementById("noCategoriesMessage");
    const categoryGrid = document.getElementById("category-grid");

    if (!hasResults && filter && !existingMessage) {
        const message = document.createElement("div");
        message.id = "noCategoriesMessage";
        message.className = "no-results";
        message.textContent = "No matching categories found";
        categoryGrid.appendChild(message);
    } else if ((hasResults || !filter) && existingMessage) {
        existingMessage.remove();
    }
}

async function searchProductsModal() {
    const searchInput = document.getElementById("modalProductSearch");
    const query = searchInput.value.trim();

    // Clear results if search is empty
    if (query.length === 0) {
        updateModalResults({ Data: [] });
        return;
    }

    // Add loading state
    searchInput.classList.add("loading");
    showLoadingState();

    try {
        // Construct URL matching the exact API pattern
        const searchParams = new URLSearchParams({
            'sort': 'Code[asc]',
            'code': query
        });
        
        const searchUrl = `/api/search/all?${searchParams.toString()}`;
        
        console.group('Product Search Debug');
        console.log(`Raw Search Query: "${query}"`);
        console.log(`Full Search URL: ${searchUrl}`);
        console.groupEnd();

        const response = await fetch(searchUrl);
        
        console.group('Search Response');
        console.log('Response Status:', response.status);
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
        console.groupEnd();

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();
        
        console.group('Search Results');
        console.log('Raw Response:', data);
        console.log(`Total Results: ${data.TotalCount}`);
        console.log(`Results Found: ${data.Data ? data.Data.length : 0}`);
        console.groupEnd();

        updateModalResults(data);
    } catch (error) {
        console.error("Search error:", error);
        showErrorState();
    } finally {
        searchInput.classList.remove("loading");
    }
}

// Update modal search results
function updateModalResults(data) {
    const tableBody = document.getElementById("modalProductResultsBody");
    
    // Clear existing results
    tableBody.innerHTML = "";

    // Check if no results
    if (!data.Data || data.Data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    <div class="py-4">No products found</div>
                </td>
            </tr>
        `;
        return;
    }

    // Populate results
    data.Data.forEach((product) => {
        const row = document.createElement("tr");
        row.classList.add('product-row');
        row.setAttribute('data-product-id', product.ID);
        
        row.innerHTML = `
            <td>${escapeHtml(product.Code)}</td>
            <td>${escapeHtml(product.Description)}</td>
            <td>${escapeHtml(product.Category?.Description || "N/A")}</td>
            <td>
                <div class="button-container">
                    <button class="btn-uni btn-sm" onclick="window.location.href='/products/${product.Category?.ID || ''}'">
                        View Category
                    </button>
                    <button class="btn-uni btn-sm edit-product-btn" data-product-id="${product.ID}">
                        Edit
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Add click handlers for edit buttons
    document.querySelectorAll('.edit-product-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.getAttribute('data-product-id');
            const searchModal = bootstrap.Modal.getInstance(document.getElementById('searchProductsModal'));
            
            if (searchModal) {
                searchModal.hide();
                
                // Delay to allow modal to close
                setTimeout(() => {
                    // Attempt to call fetchProductDetails from edit.js
                    if (typeof fetchProductDetails === 'function') {
                        fetchProductDetails(productId);
                    } else {
                        console.warn('fetchProductDetails function not found. Make sure edit.js is loaded.');
                    }
                }, 150);
            }
        });
    });
}

// Show loading state in modal
function showLoadingState() {
    const tableBody = document.getElementById("modalProductResultsBody");

    tableBody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center">
                <div class="py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Searching products...</p>
                </div>
            </td>
        </tr>
    `;
}

// Show error state in modal
function showErrorState(errorMessage = "An error occurred while searching products") {
    const tableBody = document.getElementById("modalProductResultsBody");

    tableBody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center">
                <div class="py-4 text-danger">
                    ${escapeHtml(errorMessage)}
                </div>
            </td>
        </tr>
    `;
}

// Initialization function for search inputs
function initSearchInputs() {
    const categorySearchInput = document.getElementById("categorySearch");
    const modalSearchInput = document.getElementById("modalProductSearch");

    // Category search input
    if (categorySearchInput) {
        categorySearchInput.addEventListener("input", debounce(searchCategories, 300));
        categorySearchInput.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                searchCategories();
            }
        });
    }

    // Modal product search input
    if (modalSearchInput) {
        modalSearchInput.addEventListener("input", debounce(searchProductsModal, 300));
        modalSearchInput.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                searchProductsModal();
            }
        });
    }
}

// Initialize search functionality when DOM is ready
document.addEventListener("DOMContentLoaded", initSearchInputs);