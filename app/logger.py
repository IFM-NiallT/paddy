"""
Logging Module

This module configures application-wide logging with rotation capabilities
and consistent formatting.
"""

import logging
from logging.handlers import RotatingFileHandler
import os
import time


class LoggerSetup:
    """
    Logger configuration class that handles logging setup and management.
    
    This class provides a centralized way to configure logging with rotation
    and consistent formatting across the application.
    
    Attributes:
        LOG_DIR (str): Directory for log files
        LOG_FILE (str): Name of the main log file
        MAX_BYTES (int): Maximum size of each log file
        BACKUP_COUNT (int): Number of backup files to maintain
    """
    
    LOG_DIR: str = 'logs'
    LOG_FILE: str = 'paddy.log'
    MAX_BYTES: int = 10000
    BACKUP_COUNT: int = 3
    
    @classmethod
    def setup_logging(cls) -> logging.Logger:
        """
        Configure and return a logger instance with rotation handling.
        
        Returns:
            logging.Logger: Configured logger instance
        """
        # Create logs directory if it doesn't exist
        if not os.path.exists(cls.LOG_DIR):
            os.makedirs(cls.LOG_DIR)
        
        # Configure logger
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.INFO)
        
        # Only add handler if it hasn't been added before
        if not logger.handlers:
            try:
                # Configure rotating file handler with delayed creation
                log_file = os.path.join(cls.LOG_DIR, cls.LOG_FILE)
                
                # Try to acquire file lock with retries
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        handler = RotatingFileHandler(
                            log_file,
                            maxBytes=cls.MAX_BYTES,
                            backupCount=cls.BACKUP_COUNT,
                            delay=True  # Delay file creation until first log
                        )
                        break
                    except PermissionError:
                        if attempt < max_retries - 1:
                            time.sleep(0.1)  # Wait briefly before retry
                        else:
                            # Fall back to console logging
                            return cls._setup_console_logger(logger)
                
                # Set formatter
                formatter = logging.Formatter(
                    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                )
                handler.setFormatter(formatter)
                logger.addHandler(handler)
                
            except Exception as e:
                return cls._setup_console_logger(logger, str(e))
        
        return logger

    @staticmethod
    def _setup_console_logger(
        logger: logging.Logger,
        error_msg: str = "Could not create log file"
    ) -> logging.Logger:
        """
        Set up console logging as a fallback.
        
        Args:
            logger (logging.Logger): Logger instance to configure
            error_msg (str): Error message to log
            
        Returns:
            logging.Logger: Configured logger instance
        """
        console_handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        logger.warning(f"{error_msg}. Falling back to console logging.")
        return logger


# Create logger instance
logger = LoggerSetup.setup_logging()