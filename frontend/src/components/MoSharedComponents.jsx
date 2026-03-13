// ============================================================================
// MoSharedComponents.jsx  — KPICard, ChartCard, DateRangePicker
// ============================================================================
import React, { useState } from 'react';
import {
  Box, Card, CardActionArea, CardContent, Typography, Chip,
  Paper, Button, Tooltip, CircularProgress, Popover, TextField,
} from '@mui/material';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import DateRangeIcon    from '@mui/icons-material/DateRange';

// ── KPI Card ──────────────────────────────────────────────────────────────────
export const KPICard = ({ title, value, unit, trend, trendValue, icon: Icon, color, onClick }) => {
  const isPositive = trend !== 'up';
  const TrendIcon  = trend === 'up' ? TrendingUpIcon : TrendingDownIcon;
  return (
    <Card elevation={1} onClick={onClick} sx={{
      borderRadius: 3, overflow: 'hidden',
      background: 'linear-gradient(135deg, #e4f3c8 0%, #ff7ae9 100%)',
      position: 'relative', cursor: 'pointer', transition: 'all 0.1s ease', height: '100%',
      '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 12px 24px rgba(0,0,0,0.15)' },
      '&::before': { content: '""', position: 'absolute', top: -30, right: -50, width: 150, height: 140, background: '#1bca38', borderRadius: '70%', opacity: 0.2 },
    }}>
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

// ── Chart Card wrapper ────────────────────────────────────────────────────────
export const ChartCard = ({ title, children, height = 300 }) => (
  <Paper elevation={4} sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)', height, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#333', flexShrink: 0 }}>{title}</Typography>
    <Box flex={1} sx={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
      {children}
    </Box>
  </Paper>
);

// ── Date Range Picker ─────────────────────────────────────────────────────────
export const DateRangePicker = ({ fromDate, toDate, onApply, notifLoading }) => {
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
      <Tooltip title="Change date range">
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