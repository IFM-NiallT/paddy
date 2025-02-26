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
from .logger import get_logger
from .config import Config

# Get logger instance
logger = get_logger()


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
                "Failed to load field configuration - system may not function correctly"
            )

    def _load_field_config(self):
        """
        Load field configuration from the JSON file with comprehensive error handling.
        
        Returns:
            dict: The loaded configuration dictionary
        """
        try:
            logger.info(f"Loading field configuration from {Config.FIELD_CONFIG_FILE}")
            
            # Check if configuration file exists
            if not os.path.exists(Config.FIELD_CONFIG_FILE):
                logger.error(
                    f"Field configuration file not found: {Config.FIELD_CONFIG_FILE}",
                    exc_info=True
                )
                return {}

            # Log file statistics
            file_stats = os.stat(Config.FIELD_CONFIG_FILE)
            file_size_kb = file_stats.st_size / 1024
            last_modified = datetime.fromtimestamp(file_stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
            logger.debug(f"Config file: {file_size_kb:.1f}KB, last modified: {last_modified}")

            # Validate file size
            if file_stats.st_size == 0:
                logger.error(f"Configuration file is empty: {Config.FIELD_CONFIG_FILE}")
                return {}

            # Read and parse configuration file
            with open(Config.FIELD_CONFIG_FILE, 'r') as f:
                config = json.load(f)

            # Validate configuration structure
            if not isinstance(config, dict):
                logger.error(f"Invalid configuration format - expected dictionary, got {type(config).__name__}")
                return {}

            # Log configuration summary
            category_count = len(config)
            logger.info(f"Configuration loaded successfully with {category_count} categories")

            # Validate each category's configuration
            for category_id, category_config in config.items():
                if 'fields' not in category_config:
                    logger.warning(f"Category {category_id} missing 'fields' configuration")

            return config

        except json.JSONDecodeError as e:
            logger.error(
                f"JSON parsing error in configuration file: line {e.lineno}, col {e.colno}",
                exc_info=True
            )
            return {}
        except IOError as e:
            error_code = e.errno if hasattr(e, 'errno') else 'Unknown'
            logger.error(
                f"IO error reading configuration file: {error_code} - {str(e)}",
                exc_info=True
            )
            return {}
        except Exception as e:
            logger.critical(
                f"Unexpected error loading configuration: {type(e).__name__} - {str(e)}",
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
            logger.error(f"Cannot retrieve fields - configuration is empty for category {category_id}")
            return []

        # Check if category exists
        if category_id_str not in self.config:
            logger.warning(f"Category {category_id} not found in configuration")
            return []

        # Retrieve category configuration
        category_config = self.config.get(category_id_str, {}).get('fields', {})
        
        if not category_config:
            logger.warning(f"No fields configured for category {category_id}")
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

        logger.info(f"Retrieved {len(active_fields)} active fields for category {category_id}")

        return active_fields