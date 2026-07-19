import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { mapHorse } from './horseService';

function mapRegistration(item) {
  if (!item) return null;

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
    status: item.status || item.approval || 'Chờ duyệt',
    createdAt: item.createdAt || item.registeredAt || '',
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
};

