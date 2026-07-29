import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

const FALLBACK_BANNER =
  'https://images.unsplash.com/photo-1507514604110-ba3347c457f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600';

const TOURNAMENT_STATUS_LABELS = {
  DRAFT: 'Nháp',
  PUBLISHED: 'Đã công bố',
  OPEN_REGISTRATION: 'Đang mở đăng ký',
  REGISTRATION_CLOSED: 'Đã đóng đăng ký',
  SCHEDULED: 'Đã lên lịch',
  ONGOING: 'Đang diễn ra',
  RESULT_CONFIRMED: 'Đã có kết quả',
  COMPLETED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
};

const RACE_STATUS_LABELS = {
  ...TOURNAMENT_STATUS_LABELS,
  SCHEDULED: 'Sắp diễn ra',
  RESULT_CONFIRMED: 'Đã kết thúc',
};

const REGISTRATION_STATUS_LABELS = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  ONGOING: 'Đang chạy',
  COMPLETED: 'Hoàn thành',
  REJECTED: 'Từ chối',
  WITHDRAWN: 'Đã rút',
  CANCELLED: 'Đã hủy',
};

const STATUS_LABEL_TO_CODE = {
  'Chờ duyệt': 'PENDING',
  'Đã duyệt': 'APPROVED',
  'Đang chạy': 'ONGOING',
  'Đang diễn ra': 'ONGOING',
  'Hoàn thành': 'COMPLETED',
  'Từ chối': 'REJECTED',
  'Đã rút': 'WITHDRAWN',
  'Đã hủy': 'CANCELLED',
};

function normalizeRegistrationStatus(status) {
  if (!status) return 'PENDING';
  const value = String(status).trim();
  if (REGISTRATION_STATUS_LABELS[value]) return value;
  return STATUS_LABEL_TO_CODE[value] || value.toUpperCase();
}

function normalizeStatusCode(status) {
  if (!status) return '';
  return String(status).trim().toUpperCase();
}

function tournamentStatusLabel(status) {
  const code = normalizeStatusCode(status);
  return TOURNAMENT_STATUS_LABELS[code] || status || 'Nháp';
}

function raceStatusLabel(status) {
  const code = normalizeStatusCode(status);
  return RACE_STATUS_LABELS[code] || status || 'Chưa cập nhật';
}

function toDateLabel(value) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function mapRegistration(item) {
  if (!item) return null;
  const statusCode = normalizeRegistrationStatus(item.statusCode || item.status || item.approval);
  const status = REGISTRATION_STATUS_LABELS[statusCode] || statusCode;

  return {
    id: String(item.id || item._id || ''),
    tournamentId: item.tournamentId || '',
    tournamentName: item.tournamentName || '',
    tournamentStatus: item.tournamentStatus || '',
    raceId: item.raceId || '',
    raceName: item.raceName || '',
    raceNumber: item.raceNumber || '',
    raceStatus: item.raceStatus || '',
    raceDate: item.raceDate || '',
    raceTime: item.raceTime || '',
    location: item.location || '',
    horseId: item.horseId || '',
    horseName: item.horseName || item.horse || '',
    ownerName: item.ownerName || item.fullName || '',
    jockeyId: item.jockeyId || '',
    jockeyName: item.jockeyName || item.jockey || '',
    statusCode,
    status,
    notes: item.notes || '',
    reviewNote: item.reviewNote || '',
    withdrawNote: item.withdrawNote || '',
    registeredAt: item.registeredAt || '',
    horseHealth: item.horseHealth || '',
    horseWins: Number(item.horseWins || 0),
    horseRaces: Number(item.horseRaces || 0),
    horseImageUrl: item.horseImageUrl || '',
  };
}

function mapRace(race) {
  if (!race) return null;
  const statusCode = normalizeStatusCode(race.statusCode || race.status);

  return {
    id: String(race.id || race._id || race.raceId || ''),
    raceNumber: race.raceNumber || '',
    name: race.name || race.raceName || 'Race',
    status: race.statusLabel || raceStatusLabel(statusCode || race.status),
    statusCode,
    scheduledStartAt: race.scheduledStartAt || race.scheduledAt || race.startAt || '',
    entryFee: Number(race.entryFee || 0),
    minHorses: Number(race.minHorses || race.minParticipants || 0),
    maxHorses: Number(race.maxHorses || race.maxParticipants || 0),
  };
}

export function mapTournament(tournament) {
  if (!tournament) return null;
  const statusCode = normalizeStatusCode(tournament.statusCode || tournament.status);
  const races = Array.isArray(tournament.races) ? tournament.races : [];
  const registrations = Array.isArray(tournament.registrations)
    ? tournament.registrations
    : [];

  return {
    id: String(tournament.id || tournament._id),
    name: tournament.name || '',
    status: tournamentStatusLabel(statusCode || tournament.status),
    statusCode,
    location: tournament.location || 'Chưa cập nhật',
    banner: tournament.banner || FALLBACK_BANNER,
    startDate: tournament.startDate,
    dateLabel: toDateLabel(tournament.startDate),
    prize: tournament.config?.prize || tournament.prize || 'Chưa cập nhật',
    raceCount: tournament.raceCount ?? races.length,
    races: races.map(mapRace).filter(Boolean),
    registrationCount: tournament.registrationCount ?? registrations.length,
    pendingCount: registrations.filter((item) => normalizeRegistrationStatus(item.statusCode || item.status) === 'PENDING').length,
    openRaceCount: tournament.openRaceCount ?? 0,
  };
}

export const tournamentService = {
  async list(params = {}) {
    const list = await apiRequest(ENDPOINTS.tournaments.list, { params });
    return (Array.isArray(list) ? list : []).map(mapTournament).filter(Boolean);
  },

  async listOwnerOpen() {
    const list = await apiRequest(ENDPOINTS.tournaments.ownerOpen);
    return (Array.isArray(list) ? list : []).map(mapTournament).filter(Boolean);
  },

  async listOwnerRegistrations() {
    const list = await apiRequest(ENDPOINTS.tournaments.ownerRegistrations);
    return (Array.isArray(list) ? list : []).map(mapRegistration).filter(Boolean);
  },

  async listJockeyRegistrations() {
    const list = await apiRequest(ENDPOINTS.tournaments.jockeyRegistrations);
    return (Array.isArray(list) ? list : []).map(mapRegistration).filter(Boolean);
  },
};
