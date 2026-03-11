import express from 'express';
import cors    from 'cors';
import dotenv  from 'dotenv';
import sapClient   from './utils/sapClient.js';
import authRoutes  from './routes/authRoutes.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3001;

/* ══════════════════════════════════════════════════════════════════
   CORS
══════════════════════════════════════════════════════════════════ */
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'https://amwebdisp.ampl.in:44310',
      'https://amwebdisp.ampl.in:44320',
      'https://amwebdisp.ampl.in:44330',
      'https://mo-approval-backend.onrender.com',
      'https://mo-approval.vercel.app',
    ];

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/* ══════════════════════════════════════════════════════════════════
   MIDDLEWARE
══════════════════════════════════════════════════════════════════ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/* ══════════════════════════════════════════════════════════════════
   ENV VALIDATION
══════════════════════════════════════════════════════════════════ */
const requiredEnvVars = [
  'SAP_BASE_URL',
  'SAP_USERNAME',
  'SAP_PASSWORD',
  'SAP_ODATA_SERVICE_PATH',
  'SAP_CLIENT',
  'FRONTEND_URL',
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  requiredEnvVars.forEach(v =>
    console.error(`  - ${v}: ${process.env[v] ? '✓ Set' : '✗ Missing'}`)
  );
}

/* ══════════════════════════════════════════════════════════════════
   API ENDPOINTS
══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/maintenance-orders
 * Fetch maintenance orders with optional filters.
 * Query params: plant, location, user, orderNumber, status
 * OData Service: MO_APPROVAL_HEADERSet
 */
app.get('/api/maintenance-orders', async (req, res) => {
  try {
    const { plant, location, user, orderNumber, status } = req.query;

    const filterParts = [];
    if (orderNumber) filterParts.push(`OrderNumber eq '${orderNumber}'`);
    if (plant)       filterParts.push(`Plant eq '${plant}'`);
    if (location)    filterParts.push(`FunctionalLocation eq '${location}'`);
    if (user)        filterParts.push(`ApproverUsername eq '${user}'`);
    if (status)      filterParts.push(`Status eq '${status}'`);

    const filterQuery = filterParts.length > 0
      ? `?$format=json&$filter=${filterParts.join(' and ')}`
      : '?$format=json';

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🔍 GET /api/maintenance-orders');
    console.log(`   Filter: ${filterQuery}`);
    console.log(`   SAP: MO_APPROVAL_HEADERSet${filterQuery}`);

    const response = await sapClient.get(`ZGW_MO_APPROVAL_SRV/MO_APPROVAL_HEADERSet${filterQuery}`);
    const results  = response.data.d?.results || [];

    console.log(`✅ Success: Fetched ${results.length} order(s)`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    res.json({
      success:   true,
      data:      results,
      count:     results.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════');
    console.error('❌ ERROR in GET /api/maintenance-orders');
    console.error('Message:', error.message);
    console.error('Status:',  error.response?.status);
    console.error('═══════════════════════════════════════════════════');
    console.error('');

    res.status(error.response?.status || 500).json({
      success:    false,
      error:      error.message,
      details:    error.response?.data,
      statusCode: error.response?.status,
    });
  }
});




/**
 * GET /api/notification-data
 * Fetch notification data.
 */
app.get('/api/notification-data', async (req, res) => {
  try {
    
    const { fromDate, toDate } = req.query;

    // Build filter query
    const filterQuery = `?$filter=qmdat ge datetime'${fromDate}' and qmdat le datetime'${toDate}'`
                      + `&$orderby=qmdat desc,qmnum desc &$format=json`;

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🔍 GET /api/notification-data');
    console.log(`   From    : ${fromDate}`);
    console.log(`   To      : ${toDate}`);
    console.log(`   SAP     : Notifications${filterQuery}`);
    console.log('═══════════════════════════════════════════════════');


    const response = await sapClient.get(`ZSB_MO_NOTIFICATIONS/Notifications${filterQuery}`);
    // const results  = response.data?.d?.results || [];
    const results  = response?.data || [];

    console.log(`✅ Success: Fetched ${results.length} notification(s)`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    res.json({
      success:   true,
      data:      results,
      count:     results.length,
      timestamp: new Date().toISOString(),
    });
    
    // Implementation for fetching notification data
  
  } catch (error) {
    console.error('❌ ERROR in GET /api/notification-data');
    console.error('Message:', error.message);
    console.error('Status:',  error.response?.status);
    console.error('═══════════════════════════════════════════════════');
    console.error('');

    res.status(error.response?.status || 500).json({
      success:    false,
      error:      error.message,
      details:    error.response?.data,
      statusCode: error.response?.status || 500,
    });
  }
});

/**
 * GET /api/approval-order-details
 * Fetch activities + approval history rows for a specific MO.
 * Query params: OrderNumber, ObjectNumber (both required)
 * OData Service: MO_ORDER_STATUSSet?$filter=Aufnr eq '...' and ObjectNumber eq '...'
 */
app.get('/api/approval-order-details', async (req, res) => {
  try {
    const { OrderNumber, ObjectNumber } = req.query;

    if (!OrderNumber || !ObjectNumber) {
      return res.status(400).json({
        success: false,
        error:   'Missing required parameters: OrderNumber and ObjectNumber',
      });
    }

    const filterQuery = `?$filter=Aufnr eq '${OrderNumber}' and ObjectNumber eq '${ObjectNumber}'`;

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🔍 GET /api/approval-order-details');
    console.log(`   OrderNumber:  ${OrderNumber}`);
    console.log(`   ObjectNumber: ${ObjectNumber}`);
    console.log(`   SAP: MO_ORDER_STATUSSet${filterQuery}`);

    const response = await sapClient.get(`ZGW_MO_APPROVAL_SRV/MO_ORDER_STATUSSet${filterQuery}`);
    const results  = response.data.d?.results || [];

    console.log(`✅ Success: Fetched ${results.length} activity row(s)`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    res.json({
      success:   true,
      data:      results,
      count:     results.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════');
    console.error('❌ ERROR in GET /api/approval-order-details');
    console.error('Message:', error.message);
    console.error('Status:',  error.response?.status);
    console.error('URL:',     error.config?.url);
    console.error('SAP:',     error.response?.data);
    console.error('═══════════════════════════════════════════════════');
    console.error('');

    // Return empty array for 404 (no data found) rather than erroring
    if (error.response?.status === 404 || error.message?.includes('not found')) {
      console.log('ℹ️  No data found, returning empty array');
      return res.json({
        success:   true,
        data:      [],
        count:     0,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(error.response?.status || 500).json({
      success:    false,
      error:      error.message,
      details:    error.response?.data,
      statusCode: error.response?.status || 500,
    });
  }
});

/**
 * GET /api/approve-order/:orderNumber
 *
 * ✅ Dedicated top-level path — zero collision risk with
 *    /api/maintenance-orders/:orderNumber/:objectNumber.
 *
 * Approve a single maintenance order via SAP OData.
 * SAP Entity: MO_ORDER_STATUSS_GET_ENTITY('<orderNumber>')
 */
app.get('/api/approve-order/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const orderStr = orderNumber.trim();

    // Route params are always strings in Express
    if (!orderStr || typeof orderStr !== 'string' || orderStr.length !== 12) {
      return res.status(400).json({
        success: false,
        error:   'Invalid request: orderNumber must be a 12-digit string',
      });
    }


    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🔑 GET /api/approve-order/:orderNumber');
    console.log(`   OrderNumber: ${orderStr}`);
    console.log(`   SAP Entity:  MO_ORDER_STATUSSet('${orderStr}')`);

    const response = await sapClient.get(
      `ZGW_MO_APPROVAL_SRV/MO_ORDER_STATUSSet('${orderStr}')?$format=json`
    );

    console.log(`✅ Success: Order ${orderStr} approved via SAP`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    // ✅ Single res.json() — combined data + message in one object
    res.json({
      success:   true,
      message:   `Successfully approved order ${orderStr}`,
      data:      response.data.d,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════');
    console.error('❌ ERROR in GET /api/approve-order/:orderNumber');
    console.error('Message:', error.message);
    console.error('Status:',  error.response?.status);
    console.error('SAP:',     error.response?.data);
    console.error('═══════════════════════════════════════════════════');
    console.error('');

    res.status(error.response?.status || 500).json({
      success: false,
      error:   error.message,
      details: error.response?.data,
    });
  }
});

/**
 * GET /api/maintenance-orders/:orderNumber/:objectNumber
 * Fetch single order details by composite key.
 * OData Service: MO_APPROVAL_HEADERSet(OrderNumber='...',ObjectNumber='...')
 *
 * ⚠️  Must stay AFTER the /approve/:orderNumber route above.
 */
app.get('/api/maintenance-orders/:orderNumber/:objectNumber', async (req, res) => {
  try {
    const { orderNumber, objectNumber } = req.params;

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🔍 GET /api/maintenance-orders/:orderNumber/:objectNumber');
    console.log(`   OrderNumber:  ${orderNumber}`);
    console.log(`   ObjectNumber: ${objectNumber}`);

    const response = await sapClient.get(
      `ZGW_MO_APPROVAL_SRV/MO_APPROVAL_HEADERSet(OrderNumber='${orderNumber}',ObjectNumber='${objectNumber}')?$format=json`
    );

    console.log(`✅ Success: Order details fetched`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    res.json({
      success:   true,
      data:      response.data.d,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════');
    console.error('❌ ERROR in GET /api/maintenance-orders/:id/:objnr');
    console.error('Message:', error.message);
    console.error('Status:',  error.response?.status);
    console.error('═══════════════════════════════════════════════════');
    console.error('');

    res.status(error.response?.status || 500).json({
      success: false,
      error:   error.message,
      details: error.response?.data,
    });
  }
});

/**
 * GET /api/health
 * Diagnostic endpoint — checks config + CSRF token status.
 */
app.get('/api/health', async (req, res) => {
  const diagnostics = {
    status:      'OK',
    service:     'MO Approval Backend API',
    version:     '1.0.0',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    configuration: {
      sapBaseUrl:     process.env.SAP_BASE_URL            || '❌ Not configured',
      sapServicePath: process.env.SAP_ODATA_SERVICE_PATH  || '❌ Not configured',
      sapUsername:    process.env.SAP_USERNAME            ? '✓ Configured' : '❌ Not configured',
      sapPassword:    process.env.SAP_PASSWORD            ? '✓ Configured' : '❌ Not configured',
      sapClient:      process.env.SAP_CLIENT              || '400 (default)',
    },
    misc: {
      frontendUrl:  process.env.FRONTEND_URL       || '❌ NOT SET',
      resetSecret:  process.env.RESET_TOKEN_SECRET ? '✓ Configured' : '❌ NOT SET',
    },
    csrf: { enabled: true },
    endpoints: {
      maintenance_orders:      'GET  /api/maintenance-orders',
      approval_order_details:  'GET  /api/approval-order-details',
      notification_data:       'GET  /api/notification-data',
      approve_order:           'GET  /api/approve-order/:orderNumber',
      order_details:           'GET  /api/maintenance-orders/:orderNumber/:objectNumber',
    },
  };

  try {
    const tokenInfo = sapClient.getTokenInfo();
    diagnostics.csrf = {
      ...diagnostics.csrf,
      tokenValid: tokenInfo.isValid,
      expiresIn:  `${Math.floor(tokenInfo.expiresIn / 1000 / 60)} minutes`,
    };
  } catch (error) {
    diagnostics.csrf.error = error.message;
  }

  res.json(diagnostics);
});

/**
 * GET /
 * Root — API overview.
 */
app.get('/', (_req, res) => {
  res.json({
    message: 'MO Approval Backend API',
    version: '1.0.0',
    documentation: {
      baseUrl: `http://localhost:${PORT}/api`,
      endpoints: {
        health:                 'GET /api/health',
        maintenance_orders:     'GET /api/maintenance-orders?plant=X&location=Y&user=Z&orderNumber=N&status=S',
        approval_order_details: 'GET /api/approval-order-details?OrderNumber=X&ObjectNumber=Y',
        notification_data:      'GET /api/notification-data',
        approve_order:          'GET /api/approve-order/:orderNumber',
        order_details:          'GET /api/maintenance-orders/:orderNumber/:objectNumber',
      },
    },
  });
});

/* ══════════════════════════════════════════════════════════════════
   404 HANDLER
══════════════════════════════════════════════════════════════════ */
app.use((req, res) => {
  console.warn(`⚠️  404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error:   'Endpoint not found',
    path:    req.path,
    method:  req.method,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/maintenance-orders',
      'GET /api/approval-order-details',
      'GET /api/notification-data',
      'GET /api/approve-order/:orderNumber',
      'GET /api/maintenance-orders/:orderNumber/:objectNumber',
    ],
  });
});

/* ══════════════════════════════════════════════════════════════════
   GLOBAL ERROR HANDLER
══════════════════════════════════════════════════════════════════ */
app.use((err, _req, res, _next) => {
  console.error('');
  console.error('╔════════════════════════════════════════════════════╗');
  console.error('║          UNHANDLED SERVER ERROR                    ║');
  console.error('╚════════════════════════════════════════════════════╝');
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('');

  res.status(500).json({
    success:   false,
    error:     'Internal Server Error',
    message:   err.message,
    timestamp: new Date().toISOString(),
  });
});

/* ══════════════════════════════════════════════════════════════════
   START SERVER
══════════════════════════════════════════════════════════════════ */
const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  MO APPROVAL BACKEND — STARTED                     ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server:        http://localhost:${PORT}`);
  console.log(`📡 SAP URL:       ${process.env.SAP_BASE_URL            || '❌ NOT CONFIGURED'}`);
  console.log(`📋 OData Service: ${process.env.SAP_ODATA_SERVICE_PATH  || '❌ NOT CONFIGURED'}`);
  console.log(`👤 SAP Username:  ${process.env.SAP_USERNAME            ? '✓ Configured' : '❌ NOT CONFIGURED'}`);
  console.log(`🔐 SAP Password:  ${process.env.SAP_PASSWORD            ? '✓ Configured' : '❌ NOT CONFIGURED'}`);
  console.log(`🔐 SAP Client:    ${process.env.SAP_CLIENT              || '400'}`);
  console.log(`🔒 CSRF Token:    Enabled`);
  console.log(`   ResetSecret:   ${process.env.RESET_TOKEN_SECRET      ? '✓ Configured' : '❌ NOT SET'}`);
  console.log(`🔗 Health Check:  http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment:   ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('════════════════════════════════════════════════════');
  console.log('Available Endpoints:');
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/maintenance-orders`);
  console.log(`  GET  /api/approval-order-details`);
  console.log(`  GET  /api/notification-data`);
  console.log(`  GET  /api/approve-order/:orderNumber              ← approve`);
  console.log(`  GET  /api/maintenance-orders/:orderNumber/:objectNumber`);
  console.log('════════════════════════════════════════════════════');
  console.log('');

  if (missingEnvVars.length > 0) {
    console.warn('⚠️  WARNING: Missing environment variables!');
    missingEnvVars.forEach(v => console.warn(`   - ${v}`));
    console.warn('');
  }

  console.log('Press Ctrl+C to stop\n');
});

/* ══════════════════════════════════════════════════════════════════
   GRACEFUL SHUTDOWN
══════════════════════════════════════════════════════════════════ */
process.on('SIGTERM', () => {
  console.log('SIGTERM received — closing HTTP server');
  server.close(() => { console.log('HTTP server closed'); process.exit(0); });
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.close(() => { console.log('HTTP server closed'); process.exit(0); });
});

export default app;

