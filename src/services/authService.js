import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

function deriveUsername(email) {
  return String(email || '').split('@')[0] || '';
}

export const authService = {
  register(payload) {
    return apiRequest(ENDPOINTS.auth.register, {
      method: 'POST',
      body: {
        username: deriveUsername(payload.email),
        fullName: payload.fullName,
        email: payload.email,
        password: payload.password,
        role: payload.role,
      },
    });
  },

  login(payload) {
    return apiRequest(ENDPOINTS.auth.login, {
      method: 'POST',
      body: payload,
    });
  },

  getMe() {
    return apiRequest(ENDPOINTS.auth.me);
  },
};
