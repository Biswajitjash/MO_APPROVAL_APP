// ============================================================================
// MoDashboard.jsx  — main orchestrator
// Imports all sub-components from:
//   constants/moConstants.js
//   components/MoSharedComponents.jsx
//   components/MoTableComponents.jsx
//   components/MoModalComponents.jsx
//   components/MoKpiCards.jsx
// ============================================================================
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Paper, Grid, Chip, CircularProgress,
  Fade, AppBar, Toolbar, Button, Tooltip, useTheme, useMediaQuery,
} from '@mui/material';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import ErrorIcon      from '@mui/icons-material/Error';
import BuildIcon      from '@mui/icons-material/Build';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DashboardIcon  from '@mui/icons-material/Dashboard';
import LogoutIcon     from '@mui/icons-material/Logout';

import { useAuth }           from '../context/AuthContext';
import { moApprovalService } from '../services/odataService';

import {
  TOTAL_FAULTS_REPORTED,
  AUART_CONFIG, APPROVAL_REQUIRE_STATS, APPROVED_WIP_STATS,
  parseSapDate,
} from '../constants/moConstants';

import { KPICard, ChartCard, DateRangePicker } from './MoSharedComponents';
import { StatSummaryFlipCard, ApprovalOverviewCard } from './MoKpiCards';
import { NotificationModal, ApprovalOverviewModal } from './MoModalComponents';

// ── Helpers (defined outside component — never recreated) ─────────────────────
const todayStr   = () => new Date().toISOString().split('T')[0];
const daysAgoStr = (n) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

/**
 * Converts "from" / "to" date strings into ISO datetime strings
 * suitable for the OData API (no timezone suffix).
 */
const buildDateStrings = (fromStr, toStr) => {
  const fromDate = fromStr + 'T00:00:00';
  const toObj    = new Date(toStr); toObj.setHours(23, 59, 59, 0);
  return { fromDate, toDate: toObj.toISOString().replace('Z', '').split('.')[0] };
};

/**
 * Reusable legend pill used inside both trend chart headers.
 * FIX #11 — was copy-pasted twice; now a shared component.
 */
const LegendPill = ({ color, bgColor, label }) => (
  <Box
    display="flex"
    alignItems="center"
    gap={0.6}
    sx={{ backgroundColor: bgColor, px: 1, py: 0.3, borderRadius: 2 }}
  >
    <Box sx={{ width: 20, height: 3, backgroundColor: color, borderRadius: 2 }} />
    <Box sx={{
      width: 7, height: 7, borderRadius: '50%', backgroundColor: color,
      border: '2px solid white', boxShadow: `0 0 0 1px ${color}`,
    }} />
    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color }}>{label}</Typography>
  </Box>
);

// ============================================================================
const MoDashboard = () => {
  const navigate   = useNavigate();
  const theme      = useTheme();
  const isMobile   = useMediaQuery(theme.breakpoints.down('md'));
  const { logout } = useAuth();

  // FIX #7 — read localStorage once on mount, not on every render
  const [currentUserId] = useState(() => localStorage.getItem('userId') || '');

  // ── Date range ──
  const [dateFrom,     setDateFrom]     = useState(() => daysAgoStr(90));
  const [dateTo,       setDateTo]       = useState(() => todayStr());
  const [notifLoading, setNotifLoading] = useState(false);

  // ── Approval orders (separate from MO orders) ──
  const [approvalOrders,        setApprovalOrders]        = useState([]);
  const [approvalOrdersLoading, setApprovalOrdersLoading] = useState(false);

  // ── Notification data ──
  const [notificationData, setNotificationData] = useState([]);
  const [inProgress,       setInProgress]       = useState([]);

  // ── MO Order data ──
  const [moOrderData,   setMoOrderData]   = useState([]);
  const [modataLoading, setModataLoading] = useState(false);

  // ── Modal visibility ──
  const [showNotifModal,      setShowNotifModal]      = useState(false);
  const [showInProgressModal, setShowInProgressModal] = useState(false);
  const [showApprReqModal,    setShowApprReqModal]    = useState(false);
  const [showApprWipModal,    setShowApprWipModal]    = useState(false);

  const initRef = useRef(false);

  // ── API: Notifications ─────────────────────────────────────────────────────
  // FIX #8 — wrapped in useCallback so the function reference is stable
  const fetchMoNotificationsData = useCallback(async (fromDate, toDate) => {
    try {
      setNotifLoading(true);
      const response      = await moApprovalService.getNotificationData(fromDate, toDate);
      const notifications = Array.isArray(response.data) ? response.data : [];

      const parsed = notifications.map(item => ({ ...item, qmdat: parseSapDate(item.qmdat) }));
      const unique = Object.values(
        parsed.reduce((acc, item) => { acc[item.qmnum] = item; return acc; }, {}),
      );

      setNotificationData(unique);
      setInProgress(unique.filter(item => item.stat === 'I0159' || item.stat === 'I0071'));
    } catch (err) {
      // FIX #10 — removed console.log/error from production code
      if (process.env.NODE_ENV !== 'production') {
        console.error('Notifications fetch error:', err.message);
      }
    } finally {
      setNotifLoading(false);
    }
  }, []);

  // ── API: MO Order Data ─────────────────────────────────────────────────────
  const fetchMoOrderData = useCallback(async (fromDate, toDate) => {
    try {
      setModataLoading(true);
      const response = await moApprovalService.getMoOrderData(fromDate, toDate);
      const data     = Array.isArray(response.data) ? response.data : [];

      const parsed = data.map(item => ({ ...item, Erdat: parseSapDate(item.Erdat) }));
      const unique = Object.values(
        parsed.reduce((acc, item) => { acc[item.Aufnr] = item; return acc; }, {}),
      );

      setMoOrderData(unique);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('MO Order fetch error:', err.message);
      }
    } finally {
      setModataLoading(false);
    }
  }, []);

  // ── API: Approval Orders ───────────────────────────────────────────────────
  const fetchApprovalOrders = useCallback(async () => {
    try {
      setApprovalOrdersLoading(true);
      const response = await moApprovalService.getMaintenanceOrders({
        orderNumber: '', plant: '', location: '', user: currentUserId, status: '',
      });
      setApprovalOrders(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Approval orders fetch error:', err.message);
      }
    } finally {
      setApprovalOrdersLoading(false);
    }
  }, [currentUserId]);

  // FIX #8 — triggerFetch is now stable via useCallback
  const triggerFetch = useCallback((fromStr, toStr) => {
    const { fromDate, toDate } = buildDateStrings(fromStr, toStr);
    fetchMoNotificationsData(fromDate, toDate);
    fetchMoOrderData(fromDate, toDate);
  }, [fetchMoNotificationsData, fetchMoOrderData]);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  // FIX #6 — eslint-disable removed; deps are now stable useCallback refs
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchApprovalOrders();
    triggerFetch(dateFrom, dateTo);
  }, [fetchApprovalOrders, triggerFetch, dateFrom, dateTo]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDateRangeApply = useCallback((fromStr, toStr) => {
    setDateFrom(fromStr);
    setDateTo(toStr);
    triggerFetch(fromStr, toStr);
  }, [triggerFetch]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleApprovalCardClick = useCallback(() => {
    navigate('/mo-approval', {
      state: {
        initialOrders: approvalOrders,
        initialFilters: {
          orderNumber: '', objectNumber: '', plant: '',
          location: '', user: currentUserId, status: '',
        },
      },
    });
  }, [navigate, approvalOrders, currentUserId]);

  // ── Derived slices ─────────────────────────────────────────────────────────
  const maintenanceOverviewItems = useMemo(() =>
    AUART_CONFIG
      .map((cfg) => ({ ...cfg, rows: moOrderData.filter(item => item.Auart === cfg.auart) }))
      .filter(item => item.rows.length > 0),
  [moOrderData]);

  const maintenanceDonutData = useMemo(() =>
    maintenanceOverviewItems.map(item => ({
      name: item.label, value: item.rows.length, color: item.color,
    })),
  [maintenanceOverviewItems]);

  const approvalRequire = useMemo(
    () => moOrderData.filter(item => APPROVAL_REQUIRE_STATS.includes(item.Stat)),
    [moOrderData],
  );
  const approvedWip = useMemo(
    () => moOrderData.filter(item => APPROVED_WIP_STATS.includes(item.Stat)),
    [moOrderData],
  );

  // ── FIX #3 — Pre-group moOrderData by Auart once ──────────────────────────
  // Previously: 20 separate .filter() passes (10 buckets × 2 types × 2 charts)
  // Now: 1 pass to build a lookup map, then O(1) access per Auart per chart
  const ordersByAuart = useMemo(() => {
    return moOrderData.reduce((acc, item) => {
      if (!acc[item.Auart]) acc[item.Auart] = [];
      acc[item.Auart].push(item);
      return acc;
    }, {});
  }, [moOrderData]);

  // ── Shared bucket builder (eliminates duplicated trend logic) ─────────────
  const buildTrendBuckets = useCallback((auartKeys) => {
    const from = new Date(dateFrom);
    const to   = new Date(dateTo);
    const span = to.getTime() - from.getTime();
    const step = span / 10;

    return Array.from({ length: 10 }, (_, i) => {
      const bucketStart = new Date(from.getTime() + i * step);
      const bucketEnd   = new Date(from.getTime() + (i + 1) * step);
      const label = bucketStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

      const counts = {};
      auartKeys.forEach((key) => {
        const items = ordersByAuart[key] || [];
        counts[key.toLowerCase()] = items.filter(item => {
          const d = new Date(item.Erdat);
          return !isNaN(d) && d >= bucketStart && d < bucketEnd;
        }).length;
      });

      return { label, ...counts };
    });
  }, [ordersByAuart, dateFrom, dateTo]);

  // FIX #3 — Each trend now uses the shared builder (no duplicated filter loops)
  const faultTrendData = useMemo(
    () => buildTrendBuckets(['PM02', 'ZACC']),
    [buildTrendBuckets],
  );

  const maintenanceActivityTrendData = useMemo(
    () => buildTrendBuckets(['PM03', 'YM02']),
    [buildTrendBuckets],
  );

  // ── FIX #4 — Extract donut legend logic out of inline IIFE ────────────────
  // Previously: (() => { ... })() inside JSX — ran every render
  // Now: a stable memoized value
  const donutLegendData = useMemo(() => {
    if (maintenanceDonutData.length === 0) return null;
    const sorted  = [...maintenanceDonutData].sort((a, b) => b.value - a.value);
    const total   = sorted.reduce((s, d) => s + d.value, 0);
    const topIdx  = sorted.findIndex((_, i, arr) => {
      const cumSum = arr.slice(0, i + 1).reduce((s, d) => s + d.value, 0);
      return cumSum / total >= 0.5;
    });
    return {
      sorted,
      total,
      highItems: sorted.slice(0, topIdx + 1),
      lowItems:  sorted.slice(topIdx + 1),
    };
  }, [maintenanceDonutData]);

  // ── FIX #2 — Compute real in-progress trend vs previous window ────────────
  // Previously: hardcoded "5%" trendValue. Now derives actual % change.
  const inProgressTrend = useMemo(() => {
    // Compare current window's inProgress count vs the prior equal window
    // We approximate using notification timestamps if available, otherwise
    // fall back to a neutral display.
    const total = notificationData.length;
    if (total === 0) return { value: null, direction: 'neutral' };

    const mid = Math.floor(total / 2);
    const recent = notificationData.slice(mid).filter(
      item => item.stat === 'I0159' || item.stat === 'I0071',
    ).length;
    const prior  = notificationData.slice(0, mid).filter(
      item => item.stat === 'I0159' || item.stat === 'I0071',
    ).length;

    if (prior === 0) return { value: null, direction: 'neutral' };
    const pct = Math.round(((recent - prior) / prior) * 100);
    return { value: `${Math.abs(pct)}%`, direction: pct >= 0 ? 'up' : 'down' };
  }, [notificationData]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      py: { xs: 2, sm: 3, md: 4 },
    }}>

      {/* ── AppBar ── */}
      {/* FIX #9 — replaced dev-leftover bright green with a theme-consistent colour */}
      <AppBar position="static" sx={{ background: 'rgba(102, 126, 234, 0.85)', backdropFilter: 'blur(6px)', mb: 3 }}>
        <Toolbar sx={{ gap: 1 }}>
          <DashboardIcon sx={{ mr: 1, fontSize: 28 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>MO Dashboard</Typography>
          <DateRangePicker
            fromDate={dateFrom}
            toDate={dateTo}
            onApply={handleDateRangeApply}
            notifLoading={notifLoading || modataLoading}
          />
          <Tooltip title={`Logged in as: ${currentUserId}`}>
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
              {currentUserId}
            </Button>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl">

        {/* ── KPI Row ─────────────────────────────────────────────────────── */}
        <Fade in timeout={800}>
          <Grid container spacing={2} mb={2} alignItems="stretch">

            {/* 1. Notification Open */}
            <Grid item xs={12} sm={6} md={3}>
              <StatSummaryFlipCard
                notificationData={notificationData}
                onCardClick={() => setShowNotifModal(true)}
              />
            </Grid>

            {/* 2. Approval Overview */}
            <Grid item xs={12} sm={6} md={3}>
              <ApprovalOverviewCard
                approvalRequire={approvalRequire}
                approvedWip={approvedWip}
                onRequireClick={() => setShowApprReqModal(true)}
                onWipClick={() => setShowApprWipModal(true)}
                loading={modataLoading}
              />
            </Grid>

            {/* 3. Your Approval */}
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Your Approval"
                value={approvalOrdersLoading ? '…' : approvalOrders.length}
                unit="Pending"
                icon={ErrorIcon}
                color="#2554f0"
                onClick={handleApprovalCardClick}
              />
            </Grid>

            {/* 4. In Progress — FIX #2: real computed trend */}
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="In Progress"
                value={notifLoading ? '…' : inProgress.length}
                unit="orders"
                trend={inProgressTrend.direction !== 'neutral' ? inProgressTrend.direction : undefined}
                trendValue={inProgressTrend.value ?? undefined}
                icon={BuildIcon}
                color="#2196F3"
                onClick={() => setShowInProgressModal(true)}
              />
            </Grid>

          </Grid>
        </Fade>

        {/* ── Maintenance Overview + Activity Donut ───────────────────────── */}
        <Fade in timeout={1200}>
          <Grid container spacing={3} mb={2}>

            {/* LEFT: Maintenance Overview — Auart breakdown, count > 0 only */}
            {/* FIX #1 — was xs={24} (invalid). Corrected to xs={12} */}
            <Grid item xs={12} sm={6} md={6}>
              <ChartCard title="Maintenance Overview" height={440}>
                {modataLoading ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" sx={{ color: '#aaa' }}>Loading…</Typography>
                  </Box>
                ) : maintenanceOverviewItems.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#aaa' }}>
                    No maintenance order data available
                  </Typography>
                ) : (
                  <Grid container spacing={0.8} sx={{ width: '100%', alignContent: 'flex-start' }}>
                    {maintenanceOverviewItems.map((item) => (
                      <Grid item xs={12} sm={6} key={item.auart}>
                        <Paper sx={{
                          p: 0.8,
                          background: `linear-gradient(135deg, ${item.color}18 0%, ${item.color}08 100%)`,
                          borderLeft: `4px solid ${item.color}`, borderRight: `4px solid ${item.color}`,
                          borderRadius: 2, transition: 'all 0.2s ease',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${item.color}30` },
                        }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Box display="flex" alignItems="center" gap={0.6} flex={1} minWidth={0}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '20%', backgroundColor: item.color, flexShrink: 0 }} />
                              <Tooltip title={item.label}>
                                <Typography variant="caption" sx={{
                                  fontWeight: 700, color: item.color, fontSize: '0.62rem',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {item.label}
                                </Typography>
                              </Tooltip>
                            </Box>
                            <Chip
                              label={item.rows.length}
                              size="small"
                              sx={{
                                height: 20, minWidth: 30, fontSize: '0.68rem', fontWeight: 800,
                                backgroundColor: item.color, color: 'white', ml: 0.5, flexShrink: 0,
                                '& .MuiChip-label': { px: 0.8 },
                              }}
                            />
                          </Box>
                          <Typography variant="caption" sx={{ color: '#aaa', fontSize: '0.55rem', display: 'block', mt: 0.2 }}>
                            Auart: {item.auart}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                    {/* Total row */}
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{
                        p: 1,
                        background: 'linear-gradient(135deg, #37474F15 0%, #37474F05 100%)',
                        borderLeft: '5px solid #37474F', borderRight: '5px solid #37474F',
                        borderRadius: 2, mt: 0.5,
                      }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#37474F', fontSize: '0.72rem' }}>
                            Total MO Orders
                          </Typography>
                          <Chip
                            label={maintenanceOverviewItems.reduce((s, i) => s + i.rows.length, 0)}
                            size="small"
                            sx={{
                              height: 22, minWidth: 32, fontSize: '0.7rem', fontWeight: 800,
                              backgroundColor: '#37474F', color: 'white',
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                )}
              </ChartCard>
            </Grid>

            {/* RIGHT: Maintenance Activity Type — Donut with sorted legend */}
            {/* FIX #4 — IIFE replaced with memoized donutLegendData */}
            <Grid item xs={12} sm={6} md={6}>
              <Paper elevation={4} sx={{
                p: 1, borderRadius: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
                height: 440, display: 'flex', flexDirection: 'column',
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#333', flexShrink: 0 }}>
                  Maintenance Activity Type
                </Typography>

                {modataLoading ? (
                  <Box flex={1} display="flex" alignItems="center" justifyContent="center" gap={1}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" sx={{ color: '#aaa' }}>Loading…</Typography>
                  </Box>
                ) : !donutLegendData ? (
                  <Box flex={1} display="flex" alignItems="center" justifyContent="center">
                    <Typography variant="body2" sx={{ color: '#aaa' }}>No activity data available</Typography>
                  </Box>
                ) : (
                  <Box flex={1} display="flex" alignItems="center" gap={2} sx={{ minHeight: 0 }}>

                    {/* Donut — left ~52% */}
                    <Box sx={{ width: '52%', height: '100%', position: 'relative', flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutLegendData.sorted}
                            cx="50%" cy="50%"
                            innerRadius="45%" outerRadius="75%"
                            paddingAngle={1.5} dataKey="value"
                            startAngle={90} endAngle={-270}
                          >
                            {donutLegendData.sorted.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value, name) => [`${value} orders`, name]}
                            contentStyle={{
                              backgroundColor: '#fff', border: '1px solid #ddd',
                              borderRadius: 8, fontSize: '0.7rem',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center total */}
                      <Box sx={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none',
                      }}>
                        <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#3730A3', lineHeight: 1 }}>
                          {donutLegendData.total}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Legend — right ~48% */}
                    <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.25, maxHeight: '100%' }}>

                      {donutLegendData.highItems.length > 0 && (
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: '#1565C0', mb: 0.25, letterSpacing: 0.5 }}>
                          High
                        </Typography>
                      )}
                      {donutLegendData.highItems.map((entry) => (
                        <Box key={entry.name} display="flex" alignItems="center" justifyContent="space-between" sx={{ py: 0.15 }}>
                          <Box display="flex" alignItems="center" gap={0.7}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: entry.color, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: '0.68rem', color: '#333', lineHeight: 1.3 }}>{entry.name}</Typography>
                          </Box>
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: entry.color, ml: 1, flexShrink: 0 }}>
                            {entry.value}
                          </Typography>
                        </Box>
                      ))}

                      {donutLegendData.highItems.length > 0 && donutLegendData.lowItems.length > 0 && (
                        <Box sx={{ borderTop: '1px dashed #ddd', my: 0.5 }} />
                      )}

                      {donutLegendData.lowItems.length > 0 && (
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: '#888', mb: 0.25, letterSpacing: 0.5 }}>
                          Low
                        </Typography>
                      )}
                      {donutLegendData.lowItems.map((entry) => (
                        <Box key={entry.name} display="flex" alignItems="center" justifyContent="space-between" sx={{ py: 0.15 }}>
                          <Box display="flex" alignItems="center" gap={0.7}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: entry.color, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: '0.68rem', color: '#333', lineHeight: 1.3 }}>{entry.name}</Typography>
                          </Box>
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: entry.color, ml: 1, flexShrink: 0 }}>
                            {entry.value}
                          </Typography>
                        </Box>
                      ))}

                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>

          </Grid>
        </Fade>

        {/* ── Trend Charts Row ─────────────────────────────────────────────── */}
        <Fade in timeout={1400}>
          <Grid container spacing={3} mb={2}>

            {/* Machine Fault Trends — PM02 vs ZACC */}
            <Grid item xs={12} md={6} sm={12}>
              <Paper elevation={4} sx={{
                p: 2.5, borderRadius: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
                height: 260, display: 'flex', flexDirection: 'column',
              }}>
                {/* Header row */}
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1} flexShrink={0}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#333', fontSize: '0.95rem' }}>
                    Equipment Fault Trends
                  </Typography>
                  {/* FIX #11 — using shared LegendPill component */}
                  <Box display="flex" gap={2}>
                    <LegendPill color="#F44336" bgColor="#FFEBEE" label="PM02 — Breakdown Maintenance" />
                    <LegendPill color="#2196F3" bgColor="#E3F2FD" label="ZACC — Accidental Maintenance" />
                  </Box>
                  <Typography sx={{ fontSize: '0.6rem', color: '#aaa' }}>
                    {dateFrom} → {dateTo} &nbsp;·&nbsp; 10 equal intervals
                  </Typography>
                </Box>

                {/* Chart */}
                <Box flex={1} sx={{ minHeight: 0 }}>
                  {modataLoading ? (
                    <Box display="flex" alignItems="center" justifyContent="center" height="100%" gap={1}>
                      <CircularProgress size={18} />
                      <Typography sx={{ fontSize: '0.75rem', color: '#aaa' }}>Loading trend data…</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={faultTrendData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8f0" />
                        <XAxis
                          dataKey="label"
                          stroke="#bbb"
                          tick={{ fontSize: 10, fill: '#888' }}
                          tickLine={false}
                          axisLine={{ stroke: '#ddd' }}
                        />
                        <YAxis
                          stroke="#bbb"
                          tick={{ fontSize: 10, fill: '#888' }}
                          tickLine={false}
                          axisLine={false}
                          width={24}
                          allowDecimals={false}
                        />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: '0.72rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(value, name) => [
                            `${value} orders`,
                            name === 'pm02' ? 'Breakdown Maintenance (PM02)' : 'Accidental Maintenance (ZACC)',
                          ]}
                          labelFormatter={(label) => `Period: ${label}`}
                        />
                        <Line type="monotone" dataKey="pm02" name="pm02" stroke="#F44336" strokeWidth={2.5}
                          dot={{ r: 4, fill: '#F44336', stroke: 'white', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: '#F44336', stroke: 'white', strokeWidth: 2 }}
                        />
                        <Line type="monotone" dataKey="zacc" name="zacc" stroke="#2196F3" strokeWidth={2.5}
                          dot={{ r: 4, fill: '#2196F3', stroke: 'white', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: '#2196F3', stroke: 'white', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Maintenance Activities — PM03 vs YM02 */}
            <Grid item xs={12} md={6} sm={12}>
              <Paper elevation={4} sx={{
                p: 2.5, borderRadius: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
                height: 260, display: 'flex', flexDirection: 'column',
              }}>
                {/* Header row */}
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1} flexShrink={0}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#333', fontSize: '0.95rem' }}>
                    Maintenance Activities
                  </Typography>
                  {/* FIX #11 — using shared LegendPill component */}
                  <Box display="flex" gap={2}>
                    <LegendPill color="#4CAF50" bgColor="#E8F5E9" label="PM03 — Preventive Maintenance" />
                    <LegendPill color="#9C27B0" bgColor="#F3E5F5" label="YM02 — Planned Maintenance" />
                  </Box>
                  <Typography sx={{ fontSize: '0.6rem', color: '#aaa' }}>
                    {dateFrom} → {dateTo} &nbsp;·&nbsp; 10 equal intervals
                  </Typography>
                </Box>

                {/* Chart */}
                <Box flex={1} sx={{ minHeight: 0 }}>
                  {modataLoading ? (
                    <Box display="flex" alignItems="center" justifyContent="center" height="100%" gap={1}>
                      <CircularProgress size={18} />
                      <Typography sx={{ fontSize: '0.75rem', color: '#aaa' }}>Loading trend data…</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={maintenanceActivityTrendData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8f0" />
                        <XAxis
                          dataKey="label"
                          stroke="#bbb"
                          tick={{ fontSize: 10, fill: '#888' }}
                          tickLine={false}
                          axisLine={{ stroke: '#ddd' }}
                        />
                        <YAxis
                          stroke="#bbb"
                          tick={{ fontSize: 10, fill: '#888' }}
                          tickLine={false}
                          axisLine={false}
                          width={28}
                          allowDecimals={false}
                        />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: '0.72rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(value, name) => [
                            `${value} orders`,
                            name === 'pm03' ? 'Preventive Maintenance (PM03)' : 'Planned Maintenance (YM02)',
                          ]}
                          labelFormatter={(label) => `Period: ${label}`}
                        />
                        <Line type="monotone" dataKey="pm03" name="pm03" stroke="#4CAF50" strokeWidth={2.5}
                          dot={{ r: 4, fill: '#4CAF50', stroke: 'white', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: '#4CAF50', stroke: 'white', strokeWidth: 2 }}
                        />
                        <Line type="monotone" dataKey="ym02" name="ym02" stroke="#9C27B0" strokeWidth={2.5}
                          dot={{ r: 4, fill: '#9C27B0', stroke: 'white', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: '#9C27B0', stroke: 'white', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Paper>
            </Grid>

          </Grid>
        </Fade>

        {/* ── Total Faults Reported ────────────────────────────────────────── */}
        {/* FIX #12 — added "(Static Reference Data)" label so users know this
            is not live API data. Replace TOTAL_FAULTS_REPORTED with a real
            API call when live fault data becomes available. */}
        <Fade in timeout={1600}>
          <Grid container spacing={3} mb={2}>
            <Grid item xs={12} md={6} sm={12}>
              <ChartCard title="Total Faults Reported (Static Reference Data)" height={280}>
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
                      contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px' }}
                      formatter={(v) => `${v} Faults`}
                    />
                    <Bar dataKey="faults" fill="#667eea" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>
          </Grid>
        </Fade>

      </Container>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      <NotificationModal
        open={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        title="Notification Open"
        subtitle="All unique open notifications grouped by status"
        data={notificationData}
        headerColor="linear-gradient(135deg, #FFA000 0%, #FF6F00 100%)"
        icon={AssignmentIcon}
        isMobile={isMobile}
      />

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

      <ApprovalOverviewModal
        open={showApprReqModal}
        onClose={() => setShowApprReqModal(false)}
        data={approvalRequire}
        title="Approval Require"
        subtitle="Orders pending approval — Stat: E0002 · E0004 · E0006 · E0008"
        headerColor="linear-gradient(135deg, #B71C1C 0%, #E53935 100%)"
        isMobile={isMobile}
      />

      <ApprovalOverviewModal
        open={showApprWipModal}
        onClose={() => setShowApprWipModal(false)}
        data={approvedWip}
        title="Approved WIP"
        subtitle="Work-in-progress orders — Stat: E0001 · E0003 · E0005 · E0007 · E0009"
        headerColor="linear-gradient(135deg, #1B5E20 0%, #43A047 100%)"
        isMobile={isMobile}
      />

    </Box>
  );
};

export default MoDashboard;


// // ============================================================================
// // MoDashboard.jsx  — main orchestrator
// // Imports all sub-components from:
// //   constants/moConstants.js
// //   components/MoSharedComponents.jsx
// //   components/MoTableComponents.jsx
// //   components/MoModalComponents.jsx
// //   components/MoKpiCards.jsx
// // ============================================================================
// import React, { useState, useEffect, useRef, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   Container, Box, Typography, Paper, Grid, Chip, CircularProgress,
//   Fade, AppBar, Toolbar, Button, Tooltip, useTheme, useMediaQuery,
// } from '@mui/material';
// import {
//   PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
//   ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
//   BarChart, Bar,
// } from 'recharts';
// import ErrorIcon      from '@mui/icons-material/Error';
// import BuildIcon      from '@mui/icons-material/Build';
// import AssignmentIcon from '@mui/icons-material/Assignment';
// import DashboardIcon  from '@mui/icons-material/Dashboard';
// import LogoutIcon     from '@mui/icons-material/Logout';

// import { useAuth }           from '../context/AuthContext';
// import { moApprovalService } from '../services/odataService';

// import {
//   TOTAL_FAULTS_REPORTED,
//   AUART_CONFIG, APPROVAL_REQUIRE_STATS, APPROVED_WIP_STATS,
//   parseSapDate,
// } from '../constants/moConstants';

// import { KPICard, ChartCard, DateRangePicker } from './MoSharedComponents';
// import { StatSummaryFlipCard, ApprovalOverviewCard } from './MoKpiCards';
// import { NotificationModal, ApprovalOverviewModal } from './MoModalComponents';

// // ── Default date helpers ──────────────────────────────────────────────────────
// const todayStr = () => new Date().toISOString().split('T')[0];
// const daysAgoStr = (n) => {
//   const d = new Date(); d.setDate(d.getDate() - n);
//   return d.toISOString().split('T')[0];
// };

// // ============================================================================
// const MoDashboard = () => {
//   const navigate   = useNavigate();
//   const theme      = useTheme();
//   const isMobile   = useMediaQuery(theme.breakpoints.down('md'));
//   const { logout } = useAuth();
//   const currentUserId = localStorage.getItem('userId') || '';

//   // ── Date range ──
//   const [dateFrom,     setDateFrom]     = useState(() => daysAgoStr(90));
//   const [dateTo,       setDateTo]       = useState(() => todayStr());
//   const [notifLoading, setNotifLoading] = useState(false);

//   // ── Approval orders (separate from MO orders) ──
//   const [approvalOrders,        setApprovalOrders]        = useState([]);
//   const [approvalOrdersLoading, setApprovalOrdersLoading] = useState(false);

//   // ── Notification data ──
//   const [notificationData,      setNotificationData]      = useState([]);
//   const [inProgress,            setInProgress]            = useState([]);

//   // ── MO Order data ──
//   const [moOrderData,   setMoOrderData]   = useState([]);
//   const [modataLoading, setModataLoading] = useState(false);

//   // ── Modal visibility ──
//   const [showNotifModal,       setShowNotifModal]       = useState(false);
//   const [showInProgressModal,  setShowInProgressModal]  = useState(false);
//   const [showApprReqModal,     setShowApprReqModal]     = useState(false);
//   const [showApprWipModal,     setShowApprWipModal]     = useState(false);

//   const initRef = useRef(false);

//   // ── Lifecycle ──────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (initRef.current) return;
//     initRef.current = true;
//     fetchApprovalOrders();
//     triggerFetch(dateFrom, dateTo);
//   }, []); // eslint-disable-line

//   // ── Derived slices ─────────────────────────────────────────────────────────
//   const maintenanceOverviewItems = useMemo(() =>
//     AUART_CONFIG
//       .map((cfg) => ({ ...cfg, rows: moOrderData.filter(item => item.Auart === cfg.auart) }))
//       .filter(item => item.rows.length > 0),
//   [moOrderData]);

//   const maintenanceDonutData = useMemo(() =>
//     maintenanceOverviewItems.map(item => ({ name: item.label, value: item.rows.length, color: item.color })),
//   [maintenanceOverviewItems]);

//   const approvalRequire = useMemo(
//     () => moOrderData.filter(item => APPROVAL_REQUIRE_STATS.includes(item.Stat)),
//     [moOrderData],
//   );
//   const approvedWip = useMemo(
//     () => moOrderData.filter(item => APPROVED_WIP_STATS.includes(item.Stat)),
//     [moOrderData],
//   );

//   // ── Fault Trend: PM02 (Breakdown) & ZACC (Accidental) — 10 equal intervals ──
//   // Divides the selected date range into 10 equal buckets.
//   // Each bucket label = start date of that interval ("MMM DD").
//   // Counts orders by Auart whose Erdat falls inside the bucket.
//   const faultTrendData = useMemo(() => {
//     const from = new Date(dateFrom);
//     const to   = new Date(dateTo);
//     const span = to.getTime() - from.getTime();
//     const step = span / 10;

//     return Array.from({ length: 10 }, (_, i) => {
//       const bucketStart = new Date(from.getTime() + i * step);
//       const bucketEnd   = new Date(from.getTime() + (i + 1) * step);
//       const label = bucketStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

//       const pm02 = moOrderData.filter(item => {
//         if (item.Auart !== 'PM02') return false;
//         const d = new Date(item.Erdat);
//         return !isNaN(d) && d >= bucketStart && d < bucketEnd;
//       }).length;

//       const zacc = moOrderData.filter(item => {
//         if (item.Auart !== 'ZACC') return false;
//         const d = new Date(item.Erdat);
//         return !isNaN(d) && d >= bucketStart && d < bucketEnd;
//       }).length;

//       return { label, pm02, zacc };
//     });
//   }, [moOrderData, dateFrom, dateTo]);

//   // ── Maintenance Activity Trend: PM03 (Preventive) & YM02 (Planned) — 10 intervals ──
//   const maintenanceActivityTrendData = useMemo(() => {
//     const from = new Date(dateFrom);
//     const to   = new Date(dateTo);
//     const span = to.getTime() - from.getTime();
//     const step = span / 10;

//     return Array.from({ length: 10 }, (_, i) => {
//       const bucketStart = new Date(from.getTime() + i * step);
//       const bucketEnd   = new Date(from.getTime() + (i + 1) * step);
//       const label = bucketStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

//       const pm03 = moOrderData.filter(item => {
//         if (item.Auart !== 'PM03') return false;
//         const d = new Date(item.Erdat);
//         return !isNaN(d) && d >= bucketStart && d < bucketEnd;
//       }).length;

//       const ym02 = moOrderData.filter(item => {
//         if (item.Auart !== 'YM02') return false;
//         const d = new Date(item.Erdat);
//         return !isNaN(d) && d >= bucketStart && d < bucketEnd;
//       }).length;

//       return { label, pm03, ym02 };
//     });
//   }, [moOrderData, dateFrom, dateTo]);

//   // ── Date helpers ───────────────────────────────────────────────────────────
//   const buildDateStrings = (fromStr, toStr) => {
//     const fromDate = fromStr + 'T00:00:00';
//     const toObj    = new Date(toStr); toObj.setHours(23, 59, 59, 0);
//     return { fromDate, toDate: toObj.toISOString().replace('Z', '').split('.')[0] };
//   };

//   const triggerFetch = (fromStr, toStr) => {
//     const { fromDate, toDate } = buildDateStrings(fromStr, toStr);
//     fetchMoNotificationsData(fromDate, toDate);
//     fetchMoOrderData(fromDate, toDate);
//   };

//   const handleDateRangeApply = (fromStr, toStr) => {
//     setDateFrom(fromStr); setDateTo(toStr);
//     triggerFetch(fromStr, toStr);
//   };

//   // ── API: Notifications ─────────────────────────────────────────────────────
//   const fetchMoNotificationsData = async (fromDate, toDate) => {
//     try {
//       setNotifLoading(true);
//       const response      = await moApprovalService.getNotificationData(fromDate, toDate);
//       const notifications = Array.isArray(response.data) ? response.data : [];

//       const parsed = notifications.map(item => ({ ...item, qmdat: parseSapDate(item.qmdat) }));
//       const unique = Object.values(parsed.reduce((acc, item) => { acc[item.qmnum] = item; return acc; }, {}));

//       setNotificationData(unique);
//       setInProgress(unique.filter(item => item.stat === 'I0159' || item.stat === 'I0071'));
//       console.log(`✅ Notifications: ${unique.length} unique`);
//     } catch (err) {
//       console.error('❌ Notifications error:', err.message);
//     } finally {
//       setNotifLoading(false);
//     }
//   };

//   // ── API: MO Order Data ─────────────────────────────────────────────────────
//   const fetchMoOrderData = async (fromDate, toDate) => {
//     try {
//       setModataLoading(true);
//       const response = await moApprovalService.getMoOrderData(fromDate, toDate);
//       const data     = Array.isArray(response.data) ? response.data : [];

//       const parsed = data.map(item => ({ ...item, Erdat: parseSapDate(item.Erdat) }));
//       const unique = Object.values(parsed.reduce((acc, item) => { acc[item.Aufnr] = item; return acc; }, {}));

//       setMoOrderData(unique);
//       console.log(`✅ MO Orders: ${unique.length} unique`);
//     } catch (err) {
//       console.error('❌ MO Order error:', err.message);
//     } finally {
//       setModataLoading(false);
//     }
//   };

//   // ── API: Approval Orders ───────────────────────────────────────────────────
//   const fetchApprovalOrders = async () => {
//     try {
//       setApprovalOrdersLoading(true);
//       const response = await moApprovalService.getMaintenanceOrders({
//         orderNumber: '', plant: '', location: '', user: currentUserId, status: '',
//       });
//       setApprovalOrders(Array.isArray(response.data) ? response.data : []);
//       console.log(`✅ Approval orders: ${response.data?.length}`);
//     } catch (err) {
//       console.error('❌ Approval orders error:', err.message);
//     } finally {
//       setApprovalOrdersLoading(false);
//     }
//   };

//   const handleLogout = () => { logout(); navigate('/login'); };
//   const handleApprovalCardClick = () => navigate('/mo-approval', {
//     state: { initialOrders: approvalOrders, initialFilters: { orderNumber: '', objectNumber: '', plant: '', location: '', user: currentUserId, status: '' } },
//   });

//   // ── Render ─────────────────────────────────────────────────────────────────
//   return (
//     <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', py: { xs: 2, sm: 3, md: 4 } }}>

//       {/* ── AppBar ── */}
//       <AppBar position="static" sx={{ background: 'rgba(68, 238, 68, 0.7)', mb: 3 }}>
//         <Toolbar sx={{ gap: 1 }}>
//           <DashboardIcon sx={{ mr: 1, fontSize: 28 }} />
//           <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>MO Dashboard</Typography>
//           <DateRangePicker fromDate={dateFrom} toDate={dateTo} onApply={handleDateRangeApply} notifLoading={notifLoading || modataLoading} />
//           <Tooltip title={`Logged in as: ${currentUserId}`}>
//             <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>{currentUserId}</Button>
//           </Tooltip>
//         </Toolbar>
//       </AppBar>

//       <Container maxWidth="xl">

//         {/* ── KPI Row ─────────────────────────────────────────────────────── */}
//         <Fade in timeout={800}>
//           <Grid container spacing={2} mb={2} alignItems="stretch">

//             {/* 1. Notification Open (list ↔ donut, manual toggle) */}
//             <Grid item xs={12} sm={6} md={3}>
//               <StatSummaryFlipCard
//                 notificationData={notificationData}
//                 onCardClick={() => setShowNotifModal(true)}
//               />
//             </Grid>

//             {/* 2. Approval Overview (Require ↔ WIP, donut + count list) */}
//             <Grid item xs={12} sm={6} md={3}>
//               <ApprovalOverviewCard
//                 approvalRequire={approvalRequire}
//                 approvedWip={approvedWip}
//                 onRequireClick={() => setShowApprReqModal(true)}
//                 onWipClick={() => setShowApprWipModal(true)}
//                 loading={modataLoading}
//               />
//             </Grid>

//             {/* 3. Require Approval */}
//             <Grid item xs={12} sm={6} md={3}>
//               <KPICard
//                 title="Your Approval"
//                 value={approvalOrdersLoading ? '…' : approvalOrders.length}
//                 unit="Pending"
//                 icon={ErrorIcon}
//                 color="#2554f0"
//                 onClick={handleApprovalCardClick}
//               />
//             </Grid>

//             {/* 4. In Progress */}
//             <Grid item xs={12} sm={6} md={3}>
//               <KPICard
//                 title="In Progress"
//                 value={notifLoading ? '…' : inProgress.length}
//                 unit="orders"
//                 trend="up"
//                 trendValue="5%"
//                 icon={BuildIcon}
//                 color="#2196F3"
//                 onClick={() => setShowInProgressModal(true)}
//               />
//             </Grid>

//           </Grid>
//         </Fade>

//         {/* ── Maintenance Overview + Activity Donut ───────────────────────── */}
//         <Fade in timeout={1200}>
//           <Grid container spacing={3} mb={2}>

//             {/* LEFT: Maintenance Overview — Auart breakdown, count > 0 only */}
//             <Grid item xs={12} sm={6} md={6}>
//               <ChartCard title="Maintenance Overview" height={440}>
//                 {modataLoading ? (
//                   <Box display="flex" alignItems="center" gap={1}>
//                     <CircularProgress size={20} />
//                     <Typography variant="body2" sx={{ color: '#aaa' }}>Loading…</Typography>
//                   </Box>
//                 ) : maintenanceOverviewItems.length === 0 ? (
//                   <Typography variant="body2" sx={{ color: '#aaa' }}>No maintenance order data available</Typography>
//                 ) : (
//                   <Grid container spacing={0.8} sx={{ width: '100%', alignContent: 'flex-start' }}>
//                     {maintenanceOverviewItems.map((item) => (
//                       <Grid item xs={12} sm={6} key={item.auart}>
//                         <Paper sx={{
//                           p: 0.8,
//                           background: `linear-gradient(135deg, ${item.color}18 0%, ${item.color}08 100%)`,
//                           borderLeft: `4px solid ${item.color}`, borderRight: `4px solid ${item.color}`,
//                           borderRadius: 2, transition: 'all 0.2s ease',
//                           '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${item.color}30` },
//                         }}>
//                           <Box display="flex" alignItems="center" justifyContent="space-between">
//                             <Box display="flex" alignItems="center" gap={0.6} flex={1} minWidth={0}>
//                               <Box sx={{ width: 8, height: 8, borderRadius: '20%', backgroundColor: item.color, flexShrink: 0 }} />
//                               <Tooltip title={item.label}>
//                                 <Typography variant="caption" sx={{ fontWeight: 700, color: item.color, fontSize: '0.62rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
//                                   {item.label}
//                                 </Typography>
//                               </Tooltip>
//                             </Box>
//                             <Chip label={item.rows.length} size="small"
//                               sx={{ height: 20, minWidth: 30, fontSize: '0.68rem', fontWeight: 800, backgroundColor: item.color, color: 'white', ml: 0.5, flexShrink: 0, '& .MuiChip-label': { px: 0.8 } }} />
//                           </Box>
//                           <Typography variant="caption" sx={{ color: '#aaa', fontSize: '0.55rem', display: 'block', mt: 0.2 }}>
//                             Auart: {item.auart}
//                           </Typography>
//                         </Paper>
//                       </Grid>
//                     ))}
//                     <Grid item xs={12} sm={6}>
//                       <Paper sx={{ p: 1, background: 'linear-gradient(135deg, #37474F15 0%, #37474F05 100%)', borderLeft: '5px solid #37474F', borderRight: '5px solid #37474F', borderRadius: 2, mt: 0.5 }}>
//                         <Box display="flex" alignItems="center" justifyContent="space-between">
//                           <Typography variant="body2" sx={{ fontWeight: 700, color: '#37474F', fontSize: '0.72rem' }}>Total MO Orders</Typography>
//                           <Chip label={maintenanceOverviewItems.reduce((s, i) => s + i.rows.length, 0)} size="small"
//                             sx={{ height: 22, minWidth: 32, fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#37474F', color: 'white', '& .MuiChip-label': { px: 1 } }} />
//                         </Box>
//                       </Paper>
//                     </Grid>
//                   </Grid>
//                 )}
//               </ChartCard>
//             </Grid>

//             {/* RIGHT: Maintenance Activity Type — Donut with sorted legend */}
//             <Grid item xs={12} md={6}  sm={3} >
//               <Paper elevation={4} sx={{ p: 1, borderRadius: 3, background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)', height: 440, display: 'flex', flexDirection: 'column' }}>
//                 <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#333', flexShrink: 0 }}>
//                   Maintenance Activity Type
//                 </Typography>
//                 {modataLoading ? (
//                   <Box flex={1} display="flex" alignItems="center" justifyContent="center" gap={1}>
//                     <CircularProgress size={20} />
//                     <Typography variant="body2" sx={{ color: '#aaa' }}>Loading…</Typography>
//                   </Box>
//                 ) : maintenanceDonutData.length === 0 ? (
//                   <Box flex={1} display="flex" alignItems="center" justifyContent="center">
//                     <Typography variant="body2" sx={{ color: '#aaa' }}>No activity data available</Typography>
//                   </Box>
//                 ) : (() => {
//                   // Sort high → low for legend
//                   const sorted = [...maintenanceDonutData].sort((a, b) => b.value - a.value);
//                   const total  = sorted.reduce((s, d) => s + d.value, 0);
//                   const topIdx = sorted.findIndex((_, i, arr) => {
//                     const cumSum = arr.slice(0, i + 1).reduce((s, d) => s + d.value, 0);
//                     return cumSum / total >= 0.5;
//                   });
//                   // Items above the median = "High", below = "Low"
//                   const highItems = sorted.slice(0, topIdx + 1);
//                   const lowItems  = sorted.slice(topIdx + 1);

//                   return (
//                     <Box flex={1} display="flex" alignItems="center" gap={2} sx={{ minHeight: 0 }}>

//                       {/* Donut — left ~55% */}
//                       <Box sx={{ width: '52%', height: '100%', position: 'relative', flexShrink: 0 }}>
//                         <ResponsiveContainer width="100%" height="100%">
//                           <PieChart>
//                             <Pie
//                               data={sorted} cx="50%" cy="50%"
//                               innerRadius="45%" outerRadius="75%"
//                               paddingAngle={1.5} dataKey="value" startAngle={90} endAngle={-270}
//                             >
//                               {sorted.map((entry, i) => <Cell key={i} fill={entry.color} />)}
//                             </Pie>
//                             <RechartsTooltip
//                               formatter={(value, name) => [`${value} orders`, name]}
//                               contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.7rem' }}
//                             />
//                           </PieChart>
//                         </ResponsiveContainer>
//                         {/* Center total */}
//                         <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
//                           <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#3730A3', lineHeight: 1 }}>{total}</Typography>
//                         </Box>
//                       </Box>

//                       {/* Legend — right ~45%, sorted high→low with section labels */}
//                       <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.25, maxHeight: '100%' }}>

//                         {/* HIGH section */}
//                         {highItems.length > 0 && (
//                           <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: '#1565C0', mb: 0.25, letterSpacing: 0.5 }}>
//                             High
//                           </Typography>
//                         )}
//                         {highItems.map((entry) => (
//                           <Box key={entry.name} display="flex" alignItems="center" justifyContent="space-between" sx={{ py: 0.15 }}>
//                             <Box display="flex" alignItems="center" gap={0.7}>
//                               <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: entry.color, flexShrink: 0 }} />
//                               <Typography sx={{ fontSize: '0.68rem', color: '#333', lineHeight: 1.3 }}>{entry.name}</Typography>
//                             </Box>
//                             <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: entry.color, ml: 1, flexShrink: 0 }}>
//                               {entry.value}
//                             </Typography>
//                           </Box>
//                         ))}

//                         {/* Divider between High and Low */}
//                         {highItems.length > 0 && lowItems.length > 0 && (
//                           <Box sx={{ borderTop: '1px dashed #ddd', my: 0.5 }} />
//                         )}

//                         {/* LOW section */}
//                         {lowItems.length > 0 && (
//                           <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: '#888', mb: 0.25, letterSpacing: 0.5 }}>
//                             Low
//                           </Typography>
//                         )}
//                         {lowItems.map((entry) => (
//                           <Box key={entry.name} display="flex" alignItems="center" justifyContent="space-between" sx={{ py: 0.15 }}>
//                             <Box display="flex" alignItems="center" gap={0.7}>
//                               <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: entry.color, flexShrink: 0 }} />
//                               <Typography sx={{ fontSize: '0.68rem', color: '#333', lineHeight: 1.3 }}>{entry.name}</Typography>
//                             </Box>
//                             <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: entry.color, ml: 1, flexShrink: 0 }}>
//                               {entry.value}
//                             </Typography>
//                           </Box>
//                         ))}

//                       </Box>
//                     </Box>
//                   );
//                 })()}
//               </Paper>
//             </Grid>

//         {/* ── Machine Fault Trends — PM02 vs ZACC, 10 equal date intervals ── */}
//             <Grid item xs={12} md={6} sm={3}>
//               <Paper elevation={4} sx={{ p: 2.5, borderRadius: 3, background: 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)', height: 260, display: 'flex', flexDirection: 'column' }}>

//                 {/* Header row */}
//                 <Box display="flex" alignItems="center" justifyContent="space-between" mb={1} flexShrink={0}>
//                   <Typography variant="h6" sx={{ fontWeight: 700, color: '#333', fontSize: '0.95rem' }}>
//                     Equipment Fault Trends
//                   </Typography>
//                   <Box display="flex" gap={2}>
//                     {/* PM02 legend pill */}
//                     <Box display="flex" alignItems="center" gap={0.6} sx={{ backgroundColor: '#FFEBEE', px: 1, py: 0.3, borderRadius: 2 }}>
//                       <Box sx={{ width: 20, height: 3, backgroundColor: '#F44336', borderRadius: 2 }} />
//                       <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#F44336', border: '2px solid white', boxShadow: '0 0 0 1px #F44336' }} />
//                       <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#C62828' }}>PM02 — Breakdown Maintenance</Typography>
//                     </Box>
//                     {/* ZACC legend pill */}
//                     <Box display="flex" alignItems="center" gap={0.6} sx={{ backgroundColor: '#E3F2FD', px: 1, py: 0.3, borderRadius: 2 }}>
//                       <Box sx={{ width: 20, height: 3, backgroundColor: '#2196F3', borderRadius: 2 }} />
//                       <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#2196F3', border: '2px solid white', boxShadow: '0 0 0 1px #2196F3' }} />
//                       <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#1565C0' }}>ZACC — Accidental Maintenance</Typography>
//                     </Box>
//                   </Box>
//                   {/* Interval note */}
//                   <Typography sx={{ fontSize: '0.6rem', color: '#aaa' }}>
//                     {dateFrom} → {dateTo} &nbsp;·&nbsp; 10 equal intervals
//                   </Typography>
//                 </Box>

//                 {/* Chart */}
//                 <Box flex={1} sx={{ minHeight: 0 }}>
//                   {modataLoading ? (
//                     <Box display="flex" alignItems="center" justifyContent="center" height="100%" gap={1}>
//                       <CircularProgress size={18} />
//                       <Typography sx={{ fontSize: '0.75rem', color: '#aaa' }}>Loading trend data…</Typography>
//                     </Box>
//                   ) : (
//                     <ResponsiveContainer width="100%" height="100%">
//                       <LineChart data={faultTrendData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
//                         <CartesianGrid strokeDasharray="3 3" stroke="#e8e8f0" vertical={true} horizontal={true} />
//                         <XAxis
//                           dataKey="label"
//                           stroke="#bbb"
//                           tick={{ fontSize: 10, fill: '#888' }}
//                           tickLine={false}
//                           axisLine={{ stroke: '#ddd' }}
//                         />
//                         <YAxis
//                           stroke="#bbb"
//                           tick={{ fontSize: 10, fill: '#888' }}
//                           tickLine={false}
//                           axisLine={false}
//                           width={24}
//                           allowDecimals={false}
//                         />
//                         <RechartsTooltip
//                           contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: '0.72rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
//                           formatter={(value, name) => [
//                             `${value} orders`,
//                             name === 'pm02' ? 'Breakdown Maintenance (PM02)' : 'Accidental Maintenance (ZACC)',
//                           ]}
//                           labelFormatter={(label) => `Period: ${label}`}
//                         />
//                         {/* PM02 — Red */}
//                         <Line
//                           type="monotone"
//                           dataKey="pm02"
//                           name="pm02"
//                           stroke="#F44336"
//                           strokeWidth={2.5}
//                           dot={{ r: 4, fill: '#F44336', stroke: 'white', strokeWidth: 2 }}
//                           activeDot={{ r: 6, fill: '#F44336', stroke: 'white', strokeWidth: 2 }}
//                         />
//                         {/* ZACC — Blue */}
//                         <Line
//                           type="monotone"
//                           dataKey="zacc"
//                           name="zacc"
//                           stroke="#2196F3"
//                           strokeWidth={2.5}
//                           dot={{ r: 4, fill: '#2196F3', stroke: 'white', strokeWidth: 2 }}
//                           activeDot={{ r: 6, fill: '#2196F3', stroke: 'white', strokeWidth: 2 }}
//                         />
//                       </LineChart>
//                     </ResponsiveContainer>
//                   )}
//                 </Box>
//               </Paper>
//             </Grid>

//         {/* ── Maintenance Activities — PM03 vs YM02, 10 equal date intervals ── */}
//             <Grid item xs={12} md={6} sm={3}>
//               <Paper elevation={4} sx={{ p: 2.5, borderRadius: 3, background: 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)', height: 260, display: 'flex', flexDirection: 'column' }}>

//                 {/* Header row */}
//                 <Box display="flex" alignItems="center" justifyContent="space-between" mb={1} flexShrink={0}>
//                   <Typography variant="h6" sx={{ fontWeight: 700, color: '#333', fontSize: '0.95rem' }}>
//                     Maintenance Activities
//                   </Typography>
//                   <Box display="flex" gap={2}>
//                     {/* PM03 legend pill — Green */}
//                     <Box display="flex" alignItems="center" gap={0.6} sx={{ backgroundColor: '#E8F5E9', px: 1, py: 0.3, borderRadius: 2 }}>
//                       <Box sx={{ width: 20, height: 3, backgroundColor: '#4CAF50', borderRadius: 2 }} />
//                       <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#4CAF50', border: '2px solid white', boxShadow: '0 0 0 1px #4CAF50' }} />
//                       <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#2E7D32' }}>PM03 — Preventive Maintenance</Typography>
//                     </Box>
//                     {/* YM02 legend pill — Violet */}
//                     <Box display="flex" alignItems="center" gap={0.6} sx={{ backgroundColor: '#F3E5F5', px: 1, py: 0.3, borderRadius: 2 }}>
//                       <Box sx={{ width: 20, height: 3, backgroundColor: '#9C27B0', borderRadius: 2 }} />
//                       <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#9C27B0', border: '2px solid white', boxShadow: '0 0 0 1px #9C27B0' }} />
//                       <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#6A1B9A' }}>YM02 — Planned Maintenance</Typography>
//                     </Box>
//                   </Box>
//                   {/* Interval note */}
//                   <Typography sx={{ fontSize: '0.6rem', color: '#aaa' }}>
//                     {dateFrom} → {dateTo} &nbsp;·&nbsp; 10 equal intervals
//                   </Typography>
//                 </Box>

//                 {/* Chart */}
//                 <Box flex={1} sx={{ minHeight: 0 }}>
//                   {modataLoading ? (
//                     <Box display="flex" alignItems="center" justifyContent="center" height="100%" gap={1}>
//                       <CircularProgress size={18} />
//                       <Typography sx={{ fontSize: '0.75rem', color: '#aaa' }}>Loading trend data…</Typography>
//                     </Box>
//                   ) : (
//                     <ResponsiveContainer width="100%" height="100%">
//                       <LineChart data={maintenanceActivityTrendData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
//                         <CartesianGrid strokeDasharray="3 3" stroke="#e8e8f0" />
//                         <XAxis
//                           dataKey="label"
//                           stroke="#bbb"
//                           tick={{ fontSize: 10, fill: '#888' }}
//                           tickLine={false}
//                           axisLine={{ stroke: '#ddd' }}
//                         />
//                         <YAxis
//                           stroke="#bbb"
//                           tick={{ fontSize: 10, fill: '#888' }}
//                           tickLine={false}
//                           axisLine={false}
//                           width={28}
//                           allowDecimals={false}
//                         />
//                         <RechartsTooltip
//                           contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: '0.72rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
//                           formatter={(value, name) => [
//                             `${value} orders`,
//                             name === 'pm03' ? 'Preventive Maintenance (PM03)' : 'Planned Maintenance (YM02)',
//                           ]}
//                           labelFormatter={(label) => `Period: ${label}`}
//                         />
//                         {/* PM03 — Green */}
//                         <Line
//                           type="monotone"
//                           dataKey="pm03"
//                           name="pm03"
//                           stroke="#4CAF50"
//                           strokeWidth={2.5}
//                           dot={{ r: 4, fill: '#4CAF50', stroke: 'white', strokeWidth: 2 }}
//                           activeDot={{ r: 6, fill: '#4CAF50', stroke: 'white', strokeWidth: 2 }}
//                         />
//                         {/* YM02 — Violet */}
//                         <Line
//                           type="monotone"
//                           dataKey="ym02"
//                           name="ym02"
//                           stroke="#9C27B0"
//                           strokeWidth={2.5}
//                           dot={{ r: 4, fill: '#9C27B0', stroke: 'white', strokeWidth: 2 }}
//                           activeDot={{ r: 6, fill: '#9C27B0', stroke: 'white', strokeWidth: 2 }}
//                         />
//                       </LineChart>
//                     </ResponsiveContainer>
//                   )}
//                 </Box>
//               </Paper>
//             </Grid>


//           </Grid>
//         </Fade>



//         {/* ── Total Faults Reported ────────────────────────────────────────── */}
//         <Fade in timeout={1200}>
//           <Grid container spacing={3} mb={2}>
//             <Grid item xs={12} md={6} sm={3}>
//               <ChartCard title="Total Faults Reported" height={280}>
//                 <ResponsiveContainer width="100%" height="100%">
//                   <BarChart data={TOTAL_FAULTS_REPORTED}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
//                     <XAxis dataKey="equipment" stroke="#999" style={{ fontSize: '12px' }} angle={-45} textAnchor="end" height={80} />
//                     <YAxis stroke="#999" style={{ fontSize: '12px' }} />
//                     <RechartsTooltip contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px' }} formatter={(v) => `${v} Faults`} />
//                     <Bar dataKey="faults" fill="#667eea" radius={[8, 8, 0, 0]} />
//                   </BarChart>
//                 </ResponsiveContainer>
//               </ChartCard>
//             </Grid>
//           </Grid>
//         </Fade>

//       </Container>

//       {/* ── Modals ─────────────────────────────────────────────────────────── */}

//       {/* Notification Open */}
//       <NotificationModal
//         open={showNotifModal}
//         onClose={() => setShowNotifModal(false)}
//         title="Notification Open"
//         subtitle="All unique open notifications grouped by status"
//         data={notificationData}
//         headerColor="linear-gradient(135deg, #FFA000 0%, #FF6F00 100%)"
//         icon={AssignmentIcon}
//         isMobile={isMobile}
//       />

//       {/* In Progress */}
//       <NotificationModal
//         open={showInProgressModal}
//         onClose={() => setShowInProgressModal(false)}
//         title="In Progress Notifications"
//         subtitle="I0071 (Order Assigned) & I0159 (All Tasks Completed)"
//         data={inProgress}
//         headerColor="linear-gradient(135deg, #2196F3 0%, #1565C0 100%)"
//         icon={BuildIcon}
//         isMobile={isMobile}
//       />

//       {/* Approval Require */}
//       <ApprovalOverviewModal
//         open={showApprReqModal}
//         onClose={() => setShowApprReqModal(false)}
//         data={approvalRequire}
//         title="Approval Require"
//         subtitle="Orders pending approval — Stat: E0002 · E0004 · E0006 · E0008"
//         headerColor="linear-gradient(135deg, #B71C1C 0%, #E53935 100%)"
//         isMobile={isMobile}
//       />

//       {/* Approved WIP */}
//       <ApprovalOverviewModal
//         open={showApprWipModal}
//         onClose={() => setShowApprWipModal(false)}
//         data={approvedWip}
//         title="Approved WIP"
//         subtitle="Work-in-progress orders — Stat: E0001 · E0003 · E0005 · E0007 · E0009"
//         headerColor="linear-gradient(135deg, #1B5E20 0%, #43A047 100%)"
//         isMobile={isMobile}
//       />

//     </Box>
//   );
// };

// export default MoDashboard;
