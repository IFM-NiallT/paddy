"""
PADDY (Product Attribute Designer Deployment for You)
A Flask application for managing product categories and attributes.
"""

import logging
from logging.handlers import RotatingFileHandler
from typing import Dict, Optional
from flask import Flask, render_template, jsonify
import requests
import json
import os
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
handler = RotatingFileHandler('paddy.log', maxBytes=10000, backupCount=3)
handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))
logger.addHandler(handler)

class APIError(Exception):
    """Custom exception for API-related errors."""
    pass

class Config:
    """Application configuration."""
    API_BASE_URL = os.getenv('API_BASE_URL', 'http://100.100.0.102:1234')
    BEARER_TOKEN = os.getenv('BEARER_TOKEN', 'bearertoken')
    REQUEST_TIMEOUT = 5
    
    # JSON directory and file paths
    JSON_DIR = 'json'
    CACHE_FILE = os.path.join(JSON_DIR, 'categories.json')
    FIELD_CONFIG_FILE = os.path.join(JSON_DIR, 'product_attributes.json')

class FieldConfig:
    """Handles field configuration and display name mapping."""
    
    def __init__(self):
        self.config = self._load_field_config()

    def _load_field_config(self) -> Dict:
        """Load field configuration from JSON file."""
        try:
            with open(Config.FIELD_CONFIG_FILE, 'r') as f:
                return json.load(f)
        except (IOError, json.JSONDecodeError) as e:
            logger.error(f"Failed to load field configuration: {str(e)}")
            return {}

    def get_category_fields(self, category_name: str) -> List[Dict]:
        """Get active fields and their display names for a category."""
        category_key = category_name.lower().replace(' ', '_')
        
        try:
            if not self.config or category_key not in self.config:
                logger.warning(f"No field configuration found for category: {category_name}")
                return []

            category_config = self.config[category_key]['fields']
            return [
                {'field': field_name, 'display': field_info['display']}
                for field_name, field_info in category_config.items()
                if field_info.get('used', False)
            ]

        except Exception as e:
            logger.error(f"Error getting category fields: {str(e)}")
            return []
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
            response = requests.get(
                f"{self.base_url}/{endpoint}",
                headers=self.headers,
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {str(e)}")
            raise APIError(f"Failed to fetch data: {str(e)}")

    def get_categories(self) -> Dict:
        """Fetch and cache product categories. Calls API if cache file is missing."""
        if not os.path.exists(Config.CACHE_FILE):  # Check if cache exists
            logger.info("Cache file not found. Fetching categories from API.")
            try:
                data = self._make_request("ProductCategories")
                self._cache_categories(data)  # Save new cache
                return data
            except APIError:
                logger.error("API request failed, and no cached data is available.")
                return {"TotalCount": 0, "Data": []}

        # If cache exists, read from it
        return self._get_cached_categories()


    def get_products(self, category_id):
        """Fetch products for a specific category."""
        try:
            all_products = self._make_request("Products")
            
            # Filter products by category ID from the Category object
            filtered_products = {
                "TotalCount": 0,
                "Data": [
                    product for product in all_products.get('Data', []) 
                    if product.get('Category', {}).get('ID') == category_id
                ]
            }
            filtered_products['TotalCount'] = len(filtered_products['Data'])
            
            return filtered_products
        except APIError:
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

def create_app() -> Flask:
    """Application factory function."""
    app = Flask(__name__)
    api_client = APIClient(Config.API_BASE_URL, Config.BEARER_TOKEN)

    @app.route("/")
    def index():
        """Home route displaying product categories."""
        try:
            categories = api_client.get_categories()
            return render_template("index.html.j2", categories=categories)
        except Exception as e:
            logger.error(f"Error in index route: {str(e)}")
            return render_template("error.html.j2", error="Failed to load categories")

    @app.route("/products/<int:category_id>")
    def products(category_id):
        """Products route for specific category."""
        try:
            categories = api_client.get_categories()
            category = next((c for c in categories['Data'] 
                        if c['ID'] == category_id), None)
            
            if not category:
                logger.warning(f"Category not found: {category_id}")
                return render_template("error.html.j2", 
                                    error="Category not found"), 404
            
            # Fetch products using the category ID
            products = api_client.get_products(category_id)
            
            # Get field configuration for category
            active_fields = api_client.field_config.get_category_fields(
                category['Description']
            )

            return render_template("products.html.j2",
                                products=products,
                                category=category,
                                active_fields=active_fields)
        except Exception as e:
            logger.error(f"Error in products route: {str(e)}")
            return render_template("error.html.j2", 
                                error="Failed to load products")

    @app.errorhandler(404)
    def not_found_error(error):
        return render_template("error.html.j2", error="Page not found"), 404

    @app.errorhandler(500)
    def internal_error(error):
        return render_template("error.html.j2", 
                             error="Internal server error"), 500

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)

app = create_app()  # For WSGI server