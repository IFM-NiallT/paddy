# PADDY (Product Attribute Designer Deployment for You)

## Overview
PADDY is a robust Flask web application designed for comprehensive product management, providing an intuitive interface for browsing, filtering, and editing product categories and attributes through seamless API integration.

## Key Features
- 🔍 Dynamic product category browsing
- 🔢 Sortable and paginated product listings
- 🛠️ Dynamic field configuration based on product categories
- 🔐 Secure API communication with token-based authentication
- 📝 Comprehensive product attribute editing
- 🚨 Advanced error handling and logging

## Architecture
PADDY is built with a modular architecture, consisting of several key components:

### Main Components
1. **Flask Application (`PaddyApp`)**: 
   - Handles routing and request processing
   - Manages API interactions
   - Provides user interface routes

2. **API Client (`APIClient`)**: 
   - Manages API communication
   - Implements robust error handling
   - Supports caching and request optimization

3. **Field Configuration (`FieldConfig`)**: 
   - Dynamically loads product category field configurations
   - Supports flexible field display and management

4. **Logging System**: 
   - Provides comprehensive logging
   - Supports console and file-based logging
   - Implements log rotation

## Requirements
- Python 3.8+
- pip

## Configuration
Configuration is managed through the `Config` class, supporting:
- Environment variable overrides
- Secure default values
- Directory management

### Key Configuration Options
- `API_BASE_URL`: Base URL for API endpoints
- `BEARER_TOKEN`: Authentication token
- `REQUEST_TIMEOUT`: Default API request timeout

## Installation
```bash
# Clone the repository
git clone https://github.com/IFM-NiallT/paddy

# Change directory
cd paddy

# Install dependencies
pip install -r requirements.txt

# Run PADDY
python paddy.py
```

## Configuration Details

### Environment Variables
The application supports the following environment variables:

| Variable         | Description                                      | Default Value               | Required |
|------------------|--------------------------------------------------|-----------------------------|----------|
| `API_BASE_URL`   | Base URL for the API endpoint                    | `API URL` | Yes      |
| `BEARER_TOKEN`   | Authentication token for API access             | `API Bearer Token` (empty string)         | Yes      |
| `REQUEST_TIMEOUT`| Timeout duration for API requests (in seconds)  | `15`                         | No       |

### Configuration Validation
The application performs automatic configuration validation:
- Checks API Base URL format
- Verifies Bearer Token presence
- Ensures request timeout is within acceptable range

### JSON Configuration Files
The application uses JSON files for configuration:
- `json/categories.json`: Cached product categories
- `json/product_attributes.json`: Product field configurations

## API Interaction

### Supported Operations
- Fetch product categories
- List products with pagination and sorting
- Retrieve product details
- Update product attributes

### Authentication
- Token-based authentication
- Bearer token passed in request headers
- Secure API communication

### Logging
- Logs are stored in the `logs/` directory
- Log files are rotated daily
- Supports configurable log levels (`DEBUG`, `INFO`, `WARNING`, `ERROR`)

## Development

### Logging Level Management
```python
from app.logger import set_log_level
import logging

# Set to debug mode
set_log_level(logging.DEBUG)
```

## Advanced Usage

### Customizing Field Configurations
Modify `json/product_attributes.json` to:
- Add new fields
- Configure field display names
- Set field usage flags

### Extending API Client
The `APIClient` class can be extended to:
- Add custom request methods
- Implement additional caching strategies
- Enhance error handling

## Troubleshooting

### Common Issues

#### API Connection Errors
- Verify `API_BASE_URL` is correct
- Check Bearer Token validity
- Ensure network connectivity

#### Configuration Validation Failures
- Confirm environment variables are set correctly
- Check token length and format
- Validate request timeout settings

#### Logging Problems
- Verify `logs/` directory exists and is writable
- Check file permissions
- Monitor log rotation

## Performance Considerations
- Implements request caching
- Supports pagination to manage large datasets
- Configurable request timeout
- Lightweight Flask application

## Security Notes
- Use environment variables for sensitive information
- Implement additional authentication layers if needed
- Regularly rotate API tokens
- Monitor and log API interactions

## Monitoring
- Comprehensive logging system
- Detailed error tracking
- Performance metric collection

## Scaling Considerations
- Stateless design supports horizontal scaling
- Configurable request handling
- Minimal runtime dependencies

## Support
For issues or questions, please:
- Check the documentation
- Review log files
- Open a GitHub issue
- Contact the maintainer

## Contributing Guidelines
- Follow PEP 8 style guidelines
- Write comprehensive tests
- Update documentation
- Ensure all tests pass before merging to Main

## Error Handling
PADDY implements comprehensive error handling:
- 404 Not Found errors
- 500 Internal Server errors
- API communication errors
- Configuration validation errors

## Author
Luke Doyle - 2025 Intern