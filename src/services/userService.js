import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export function mapUser(user) {
  if (!user) return null;

  const name = user.fullName || user.name || user.username || 'Người dùng';

  return {
    id: String(user.id || user.userId || user._id),
    code: name.slice(0, 1).toUpperCase(),
    name,
    email: user.email || '',
    phone: user.phone || '',
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
};

