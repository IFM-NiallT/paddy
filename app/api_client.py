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

from .logger import logger
from .config import Config
from .exceptions import APIError
from .field_config import FieldConfig


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
        logger.info(
            "Initializing API Client",
            extra={
                'base_url': base_url,
                'timeout': timeout,
                'token_length': len(token) if token else 0
            }
        )
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
        
        try:
            logger.info(
                "Making API request",
                extra={
                    'method': method,
                    'endpoint': endpoint
                }
            )

            start_time: float = time.time()
            response: requests.Response = requests.request(
                method=method,
                url=full_url,
                headers=self.headers,
                params=params,
                json=data,
                timeout=self.timeout
            )
            response_time: float = time.time() - start_time

            # Log response timing for slow responses
            if response_time > 5:
                logger.warning(
                    "Slow API response detected",
                    extra={'response_time': response_time, 'endpoint': endpoint}
                )
            
            logger.info(
                "API response received",
                extra={'status_code': response.status_code, 'response_time': response_time}
            )
            
            try:
                response.raise_for_status()
            except requests.exceptions.HTTPError as http_err:
                logger.error(
                    "HTTP error occurred",
                    extra={'status_code': response.status_code, 'error_detail': str(http_err)},
                    exc_info=True
                )
                raise APIError(f"HTTP Error: {http_err}")
            
            try:
                data: Dict[str, Any] = response.json()
                return data
            except json.JSONDecodeError as json_err:
                logger.error(
                    "JSON decode error",
                    extra={'error_detail': str(json_err)},
                    exc_info=True
                )
                raise APIError(f"Invalid JSON response: {json_err}")
        
        except requests.exceptions.ConnectionError as conn_err:
            logger.critical(
                "API connection error",
                extra={'error_detail': str(conn_err), 'url': full_url},
                exc_info=True
            )
            raise APIError(f"Connection failed: {conn_err}")
        except requests.exceptions.Timeout as timeout_err:
            logger.error(
                "API request timeout",
                extra={'timeout_setting': self.timeout, 'endpoint': endpoint},
                exc_info=True
            )
            raise APIError(f"Request timed out: {timeout_err}")
        except requests.exceptions.RequestException as req_err:
            logger.critical(
                "Unhandled API request error",
                extra={'error_type': type(req_err).__name__, 'error_detail': str(req_err)},
                exc_info=True
            )
            raise APIError(f"Request failed: {req_err}")

    def get_categories(self, fetch: int = 37) -> Dict[str, Any]:
        """
        Fetch and cache product categories.
        
        Args:
            fetch (int, optional): Number of categories to fetch. Defaults to 37.
        
        Returns:
            Dict containing product categories
        """
        if os.path.exists(Config.CACHE_FILE):
            try:
                with open(Config.CACHE_FILE, 'r') as f:
                    cached_data: Dict[str, Any] = json.load(f)
                logger.info("Categories loaded from cache")
                return cached_data
            except (IOError, json.JSONDecodeError) as cache_err:
                logger.warning(
                    "Cache read failed",
                    extra={'error_detail': str(cache_err)}
                )

        try:
            logger.info("Fetching categories from API")
            data: Dict[str, Any] = self._make_request(
                "ProductCategories",
                params={"fetch": fetch}
            )
            
            try:
                with open(Config.CACHE_FILE, 'w') as f:
                    json.dump(data, f, indent=4)
                logger.info("Categories cached successfully")
            except IOError as cache_write_err:
                logger.error(
                    "Failed to write categories cache",
                    extra={'error_detail': str(cache_write_err)}
                )
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
                logger.warning("Invalid sort direction provided")
                sort_direction = 'asc'
            
            if sort_field not in valid_sort_fields:
                logger.warning("Invalid sort field provided")
                sort_field = None

        # Set default sort
        if sort_field:
            params['sort'] = f"{sort_field}[{sort_direction}]"
        else:
            params['sort'] = "Code[asc]"

        logger.info("Fetching products")

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

            logger.info("Products fetched successfully")
            
            return filtered_products

        except APIError:
            logger.error("Failed to fetch products")
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
        try:
            endpoint = f"Products/{product_id}"
            
            # Create a copy of the update payload
            final_payload = update_payload.copy()
            
            # Log the incoming payload for debugging
            logger.info(
                "Processing product update",
                extra={'product_id': product_id, 'payload': str(final_payload)}
            )
            
            # Handle ECommerceSettings properly
            if 'ECommerceSettings' in final_payload:
                settings = final_payload['ECommerceSettings']
                
                # Handle ECommerceStatus 
                if 'ECommerceStatus' in settings:
                    status_data = settings['ECommerceStatus']
                    
                    # Log detailed info about the status data
                    logger.info(
                        "Processing ECommerceStatus",
                        extra={
                            'status_data': str(status_data),
                            'status_type': type(status_data).__name__
                        }
                    )
                    
                    # If it's an object with Value, convert to string enum
                    if isinstance(status_data, dict) and 'Value' in status_data:
                        status_value = int(status_data['Value'])
                        # Convert to string enum value expected by the API
                        final_payload['ECommerceSettings']['ECommerceStatus'] = "Enabled" if status_value == 0 else "Disabled"
                        logger.info(
                            "Converted ECommerceStatus from object to enum string",
                            extra={'final_status': final_payload['ECommerceSettings']['ECommerceStatus']}
                        )
                    elif isinstance(status_data, (int, float)):
                        # Convert numeric to string enum value
                        status_value = int(float(status_data))
                        final_payload['ECommerceSettings']['ECommerceStatus'] = "Enabled" if status_value == 0 else "Disabled"
                        logger.info(
                            "Converted numeric ECommerceStatus to enum string",
                            extra={'original': status_data, 'final': final_payload['ECommerceSettings']['ECommerceStatus']}
                        )
                    elif isinstance(status_data, str):
                        # If it's already a string, normalize to expected values
                        if status_data.lower() in ['0', 'enabled', 'available', 'true']:
                            final_payload['ECommerceSettings']['ECommerceStatus'] = "Enabled"
                        elif status_data.lower() in ['1', 'disabled', 'not available', 'false']:
                            final_payload['ECommerceSettings']['ECommerceStatus'] = "Disabled"
                        else:
                            # If it doesn't match expected values, use as is (might already be correct)
                            final_payload['ECommerceSettings']['ECommerceStatus'] = status_data
                        
                        logger.info(
                            "Normalized string ECommerceStatus",
                            extra={'original': status_data, 'final': final_payload['ECommerceSettings']['ECommerceStatus']}
                        )

            # Log the final payload being sent to API
            logger.info(
                "Sending product update to API",
                extra={
                    'product_id': product_id, 
                    'final_payload': str(final_payload)
                }
            )

            # Make the update request
            response = self._make_request(
                endpoint,
                method='PUT',
                data=final_payload
            )
            
            # Log the API response
            logger.info(
                "API response received",
                extra={
                    'product_id': product_id,
                    'response_type': type(response).__name__,
                    'response': str(response)
                }
            )

            if isinstance(response, dict):
                api_status = response.get('Status')
                api_message = response.get('Message', '')

                if api_status == 'Processed':
                    # Get updated product to verify changes
                    updated_product = self._make_request(endpoint)
                    
                    # Log the updated product for verification
                    if 'ECommerceSettings' in updated_product:
                        logger.info(
                            "Updated product ECommerceSettings",
                            extra={
                                'product_id': product_id,
                                'ecommerce_settings': str(updated_product.get('ECommerceSettings', {}))
                            }
                        )
                    
                    logger.info(
                        "Product update processed successfully",
                        extra={'product_id': product_id}
                    )
                    return "Product updated successfully"
                else:
                    logger.warning(
                        "Product update failed",
                        extra={'product_id': product_id, 'api_message': api_message}
                    )
                    return f"Failed to update product: {api_message}"
            else:
                logger.warning(
                    "Unexpected API response format",
                    extra={'product_id': product_id, 'response_type': type(response).__name__}
                )
                return "Unexpected response format from API"

        except Exception as e:
            logger.error(
                "Product update error",
                extra={'product_id': product_id, 'error': str(e)},
                exc_info=True
            )
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
        """
        try:
            # Prepare parameters dictionary, preserving exact keys from the request
            params: Dict[str, Any] = kwargs.copy()
            
            # Ensure sorting
            params['sort'] = params.get('sort', 'Code[asc]')
            
            # Add additional specific search parameters
            if category:
                params['Category[eq]'] = category
            
            if code_query:
                params['Code[cnt]'] = code_query
            
            if description_query:
                params['Description[cnt]'] = description_query
            
            # Add pagination
            params['offset'] = (page - 1) * items_per_page
            params['fetch'] = items_per_page
            
            logger.info(
                "Executing API product search", 
                extra={'search_params': params}
            )
            
            response: Dict[str, Any] = self._make_request(
                "Products",
                params=params
            )
            
            # Process and format the response
            total_count: int = response.get('TotalCount', 0)
            total_pages: int = (total_count + items_per_page - 1) // items_per_page
            
            return {
                "TotalCount": total_count,
                "CurrentPage": page,
                "ItemsPerPage": items_per_page,
                "TotalPages": total_pages,
                "Data": response.get('Data', [])
            }
            
        except Exception as e:
            logger.error(
                "API search error", 
                extra={'error': str(e)},
                exc_info=True
            )
            return {
                "TotalCount": 0,
                "CurrentPage": page,
                "ItemsPerPage": items_per_page,
                "TotalPages": 0,
                "Data": []
            }