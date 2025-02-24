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

import platform
from flask import Flask, render_template, request, jsonify
import re
from datetime import datetime
from typing import Dict, List, Tuple, Union, Any, Optional
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
    
    def __init__(self, api_base_url: str, bearer_token: str):
        """
        Initialize the Flask application with API client and register routes.
        
        Args:
            api_base_url (str): The base URL for the API endpoint.
            bearer_token (str): Authentication token for API access.
        """
        logger.info(
            "Initializing PaddyApp",
            extra={
                'api_base_url': api_base_url,
                'config_loaded': bool(Config)
            }
        )
        
        try:
            self.app: Flask = Flask(__name__)
            self.api_client: APIClient = APIClient(api_base_url, bearer_token)
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

    def _register_routes(self) -> None:
        """
        Register application routes.
        
        Sets up URL rules for key application functionalities:
        - Home/index page
        - Product listing by category
        - Product editing and updating
        - API search functionality
        """
        try:
            routes: List[Union[Tuple[str, str, Any], Tuple[str, str, Any, List[str]]]] = [
                ("/", "index", self._index_route),
                ("/products/<int:category_id>", "products", self._products_route),
                ("/product/<int:product_id>/edit", "edit_product", self._edit_product_route, ['GET']),
                ("/product/<int:product_id>/update", "update_product", self._update_product_route, ['POST']),
                ("/api/search", "api_search", self._api_search_route, ['GET']),
                ("/api/search/all", "all_products_search", self._all_products_search_route, ['GET'])
                # Removed bulk-update route
            ]
            
            # Process routes
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

    def _register_error_handlers(self) -> None:
        """
        Register error handlers for standard HTTP error codes.
        """
        error_handlers: Dict[int, Any] = {
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

    def _index_route(self) -> Union[str, Tuple[str, int]]:
        """
        Handle requests to the home page.
        
        Retrieves and displays product categories.
        """
        try:
            logger.info("Processing index route request")
            
            categories: Dict[str, Any] = self.api_client.get_categories()
            
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

    def _products_route(self, category_id: int) -> Union[str, Any]:
        """
        Handle requests to the products page for a specific category.
        
        Args:
            category_id (int): The unique identifier for the product category.
        """
        try:
            page: int = request.args.get('page', 1, type=int)
            sort_param: Optional[str] = request.args.get('sort')
        
            # Check if this is an AJAX request
            is_ajax: bool = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        
            sort_field: Optional[str] = None
            sort_direction: str = 'asc'
            sort_field, sort_direction = self._parse_sort_param(sort_param)
        
            products: Dict[str, Any] = self.api_client.get_products(
                category_id,
                page=page,
                sort_field=sort_field,
                sort_direction=sort_direction
            )
        
            # If it's an AJAX request, return JSON
            if is_ajax:
                return jsonify(products)
        
            # Otherwise return the full template
            categories: Dict[str, Any] = self.api_client.get_categories()
            category: Optional[Dict[str, Any]] = next((c for c in categories['Data'] if c['ID'] == category_id), None)
        
            if not category:
                return render_template("error.html.j2", error="Category not found"), 404
            
            active_fields: List[Dict[str, Any]] = self.api_client.field_config.get_category_fields(category_id)
        
            return render_template(
                "products.html.j2",
                products=products,
                category=category,
                active_fields=active_fields,
                current_sort=sort_param
            )
        except Exception as e:
            logger.error(
                "Error in products route",
                extra={
                    'error': str(e),
                    'category_id': category_id,
                    'sort_param': sort_param if 'sort_param' in locals() else None
                },
                exc_info=True
            )
            if is_ajax:
                return jsonify({'error': str(e)}), 500
            return render_template("error.html.j2", error="An unexpected error occurred"), 500

    def _parse_sort_param(self, sort_param: Optional[str]) -> Tuple[Optional[str], str]:
        """
        Parse the sorting parameter to extract field and direction.
        
        Args:
            sort_param (str): The sorting parameter string.
        
        Returns:
            tuple: A tuple containing sort field and direction
        """
        # Define explicitly allowed sort fields
        allowed_sort_fields: List[str] = [
            'Code', 'Description', 'ImageCount', 'D_WebCategory', 
            'D_Classification', 'D_ThreadGender', 'D_SizeA', 
            'D_SizeB', 'D_SizeC', 'D_SizeD', 'D_Orientation', 
            'D_Configuration', 'D_Grade', 'D_ManufacturerName', 
            'D_Application'
        ]

        if not sort_param:
            return None, 'asc'

        try:
            # Regex to match the format: Field[direction]
            match = re.match(r'(\w+)\[(asc|dsc)\]', sort_param)
            
            if match:
                field: str = match.group(1)
                direction: str = match.group(2)
                
                # Validate field and direction
                if field not in allowed_sort_fields:
                    logger.warning(
                        "Attempted to sort by unsupported field",
                        extra={'field': field}
                    )
                    return None, 'asc'
                
                if direction not in ['asc', 'dsc']:
                    logger.warning("Invalid sort direction provided")
                    direction = 'asc'
                
                return field, direction
        except Exception as e:
            logger.error(
                "Error parsing sort parameter",
                extra={'sort_param': sort_param, 'error': str(e)},
                exc_info=True
            )
        
        return None, 'asc'

    def _not_found_error(self, error: Any) -> Tuple[str, int]:
        """
        Handle 404 Not Found errors.
        """
        logger.warning(
            "404 error encountered",
            extra={'path': request.path, 'method': request.method}
        )
        return render_template("error.html.j2", error="Page not found"), 404

    def _internal_error(self, error: Any) -> Tuple[str, int]:
        """
        Handle 500 Internal Server errors.
        """
        logger.error(
            "500 error encountered",
            extra={'path': request.path, 'method': request.method},
            exc_info=True
        )
        return render_template("error.html.j2", error="Internal server error"), 500

    def _edit_product_route(self, product_id: int) -> Union[Any, Tuple[Any, int]]:
        """
        Handle GET request to edit a specific product.
        
        Args:
            product_id (int): The ID of the product to edit.
        """
        try:
            logger.info(
                "Processing edit product request",
                extra={'product_id': product_id}
            )

            # Fetch the product details from the API
            product: Dict[str, Any] = self.api_client._make_request(f"Products/{product_id}")
            
            # Identify the current category from the product details
            current_category: Dict[str, Any] = product.get('Category', {})
            category_id: Optional[int] = current_category.get('ID')
            
            if not category_id:
                logger.error(
                    "Invalid product data - missing category ID",
                    extra={'product_id': product_id}
                )
                return jsonify({'error': 'Invalid product data'}), 400

            # Retrieve the field configuration for the current category
            category_fields: List[Dict[str, Any]] = self.api_client.field_config.get_category_fields(category_id)
            
            dynamic_fields: List[Dict[str, Any]] = []

            # Enhanced web status handling
            ecommerce_settings = product.get('ECommerceSettings', {})

            # Normalize ECommerceStatus value
            status_value: Optional[int] = None
            
            # Check for status in ECommerceSettings with enhanced normalization
            if ecommerce_settings:
                raw_status = ecommerce_settings.get('ECommerceStatus')
                if raw_status is not None:
                    # Convert to int if possible
                    try:
                        if isinstance(raw_status, str):
                            status_value = 0 if raw_status.lower() in ['enabled', 'available', '0'] else 1
                        elif isinstance(raw_status, bool):
                            status_value = 0 if raw_status else 1
                        else:
                            status_value = int(raw_status)
                            status_value = 0 if status_value == 0 else 1
                    except (ValueError, TypeError):
                        status_value = 1  # Default to Not Available
            
            # Fallback to other locations if not found in ECommerceSettings
            if status_value is None:
                legacy_status = (
                    product.get('web_status') or 
                    product.get('WebStatus') or
                    ecommerce_settings.get('Value') or 
                    ecommerce_settings.get('WebStatus')
                )
                if legacy_status is not None:
                    try:
                        if isinstance(legacy_status, str):
                            status_value = 0 if legacy_status.lower() in ['0', 'true', 'enabled', 'available'] else 1
                        elif isinstance(legacy_status, bool):
                            status_value = 0 if legacy_status else 1
                        else:
                            status_value = int(legacy_status)
                            status_value = 0 if status_value == 0 else 1
                    except (ValueError, TypeError):
                        status_value = 1
            
            # Default if no status found
            if status_value is None:
                status_value = 1  # Default to Not Available

            web_status_field = {
                'name': 'web_status',
                'label': 'Web Status',
                'type': 'select',
                'value': 'Available' if status_value == 0 else 'Not Available',
                'options': [
                    {'value': 'Available', 'label': 'Available'},
                    {'value': 'Not Available', 'label': 'Not Available'}
                ],
                'apiPath': 'ECommerceSettings.ECommerceStatus'
            }
            dynamic_fields.append(web_status_field)
            
            # Extended Description Field
            extended_description_field = {
                'name': 'extended_description',
                'label': 'Extended Description',
                'type': 'textarea',
                'value': ecommerce_settings.get('ExtendedDescription', ''),
                'apiPath': 'ECommerceSettings.ExtendedDescription'
            }
            dynamic_fields.append(extended_description_field)
            
            if category_fields:
                # Define the allowed generic fields for editing
                allowed_fields: List[str] = [
                    "D_Classification", "D_ThreadGender", "D_SizeA", "D_SizeB",
                    "D_SizeC", "D_SizeD", "D_Orientation", "D_Configuration",
                    "D_Grade", "D_ManufacturerName", "D_Application", "D_WebCategory"
                ]
                
                # Iterate over the list of field configurations
                for field_config in category_fields:
                    generic_field: Optional[str] = field_config.get('field')
                    if not generic_field or generic_field not in allowed_fields:
                        continue
                    
                    field_info: Dict[str, Any] = {
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

    def _update_product_route(self, product_id: int) -> Union[Any, Tuple[Any, int]]:
        """
        Handle POST request to update a specific product.
        
        Args:
            product_id (int): The ID of the product to update.
        """
        try:
            update_data = request.get_json() or {}
            
            logger.info(
                "Processing product update request",
                extra={'product_id': product_id}
            )

            if not update_data:
                logger.warning("Empty update request received")
                return jsonify({'error': 'No update data provided'}), 400

            # Prepare update payload
            update_payload = {}
            
            # Get current product data for proper nested field handling
            current_product = self.api_client._make_request(f"Products/{product_id}")
            ecommerce_settings_update = current_product.get('ECommerceSettings', {}).copy()
            
            # Handle web status field explicitly
            ecommerce_status_key = 'ECommerceSettings.ECommerceStatus'
            if ecommerce_status_key in update_data:
                web_status_value = update_data[ecommerce_status_key]
                status_value = self._normalize_ecommerce_status(web_status_value)
                
                # Update the ECommerceSettings while preserving other fields
                ecommerce_settings_update['ECommerceStatus'] = status_value
                update_payload['ECommerceSettings'] = ecommerce_settings_update
            
            # Handle previous web status field for backward compatibility
            elif 'web_status' in update_data:
                web_status = update_data['web_status']
                status_value = self._normalize_ecommerce_status(web_status)
                
                ecommerce_settings_update['ECommerceStatus'] = status_value
                update_payload['ECommerceSettings'] = ecommerce_settings_update
            
            # Handle extended description field
            if 'extended_description' in update_data:
                if 'ECommerceSettings' not in update_payload:
                    update_payload['ECommerceSettings'] = ecommerce_settings_update
                update_payload['ECommerceSettings']['ExtendedDescription'] = update_data['extended_description']

            # Handle dynamic fields
            allowed_fields = [
                "D_Classification", "D_ThreadGender", "D_SizeA", "D_SizeB",
                "D_SizeC", "D_SizeD", "D_Orientation", "D_Configuration",
                "D_Grade", "D_ManufacturerName", "D_Application", "D_WebCategory"
            ]

            # Add dynamic fields to payload
            for key, value in update_data.items():
                if key in allowed_fields:
                    update_payload[key] = value

            # Use the API client to update the product
            response = self.api_client.update_product(product_id, update_payload)
            
            if response == "Product updated successfully":
                # Fetch the updated product to verify changes
                updated_product = self.api_client._make_request(f"Products/{product_id}")
                current_status = self._normalize_ecommerce_status(
                    updated_product.get('ECommerceSettings', {}).get('ECommerceStatus')
                )
                
                # Verify the status was updated correctly
                expected_status = status_value if 'status_value' in locals() else None
                if expected_status is not None and expected_status != current_status:
                    logger.warning(
                        "Status update verification failed",
                        extra={
                            'expected_status': expected_status,
                            'current_status': current_status,
                            'product_id': product_id
                        }
                    )
                    return jsonify({
                        'error': 'Status update verification failed',
                        'current_status': current_status,
                        'is_available': current_status == 0
                    }), 500
                
                logger.info("Product updated successfully")
                
                return jsonify({
                    'message': response,
                    'current_status': current_status,
                    'is_available': current_status == 0
                }), 200
            else:
                logger.error(
                    "Product update failed",
                    extra={'product_id': product_id, 'api_response': response}
                )
                return jsonify({'error': f"Failed to update product: {response}"}), 500

        except Exception as e:
            logger.error(
                "Error in update product route",
                extra={'product_id': product_id, 'error_type': type(e).__name__},
                exc_info=True
            )
            return jsonify({'error': f"Error updating product: {str(e)}"}), 500

    def _normalize_ecommerce_status(self, status) -> int:
        """
        Normalize various status inputs to integer value (0 or 1).
        
        Args:
            status: Input status in various formats
        
        Returns:
            int: Normalized status (0 for Available, 1 for Not Available)
        """
        # Handle None input
        if status is None:
            return 1

        # Handle string inputs (case-insensitive)
        if isinstance(status, str):
            status = status.strip().lower()
            
            # Comprehensive mapping of status values
            status_mapping = {
                # Available statuses
                'available': 0,
                'enabled': 0,
                'true': 0,
                '0': 0,
                'active': 0,
                
                # Not Available statuses
                'not available': 1,
                'disabled': 1,
                'false': 1,
                '1': 1,
                'inactive': 1
            }
            
            if status in status_mapping:
                return status_mapping[status]

        # Handle boolean inputs
        if isinstance(status, bool):
            return 0 if status else 1

        # Handle numeric inputs
        try:
            int_status = int(float(status))  # Handle both string and float inputs
            return 0 if int_status == 0 else 1
        except (ValueError, TypeError):
            pass

        # Default to Not Available if invalid
        return 1

    def _api_search_route(self) -> Union[Any, Tuple[Any, int]]:
        """
        Handle API search requests.
        """
        try:
            category: Optional[str] = request.args.get('category')
            code_query: Optional[str] = request.args.get('code')
            page: int = request.args.get('page', 1, type=int)
            items_per_page: int = min(
                request.args.get('per_page', 30, type=int),
                self.api_client.MAX_ITEMS_PER_PAGE
            )
            
            logger.info("Processing API search request")
            
            if not category and not code_query:
                logger.warning("Search request with no parameters")
                return jsonify({
                    'error': 'At least one search parameter (category or code) is required'
                }), 400
            
            results: Dict[str, Any] = self.api_client.search_products_api(
                category=category,
                code_query=code_query,
                page=page,
                items_per_page=items_per_page
            )
            
            logger.info("Search request completed")
            
            return jsonify(results)
            
        except Exception as e:
            logger.error(
                "Error in API search route",
                extra={'error_type': type(e).__name__},
                exc_info=True
            )
            return jsonify({'error': str(e)}), 500
        
    def _all_products_search_route(self) -> Union[Any, Tuple[Any, int]]:
        """Handle search requests for all products."""
        try:
            code_query: str = request.args.get('code', '')
            description_query: str = request.args.get('description', '')
            page: int = request.args.get('page', 1, type=int)
            
            logger.info("Processing all products search request")
            
            # Use the search_products_api method with both code and description
            results: Dict[str, Any] = self.api_client.search_products_api(
                code_query=code_query,
                description_query=description_query,
                page=page
            )
            
            return jsonify(results)
                
        except Exception as e:
            logger.error(
                "Error in all products search route",
                extra={'error_type': type(e).__name__},
                exc_info=True
            )
            return jsonify({'error': str(e)}), 500


def create_app() -> Flask:
    """
    Create and configure the Flask application instance.
    
    Returns:
        Flask application instance
    """
    try:
        logger.info("Beginning Flask application creation")

        # Ensure all required directories exist
        Config.ensure_directories()
        
        # Create the PADDY application instance
        paddy_app: PaddyApp = PaddyApp(Config.API_BASE_URL, Config.BEARER_TOKEN)
        
        logger.info("Flask application instance created successfully")
        
        return paddy_app.app
        
    except Exception as e:
        logger.critical(
            "Fatal error during application creation",
            extra={'error_type': type(e).__name__, 'error_detail': str(e)},
            exc_info=True
        )
        raise


# Create the Flask application instance
app: Flask = create_app()

# Run the application if this script is the main entry point
if __name__ == "__main__":
    try:
        logger.info(
            "Starting Flask application",
            extra={'host': '0.0.0.0', 'port': 5000, 'debug': True}
        )
        
        app.run(debug=True, host="0.0.0.0", port=5000)
        
    except Exception as e:
        logger.critical(
            "Application startup failed",
            extra={'error_type': type(e).__name__, 'error_detail': str(e)},
            exc_info=True
        )
        raise