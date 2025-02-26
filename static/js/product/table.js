/**
 * table.js - Product table functionality for PADDY
 *
 * This module handles product table functionality:
 * - getColumnCount() - Gets table column count
 * - createProductRow() - Creates table row for product
 * - updateTableWithResults() - Updates table with new data
 * - updateTableRow() - Updates a single table row
 * - logTableStructure() - Logs table structure for debugging
 * - determineWebStatus() - Determines product web status
 */

// Create a namespace for table functionality
const productTable = (function () {
  "use strict";

  /**
   * Get the number of columns in the products table
   * @returns {number} - Column count
   */
  function getColumnCount() {
    const headers = document.querySelectorAll("#productsTable thead th");
    return headers.length;
  }

  /**
   * Log table structure for debugging
   */
  function logTableStructure() {
    const table = document.querySelector("table");
    if (!table) {
      console.warn("No table found in document");
      return;
    }

    const headers = Array.from(table.querySelectorAll("thead th")).map(
      (th, i) => ({
        index: i,
        text: th.textContent.trim().replace(/[↕↑↓]/g, "").trim(),
      })
    );

    console.log("Table Headers:", headers);

    const sampleRow = table.querySelector("tbody tr");
    if (sampleRow) {
      const cells = Array.from(sampleRow.cells).map((cell, i) => ({
        index: i,
        content: cell.textContent.trim(),
        headerName: headers[i]?.text,
      }));
      console.log("Sample Row:", cells);
    }
  }

  /**
   * Ensure the category field configuration is loaded
   * @param {Object} data - Data containing product information
   * @returns {Promise} - Promise that resolves when the config is loaded
   */
  async function ensureFieldConfig(data) {
    // Skip if we already have the configuration
    if (window.categoryFieldConfig && Object.keys(window.categoryFieldConfig).length > 0) {
      console.log('Using existing field configuration:', window.categoryFieldConfig);
      return window.categoryFieldConfig;
    }
    
    console.log('Field configuration missing, attempting to load it...');
    
    // Get category ID from the data or from URL if not in data
    let categoryId = null;
    
    // Try to get from data first
    if (data?.Data && data.Data.length > 0 && data.Data[0].Category) {
      categoryId = data.Data[0].Category.ID;
      console.log('Found category ID from data:', categoryId);
    }
    
    // If not found in data, try to get from URL
    if (!categoryId) {
      const urlParams = new URLSearchParams(window.location.search);
      categoryId = urlParams.get('category');
      console.log('Found category ID from URL:', categoryId);
    }
    
    // Last resort - try to find it in the DOM
    if (!categoryId) {
      const categoryElement = document.querySelector('[data-category-id]');
      if (categoryElement) {
        categoryId = categoryElement.getAttribute('data-category-id');
        console.log('Found category ID from DOM:', categoryId);
      }
    }
    
    if (!categoryId) {
      console.error('Could not determine category ID');
      return null;
    }
    
    try {
      // Try to fetch the configuration
      let fieldConfig;
      if (window.api && window.api.fetchFieldConfig) {
        fieldConfig = await window.api.fetchFieldConfig(categoryId);
        console.log('Fetched field config via API:', fieldConfig);
      } else if (window.fetchFieldConfig) {
        fieldConfig = await window.fetchFieldConfig(categoryId);
        console.log('Fetched field config via global function:', fieldConfig);
      } else {
        // Last resort - try to fetch directly
        fieldConfig = await fetchFieldConfigFallback(categoryId);
        console.log('Fetched field config via fallback:', fieldConfig);
      }
      
      // Store the configuration properly
      if (fieldConfig) {
        if (fieldConfig[categoryId]) {
          // If the result is an object with categoryId as key
          window.categoryFieldConfig = fieldConfig[categoryId];
        } else {
          // Direct configuration object
          window.categoryFieldConfig = fieldConfig;
        }
        
        // Store in session storage as backup
        try {
          sessionStorage.setItem('categoryFieldConfig_' + categoryId, JSON.stringify(window.categoryFieldConfig));
        } catch (storageError) {
          console.warn('Failed to store field config in session storage:', storageError);
        }
        
        console.log('Field configuration set:', window.categoryFieldConfig);
        return window.categoryFieldConfig;
      }
    } catch (error) {
      console.error('Error ensuring field configuration:', error);
      
      // Try to recover from session storage
      try {
        const savedConfig = sessionStorage.getItem('categoryFieldConfig_' + categoryId);
        if (savedConfig) {
          window.categoryFieldConfig = JSON.parse(savedConfig);
          console.log('Recovered field configuration from session storage');
          return window.categoryFieldConfig;
        }
      } catch (recoveryError) {
        console.error('Failed to recover field configuration:', recoveryError);
      }
    }
    
    return null;
  }

  /**
   * Fallback function to fetch field configuration directly
   * @param {string} categoryId - Category ID
   * @returns {Promise} - Promise that resolves with field configuration
   */
  async function fetchFieldConfigFallback(categoryId) {
    try {
      // Try multiple potential paths
      const paths = [
        '/static/json/product_attributes.json',
        '/json/product_attributes.json'
      ];
      
      for (const path of paths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            const productAttributes = await response.json();
            if (productAttributes[categoryId]) {
              return productAttributes;
            }
          }
        } catch (pathError) {
          console.warn(`Failed to fetch from ${path}:`, pathError);
        }
      }
      
      throw new Error('Could not fetch product attributes from any path');
    } catch (error) {
      console.error('Error in fetchFieldConfigFallback:', error);
      return null;
    }
  }

  /**
   * Helper function to find a property in a product that matches a header
   * @param {Object} product - The product object
   * @param {string} headerText - The header text to match
   * @returns {*} - The property value or null if not found
   */
  function findPropertyInProduct(product, headerText) {
    // Try to find a direct match first
    if (product[headerText] !== undefined) {
      return product[headerText];
    }
    
    // Try camelCase version of the header
    const camelCaseHeader = headerText
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/\s+/g, '');
    
    if (product[camelCaseHeader] !== undefined) {
      return product[camelCaseHeader];
    }
    
    // Try PascalCase version
    const pascalCaseHeader = headerText
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
      .replace(/\s+/g, '');
    
    if (product[pascalCaseHeader] !== undefined) {
      return product[pascalCaseHeader];
    }
    
    // Try looking up with properties that might contain the header text
    // This handles cases like "Thread Size A" matching "ThreadSizeA"
    const normalizedHeader = headerText.toLowerCase().replace(/\s+/g, '');
    
    for (const key in product) {
      if (Object.prototype.hasOwnProperty.call(product, key)) {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
        if (normalizedKey === normalizedHeader) {
          return product[key];
        }
      }
    }
    
    // Not found
    return null;
  }

  /**
   * Determine web status for a product
   * @param {Object} product - Product data
   * @returns {boolean} - Whether product is available on web
   */
  function determineWebStatus(product) {
    console.log("Web Status Detection - Raw Product:", product);

    // Check ECommerceSettings object first
    if (product.ECommerceSettings?.ECommerceStatus) {
      const statusObj = product.ECommerceSettings.ECommerceStatus;

      // Object format with Value/Name
      if (typeof statusObj === "object") {
        const isAvailable =
          statusObj.Value === 0 || statusObj.Name === "Enabled";
        console.log("Object Status Check:", {
          statusValue: statusObj.Value,
          statusName: statusObj.Name,
          isAvailable: isAvailable,
        });
        return isAvailable;
      }

      // String format
      if (typeof statusObj === "string") {
        const isAvailable = statusObj === "Enabled";
        console.log("String Status Check:", {
          statusValue: statusObj,
          isAvailable: isAvailable,
        });
        return isAvailable;
      }
    }

    // Fallback checks
    const directStatusCheck = [
      product["ECommerceSettings.ECommerceStatus"],
      product.web_status,
      product.WebStatus,
    ];

    for (let status of directStatusCheck) {
      if (status !== undefined) {
        const isAvailable =
          status === "Enabled" ||
          status === "0" ||
          status === 0 ||
          status === true;

        console.log("Fallback Status Check:", {
          statusValue: status,
          isAvailable: isAvailable,
        });

        return isAvailable;
      }
    }

    console.warn("No valid web status found, defaulting to not available");
    return false;
  }

  /**
   * Create a table row for a product
   * @param {Object} product - Product data
   * @returns {HTMLElement} - Created row element
   */
  function createProductRow(product) {
    console.group("Product Row Creation");
    console.log("Creating Row for Product", {
      productId: product.ID,
      productData: product,
    });

    const row = document.createElement("tr");
    row.className = "product-row";
    row.setAttribute("data-product-id", product.ID);

    // Get headers precisely
    const headers = Array.from(
      document.querySelector("#productsTable thead").querySelectorAll("th")
    );

    // ROBUST CHECK: Log field configuration state for debugging
    console.log("Field Configuration State:", {
      exists: !!window.categoryFieldConfig,
      isEmpty: !window.categoryFieldConfig || Object.keys(window.categoryFieldConfig || {}).length === 0,
      fieldCount: Object.keys(window.categoryFieldConfig || {}).length
    });

    // First, ensure we have field configuration with fallback logic
    const fieldConfig = window.categoryFieldConfig?.fields || window.categoryFieldConfig || {};

    console.log(
      "Table Headers:",
      headers.map((h) => h.textContent.trim())
    );
    console.log("Field Configuration:", fieldConfig);

    // IMPROVEMENT: More robust field mapping with fallbacks
    let displayToFieldKey = {};
    
    // Try multiple ways to build the mapping
    if (Object.keys(fieldConfig).length > 0) {
      try {
        // First attempt - using normal field config
        displayToFieldKey = Object.entries(fieldConfig).reduce(
          (acc, [key, field]) => {
            if (field && field.display) {
              acc[field.display.toLowerCase()] = key;
            }
            return acc;
          },
          {}
        );
        
        // If mapping is empty, try a different approach
        if (Object.keys(displayToFieldKey).length === 0 && fieldConfig.fields) {
          displayToFieldKey = Object.entries(fieldConfig.fields).reduce(
            (acc, [key, field]) => {
              if (field && field.display) {
                acc[field.display.toLowerCase()] = key;
              }
              return acc;
            },
            {}
          );
        }
      } catch (mappingError) {
        console.error("Error creating field mapping:", mappingError);
      }
    }

    // FALLBACK: Create a direct key mapping using headers and product keys if needed
    if (Object.keys(displayToFieldKey).length === 0) {
      console.warn("Field mapping not available, attempting direct key match...");
      if (product) {
        const productKeys = Object.keys(product);
        headers.forEach(header => {
          const headerText = header.textContent.trim().replace(/[↕↑↓]/g, "").trim();
          // Try to find a matching key in the product
          const matchingKey = productKeys.find(key => {
            // Try to match header text with product key, ignoring case and spaces
            const formattedKey = key.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
            const formattedHeader = headerText.toLowerCase();
            return formattedKey === formattedHeader;
          });
          
          if (matchingKey) {
            displayToFieldKey[headerText.toLowerCase()] = matchingKey;
            console.log(`Created direct mapping: "${headerText}" -> "${matchingKey}"`);
          }
        });
      }
    }

    console.log("Display to Field Key Mapping:", displayToFieldKey);

    // Process each header exactly
    headers.forEach((header, index) => {
      const headerText = header.textContent
        .trim()
        .replace(/[↕↑↓]/g, "")
        .trim()
        .toLowerCase();
      const cell = document.createElement("td");

      console.log(`Processing Header [${index}]: "${headerText}"`);

      // Static columns handling
      if (index === 0) {
        cell.innerHTML = window.utils.escapeHtml(product.Code || "");
        cell.setAttribute(
          "data-full-text",
          window.utils.escapeHtml(product.Code || "")
        );
      } else if (index === 1) {
        cell.innerHTML = window.utils.escapeHtml(product.Description || "");
        cell.setAttribute(
          "data-full-text",
          window.utils.escapeHtml(product.Description || "")
        );
      } else {
        // Dynamic columns matching
        const matchedFieldKey = displayToFieldKey[headerText];

        if (matchedFieldKey) {
          const value = product[matchedFieldKey] ?? "";

          console.log(`Matched field for "${headerText}":`, {
            fieldKey: matchedFieldKey,
            value,
          });

          cell.innerHTML = window.utils.escapeHtml(String(value));
          cell.setAttribute("data-full-text", window.utils.escapeHtml(String(value)));
        } else if (headerText === "web status") {
          const isAvailable = determineWebStatus(product);
          cell.innerHTML = `
              <span class="web-status-cell ${
                isAvailable ? "available" : "not-available"
              }">
                ${isAvailable ? "Available" : "Not Available"}
              </span>
            `;
        } else if (headerText === "images") {
          const imageCount =
            product.ImageCount !== undefined && product.ImageCount !== null
              ? Math.round(product.ImageCount)
              : "";
          cell.innerHTML = window.utils.escapeHtml(String(imageCount));
          cell.setAttribute(
            "data-full-text",
            window.utils.escapeHtml(String(imageCount))
          );
        } else if (headerText === "actions") {
          cell.innerHTML = `
              <button class="btn-uni edit-product-btn" data-product-id="${product.ID}">
                Edit
              </button>
            `;
        } else {
          // IMPROVED: Try to find a direct property match in product
          const directMatch = findPropertyInProduct(product, headerText);
          if (directMatch !== null) {
            console.log(`Found direct match in product for "${headerText}":`, directMatch);
            cell.innerHTML = window.utils.escapeHtml(String(directMatch));
            cell.setAttribute("data-full-text", window.utils.escapeHtml(String(directMatch)));
          } else {
            console.warn(`No matching field found for header: "${headerText}"`);
            cell.textContent = ""; // Clear cell if no match
          }
        }
      }

      row.appendChild(cell);
    });

    // Add event listener for edit button
    const editBtn = row.querySelector(".edit-product-btn");
    if (editBtn) {
      editBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        if (window.productEdit) {
          window.productEdit.fetchProductDetails(product.ID);
        } else if (window.fetchProductDetails) {
          window.fetchProductDetails(product.ID);
        }
      });
    }

    console.groupEnd();
    return row;
  }

  /**
   * Update table with new results
   * @param {Object} data - Data containing product information
   */
  async function updateTableWithResults(data) {
    console.log("Updating table with data:", data);

    const tbody = document.querySelector("#productsTable tbody");
    if (!tbody) {
      console.error("Table body not found");
      return;
    }

    // IMPORTANT: Ensure field configuration is loaded before processing
    await ensureFieldConfig(data);

    tbody.innerHTML = "";

    if (!data.Data || data.Data.length === 0) {
      console.warn("No results found");
      const noResultsRow = document.createElement("tr");
      noResultsRow.innerHTML = `
          <td colspan="${getColumnCount()}" class="text-center py-4">
            No results found
          </td>
        `;
      tbody.appendChild(noResultsRow);
      return;
    }

    data.Data.forEach((product) => {
      const row = createProductRow(product);
      tbody.appendChild(row);
    });

    // Update pagination
    if (window.productPagination) {
      window.productPagination.updatePaginationInfo(data);
    } else if (window.updatePaginationInfo) {
      window.updatePaginationInfo(data);
    }

    // Re-initialize edit buttons
    if (window.productEdit) {
      window.productEdit.initEditButtons();
    } else if (window.initEditButtons) {
      window.initEditButtons();
    }
  }

  /**
   * Update a single table row
   * @param {string} productId - Product ID
   * @param {Object} updatedProduct - Updated product data
   */
  async function updateTableRow(productId, updatedProduct) {
    console.log(
      "Starting table row update for product:",
      productId,
      updatedProduct
    );

    if (!productId || !updatedProduct) {
      console.error("Missing required data for table update:", {
        productId,
        updatedProduct,
      });
      return;
    }

    // IMPORTANT: Ensure field configuration is loaded
    if (!window.categoryFieldConfig || Object.keys(window.categoryFieldConfig).length === 0) {
      await ensureFieldConfig({
        Data: [updatedProduct]
      });
    }

    // Try to find the table
    const table = document.querySelector("table");
    if (!table) {
      console.error("Table not found");
      return;
    }

    const row = table.querySelector(`tr[data-product-id="${productId}"]`);
    console.log("Looking for row with product ID:", productId);

    if (!row) {
      console.error("Row not found for product:", productId);
      const allRows = table.querySelectorAll("tr[data-product-id]");
      console.log(
        "Available product rows:",
        Array.from(allRows).map((r) => r.getAttribute("data-product-id"))
      );
      return;
    }

    // Get headers and find special column indices
    const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
      th.textContent.trim().replace(/[↕↑↓]/g, "").trim()
    );
    console.log("Found headers:", headers);

    // Find indices for special columns
    const specialColumnIndices = {
      images: headers.findIndex((h) => h.includes("Images")),
      webStatus: headers.findIndex((h) => h.includes("Web Status")),
      actions: headers.findIndex((h) => h.includes("Actions")),
    };
    console.log("Special column indices:", specialColumnIndices);

    const cells = row.getElementsByTagName("td");
    console.log("Found cells:", cells.length);

    // Helper function to update a cell
    const updateCell = (cell, value, fieldName) => {
      if (cell) {
        const oldValue = cell.textContent;
        const displayValue = value !== undefined && value !== null ? value : "";

        // Update both text content and data attribute
        cell.textContent = displayValue;
        cell.setAttribute("data-full-text", displayValue);

        console.log(`Updated cell ${fieldName}:`, {
          oldValue,
          newValue: displayValue,
          success: cell.textContent === displayValue,
        });
      }
    };

    // Update static fields
    console.log("Updating static fields...");
    updateCell(cells[0], updatedProduct.Code, "Code");
    updateCell(cells[1], updatedProduct.Description, "Description");

    // Ensure we have the category field configuration
    if (!window.categoryFieldConfig && updatedProduct.Category) {
      console.log("Fetching missing category field config...");
      try {
        await window.api.fetchFieldConfig(updatedProduct.Category.ID);
      } catch (error) {
        console.error("Failed to fetch field configuration:", error);
        return;
      }
    }

    // Update dynamic fields
    let cellIndex = 2;
    console.log("Updating dynamic fields...");

    // Process all columns between Description and Images
    for (let i = 2; i < specialColumnIndices.images; i++) {
      const header = headers[i];
      if (cells[i] && window.categoryFieldConfig) {
        const fieldEntry = Object.entries(window.categoryFieldConfig).find(
          ([key, field]) => field.display === header && field.used
        );

        if (fieldEntry) {
          const [fieldKey] = fieldEntry;
          console.log(
            `Updating dynamic field: ${header} (${fieldKey}) at index ${i}`
          );
          updateCell(cells[i], updatedProduct[fieldKey], fieldKey);
        }
      }
      cellIndex++;
    }

    // Update special columns in their correct positions
    if (specialColumnIndices.images > -1) {
      const imageCount =
        updatedProduct.ImageCount !== undefined
          ? Math.round(updatedProduct.ImageCount)
          : "";
      console.log(
        "Updating Image Count at index:",
        specialColumnIndices.images
      );
      updateCell(cells[specialColumnIndices.images], imageCount, "Image Count");
    }

    if (specialColumnIndices.webStatus > -1) {
      let isAvailable = determineWebStatus(updatedProduct);

      console.log("Final status determination:", {
        isAvailable: isAvailable,
        productId: updatedProduct.ID,
      });

      const webStatusCell = cells[specialColumnIndices.webStatus];
      if (webStatusCell) {
        const statusSpan = webStatusCell.querySelector(".web-status-cell");
        if (statusSpan) {
          const oldClass = statusSpan.className;
          const oldText = statusSpan.textContent;

          statusSpan.className = `web-status-cell ${
            isAvailable ? "available" : "not-available"
          }`;
          statusSpan.textContent = isAvailable ? "Available" : "Not Available";
          console.log("Web status cell updated:", {
            oldClass: oldClass,
            newClass: statusSpan.className,
            oldText: oldText,
            newText: statusSpan.textContent,
          });
        } else {
          // If span doesn't exist, create it
          const newSpan = document.createElement("span");
          newSpan.className = `web-status-cell ${
            isAvailable ? "available" : "not-available"
          }`;
          newSpan.textContent = isAvailable ? "Available" : "Not Available";
          webStatusCell.innerHTML = "";
          webStatusCell.appendChild(newSpan);
          console.log("Created new web status span");
        }
      } else {
        console.warn(
          "Web status cell not found at index:",
          specialColumnIndices.webStatus
        );
      }
    }

    // Visual feedback
    row.style.opacity = "0.99";
    requestAnimationFrame(() => {
      row.style.opacity = "1";
      row.style.opacity = ""; // Remove the inline style
    });

    // Try to reinitialize table handlers
    if (window.productInit && window.productInit.reinitializeTableHandlers) {
      window.productInit.reinitializeTableHandlers();
    } else if (window.reinitializeTableHandlers) {
      window.reinitializeTableHandlers();
    }

    console.log("Row update completed for product:", productId);
  }

  /**
   * Initialize the module
   */
  function init() {
    console.log("Product table functionality initialized");
    // Nothing to initialize at this point
  }

  // Return public methods
  return {
    init,
    getColumnCount,
    createProductRow,
    updateTableWithResults,
    updateTableRow,
    logTableStructure,
    determineWebStatus,
    ensureFieldConfig,
  };
})();

// Expose the module globally
window.productTable = productTable;

// Expose functions globally for backward compatibility
window.updateTableWithResults = productTable.updateTableWithResults;
window.updateTableRow = productTable.updateTableRow;
window.determineWebStatus = productTable.determineWebStatus;
window.getColumnCount = productTable.getColumnCount;
window.ensureFieldConfig = productTable.ensureFieldConfig;

// Initialize on DOM content loaded
document.addEventListener("DOMContentLoaded", productTable.init);

// Export the module if CommonJS module system is available
if (typeof module !== "undefined" && module.exports) {
  module.exports = { productTable };
}