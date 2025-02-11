"""
Logging Module for PADDY Application

Provides a comprehensive, flexible logging solution designed to:
- Support detailed application monitoring
- Manage log file rotation
- Provide configurable logging levels
- Ensure consistent logging across the application

Key Features:
- Console and file-based logging
- Automatic log file rotation
- Dynamic log level configuration
- Date-stamped log files
- Configurable log retention

This module serves as the central logging mechanism for the PADDY application,
offering robust logging capabilities with minimal configuration overhead.

***
Author: Luke Doyle - 2025 Intern
"""

import os
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime


class PaddyLogger:
    """
    Advanced logging configuration for the PADDY application.
    
    Provides a sophisticated logging system with:
    - Multi-target logging (console and file)
    - Automatic log file management
    - Flexible configuration options
    - Performance-oriented design

    Logging Targets:
    - Console: Real-time log output
    - File: Persistent log storage with rotation
    
    Attributes:
        Default logging configuration optimized for development and production use
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
        Initialize a comprehensive logger with multiple handlers.
        
        Configures logging with advanced features:
        - Creates log directory if not exists
        - Sets up console and file logging
        - Implements log rotation
        - Provides consistent log formatting
        
        Args:
            name (str): Identifier for the logger. Defaults to 'paddy'.
            log_dir (str): Directory for storing log files. Defaults to 'logs'.
            log_level (int): Logging verbosity level. Defaults to INFO.
            max_file_size_bytes (int): Maximum log file size before rotation. 
                Defaults to 10 MB.
            backup_count (int): Number of rotated log files to retain. 
                Defaults to 5.
        
        Returns:
            logging.Logger: Fully configured logger instance
        
        Logging Configuration Details:
        - Log format includes timestamp, logger name, log level, and message
        - Console handler for immediate visibility
        - File handler with date-stamped filename
        - Supports dynamic log level adjustment
        
        Example Log Message:
        '2025-02-11 15:30:45 - paddy - INFO - Application started'
        """
        # Ensure the log directory exists
        os.makedirs(log_dir, exist_ok=True)
        
        # Create logger and set its level
        logger = logging.getLogger(name)
        logger.setLevel(log_level)
        
        # Clear any existing handlers to prevent duplicate logging
        logger.handlers.clear()
        
        # Define a comprehensive log message formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Configure console handler for real-time log output
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        # Configure file handler with advanced rotation
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


# Create a default logger instance for application-wide use
logger = PaddyLogger.setup_logger()


def set_log_level(level):
    """
    Dynamically adjust the logging level across all handlers.
    
    Allows runtime modification of logging verbosity:
    - Useful for debugging
    - Can increase or decrease log detail
    - Applies change to all logger handlers
    
    Args:
        level (int): Logging level constant (e.g., logging.INFO, logging.DEBUG)
    
    Example Usage:
        set_log_level(logging.DEBUG)  # Enable verbose logging
        set_log_level(logging.ERROR)  # Log only critical errors
    """
    logger.setLevel(level)
    for handler in logger.handlers:
        handler.setLevel(level)


def get_logger():
    """
    Retrieve the default configured logger instance.
    
    Provides a consistent way to access the application's logger.
    
    Returns:
        logging.Logger: The default PADDY application logger
    
    Recommended Usage:
        from app.logger import get_logger
        log = get_logger()
        log.info("Starting application")
    """
    return logger