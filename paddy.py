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
from datetime import datetime
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
        logger.info(
            "Initializing PaddyApp",
            extra={
                'api_base_url': api_base_url,
                'config_loaded': bool(Config),
                'timestamp': datetime.now().isoformat()
            }
        )
        
        try:
            self.app = Flask(__name__)
            self.api_client = APIClient(api_base_url, bearer_token)
            self._register_routes()
            self._register_error_handlers()
            
        except Exception as e:
            logger.critical(
                "Failed to initialize PaddyApp",
                extra={
                    'error_type': type(e).__name__,
                    'error_detail': str(e)
                },
                exc_info=True
            )
            raise

    def _register_routes(self):
        """
        Register application routes.
        
        Sets up URL rules for key application functionalities:
        - Home/index page
        - Product listing by category
        - Product editing and updating
        """
        try:
            routes = [
                ("/", "index", self._index_route),
                ("/products/<int:category_id>", "products", self._products_route),
                ("/product/<int:product_id>/edit", "edit_product", self._edit_product_route, ['GET']),
                ("/product/<int:product_id>/update", "update_product", self._update_product_route, ['POST'])
            ]
            
            for route in routes:
                if len(route) == 4:
                    path, name, handler, methods = route
                    self.app.add_url_rule(path, name, handler, methods=methods)
                else:
                    path, name, handler = route
                    self.app.add_url_rule(path, name, handler)
            
            logger.info(
                "Routes registered successfully",
                extra={'registered_routes': [r[0] for r in routes]}
            )
        except Exception as e:
            logger.error(
                "Failed to register routes",
                extra={'error': str(e)},
                exc_info=True
            )
            raise

    def _register_error_handlers(self):
        """
        Register error handlers for standard HTTP error codes.
        
        Sets up handlers for:
        - 404 Not Found errors
        - 500 Internal Server errors
        """
        error_handlers = {
            404: self._not_found_error,
            500: self._internal_error
        }
        
        try:
            for code, handler in error_handlers.items():
                self.app.register_error_handler(code, handler)
            
            logger.info(
                "Error handlers registered successfully",
                extra={'registered_handlers': list(error_handlers.keys())}
            )
        except Exception as e:
            logger.error(
                "Failed to register error handlers",
                extra={'error': str(e)},
                exc_info=True
            )
            raise

    def _index_route(self):
        """
        Handle requests to the home page.
        
        Retrieves and displays product categories.
        
        Returns:
            Rendered index template with available categories
        """
        try:
            logger.info(
                "Processing index route request",
                extra={'client_ip': request.remote_addr}
            )
            
            categories = self.api_client.get_categories()
            
            logger.info(
                "Categories retrieved successfully",
                extra={'categories_count': len(categories.get('Data', []))}
            )
            return render_template("index.html.j2", categories=categories)
        except Exception as e:
            logger.error(
                "Error in index route",
                extra={
                    'error_type': type(e).__name__,
                    'error_detail': str(e)
                },
                exc_info=True
            )
            return render_template("error.html.j2", error="Failed to load categories"), 500

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
            
            logger.info(
                "Processing products route request",
                extra={
                    'category_id': category_id,
                    'page': page,
                    'sort': sort_param,
                    'client_ip': request.remote_addr
                }
            )

            sort_field, sort_direction = self._parse_sort_param(sort_param)
            products = self.api_client.get_products(
                category_id, 
                page=page,
                sort_field=sort_field,
                sort_direction=sort_direction
            )
            
            categories = self.api_client.get_categories()
            category = next((c for c in categories['Data'] if c['ID'] == category_id), None)

            if not category:
                logger.warning(
                    "Category not found",
                    extra={
                        'category_id': category_id,
                        'available_categories': [c['ID'] for c in categories['Data']]
                    }
                )
                return render_template("error.html.j2", error="Category not found"), 404

            active_fields = self.api_client.field_config.get_category_fields(category_id)
            
            logger.info(
                "Products retrieved successfully",
                extra={
                    'total_count': products.get('TotalCount', 0),
                    'category_id': category_id,
                    'page': page,
                    'active_fields_count': len(active_fields)
                }
            )

            return render_template(
                "products.html.j2",
                products=products,
                category=category,
                active_fields=active_fields,
                current_sort=sort_param
            )
        except Exception as e:
            logger.error(
                "Unexpected error in products route",
                extra={
                    'category_id': category_id,
                    'error_type': type(e).__name__,
                    'error_detail': str(e)
                },
                exc_info=True
            )
            return render_template("error.html.j2", error="An unexpected error occurred"), 500

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
                    logger.warning(
                        "Attempted to sort by unsupported field",
                        extra={
                            'field': field,
                            'allowed_fields': allowed_sort_fields
                        }
                    )
                    return None, 'asc'
                
                if direction not in ['asc', 'desc']:
                    logger.warning(
                        "Invalid sort direction provided",
                        extra={
                            'direction': direction,
                            'allowed_directions': ['asc', 'desc']
                        }
                    )
                    direction = 'asc'
                
                return field, direction
            
            logger.warning(
                "Invalid sort parameter format",
                extra={'sort_param': sort_param}
            )
        except Exception as e:
            logger.error(
                "Error parsing sort parameter",
                extra={
                    'sort_param': sort_param,
                    'error': str(e)
                },
                exc_info=True
            )
        
        return None, 'asc'

    def _not_found_error(self, error):
        """
        Handle 404 Not Found errors.
        
        Args:
            error: The error object passed by Flask
        
        Returns:
            Rendered error template with 404 status
        """
        logger.warning(
            "404 error encountered",
            extra={
                'path': request.path,
                'method': request.method,
                'client_ip': request.remote_addr,
                'referrer': request.referrer,
                'error': str(error)
            }
        )
        return render_template("error.html.j2", error="Page not found"), 404

    def _internal_error(self, error):
        """
        Handle 500 Internal Server errors.
        
        Args:
            error: The error object passed by Flask
        
        Returns:
            Rendered error template with 500 status
        """
        logger.error(
            "500 error encountered",
            extra={
                'path': request.path,
                'method': request.method,
                'client_ip': request.remote_addr,
                'error': str(error)
            },
            exc_info=True
        )
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
            logger.info(
                "Processing edit product request",
                extra={
                    'product_id': product_id,
                    'client_ip': request.remote_addr
                }
            )

            # Fetch the product details from the API
            product = self.api_client._make_request(f"Products/{product_id}")
            
            # Identify the current category from the product details
            current_category = product.get('Category', {})
            category_id = current_category.get('ID')
            
            if not category_id:
                logger.error(
                    "Invalid product data - missing category ID",
                    extra={'product_id': product_id}
                )
                return jsonify({'error': 'Invalid product data'}), 400

            # Retrieve the field configuration for the current category
            category_fields = self.api_client.field_config.get_category_fields(category_id)
            
            dynamic_fields = []
            if category_fields:
                # Define the allowed generic fields for editing
                allowed_fields = [
                    "D_Classification", "D_ThreadGender", "D_SizeA", "D_SizeB",
                    "D_SizeC", "D_SizeD", "D_Orientation", "D_Configuration",
                    "D_Grade", "D_ManufacturerName", "D_Application", "D_WebCategory"
                ]
                
                # Iterate over the list of field configurations
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

            logger.info(
                "Product edit form prepared",
                extra={
                    'product_id': product_id,
                    'category_id': category_id,
                    'fields_count': len(dynamic_fields)
                }
            )

            return jsonify({
                'product': product,
                'dynamic_fields': dynamic_fields
            })

        except Exception as e:
            logger.error(
                "Error in edit product route",
                extra={
                    'product_id': product_id,
                    'error_type': type(e).__name__,
                    'error_detail': str(e)
                },
                exc_info=True
            )
            return jsonify({'error': str(e)}), 500

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
            
            logger.info(
                "Processing product update request",
                extra={
                    'product_id': product_id,
                    'client_ip': request.remote_addr,
                    'fields_to_update': list(update_data.keys()) if update_data else []
                }
            )

            if not update_data:
                logger.warning(
                    "Empty update request received",
                    extra={'product_id': product_id}
                )
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

            if not update_payload:
                logger.warning(
                    "No valid fields to update",
                    extra={
                        'product_id': product_id,
                        'provided_fields': list(update_data.keys()),
                        'allowed_fields': allowed_fields
                    }
                )
                return jsonify({'error': 'No valid fields to update'}), 400

            logger.debug(
                "Filtered update payload",
                extra={
                    'product_id': product_id,
                    'field_count': len(update_payload),
                    'fields': list(update_payload.keys())
                }
            )

            # Send the update request to the API
            response = self.api_client._make_request(
                f"Products/{product_id}",
                method='PUT',
                data=update_payload
            )

            # Handle the response based on its structure
            if isinstance(response, dict) and 'Message' in response:
                message = response['Message']
                if message == "Ok":
                    logger.info(
                        "Product updated successfully",
                        extra={
                            'product_id': product_id,
                            'updated_fields': list(update_payload.keys())
                        }
                    )
                    return jsonify({'message': 'Product updated successfully'}), 200
                else:
                    logger.error(
                        "Product update failed",
                        extra={
                            'product_id': product_id,
                            'api_message': message,
                            'attempted_fields': list(update_payload.keys())
                        }
                    )
                    return jsonify({'error': f"Failed to update product: {message}"}), 500
            else:
                logger.error(
                    "Unexpected API response format",
                    extra={
                        'product_id': product_id,
                        'response_type': type(response).__name__,
                        'has_message': 'Message' in response if isinstance(response, dict) else False
                    }
                )
                return jsonify({'error': 'Unexpected response format from API'}), 500

        except Exception as e:
            logger.error(
                "Error in update product route",
                extra={
                    'product_id': product_id,
                    'error_type': type(e).__name__,
                    'error_detail': str(e)
                },
                exc_info=True
            )
            return jsonify({'error': str(e)}), 500

def create_app():
    """
    Create and configure the Flask application instance.
    
    Ensures configuration directories are set up and initializes
    the PADDY application with necessary configurations.
    
    Returns:
        Flask application instance
    """
    try:
        logger.info(
            "Beginning Flask application creation",
            extra={
                'api_url': Config.API_BASE_URL,
                'json_dir': Config.JSON_DIR,
                'request_timeout': Config.REQUEST_TIMEOUT
            }
        )

        # Ensure all required directories exist
        Config.ensure_directories()
        
        # Create the PADDY application instance
        paddy_app = PaddyApp(Config.API_BASE_URL, Config.BEARER_TOKEN)
        
        logger.info(
            "Flask application instance created successfully",
            extra={
                'debug_mode': paddy_app.app.debug,
                'static_folder': paddy_app.app.static_folder,
                'template_folder': paddy_app.app.template_folder
            }
        )
        
        return paddy_app.app
        
    except Exception as e:
        logger.critical(
            "Fatal error during application creation",
            extra={
                'error_type': type(e).__name__,
                'error_detail': str(e)
            },
            exc_info=True
        )
        raise

# Create the Flask application instance
app = create_app()

# Run the application if this script is the main entry point
if __name__ == "__main__":
    try:
        import platform
        import flask
        
        logger.info(
            "Starting Flask application",
            extra={
                'host': '0.0.0.0',
                'port': 5000,
                'debug': True,
                'python_version': platform.python_version(),
                'flask_version': flask.__version__,
                'platform': platform.platform()
            }
        )
        
        app.run(debug=True, host="0.0.0.0", port=5000)
        
    except Exception as e:
        logger.critical(
            "Application startup failed",
            extra={
                'error_type': type(e).__name__,
                'error_detail': str(e),
                'host': '0.0.0.0',
                'port': 5000
            },
            exc_info=True
        )
        raise