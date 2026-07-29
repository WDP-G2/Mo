import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { mapHorse } from './horseService';

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

function mapRegistration(item) {
  if (!item) return null;
  const statusCode = normalizeRegistrationStatus(item.statusCode || item.status || item.approval);
  const status = REGISTRATION_STATUS_LABELS[statusCode] || statusCode;

  return {
    id: String(item.id || item._id || ''),
    raceId: item.raceId || '',
    raceName: item.raceName || item.race || 'Cuộc đua',
    tournamentId: item.tournamentId || '',
    tournamentName: item.tournamentName || item.tournament || 'Giải đấu',
    horseId: item.horseId || '',
    horseName: item.horseName || item.horse || '',
    jockeyId: item.jockeyId || '',
    jockeyName: item.jockeyName || item.jockey || '',
    statusCode,
    status,
    reviewNote: item.reviewNote || '',
    withdrawNote: item.withdrawNote || '',
    createdAt: item.createdAt || item.registeredAt || '',
    canWithdraw: statusCode === 'PENDING',
  };
}

function mapInvitation(item) {
  if (!item) return null;

  return {
    id: String(item.id || item._id || ''),
    jockeyId: item.jockeyId || '',
    jockeyName: item.jockeyName || item.jockey || '',
    horseId: item.horseId || '',
    horseName: item.horseName || item.horse || '',
    raceId: item.raceId || '',
    raceLabel: item.raceLabel || item.raceName || '',
    tournamentName: item.tournamentName || item.tournament || '',
    raceDate: item.raceDate || '',
    raceTime: item.raceTime || '',
    location: item.location || '',
    reward: Number(item.reward || item.remunerationAmount || 0),
    status: item.status || 'Chờ xử lý',
    sentAt: item.sentAt || item.createdAt || '',
  };
}

export const ownerService = {
  getProfile() {
    return apiRequest(ENDPOINTS.owner.profile);
  },

  getResults() {
    return apiRequest(ENDPOINTS.owner.results);
  },

  async getDashboard() {
    const dashboard = await apiRequest(ENDPOINTS.owner.dashboard);
    return {
      horseCount: Number(dashboard?.horseCount || 0),
      registrationCount: Number(dashboard?.registrationCount || 0),
    };
  },

  async listHorses() {
    const horses = await apiRequest(ENDPOINTS.owner.horses);
    return (Array.isArray(horses) ? horses : []).map(mapHorse).filter(Boolean);
  },

  async listRaceRegistrations() {
    const registrations = await apiRequest(ENDPOINTS.owner.raceRegistrations);
    return (Array.isArray(registrations) ? registrations : [])
      .map(mapRegistration)
      .filter(Boolean);
  },

  async withdrawRegistration(id) {
    const registration = await apiRequest(ENDPOINTS.owner.withdrawRegistration(id), {
      method: 'PUT',
    });
    return mapRegistration(registration);
  },

  listAcceptedRacesForJockey(id) {
    return apiRequest(ENDPOINTS.owner.acceptedRacesForJockey(id));
  },

  async listJockeyInvitations() {
    const invitations = await apiRequest(ENDPOINTS.owner.jockeyInvitations);
    return (Array.isArray(invitations) ? invitations : []).map(mapInvitation).filter(Boolean);
  },

  async cancelJockeyInvitation(id) {
    const invitation = await apiRequest(ENDPOINTS.owner.cancelJockeyInvitation(id), {
      method: 'PUT',
    });
    return mapInvitation(invitation);
  },

  async createJockeyInvitation(payload) {
    const idempotencyKey = payload.idempotencyKey || `invite-${Date.now()}`;
    const invitation = await apiRequest(ENDPOINTS.owner.createJockeyInvitation, {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: {
        horseId: payload.horseId,
        raceId: payload.raceId,
        tournamentId: payload.tournamentId,
        jockeyId: payload.jockeyId,
        message: payload.message || '',
        remunerationAmount: Number(payload.remunerationAmount || 0),
        reward: Number(payload.remunerationAmount || 0),
        idempotencyKey,
      },
    });
    return mapInvitation(invitation);
  },

  async createRegistration(payload) {
    const registration = await apiRequest(ENDPOINTS.races.register(payload.raceId), {
      method: 'POST',
      body: {
        horseId: payload.horseId,
        jockeyInvitationId: payload.jockeyInvitationId,
        note: payload.note || '',
      },
    });
    return mapRegistration(registration);
  },
};
