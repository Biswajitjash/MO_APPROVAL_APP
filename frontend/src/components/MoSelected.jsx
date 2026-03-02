import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, Chip,
  useTheme, useMediaQuery, CircularProgress, Alert,
  Snackbar, Dialog, DialogContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip
} from '@mui/material';
import ArrowBackIcon   from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HistoryIcon     from '@mui/icons-material/History';
import BuildIcon       from '@mui/icons-material/Build';
import PersonIcon      from '@mui/icons-material/Person';
import BadgeIcon       from '@mui/icons-material/Badge';
import EventIcon       from '@mui/icons-material/Event';
import DoneAllIcon     from '@mui/icons-material/DoneAll';
import TimerIcon       from '@mui/icons-material/Timer';
import CloseIcon       from '@mui/icons-material/Close';
import { formatCurrency, getStatusColor } from '../utils/formatters';
import { moApprovalService } from '../services/odataService';

/* ─── constants ──────────────────────────────────────────────────── */
const INITIAL_SAMPLE_ACTIVITIES = [];
const APPROVAL_HISTORY          = [];

/* ─── design tokens ──────────────────────────────────────────────── */
const T = {
  purple:  '#6C5CE7',
  purpleD: '#5849C4',
  teal:    '#00B894',
  red:     '#D63031',
  amber:   '#FDCB6E',
  blue:    '#0984E3',
  bg:      '#F0F2F8',
  surface: '#FFFFFF',
  border:  '#E2E5EF',
  label:   '#8891A5',
  text:    '#1E2333',
  textSub: '#5C637A',
};

/* ─── per-approver palette (cycles for >5 approvers) ────────────── */
const SLICE_COLORS = ['#6C5CE7', '#00B894', '#0984E3', '#FDCB6E', '#D63031', '#A29BFE'];

/* ─── live clock hook — ticks every second ───────────────────────── */
const useNow = () => {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

/* ─── shared table cell styles ───────────────────────────────────── */
const cellSx = {
  py: 0.8, px: 1.2,
  fontSize: '0.71rem',
  borderBottom: `1px solid ${T.border}`,
  color: T.text,
};
const headCellSx = {
  ...cellSx,
  fontWeight: 700,
  fontSize: '0.63rem',
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: T.label,
  backgroundColor: '#F7F8FC',
  py: 1,
};

/* ─── helper: parse "DD-MM-YYYY" + "HH:mm" → Date ───────────────── */
const parseDateTime = (date, time) => {
  try {
    const [day, mon, yr] = date.split('-');
    const [h, m]         = (time || '00:00').split(':');
    return new Date(yr, mon - 1, day, h, m);
  } catch { return null; }
};

/* ─── helper: ms → "Xd Yh Zm" string ───────────────────────────── */
const msToDuration = (ms, showSeconds = false) => {
  if (!ms || ms <= 0) return showSeconds ? '0s' : '< 1m';
  const totalSecs = Math.floor(ms / 1000);
  const d  = Math.floor(totalSecs / 86400);
  const h  = Math.floor((totalSecs % 86400) / 3600);
  const m  = Math.floor((totalSecs % 3600) / 60);
  const s  = totalSecs % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (showSeconds && s) parts.push(`${s}s`);
  return parts.length ? parts.join(' ') : (showSeconds ? `${s}s` : '< 1m');
};

/* ─── helper: get row bg colour from duration (green→amber→red) ─── */
const getRowHeatColor = (ms, maxMs) => {
  if (!ms || !maxMs) return 'transparent';
  const ratio = Math.min(ms / maxMs, 1);
  if (ratio < 0.33) return 'rgba(0,184,148,0.10)';
  if (ratio < 0.66) return 'rgba(253,203,110,0.18)';
  return 'rgba(214,48,49,0.10)';
};
const getRowBorderColor = (ms, maxMs) => {
  if (!ms || !maxMs) return 'transparent';
  const ratio = Math.min(ms / maxMs, 1);
  if (ratio < 0.33) return '#00B89440';
  if (ratio < 0.66) return '#FDCB6E60';
  return '#D6303140';
};

/* ─── compute total elapsed (shared between chart + header) ─────── */
const computeTotalDur = (historyData, now) => {
  const n = now || new Date();
  const firstStart = historyData.length
    ? parseDateTime(historyData[0].Requested, historyData[0].RTime)
    : null;
  const totalMs = firstStart ? Math.max(0, n - firstStart) : 0;
  return { totalMs, totalDur: msToDuration(totalMs, true) };
};

/* ─── SVG Donut Chart Component ──────────────────────────────────── */
const ApprovalDonutChart = ({ historyData }) => {
  const liveNow = useNow();

  const segments = historyData.map((h, i) => {
    const start = parseDateTime(h.Requested, h.RTime);
    const end   = (h.Approved && h.Approved !== '')
      ? parseDateTime(h.Approved, h.ATime)
      : liveNow;
    const ms = start && end ? Math.max(0, end - start) : 0;
    return {
      label: h.Approver,
      role:  h.Role,
      ms,
      dur:   msToDuration(ms),
      color: SLICE_COLORS[i % SLICE_COLORS.length],
      done:  !!(h.Approved && h.Approved !== ''),
    };
  });

  const { totalDur } = computeTotalDur(historyData, liveNow);

  const R = 62, r = 40, cx = 90, cy = 90;
  const totalMsSum = segments.reduce((a, s) => a + s.ms, 0) || 1;
  let cumAngle = -Math.PI / 2;
  const arcs = segments.map((seg) => {
    const angle  = (seg.ms / totalMsSum) * 2 * Math.PI;
    const startA = cumAngle;
    const endA   = cumAngle + angle;
    cumAngle     = endA;
    const x1  = cx + R * Math.cos(startA), y1  = cy + R * Math.sin(startA);
    const x2  = cx + R * Math.cos(endA),   y2  = cy + R * Math.sin(endA);
    const xi1 = cx + r * Math.cos(endA),   yi1 = cy + r * Math.sin(endA);
    const xi2 = cx + r * Math.cos(startA), yi2 = cy + r * Math.sin(startA);
    return {
      ...seg,
      d: `M ${x1} ${y1} A ${R} ${R} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${r} ${r} 0 ${angle > Math.PI ? 1 : 0} 0 ${xi2} ${yi2} Z`,
    };
  });

  return (
    <Box sx={{ background: T.surface, px: 2, pt: 2.5, pb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8, mb: 2 }}>
        <TimerIcon sx={{ fontSize: 13, color: T.purple }} />
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: T.textSub }}>
          Time Analysis per Approver
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={T.border} strokeWidth={R - r} />
          {arcs.map((arc, i) => (
            <path key={i} d={arc.d} fill={arc.color} opacity={arc.done ? 1 : 0.4}
              style={{ filter: arc.done ? 'none' : 'grayscale(30%)', transition: 'all 0.2s' }}>
              <title>{arc.label}: {arc.dur}</title>
            </path>
          ))}
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize="9" fontWeight="800" fill={T.text}>
            {totalDur}
          </text>
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize="7" fill={T.label}>elapsed total</text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="6.5" fill={T.label}>req → now</text>
        </svg>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
        {segments.map((seg, i) => (
          <Box key={i} sx={{
            display: 'flex', alignItems: 'center', gap: 0.7,
            background: `${seg.color}14`,
            border: `1px solid ${seg.color}40`,
            borderRadius: '20px', px: 1.2, py: 0.5,
          }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%',
              background: seg.color, opacity: seg.done ? 1 : 0.45, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: T.text,
              maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {seg.label}
            </Typography>
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: seg.color }}>
              {seg.dur}
            </Typography>
            {!seg.done && (
              <Box sx={{ fontSize: '0.5rem', fontWeight: 700, background: '#FFF3CD',
                color: '#856404', border: '1px solid #FFE08A',
                borderRadius: '3px', px: 0.5, lineHeight: 1.6 }}>⏳</Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/* ─── reusable: stat card ────────────────────────────────────────── */
const StatCard = ({ label, value, accent }) => (
  <Box sx={{
    flex: 1, minWidth: 100,
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderTop: `3px solid ${accent}`,
    borderRadius: '8px',
    px: 1.5, py: 1.2,
  }}>
    <Typography sx={{
      fontSize: '0.58rem', fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      color: T.label, mb: 0.3,
    }}>
      {label}
    </Typography>
    <Typography sx={{
      fontSize: '0.85rem', fontWeight: 800, color: T.text,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      {value}
    </Typography>
  </Box>
);

/* ─── reusable: detail row inside approval dialog ────────────────── */
const DetailRow = ({ icon, label, value, highlight }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', gap: 1.5,
    py: 0.95,
    px: highlight ? 1.2 : 0,
    borderRadius: highlight ? '6px' : 0,
    background: highlight ? '#EDE9FF' : 'transparent',
    borderBottom: `1px solid ${T.border}`,
    '&:last-of-type': { borderBottom: 'none' },
  }}>
    <Box sx={{ color: highlight ? T.purple : T.label, display: 'flex', flexShrink: 0 }}>
      {icon}
    </Box>
    <Typography sx={{ fontSize: '0.68rem', color: T.label, minWidth: 78 }}>
      {label}
    </Typography>
    <Typography sx={{
      fontSize: '0.75rem', fontWeight: highlight ? 800 : 600,
      color: highlight ? T.purple : T.text,
      ml: 'auto', textAlign: 'right',
    }}>
      {value}
    </Typography>
  </Box>
);

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const MoSelected = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  /* ── state ────────────────────────────────────────────────────── */
  const [order,                    setOrder]                    = useState(null);
  const [activities,               setActivities]               = useState(INITIAL_SAMPLE_ACTIVITIES);
  const [selectedActivities,       setSelectedActivities]       = useState([]);
  const [loading,                  setLoading]                  = useState(false);
  const [activitiesLoading,        setActivitiesLoading]        = useState(false);
  const [approving,                setApproving]                = useState(false); // ✅ dedicated approve loading state
  const [error,                    setError]                    = useState(null);
  const [success,                  setSuccess]                  = useState(null);
  const [showHistoryDialog,        setShowHistoryDialog]        = useState(false);
  const [historyData,              setHistoryData]              = useState([]);
  const [historyLoading,           setHistoryLoading]           = useState(false);
  const [showApprovalDetailDialog, setShowApprovalDetailDialog] = useState(false);
  const [selectedApprovalDetail,   setSelectedApprovalDetail]   = useState(null);
  const initializationRef = useRef(false);

  /* ── live clock — ticks every second for real-time display ─────── */
  const liveNow = useNow();

  /* ── init ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;
    if (location.state?.order) {
      setOrder(location.state.order);
      fetchApprovalOrdersDetails(
        location.state.order.OrderNumber,
        location.state.order.ObjectNumber,
      );
    } else {
      setError('No order data found. Please select an order.');
      setTimeout(() => navigate('/mo-approval'), 2000);
    }
  }, [location, navigate]);

  /* ── fetch activities + approval history ─────────────────────── */
  const fetchApprovalOrdersDetails = async (orderNo, objNo) => {
    try {
      setActivitiesLoading(true);
      setError(null);
      const response = await moApprovalService.getApprovelOrdersDetails({
        OrderNumber: orderNo,
        ObjectNumber: objNo,
      });
      if (Array.isArray(response) && response.length > 0) {
        const historyItems  = response.filter(i => i.RowType === 'X' && i.Description !== 'Approved By');
        const activityItems = response.filter(i => i.RowType !== 'X');
        setActivities(activityItems.map(item => ({
          Activity:    item.ActivityNo   || '',
          Description: item.Description  || '',
          Material:    item.Material      || '',
          Quantity:    item.quantity      || '',
          Unit:        item.Uom           || '',
          Rate:        item.Rate          || '',
          Amount:      item.amount        || '',
          ManPower:    item.Man_Power     || '',
          Duration:    item.duration      || '',
          TotalTime:   item.total_time    || '',
          MvType:      item.MvType        || 261,
        })));
        setHistoryData(historyItems.map(item => ({
          Approver:  item.Description || '',
          Role:      item.Valuation   || '',
          Requested: item.Material    || '',
          RTime:     item.Batch       || '',
          Approved:  item.amount      || '',
          ATime:     item.Man_Power   || '',
          Delay:     item.total_time  || '',
        })));
      } else {
        setActivities(INITIAL_SAMPLE_ACTIVITIES);
        setHistoryData(APPROVAL_HISTORY);
      }
    } catch (err) {
      setError(`Failed to load order details: ${err.message || 'Unknown error'}`);
      setActivities(INITIAL_SAMPLE_ACTIVITIES);
      setHistoryData(APPROVAL_HISTORY);
    } finally {
      setActivitiesLoading(false);
    }
  };

  /* ── helpers ──────────────────────────────────────────────────── */
  const calculateActionTime = (reqDate, reqTime, appDate, appTime) => {
    try {
      const diff = parseDateTime(appDate, appTime) - parseDateTime(reqDate, reqTime);
      return msToDuration(diff);
    } catch { return 'N/A'; }
  };

  const handleActivitySelect = activity =>
    setSelectedActivities(prev =>
      prev.includes(activity.Activity)
        ? prev.filter(a => a !== activity.Activity)
        : [...prev, activity.Activity]
    );

  const handleShowHistory = () => setShowHistoryDialog(true);

  /* ─────────────────────────────────────────────────────────────────
     handleApprove — FIX:
       ✅ Pass orderNumber as a plain string (not wrapped in an object)
       ✅ Dedicated `approving` state to disable button & show spinner
       ✅ Refresh history data after successful approval
       ✅ Proper success/error feedback via Snackbar
  ───────────────────────────────────────────────────────────────── */
  const handleApprove = async (orderNumber) => {
    if (approving) return; // guard against double-clicks
    console.log('🔑 handleApprove called with orderNumber:', orderNumber);

    try {
      setApproving(true);
      setError(null);

      // ✅ FIXED: pass the raw orderNumber string — NOT an object
      const response = await moApprovalService.approveOrders(orderNumber);

      console.log('✅ Approval response:', response);
      setSuccess(`Order ${orderNumber} approved successfully.`);
      await new Promise(resolve => setTimeout(resolve, 4000));

      navigate('/mo-approval'); // navigate back to list after approval

      
    } catch (err) {
      console.error('❌ handleApprove error:', err);
      setError(`Approval failed: ${err.message || 'Unknown error'}`);
    } finally {
      setApproving(false);
    }
  };

  /* ── loading guard ────────────────────────────────────────────── */
  if (!order) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', background: T.bg }}>
        <CircularProgress size={30} sx={{ color: T.purple }} />
      </Box>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <Box sx={{ minHeight: '100vh', background: T.bg, pb: 10 }}>

      {/* ── STICKY HEADER BAR ──────────────────────────────────── */}
      <Box sx={{
        background: `linear-gradient(135deg, ${T.purple} 0%, #4834D4 100%)`,
        px: { xs: 1.5, sm: 3 }, py: 1.2,
        display: 'flex', alignItems: 'center', gap: 1.2,
        boxShadow: '0 2px 16px rgba(108,92,231,0.4)',
        position: 'sticky', top: 0, zIndex: 200,
      }}>
        <IconButton size="small" onClick={() => navigate(-1)}
          sx={{ color: 'white', background: 'rgba(255,255,255,0.15)',
            borderRadius: '6px', p: 0.6,
            '&:hover': { background: 'rgba(255,255,255,0.28)' } }}>
          <ArrowBackIcon sx={{ fontSize: 17 }} />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.58rem',
            letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 700 }}>
            Maintenance Order
          </Typography>
          <Typography sx={{ color: 'white', fontSize: '0.9rem', fontWeight: 800,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
            {order.OrderNumber}
          </Typography>
        </Box>
        <Chip label={order.Status || 'Pending'} size="small"
          sx={{ background: 'rgba(255,255,255,0.18)', color: 'white', fontWeight: 700,
            fontSize: '0.6rem', height: 20, border: '1px solid rgba(255,255,255,0.28)' }} />
        <Tooltip title="Actions & History">
          <IconButton size="small" onClick={handleShowHistory}
            sx={{ color: 'white', background: 'rgba(255,255,255,0.15)',
              borderRadius: '6px', p: 0.6,
              '&:hover': { background: 'rgba(255,255,255,0.28)' } }}>
            <HistoryIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── STAT CARDS ─────────────────────────────────────────── */}
      <Box sx={{ px: { xs: 1.5, sm: 3 }, pt: 2, pb: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', overflowX: 'auto',
          pb: 0.5, '&::-webkit-scrollbar': { height: 3 } }}>
          <StatCard label="Order No"   value={order.OrderNumber}                            accent={T.purple} />
          <StatCard label="Equipment"  value={order.Equipment || 'N/A'}                     accent={T.teal}   />
          <StatCard label="Total Cost" value={`₹ ${formatCurrency(order.TotalCost || 0)}`}  accent={T.red}    />
        </Box>
      </Box>

      {/* ── ACTIVITIES TABLE ────────────────────────────────────── */}
      <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 2 }}>
        <Paper elevation={0} sx={{ border: `1px solid ${T.border}`, borderRadius: '10px',
          overflow: 'hidden', background: T.surface }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 2, py: 1.1, borderBottom: `1px solid ${T.border}`, background: T.surface }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <BuildIcon sx={{ fontSize: 14, color: T.purple }} />
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 800,
                letterSpacing: '0.06em', textTransform: 'uppercase', color: T.text }}>
                Maintenance Activities
              </Typography>
            </Box>
            {activitiesLoading && <CircularProgress size={13} sx={{ color: T.purple }} />}
          </Box>
          {activitiesLoading ? (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress size={26} sx={{ color: T.purple }} />
            </Box>
          ) : activities.length === 0 ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.72rem', color: T.label }}>No activities found</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headCellSx}>Activity</TableCell>
                    <TableCell sx={headCellSx}>Description</TableCell>
                    {!isMobile && <TableCell sx={headCellSx}>Material</TableCell>}
                    <TableCell align="right" sx={headCellSx}>Qty</TableCell>
                    {!isMobile && <>
                      <TableCell sx={headCellSx}>Unit</TableCell>
                      <TableCell align="right" sx={headCellSx}>Rate</TableCell>
                    </>}
                    <TableCell align="right" sx={headCellSx}>Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activities.map((activity, index) => {
                    const isSelected = selectedActivities.includes(activity.Activity);
                    return (
                      <TableRow key={index} onClick={() => handleActivitySelect(activity)}
                        sx={{ cursor: 'pointer',
                          background: isSelected ? '#EDEAFF' : index % 2 === 0 ? T.surface : '#FAFBFF',
                          outline: isSelected ? `2px inset ${T.purple}` : 'none',
                          '&:hover': { background: '#F5F2FF' }, transition: 'background 0.12s' }}>
                        <TableCell sx={cellSx}>
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: T.purple }}>
                            {activity.Activity}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ ...cellSx, maxWidth: isMobile ? 90 : 180 }}>
                          <Typography sx={{ fontSize: '0.68rem', color: T.text,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {activity.Description}
                          </Typography>
                        </TableCell>
                        {!isMobile && (
                          <TableCell sx={cellSx}>
                            <Typography sx={{ fontSize: '0.68rem', color: T.textSub, fontWeight: 600 }}>
                              {activity.Material}
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell align="right" sx={cellSx}>
                          <Typography sx={{ fontSize: '0.68rem', color: T.text }}>
                            {activity.Quantity}
                          </Typography>
                        </TableCell>
                        {!isMobile && <>
                          <TableCell sx={cellSx}>
                            <Typography sx={{ fontSize: '0.68rem', color: T.label }}>
                              {activity.Unit}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={cellSx}>
                            <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: T.text }}>
                              ₹ {formatCurrency(activity.Rate)}
                            </Typography>
                          </TableCell>
                        </>}
                        <TableCell align="right" sx={cellSx}>
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: T.red }}>
                            ₹ {formatCurrency(activity.Amount)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2,
            px: 2, py: 0.9, borderTop: `1px solid ${T.border}`, background: '#F7F8FC' }}>
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: T.label,
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total</Typography>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 900, color: T.red }}>
              ₹ {formatCurrency(order.TotalCost)}
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* ── FIXED BOTTOM ACTION BAR ─────────────────────────────── */}
      <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 150,
        px: { xs: 1.5, sm: 3 }, py: 1.1,
        background: 'rgba(240,242,248,0.94)', backdropFilter: 'blur(10px)',
        borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
        <Button fullWidth={isMobile} size="small" variant="contained"
          startIcon={<HistoryIcon sx={{ fontSize: 15 }} />} onClick={handleShowHistory}
          sx={{ background: `linear-gradient(135deg, ${T.purple} 0%, #4834D4 100%)`,
            boxShadow: `0 4px 16px rgba(108,92,231,0.45)`, fontWeight: 700, fontSize: '0.72rem',
            textTransform: 'none', letterSpacing: '0.02em', borderRadius: '8px', px: 2.5, py: 0.85,
            '&:hover': { background: `linear-gradient(135deg, ${T.purpleD} 0%, #3529a8 100%)`,
              boxShadow: `0 6px 20px rgba(108,92,231,0.55)` } }}>
          Actions &amp; History
        </Button>
      </Box>

      {/* ════════════════════════════════════════════════════════
          HISTORY DIALOG
      ════════════════════════════════════════════════════════ */}
      <Dialog open={showHistoryDialog} onClose={() => setShowHistoryDialog(false)}
        maxWidth="md" fullWidth fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : '12px', overflow: 'hidden', m: isMobile ? 0 : 2 } }}>

        {/* ── Header ── */}
        {(() => {
          const { totalDur: hdrTotal } = computeTotalDur(historyData, liveNow);
          return (
            <Box sx={{ background: `linear-gradient(135deg, ${T.purple} 0%, #4834D4 100%)`,
              px: 2.5, pt: 1.8, pb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon sx={{ color: 'white', fontSize: 17 }} />
                  <Box>
                    <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.82rem', lineHeight: 1.2 }}>
                      Approval History
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.6rem' }}>
                      Order: {order.OrderNumber}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Chip label={`${historyData.length} step${historyData.length !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{ background: 'rgba(255,255,255,0.18)', color: 'white',
                      fontSize: '0.58rem', height: 18, fontWeight: 700 }} />
                  <IconButton size="small" onClick={() => setShowHistoryDialog(false)}
                    sx={{ color: 'white', background: 'rgba(255,255,255,0.18)',
                      border: '1px solid rgba(255,255,255,0.28)', borderRadius: '6px', p: 0.45,
                      '&:hover': { background: 'rgba(255,255,255,0.3)' } }}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              </Box>

              {/* total elapsed strip */}
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                background: 'rgba(0,0,0,0.18)',
                borderRadius: '8px', px: 2, py: 1,
              }}>
                <TimerIcon sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                <Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.58rem',
                    fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Total Elapsed (First Request → Now)
                  </Typography>
                  <Typography sx={{ color: 'white', fontSize: '1.55rem', fontWeight: 900,
                    letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    {hdrTotal}
                  </Typography>
                </Box>
              </Box>
            </Box>
          );
        })()}

        {/* ── Content ── */}
        <DialogContent sx={{ p: 0, background: '#F7F8FC' }}>
          {historyLoading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress size={26} sx={{ color: T.purple }} />
            </Box>
          ) : historyData.length === 0 ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.75rem', color: T.label }}>No history found</Typography>
            </Box>
          ) : (
            <>
              <ApprovalDonutChart historyData={historyData} />
              <Box sx={{ mx: 2, borderTop: `1px solid ${T.border}` }} />

              {/* History table */}
              {(() => {
                const maxMs = Math.max(...historyData.map(h => {
                  const s = parseDateTime(h.Requested, h.RTime);
                  const e = (h.Approved && h.Approved !== '')
                    ? parseDateTime(h.Approved, h.ATime)
                    : liveNow;
                  return s && e ? Math.max(0, e - s) : 0;
                }));
                return (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={headCellSx}>Role</TableCell>
                          <TableCell sx={headCellSx}>Approver</TableCell>
                          <TableCell sx={headCellSx}>Requested</TableCell>
                          {!isMobile && <TableCell sx={headCellSx}>Approved</TableCell>}
                          <TableCell align="center" sx={headCellSx}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {historyData.map((history, index) => {
                          const isApproved = !!(history.Approved && history.Approved !== '');
                          const rowStart   = parseDateTime(history.Requested, history.RTime);
                          const rowEnd     = isApproved
                            ? parseDateTime(history.Approved, history.ATime)
                            : liveNow;
                          const rowMs      = rowStart && rowEnd ? Math.max(0, rowEnd - rowStart) : 0;
                          const heatBg     = getRowHeatColor(rowMs, maxMs);
                          const heatBdr    = getRowBorderColor(rowMs, maxMs);
                          return (
                            <TableRow key={index}
                              sx={{ background: heatBg,
                                borderLeft: `3px solid ${heatBdr}`,
                                '&:hover': { filter: 'brightness(0.96)' }, transition: 'all 0.12s' }}>
                              <TableCell sx={cellSx}>
                                <Chip label={history.Role} size="small"
                                  sx={{ height: 18, fontSize: '0.58rem', fontWeight: 700,
                                    background: '#EDE9FF', color: T.purple,
                                    border: `1px solid ${T.purple}30` }} />
                              </TableCell>
                              <TableCell sx={cellSx}>
                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.text }}>
                                  {history.Approver}
                                </Typography>
                              </TableCell>
                              <TableCell sx={cellSx}>
                                <Typography sx={{ fontSize: '0.67rem', color: T.textSub, fontWeight: 600 }}>
                                  {history.Requested}
                                </Typography>
                                <Typography sx={{ fontSize: '0.6rem', color: T.label }}>
                                  {history.RTime}
                                </Typography>
                              </TableCell>
                              {!isMobile && (
                                <TableCell sx={cellSx}>
                                  {isApproved ? (
                                    <>
                                      <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: T.teal }}>
                                        {history.Approved}
                                      </Typography>
                                      <Typography sx={{ fontSize: '0.6rem', color: T.label }}>
                                        {history.ATime}
                                      </Typography>
                                    </>
                                  ) : (
                                    <Typography sx={{ fontSize: '0.6rem', color: T.label }}>—</Typography>
                                  )}
                                </TableCell>
                              )}
                              <TableCell align="center" sx={cellSx}>
                                {/* ─────────────────────────────────────────────────
                                    Approve Chip:
                                    ✅ Disabled + spinner while approving
                                    ✅ Calls handleApprove(order.OrderNumber) — plain string
                                    ✅ Closes history dialog before approving
                                ───────────────────────────────────────────────── */}
                                <Chip
                                  clickable={!isApproved && !approving}
                                  onClick={() => {
                                    if (isApproved) {
                                      setSelectedApprovalDetail(history);
                                      setShowApprovalDetailDialog(true);
                                    } else if (!approving) {
                                      setShowHistoryDialog(false);
                                      handleApprove(order.OrderNumber); // ✅ plain string
                                    }
                                  }}
                                  icon={
                                    approving && !isApproved
                                      ? <CircularProgress size={10} sx={{ color: 'white !important', ml: '6px' }} />
                                      : isApproved
                                        ? <DoneAllIcon sx={{ fontSize: '11px !important', color: 'white !important' }} />
                                        : <CheckCircleIcon sx={{ fontSize: '11px !important', color: 'white !important' }} />
                                  }
                                  label={
                                    approving && !isApproved
                                      ? 'Approving…'
                                      : isApproved
                                        ? 'Approved'
                                        : 'Approve'
                                  }
                                  size="small"
                                  sx={{
                                    height: 22, fontSize: '0.6rem', fontWeight: 700,
                                    background: isApproved
                                      ? `linear-gradient(135deg, ${T.teal}, #00997d)`
                                      : `linear-gradient(135deg, ${T.purple}, #4834D4)`,
                                    color: 'white', border: 'none',
                                    opacity: approving && !isApproved ? 0.7 : 1,
                                    pointerEvents: approving && !isApproved ? 'none' : 'auto',
                                    boxShadow: isApproved
                                      ? '0 2px 8px rgba(0,184,148,0.4)'
                                      : '0 2px 8px rgba(108,92,231,0.4)',
                                    '& .MuiChip-icon': { ml: '6px' },
                                    '&:hover': { opacity: 0.85, transform: 'translateY(-1px)' },
                                    transition: 'all 0.15s ease',
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                );
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════
          APPROVAL DETAIL DIALOG
      ════════════════════════════════════════════════════════ */}
      <Dialog open={showApprovalDetailDialog} onClose={() => setShowApprovalDetailDialog(false)}
        maxWidth="xs" fullWidth fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : '12px', overflow: 'hidden', m: isMobile ? 0 : 2 } }}>
        {selectedApprovalDetail && (() => {
          const actionTime = calculateActionTime(
            selectedApprovalDetail.Requested, selectedApprovalDetail.RTime,
            selectedApprovalDetail.Approved,  selectedApprovalDetail.ATime,
          );
          return (
            <>
              <Box sx={{ background: `linear-gradient(135deg, ${T.teal} 0%, #00997d 100%)`,
                px: 2.5, py: 1.8, display: 'flex', alignItems: 'center',
                justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <DoneAllIcon sx={{ color: 'white', fontSize: 22 }} />
                  <Box>
                    <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.2 }}>
                      Approval Detail
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.62rem' }}>
                      {selectedApprovalDetail.Role}
                    </Typography>
                  </Box>
                </Box>
                <IconButton size="small" onClick={() => setShowApprovalDetailDialog(false)}
                  sx={{ color: 'white', background: 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', p: 0.5,
                    '&:hover': { background: 'rgba(255,255,255,0.3)' } }}>
                  <CloseIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Box>
              <DialogContent sx={{ px: 2.5, py: 2, background: T.surface }}>
                <Box sx={{ border: `1px solid ${T.border}`, borderRadius: '8px', p: 1.5 }}>
                  <DetailRow icon={<PersonIcon sx={{ fontSize: 14 }} />}  label="Approver"    value={selectedApprovalDetail.Approver} />
                  <DetailRow icon={<BadgeIcon  sx={{ fontSize: 14 }} />}  label="Role"        value={selectedApprovalDetail.Role} />
                  <DetailRow icon={<EventIcon  sx={{ fontSize: 14 }} />}  label="Requested"   value={`${selectedApprovalDetail.Requested}  ${selectedApprovalDetail.RTime}`} />
                  <DetailRow icon={<DoneAllIcon sx={{ fontSize: 14 }} />} label="Approved"    value={`${selectedApprovalDetail.Approved}  ${selectedApprovalDetail.ATime}`} />
                  <DetailRow icon={<TimerIcon  sx={{ fontSize: 14 }} />}  label="Action Time" value={actionTime} highlight />
                </Box>
              </DialogContent>
            </>
          );
        })()}
      </Dialog>

      {/* ── SNACKBARS ──────────────────────────────────────────── */}
      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" variant="filled" onClose={() => setError(null)}
          sx={{ fontSize: '0.72rem', fontWeight: 600 }}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setSuccess(null)}
          sx={{ fontSize: '0.72rem', fontWeight: 600 }}>{success}</Alert>
      </Snackbar>
    </Box>
  );
};

export default MoSelected;



// import React, { useState, useEffect, useRef } from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import {
//   Box, Typography, Button, Paper, Chip,
//   useTheme, useMediaQuery, CircularProgress, Alert,
//   Snackbar, Dialog, DialogContent,
//   Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
//   IconButton, Tooltip
// } from '@mui/material';
// import ArrowBackIcon   from '@mui/icons-material/ArrowBack';
// import CheckCircleIcon from '@mui/icons-material/CheckCircle';
// import HistoryIcon     from '@mui/icons-material/History';
// import BuildIcon       from '@mui/icons-material/Build';
// import PersonIcon      from '@mui/icons-material/Person';
// import BadgeIcon       from '@mui/icons-material/Badge';
// import EventIcon       from '@mui/icons-material/Event';
// import DoneAllIcon     from '@mui/icons-material/DoneAll';
// import TimerIcon       from '@mui/icons-material/Timer';
// import CloseIcon       from '@mui/icons-material/Close';
// import { formatCurrency, getStatusColor } from '../utils/formatters';
// import { moApprovalService } from '../services/odataService';

// /* ─── constants ──────────────────────────────────────────────────── */
// const INITIAL_SAMPLE_ACTIVITIES = [];
// const APPROVAL_HISTORY          = [];

// /* ─── design tokens ──────────────────────────────────────────────── */
// const T = {
//   purple:  '#6C5CE7',
//   purpleD: '#5849C4',
//   teal:    '#00B894',
//   red:     '#D63031',
//   amber:   '#FDCB6E',
//   blue:    '#0984E3',
//   bg:      '#F0F2F8',
//   surface: '#FFFFFF',
//   border:  '#E2E5EF',
//   label:   '#8891A5',
//   text:    '#1E2333',
//   textSub: '#5C637A',
// };

// /* ─── per-approver palette (cycles for >5 approvers) ────────────── */
// const SLICE_COLORS = ['#6C5CE7', '#00B894', '#0984E3', '#FDCB6E', '#D63031', '#A29BFE'];

// /* ─── live clock hook — ticks every second ───────────────────────── */
// const useNow = () => {
//   const [now, setNow] = React.useState(new Date());
//   React.useEffect(() => {
//     const id = setInterval(() => setNow(new Date()), 1000);
//     return () => clearInterval(id);
//   }, []);
//   return now;
// };

// /* ─── shared table cell styles ───────────────────────────────────── */
// const cellSx = {
//   py: 0.8, px: 1.2,
//   fontSize: '0.71rem',
//   borderBottom: `1px solid ${T.border}`,
//   color: T.text,
// };
// const headCellSx = {
//   ...cellSx,
//   fontWeight: 700,
//   fontSize: '0.63rem',
//   letterSpacing: '0.07em',
//   textTransform: 'uppercase',
//   color: T.label,
//   backgroundColor: '#F7F8FC',
//   py: 1,
// };

// /* ─── helper: parse "DD-MM-YYYY" + "HH:mm" → Date ───────────────── */
// const parseDateTime = (date, time) => {
//   try {
//     const [day, mon, yr] = date.split('-');
//     const [h, m]         = (time || '00:00').split(':');
//     return new Date(yr, mon - 1, day, h, m);
//   } catch { return null; }
// };

// /* ─── helper: ms → "Xd Yh Zm" string ───────────────────────────── */
// const msToDuration = (ms, showSeconds = false) => {
//   if (!ms || ms <= 0) return showSeconds ? '0s' : '< 1m';
//   const totalSecs = Math.floor(ms / 1000);
//   const d  = Math.floor(totalSecs / 86400);
//   const h  = Math.floor((totalSecs % 86400) / 3600);
//   const m  = Math.floor((totalSecs % 3600) / 60);
//   const s  = totalSecs % 60;
//   const parts = [];
//   if (d) parts.push(`${d}d`);
//   if (h) parts.push(`${h}h`);
//   if (m) parts.push(`${m}m`);
//   if (showSeconds && s ) parts.push(`${s}s`); // show seconds only when < 1day & requested
//   return parts.length ? parts.join(' ') : (showSeconds ? `${s}s` : '< 1m');
// };

// /* ─── SVG Donut Chart Component ──────────────────────────────────── */
// /* ─── helper: get row bg colour from duration (green→amber→red) ─── */
// const getRowHeatColor = (ms, maxMs) => {
//   if (!ms || !maxMs) return 'transparent';
//   const ratio = Math.min(ms / maxMs, 1);
//   if (ratio < 0.33) return 'rgba(0,184,148,0.10)';   // greenish
//   if (ratio < 0.66) return 'rgba(253,203,110,0.18)';  // amber
//   return 'rgba(214,48,49,0.10)';                       // reddish
// };
// const getRowBorderColor = (ms, maxMs) => {
//   if (!ms || !maxMs) return 'transparent';
//   const ratio = Math.min(ms / maxMs, 1);
//   if (ratio < 0.33) return '#00B89440';
//   if (ratio < 0.66) return '#FDCB6E60';
//   return '#D6303140';
// };

// /* ─── compute total elapsed (shared between chart + header) ─────── */
// const computeTotalDur = (historyData, now) => {
//   const n = now || new Date();
//   const firstStart = historyData.length
//     ? parseDateTime(historyData[0].Requested, historyData[0].RTime)
//     : null;
//   const totalMs = firstStart ? Math.max(0, n - firstStart) : 0;
//   return { totalMs, totalDur: msToDuration(totalMs, true) };
// };

// const ApprovalDonutChart = ({ historyData }) => {
//   const liveNow = useNow();

//   const segments = historyData.map((h, i) => {
//     const start = parseDateTime(h.Requested, h.RTime);
//     const end   = (h.Approved && h.Approved !== '')
//       ? parseDateTime(h.Approved, h.ATime)
//       : liveNow;
//     const ms = start && end ? Math.max(0, end - start) : 0;
//     return {
//       label: h.Approver,
//       role:  h.Role,
//       ms,
//       dur:   msToDuration(ms),
//       color: SLICE_COLORS[i % SLICE_COLORS.length],
//       done:  !!(h.Approved && h.Approved !== ''),
//     };
//   });

//   const { totalDur } = computeTotalDur(historyData, liveNow);

//   /* SVG donut */
//   const R = 62, r = 40, cx = 90, cy = 90;
//   const totalMsSum = segments.reduce((a, s) => a + s.ms, 0) || 1;
//   let cumAngle = -Math.PI / 2;
//   const arcs = segments.map((seg) => {
//     const angle  = (seg.ms / totalMsSum) * 2 * Math.PI;
//     const startA = cumAngle;
//     const endA   = cumAngle + angle;
//     cumAngle     = endA;
//     const x1  = cx + R * Math.cos(startA), y1  = cy + R * Math.sin(startA);
//     const x2  = cx + R * Math.cos(endA),   y2  = cy + R * Math.sin(endA);
//     const xi1 = cx + r * Math.cos(endA),   yi1 = cy + r * Math.sin(endA);
//     const xi2 = cx + r * Math.cos(startA), yi2 = cy + r * Math.sin(startA);
//     return {
//       ...seg,
//       d: `M ${x1} ${y1} A ${R} ${R} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${r} ${r} 0 ${angle > Math.PI ? 1 : 0} 0 ${xi2} ${yi2} Z`,
//     };
//   });

//   return (
//     <Box sx={{ background: T.surface, px: 2, pt: 2.5, pb: 2 }}>
//       {/* ── section label ── */}
//       <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8, mb: 2 }}>
//         <TimerIcon sx={{ fontSize: 13, color: T.purple }} />
//         <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.08em',
//           textTransform: 'uppercase', color: T.textSub }}>
//           Time Analysis per Approver
//         </Typography>
//       </Box>

//       {/* ── SVG donut — centred ── */}
//       <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
//         <svg width="180" height="180" viewBox="0 0 180 180">
//           <circle cx={cx} cy={cy} r={R} fill="none" stroke={T.border} strokeWidth={R - r} />
//           {arcs.map((arc, i) => (
//             <path key={i} d={arc.d} fill={arc.color} opacity={arc.done ? 1 : 0.4}
//               style={{ filter: arc.done ? 'none' : 'grayscale(30%)', transition: 'all 0.2s' }}>
//               <title>{arc.label}: {arc.dur}</title>
//             </path>
//           ))}
//           {/* centre: just show "elapsed" label — total shown in header */}
//           <text x={cx} y={cy - 8} textAnchor="middle" fontSize="9" fontWeight="800" fill={T.text}>
//             {totalDur}
//           </text>
//           <text x={cx} y={cy + 5} textAnchor="middle" fontSize="7" fill={T.label}>elapsed total</text>
//           <text x={cx} y={cy + 16} textAnchor="middle" fontSize="6.5" fill={T.label}>req → now</text>
//         </svg>
//       </Box>

//       {/* ── Legend — centred, wrapping pills ── */}
//       <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
//         {segments.map((seg, i) => (
//           <Box key={i} sx={{
//             display: 'flex', alignItems: 'center', gap: 0.7,
//             background: `${seg.color}14`,
//             border: `1px solid ${seg.color}40`,
//             borderRadius: '20px', px: 1.2, py: 0.5,
//           }}>
//             <Box sx={{ width: 8, height: 8, borderRadius: '50%',
//               background: seg.color, opacity: seg.done ? 1 : 0.45, flexShrink: 0 }} />
//             <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: T.text,
//               maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
//               {seg.label}
//             </Typography>
//             <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: seg.color }}>
//               {seg.dur}
//             </Typography>
//             {!seg.done && (
//               <Box sx={{ fontSize: '0.5rem', fontWeight: 700, background: '#FFF3CD',
//                 color: '#856404', border: '1px solid #FFE08A',
//                 borderRadius: '3px', px: 0.5, lineHeight: 1.6 }}>⏳</Box>
//             )}
//           </Box>
//         ))}
//       </Box>
//     </Box>
//   );
// };

// /* ─── reusable: stat card ────────────────────────────────────────── */
// const StatCard = ({ label, value, accent }) => (
//   <Box sx={{
//     flex: 1, minWidth: 100,
//     background: T.surface,
//     border: `1px solid ${T.border}`,
//     borderTop: `3px solid ${accent}`,
//     borderRadius: '8px',
//     px: 1.5, py: 1.2,
//   }}>
//     <Typography sx={{
//       fontSize: '0.58rem', fontWeight: 700,
//       letterSpacing: '0.08em', textTransform: 'uppercase',
//       color: T.label, mb: 0.3,
//     }}>
//       {label}
//     </Typography>
//     <Typography sx={{
//       fontSize: '0.85rem', fontWeight: 800, color: T.text,
//       overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
//     }}>
//       {value}
//     </Typography>
//   </Box>
// );

// /* ─── reusable: detail row inside approval dialog ────────────────── */
// const DetailRow = ({ icon, label, value, highlight }) => (
//   <Box sx={{
//     display: 'flex', alignItems: 'center', gap: 1.5,
//     py: 0.95,
//     px: highlight ? 1.2 : 0,
//     borderRadius: highlight ? '6px' : 0,
//     background: highlight ? '#EDE9FF' : 'transparent',
//     borderBottom: `1px solid ${T.border}`,
//     '&:last-of-type': { borderBottom: 'none' },
//   }}>
//     <Box sx={{ color: highlight ? T.purple : T.label, display: 'flex', flexShrink: 0 }}>
//       {icon}
//     </Box>
//     <Typography sx={{ fontSize: '0.68rem', color: T.label, minWidth: 78 }}>
//       {label}
//     </Typography>
//     <Typography sx={{
//       fontSize: '0.75rem', fontWeight: highlight ? 800 : 600,
//       color: highlight ? T.purple : T.text,
//       ml: 'auto', textAlign: 'right',
//     }}>
//       {value}
//     </Typography>
//   </Box>
// );

// /* ══════════════════════════════════════════════════════════════════
//    MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════ */
// const MoSelected = () => {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const theme    = useTheme();
//   const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

//   /* ── state ────────────────────────────────────────────────────── */
//   const [order,                    setOrder]                    = useState(null);
//   const [activities,               setActivities]               = useState(INITIAL_SAMPLE_ACTIVITIES);
//   const [selectedActivities,       setSelectedActivities]       = useState([]);
//   const [loading,                  setLoading]                  = useState(false);
//   const [activitiesLoading,        setActivitiesLoading]        = useState(false);
//   const [error,                    setError]                    = useState(null);
//   const [success,                  setSuccess]                  = useState(null);
//   const [showHistoryDialog,        setShowHistoryDialog]        = useState(false);
//   const [historyData,              setHistoryData]              = useState([]);
//   const [historyLoading,           setHistoryLoading]           = useState(false);
//   const [showApprovalDetailDialog, setShowApprovalDetailDialog] = useState(false);
//   const [selectedApprovalDetail,   setSelectedApprovalDetail]   = useState(null);
//   const initializationRef = useRef(false);

//   /* ── live clock — ticks every second for real-time display ─────── */
//   const liveNow = useNow();

//   /* ── init ─────────────────────────────────────────────────────── */
//   useEffect(() => {
//     if (initializationRef.current) return;
//     initializationRef.current = true;
//     if (location.state?.order) {
//       setOrder(location.state.order);
//       fetchApprovalOrdersDetails(
//         location.state.order.OrderNumber,
//         location.state.order.ObjectNumber,
//       );
//     } else {
//       setError('No order data found. Please select an order.');
//       setTimeout(() => navigate('/mo-approval'), 2000);
//     }
//   }, [location, navigate]);

//   /* ── fetch ────────────────────────────────────────────────────── */
//   const fetchApprovalOrdersDetails = async (orderNo, objNo) => {
//     try {
//       setActivitiesLoading(true);
//       setError(null);
//       const response = await moApprovalService.getApprovelOrdersDetails({
//         OrderNumber: orderNo, ObjectNumber: objNo,
//       });
//       if (Array.isArray(response) && response.length > 0) {
//         const historyItems  = response.filter(i => i.RowType === 'X' && i.Description !== 'Approved By');
//         const activityItems = response.filter(i => i.RowType !== 'X');
//         setActivities(activityItems.map(item => ({
//           Activity:    item.ActivityNo   || '',
//           Description: item.Description  || '',
//           Material:    item.Material      || '',
//           Quantity:    item.quantity      || '',
//           Unit:        item.Uom           || '',
//           Rate:        item.Rate          || '',
//           Amount:      item.amount        || '',
//           ManPower:    item.Man_Power     || '',
//           Duration:    item.duration      || '',
//           TotalTime:   item.total_time    || '',
//           MvType:      item.MvType        || 261,
//         })));
//         setHistoryData(historyItems.map(item => ({
//           Approver:  item.Description || '',
//           Role:      item.Valuation   || '',
//           Requested: item.Material    || '',
//           RTime:     item.Batch       || '',
//           Approved:  item.amount      || '',
//           ATime:     item.Man_Power   || '',
//           Delay:     item.total_time  || '',
//         })));
//       } else {
//         setActivities(INITIAL_SAMPLE_ACTIVITIES);
//         setHistoryData(APPROVAL_HISTORY);
//       }
//     } catch (err) {
//       setError(`Failed to load: ${err.message || 'Unknown error'}`);
//       setActivities(INITIAL_SAMPLE_ACTIVITIES);
//       setHistoryData(APPROVAL_HISTORY);
//     } finally {
//       setActivitiesLoading(false);
//     }
//   };

//   /* ── helpers ──────────────────────────────────────────────────── */
//   const calculateActionTime = (reqDate, reqTime, appDate, appTime) => {
//     try {
//       const diff = parseDateTime(appDate, appTime) - parseDateTime(reqDate, reqTime);
//       return msToDuration(diff);
//     } catch { return 'N/A'; }
//   };

//   const handleActivitySelect = activity =>
//     setSelectedActivities(prev =>
//       prev.includes(activity.Activity)
//         ? prev.filter(a => a !== activity.Activity)
//         : [...prev, activity.Activity]
//     );

//   const handleShowHistory = () => setShowHistoryDialog(true);



//   const handleApprove = async (orderNumber) => {
//     alert(`Approve action triggered for order: ${orderNumber}`);
//     console.log('✅ Approving order:', orderNumber);
//     try {
//       setError(null);
//       const response = await moApprovalService.approveOrders({
//         OrderNumber: orderNumber     
//       }); 
//     } catch (err) {
//       setError(`Failed to load: ${err.message || 'Unknown error'}`);
//       setActivities(INITIAL_SAMPLE_ACTIVITIES);
//       setHistoryData(APPROVAL_HISTORY);
//     }
//   };





//   /* ── loading guard ────────────────────────────────────────────── */
//   if (!order) {
//     return (
//       <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
//         minHeight: '100vh', background: T.bg }}>
//         <CircularProgress size={30} sx={{ color: T.purple }} />
//       </Box>
//     );
//   }

//   /* ══════════════════════════════════════════════════════════════
//      RENDER
//   ══════════════════════════════════════════════════════════════ */
//   return (
//     <Box sx={{ minHeight: '100vh', background: T.bg, pb: 10 }}>

//       {/* ── STICKY HEADER BAR ──────────────────────────────────── */}
//       <Box sx={{
//         background: `linear-gradient(135deg, ${T.purple} 0%, #4834D4 100%)`,
//         px: { xs: 1.5, sm: 3 }, py: 1.2,
//         display: 'flex', alignItems: 'center', gap: 1.2,
//         boxShadow: '0 2px 16px rgba(108,92,231,0.4)',
//         position: 'sticky', top: 0, zIndex: 200,
//       }}>
//         <IconButton size="small" onClick={() => navigate(-1)}
//           sx={{ color: 'white', background: 'rgba(255,255,255,0.15)',
//             borderRadius: '6px', p: 0.6,
//             '&:hover': { background: 'rgba(255,255,255,0.28)' } }}>
//           <ArrowBackIcon sx={{ fontSize: 17 }} />
//         </IconButton>
//         <Box sx={{ flex: 1, minWidth: 0 }}>
//           <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.58rem',
//             letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 700 }}>
//             Maintenance Order
//           </Typography>
//           <Typography sx={{ color: 'white', fontSize: '0.9rem', fontWeight: 800,
//             overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
//             {order.OrderNumber}
//           </Typography>
//         </Box>
//         <Chip label={order.Status || 'Pending'} size="small"
//           sx={{ background: 'rgba(255,255,255,0.18)', color: 'white', fontWeight: 700,
//             fontSize: '0.6rem', height: 20, border: '1px solid rgba(255,255,255,0.28)' }} />
//         <Tooltip title="Actions & History">
//           <IconButton size="small" onClick={handleShowHistory}
//             sx={{ color: 'white', background: 'rgba(255,255,255,0.15)',
//               borderRadius: '6px', p: 0.6,
//               '&:hover': { background: 'rgba(255,255,255,0.28)' } }}>
//             <HistoryIcon sx={{ fontSize: 17 }} />
//           </IconButton>
//         </Tooltip>
//       </Box>

//       {/* ── STAT CARDS ─────────────────────────────────────────── */}
//       <Box sx={{ px: { xs: 1.5, sm: 3 }, pt: 2, pb: 1.5 }}>
//         <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', overflowX: 'auto',
//           pb: 0.5, '&::-webkit-scrollbar': { height: 3 } }}>
//           <StatCard label="Order No"   value={order.OrderNumber}                           accent={T.purple} />
//           <StatCard label="Equipment"  value={order.Equipment || 'N/A'}                    accent={T.teal}   />
//           <StatCard label="Total Cost" value={`₹ ${formatCurrency(order.TotalCost || 0)}`} accent={T.red}    />
//         </Box>
//       </Box>

//       {/* ── ACTIVITIES TABLE ────────────────────────────────────── */}
//       <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 2 }}>
//         <Paper elevation={0} sx={{ border: `1px solid ${T.border}`, borderRadius: '10px',
//           overflow: 'hidden', background: T.surface }}>
//           <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
//             px: 2, py: 1.1, borderBottom: `1px solid ${T.border}`, background: T.surface }}>
//             <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
//               <BuildIcon sx={{ fontSize: 14, color: T.purple }} />
//               <Typography sx={{ fontSize: '0.68rem', fontWeight: 800,
//                 letterSpacing: '0.06em', textTransform: 'uppercase', color: T.text }}>
//                 Maintenance Activities
//               </Typography>
//             </Box>
//             {activitiesLoading && <CircularProgress size={13} sx={{ color: T.purple }} />}
//           </Box>
//           {activitiesLoading ? (
//             <Box display="flex" justifyContent="center" py={5}>
//               <CircularProgress size={26} sx={{ color: T.purple }} />
//             </Box>
//           ) : activities.length === 0 ? (
//             <Box sx={{ py: 5, textAlign: 'center' }}>
//               <Typography sx={{ fontSize: '0.72rem', color: T.label }}>No activities found</Typography>
//             </Box>
//           ) : (
//             <TableContainer>
//               <Table size="small">
//                 <TableHead>
//                   <TableRow>
//                     <TableCell sx={headCellSx}>Activity</TableCell>
//                     <TableCell sx={headCellSx}>Description</TableCell>
//                     {!isMobile && <TableCell sx={headCellSx}>Material</TableCell>}
//                     <TableCell align="right" sx={headCellSx}>Qty</TableCell>
//                     {!isMobile && <>
//                       <TableCell sx={headCellSx}>Unit</TableCell>
//                       <TableCell align="right" sx={headCellSx}>Rate</TableCell>
//                     </>}
//                     <TableCell align="right" sx={headCellSx}>Amount</TableCell>
//                   </TableRow>
//                 </TableHead>
//                 <TableBody>
//                   {activities.map((activity, index) => {
//                     const isSelected = selectedActivities.includes(activity.Activity);
//                     return (
//                       <TableRow key={index} onClick={() => handleActivitySelect(activity)}
//                         sx={{ cursor: 'pointer',
//                           background: isSelected ? '#EDEAFF' : index % 2 === 0 ? T.surface : '#FAFBFF',
//                           outline: isSelected ? `2px inset ${T.purple}` : 'none',
//                           '&:hover': { background: '#F5F2FF' }, transition: 'background 0.12s' }}>
//                         <TableCell sx={cellSx}>
//                           <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: T.purple }}>
//                             {activity.Activity}
//                           </Typography>
//                         </TableCell>
//                         <TableCell sx={{ ...cellSx, maxWidth: isMobile ? 90 : 180 }}>
//                           <Typography sx={{ fontSize: '0.68rem', color: T.text,
//                             overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
//                             {activity.Description}
//                           </Typography>
//                         </TableCell>
//                         {!isMobile && (
//                           <TableCell sx={cellSx}>
//                             <Typography sx={{ fontSize: '0.68rem', color: T.textSub, fontWeight: 600 }}>
//                               {activity.Material}
//                             </Typography>
//                           </TableCell>
//                         )}
//                         <TableCell align="right" sx={cellSx}>
//                           <Typography sx={{ fontSize: '0.68rem', color: T.text }}>
//                             {activity.Quantity}
//                           </Typography>
//                         </TableCell>
//                         {!isMobile && <>
//                           <TableCell sx={cellSx}>
//                             <Typography sx={{ fontSize: '0.68rem', color: T.label }}>
//                               {activity.Unit}
//                             </Typography>
//                           </TableCell>
//                           <TableCell align="right" sx={cellSx}>
//                             <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: T.text }}>
//                               ₹ {formatCurrency(activity.Rate)}
//                             </Typography>
//                           </TableCell>
//                         </>}
//                         <TableCell align="right" sx={cellSx}>
//                           <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: T.red }}>
//                             ₹ {formatCurrency(activity.Amount)}
//                           </Typography>
//                         </TableCell>
//                       </TableRow>
//                     );
//                   })}
//                 </TableBody>
//               </Table>
//             </TableContainer>
//           )}
//           <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2,
//             px: 2, py: 0.9, borderTop: `1px solid ${T.border}`, background: '#F7F8FC' }}>
//             <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: T.label,
//               textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total</Typography>
//             <Typography sx={{ fontSize: '0.9rem', fontWeight: 900, color: T.red }}>
//               ₹ {formatCurrency(order.TotalCost)}
//             </Typography>
//           </Box>
//         </Paper>
//       </Box>

//       {/* ── FIXED BOTTOM ACTION BAR ─────────────────────────────── */}
//       <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 150,
//         px: { xs: 1.5, sm: 3 }, py: 1.1,
//         background: 'rgba(240,242,248,0.94)', backdropFilter: 'blur(10px)',
//         borderTop: `1px solid ${T.border}`,
//         display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
//         <Button fullWidth={isMobile} size="small" variant="contained"
//           startIcon={<HistoryIcon sx={{ fontSize: 15 }} />} onClick={handleShowHistory}
//           sx={{ background: `linear-gradient(135deg, ${T.purple} 0%, #4834D4 100%)`,
//             boxShadow: `0 4px 16px rgba(108,92,231,0.45)`, fontWeight: 700, fontSize: '0.72rem',
//             textTransform: 'none', letterSpacing: '0.02em', borderRadius: '8px', px: 2.5, py: 0.85,
//             '&:hover': { background: `linear-gradient(135deg, ${T.purpleD} 0%, #3529a8 100%)`,
//               boxShadow: `0 6px 20px rgba(108,92,231,0.55)` } }}>
//           Actions &amp; History
//         </Button>
//       </Box>

//       {/* ════════════════════════════════════════════════════════
//           HISTORY DIALOG
//       ════════════════════════════════════════════════════════ */}
//       <Dialog open={showHistoryDialog} onClose={() => setShowHistoryDialog(false)}
//         maxWidth="md" fullWidth fullScreen={isMobile}
//         PaperProps={{ sx: { borderRadius: isMobile ? 0 : '12px', overflow: 'hidden', m: isMobile ? 0 : 2 } }}>

//         {/* ── Header with totalDur + Close button ── */}
//         {(() => {
//           const { totalDur: hdrTotal } = computeTotalDur(historyData, liveNow);
//           return (
//             <Box sx={{ background: `linear-gradient(135deg, ${T.purple} 0%, #4834D4 100%)`,
//               px: 2.5, pt: 1.8, pb: 1.5 }}>
//               {/* top row: title + close */}
//               <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
//                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//                   <HistoryIcon sx={{ color: 'white', fontSize: 17 }} />
//                   <Box>
//                     <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.82rem', lineHeight: 1.2 }}>
//                       Approval History
//                     </Typography>
//                     <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.6rem' }}>
//                       Order: {order.OrderNumber}
//                     </Typography>
//                   </Box>
//                 </Box>
//                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
//                   <Chip label={`${historyData.length} step${historyData.length !== 1 ? 's' : ''}`}
//                     size="small"
//                     sx={{ background: 'rgba(255,255,255,0.18)', color: 'white',
//                       fontSize: '0.58rem', height: 18, fontWeight: 700 }} />
//                   <IconButton size="small" onClick={() => setShowHistoryDialog(false)}
//                     sx={{ color: 'white', background: 'rgba(255,255,255,0.18)',
//                       border: '1px solid rgba(255,255,255,0.28)', borderRadius: '6px', p: 0.45,
//                       '&:hover': { background: 'rgba(255,255,255,0.3)' } }}>
//                     <CloseIcon sx={{ fontSize: 14 }} />
//                   </IconButton>
//                 </Box>
//               </Box>

//               {/* big total elapsed strip */}
//               <Box sx={{
//                 display: 'flex', alignItems: 'center', gap: 1.5,
//                 background: 'rgba(0,0,0,0.18)',
//                 borderRadius: '8px', px: 2, py: 1,
//               }}>
//                 <TimerIcon sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
//                 <Box>
//                   <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.58rem',
//                     fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
//                     Total Elapsed (First Request → Now)
//                   </Typography>
//                   <Typography sx={{ color: 'white', fontSize: '1.55rem', fontWeight: 900,
//                     letterSpacing: '-0.02em', lineHeight: 1.1 }}>
//                     {hdrTotal}
//                   </Typography>
//                 </Box>
//               </Box>
//             </Box>
//           );
//         })()}

//         {/* ── Content ── */}
//         <DialogContent sx={{ p: 0, background: '#F7F8FC' }}>
//           {historyLoading ? (
//             <Box display="flex" justifyContent="center" py={6}>
//               <CircularProgress size={26} sx={{ color: T.purple }} />
//             </Box>
//           ) : historyData.length === 0 ? (
//             <Box sx={{ py: 5, textAlign: 'center' }}>
//               <Typography sx={{ fontSize: '0.75rem', color: T.label }}>No history found</Typography>
//             </Box>
//           ) : (
//             <>
//               {/* ── Donut chart FIRST ── */}
//               <ApprovalDonutChart historyData={historyData} />

//               {/* ── Divider ── */}
//               <Box sx={{ mx: 2, borderTop: `1px solid ${T.border}` }} />

//               {/* ── Table BELOW ── */}
//               {(() => {
//                 const maxMs = Math.max(...historyData.map(h => {
//                   const s = parseDateTime(h.Requested, h.RTime);
//                   const e = (h.Approved && h.Approved !== '')
//                     ? parseDateTime(h.Approved, h.ATime)
//                     : liveNow;
//                   return s && e ? Math.max(0, e - s) : 0;
//                 }));
//                 return (
//               <TableContainer>
//                 <Table size="small">
//                   <TableHead>
//                     <TableRow>
//                       <TableCell sx={headCellSx}>Role</TableCell>
//                       <TableCell sx={headCellSx}>Approver</TableCell>
//                       <TableCell sx={headCellSx}>Requested</TableCell>
//                       {!isMobile && <TableCell sx={headCellSx}>Approved</TableCell>}
//                       <TableCell align="center" sx={headCellSx}>Status</TableCell>
//                     </TableRow>
//                   </TableHead>
//                   <TableBody>
//                     {historyData.map((history, index) => {
//                       const isApproved = !!(history.Approved && history.Approved !== '');
//                       const rowStart = parseDateTime(history.Requested, history.RTime);
//                       const rowEnd   = isApproved
//                         ? parseDateTime(history.Approved, history.ATime)
//                         : liveNow;
//                       const rowMs    = rowStart && rowEnd ? Math.max(0, rowEnd - rowStart) : 0;
//                       const heatBg   = getRowHeatColor(rowMs, maxMs);
//                       const heatBdr  = getRowBorderColor(rowMs, maxMs);
//                       return (
//                         <TableRow key={index}
//                           sx={{ background: heatBg,
//                             borderLeft: `3px solid ${heatBdr}`,
//                             '&:hover': { filter: 'brightness(0.96)' }, transition: 'all 0.12s' }}>
//                           <TableCell sx={cellSx}>
//                             <Chip label={history.Role} size="small"
//                               sx={{ height: 18, fontSize: '0.58rem', fontWeight: 700,
//                                 background: '#EDE9FF', color: T.purple,
//                                 border: `1px solid ${T.purple}30` }} />
//                           </TableCell>
//                           <TableCell sx={cellSx}>
//                             <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.text }}>
//                               {history.Approver}
//                             </Typography>
//                           </TableCell>
//                           <TableCell sx={cellSx}>
//                             <Typography sx={{ fontSize: '0.67rem', color: T.textSub, fontWeight: 600 }}>
//                               {history.Requested}
//                             </Typography>
//                             <Typography sx={{ fontSize: '0.6rem', color: T.label }}>
//                               {history.RTime}
//                             </Typography>
//                           </TableCell>
//                           {!isMobile && (
//                             <TableCell sx={cellSx}>
//                               {isApproved ? (
//                                 <>
//                                   <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: T.teal }}>
//                                     {history.Approved}
//                                   </Typography>
//                                   <Typography sx={{ fontSize: '0.6rem', color: T.label }}>
//                                     {history.ATime}
//                                   </Typography>
//                                 </>
//                               ) : (
//                                 <Typography sx={{ fontSize: '0.6rem', color: T.label }}>—</Typography>
//                               )}
//                             </TableCell>
//                           )}
//                           <TableCell align="center" sx={cellSx}>
//                             <Chip clickable
//                               onClick={() => {
//                                 if (isApproved) {
//                                   setSelectedApprovalDetail(history);
//                                   setShowApprovalDetailDialog(true);
//                                 } else {
//                                   setShowHistoryDialog(false);
//                                   handleApprove(order.OrderNumber);
//                                 }
//                               }}
//                               icon={isApproved
//                                 ? <DoneAllIcon sx={{ fontSize: '11px !important', color: 'white !important' }} />
//                                 : <CheckCircleIcon sx={{ fontSize: '11px !important', color: 'white !important' }} />}
//                               label={isApproved ? 'Approved' : 'Approve'}
//                               size="small"
//                               sx={{ height: 22, fontSize: '0.6rem', fontWeight: 700,
//                                 background: isApproved
//                                   ? `linear-gradient(135deg, ${T.teal}, #00997d)`
//                                   : `linear-gradient(135deg, ${T.purple}, #4834D4)`,
//                                 color: 'white', border: 'none',
//                                 boxShadow: isApproved
//                                   ? '0 2px 8px rgba(0,184,148,0.4)'
//                                   : '0 2px 8px rgba(108,92,231,0.4)',
//                                 '& .MuiChip-icon': { ml: '6px' },
//                                 '&:hover': { opacity: 0.85, transform: 'translateY(-1px)' },
//                                 transition: 'all 0.15s ease' }} />
//                           </TableCell>
//                         </TableRow>
//                       );
//                     })}
//                   </TableBody>
//                 </Table>
//               </TableContainer>
//                 );
//               })()}
//             </>
//           )}
//         </DialogContent>
//       </Dialog>

//       {/* ════════════════════════════════════════════════════════
//           APPROVAL DETAIL DIALOG
//       ════════════════════════════════════════════════════════ */}
//       <Dialog open={showApprovalDetailDialog} onClose={() => setShowApprovalDetailDialog(false)}
//         maxWidth="xs" fullWidth fullScreen={isMobile}
//         PaperProps={{ sx: { borderRadius: isMobile ? 0 : '12px', overflow: 'hidden', m: isMobile ? 0 : 2 } }}>
//         {selectedApprovalDetail && (() => {
//           const actionTime = calculateActionTime(
//             selectedApprovalDetail.Requested, selectedApprovalDetail.RTime,
//             selectedApprovalDetail.Approved,  selectedApprovalDetail.ATime,
//           );
//           return (
//             <>
//               <Box sx={{ background: `linear-gradient(135deg, ${T.teal} 0%, #00997d 100%)`,
//                 px: 2.5, py: 1.8, display: 'flex', alignItems: 'center',
//                 justifyContent: 'space-between' }}>
//                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
//                   <DoneAllIcon sx={{ color: 'white', fontSize: 22 }} />
//                   <Box>
//                     <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.2 }}>
//                       Approval Detail
//                     </Typography>
//                     <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.62rem' }}>
//                       {selectedApprovalDetail.Role}
//                     </Typography>
//                   </Box>
//                 </Box>
//                 <IconButton size="small" onClick={() => setShowApprovalDetailDialog(false)}
//                   sx={{ color: 'white', background: 'rgba(255,255,255,0.18)',
//                     border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', p: 0.5,
//                     '&:hover': { background: 'rgba(255,255,255,0.3)' } }}>
//                   <CloseIcon sx={{ fontSize: 15 }} />
//                 </IconButton>
//               </Box>
//               <DialogContent sx={{ px: 2.5, py: 2, background: T.surface }}>
//                 <Box sx={{ border: `1px solid ${T.border}`, borderRadius: '8px', p: 1.5 }}>
//                   <DetailRow icon={<PersonIcon sx={{ fontSize: 14 }} />} label="Approver" value={selectedApprovalDetail.Approver} />
//                   <DetailRow icon={<BadgeIcon sx={{ fontSize: 14 }} />}  label="Role"     value={selectedApprovalDetail.Role} />
//                   <DetailRow icon={<EventIcon sx={{ fontSize: 14 }} />}  label="Requested" value={`${selectedApprovalDetail.Requested}  ${selectedApprovalDetail.RTime}`} />
//                   <DetailRow icon={<DoneAllIcon sx={{ fontSize: 14 }} />} label="Approved" value={`${selectedApprovalDetail.Approved}  ${selectedApprovalDetail.ATime}`} />
//                   <DetailRow icon={<TimerIcon sx={{ fontSize: 14 }} />}  label="Action Time" value={actionTime} highlight />
//                 </Box>
//               </DialogContent>
//             </>
//           );
//         })()}
//       </Dialog>

//       {/* ── SNACKBARS ──────────────────────────────────────────── */}
//       <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}
//         anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
//         <Alert severity="error" variant="filled" onClose={() => setError(null)}
//           sx={{ fontSize: '0.72rem', fontWeight: 600 }}>{error}</Alert>
//       </Snackbar>
//       <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess(null)}
//         anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
//         <Alert severity="success" variant="filled" onClose={() => setSuccess(null)}
//           sx={{ fontSize: '0.72rem', fontWeight: 600 }}>{success}</Alert>
//       </Snackbar>
//     </Box>
//   );
// };

// export default MoSelected;

