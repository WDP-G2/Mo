import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

function toNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function mapDashboardItem(item) {
  return {
    type: item?.type || '',
    id: String(item?.id || ''),
    title: item?.title || 'Mục theo dõi',
    status: item?.status || '',
    at: item?.at || '',
    metadata: item?.metadata || {},
  };
}

function mapNotification(item) {
  return {
    id: String(item?.id || ''),
    title: item?.title || 'Thông báo',
    message: item?.message || '',
    read: item?.read === true,
    createdAt: item?.createdAt || '',
  };
}

export const spectatorService = {
  async getDashboard() {
    const data = await apiRequest(ENDPOINTS.spectator.dashboard);
    const summary = data?.businessSummary || {};
    const wallet = data?.wallet || {};

    return {
      account: data?.account || {},
      wallet: {
        availableBalance: toNumber(wallet.availableBalance),
        holdBalance: toNumber(wallet.holdBalance),
      },
      businessSummary: {
        openTournamentCount: toNumber(summary.openTournamentCount),
        openBetMarketCount: toNumber(summary.openBetMarketCount),
        totalBetStake: toNumber(summary.totalBetStake),
        totalBetPayout: toNumber(summary.totalBetPayout),
        betsByStatus: summary.betsByStatus || {},
      },
      upcoming: Array.isArray(data?.upcoming) ? data.upcoming.map(mapDashboardItem) : [],
      recentTransactions: Array.isArray(data?.recentTransactions) ? data.recentTransactions : [],
      recentNotifications: Array.isArray(data?.recentNotifications)
        ? data.recentNotifications.map(mapNotification)
        : [],
    };
  },
};

