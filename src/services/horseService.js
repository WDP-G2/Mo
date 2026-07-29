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
    documentUrl: horse.documentUrl || horse.licenseImageUrl || '',
    licenseImageUrl: horse.licenseImageUrl || horse.documentUrl || '',
    healthStatus: horse.healthStatus || 'Chưa cập nhật',
    wins: Number(horse.wins || 0),
    races: Number(horse.races || 0),
    canRace: horse.canRace !== false,
    racingStatus: horse.racingStatus || 'can-race',
  };
}

function appendIfPresent(formData, key, value) {
  if (value === undefined || value === null || value === '') return;
  formData.append(key, String(value));
}

function extensionFromMime(type) {
  if (!type || !String(type).includes('/')) return '';
  const subtype = String(type).split('/').pop().split(';')[0].trim();
  if (!subtype) return '';
  if (subtype === 'jpeg') return 'jpg';
  if (subtype.includes('wordprocessingml')) return 'docx';
  return subtype.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function fileNameFromUri(uri, fallbackName, type) {
  const rawName = String(uri || '').split('/').pop()?.split('?')[0] || '';
  let decodedName = rawName;
  try {
    decodedName = rawName ? decodeURIComponent(rawName) : '';
  } catch {
    decodedName = rawName;
  }

  const name = typeof fallbackName === 'string' && fallbackName.trim() ? fallbackName.trim() : decodedName;
  if (name && name.includes('.')) return name;

  const extension = extensionFromMime(type);
  return extension ? `${name || 'upload'}.${extension}` : name || 'upload';
}

function appendFileIfPresent(formData, key, file, fallbackName, fallbackType) {
  if (!file || typeof file.uri !== 'string' || !file.uri.trim()) return;

  const type = typeof file.type === 'string' && file.type.trim() ? file.type.trim() : fallbackType;
  formData.append(key, {
    uri: file.uri,
    name: fileNameFromUri(file.uri, file.name, type),
    type,
  });
}

function buildHorseFormData(payload) {
  const formData = new FormData();

  appendIfPresent(formData, 'name', payload.name);
  appendIfPresent(formData, 'breed', payload.breed);
  appendIfPresent(formData, 'age', payload.age);
  appendIfPresent(formData, 'gender', payload.gender);
  appendIfPresent(formData, 'color', payload.color);
  appendIfPresent(formData, 'heightCm', payload.heightCm !== undefined ? payload.heightCm : payload.height);
  appendIfPresent(formData, 'weightKg', payload.weightKg !== undefined ? payload.weightKg : payload.weight);
  appendIfPresent(formData, 'healthStatus', payload.healthStatus || 'Khỏe mạnh');
  appendIfPresent(formData, 'racingStatus', payload.racingStatus || 'can-race');

  appendFileIfPresent(formData, 'image', payload.imageFile, 'horse.jpg', 'image/jpeg');
  appendFileIfPresent(formData, 'document', payload.documentFile, 'horse-health-document.pdf', 'application/pdf');

  return formData;
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
    const body = payload.imageFile?.uri || payload.documentFile?.uri
      ? buildHorseFormData(payload)
      : {
        name: payload.name,
        breed: payload.breed,
        age: Number(payload.age),
        gender: payload.gender || '',
        color: payload.color || '',
        heightCm: payload.heightCm !== undefined ? Number(payload.heightCm) : Number(payload.height || 0),
        weightKg: payload.weightKg !== undefined ? Number(payload.weightKg) : Number(payload.weight || 0),
        healthStatus: payload.healthStatus || 'Khỏe mạnh',
        racingStatus: payload.racingStatus || 'can-race',
      };

    const horse = await apiRequest(ENDPOINTS.owner.createHorse, {
      method: 'POST',
      body,
    });
    return mapHorse(horse);
  },
};
