"""
Field Configuration Module

This module handles the loading and management of field configurations
for different product categories.
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from .logger import logger
from .config import Config


class FieldConfig:
    """
    Manages field configurations and display name mappings for product categories.
    
    This class handles loading and parsing field configurations from JSON files,
    and provides methods to access field information for specific categories.
    
    Attributes:
        config (Dict): Loaded field configuration data
    """
    
    def __init__(self):
        """Initialize FieldConfig and load configuration data."""
        self.config: Dict = self._load_field_config()

    def _load_field_config(self) -> Dict:
        """
        Load field configuration from JSON file with error handling.
        
        Returns:
            Dict: Loaded configuration or empty dict if loading fails
        """
        try:
            logger.info(
                f"Loading field configuration from: {Config.FIELD_CONFIG_FILE}"
            )

            if not os.path.exists(Config.FIELD_CONFIG_FILE):
                logger.error(
                    f"Field configuration file not found: {Config.FIELD_CONFIG_FILE}"
                )
                return {}

            # Log file statistics for debugging
            file_stats = os.stat(Config.FIELD_CONFIG_FILE)
            logger.info(f"File size: {file_stats.st_size} bytes")
            logger.info(
                f"Last modified: {datetime.fromtimestamp(file_stats.st_mtime)}"
            )

            with open(Config.FIELD_CONFIG_FILE, 'r') as f:
                config = json.load(f)
                
            # Log configuration summary
            logger.info(f"Number of categories loaded: {len(config)}")
            logger.info(f"Loaded category IDs: {list(config.keys())}")
            
            return config

        except (IOError, json.JSONDecodeError) as e:
            logger.error(f"Error reading field configuration: {str(e)}")
            return {}
        except Exception as e:
            logger.error(f"Unexpected error loading field configuration: {str(e)}")
            return {}

    def get_category_fields(self, category_id: int) -> List[Dict]:
        """
        Get active fields and their display names for a specific category.
        
        Args:
            category_id (int): ID of the category to get fields for
            
        Returns:
            List[Dict]: List of active fields with their display names
        """
        category_id_str = str(category_id)
        
        if not self.config:
            logger.warning("Configuration is empty")
            return []

        category_config = self.config.get(category_id_str, {}).get('fields', {})
        
        # Filter and format active fields
        return [
            {'field': field_name, 'display': field_info['display']}
            for field_name, field_info in category_config.items()
            if field_info.get('used', False)
        ]