"""
Configuration Module

This module provides application-wide configuration settings loaded from
environment variables with fallback default values.
"""

import os
from typing import Optional


class Config:
    """
    Application configuration class that manages all configuration settings.
    
    This class uses environment variables with fallback defaults for configuration
    settings related to API access, file paths, and other application settings.
    
    Attributes:
        API_BASE_URL (str): Base URL for API endpoints
        BEARER_TOKEN (str): Authentication token for API access
        REQUEST_TIMEOUT (int): Default timeout for API requests in seconds
        JSON_DIR (str): Directory for JSON file storage
        CACHE_FILE (str): Path to categories cache file
        FIELD_CONFIG_FILE (str): Path to field configuration file
    """
    
    API_BASE_URL: str = os.getenv('API_BASE_URL', 'http://100.100.0.102:1234')
    BEARER_TOKEN: str = os.getenv('BEARER_TOKEN', 'ODk2MzNkMjUtN2RlYi00ODM2LTlkMT')
    REQUEST_TIMEOUT: int = int(os.getenv('REQUEST_TIMEOUT', '5'))
    
    # File paths configuration
    JSON_DIR: str = 'json'
    CACHE_FILE: str = os.path.join(JSON_DIR, 'categories.json')
    FIELD_CONFIG_FILE: str = os.path.join(JSON_DIR, 'product_attributes.json')
    
    @classmethod
    def ensure_directories(cls) -> None:
        """
        Ensure all required directories exist.
        
        Creates the JSON directory if it doesn't exist.
        """
        if not os.path.exists(cls.JSON_DIR):
            os.makedirs(cls.JSON_DIR)