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
from typing import List, Optional
from .logger import get_logger

# Get logger instance
logger = get_logger()


class Config:
    """
    Centralized configuration management for the PADDY application.
    
    Manages application settings with a robust configuration approach:
    - Loads settings from environment variables and .env files in static/env
    - Provides sensible default values
    - Supports runtime configuration
    - Ensures necessary directories exist
    """
    
    # API Connection Configuration
    API_BASE_URL = None
    BEARER_TOKEN = None
    REQUEST_TIMEOUT = 15
    
    # File System Configuration
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    STATIC_DIR = os.path.join(BASE_DIR, 'static')
    JSON_DIR = os.path.join(STATIC_DIR, 'json')
    ENV_DIR = os.path.join(STATIC_DIR, 'env')
    CACHE_FILE = os.path.join(JSON_DIR, 'categories.json')
    FIELD_CONFIG_FILE = os.path.join(JSON_DIR, 'product_attributes.json')
    
    @classmethod
    def ensure_directories(cls) -> None:
        """
        Ensure all required application directories exist.
        """
        required_dirs = [cls.JSON_DIR, cls.ENV_DIR]
        
        for directory in required_dirs:
            try:
                os.makedirs(directory, exist_ok=True)
                logger.info(f"Directory structure verified: {directory}")
            except PermissionError as e:
                logger.critical(
                    f"Permission denied creating directory: {directory}",
                    exc_info=True
                )
                raise
            except Exception as e:
                logger.critical(
                    f"Failed to create directory {directory}: {str(e)}",
                    exc_info=True
                )
                raise

    @classmethod
    def validate_configuration(cls) -> None:
        """
        Validate critical configuration settings.
        """
        validation_errors = []
        
        # Validate API Base URL
        if not cls.API_BASE_URL:
            validation_errors.append("API Base URL is missing")
        elif not cls.API_BASE_URL.startswith(('http://', 'https://')):
            validation_errors.append(f"Invalid API Base URL format: {cls.API_BASE_URL}")
            logger.warning(f"Insecure API URL detected: {cls.API_BASE_URL}")
        
        # Validate Bearer Token
        if not cls.BEARER_TOKEN:
            validation_errors.append("Bearer Token is missing")
        elif len(cls.BEARER_TOKEN) < 10:
            validation_errors.append("Bearer Token length is insufficient")
            logger.error(f"Security configuration error: Token length ({len(cls.BEARER_TOKEN)}) < 10")
        
        # Validate Request Timeout
        if cls.REQUEST_TIMEOUT <= 0:
            validation_errors.append("Request timeout must be positive")
        elif cls.REQUEST_TIMEOUT > 60:
            validation_errors.append("Request timeout exceeds maximum (60 seconds)")
            logger.warning(f"Request timeout might be too high: {cls.REQUEST_TIMEOUT}s > 60s")
        
        # Log and raise if any validation errors found
        if validation_errors:
            error_message = "Configuration Validation Failed:\n" + "\n".join(f"- {error}" for error in validation_errors)
            logger.critical(f"Invalid configuration detected: {len(validation_errors)} issues found", exc_info=True)
            raise ValueError(error_message)
        
        logger.info("Configuration validated successfully")

    @classmethod
    def get_connection_info(cls) -> dict:
        """
        Retrieve a dictionary of connection-related configuration.
        """
        connection_info = {
            'base_url': cls.API_BASE_URL,
            'timeout': cls.REQUEST_TIMEOUT,
            'token_present': bool(cls.BEARER_TOKEN),
            'json_dir_exists': os.path.exists(cls.JSON_DIR),
            'cache_file_exists': os.path.exists(cls.CACHE_FILE),
            'field_config_exists': os.path.exists(cls.FIELD_CONFIG_FILE),
            'env_dir_exists': os.path.exists(cls.ENV_DIR)
        }
        
        logger.debug(f"Connection information: {connection_info}")
        
        return connection_info

    @classmethod
    def find_env_files(cls) -> List[str]:
        """
        Search for .env files in the static/env directory.
        
        Returns:
            List[str]: List of paths to discovered .env files
        """
        env_files = []
        
        try:
            if os.path.exists(cls.ENV_DIR):
                for file in os.listdir(cls.ENV_DIR):
                    if file.endswith('.env'):
                        env_path = os.path.join(cls.ENV_DIR, file)
                        env_files.append(env_path)
                        logger.info(f"Found .env file: {os.path.relpath(env_path, cls.BASE_DIR)}")
            
            return env_files
            
        except PermissionError as e:
            logger.error(f"Permission denied accessing {cls.ENV_DIR}: {str(e)}", exc_info=True)
            raise
        
        except Exception as e:
            logger.error(f"Error searching for .env files: {str(e)}", exc_info=True)
            raise

    @classmethod
    def load_env_file(cls, env_path: str) -> Optional[dict]:
        """
        Safely load and parse a .env file.
        
        Args:
            env_path (str): Path to the .env file
            
        Returns:
            Optional[dict]: Dictionary of environment variables or None if file cannot be read
        """
        env_vars = {}
        
        try:
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        try:
                            key, value = line.split('=', 1)
                            env_vars[key.strip()] = value.strip()
                        except ValueError:
                            logger.warning(f"Invalid line in {env_path}: '{line}'")
                            continue
            
            logger.info(f"Loaded {len(env_vars)} variables from {os.path.basename(env_path)}")
            
            return env_vars
            
        except FileNotFoundError:
            logger.error(f".env file not found: {env_path}")
            return None
            
        except PermissionError:
            logger.error(f"Permission denied reading .env file: {env_path}")
            return None
            
        except Exception as e:
            logger.error(f"Error reading .env file {env_path}: {str(e)}", exc_info=True)
            return None

    @classmethod
    def update_from_env_file(cls, env_path: str) -> bool:
        """
        Update configuration from an .env file.
        
        Args:
            env_path (str): Path to the .env file
            
        Returns:
            bool: True if successful, False otherwise
        """
        env_vars = cls.load_env_file(env_path)
        if not env_vars:
            return False
            
        try:
            # Update class attributes
            for key, value in env_vars.items():
                if hasattr(cls, key):
                    # Convert to int for REQUEST_TIMEOUT
                    if key == 'REQUEST_TIMEOUT':
                        value = int(value)
                    setattr(cls, key, value)
                    logger.info(f"Updated config {key} from {os.path.basename(env_path)}")
            
            # Validate the updated configuration
            cls.validate_configuration()
            return True
            
        except Exception as e:
            logger.error(f"Error updating configuration from {env_path}: {str(e)}", exc_info=True)
            return False


# Initialize configuration when module is imported
try:
    Config.ensure_directories()
    
    # Explicitly load from api_config.env
    api_config_path = os.path.join(Config.ENV_DIR, 'api_config.env')
    if os.path.exists(api_config_path):
        if not Config.update_from_env_file(api_config_path):
            logger.error(f"Failed to load API configuration from {api_config_path}")
    else:
        logger.error(f"API configuration file not found at {api_config_path}")
    
    Config.validate_configuration()
        
except Exception as e:
    logger.critical(f"Fatal configuration error: {str(e)}", exc_info=True)
    raise