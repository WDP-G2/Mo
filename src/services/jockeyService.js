import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

function toNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function mapRace(item) {
  if (!item) return null;

  return {
    id: String(item.id || item.raceId || item._id || ''),
    tournamentId: String(item.tournamentId || ''),
    tournamentName: item.tournamentName || 'Giải đấu',
    raceName: item.name || item.raceName || 'Race',
    status: item.status || item.raceStatus || 'Chưa cập nhật',
    scheduledStartAt: item.scheduledStartAt || item.raceDate || '',
    venueName: item.venueName || '',
    venueAddress: item.venueAddress || '',
    horseName: item.horseName || 'Ngựa',
    ownerName: item.ownerName || 'Chủ ngựa',
  };
}

function mapInvitation(item) {
  if (!item) return null;

  return {
    id: String(item.id || item._id || ''),
    ownerId: item.ownerId || '',
    jockeyId: item.jockeyId || '',
    horseId: item.horseId || '',
    tournamentId: item.tournamentId || '',
    raceId: item.raceId || '',
    ownerName: item.ownerName || item.owner || '',
    horseName: item.horseName || item.horse || '',
    tournamentName: item.tournamentName || item.tournament || '',
    raceLabel: item.raceLabel || item.raceName || '',
    raceDate: item.raceDate || '',
    raceTime: item.raceTime || '',
    location: item.location || '',
    reward: toNumber(item.reward || item.remunerationAmount),
    status: item.status || 'Chờ xử lý',
    sentAt: item.sentAt || item.createdAt || '',
  };
}

function mapPrize(item) {
  if (!item) return null;

  return {
    id: String(item.id || item._id || ''),
    tournamentName: item.tournamentName || 'Giải đấu',
    raceName: item.raceName || 'Race',
    horseName: item.horseName || 'Ngựa',
    position: toNumber(item.position),
    prizeAmount: toNumber(item.prizeAmount),
    points: toNumber(item.points),
    awardedAt: item.awardedAt || '',
  };
}

export const jockeyService = {
  async getDashboard() {
    const dashboard = await apiRequest(ENDPOINTS.jockey.dashboard);
    return {
      raceCount: toNumber(dashboard?.raceCount),
      wins: toNumber(dashboard?.wins),
      winRate: toNumber(dashboard?.winRate),
      totalJockeyPayout: toNumber(dashboard?.totalJockeyPayout),
      totalPrizePayout: toNumber(dashboard?.totalPrizePayout),
    };
  },

  async listRaces() {
    const races = await apiRequest(ENDPOINTS.jockey.races);
    return (Array.isArray(races) ? races : []).map(mapRace).filter(Boolean);
  },

  async getPerformance() {
    const performance = await apiRequest(ENDPOINTS.jockey.performance);
    return {
      raceCount: toNumber(performance?.raceCount),
      wins: toNumber(performance?.wins),
      podiums: toNumber(performance?.podiums),
      totalJockeyPayout: toNumber(performance?.totalJockeyPayout),
      totalPrizePayout: toNumber(performance?.totalPrizePayout),
    };
  },

  async listPrizes() {
    const prizes = await apiRequest(ENDPOINTS.jockey.prizes);
    return (Array.isArray(prizes) ? prizes : []).map(mapPrize).filter(Boolean);
  },

  async getProfile() {
    return apiRequest(ENDPOINTS.jockey.profile);
  },

  async listInvitations() {
    const invitations = await apiRequest(ENDPOINTS.jockey.invitations);
    return (Array.isArray(invitations) ? invitations : []).map(mapInvitation).filter(Boolean);
  },

  async respondInvitation(id, action) {
    const endpoint =
      action === 'accept'
        ? ENDPOINTS.jockey.acceptInvitation(id)
        : ENDPOINTS.jockey.rejectInvitation(id);
    const invitation = await apiRequest(endpoint, { method: 'PUT' });
    return mapInvitation(invitation);
  },
};
