import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Paper, Grid, Card, CardContent,
  CardActionArea, useTheme, useMediaQuery, Fade, CircularProgress,
  Tooltip, AppBar, Toolbar, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton,
} from '@mui/material';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import ErrorIcon        from '@mui/icons-material/Error';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import BuildIcon        from '@mui/icons-material/Build';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AssignmentIcon   from '@mui/icons-material/Assignment';
import DashboardIcon    from '@mui/icons-material/Dashboard';
import LogoutIcon       from '@mui/icons-material/Logout';
import CloseIcon        from '@mui/icons-material/Close';
import ExpandMoreIcon   from '@mui/icons-material/ExpandMore';
import ExpandLessIcon   from '@mui/icons-material/ExpandLess';
import { useAuth }           from '../context/AuthContext';
import { moApprovalService } from '../services/odataService';

// ============================================================================
// STATIC CHART DATA (fault trend + bar — still static)
// ============================================================================

const MACHINE_FAULT_TRENDS = [
  { time: '00:00', faults: 45 }, { time: '02:00', faults: 52 },
  { time: '04:00', faults: 48 }, { time: '06:00', faults: 65 },
  { time: '08:00', faults: 72 }, { time: '10:00', faults: 68 },
  { time: '12:00', faults: 78 }, { time: '14:00', faults: 85 },
  { time: '16:00', faults: 82 }, { time: '18:00', faults: 90 },
  { time: '20:00', faults: 88 }, { time: '22:00', faults: 95 },
];

const TOTAL_FAULTS_REPORTED = [
  { equipment: 'ATM_STRIPPER-3_A',    faults: 42 },
  { equipment: 'ATM_STRIPPER-3_B',    faults: 32 },
  { equipment: 'BACK_ENA_CUTTER-LV1', faults: 22 },
  { equipment: 'BACK_ENA_CUTTER-LV2', faults: 12 },
];

// ============================================================================
// ACTIVITY CONFIG  — single source of truth for colors / labels
// ============================================================================

const ACTIVITY_CONFIG = {
  generalActivity:    { label: 'General',    color: '#2196F3', qmart: ['M1']       },
  breakDownActivity:  { label: 'Breakdown',  color: '#FFC107', qmart: ['M2', 'Y2'] },
  amcActivity:        { label: 'AMC',        color: '#9C27B0', qmart: ['AM']       },
  accidentalActivity: { label: 'Accidental', color: '#E91E63', qmart: ['AC']       },
};

// ============================================================================
// STYLE MAPS
// ============================================================================

const STAT_BG = {
  I0071: '#E8F5E9', I0159: '#E3F2FD',
  I0072: '#F3E5F5', I0076: '#FFF3E0',
  I0068: '#FFF8E1', I0070: '#E0F7FA',
};
const STAT_COLOR = {
  I0071: '#2E7D32', I0159: '#1565C0',
  I0072: '#6A1B9A', I0076: '#E65100',
  I0068: '#F57F17', I0070: '#00838F',
};
const STAT_HEADER_BG = {
  I0071: '#C8E6C9', I0159: '#BBDEFB',
  I0072: '#E1BEE7', I0076: '#FFE0B2',
  I0068: '#FFF9C4', I0070: '#B2EBF2',
};
const QMART_BG    = { M1: '#E8F5E9', M2: '#E3F2FD', AC: '#FCE4EC', Y2: '#F3E5F5', AM: '#FFF8E1' };
const QMART_COLOR = { M1: '#2E7D32', M2: '#1565C0', AC: '#C62828', Y2: '#6A1B9A', AM: '#E65100' };

const cellStyle = {
  fontSize: '0.65rem', py: 0.3, px: 0.8,
  whiteSpace: 'nowrap', overflow: 'hidden',
  textOverflow: 'ellipsis', borderBottom: '1px solid #e8e8e8',
};

const TABLE_COLUMNS = [
  { label: '#',           width: '4%'  },
  { label: 'Notif No',    width: '14%' },
  { label: 'Type',        width: '8%'  },
  { label: 'Date',        width: '12%' },
  { label: 'Description', width: '32%' },
  { label: 'Status',      width: '18%' },
  { label: 'Stat',        width: '12%' },
];

// ============================================================================
// HELPER — group rows by stat code
// ============================================================================

const groupByStat = (data) => {
  const map = {};
  data.forEach((item) => {
    const key = item.stat || 'UNKNOWN';
    if (!map[key]) map[key] = { stat: key, txt04: item.txt04 || '', txt30: item.txt30 || key, rows: [] };
    map[key].rows.push(item);
  });
  return Object.values(map).sort((a, b) => a.stat.localeCompare(b.stat));
};

// ============================================================================
// GROUPED NOTIFICATION TABLE
// ============================================================================

const GroupedNotificationTable = ({ data, isMobile }) => {
  const groups    = groupByStat(data);
  const [collapsed, setCollapsed] = useState({});
  const toggle = (stat) => setCollapsed((p) => ({ ...p, [stat]: !p[stat] }));

  return (
    <TableContainer sx={{ maxHeight: isMobile ? '75vh' : '62vh' }}>
      <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>

        <TableHead>
          <TableRow>
            {TABLE_COLUMNS.map((col) => (
              <TableCell key={col.label} sx={{ width: col.width, backgroundColor: '#1565C0', color: 'white', fontWeight: 700, fontSize: '0.65rem', py: 0.5, px: 0.8, whiteSpace: 'nowrap', borderBottom: '2px solid #0D47A1' }}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#999', fontSize: '0.75rem' }}>
                No records found
              </TableCell>
            </TableRow>
          ) : (
            groups.map((group) => {
              const isCollapsed = !!collapsed[group.stat];
              const hdrBg       = STAT_HEADER_BG[group.stat] || '#E0E0E0';
              const hdrColor    = STAT_COLOR[group.stat]      || '#333';

              return (
                <React.Fragment key={group.stat}>

                  {/* Group header */}
                  <TableRow onClick={() => toggle(group.stat)} sx={{ backgroundColor: hdrBg, cursor: 'pointer', '&:hover': { filter: 'brightness(0.96)' } }}>
                    <TableCell colSpan={7} sx={{ py: 0.5, px: 0.8, borderBottom: `2px solid ${hdrColor}40`, borderTop: '2px solid #ddd' }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconButton size="small" sx={{ p: 0 }}>
                          {isCollapsed
                            ? <ExpandMoreIcon sx={{ fontSize: 16, color: hdrColor }} />
                            : <ExpandLessIcon sx={{ fontSize: 16, color: hdrColor }} />}
                        </IconButton>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.65rem', fontWeight: 700, backgroundColor: STAT_BG[group.stat] || '#eee', color: hdrColor, px: 0.7, py: 0.2, borderRadius: 0.5 }}>
                          {group.stat}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color: hdrColor }}>
                          {group.txt30}{group.txt04 ? ` (${group.txt04})` : ''}
                        </Typography>
                        <Chip
                          label={`${group.rows.length} record${group.rows.length !== 1 ? 's' : ''}`}
                          size="small"
                          sx={{ ml: 'auto', height: 18, fontSize: '0.6rem', fontWeight: 700, backgroundColor: hdrColor, color: 'white', '& .MuiChip-label': { px: 0.8 } }}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>

                  {/* Data rows */}
                  {!isCollapsed && group.rows.map((item, idx) => (
                    <TableRow key={`${item.qmnum}-${item.stat}-${idx}`} hover sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f8ff' }, '&:hover': { backgroundColor: '#dce8ff !important' } }}>
                      <TableCell sx={{ ...cellStyle, color: '#999' }}>{idx + 1}</TableCell>
                      <TableCell sx={{ ...cellStyle, fontWeight: 700, color: '#1565C0' }}>{item.qmnum}</TableCell>
                      <TableCell sx={cellStyle}>
                        <Chip label={item.qmart} size="small" sx={{ fontSize: '0.55rem', height: 16, fontWeight: 600, backgroundColor: QMART_BG[item.qmart] || '#F5F5F5', color: QMART_COLOR[item.qmart] || '#333', '& .MuiChip-label': { px: 0.5 } }} />
                      </TableCell>
                      <TableCell sx={cellStyle}>{item.qmdat || '—'}</TableCell>
                      <TableCell title={item.qmtxt} sx={{ ...cellStyle, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.qmtxt || '—'}</TableCell>
                      <TableCell sx={cellStyle}>
                        <Chip label={item.txt30} size="small" sx={{ fontSize: '0.55rem', height: 16, fontWeight: 600, backgroundColor: STAT_BG[item.stat] || '#F5F5F5', color: STAT_COLOR[item.stat] || '#333', '& .MuiChip-label': { px: 0.5 } }} />
                      </TableCell>
                      <TableCell sx={cellStyle}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.6rem', backgroundColor: '#f5f5f5', px: 0.5, py: 0.2, borderRadius: 0.5, color: '#555' }}>
                          {item.stat}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Subtotal footer */}
                  {!isCollapsed && (
                    <TableRow sx={{ backgroundColor: `${hdrBg}99` }}>
                      <TableCell colSpan={7} sx={{ py: 0.4, px: 0.8, fontSize: '0.6rem', fontWeight: 700, color: hdrColor, borderBottom: `2px solid ${hdrColor}50`, fontStyle: 'italic' }}>
                        Subtotal — {group.stat} ({group.txt30}): {group.rows.length} record{group.rows.length !== 1 ? 's' : ''}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          )}

          {/* Grand total */}
          {data.length > 0 && (
            <TableRow sx={{ backgroundColor: '#1565C0', position: 'sticky', bottom: 0 }}>
              <TableCell colSpan={7} sx={{ py: 0.6, px: 0.8, fontSize: '0.68rem', fontWeight: 800, color: 'white', borderTop: '2px solid #0D47A1' }}>
                Grand Total — {groups.length} group{groups.length !== 1 ? 's' : ''}&nbsp;|&nbsp;{data.length} record{data.length !== 1 ? 's' : ''}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// ============================================================================
// NOTIFICATION MODAL
// ============================================================================

const NotificationModal = ({ open, onClose, title, subtitle, data, headerColor, icon: Icon, isMobile }) => {
  const groups = groupByStat(data);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)' } }}
    >
      <DialogTitle sx={{ background: headerColor, color: 'white', py: 1.5, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Icon sx={{ fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
          {groups.map((g) => (
            <Chip key={g.stat} label={`${g.stat}: ${g.rows.length}`} size="small"
              sx={{ height: 18, fontSize: '0.58rem', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.25)', color: 'white', '& .MuiChip-label': { px: 0.6 } }} />
          ))}
          <Chip label={`Total: ${data.length}`} size="small"
            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, backgroundColor: 'rgba(255,255,255,0.45)', color: 'white', '& .MuiChip-label': { px: 0.8 } }} />
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <GroupedNotificationTable data={data} isMobile={isMobile} />
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1, borderTop: '1px solid #e0e0e0', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: '#888', fontSize: '0.65rem' }}>
          {subtitle}&nbsp;|&nbsp;{groups.length} group{groups.length !== 1 ? 's' : ''}&nbsp;|&nbsp;{data.length} total record{data.length !== 1 ? 's' : ''}
        </Typography>
        <Button onClick={onClose} size="small" variant="contained" sx={{ fontSize: '0.7rem', py: 0.3, px: 1.5, borderRadius: 2, background: headerColor }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// KPI CARD
// ============================================================================

const KPICard = ({ title, value, unit, trend, trendValue, icon: Icon, color, onClick }) => {
  const isPositive = trend !== 'up';
  const TrendIcon  = trend === 'up' ? TrendingUpIcon : TrendingDownIcon;
  return (
    <Card elevation={1} onClick={onClick} sx={{ borderRadius: 3, overflow: 'hidden', background: 'linear-gradient(135deg, #e4f3c8 0%, #ff7ae9 100%)', position: 'relative', cursor: 'pointer', transition: 'all 0.1s ease', '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 12px 24px rgba(0,0,0,0.15)' }, '&::before': { content: '""', position: 'absolute', top: -30, right: -50, width: 150, height: 140, background: '#1bca38', borderRadius: '70%', opacity: 0.2 } }}>
      <CardActionArea>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Box flex={1}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 1000, mb: 0 }}>{title}</Typography>
              <Box display="flex" alignItems="baseline" gap={1}>
                <Typography variant="h4" sx={{ fontWeight: 700, color }}>{value}</Typography>
                {unit && <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 900 }}>{unit}</Typography>}
              </Box>
            </Box>
            <Box sx={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${color}30` }}>
              <Icon sx={{ fontSize: 40, color }} />
            </Box>
          </Box>
          {trendValue && (
            <Box display="flex" alignItems="center" gap={0.2} sx={{ backgroundColor: isPositive ? '#C8E6C9' : '#FFCCBC', color: isPositive ? '#2E7D32' : '#C62828', px: 0.5, py: 0.5, borderRadius: 1, width: 'fit-content' }}>
              <TrendIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>{trendValue} from yesterday</Typography>
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// ============================================================================
// CHART CARD
// ============================================================================

const ChartCard = ({ title, children, height = 300 }) => (
  <Paper elevation={4} sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)', height, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#333', flexShrink: 0 }}>{title}</Typography>
    <Box flex={1} sx={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
      {children}
    </Box>
  </Paper>
);

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

const MoDashboard = () => {
  const navigate   = useNavigate();
  const theme      = useTheme();
  const isMobile   = useMediaQuery(theme.breakpoints.down('md'));
  const { logout } = useAuth();

  const currentUserId = localStorage.getItem('userId') || '';

  // ── Core state ──
  const [loading,               setLoading]               = useState(false);
  const [approvalOrders,        setApprovalOrders]        = useState([]);
  const [approvalOrdersLoading, setApprovalOrdersLoading] = useState(false);
  const [approvalOrdersError,   setApprovalOrdersError]   = useState(null);

  // Notification slices
  const [notificationData,      setNotificationData]      = useState([]);  // all unique (deduped)
  const [inProgress,            setInProgress]            = useState([]);  // I0071 + I0159
  const [resolved,              setResolved]              = useState([]);  // I0072 + I0076
  const [notificationDataError, setNotificationDataError] = useState(null);

  // qmart activity slices
  const [generalActivity,       setGeneralActivity]       = useState([]);  // M1
  const [breakDownActivity,     setBreakDownActivity]     = useState([]);  // M2, Y2
  const [amcActivity,           setAmcActivity]           = useState([]);  // AM
  const [accidentalActivity,    setAccidentalActivity]    = useState([]);  // AC

  // Modal flags
  const [showObservationModal,  setShowObservationModal]  = useState(false);
  const [showInProgressModal,   setShowInProgressModal]   = useState(false);
  const [showResolvedModal,     setShowResolvedModal]     = useState(false);

  const initializationRef = useRef(false);

  // ── Lifecycle ──
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;
    fetchApprovalOrders();
    const today    = new Date();
    const fromdate = new Date();
    fromdate.setDate(today.getDate() - 90);
    const toDate   = today.toISOString().replace('Z', '').split('.')[0];
    const fromDate = fromdate.toISOString().split('T')[0] + 'T00:00:00';
    console.log('📅 Date range:', { fromDate, toDate });
    fetchMoNotificationsData(fromDate, toDate);
  }, []);

  // ── Derived: live Pie + Breakdown chart data from qmart slices ──
  const activityChartData = useMemo(() => [
    { name: ACTIVITY_CONFIG.generalActivity.label,    value: generalActivity.length,    color: ACTIVITY_CONFIG.generalActivity.color    },
    { name: ACTIVITY_CONFIG.breakDownActivity.label,  value: breakDownActivity.length,  color: ACTIVITY_CONFIG.breakDownActivity.color  },
    { name: ACTIVITY_CONFIG.amcActivity.label,        value: amcActivity.length,        color: ACTIVITY_CONFIG.amcActivity.color        },
    { name: ACTIVITY_CONFIG.accidentalActivity.label, value: accidentalActivity.length, color: ACTIVITY_CONFIG.accidentalActivity.color },
  ], [generalActivity, breakDownActivity, amcActivity, accidentalActivity]);

  // ── API: Notifications ──
  const fetchMoNotificationsData = async (fromDate, toDate) => {
    try {
      const response      = await moApprovalService.getNotificationData(fromDate, toDate);
      const notifications = response.data;
      if (!Array.isArray(notifications)) throw new Error('Invalid data format received from API');

      // Parse SAP date
      const parsed = notifications.map(item => ({
        ...item,
        qmdat: item.qmdat
          ? new Date(parseInt(item.qmdat.replace('/Date(', '').replace(')/', ''))).toISOString().split('T')[0]
          : null,
      }));

      // ── stat-based slices (BEFORE dedup — preserve all stat rows per modal) ──
      const inProgressData = parsed.filter(item => item.stat === 'I0159' || item.stat === 'I0071');
      const resolvedData   = parsed.filter(item => item.stat === 'I0076' || item.stat === 'I0072');


      // ── Deduplicate by qmnum for the overview card count ──
      const unique = Object.values(parsed.reduce((acc, item) => { acc[item.qmnum] = item; return acc; }, {}));

            // ── qmart-based slices (from RAW parsed — all rows, not deduped) ──
      const generalData    = unique.filter(item => item.qmart === 'M1');
      const breakdownData  = unique.filter(item => item.qmart === 'M2' || item.qmart === 'Y2');
      const amcData        = unique.filter(item => item.qmart === 'AM');
      const accidentalData = unique.filter(item => item.qmart === 'AC');

      console.log('📋 Raw:', notifications.length, '| Unique:', unique.length);
      console.log('📋 Progress:', inProgressData.length, '| Resolved:', resolvedData.length);
      console.log('📋 General (M1):', generalData.length, '| Breakdown (M2/Y2):', breakdownData.length, '| AMC (AM):', amcData.length, '| Accidental (AC):', accidentalData.length);

      // Set all states
      setNotificationData(unique);
      setInProgress(inProgressData);
      setResolved(resolvedData);
      setGeneralActivity(generalData);
      setBreakDownActivity(breakdownData);
      setAmcActivity(amcData);
      setAccidentalActivity(accidentalData);

    } catch (err) {
      console.error('❌ Notifications error:', err.message);
      setNotificationDataError(err.message || 'Failed to load notifications');
    }
  };

  // ── API: Approval Orders ──
  const fetchApprovalOrders = async () => {
    try {
      setApprovalOrdersLoading(true);
      setApprovalOrdersError(null);
      const response = await moApprovalService.getMaintenanceOrders({ orderNumber: '', plant: '', location: '', user: currentUserId, status: '' });
      if (!response.data) throw new Error('No data returned from API');
      setApprovalOrders(Array.isArray(response.data) ? response.data : []);
      console.log(`✅ Loaded ${response.data.length} approval orders`);
    } catch (err) {
      console.error('❌ Approval orders error:', err.message);
      setApprovalOrdersError(err.message || 'Failed to load approval orders');
    } finally {
      setApprovalOrdersLoading(false);
    }
  };

  // ── Handlers ──
  const handleApprovalCardClick    = () => navigate('/mo-approval', { state: { initialOrders: approvalOrders, initialFilters: { orderNumber: '', objectNumber: '', plant: '', location: '', user: currentUserId, status: '' } } });
  const handleObservationCardClick = () => setShowObservationModal(true);
  const handleInProgressCardClick  = () => setShowInProgressModal(true);
  const handleResolvedCardClick    = () => setShowResolvedModal(true);
  const handleLogout               = () => { logout(); navigate('/login'); };

  // ── Render ──
  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', py: { xs: 2, sm: 3, md: 4 } }}>

      {/* AppBar */}
      <AppBar position="static" sx={{ background: 'rgba(68, 238, 68, 0.7)', mb: 3 }}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2, fontSize: 28 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>Maintenance Orders Dashboard</Typography>
          <Tooltip title={`Logged in as: ${currentUserId}`}>
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>{currentUserId}</Button>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl">

        {/* ── KPI Cards ── */}
        <Fade in={!loading} timeout={800}>
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Require Approval" value={approvalOrdersLoading ? '...' : approvalOrders.length} unit="orders" icon={ErrorIcon} color="#2617f5" onClick={handleApprovalCardClick} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Notification Open" value={notificationData.length} trend="up" icon={AssignmentIcon} color="#FFC107" onClick={handleObservationCardClick} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="In Progress" value={inProgress.length} unit="orders" trend="up" trendValue="5%" icon={BuildIcon} color="#2196F3" onClick={handleInProgressCardClick} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Resolved" value={resolved.length} unit="orders" trend="up" trendValue="0%" icon={CheckCircleIcon} color="#4CAF50" onClick={handleResolvedCardClick} />
            </Grid>
          </Grid>
        </Fade>

        {/* Loading Overlay */}
        {loading && (
          <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <Box textAlign="center">
              <CircularProgress size={60} sx={{ color: 'white' }} />
              <Typography variant="body1" sx={{ color: 'white', mt: 2 }}>Loading dashboard...</Typography>
            </Box>
          </Box>
        )}

        {/* ── Activity Type (LIVE) + Breakdown Overview (LIVE) ── */}
        <Fade in={!loading} timeout={1400}>
          <Grid container spacing={3} mt={0}>

            {/* Breakdown Overview cards — live counts */}
            <Grid item xs={12} md={6}>
              <ChartCard title="Breakdown Overview" height={350}>
                <Grid container spacing={1} sx={{ width: '100%' }}>
                  {[
                    { key: 'generalActivity',    data: generalActivity,    ...ACTIVITY_CONFIG.generalActivity    },
                    { key: 'breakDownActivity',   data: breakDownActivity,  ...ACTIVITY_CONFIG.breakDownActivity  },
                    { key: 'amcActivity',         data: amcActivity,        ...ACTIVITY_CONFIG.amcActivity        },
                    { key: 'accidentalActivity',  data: accidentalActivity, ...ACTIVITY_CONFIG.accidentalActivity },
                  ].map((item) => (
                    <Grid item xs={12} sm={6} key={item.key}>
                      <Paper
                        sx={{
                          p: 2,
                          background: `linear-gradient(135deg, ${item.color}15 0%, ${item.color}05 100%)`,
                          borderLeft:  `5px solid ${item.color}`,
                          borderRight: `5px solid ${item.color}`,
                          borderRadius: 3,
                          transition: 'all 0.2s ease',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${item.color}30` },
                        }}
                      >
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '20%', backgroundColor: item.color }} />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: item.color }}>
                              {item.label}
                            </Typography>
                          </Box>
                          {/* live count badge */}
                          <Chip
                            label={item.data.length}
                            size="small"
                            sx={{
                              height: 22, minWidth: 32,
                              fontSize: '0.7rem', fontWeight: 800,
                              backgroundColor: item.color, color: 'white',
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#999', fontSize: '0.6rem', mt: 0.5, display: 'block' }}>
                          qmart: {ACTIVITY_CONFIG[item.key].qmart.join(', ')}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}

                  {/* Total row */}
                  <Grid item xs={12}>
                    <Paper sx={{ p: 1.5, background: 'linear-gradient(135deg, #37474F15 0%, #37474F05 100%)', borderLeft: '5px solid #37474F', borderRight: '5px solid #37474F', borderRadius: 3 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#37474F' }}>
                          Total Notifications
                        </Typography>
                        <Chip
                          label={generalActivity.length + breakDownActivity.length + amcActivity.length + accidentalActivity.length}
                          size="small"
                          sx={{ height: 22, minWidth: 32, fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#37474F', color: 'white', '& .MuiChip-label': { px: 1 } }}
                        />
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </ChartCard>
            </Grid>
            
            {/* Pie Chart — live from activityChartData */}
            <Grid item xs={12} md={6}>
              <ChartCard title="Maintenance Activity Type" height={350}>
                {activityChartData.every(d => d.value === 0) ? (
                  <Typography variant="body2" sx={{ color: '#aaa' }}>No activity data available</Typography>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activityChartData.filter(d => d.value > 0)}
                        cx="50%" cy="50%"
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {activityChartData.filter(d => d.value > 0).map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value, name) => [`${value} notifications`, name]}
                        contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.75rem' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </Grid>



          </Grid>
        </Fade>




        {/* ── Fault Trend ── */}
        <Fade in={!loading} timeout={1000}>
          <Grid container spacing={1} mb={2}>
            <Grid item xs={12} md={8}>
              <ChartCard title="Machine Fault Trends (Weekly)" height={250}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MACHINE_FAULT_TRENDS}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ea36f0" />
                    <XAxis dataKey="time" stroke="#f700ff" style={{ fontSize: '10px' }} />
                    <YAxis stroke="#ec3030" style={{ fontSize: '12px' }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="faults" stroke="#49e70a" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>
          </Grid>
        </Fade>

        {/* ── Faults Reported ── */}
        <Fade in={!loading} timeout={1200}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <ChartCard title="Total Faults Reported" height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={TOTAL_FAULTS_REPORTED}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="equipment" stroke="#999" style={{ fontSize: '12px' }} angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#999" style={{ fontSize: '12px' }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px' }} formatter={(v) => `${v} Faults`} />
                    <Bar dataKey="faults" fill="#667eea" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>
          </Grid>
        </Fade>

      </Container>

      {/* ── MODAL 1: Notification Open ── */}
      <NotificationModal
        open={showObservationModal}
        onClose={() => setShowObservationModal(false)}
        title="Notification Open"
        subtitle="All unique open notifications grouped by status"
        data={notificationData}
        headerColor="linear-gradient(135deg, #FFA000 0%, #FF6F00 100%)"
        icon={AssignmentIcon}
        isMobile={isMobile}
      />

      {/* ── MODAL 2: In Progress ── */}
      <NotificationModal
        open={showInProgressModal}
        onClose={() => setShowInProgressModal(false)}
        title="In Progress Notifications"
        subtitle="I0071 (Order Assigned) & I0159 (All Tasks Completed)"
        data={inProgress}
        headerColor="linear-gradient(135deg, #2196F3 0%, #1565C0 100%)"
        icon={BuildIcon}
        isMobile={isMobile}
      />

      {/* ── MODAL 3: Resolved ── */}
      <NotificationModal
        open={showResolvedModal}
        onClose={() => setShowResolvedModal(false)}
        title="Resolved Notifications"
        subtitle="I0072 (Notification Completed) & I0076 (Deletion Flag)"
        data={resolved}
        headerColor="linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)"
        icon={CheckCircleIcon}
        isMobile={isMobile}
      />

    </Box>
  );
};

export default MoDashboard;

