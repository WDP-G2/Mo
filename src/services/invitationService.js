import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

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
    jockeyName: item.jockeyName || item.jockey || '',
    horseName: item.horseName || item.horse || '',
    tournamentName: item.tournamentName || item.tournament || '',
    raceLabel: item.raceLabel || item.raceNo || '',
    raceDate: item.raceDate || '',
    raceTime: item.raceTime || '',
    location: item.location || '',
    reward: Number(item.reward || 0),
    status: item.status || 'Chờ xử lý',
    sentAt: item.sentAt || '',
  };
}

export const invitationService = {
  async listMine() {
    const list = await apiRequest(ENDPOINTS.invitations.me);
    return (Array.isArray(list) ? list : []).map(mapInvitation).filter(Boolean);
  },

  async listSent() {
    const list = await apiRequest(ENDPOINTS.invitations.sent);
    return (Array.isArray(list) ? list : []).map(mapInvitation).filter(Boolean);
  },

  async respond(id, action) {
    const item = await apiRequest(ENDPOINTS.invitations.respond(id), {
      method: 'PATCH',
      body: { action },
    });
    return mapInvitation(item);
  },
};

