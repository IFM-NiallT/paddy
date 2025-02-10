"""
API Client Module

This module provides a client for interacting with the product API,
handling requests, caching, and error management.
"""

from typing import Dict, Optional
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
    
    This class manages API requests, handles errors, and implements
    caching for frequently accessed data like categories.
    
    Attributes:
        base_url (str): Base URL for API endpoints
        headers (Dict): HTTP headers for API requests
        timeout (int): Request timeout in seconds
        field_config (FieldConfig): Field configuration manager
    """
    
    def __init__(self, base_url: str, token: str, timeout: int = 5):
        """
        Initialize APIClient with configuration.
        
        Args:
            base_url (str): Base URL for API endpoints
            token (str): Authentication token
            timeout (int, optional): Request timeout in seconds. Defaults to 5.
        """
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }
        self.timeout = timeout
        self.field_config = FieldConfig()

    def _make_request(
        self, 
        endpoint: str, 
        params: Optional[Dict] = None
    ) -> Dict:
        """
        Make API request with error handling.
        
        Args:
            endpoint (str): API endpoint to request
            params (Optional[Dict]): Query parameters
            
        Returns:
            Dict: JSON response data
            
        Raises:
            APIError: If request fails
        """
        try:
            logger.info(
                f"Making request to: {self.base_url}/{endpoint} "
                f"with params: {params}"
            )
            
            response = requests.get(
                f"{self.base_url}/{endpoint}",
                headers=self.headers,
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            logger.info(
                f"Response received: {response.status_code} - "
                f"{response.text[:200]}"
            )
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {str(e)}")
            raise APIError(f"Failed to fetch data: {str(e)}")

    def get_categories(self) -> Dict:
        """
        Fetch and cache product categories.
        
        Returns:
            Dict: Categories data, either from cache or API
        """
        if not os.path.exists(Config.CACHE_FILE):
            logger.info("Cache file not found. Fetching categories from API.")
            try:
                data = self._make_request("ProductCategories")
                self._cache_categories(data)
                return data
            except APIError:
                logger.error("API request failed, no cached data available.")
                return {"TotalCount": 0, "Data": []}

        logger.info("Cache found. Returning categories from cache.")
        return self._get_cached_categories()

    def get_products(self, category_id: int, page: int = 1, items_per_page: int = 30) -> Dict:
        """
        Fetch products for a specific category with pagination.
        
        Args:
            category_id (int): Category ID to fetch products for
            page (int, optional): Page number to fetch. Defaults to 1.
            items_per_page (int, optional): Number of items per page. Defaults to 30.
                
        Returns:
            Dict: Filtered products data with pagination information
        """
        try:
            logger.info(
                f"Fetching products for category ID: {category_id}, "
                f"page: {page}, items per page: {items_per_page}"
            )
            
            # Calculate offset for pagination
            offset = (page - 1) * items_per_page
            
            params = {
                "Category[eq]": category_id,
                "sort": "Code[asc]",
                "offset": offset,
                "fetch": items_per_page
            }
            
            all_products = self._make_request("Products", params=params)

            # Filter products and add pagination info
            filtered_products = {
                "TotalCount": all_products.get('TotalCount', 0),
                "CurrentPage": page,
                "ItemsPerPage": items_per_page,
                "Data": [
                    product for product in all_products.get('Data', []) 
                    if product.get('Category', {}).get('ID') == category_id
                ]
            }

            logger.info(
                f"Found {len(filtered_products['Data'])} products for "
                f"category ID: {category_id}, total: {filtered_products['TotalCount']}"
            )
            
            return filtered_products
            
        except APIError:
            logger.error(f"Failed to fetch products for category {category_id}")
            return {
                "TotalCount": 0,
                "CurrentPage": page,
                "ItemsPerPage": items_per_page,
                "Data": []
            }
        
    def _cache_categories(self, data: Dict) -> None:
        """
        Cache categories data to file.
        
        Args:
            data (Dict): Categories data to cache
        """
        try:
            with open(Config.CACHE_FILE, 'w') as f:
                json.dump(data, f, indent=4)
        except IOError as e:
            logger.error(f"Failed to cache categories: {str(e)}")

    def _get_cached_categories(self) -> Dict:
        """
        Retrieve cached categories if available.
        
        Returns:
            Dict: Cached categories data or empty dict if cache read fails
        """
        try:
            with open(Config.CACHE_FILE, 'r') as f:
                return json.load(f)
        except (IOError, json.JSONDecodeError) as e:
            logger.error(f"Failed to read cached categories: {str(e)}")
            return {"TotalCount": 0, "Data": []}