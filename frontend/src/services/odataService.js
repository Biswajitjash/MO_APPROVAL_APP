import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 errors (redirect to login)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const moApprovalService = {

  /**
   * Get Approval Orders Details
   * Calls: GET /api/approval-order-details?OrderNumber=X&ObjectNumber=Y
   * Backend OData Service: MO_ORDER_STATUSSet filtered by Aufnr and ObjectNumber
   * Returns: Array of activity objects
   */
  getApprovelOrdersDetails: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.OrderNumber) params.append('OrderNumber', filters.OrderNumber);
      if (filters.ObjectNumber) params.append('ObjectNumber', filters.ObjectNumber);

      const queryString = params.toString();
      const url = `/approval-order-details${queryString ? `?${queryString}` : ''}`;
      
      console.log('🔍 Fetching order details from:', `${API_BASE_URL}${url}`);
      console.log('📋 Filters:', filters);
      
      const response = await apiClient.get(url);
      
      console.log('✅ Raw API Response:', response.data);
      
      // Extract the actual data from response wrapper
      let activityData = [];
      
      // Handle different response formats from backend
      if (response.data?.success === true && response.data?.data) {
        // Format: { success: true, data: [...], count: 3 }
        activityData = Array.isArray(response.data.data) 
          ? response.data.data 
          : [response.data.data];
      } else if (Array.isArray(response.data)) {
        // Direct array format
        activityData = response.data;
      } else if (response.data?.d?.results) {
        // OData format: response.data.d.results
        activityData = response.data.d.results;
      }
      
      console.log(`✅ Successfully extracted ${activityData.length} activities from response`);
      
      return activityData; // Return array only
      
    } catch (error) {
      console.error('❌ Error in getApprovelOrdersDetails:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        responseData: error.response?.data
      });

      if (error.message === 'Network Error') {
        throw new Error(
          'Cannot connect to backend. Please ensure backend is running on ' + 
          API_BASE_URL.replace('/api', '')
        );
      }
      
      if (error.response?.status === 500) {
        const details = error.response?.data?.details;
        let message = 'Server error occurred';
        
        if (details?.sapError) {
          message = `SAP Error: ${JSON.stringify(details.sapError)}`;
        } else if (details?.message) {
          message = details.message;
        }
        
        throw new Error(message);
      }

      if (error.response?.status === 404) {
        throw new Error(
          `API endpoint not found (404). Please verify:\n` +
          `1. Backend is running on ${API_BASE_URL.replace('/api', '')}\n` +
          `2. Endpoint /api/approval-order-details exists\n` +
          `3. Check server.js for endpoint configuration`
        );
      }
      
      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Failed to fetch approval order details'
      );
    }
  },

  getMaintenanceOrders: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.orderNumber) params.append('orderNumber', filters.orderNumber);
      if (filters.plant) params.append('plant', filters.plant);
      if (filters.location) params.append('location', filters.location);
      if (filters.user) params.append('user', filters.user);
      if (filters.status) params.append('status', filters.status);

      const queryString = params.toString();
      const url = `/maintenance-orders${queryString ? `?${queryString}` : ''}`;
      
      console.log('🔍 Fetching maintenance orders from:', `${API_BASE_URL}${url}`);
      console.log('📋 Filters:', filters);
      
      const response = await apiClient.get(url);
      
      console.log('✅ Orders fetched successfully:', response.data);
      
      return response.data;
    } catch (error) {
      if (error.message === 'Network Error') {
        throw new Error(
          'Cannot connect to backend. Please ensure backend is running on ' + 
          API_BASE_URL.replace('/api', '')
        );
      }
      
      if (error.response?.status === 500) {
        const details = error.response?.data?.details;
        let message = 'Server error occurred';
        
        if (details?.sapError) {
          message = `SAP Error: ${JSON.stringify(details.sapError)}`;
        } else if (details?.message) {
          message = details.message;
        }
        
        throw new Error(message);
      }
      
      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Failed to fetch maintenance orders'
      );
    }
  },

  getOrderDetails: async (orderNumber, objectNumber) => {
    try {
      const response = await apiClient.get(`/maintenance-orders/${orderNumber}/${objectNumber}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || 
        error.message ||
        'Failed to fetch order details'
      );
    }
  },

  approveOrders: async (orderNumbers) => {
    try {
      if (!Array.isArray(orderNumbers) || orderNumbers.length === 0) {
        throw new Error('Invalid order numbers provided');
      }
      
      const response = await apiClient.post('/maintenance-orders/approve', {
        orders: orderNumbers
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || 
        error.message ||
        'Failed to approve orders'
      );
    }
  },

  rejectOrders: async (orderNumbers, reason = '') => {
    try {
      if (!Array.isArray(orderNumbers) || orderNumbers.length === 0) {
        throw new Error('Invalid order numbers provided');
      }
      
      const response = await apiClient.post('/maintenance-orders/reject', {
        orders: orderNumbers,
        reason: reason
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || 
        error.message ||
        'Failed to reject orders'
      );
    }
  },

  healthCheck: async () => {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      if (error.message === 'Network Error') {
        throw new Error('Backend service is not available');
      }
      throw new Error('Backend health check failed');
    }
  }
};

export default apiClient;