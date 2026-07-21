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

function mapMarket(item) {
  if (!item) return null;
  return {
    id: String(item.id || item._id || ''),
    raceId: String(item.raceId || ''),
    raceName: item.raceName || 'Race',
    tournamentName: item.tournamentName || 'Giải đấu',
    status: item.status || 'OPEN',
    minStake: toNumber(item.minStake),
    maxStake: toNumber(item.maxStake),
    openedAt: item.openedAt || '',
    options: Array.isArray(item.options) ? item.options : [],
  };
}

function mapBet(item) {
  if (!item) return null;
  return {
    id: String(item.id || item._id || ''),
    raceId: String(item.raceId || ''),
    raceName: item.raceName || 'Race',
    tournamentName: item.tournamentName || 'Giải đấu',
    horseName: item.horseName || 'Ngựa',
    stakeAmount: toNumber(item.stakeAmount),
    potentialPayoutAmount: toNumber(item.potentialPayoutAmount),
    status: item.status || 'PLACED',
    placedAt: item.placedAt || '',
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

  async listBettableRaces() {
    const markets = await apiRequest(ENDPOINTS.users.bettableRaces);
    return (Array.isArray(markets) ? markets : []).map(mapMarket).filter(Boolean);
  },

  async listMyBets() {
    const bets = await apiRequest(ENDPOINTS.users.myBets);
    return (Array.isArray(bets) ? bets : []).map(mapBet).filter(Boolean);
  },

  async getRaceMarket(raceId) {
    const market = await apiRequest(ENDPOINTS.races.betMarket(raceId));
    return mapMarket(market);
  },

  async getRaceResults(raceId) {
    const results = await apiRequest(ENDPOINTS.races.results(raceId));
    return Array.isArray(results) ? results : [];
  },

  async placeBet(raceId, payload) {
    const bet = await apiRequest(ENDPOINTS.races.placeBet(raceId), {
      method: 'POST',
      headers: { 'Idempotency-Key': payload.idempotencyKey },
      body: {
        participantId: payload.participantId,
        stakeAmount: payload.stakeAmount,
      },
    });
    return mapBet(bet);
  },
};
