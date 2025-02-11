"""
PADDY (Product Attribute Designer Deployment for You)
A Flask application for managing product categories and attributes.

Paddy Application Module

This Flask web application provides a comprehensive interface for:
- Browsing product categories
- Viewing and filtering products
- Editing product attributes dynamically
- Handling complex API interactions with robust error management

Key Features:
- Dynamic field configuration based on product categories
- Sortable and paginated product listings
- Secure API communication with token-based authentication
- Comprehensive logging and error handling

The application abstracts away the complexity of API interactions, 
providing a clean, user-friendly interface for product management.

***
Author: Luke Doyle - 2025 Intern
"""

from flask import Flask, render_template, request, jsonify
import re
from app.config import Config
from app.api_client import APIClient
from app.logger import logger

class PaddyApp:
    """
    Main Flask application class for the PADDY web application.
    
    Handles:
    - Route registration
    - Error handling
    - Interactions with the API client
    - Routing logic for product management
    """
    def __init__(self, api_base_url, bearer_token):
        """
        Initialize the Flask application with API client and register routes.
        
        This method sets up the core application components:
        - Creates Flask application instance
        - Initializes API client
        - Registers application routes
        - Sets up error handlers
        
        Args:
            api_base_url (str): The base URL for the API endpoint.
            bearer_token (str): Authentication token for API access.
        """
        self.app = Flask(__name__)
        self.api_client = APIClient(api_base_url, bearer_token)
        self._register_routes()
        self._register_error_handlers()
        logger.info("PaddyApp initialized with API base URL: %s", api_base_url)

    def _register_routes(self):
        """
        Register application routes.
        
        Sets up URL rules for key application functionalities:
        - Home/index page
        - Product listing by category
        - Product editing and updating
        """
        self.app.add_url_rule("/", "index", self._index_route)
        self.app.add_url_rule("/products/<int:category_id>", "products", self._products_route)
        self.app.add_url_rule("/product/<int:product_id>/edit", "edit_product", self._edit_product_route, methods=['GET'])
        self.app.add_url_rule("/product/<int:product_id>/update", "update_product", self._update_product_route, methods=['POST'])
        logger.info("Routes registered successfully.")

    def _register_error_handlers(self):
        """
        Register error handlers for standard HTTP error codes.
        
        Sets up handlers for:
        - 404 Not Found errors
        - 500 Internal Server errors
        """
        self.app.register_error_handler(404, self._not_found_error)
        self.app.register_error_handler(500, self._internal_error)
        logger.info("Error handlers registered successfully.")

    def _index_route(self):
        """
        Handle requests to the home page.
        
        Retrieves and displays product categories.
        
        Returns:
            Rendered index template with available categories
        """
        try:
            categories = self.api_client.get_categories()
            logger.info("Categories retrieved successfully.")
            return render_template("index.html.j2", categories=categories)
        except Exception as e:
            logger.error("Error in index route: %s", str(e))
            return render_template("error.html.j2", error="Failed to load categories")

    def _products_route(self, category_id):
        """
        Handle requests to the products page for a specific category.
        
        Supports:
        - Pagination
        - Sorting
        - Dynamic field configuration
        
        Args:
            category_id (int): The unique identifier for the product category.
        
        Returns:
            Rendered products template with filtered and sorted products
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
            logger.info("Products retrieved. Total: %s", products.get('TotalCount', 0),)

            return render_template("products.html.j2", products=products, category=category, active_fields=active_fields, current_sort=sort_param)
        except Exception as e:
            logger.error("Unexpected error in products route: %s", str(e))
            return render_template("error.html.j2", error="An unexpected error occurred while loading products"), 500

    def _parse_sort_param(self, sort_param):
        """
        Parse the sorting parameter to extract field and direction.
        
        The sort parameter is expected in the format: (Field)[direction]
        Examples:
        - (Name)[asc]   : Sort by Name in ascending order
        - (Price)[desc] : Sort by Price in descending order
        
        Args:
            sort_param (str): The sorting parameter string.
        
        Returns:
            tuple: A tuple containing:
                - sort_field (str or None): The field to sort by
                - sort_direction (str): Sort direction, defaults to 'asc'
        
        Notes:
            - If no valid sort parameter is provided, returns (None, 'asc')
            - Uses regex to parse the complex sort parameter format
        """
        # Define explicitly allowed sort fields
        allowed_sort_fields = [
            'Code', 'Description', 'ImageCount', 'D_WebCategory', 
            'D_Classification', 'D_ThreadGender', 'D_SizeA', 
            'D_SizeB', 'D_SizeC', 'D_SizeD', 'D_Orientation', 
            'D_Configuration', 'D_Grade', 'D_ManufacturerName', 
            'D_Application'
        ]

        if not sort_param:
            return None, 'asc'

        try:
            # Regex to match the specific sort parameter format: (Field)[direction]
            match = re.match(r'\((\w+)\)\[([^]]+)\]', sort_param)
            if match:
                field, direction = match.group(1), match.group(2)
                
                # Validate field and direction
                if field not in allowed_sort_fields:
                    logger.warning(f"Attempted to sort by unsupported field: {field}")
                    return None, 'asc'
                
                if direction not in ['asc', 'desc']:
                    logger.warning(f"Invalid sort direction: {direction}. Defaulting to 'asc'")
                    direction = 'asc'
                
                logger.debug(f"Parsed sort - Field: {field}, Direction: {direction}")
                return field, direction
            
            logger.warning(f"Invalid sort parameter format: {sort_param}")
        except Exception as e:
            logger.error(f"Unexpected error parsing sort parameter: {e}")
        
        return None, 'asc'

    def _not_found_error(self, error):
        """
        Handle 404 Not Found errors.
        
        Args:
            error: The error object passed by Flask
        
        Returns:
            Rendered error template with 404 status
        """
        logger.warning("404 error encountered: %s", error)
        return render_template("error.html.j2", error="Page not found"), 404

    def _internal_error(self, error):
        """
        Handle 500 Internal Server errors.
        
        Args:
            error: The error object passed by Flask
        
        Returns:
            Rendered error template with 500 status
        """
        logger.error("500 error encountered: %s", error)
        return render_template("error.html.j2", error="Internal server error"), 500
    
    def _edit_product_route(self, product_id):
        """
        Handle GET request to edit a specific product.
        
        Retrieves product details and prepares dynamic editing fields
        based on the product's category configuration.
        
        Args:
            product_id (int): The ID of the product to edit.
        
        Returns:
            JSON response with product details and editable fields
        """
        try:
            # Fetch the product details from the API
            product = self.api_client._make_request(f"Products/{product_id}")
            
            # Identify the current category from the product details
            current_category = product.get('Category', {})
            category_id = current_category.get('ID')
            
            # Retrieve the field configuration for the current category.
            category_fields = self.api_client.field_config.get_category_fields(category_id)
            
            dynamic_fields = []
            if category_fields:
                # Define the allowed generic fields for editing.
                allowed_fields = [
                    "D_Classification", "D_ThreadGender", "D_SizeA", "D_SizeB",
                    "D_SizeC", "D_SizeD", "D_Orientation", "D_Configuration",
                    "D_Grade", "D_ManufacturerName", "D_Application", "D_WebCategory"
                ]
                
                # Iterate over the list of field configurations.
                for field_config in category_fields:
                    generic_field = field_config.get('field')
                    if generic_field not in allowed_fields:
                        continue
                    
                    field_info = {
                        'name': generic_field,
                        'label': field_config.get('display', generic_field),
                        'type': field_config.get('type', 'text').lower(),
                        'value': product.get(generic_field),
                        'options': field_config.get('options', [])
                    }
                    dynamic_fields.append(field_info)
            
            logger.info(f"Preparing to edit product {product_id}")
            
            # Return JSON response containing the product data and the dynamic fields.
            return jsonify({
                'product': product,
                'dynamic_fields': dynamic_fields
            })
        
        except Exception as e:
            logger.error(f"Error in edit product route for product {product_id}: {str(e)}")
            return jsonify({
                'error': str(e)
            }), 500

    def _update_product_route(self, product_id):
        """
        Handle POST request to update a specific product.
        
        Processes update requests, validates input, and communicates
        with the API to apply changes.
        
        Args:
            product_id (int): The ID of the product to update.
        
        Returns:
            JSON response indicating update success or failure
        """
        try:
            # Get the updated data from the request
            update_data = request.get_json()
            logger.info(f"Received update request for product {product_id}")

            if not update_data:
                return jsonify({'error': 'No update data provided'}), 400

            # Explicitly filter for allowed fields
            allowed_fields = [
                "D_Classification", "D_ThreadGender", "D_SizeA", "D_SizeB",
                "D_SizeC", "D_SizeD", "D_Orientation", "D_Configuration",
                "D_Grade", "D_ManufacturerName", "D_Application", "D_WebCategory"
            ]

            # Remove empty fields and filter for only allowed fields
            update_payload = {
                key: value for key, value in update_data.items() 
                if value not in [None, ""] and key in allowed_fields
            }

            logger.debug(f"Filtered update payload: {update_payload}")

            # Send the update request to the API
            response = self.api_client._make_request(f"Products/{product_id}", method='PUT', data=update_payload)

            # Handle the response based on its structure
            if isinstance(response, dict) and 'Message' in response:
                message = response['Message']
                if message == "Ok":
                    return jsonify({'message': 'Product updated successfully'}), 200
                else:
                    logger.error(f"Error updating product: {message}")
                    return jsonify({'error': f"Failed to update product: {message}"}), 500
            elif hasattr(response, 'status_code'):  # Check for raw response with status code
                if response.status_code == 200:
                    return jsonify({'message': 'Product updated successfully'}), 200
                else:
                    logger.error(f"Error updating product: {response.text}")
                    return jsonify({'error': 'Failed to update product'}), response.status_code
            else:
                logger.error(f"Unexpected response format: {response}")
                return jsonify({'error': 'Unexpected error with the response'}), 500

        except Exception as e:
            error_msg = f"Unexpected error updating product {product_id}: {str(e)}"
            logger.error(error_msg)
            return jsonify({'error': error_msg}), 500

def create_app():
    """
    Create and configure the Flask application instance.
    
    Ensures configuration directories are set up and initializes
    the PADDY application with necessary configurations.
    
    Returns:
        Flask application instance
    """
    Config.ensure_directories()
    paddy_app = PaddyApp(Config.API_BASE_URL, Config.BEARER_TOKEN)
    logger.info("Flask application instance created.")
    return paddy_app.app

# Create the Flask application instance
app = create_app()

# Run the application if this script is the main entry point
if __name__ == "__main__":
    logger.info("Starting Flask application on 0.0.0.0:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)