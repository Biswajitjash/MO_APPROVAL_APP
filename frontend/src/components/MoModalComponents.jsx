// ============================================================================
// MoModalComponents.jsx  — NotificationModal, ApprovalOverviewModal
// ============================================================================
import React from 'react';
import {
  Box, Typography, Chip, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import CloseIcon    from '@mui/icons-material/Close';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { groupByStat, groupByTxt30 } from '../constants/moConstants';
import { GroupedNotificationTable, GroupedMoOrderTable, MoMobileCard } from './MoTableComponents';

// ── Notification Modal ────────────────────────────────────────────────────────
export const NotificationModal = ({ open, onClose, title, subtitle, data, headerColor, icon: Icon, isMobile }) => {
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

// ── Approval Overview Modal ───────────────────────────────────────────────────
// Desktop: full 14-col table grouped by Txt30
// Mobile:  compact card list (Aufnr, Auart, Ktext, Txt30, Stat, Erdat, Werks, Vaplz)
export const ApprovalOverviewModal = ({ open, onClose, data, title, subtitle, headerColor, isMobile }) => {
  const groups = groupByTxt30(data);
  const hc = headerColor || 'linear-gradient(135deg, #37474F 0%, #607D8B 100%)';
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth fullScreen={isMobile}
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
          <Box sx={{ p: 1.5, overflowY: 'auto', maxHeight: '80vh' }}>
            {data.length === 0
              ? <Typography sx={{ textAlign: 'center', color: '#aaa', py: 4, fontSize: '0.8rem' }}>No records found</Typography>
              : data.map((item, idx) => <MoMobileCard key={item.Aufnr} item={item} index={idx} />)
            }
          </Box>
        ) : (
          <GroupedMoOrderTable data={data} />
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