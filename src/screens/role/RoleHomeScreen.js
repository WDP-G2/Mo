import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../constants/theme';
import { horseService } from '../../services/horseService';
import { invitationService } from '../../services/invitationService';
import { jockeyService } from '../../services/jockeyService';
import { newsService } from '../../services/newsService';
import { ownerService } from '../../services/ownerService';
import { refereeService } from '../../services/refereeService';
import { spectatorService } from '../../services/spectatorService';
import { tournamentService } from '../../services/tournamentService';
import { userService } from '../../services/userService';
import { getRoleLabel, normalizeRole } from '../../utils/role';

const tabs = [
  { key: 'overview', icon: 'grid-outline', activeIcon: 'grid', label: 'Tổng quan' },
  { key: 'schedule', icon: 'calendar-outline', activeIcon: 'calendar', label: 'Lịch' },
  { key: 'tasks', icon: 'checkmark-done-outline', activeIcon: 'checkmark-done', label: 'Việc cần làm' },
  { key: 'account', icon: 'person-outline', activeIcon: 'person', label: 'Tài khoản' },
];

function roleOrSpectator(role) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'USER' ? 'SPECTATOR' : normalizedRole || 'SPECTATOR';
}

function displayName(user) {
  return user?.fullName || user?.name || user?.username || 'Người dùng';
}

function initials(name) {
  return String(name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleDateString('vi-VN');
}

async function loadDataForRole(role) {
  if (role === 'OWNER') {
    const [dashboard, profile, results, openTournaments, registrations, horses, invitations, news] = await Promise.all([
      ownerService.getDashboard(),
      ownerService.getProfile(),
      ownerService.getResults(),
      tournamentService.listOwnerOpen(),
      ownerService.listRaceRegistrations(),
      ownerService.listHorses(),
      ownerService.listJockeyInvitations(),
      newsService.list(),
    ]);

    return { dashboard, profile, results, openTournaments, registrations, horses, invitations, news };
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
    const [dashboard, races, invitations, payments, news] = await Promise.all([
      refereeService.getDashboard(),
      refereeService.listRaces(),
      refereeService.listInvitations(),
      refereeService.listPayments(),
      newsService.list(),
    ]);
    const participants = await refereeService.listParticipantsForRaces(races);

    return { dashboard, races, participants, invitations, payments, news };
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

export default function RoleHomeScreen({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const role = roleOrSpectator(user?.role);
  const name = displayName(user);

  function refreshData() {
    let alive = true;
    setLoading(true);
    setError('');

    loadDataForRole(role)
      .then((nextData) => {
        if (alive) setData(nextData);
      })
      .catch((requestError) => {
        if (alive) setError(requestError.message || 'Không tải được dữ liệu.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return function cleanup() {
      alive = false;
    };
  }

  useEffect(() => {
    const cleanup = refreshData();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const stats = useMemo(() => buildStats(role, data), [data, role]);

  async function handleInvitationResponse(id, action) {
    try {
      const updated =
        role === 'JOCKEY'
          ? await jockeyService.respondInvitation(id, action)
          : await invitationService.respond(id, action);
      setData((current) => ({
        ...current,
        invitations: (current.invitations || []).map((item) =>
          item.id === id ? { ...item, status: updated?.status || item.status } : item,
        ),
      }));
    } catch (requestError) {
      setError(requestError.message || 'Không cập nhật được lời mời.');
    }
  }

  async function handleRefereeInvitationResponse(id, action) {
    try {
      const updated = await refereeService.respondInvitation(id, action);
      setData((current) => ({
        ...current,
        invitations: (current.invitations || []).map((item) =>
          item.id === id ? { ...item, status: updated?.status || item.status } : item,
        ),
      }));
    } catch (requestError) {
      setError(requestError.message || 'Không cập nhật được lời mời trọng tài.');
    }
  }

  async function handleStartRace(id) {
    try {
      const updated = await refereeService.startRace(id);
      setData((current) => ({
        ...current,
        races: (current.races || []).map((item) =>
          item.id === id ? { ...item, ...updated } : item,
        ),
        dashboard: {
          ...current.dashboard,
          upcomingRaces: (current.dashboard?.upcomingRaces || []).map((item) =>
            item.id === id ? { ...item, ...updated } : item,
          ),
        },
      }));
    } catch (requestError) {
      setError(requestError.message || 'Không bắt đầu được cuộc đua.');
    }
  }

  async function handleParticipantCheckIn(raceId, participantId, status) {
    try {
      const updated = await refereeService.checkInParticipant(raceId, participantId, status);
      setData((current) => ({
        ...current,
        participants: (current.participants || []).map((item) =>
          item.id === participantId
            ? { ...item, ...updated, raceId: item.raceId, raceName: item.raceName, tournamentName: item.tournamentName }
            : item,
        ),
      }));
    } catch (requestError) {
      setError(requestError.message || 'Không check-in được participant.');
    }
  }

  async function handleOwnerInvitationCancel(id) {
    try {
      const updated = await ownerService.cancelJockeyInvitation(id);
      setData((current) => ({
        ...current,
        invitations: (current.invitations || []).map((item) =>
          item.id === id ? { ...item, status: updated?.status || item.status } : item,
        ),
      }));
    } catch (requestError) {
      setError(requestError.message || 'Không hủy được lời mời jockey.');
    }
  }

  async function handleOwnerRegistrationWithdraw(id) {
    try {
      const updated = await ownerService.withdrawRegistration(id);
      setData((current) => ({
        ...current,
        registrations: (current.registrations || []).map((item) =>
          item.id === id ? { ...item, ...updated } : item,
        ),
      }));
    } catch (requestError) {
      setError(requestError.message || 'Không rút được đăng ký race.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.app}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{getRoleLabel(role)} Portal</Text>
            <Text style={styles.title}>{name}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.refreshButton} onPress={refreshData}>
              <Ionicons name="refresh-outline" size={19} color={colors.darkText} />
            </Pressable>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(name)}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.centerText}>{'Đang tải dữ liệu...'}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {activeTab !== 'account' ? <SearchBox query={query} onChangeQuery={setQuery} /> : null}
            {activeTab === 'overview' ? (
              <Overview role={role} stats={stats} data={data} query={query} />
            ) : null}
            {activeTab === 'schedule' ? (
              <Schedule
                role={role}
                data={data}
                query={query}
                onOwnerRegistrationWithdraw={handleOwnerRegistrationWithdraw}
                onStartRace={handleStartRace}
              />
            ) : null}
            {activeTab === 'tasks' ? (
              <Tasks
                role={role}
                data={data}
                query={query}
                onOwnerInvitationCancel={handleOwnerInvitationCancel}
                onInvitationResponse={handleInvitationResponse}
                onParticipantCheckIn={handleParticipantCheckIn}
                onRefereeInvitationResponse={handleRefereeInvitationResponse}
              />
            ) : null}
            {activeTab === 'account' ? <Account user={user} role={role} onLogout={onLogout} /> : null}
          </ScrollView>
        )}

        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable key={tab.key} style={styles.tab} onPress={() => setActiveTab(tab.key)}>
                <Ionicons
                  name={active ? tab.activeIcon : tab.icon}
                  size={19}
                  color={active ? colors.primary : colors.darkTextMuted}
                />
                <Text style={[styles.tabText, active && styles.activeTabText]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function buildStats(role, data) {
  if (role === 'OWNER') {
    return [
      { icon: 'footsteps-outline', label: 'Ngựa của tôi', value: data.horses?.length || 0 },
      { icon: 'trophy-outline', label: 'Giải mở', value: data.openTournaments?.length || 0 },
      { icon: 'reader-outline', label: 'Đăng ký', value: data.dashboard?.registrationCount || data.registrations?.length || 0 },
      { icon: 'mail-outline', label: 'Lời mời jockey', value: data.invitations?.length || 0 },
    ];
  }

  if (role === 'JOCKEY') {
    return [
      { icon: 'calendar-outline', label: 'Race đã chạy', value: data.dashboard?.raceCount || data.races?.length || 0 },
      {
        icon: 'mail-unread-outline',
        label: 'Lời mời chờ',
        value: (data.invitations || []).filter((item) => item.status === 'Chờ xử lý').length,
      },
      { icon: 'ribbon-outline', label: 'Số trận thắng', value: data.dashboard?.wins || 0 },
      { icon: 'cash-outline', label: 'Thù lao', value: (data.dashboard?.totalJockeyPayout || 0).toLocaleString('vi-VN') },
    ];
  }

  if (role === 'REFEREE') {
    return [
      { icon: 'flag-outline', label: 'Race được phân', value: data.dashboard?.assignedRaceCount || 0 },
      { icon: 'time-outline', label: 'Chờ check-in', value: data.dashboard?.pendingCheckInCount || 0 },
      { icon: 'checkmark-circle-outline', label: 'Đã check-in', value: data.dashboard?.checkedInCount || 0 },
      {
        icon: 'mail-unread-outline',
        label: 'Lời mời chờ',
        value: (data.invitations || []).filter((item) => item.status === 'Chờ xử lý').length,
      },
    ];
  }


  return [
    {
      icon: 'wallet-outline',
      label: 'Số dư ví',
      value: (data.dashboard?.wallet?.availableBalance || 0).toLocaleString('vi-VN'),
    },
    { icon: 'trophy-outline', label: 'Giải mở', value: data.dashboard?.businessSummary?.openTournamentCount || data.tournaments?.length || 0 },
    { icon: 'cash-outline', label: 'Kèo mở', value: data.markets?.length || data.dashboard?.businessSummary?.openBetMarketCount || 0 },
    {
      icon: 'ticket-outline',
      label: 'Tổng cược',
      value: (data.dashboard?.businessSummary?.totalBetStake || 0).toLocaleString('vi-VN'),
    },
  ];
}

function matchesQuery(item, query) {
  if (!query.trim()) return true;
  const normalized = query.trim().toLowerCase();
  return Object.values(item || {}).some((value) =>
    String(value || '').toLowerCase().includes(normalized),
  );
}

function Overview({ role, stats, data, query }) {
  const title =
    role === 'OWNER'
      ? 'Quản lý ngựa, đăng ký giải và lời mời jockey'
      : role === 'JOCKEY'
        ? 'Theo dõi lịch thi đấu và lời mời điều khiển ngựa'
        : role === 'REFEREE'
          ? 'Theo dõi race được phân công, check-in và lời mời trọng tài'
          : 'Xem giải đấu, tin tức và bảng xếp hạng ngựa';

  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.metricGrid}>
        {stats.map((item) => (
          <Metric key={item.label} item={item} />
        ))}
      </View>
      <Section title={role === 'OWNER' ? 'Giải đang mở đăng ký' : 'Tin nổi bật'}>
        {(role === 'OWNER' ? data.openTournaments : data.news)
          ?.filter((item) => matchesQuery(item, query))
          .slice(0, 3)
          .map((item) => (
          <ListItem
            key={item.id}
            icon={role === 'OWNER' ? 'trophy-outline' : 'newspaper-outline'}
            title={item.name || item.title}
            meta={role === 'OWNER' ? `${item.status} · ${item.openRaceCount || 0} race mở` : item.category}
          />
        ))}
        {!(role === 'OWNER' ? data.openTournaments : data.news)?.length ? (
          <EmptyText text="Chưa có dữ liệu." />
        ) : null}
      </Section>
      {role === 'REFEREE' ? (
        <Section title="Race sắp tới">
          {(data.dashboard?.upcomingRaces || data.races || [])
            .filter((race) => matchesQuery(race, query))
            .slice(0, 4)
            .map((race) => (
            <ListItem
              key={race.id}
              icon="flag-outline"
              title={race.name}
              meta={race.tournamentName || race.location || 'Chưa cập nhật địa điểm'}
              badge={race.status}
            />
          ))}
          {!(data.dashboard?.upcomingRaces || data.races)?.length ? (
            <EmptyText text="Chưa có race được phân công." />
          ) : null}
        </Section>
      ) : null}
      {role === 'JOCKEY' ? (
        <Section title="Thành tích gần đây">
          {(data.prizes || [])
            .filter((item) => matchesQuery(item, query))
            .slice(0, 4)
            .map((item) => (
              <ListItem
                key={item.id}
                icon="ribbon-outline"
                title={`${item.raceName} · Hạng ${item.position || '-'}`}
                meta={`${item.tournamentName} · ${item.horseName}`}
                badge={`${item.prizeAmount.toLocaleString('vi-VN')}đ`}
              />
            ))}
          {!data.prizes?.length ? <EmptyText text="Chưa có giải thưởng." /> : null}
        </Section>
      ) : null}
      {role === 'SPECTATOR' ? (
        <Section title="Kèo cược đang mở">
          {(data.markets || []).filter((item) => matchesQuery(item, query)).slice(0, 4).map((item) => (
            <ListItem
              key={item.id}
              icon="cash-outline"
              title={item.raceName}
              meta={`${item.tournamentName} · ${item.options.length} lựa chọn`}
              badge={`${item.minStake.toLocaleString('vi-VN')}đ+`}
            />
          ))}
          {!data.markets?.length ? <EmptyText text="Chưa có kèo cược đang mở." /> : null}
        </Section>
      ) : null}
      {role === 'SPECTATOR' ? (
        <Section title="Top ngựa nổi bật">
          {[...(data.horses || [])]
            .filter((horse) => matchesQuery(horse, query))
            .sort((a, b) => b.wins - a.wins)
            .slice(0, 4)
            .map((horse) => (
              <ListItem
                key={horse.id}
                icon="footsteps-outline"
                title={horse.name}
                meta={`${horse.ownerName || 'Chưa cập nhật chủ'} · ${horse.healthStatus}`}
                badge={`${horse.wins} thắng`}
              />
            ))}
          {!data.horses?.length ? <EmptyText text="Chưa có dữ liệu ngựa." /> : null}
        </Section>
      ) : null}
    </View>
  );
}

function Schedule({ role, data, query, onOwnerRegistrationWithdraw, onStartRace }) {
  if (role === 'OWNER') {
    return (
      <Section title="Đăng ký của chủ ngựa">
        {(data.registrations || []).filter((item) => matchesQuery(item, query)).map((item) => (
          <View key={item.id} style={styles.invitationItem}>
            <ListItem
              icon="reader-outline"
              title={item.tournamentName || item.raceName || 'Đăng ký'}
              meta={`${item.horseName || 'Chưa chọn ngựa'} · ${item.status}`}
              badge={item.jockeyName || 'Chưa có jockey'}
            />
            {item.canWithdraw ? (
              <View style={styles.invitationActions}>
                <Pressable
                  style={styles.secondaryAction}
                  onPress={() => onOwnerRegistrationWithdraw(item.id)}
                >
                  <Text style={styles.secondaryActionText}>Rút đăng ký</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
        {!data.registrations?.length ? <EmptyText text="Chưa có đăng ký nào." /> : null}
      </Section>
    );
  }

  if (role === 'JOCKEY') {
    return (
      <Section title="Lịch thi đấu của jockey">
        {(data.races || []).filter((item) => matchesQuery(item, query)).map((item) => (
          <ListItem
            key={item.id}
            icon="calendar-outline"
            title={item.raceName || item.tournamentName || 'Race'}
            meta={`${item.horseName || 'Ngựa'} · ${item.ownerName || 'Chủ ngựa'}`}
            badge={item.status}
          />
        ))}
        {!data.races?.length ? <EmptyText text="Chưa có lịch thi đấu." /> : null}
      </Section>
    );
  }

  if (role === 'REFEREE') {
    return (
      <Section title="Race được phân công">
        {(data.races || []).filter((item) => matchesQuery(item, query)).map((item) => (
          <View key={item.id} style={styles.invitationItem}>
            <ListItem
              icon="flag-outline"
              title={item.name}
              meta={`${item.tournamentName || 'Giải đấu'} · ${item.checkedInCount}/${item.participantCount} đã check-in`}
              badge={item.status}
            />
            {item.canStart ? (
              <View style={styles.invitationActions}>
                <Pressable style={styles.primaryAction} onPress={() => onStartRace(item.id)}>
                  <Text style={styles.primaryActionText}>Bắt đầu cuộc đua</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
        {!data.races?.length ? <EmptyText text="Chưa có race được phân công." /> : null}
      </Section>
    );
  }

  if (role === 'SPECTATOR') {
    return (
      <Section title="Kèo cược đang mở">
        {(data.markets || []).filter((item) => matchesQuery(item, query)).map((item) => (
          <ListItem
            key={item.id}
            icon="cash-outline"
            title={item.raceName}
            meta={`${item.tournamentName} · ${item.options.length} cửa cược`}
            badge={`${item.minStake.toLocaleString('vi-VN')}đ - ${item.maxStake.toLocaleString('vi-VN')}đ`}
          />
        ))}
        {!data.markets?.length ? <EmptyText text="Chưa có kèo cược đang mở." /> : null}
      </Section>
    );
  }

  return (
    <Section title={role === 'REFEREE' ? 'Giải đấu cần theo dõi' : 'Lịch giải đấu'}>
      {(data.tournaments || []).filter((item) => matchesQuery(item, query)).map((item) => (
        <ListItem
          key={item.id}
          icon="trophy-outline"
          title={item.name}
          meta={`${item.location} · ${item.raceCount} race`}
          badge={item.dateLabel}
        />
      ))}
      {!data.tournaments?.length ? <EmptyText text="Chưa có giải đấu." /> : null}
    </Section>
  );
}

function Tasks({
  role,
  data,
  query,
  onOwnerInvitationCancel,
  onInvitationResponse,
  onParticipantCheckIn,
  onRefereeInvitationResponse,
}) {
  if (role === 'OWNER') {
    return (
      <Section title="Lời mời jockey đã gửi">
        {(data.invitations || []).filter((item) => matchesQuery(item, query)).map((item) => (
          <View key={item.id} style={styles.invitationItem}>
            <ListItem
              icon="mail-outline"
              title={item.jockeyName || 'Jockey'}
              meta={`${item.horseName || 'Ngựa'} · ${item.tournamentName || item.raceLabel || 'Giải đấu'}`}
              badge={item.status}
            />
            {item.status === 'Chờ xử lý' ? (
              <View style={styles.invitationActions}>
                <Pressable
                  style={styles.secondaryAction}
                  onPress={() => onOwnerInvitationCancel(item.id)}
                >
                  <Text style={styles.secondaryActionText}>Hủy lời mời</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
        {!data.invitations?.length ? <EmptyText text="Chưa gửi lời mời jockey." /> : null}
      </Section>
    );
  }

  if (role === 'JOCKEY') {
    return (
      <Section title="Lời mời điều khiển ngựa">
        {(data.invitations || []).filter((item) => matchesQuery(item, query)).map((item) => (
          <View key={item.id} style={styles.invitationItem}>
            <ListItem
              icon="mail-unread-outline"
              title={item.horseName || 'Ngựa'}
              meta={`${item.ownerName || 'Chủ ngựa'} · ${item.tournamentName || 'Giải đấu'}`}
              badge={item.status}
            />
            {item.status === 'Chờ xử lý' ? (
              <View style={styles.invitationActions}>
                <Pressable
                  style={styles.secondaryAction}
                  onPress={() => onInvitationResponse(item.id, 'reject')}
                >
                  <Text style={styles.secondaryActionText}>Từ chối</Text>
                </Pressable>
                <Pressable
                  style={styles.primaryAction}
                  onPress={() => onInvitationResponse(item.id, 'accept')}
                >
                  <Text style={styles.primaryActionText}>Nhận lời</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
        {!data.invitations?.length ? <EmptyText text="Chưa có lời mời." /> : null}
      </Section>
    );
  }

  if (role === 'REFEREE') {
    return (
      <View>
        <Section title="Lời mời làm trọng tài">
          {(data.invitations || []).filter((item) => matchesQuery(item, query)).map((item) => (
            <View key={item.id} style={styles.invitationItem}>
              <ListItem
                icon="mail-unread-outline"
                title={item.raceName}
                meta={item.tournamentName || 'Giải đấu'}
                badge={item.status}
              />
              {item.status === 'Chờ xử lý' ? (
                <View style={styles.invitationActions}>
                  <Pressable
                    style={styles.secondaryAction}
                    onPress={() => onRefereeInvitationResponse(item.id, 'reject')}
                  >
                    <Text style={styles.secondaryActionText}>Từ chối</Text>
                  </Pressable>
                  <Pressable
                    style={styles.primaryAction}
                    onPress={() => onRefereeInvitationResponse(item.id, 'accept')}
                  >
                    <Text style={styles.primaryActionText}>Nhận lời</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
          {!data.invitations?.length ? <EmptyText text="Chưa có lời mời trọng tài." /> : null}
        </Section>

        <Section title="Thù lao trọng tài">
          {(data.payments || []).filter((payment) => matchesQuery(payment, query)).map((payment) => (
            <ListItem
              key={payment.raceId}
              icon="cash-outline"
              title={payment.raceName}
              meta={payment.tournamentName}
              badge={`${payment.amount.toLocaleString('vi-VN')}đ · ${payment.status}`}
            />
          ))}
          {!data.payments?.length ? <EmptyText text="Chưa có dữ liệu thù lao." /> : null}
        </Section>

        <Section title="Check-in participant">
          {(data.participants || []).filter((item) => matchesQuery(item, query)).slice(0, 12).map((item) => (
            <View key={item.id} style={styles.invitationItem}>
              <ListItem
                icon="checkmark-circle-outline"
                title={item.horseName}
                meta={`${item.raceName} · ${item.jockeyName || 'Jockey'} · Cổng ${item.gateNumber || '-'}`}
                badge={item.checkInStatus}
              />
              {item.canCheckIn ? (
                <View style={styles.invitationActions}>
                  <Pressable
                    style={styles.secondaryAction}
                    onPress={() => onParticipantCheckIn(item.raceId, item.id, 'ABSENT')}
                  >
                    <Text style={styles.secondaryActionText}>Vắng mặt</Text>
                  </Pressable>
                  <Pressable
                    style={styles.primaryAction}
                    onPress={() => onParticipantCheckIn(item.raceId, item.id, 'CHECKED_IN')}
                  >
                    <Text style={styles.primaryActionText}>Check-in</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
          {!data.participants?.length ? <EmptyText text="Chưa có participant cần check-in." /> : null}
        </Section>
      </View>
    );
  }

  if (role === 'SPECTATOR') {
    return (
      <View>
        <Section title="Vé cược của tôi">
          {(data.bets || [])
            .filter((item) => matchesQuery(item, query))
            .slice(0, 8)
            .map((item) => (
              <ListItem
                key={item.id}
                icon="ticket-outline"
                title={item.horseName}
                meta={`${item.raceName} · ${item.tournamentName}`}
                badge={`${item.stakeAmount.toLocaleString('vi-VN')}đ · ${item.status}`}
              />
            ))}
          {!data.bets?.length ? <EmptyText text="Chưa có vé cược." /> : null}
        </Section>

        <Section title="Tin tức mới">
          {(data.news || [])
            .filter((item) => matchesQuery(item, query))
            .slice(0, 6)
            .map((item) => (
              <ListItem
                key={item.id}
                icon="newspaper-outline"
                title={item.title}
                meta={item.category}
                badge={formatDate(item.publishedAt)}
              />
            ))}
          {!data.news?.length ? <EmptyText text="Chưa có tin tức." /> : null}
        </Section>

        <Section title="Thông báo gần đây">
          {(data.dashboard?.recentNotifications || [])
            .filter((item) => matchesQuery(item, query))
            .slice(0, 5)
            .map((item) => (
              <ListItem
                key={item.id}
                icon="notifications-outline"
                title={item.title}
                meta={item.message || 'Thông báo'}
                badge={item.read ? 'Đã đọc' : 'Mới'}
              />
            ))}
          {!data.dashboard?.recentNotifications?.length ? (
            <EmptyText text="Chưa có thông báo." />
          ) : null}
        </Section>
      </View>
    );
  }

  return (
    <Section title={role === 'REFEREE' ? 'Race cần kiểm tra' : 'Tin tức mới'}>
      {(role === 'REFEREE' ? data.tournaments : data.news)
        ?.filter((item) => matchesQuery(item, query))
        .slice(0, 6)
        .map((item) => (
        <ListItem
          key={item.id}
          icon={role === 'REFEREE' ? 'flag-outline' : 'newspaper-outline'}
          title={item.name || item.title}
          meta={role === 'REFEREE' ? item.status : item.category}
          badge={role === 'REFEREE' ? `${item.raceCount || 0} race` : formatDate(item.publishedAt)}
        />
      ))}
      {!(role === 'REFEREE' ? data.tournaments : data.news)?.length ? (
        <EmptyText text="Chưa có dữ liệu." />
      ) : null}
    </Section>
  );
}

function Account({ user, role, onLogout }) {
  const [form, setForm] = useState({
    fullName: displayName(user),
    phone: user?.phone || '',
    location: user?.location || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const name = form.fullName || displayName(user);

  async function saveProfile() {
    try {
      setSaving(true);
      setMessage('');
      const updated = await userService.updateProfile(form);
      setForm({
        fullName: updated?.fullName || updated?.name || form.fullName,
        phone: updated?.phone || '',
        location: updated?.location || '',
      });
      setMessage('Đã cập nhật hồ sơ.');
    } catch (requestError) {
      setMessage(requestError.message || 'Không cập nhật được hồ sơ.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <View style={styles.profileCard}>
        <View style={styles.largeAvatar}>
          <Text style={styles.largeAvatarText}>{initials(name)}</Text>
        </View>
        <Text style={styles.profileName}>{name}</Text>
        <Text style={styles.profileMeta}>{user?.email || 'Chưa cập nhật email'}</Text>
        <Text style={styles.rolePill}>{getRoleLabel(role)}</Text>
      </View>

      <Section title="Cập nhật hồ sơ">
        <ProfileField
          label="Họ và tên"
          value={form.fullName}
          onChangeText={(value) => setForm((current) => ({ ...current, fullName: value }))}
        />
        <ProfileField
          label="Số điện thoại"
          keyboardType="phone-pad"
          value={form.phone}
          onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
        />
        <ProfileField
          label="Địa điểm"
          value={form.location}
          onChangeText={(value) => setForm((current) => ({ ...current, location: value }))}
        />
        {message ? <Text style={styles.profileMessage}>{message}</Text> : null}
        <Pressable
          disabled={saving || !form.fullName.trim()}
          style={[styles.saveProfileButton, (saving || !form.fullName.trim()) && styles.disabledButton]}
          onPress={saveProfile}
        >
          <Text style={styles.saveProfileText}>{saving ? 'Đang lưu...' : 'Lưu hồ sơ'}</Text>
        </Pressable>
      </Section>

      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={18} color="#1D1705" />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </Pressable>
    </View>
  );
}

function ProfileField({ label, value, onChangeText, keyboardType = 'default' }) {
  return (
    <View style={styles.profileField}>
      <Text style={styles.profileLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholderTextColor={colors.darkTextMuted}
        style={styles.profileInput}
        value={value}
      />
    </View>
  );
}

function Metric({ item }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={item.icon} size={22} color={colors.primary} />
      <Text style={styles.metricValue}>{item.value}</Text>
      <Text style={styles.metricLabel}>{item.label}</Text>
    </View>
  );
}

function SearchBox({ query, onChangeQuery }) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search-outline" size={18} color={colors.darkTextMuted} />
      <TextInput
        onChangeText={onChangeQuery}
        placeholder="Tìm giải, race, ngựa, tin tức..."
        placeholderTextColor={colors.darkTextMuted}
        style={styles.searchInput}
        value={query}
      />
      {query ? (
        <Pressable hitSlop={10} onPress={() => onChangeQuery('')}>
          <Ionicons name="close-circle" size={18} color={colors.darkTextMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.panel}>{children}</View>
    </View>
  );
}

function ListItem({ icon, title, meta, badge }) {
  return (
    <View style={styles.listItem}>
      <View style={styles.itemIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.itemMain}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.itemMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function EmptyText({ text }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  app: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 4,
    color: colors.darkText,
    fontSize: 21,
    fontWeight: '900',
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: '#1D1705',
    fontSize: 14,
    fontWeight: '900',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refreshButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 13,
    backgroundColor: colors.darkSurface,
  },
  content: {
    paddingHorizontal: 15,
    paddingBottom: 24,
  },
  sectionTitle: {
    marginBottom: 14,
    color: colors.darkText,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 25,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 46,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 14,
    backgroundColor: colors.darkSurface,
    paddingHorizontal: 13,
  },
  searchInput: {
    flex: 1,
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metric: {
    width: '48%',
    minHeight: 118,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 16,
    backgroundColor: colors.darkSurface,
    padding: 14,
  },
  metricValue: {
    marginTop: 16,
    color: colors.darkText,
    fontSize: 24,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: 5,
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  section: {
    marginTop: 18,
  },
  sectionHeader: {
    marginBottom: 10,
    color: colors.darkText,
    fontSize: 16,
    fontWeight: '900',
  },
  panel: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 16,
    backgroundColor: colors.darkSurface,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 70,
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
  },
  invitationItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 13,
    paddingBottom: 13,
  },
  secondaryAction: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 12,
    paddingVertical: 11,
  },
  secondaryActionText: {
    color: colors.darkText,
    fontSize: 12,
    fontWeight: '900',
  },
  primaryAction: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingVertical: 11,
  },
  primaryActionText: {
    color: '#1D1705',
    fontSize: 12,
    fontWeight: '900',
  },
  itemIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.darkSurfaceSoft,
  },
  itemMain: {
    flex: 1,
  },
  itemTitle: {
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  itemMeta: {
    marginTop: 4,
    color: colors.darkTextMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  badge: {
    maxWidth: 98,
    borderRadius: 12,
    backgroundColor: '#3A2F1B',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  emptyText: {
    padding: 16,
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    marginTop: 10,
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    marginBottom: 12,
    color: '#FDA4AF',
    fontSize: 12,
    fontWeight: '700',
  },
  profileCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 18,
    backgroundColor: colors.darkSurface,
    padding: 24,
  },
  largeAvatar: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: colors.primary,
  },
  largeAvatarText: {
    color: '#1D1705',
    fontSize: 22,
    fontWeight: '900',
  },
  profileName: {
    marginTop: 14,
    color: colors.darkText,
    fontSize: 18,
    fontWeight: '900',
  },
  profileMeta: {
    marginTop: 5,
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  profileField: {
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
  },
  profileLabel: {
    color: colors.darkTextMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  profileInput: {
    minHeight: 42,
    marginTop: 7,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 12,
    backgroundColor: colors.darkSurfaceSoft,
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 12,
  },
  profileMessage: {
    paddingHorizontal: 13,
    paddingTop: 12,
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  saveProfileButton: {
    alignItems: 'center',
    margin: 13,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingVertical: 12,
  },
  saveProfileText: {
    color: '#1D1705',
    fontSize: 12,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.6,
  },
  rolePill: {
    marginTop: 14,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: colors.primary,
    color: '#1D1705',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingVertical: 14,
  },
  logoutText: {
    color: '#1D1705',
    fontSize: 13,
    fontWeight: '900',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.darkBorder,
    backgroundColor: colors.darkSurface,
    paddingTop: 9,
    paddingBottom: 12,
  },
  tab: {
    alignItems: 'center',
    minWidth: 68,
  },
  tabText: {
    marginTop: 4,
    color: colors.darkTextMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  activeTabText: {
    color: colors.primary,
  },
});
