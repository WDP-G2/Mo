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
import { newsService } from '../../services/newsService';
import { refereeService } from '../../services/refereeService';
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
    const [openTournaments, registrations, horses, invitations, news] = await Promise.all([
      tournamentService.listOwnerOpen(),
      tournamentService.listOwnerRegistrations(),
      horseService.listMine(),
      invitationService.listSent(),
      newsService.list(),
    ]);

    return { openTournaments, registrations, horses, invitations, news };
  }

  if (role === 'JOCKEY') {
    const [registrations, invitations, tournaments, news] = await Promise.all([
      tournamentService.listJockeyRegistrations(),
      invitationService.listMine(),
      tournamentService.list(),
      newsService.list(),
    ]);

    return { registrations, invitations, tournaments, news };
  }

  if (role === 'REFEREE') {
    const [dashboard, races, invitations, payments, news] = await Promise.all([
      refereeService.getDashboard(),
      refereeService.listRaces(),
      refereeService.listInvitations(),
      refereeService.listPayments(),
      newsService.list(),
    ]);

    return { dashboard, races, invitations, payments, news };
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
      const updated = await invitationService.respond(id, action);
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
            {activeTab === 'overview' ? <Overview role={role} stats={stats} data={data} /> : null}
            {activeTab === 'schedule' ? <Schedule role={role} data={data} /> : null}
            {activeTab === 'tasks' ? (
              <Tasks
                role={role}
                data={data}
                onInvitationResponse={handleInvitationResponse}
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
      { icon: 'reader-outline', label: 'Đăng ký', value: data.registrations?.length || 0 },
      { icon: 'mail-outline', label: 'Lời mời jockey', value: data.invitations?.length || 0 },
    ];
  }

  if (role === 'JOCKEY') {
    return [
      { icon: 'calendar-outline', label: 'Lịch được phân', value: data.registrations?.length || 0 },
      {
        icon: 'mail-unread-outline',
        label: 'Lời mời chờ',
        value: (data.invitations || []).filter((item) => item.status === 'Chờ xử lý').length,
      },
      { icon: 'trophy-outline', label: 'Giải đấu', value: data.tournaments?.length || 0 },
      { icon: 'newspaper-outline', label: 'Tin mới', value: data.news?.length || 0 },
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
    { icon: 'trophy-outline', label: 'Giải đấu', value: data.tournaments?.length || 0 },
    { icon: 'footsteps-outline', label: 'Ngựa đua', value: data.horses?.length || 0 },
    { icon: 'newspaper-outline', label: 'Tin tức', value: data.news?.length || 0 },
    {
      icon: role === 'REFEREE' ? 'shield-checkmark-outline' : 'eye-outline',
      label: role === 'REFEREE' ? 'Theo dõi race' : 'Theo dõi',
      value: role === 'REFEREE' ? data.tournaments?.length || 0 : data.news?.length || 0,
    },
  ];
}

function Overview({ role, stats, data }) {
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
        {(role === 'OWNER' ? data.openTournaments : data.news)?.slice(0, 3).map((item) => (
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
          {(data.dashboard?.upcomingRaces || data.races || []).slice(0, 4).map((race) => (
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
      {role === 'SPECTATOR' ? (
        <Section title={role === 'REFEREE' ? 'Ngựa cần kiểm tra hồ sơ' : 'Top ngựa nổi bật'}>
          {[...(data.horses || [])]
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

function Schedule({ role, data }) {
  if (role === 'OWNER') {
    return (
      <Section title="Đăng ký của chủ ngựa">
        {(data.registrations || []).map((item) => (
          <ListItem
            key={item.id}
            icon="reader-outline"
            title={item.tournamentName || item.raceName || 'Đăng ký'}
            meta={`${item.horseName || 'Chưa chọn ngựa'} · ${item.status}`}
            badge={item.jockeyName || 'Chưa có jockey'}
          />
        ))}
        {!data.registrations?.length ? <EmptyText text="Chưa có đăng ký nào." /> : null}
      </Section>
    );
  }

  if (role === 'JOCKEY') {
    return (
      <Section title="Lịch thi đấu của jockey">
        {(data.registrations || []).map((item) => (
          <ListItem
            key={item.id}
            icon="calendar-outline"
            title={item.raceName || item.tournamentName || 'Race'}
            meta={`${item.horseName || 'Ngựa'} · ${item.ownerName || 'Chủ ngựa'}`}
            badge={item.raceDate || item.raceStatus || item.status}
          />
        ))}
        {!data.registrations?.length ? <EmptyText text="Chưa có lịch thi đấu." /> : null}
      </Section>
    );
  }

  if (role === 'REFEREE') {
    return (
      <Section title="Race được phân công">
        {(data.races || []).map((item) => (
          <ListItem
            key={item.id}
            icon="flag-outline"
            title={item.name}
            meta={`${item.tournamentName || 'Giải đấu'} · ${item.pendingCheckInCount} chờ check-in`}
            badge={item.status}
          />
        ))}
        {!data.races?.length ? <EmptyText text="Chưa có race được phân công." /> : null}
      </Section>
    );
  }

  return (
    <Section title={role === 'REFEREE' ? 'Giải đấu cần theo dõi' : 'Lịch giải đấu'}>
      {(data.tournaments || []).map((item) => (
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

function Tasks({ role, data, onInvitationResponse, onRefereeInvitationResponse }) {
  if (role === 'OWNER') {
    return (
      <Section title="Lời mời jockey đã gửi">
        {(data.invitations || []).map((item) => (
          <ListItem
            key={item.id}
            icon="mail-outline"
            title={item.jockeyName || 'Jockey'}
            meta={`${item.horseName || 'Ngựa'} · ${item.tournamentName || 'Giải đấu'}`}
            badge={item.status}
          />
        ))}
        {!data.invitations?.length ? <EmptyText text="Chưa gửi lời mời jockey." /> : null}
      </Section>
    );
  }

  if (role === 'JOCKEY') {
    return (
      <Section title="Lời mời điều khiển ngựa">
        {(data.invitations || []).map((item) => (
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
          {(data.invitations || []).map((item) => (
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
          {(data.payments || []).map((payment) => (
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
      </View>
    );
  }

  return (
    <Section title={role === 'REFEREE' ? 'Race cần kiểm tra' : 'Tin tức mới'}>
      {(role === 'REFEREE' ? data.tournaments : data.news)?.slice(0, 6).map((item) => (
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
