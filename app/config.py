import os

class Config:
    """Application configuration."""
    API_BASE_URL = os.getenv('API_BASE_URL', 'http://100.100.0.102:1234')
    BEARER_TOKEN = os.getenv('BEARER_TOKEN', 'ODk2MzNkMjUtN2RlYi00ODM2LTlkMT')
    REQUEST_TIMEOUT = 5

    JSON_DIR = 'json'
    CACHE_FILE = os.path.join(JSON_DIR, 'categories.json')
    FIELD_CONFIG_FILE = os.path.join(JSON_DIR, 'product_attributes.json')