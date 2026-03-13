
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const API_TIMEOUT  = parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
});

/* ─── Request interceptor — attach Bearer token ─────────────────── */
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

/* ─── Response interceptor — handle 401 globally ────────────────── */
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

/* ─── Shared error normaliser ────────────────────────────────────── */
const normaliseError = (error, fallbackMsg) => {
  if (error.message === 'Network Error') {
    return new Error(
      `Cannot connect to backend. Please ensure backend is running on ${API_BASE_URL.replace('/api', '')}`
    );
  }
  if (error.response?.status === 401) {
    return new Error('Unauthorised — please log in again.');
  }
  if (error.response?.status === 404) {
    return new Error(
      `API endpoint not found (404). Verify backend is running on ${API_BASE_URL.replace('/api', '')} ` +
      `and the endpoint exists.`
    );
  }
  if (error.response?.status === 500) {
    const details = error.response?.data?.details;
    if (details?.sapError) return new Error(`SAP Error: ${JSON.stringify(details.sapError)}`);
    if (details?.message)  return new Error(details.message);
    return new Error('Internal server error (500).');
  }
  return new Error(
    error.response?.data?.error ||
    error.message ||
    fallbackMsg
  );
};

/* ══════════════════════════════════════════════════════════════════
   moApprovalService
══════════════════════════════════════════════════════════════════ */
export const moApprovalService = {

  /**
   * GET /api/approval-order-details?OrderNumber=X&ObjectNumber=Y
   * Backend OData: MO_ORDER_STATUSSet filtered by Aufnr + ObjectNumber
   * Returns: Array of activity + history row objects
   */


  getNotificationData: async (fromDate, toDate) => {
    try {
      const response = await apiClient.get('/notification-data', {
        params: {
          fromDate,
          toDate
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ getNotificationData error:', error.message);
      throw normaliseError(error, 'Failed to fetch notification data');
    }
  },
  
  getMoOrderData: async (fromDate, toDate) => {
    try {
      const response = await apiClient.get('/mo-order-data', {
        params: {
          fromDate,
          toDate
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ getMoOrderData error:', error.message);
      throw normaliseError(error, 'Failed to fetch MO order data');
    }
  },


  getApprovelOrdersDetails: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.OrderNumber)  params.append('OrderNumber',  filters.OrderNumber);
      if (filters.ObjectNumber) params.append('ObjectNumber', filters.ObjectNumber);

      const queryString = params.toString();
      const url = `/approval-order-details${queryString ? `?${queryString}` : ''}`;

      console.log('🔍 Fetching order details from:', `${API_BASE_URL}${url}`);
      console.log('📋 Filters:', filters);

      const response = await apiClient.get(url);

      console.log('✅ Raw API Response:', response.data);

      // Normalise across different response shapes
      let activityData = [];
      if (response.data?.success === true && response.data?.data) {
        activityData = Array.isArray(response.data.data)
          ? response.data.data
          : [response.data.data];
      } else if (Array.isArray(response.data)) {
        activityData = response.data;
      } else if (response.data?.d?.results) {
        activityData = response.data.d.results;
      }

      console.log(`✅ Extracted ${activityData.length} activities from response`);
      return activityData;

    } catch (error) {
      console.error('❌ getApprovelOrdersDetails error:', {
        message:      error.message,
        status:       error.response?.status,
        statusText:   error.response?.statusText,
        url:          error.config?.url,
        responseData: error.response?.data,
      });
      throw normaliseError(error, 'Failed to fetch approval order details');
    }
  },

  /**
   * GET /api/maintenance-orders
   * Query params: orderNumber, plant, location, user, status
   */
  getMaintenanceOrders: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.orderNumber) params.append('orderNumber', filters.orderNumber);
      if (filters.plant)       params.append('plant',       filters.plant);
      if (filters.location)    params.append('location',    filters.location);
      if (filters.user)        params.append('user',        filters.user);
      if (filters.status)      params.append('status',      filters.status);

      const queryString = params.toString();
      const url = `/maintenance-orders${queryString ? `?${queryString}` : ''}`;

      console.log('🔍 Fetching maintenance orders from:', `${API_BASE_URL}${url}`);
      console.log('📋 Filters:', filters);

      const response = await apiClient.get(url);

      console.log('✅ Orders fetched successfully:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ getMaintenanceOrders error:', error.message);
      throw normaliseError(error, 'Failed to fetch maintenance orders');
    }
  },

  /**
   * GET /api/maintenance-orders/:orderNumber/:objectNumber
   */
  getOrderDetails: async (orderNumber, objectNumber) => {
    try {
      const response = await apiClient.get(`/maintenance-orders/${orderNumber}/${objectNumber}`);
      return response.data;
    } catch (error) {
      console.error('❌ getOrderDetails error:', error.message);
      throw normaliseError(error, 'Failed to fetch order details');
    }
  },

  /**
   * GET /api/approve-order/:orderNumber
   * Triggers SAP OData: MO_ORDER_STATUSS_GET_ENTITY('<orderNumber>')
   *
   * FIX SUMMARY:
   *   ✅ Accepts a plain string/number — NOT an object
   *   ✅ Validates it is a 10-digit string (route params are always strings)
   *   ✅ Removed dead `params` / `orderNumber2` variables
   *   ✅ Removed incorrect Array.isArray check
   */
  approveOrders: async (orderNumber) => {
    // ✅ Coerce to string and trim whitespace before validation
    const orderStr = String(orderNumber).trim();

    if (!orderStr || orderStr.length !== 12) {
      throw new Error(
        `Invalid order number "${orderStr}". Must be a 12-digit string.`
      );
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🔑 approveOrders called');
    console.log(`   OrderNumber: ${orderStr}`);
    console.log(`   Endpoint:    GET /approve-order/${orderStr}`);
    console.log('═══════════════════════════════════════════════════');

    try {
      const response = await apiClient.get(`/approve-order/${orderStr}`);

      console.log('✅ Approve API response:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ approveOrders error:', {
        message:      error.message,
        status:       error.response?.status,
        url:          error.config?.url,
        responseData: error.response?.data,
      });
      throw normaliseError(error, 'Failed to approve order');
    }
  },

  /**
   * GET /api/health
   */
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
  },
};

export default apiClient;

