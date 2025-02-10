from typing import Dict, Optional
import requests
import json
import os
from .logger import logger
from .config import Config
from .exceptions import APIError
from .field_config import FieldConfig

class APIClient:
    """Handles API interactions."""

    def __init__(self, base_url: str, token: str, timeout: int = 5):
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }
        self.timeout = timeout
        self.field_config = FieldConfig()

    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Make API request with error handling."""
        try:
            logger.info(f"Making request to: {self.base_url}/{endpoint} with params: {params}")
            response = requests.get(
                f"{self.base_url}/{endpoint}",
                headers=self.headers,
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            logger.info(f"Response received: {response.status_code} - {response.text[:200]}")
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {str(e)}")
            raise APIError(f"Failed to fetch data: {str(e)}")

    def get_categories(self) -> Dict:
        """Fetch and cache product categories."""
        if not os.path.exists(Config.CACHE_FILE):
            logger.info("Cache file not found. Fetching categories from API.")
            try:
                data = self._make_request("ProductCategories")
                self._cache_categories(data)
                return data
            except APIError:
                logger.error("API request failed, and no cached data is available.")
                return {"TotalCount": 0, "Data": []}

        logger.info("Cache found. Returning categories from cache.")
        return self._get_cached_categories()

    def get_products(self, category_id):
        """Fetch products for a specific category."""
        try:
            logger.info(f"Fetching products for category ID: {category_id}")
            params = {
                "Category[eq]": category_id,
                "sort": "Code[asc]"
            }
            all_products = self._make_request("Products", params=params)

            filtered_products = {
                "TotalCount": 0,
                "Data": [
                    product for product in all_products.get('Data', []) 
                    if product.get('Category', {}).get('ID') == category_id
                ]
            }

            logger.info(f"Found {len(filtered_products['Data'])} products for category ID: {category_id}")
            filtered_products['TotalCount'] = len(filtered_products['Data'])
            return filtered_products
        except APIError:
            logger.error(f"Failed to fetch products for category {category_id}")
            return {"TotalCount": 0, "Data": []}

    def _cache_categories(self, data: Dict) -> None:
        """Cache categories data to file."""
        try:
            with open(Config.CACHE_FILE, 'w') as f:
                json.dump(data, f, indent=4)
        except IOError as e:
            logger.error(f"Failed to cache categories: {str(e)}")

    def _get_cached_categories(self) -> Dict:
        """Retrieve cached categories if available."""
        try:
            with open(Config.CACHE_FILE, 'r') as f:
                return json.load(f)
        except (IOError, json.JSONDecodeError) as e:
            logger.error(f"Failed to read cached categories: {str(e)}")
            return {"TotalCount": 0, "Data": []}