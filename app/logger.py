"""
Logging Module for PADDY Application

Provides a centralized, configurable logging solution with 
support for console and file logging.
"""

import os
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime


class PaddyLogger:
    """
    Custom logger configuration for the PADDY application.
    
    Provides a centralized logging mechanism with:
      - Console output
      - Rotating file logging
      - Configurable log levels
    """
    
    @staticmethod
    def setup_logger(
        name='paddy', 
        log_dir='logs', 
        log_level=logging.INFO,
        max_file_size_bytes=10 * 1024 * 1024,  # 10 MB
        backup_count=5
    ):
        """
        Set up a comprehensive logging configuration.
        
        Args:
            name (str): Name of the logger.
            log_dir (str): Directory to store log files.
            log_level (int): Logging level (e.g., logging.INFO, logging.DEBUG).
            max_file_size_bytes (int): Maximum size of a log file before rotation.
            backup_count (int): Number of backup log files to keep.
        
        Returns:
            logging.Logger: Configured logger instance.
        """
        # Ensure the log directory exists
        os.makedirs(log_dir, exist_ok=True)
        
        # Create logger and set its level
        logger = logging.getLogger(name)
        logger.setLevel(log_level)
        
        # Clear any existing handlers to prevent duplicate logging
        logger.handlers.clear()
        
        # Define a formatter for log messages
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Configure console handler for outputting logs to the console
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        # Configure file handler with rotation
        log_filename = os.path.join(
            log_dir, 
            f'paddy_{datetime.now().strftime("%Y%m%d")}.log'
        )
        file_handler = RotatingFileHandler(
            log_filename, 
            maxBytes=max_file_size_bytes, 
            backupCount=backup_count
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        return logger


# Create a default logger instance
logger = PaddyLogger.setup_logger()


def set_log_level(level):
    """
    Dynamically set the logging level for the default logger.
    
    Args:
        level (int): Logging level (e.g., logging.INFO, logging.DEBUG).
    """
    logger.setLevel(level)
    for handler in logger.handlers:
        handler.setLevel(level)


def get_logger():
    """
    Retrieve the configured default logger instance.
    
    Returns:
        logging.Logger: The default logger.
    """
    return logger
