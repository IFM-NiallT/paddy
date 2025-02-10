"""
PADDY (Product Attribute Designer Deployment for You)
A Flask application for managing product categories and attributes.
"""

from flask import Flask, render_template, jsonify
from app.config import Config
from app.api_client import APIClient
from app.logger import logger

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
            categories = api_client.get_categories()
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