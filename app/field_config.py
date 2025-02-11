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
    
    Notes:
        - Supports multiple product categories
        - Dynamically loads configuration from a JSON file
        - Implements robust error handling
    """
    
    def __init__(self):
        """
        Initialize FieldConfig by loading configuration data.
        
        Workflow:
        1. Attempt to load configuration from file
        2. Log initialization details
        3. Handle potential loading errors
        """
        self.config = self._load_field_config()

    def _load_field_config(self):
        """
        Load field configuration from the JSON file with comprehensive error handling.
        
        Detailed loading process:
        - Verify configuration file existence
        - Log file metadata
        - Parse JSON configuration
        - Handle various potential error scenarios
        
        Returns:
            dict: The loaded configuration dictionary
                 - Empty dictionary if loading fails
                 - Contains category-specific field configurations
        
        Logs:
        - File loading status
        - File metadata (size, last modified)
        - Number of categories loaded
        - Any errors encountered during loading
        """
        try:
            logger.info("Loading field configuration from: %s", Config.FIELD_CONFIG_FILE)
            
            # Check if configuration file exists
            if not os.path.exists(Config.FIELD_CONFIG_FILE):
                logger.error("Field configuration file not found: %s", Config.FIELD_CONFIG_FILE)
                return {}

            # Log file statistics for debugging and auditing
            file_stats = os.stat(Config.FIELD_CONFIG_FILE)
            logger.info("Configuration File Details:")
            logger.info("- Size: %s bytes", file_stats.st_size)
            logger.info("- Last Modified: %s", datetime.fromtimestamp(file_stats.st_mtime))

            # Read and parse the configuration file
            with open(Config.FIELD_CONFIG_FILE, 'r') as f:
                config = json.load(f)

            # Log configuration summary
            logger.info("Number of categories loaded: %s", len(config))
            logger.info("Loaded category IDs: %s", list(config.keys()))
            return config

        except (IOError, json.JSONDecodeError) as e:
            # Handle file reading and JSON parsing errors
            logger.error("Error reading field configuration: %s", str(e))
            return {}
        except Exception as e:
            # Catch-all for unexpected errors
            logger.error("Unexpected error loading field configuration: %s", str(e))
            return {}

    def get_category_fields(self, category_id):
        """
        Retrieve active fields for a specific product category.
        
        Provides a filtered list of fields that are marked as active/used.
        
        Args:
            category_id (int or str): Unique identifier of the product category
        
        Returns:
            list: A list of dictionaries containing:
                - 'field': Internal field name
                - 'display': Human-readable display name
        
        Workflow:
        1. Convert category ID to string (for configuration lookup)
        2. Validate configuration exists
        3. Retrieve category-specific fields
        4. Filter for active/used fields
        
        Example Return:
        [
            {'field': 'D_SizeA', 'display': 'Primary Size'},
            {'field': 'D_ThreadGender', 'display': 'Gender'}
        ]
        """
        # Ensure category_id is a string for configuration lookup
        category_id_str = str(category_id)
        
        # Check if configuration is loaded
        if not self.config:
            logger.warning("Configuration is empty")
            return []

        # Retrieve the configuration for the specified category
        category_config = self.config.get(category_id_str, {}).get('fields', {})

        # Filter and format only the active fields
        return [
            {
                'field': field_name, 
                'display': field_info.get('display', field_name),
                'type': field_info.get('type', 'text')
            }
            for field_name, field_info in category_config.items()
            if field_info.get('used', False)
        ]