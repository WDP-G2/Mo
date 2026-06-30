import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export function mapHorse(horse) {
  if (!horse) return null;

  return {
    id: String(horse.id || horse._id),
    name: horse.name || '',
    breed: horse.breed || '',
    ownerName: horse.ownerName || 'Chưa cập nhật',
    imageUrl: horse.imageUrl || '',
    healthStatus: horse.healthStatus || 'Chưa cập nhật',
    wins: Number(horse.wins || 0),
    races: Number(horse.races || 0),
    canRace: horse.canRace !== false,
    racingStatus: horse.racingStatus || 'can-race',
  };
}

export const horseService = {
  async list(params = {}) {
    const list = await apiRequest(ENDPOINTS.horses.list, { params });
    return (Array.isArray(list) ? list : []).map(mapHorse).filter(Boolean);
  },

  async listMine() {
    const list = await apiRequest(ENDPOINTS.horses.list, { params: { mine: true } });
    return (Array.isArray(list) ? list : []).map(mapHorse).filter(Boolean);
  },
};
