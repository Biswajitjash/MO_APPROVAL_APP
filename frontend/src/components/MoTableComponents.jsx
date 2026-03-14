// ============================================================================
// MoTableComponents.jsx  — GroupedNotificationTable, GroupedMoOrderTable
// ============================================================================
import React, { useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  NOTIF_COLUMNS, MO_COLUMNS, APPROVAL_PALETTE,
  STAT_BG, STAT_COLOR, STAT_HEADER_BG,
  QMART_BG, QMART_COLOR, AUART_MAP,
  cellStyle, groupByStat, groupByTxt30,
} from '../constants/MoConstants';

// ── Grouped Notification Table ────────────────────────────────────────────────
export const GroupedNotificationTable = ({ data, isMobile }) => {
  // FIX: groupByStat called on every render without memoisation.
  // Wrapped in useMemo so groups are only recomputed when data changes.
  const groups = useMemo(() => groupByStat(data), [data]);

  const [collapsed, setCollapsed] = useState({});

  // FIX: toggle was an inline function — recreated on every render.
  // Wrapped in useCallback with stable reference.
  const toggle = useCallback((stat) => {
    setCollapsed((prev) => ({ ...prev, [stat]: !prev[stat] }));
  }, []);

  return (
    <TableContainer sx={{ maxHeight: isMobile ? '75vh' : '62vh' }}>
      <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            {NOTIF_COLUMNS.map((col) => (
              <TableCell
                key={col.label}
                sx={{
                  width: col.width,
                  backgroundColor: '#1565C0', color: 'white',
                  fontWeight: 700, fontSize: '0.65rem',
                  py: 0.5, px: 0.8,
                  whiteSpace: 'nowrap',
                  borderBottom: '2px solid #0D47A1',
                }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#999', fontSize: '0.75rem' }}>
                No records found
              </TableCell>
            </TableRow>
          ) : groups.map((group) => {
            const isCollapsed = !!collapsed[group.stat];
            const hdrBg    = STAT_HEADER_BG[group.stat] || '#E0E0E0';
            const hdrColor = STAT_COLOR[group.stat]      || '#333';

            return (
              <React.Fragment key={group.stat}>

                {/* Group header row */}
                <TableRow
                  onClick={() => toggle(group.stat)}
                  sx={{ backgroundColor: hdrBg, cursor: 'pointer', '&:hover': { filter: 'brightness(0.96)' } }}
                >
                  <TableCell
                    colSpan={6}
                    sx={{ py: 0.5, px: 0.8, borderBottom: `2px solid ${hdrColor}40`, borderTop: '2px solid #ddd' }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <IconButton size="small" sx={{ p: 0 }}>
                        {isCollapsed
                          ? <ExpandMoreIcon sx={{ fontSize: 16, color: hdrColor }} />
                          : <ExpandLessIcon sx={{ fontSize: 16, color: hdrColor }} />}
                      </IconButton>
                      <Typography variant="caption" sx={{
                        fontFamily: 'monospace', fontSize: '0.65rem', fontWeight: 700,
                        backgroundColor: STAT_BG[group.stat] || '#eee',
                        color: hdrColor, px: 0.7, py: 0.2, borderRadius: 0.5,
                      }}>
                        {group.stat}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color: hdrColor }}>
                        {group.txt30}{group.txt04 ? ` (${group.txt04})` : ''}
                      </Typography>
                      <Chip
                        label={`${group.rows.length} record${group.rows.length !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{
                          ml: 'auto', height: 18, fontSize: '0.6rem', fontWeight: 700,
                          backgroundColor: hdrColor, color: 'white',
                          '& .MuiChip-label': { px: 0.8 },
                        }}
                      />
                    </Box>
                  </TableCell>
                </TableRow>

                {/* Data rows */}
                {!isCollapsed && group.rows.map((item, idx) => (
                  <TableRow
                    // FIX: key was `${item.qmnum}-${item.stat}-${idx}` — qmnum is
                    // already unique per notification; stat is redundant in the key.
                    // Simplified to `${item.qmnum}-${idx}` to avoid accidental collisions
                    // while still being safe when qmnum could theoretically repeat.
                    key={`${item.qmnum}-${idx}`}
                    hover
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: '#f5f8ff' },
                      '&:hover': { backgroundColor: '#dce8ff !important' },
                    }}
                  >
                    <TableCell sx={{ ...cellStyle, fontWeight: 700, color: '#1565C0' }}>
                      {item.qmnum}
                    </TableCell>
                    <TableCell sx={cellStyle}>
                      <Chip
                        label={item.qmart}
                        size="small"
                        sx={{
                          fontSize: '0.55rem', height: 16, fontWeight: 600,
                          backgroundColor: QMART_BG[item.qmart] || '#F5F5F5',
                          color: QMART_COLOR[item.qmart] || '#333',
                          '& .MuiChip-label': { px: 0.5 },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={cellStyle}>{item.qmdat || '—'}</TableCell>
                    <TableCell title={item.qmtxt} sx={{ ...cellStyle, maxWidth: 0 }}>
                      {item.qmtxt || '—'}
                    </TableCell>
                    <TableCell sx={cellStyle}>
                      <Chip
                        label={item.txt30}
                        size="small"
                        sx={{
                          fontSize: '0.55rem', height: 16, fontWeight: 600,
                          backgroundColor: STAT_BG[item.stat] || '#F5F5F5',
                          color: STAT_COLOR[item.stat] || '#333',
                          '& .MuiChip-label': { px: 0.5 },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={cellStyle}>
                      <Typography variant="caption" sx={{
                        fontFamily: 'monospace', fontSize: '0.6rem',
                        backgroundColor: '#f5f5f5', px: 0.5, py: 0.2,
                        borderRadius: 0.5, color: '#555',
                      }}>
                        {item.stat}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Subtotal row */}
                {!isCollapsed && (
                  <TableRow sx={{ backgroundColor: `${hdrBg}99` }}>
                    <TableCell
                      colSpan={6}
                      sx={{
                        py: 0.4, px: 0.8, fontSize: '0.6rem', fontWeight: 700,
                        color: hdrColor, borderBottom: `2px solid ${hdrColor}50`, fontStyle: 'italic',
                      }}
                    >
                      Subtotal — {group.stat} ({group.txt30}): {group.rows.length} record{group.rows.length !== 1 ? 's' : ''}
                    </TableCell>
                  </TableRow>
                )}

              </React.Fragment>
            );
          })}

          {/* Grand total sticky footer */}
          {data.length > 0 && (
            <TableRow sx={{ backgroundColor: '#1565C0', position: 'sticky', bottom: 0 }}>
              <TableCell
                colSpan={6}
                sx={{ py: 0.6, px: 0.8, fontSize: '0.68rem', fontWeight: 800, color: 'white', borderTop: '2px solid #0D47A1' }}
              >
                Grand Total — {groups.length} group{groups.length !== 1 ? 's' : ''}&nbsp;|&nbsp;{data.length} record{data.length !== 1 ? 's' : ''}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// ── Grouped MO Order Table ────────────────────────────────────────────────────
export const GroupedMoOrderTable = ({ data }) => {
  // FIX: same as GroupedNotificationTable — memoised grouping
  const groups = useMemo(() => groupByTxt30(data), [data]);

  const [collapsed, setCollapsed] = useState({});

  const toggle = useCallback((lbl) => {
    setCollapsed((prev) => ({ ...prev, [lbl]: !prev[lbl] }));
  }, []);

  return (
    <TableContainer sx={{ maxHeight: '62vh', overflowX: 'auto' }}>
      <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', minWidth: 1200 }}>
        <TableHead>
          <TableRow>
            {MO_COLUMNS.map((col) => (
              <TableCell
                key={col.label}
                sx={{
                  width: col.width,
                  backgroundColor: '#37474F', color: 'white',
                  fontWeight: 700, fontSize: '0.65rem',
                  py: 0.5, px: 0.8,
                  whiteSpace: 'nowrap',
                  borderBottom: '2px solid #263238',
                }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={14} align="center" sx={{ py: 4, color: '#999', fontSize: '0.75rem' }}>
                No records found
              </TableCell>
            </TableRow>
          ) : groups.map((group, gi) => {
            const isCollapsed = !!collapsed[group.label];
            const color = APPROVAL_PALETTE[gi % APPROVAL_PALETTE.length];

            return (
              <React.Fragment key={group.label}>

                {/* Group header row */}
                <TableRow
                  onClick={() => toggle(group.label)}
                  sx={{ backgroundColor: `${color}18`, cursor: 'pointer', '&:hover': { filter: 'brightness(0.96)' } }}
                >
                  <TableCell
                    colSpan={14}
                    sx={{ py: 0.5, px: 0.8, borderBottom: `2px solid ${color}40`, borderTop: '2px solid #ddd' }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <IconButton size="small" sx={{ p: 0 }}>
                        {isCollapsed
                          ? <ExpandMoreIcon sx={{ fontSize: 16, color }} />
                          : <ExpandLessIcon sx={{ fontSize: 16, color }} />}
                      </IconButton>
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color }}>
                        {group.label}
                      </Typography>
                      <Chip
                        label={`${group.rows.length} record${group.rows.length !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{
                          ml: 'auto', height: 18, fontSize: '0.6rem', fontWeight: 700,
                          backgroundColor: color, color: 'white',
                          '& .MuiChip-label': { px: 0.8 },
                        }}
                      />
                    </Box>
                  </TableCell>
                </TableRow>

                {/* Data rows */}
                {!isCollapsed && group.rows.map((item, idx) => {
                  const auartColor = AUART_MAP[item.Auart]?.color || '#607D8B';
                  const auartLabel = AUART_MAP[item.Auart]?.label || item.Auart;
                  return (
                    <TableRow
                      key={`${item.Aufnr}-${idx}`}
                      hover
                      sx={{
                        '&:nth-of-type(odd)': { backgroundColor: '#f5f8ff' },
                        '&:hover': { backgroundColor: '#dce8ff !important' },
                      }}
                    >
                      <TableCell sx={{ ...cellStyle, fontWeight: 700, color: '#37474F', fontFamily: 'monospace' }}>
                        {item.Aufnr || '—'}
                      </TableCell>
                      <TableCell sx={cellStyle}>
                        <Tooltip title={`${item.Auart}: ${auartLabel}`} arrow>
                          <Chip
                            label={item.Auart}
                            size="small"
                            sx={{
                              fontSize: '0.52rem', height: 16, fontWeight: 700,
                              backgroundColor: `${auartColor}22`, color: auartColor,
                              border: `1px solid ${auartColor}55`,
                              '& .MuiChip-label': { px: 0.5 },
                            }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ ...cellStyle, color: '#555' }}>{item.Erdat || '—'}</TableCell>
                      <TableCell title={item.Ktext} sx={{ ...cellStyle, maxWidth: 0 }}>
                        {item.Ktext || '—'}
                      </TableCell>
                      <TableCell sx={cellStyle}>
                        <Typography variant="caption" sx={{
                          fontFamily: 'monospace', fontSize: '0.58rem',
                          backgroundColor: '#EEF2FF', color: '#3730A3',
                          px: 0.5, py: 0.15, borderRadius: 0.5, fontWeight: 700,
                        }}>
                          {item.Stat || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={cellStyle}>
                        <Chip
                          label={item.Txt04 || '—'}
                          size="small"
                          sx={{
                            fontSize: '0.52rem', height: 16, fontWeight: 600,
                            backgroundColor: '#FFF8E1', color: '#F57F17',
                            '& .MuiChip-label': { px: 0.5 },
                          }}
                        />
                      </TableCell>
                      <TableCell title={item.Txt30} sx={{ ...cellStyle, maxWidth: 0, fontWeight: 600, color: '#37474F' }}>
                        {item.Txt30 || '—'}
                      </TableCell>
                      <TableCell sx={{ ...cellStyle, color: '#888', fontFamily: 'monospace' }}>
                        {item.Bukrs || '—'}
                      </TableCell>
                      <TableCell sx={{ ...cellStyle, color: '#888', fontFamily: 'monospace' }}>
                        {item.Werks || '—'}
                      </TableCell>
                      <TableCell sx={{ ...cellStyle, color: '#1565C0', fontWeight: 600 }}>
                        {item.Vaplz || '—'}
                      </TableCell>
                      <TableCell sx={{ ...cellStyle, color: '#555' }}>{item.Ernam || '—'}</TableCell>
                      <TableCell sx={{ ...cellStyle, color: '#555' }}>{item.Aenam || '—'}</TableCell>
                      <TableCell sx={{ ...cellStyle, fontFamily: 'monospace', color: '#888' }}>
                        {item.Kostv || '—'}
                      </TableCell>
                      <TableCell sx={{ ...cellStyle, fontFamily: 'monospace', color: '#888' }}>
                        {item.Prctr || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Subtotal row */}
                {!isCollapsed && (
                  <TableRow sx={{ backgroundColor: `${color}10` }}>
                    <TableCell
                      colSpan={14}
                      sx={{
                        py: 0.4, px: 0.8, fontSize: '0.6rem', fontWeight: 700,
                        color, borderBottom: `2px solid ${color}40`, fontStyle: 'italic',
                      }}
                    >
                      Subtotal — {group.label}: {group.rows.length} record{group.rows.length !== 1 ? 's' : ''}
                    </TableCell>
                  </TableRow>
                )}

              </React.Fragment>
            );
          })}

          {/* Grand total sticky footer */}
          {data.length > 0 && (
            <TableRow sx={{ backgroundColor: '#37474F', position: 'sticky', bottom: 0 }}>
              <TableCell
                colSpan={14}
                sx={{ py: 0.6, px: 0.8, fontSize: '0.68rem', fontWeight: 800, color: 'white', borderTop: '2px solid #263238' }}
              >
                Grand Total — {groups.length} group{groups.length !== 1 ? 's' : ''}&nbsp;|&nbsp;{data.length} record{data.length !== 1 ? 's' : ''}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// ── Mobile MO Card (for modal on small screens) ───────────────────────────────
// FIX: Wrapped in React.memo — item and index props are stable per list render;
// unnecessary re-renders were occurring when parent modal state changed.
export const MoMobileCard = React.memo(({ item, index }) => {
  const auartColor = AUART_MAP[item.Auart]?.color || '#607D8B';
  const auartLabel = AUART_MAP[item.Auart]?.label || item.Auart;

  return (
    <Box sx={{
      border: '1px solid #e8e8e8', borderRadius: 2, p: 1.2, mb: 1,
      background: index % 2 === 0 ? '#f9fbff' : '#fff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
        <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.78rem', color: '#1a237e' }}>
          {item.Aufnr}
        </Typography>
        <Tooltip title={`${item.Auart}: ${auartLabel}`} arrow>
          <Chip
            label={item.Auart}
            size="small"
            sx={{
              height: 18, fontSize: '0.6rem', fontWeight: 700,
              backgroundColor: `${auartColor}22`, color: auartColor,
              border: `1px solid ${auartColor}55`,
              '& .MuiChip-label': { px: 0.6 },
            }}
          />
        </Tooltip>
      </Box>

      <Typography sx={{ fontSize: '0.75rem', color: '#333', fontWeight: 500, mb: 0.4 }} title={item.Ktext}>
        {item.Ktext || '—'}
      </Typography>

      <Box display="flex" alignItems="center" gap={0.6} mb={0.4}>
        <Chip
          label={item.Txt30 || '—'}
          size="small"
          sx={{
            height: 18, fontSize: '0.58rem', fontWeight: 600,
            backgroundColor: '#EDE7F6', color: '#4527A0',
            '& .MuiChip-label': { px: 0.6 },
          }}
        />
        <Typography sx={{
          fontFamily: 'monospace', fontSize: '0.58rem',
          backgroundColor: '#F3F4F6', color: '#374151',
          px: 0.5, py: 0.1, borderRadius: 0.5, fontWeight: 600,
        }}>
          {item.Stat}
        </Typography>
      </Box>

      <Box display="flex" gap={1.5} flexWrap="wrap">
        <Typography sx={{ fontSize: '0.62rem', color: '#555' }}>📅 {item.Erdat || '—'}</Typography>
        <Typography sx={{ fontSize: '0.62rem', color: '#555' }}>🏭 {item.Werks || '—'}</Typography>
        <Typography sx={{ fontSize: '0.62rem', color: '#555' }}>🔧 {item.Vaplz || '—'}</Typography>
      </Box>
    </Box>
  );
});