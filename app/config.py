"""
Configuration Module

This module provides application-wide configuration settings loaded from
environment variables with fallback default values.
"""

import os


class Config:
    """
    Application configuration class that manages all configuration settings.
    
    Uses environment variables with fallback defaults for settings related to
    API access, file paths, and other application configurations.
    """
    
    # API Connection configuration
    API_BASE_URL = os.getenv('API_BASE_URL', 'http://100.100.0.102:1234')
    BEARER_TOKEN = os.getenv('BEARER_TOKEN', 'ODk2MzNkMjUtN2RlYi00ODM2LTlkMT')
    REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '5'))
    
    # File paths configuration
    JSON_DIR = 'json'
    CACHE_FILE = os.path.join(JSON_DIR, 'categories.json')
    FIELD_CONFIG_FILE = os.path.join(JSON_DIR, 'product_attributes.json')
    
    @classmethod
    def ensure_directories(cls):
        """
        Ensure all required directories exist.
        
        Creates the JSON directory if it doesn't exist.
        """
        os.makedirs(cls.JSON_DIR, exist_ok=True)
