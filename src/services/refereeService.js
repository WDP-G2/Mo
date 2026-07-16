import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

function mapRace(race) {
  if (!race) return null;

  return {
    id: String(race.id || race.raceId || race._id || ''),
    name: race.name || race.raceName || 'Cuộc đua',
    tournamentName: race.tournamentName || '',
    status: race.status || race.statusCode || 'Chưa cập nhật',
    scheduledStartAt: race.scheduledStartAt || race.startAt || race.raceDate || '',
    checkedInCount: Number(race.checkedInCount || 0),
    pendingCheckInCount: Number(race.pendingCheckInCount || 0),
    participantCount: Number(race.participantCount || race.approvedParticipantCount || 0),
    location: race.location || race.track || '',
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

