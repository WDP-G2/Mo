import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { normalizeInvitationStatus } from '../utils/ownerFlow.mjs';
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
    raceNumber: item.raceNumber ?? null,
    raceScheduledAt: item.raceScheduledAt || item.scheduledAt || '',
    tournamentId: item.tournamentId || '',
    tournamentName: item.tournamentName || item.tournament || 'Giải đấu',
    tournamentStartDate: item.tournamentStartDate || '',
    horseId: item.horseId || '',
    horseName: item.horseName || item.horse || '',
    jockeyId: item.jockeyId || '',
    jockeyName: item.jockeyName || item.jockey || '',
    jockeyInvitationId: item.jockeyInvitationId || '',
    statusCode,
    status,
    checkInStatus: item.checkInStatus || 'PENDING',
    entryFeeAmount: Number(item.entryFeeAmount || 0),
    depositAmount: Number(item.depositAmount || 0),
    paymentStatus: item.paymentStatus || 'UNCHARGED',
    depositStatus: item.depositStatus || 'NONE',
    ownerNote: item.ownerNote || item.notes || '',
    reviewNote: item.reviewNote || '',
    withdrawNote: item.withdrawNote || '',
    createdAt: item.createdAt || item.registeredAt || '',
    updatedAt: item.updatedAt || '',
    canWithdraw: statusCode === 'PENDING',
  };
}

function mapInvitation(item) {
  if (!item) return null;
  const statusCode = normalizeInvitationStatus(item.statusCode || item.status);

  return {
    id: String(item.id || item._id || ''),
    jockeyId: item.jockeyId || '',
    jockeyName: item.jockeyUsername || item.jockeyName || item.jockey || '',
    horseId: item.horseId || '',
    horseName: item.horseName || item.horse || '',
    raceId: item.raceId || '',
    raceLabel: item.raceLabel || item.raceName || '',
    raceScheduledStartAt: item.raceScheduledStartAt || item.scheduledStartAt || '',
    raceScheduledEndAt: item.raceScheduledEndAt || item.scheduledEndAt || '',
    tournamentId: item.tournamentId || '',
    tournamentName: item.tournamentName || item.tournament || '',
    raceDate: item.raceDate || '',
    raceTime: item.raceTime || '',
    location: item.location || '',
    reward: Number(item.reward || item.remunerationAmount || 0),
    statusCode,
    status: item.status || 'PENDING',
    message: item.message || '',
    responseNote: item.responseNote || '',
    sentAt: item.sentAt || item.createdAt || '',
    updatedAt: item.updatedAt || '',
    respondedAt: item.respondedAt || '',
    cancelledAt: item.cancelledAt || '',
  };
}

export const ownerService = {
  getProfile() {
    return apiRequest(ENDPOINTS.owner.profile);
  },

  updateProfile(payload) {
    return apiRequest(ENDPOINTS.owner.profile, {
      method: 'PUT',
      body: {
        stableName: payload.stableName,
        address: payload.address,
        experienceYears: payload.experienceYears,
        bio: payload.bio,
        phone: payload.phone,
      },
    });
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
