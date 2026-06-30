import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

const FALLBACK_BANNER =
  'https://images.unsplash.com/photo-1507514604110-ba3347c457f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600';

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
    status: item.status || item.approval || 'Chờ duyệt',
    notes: item.notes || '',
    registeredAt: item.registeredAt || '',
    horseHealth: item.horseHealth || '',
    horseWins: Number(item.horseWins || 0),
    horseRaces: Number(item.horseRaces || 0),
    horseImageUrl: item.horseImageUrl || '',
  };
}

export function mapTournament(tournament) {
  if (!tournament) return null;
  const races = Array.isArray(tournament.races) ? tournament.races : [];
  const registrations = Array.isArray(tournament.registrations)
    ? tournament.registrations
    : [];

  return {
    id: String(tournament.id || tournament._id),
    name: tournament.name || '',
    status: tournament.status || 'Nháp',
    location: tournament.location || 'Chưa cập nhật',
    banner: tournament.banner || FALLBACK_BANNER,
    startDate: tournament.startDate,
    dateLabel: toDateLabel(tournament.startDate),
    prize: tournament.config?.prize || tournament.prize || 'Chưa cập nhật',
    raceCount: tournament.raceCount ?? races.length,
    registrationCount: tournament.registrationCount ?? registrations.length,
    pendingCount: registrations.filter((item) => item.status === 'Chờ duyệt').length,
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
