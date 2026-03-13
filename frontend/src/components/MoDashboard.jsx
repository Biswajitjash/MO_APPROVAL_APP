import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Paper, Grid, Card, CardContent,
  CardActionArea, useTheme, useMediaQuery, Fade, CircularProgress,
  Tooltip, AppBar, Toolbar, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton,
  TextField, Popover,
} from '@mui/material';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import ErrorIcon        from '@mui/icons-material/Error';
import BuildIcon        from '@mui/icons-material/Build';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AssignmentIcon   from '@mui/icons-material/Assignment';
import DashboardIcon    from '@mui/icons-material/Dashboard';
import LogoutIcon       from '@mui/icons-material/Logout';
import CloseIcon        from '@mui/icons-material/Close';
import ExpandMoreIcon   from '@mui/icons-material/ExpandMore';
import ExpandLessIcon   from '@mui/icons-material/ExpandLess';
import DateRangeIcon    from '@mui/icons-material/DateRange';
import CategoryIcon     from '@mui/icons-material/Category';
import CheckBoxIcon     from '@mui/icons-material/CheckBox';
import { useAuth }           from '../context/AuthContext';
import { moApprovalService } from '../services/odataService';

// ============================================================================
// STATIC CHART DATA
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
// AUART CONFIG  — Maintenance Order Type labels + colors
// ============================================================================

const AUART_CONFIG = [
  { auart: 'PM01', label: 'General Maintenance',           color: '#2196F3' },
  { auart: 'PM02', label: 'Breakdown Maintenance',         color: '#F44336' },
  { auart: 'PM03', label: 'Preventive Maintenance',        color: '#4CAF50' },
  { auart: 'PM04', label: 'Refurbishment order',           color: '#FF9800' },
  { auart: 'PM05', label: 'Calibration order',             color: '#9C27B0' },
  { auart: 'PM06', label: 'Capital investment order',      color: '#00BCD4' },
  { auart: 'SM01', label: 'Service order',                 color: '#3F51B5' },
  { auart: 'SM02', label: 'Service order (with revenues)', color: '#009688' },
  { auart: 'SM03', label: 'Repair service',                color: '#FF5722' },
  { auart: 'YBA1', label: 'Corrective Maintenance',        color: '#795548' },
  { auart: 'YBA2', label: 'Preventive Maintenance YB',     color: '#607D8B' },
  { auart: 'YBA3', label: 'Unplanned Maintenance',         color: '#E91E63' },
  { auart: 'YM02', label: 'Planned Maintenance',           color: '#8BC34A' },
  { auart: 'YM04', label: 'Refurbishment order YM',        color: '#FFC107' },
  { auart: 'ZACC', label: 'Accidental Maintenance order',  color: '#FF1744' },
  { auart: 'ZAMC', label: 'AMC Process',                   color: '#AA00FF' },
  { auart: 'ZAMR', label: 'AMC Process Value Automatic',   color: '#6200EA' },
  { auart: 'ZCAN', label: 'Cannibalisation Maintenance',   color: '#00BFA5' },
  { auart: 'ZM04', label: 'Refurbishment-Equipment',       color: '#F57C00' },
];

// quick lookup: auart → { label, color }
const AUART_MAP = Object.fromEntries(AUART_CONFIG.map(a => [a.auart, a]));

// ============================================================================
// STYLE MAPS  — Notification stat codes
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

// palette for Approval Overview (Txt30-based groups)
const APPROVAL_PALETTE = [
  '#2196F3','#4CAF50','#FF9800','#9C27B0','#F44336',
  '#00BCD4','#3F51B5','#E91E63','#795548','#607D8B',
  '#8BC34A','#FF5722','#FFC107','#AA00FF','#00BFA5',
];

const cellStyle = {
  fontSize: '0.65rem', py: 0.3, px: 0.8,
  whiteSpace: 'nowrap', overflow: 'hidden',
  textOverflow: 'ellipsis', borderBottom: '1px solid #e8e8e8',
};

const NOTIF_COLUMNS = [
  { label: 'Notif No',    width: '14%' },
  { label: 'Type',        width: '8%'  },
  { label: 'Date',        width: '12%' },
  { label: 'Description', width: '34%' },
  { label: 'Status',      width: '18%' },
  { label: 'Stat',        width: '14%' },
];

const MO_COLUMNS = [
  { label: 'Order No',    width: '9%'  },  // Aufnr
  { label: 'Type',        width: '5%'  },  // Auart chip
  { label: 'Created',     width: '8%'  },  // Erdat
  { label: 'Description', width: '16%' },  // Ktext
  { label: 'Stat',        width: '5%'  },  // Stat
  { label: 'Txt04',       width: '5%'  },  // Txt04
  { label: 'Txt30',       width: '11%' },  // Txt30
  { label: 'Company',     width: '5%'  },  // Bukrs
  { label: 'Plant',       width: '5%'  },  // Werks
  { label: 'Work Ctr',    width: '8%'  },  // Vaplz
  { label: 'Created By',  width: '8%'  },  // Ernam
  { label: 'Changed By',  width: '8%'  },  // Aenam
  { label: 'Cost Ctr',    width: '10%' },  // Kostv
  { label: 'Profit Ctr',  width: '7%'  },  // Prctr
];

// ============================================================================
// HELPERS
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

// Group moOrderData by Txt30 field (approval status label)
const groupByTxt30 = (data) => {
  const map = {};
  data.forEach((item) => {
    const key = item.Txt30 || item.txt30 || 'UNKNOWN';
    if (!map[key]) map[key] = { label: key, rows: [] };
    map[key].rows.push(item);
  });
  return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
};

// ============================================================================
// GROUPED NOTIFICATION TABLE  (for notification modals)
// ============================================================================

const GroupedNotificationTable = ({ data, isMobile }) => {
  const groups = groupByStat(data);
  const [collapsed, setCollapsed] = useState({});
  const toggle = (stat) => setCollapsed((p) => ({ ...p, [stat]: !p[stat] }));

  return (
    <TableContainer sx={{ maxHeight: isMobile ? '75vh' : '62vh' }}>
      <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            {NOTIF_COLUMNS.map((col) => (
              <TableCell key={col.label} sx={{ width: col.width, backgroundColor: '#1565C0', color: 'white', fontWeight: 700, fontSize: '0.65rem', py: 0.5, px: 0.8, whiteSpace: 'nowrap', borderBottom: '2px solid #0D47A1' }}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.length === 0 ? (
            <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: '#999', fontSize: '0.75rem' }}>No records found</TableCell></TableRow>
          ) : groups.map((group) => {
            const isCollapsed = !!collapsed[group.stat];
            const hdrBg    = STAT_HEADER_BG[group.stat] || '#E0E0E0';
            const hdrColor = STAT_COLOR[group.stat]      || '#333';
            return (
              <React.Fragment key={group.stat}>
                <TableRow onClick={() => toggle(group.stat)} sx={{ backgroundColor: hdrBg, cursor: 'pointer', '&:hover': { filter: 'brightness(0.96)' } }}>
                  <TableCell colSpan={6} sx={{ py: 0.5, px: 0.8, borderBottom: `2px solid ${hdrColor}40`, borderTop: '2px solid #ddd' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <IconButton size="small" sx={{ p: 0 }}>
                        {isCollapsed ? <ExpandMoreIcon sx={{ fontSize: 16, color: hdrColor }} /> : <ExpandLessIcon sx={{ fontSize: 16, color: hdrColor }} />}
                      </IconButton>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.65rem', fontWeight: 700, backgroundColor: STAT_BG[group.stat] || '#eee', color: hdrColor, px: 0.7, py: 0.2, borderRadius: 0.5 }}>
                        {group.stat}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color: hdrColor }}>
                        {group.txt30}{group.txt04 ? ` (${group.txt04})` : ''}
                      </Typography>
                      <Chip label={`${group.rows.length} record${group.rows.length !== 1 ? 's' : ''}`} size="small"
                        sx={{ ml: 'auto', height: 18, fontSize: '0.6rem', fontWeight: 700, backgroundColor: hdrColor, color: 'white', '& .MuiChip-label': { px: 0.8 } }} />
                    </Box>
                  </TableCell>
                </TableRow>
                {!isCollapsed && group.rows.map((item, idx) => (
                  <TableRow key={`${item.qmnum}-${item.stat}-${idx}`} hover sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f8ff' }, '&:hover': { backgroundColor: '#dce8ff !important' } }}>
                    <TableCell sx={{ ...cellStyle, fontWeight: 700, color: '#1565C0' }}>{item.qmnum}</TableCell>
                    <TableCell sx={cellStyle}>
                      <Chip label={item.qmart} size="small" sx={{ fontSize: '0.55rem', height: 16, fontWeight: 600, backgroundColor: QMART_BG[item.qmart] || '#F5F5F5', color: QMART_COLOR[item.qmart] || '#333', '& .MuiChip-label': { px: 0.5 } }} />
                    </TableCell>
                    <TableCell sx={cellStyle}>{item.qmdat || '—'}</TableCell>
                    <TableCell title={item.qmtxt} sx={{ ...cellStyle, maxWidth: 0 }}>{item.qmtxt || '—'}</TableCell>
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
                {!isCollapsed && (
                  <TableRow sx={{ backgroundColor: `${hdrBg}99` }}>
                    <TableCell colSpan={6} sx={{ py: 0.4, px: 0.8, fontSize: '0.6rem', fontWeight: 700, color: hdrColor, borderBottom: `2px solid ${hdrColor}50`, fontStyle: 'italic' }}>
                      Subtotal — {group.stat} ({group.txt30}): {group.rows.length} record{group.rows.length !== 1 ? 's' : ''}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
          {data.length > 0 && (
            <TableRow sx={{ backgroundColor: '#1565C0', position: 'sticky', bottom: 0 }}>
              <TableCell colSpan={6} sx={{ py: 0.6, px: 0.8, fontSize: '0.68rem', fontWeight: 800, color: 'white', borderTop: '2px solid #0D47A1' }}>
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
// GROUPED MO ORDER TABLE  (for Approval Overview modal — grouped by Txt30)
// ============================================================================

const GroupedMoOrderTable = ({ data, isMobile }) => {
  const groups = groupByTxt30(data);
  const [collapsed, setCollapsed] = useState({});
  const toggle = (lbl) => setCollapsed((p) => ({ ...p, [lbl]: !p[lbl] }));

  return (
    <TableContainer sx={{ maxHeight: isMobile ? '75vh' : '62vh' }}>
      <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            {MO_COLUMNS.map((col) => (
              <TableCell key={col.label} sx={{ width: col.width, backgroundColor: '#37474F', color: 'white', fontWeight: 700, fontSize: '0.65rem', py: 0.5, px: 0.8, whiteSpace: 'nowrap', borderBottom: '2px solid #263238' }}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.length === 0 ? (
            <TableRow><TableCell colSpan={14} align="center" sx={{ py: 4, color: '#999', fontSize: '0.75rem' }}>No records found</TableCell></TableRow>
          ) : groups.map((group, gi) => {
            const isCollapsed = !!collapsed[group.label];
            const color = APPROVAL_PALETTE[gi % APPROVAL_PALETTE.length];
            return (
              <React.Fragment key={group.label}>
                <TableRow onClick={() => toggle(group.label)} sx={{ backgroundColor: `${color}18`, cursor: 'pointer', '&:hover': { filter: 'brightness(0.96)' } }}>
                  <TableCell colSpan={14} sx={{ py: 0.5, px: 0.8, borderBottom: `2px solid ${color}40`, borderTop: '2px solid #ddd' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <IconButton size="small" sx={{ p: 0 }}>
                        {isCollapsed ? <ExpandMoreIcon sx={{ fontSize: 16, color }} /> : <ExpandLessIcon sx={{ fontSize: 16, color }} />}
                      </IconButton>
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color }}>
                        {group.label}
                      </Typography>
                      <Chip label={`${group.rows.length} record${group.rows.length !== 1 ? 's' : ''}`} size="small"
                        sx={{ ml: 'auto', height: 18, fontSize: '0.6rem', fontWeight: 700, backgroundColor: color, color: 'white', '& .MuiChip-label': { px: 0.8 } }} />
                    </Box>
                  </TableCell>
                </TableRow>
                {!isCollapsed && group.rows.map((item, idx) => {
                  const auartColor = AUART_MAP[item.Auart]?.color || '#607D8B';
                  const auartLabel = AUART_MAP[item.Auart]?.label || item.Auart;
                  return (
                    <TableRow key={`${item.Aufnr}-${idx}`} hover sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f8ff' }, '&:hover': { backgroundColor: '#dce8ff !important' } }}>

                      {/* Aufnr — Order Number */}
                      <TableCell sx={{ ...cellStyle, fontWeight: 700, color: '#37474F', fontFamily: 'monospace' }}>
                        {item.Aufnr || '—'}
                      </TableCell>

                      {/* Auart — Order Type chip with tooltip showing full label */}
                      <TableCell sx={cellStyle}>
                        <Tooltip title={`${item.Auart}: ${auartLabel}`} arrow>
                          <Chip label={item.Auart} size="small" sx={{ fontSize: '0.52rem', height: 16, fontWeight: 700, backgroundColor: `${auartColor}22`, color: auartColor, border: `1px solid ${auartColor}55`, '& .MuiChip-label': { px: 0.5 } }} />
                        </Tooltip>
                      </TableCell>

                      {/* Erdat — Created Date */}
                      <TableCell sx={{ ...cellStyle, color: '#555' }}>{item.Erdat || '—'}</TableCell>

                      {/* Ktext — Order Description */}
                      <TableCell title={item.Ktext} sx={{ ...cellStyle, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.Ktext || '—'}
                      </TableCell>

                      {/* Stat — Status Code */}
                      <TableCell sx={cellStyle}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.58rem', backgroundColor: '#EEF2FF', color: '#3730A3', px: 0.5, py: 0.15, borderRadius: 0.5, fontWeight: 700 }}>
                          {item.Stat || '—'}
                        </Typography>
                      </TableCell>

                      {/* Txt04 — Short Status Text */}
                      <TableCell sx={cellStyle}>
                        <Chip label={item.Txt04 || '—'} size="small" sx={{ fontSize: '0.52rem', height: 16, fontWeight: 600, backgroundColor: '#FFF8E1', color: '#F57F17', border: '1px solid #FFE08255', '& .MuiChip-label': { px: 0.5 } }} />
                      </TableCell>

                      {/* Txt30 — Long Status Text */}
                      <TableCell title={item.Txt30} sx={{ ...cellStyle, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#37474F', fontWeight: 600 }}>
                        {item.Txt30 || '—'}
                      </TableCell>

                      {/* Bukrs — Company Code */}
                      <TableCell sx={{ ...cellStyle, color: '#888', fontFamily: 'monospace' }}>{item.Bukrs || '—'}</TableCell>

                      {/* Werks — Plant */}
                      <TableCell sx={{ ...cellStyle, color: '#888', fontFamily: 'monospace' }}>{item.Werks || '—'}</TableCell>

                      {/* Vaplz — Work Center */}
                      <TableCell sx={{ ...cellStyle, color: '#1565C0', fontWeight: 600 }}>{item.Vaplz || '—'}</TableCell>

                      {/* Ernam — Created By */}
                      <TableCell sx={{ ...cellStyle, color: '#555' }}>{item.Ernam || '—'}</TableCell>

                      {/* Aenam — Changed By */}
                      <TableCell sx={{ ...cellStyle, color: '#555' }}>{item.Aenam || '—'}</TableCell>

                      {/* Kostv — Cost Center */}
                      <TableCell sx={{ ...cellStyle, fontFamily: 'monospace', color: '#888' }}>{item.Kostv || '—'}</TableCell>

                      {/* Prctr — Profit Center */}
                      <TableCell sx={{ ...cellStyle, fontFamily: 'monospace', color: '#888' }}>{item.Prctr || '—'}</TableCell>

                    </TableRow>
                  );
                })}
                {!isCollapsed && (
                  <TableRow sx={{ backgroundColor: `${color}10` }}>
                    <TableCell colSpan={14} sx={{ py: 0.4, px: 0.8, fontSize: '0.6rem', fontWeight: 700, color, borderBottom: `2px solid ${color}40`, fontStyle: 'italic' }}>
                      Subtotal — {group.label}: {group.rows.length} record{group.rows.length !== 1 ? 's' : ''}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
          {data.length > 0 && (
            <TableRow sx={{ backgroundColor: '#37474F', position: 'sticky', bottom: 0 }}>
              <TableCell colSpan={14} sx={{ py: 0.6, px: 0.8, fontSize: '0.68rem', fontWeight: 800, color: 'white', borderTop: '2px solid #263238' }}>
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
// NOTIFICATION MODAL  (for notification stat-grouped data)
// ============================================================================

const NotificationModal = ({ open, onClose, title, subtitle, data, headerColor, icon: Icon, isMobile }) => {
  const groups = groupByStat(data);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)' } }}>
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
        <Button onClick={onClose} size="small" variant="contained" sx={{ fontSize: '0.7rem', py: 0.3, px: 1.5, borderRadius: 2, background: headerColor }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// APPROVAL OVERVIEW MODAL
// Desktop: full 14-col GroupedMoOrderTable
// Mobile:  compact card list showing only Aufnr, Auart, Txt30, Erdat, Ktext, Werks, Vaplz
// ============================================================================

const MoMobileCard = ({ item, index, headerColor }) => {
  const auartColor = AUART_MAP[item.Auart]?.color || '#607D8B';
  const auartLabel = AUART_MAP[item.Auart]?.label || item.Auart;
  return (
    <Box sx={{ border: '1px solid #e8e8e8', borderRadius: 2, p: 1.2, mb: 1, background: index % 2 === 0 ? '#f9fbff' : '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {/* Header row: Order No + Auart chip */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
        <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.78rem', color: '#1a237e' }}>
          {item.Aufnr}
        </Typography>
        <Tooltip title={`${item.Auart}: ${auartLabel}`} arrow>
          <Chip label={item.Auart} size="small"
            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, backgroundColor: `${auartColor}22`, color: auartColor, border: `1px solid ${auartColor}55`, '& .MuiChip-label': { px: 0.6 } }} />
        </Tooltip>
      </Box>
      {/* Description */}
      <Typography sx={{ fontSize: '0.75rem', color: '#333', fontWeight: 500, mb: 0.4 }} title={item.Ktext}>
        {item.Ktext || '—'}
      </Typography>
      {/* Status */}
      <Box display="flex" alignItems="center" gap={0.6} mb={0.4}>
        <Chip label={item.Txt30 || '—'} size="small"
          sx={{ height: 18, fontSize: '0.58rem', fontWeight: 600, backgroundColor: '#EDE7F6', color: '#4527A0', '& .MuiChip-label': { px: 0.6 } }} />
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.58rem', backgroundColor: '#F3F4F6', color: '#374151', px: 0.5, py: 0.1, borderRadius: 0.5, fontWeight: 600 }}>
          {item.Stat}
        </Typography>
      </Box>
      {/* Footer: Date | Plant | Work Center */}
      <Box display="flex" gap={1.5} flexWrap="wrap">
        <Box display="flex" alignItems="center" gap={0.3}>
          <Typography sx={{ fontSize: '0.6rem', color: '#888', fontWeight: 600 }}>📅</Typography>
          <Typography sx={{ fontSize: '0.62rem', color: '#555' }}>{item.Erdat || '—'}</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.3}>
          <Typography sx={{ fontSize: '0.6rem', color: '#888', fontWeight: 600 }}>🏭</Typography>
          <Typography sx={{ fontSize: '0.62rem', color: '#555' }}>{item.Werks || '—'}</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.3}>
          <Typography sx={{ fontSize: '0.6rem', color: '#888', fontWeight: 600 }}>🔧</Typography>
          <Typography sx={{ fontSize: '0.62rem', color: '#555' }}>{item.Vaplz || '—'}</Typography>
        </Box>
      </Box>
    </Box>
  );
};

const ApprovalOverviewModal = ({ open, onClose, data, title, subtitle, headerColor, isMobile }) => {
  const groups = groupByTxt30(data);
  const hc = headerColor || 'linear-gradient(135deg, #37474F 0%, #607D8B 100%)';
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)' } }}>

      <DialogTitle sx={{ background: hc, color: 'white', py: 1.5, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <CheckBoxIcon sx={{ fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title || 'Approval Overview'}</Typography>
          {groups.slice(0, 4).map((g) => (
            <Chip key={g.label} label={`${g.label}: ${g.rows.length}`} size="small"
              sx={{ height: 18, fontSize: '0.54rem', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.22)', color: 'white', '& .MuiChip-label': { px: 0.5 } }} />
          ))}
          {groups.length > 4 && (
            <Chip label={`+${groups.length - 4} more`} size="small"
              sx={{ height: 18, fontSize: '0.54rem', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', '& .MuiChip-label': { px: 0.5 } }} />
          )}
          <Chip label={`Total: ${data.length}`} size="small"
            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, backgroundColor: 'rgba(255,255,255,0.45)', color: 'white', '& .MuiChip-label': { px: 0.8 } }} />
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {isMobile ? (
          /* ── Mobile: compact card list (Aufnr, Auart, Txt30, Erdat, Ktext, Werks, Vaplz) ── */
          <Box sx={{ p: 1.5, overflowY: 'auto', maxHeight: '80vh' }}>
            {data.length === 0 ? (
              <Typography sx={{ textAlign: 'center', color: '#aaa', py: 4, fontSize: '0.8rem' }}>No records found</Typography>
            ) : data.map((item, idx) => (
              <MoMobileCard key={item.Aufnr} item={item} index={idx} headerColor={hc} />
            ))}
          </Box>
        ) : (
          /* ── Desktop: full 14-col grouped table ── */
          <GroupedMoOrderTable data={data} isMobile={false} />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1, borderTop: '1px solid #e0e0e0', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: '#888', fontSize: '0.65rem' }}>
          {subtitle}&nbsp;|&nbsp;{groups.length} group{groups.length !== 1 ? 's' : ''}&nbsp;|&nbsp;{data.length} record{data.length !== 1 ? 's' : ''}
        </Typography>
        <Button onClick={onClose} size="small" variant="contained" sx={{ fontSize: '0.7rem', py: 0.3, px: 1.5, borderRadius: 2, background: hc }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// STAT SUMMARY FLIP CARD  (Notification Open — list ↔ donut, flips every 10s)
// ============================================================================

const zoomKeyframes = `
  @keyframes zoomIn {
    0%   { transform: scale(0); opacity: 0; }
    70%  { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

const StatSummaryFlipCard = ({ notificationData, onCardClick }) => {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setFlipped((f) => !f), 10000);
    return () => clearInterval(id);
  }, []);

  const groups    = useMemo(() => groupByStat(notificationData), [notificationData]);
  const donutData = groups.map((g) => ({
    name:  g.stat, label: g.txt30,
    value: g.rows.length,
    color: STAT_COLOR[g.stat] || '#90A4AE',
  }));
  const total = notificationData.length;

  const cardBase = {
    position: 'absolute', width: '100%', height: '100%',
    borderRadius: 3, overflow: 'hidden',
  };

  return (
    <Box onClick={onCardClick} sx={{ height: 220, cursor: 'pointer', position: 'relative' }}>
      <style>{zoomKeyframes}</style>

      {/* FRONT */}
      <Card elevation={4} sx={{
        ...cardBase,
        display: !flipped ? 'flex' : 'none',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #18dd32 0%, #f3ae36 100%)',
        animation: !flipped ? 'zoomIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
      }}>
        <CardContent sx={{ p: 1.0, flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.8}>
            <Box display="flex" alignItems="center" gap={0.8}>
              <AssignmentIcon sx={{ fontSize: 18, color: 'blue' }} />
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'white', fontSize: '0.75rem' }}>Notification Open</Typography>
            </Box>
            <Chip label={`Total: ${total}`} size="small"
              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, backgroundColor: 'rgba(255,255,255,0.35)', color: 'white', '& .MuiChip-label': { px: 0.8 } }} />
          </Box>
          <Box flex={1} sx={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.35 }}>
            {groups.length === 0 ? (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', mt: 2 }}>No data</Typography>
            ) : groups.map((g) => (
              <Box key={g.stat} display="flex" alignItems="center" justifyContent="space-between"
                sx={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 1, px: 1, py: 0.25 }}>
                <Box display="flex" alignItems="center" gap={0.7}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.6rem', fontWeight: 700, backgroundColor: STAT_BG[g.stat] || '#eee', color: STAT_COLOR[g.stat] || '#333', px: 0.5, py: 0.1, borderRadius: 0.5 }}>
                    {g.stat}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.92)', fontWeight: 600 }}>
                    {g.txt30}
                  </Typography>
                </Box>
                <Chip label={g.rows.length} size="small"
                  sx={{ height: 16, fontSize: '0.58rem', fontWeight: 800, minWidth: 28, backgroundColor: STAT_COLOR[g.stat] || '#555', color: 'white', '& .MuiChip-label': { px: 0.6 } }} />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* BACK — donut */}
      <Card elevation={4} sx={{
        ...cardBase,
        display: flipped ? 'flex' : 'none',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #4671e9 0%, #f85b00 100%)',
        animation: flipped ? 'zoomIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
      }}>
        <CardContent sx={{ p: 1.0, flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.3}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'white', fontSize: '0.75rem' }}>Notifications by Status</Typography>
            <Chip label={`Total: ${total}`} size="small"
              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, backgroundColor: 'rgba(255,255,255,0.35)', color: 'white', '& .MuiChip-label': { px: 0.8 } }} />
          </Box>
          {donutData.length === 0 ? (
            <Box flex={1} display="flex" alignItems="center" justifyContent="center">
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>No data</Typography>
            </Box>
          ) : (
            <Box flex={1} sx={{ minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="38%" cy="50%" innerRadius="42%" outerRadius="68%" paddingAngle={2} dataKey="value">
                    {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip formatter={(v, n) => [v, n]} contentStyle={{ backgroundColor: '#fffd', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.62rem' }} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={7}
                    formatter={(v) => <span style={{ fontSize: '0.56rem', color: 'white' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

// ============================================================================
// STAT SETS for Approval Overview
// ============================================================================

const APPROVAL_REQUIRE_STATS = ['E0002', 'E0004', 'E0006', 'E0008'];
const APPROVED_WIP_STATS     = ['E0001', 'E0003', 'E0005', 'E0007', 'E0009'];

// ── Compact MO row used inside the flip card faces ──
const MoCompactRow = ({ item, color }) => {
  const auartColor = AUART_MAP[item.Auart]?.color || '#607D8B';
  return (
    <Box sx={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 1, px: 0.8, py: 0.3, mb: 0.3 }}>
      {/* Row 1: Order No + Auart chip + Txt30 */}
      <Box display="flex" alignItems="center" gap={0.6} mb={0.15}>
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
          {item.Aufnr}
        </Typography>
        <Chip label={item.Auart} size="small" sx={{ height: 14, fontSize: '0.5rem', fontWeight: 700, backgroundColor: `${auartColor}44`, color: 'white', border: `1px solid ${auartColor}77`, '& .MuiChip-label': { px: 0.4 } }} />
        <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.75)', ml: 'auto', fontStyle: 'italic' }}>
          {item.Txt30}
        </Typography>
      </Box>
      {/* Row 2: Ktext description */}
      <Typography variant="caption" title={item.Ktext} sx={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.88)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.Ktext || '—'}
      </Typography>
      {/* Row 3: Date | Plant | Work Center */}
      <Box display="flex" gap={0.8} mt={0.15}>
        <Typography variant="caption" sx={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.6)' }}>{item.Erdat || '—'}</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.55)' }}>Plant: {item.Werks}</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.55)' }}>{item.Vaplz}</Typography>
      </Box>
    </Box>
  );
};


const APPROVAL_COLORS = [
  "#00BCD4",
  "#4CAF50",
  "#FFC107",
  "#F44336",
  "#9C27B0",
  "#3F51B5"
];

// ── Approval Overview — 3-face cycler ──
// Face 0: Approval Require list   (Stat ∈ APPROVAL_REQUIRE_STATS)  → click opens approvalRequire modal
// Face 1: Approved WIP list       (Stat ∈ APPROVED_WIP_STATS)      → click opens approvedWip modal
// Face 2: Approved WIP donut      (same data as face 1)             → click opens approvedWip modal

// const ApprovalOverviewFlipCard = ({
//   approvalRequire,
//   approvedWip,
//   onRequireClick,
//   onWipClick,
//   loading
// }) => {

//   // Group Approval Require by Txt30
//   const groups = useMemo(() => {
//     const map = {};

//     approvalRequire.forEach((item) => {
//       const key = item.Txt30 || "Unknown";

//       if (!map[key]) {
//         map[key] = {
//           name: key,
//           value: 0
//         };
//       }

//       map[key].value += 1;
//     });

//     return Object.values(map);
//   }, [approvalRequire]);

//   return (
//     <Card
//       elevation={4}
//       onClick={onRequireClick}
//       sx={{
//         height: 220,
//         borderRadius: 3,
//         cursor: "pointer",
//         background: "linear-gradient(135deg,#B71C1C,#E53935)",
//         color: "white"
//       }}
//     >
//       <CardContent
//         sx={{
//           p: 1,
//           height: "100%",
//           display: "flex",
//           flexDirection: "column"
//         }}
//       >

//         {/* HEADER */}
//         <Box
//           display="flex"
//           justifyContent="space-between"
//           alignItems="center"
//           mb={0.8}
//         >
//           <Typography
//             variant="caption"
//             sx={{ fontWeight: 800, fontSize: "0.75rem" }}
//           >
//             Approval Require
//           </Typography>

//           <Chip
//             label={loading ? "..." : approvalRequire.length}
//             size="small"
//             sx={{
//               height: 16,
//               fontSize: "0.6rem",
//               background: "rgba(255,255,255,0.25)",
//               color: "white"
//             }}
//           />
//         </Box>

//         {/* BODY */}
//         <Box display="flex" flex={1}>

//           {/* DONUT CHART */}
//           <Box width="50%" height="100%">
//             {groups.length === 0 ? (
//               <Box
//                 height="100%"
//                 display="flex"
//                 alignItems="center"
//                 justifyContent="center"
//               >
//                 <Typography variant="caption">No Data</Typography>
//               </Box>
//             ) : (
//               <ResponsiveContainer>
//                 <PieChart>
//                   <Pie
//                     data={groups}
//                     dataKey="value"
//                     innerRadius={40}
//                     outerRadius={65}
//                     paddingAngle={2}
//                   >
//                     {groups.map((entry, index) => (
//                       <Cell
//                         key={index}
//                         fill={APPROVAL_COLORS[index % APPROVAL_COLORS.length]}
//                       />
//                     ))}
//                   </Pie>

//                   <RechartsTooltip />
//                 </PieChart>
//               </ResponsiveContainer>
//             )}
//           </Box>

//           {/* LIST */}
//           <Box
//             width="50%"
//             pl={1}
//             display="flex"
//             flexDirection="column"
//             justifyContent="center"
//           >
//             {groups.map((g, i) => (
//               <Box
//                 key={i}
//                 display="flex"
//                 justifyContent="space-between"
//                 alignItems="center"
//                 sx={{
//                   background: "rgba(255,255,255,0.15)",
//                   borderRadius: 1,
//                   px: 1,
//                   py: 0.3,
//                   mb: 0.4
//                 }}
//               >
//                 <Typography sx={{ fontSize: "0.65rem" }}>
//                   {g.name}
//                 </Typography>

//                 <Chip
//                   label={g.value}
//                   size="small"
//                   sx={{
//                     height: 16,
//                     fontSize: "0.6rem",
//                     background:
//                       APPROVAL_COLORS[i % APPROVAL_COLORS.length],
//                     color: "white"
//                   }}
//                 />
//               </Box>
//             ))}
//           </Box>

//         </Box>

//       </CardContent>
//     </Card>
//   );
// };

const ApprovalRequireCard = ({ data = [], onClick }) => {

  const groupedData = useMemo(() => {
    const map = {};

    data.forEach((item) => {
      const key = item.Txt30 || "Unknown";

      if (!map[key]) {
        map[key] = {
          name: key,
          value: 0,
        };
      }

      map[key].value += 1;
    });

    return Object.values(map);
  }, [data]);

  const total = data.length;

  return (
    <Card
      elevation={4}
      onClick={onClick}
      sx={{
        height: 220,
        borderRadius: 3,
        cursor: "pointer",
        background: "linear-gradient(135deg,#b71c1c,#e53935)",
        color: "white",
        p: 1,
      }}
    >
      <CardContent sx={{ height: "100%", p: 1 }}>

        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={1}
        >
          <Typography sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
            Approval Require
          </Typography>

          <Chip
            label={`Total: ${total}`}
            size="small"
            sx={{
              height: 18,
              fontSize: "0.6rem",
              background: "rgba(255,255,255,0.3)",
              color: "white",
            }}
          />
        </Box>

        {/* Layout */}
        <Box display="flex" height="180px">

          {/* DONUT */}
          <Box width="50%" height="100%">
            {groupedData.length === 0 ? (
              <Box
                height="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Typography sx={{ fontSize: "0.65rem", opacity: 0.6 }}>
                  No Data
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={groupedData}
                    dataKey="value"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                  >
                    {groupedData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={APPROVAL_COLORS[i % APPROVAL_COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Box>

          {/* LIST */}
          <Box
            width="50%"
            pl={1}
            display="flex"
            flexDirection="column"
            justifyContent="center"
          >
            {groupedData.map((item, i) => (
              <Box
                key={i}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 1,
                  px: 1,
                  py: 0.3,
                  mb: 0.4,
                }}
              >
                <Typography sx={{ fontSize: "0.65rem" }}>
                  {item.name}
                </Typography>

                <Chip
                  label={item.value}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: "0.6rem",
                    background:
                      APPROVAL_COLORS[i % APPROVAL_COLORS.length],
                    color: "white",
                  }}
                />
              </Box>
            ))}
          </Box>

        </Box>
      </CardContent>
    </Card>
  );
};




// const ApprovalOverviewFlipCard = ({ approvalRequire, approvedWip, onRequireClick, onWipClick, loading }) => {
//   const [face, setFace] = useState(0); // 0, 1, 2

//   useEffect(() => {
//     const id = setInterval(() => setFace((f) => (f + 1) % 3), 10000);
//     return () => clearInterval(id);
//   }, []);

//   // donut from approvedWip grouped by Txt30
//   const wipGroups   = useMemo(() => groupByTxt30(approvedWip), [approvedWip]);
//   const wipDonut    = wipGroups.map((g, i) => ({ name: g.label, value: g.rows.length, color: APPROVAL_PALETTE[i % APPROVAL_PALETTE.length] }));

//   const cardBase = { position: 'absolute', width: '100%', height: '100%', borderRadius: 3, overflow: 'hidden' };

//   const FaceHeader = ({ title, count, iconColor, bg }) => (
//     <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.6}
//       sx={{ background: bg, borderRadius: 1, px: 0.8, py: 0.4 }}>
//       <Box display="flex" alignItems="center" gap={0.6}>
//         <CheckBoxIcon sx={{ fontSize: 15, color: iconColor }} />
//         <Typography variant="caption" sx={{ fontWeight: 800, color: 'white', fontSize: '0.7rem' }}>{title}</Typography>
//       </Box>
//       <Chip label={loading ? '…' : count} size="small"
//         sx={{ height: 16, fontSize: '0.58rem', fontWeight: 800, backgroundColor: 'rgba(255,255,255,0.28)', color: 'white', '& .MuiChip-label': { px: 0.6 } }} />
//     </Box>
//   );

//   // ── Face 0: Approval Require ──
//   const face0Click = (e) => { e.stopPropagation(); onRequireClick(); };
//   // ── Face 1 & 2: Approved WIP ──
//   const face12Click = (e) => { e.stopPropagation(); onWipClick(); };

//   return (
//     <Box sx={{ height: 220, cursor: 'pointer', position: 'relative' }}>

//       {/* FACE 0 — Approval Require list */}
//       <Card elevation={4} onClick={face0Click} sx={{
//         ...cardBase,
//         display: face === 0 ? 'flex' : 'none', flexDirection: 'column',
//         background: 'linear-gradient(135deg, #B71C1C 0%, #E53935 100%)',
//         animation: face === 0 ? 'zoomIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
//       }}>
//         <CardContent sx={{ p: 0.8, flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
//           <FaceHeader title="Approval Require" count={approvalRequire.length} iconColor="#FFCDD2" bg="rgba(0,0,0,0.25)" />
//           <Box flex={1} sx={{ overflowY: 'auto' }}>
//             {loading ? (
//               <Box display="flex" alignItems="center" justifyContent="center" flex={1} pt={2}><CircularProgress size={16} sx={{ color: 'white' }} /></Box>
//             ) : approvalRequire.length === 0 ? (
//               <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', textAlign: 'center', mt: 2 }}>No pending approvals</Typography>
//             ) : approvalRequire.slice(0, 4).map((item) => (
//               <MoCompactRow key={item.Aufnr} item={item} color="#E53935" />
//             ))}
//             {approvalRequire.length > 4 && (
//               <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.55rem', display: 'block', textAlign: 'right', mt: 0.3 }}>
//                 +{approvalRequire.length - 4} more — click to view all
//               </Typography>
//             )}
//           </Box>
//           <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.5rem', textAlign: 'right', mt: 0.3 }}>
//             Stat: E0002 · E0004 · E0006 · E0008
//           </Typography>
//         </CardContent>
//       </Card>

//       {/* FACE 1 — Approved WIP list */}
//       <Card elevation={4} onClick={face12Click} sx={{
//         ...cardBase,
//         display: face === 1 ? 'flex' : 'none', flexDirection: 'column',
//         background: 'linear-gradient(135deg, #1B5E20 0%, #43A047 100%)',
//         animation: face === 1 ? 'zoomIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
//       }}>
//         <CardContent sx={{ p: 0.8, flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
//           <FaceHeader title="Approved WIP" count={approvedWip.length} iconColor="#C8E6C9" bg="rgba(0,0,0,0.2)" />
//           <Box flex={1} sx={{ overflowY: 'auto' }}>
//             {loading ? (
//               <Box display="flex" alignItems="center" justifyContent="center" flex={1} pt={2}><CircularProgress size={16} sx={{ color: 'white' }} /></Box>
//             ) : approvedWip.length === 0 ? (
//               <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', textAlign: 'center', mt: 2 }}>No WIP data</Typography>
//             ) : approvedWip.slice(0, 4).map((item) => (
//               <MoCompactRow key={item.Aufnr} item={item} color="#43A047" />
//             ))}
//             {approvedWip.length > 4 && (
//               <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.55rem', display: 'block', textAlign: 'right', mt: 0.3 }}>
//                 +{approvedWip.length - 4} more — click to view all
//               </Typography>
//             )}
//           </Box>
//           <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.5rem', textAlign: 'right', mt: 0.3 }}>
//             Stat: E0001 · E0003 · E0005 · E0007 · E0009
//           </Typography>
//         </CardContent>
//       </Card>

//       {/* FACE 2 — Approved WIP donut */}
//       <Card elevation={4} onClick={face12Click} sx={{
//         ...cardBase,
//         display: face === 2 ? 'flex' : 'none', flexDirection: 'column',
//         background: 'linear-gradient(135deg, #004D40 0%, #00897B 100%)',
//         animation: face === 2 ? 'zoomIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
//       }}>
//         <CardContent sx={{ p: 0.8, flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
//           <FaceHeader title="Approved WIP — by Status" count={approvedWip.length} iconColor="#B2DFDB" bg="rgba(0,0,0,0.2)" />
//           {wipDonut.length === 0 ? (
//             <Box flex={1} display="flex" alignItems="center" justifyContent="center">
//               <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>No data</Typography>
//             </Box>
//           ) : (
//             <Box flex={1} sx={{ minHeight: 0 }}>
//               <ResponsiveContainer width="100%" height="100%">
//                 <PieChart>
//                   <Pie data={wipDonut} cx="38%" cy="50%" innerRadius="38%" outerRadius="62%" paddingAngle={2} dataKey="value">
//                     {wipDonut.map((entry, i) => <Cell key={i} fill={entry.color} />)}
//                   </Pie>
//                   <RechartsTooltip formatter={(v, n) => [v, n]} contentStyle={{ backgroundColor: '#fffd', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.6rem' }} />
//                   <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={7}
//                     formatter={(v) => <span style={{ fontSize: '0.54rem', color: 'white' }}>{v}</span>} />
//                 </PieChart>
//               </ResponsiveContainer>
//             </Box>
//           )}
//         </CardContent>
//       </Card>

//       {/* Face indicator dots */}
//       <Box sx={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 0.5, zIndex: 10, pointerEvents: 'none' }}>
//         {[0, 1, 2].map((i) => (
//           <Box key={i} sx={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: face === i ? 'white' : 'rgba(255,255,255,0.35)', transition: 'background 0.3s' }} />
//         ))}
//       </Box>
//     </Box>
//   );
// };

// ============================================================================
// DATE RANGE PICKER POPOVER
// ============================================================================

const DateRangePicker = ({ fromDate, toDate, onApply, notifLoading }) => {
  const [anchorEl,  setAnchorEl]  = useState(null);
  const [localFrom, setLocalFrom] = useState(fromDate);
  const [localTo,   setLocalTo]   = useState(toDate);
  const open = Boolean(anchorEl);
  const handleOpen  = (e) => { setLocalFrom(fromDate); setLocalTo(toDate); setAnchorEl(e.currentTarget); };
  const handleClose = () => setAnchorEl(null);
  const handleApply = () => { onApply(localFrom, localTo); handleClose(); };
  const applyPreset = (days) => {
    const today = new Date(); const from = new Date();
    from.setDate(today.getDate() - days);
    setLocalFrom(from.toISOString().split('T')[0]);
    setLocalTo(today.toISOString().split('T')[0]);
  };
  return (
    <>
      <Tooltip title="Change date range for notifications">
        <Button size="small" variant="contained"
          startIcon={notifLoading ? <CircularProgress size={10} sx={{ color: 'yellow' }} /> : <DateRangeIcon sx={{ fontSize: 10 }} />}
          onClick={handleOpen} disabled={notifLoading}
          sx={{ fontSize: '0.68rem', py: 0.35, px: 1.2, borderRadius: 2, background: 'rgba(218,241,5,0.18)', backdropFilter: 'blur(4px)', border: '1px solid rgba(4,27,238,0.38)', color: 'yellow', '&:hover': { background: 'rgba(233,236,7,0.28)' }, textTransform: 'none', whiteSpace: 'nowrap' }}
        />
      </Tooltip>
      <Popover open={open} anchorEl={anchorEl} onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { borderRadius: 3, p: 2.5, minWidth: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' } }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#333' }}>📅 Notification Date Range</Typography>
        <Box display="flex" gap={0.8} mb={2} flexWrap="wrap">
          {[7, 30, 60, 90, 180].map((d) => (
            <Chip key={d} label={`${d}d`} size="small" clickable onClick={() => applyPreset(d)}
              sx={{ fontSize: '0.65rem', height: 22, fontWeight: 600, backgroundColor: '#667eea20', color: '#667eea', '&:hover': { backgroundColor: '#667eea', color: 'white' } }} />
          ))}
        </Box>
        <Box display="flex" flexDirection="column" gap={1.5} mb={2.5}>
          <TextField label="From Date" type="date" size="small" value={localFrom} onChange={(e) => setLocalFrom(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ max: localTo }} sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }} />
          <TextField label="To Date"   type="date" size="small" value={localTo}   onChange={(e) => setLocalTo(e.target.value)}   InputLabelProps={{ shrink: true }} inputProps={{ min: localFrom, max: new Date().toISOString().split('T')[0] }} sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }} />
        </Box>
        <Box display="flex" gap={1} justifyContent="flex-end">
          <Button size="small" onClick={handleClose} sx={{ fontSize: '0.7rem', textTransform: 'none', color: '#666' }}>Cancel</Button>
          <Button size="small" variant="contained" onClick={handleApply} disabled={!localFrom || !localTo}
            sx={{ fontSize: '0.7rem', textTransform: 'none', borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            Apply & Refresh
          </Button>
        </Box>
      </Popover>
    </>
  );
};

// ============================================================================
// KPI CARD
// ============================================================================

const KPICard = ({ title, value, unit, trend, trendValue, icon: Icon, color, onClick }) => {
  const isPositive = trend !== 'up';
  const TrendIcon  = trend === 'up' ? TrendingUpIcon : TrendingDownIcon;
  return (
    <Card elevation={1} onClick={onClick} sx={{ borderRadius: 3, overflow: 'hidden', background: 'linear-gradient(135deg, #e4f3c8 0%, #ff7ae9 100%)', position: 'relative', cursor: 'pointer', transition: 'all 0.1s ease', height: '100%', '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 12px 24px rgba(0,0,0,0.15)' }, '&::before': { content: '""', position: 'absolute', top: -30, right: -50, width: 150, height: 140, background: '#1bca38', borderRadius: '70%', opacity: 0.2 } }}>
      <CardActionArea sx={{ height: '100%' }}>
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

  // ── Date range state ──
  const today0 = new Date(); const from0 = new Date();
  from0.setDate(today0.getDate() - 90);
  const [dateFrom,     setDateFrom]     = useState(from0.toISOString().split('T')[0]);
  const [dateTo,       setDateTo]       = useState(today0.toISOString().split('T')[0]);
  const [notifLoading, setNotifLoading] = useState(false);

  // ── Core state ──
  const [loading,               setLoading]               = useState(false);
  const [approvalOrders,        setApprovalOrders]        = useState([]);
  const [approvalOrdersLoading, setApprovalOrdersLoading] = useState(false);
  const [approvalOrdersError,   setApprovalOrdersError]   = useState(null);

  // Notification slices
  const [notificationData,      setNotificationData]      = useState([]);
  const [inProgress,            setInProgress]            = useState([]);
  const [notificationDataError, setNotificationDataError] = useState(null);

  // MO Order data
  const [moOrderData,      setMoOrderData]      = useState([]);
  const [modataLoading,    setModataLoading]    = useState(false);
  const [moOrderDataError, setMoOrderDataError] = useState(null);

  // Modals
  const [showObservationModal,       setShowObservationModal]       = useState(false);
  const [showInProgressModal,        setShowInProgressModal]        = useState(false);
  const [showApprovalRequireModal,   setShowApprovalRequireModal]   = useState(false);
  const [showApprovedWipModal,       setShowApprovedWipModal]       = useState(false);

  const initializationRef = useRef(false);

  // ── Lifecycle ──
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;
    fetchApprovalOrders();
    triggerFetch(dateFrom, dateTo);
  }, []);

  // ── Maintenance Overview: filter moOrderData by Auart, only show count > 0 ──
  const maintenanceOverviewItems = useMemo(() => {
    return AUART_CONFIG
      .map((cfg) => ({
        ...cfg,
        rows: moOrderData.filter(item => item.Auart === cfg.auart),
      }))
      .filter(item => item.rows.length > 0);
  }, [moOrderData]);

  // ── Donut data for "Maintenance Activity Type" — derived from maintenanceOverviewItems ──
  const maintenanceDonutData = useMemo(() =>
    maintenanceOverviewItems.map(item => ({
      name:  item.label,
      value: item.rows.length,
      color: item.color,
    })),
  [maintenanceOverviewItems]);

  // ── Approval Overview slices (derived from moOrderData by Stat) ──
  const approvalRequire = useMemo(
    () => moOrderData.filter(item => APPROVAL_REQUIRE_STATS.includes(item.Stat)),
    [moOrderData],
  );
  const approvedWip = useMemo(
    () => moOrderData.filter(item => APPROVED_WIP_STATS.includes(item.Stat)),
    [moOrderData],
  );

  // ── Build ISO date strings ──
  const buildDateStrings = (fromStr, toStr) => {
    const fromDate = fromStr + 'T00:00:00';
    const toObj    = new Date(toStr);
    toObj.setHours(23, 59, 59, 0);
    return { fromDate, toDate: toObj.toISOString().replace('Z', '').split('.')[0] };
  };

  const triggerFetch = (fromStr, toStr) => {
    const { fromDate, toDate } = buildDateStrings(fromStr, toStr);
    console.log('📅 Date range:', { fromDate, toDate });
    fetchMoNotificationsData(fromDate, toDate);
    fetchMoOrderData(fromDate, toDate);
  };

  const handleDateRangeApply = (fromStr, toStr) => {
    setDateFrom(fromStr);
    setDateTo(toStr);
    triggerFetch(fromStr, toStr);
  };

  // ── API: Notifications ──
  const fetchMoNotificationsData = async (fromDate, toDate) => {
    try {
      setNotifLoading(true);
      const response      = await moApprovalService.getNotificationData(fromDate, toDate);
      const notifications = response.data || [];
      if (!Array.isArray(notifications)) { console.warn('⚠️ Unexpected format:', notifications); return; }

      const parsed = notifications.map(item => ({
        ...item,
        qmdat: item.qmdat
          ? new Date(parseInt(item.qmdat.replace('/Date(', '').replace(')/', ''))).toISOString().split('T')[0]
          : null,
      }));
      const unique         = Object.values(parsed.reduce((acc, item) => { acc[item.qmnum] = item; return acc; }, {}));
      const inProgressData = unique.filter(item => item.stat === 'I0159' || item.stat === 'I0071');

      console.log('📋 Notif Raw:', notifications.length, '| Unique:', unique.length, '| InProgress:', inProgressData.length);
      setNotificationData(unique);
      setInProgress(inProgressData);
    } catch (err) {
      console.error('❌ Notifications error:', err.message);
      setNotificationDataError(err.message || 'Failed to load notifications');
    } finally {
      setNotifLoading(false);
    }
  };

  // ── API: MO Order Data ──
  const fetchMoOrderData = async (fromDate, toDate) => {
    try {
      setModataLoading(true);
      const response = await moApprovalService.getMoOrderData(fromDate, toDate);
      const data     = response.data || [];
      if (!Array.isArray(data)) { console.warn('⚠️ Unexpected MO format:', data); return; }

      const parsed = data.map(item => ({
        ...item,
        Erdat: item.Erdat
          ? new Date(parseInt(item.Erdat.replace('/Date(', '').replace(')/', ''))).toISOString().split('T')[0]
          : null,
      }));
      const unique = Object.values(parsed.reduce((acc, item) => { acc[item.Aufnr] = item; return acc; }, {}));
      console.log('📋 MO Raw:', data.length, '| Unique:', unique.length);
      setMoOrderData(unique);
    } catch (err) {
      console.error('❌ MO Order error:', err.message);
      setMoOrderDataError(err.message || 'Failed to load MO order data');
    } finally {
      setModataLoading(false);
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
  const handleApprovalCardClick      = () => navigate('/mo-approval', { state: { initialOrders: approvalOrders, initialFilters: { orderNumber: '', objectNumber: '', plant: '', location: '', user: currentUserId, status: '' } } });
  const handleObservationCardClick   = () => setShowObservationModal(true);
  const handleInProgressCardClick    = () => setShowInProgressModal(true);
  const handleApprovalRequireClick   = () => setShowApprovalRequireModal(true);
  const handleApprovedWipClick       = () => setShowApprovedWipModal(true);
  const handleLogout                 = () => { logout(); navigate('/login'); };

  // ── Render ──
  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', py: { xs: 2, sm: 3, md: 4 } }}>

      {/* ── AppBar ── */}
      <AppBar position="static" sx={{ background: 'rgba(68, 238, 68, 0.7)', mb: 3 }}>
        <Toolbar sx={{ gap: 1 }}>
          <DashboardIcon sx={{ mr: 1, fontSize: 28 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>MO Dashboard</Typography>
          <DateRangePicker fromDate={dateFrom} toDate={dateTo} onApply={handleDateRangeApply} notifLoading={notifLoading} />
          <Tooltip title={`Logged in as: ${currentUserId}`}>
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>{currentUserId}</Button>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl">

        {/* ── KPI ROW: Notif FlipCard | Approval Overview FlipCard | Require Approval | In Progress ── */}
        <Fade in={!loading} timeout={800}>
          <Grid container spacing={2} mb={2} alignItems="stretch">

            {/* 1. Notification Open flip card */}
            <Grid item xs={12} sm={6} md={3}>
              <StatSummaryFlipCard notificationData={notificationData} onCardClick={handleObservationCardClick} />
            </Grid>

            {/* 2. Approval Overview 3-face flip card */}
            <Grid item xs={12} sm={6} md={3}>
              {/* <ApprovalOverviewFlipCard
                approvalRequire={approvalRequire}
                approvedWip={approvedWip}
                onRequireClick={handleApprovalRequireClick}
                onWipClick={handleApprovedWipClick}
                loading={modataLoading}
              /> */}

              <ApprovalRequireCard
  data={approvalRequire}
  onClick={() => setShowApprovalRequireModal(true)}
/>

            </Grid>

            {/* 3. Require Approval */}
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Require Approval" value={approvalOrdersLoading ? '...' : approvalOrders.length} unit="orders" icon={ErrorIcon} color="#2617f5" onClick={handleApprovalCardClick} />
            </Grid>

            {/* 4. In Progress  [Resolved card REMOVED] */}
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="In Progress" value={notifLoading ? '…' : inProgress.length} unit="orders" trend="up" trendValue="5%" icon={BuildIcon} color="#2196F3" onClick={handleInProgressCardClick} />
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

        {/* ── Maintenance Overview (Auart-based) + Donut Chart ── */}
        <Fade in={!loading} timeout={1400}>
          <Grid container spacing={3} mt={0}>

            {/* LEFT: Maintenance Overview — filtered by Auart, only count > 0 */}
            <Grid item xs={12} md={6}>
              <ChartCard title="Maintenance Overview" height={420}>
                {modataLoading ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={20} /><Typography variant="body2" sx={{ color: '#aaa' }}>Loading…</Typography>
                  </Box>
                ) : maintenanceOverviewItems.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#aaa' }}>No maintenance order data available</Typography>
                ) : (
                  <Grid container spacing={0.8} sx={{ width: '100%', alignContent: 'flex-start' }}>
                    {maintenanceOverviewItems.map((item) => (
                      <Grid item xs={12} sm={6} key={item.auart}>
                        <Paper sx={{
                          p: 0.8,
                          background: `linear-gradient(135deg, ${item.color}18 0%, ${item.color}08 100%)`,
                          borderLeft:  `4px solid ${item.color}`,
                          borderRight: `4px solid ${item.color}`,
                          borderRadius: 2,
                          transition: 'all 0.2s ease',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${item.color}30` },
                        }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Box display="flex" alignItems="center" gap={0.6} flex={1} minWidth={0}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '20%', backgroundColor: item.color, flexShrink: 0 }} />
                              <Tooltip title={item.label}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: item.color, fontSize: '0.62rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.label}
                                </Typography>
                              </Tooltip>
                            </Box>
                            <Chip label={item.rows.length} size="small"
                              sx={{ height: 20, minWidth: 30, fontSize: '0.68rem', fontWeight: 800, backgroundColor: item.color, color: 'white', ml: 0.5, flexShrink: 0, '& .MuiChip-label': { px: 0.8 } }} />
                          </Box>
                          <Typography variant="caption" sx={{ color: '#aaa', fontSize: '0.55rem', display: 'block', mt: 0.2 }}>
                            Auart: {item.auart}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                    {/* Total row */}
                    <Grid item xs={12}>
                      <Paper sx={{ p: 1, background: 'linear-gradient(135deg, #37474F15 0%, #37474F05 100%)', borderLeft: '5px solid #37474F', borderRight: '5px solid #37474F', borderRadius: 2, mt: 0.5 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#37474F', fontSize: '0.72rem' }}>Total MO Orders</Typography>
                          <Chip label={maintenanceOverviewItems.reduce((s, i) => s + i.rows.length, 0)} size="small"
                            sx={{ height: 22, minWidth: 32, fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#37474F', color: 'white', '& .MuiChip-label': { px: 1 } }} />
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                )}
              </ChartCard>
            </Grid>

            {/* RIGHT: Maintenance Activity Type — DONUT from maintenanceOverviewItems */}
            <Grid item xs={12} md={6}>
              <ChartCard title="Maintenance Activity Type" height={420}>
                {modataLoading ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={20} /><Typography variant="body2" sx={{ color: '#aaa' }}>Loading…</Typography>
                  </Box>
                ) : maintenanceDonutData.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#aaa' }}>No activity data available</Typography>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={maintenanceDonutData}
                        cx="45%" cy="48%"
                        innerRadius="35%"
                        outerRadius="62%"
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {maintenanceDonutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value, name) => [`${value} orders`, name]}
                        contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.72rem' }}
                      />
                      <Legend
                        layout="vertical" align="right" verticalAlign="middle" iconSize={9}
                        formatter={(value) => <span style={{ fontSize: '0.62rem', color: '#444' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </Grid>

          </Grid>
        </Fade>

        {/* ── Fault Trend ── */}
        <Fade in={!loading} timeout={1000}>
          <Grid container spacing={1} mb={2} mt={1}>
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
      <NotificationModal open={showObservationModal} onClose={() => setShowObservationModal(false)}
        title="Notification Open" subtitle="All unique open notifications grouped by status"
        data={notificationData} headerColor="linear-gradient(135deg, #FFA000 0%, #FF6F00 100%)"
        icon={AssignmentIcon} isMobile={isMobile} />

      {/* ── MODAL 2: In Progress ── */}
      <NotificationModal open={showInProgressModal} onClose={() => setShowInProgressModal(false)}
        title="In Progress Notifications" subtitle="I0071 (Order Assigned) & I0159 (All Tasks Completed)"
        data={inProgress} headerColor="linear-gradient(135deg, #2196F3 0%, #1565C0 100%)"
        icon={BuildIcon} isMobile={isMobile} />

      {/* ── MODAL 3: Approval Require (E0002/E0004/E0006/E0008) ── */}
      <ApprovalOverviewModal
        open={showApprovalRequireModal}
        onClose={() => setShowApprovalRequireModal(false)}
        data={approvalRequire}
        title="Approval Require"
        subtitle="Orders pending approval — Stat: E0002 · E0004 · E0006 · E0008"
        headerColor="linear-gradient(135deg, #B71C1C 0%, #E53935 100%)"
        isMobile={isMobile}
      />

      {/* ── MODAL 4: Approved WIP (E0001/E0003/E0005/E0007/E0009) ── */}
      <ApprovalOverviewModal
        open={showApprovedWipModal}
        onClose={() => setShowApprovedWipModal(false)}
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

