/**
 * sort.js - Category Sorting Functions
 */

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