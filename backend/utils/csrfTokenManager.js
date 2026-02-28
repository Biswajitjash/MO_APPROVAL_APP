import axios from 'axios';
import https from 'https';

class CsrfTokenManager {
  constructor() {
    this.token = null;
    this.cookies = null;
    this.tokenExpiry = null;
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  /**
   * Get valid CSRF token (fetch new one if expired or missing)
   */
  async getToken() {
    // If token is still valid, return it
    if (this.isTokenValid()) {
      console.log('✓ Using cached CSRF token');
      return {
        token: this.token,
        cookies: this.cookies
      };
    }

    // If already refreshing, wait for that refresh to complete
    if (this.isRefreshing) {
      console.log('⏳ Waiting for ongoing token refresh...');
      return this.refreshPromise;
    }

    // Fetch new token
    return this.refreshToken();
  }

  /**
   * Check if current token is still valid
   */
  isTokenValid() {
    if (!this.token || !this.cookies || !this.tokenExpiry) {
      return false;
    }

    // Check if token has expired (with 5 minute buffer)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    return now < (this.tokenExpiry - bufferTime);
  }

  /**
   * Fetch new CSRF token from SAP
   */
  async refreshToken() {
    this.isRefreshing = true;
    
    this.refreshPromise = (async () => {
      try {
        console.log('🔄 Fetching new CSRF token from SAP...');

        const url = `${process.env.SAP_BASE_URL}${process.env.SAP_CSRF_TOKEN_ENDPOINT}`;

        const response = await axios.get(url, {
          auth: {
            username: process.env.SAP_USERNAME,
            password: process.env.SAP_PASSWORD
          },
          headers: {
            'X-CSRF-Token': 'Fetch',
            'sap-client': process.env.SAP_CLIENT || '400'
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: process.env.SSL_REJECT_UNAUTHORIZED === 'true'
          }),
          timeout: 10000
        });

        // Extract CSRF token from response headers
        this.token = response.headers['x-csrf-token'];
        
        // Extract cookies from response
        const setCookieHeaders = response.headers['set-cookie'];
        if (setCookieHeaders) {
          this.cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
        }

        // Set expiry time
        const cacheDuration = parseInt(process.env.CSRF_TOKEN_CACHE_DURATION) || 3600000;
        this.tokenExpiry = Date.now() + cacheDuration;

        console.log('✓ CSRF token fetched successfully');
        console.log(`  Token: ${this.token?.substring(0, 20)}...`);
        console.log(`  Expires in: ${cacheDuration / 1000 / 60} minutes`);

        return {
          token: this.token,
          cookies: this.cookies
        };

      } catch (error) {
        console.error('❌ Failed to fetch CSRF token:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText
        });

        // Clear cached values on error
        this.token = null;
        this.cookies = null;
        this.tokenExpiry = null;

        throw new Error(`CSRF token fetch failed: ${error.message}`);

      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Invalidate current token (force refresh on next request)
   */
  invalidateToken() {
    console.log('🗑️  Invalidating CSRF token');
    this.token = null;
    this.cookies = null;
    this.tokenExpiry = null;
  }

  /**
   * Get token info for debugging
   */
  getTokenInfo() {
    return {
      hasToken: !!this.token,
      hasCookies: !!this.cookies,
      isValid: this.isTokenValid(),
      expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
      expiresIn: this.tokenExpiry ? Math.max(0, this.tokenExpiry - Date.now()) : 0
    };
  }
}

// Export singleton instance
export default new CsrfTokenManager();