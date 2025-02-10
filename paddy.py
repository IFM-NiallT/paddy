from flask import Flask, render_template, jsonify, request  # Added request
from typing import Tuple, Union, Dict
from app.config import Config
from app.api_client import APIClient
from app.logger import logger


class PaddyApp:
    """
    Main application class that encapsulates Flask app creation and route handling.
    
    This class provides a structured way to create and configure the Flask application,
    setting up routes and error handlers while maintaining clean separation of concerns.
    
    Attributes:
        app (Flask): The Flask application instance
        api_client (APIClient): Client for making API requests
    """
    
    def __init__(self, api_base_url: str, bearer_token: str):
        """
        Initialize the PaddyApp with necessary configurations.
        
        Args:
            api_base_url (str): Base URL for the API endpoints
            bearer_token (str): Authentication token for API requests
        """
        self.app = Flask(__name__)
        self.api_client = APIClient(api_base_url, bearer_token)
        
        # Register routes and error handlers
        self._register_routes()
        self._register_error_handlers()

    def _register_routes(self) -> None:
        """
        Register all application routes with their handlers.
        
        This method sets up the URL routing for the application,
        mapping endpoints to their respective handler methods.
        """
        self.app.add_url_rule("/", "index", self._index_route)
        self.app.add_url_rule(
            "/products/<int:category_id>",
            "products",
            self._products_route
        )

    def _register_error_handlers(self) -> None:
        """
        Register error handlers for common HTTP errors.
        
        Sets up handlers for 404 and 500 errors to provide
        user-friendly error pages.
        """
        self.app.register_error_handler(404, self._not_found_error)
        self.app.register_error_handler(500, self._internal_error)

    def _index_route(self) -> str:
        """
        Handle the home route displaying product categories.
        
        Returns:
            str: Rendered HTML template with categories or error page
        """
        try:
            categories = self.api_client.get_categories()
            return render_template("index.html.j2", categories=categories)
        except Exception as e:
            logger.error(f"Error in index route: {str(e)}")
            return render_template(
                "error.html.j2",
                error="Failed to load categories"
            )

    def _products_route(self, category_id: int) -> Union[str, Tuple[str, int]]:
        """
        Handle the products route for a specific category.
        
        Args:
            category_id (int): ID of the category to display products for
            
        Returns:
            Union[str, Tuple[str, int]]: Rendered template and optional status code
        """
        try:
            # Get page from request arguments, default to 1 if not provided
            page = request.args.get('page', 1, type=int)
            
            # Fetch necessary data from API with pagination
            products = self.api_client.get_products(category_id, page=page)
            categories = self.api_client.get_categories()
            
            # Find the specific category
            category = next(
                (c for c in categories['Data'] if c['ID'] == category_id),
                None
            )

            if not category:
                logger.warning(f"Category not found: {category_id}")
                return render_template(
                    "error.html.j2",
                    error="Category not found"
                ), 404

            # Get active fields for the category
            active_fields = self.api_client.field_config.get_category_fields(
                category_id
            )
            
            return render_template(
                "products.html.j2",
                products=products,
                category=category,
                active_fields=active_fields
            )
            
        except Exception as e:
            logger.error(f"Error in products route: {str(e)}")
            return render_template(
                "error.html.j2",
                error="Failed to load products"
            )

    def _not_found_error(self, error: Exception) -> Tuple[str, int]:
        """
        Handle 404 Not Found errors.
        
        Args:
            error (Exception): The error instance
            
        Returns:
            Tuple[str, int]: Error template and 404 status code
        """
        return render_template("error.html.j2", error="Page not found"), 404

    def _internal_error(self, error: Exception) -> Tuple[str, int]:
        """
        Handle 500 Internal Server errors.
        
        Args:
            error (Exception): The error instance
            
        Returns:
            Tuple[str, int]: Error template and 500 status code
        """
        return render_template(
            "error.html.j2",
            error="Internal server error"
        ), 500


def create_app() -> Flask:
    """
    Application factory function.
    
    Creates and configures a new Flask application instance using the PaddyApp class.
    This function implements the factory pattern for Flask application creation.
    
    Returns:
        Flask: Configured Flask application instance
    """
    # Ensure required directories exist
    Config.ensure_directories()
    
    # Create and configure the application
    paddy_app = PaddyApp(Config.API_BASE_URL, Config.BEARER_TOKEN)
    return paddy_app.app


# Create the application instance for WSGI servers
app = create_app()

if __name__ == "__main__":
    # Run the application in debug mode when executed directly
    app.run(debug=True, host="0.0.0.0", port=5000)