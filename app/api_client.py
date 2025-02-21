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
    """Client for handling API interactions with advanced features."""
    
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
        Execute an API request with comprehensive error handling and logging.
        
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
            logger.error(
                "Empty endpoint provided",
                extra={'method': method},
                exc_info=True
            )
            raise ValueError("Endpoint must be provided")

        full_url: str = f"{self.base_url}/{endpoint}"
        
        try:
            logger.info(
                "Making API request",
                extra={
                    'method': method,
                    'endpoint': endpoint,
                    'params': params,
                    'has_data': bool(data)
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

            # Log response timing
            if response_time > 5:  # Warning threshold
                logger.warning(
                    "Slow API response detected",
                    extra={
                        'response_time': response_time,
                        'endpoint': endpoint,
                        'method': method
                    }
                )
            
            logger.info(
                "API response received",
                extra={
                    'status_code': response.status_code,
                    'response_time': response_time,
                    'content_length': len(response.content)
                }
            )
            
            try:
                response.raise_for_status()
            except requests.exceptions.HTTPError as http_err:
                logger.error(
                    "HTTP error occurred",
                    extra={
                        'status_code': response.status_code,
                        'error_detail': str(http_err),
                        'response_content': response.text[:500],  # First 500 chars
                        'endpoint': endpoint,
                        'method': method
                    },
                    exc_info=True
                )
                raise APIError(f"HTTP Error: {http_err}")
            
            try:
                data: Dict[str, Any] = response.json()
                return data
            except json.JSONDecodeError as json_err:
                logger.error(
                    "JSON decode error",
                    extra={
                        'error_detail': str(json_err),
                        'response_content': response.text[:500],
                        'content_type': response.headers.get('Content-Type')
                    },
                    exc_info=True
                )
                raise APIError(f"Invalid JSON response: {json_err}")
        
        except requests.exceptions.ConnectionError as conn_err:
            logger.critical(
                "API connection error",
                extra={
                    'error_detail': str(conn_err),
                    'url': full_url,
                    'method': method
                },
                exc_info=True
            )
            raise APIError(f"Connection failed: {conn_err}")
        except requests.exceptions.Timeout as timeout_err:
            logger.error(
                "API request timeout",
                extra={
                    'timeout_setting': self.timeout,
                    'endpoint': endpoint,
                    'method': method
                },
                exc_info=True
            )
            raise APIError(f"Request timed out: {timeout_err}")
        except requests.exceptions.RequestException as req_err:
            logger.critical(
                "Unhandled API request error",
                extra={
                    'error_type': type(req_err).__name__,
                    'error_detail': str(req_err),
                    'endpoint': endpoint,
                    'method': method
                },
                exc_info=True
            )
            raise APIError(f"Request failed: {req_err}")

    def _validate_category_exists(self, category_id: int) -> bool:
        """
        Validate if a specific category exists in the loaded categories.
        
        Args:
            category_id (int): Category ID to validate
        
        Returns:
            bool: True if category exists, False otherwise
        """
        try:
            categories: Dict[str, Any] = self.get_categories()
            existing_categories: List[int] = [c['ID'] for c in categories.get('Data', [])]
            exists: bool = category_id in existing_categories
            
            if not exists:
                logger.warning(
                    "Invalid category requested",
                    extra={
                        'requested_category': category_id,
                        'available_categories': existing_categories,
                        'total_categories': len(existing_categories)
                    }
                )
            return exists
        except Exception as e:
            logger.error(
                "Category validation error",
                extra={
                    'category_id': category_id,
                    'error_type': type(e).__name__,
                    'error_detail': str(e)
                },
                exc_info=True
            )
            return False

    def get_categories(self, fetch: int = 37) -> Dict[str, Any]:
        """
        Fetch and cache product categories with enhanced logging.
        
        Args:
            fetch (int, optional): Number of categories to fetch. Defaults to 37.
        
        Returns:
            Dict containing product categories
        """
        if os.path.exists(Config.CACHE_FILE):
            try:
                with open(Config.CACHE_FILE, 'r') as f:
                    cached_data: Dict[str, Any] = json.load(f)
                logger.info(
                    "Categories loaded from cache",
                    extra={
                        'cache_file': Config.CACHE_FILE,
                        'categories_count': len(cached_data.get('Data', [])),
                        'cache_age': os.path.getmtime(Config.CACHE_FILE)
                    }
                )
                return cached_data
            except (IOError, json.JSONDecodeError) as cache_err:
                logger.warning(
                    "Cache read failed",
                    extra={
                        'error_type': type(cache_err).__name__,
                        'error_detail': str(cache_err),
                        'cache_file': Config.CACHE_FILE
                    },
                    exc_info=True
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
                logger.info(
                    "Categories cached successfully",
                    extra={
                        'cache_file': Config.CACHE_FILE,
                        'categories_count': len(data.get('Data', []))
                    }
                )
            except IOError as cache_write_err:
                logger.error(
                    "Failed to write categories cache",
                    extra={
                        'error_detail': str(cache_write_err),
                        'cache_file': Config.CACHE_FILE
                    },
                    exc_info=True
                )
            return data
        except APIError:
            logger.critical(
                "Failed to fetch categories",
                extra={'fallback': "Returning empty category list"},
                exc_info=True
            )
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
        Fetch products for a specific category with advanced filtering and sorting.
        
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
            logger.error(
                "Missing category ID",
                extra={'method': 'get_products'},
                exc_info=True
            )
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
                logger.warning(
                    "Invalid sort direction provided",
                    extra={
                        'provided_direction': sort_direction,
                        'default_direction': 'asc'
                    }
                )
                sort_direction = 'asc'
            
            if sort_field not in valid_sort_fields:
                logger.warning(
                    "Invalid sort field provided",
                    extra={
                        'provided_field': sort_field,
                        'valid_fields': valid_sort_fields
                    }
                )
                sort_field = None

        if sort_field:
            params['sort'] = f"{sort_field}[{sort_direction}]"
        else:
            params['sort'] = "Code[asc]"

        logger.info(
            "Fetching products",
            extra={
                'category_id': category_id,
                'page': page,
                'items_per_page': items_per_page,
                'sort_params': params.get('sort')
            }
        )

        try:
            all_products: Dict[str, Any] = self._make_request("Products", params=params)
            
            # Enhanced debug logging for products
            logger.debug(
                "Products API Response Details",
                extra={
                    'category_id': category_id,
                    'total_count': all_products.get('TotalCount', 0),
                    'products_count': len(all_products.get('Data', [])),
                    'products_sample': [
                        {
                            'ID': product.get('ID'),
                            'Code': product.get('Code'),
                            'keys': list(product.keys())
                        } for product in all_products.get('Data', [])[:5]  # First 5 products
                    ],
                    'full_response_keys': list(all_products.keys())
                }
            )
            
            # Optional: Log full first product in detail
            if all_products.get('Data'):
                logger.debug(
                    "First Product Full JSON",
                    extra={
                        'first_product': json.dumps(all_products['Data'][0], indent=2)
                    }
                )
            
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

            logger.info(
                "Products fetched successfully",
                extra={
                    'total_count': filtered_products["TotalCount"],
                    'page': page,
                    'total_pages': total_pages,
                    'returned_count': len(filtered_products["Data"])
                }
            )
            
            return filtered_products

        except APIError:
            logger.error(
                "Failed to fetch products",
                extra={
                    'category_id': category_id,
                    'page': page
                },
                exc_info=True
            )
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
            
            # Transform ECommerceStatus to the expected format
            if 'ECommerceSettings' in final_payload:
                settings = final_payload['ECommerceSettings']
                if 'ECommerceStatus' in settings:
                    status_value = int(settings['ECommerceStatus'])
                    final_payload['ECommerceSettings']['ECommerceStatus'] = {
                        'Value': status_value,
                        'Name': 'Disabled' if status_value == 1 else 'Enabled',
                        'isAvailable': status_value == 0
                    }

            logger.info(
                "Updating product",
                extra={
                    'product_id': product_id,
                    'payload_size': len(json.dumps(final_payload)),
                    'fields_to_update': list(final_payload.keys()),
                    'ecommerce_settings': final_payload.get('ECommerceSettings', {})
                }
            )

            # Make the update request
            response = self._make_request(
                endpoint,
                method='PUT',
                data=final_payload
            )

            if isinstance(response, dict):
                api_status = response.get('Status')
                api_message = response.get('Message', '')

                logger.debug(
                    "API Update Response",
                    extra={
                        'api_status': api_status,
                        'api_message': api_message,
                        'full_response': response
                    }
                )

                if api_status == 'Processed':
                    # Get updated product to verify changes
                    updated_product = self._make_request(endpoint)
                    ecommerce_settings = updated_product.get('ECommerceSettings', {})
                    
                    logger.info(
                        "Product update processed",
                        extra={
                            'product_id': product_id,
                            'updated_settings': ecommerce_settings,
                            'input_payload': final_payload
                        }
                    )
                    return "Product updated successfully"
                else:
                    logger.warning(
                        "Product update failed",
                        extra={
                            'product_id': product_id,
                            'api_status': api_status,
                            'api_message': api_message,
                            'attempted_payload': final_payload
                        }
                    )
                    return f"Failed to update product: {api_message}"
            else:
                logger.warning(
                    "Unexpected API response format",
                    extra={
                        'product_id': product_id,
                        'response_type': type(response).__name__,
                        'response_content': str(response)[:200]
                    }
                )
                return "Unexpected response format from API"

        except Exception as e:
            logger.error(
                "Product update error",
                extra={
                    'product_id': product_id,
                    'error_type': type(e).__name__,
                    'error_detail': str(e),
                    'attempted_payload': final_payload if 'final_payload' in locals() else None
                },
                exc_info=True
            )
            return f"Error updating product: {str(e)}"
        
    def search_products_api(
        self, 
        category: Optional[str] = None, 
        code_query: Optional[str] = None,
        description_query: Optional[str] = None, 
        page: int = 1, 
        items_per_page: int = 30
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
            items_per_page = min(items_per_page, self.MAX_ITEMS_PER_PAGE)
            params: Dict[str, Any] = {}
            
            # Add category filter if provided
            if category:
                params['Category[eq]'] = category
                
            # Add code search if provided
            if code_query:
                params['Code[cnt]'] = code_query
                
            # Add description search if provided
            if description_query:
                params['Description[cnt]'] = description_query
                
            # Add pagination parameters
            params['offset'] = (page - 1) * items_per_page
            params['fetch'] = items_per_page
            
            # Add default sorting
            params['sort'] = 'Code[asc]'
            
            logger.info(
                "Executing API product search",
                extra={
                    'category': category,
                    'code_query': code_query,
                    'description_query': description_query,
                    'page': page,
                    'items_per_page': items_per_page,
                    'params': params
                }
            )
            
            response: Dict[str, Any] = self._make_request(
                "Products",
                params=params
            )
            
            # Enhanced debug logging for search results
            logger.debug(
                "Search API Response Details",
                extra={
                    'category': category,
                    'code_query': code_query,
                    'description_query': description_query,
                    'total_count': response.get('TotalCount', 0),
                    'products_count': len(response.get('Data', [])),
                    'products_sample': [
                        {
                            'ID': product.get('ID'),
                            'Code': product.get('Code'),
                            'keys': list(product.keys())
                        } for product in response.get('Data', [])[:5]  # First 5 products
                    ],
                    'full_response_keys': list(response.keys())
                }
            )
            
            # Optional: Log full first product in detail
            if response.get('Data'):
                logger.debug(
                    "First Search Result Full JSON",
                    extra={
                        'first_product': json.dumps(response['Data'][0], indent=2)
                    }
                )
            
            # Process and format the response
            total_count: int = response.get('TotalCount', 0)
            total_pages: int = (total_count + items_per_page - 1) // items_per_page
            
            formatted_response: Dict[str, Any] = {
                "TotalCount": total_count,
                "CurrentPage": page,
                "ItemsPerPage": items_per_page,
                "TotalPages": total_pages,
                "Data": response.get('Data', [])
            }
            
            return formatted_response
            
        except Exception as e:
            logger.error(
                "API search error",
                extra={
                    'error_type': type(e).__name__,
                    'error_detail': str(e),
                    'category': category,
                    'code_query': code_query,
                    'description_query': description_query
                },
                exc_info=True
            )
            return {
                "TotalCount": 0,
                "CurrentPage": page,
                "ItemsPerPage": items_per_page,
                "TotalPages": 0,
                "Data": []
            }