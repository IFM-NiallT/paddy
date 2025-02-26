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

import time
import requests
import json
import os
from typing import Dict, Optional, Any, List

# Use get_logger instead of directly importing logger
from .logger import get_logger
from .config import Config
from .exceptions import APIError
from .field_config import FieldConfig

# Get logger instance
logger = get_logger()


class RequestLogContext:
    """Context manager for logging API request lifecycle consistently"""

    def __init__(self, endpoint, method="GET"):
        self.endpoint = endpoint
        self.method = method
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        logger.info(f"Starting {self.method} request to {self.endpoint}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed = time.time() - self.start_time
        
        if exc_type is not None:
            # Exception occurred
            logger.error(
                f"{self.method} request to {self.endpoint} failed after {elapsed:.2f}s: {exc_val}",
                exc_info=True
            )
        else:
            log_method = logger.warning if elapsed > 5 else logger.info
            log_method(f"Completed {self.method} request to {self.endpoint} in {elapsed:.2f}s")


class APIClient:
    """Client for handling API interactions with the product service."""
    
    # Class Variables
    MAX_ITEMS_PER_PAGE: int = 30
    
    def __init__(self, base_url: str, token: str, timeout: int = 20):
        """
        Initialize APIClient with configuration and authentication.
        
        Args:
            base_url (str): Base URL for the API
            token (str): Authentication bearer token
            timeout (int, optional): Request timeout in seconds. Defaults to 20.
        """
        logger.info(f"Initializing API Client with base URL: {base_url}, timeout: {timeout}s")
        
        self.base_url: str = base_url
        self.headers: Dict[str, str] = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }
        self.timeout: int = timeout
        self.field_config: FieldConfig = FieldConfig()

    def _make_request(
        self, 
        endpoint: str, 
        method: str = 'GET', 
        params: Optional[Dict[str, Any]] = None, 
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute an API request with error handling and logging.
        
        Args:
            endpoint (str): API endpoint to request
            method (str, optional): HTTP method. Defaults to 'GET'.
            params (dict, optional): Query parameters. Defaults to None.
            data (dict, optional): Request payload. Defaults to None.
        
        Returns:
            Dict containing API response data
        
        Raises:
            APIError: For various API request failures
        """
        if not endpoint:
            logger.error("Empty endpoint provided")
            raise ValueError("Endpoint must be provided")

        full_url: str = f"{self.base_url}/{endpoint}"
        
        # Log request params and data at debug level for better traceability
        if params:
            logger.debug(f"Request params: {params}")
        if data:
            logger.debug(f"Request payload: {json.dumps(data, default=str)[:1000]}")

        # Use the request context manager for consistent logging
        with RequestLogContext(endpoint, method) as _:
            try:
                response: requests.Response = requests.request(
                    method=method,
                    url=full_url,
                    headers=self.headers,
                    params=params,
                    json=data,
                    timeout=self.timeout
                )
                
                # Log response status code
                logger.debug(f"Response status code: {response.status_code}")
                
                try:
                    response.raise_for_status()
                except requests.exceptions.HTTPError as http_err:
                    # Log specific status code info
                    if response.status_code == 404:
                        logger.warning(f"Resource not found: {endpoint}")
                    elif response.status_code == 401:
                        logger.error("Authentication failed - verify bearer token")
                    elif response.status_code == 403:
                        logger.error("Access forbidden to this resource")
                    elif response.status_code >= 500:
                        logger.error(f"Server error occurred: {response.status_code}")
                    else:
                        logger.error(f"HTTP error: {response.status_code}")
                        
                    raise APIError(f"HTTP Error: {http_err}")
                
                try:
                    data: Dict[str, Any] = response.json()
                    return data
                except json.JSONDecodeError as json_err:
                    logger.error(f"Invalid JSON response: {json_err}", exc_info=True)
                    raise APIError(f"Invalid JSON response: {json_err}")
            
            except requests.exceptions.ConnectionError as conn_err:
                logger.critical(f"API connection failed: {conn_err}", exc_info=True)
                raise APIError(f"Connection failed: {conn_err}")
            except requests.exceptions.Timeout as timeout_err:
                logger.error(f"Request timed out after {self.timeout}s: {timeout_err}")
                raise APIError(f"Request timed out: {timeout_err}")
            except requests.exceptions.RequestException as req_err:
                logger.critical(f"Request failed: {req_err}", exc_info=True)
                raise APIError(f"Request failed: {req_err}")

    def get_categories(self, fetch: int = 37) -> Dict[str, Any]:
        """
        Fetch and cache product categories.
        
        Args:
            fetch (int, optional): Number of categories to fetch. Defaults to 37.
        
        Returns:
            Dict containing product categories
        """
        cache_start = time.time()
        if os.path.exists(Config.CACHE_FILE):
            try:
                with open(Config.CACHE_FILE, 'r') as f:
                    cached_data: Dict[str, Any] = json.load(f)
                cache_time = time.time() - cache_start
                logger.info(f"Categories loaded from cache in {cache_time:.2f}s")
                return cached_data
            except (IOError, json.JSONDecodeError) as cache_err:
                logger.warning(f"Cache read failed: {cache_err}")
        
        # Continue with API fetch if cache fails
        try:
            api_start = time.time()
            logger.info("Fetching categories from API")
            data: Dict[str, Any] = self._make_request(
                "ProductCategories",
                params={"fetch": fetch}
            )
            api_time = time.time() - api_start
            
            category_count = len(data.get('Data', []))
            logger.info(f"Fetched {category_count} categories in {api_time:.2f}s")
            
            # Cache the results
            try:
                with open(Config.CACHE_FILE, 'w') as f:
                    json.dump(data, f, indent=4)
                logger.info("Categories cached successfully")
            except IOError as cache_write_err:
                logger.error(f"Failed to write categories cache: {cache_write_err}")
            return data
        except APIError:
            logger.critical("Failed to fetch categories")
            return {"TotalCount": 0, "Data": []}

    def get_products(
        self, 
        category_id: int, 
        page: int = 1, 
        items_per_page: int = 30, 
        sort_field: Optional[str] = None, 
        sort_direction: str = 'asc'
    ) -> Dict[str, Any]:
        """
        Fetch products for a specific category with filtering and sorting.
        
        Args:
            category_id (int): Category ID to fetch products for
            page (int, optional): Page number for pagination. Defaults to 1.
            items_per_page (int, optional): Number of items per page. Defaults to 30.
            sort_field (str, optional): Field to sort by. Defaults to None.
            sort_direction (str, optional): Sort direction. Defaults to 'asc'.
        
        Returns:
            Dict containing paginated and filtered products
        """
        if not category_id:
            logger.error("Missing category ID")
            raise ValueError("Category ID must be provided")

        # Calculate pagination offset
        offset: int = (page - 1) * items_per_page
        
        params: Dict[str, Any] = {
            "Category[eq]": category_id,
            "offset": offset,
            "fetch": items_per_page
        }

        valid_sort_fields: List[str] = [
            'Code', 'Description', 'ImageCount', 'D_WebCategory',  
            'D_Classification', 'D_ThreadGender',
            'D_SizeA', 'D_SizeB', 'D_SizeC', 'D_SizeD',
            'D_Orientation', 'D_Configuration', 'D_Grade',
            'D_ManufacturerName', 'D_Application'
        ]

        if sort_field:
            sort_direction = sort_direction.lower()
            if sort_direction not in ['asc', 'dsc']:
                logger.warning(f"Invalid sort direction provided: {sort_direction}")
                sort_direction = 'asc'
            
            if sort_field not in valid_sort_fields:
                logger.warning(f"Invalid sort field provided: {sort_field}")
                sort_field = None

        # Set default sort
        if sort_field:
            params['sort'] = f"{sort_field}[{sort_direction}]"
        else:
            params['sort'] = "Code[asc]"

        logger.info(f"Fetching products for category {category_id}, page {page}")

        try:
            all_products: Dict[str, Any] = self._make_request("Products", params=params)
            
            total_count: int = all_products.get('TotalCount', 0)
            total_pages: int = (total_count + items_per_page - 1) // items_per_page

            filtered_products: Dict[str, Any] = {
                "TotalCount": total_count,
                "CurrentPage": page,
                "ItemsPerPage": items_per_page,
                "TotalPages": total_pages,
                "Data": [
                    product for product in all_products.get('Data', [])
                    if product.get('Category', {}).get('ID') == category_id
                ]
            }

            logger.info(f"Successfully fetched {len(filtered_products['Data'])} products for category {category_id}")
            
            return filtered_products

        except APIError:
            logger.error(f"Failed to fetch products for category {category_id}")
            return {
                "TotalCount": 0,
                "CurrentPage": page,
                "ItemsPerPage": items_per_page,
                "TotalPages": 0,
                "Data": []
            }

    def update_product(self, product_id: int, update_payload: Dict[str, Any]) -> str:
        """
        Update a product with the given ID and payload.
        
        Args:
            product_id (int): ID of the product to update
            update_payload (Dict[str, Any]): Payload containing update details
        
        Returns:
            str: Status message of the update operation
        """
        # Enable detailed debug logging for product updates if needed
        detailed_logging = os.environ.get('DETAILED_UPDATE_LOGGING', 'False').lower() == 'true'
        
        logger.info(f"Processing update for product ID: {product_id}")
        
        try:
            endpoint = f"Products/{product_id}"
            
            # Create a copy of the update payload
            final_payload = update_payload.copy()
            
            # Log the incoming payload for debugging
            if detailed_logging:
                logger.debug(f"Update payload for product {product_id}: {json.dumps(final_payload, default=str)}")
            
            # Handle ECommerceSettings properly
            if 'ECommerceSettings' in final_payload:
                settings = final_payload['ECommerceSettings']
                
                # Handle ECommerceStatus 
                if 'ECommerceStatus' in settings:
                    status_data = settings['ECommerceStatus']
                    
                    if detailed_logging:
                        logger.debug(f"Processing ECommerceStatus: {status_data} (type: {type(status_data).__name__})")
                    
                    # If it's an object with Value, convert to string enum
                    if isinstance(status_data, dict) and 'Value' in status_data:
                        status_value = int(status_data['Value'])
                        # Convert to string enum value expected by the API
                        final_payload['ECommerceSettings']['ECommerceStatus'] = "Enabled" if status_value == 0 else "Disabled"
                        logger.debug(f"Converted ECommerceStatus from object to: {final_payload['ECommerceSettings']['ECommerceStatus']}")
                    elif isinstance(status_data, (int, float)):
                        # Convert numeric to string enum value
                        status_value = int(float(status_data))
                        final_payload['ECommerceSettings']['ECommerceStatus'] = "Enabled" if status_value == 0 else "Disabled"
                        logger.debug(f"Converted numeric {status_data} to: {final_payload['ECommerceSettings']['ECommerceStatus']}")
                    elif isinstance(status_data, str):
                        # If it's already a string, normalize to expected values
                        if status_data.lower() in ['0', 'enabled', 'available', 'true']:
                            final_payload['ECommerceSettings']['ECommerceStatus'] = "Enabled"
                        elif status_data.lower() in ['1', 'disabled', 'not available', 'false']:
                            final_payload['ECommerceSettings']['ECommerceStatus'] = "Disabled"
                        else:
                            # If it doesn't match expected values, use as is (might already be correct)
                            final_payload['ECommerceSettings']['ECommerceStatus'] = status_data
                        
                        if detailed_logging:
                            logger.debug(f"Normalized string '{status_data}' to: {final_payload['ECommerceSettings']['ECommerceStatus']}")

            # Make the update request
            logger.info(f"Sending update request for product {product_id}")
            response = self._make_request(
                endpoint,
                method='PUT',
                data=final_payload
            )
            
            # Process the response
            if isinstance(response, dict):
                api_status = response.get('Status')
                api_message = response.get('Message', '')

                if api_status == 'Processed':
                    # Get updated product to verify changes if in detailed logging mode
                    if detailed_logging:
                        updated_product = self._make_request(endpoint)
                        
                        # Log the updated product for verification
                        if 'ECommerceSettings' in updated_product:
                            logger.debug(f"Updated product {product_id} ECommerceSettings: {updated_product.get('ECommerceSettings', {})}")
                    
                    logger.info(f"Product {product_id} updated successfully")
                    return "Product updated successfully"
                else:
                    logger.warning(f"Product {product_id} update failed: {api_message}")
                    return f"Failed to update product: {api_message}"
            else:
                logger.warning(f"Unexpected API response format for product {product_id}")
                return "Unexpected response format from API"

        except Exception as e:
            logger.error(f"Error updating product {product_id}: {str(e)}", exc_info=True)
            return f"Error updating product: {str(e)}"
        
    def search_products_api(
        self, 
        category: Optional[str] = None, 
        code_query: Optional[str] = None,
        description_query: Optional[str] = None, 
        page: int = 1, 
        items_per_page: int = 30,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Search products directly via the API with filtering capabilities.
        
        Args:
            category (str, optional): Product category to filter by
            code_query (str, optional): Code search query
            description_query (str, optional): Description search query
            page (int): Page number for pagination
            items_per_page (int): Number of items per page
            **kwargs: Additional search parameters to pass to the API
            
        Returns:
            Dict containing search results with pagination information
        """
        try:
            # Create a query ID for tracking this specific search request
            search_id = f"search-{time.time()}"
            logger.info(f"[{search_id}] Starting product search")
            
            # Prepare parameters dictionary, preserving exact keys from the request
            params: Dict[str, Any] = kwargs.copy()
            
            # Ensure sorting
            params['sort'] = params.get('sort', 'Code[asc]')
            
            # Add additional specific search parameters
            if category:
                params['Category[eq]'] = category
                logger.debug(f"[{search_id}] Filtering by category: {category}")
            
            if code_query:
                params['Code[cnt]'] = code_query
                logger.debug(f"[{search_id}] Searching by code: {code_query}")
            
            if description_query:
                params['Description[cnt]'] = description_query
                logger.debug(f"[{search_id}] Searching by description: {description_query}")
            
            # Add pagination
            params['offset'] = (page - 1) * items_per_page
            params['fetch'] = items_per_page
            
            logger.info(f"[{search_id}] Executing search with {len(params)} parameters")
            
            # Execute search
            response: Dict[str, Any] = self._make_request(
                "Products",
                params=params
            )
            
            # Process results
            total_count: int = response.get('TotalCount', 0)
            total_pages: int = (total_count + items_per_page - 1) // items_per_page
            
            logger.info(f"[{search_id}] Search returned {total_count} results ({total_pages} pages)")
            
            return {
                "TotalCount": total_count,
                "CurrentPage": page,
                "ItemsPerPage": items_per_page,
                "TotalPages": total_pages,
                "Data": response.get('Data', [])
            }
            
        except Exception as e:
            logger.error(f"API search error: {str(e)}", exc_info=True)
            return {
                "TotalCount": 0,
                "CurrentPage": page,
                "ItemsPerPage": items_per_page,
                "TotalPages": 0,
                "Data": []
            }