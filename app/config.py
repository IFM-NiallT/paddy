"""
Configuration Module for PADDY Application

This module provides a centralized configuration management system 
for the PADDY (Product Attribute Designer Deployment for You) application.

Key Features:
- Environment-based configuration
- Secure default values
- Directory management
- Flexible configuration loading

The configuration class serves as a single source of truth for 
application-wide settings, supporting both hardcoded defaults 
and environment variable overrides.

***
Author: Luke Doyle - 2025 Intern
"""

import os
import logging


class Config:
    """
    Centralized configuration management for the PADDY application.
    
    Manages application settings with a robust configuration approach:
    - Loads settings from environment variables
    - Provides sensible default values
    - Supports runtime configuration
    - Ensures necessary directories exist
    
    Configuration Sources (in order of precedence):
    1. Environment Variables
    2. Hardcoded Defaults
    
    Attributes:
        API_BASE_URL (str): Base URL for API connections
        BEARER_TOKEN (str): Authentication token for API access
        REQUEST_TIMEOUT (int): Default timeout for API requests
        JSON_DIR (str): Directory for storing JSON files
        CACHE_FILE (str): Path to categories cache file
        FIELD_CONFIG_FILE (str): Path to product attributes configuration
    """
    
    # API Connection Configuration
    # NOTE: In production, replace these with secure environment variable loading
    API_BASE_URL = os.getenv('API_BASE_URL', 'http://100.100.0.102:1234')
    BEARER_TOKEN = os.getenv('BEARER_TOKEN', 'ODk2MzNkMjUtN2RlYi00ODM2LTlkMT')
    REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '15'))
    
    # File System Configuration
    JSON_DIR = 'json'
    CACHE_FILE = os.path.join(JSON_DIR, 'categories.json')
    FIELD_CONFIG_FILE = os.path.join(JSON_DIR, 'product_attributes.json')
    
    @classmethod
    def ensure_directories(cls):
        """
        Ensure all required application directories exist.
        
        Creates necessary directories for:
        - JSON file storage
        - Caching
        - Configuration files
        
        Notes:
        - Uses os.makedirs with exist_ok to prevent errors if directory exists
        - Logs directory creation for traceability
        """
        try:
            # Create JSON directory and any necessary parent directories
            os.makedirs(cls.JSON_DIR, exist_ok=True)
            logging.info(f"Ensured JSON directory exists: {cls.JSON_DIR}")
        except Exception as e:
            logging.error(f"Failed to create JSON directory: {e}")
            raise

    @classmethod
    def validate_configuration(cls):
        """
        Validate critical configuration settings.
        
        Performs checks to ensure:
        - API Base URL is not empty
        - Bearer Token is present
        - Request timeout is reasonable
        
        Raises:
            ValueError: If any critical configuration is missing or invalid
        
        Notes:
        - Provides an additional layer of configuration validation
        - Helps catch configuration issues early
        """
        errors = []
        
        # Validate API Base URL
        if not cls.API_BASE_URL or not cls.API_BASE_URL.startswith(('http://', 'https://')):
            errors.append("Invalid or missing API Base URL")
        
        # Validate Bearer Token
        if not cls.BEARER_TOKEN or len(cls.BEARER_TOKEN) < 10:
            errors.append("Invalid or missing Bearer Token")
        
        # Validate Request Timeout
        if cls.REQUEST_TIMEOUT <= 0 or cls.REQUEST_TIMEOUT > 60:
            errors.append("Invalid request timeout (must be between 1-60 seconds)")
        
        # Raise comprehensive error if any issues found
        if errors:
            error_message = "Configuration Validation Failed:\n" + "\n".join(f"- {error}" for error in errors)
            logging.error(error_message)
            raise ValueError(error_message)
        
        logging.info("Configuration validated successfully")

    @classmethod
    def get_connection_info(cls):
        """
        Retrieve a dictionary of connection-related configuration.
        
        Returns:
            dict: Connection configuration details
        
        Useful for:
        - Logging
        - Debugging
        - Passing configuration to other components
        """
        return {
            'base_url': cls.API_BASE_URL,
            'timeout': cls.REQUEST_TIMEOUT,
            'token_present': bool(cls.BEARER_TOKEN)
        }


# Validate configuration when module is imported
try:
    Config.ensure_directories()
    Config.validate_configuration()
except Exception as e:
    # Log critical configuration errors
    logging.critical(f"Configuration Error: {e}")
    # In a real-world scenario, you might want to handle this more gracefully
    raise