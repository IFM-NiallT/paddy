from flask import Flask, render_template, jsonify
import requests
import json

app = Flask(__name__)

API_BASE_URL = "http://100.100.0.102:1234"
BEARER_TOKEN = "brearertoken"

def fetch_product_categories():
    """Fetch product categories from the external API with Bearer Token authentication."""
    headers = {
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Accept": "application/json"
    }
    try:
        response = requests.get(f"{API_BASE_URL}/ProductCategories", 
                              headers=headers, 
                              timeout=5)
        response.raise_for_status()
        
        # Save categories to JSON file
        with open('categories.json', 'w') as f:
            json.dump(response.json(), f, indent=4)
            
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return {"TotalCount": 0, "Data": []}

def get_products_by_category(category_id):
    """Fetch products for a specific category."""
    headers = {
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Accept": "application/json"
    }
    try:
        response = requests.get(
            f"{API_BASE_URL}/Products",
            headers=headers,
            params={'categoryId': category_id},
            timeout=5
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching products: {e}")
        return {"TotalCount": 0, "Data": []}

@app.route("/")
def index():
    """Home route that fetches and displays product categories."""
    categories = fetch_product_categories()
    return render_template("index.html", categories=categories)

@app.route("/products/<int:category_id>")
def products(category_id):
    """API endpoint to get products by category."""
    products = get_products_by_category(category_id)
    return jsonify(products)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

application = app  # For WSGI server
