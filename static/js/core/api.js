/**
 * api.js - API communication functions for PADDY
 * 
 * This module handles all API interactions:
 * - fetchSortedData() - Fetches sorted table data
 * - fetchProductDetails() - Fetches product details for editing
 * - submitProductEdit() - Submits product edit data
 * - fetchFieldConfig() - Fetches field configuration for a category
 */

import { utils } from './utils.js';

// Create a namespace for API functions
export const api = (function() {
    'use strict';
    
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
        console.log(`Response status: ${response.status}`);
        
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
 * Submits product update to the API
 * @param {Object} productData - Updated product data
 * @returns {Promise<Object>} - API response
 */
async function submitProductEdit(productData) {
  if (!productData || !productData.product_id) {
    console.error('Invalid product data provided');
    return { success: false, message: 'Invalid product data' };
  }

  const productId = productData.product_id;
  delete productData.product_id; // Remove from payload as it's in the URL

  try {
    // Create a clean copy of the data to avoid modifying the original
    const payload = JSON.parse(JSON.stringify(productData));
    
    // Log the payload being sent (for debugging)
    console.log('Submitting product edit:', {
      productId,
      payload: JSON.stringify(payload, null, 2)
    });

    const response = await fetch(`/product/${productId}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Product update API error:', errorData);
      return {
        success: false,
        message: errorData.error || `Server error: ${response.status}`
      };
    }

    const result = await response.json();
    
    if (result.error) {
      return { success: false, message: result.error };
    }
    
    return { 
      success: true, 
      message: result.message || 'Product updated successfully',
      product: result.product || null,
      current_status: result.current_status,
      is_available: result.is_available
    };
  } catch (error) {
    console.error('Error submitting product edit:', error);
    return { success: false, message: error.message };
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
  
// Expose API functions globally for backward compatibility
window.fetchSortedData = api.fetchSortedData;
window.fetchProductDetails = api.fetchProductDetails;
window.submitProductEdit = api.submitProductEdit;
window.fetchFieldConfig = api.fetchFieldConfig;
window.searchProducts = api.searchProducts;
window.api = api;

// Export the api module (if CommonJS module system is available)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { api };
}