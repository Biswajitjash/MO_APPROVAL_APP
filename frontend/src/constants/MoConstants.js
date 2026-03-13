// ============================================================================
// moConstants.js  — shared data configs, style maps, column defs, helpers
// ============================================================================

// ── Static chart data ─────────────────────────────────────────────────────────
export const MACHINE_FAULT_TRENDS = [
  { time: '00:00', faults: 45 }, { time: '02:00', faults: 52 },
  { time: '04:00', faults: 48 }, { time: '06:00', faults: 65 },
  { time: '08:00', faults: 72 }, { time: '10:00', faults: 68 },
  { time: '12:00', faults: 78 }, { time: '14:00', faults: 85 },
  { time: '16:00', faults: 82 }, { time: '18:00', faults: 90 },
  { time: '20:00', faults: 88 }, { time: '22:00', faults: 95 },
];

export const TOTAL_FAULTS_REPORTED = [
  { equipment: 'ATM_STRIPPER-3_A',    faults: 42 },
  { equipment: 'ATM_STRIPPER-3_B',    faults: 32 },
  { equipment: 'BACK_ENA_CUTTER-LV1', faults: 22 },
  { equipment: 'BACK_ENA_CUTTER-LV2', faults: 12 },
];

// ── Approval stat buckets ─────────────────────────────────────────────────────
export const APPROVAL_REQUIRE_STATS = ['E0002', 'E0004', 'E0006', 'E0008'];
export const APPROVED_WIP_STATS     = ['E0001', 'E0003', 'E0005', 'E0007', 'E0009'];

// ── Auart config ──────────────────────────────────────────────────────────────
export const AUART_CONFIG = [
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
export const AUART_MAP = Object.fromEntries(AUART_CONFIG.map(a => [a.auart, a]));

// ── Notification stat style maps ──────────────────────────────────────────────
export const STAT_BG = {
  I0071: '#E8F5E9', I0159: '#E3F2FD',
  I0072: '#F3E5F5', I0076: '#FFF3E0',
  I0068: '#FFF8E1', I0070: '#E0F7FA',
};
export const STAT_COLOR = {
  I0071: '#2E7D32', I0159: '#1565C0',
  I0072: '#6A1B9A', I0076: '#E65100',
  I0068: '#F57F17', I0070: '#00838F',
};
export const STAT_HEADER_BG = {
  I0071: '#C8E6C9', I0159: '#BBDEFB',
  I0072: '#E1BEE7', I0076: '#FFE0B2',
  I0068: '#FFF9C4', I0070: '#B2EBF2',
};
export const QMART_BG    = { M1: '#E8F5E9', M2: '#E3F2FD', AC: '#FCE4EC', Y2: '#F3E5F5', AM: '#FFF8E1' };
export const QMART_COLOR = { M1: '#2E7D32', M2: '#1565C0', AC: '#C62828', Y2: '#6A1B9A', AM: '#E65100' };

// ── Approval palette ──────────────────────────────────────────────────────────
export const APPROVAL_PALETTE = [
  '#2196F3','#4CAF50','#FF9800','#9C27B0','#F44336',
  '#00BCD4','#3F51B5','#E91E63','#795548','#607D8B',
  '#8BC34A','#FF5722','#FFC107','#AA00FF','#00BFA5',
];

// ── Shared cell style ─────────────────────────────────────────────────────────
export const cellStyle = {
  fontSize: '0.65rem', py: 0.3, px: 0.8,
  whiteSpace: 'nowrap', overflow: 'hidden',
  textOverflow: 'ellipsis', borderBottom: '1px solid #e8e8e8',
};

// ── Table column definitions ──────────────────────────────────────────────────
export const NOTIF_COLUMNS = [
  { label: 'Notif No',    width: '14%' },
  { label: 'Type',        width: '8%'  },
  { label: 'Date',        width: '12%' },
  { label: 'Description', width: '34%' },
  { label: 'Status',      width: '18%' },
  { label: 'Stat',        width: '14%' },
];

export const MO_COLUMNS = [
  { label: 'Order No',    width: '9%'  },
  { label: 'Type',        width: '5%'  },
  { label: 'Created',     width: '8%'  },
  { label: 'Description', width: '16%' },
  { label: 'Stat',        width: '5%'  },
  { label: 'Txt04',       width: '5%'  },
  { label: 'Txt30',       width: '11%' },
  { label: 'Company',     width: '5%'  },
  { label: 'Plant',       width: '5%'  },
  { label: 'Work Ctr',    width: '8%'  },
  { label: 'Created By',  width: '8%'  },
  { label: 'Changed By',  width: '8%'  },
  { label: 'Cost Ctr',    width: '10%' },
  { label: 'Profit Ctr',  width: '7%'  },
];

// ── Helper functions ──────────────────────────────────────────────────────────
export const groupByStat = (data) => {
  const map = {};
  data.forEach((item) => {
    const key = item.stat || 'UNKNOWN';
    if (!map[key]) map[key] = { stat: key, txt04: item.txt04 || '', txt30: item.txt30 || key, rows: [] };
    map[key].rows.push(item);
  });
  return Object.values(map).sort((a, b) => a.stat.localeCompare(b.stat));
};

export const groupByTxt30 = (data) => {
  const map = {};
  data.forEach((item) => {
    const key = item.Txt30 || 'UNKNOWN';
    if (!map[key]) map[key] = { label: key, rows: [] };
    map[key].rows.push(item);
  });
  return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
};

export const parseSapDate = (sapDate) => {
  if (!sapDate) return null;
  try {
    return new Date(parseInt(sapDate.replace('/Date(', '').replace(')/', ''))).toISOString().split('T')[0];
  } catch { return null; }
};