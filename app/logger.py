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
    - Multi-target logging (console and files)
    - Separate files for general logs and error/critical logs
    - Automatic log file management
    - Flexible configuration options
    - Performance-oriented design

    Logging Targets:
    - Console: Real-time log output
    - General log file: INFO and WARNING logs
    - Error log file: ERROR and CRITICAL logs
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
        """
        # Ensure the log directory exists
        os.makedirs(log_dir, exist_ok=True)
        
        # Create logger and set its level
        logger = logging.getLogger(name)
        logger.setLevel(log_level)
        
        # Clear any existing handlers to prevent duplicate logging
        logger.handlers.clear()
        
        # Define log message formatters
        standard_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        detailed_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s\n'
            'File: %(pathname)s\n'
            'Function: %(funcName)s\n'
            'Line: %(lineno)d\n'
            'Process: %(process)d\n'
            'Thread: %(thread)d\n',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Configure console handler for real-time log output
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        console_handler.setFormatter(standard_formatter)
        logger.addHandler(console_handler)
        
        # Configure general log file handler (INFO and WARNING)
        general_log_filename = os.path.join(
            log_dir, 
            f'paddy_{datetime.now().strftime("%Y%m%d")}.log'
        )
        general_file_handler = RotatingFileHandler(
            general_log_filename, 
            maxBytes=max_file_size_bytes, 
            backupCount=backup_count
        )
        general_file_handler.setLevel(log_level)
        general_file_handler.setFormatter(standard_formatter)
        # Only handle INFO and WARNING levels
        general_file_handler.addFilter(lambda record: record.levelno <= logging.WARNING)
        logger.addHandler(general_file_handler)
        
        # Configure error log file handler (ERROR and CRITICAL)
        error_log_filename = os.path.join(
            log_dir, 
            f'paddy_error_{datetime.now().strftime("%Y%m%d")}.log'
        )
        error_file_handler = RotatingFileHandler(
            error_log_filename, 
            maxBytes=max_file_size_bytes, 
            backupCount=backup_count
        )
        error_file_handler.setLevel(logging.ERROR)
        error_file_handler.setFormatter(detailed_formatter)
        logger.addHandler(error_file_handler)
        
        return logger


# Create a default logger instance for application-wide use
logger = PaddyLogger.setup_logger()


def set_log_level(level):
    """
    Dynamically adjust the logging level across all handlers.
    
    Args:
        level (int): Logging level constant (e.g., logging.INFO, logging.DEBUG)
    """
    logger.setLevel(level)
    for handler in logger.handlers:
        if isinstance(handler, logging.StreamHandler) or \
           isinstance(handler, RotatingFileHandler):
            handler.setLevel(level)


def get_logger():
    """
    Retrieve the default configured logger instance.
    
    Returns:
        logging.Logger: The default PADDY application logger
    
    Example Usage:
        from app.logger import get_logger
        log = get_logger()
        
        # General logging
        log.info("Application started")
        log.warning("Resource usage at 80%")
        
        # Error logging (goes to separate file)
        log.error("Database connection failed", exc_info=True)
        log.critical("System shutdown required", exc_info=True)
    """
    return logger