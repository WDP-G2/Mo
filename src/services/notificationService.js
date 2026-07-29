import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

function normalizePage(page) {
  if (Array.isArray(page)) {
    return {
      content: page,
      totalElements: page.length,
      totalPages: 1,
      number: 0,
      size: page.length,
    };
  }

  return {
    content: Array.isArray(page?.content) ? page.content : [],
    totalElements: Number(page?.totalElements ?? 0),
    totalPages: Number(page?.totalPages ?? 0),
    number: Number(page?.number ?? 0),
    size: Number(page?.size ?? 0),
  };
}

function notificationIcon(type) {
  const value = String(type || '').toUpperCase();
  if (value.includes('REJECT') || value.includes('CANCEL')) return 'warning-outline';
  if (value.includes('ACCEPT') || value.includes('SUCCESS')) return 'checkmark-circle-outline';
  if (value.includes('REGISTRATION') || value.includes('RACE')) return 'trophy-outline';
  if (value.includes('INVITATION')) return 'mail-outline';
  return 'notifications-outline';
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function mapNotification(item) {
  if (!item) return null;
  return {
    id: String(item.id || item._id || ''),
    source: 'server',
    icon: notificationIcon(item.type),
    type: item.type || 'GENERAL',
    title: item.title || 'Thông báo',
    detail: item.message || item.content || '',
    read: item.readStatus === 'READ' || item.read === true || Boolean(item.readAt),
    metadata: item.metadata || {},
    createdAt: item.createdAt || '',
    time: formatTime(item.createdAt),
    raw: item,
  };
}

export const notificationService = {
  async list(params = {}) {
    const page = await apiRequest(ENDPOINTS.notifications.list, { params });
    const normalized = normalizePage(page);
    return {
      ...normalized,
      content: normalized.content.map(mapNotification).filter(Boolean),
    };
  },

  async getUnreadCount() {
    const data = await apiRequest(ENDPOINTS.notifications.unreadCount);
    return Number(data?.count ?? data?.unreadCount ?? data ?? 0);
  },

  async markRead(id) {
    const item = await apiRequest(ENDPOINTS.notifications.markRead(id), { method: 'PUT' });
    return mapNotification(item);
  },

  async markAllRead() {
    const data = await apiRequest(ENDPOINTS.notifications.markAllRead, { method: 'PUT' });
    return Number(data?.count ?? data?.unreadCount ?? data ?? 0);
  },
};
