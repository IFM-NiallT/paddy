import json
import os
from datetime import datetime
from .logger import logger
from .config import Config

class FieldConfig:
    """Handles field configuration and display name mapping."""
    
    def __init__(self):
        self.config = self._load_field_config()

    def _load_field_config(self):
        """Load field configuration from JSON file."""
        try:
            logger.info(f"Attempting to load field configuration from: {Config.FIELD_CONFIG_FILE}")

            if not os.path.exists(Config.FIELD_CONFIG_FILE):
                logger.error(f"Field configuration file NOT FOUND: {Config.FIELD_CONFIG_FILE}")
                return {}

            file_stats = os.stat(Config.FIELD_CONFIG_FILE)
            logger.info(f"File size: {file_stats.st_size} bytes")
            logger.info(f"Last modified: {datetime.fromtimestamp(file_stats.st_mtime)}")

            with open(Config.FIELD_CONFIG_FILE, 'r') as f:
                config = json.load(f)
                logger.info(f"Number of categories loaded: {len(config)}")
                logger.info(f"Loaded category IDs: {list(config.keys())}")
                return config

        except (IOError, json.JSONDecodeError) as e:
            logger.error(f"Error reading field configuration: {str(e)}")
            return {}
        except Exception as e:
            logger.error(f"Unexpected error loading field configuration: {str(e)}")
            return {}

    def get_category_fields(self, category_id):
        """Get active fields and their display names for a category."""
        category_id_str = str(category_id)
        if not self.config:
            logger.warning("Config is empty")
            return []

        category_config = self.config.get(category_id_str, {}).get('fields', {})
        return [
            {'field': field_name, 'display': field_info['display']}
            for field_name, field_info in category_config.items()
            if field_info.get('used', False)
        ]