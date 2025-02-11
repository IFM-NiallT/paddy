"""
API Client Module for PADDY Application

This module provides a robust API client for interacting with the product management API.
It handles various API interactions including:
- Authentication
- Requesting product categories
- Fetching products
- Updating product information

Key Features:
- Comprehensive error handling
- Logging of API interactions
- Caching mechanism for categories
- Flexible request handling

The APIClient is designed to abstract away the complexities of API communication,
providing a clean interface for the PADDY application to interact with backend services.

***
Author: Luke Doyle - 2025 Intern
"""

import requests
import json
import os
from .logger import logger
from .config import Config
from .exceptions import APIError
from .field_config import FieldConfig


class APIClient:
    """
    Client for handling API interactions with advanced features.
    
    Manages API requests with:
    - Robust error handling
    - Configurable timeout
    - Authentication
    - Caching mechanism
    - Comprehensive logging
    
    Attributes:
        base_url (str): Base URL for API endpoints
        headers (dict): Standard headers for API requests
        timeout (int): Timeout duration for API requests
        field_config (FieldConfig): Configuration for product fields
    """
    
    def __init__(self, base_url, token, timeout=20):
        """
        Initialize APIClient with configuration and authentication.
        
        Args:
            base_url (str): Base URL for API endpoints.
            token (str): Bearer authentication token.
            timeout (int, optional): Request timeout in seconds. 
                Defaults to 20 seconds for robust network handling.
        
        Notes:
            - Sets up authentication headers
            - Initializes field configuration
            - Configures request timeout
        """
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }
        self.timeout = timeout
        self.field_config = FieldConfig()

    def _make_request(self, endpoint, method='GET', params=None, data=None):
        """
        Execute an API request with comprehensive error handling and logging.
        
        Performs a complete request lifecycle:
        - Validates input parameters
        - Constructs full URL
        - Sends request with configured headers
        - Handles various potential errors
        - Logs request and response details
        
        Args:
            endpoint (str): Specific API endpoint to request
            method (str, optional): HTTP method. Defaults to 'GET'
            params (dict, optional): Query parameters for the request
            data (dict, optional): Payload data for PUT/POST requests
        
        Returns:
            dict: Parsed JSON response data
        
        Raises:
            ValueError: If no endpoint is provided
            APIError: For various request-related errors (connection, timeout, etc.)
        
        Detailed Logging:
        - Logs request parameters and method
        - Captures response status and content
        - Provides debug information about the response
        """
        if not endpoint:
            logger.error("Endpoint cannot be empty")
            raise ValueError("Endpoint must be provided")

        full_url = f"{self.base_url}/{endpoint}"
        try:
            # Log request details for traceability
            logger.info(f"Initiating {method} request to {endpoint}")
            logger.debug("Request Parameters: %s", params)
            logger.debug("Request Data: %s", data)

            # Execute the request with comprehensive configuration
            response = requests.request(
                method=method,
                url=full_url,
                headers=self.headers,
                params=params,
                json=data,  # Automatic JSON serialization
                timeout=self.timeout  # Configured timeout
            )
            logger.info("Received response - Status Code: %s", response.status_code)
            
            # Raise an exception for HTTP errors
            try:
                response.raise_for_status()
            except requests.exceptions.HTTPError as http_err:
                logger.error("HTTP Error occurred: %s", http_err)
                logger.error("Response content: %s", response.text)
                raise APIError(f"HTTP Error: {http_err}")
            
            # Parse and validate JSON response
            try:
                data = response.json()
                logger.debug("Response Data Type: %s", type(data))
                if isinstance(data, dict):
                    logger.debug("Response Keys: %s", list(data.keys()))
                    logger.debug("Total Count: %s", data.get('TotalCount', 'N/A'))
                return data
            except json.JSONDecodeError as json_err:
                logger.error("JSON Decode Error: %s", json_err)
                logger.error("Response content: %s", response.text)
                raise APIError(f"Invalid JSON response: {json_err}")
        
        # Comprehensive error handling for different request scenarios
        except requests.exceptions.ConnectionError as conn_err:
            logger.error("Connection Error: %s", conn_err)
            raise APIError(f"Connection failed: {conn_err}")
        except requests.exceptions.Timeout as timeout_err:
            logger.error("Request Timeout: %s", timeout_err)
            raise APIError(f"Request timed out: {timeout_err}")
        except requests.exceptions.RequestException as req_err:
            logger.error("Request Exception: %s", req_err)
            raise APIError(f"Request failed: {req_err}")

    def _validate_category_exists(self, category_id):
        """
        Validate if a specific category exists in the loaded categories.
        
        Checks the category's existence by:
        - Retrieving all categories
        - Checking if the given ID is present
        
        Args:
            category_id (int): Unique identifier of the category to validate
        
        Returns:
            bool: True if category exists, False otherwise
        
        Notes:
            - Logs an error if category is not found
            - Provides context about available categories
        """
        try:
            categories = self.get_categories()
            existing_categories = [c['ID'] for c in categories.get('Data', [])]
            exists = category_id in existing_categories
            if not exists:
                logger.error(
                    "Category %s not found in available categories. Available categories: %s",
                    category_id, existing_categories
                )
            return exists
        except Exception as e:
            logger.error("Error validating category: %s", e)
            return False

    def get_categories(self):
        """
        Fetch and cache product categories with enhanced logging.
        
        Workflow:
        1. Attempt to load categories from cache
        2. If cache fails, fetch from API
        3. Write fetched categories to cache
        
        Returns:
            dict: Categories data, either from cache or via API
        
        Notes:
            - Implements a simple caching mechanism
            - Provides fallback if API or cache fails
        """
        # Attempt to load from cache first
        if os.path.exists(Config.CACHE_FILE):
            try:
                with open(Config.CACHE_FILE, 'r') as f:
                    cached_data = json.load(f)
                logger.info("Successfully loaded categories from cache")
                return cached_data
            except (IOError, json.JSONDecodeError) as cache_err:
                logger.warning("Cache read failed: %s. Fetching from API.", cache_err)

        # Fetch from API if cache is unavailable or read fails
        try:
            logger.info("Fetching categories from API")
            data = self._make_request("ProductCategories")
            try:
                with open(Config.CACHE_FILE, 'w') as f:
                    json.dump(data, f, indent=4)
                logger.info("Categories successfully cached")
            except IOError as cache_write_err:
                logger.error("Failed to write categories cache: %s", cache_write_err)
            return data
        except APIError:
            logger.error("Failed to fetch categories from API")
            return {"TotalCount": 0, "Data": []}

    def get_products(self, category_id, page=1, items_per_page=30, sort_field=None, sort_direction='asc'):
        """
        Fetch products for a specific category with advanced filtering and sorting.
        
        Comprehensive method for retrieving products with:
        - Pagination support
        - Dynamic sorting
        - Category-specific filtering
        - Robust error handling
        
        Args:
            category_id (int): The ID of the product category.
            page (int, optional): The page number to retrieve. Defaults to 1.
            items_per_page (int, optional): Number of items per page. Defaults to 30.
            sort_field (str, optional): Field to sort by.
            sort_direction (str, optional): Sorting direction ('asc' or 'desc').
        
        Returns:
            dict: A dictionary containing:
                - TotalCount: Total number of products
                - CurrentPage: Current page number
                - ItemsPerPage: Number of items per page
                - TotalPages: Total number of pages
                - Data: List of products for the current page
        
        Raises:
            ValueError: If category_id is not provided or invalid
        
        Notes:
            - Supports sorting by multiple product attributes
            - Implements server-side pagination
            - Provides comprehensive logging of fetch operation
        """
        if not category_id:
            logger.error("Category ID is required")
            raise ValueError("Category ID must be provided")

        # Calculate pagination offset
        offset = (page - 1) * items_per_page
        
        # Prepare request parameters
        params = {
            "Category[eq]": category_id,
            "offset": offset,
            "fetch": items_per_page
        }

        # Define valid sorting fields 
        valid_sort_fields = [
            'Code', 'Description', 'UpdatedOn', 'CreatedOn',
            'D_WebCategory', 'D_Classification', 'D_ThreadGender', 
            'D_SizeA', 'D_SizeB', 'D_SizeC', 'D_SizeD', 
            'D_Orientation', 'D_Configuration', 'D_Grade', 
            'D_ManufacturerName', 'D_Application'
        ]
        
        # Handle sorting logic
        if sort_field:
            # Validate and normalize sort direction
            sort_direction = sort_direction.lower()
            if sort_direction not in ['asc', 'desc']:
                logger.warning(f"Invalid sort direction '{sort_direction}'. Defaulting to 'asc'.")
                sort_direction = 'asc'
            
            # Validate sort field
            if sort_field not in valid_sort_fields:
                logger.warning(f"Invalid sort field '{sort_field}'. Using default sorting.")
                sort_field = None

        # Apply default sorting if no specific sort is provided
        if sort_field:
            logger.debug(f"Applying sort - Field: {sort_field}, Direction: {sort_direction}")
            params['sort'] = f"{sort_field}[{sort_direction}]"
        else:
            # Default to sorting by Code in ascending order
            params['sort'] = "Code[asc]"

        # Log request details for traceability
        logger.info("Fetching products for Category ID: %s", category_id)
        logger.debug("Request Parameters: %s", params)

        try:
            # Execute the API request
            all_products = self._make_request("Products", params=params)
            
            # Calculate pagination details
            total_count = all_products.get('TotalCount', 0)
            total_pages = (total_count + items_per_page - 1) // items_per_page

            # Filter products to ensure they match the requested category
            filtered_products = {
                "TotalCount": total_count,
                "CurrentPage": page,
                "ItemsPerPage": items_per_page,
                "TotalPages": total_pages,
                "Data": [
                    product for product in all_products.get('Data', [])
                    if product.get('Category', {}).get('ID') == category_id
                ]
            }

            # Log detailed fetch results
            logger.info(
                "Product Fetch Results - Total Count: %s, Current Page: %s, Total Pages: %s, Page Data Count: %s",
                filtered_products["TotalCount"], page, total_pages, len(filtered_products["Data"])
            )
            
            return filtered_products

        except APIError:
            # Comprehensive error handling
            logger.error("Failed to fetch products for Category ID: %s", category_id)
            return {
                "TotalCount": 0,
                "CurrentPage": page,
                "ItemsPerPage": items_per_page,
                "TotalPages": 0,
                "Data": []
            }

    def update_product(self, product_id, update_payload):
        """
        Update a product with the given ID and payload.

        Attempts to update a product through the API with comprehensive error handling.

        Args:
            product_id (int): The ID of the product to update.
            update_payload (dict): The updated product data.

        Returns:
            str: A message describing the result of the update operation
        
        Notes:
            - Logs the update attempt and result
            - Handles various potential error scenarios
        """
        try:
            # Construct the API endpoint for the specific product
            endpoint = f"Products/{product_id}"

            # Log the update request details
            logger.info(f"Updating product {product_id} with data: {update_payload}")

            # Send the PUT request to update the product
            response = self._make_request(endpoint, method='PUT', data=update_payload)

            # Process the API response
            if 'Message' in response:
                message = response['Message']
                if message == "Ok":
                    logger.info(f"Product {product_id} updated successfully")
                    return "Product updated successfully"
                else:
                    logger.warning(f"Product update failed: {message}")
                    return f"Failed to update product: {message}"
            else:
                logger.warning(f"No message returned from API for product {product_id}")
                return "No message returned from the API"

        except Exception as e:
            # Comprehensive error logging
            logger.error(f"Error updating product {product_id}: {str(e)}")
            return f"Error updating product: {str(e)}"