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
import re
from logging.handlers import RotatingFileHandler
from datetime import datetime
from collections import defaultdict


class AssetLoggingFilter(logging.Filter):
    """
    Advanced logging filter that consolidates asset load logs by type
    while preserving detailed logs for errors (404s).
    """
    
    def __init__(self):
        super().__init__()
        # Track assets by type for summarization
        self.asset_counts = defaultdict(int)
        self.reported_counts = defaultdict(int)
        
        # Regular expressions for identifying request types
        self.asset_patterns = {
            'CSS': re.compile(r'/static/css/.*\.css', re.IGNORECASE),
            'JavaScript': re.compile(r'/static/js/.*\.js', re.IGNORECASE),
            'Image': re.compile(r'/static/img/.*\.(jpg|jpeg|png|gif|svg|ico|webp)', re.IGNORECASE),
            'JSON': re.compile(r'/static/json/.*\.json', re.IGNORECASE),
            'Font': re.compile(r'/static/fonts/.*\.(ttf|woff|woff2|eot)', re.IGNORECASE),
        }
        
        # Pattern to extract status code
        self.status_pattern = re.compile(r'"[^"]*"\s+(\d+)')
        
        # Last report time for throttling summaries
        self.last_report_time = datetime.now()
        self.report_interval = 1  # seconds
        
        # Error tracking
        self.missing_files = set()
    
    def _get_asset_type(self, msg):
        """Determine asset type from request URL."""
        for asset_type, pattern in self.asset_patterns.items():
            if pattern.search(msg):
                return asset_type
        return None

    def _extract_file_path(self, msg):
        """Extract file path from log message."""
        match = re.search(r'GET\s+(/\S+)\s+HTTP', msg)
        if match:
            return match.group(1)
        return None
    
    def _extract_status_code(self, msg):
        """Extract HTTP status code from log message."""
        match = self.status_pattern.search(msg)
        if match:
            return match.group(1)
        return None
    
    def _should_report_summary(self):
        """Determine if it's time to report asset summary."""
        now = datetime.now()
        time_diff = (now - self.last_report_time).total_seconds()
        if time_diff >= self.report_interval:
            self.last_report_time = now
            return True
        return False
    
    def filter(self, record):
        # Skip processing for non-HTTP request logs
        if not hasattr(record, 'msg') or not isinstance(record.msg, str) or 'HTTP/1.' not in record.msg:
            return True
        
        # Get asset type and status code
        asset_type = self._get_asset_type(record.msg)
        if not asset_type:
            return True  # Not an asset request, keep the log
        
        file_path = self._extract_file_path(record.msg)
        status_code = self._extract_status_code(record.msg)
        
        if not status_code:
            return True  # Can't determine status, keep the log
        
        # Always log 404 errors with path info
        if status_code == '404':
            if file_path:
                self.missing_files.add(file_path)
            return True
        
        # For successful requests (200, 304), increment counter
        if status_code in ('200', '304'):
            self.asset_counts[asset_type] += 1
            
            # Check if we should report summary
            if self._should_report_summary():
                # Report missing files if any
                if self.missing_files:
                    for missing_file in self.missing_files:
                        missing_record = logging.LogRecord(
                            name=record.name,
                            level=logging.WARNING,
                            pathname=record.pathname,
                            lineno=record.lineno,
                            msg=f"404 error: {missing_file}",
                            args=(),
                            exc_info=None
                        )
                        logging.getLogger(record.name).handle(missing_record)
                    self.missing_files.clear()
                
                # Report consolidated counts for asset types with new loads
                for asset_name, count in self.asset_counts.items():
                    if count > self.reported_counts[asset_name]:
                        # Create a new record for the summary
                        new_record = logging.LogRecord(
                            name=record.name,
                            level=record.levelno,
                            pathname=record.pathname,
                            lineno=record.lineno,
                            msg=f"{count} {asset_name} Files Loaded",
                            args=(),
                            exc_info=None
                        )
                        self.reported_counts[asset_name] = count
                        logging.getLogger(record.name).handle(new_record)
            
            # Suppress individual asset logs
            return False
        
        # For other status codes, keep the log
        return True


class PaddyLogger:
    """
    Advanced logging configuration for the PADDY application.
    
    Provides a sophisticated logging system with:
    - Multi-target logging (console and files)
    - Separate files for general logs and error/critical logs
    - Automatic log file management
    - Asset request consolidation
    - Flexible configuration options
    - Performance-oriented design

    Logging Targets:
    - Console: Real-time log output with asset request consolidation
    - General log file: INFO and WARNING logs
    - Error log file: ERROR and CRITICAL logs
    """
    
    @staticmethod
    def setup_logger(
        name='paddy', 
        log_dir='logs', 
        log_level=logging.DEBUG,
        max_file_size_bytes=10 * 1024 * 1024,  # 10 MB
        backup_count=5,
        consolidate_assets=True
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
            consolidate_assets (bool): Whether to consolidate asset request logs.
                Defaults to True.
        
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
        
        # Configure Flask's werkzeug logger to use our filters
        werkzeug_logger = logging.getLogger('werkzeug')
        werkzeug_logger.setLevel(log_level)
        werkzeug_logger.handlers.clear()
        
        # Configure console handler for real-time log output
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        console_handler.setFormatter(standard_formatter)
        
        # Add asset consolidation filter if enabled
        if consolidate_assets:
            asset_filter = AssetLoggingFilter()
            console_handler.addFilter(asset_filter)
            
        logger.addHandler(console_handler)
        
        # Add the same console handler to werkzeug logger
        werkzeug_logger.addHandler(console_handler)
        
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
        
        # Add asset consolidation filter to file handler if enabled
        if consolidate_assets:
            general_file_handler.addFilter(asset_filter)
            
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
        
        # Log initial setup
        logger.info(
            "Logger initialized with asset consolidation %s", 
            "enabled" if consolidate_assets else "disabled"
        )
        
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