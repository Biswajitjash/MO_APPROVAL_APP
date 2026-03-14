// ============================================================================
// MoKpiCards.jsx
//   • StatSummaryFlipCard  — Notification Open (list ↔ donut, manual toggle)
//   • ApprovalOverviewCard — Approval Require & Approved WIP
//     Layout: donut LEFT + grouped-count rows RIGHT, manual toggle between
//     "Approval Require" and "Approved WIP" views (no auto-flip, no 3rd face)
// ============================================================================
import React, { useState, useMemo, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, CircularProgress, IconButton, Tooltip,
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckBoxIcon   from '@mui/icons-material/CheckBox';
import SwapHorizIcon  from '@mui/icons-material/SwapHoriz';
import {
  STAT_BG, STAT_COLOR, APPROVAL_PALETTE, groupByStat, groupByTxt30,
} from '../constants/moConstants';

// ── CSS keyframe (injected once at module level, not inside component) ─────────
// FIX: was inside StatSummaryFlipCard body — a new <style> tag was injected into
// the DOM on every render. Moved here so it's a single module-level constant.
const zoomKeyframes = `
  @keyframes zoomIn {
    0%   { transform: scale(0.85); opacity: 0; }
    70%  { transform: scale(1.03); opacity: 1; }
    100% { transform: scale(1);    opacity: 1; }
  }
`;
// Inject once into the document head
if (typeof document !== 'undefined' && !document.getElementById('mo-kpi-keyframes')) {
  const styleTag = document.createElement('style');
  styleTag.id = 'mo-kpi-keyframes';
  styleTag.textContent = zoomKeyframes;
  document.head.appendChild(styleTag);
}

// ── Reusable donut (left side of ApprovalOverviewCard) ────────────────────────
// FIX: Added React.memo — this component is purely presentational and
// re-renders were triggered unnecessarily by parent state changes.
const MiniDonut = React.memo(({ data, cx = '50%', cy = '50%', innerR = '48%', outerR = '78%' }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data} cx={cx} cy={cy}
        innerRadius={innerR} outerRadius={outerR}
        paddingAngle={2} dataKey="value"
        startAngle={90} endAngle={-270}
      >
        {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
      </Pie>
      <RechartsTooltip
        formatter={(v, n) => [`${v} orders`, n]}
        contentStyle={{
          backgroundColor: '#1a1a2e', border: '1px solid #444',
          borderRadius: 6, fontSize: '0.6rem', color: 'white',
        }}
      />
    </PieChart>
  </ResponsiveContainer>
));

// ── Stat Summary Flip Card (Notification Open) ────────────────────────────────
export const StatSummaryFlipCard = ({ notificationData, onCardClick }) => {
  const [showDonut, setShowDonut] = useState(false);

  // FIX: groupByStat was called inside useMemo but the result (groups) was
  // also used to derive donutData in a separate non-memoised inline map.
  // Now both are derived in a single useMemo pass.
  const { groups, donutData, total } = useMemo(() => {
    const grps = groupByStat(notificationData);
    return {
      groups:    grps,
      donutData: grps.map((g) => ({
        name:  g.txt30 || g.stat,
        value: g.rows.length,
        color: STAT_COLOR[g.stat] || '#90A4AE',
      })),
      total: notificationData.length,
    };
  }, [notificationData]);

  // FIX: toggle handler wrapped in useCallback — stable reference
  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    setShowDonut((d) => !d);
  }, []);

  return (
    <Box sx={{ height: 220, position: 'relative' }}>
      <Card
        elevation={4}
        sx={{
          width: '100%', height: '100%', borderRadius: 3, overflow: 'hidden',
          background: 'linear-gradient(135deg, #18dd32 0%, #f3ae36 100%)',
          display: 'flex', flexDirection: 'column',
          animation: 'zoomIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}
      >
        <CardContent sx={{ p: 0.8, flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', gap: 0 }}>

          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
            <Box display="flex" alignItems="center" gap={0.6}>
              <AssignmentIcon sx={{ fontSize: 16, color: 'rgba(0,0,100,0.8)' }} />
              <Typography sx={{ fontWeight: 800, color: 'white', fontSize: '0.72rem' }}>
                Notification Open
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.4}>
              <Chip
                label={`Total: ${total}`}
                size="small"
                sx={{
                  height: 17, fontSize: '0.58rem', fontWeight: 800,
                  backgroundColor: 'rgba(255,255,255,0.35)', color: 'white',
                  '& .MuiChip-label': { px: 0.7 },
                }}
              />
              <Tooltip title={showDonut ? 'Show list' : 'Show chart'}>
                <IconButton
                  size="small"
                  onClick={handleToggle}
                  sx={{
                    p: 0.2, backgroundColor: 'rgba(255,255,255,0.25)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.4)' }, borderRadius: 1,
                  }}
                >
                  <SwapHorizIcon sx={{ fontSize: 14, color: 'white' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Body: list OR donut */}
          {showDonut ? (
            /* Donut view */
            <Box flex={1} sx={{ minHeight: 0, display: 'flex', gap: 0.5 }}>
              <Box sx={{ width: '55%', height: '100%' }}>
                <MiniDonut data={donutData} />
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.3, justifyContent: 'center' }}>
                {donutData.map((d, i) => (
                  <Box key={i} display="flex" alignItems="center" justifyContent="space-between" sx={{ px: 0.5 }}>
                    <Box display="flex" alignItems="center" gap={0.4}>
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: d.color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.88)', lineHeight: 1.2 }}>
                        {d.name}
                      </Typography>
                    </Box>
                    <Chip
                      label={d.value}
                      size="small"
                      sx={{
                        height: 14, minWidth: 22, fontSize: '0.52rem', fontWeight: 800,
                        backgroundColor: d.color, color: 'white',
                        '& .MuiChip-label': { px: 0.4 },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            /* List view */
            <Box
              flex={1}
              onClick={onCardClick}
              sx={{ overflowY: 'auto', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 0.3 }}
            >
              {groups.length === 0 ? (
                <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center', mt: 2 }}>
                  No data
                </Typography>
              ) : groups.map((g) => (
                <Box
                  key={g.stat}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 1, px: 0.8, py: 0.2 }}
                >
                  <Box display="flex" alignItems="center" gap={0.6}>
                    <Typography sx={{
                      fontFamily: 'monospace', fontSize: '0.58rem', fontWeight: 700,
                      backgroundColor: STAT_BG[g.stat] || '#eee',
                      color: STAT_COLOR[g.stat] || '#333',
                      px: 0.4, borderRadius: 0.4,
                    }}>
                      {g.stat}
                    </Typography>
                    <Typography sx={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      {g.txt30}
                    </Typography>
                  </Box>
                  <Chip
                    label={g.rows.length}
                    size="small"
                    sx={{
                      height: 15, minWidth: 25, fontSize: '0.56rem', fontWeight: 800,
                      backgroundColor: STAT_COLOR[g.stat] || '#555', color: 'white',
                      '& .MuiChip-label': { px: 0.5 },
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}

          <Typography sx={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.4)', textAlign: 'right', mt: 0.3 }}>
            {showDonut ? 'Click list icon to view records' : 'Click list to open detail'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

// ── Approval Overview Card ────────────────────────────────────────────────────
export const ApprovalOverviewCard = ({ approvalRequire, approvedWip, onRequireClick, onWipClick, loading }) => {
  const [mode, setMode] = useState('require');

  const isRequire  = mode === 'require';
  const activeData = isRequire ? approvalRequire : approvedWip;

  // FIX: donutData was derived inline (not memoised) even though it depends only
  // on activeData and mode — both captured by useMemo deps correctly now.
  const { groups, donutData } = useMemo(() => {
    const grps = groupByTxt30(activeData);
    return {
      groups:    grps,
      donutData: grps.map((g, i) => ({
        name:  g.label,
        value: g.rows.length,
        color: isRequire
          ? ['#FF5252', '#FF1744', '#D50000', '#FF6D00', '#FF9100'][i % 5]
          : APPROVAL_PALETTE[i % APPROVAL_PALETTE.length],
      })),
    };
  }, [activeData, isRequire]);

  const bgGrad    = isRequire
    ? 'linear-gradient(135deg, #f577cb 0%, #2cdaae 100%)'
    : 'linear-gradient(135deg, #ebb654 0%, #337436 100%)';
  const accentClr = isRequire ? '#FFCDD2' : '#C8E6C9';
  const statNote  = isRequire
    ? 'Status: E0002 · E0004 · E0006 · E0008'
    : 'Status: E0001 · E0003 · E0005 · E0007 · E0009';
  const title           = isRequire ? 'Approval Require' : 'Approved WIP';
  const handleBodyClick = isRequire ? onRequireClick : onWipClick;

  // FIX: toggle wrapped in useCallback — stable reference prevents child re-renders
  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    setMode((m) => (m === 'require' ? 'wip' : 'require'));
  }, []);

  return (
    <Box sx={{ height: 220, position: 'relative' }}>
      <Card
        elevation={4}
        sx={{
          width: '100%', height: '100%', borderRadius: 3, overflow: 'hidden',
          background: bgGrad, display: 'flex', flexDirection: 'column',
          animation: 'zoomIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
          transition: 'background 0.4s ease',
        }}
      >
        <CardContent sx={{ p: 0.8, flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

          {/* ── Header row ── */}
          <Box
            display="flex" alignItems="center" justifyContent="space-between" mb={0.5}
            sx={{ background: 'rgba(0,0,0,0.22)', borderRadius: 1, px: 0.8, py: 0.35 }}
          >
            <Box display="flex" alignItems="center" gap={0.6}>
              <CheckBoxIcon sx={{ fontSize: 15, color: accentClr }} />
              <Typography sx={{ fontWeight: 800, color: 'white', fontSize: '0.7rem' }}>{title}</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              {loading
                ? <CircularProgress size={12} sx={{ color: 'white' }} />
                : (
                  <Chip
                    label={activeData.length}
                    size="small"
                    sx={{
                      height: 16, minWidth: 28, fontSize: '0.6rem', fontWeight: 800,
                      backgroundColor: 'rgba(255,255,255,0.3)', color: 'white',
                      '& .MuiChip-label': { px: 0.6 },
                    }}
                  />
                )
              }
              <Tooltip title={isRequire ? 'Switch to Approved WIP' : 'Switch to Approval Require'}>
                <IconButton
                  size="small"
                  onClick={handleToggle}
                  sx={{
                    p: 0.25, backgroundColor: 'rgba(204,89,89,0.2)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.35)' }, borderRadius: 1,
                  }}
                >
                  <SwapHorizIcon sx={{ fontSize: 14, color: 'white' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* ── Body: donut LEFT + count list RIGHT ── */}
          <Box
            flex={1}
            onClick={handleBodyClick}
            sx={{ cursor: 'pointer', display: 'flex', gap: 0.5, minHeight: 0 }}
          >
            {/* Left — donut */}
            <Box sx={{ width: '42%', height: '100%', position: 'relative' }}>
              {loading ? (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <CircularProgress size={22} sx={{ color: 'rgba(255,255,255,0.7)' }} />
                </Box>
              ) : donutData.length === 0 ? (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>No data</Typography>
                </Box>
              ) : (
                <>
                  <MiniDonut data={donutData} />
                  {/* Center label */}
                  <Box sx={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center', pointerEvents: 'none',
                  }}>
                    <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
                      {activeData.length}
                    </Typography>
                    <Typography sx={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1, mt: 0.2 }}>
                      total
                    </Typography>
                  </Box>
                </>
              )}
            </Box>

            {/* Right — grouped count list */}
            <Box sx={{
              flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.3,
              justifyContent: groups.length <= 4 ? 'center' : 'flex-start',
            }}>
              {loading ? null : groups.length === 0 ? (
                <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
                  No data
                </Typography>
              ) : groups.map((g, i) => {
                const col = donutData[i]?.color || '#fff';
                return (
                  <Box
                    key={g.label}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 1,
                      px: 0.7, py: 0.25, borderLeft: `3px solid ${col}`,
                    }}
                  >
                    <Typography sx={{
                      fontSize: '0.58rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600,
                      flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', pr: 0.4, lineHeight: 1.3,
                    }}>
                      {g.label}
                    </Typography>
                    <Chip
                      label={g.rows.length}
                      size="small"
                      sx={{
                        height: 16, minWidth: 26, fontSize: '0.58rem', fontWeight: 900,
                        backgroundColor: col, color: 'white', flexShrink: 0,
                        '& .MuiChip-label': { px: 0.5 },
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Footer note */}
          <Typography sx={{ fontSize: '0.70rem', color: 'white', textAlign: 'right', mt: 0.05 }}>
            {statNote}
          </Typography>

        </CardContent>
      </Card>
    </Box>
  );
};