/**
 * PADDY Categories Page JavaScript
 * Handles category search functionality and modal integration
 */

// Initialize modal variable
let searchModal = null;

// ------------------------
// Category Search Functions
// ------------------------

// Search functionality for categories
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

    // Show no results message if needed
    const existingMessage = document.getElementById("noCategoriesMessage");
    if (!hasResults && filter && !existingMessage) {
        const message = document.createElement("div");
        message.id = "noCategoriesMessage";
        message.className = "no-results";
        message.textContent = "No matching categories found";
        document.getElementById("category-grid").appendChild(message);
    } else if ((hasResults || !filter) && existingMessage) {
        existingMessage.remove();
    }
}

// Sort categories function
function sortCategories(sortType) {
    const categoryGrid = document.getElementById("category-grid");
    const categories = Array.from(categoryGrid.getElementsByClassName("category-item"));

    categories.sort((a, b) => {
        const aName = a.querySelector(".category-name").textContent.trim();
        const bName = b.querySelector(".category-name").textContent.trim();
        const aCode = a.querySelector(".category-name").getAttribute("data-code") || "";
        const bCode = b.querySelector(".category-name").getAttribute("data-code") || "";

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

// ------------------------
// Modal Search Functions
// ------------------------

// Search products
async function searchProductsModal() {
    const searchInput = document.getElementById("modalProductSearch");
    const query = searchInput.value.trim();

    if (query.length === 0) {
        updateModalResults({ Data: [] }); // Clear results if search is empty
        return;
    }

    // Add loading state
    searchInput.classList.add("loading");
    showLoadingState();

    try {
        const response = await fetch(
            `/api/search/all?code=${encodeURIComponent(query)}&description=${encodeURIComponent(query)}`
        );
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();
        updateModalResults(data);
    } catch (error) {
        console.error("Search error:", error);
        showErrorState();
    } finally {
        searchInput.classList.remove("loading");
    }
}

// Update modal results
function updateModalResults(data) {
    const tableBody = document.getElementById("modalProductResultsBody");
    tableBody.innerHTML = "";

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
                    <button class="btn-uni btn-sm" onclick="window.location.href='/products/${product.Category?.ID}'">
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
            if (searchModal) {
                searchModal.hide();
                setTimeout(() => {
                    fetchProductDetails(productId);
                }, 150);
            }
        });
    });
}

// Show loading state
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

// Show error state
function showErrorState() {
    const tableBody = document.getElementById("modalProductResultsBody");

    tableBody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center">
                <div class="py-4 text-danger">
                    An error occurred while searching products. Please try again.
                </div>
            </td>
        </tr>
    `;
}

// ------------------------
// Utility Functions
// ------------------------

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

// HTML escape utility (as backup if products.js is not loaded)
function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// ------------------------
// Event Listeners
// ------------------------

document.addEventListener("DOMContentLoaded", function () {
    // Initialize Bootstrap modal
    searchModal = new bootstrap.Modal(document.getElementById("searchProductsModal"));

    // Initialize edit form handlers if products.js functions are available
    if (typeof initEditFormHandlers === 'function') {
        initEditFormHandlers();
    }

    const categorySearchInput = document.getElementById("categorySearch");
    const modalSearchInput = document.getElementById("modalProductSearch");
    const searchAllButton = document.getElementById("searchAllProducts");
    const sortSelect = document.getElementById("sortSelect");

    // Category search
    if (categorySearchInput) {
        categorySearchInput.addEventListener("input", debounce(searchCategories, 300));
        categorySearchInput.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                searchCategories();
            }
        });
    }

    // Modal product search
    if (modalSearchInput) {
        modalSearchInput.addEventListener("input", debounce(searchProductsModal, 300));
        modalSearchInput.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                searchProductsModal();
            }
        });
    }

    // Sort dropdown
    if (sortSelect) {
        sortSelect.addEventListener("change", function () {
            sortCategories(this.value);
        });
    }

    // Search all products button
    if (searchAllButton) {
        searchAllButton.addEventListener("click", function () {
            searchModal.show();
            modalSearchInput.focus();
        });
    }

    // Initialize overlay handler if products.js function is available
    if (typeof initOverlayHandler === 'function') {
        initOverlayHandler();
    }
});