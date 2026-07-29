import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export function mapHorse(horse) {
  if (!horse) return null;

  return {
    id: String(horse.id || horse._id),
    name: horse.name || '',
    breed: horse.breed || '',
    gender: horse.gender || '',
    color: horse.color || '',
    heightCm: Number(horse.heightCm || horse.height || 0),
    height: Number(horse.heightCm || horse.height || 0),
    weightKg: Number(horse.weightKg || horse.weight || 0),
    weight: Number(horse.weightKg || horse.weight || 0),
    age: Number(horse.age || 0),
    birthDate: horse.birthDate || null,
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

  async create(payload) {
    const horse = await apiRequest(ENDPOINTS.owner.createHorse, {
      method: 'POST',
      body: {
        name: payload.name,
        breed: payload.breed,
        age: Number(payload.age),
        gender: payload.gender || '',
        color: payload.color || '',
        heightCm: payload.heightCm !== undefined ? Number(payload.heightCm) : Number(payload.height || 0),
        weightKg: payload.weightKg !== undefined ? Number(payload.weightKg) : Number(payload.weight || 0),
        healthStatus: payload.healthStatus || 'Khỏe mạnh',
        racingStatus: payload.racingStatus || 'can-race',
      },
    });
    return mapHorse(horse);
  },
};
