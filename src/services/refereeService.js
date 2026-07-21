import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

const RACE_STATUS_CODES = {
  'Sắp chạy': 'SCHEDULED',
  'Sắp diễn ra': 'SCHEDULED',
  'Đã lên lịch': 'SCHEDULED',
  'Đang chạy': 'ONGOING',
  'Đang diễn ra': 'ONGOING',
  'Hoàn thành': 'RESULT_CONFIRMED',
  'Đã chốt kết quả': 'RESULT_CONFIRMED',
  'Đã hủy': 'CANCELLED',
};

const TOURNAMENT_STATUS_CODES = {
  'Đang diễn ra': 'ONGOING',
  'Đã lên lịch': 'SCHEDULED',
  'Đã đóng đăng ký': 'REGISTRATION_CLOSED',
  'Đang mở đăng ký': 'OPEN_REGISTRATION',
  'Đã kết thúc': 'COMPLETED',
  'Đã hủy': 'CANCELLED',
};

function normalizeCode(value, aliases) {
  const raw = String(value || '').trim();
  return aliases[raw] || raw.toUpperCase();
}

function mapRace(race) {
  if (!race) return null;

  const statusCode = normalizeCode(race.statusCode || race.status, RACE_STATUS_CODES);
  const tournamentStatus = race.tournamentStatus || '';
  const tournamentStatusCode = normalizeCode(tournamentStatus, TOURNAMENT_STATUS_CODES);

  return {
    id: String(race.id || race.raceId || race._id || ''),
    name: race.name || race.raceName || 'Cuộc đua',
    tournamentName: race.tournamentName || '',
    status: race.statusLabel || race.status || race.statusCode || 'Chưa cập nhật',
    statusCode,
    tournamentStatus,
    tournamentStatusCode,
    scheduledStartAt: race.scheduledStartAt || race.startAt || race.raceDate || '',
    checkedInCount: Number(race.checkedInCount || 0),
    pendingCheckInCount: Number(race.pendingCheckInCount || 0),
    participantCount: Number(race.participantCount || race.approvedParticipantCount || 0),
    location: race.location || race.track || '',
    canStart: statusCode === 'SCHEDULED' && tournamentStatusCode === 'ONGOING',
  };
}

function mapInvitation(invitation) {
  if (!invitation) return null;

  return {
    id: String(invitation.id || invitation._id || ''),
    raceId: invitation.raceId || '',
    raceName: invitation.raceName || invitation.race || 'Cuộc đua',
    tournamentName: invitation.tournamentName || invitation.tournament || '',
    status: invitation.status || 'Chờ xử lý',
    sentAt: invitation.sentAt || invitation.createdAt || '',
    amount: Number(invitation.amount || invitation.salaryAmount || 0),
  };
}

function mapPayment(payment) {
  if (!payment) return null;

  return {
    raceId: String(payment.raceId || ''),
    raceName: payment.raceName || 'Cuộc đua',
    tournamentName: payment.tournamentName || '',
    amount: Number(payment.amount || 0),
    status: payment.status || 'NONE',
  };
}

function mapParticipant(participant, race) {
  if (!participant) return null;

  return {
    id: String(participant.id || participant.participantId || participant._id || ''),
    raceId: race?.id || '',
    raceName: race?.name || 'Race',
    tournamentName: race?.tournamentName || '',
    horseName: participant.horseName || 'Ngựa',
    ownerName: participant.ownerUsername || participant.ownerName || 'Chủ ngựa',
    jockeyName: participant.jockeyUsername || participant.jockeyName || 'Jockey',
    gateNumber: participant.gateNumber ?? null,
    status: participant.status || 'REGISTERED',
    checkInStatus: participant.checkInStatus || 'PENDING',
    note: participant.note || '',
    canCheckIn: race?.statusCode === 'SCHEDULED' && participant.checkInStatus !== 'CHECKED_IN',
  };
}

export const refereeService = {
  async getDashboard() {
    const dashboard = await apiRequest(ENDPOINTS.referee.dashboard);
    return {
      assignedRaceCount: Number(dashboard?.assignedRaceCount || 0),
      pendingCheckInCount: Number(dashboard?.pendingCheckInCount || 0),
      checkedInCount: Number(dashboard?.checkedInCount || 0),
      upcomingRaceCount: Number(dashboard?.businessSummary?.upcomingRaceCount || 0),
      upcomingRaces: (dashboard?.upcomingRaces || []).map(mapRace).filter(Boolean),
      alerts: dashboard?.alerts || [],
    };
  },

  async listRaces() {
    const races = await apiRequest(ENDPOINTS.referee.races);
    return (Array.isArray(races) ? races : []).map(mapRace).filter(Boolean);
  },

  async startRace(id) {
    const race = await apiRequest(ENDPOINTS.referee.startRace(id), { method: 'PUT' });
    return mapRace(race);
  },

  async listParticipants(race) {
    const participants = await apiRequest(ENDPOINTS.referee.participants(race.id));
    return (Array.isArray(participants) ? participants : [])
      .map((participant) => mapParticipant(participant, race))
      .filter(Boolean);
  },

  async listParticipantsForRaces(races) {
    const chunks = await Promise.all((races || []).slice(0, 8).map((race) => this.listParticipants(race)));
    return chunks.flat();
  },

  async checkInParticipant(raceId, participantId, status = 'CHECKED_IN') {
    const participant = await apiRequest(ENDPOINTS.referee.participantCheckIn(raceId, participantId), {
      method: 'PUT',
      body: { status },
    });
    return mapParticipant(participant, { id: raceId });
  },

  updateParticipantGate(raceId, participantId, gateNumber) {
    return apiRequest(ENDPOINTS.referee.participantGate(raceId, participantId), {
      method: 'PUT',
      body: { gateNumber },
    });
  },

  generateSimulation(raceId) {
    return apiRequest(ENDPOINTS.referee.simulation(raceId), { method: 'POST' });
  },

  confirmSimulation(raceId, runId) {
    return apiRequest(ENDPOINTS.referee.confirmSimulation(raceId), {
      method: 'POST',
      headers: { 'Idempotency-Key': `simulation-confirm-${raceId}-${runId || Date.now()}` },
      body: { runId },
    });
  },

  finalizeResults(raceId, results) {
    return apiRequest(ENDPOINTS.referee.finalizeResults(raceId), {
      method: 'POST',
      headers: { 'Idempotency-Key': `finalize-${raceId}-${Date.now()}` },
      body: { results },
    });
  },

  listViolations() {
    return apiRequest(ENDPOINTS.referee.violations);
  },

  async listPayments() {
    const payments = await apiRequest(ENDPOINTS.referee.payments);
    return (Array.isArray(payments) ? payments : []).map(mapPayment).filter(Boolean);
  },

  async listInvitations() {
    const invitations = await apiRequest(ENDPOINTS.referee.invitations);
    return (Array.isArray(invitations) ? invitations : []).map(mapInvitation).filter(Boolean);
  },

  async respondInvitation(id, action) {
    const endpoint =
      action === 'accept'
        ? ENDPOINTS.referee.acceptInvitation(id)
        : ENDPOINTS.referee.rejectInvitation(id);
    const invitation = await apiRequest(endpoint, { method: 'PUT' });
    return mapInvitation(invitation);
  },
};
