/**
 * edit.js - Product editing functionality for PADDY
 *
 * This module handles product editing functionality:
 * - initEditFormHandlers() - Initializes edit form handlers
 * - initEditButtons() - Sets up edit button click handlers
 * - openEditForm() - Opens edit form modal
 * - closeEditForm() - Closes edit form modal
 * - fetchProductDetails() - Fetches product details
 * - populateCurrentDetails() - Shows current product details
 * - populateEditForm() - Populates edit form fields
 * - submitProductEdit() - Handles form submission
 * - createFieldGroup() - Creates form field group
 * - isFieldReadOnly() - Checks if field is read-only
 */

import { utils } from "../core/utils.js";
import { api } from "../core/api.js";
import { events } from "../core/events.js";

// Create a namespace for product editing functionality
export const productEdit = (function () {
  "use strict";

  /**
   * Initialize edit form handlers
   */
  function initEditFormHandlers() {
    console.log("Initializing edit form handlers");

    // Check both possible form IDs
    const form1 = document.getElementById("productEditForm");
    const form2 = document.getElementById("productEditForm2");

    console.log("Form elements found:", {
      form1: form1 ? true : false,
      form2: form2 ? true : false,
    });

    // Set up both forms if they exist
    if (form1) {
      console.log("Setting up handlers for form1");
      form1.removeEventListener("submit", submitProductEdit);
      form1.addEventListener("submit", function (event) {
        console.log("Form1 submit event triggered");
        submitProductEdit(event);
      });
    }

    if (form2) {
      console.log("Setting up handlers for form2");
      form2.removeEventListener("submit", submitProductEdit);
      form2.addEventListener("submit", function (event) {
        console.log("Form2 submit event triggered");
        submitProductEdit(event);
      });
    }

    // Initialize close buttons
    document
      .querySelectorAll(".close-button, .btn-cancel, .cancel")
      .forEach((button) => {
        button.removeEventListener("click", closeEditForm);
        button.addEventListener("click", function (e) {
          e.preventDefault();
          closeEditForm();
        });
      });
  }

  /**
   * Initialize edit buttons
   */
  function initEditButtons() {
    document.querySelectorAll(".edit-product-btn").forEach((button) => {
      // Remove existing listeners to prevent duplicates
      button.removeEventListener("click", handleEditButtonClick);
      button.addEventListener("click", handleEditButtonClick);
    });
  }

  /**
   * Handle edit button clicks
   * @param {Event} event - Click event
   */
  function handleEditButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();
    const productId = event.target.getAttribute("data-product-id");
    // If no product ID on button, try to get from parent row
    if (!productId) {
      const row = event.target.closest(".product-row");
      if (row) {
        const rowProductId = row.getAttribute("data-product-id");
        if (rowProductId) {
          fetchProductDetails(rowProductId);
        }
      }
    } else {
      fetchProductDetails(productId);
    }
  }

  /**
   * Open edit form modal
   */
  function openEditForm() {
    const editForm = document.getElementById("editProductForm");
    const overlay = document.getElementById("editFormOverlay");

    if (!editForm) {
      console.error("Edit form not found");
      return;
    }

    if (!overlay) {
      console.error("Overlay not found");
      return;
    }

    overlay.style.display = "block";
    editForm.style.display = "block";

    // Trigger reflow to enable CSS animations
    overlay.offsetHeight;
    editForm.offsetHeight;

    overlay.classList.add("active");
    editForm.classList.add("active");

    document.addEventListener("keydown", handleEditFormKeypress);

    // Focus the first input field in the form
    const firstInput = editForm.querySelector('input:not([type="hidden"])');
    if (firstInput) {
      firstInput.focus();
    }
  }

  /**
   * Close edit form modal
   */
  function closeEditForm() {
    const editForm = document.getElementById("editProductForm");
    const overlay = document.getElementById("editFormOverlay");

    if (!editForm) {
      console.error("Edit form not found");
      return;
    }

    if (!overlay) {
      console.error("Overlay not found");
      return;
    }

    overlay.classList.remove("active");
    editForm.classList.remove("active");

    document.removeEventListener("keydown", handleEditFormKeypress);

    // Wait for CSS animation to complete before hiding
    setTimeout(() => {
      overlay.style.display = "none";
      editForm.style.display = "none";

      // Reset the form fields
      const form = editForm.querySelector("form");
      if (form) {
        form.reset();
      }
    }, 300);

    // Return focus to the main content
    const mainContent = document.querySelector("main");
    if (mainContent) {
      mainContent.focus();
    }
  }

  /**
   * Handle keypress events in edit form
   * @param {KeyboardEvent} event - Keyboard event
   */
  function handleEditFormKeypress(event) {
    if (event.key === "Escape") {
      closeEditForm();
    }
  }

  /**
   * Fetch product details for editing
   * @param {string} productId - Product ID
   */
  function fetchProductDetails(productId) {
    if (!productId) {
      console.error("Invalid product ID");
      utils.showErrorMessage("Error: Invalid product ID");
      return;
    }

    // Show loading state
    const editForm = document.getElementById("editProductForm");
    if (editForm) {
      const loadingIndicator = document.createElement("div");
      loadingIndicator.className = "loading-indicator";
      loadingIndicator.innerHTML =
        '<div class="spinner"></div><p>Loading product details...</p>';

      // Clear previous loading indicators if any
      const existingIndicator = editForm.querySelector(".loading-indicator");
      if (existingIndicator) {
        existingIndicator.remove();
      }

      editForm.appendChild(loadingIndicator);
    }

    // Use API module
    api
      .fetchProductDetails(productId)
      .then((data) => {
        handleProductDetailsResponse(data);
      })
      .catch((error) => {
        console.error("Error fetching product details:", error);
        utils.showErrorMessage(
          `Failed to load product details: ${error.message}`
        );
      })
      .finally(() => {
        // Remove loading indicator
        if (editForm) {
          const loadingIndicator = editForm.querySelector(".loading-indicator");
          if (loadingIndicator) {
            loadingIndicator.remove();
          }
        }
      });
  }

  /**
   * Handle product details response
   * @param {Object} data - Product details data
   */
  function handleProductDetailsResponse(data) {
    if (!data || !data.product) {
      console.error("Invalid response data", data);
      throw new Error("Invalid product data received");
    }

    const product = data.product;
    populateCurrentDetails(product, data.dynamic_fields);
    populateEditForm(product, product.ID, data.dynamic_fields);
    openEditForm();
  }

  /**
   * Check if field is read-only
   * @param {string} fieldName - Field name
   * @returns {boolean} - Whether field is read-only
   */
  function isFieldReadOnly(fieldName) {
    const readOnlyFields = [
      "Code",
      "Description",
      "ImageCount",
      "popupProductName",
      // Add other read-only fields as needed
    ];
    return readOnlyFields.includes(fieldName);
  }

  /**
   * Populate current product details section
   * @param {Object} product - Product data
   * @param {Array} dynamicFields - Dynamic field definitions
   */
  function populateCurrentDetails(product, dynamicFields) {
    const container = document.getElementById("currentProductDetails");
    if (!container) return;

    // Helper function to determine web status
    function getWebStatus(product) {
      // Check ECommerceSettings object first
      if (product.ECommerceSettings?.ECommerceStatus) {
        const statusObj = product.ECommerceSettings.ECommerceStatus;

        // Object format with Value/Name
        if (typeof statusObj === "object") {
          const isAvailable =
            statusObj.Value === 0 || statusObj.Name === "Enabled";
          return isAvailable ? "Available" : "Not Available";
        }

        // String format
        if (typeof statusObj === "string") {
          return statusObj === "Enabled" ? "Available" : "Not Available";
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

          return isAvailable ? "Available" : "Not Available";
        }
      }

      return "Not Available";
    }

    const allFields = [
      { field: "Code", label: "Product Code" },
      { field: "Description", label: "Description" },
      { field: "D_Classification", label: "Classification" },
      { field: "D_ThreadGender", label: "Thread Gender" },
      { field: "D_SizeA", label: "Size A" },
      { field: "D_SizeB", label: "Size B" },
      { field: "D_SizeC", label: "Size C" },
      { field: "D_SizeD", label: "Size D" },
      { field: "D_Orientation", label: "Orientation" },
      { field: "D_Configuration", label: "Configuration" },
      { field: "D_Grade", label: "Grade" },
      { field: "D_ManufacturerName", label: "Manufacturer Name" },
      { field: "D_Application", label: "Application" },
      { field: "D_WebCategory", label: "Web Category" },
      {
        field: "ECommerceStatus",
        label: "Web Status",
        getValue: () => getWebStatus(product),
      },
    ];

    console.log("Current Product Details:", {
      productId: product.ID,
      ecommerceSettings: product.ECommerceSettings,
      ecommerceStatus: product.ECommerceSettings?.ECommerceStatus,
      webStatus: getWebStatus(product),
    });

    container.innerHTML = `
        <table class="table table-bordered">
          ${allFields
            .map((field) => {
              let displayValue = field.getValue
                ? field.getValue()
                : product[field.field] || "";

              // Special handling for web status display
              if (field.field === "ECommerceStatus") {
                return `
                <tr>
                  <th>${field.label}</th>
                  <td>
                    <span class="web-status-cell ${
                      displayValue === "Available"
                        ? "available"
                        : "not-available"
                    }">
                      ${displayValue}
                    </span>
                  </td>
                </tr>
              `;
              }

              return `
              <tr>
                <th>${field.label}</th>
                <td>${displayValue}</td>
              </tr>
            `;
            })
            .join("")}
        </table>
      `;
  }

  /**
   * Populate edit form with product data
   * @param {Object} product - Product data
   * @param {string} productId - Product ID
   * @param {Array} dynamicFields - Dynamic field definitions
   */
  function populateEditForm(product, productId, dynamicFields) {
    // Prevent immediate page reload to allow error inspection
    window.onbeforeunload = function () {
      return "Diagnostic mode: Prevent automatic page reload";
    };

    // Enhanced error logging function
    function logError(message, details = {}) {
      const errorContainer =
        document.getElementById("form-errors") ||
        document.querySelector("#form-errors .alert-message");

      console.error("Product Edit Form Population Error:", message, details);

      if (errorContainer) {
        errorContainer.textContent = `${message}: ${JSON.stringify(details)}`;
        errorContainer.style.display = "block";
      }

      // Optional: Show error popup
      if (typeof utils !== "undefined" && utils.showErrorMessage) {
        utils.showErrorMessage(message);
      }
    }

    try {
      console.group("Populating Edit Form - COMPREHENSIVE DIAGNOSTIC");

      // Validate input
      if (!product) {
        throw new Error("No product data provided");
      }

      // Log raw input data with enhanced detail
      console.log("Full Product Data:", JSON.stringify(product, null, 2));
      console.log("Product ID:", productId);

      // Comprehensive field mapping with multiple variations
      const fieldMappings = {
        popupProductCode: ["Code", "code", "product_code"],
        popupProductId: ["ID", "id", "product_id"],
        popupProductName: ["Description", "description", "product_name"],
        popupImageCount: ["ImageCount", "image_count", "imageCount"],
        popupWebCategory: ["D_WebCategory", "web_category", "WebCategory"],
        popupExtendedDescription: [
          "ECommerceSettings.ExtendedDescription",
          "extended_description",
          "ExtendedDescription",
        ],
        popupWebStatus: [
          "ECommerceSettings.ECommerceStatus.Name",
          "web_status",
          "WebStatus",
        ],
      };

      // Enhanced value finder with extensive logging
      function findValue(mappingKeys) {
        console.log(
          `Searching for values with keys: ${mappingKeys.join(", ")}`
        );

        for (let key of mappingKeys) {
          // Handle nested key notation
          if (key.includes(".")) {
            const keys = key.split(".");
            let value = product;

            for (let nestedKey of keys) {
              value = value?.[nestedKey];
              if (value === undefined) break;
            }

            if (value !== undefined) {
              console.log(`Found nested value for ${key}:`, value);
              return value;
            }
          }

          // Direct key check
          if (product[key] !== undefined) {
            console.log(`Found direct value for ${key}:`, product[key]);
            return product[key];
          }
        }

        console.warn(`No value found for keys: ${mappingKeys.join(", ")}`);
        return "";
      }

      // Populate known fields with comprehensive logging
      Object.entries(fieldMappings).forEach(([elementId, keys]) => {
        const element = document.getElementById(elementId);

        if (!element) {
          logError(`Element not found: ${elementId}`, {
            expectedKeys: keys,
          });
          return;
        }

        const value = findValue(keys);

        console.log(`Populating ${elementId}:`, {
          element: element,
          keys: keys,
          foundValue: value,
          elementType: element.tagName,
        });

        // Population logic with type-specific handling
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          element.value = value || "";
        } else if (element.tagName === "DIV" || element.tagName === "SPAN") {
          element.textContent = value || "";
        } else if (element.tagName === "SELECT") {
          // Special handling for select elements
          const optionValue = value?.Name || value || "";
          element.value = optionValue;
        }

        // Read-only handling with enhanced logging
        try {
          const isReadOnly = isFieldReadOnly(elementId.replace("popup", ""));

          console.log(`Read-only check for ${elementId}:`, {
            fieldName: elementId.replace("popup", ""),
            isReadOnly: isReadOnly,
          });

          if (isReadOnly) {
            element.setAttribute("readonly", "readonly");
            element.classList.add("read-only");
          }
        } catch (readOnlyError) {
          logError(`Error checking read-only status for ${elementId}`, {
            error: readOnlyError.message,
          });
        }
      });

      // Dynamic D_ fields population with improved error handling
      try {
        const dynamicFieldNames = Object.keys(product)
          .filter((key) => key.startsWith("D_") && key !== "D_WebCategory")
          .map((key) => ({
            name: key,
            value: product[key],
          }));

        console.log("Dynamic Fields Found:", dynamicFieldNames);

        const firstColumn = document.getElementById("popupFirstColumn");
        const secondColumn = document.getElementById("popupSecondColumn");

        if (!firstColumn || !secondColumn) {
          throw new Error("Dynamic field columns not found");
        }

        firstColumn.innerHTML = "";
        secondColumn.innerHTML = "";

        dynamicFieldNames.forEach((field, index) => {
          try {
            const fieldGroup = createFieldGroup({
              name: field.name,
              label: field.name
                .replace("D_", "")
                .replace(/([A-Z])/g, " $1")
                .trim(),
              value: field.value,
              readonly: isFieldReadOnly(field.name),
            });

            // Alternate between columns
            const targetColumn = index % 2 === 0 ? firstColumn : secondColumn;
            targetColumn.appendChild(fieldGroup);
          } catch (fieldGroupError) {
            logError(`Error creating field group for ${field.name}`, {
              error: fieldGroupError.message,
            });
          }
        });
      } catch (dynamicFieldError) {
        logError("Error processing dynamic fields", {
          error: dynamicFieldError.message,
        });
      }

      // Web status handling with comprehensive error management
      try {
        const webStatusSelect = document.getElementById("popupWebStatus");
        if (webStatusSelect) {
          const statusObj = product.ECommerceSettings?.ECommerceStatus;
          const isAvailable =
            statusObj?.Value === 0 || statusObj?.Name === "Enabled";

          console.log("Web Status Detection:", {
            statusObject: statusObj,
            isAvailable: isAvailable,
          });

          webStatusSelect.value = isAvailable ? "Available" : "Not Available";
        }
      } catch (webStatusError) {
        logError("Error processing web status", {
          error: webStatusError.message,
        });
      }

      console.groupEnd();

      // Remove onbeforeunload to allow normal navigation
      window.onbeforeunload = null;
    } catch (criticalError) {
      logError("Critical Error in Edit Form Population", {
        error: criticalError.message,
        stack: criticalError.stack,
      });

      // Prevent automatic page reload to allow error inspection
      window.onbeforeunload = function () {
        return "Error occurred during form population";
      };
    }
  }

  /**
   * Create form field group
   * @param {Object} field - Field definition
   * @returns {HTMLElement} - Form field group element
   */
  function createFieldGroup(field) {
    const group = document.createElement("div");
    group.className = "form-group";

    const label = document.createElement("label");
    label.textContent = field.label || field.name;
    group.appendChild(label);

    if (field.readonly) {
      // Create read-only display element
      const readOnlyDiv = document.createElement("div");
      readOnlyDiv.className = "form-control readonly-input";
      readOnlyDiv.textContent = field.value || "";
      group.appendChild(readOnlyDiv);

      // Add hidden input to preserve the value
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.name = field.name;
      hiddenInput.value = field.value || "";
      group.appendChild(hiddenInput);
    } else if (field.type === "checkbox") {
      const inputElement = document.createElement("input");
      inputElement.type = "checkbox";
      inputElement.name = field.name;
      inputElement.id = field.name;
      inputElement.className = "form-control";
      inputElement.checked =
        field.value === true || field.value === "true" || field.value === "0";

      label.appendChild(inputElement);
      label.appendChild(document.createTextNode(` ${field.label}`));
    } else if (field.type === "select" && field.options) {
      const selectElement = document.createElement("select");
      selectElement.name = field.name;
      selectElement.id = field.name;
      selectElement.className = "form-control form-select";

      field.options.forEach((option) => {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        if (option.value === field.value) {
          optionElement.selected = true;
        }
        selectElement.appendChild(optionElement);
      });
      group.appendChild(selectElement);
    } else if (field.type === "textarea") {
      const textarea = document.createElement("textarea");
      textarea.name = field.name;
      textarea.className = "form-control";
      textarea.value = field.value || "";
      group.appendChild(textarea);
    } else {
      const input = document.createElement("input");
      input.type = field.type || "text";
      input.name = field.name;
      input.className = "form-control";
      input.value = field.value || "";
      group.appendChild(input);
    }

    return group;
  }

  /**
   * Handle form submission
   * @param {Event} event - Submit event
   */
  async function submitProductEdit(event) {
    event.preventDefault();
    console.log("Submit product edit called");

    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const cancelButton = form.querySelector(".btn-cancel, .cancel");
    const productId =
      form.querySelector("#popupProductId")?.value ||
      form.querySelector("#editProductId")?.value;

    const webStatusSelect =
      form.querySelector("#popupWebStatus") || form.querySelector("#webStatus");

    const extendedDescInput =
      form.querySelector("#popupExtendedDescription") ||
      form.querySelector("#extendedDescription");

    console.log("Form elements:", {
      form: form.id,
      productId,
      webStatusSelect: webStatusSelect ? webStatusSelect.value : "not found",
      extendedDesc: extendedDescInput ? "found" : "not found",
    });

    if (!productId) {
      console.error("Product ID not found");
      utils.showErrorMessage("Error: Product ID not found");
      return;
    }

    // Disable buttons during update to prevent multiple submissions
    if (submitButton) submitButton.disabled = true;
    if (submitButton) submitButton.textContent = "Saving...";
    if (cancelButton) cancelButton.disabled = true;

    try {
      // Create a clean payload object to ensure precise data transmission
      const updatedFields = {
        product_id: productId,
        // Initialize the ECommerceSettings structure
        ECommerceSettings: {},
      };

      // Handle web status update - use the string enum value, not a number
      if (webStatusSelect) {
        const rawStatus = webStatusSelect.value;
        // Convert UI value to the enum string expected by the API
        const statusEnumValue =
          rawStatus === "Available" ? "Enabled" : "Disabled";

        console.log(
          `Web status selected: ${rawStatus} (will be converted to: ${statusEnumValue})`
        );

        // Use string enum value for ECommerceStatus
        updatedFields.ECommerceSettings.ECommerceStatus = statusEnumValue;
      }

      // Handle extended description
      if (extendedDescInput) {
        console.log(
          `Extended description: ${extendedDescInput.value.substring(0, 50)}${
            extendedDescInput.value.length > 50 ? "..." : ""
          }`
        );
        updatedFields.ECommerceSettings.ExtendedDescription =
          extendedDescInput.value;
      }

      // Process other fields from the form
      const formData = new FormData(form);
      for (let [key, value] of formData.entries()) {
        // Skip fields we handled specially and empty strings
        if (
          value !== "" &&
          key !== "web_status" &&
          key !== "extended_description" &&
          key !== "product_id" &&
          !key.startsWith("ECommerceSettings.")
        ) {
          // Check if this is a "D_" field (product attribute)
          if (key.startsWith("D_")) {
            console.log(`Adding field ${key}: ${value}`);
            updatedFields[key] = String(value).trim();
          }
        }
      }

      console.log("Final API payload:", JSON.stringify(updatedFields, null, 2));

      // Make a direct fetch call to ensure the request is made
      const response = await fetch(`/product/${productId}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(updatedFields),
      });

      console.log("API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", errorData);
        throw new Error(
          errorData.error || `Server returned ${response.status}`
        );
      }

      const result = await response.json();
      console.log("API response data:", result);

      if (result.error) {
        throw new Error(result.error);
      }

      utils.showSuccessPopup("Product updated successfully");
      closeEditForm();

      // Optionally refresh the page to show changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Product Update Error:", error);
      utils.showErrorMessage(`Update failed: ${error.message}`);
    } finally {
      // Re-enable buttons
      if (submitButton) submitButton.disabled = false;
      if (submitButton) submitButton.textContent = "Save Changes";
      if (cancelButton) cancelButton.disabled = false;
    }
  }

  /**
   * Initialize module
   */
  function init() {
    initEditFormHandlers();
    initEditButtons();
    console.log("Product edit functionality initialized");
  }

  // Return public methods
  return {
    init,
    initEditFormHandlers,
    initEditButtons,
    openEditForm,
    closeEditForm,
    fetchProductDetails,
    submitProductEdit,
    handleEditButtonClick,
  };
})();

// Make all key functions available globally for backward compatibility
window.submitProductEdit = productEdit.submitProductEdit;
window.closeEditForm = productEdit.closeEditForm;
window.openEditForm = productEdit.openEditForm;
window.fetchProductDetails = productEdit.fetchProductDetails;
window.handleEditButtonClick = productEdit.handleEditButtonClick;

// Initialize on DOM content loaded
document.addEventListener("DOMContentLoaded", () => {
  productEdit.init();
});

// Export the productEdit module (if CommonJS module system is available)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { productEdit };
}
