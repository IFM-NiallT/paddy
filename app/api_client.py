"""
API Client Module

This module provides a client for interacting with the product API,
handling requests, caching, and error management.
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
    Client for handling API interactions with caching capabilities.
    
    Manages API requests, handles errors, and implements caching for
    frequently accessed data like product categories.
    """
    
    def __init__(self, base_url, token, timeout=5):
        """
        Initialize APIClient with configuration.
        
        Args:
            base_url (str): Base URL for API endpoints.
            token (str): Authentication token.
            timeout (int, optional): Request timeout in seconds. Defaults to 5.
        """
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }
        self.timeout = timeout
        self.field_config = FieldConfig()

    def _make_request(self, endpoint, params=None):
        """
        Make an API request with comprehensive error handling and logging.
        
        Args:
            endpoint (str): API endpoint to request.
            params (dict, optional): Query parameters for the request.
        
        Returns:
            dict: JSON response data.
        
        Raises:
            APIError: If the request fails.
        """
        if not endpoint:
            logger.error("Endpoint cannot be empty")
            raise ValueError("Endpoint must be provided")

        full_url = f"{self.base_url}/{endpoint}"
        try:
            logger.info("Initiating API request")
            logger.debug("Endpoint: %s", full_url)
            logger.debug("Request Parameters: %s", params)
            logger.debug("Request Headers: %s", self.headers)

            response = requests.get(
                full_url,
                headers=self.headers,
                params=params,
                timeout=self.timeout
            )
            logger.info("Received response - Status Code: %s", response.status_code)
            
            try:
                response.raise_for_status()
            except requests.exceptions.HTTPError as http_err:
                logger.error("HTTP Error occurred: %s", http_err)
                logger.error("Response content: %s", response.text)
                raise APIError(f"HTTP Error: {http_err}")
            
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
        Validate if the category exists in the loaded categories.
        
        Args:
            category_id (int): Category ID to validate.
        
        Returns:
            bool: True if the category exists, False otherwise.
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
        
        Returns:
            dict: Categories data, either from cache or via API.
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

    def get_products(self, category_id, page=1, items_per_page=30,  sort_field=None, sort_direction='asc'):
        """
        Fetch products for a specific category with logging and sorting.
        
        Args:
            category_id (int): The ID of the product category.
            page (int, optional): The page number to retrieve. Defaults to 1.
            items_per_page (int, optional): Number of items per page. Defaults to 30.
            sort_field (str, optional): Field to sort by.
            sort_direction (str, optional): Sorting direction ('asc' or 'desc').
        
        Returns:
            dict: A dictionary containing product data and pagination details.
        """
        if not category_id:
            logger.error("Category ID is required")
            raise ValueError("Category ID must be provided")

        offset = (page - 1) * items_per_page
        params = {
            "Category[eq]": category_id,
            "offset": offset,
            "fetch": items_per_page
        }

        valid_sort_fields = [
            'Code', 'Description', 'UpdatedOn', 'CreatedOn',
            'D_WebCategory', 'D_Classification', 'D_ThreadGender', 
            'D_SizeA', 'D_SizeB', 'D_SizeC', 'D_SizeD', 
            'D_Orientation', 'D_Configuration', 'D_Grade', 
            'D_ManufacturerName', 'D_Application'
        ]
        
        if sort_field:
            sort_direction = sort_direction.lower()
            if sort_direction not in ['asc', 'dsc']:
                sort_direction = 'asc'
            logger.debug(f"Applying sort - Field: {sort_field}, Direction: {sort_direction}")
            params['sort'] = f"{sort_field}[{sort_direction}]"
        else:
            params['sort'] = "Code[asc]"

        logger.info("Fetching products for Category ID: %s", category_id)
        logger.debug("Request Parameters: %s", params)

        try:
            all_products = self._make_request("Products", params=params)
            total_count = all_products.get('TotalCount', 0)
            total_pages = (total_count + items_per_page - 1) // items_per_page

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

            logger.info(
                "Product Fetch Results - Total Count: %s, Current Page: %s, Total Pages: %s, Page Data Count: %s",
                filtered_products["TotalCount"], page, total_pages, len(filtered_products["Data"])
            )
            return filtered_products

        except APIError:
            logger.error("Failed to fetch products for Category ID: %s", category_id)
            return {
                "TotalCount": 0,
                "CurrentPage": page,
                "ItemsPerPage": items_per_page,
                "TotalPages": 0,
                "Data": []
            }