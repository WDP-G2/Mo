const DEFAULT_API_BASE_URL = 'https://be-production-dcb3.up.railway.app/api/v1';

function normalizeApiBaseUrl(value) {
  const raw = String(value || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
  if (raw === 'https://be-production-dcb3.up.railway.app') {
    return `${raw}/api/v1`;
  }
  return raw;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
