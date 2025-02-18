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
from .logger import logger


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
                logger.info(
                    "Directory structure verified",
                    extra={
                        'directory': directory,
                        'absolute_path': os.path.abspath(directory),
                        'permissions': oct(os.stat(directory).st_mode)[-3:]
                    }
                )
            except PermissionError as e:
                logger.critical(
                    "Permission denied while creating directory",
                    extra={
                        'directory': directory,
                        'error': str(e),
                        'user': os.getenv('USER'),
                        'current_permissions': oct(os.stat(os.path.dirname(directory)).st_mode)[-3:] if os.path.exists(os.path.dirname(directory)) else None
                    },
                    exc_info=True
                )
                raise
            except Exception as e:
                logger.critical(
                    "Failed to create directory structure",
                    extra={
                        'directory': directory,
                        'error_type': type(e).__name__,
                        'error_msg': str(e)
                    },
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
                    'field_config': cls.FIELD_CONFIG_FILE,
                    'env_dir': cls.ENV_DIR
                }
            }
        )

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
        
        logger.info(
            "Retrieved connection information",
            extra={'connection_info': connection_info}
        )
        
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
                        logger.info(
                            "Found .env file",
                            extra={
                                'path': env_path,
                                'relative_path': os.path.relpath(env_path, cls.BASE_DIR)
                            }
                        )
            
            return env_files
            
        except PermissionError as e:
            logger.error(
                "Permission denied while searching for .env files",
                extra={
                    'directory': cls.ENV_DIR,
                    'error': str(e),
                    'user': os.getenv('USER')
                },
                exc_info=True
            )
            raise
        
        except Exception as e:
            logger.error(
                "Error while searching for .env files",
                extra={
                    'directory': cls.ENV_DIR,
                    'error_type': type(e).__name__,
                    'error_msg': str(e)
                },
                exc_info=True
            )
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
                            logger.warning(
                                "Invalid line in .env file",
                                extra={
                                    'file': env_path,
                                    'line': line
                                }
                            )
                            continue
            
            logger.info(
                "Successfully loaded .env file",
                extra={
                    'path': env_path,
                    'variables_count': len(env_vars),
                    'variables': list(env_vars.keys())  # Only log keys, not values
                }
            )
            
            return env_vars
            
        except FileNotFoundError:
            logger.error(
                ".env file not found",
                extra={'path': env_path}
            )
            return None
            
        except PermissionError:
            logger.error(
                "Permission denied reading .env file",
                extra={'path': env_path}
            )
            return None
            
        except Exception as e:
            logger.error(
                "Error reading .env file",
                extra={
                    'path': env_path,
                    'error_type': type(e).__name__,
                    'error_msg': str(e)
                },
                exc_info=True
            )
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
                    logger.info(
                        "Updated config attribute",
                        extra={
                            'attribute': key,
                            'source': env_path
                        }
                    )
            
            # Validate the updated configuration
            cls.validate_configuration()
            return True
            
        except Exception as e:
            logger.error(
                "Error updating configuration from .env file",
                extra={
                    'path': env_path,
                    'error_type': type(e).__name__,
                    'error_msg': str(e)
                },
                exc_info=True
            )
            return False


# Initialize configuration when module is imported
try:
    Config.ensure_directories()
    
    # Explicitly load from api_config.env
    api_config_path = os.path.join(Config.ENV_DIR, 'api_config.env')
    if os.path.exists(api_config_path):
        if not Config.update_from_env_file(api_config_path):
            logger.error(
                "Failed to load API configuration",
                extra={'config_path': api_config_path}
            )
    else:
        logger.error(
            "API configuration file not found",
            extra={'expected_path': api_config_path}
        )
    
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