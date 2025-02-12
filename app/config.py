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
from .logger import logger


class Config:
    """
    Centralized configuration management for the PADDY application.
    
    Manages application settings with a robust configuration approach:
    - Loads settings from environment variables
    - Provides sensible default values
    - Supports runtime configuration
    - Ensures necessary directories exist
    """
    
    # API Connection Configuration
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
        """
        try:
            # Create JSON directory and any necessary parent directories
            os.makedirs(cls.JSON_DIR, exist_ok=True)
            logger.info(
                "Directory structure verified",
                extra={
                    'directory': cls.JSON_DIR,
                    'absolute_path': os.path.abspath(cls.JSON_DIR),
                    'permissions': oct(os.stat(cls.JSON_DIR).st_mode)[-3:]
                }
            )
        except PermissionError as e:
            logger.critical(
                "Permission denied while creating directory",
                extra={
                    'directory': cls.JSON_DIR,
                    'error': str(e),
                    'user': os.getenv('USER'),
                    'current_permissions': oct(os.stat(os.path.dirname(cls.JSON_DIR)).st_mode)[-3:] if os.path.exists(os.path.dirname(cls.JSON_DIR)) else None
                },
                exc_info=True
            )
            raise
        except Exception as e:
            logger.critical(
                "Failed to create directory structure",
                extra={
                    'directory': cls.JSON_DIR,
                    'error_type': type(e).__name__,
                    'error_msg': str(e)
                },
                exc_info=True
            )
            raise

    @classmethod
    def validate_configuration(cls):
        """
        Validate critical configuration settings.
        """
        validation_errors = []
        
        # Validate API Base URL
        if not cls.API_BASE_URL:
            validation_errors.append("API Base URL is missing")
        elif not cls.API_BASE_URL.startswith(('http://', 'https://')):
            validation_errors.append(f"Invalid API Base URL format: {cls.API_BASE_URL}")
            logger.warning(
                "Insecure API URL detected",
                extra={
                    'url': cls.API_BASE_URL,
                    'recommended': 'Use HTTPS in production'
                }
            )
        
        # Validate Bearer Token
        if not cls.BEARER_TOKEN:
            validation_errors.append("Bearer Token is missing")
        elif len(cls.BEARER_TOKEN) < 10:
            validation_errors.append("Bearer Token length is insufficient")
            logger.error(
                "Security configuration error",
                extra={
                    'issue': 'Invalid bearer token length',
                    'required_length': '≥ 10',
                    'current_length': len(cls.BEARER_TOKEN)
                }
            )
        
        # Validate Request Timeout
        if cls.REQUEST_TIMEOUT <= 0:
            validation_errors.append("Request timeout must be positive")
        elif cls.REQUEST_TIMEOUT > 60:
            validation_errors.append("Request timeout exceeds maximum (60 seconds)")
            logger.warning(
                "Request timeout might be too high",
                extra={
                    'current_timeout': cls.REQUEST_TIMEOUT,
                    'recommended_max': 60
                }
            )
        
        # Log and raise if any validation errors found
        if validation_errors:
            error_message = "Configuration Validation Failed:\n" + "\n".join(f"- {error}" for error in validation_errors)
            logger.critical(
                "Invalid configuration detected",
                extra={
                    'validation_errors': validation_errors,
                    'config_summary': cls.get_connection_info()
                },
                exc_info=True
            )
            raise ValueError(error_message)
        
        logger.info(
            "Configuration validated successfully",
            extra={
                'config': cls.get_connection_info(),
                'directories': {
                    'json_dir': cls.JSON_DIR,
                    'cache_file': cls.CACHE_FILE,
                    'field_config': cls.FIELD_CONFIG_FILE
                }
            }
        )

    @classmethod
    def get_connection_info(cls):
        """
        Retrieve a dictionary of connection-related configuration.
        """
        connection_info = {
            'base_url': cls.API_BASE_URL,
            'timeout': cls.REQUEST_TIMEOUT,
            'token_present': bool(cls.BEARER_TOKEN),
            'json_dir_exists': os.path.exists(cls.JSON_DIR),
            'cache_file_exists': os.path.exists(cls.CACHE_FILE),
            'field_config_exists': os.path.exists(cls.FIELD_CONFIG_FILE)
        }
        
        logger.info(
            "Retrieved connection information",
            extra={'connection_info': connection_info}
        )
        
        return connection_info


# Initialize configuration when module is imported
try:
    Config.ensure_directories()
    Config.validate_configuration()
except Exception as e:
    logger.critical(
        "Fatal configuration error during initialization",
        extra={
            'error_type': type(e).__name__,
            'error_msg': str(e)
        },
        exc_info=True
    )
    raise