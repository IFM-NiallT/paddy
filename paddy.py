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

# Configure logging with a dynamic log file path
def setup_logging():
    log_dir = 'logs'  # Define the log directory
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)  # Ensure the log directory exists

    log_file = os.path.join(log_dir, 'paddy.log')  # Full path to log file
    handler = RotatingFileHandler(log_file, maxBytes=10000, backupCount=3)
    handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))

    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)
    return logger

logger = setup_logging()

class APIError(Exception):
    """Custom exception for API-related errors."""
    pass

class Config:
    """Application configuration."""
    API_BASE_URL = os.getenv('API_BASE_URL', 'http://100.100.0.102:1234')
    BEARER_TOKEN = os.getenv('BEARER_TOKEN', 'ODk2MzNkMjUtN2RlYi00ODM2LTlkMT')
    REQUEST_TIMEOUT = 5

    JSON_DIR = 'json'
    CACHE_FILE = os.path.join(JSON_DIR, 'categories.json')
    FIELD_CONFIG_FILE = os.path.join(JSON_DIR, 'product_attributes.json')

class FieldConfig:
    """Handles field configuration and display name mapping."""
    
    def __init__(self):
        self.config = self._load_field_config()

    def _load_field_config(self):
        """Load field configuration from JSON file."""
        try:
            logger.info(f"Attempting to load field configuration from: {Config.FIELD_CONFIG_FILE}")

            if not os.path.exists(Config.FIELD_CONFIG_FILE):
                logger.error(f"Field configuration file NOT FOUND: {Config.FIELD_CONFIG_FILE}")
                return {}

            # Log file details
            file_stats = os.stat(Config.FIELD_CONFIG_FILE)
            logger.info(f"File size: {file_stats.st_size} bytes")
            logger.info(f"Last modified: {datetime.fromtimestamp(file_stats.st_mtime)}")

            with open(Config.FIELD_CONFIG_FILE, 'r') as f:
                config = json.load(f)
                logger.info(f"Number of categories loaded: {len(config)}")
                logger.info(f"Loaded category IDs: {list(config.keys())}")
                return config

        except (IOError, json.JSONDecodeError) as e:
            logger.error(f"Error reading field configuration: {str(e)}")
            return {}
        except Exception as e:
            logger.error(f"Unexpected error loading field configuration: {str(e)}")
            return {}

    def get_category_fields(self, category_id):
        """Get active fields and their display names for a category."""
        category_id_str = str(category_id)
        if not self.config:
            logger.warning("Config is empty")
            return []

        category_config = self.config.get(category_id_str, {}).get('fields', {})
        return [
            {'field': field_name, 'display': field_info['display']}
            for field_name, field_info in category_config.items()
            if field_info.get('used', False)
        ]

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
            logger.info(f"Response received: {response.status_code} - {response.text[:200]}")  # Log first 200 chars
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {str(e)}")
            raise APIError(f"Failed to fetch data: {str(e)}")

    def get_categories(self) -> Dict:
        """Fetch and cache product categories."""
        if not os.path.exists(Config.CACHE_FILE):  # Check if cache exists
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
            params = {"Category[eq]": category_id}  # Adding the filter for the category
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
            products = api_client.get_products(category_id)
            categories = api_client.get_categories()  # Fetch categories once
            category = next((c for c in categories['Data'] if c['ID'] == category_id), None)

            if not category:
                logger.warning(f"Category not found: {category_id}")
                return render_template("error.html.j2", error="Category not found"), 404

            active_fields = api_client.field_config.get_category_fields(category_id)
            return render_template("products.html.j2",
                                products=products,
                                category=category,
                                active_fields=active_fields)
        except Exception as e:
            logger.error(f"Error in products route: {str(e)}")
            return render_template("error.html.j2", error="Failed to load products")

    @app.errorhandler(404)
    def not_found_error(error):
        return render_template("error.html.j2", error="Page not found"), 404

    @app.errorhandler(500)
    def internal_error(error):
        return render_template("error.html.j2", error="Internal server error"), 500

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)


app = create_app()  # For WSGI server