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
  };
}

export const tournamentService = {
  async list(params = {}) {
    const list = await apiRequest(ENDPOINTS.tournaments.list, { params });
    return (Array.isArray(list) ? list : []).map(mapTournament).filter(Boolean);
  },
};

