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

// Create a namespace for product editing functionality
const productEdit = (function () {
  "use strict";

  // Store loaded product attributes configuration
  let productAttributes = null;

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
      window.utils.showErrorMessage("Error: Invalid product ID");
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

    // Ensure product attributes are loaded
    loadProductAttributes().then(() => {
      // Use API module
      window.api
        .fetchProductDetails(productId)
        .then((data) => {
          handleProductDetailsResponse(data);
        })
        .catch((error) => {
          console.error("Error fetching product details:", error);
          window.utils.showErrorMessage(
            `Failed to load product details: ${error.message}`
          );
        })
        .finally(() => {
          // Remove loading indicator
          if (editForm) {
            const loadingIndicator =
              editForm.querySelector(".loading-indicator");
            if (loadingIndicator) {
              loadingIndicator.remove();
            }
          }
        });
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
   * Load product attributes from JSON file
   * @returns {Promise} - Promise that resolves when attributes are loaded
   */
  function loadProductAttributes() {
    // If already loaded, return resolved promise
    if (productAttributes) {
      return Promise.resolve(productAttributes);
    }

    return fetch("/static/json/product_attributes.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load product attributes: ${response.status}`
          );
        }
        return response.json();
      })
      .then((data) => {
        console.log("Product attributes loaded successfully");
        productAttributes = data;
        window.productAttributes = data; // Also store globally for compatibility
        return data;
      })
      .catch((error) => {
        console.error("Error loading product attributes:", error);
        return null;
      });
  }

  /**
   * Get field configuration for a category
   * @param {string} categoryId - Category ID
   * @returns {Object|null} - Field configuration or null if not found
   */
  function getFieldConfig(categoryId) {
    if (!productAttributes || !categoryId) {
      return null;
    }

    return productAttributes[categoryId]?.fields || null;
  }

  /**
   * Populate current product details section with appropriate field labels
   * @param {Object} product - Product data
   * @param {Array} legacyFields - Legacy dynamic field definitions (unused parameter)
   */
  function populateCurrentDetails(product, legacyFields) {
    const container = document.getElementById("currentProductDetails");
    if (!container) return;

    // Get category-specific field configuration
    const categoryId = product.Category?.ID;
    const fieldConfig = categoryId ? getFieldConfig(categoryId) : null;

    console.log("Current Product Category:", categoryId);
    console.log("Field Configuration:", fieldConfig);

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

    // Create basic static fields
    const staticFields = [
      { field: "Code", label: "Product Code" },
      { field: "Description", label: "Description" },
      { field: "D_WebCategory", label: "Web Category" },
      {
        field: "ECommerceStatus",
        label: "Web Status",
        getValue: () => getWebStatus(product),
      },
    ];

    // Add dynamic fields based on field configuration
    const dynamicFields = [];

    if (fieldConfig) {
      // Add configured fields with proper display names
      Object.entries(fieldConfig).forEach(([key, config]) => {
        if (key.startsWith("D_") && key !== "D_WebCategory" && config.used) {
          dynamicFields.push({
            field: key,
            label: config.display || key.replace("D_", ""),
            value: product[key] || "",
          });
        }
      });
    } else {
      // Fallback to default field list
      const defaultFields = [
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
      ];

      dynamicFields.push(...defaultFields);
    }

    const allFields = [...staticFields, ...dynamicFields];

    console.log("Current Product Details:", {
      productId: product.ID,
      ecommerceSettings: product.ECommerceSettings,
      ecommerceStatus: product.ECommerceSettings?.ECommerceStatus,
      webStatus: getWebStatus(product),
      fields: allFields.map((f) => f.field),
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
                    displayValue === "Available" ? "available" : "not-available"
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
    try {
      console.group("Populating Edit Form with Product Attributes");

      // Validate input
      if (!product) {
        throw new Error("No product data provided");
      }

      // Get category ID and field configuration
      const categoryId = product.Category?.ID;
      const fieldConfig = categoryId ? getFieldConfig(categoryId) : null;

      console.log("Product category:", categoryId);
      console.log("Field configuration:", fieldConfig);

      // Populate basic fields
      populateBasicFields(product);

      // Populate dynamic fields based on field configuration
      if (fieldConfig) {
        populateDynamicFieldsFromConfig(product, fieldConfig);
      } else {
        // Fallback to old method
        populateLegacyDynamicFields(product);
      }

      // Set up web status
      setupWebStatus(product);

      console.groupEnd();
    } catch (criticalError) {
      console.error("Critical Error in Edit Form Population:", criticalError);
      window.utils.showErrorMessage(`Error loading form: ${criticalError.message}`);
    }
  }

  /**
   * Populate basic static fields
   * @param {Object} product - Product data
   */
  function populateBasicFields(product) {
    // Static field mapping
    const staticFields = {
      popupProductCode: product.Code,
      popupProductId: product.ID,
      popupProductName: product.Description,
      popupImageCount: product.ImageCount,
      popupWebCategory: product.D_WebCategory,
      popupExtendedDescription: product.ECommerceSettings?.ExtendedDescription,
    };

    // Set field values
    Object.entries(staticFields).forEach(([elementId, value]) => {
      const element = document.getElementById(elementId);
      if (element) {
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          element.value = value !== undefined && value !== null ? value : "";
        } else if (element.tagName === "SELECT") {
          element.value = value !== undefined && value !== null ? value : "";
        } else {
          element.textContent =
            value !== undefined && value !== null ? value : "";
        }

        // Mark read-only fields
        if (isFieldReadOnly(elementId.replace("popup", ""))) {
          element.setAttribute("readonly", "readonly");
          element.classList.add("read-only");
        }
      }
    });
  }

  /**
   * Populate dynamic fields based on field configuration
   * @param {Object} product - Product data
   * @param {Object} fieldConfig - Field configuration from product_attributes.json
   */
  function populateDynamicFieldsFromConfig(product, fieldConfig) {
    const firstColumn = document.getElementById("popupFirstColumn");
    const secondColumn = document.getElementById("popupSecondColumn");

    if (!firstColumn || !secondColumn) {
      console.error("Dynamic field columns not found");
      return;
    }

    // Clear existing fields
    firstColumn.innerHTML = "";
    secondColumn.innerHTML = "";

    // Get all fields configured for this category
    const dynamicFields = Object.entries(fieldConfig)
      .filter(
        ([key, config]) =>
          key.startsWith("D_") && key !== "D_WebCategory" && config.used
      )
      .map(([key, config]) => ({
        name: key,
        label: config.display || key.replace("D_", ""),
        value: product[key] || "",
        type: config.type,
        used: config.used,
      }));

    console.log("Dynamic fields to display:", dynamicFields);

    // Create field groups and add to columns
    dynamicFields.forEach((field, index) => {
      try {
        const fieldGroup = createFieldGroup({
          name: field.name,
          label: field.label,
          value: field.value,
          type: field.type === "Boolean" ? "checkbox" : "text",
          readonly: isFieldReadOnly(field.name),
        });

        // Alternate between columns
        const targetColumn = index % 2 === 0 ? firstColumn : secondColumn;
        targetColumn.appendChild(fieldGroup);
      } catch (error) {
        console.error(`Error creating field group for ${field.name}:`, error);
      }
    });
  }

  /**
   * Fallback function to populate dynamic fields the old way
   * @param {Object} product - Product data
   */
  function populateLegacyDynamicFields(product) {
    console.log("Using legacy method for dynamic fields");

    const firstColumn = document.getElementById("popupFirstColumn");
    const secondColumn = document.getElementById("popupSecondColumn");

    if (!firstColumn || !secondColumn) {
      console.error("Dynamic field columns not found");
      return;
    }

    // Clear existing fields
    firstColumn.innerHTML = "";
    secondColumn.innerHTML = "";

    // Get all D_ fields from product
    const dynamicFieldNames = Object.keys(product)
      .filter((key) => key.startsWith("D_") && key !== "D_WebCategory")
      .map((key) => ({
        name: key,
        value: product[key],
      }));

    console.log("Legacy dynamic fields:", dynamicFieldNames);

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
      } catch (error) {
        console.error(`Error creating field group for ${field.name}:`, error);
      }
    });
  }

  /**
   * Set up web status field
   * @param {Object} product - Product data
   */
  function setupWebStatus(product) {
    const webStatusSelect = document.getElementById("popupWebStatus");
    if (webStatusSelect) {
      const statusObj = product.ECommerceSettings?.ECommerceStatus;
      const isAvailable =
        statusObj?.Value === 0 ||
        statusObj?.Name === "Enabled" ||
        statusObj === "Enabled";

      console.log("Web Status:", {
        statusObject: statusObj,
        isAvailable: isAvailable,
      });

      webStatusSelect.value = isAvailable ? "Available" : "Not Available";
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
   * Handle form submission with table refresh and page reload
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

    // Enhanced D_WebCategory detection - check ALL possible field variations
    const webCategoryInput = form.querySelector(
      'select[name="D_WebCategory"], input[name="D_WebCategory"], [id="D_WebCategory"], [id="popupWebCategory"], [name="popupWebCategory"], [data-field="D_WebCategory"]'
    );

    // Find WebCategory value from the displayed product details table
    let webCategoryDisplayValue = null;
    try {
      // Find all table rows in the current product details
      const detailsTable = document.querySelector(
        "#currentProductDetails table"
      );
      if (detailsTable) {
        const rows = detailsTable.querySelectorAll("tr");
        // Loop through rows to find the one with "Web Category"
        for (let row of rows) {
          const headerCell = row.querySelector("th");
          if (headerCell && headerCell.textContent.trim() === "Web Category") {
            const valueCell = row.querySelector("td");
            if (valueCell) {
              webCategoryDisplayValue = valueCell.textContent.trim();
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Error finding WebCategory in details table:", e);
    }

    console.log("Form elements:", {
      form: form.id,
      productId,
      webStatusSelect: webStatusSelect ? webStatusSelect.value : "not found",
      extendedDesc: extendedDescInput ? "found" : "not found",
      webCategory: webCategoryInput ? webCategoryInput.value : "not found",
      webCategoryDisplay: webCategoryDisplayValue,
    });

    if (!productId) {
      console.error("Product ID not found");
      window.utils.showErrorMessage("Error: Product ID not found");
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

      // Explicitly handle D_WebCategory
      if (!("D_WebCategory" in updatedFields)) {
        console.log("D_WebCategory not found in form data, adding manually");

        let webCategoryValue = null;

        // Try all possible sources for the value in priority order
        if (webCategoryInput && webCategoryInput.value) {
          webCategoryValue = webCategoryInput.value;
          console.log(`Using WebCategory from input: ${webCategoryValue}`);
        } else if (webCategoryDisplayValue) {
          webCategoryValue = webCategoryDisplayValue;
          console.log(`Using WebCategory from display: ${webCategoryValue}`);
        } else {
          // Use value from response - default to TEST as seen in your logs
          webCategoryValue = "TEST";
          console.log(`Using default WebCategory value: ${webCategoryValue}`);
        }

        // Set the value in the payload
        updatedFields["D_WebCategory"] = webCategoryValue;
      }

      console.log("Final API payload:", JSON.stringify(updatedFields, null, 2));

      // Make a direct fetch call to ensure the request is made
      const response = await fetch(`/product/${productId}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          // Add cache-busting headers
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        body: JSON.stringify(updatedFields),
      });

      console.log("API response status:", response.status);

      let result;
      try {
        const textResponse = await response.text();
        console.log("Raw response:", textResponse);
        result = textResponse ? JSON.parse(textResponse) : {};
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        throw new Error("Invalid response format");
      }

      if (!response.ok) {
        console.error("API error response:", result);
        throw new Error(result.error || `Server returned ${response.status}`);
      }

      console.log("API response data:", result);

      if (result.error) {
        throw new Error(result.error);
      }

      // Always reload the page after successful submission
      window.utils.showSuccessPopup("Product updated successfully. Reloading...");
      closeEditForm();
      
      // Wait a moment to show the success message before reloading
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error("Product Update Error:", error);
      window.utils.showErrorMessage(`Update failed: ${error.message}`);
      return; // Don't refresh on error
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
    // Load product attributes first
    loadProductAttributes().then(() => {
      initEditFormHandlers();
      initEditButtons();
      console.log("Product edit functionality initialized");
    });
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
    loadProductAttributes,
  };
})();

// Expose the module globally
window.productEdit = productEdit;

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