"""
PADDY (Product Attribute Designer Deployment for You)
A Flask application for managing product categories and attributes.

Paddy Application Module

This module implements a Flask web application for managing and displaying
product categories and their associated products. It provides a clean interface
for viewing product data with proper error handling and logging.

The application uses an API client for data retrieval and implements
proper error handling and logging throughout.
"""

from flask import Flask, render_template, request
import re
from app.config import Config
from app.api_client import APIClient
from app.logger import logger

class PaddyApp:
    """
    Main Flask application class for the PADDY web application.
    Handles route registration, error handling, and interactions with the API client.
    """
    def __init__(self, api_base_url, bearer_token):
        """
        Initialize the Flask application with API client and register routes.
        
        Args:
            api_base_url (str): The base URL for the API.
            bearer_token (str): The authentication token for API access.
        """
        self.app = Flask(__name__)
        self.api_client = APIClient(api_base_url, bearer_token)
        self._register_routes()
        self._register_error_handlers()
        logger.info("PaddyApp initialized with API base URL: %s", api_base_url)

    def _register_routes(self):
        """Register application routes."""
        self.app.add_url_rule("/", "index", self._index_route)
        self.app.add_url_rule("/products/<int:category_id>", "products", self._products_route)
        logger.info("Routes registered successfully.")

    def _register_error_handlers(self):
        """Register error handlers for 404 and 500 errors."""
        self.app.register_error_handler(404, self._not_found_error)
        self.app.register_error_handler(500, self._internal_error)
        logger.info("Error handlers registered successfully.")

    def _index_route(self):
        """Handle requests to the home page by retrieving product categories."""
        try:
            categories = self.api_client.get_categories()
            logger.info("Categories retrieved successfully.")
            return render_template("index.html.j2", categories=categories)
        except Exception as e:
            logger.error("Error in index route: %s", str(e))
            return render_template("error.html.j2", error="Failed to load categories")

    def _products_route(self, category_id):
        """
        Handle requests to the products page.
        
        Args:
            category_id (int): The ID of the product category.
        """
        try:
            page = request.args.get('page', 1, type=int)
            sort_param = request.args.get('sort')
            logger.info("Products route called. Category ID: %s, Page: %s, Sort: %s", category_id, page, sort_param)

            sort_field, sort_direction = self._parse_sort_param(sort_param)
            products = self.api_client.get_products(category_id, page=page, sort_field=sort_field, sort_direction=sort_direction)
            categories = self.api_client.get_categories()
            category = next((c for c in categories['Data'] if c['ID'] == category_id), None)

            if not category:
                logger.warning("Category not found: %s", category_id)
                return render_template("error.html.j2", error="Category not found"), 404

            active_fields = self.api_client.field_config.get_category_fields(category_id)
            logger.info("Products retrieved. Total: %s, Active Fields: %s", products.get('TotalCount', 0), active_fields)

            return render_template("products.html.j2", products=products, category=category, active_fields=active_fields, current_sort=sort_param)
        except Exception as e:
            logger.error("Unexpected error in products route: %s", str(e))
            return render_template("error.html.j2", error="An unexpected error occurred while loading products"), 500

    def _parse_sort_param(self, sort_param):
        """
        Parse the sorting parameter to extract field and direction.
        
        Args:
            sort_param (str): The sorting parameter string.
        
        Returns:
            tuple: (sort_field, sort_direction) or (None, 'asc') if invalid.
        """
        if not sort_param:
            return None, 'asc'
        try:
            # Extract field and direction from format (Field)[direction]
            match = re.match(r'\((\w+)\)\[([^]]+)\]', sort_param)
            if match:
                field, direction = match.group(1), match.group(2)
                logger.debug(f"Parsed sort - Field: {field}, Direction: {direction}")
                return field, direction
        except Exception as e:
            logger.warning("Failed to parse sort parameter: %s", e)
        return None, 'asc'

    def _not_found_error(self, error):
        """Handle 404 errors."""
        logger.warning("404 error encountered: %s", error)
        return render_template("error.html.j2", error="Page not found"), 404

    def _internal_error(self, error):
        """Handle 500 errors."""
        logger.error("500 error encountered: %s", error)
        return render_template("error.html.j2", error="Internal server error"), 500

def create_app():
    """Create and configure the Flask application instance."""
    Config.ensure_directories()
    paddy_app = PaddyApp(Config.API_BASE_URL, Config.BEARER_TOKEN)
    logger.info("Flask application instance created.")
    return paddy_app.app

app = create_app()

if __name__ == "__main__":
    logger.info("Starting Flask application on 0.0.0.0:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
