"""
Field Configuration Module

This module handles the loading and management of field configurations
for different product categories.
"""

import json
import os
from datetime import datetime
from .logger import logger
from .config import Config


class FieldConfig:
    """
    Manages field configurations and display name mappings for product categories.
    
    This class handles loading and parsing field configurations from a JSON file,
    and provides methods to access field information for specific categories.
    """
    
    def __init__(self):
        """Initialize FieldConfig and load configuration data."""
        self.config = self._load_field_config()

    def _load_field_config(self):
        """
        Load field configuration from the JSON file with error handling.
        
        Returns:
            dict: The loaded configuration or an empty dictionary if loading fails.
        """
        try:
            logger.info("Loading field configuration from: %s", Config.FIELD_CONFIG_FILE)
            
            if not os.path.exists(Config.FIELD_CONFIG_FILE):
                logger.error("Field configuration file not found: %s", Config.FIELD_CONFIG_FILE)
                return {}

            # Log file statistics for debugging purposes
            file_stats = os.stat(Config.FIELD_CONFIG_FILE)
            logger.info("File size: %s bytes", file_stats.st_size)
            logger.info("Last modified: %s", datetime.fromtimestamp(file_stats.st_mtime))

            with open(Config.FIELD_CONFIG_FILE, 'r') as f:
                config = json.load(f)

            logger.info("Number of categories loaded: %s", len(config))
            logger.info("Loaded category IDs: %s", list(config.keys()))
            return config

        except (IOError, json.JSONDecodeError) as e:
            logger.error("Error reading field configuration: %s", str(e))
            return {}
        except Exception as e:
            logger.error("Unexpected error loading field configuration: %s", str(e))
            return {}

    def get_category_fields(self, category_id):
        """
        Get active fields and their display names for a specific category.
        
        Args:
            category_id (int): The ID of the category to get fields for.
            
        Returns:
            list: A list of dictionaries containing active fields and their display names.
        """
        category_id_str = str(category_id)
        
        if not self.config:
            logger.warning("Configuration is empty")
            return []

        # Retrieve the configuration for the specified category and its fields
        category_config = self.config.get(category_id_str, {}).get('fields', {})

        # Filter and format only the active fields
        return [
            {'field': field_name, 'display': field_info['display']}
            for field_name, field_info in category_config.items()
            if field_info.get('used', False)
        ]
