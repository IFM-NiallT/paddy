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
import time
from typing import Dict, List, Tuple, Union, Any, Optional
from app.config import Config
from app.api_client import APIClient
from app.logger import get_logger

# Get logger instance
logger = get_logger()


class RequestTracker:
    """Track request timing for performance logging"""
    
    def __init__(self, route_name):
        self.route_name = route_name
        self.start_time = None
        
    def __enter__(self):
        self.start_time = time.time()
        logger.info(f"Starting {self.route_name} request")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed = time.time() - self.start_time
        if exc_type:
            logger.error(f"{self.route_name} request failed after {elapsed:.2f}s: {exc_val}", exc_info=True)
        else:
            log_fn = logger.warning if elapsed > 1.0 else logger.info
            log_fn(f"Completed {self.route_name} request in {elapsed:.2f}s")


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
        logger.info(f"Initializing PaddyApp with API base URL: {api_base_url}")
        
        try:
            self.app: Flask = Flask(__name__)
            self.api_client: APIClient = APIClient(api_base_url, bearer_token)
            self._register_routes()
            self._register_error_handlers()
            
        except Exception as e:
            logger.critical(f"Failed to initialize PaddyApp: {str(e)}", exc_info=True)
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
            ]
            
            # Process routes
            for route in routes:
                if len(route) == 4:
                    path, name, handler, methods = route
                    self.app.add_url_rule(path, name, handler, methods=methods)
                else:
                    path, name, handler = route
                    self.app.add_url_rule(path, name, handler)
            
            # Log the registered routes
            route_paths = [r[0] for r in routes]
            logger.info(f"Routes registered successfully: {', '.join(route_paths)}")
            
        except Exception as e:
            logger.error(f"Failed to register routes: {str(e)}", exc_info=True)
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
            
            logger.info(f"Error handlers registered for codes: {', '.join(map(str, error_handlers.keys()))}")
            
        except Exception as e:
            logger.error(f"Failed to register error handlers: {str(e)}", exc_info=True)
            raise

    def _index_route(self) -> Union[str, Tuple[str, int]]:
        """
        Handle requests to the home page.
        
        Retrieves and displays product categories.
        """
        with RequestTracker("index") as _:
            try:
                categories: Dict[str, Any] = self.api_client.get_categories()
                category_count = len(categories.get('Data', []))
                logger.info(f"Retrieved {category_count} categories for index page")
                return render_template("index.html.j2", categories=categories)
                
            except Exception as e:
                logger.error(f"Error in index route: {str(e)}", exc_info=True)
                return render_template("error.html.j2", error="Failed to load categories"), 500

    def _products_route(self, category_id: int) -> Union[str, Any]:
        """
        Handle requests to the products page for a specific category.
        
        Args:
            category_id (int): The unique identifier for the product category.
        """
        with RequestTracker(f"products/{category_id}") as _:
            try:
                page: int = request.args.get('page', 1, type=int)
                sort_param: Optional[str] = request.args.get('sort')
            
                # Check if this is an AJAX request
                is_ajax: bool = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
            
                sort_field: Optional[str] = None
                sort_direction: str = 'asc'
                sort_field, sort_direction = self._parse_sort_param(sort_param)
            
                logger.info(f"Fetching products for category {category_id}, page {page}, sort: {sort_field or 'default'} {sort_direction}")
                
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
                    logger.warning(f"Category {category_id} not found")
                    return render_template("error.html.j2", error="Category not found"), 404
                
                active_fields: List[Dict[str, Any]] = self.api_client.field_config.get_category_fields(category_id)
                
                logger.info(f"Rendering products page for category {category_id} with {len(products.get('Data', []))} products")
            
                return render_template(
                    "products.html.j2",
                    products=products,
                    category=category,
                    active_fields=active_fields,
                    current_sort=sort_param
                )
            except Exception as e:
                logger.error(f"Error in products route for category {category_id}: {str(e)}", exc_info=True)
                if 'is_ajax' in locals() and is_ajax:
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
                    logger.warning(f"Attempted to sort by unsupported field: {field}")
                    return None, 'asc'
                
                if direction not in ['asc', 'dsc']:
                    logger.warning(f"Invalid sort direction: {direction}")
                    direction = 'asc'
                
                return field, direction
        except Exception as e:
            logger.error(f"Error parsing sort parameter '{sort_param}': {str(e)}", exc_info=True)
        
        return None, 'asc'

    def _not_found_error(self, error: Any) -> Tuple[str, int]:
        """
        Handle 404 Not Found errors.
        """
        logger.warning(f"404 error: {request.method} {request.path}")
        return render_template("error.html.j2", error="Page not found"), 404

    def _internal_error(self, error: Any) -> Tuple[str, int]:
        """
        Handle 500 Internal Server errors.
        """
        logger.error(f"500 error: {request.method} {request.path}", exc_info=True)
        return render_template("error.html.j2", error="Internal server error"), 500

    def _edit_product_route(self, product_id: int) -> Union[Any, Tuple[Any, int]]:
        """
        Handle GET request to edit a specific product.
        
        Args:
            product_id (int): The ID of the product to edit.
        """
        with RequestTracker(f"edit_product/{product_id}") as _:
            try:
                logger.info(f"Processing edit request for product {product_id}")

                # Fetch the product details from the API
                product: Dict[str, Any] = self.api_client._make_request(f"Products/{product_id}")
                
                # Identify the current category from the product details
                current_category: Dict[str, Any] = product.get('Category', {})
                category_id: Optional[int] = current_category.get('ID')
                
                if not category_id:
                    logger.error(f"Invalid product data - missing category ID for product {product_id}")
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

                logger.debug(f"Normalized web status value for product {product_id}: {status_value}")

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

                logger.info(f"Product edit form prepared with {len(dynamic_fields)} fields for product {product_id}")

                return jsonify({
                    'product': product,
                    'dynamic_fields': dynamic_fields
                })

            except Exception as e:
                logger.error(f"Error in edit product {product_id}: {str(e)}", exc_info=True)
                return jsonify({'error': str(e)}), 500

    def _update_product_route(self, product_id: int) -> Union[Any, Tuple[Any, int]]:
        """
        Handle POST request to update a specific product.
        
        Args:
            product_id (int): The ID of the product to update.
        """
        with RequestTracker(f"update_product/{product_id}") as _:
            try:
                update_data = request.get_json() or {}
                
                logger.info(f"Processing update for product {product_id}")

                if not update_data:
                    logger.warning("Empty update request received")
                    return jsonify({'error': 'No update data provided'}), 400

                # Prepare update payload - start with a clean object
                update_payload = {}
                
                # Copy ECommerceSettings if provided
                if 'ECommerceSettings' in update_data:
                    ecommerce_settings = update_data['ECommerceSettings']
                    # Make a deep copy to avoid reference issues
                    update_payload['ECommerceSettings'] = {}
                    
                    # Handle ECommerceStatus as enum string (not numeric)
                    if 'ECommerceStatus' in ecommerce_settings:
                        status_data = ecommerce_settings['ECommerceStatus']
                        
                        # Convert to the enum string format expected by the API
                        if isinstance(status_data, (int, float)):
                            # Convert numeric values to string enum
                            status_value = int(float(status_data))
                            update_payload['ECommerceSettings']['ECommerceStatus'] = 'Enabled' if status_value == 0 else 'Disabled'
                        elif isinstance(status_data, str):
                            # Map UI strings to API enum strings
                            if status_data.lower() == 'available':
                                update_payload['ECommerceSettings']['ECommerceStatus'] = 'Enabled'
                            elif status_data.lower() == 'not available':
                                update_payload['ECommerceSettings']['ECommerceStatus'] = 'Disabled'
                            else:
                                # May already be in correct format
                                update_payload['ECommerceSettings']['ECommerceStatus'] = status_data
                        else:
                            # Use the _normalize_ecommerce_status method but convert to string
                            status_value = self._normalize_ecommerce_status(status_data)
                            update_payload['ECommerceSettings']['ECommerceStatus'] = 'Enabled' if status_value == 0 else 'Disabled'
                    
                    # Handle ExtendedDescription
                    if 'ExtendedDescription' in ecommerce_settings:
                        update_payload['ECommerceSettings']['ExtendedDescription'] = ecommerce_settings['ExtendedDescription']
                else:
                    # If ECommerceSettings is not provided directly, we need to build it
                    ecommerce_settings = {}
                    
                    # Handle web status through various possible field names
                    for status_key in ['web_status', 'ECommerceSettings.ECommerceStatus']:
                        if status_key in update_data:
                            web_status_value = update_data[status_key]
                            
                            # Convert to string enum value
                            if isinstance(web_status_value, str):
                                if web_status_value.lower() == 'available':
                                    ecommerce_settings['ECommerceStatus'] = 'Enabled'
                                elif web_status_value.lower() == 'not available':
                                    ecommerce_settings['ECommerceStatus'] = 'Disabled'
                                else:
                                    # Try to normalize if it's not in the expected format
                                    status_value = self._normalize_ecommerce_status(web_status_value)
                                    ecommerce_settings['ECommerceStatus'] = 'Enabled' if status_value == 0 else 'Disabled'
                            else:
                                # Use the normalize method but convert to string
                                status_value = self._normalize_ecommerce_status(web_status_value)
                                ecommerce_settings['ECommerceStatus'] = 'Enabled' if status_value == 0 else 'Disabled'
                    
                    # Handle extended description
                    if 'extended_description' in update_data:
                        ecommerce_settings['ExtendedDescription'] = update_data['extended_description']
                        
                    # Only add ECommerceSettings if we have values to update
                    if ecommerce_settings:
                        update_payload['ECommerceSettings'] = ecommerce_settings
                
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

                logger.debug(f"Update payload prepared for product {product_id}")

                # Use the API client to update the product
                response = self.api_client.update_product(product_id, update_payload)
                
                if response == "Product updated successfully":
                    # Fetch the updated product to verify changes
                    updated_product = self.api_client._make_request(f"Products/{product_id}")
                    current_status = self._extract_ecommerce_status(updated_product)
                    
                    logger.info(f"Product {product_id} updated successfully, status: {current_status}")
                    
                    return jsonify({
                        'message': response,
                        'current_status': current_status,
                        'is_available': current_status == 0,
                        'product': updated_product
                    }), 200
                else:
                    logger.error(f"Product {product_id} update failed: {response}")
                    return jsonify({'error': f"Failed to update product: {response}"}), 500

            except Exception as e:
                logger.error(f"Error updating product {product_id}: {str(e)}", exc_info=True)
                return jsonify({'error': f"Error updating product: {str(e)}"}), 500

    def _extract_ecommerce_status(self, product: Dict[str, Any]) -> int:
        """
        Extract the normalized ECommerceStatus value from a product object.
        
        Args:
            product (Dict[str, Any]): Product data
            
        Returns:
            int: Normalized status (0 for Available, 1 for Not Available)
        """
        try:
            if product and 'ECommerceSettings' in product:
                settings = product['ECommerceSettings']
                if 'ECommerceStatus' in settings:
                    status = settings['ECommerceStatus']
                    if isinstance(status, dict) and 'Value' in status:
                        return int(status['Value'])
                    elif isinstance(status, (str, int)):
                        return self._normalize_ecommerce_status(status)
        except Exception as e:
            logger.debug(f"Error extracting ecommerce status: {str(e)}")
        
        # Default to Not Available (1) if we can't determine status
        return 1

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
        with RequestTracker("api_search") as _:
            try:
                category: Optional[str] = request.args.get('category')
                code_query: Optional[str] = request.args.get('code')
                page: int = request.args.get('page', 1, type=int)
                items_per_page: int = min(
                    request.args.get('per_page', 30, type=int),
                    self.api_client.MAX_ITEMS_PER_PAGE
                )
                
                if not category and not code_query:
                    logger.warning("Search request with no parameters")
                    return jsonify({
                        'error': 'At least one search parameter (category or code) is required'
                    }), 400
                
                search_params = []
                if category:
                    search_params.append(f"category={category}")
                if code_query:
                    search_params.append(f"code={code_query}")
                
                logger.info(f"API search: {' '.join(search_params)}, page {page}")
                
                results: Dict[str, Any] = self.api_client.search_products_api(
                    category=category,
                    code_query=code_query,
                    page=page,
                    items_per_page=items_per_page
                )
                
                logger.info(f"Search returned {results.get('TotalCount', 0)} results")
                
                return jsonify(results)
                
            except Exception as e:
                logger.error(f"Error in API search: {str(e)}", exc_info=True)
                return jsonify({'error': str(e)}), 500
        
    def _all_products_search_route(self) -> Union[Any, Tuple[Any, int]]:
        """Handle search requests for all products."""
        with RequestTracker("all_products_search") as _:
            try:
                # Get all query parameters
                params = request.args.to_dict()
                
                # Extract specific parameters
                code_query: str = params.get('code', '')
                page: int = int(params.get('page', 1))
                
                logger.info(f"All products search: code={code_query}, page={page}")
                
                # Prepare search parameters
                search_params = {
                    'sort': 'Code[asc]',
                    'page': page
                }
                
                # Add code search parameter if not empty
                if code_query:
                    search_params['Code[cnt]'] = code_query
                
                # Use the search_products_api method with original params
                results: Dict[str, Any] = self.api_client.search_products_api(**search_params)
                
                logger.info(f"All products search returned {results.get('TotalCount', 0)} results")
                
                return jsonify(results)
                    
            except Exception as e:
                logger.error(f"Error in all products search: {str(e)}", exc_info=True)
                return jsonify({'error': str(e)}), 500

def create_app() -> Flask:
    """
    Create and configure the Flask application instance.
    
    Returns:
        Flask application instance
    """
    try:
        start_time = time.time()
        logger.info("Creating Flask application")

        # Ensure all required directories exist
        Config.ensure_directories()
        
        # Create the PADDY application instance
        paddy_app: PaddyApp = PaddyApp(Config.API_BASE_URL, Config.BEARER_TOKEN)
        
        elapsed = time.time() - start_time
        logger.info(f"Flask application created in {elapsed:.2f}s")
        
        return paddy_app.app
        
    except Exception as e:
        logger.critical(f"Fatal error during application creation: {str(e)}", exc_info=True)
        raise


# Create the Flask application instance
app: Flask = create_app()

# Run the application if this script is the main entry point
if __name__ == "__main__":
    try:
        logger.info("Starting Flask application on 0.0.0.0:5000 (debug=True)")
        app.run(debug=True, host="0.0.0.0", port=5000)
        
    except Exception as e:
        logger.critical(f"Application startup failed: {str(e)}", exc_info=True)
        raise