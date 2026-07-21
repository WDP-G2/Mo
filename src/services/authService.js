import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

function deriveUsername(email) {
  return String(email || '').split('@')[0] || '';
}

function normalizeAuthResponse(auth) {
  if (!auth) return auth;
  if (auth.user) return auth;

  return {
    token: auth.token || null,
    tokenType: auth.tokenType || 'Bearer',
    user: {
      id: auth.userId || auth.id || '',
      userId: auth.userId || auth.id || '',
      username: auth.username || '',
      fullName: auth.fullName || auth.name || '',
      name: auth.fullName || auth.name || '',
      email: auth.email || '',
      phone: auth.phone || '',
      role: auth.role || '',
      active: auth.active,
      pendingRole: auth.pendingRole || null,
      roleApprovalStatus: auth.roleApprovalStatus || '',
      roleReviewReason: auth.roleReviewReason || '',
      roleReviewedBy: auth.roleReviewedBy || null,
      roleReviewedAt: auth.roleReviewedAt || null,
      avatarUrl: auth.avatarUrl || '',
      location: auth.location || '',
    },
  };
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

  async login(payload) {
    const auth = await apiRequest(ENDPOINTS.auth.login, {
      method: 'POST',
      body: payload,
    });
    return normalizeAuthResponse(auth);
  },

  getMe() {
    return apiRequest(ENDPOINTS.auth.me);
  },
};
