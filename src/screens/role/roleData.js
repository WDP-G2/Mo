import { horseService } from '../../services/horseService';
import { jockeyService } from '../../services/jockeyService';
import { newsService } from '../../services/newsService';
import { ownerService } from '../../services/ownerService';
import { refereeService } from '../../services/refereeService';
import { spectatorService } from '../../services/spectatorService';
import { tournamentService } from '../../services/tournamentService';
import { walletService } from '../../services/walletService';
import { normalizeRole } from '../../utils/role';

export function roleOrSpectator(role) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'USER' ? 'SPECTATOR' : normalizedRole || 'SPECTATOR';
}

export function displayName(user) {
  return user?.fullName || user?.name || user?.username || 'Người dùng';
}

export function initials(name) {
  return String(name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function formatDate(value) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleDateString('vi-VN');
}

export async function loadDataForRole(role) {
  if (role === 'OWNER') {
    const [
      dashboard,
      profile,
      results,
      openTournaments,
      registrations,
      horses,
      invitations,
      news,
      wallet,
      walletTransactions,
      withdrawals,
    ] = await Promise.all([
      ownerService.getDashboard(),
      ownerService.getProfile(),
      ownerService.getResults(),
      tournamentService.listOwnerOpen(),
      ownerService.listRaceRegistrations(),
      ownerService.listHorses(),
      ownerService.listJockeyInvitations(),
      newsService.list(),
      walletService.getMyWallet(),
      walletService.listMyTransactions(),
      walletService.listMyWithdrawals(),
    ]);

    return {
      dashboard,
      profile,
      results,
      openTournaments,
      registrations,
      horses,
      invitations,
      news,
      wallet,
      walletTransactions,
      withdrawals,
    };
  }

  if (role === 'JOCKEY') {
    const [dashboard, races, performance, prizes, invitations, tournaments, news] = await Promise.all([
      jockeyService.getDashboard(),
      jockeyService.listRaces(),
      jockeyService.getPerformance(),
      jockeyService.listPrizes(),
      jockeyService.listInvitations(),
      tournamentService.list(),
      newsService.list(),
    ]);

    return { dashboard, races, performance, prizes, invitations, tournaments, news };
  }

  if (role === 'REFEREE') {
    const [dashboard, races, invitations, payments, news, violations] = await Promise.all([
      refereeService.getDashboard(),
      refereeService.listRaces(),
      refereeService.listInvitations(),
      refereeService.listPayments(),
      newsService.list(),
      refereeService.listViolations().catch(() => []),
    ]);
    const participants = await refereeService.listParticipantsForRaces(races);

    return { dashboard, races, participants, invitations, payments, news, violations };
  }

  if (role === 'SPECTATOR') {
    const [dashboard, markets, bets, tournaments, horses, news] = await Promise.all([
      spectatorService.getDashboard(),
      spectatorService.listBettableRaces(),
      spectatorService.listMyBets(),
      tournamentService.list(),
      horseService.list(),
      newsService.list(),
    ]);

    return { dashboard, markets, bets, tournaments, horses, news };
  }

  const [tournaments, horses, news] = await Promise.all([
    tournamentService.list(),
    horseService.list(),
    newsService.list(),
  ]);

  return { tournaments, horses, news };
}

export function buildStats(role, data) {
  if (role === 'OWNER') {
    return [
      { id: 'my_horses', icon: 'footsteps-outline', label: 'Ngựa của tôi', value: data.horses?.length || 0 },
      { id: 'open_tournaments', icon: 'trophy-outline', label: 'Giải mở', value: data.openTournaments?.length || 0 },
      { id: 'registrations', icon: 'reader-outline', label: 'Đăng ký', value: data.dashboard?.registrationCount || data.registrations?.length || 0 },
      { id: 'jockey_invitations', icon: 'mail-outline', label: 'Lời mời jockey', value: data.invitations?.length || 0 },
    ];
  }

  if (role === 'JOCKEY') {
    return [
      { id: 'races', icon: 'calendar-outline', label: 'Race đã chạy', value: data.dashboard?.raceCount || data.races?.length || 0 },
      {
        id: 'pending_invitations',
        icon: 'mail-unread-outline',
        label: 'Lời mời chờ',
        value: (data.invitations || []).filter((item) => item.status === 'Chờ xử lý' || item.status === 'PENDING').length,
      },
      { id: 'wins', icon: 'ribbon-outline', label: 'Số trận thắng', value: data.dashboard?.wins || 0 },
      { id: 'payout', icon: 'cash-outline', label: 'Thù lao', value: (data.dashboard?.totalJockeyPayout || 0).toLocaleString('vi-VN') },
    ];
  }

  if (role === 'REFEREE') {
    return [
      { id: 'assigned_races', icon: 'flag-outline', label: 'Race được phân', value: data.dashboard?.assignedRaceCount || 0 },
      { id: 'pending_checkin', icon: 'time-outline', label: 'Chờ check-in', value: data.dashboard?.pendingCheckInCount || 0 },
      { id: 'checked_in', icon: 'checkmark-circle-outline', label: 'Đã check-in', value: data.dashboard?.checkedInCount || 0 },
      {
        id: 'referee_invitations',
        icon: 'mail-unread-outline',
        label: 'Lời mời chờ',
        value: (data.invitations || []).filter((item) => item.status === 'Chờ xử lý' || item.status === 'PENDING').length,
      },
    ];
  }

  return [
    {
      id: 'wallet_balance',
      icon: 'wallet-outline',
      label: 'Số dư ví',
      value: (data.dashboard?.wallet?.availableBalance || 0).toLocaleString('vi-VN'),
    },
    { id: 'spectator_tournaments', icon: 'trophy-outline', label: 'Giải mở', value: data.dashboard?.businessSummary?.openTournamentCount || data.tournaments?.length || 0 },
    { id: 'open_bets', icon: 'cash-outline', label: 'Kèo mở', value: data.markets?.length || data.dashboard?.businessSummary?.openBetMarketCount || 0 },
    {
      id: 'total_bets',
      icon: 'ticket-outline',
      label: 'Tổng cược',
      value: (data.dashboard?.businessSummary?.totalBetStake || 0).toLocaleString('vi-VN'),
    },
  ];
}

export function matchesQuery(item, query) {
  if (!query.trim()) return true;
  const normalized = query.trim().toLowerCase();
  return Object.values(item || {}).some((value) =>
    String(value || '').toLowerCase().includes(normalized),
  );
}
