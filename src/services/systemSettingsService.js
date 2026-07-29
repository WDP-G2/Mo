import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

const DEFAULT_VIOLATION_TYPES = [
  { id: 'FALSE_START', label: 'Xuất phát sai' },
  { id: 'DANGEROUS_RIDING', label: 'Lái nguy hiểm' },
  { id: 'EQUIPMENT_VIOLATION', label: 'Vi phạm trang bị' },
  { id: 'DOPING_SUSPECTED', label: 'Nghi doping' },
  { id: 'LATE_CHECK_IN', label: 'Check-in muộn' },
  { id: 'OTHER', label: 'Khác' },
];

const SEVERITY_LABELS = {
  WARNING: 'Cảnh cáo',
  MINOR: 'Phạt nhẹ',
  MAJOR: 'Phạt nặng',
  DISQUALIFICATION: 'Loại',
};

const DEFAULT_SEVERITIES = [
  { id: 'WARNING', label: 'Cảnh cáo' },
  { id: 'MINOR', label: 'Phạt nhẹ' },
  { id: 'MAJOR', label: 'Phạt nặng' },
  { id: 'DISQUALIFICATION', label: 'Loại' },
];

function mapViolationType(item, index) {
  if (!item) return null;
  const label = String(item.label || '').trim();
  if (!label || item.active === false) return null;
  return {
    id: item.code || `type-${index}`,
    label,
  };
}

function mapViolationSeverity(item, index) {
  if (!item) return null;
  const code = String(item.severity || '').trim().toUpperCase();
  const label = SEVERITY_LABELS[code] || String(item.label || item.severity || '').trim();
  if (!label) return null;
  return {
    id: code || `severity-${index}`,
    label,
    resultAction: item.resultAction || 'NONE',
    timePenaltyMillis: Number(item.timePenaltyMillis || 0),
  };
}

export const systemSettingsService = {
  async listViolationTypes() {
    try {
      const rows = await apiRequest(ENDPOINTS.systemSettings.violationTypes);
      const mapped = (Array.isArray(rows) ? rows : []).map(mapViolationType).filter(Boolean);
      return mapped.length ? mapped : DEFAULT_VIOLATION_TYPES;
    } catch {
      return DEFAULT_VIOLATION_TYPES;
    }
  },

  async listViolationSeverities() {
    try {
      const rows = await apiRequest(ENDPOINTS.systemSettings.violationRules);
      const mapped = (Array.isArray(rows) ? rows : []).map(mapViolationSeverity).filter(Boolean);
      return mapped.length ? mapped : DEFAULT_SEVERITIES;
    } catch {
      return DEFAULT_SEVERITIES;
    }
  },
};
