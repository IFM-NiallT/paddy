"""
Field Configuration Module for PADDY Application

This module provides a robust system for managing product category field configurations.
It handles the dynamic loading, parsing, and retrieval of field information 
across different product categories.

Key Responsibilities:
- Load field configuration from a JSON file
- Provide access to category-specific field configurations
- Support dynamic field display and usage tracking
- Implement comprehensive error handling and logging

The module is designed to be flexible and support various product categories 
with different field requirements.

***
Author: Luke Doyle - 2025 Intern
"""

import json
import os
from datetime import datetime
from .logger import logger
from .config import Config


class FieldConfig:
    """
    Manages field configurations and display name mappings for product categories.
    
    Provides a comprehensive interface for:
    - Loading category field configurations
    - Retrieving active fields for specific categories
    - Handling configuration file parsing
    
    Attributes:
        config (dict): Loaded field configuration dictionary
    """
    
    def __init__(self):
        """Initialize FieldConfig by loading configuration data."""
        logger.info("Initializing FieldConfig instance")
        self.config = self._load_field_config()
        if not self.config:
            logger.critical(
                "Failed to load field configuration - system may not function correctly",
                extra={
                    'config_file': Config.FIELD_CONFIG_FILE,
                    'timestamp': datetime.now().isoformat()
                }
            )

    def _load_field_config(self):
        """
        Load field configuration from the JSON file with comprehensive error handling.
        
        Returns:
            dict: The loaded configuration dictionary
        """
        try:
            logger.info(
                "Loading field configuration",
                extra={'config_file': Config.FIELD_CONFIG_FILE}
            )
            
            # Check if configuration file exists
            if not os.path.exists(Config.FIELD_CONFIG_FILE):
                logger.error(
                    "Field configuration file not found",
                    extra={
                        'config_file': Config.FIELD_CONFIG_FILE,
                        'current_dir': os.getcwd()
                    },
                    exc_info=True
                )
                return {}

            # Log file statistics
            file_stats = os.stat(Config.FIELD_CONFIG_FILE)
            logger.info(
                "Configuration file details",
                extra={
                    'file_size': file_stats.st_size,
                    'last_modified': datetime.fromtimestamp(file_stats.st_mtime).isoformat(),
                    'file_permissions': oct(file_stats.st_mode)[-3:]
                }
            )

            # Validate file size
            if file_stats.st_size == 0:
                logger.error(
                    "Configuration file is empty",
                    extra={'config_file': Config.FIELD_CONFIG_FILE}
                )
                return {}

            # Read and parse configuration file
            with open(Config.FIELD_CONFIG_FILE, 'r') as f:
                config = json.load(f)

            # Validate configuration structure
            if not isinstance(config, dict):
                logger.error(
                    "Invalid configuration format - expected dictionary",
                    extra={'actual_type': type(config).__name__}
                )
                return {}

            # Log configuration summary
            logger.info(
                "Configuration loaded successfully",
                extra={
                    'categories_count': len(config),
                    'category_ids': list(config.keys())
                }
            )

            # Validate each category's configuration
            for category_id, category_config in config.items():
                if 'fields' not in category_config:
                    logger.warning(
                        "Category missing 'fields' configuration",
                        extra={
                            'category_id': category_id,
                            'available_keys': list(category_config.keys())
                        }
                    )

            return config

        except json.JSONDecodeError as e:
            logger.error(
                "JSON parsing error in configuration file",
                extra={
                    'error_msg': str(e),
                    'error_line': e.lineno,
                    'error_col': e.colno
                },
                exc_info=True
            )
            return {}
        except IOError as e:
            logger.error(
                "IO error reading configuration file",
                extra={
                    'error_msg': str(e),
                    'error_code': e.errno if hasattr(e, 'errno') else None
                },
                exc_info=True
            )
            return {}
        except Exception as e:
            logger.critical(
                "Unexpected error loading configuration",
                extra={
                    'error_type': type(e).__name__,
                    'error_msg': str(e)
                },
                exc_info=True
            )
            return {}

    def get_category_fields(self, category_id):
        """
        Retrieve active fields for a specific product category.
        
        Args:
            category_id (int or str): Unique identifier of the product category
        
        Returns:
            list: A list of dictionaries containing field information
        """
        category_id_str = str(category_id)
        
        # Check if configuration is loaded
        if not self.config:
            logger.error(
                "Cannot retrieve category fields - configuration is empty",
                extra={'category_id': category_id}
            )
            return []

        # Check if category exists
        if category_id_str not in self.config:
            logger.warning(
                "Category not found in configuration",
                extra={
                    'category_id': category_id,
                    'available_categories': list(self.config.keys())
                }
            )
            return []

        # Retrieve category configuration
        category_config = self.config.get(category_id_str, {}).get('fields', {})
        
        if not category_config:
            logger.warning(
                "No fields configured for category",
                extra={'category_id': category_id}
            )
            return []

        # Filter and format active fields
        active_fields = [
            {
                'field': field_name,
                'display': field_info.get('display', field_name),
                'type': field_info.get('type', 'text')
            }
            for field_name, field_info in category_config.items()
            if field_info.get('used', False)
        ]

        logger.info(
            "Retrieved category fields",
            extra={
                'category_id': category_id,
                'active_fields_count': len(active_fields)
            }
        )

        return active_fields