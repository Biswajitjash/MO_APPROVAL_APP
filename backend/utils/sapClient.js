import axios from 'axios';
import https from 'https';
import csrfTokenManager from './csrfTokenManager.js';
import dotenv from 'dotenv';
dotenv.config();


class SapClient {
  constructor() {
    this.baseURL = process.env.SAP_BASE_URL;
    this.servicePath = process.env.SAP_ODATA_SERVICE_PATH;
    
    // Validate configuration
    if (!this.baseURL) {
      throw new Error('SAP_BASE_URL is not configured in .env file');
    }
    if (!this.servicePath) {
      throw new Error('SAP_ODATA_SERVICE_PATH is not configured in .env file');
    }

    console.log('🔧 Initializing SAP Client with:');
    console.log('   Base URL:', this.baseURL);
    console.log('   Service Path:', this.servicePath);
    
    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: this.baseURL + this.servicePath, // FIXED: Combine base URL and service path
      timeout: 30000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: process.env.SSL_REJECT_UNAUTHORIZED === 'true'
      })
    });

    // Add request interceptor
    this.client.interceptors.request.use(
      async (config) => await this.handleRequest(config),
      (error) => Promise.reject(error)
    );

    // Add response interceptor
    this.client.interceptors.response.use(
      (response) => this.handleResponse(response),
      async (error) => await this.handleError(error)
    );
  }

  /**
   * Request interceptor - add CSRF token and cookies
   */
  async handleRequest(config) {
    try {
      const method = config.method?.toLowerCase();

      // Always add basic auth and SAP client
      config.auth = {
        username: process.env.SAP_USERNAME,
        password: process.env.SAP_PASSWORD
      };
      config.headers['sap-client'] = process.env.SAP_CLIENT || '100';

      // For GET requests, no CSRF token needed
      if (method === 'get') {
        if (process.env.LOG_LEVEL === 'debug') {
          console.log(`📤 GET Request: ${config.url}`);
        }
        return config;
      }

      // For POST, PUT, PATCH, DELETE - add CSRF token
      const { token, cookies } = await csrfTokenManager.getToken();

      config.headers['X-CSRF-Token'] = token;
      config.headers['Cookie'] = cookies;
      config.headers['Content-Type'] = 'application/json';

      if (process.env.LOG_LEVEL === 'debug') {
        console.log(`📤 ${method?.toUpperCase()} Request: ${config.url}`);
        console.log(`  CSRF Token: ${token?.substring(0, 20)}...`);
      }

      return config;

    } catch (error) {
      console.error('❌ Request interceptor error:', error.message);
      return Promise.reject(error);
    }
  }

  /**
   * Response interceptor - handle successful responses
   */
  handleResponse(response) {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`✅ Response: ${response.config.url} - Status: ${response.status}`);
    }
    return response;
  }

  /**
   * Error interceptor - handle errors and retry logic
   */
  async handleError(error) {
    const originalRequest = error.config;

    // Log error details
    console.error('❌ SAP Client Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message
    });

    // If CSRF token is invalid (403), refresh and retry once
    if (error.response?.status === 403 && !originalRequest._retry) {
      console.log('⚠️  CSRF token might be invalid, refreshing...');
      
      originalRequest._retry = true;
      csrfTokenManager.invalidateToken();

      try {
        const { token, cookies } = await csrfTokenManager.getToken();
        
        originalRequest.headers['X-CSRF-Token'] = token;
        originalRequest.headers['Cookie'] = cookies;

        console.log('🔄 Retrying request with new CSRF token...');
        return this.client(originalRequest);

      } catch (retryError) {
        console.error('❌ Retry failed:', retryError.message);
        return Promise.reject(retryError);
      }
    }

    return Promise.reject(error);
  }

  /**
   * Execute GET request
   */
  async get(endpoint, config = {}) {
    // Endpoint should start with / or be full path
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return this.client.get(url, config);
  }

  /**
   * Execute POST request (with CSRF token)
   */
  async post(endpoint, data, config = {}) {
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return this.client.post(url, data, config);
  }

  /**
   * Execute PUT request (with CSRF token)
   */
  async put(endpoint, data, config = {}) {
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return this.client.put(url, data, config);
  }

  /**
   * Execute PATCH request (with CSRF token)
   */
  async patch(endpoint, data, config = {}) {
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return this.client.patch(url, data, config);
  }

  /**
   * Execute DELETE request (with CSRF token)
   */
  async delete(endpoint, config = {}) {
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return this.client.delete(url, config);
  }

  /**
   * Get CSRF token info (for debugging)
   */
  getTokenInfo() {
    return csrfTokenManager.getTokenInfo();
  }

  /**
   * Force CSRF token refresh
   */
  async refreshToken() {
    return csrfTokenManager.refreshToken();
  }

  /**
   * Get full URL for debugging
   */
  getFullUrl(endpoint) {
    return `${this.baseURL}${this.servicePath}${endpoint}`;
  }
}

// Export singleton instance
export default new SapClient();
