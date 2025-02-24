/**
 * init.js - Initialization Functions
 * Initializes all category page functionality
 */

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