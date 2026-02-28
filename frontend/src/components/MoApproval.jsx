import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  useTheme,
  useMediaQuery,
  Fab,
  Badge,
  Slide,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import FilterBar from './FilterBar';
import ApprovalTable from './ApprovalTable';
import { moApprovalService } from '../services/odataService';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';


const MoApproval = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Get userId from localStorage
  const currentUserId = localStorage.getItem('userId') || '';

  // Get initial data from MoDashboard navigation state
  const initialOrdersFromDashboard = location.state?.initialOrders || [];
  const initialFiltersFromDashboard = location.state?.initialFilters || {
    orderNumber: '',
    ObjectNumber: '',
    plant: '',
    location: '',
    user: currentUserId,
    status: ''
  };

  // ========== STATE MANAGEMENT ==========
  const [orders, setOrders] = useState(initialOrdersFromDashboard);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filters, setFilters] = useState(initialFiltersFromDashboard);
  const [showFilters, setShowFilters] = useState(!isMobile);

  // Error dialog for detailed error info
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);
  const initializationRef = useRef(false);

  // ========== LIFECYCLE EFFECTS ==========

  // Handle mobile responsiveness
  useEffect(() => {
    setShowFilters(!isMobile);
  }, [isMobile]);

  // ========== API FUNCTIONS ==========

  /**
   * Fetch orders with comprehensive error handling
   * NOTE: This function is now called from MoDashboard and data is passed as props
   * This function handles search and refresh operations only
   */
  const fetchOrders = async (searchFilters = {}) => {
    try {

      if (initializationRef.current) {
      console.log('⚠️ Skipping duplicate effect execution (Strict Mode)');
      return;
    }
    initializationRef.current = true;
    

      setLoading(true);
      setError(null);
      setErrorDetails(null);

      console.log('📡 Fetching orders with filters:', searchFilters);

      const response = await moApprovalService.getMaintenanceOrders(searchFilters);

      // Validate response
      if (!response.data) {
        throw new Error('No data returned from API');
      }

      setOrders(Array.isArray(response.data) ? response.data : []);
      setFilters(searchFilters);

      console.log(`✅ Successfully loaded ${response.data.length} orders`);

    } catch (err) {
      // Log detailed error
      const errorMessage = err.message || 'Failed to load orders';

      console.error('❌ Error fetching orders:', {
        message: errorMessage,
        details: err.debugDetails || err,
        timestamp: new Date().toISOString()
      });

      setError(errorMessage);
      setErrorDetails(err.debugDetails || {
        message: err.message,
        code: err.code,
        status: err.response?.status
      });

    } finally {
      setLoading(false);
    }
  };

  // ========== EVENT HANDLERS ==========

  const handleSearch = (searchFilters) => {
    console.log('🔍 Search triggered with filters:', searchFilters);
    setSelectedOrders([]);
    fetchOrders(searchFilters);
    if (isMobile) setShowFilters(false);
  };

  // const handleSelectAll = (event) => {

  //   alert('select all');
  //   setSelectedOrders(
  //     event.target.checked ? orders.map(o => o.OrderNumber) : []
  //   );
  // };

  // const handleSelectOrder = (orderNumber) => {
  //   alert('select order');

  //   setSelectedOrders(prev =>
  //     prev.includes(orderNumber)
  //       ? prev.filter(n => n !== orderNumber)
  //       : [...prev, orderNumber]
  //   );
  // };

  const handleOrderRowClick = (order) => {

    const fullOrder = orders.find(o => o.OrderNumber === order.OrderNumber);
    navigate('/mo-selected', { state: { order: fullOrder } });
  };

  const handleRefresh = () => {
    alert('select refresh');

    console.log('🔄 Refreshing with current filters:', filters);
    setSelectedOrders([]);
    fetchOrders(filters);
  };

  const handleRetryAfterError = () => {
    setError(null);
    setErrorDetails(null);
    handleRefresh();
  };

  const handleBack = () => {
    navigate(-1);
  };

  // ========== RENDER ==========

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: { xs: 2, sm: 3, md: 4 }
      }}
    >
      <Container maxWidth="xl">
        {/* Header Section */}
        <Fade in timeout={800}>
          <Paper
            elevation={6}
            sx={{
              background: 'linear-gradient(135deg, #f0dc2f 0%, #4cecd7 100%)',
              p: { xs: 2, sm: 3 },
              mb: 2,
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '200px',
                height: '200px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                transform: 'translate(50%, -50%)'
              }
            }}
          >
            <Box display="flex" height={25} justifyContent="space-between" alignItems="center" mb={2}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
                sx={{
                  position: 'fixed',
                  backgroundColor: 'yellow',
                  color: 'blue',
                  fontWeight: 600,
                  height: 25,
                }}
              >
              </Button>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <Typography
                  variant={isMobile ? 'h5' : 'h3'}
                  sx={{
                    color: 'white',
                    fontWeight: 700,
                    textAlign: 'center',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
                    mb: 0.5,
                  }}
                >
                  MO Approval
                </Typography>
              </Box>

              {!isMobile && (
                <Box
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 2,
                    p: 2,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                    {orders.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    Total Orders
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Show current user filter */}
            {currentUserId && (
              <Box
                sx={{
                  mt: 1,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: 2,
                  backdropFilter: 'blur(5px)'
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: 'white', fontWeight: 500 }}
                >
                  👤 Logged in as: <strong>{currentUserId}</strong>
                </Typography>
              </Box>
            )}
          </Paper>
        </Fade>

        {/* Filter Toggle Button (Mobile Only) */}
        {isMobile && (
          <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="contained"
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
              }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>

            <Badge badgeContent={orders.length} color="error" max={999}>
              <Box
                sx={{
                  backgroundColor: 'white',
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  boxShadow: 2
                }}
              >
                <Typography variant="body2" fontWeight={600} color="primary">
                  Orders
                </Typography>
              </Box>
            </Badge>
          </Box>
        )}

        {/* Filter Bar */}
        <Slide direction="down" in={showFilters} mountOnEnter unmountOnExit>
          <Box>
            <FilterBar onSearch={handleSearch} loading={loading} />
          </Box>
        </Slide>

        {/* Error Alert */}
        {error && (
          <Fade in={!!error} timeout={500}>
            <Alert
              severity="error"
              onClose={() => setError(null)}
              action={
                <Button color="inherit" size="small" onClick={handleRetryAfterError}>
                  RETRY
                </Button>
              }
              sx={{ mb: 2 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Error: {error}
              </Typography>
              {errorDetails && (
                <Button
                  size="small"
                  onClick={() => setShowErrorDialog(true)}
                  sx={{ mt: 1, display: 'block' }}
                >
                  View Details
                </Button>
              )}
            </Alert>
          </Fade>
        )}

        {/* Loading Indicator */}
        {loading && (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            py={8}
          >
            <Box textAlign="center">
              <CircularProgress size={60} thickness={4} />
              <Typography variant="body1" sx={{ mt: 2, color: 'white' }}>
                Loading orders...
              </Typography>
            </Box>
          </Box>
        )}

        {/* Data Table */}
        {!loading && (
          <Fade in timeout={1200}>
            <Box>
              <ApprovalTable
                orders={orders}
                selectedOrders={selectedOrders}
                onRowClick={handleOrderRowClick}
              />
            </Box>
          </Fade>
        )}

        {/* Empty State */}
        {!loading && orders.length === 0 && (
          <Fade in timeout={1000}>
            <Paper
              elevation={4}
              sx={{
                p: 4,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
                borderRadius: 3
              }}
            >
              <WarningIcon sx={{ fontSize: 60, color: '#FF9800', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                No Orders Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                There are no maintenance orders matching your current filters.
              </Typography>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                sx={{
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                }}
              >
                Refresh Orders
              </Button>
            </Paper>
          </Fade>
        )}

        {/* Floating Action Button (Mobile Only) */}
        {isMobile && (
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            }}
            onClick={handleRefresh}
          >
            <RefreshIcon />
          </Fab>
        )}

        {/* Error Details Dialog */}
        <Dialog
          open={showErrorDialog}
          onClose={() => setShowErrorDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700, color: '#C62828' }}>
            Error Details
          </DialogTitle>
          <DialogContent dividers>
            <Box component="pre" sx={{
              background: '#f5f5f5',
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
              fontSize: '0.85rem',
              fontFamily: 'monospace'
            }}>
              {JSON.stringify(errorDetails, null, 2)}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowErrorDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Success Snackbar */}
        <Snackbar
          open={!!success}
          autoHideDuration={3000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity="success"
            variant="filled"
            onClose={() => setSuccess(null)}
            sx={{ width: '100%', fontWeight: 600 }}
          >
            {success}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default MoApproval;