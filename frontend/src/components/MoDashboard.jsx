import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  useTheme,
  useMediaQuery,
  Fade,
  CircularProgress,
  IconButton,
  Tooltip,
  AppBar,
  Toolbar,
  Button
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import ErrorIcon from '@mui/icons-material/Error';
import TimelineIcon from '@mui/icons-material/Timeline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildIcon from '@mui/icons-material/Build';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ApprovalIcon from '@mui/icons-material/Approval';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '../context/AuthContext';
import { moApprovalService } from '../services/odataService';

// ============================================================================
// SAMPLE DATA
// ============================================================================

const MACHINE_FAULT_TRENDS = [
  { time: '00:00', faults: 45 },
  { time: '02:00', faults: 52 },
  { time: '04:00', faults: 48 },
  { time: '06:00', faults: 65 },
  { time: '08:00', faults: 72 },
  { time: '10:00', faults: 68 },
  { time: '12:00', faults: 78 },
  { time: '14:00', faults: 85 },
  { time: '16:00', faults: 82 },
  { time: '18:00', faults: 90 },
  { time: '20:00', faults: 88 },
  { time: '22:00', faults: 95 }
];

const MAINTENANCE_STATUS = [
  { name: 'Observation', value: 2, color: '#2196F3' },
  { name: 'Work in Progress', value: 3, color: '#FFC107' },
  { name: 'Completed', value: 12, color: '#4CAF50' }
];

const MAINTENANCE_TIME_DATA = [
  { id: 1, equipment: 'ATM_STRIPPER-3_LA', time: '01:43:06', status: 'completed', color: '#4CAF50' },
  { id: 2, equipment: 'ATM_STRIPPER-3_LA', time: '01:13:06', status: 'completed', color: '#4CAF50' },
  { id: 3, equipment: 'ATM_STRIPPER-3_LA', time: '00:53:06', status: 'completed', color: '#4CAF50' },
  { id: 4, equipment: 'ATM_STRIPPER-3_LA', time: '00:03:06', status: 'completed', color: '#4CAF50' }
];

const TOTAL_FAULTS_REPORTED = [
  { equipment: 'ATM_STRIPPER-3_A', faults: 42 },
  { equipment: 'ATM_STRIPPER-3_A', faults: 32 },
  { equipment: 'BACK_ENA_CUTTER-LV1', faults: 22 },
  { equipment: 'BACK_ENA_CUTTER-LV2', faults: 12 }
];

const MAINTENANCE_ACTIVITY_TYPE = [
  { name: 'Preventive', value: 45, color: '#FF6B6B' },
  { name: 'Breakdown', value: 28, color: '#FFC107' },
  { name: 'Accidental', value: 18, color: '#E91E63' },
  { name: 'Daily MO', value: 35, color: '#2196F3' }
  ] 

// ============================================================================
// KPI CARD COMPONENT - NOW CLICKABLE
// ============================================================================

const KPICard = ({ title, value, unit, trend, trendValue, icon: Icon, color, onClick }) => {
  const isPositive = trend === 'up' ? false : true;
  const TrendIcon = trend === 'up' ? TrendingUpIcon : TrendingDownIcon;

  return (
    <Card
      elevation={1}
      onClick={onClick}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        background: `linear-gradient(135deg, #e4f3c8 0%, #ff7ae9 100%)`,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.1s ease',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: `0 12px 24px rgba(0, 0, 0, 0.15)`,
          backgroundColor: '#90da30'
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -30,
          right: -50,
          width: 150,
          height: 140,
          background: '#1bca38',
          borderRadius: '70%',
          opacity: 0.2
        }
      }}
    >
      <CardActionArea>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Box flex={1}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 1000, mb: 0 }}>
                {title}
              </Typography>
              <Box display="flex" alignItems="baseline" gap={1}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: color }}>
                  {value}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 900 }}>
                  {unit}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `3px solid ${color}30`
              }}
            >
              <Icon sx={{ fontSize: 40, color: color }} />
            </Box>
          </Box>

          <Box
            display="flex"
            alignItems="center"
            gap={0.2}
            sx={{
              backgroundColor: isPositive ? '#C8E6C9' : '#FFCCBC',
              color: isPositive ? '#2E7D32' : '#C62828',
              px: 0.5,
              py: 0.5,
              borderRadius: 1,
              width: 'fit-content'
            }}
          >
            <TrendIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {trendValue} from yesterday
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// ============================================================================
// NAVIGATION CARD COMPONENT - NEW!
// ============================================================================

const NavigationCard = ({ title, description, icon: Icon, color, onClick, count, loading }) => {
  return (
    <Card
      elevation={6}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `2px solid ${color}30`,
        transition: 'all 0.3s ease',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: `0 12px 24px ${color}40`,
          border: `2px solid ${color}`,
        }
      }}
    >
      <CardActionArea onClick={onClick} disabled={loading}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${color}40`
              }}
            >
              {loading ? (
                <CircularProgress size={32} sx={{ color: 'white' }} />
              ) : (
                <Icon sx={{ fontSize: 32, color: 'white' }} />
              )}
            </Box>
            <Box flex={1}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#333' }}>
                {title}
              </Typography>
              {count !== undefined && (
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: color,
                    mt: 0.5
                  }}
                >
                  {loading ? '...' : count}
                </Typography>
              )}
            </Box>
          </Box>
          <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.5 }}>
            {description}
          </Typography>
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: color,
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            Click to explore <ArrowForwardIcon sx={{ fontSize: 16 }} />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// ============================================================================
// CHART CARD COMPONENT - FIXED FOR RECHARTS
// ============================================================================

const ChartCard = ({ title, children, height = 300, width = "100%" }) => {
  return (
    <Paper
      elevation={4}
      sx={{
        p: 3,
        borderRadius: 3,
        background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
        width: width,
        height: height,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          mb: 2,
          color: '#333',
          flexShrink: 0
        }}
      >
        {title}
      </Typography>
      <Box
        flex={1}
        sx={{
          width: '100%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto'
        }}
      >
        {children}
      </Box>
    </Paper>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const MoDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useAuth();

  // Get userId from localStorage
  const currentUserId = localStorage.getItem('userId') || '';

  // ========== STATE MANAGEMENT ==========
  const [loading, setLoading] = useState(false);
  const [approvalOrders, setApprovalOrders] = useState([]);
  const [approvalOrdersLoading, setApprovalOrdersLoading] = useState(false);
  const [approvalOrdersError, setApprovalOrdersError] = useState(null);

  const initializationRef = useRef(false);


  // ========== LIFECYCLE EFFECTS ==========

  // Fetch approval orders on component mount
  useEffect(() => {
    if (initializationRef.current) {
      console.log('⚠️ Skipping duplicate effect execution (Strict Mode)');
      return;
    }
    initializationRef.current = true;
  
    fetchApprovalOrders();
  }, []);

  // ========== API FUNCTIONS ==========

  /**
   * Fetch maintenance orders for approval with initial filters
   * This replaces the fetchOrders logic that was in MoApproval.jsx
   */
  const fetchApprovalOrders = async () => {
    try {
      setApprovalOrdersLoading(true);
      setApprovalOrdersError(null);

      // Define initial filters - same as in MoApproval
      const initialFilters = {
        orderNumber: '',
        plant: '',
        location: '',
        user: currentUserId,
        status: ''
      };

      console.log('📡 Fetching approval orders with filters:', initialFilters);

      const response = await moApprovalService.getMaintenanceOrders(initialFilters);

      // Validate response
      if (!response.data) {
        throw new Error('No data returned from API');
      }

      setApprovalOrders(Array.isArray(response.data) ? response.data : []);

      console.log(`✅ Successfully loaded ${response.data.length} approval orders`);
    } catch (err) {
      const errorMessage = err.message || 'Failed to load approval orders';

      console.error('❌ Error fetching approval orders:', {
        message: errorMessage,
        details: err.debugDetails || err,
        timestamp: new Date().toISOString()
      });

      setApprovalOrdersError(errorMessage);
    } finally {
      setApprovalOrdersLoading(false);
    }
  };

  // ========== EVENT HANDLERS ==========

  const handleApprovalCardClick = () => {
    console.log('🎯 Navigating to MO Approval with data:', {
      count: approvalOrders.length,
      orders: approvalOrders
    });

    navigate('/mo-approval', {
      state: {
        initialOrders: approvalOrders,
        initialFilters: {
          orderNumber: '',
          objectNumber: '',
          plant: '',
          location: '',
          user: currentUserId,
          status: ''
        }
      }
    });
  };

  const handlePendingCardClick = () => {
    alert('📌 Pending Orders\n\nThis will open the pending maintenance orders list.\n\n2 orders awaiting action.');
    console.log('Pending card clicked');
  };

  const handleObservationCardClick = () => {
    alert('👁️ Observation Orders\n\nThese are orders under observation status.\n\n2 orders in observation.');
    console.log('Observation card clicked');
  };

  const handleResolvedCardClick = () => {
    alert('✅ Resolved Orders\n\nSuccessfully completed maintenance orders.\n\n12 orders resolved.');
    console.log('Resolved card clicked');
  };

  const handleInProgressCardClick = () => {
    alert('🔧 In Progress Orders\n\nMaintenance orders currently being worked on.\n\n2 orders in progress.');
    console.log('In Progress card clicked');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
      {/* AppBar */}
      <AppBar position="static" sx={{ background: 'rgba(68, 238, 68, 0.7)', mb: 3 }}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2, fontSize: 28 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Maintenance Orders Dashboard
          </Typography>
          <Tooltip title={`Logged in as: ${currentUserId}`}>
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
              {currentUserId}
            </Button>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl">
           

        {/* KPI CARDS */}
        <Fade in={!loading} timeout={800}>
          <Grid container spacing={2} mb={2}>


            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Require Approval"
                backgroundColor="#2617f5"
                value={approvalOrders.length}
                unit="orders"
                // trend="down"
                // trendValue="0%"
                icon={ErrorIcon}
                color="#2617f5"
                onClick={handleApprovalCardClick}
              />
            </Grid>


            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Notification Open"
                value="0"
                trend="down"
                // trendValue="8%"
                icon={AssignmentIcon}
                color="#FFC107"
                onClick={handleObservationCardClick}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="In Progress"
                value="2"
                unit="orders"
                trend="up"
                trendValue="5%"
                icon={BuildIcon}
                color="#2196F3"
                onClick={handleInProgressCardClick}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Resolved"
                value="12"
                unit="orders"
                trend="up"
                trendValue="0 %"
                icon={CheckCircleIcon}
                color="#4CAF50"
                onClick={handleResolvedCardClick}
              />
            </Grid>
          </Grid>
        </Fade>

        {/* CHARTS ROW 1 */}
        <Fade in={!loading} timeout={1000}>
          <Grid container spacing={1} mb={2}>
            <Grid item xs={12} md={8}>
              <ChartCard title="Machine Fault Trends (Weekly)" height={250}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MACHINE_FAULT_TRENDS}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ea36f0" />
                    <XAxis dataKey="time" stroke="#f700ff" style={{ fontSize: '10px' }} />
                    <YAxis stroke="#ec3030" style={{ fontSize: '12px' }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #ddd',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="faults" stroke="#49e70a" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>
          </Grid>
        </Fade>



        {/* CHARTS ROW 2 */}
        <Fade in={!loading} timeout={1200}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <ChartCard title="Total Faults Reported" height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={TOTAL_FAULTS_REPORTED}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="equipment"
                      stroke="#999"
                      style={{ fontSize: '12px' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="#999" style={{ fontSize: '12px' }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #ddd',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => `${value} Faults`}
                    />
                    <Bar dataKey="faults" fill="#667eea" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>
          </Grid>
        </Fade>

        {/* MAINTENANCE ACTIVITY TYPE */}
        <Fade in={!loading} timeout={1400}>
          <Grid container spacing={3} mt={0}>
            <Grid item xs={12} md={6}>
              <ChartCard title="Maintenance Activity Type" height={350}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={MAINTENANCE_ACTIVITY_TYPE}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {MAINTENANCE_ACTIVITY_TYPE.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <ChartCard title="Breakdown Overview" height={300}>
                <Grid container spacing={.5}>
                  {MAINTENANCE_ACTIVITY_TYPE.map((item, idx) => (
                    <Grid item xs={12} sm={6} key={idx}>
                      <Paper
                        sx={{
                          p: 2,
                          background: `linear-gradient(135deg, ${item.color}15 0%, ${item.color}05 100%)`,
                          borderLeft: `5px solid ${item.color}`,
                          borderRight: `5px solid ${item.color}`,
                          borderRadius: 3
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1} mb={0}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '20%',
                              backgroundColor: item.color
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#e70ba5' }}>
                            {item.name} {item.value}%
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </ChartCard>
            </Grid>
          </Grid>
        </Fade>

        {/* Loading Overlay */}
        {loading && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}
          >
            <Box textAlign="center">
              <CircularProgress size={60} sx={{ color: 'white' }} />
              <Typography variant="body1" sx={{ color: 'white', mt: 2 }}>
                Loading dashboard...
              </Typography>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default MoDashboard;


// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   Container,
//   Box,
//   Typography,
//   Paper,
//   Grid,
//   Card,
//   CardContent,
//   CardActionArea,
//   useTheme,
//   useMediaQuery,
//   Fade,
//   CircularProgress,
//   IconButton,
//   Tooltip,
//   AppBar,
//   Toolbar,
//   Button
// } from '@mui/material';
// import {
//   PieChart,
//   Pie,
//   Cell,
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip as RechartsTooltip,
//   Legend,
//   ResponsiveContainer,
//   BarChart,
//   Bar
// } from 'recharts';
// import ErrorIcon from '@mui/icons-material/Error';
// import TimelineIcon from '@mui/icons-material/Timeline';
// import CheckCircleIcon from '@mui/icons-material/CheckCircle';
// import BuildIcon from '@mui/icons-material/Build';
// import TrendingUpIcon from '@mui/icons-material/TrendingUp';
// import TrendingDownIcon from '@mui/icons-material/TrendingDown';
// import AssignmentIcon from '@mui/icons-material/Assignment';
// import ApprovalIcon from '@mui/icons-material/Approval';
// import DashboardIcon from '@mui/icons-material/Dashboard';
// import LogoutIcon from '@mui/icons-material/Logout';
// import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
// import { useAuth } from '../context/AuthContext';
// import { moApprovalService } from '../services/odataService';

// // ============================================================================
// // SAMPLE DATA
// // ============================================================================

// const MACHINE_FAULT_TRENDS = [
//   { time: '00:00', faults: 45 },
//   { time: '02:00', faults: 52 },
//   { time: '04:00', faults: 48 },
//   { time: '06:00', faults: 65 },
//   { time: '08:00', faults: 72 },
//   { time: '10:00', faults: 68 },
//   { time: '12:00', faults: 78 },
//   { time: '14:00', faults: 85 },
//   { time: '16:00', faults: 82 },
//   { time: '18:00', faults: 90 },
//   { time: '20:00', faults: 88 },
//   { time: '22:00', faults: 95 }
// ];

// const MAINTENANCE_STATUS = [
//   { name: 'Observation', value: 2, color: '#2196F3' },
//   { name: 'Work in Progress', value: 3, color: '#FFC107' },
//   { name: 'Completed', value: 12, color: '#4CAF50' }
// ];

// const MAINTENANCE_TIME_DATA = [
//   { id: 1, equipment: 'ATM_STRIPPER-3_LA', time: '01:43:06', status: 'completed', color: '#4CAF50' },
//   { id: 2, equipment: 'ATM_STRIPPER-3_LA', time: '01:13:06', status: 'completed', color: '#4CAF50' },
//   { id: 3, equipment: 'ATM_STRIPPER-3_LA', time: '00:53:06', status: 'completed', color: '#4CAF50' },
//   { id: 4, equipment: 'ATM_STRIPPER-3_LA', time: '00:03:06', status: 'completed', color: '#4CAF50' }
// ];

// const TOTAL_FAULTS_REPORTED = [
//   { equipment: 'ATM_STRIPPER-3_A', faults: 42 },
//   { equipment: 'ATM_STRIPPER-3_A', faults: 32 },
//   { equipment: 'BACK_ENA_CUTTER-LV1', faults: 22 },
//   { equipment: 'BACK_ENA_CUTTER-LV2', faults: 12 }
// ];

// const MAINTENANCE_ACTIVITY_TYPE = [
//   { name: 'Preventive', value: 45, color: '#FF6B6B' },
//   { name: 'Breakdown', value: 28, color: '#FFC107' },
//   { name: 'Accidental', value: 18, color: '#E91E63' },
//   { name: 'Daily MO', value: 35, color: '#2196F3' }
//   ] 

// // ============================================================================
// // KPI CARD COMPONENT - NOW CLICKABLE
// // ============================================================================

// const KPICard = ({ title, value, unit, trend, trendValue, icon: Icon, color, onClick }) => {
//   const isPositive = trend === 'up' ? false : true;
//   const TrendIcon = trend === 'up' ? TrendingUpIcon : TrendingDownIcon;

//   return (
//     <Card
//       elevation={1}
//       onClick={onClick}
//       sx={{
//         borderRadius: 3,
//         overflow: 'hidden',
//         background: `linear-gradient(135deg, #e4f3c8 0%, #ff7ae9 100%)`,
//         position: 'relative',
//         cursor: 'pointer',
//         transition: 'all 0.1s ease',
//         '&:hover': {
//           transform: 'translateY(-8px)',
//           boxShadow: `0 12px 24px rgba(0, 0, 0, 0.15)`,
//           backgroundColor: '#90da30'
//         },
//         '&::before': {
//           content: '""',
//           position: 'absolute',
//           top: -30,
//           right: -50,
//           width: 150,
//           height: 140,
//           background: '#1bca38',
//           borderRadius: '70%',
//           opacity: 0.2
//         }
//       }}
//     >
//       <CardActionArea>
//         <CardContent sx={{ p: 3 }}>
//           <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
//             <Box flex={1}>
//               <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 1000, mb: 0 }}>
//                 {title}
//               </Typography>
//               <Box display="flex" alignItems="baseline" gap={1}>
//                 <Typography variant="h4" sx={{ fontWeight: 700, color: color }}>
//                   {value}
//                 </Typography>
//                 <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 900 }}>
//                   {unit}
//                 </Typography>
//               </Box>
//             </Box>
//             <Box
//               sx={{
//                 width: 30,
//                 height: 30,
//                 borderRadius: '50%',
//                 background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 border: `3px solid ${color}30`
//               }}
//             >
//               <Icon sx={{ fontSize: 40, color: color }} />
//             </Box>
//           </Box>

//           <Box
//             display="flex"
//             alignItems="center"
//             gap={0.2}
//             sx={{
//               backgroundColor: isPositive ? '#C8E6C9' : '#FFCCBC',
//               color: isPositive ? '#2E7D32' : '#C62828',
//               px: 0.5,
//               py: 0.5,
//               borderRadius: 1,
//               width: 'fit-content'
//             }}
//           >
//             <TrendIcon sx={{ fontSize: 16 }} />
//             <Typography variant="caption" sx={{ fontWeight: 600 }}>
//               {trendValue} from yesterday
//             </Typography>
//           </Box>
//         </CardContent>
//       </CardActionArea>
//     </Card>
//   );
// };

// // ============================================================================
// // NAVIGATION CARD COMPONENT - NEW!
// // ============================================================================

// const NavigationCard = ({ title, description, icon: Icon, color, onClick, count, loading }) => {
//   return (
//     <Card
//       elevation={6}
//       sx={{
//         borderRadius: 3,
//         overflow: 'hidden',
//         background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
//         border: `2px solid ${color}30`,
//         transition: 'all 0.3s ease',
//         position: 'relative',
//         '&:hover': {
//           transform: 'translateY(-8px)',
//           boxShadow: `0 12px 24px ${color}40`,
//           border: `2px solid ${color}`,
//         }
//       }}
//     >
//       <CardActionArea onClick={onClick} disabled={loading}>
//         <CardContent sx={{ p: 3 }}>
//           <Box display="flex" alignItems="center" gap={2} mb={2}>
//             <Box
//               sx={{
//                 width: 60,
//                 height: 60,
//                 borderRadius: '50%',
//                 background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 boxShadow: `0 4px 12px ${color}40`
//               }}
//             >
//               {loading ? (
//                 <CircularProgress size={32} sx={{ color: 'white' }} />
//               ) : (
//                 <Icon sx={{ fontSize: 32, color: 'white' }} />
//               )}
//             </Box>
//             <Box flex={1}>
//               <Typography variant="h5" sx={{ fontWeight: 700, color: '#333' }}>
//                 {title}
//               </Typography>
//               {count !== undefined && (
//                 <Typography
//                   variant="h6"
//                   sx={{
//                     fontWeight: 700,
//                     color: color,
//                     mt: 0.5
//                   }}
//                 >
//                   {loading ? '...' : count}
//                 </Typography>
//               )}
//             </Box>
//           </Box>
//           <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.5 }}>
//             {description}
//           </Typography>
//           <Box
//             sx={{
//               mt: 2,
//               display: 'flex',
//               alignItems: 'center',
//               gap: 1,
//               color: color,
//               fontWeight: 600,
//               fontSize: '0.9rem'
//             }}
//           >
//             Click to explore <ArrowForwardIcon sx={{ fontSize: 16 }} />
//           </Box>
//         </CardContent>
//       </CardActionArea>
//     </Card>
//   );
// };

// // ============================================================================
// // CHART CARD COMPONENT
// // ============================================================================

// // ============================================================================
// // CHART CARD COMPONENT - FIXED FOR RECHARTS
// // ============================================================================

// const ChartCard = ({ title, children, height = 300, width = "100%" }) => {
//   return (
//     <Paper
//       elevation={4}
//       sx={{
//         p: 3,
//         borderRadius: 3,
//         background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
//         width: width,
//         height: height,
//         display: 'flex',
//         flexDirection: 'column',
//         overflow: 'hidden'
//       }}
//     >
//       <Typography
//         variant="h6"
//         sx={{
//           fontWeight: 700,
//           mb: 2,
//           color: '#333',
//           flexShrink: 0
//         }}
//       >
//         {title}
//       </Typography>
//       <Box
//         flex={1}
//         sx={{
//           width: '100%',
//           height: '100%',
//           minWidth: 0,
//           minHeight: 0,
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'center',
//           overflow: 'auto'
//         }}
//       >
//         {children}
//       </Box>
//     </Paper>
//   );
// };

// // const ChartCard = ({ title, children, height = 300 }) => {
// //   return (
// //     <Paper
// //       elevation={4}
// //       sx={{
// //         p: 3,
// //         borderRadius: 3,
// //         background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
// //         height: height,
// //         display: 'flex',
// //         flexDirection: 'column'
// //       }}
// //     >
// //       <Typography
// //         variant="h6"
// //         sx={{
// //           fontWeight: 700,
// //           mb: 2,
// //           color: '#333'
// //         }}
// //       >
// //         {title}
// //       </Typography>
// //       <Box flex={1}>
// //         {children}
// //       </Box>
// //     </Paper>
// //   );
// // };

// // ============================================================================
// // MAIN COMPONENT
// // ============================================================================

// const MoDashboard = () => {
//   const navigate = useNavigate();
//   const theme = useTheme();
//   const isMobile = useMediaQuery(theme.breakpoints.down('md'));
//   const { user, logout } = useAuth();

//   // Get userId from localStorage
//   const currentUserId = localStorage.getItem('userId') || '';

//   // ========== STATE MANAGEMENT ==========
//   const [loading, setLoading] = useState(false);
//   const [approvalOrders, setApprovalOrders] = useState([]);
//   const [approvalOrdersLoading, setApprovalOrdersLoading] = useState(false);
//   const [approvalOrdersError, setApprovalOrdersError] = useState(null);

//   const initializationRef = useRef(false);


//   // ========== LIFECYCLE EFFECTS ==========

//   // Fetch approval orders on component mount
//   useEffect(() => {
//     if (initializationRef.current) {
//       console.log('⚠️ Skipping duplicate effect execution (Strict Mode)');
//       return;
//     }
//     initializationRef.current = true;
  
//     fetchApprovalOrders();
//   }, []);

//   // ========== API FUNCTIONS ==========

//   /**
//    * Fetch maintenance orders for approval with initial filters
//    * This replaces the fetchOrders logic that was in MoApproval.jsx
//    */
//   const fetchApprovalOrders = async () => {
//     try {
//       setApprovalOrdersLoading(true);
//       setApprovalOrdersError(null);

//       // Define initial filters - same as in MoApproval
//       const initialFilters = {
//         orderNumber: '',
//         plant: '',
//         location: '',
//         user: currentUserId,
//         status: ''
//       };

//       console.log('📡 Fetching approval orders with filters:', initialFilters);

//       const response = await moApprovalService.getMaintenanceOrders(initialFilters);

//       // Validate response
//       if (!response.data) {
//         throw new Error('No data returned from API');
//       }

//       setApprovalOrders(Array.isArray(response.data) ? response.data : []);

//       console.log(`✅ Successfully loaded ${response.data.length} approval orders`);
//     } catch (err) {
//       const errorMessage = err.message || 'Failed to load approval orders';

//       console.error('❌ Error fetching approval orders:', {
//         message: errorMessage,
//         details: err.debugDetails || err,
//         timestamp: new Date().toISOString()
//       });

//       setApprovalOrdersError(errorMessage);
//     } finally {
//       setApprovalOrdersLoading(false);
//     }
//   };

//   // ========== EVENT HANDLERS ==========

//   const handleApprovalCardClick = () => {
//     console.log('🎯 Navigating to MO Approval with data:', {
//       count: approvalOrders.length,
//       orders: approvalOrders
//     });

//     navigate('/mo-approval', {
//       state: {
//         initialOrders: approvalOrders,
//         initialFilters: {
//           orderNumber: '',
//           objectNumber: '',
//           plant: '',
//           location: '',
//           user: currentUserId,
//           status: ''
//         }
//       }
//     });
//   };

//   const handlePendingCardClick = () => {
//     alert('📌 Pending Orders\n\nThis will open the pending maintenance orders list.\n\n2 orders awaiting action.');
//     console.log('Pending card clicked');
//   };

//   const handleObservationCardClick = () => {
//     alert('👁️ Observation Orders\n\nThese are orders under observation status.\n\n2 orders in observation.');
//     console.log('Observation card clicked');
//   };

//   const handleResolvedCardClick = () => {
//     alert('✅ Resolved Orders\n\nSuccessfully completed maintenance orders.\n\n12 orders resolved.');
//     console.log('Resolved card clicked');
//   };

//   const handleInProgressCardClick = () => {
//     alert('🔧 In Progress Orders\n\nMaintenance orders currently being worked on.\n\n2 orders in progress.');
//     console.log('In Progress card clicked');
//   };

//   const handleLogout = () => {
//     logout();
//     navigate('/login');
//   };

//   // ========== RENDER ==========

//   return (
//     <Box
//       sx={{
//         minHeight: '100vh',
//         background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//         py: { xs: 2, sm: 3, md: 4 }
//       }}
//     >
//       {/* AppBar */}
//       <AppBar position="static" sx={{ background: 'rgba(68, 238, 68, 0.7)', mb: 3 }}>
//         <Toolbar>
//           <DashboardIcon sx={{ mr: 2, fontSize: 28 }} />
//           <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
//             Maintenance Orders Dashboard
//           </Typography>
//           <Tooltip title={`Logged in as: ${currentUserId}`}>
//             <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
//               {currentUserId}
//             </Button>
//           </Tooltip>
//         </Toolbar>
//       </AppBar>

//       <Container maxWidth="xl">
           

//         {/* KPI CARDS */}
//         <Fade in={!loading} timeout={800}>
//           <Grid container spacing={2} mb={2}>


//             <Grid item xs={12} sm={6} md={3}>
//               <KPICard
//                 title="Require Approval"
//                 backgroundColor="#2617f5"
//                 value={approvalOrders.length}
//                 unit="orders"
//                 // trend="down"
//                 // trendValue="0%"
//                 icon={ErrorIcon}
//                 color="#2617f5"
//                 onClick={handleApprovalCardClick}
//               />
//             </Grid>


//             <Grid item xs={12} sm={6} md={3}>
//               <KPICard
//                 title="Notification Open"
//                 value="0"
//                 trend="down"
//                 // trendValue="8%"
//                 icon={AssignmentIcon}
//                 color="#FFC107"
//                 onClick={handleObservationCardClick}
//               />
//             </Grid>

//             <Grid item xs={12} sm={6} md={3}>
//               <KPICard
//                 title="In Progress"
//                 value="2"
//                 unit="orders"
//                 trend="up"
//                 trendValue="5%"
//                 icon={BuildIcon}
//                 color="#2196F3"
//                 onClick={handleInProgressCardClick}
//               />
//             </Grid>

//             <Grid item xs={12} sm={6} md={3}>
//               <KPICard
//                 title="Resolved"
//                 value="12"
//                 unit="orders"
//                 trend="up"
//                 trendValue="0 %"
//                 icon={CheckCircleIcon}
//                 color="#4CAF50"
//                 onClick={handleResolvedCardClick}
//               />
//             </Grid>
//           </Grid>
//         </Fade>

//         {/* CHARTS ROW 1 */}
//         <Fade in={!loading} timeout={1000}>
//           <Grid container spacing={1} mb={2}>
//             <Grid item xs={12} md={8}>
//               <ChartCard title="Machine Fault Trends (Weekly)" height={250}>
//               {/* <ChartCard title="Machine Fault Trends (Weekly)" height={250} width="100%" alignItems="center" > */}
//                 <ResponsiveContainer width="100%" height="100%">
//                   <LineChart data={MACHINE_FAULT_TRENDS}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#ea36f0" />
//                     <XAxis dataKey="time" stroke="#f700ff" style={{ fontSize: '10px' }} />
//                     <YAxis stroke="#ec3030" style={{ fontSize: '12px' }} />
//                     <RechartsTooltip
//                       contentStyle={{
//                         backgroundColor: '#f5f5f5',
//                         border: '1px solid #ddd',
//                         borderRadius: '8px'
//                       }}
//                     />
//                     <Legend />
//                     <Line type="monotone" dataKey="faults" stroke="#49e70a" strokeWidth={3} dot={{ r: 4 }} />
//                   </LineChart>
//                 </ResponsiveContainer>
//               </ChartCard>
//             </Grid>
//           </Grid>
//         </Fade>



//         {/* CHARTS ROW 2 */}
//         <Fade in={!loading} timeout={1200}>
//           <Grid container spacing={3}>
//             <Grid item xs={12} md={6}>
//               <ChartCard title="Total Faults Reported" height={280}>
//                 <ResponsiveContainer width="100%" height="100%">
//                   <BarChart data={TOTAL_FAULTS_REPORTED}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
//                     <XAxis
//                       dataKey="equipment"
//                       stroke="#999"
//                       style={{ fontSize: '12px' }}
//                       angle={-45}
//                       textAnchor="end"
//                       height={80}
//                     />
//                     <YAxis stroke="#999" style={{ fontSize: '12px' }} />
//                     <RechartsTooltip
//                       contentStyle={{
//                         backgroundColor: '#f5f5f5',
//                         border: '1px solid #ddd',
//                         borderRadius: '8px'
//                       }}
//                       formatter={(value) => `${value} Faults`}
//                     />
//                     <Bar dataKey="faults" fill="#667eea" radius={[8, 8, 0, 0]} />
//                   </BarChart>
//                 </ResponsiveContainer>
//               </ChartCard>
//             </Grid>
//           </Grid>
//         </Fade>

//         {/* MAINTENANCE ACTIVITY TYPE */}
//         <Fade in={!loading} timeout={1400}>
//           <Grid container spacing={3} mt={0}>
//             <Grid item xs={12} md={6}>
//               <ChartCard title="Maintenance Activity Type" height={350}>
//                 <ResponsiveContainer width="100%" height="100%">
//                   <PieChart>
//                     <Pie
//                       data={MAINTENANCE_ACTIVITY_TYPE}
//                       cx="50%"
//                       cy="50%"
//                       outerRadius={100}
//                       paddingAngle={2}
//                       dataKey="value"
//                     >
//                       {MAINTENANCE_ACTIVITY_TYPE.map((entry, index) => (
//                         <Cell key={`cell-${index}`} fill={entry.color} />
//                       ))}
//                     </Pie>
//                     <RechartsTooltip formatter={(value) => `${value}%`} />
//                   </PieChart>
//                 </ResponsiveContainer>
//               </ChartCard>
//             </Grid>

//             <Grid item xs={12} md={6}>
//               <ChartCard title="Breakdown Overview" height={300}>
//                 <Grid container spacing={.5}>
//                   {MAINTENANCE_ACTIVITY_TYPE.map((item, idx) => (
//                     <Grid item xs={12} sm={6} key={idx}>
//                       <Paper
//                         sx={{
//                           p: 2,
//                           background: `linear-gradient(135deg, ${item.color}15 0%, ${item.color}05 100%)`,
//                           borderLeft: `5px solid ${item.color}`,
//                           borderRight: `5px solid ${item.color}`,
//                           borderRadius: 3
//                         }}
//                       >
//                         <Box display="flex" alignItems="center" gap={1} mb={0}>
//                           <Box
//                             sx={{
//                               width: 10,
//                               height: 10,
//                               borderRadius: '20%',
//                               backgroundColor: item.color
//                             }}
//                           />
//                           <Typography variant="body2" sx={{ fontWeight: 700, color: '#e70ba5' }}>
//                             {item.name} {item.value}%
//                           </Typography>
//                         </Box>
//                       </Paper>
//                     </Grid>
//                   ))}
//                 </Grid>
//               </ChartCard>
//             </Grid>
//           </Grid>
//         </Fade>

//         {/* Loading Overlay */}
//         {loading && (
//           <Box
//             sx={{
//               position: 'fixed',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'rgba(0, 0, 0, 0.3)',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               zIndex: 9999
//             }}
//           >
//             <Box textAlign="center">
//               <CircularProgress size={60} sx={{ color: 'white' }} />
//               <Typography variant="body1" sx={{ color: 'white', mt: 2 }}>
//                 Loading dashboard...
//               </Typography>
//             </Box>
//           </Box>
//         )}
//       </Container>
//     </Box>
//   );
// };

// export default MoDashboard;

