/**
 * api.js - API communication functions for PADDY
 * 
 * This module handles all API interactions:
 * - fetchSortedData() - Fetches sorted table data
 * - fetchProductDetails() - Fetches product details for editing
 * - submitProductEdit() - Submits product edit data
 * - fetchFieldConfig() - Fetches field configuration for a category
 */

// Create a namespace for API functions
const api = (function() {
    'use strict';
    
    // Check for required dependencies
    if (typeof utils === 'undefined') {
      console.error('utils module is required for api.js');
    }
    
    /**
     * Fetch sorted data from API
     * @param {string} url - URL to fetch data from
     * @returns {Promise<Object>} - Promise with sorted data
     */
    async function fetchSortedData(url) {
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Received non-JSON response:', contentType);
          const text = await response.text();
          console.error('Response text:', text);
          throw new Error('Received non-JSON response');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    }
    
    /**
     * Fetch product details for editing
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} - Promise with product details
     */
    async function fetchProductDetails(productId) {
      if (!productId) {
        throw new Error('Invalid product ID');
      }
  
      try {
        const response = await fetch(`/product/${productId}/edit`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(errorText || 'Failed to fetch product details');
        }
        
        const data = await response.json();
        
        if (!data || !data.product) {
          console.error('Invalid response data', data);
          throw new Error('Invalid product data received');
        }
        
        return data;
      } catch (error) {
        console.error('Error fetching product details:', error);
        throw error;
      }
    }
    
    /**
     * Submit product edit data
     * @param {Object} productData - Updated product data
     * @returns {Promise<Object>} - Promise with update result
     */
    async function submitProductEdit(productData) {
      if (!productData || !productData.product_id) {
        throw new Error('Invalid product data or missing product ID');
      }
      
      const productId = productData.product_id;
      
      try {
        const updateResponse = await fetch(`/product/${productId}/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(productData)
        });
        
        const responseText = await updateResponse.text();
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Response parsing error:', { 
            error: parseError, 
            rawText: responseText 
          });
          throw new Error('Invalid response format from server');
        }
        
        if (!updateResponse.ok) {
          const errorDetails = responseData?.error || responseText || 'Unspecified server error';
          throw new Error(errorDetails);
        }
        
        // Wait for API sync
        await new Promise(resolve => setTimeout(resolve, 750));
        
        // Fetch updated product data
        const detailsResponse = await fetch(`/product/${productId}/edit`);
        
        if (!detailsResponse.ok) {
          throw new Error(`Failed to fetch updated details: ${detailsResponse.statusText}`);
        }
        
        const updatedData = await detailsResponse.json();
        
        if (!updatedData?.product) {
          throw new Error('Invalid or missing product data in response');
        }
        
        return {
          success: true,
          product: updatedData.product,
          message: responseData.message || 'Product updated successfully'
        };
      } catch (error) {
        console.error('Product update error:', error);
        throw error;
      }
    }
    
    /**
     * Fetch field configuration for a category
     * @param {string} categoryId - Category ID
     * @returns {Promise<Object>} - Promise with field configuration
     */
    async function fetchFieldConfig(categoryId) {
      try {
        // Try multiple potential paths
        const paths = [
          '/static/json/product_attributes.json',
          '/json/product_attributes.json'
        ];
        
        let productAttributes = null;
        
        for (const path of paths) {
          try {
            const response = await fetch(path);
            if (response.ok) {
              productAttributes = await response.json();
              break;
            }
          } catch (pathError) {
            console.warn(`Failed to fetch from ${path}:`, pathError);
          }
        }
        
        if (!productAttributes) {
          throw new Error('Could not fetch product attributes from any path');
        }
        
        if (productAttributes[categoryId]) {
          const categoryFieldConfig = productAttributes[categoryId].fields;
          console.log('Fetched field config:', categoryFieldConfig);
          return categoryFieldConfig;
        } else {
          console.error('No field configuration found for category:', categoryId);
          return null;
        }
      } catch (error) {
        console.error('Error fetching field config:', error);
        return null;
      }
    }
    
    /**
     * Search products using API
     * @param {string} filter - Search term
     * @param {string} categoryId - Category ID
     * @returns {Promise<Object>} - Promise with search results
     */
    async function searchProducts(filter, categoryId) {
      if (!filter || !categoryId) {
        throw new Error('Missing required search parameters');
      }
      
      try {
        const response = await fetch(`/api/search?category=${categoryId}&code=${encodeURIComponent(filter)}`);
        
        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.Data) {
          console.error('Invalid response format', data);
          throw new Error('Invalid response format');
        }
        
        return data;
      } catch (error) {
        console.error('Search error:', error);
        throw error;
      }
    }
    
    // Return public methods
    return {
      fetchSortedData,
      fetchProductDetails,
      submitProductEdit,
      fetchFieldConfig,
      searchProducts
    };
  })();
  
  // Export the api module (if module system is available)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }