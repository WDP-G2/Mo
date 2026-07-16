import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export function mapUser(user) {
  if (!user) return null;

  const name = user.fullName || user.name || user.username || 'Người dùng';

  return {
    id: String(user.id || user.userId || user._id),
    code: name.slice(0, 1).toUpperCase(),
    name,
    fullName: user.fullName || user.name || '',
    username: user.username || '',
    email: user.email || '',
    phone: user.phone || '',
    location: user.location || '',
    avatarUrl: user.avatarUrl || '',
    role: user.role || 'USER',
    status: user.status || 'Đang hoạt động',
  };
}

export const userService = {
  async list(params = {}) {
    const endpoint = params.role ? ENDPOINTS.users.byRole(params.role) : ENDPOINTS.users.list;
    const list = await apiRequest(endpoint);
    return (Array.isArray(list) ? list : []).map(mapUser).filter(Boolean);
  },

  async getProfile() {
    const user = await apiRequest(ENDPOINTS.users.profile);
    return mapUser(user);
  },

  async updateProfile(payload) {
    const user = await apiRequest(ENDPOINTS.users.profile, {
      method: 'PUT',
      body: {
        fullName: payload.fullName,
        phone: payload.phone,
        location: payload.location,
      },
    });
    return mapUser(user);
  },
};
