import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../../../constants/theme';
import { ownerService } from '../../../services/ownerService';
import { userService } from '../../../services/userService';
import { walletService } from '../../../services/walletService';
import { getRoleLabel } from '../../../utils/role';
import { displayName, formatDate, initials, matchesQuery } from '../roleData';
import { EmptyText, ListItem, Metric, ProfileField, Section } from './RolePrimitives';

LocaleConfig.locales.vi = {
  monthNames: [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ],
  monthNamesShort: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
  dayNames: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
  dayNamesShort: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  today: 'Hôm nay',
};
LocaleConfig.defaultLocale = 'vi';

function acceptedInvitation(item) {
  return item.status === 'Đã chấp nhận' || item.status === 'ACCEPTED';
}

function pendingInvitation(item) {
  return item.status === 'Chờ xử lý' || item.status === 'PENDING';
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

function formatDateTime(value) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('vi-VN');
}

function toCalendarDateKey(value) {
  if (!value) return '';
  const raw = String(value);
  const isoDate = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function jockeyScheduleStart(item) {
  if (item?.scheduledStartAt) return item.scheduledStartAt;
  if (item?.raceDate && item?.raceTime) return `${item.raceDate}T${item.raceTime}`;
  return item?.raceDate || '';
}

function jockeyInvitationStatusCode(item) {
  const status = String(item?.status || '').trim().toUpperCase();
  if (status === 'CHỜ XỬ LÝ') return 'PENDING';
  if (status === 'ĐÃ CHẤP NHẬN') return 'ACCEPTED';
  if (status === 'ĐÃ TỪ CHỐI') return 'REJECTED';
  if (status === 'ĐÃ HỦY') return 'CANCELLED';
  return status;
}

function isUpcomingJockeyInvitation(item) {
  if (jockeyInvitationStatusCode(item) !== 'ACCEPTED') return false;
  const timestamp = new Date(jockeyScheduleStart(item)).getTime();
  return Number.isFinite(timestamp) && timestamp >= Date.now();
}

const jockeyTaskFilters = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'UPCOMING', label: 'Sắp tới' },
  { key: 'PENDING', label: 'Chờ phản hồi' },
  { key: 'ACCEPTED', label: 'Đã chấp nhận' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

function buildJockeyScheduleItems(data) {
  const raceItems = (data.races || []).map((item) => ({
    ...item,
    detailType: 'race',
    detailTitle: item.raceName || item.name || item.tournamentName || 'Race',
  }));
  const raceKeys = new Set(raceItems.map((item) => String(item.raceId || item.id || '')));
  const acceptedItems = (data.invitations || [])
    .filter(acceptedInvitation)
    .filter((item) => !raceKeys.has(String(item.raceId || item.id || '')))
    .map((item) => ({
      ...item,
      id: `invitation-${item.id}`,
      originalInvitationId: item.id,
      detailType: 'invitation',
      detailTitle: item.raceLabel || item.tournamentName || 'Lịch dự kiến',
      raceName: item.raceLabel || 'Race',
      status: 'Đã chấp nhận',
      scheduledStartAt: jockeyScheduleStart(item),
    }));

  return [...raceItems, ...acceptedItems];
}

function buildCalendarMarks(datedItems, selectedDate) {
  const markedDates = {};

  datedItems.forEach(({ dateKey }) => {
    markedDates[dateKey] = {
      customStyles: {
        container: {
          backgroundColor: '#991B1B',
          borderWidth: selectedDate === dateKey ? 2 : 0,
          borderColor: colors.primary,
        },
        text: { color: '#FFFFFF', fontWeight: '900' },
      },
    };
  });

  if (selectedDate && !markedDates[selectedDate]) {
    markedDates[selectedDate] = {
      customStyles: {
        container: { backgroundColor: colors.primary },
        text: { color: '#1D1705', fontWeight: '900' },
      },
    };
  }

  return markedDates;
}

function RaceCalendar({ datedItems, firstDate, selectedDate, onSelectDate }) {
  return (
    <View style={styles.jockeyCalendarPanel}>
      <Calendar
        current={selectedDate || firstDate}
        firstDay={1}
        markedDates={buildCalendarMarks(datedItems, selectedDate)}
        markingType="custom"
        onDayPress={(day) => onSelectDate(day.dateString)}
        theme={{
          calendarBackground: colors.darkSurface,
          monthTextColor: colors.darkText,
          textSectionTitleColor: colors.darkTextMuted,
          dayTextColor: colors.darkText,
          textDisabledColor: '#475569',
          arrowColor: colors.primary,
          todayTextColor: colors.primary,
          textDayFontWeight: '700',
          textMonthFontWeight: '900',
          textDayHeaderFontWeight: '800',
        }}
      />
      <View style={styles.calendarLegend}>
        <View style={styles.calendarLegendDot} />
        <Text style={styles.calendarLegendText}>Ngày có chặng đua</Text>
      </View>
    </View>
  );
}

function violationSignature(item) {
  return [
    item?.raceId,
    item?.participantId,
    item?.horseName || item?.horse,
    item?.jockeyName || item?.jockey,
    item?.type,
    item?.severity,
    item?.penalty,
    item?.description,
  ].map((value) => String(value || '').trim()).join('|');
}

function dedupeViolations(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const key = item?.id ? `id:${item.id}` : `sig:${violationSignature(item)}`;
    const contentKey = `sig:${violationSignature(item)}`;
    if (seen.has(key) || seen.has(contentKey)) return false;
    seen.add(key);
    seen.add(contentKey);
    return true;
  });
}

function violationEvidenceCount(item) {
  return (item?.evidence || []).filter((ev) => ev?.url).length + (item?.imageFile?.uri ? 1 : 0);
}

function violationEvidenceUris(item) {
  return [
    ...(item?.evidence || []).map((ev) => ev?.url).filter(Boolean),
    item?.imageFile?.uri,
  ].filter(Boolean);
}

function ViolationEvidencePreview({ item }) {
  const uris = violationEvidenceUris(item);
  if (!uris.length) return null;

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.detailSectionTitle}>Ảnh bằng chứng</Text>
      {uris.map((uri, index) => (
        <Image
          key={`${uri}-${index}`}
          source={{ uri }}
          style={{ width: '100%', height: 180, borderRadius: 10, resizeMode: 'cover', marginTop: 8 }}
        />
      ))}
    </View>
  );
}

export function Overview({
  role,
  stats,
  data,
  query,
  onOpenDepositModal,
  onOpenHorseModal,
  onOpenInviteModal,
  onOpenRegisterModal,
  onOpenBetModal,
  onStatPress,
}) {
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
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
          <Metric key={item.label} item={item} onPress={() => onStatPress?.(item.id)} />
        ))}
      </View>

      {role === 'SPECTATOR' && (
        <View style={styles.quickActionsRow}>
          <Pressable style={styles.primaryActionButton} onPress={onOpenDepositModal}>
            <Ionicons name="wallet-outline" size={16} color="#1D1705" />
            <Text style={styles.primaryActionTextButton}>Nạp tiền ví</Text>
          </Pressable>
        </View>
      )}

      {role === 'OWNER' && (
        <View style={styles.quickActionsRow}>
          <Pressable style={[styles.primaryActionButton, { flex: 1 }]} onPress={onOpenHorseModal}>
            <Ionicons name="add-circle-outline" size={16} color="#1D1705" />
            <Text style={styles.primaryActionTextButton}>Thêm Ngựa</Text>
          </Pressable>
          <Pressable style={[styles.primaryActionButton, { flex: 1.2 }]} onPress={onOpenInviteModal}>
            <Ionicons name="mail-outline" size={16} color="#1D1705" />
            <Text style={styles.primaryActionTextButton}>Mời Jockey</Text>
          </Pressable>
          <Pressable style={[styles.primaryActionButton, { flex: 1.3 }]} onPress={onOpenRegisterModal}>
            <Ionicons name="trophy-outline" size={16} color="#1D1705" />
            <Text style={styles.primaryActionTextButton}>Đăng ký giải</Text>
          </Pressable>
        </View>
      )}

      <Section title={role === 'OWNER' ? 'Giải đang mở đăng ký' : 'Tin nổi bật'}>
        {(role === 'OWNER' ? data.openTournaments : data.news)
          ?.filter((item) => matchesQuery(item, query))
          .slice(0, 3)
          .map((item) =>
            role === 'OWNER' ? (
              <Pressable key={item.id} onPress={() => setSelectedTournament(item)}>
                <ListItem
                  icon="trophy-outline"
                  title={item.name}
                  meta={`${item.status} · ${item.openRaceCount || 0} race mở`}
                />
              </Pressable>
            ) : (
              <ListItem
                key={item.id}
                icon="newspaper-outline"
                title={item.title}
                meta={item.category}
              />
            ),
          )}
        {!(role === 'OWNER' ? data.openTournaments : data.news)?.length ? (
          <EmptyText text="Chưa có dữ liệu." />
        ) : null}
      </Section>

      {role === 'OWNER' ? (
        <Section title="Kết quả gần đây">
          {(data.results?.results || [])
            .filter((item) => matchesQuery(item, query))
            .slice(0, 4)
            .map((item) => (
              <Pressable key={item.id} onPress={() => setSelectedResult(item)}>
                <ListItem
                  icon={Number(item.position) === 1 ? 'trophy-outline' : 'ribbon-outline'}
                  title={`${item.horseName || 'Ngựa'} · Hạng ${item.position || '-'}`}
                  meta={`${item.tournamentName || 'Giải đấu'} · ${item.raceName || 'Race'}`}
                  badge={formatMoney(item.prizeAmount)}
                />
              </Pressable>
            ))}
          {!data.results?.results?.length ? (
            <EmptyText text="Chưa có kết quả thi đấu đã xác nhận." />
          ) : null}
        </Section>
      ) : null}

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
        <Section title="Kèo cược đang mở (Nhấn vào để đặt cược)">
          {(data.markets || []).filter((item) => matchesQuery(item, query)).slice(0, 4).map((item) => (
            <Pressable key={item.id} onPress={() => onOpenBetModal(item)}>
              <ListItem
                icon="cash-outline"
                title={item.raceName}
                meta={`${item.tournamentName} · ${item.options.length} lựa chọn`}
                badge={`${item.minStake.toLocaleString('vi-VN')}đ+`}
              />
            </Pressable>
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

      <OwnerDetailModal
        item={selectedTournament}
        type="tournament"
        onClose={() => setSelectedTournament(null)}
      />
      <OwnerDetailModal
        item={selectedResult}
        type="result"
        onClose={() => setSelectedResult(null)}
      />
    </View>
  );
}

export function Schedule({
  role,
  data,
  query,
  onOwnerRegistrationWithdraw,
  onStartRace,
  onOpenBetModal,
  onOpenRefereeRaceModal,
  onOpenViolationModal,
  onParticipantCheckIn,
  onUpdateGate,
  onRandomizeGates,
}) {
  const [selectedScheduleItem, setSelectedScheduleItem] = useState(null);
  const [selectedRaceDetail, setSelectedRaceDetail] = useState(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const jockeyScheduleItems = role === 'JOCKEY' ? buildJockeyScheduleItems(data) : [];
  const datedJockeyScheduleItems = jockeyScheduleItems
    .map((item) => ({
      item,
      dateKey: toCalendarDateKey(jockeyScheduleStart(item)),
      timestamp: new Date(jockeyScheduleStart(item)).getTime(),
    }))
    .filter((entry) => entry.dateKey)
    .sort((first, second) => first.timestamp - second.timestamp);
  const firstUpcomingJockeyDate =
    datedJockeyScheduleItems.find((entry) => entry.timestamp >= Date.now())?.dateKey ||
    datedJockeyScheduleItems[0]?.dateKey ||
    toCalendarDateKey(new Date());
  const ownerScheduleItems = role === 'OWNER' ? data.registrations || [] : [];
  const datedOwnerScheduleItems = ownerScheduleItems
    .map((item) => ({
      item,
      dateKey: toCalendarDateKey(item.raceScheduledAt),
      timestamp: new Date(item.raceScheduledAt).getTime(),
    }))
    .filter((entry) => entry.dateKey)
    .sort((first, second) => first.timestamp - second.timestamp);
  const firstUpcomingOwnerDate =
    datedOwnerScheduleItems.find((entry) => entry.timestamp >= Date.now())?.dateKey ||
    datedOwnerScheduleItems[0]?.dateKey ||
    toCalendarDateKey(new Date());

  useEffect(() => {
    if (selectedCalendarDate) return;
    if (role === 'JOCKEY') setSelectedCalendarDate(firstUpcomingJockeyDate);
    if (role === 'OWNER') setSelectedCalendarDate(firstUpcomingOwnerDate);
  }, [firstUpcomingJockeyDate, firstUpcomingOwnerDate, role, selectedCalendarDate]);

  if (role === 'OWNER') {
    const selectedDateRegistrations = ownerScheduleItems
      .filter((item) => toCalendarDateKey(item.raceScheduledAt) === selectedCalendarDate)
      .filter((item) => matchesQuery(item, query))
      .sort(
        (first, second) =>
          new Date(first.raceScheduledAt).getTime() - new Date(second.raceScheduledAt).getTime(),
      );
    const unscheduledRegistrations = ownerScheduleItems
      .filter((item) => !toCalendarDateKey(item.raceScheduledAt))
      .filter((item) => matchesQuery(item, query));
    const renderRegistration = (item) => (
      <View key={item.id} style={styles.invitationItem}>
        <Pressable onPress={() => setSelectedScheduleItem(item)}>
          <ListItem
            icon="reader-outline"
            title={item.raceName || item.tournamentName || 'Đăng ký'}
            meta={`${item.horseName || 'Chưa chọn ngựa'} · ${item.jockeyName || 'Chưa có jockey'} · ${formatDateTime(item.raceScheduledAt)}`}
            badge={item.status}
          />
        </Pressable>
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
    );

    return (
      <View>
        <Text style={styles.sectionTitle}>Lịch thi đấu của chủ ngựa</Text>
        <RaceCalendar
          datedItems={datedOwnerScheduleItems}
          firstDate={firstUpcomingOwnerDate}
          selectedDate={selectedCalendarDate}
          onSelectDate={setSelectedCalendarDate}
        />

        <Section title={`Chặng đua ngày ${selectedCalendarDate || 'đã chọn'}`}>
          {selectedDateRegistrations.map(renderRegistration)}
          {!selectedDateRegistrations.length ? (
            <EmptyText text="Ngày này chưa có chặng đua đã đăng ký." />
          ) : null}
        </Section>

        {unscheduledRegistrations.length ? (
          <Section title="Đăng ký chưa có lịch thi đấu">
            {unscheduledRegistrations.map(renderRegistration)}
          </Section>
        ) : null}
        <OwnerDetailModal
          item={selectedScheduleItem}
          type="registration"
          onClose={() => setSelectedScheduleItem(null)}
        />
      </View>
    );
  }

  if (role === 'JOCKEY') {
    const selectedDateItems = jockeyScheduleItems
      .filter((item) => toCalendarDateKey(jockeyScheduleStart(item)) === selectedCalendarDate)
      .filter((item) => matchesQuery(item, query))
      .sort(
        (first, second) =>
          new Date(jockeyScheduleStart(first)).getTime() -
          new Date(jockeyScheduleStart(second)).getTime(),
      );

    return (
      <View>
        <Text style={styles.sectionTitle}>Lịch thi đấu của jockey</Text>
        <RaceCalendar
          datedItems={datedJockeyScheduleItems}
          firstDate={firstUpcomingJockeyDate}
          selectedDate={selectedCalendarDate}
          onSelectDate={setSelectedCalendarDate}
        />

        <Section title={`Chặng đua ngày ${selectedCalendarDate || 'đã chọn'}`}>
          {selectedDateItems.map((item) => (
            <Pressable key={item.id} onPress={() => setSelectedScheduleItem(item)}>
              <ListItem
                icon="calendar-outline"
                title={item.raceName || item.raceLabel || item.tournamentName || 'Race'}
                meta={`${formatDateTime(jockeyScheduleStart(item))} · ${item.horseName || 'Ngựa'} · ${item.ownerName || 'Chủ ngựa'}`}
                badge={item.status}
              />
            </Pressable>
          ))}
          {!selectedDateItems.length ? (
            <EmptyText text="Ngày này chưa có chặng đua." />
          ) : null}
        </Section>
        <JockeyDetailModal
          item={selectedScheduleItem}
          title="Chi tiết lịch thi đấu"
          onClose={() => setSelectedScheduleItem(null)}
        />
      </View>
    );
  }

  if (role === 'REFEREE') {
    return (
      <Section title="Race được phân công">
        {(data.races || []).filter((item) => matchesQuery(item, query)).map((item) => (
          <View key={item.id} style={styles.invitationItem}>
            <Pressable onPress={() => setSelectedRaceDetail(item)}>
              <ListItem
                icon="flag-outline"
                title={item.name}
                meta={`${item.tournamentName || 'Giải đấu'} · ${item.checkedInCount}/${item.participantCount} đã check-in`}
                badge={item.status}
              />
            </Pressable>
            {item.canStart ? (
              <View style={styles.invitationActions}>
                <Pressable style={styles.primaryAction} onPress={() => onStartRace(item.id)}>
                  <Text style={styles.primaryActionText}>Bắt đầu cuộc đua</Text>
                </Pressable>
              </View>
            ) : null}
            {item.statusCode === 'ONGOING' || item.status === 'Đang chạy' || item.status === 'Đang diễn ra' ? (
              <View style={styles.invitationActions}>
                <Pressable style={styles.primaryAction} onPress={() => onOpenRefereeRaceModal(item)}>
                  <Text style={styles.primaryActionText}>Mô phỏng & Chốt kết quả</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.invitationActions}>
              <Pressable style={styles.secondaryAction} onPress={() => onOpenViolationModal(item)}>
                <Text style={styles.secondaryActionText}>Báo cáo vi phạm</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {!data.races?.length ? <EmptyText text="Chưa có race được phân công." /> : null}

        <RefereeRaceDetailModal
          race={selectedRaceDetail}
          data={data}
          onClose={() => setSelectedRaceDetail(null)}
          onParticipantCheckIn={onParticipantCheckIn}
          onOpenViolationModal={onOpenViolationModal}
          onStartRace={onStartRace}
          onOpenRefereeRaceModal={onOpenRefereeRaceModal}
          onUpdateGate={onUpdateGate}
          onRandomizeGates={onRandomizeGates}
        />
      </Section>
    );
  }

  if (role === 'SPECTATOR') {
    return (
      <Section title="Kèo cược đang mở (Nhấn vào để đặt cược)">
        {(data.markets || []).filter((item) => matchesQuery(item, query)).map((item) => (
          <Pressable key={item.id} onPress={() => onOpenBetModal(item)}>
            <ListItem
              icon="cash-outline"
              title={item.raceName}
              meta={`${item.tournamentName} · ${item.options.length} cửa cược`}
              badge={`${item.minStake.toLocaleString('vi-VN')}đ - ${item.maxStake.toLocaleString('vi-VN')}đ`}
            />
          </Pressable>
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

export function RefereeCalendar({
  data,
  query,
  onParticipantCheckIn,
  onOpenViolationModal,
  onStartRace,
  onOpenRefereeRaceModal,
  onUpdateGate,
  onRandomizeGates,
}) {
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [selectedRace, setSelectedRace] = useState(null);
  const scheduledRaces = (data.races || [])
    .map((item) => ({
      item,
      dateKey: toCalendarDateKey(item.scheduledStartAt),
      timestamp: new Date(item.scheduledStartAt).getTime(),
    }))
    .filter((entry) => entry.dateKey)
    .sort((first, second) => first.timestamp - second.timestamp);
  const firstRaceDate =
    scheduledRaces.find((entry) => entry.timestamp >= Date.now())?.dateKey ||
    scheduledRaces[0]?.dateKey ||
    toCalendarDateKey(new Date());

  useEffect(() => {
    if (!selectedCalendarDate) setSelectedCalendarDate(firstRaceDate);
  }, [firstRaceDate, selectedCalendarDate]);

  const selectedDateRaces = scheduledRaces
    .filter((entry) => entry.dateKey === selectedCalendarDate)
    .map((entry) => entry.item)
    .filter((item) => matchesQuery(item, query));

  return (
    <View>
      <Text style={styles.sectionTitle}>Lịch phân công trọng tài</Text>
      <RaceCalendar
        datedItems={scheduledRaces}
        firstDate={firstRaceDate}
        selectedDate={selectedCalendarDate}
        onSelectDate={setSelectedCalendarDate}
      />

      <Section title={`Chặng đua ngày ${selectedCalendarDate || 'đã chọn'}`}>
        {selectedDateRaces.map((item) => (
          <Pressable key={item.id} onPress={() => setSelectedRace(item)}>
            <ListItem
              icon="flag-outline"
              title={item.name || 'Cuộc đua'}
              meta={`${formatDateTime(item.scheduledStartAt)} · ${item.tournamentName || 'Giải đấu'} · ${item.location || 'Chưa cập nhật địa điểm'}`}
              badge={item.status}
            />
          </Pressable>
        ))}
        {!selectedDateRaces.length ? (
          <EmptyText text="Ngày này chưa có chặng đua được phân công." />
        ) : null}
      </Section>

      <RefereeRaceDetailModal
        race={selectedRace}
        data={data}
        onClose={() => setSelectedRace(null)}
        onParticipantCheckIn={onParticipantCheckIn}
        onOpenViolationModal={onOpenViolationModal}
        onStartRace={onStartRace}
        onOpenRefereeRaceModal={onOpenRefereeRaceModal}
        onUpdateGate={onUpdateGate}
        onRandomizeGates={onRandomizeGates}
      />
    </View>
  );
}

const horseApprovalFilters = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'APPROVED', label: 'Duyệt' },
  { key: 'PENDING', label: 'Chưa duyệt' },
];

function horseApproved(horse) {
  return horse.approvalStatus === 'APPROVED' || horse.statusCode === 'APPROVED';
}

function horseApprovalLabel(horse) {
  return horseApproved(horse) ? 'Duyệt' : 'Chưa duyệt';
}

export function Horses({ data, query, onOpenHorseModal, onEditHorse, onDeleteHorse }) {
  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [selectedHorse, setSelectedHorse] = useState(null);
  const horses = (data.horses || [])
    .filter((item) => matchesQuery(item, query))
    .filter((item) => {
      if (approvalFilter === 'ALL') return true;
      if (approvalFilter === 'APPROVED') return horseApproved(item);
      return !horseApproved(item);
    });

  return (
    <View>
      <Text style={styles.sectionTitle}>Danh sách ngựa của tôi</Text>

      <View style={styles.quickActionsRow}>
        <Pressable style={styles.primaryActionButton} onPress={onOpenHorseModal}>
          <Ionicons name="add-circle-outline" size={16} color="#1D1705" />
          <Text style={styles.primaryActionTextButton}>Thêm ngựa</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {horseApprovalFilters.map((item) => {
          const active = approvalFilter === item.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setApprovalFilter(item.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Section title={`${horses.length} ngựa đang quản lý`}>
        {horses.map((horse) => (
          <View key={horse.id} style={styles.horseRow}>
            <Pressable style={styles.horseAvatar} onPress={() => setSelectedHorse(horse)}>
              {horse.imageUrl ? (
                <Image source={{ uri: horse.imageUrl }} style={styles.horseAvatarImage} />
              ) : (
                <Ionicons name="footsteps-outline" size={22} color={colors.primary} />
              )}
            </Pressable>

            <View style={styles.horseInfo}>
              <Pressable onPress={() => setSelectedHorse(horse)}>
                <Text style={styles.horseName} numberOfLines={1}>
                  {horse.name || 'Ngựa chưa đặt tên'}
                </Text>
                <Text style={styles.horseMeta} numberOfLines={1}>
                  {[
                    horse.breed || 'Chưa cập nhật giống',
                    horse.age ? `${horse.age} tuổi` : '',
                    horse.color || '',
                  ].filter(Boolean).join(' · ')}
                </Text>
              </Pressable>
              <View style={styles.horseActions}>
                <Pressable style={styles.horseActionButton} onPress={() => onEditHorse(horse)}>
                  <Ionicons name="create-outline" size={13} color={colors.darkText} />
                  <Text style={styles.horseActionText}>Sửa</Text>
                </Pressable>
                <Pressable style={[styles.horseActionButton, styles.deleteHorseButton]} onPress={() => onDeleteHorse(horse)}>
                  <Ionicons name="trash-outline" size={13} color="#FDA4AF" />
                  <Text style={[styles.horseActionText, styles.deleteHorseText]}>Xóa</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.approvalBadge, horseApproved(horse) && styles.approvalBadgeApproved]}>
              <Text style={[styles.approvalBadgeText, horseApproved(horse) && styles.approvalBadgeTextApproved]}>
                {horseApprovalLabel(horse)}
              </Text>
            </View>
          </View>
        ))}
        {!horses.length ? <EmptyText text="Chưa có ngựa hoặc không khớp tìm kiếm." /> : null}
      </Section>
      <OwnerDetailModal item={selectedHorse} type="horse" onClose={() => setSelectedHorse(null)} />
    </View>
  );
}

export function Tasks({
  role,
  data,
  query,
  onOwnerInvitationCancel,
  onInvitationResponse,
  onParticipantCheckIn,
  onRefereeInvitationResponse,
  onOpenViolationModal,
  onStartRace,
  onOpenRefereeRaceModal,
  onUpdateGate,
  onRandomizeGates,
}) {
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [selectedRaceDetail, setSelectedRaceDetail] = useState(null);
  const [jockeyTaskFilter, setJockeyTaskFilter] = useState('ALL');

  if (role === 'OWNER') {
    return (
      <Section title="Lời mời jockey đã gửi">
        {(data.invitations || []).filter((item) => matchesQuery(item, query)).map((item) => (
          <View key={item.id} style={styles.invitationItem}>
            <Pressable onPress={() => setSelectedInvitation(item)}>
              <ListItem
                icon="mail-outline"
                title={item.jockeyName || 'Jockey'}
                meta={`${item.horseName || 'Ngựa'} · ${item.tournamentName || item.raceLabel || 'Giải đấu'}`}
                badge={item.status}
              />
            </Pressable>
            {item.responseNote ? (
              <Text style={styles.responseNoteText}>Lý do/ghi chú: {item.responseNote}</Text>
            ) : null}
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
        <OwnerDetailModal
          item={selectedInvitation}
          type="invitation"
          onClose={() => setSelectedInvitation(null)}
        />
      </Section>
    );
  }

  if (role === 'JOCKEY') {
    const filteredJockeyInvitations = (data.invitations || [])
      .filter((item) => matchesQuery(item, query))
      .filter((item) => {
        if (jockeyTaskFilter === 'ALL') return true;
        if (jockeyTaskFilter === 'UPCOMING') return isUpcomingJockeyInvitation(item);
        return jockeyInvitationStatusCode(item) === jockeyTaskFilter;
      })
      .sort((first, second) => {
        const firstUpcoming = isUpcomingJockeyInvitation(first);
        const secondUpcoming = isUpcomingJockeyInvitation(second);
        if (firstUpcoming !== secondUpcoming) return firstUpcoming ? -1 : 1;

        const firstTime = new Date(jockeyScheduleStart(first) || first.sentAt || 0).getTime();
        const secondTime = new Date(jockeyScheduleStart(second) || second.sentAt || 0).getTime();
        if (firstUpcoming && secondUpcoming) return firstTime - secondTime;
        return secondTime - firstTime;
      });

    return (
      <Section title="Lời mời điều khiển ngựa">
        <ScrollView
          horizontal={true}
          contentContainerStyle={styles.taskFilterRow}
          showsHorizontalScrollIndicator={false}
        >
          {jockeyTaskFilters.map((filter) => {
            const active = jockeyTaskFilter === filter.key;
            return (
              <Pressable
                key={filter.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setJockeyTaskFilter(filter.key)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {filteredJockeyInvitations.map((item) => (
          <View key={item.id} style={styles.invitationItem}>
            <Pressable onPress={() => setSelectedInvitation(item)}>
              <ListItem
                icon="mail-unread-outline"
                title={item.horseName || 'Ngựa'}
                meta={`${item.ownerName || 'Chủ ngựa'} · ${item.tournamentName || 'Giải đấu'} · ${formatDateTime(jockeyScheduleStart(item))}`}
                badge={isUpcomingJockeyInvitation(item) ? 'Sắp tới' : item.status}
              />
            </Pressable>
            {pendingInvitation(item) ? (
              <View style={styles.invitationActions}>
                <Pressable
                  style={styles.secondaryAction}
                  onPress={() => setSelectedInvitation(item)}
                >
                  <Text style={styles.secondaryActionText}>Từ chối</Text>
                </Pressable>
                <Pressable
                  style={styles.primaryAction}
                  onPress={() => setSelectedInvitation(item)}
                >
                  <Text style={styles.primaryActionText}>Nhận lời</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
        {!filteredJockeyInvitations.length ? (
          <EmptyText text="Không có lời mời phù hợp bộ lọc." />
        ) : null}
        <JockeyDetailModal
          item={selectedInvitation}
          title="Chi tiết lời mời"
          onClose={() => setSelectedInvitation(null)}
          onInvitationResponse={onInvitationResponse}
          onResponded={(updated, note) => {
            setSelectedInvitation((current) =>
              current ? { ...current, status: updated?.status || current.status, responseNote: updated?.responseNote || note } : current,
            );
          }}
        />
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

        <Section title="Cuộc đua">
          {(data.races || []).filter((item) => matchesQuery(item, query)).map((item) => (
            <Pressable key={item.id} style={styles.invitationItem} onPress={() => setSelectedRaceDetail(item)}>
              <ListItem
                icon="flag-outline"
                title={item.name}
                meta={`${item.tournamentName || 'Giải đấu'} · ${item.checkedInCount}/${item.participantCount} đã check-in`}
                badge={item.status}
              />
            </Pressable>
          ))}
          {!data.races?.length ? <EmptyText text="Chưa có cuộc đua được phân công." /> : null}
        </Section>

        <RefereeRaceDetailModal
          race={selectedRaceDetail}
          data={data}
          onClose={() => setSelectedRaceDetail(null)}
          onParticipantCheckIn={onParticipantCheckIn}
          onOpenViolationModal={onOpenViolationModal}
          onStartRace={onStartRace}
          onOpenRefereeRaceModal={onOpenRefereeRaceModal}
          onUpdateGate={onUpdateGate}
          onRandomizeGates={onRandomizeGates}
        />
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

function JockeyDetailModal({ item, title, onClose, onInvitationResponse, onResponded }) {
  const [note, setNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState('');
  const [error, setError] = useState('');

  if (!item) return null;

  async function submitResponse(action) {
    const trimmedNote = note.trim();
    if (action === 'reject' && !trimmedNote) {
      setError('Vui lòng nhập lý do từ chối.');
      return;
    }

    try {
      setSubmittingAction(action);
      setError('');
      const updated = await onInvitationResponse(item.originalInvitationId || item.id, action, trimmedNote);
      onResponded?.(updated, trimmedNote);
    } catch (requestError) {
      setError(requestError.message || 'Không phản hồi được lời mời.');
    } finally {
      setSubmittingAction('');
    }
  }

  return (
    <Modal visible={Boolean(item)} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.detailBackdrop}>
        <View style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleBlock}>
              <Text style={styles.detailEyebrow}>Jockey</Text>
              <Text style={styles.detailTitle}>{title}</Text>
            </View>
            <Pressable style={styles.detailClose} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.darkText} />
            </Pressable>
          </View>

          <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent}>
            <DetailRow icon="footsteps-outline" label="Ngựa" value={item.horseName || 'Chưa cập nhật'} />
            <DetailRow icon="person-outline" label="Chủ ngựa" value={item.ownerName || 'Chưa cập nhật'} />
            <DetailRow icon="trophy-outline" label="Giải đấu" value={item.tournamentName || 'Chưa cập nhật'} />
            <DetailRow icon="flag-outline" label="Cuộc đua" value={item.raceName || item.raceLabel || item.detailTitle || 'Chưa cập nhật'} />
            <DetailRow icon="calendar-outline" label="Ngày giờ" value={item.scheduledStartAt || item.raceDate || 'Chưa cập nhật'} />
            <DetailRow icon="location-outline" label="Địa điểm" value={item.location || item.venueAddress || item.venueName || 'Chưa cập nhật'} />
            <DetailRow icon="cash-outline" label="Thù lao" value={item.reward ? `${Number(item.reward).toLocaleString('vi-VN')}đ` : 'Chưa cập nhật'} />
            <DetailRow icon="information-circle-outline" label="Trạng thái" value={item.status || 'Chưa cập nhật'} />
            {item.message ? <DetailRow icon="chatbubble-outline" label="Lời nhắn owner" value={item.message} /> : null}
            {item.responseNote ? <DetailRow icon="document-text-outline" label="Lý do/ghi chú" value={item.responseNote} /> : null}

            {onInvitationResponse && pendingInvitation(item) ? (
              <View style={styles.detailResponseBox}>
                <Text style={styles.detailSectionTitle}>Phản hồi lời mời</Text>
                <TextInput
                  multiline
                  onChangeText={setNote}
                  placeholder="Nhập lý do hoặc ghi chú gửi lại cho owner"
                  placeholderTextColor={colors.darkTextMuted}
                  style={styles.detailReasonInput}
                  value={note}
                />
                {error ? <Text style={styles.detailErrorText}>{error}</Text> : null}
                <View style={styles.detailActionRow}>
                  <Pressable
                    disabled={Boolean(submittingAction)}
                    style={[styles.detailRejectButton, submittingAction && styles.detailActionDisabled]}
                    onPress={() => submitResponse('reject')}
                  >
                    <Text style={styles.detailRejectText}>
                      {submittingAction === 'reject' ? 'Đang gửi...' : 'Từ chối'}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={Boolean(submittingAction)}
                    style={[styles.detailAcceptButton, submittingAction && styles.detailActionDisabled]}
                    onPress={() => submitResponse('accept')}
                  >
                    <Text style={styles.detailAcceptText}>
                      {submittingAction === 'accept' ? 'Đang gửi...' : 'Nhận lời'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
function ViolationDetailModal({ item, onClose }) {
  if (!item) return null;

  return (
    <Modal visible={Boolean(item)} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.detailBackdrop}>
        <View style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleBlock}>
              <Text style={styles.detailEyebrow}>Chi tiết vi phạm</Text>
              <Text style={styles.detailTitle} numberOfLines={1}>
                {item.horse || item.horseName || 'Biên bản vi phạm'}
              </Text>
            </View>
            <Pressable style={styles.detailClose} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.darkText} />
            </Pressable>
          </View>

          <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
            <DetailRow icon="flag-outline" label="Cuộc đua" value={item.raceName || 'Chưa cập nhật'} />
            <DetailRow icon="person-outline" label="Jockey vi phạm" value={item.jockey || item.jockeyName || 'Chưa cập nhật'} />
            <DetailRow icon="footsteps-outline" label="Ngựa vi phạm" value={item.horse || item.horseName || 'Chưa cập nhật'} />
            {item.gateNumber !== undefined && item.gateNumber !== null ? (
              <DetailRow icon="grid-outline" label="Cổng số" value={String(item.gateNumber)} />
            ) : item.horseNo !== undefined && item.horseNo !== null ? (
              <DetailRow icon="grid-outline" label="Cổng số" value={String(item.horseNo)} />
            ) : null}
            <DetailRow icon="warning-outline" label="Loại vi phạm" value={item.type || 'Chưa cập nhật'} />
            <DetailRow icon="alert-circle-outline" label="Mức độ nghiêm trọng" value={item.severity || 'Chưa cập nhật'} />
            <DetailRow icon="ban-outline" label="Hình phạt đề xuất" value={item.penalty || 'Không đề xuất'} />
            <DetailRow icon="document-text-outline" label="Mô tả chi tiết" value={item.description || 'Không có mô tả'} />
            {item.occurredAt ? (
              <DetailRow
                icon="time-outline"
                label="Thời gian lập"
                value={new Date(item.occurredAt).toLocaleString('vi-VN')}
              />
            ) : item.timestamp ? (
              <DetailRow
                icon="time-outline"
                label="Thời gian lập"
                value={new Date(item.timestamp).toLocaleString('vi-VN')}
              />
            ) : null}

            {item.evidence && item.evidence.length > 0 ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.detailSectionTitle}>Ảnh bằng chứng:</Text>
                {item.evidence.map((ev, index) => (
                  <Image
                    key={index}
                    source={{ uri: ev.url }}
                    style={{ width: '100%', height: 160, borderRadius: 10, resizeMode: 'cover', marginTop: 6 }}
                  />
                ))}
              </View>
            ) : item.imageFile?.uri ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.detailSectionTitle}>Ảnh bằng chứng:</Text>
                <Image
                  source={{ uri: item.imageFile.uri }}
                  style={{ width: '100%', height: 160, borderRadius: 10, resizeMode: 'cover', marginTop: 6 }}
                />
              </View>
            ) : null}

            <View style={{ marginTop: 12 }}>
              <Pressable style={styles.primaryAction} onPress={onClose}>
                <Text style={styles.primaryActionText}>Đóng</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


function GateInput({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));

  if (editing) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 6,
            color: colors.darkText,
            fontSize: 12,
            fontWeight: '900',
            paddingHorizontal: 8,
            paddingVertical: 3,
            width: 44,
            textAlign: 'center',
            backgroundColor: 'rgba(212,160,23,0.08)',
          }}
          keyboardType="numeric"
          value={draft}
          onChangeText={setDraft}
          autoFocus
          maxLength={2}
        />
        <Pressable
          style={{ backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 6, padding: 4 }}
          onPress={() => {
            const n = parseInt(draft, 10);
            if (!isNaN(n) && n > 0) { onChange(n); }
            setEditing(false);
          }}
        >
          <Ionicons name="checkmark" size={13} color="#10B981" />
        </Pressable>
        <Pressable
          style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 6, padding: 4 }}
          onPress={() => { setDraft(String(value ?? '')); setEditing(false); }}
        >
          <Ionicons name="close" size={13} color="#EF4444" />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: colors.darkBorder,
      }}
      onPress={() => { setDraft(String(value ?? '')); setEditing(true); }}
    >
      <Text style={{ color: colors.darkText, fontSize: 12, fontWeight: '900', minWidth: 16, textAlign: 'center' }}>
        {value ?? '?'}
      </Text>
      <Ionicons name="create-outline" size={11} color={colors.darkTextMuted} />
    </Pressable>
  );
}

function RefereeRaceDetailModal({ race, data, onClose, onParticipantCheckIn, onOpenViolationModal, onStartRace, onOpenRefereeRaceModal, onUpdateGate, onRandomizeGates }) {
  const [selectedViolationKey, setSelectedViolationKey] = useState('');
  if (!race) return null;

  const payment = (data.payments || []).find((p) => String(p.raceId) === String(race.id));
  const participants = (data.participants || []).filter((p) => String(p.raceId) === String(race.id));
  const violations = dedupeViolations((data.violations || []).filter((v) => String(v.raceId) === String(race.id)));
  const visibleViolations = violations.slice(0, 5);

  const isScheduled = race.statusCode === 'SCHEDULED' || race.canStart;
  const isOngoing = race.statusCode === 'ONGOING' || race.status === 'Đang chạy' || race.status === 'Đang diễn ra';
  const checkedIn = participants.filter((p) => p.checkInStatus === 'CHECKED_IN').length;
  const absent = participants.filter((p) => p.checkInStatus === 'ABSENT').length;
  const pending = participants.filter((p) => p.checkInStatus !== 'CHECKED_IN' && p.checkInStatus !== 'ABSENT').length;

  return (
    <Modal visible={Boolean(race)} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.detailBackdrop}>
        <View style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleBlock}>
              <Text style={styles.detailEyebrow}>Cuộc đua được phân công</Text>
              <Text style={styles.detailTitle} numberOfLines={1}>
                {race.name}
              </Text>
            </View>
            <Pressable style={styles.detailClose} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.darkText} />
            </Pressable>
          </View>

          <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
            <DetailRow icon="trophy-outline" label="Giải đấu" value={race.tournamentName || 'Chưa cập nhật'} />
            <DetailRow icon="location-outline" label="Địa điểm" value={race.location || 'Chưa cập nhật'} />
            <DetailRow icon="information-circle-outline" label="Trạng thái" value={race.status || 'Chưa cập nhật'} />

            {/* Action buttons */}
            {(isScheduled || isOngoing) && (
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
                {isScheduled && onStartRace ? (
                  <Pressable
                    style={[styles.primaryAction, { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center' }]}
                    onPress={() => { onClose(); onStartRace(race.id); }}
                  >
                    <Ionicons name="flag-outline" size={14} color="#1D1705" />
                    <Text style={styles.primaryActionText}>Bắt đầu cuộc đua</Text>
                  </Pressable>
                ) : null}
                {isOngoing && onOpenRefereeRaceModal ? (
                  <Pressable
                    style={[styles.primaryAction, { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center' }]}
                    onPress={() => { onClose(); onOpenRefereeRaceModal(race); }}
                  >
                    <Ionicons name="play-circle-outline" size={14} color="#1D1705" />
                    <Text style={styles.primaryActionText}>Mô phỏng & Chốt</Text>
                  </Pressable>
                ) : null}
                {onOpenViolationModal ? (
                  <Pressable
                    style={[styles.secondaryAction, { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center' }]}
                    onPress={() => { onClose(); onOpenViolationModal(race); }}
                  >
                    <Ionicons name="warning-outline" size={14} color={colors.darkText} />
                    <Text style={styles.secondaryActionText}>Báo vi phạm</Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {/* Thù lao trọng tài */}
            <Text style={styles.detailSectionTitle}>Thù lao của trọng tài</Text>
            {payment ? (
              <DetailRow
                icon="cash-outline"
                label="Số tiền"
                value={`${(payment.amount || 0).toLocaleString('vi-VN')}đ · ${payment.status}`}
              />
            ) : (
              <EmptyText text="Chưa có thông tin thù lao cho cuộc đua này." />
            )}

            {/* Check-in & Gate Assignment */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.detailSectionTitle, { marginBottom: 0 }]}>
                  Danh sách ngựa ({participants.length})
                </Text>
                {onRandomizeGates ? (
                  <Pressable
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: 'rgba(212, 160, 23, 0.15)',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                    onPress={() => onRandomizeGates(race.id)}
                  >
                    <Ionicons name="shuffle" size={12} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '900' }}>Ngẫu nhiên</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={{ backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '900' }}>✓ {checkedIn}</Text>
                </View>
                {absent > 0 && (
                  <View style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '900' }}>✗ {absent}</Text>
                  </View>
                )}
                {pending > 0 && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ color: colors.darkTextMuted, fontSize: 10, fontWeight: '900' }}>⏳ {pending}</Text>
                  </View>
                )}
              </View>
            </View>
            {participants.map((item) => (
              <View key={item.id} style={[styles.detailListItem, { alignItems: 'flex-start', paddingVertical: 10 }]}>
                {/* Gate badge + name */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {/* Gate number - editable */}
                    {onUpdateGate ? (
                      <GateInput
                        value={item.gateNumber}
                        onChange={(gate) => onUpdateGate(item.raceId, item.id, gate)}
                      />
                    ) : (
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: colors.darkText, fontSize: 12, fontWeight: '900' }}>
                          {item.gateNumber ?? '?'}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.detailItemTitle, { flex: 1, marginBottom: 0 }]} numberOfLines={1}>
                      {item.horseName}
                    </Text>
                  </View>
                  <Text style={styles.detailItemMeta}>
                    Nài: {item.jockeyName || 'Chưa rõ'} · {item.ownerName ? `Chủ: ${item.ownerName}` : ''}
                  </Text>
                </View>
                {/* Check-in controls */}
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  {item.canCheckIn && onParticipantCheckIn ? (
                    <View style={{ flexDirection: 'row', gap: 5 }}>
                      <Pressable
                        style={[styles.detailCheckInBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
                        onPress={() => onParticipantCheckIn(item.raceId, item.id, 'ABSENT')}
                      >
                        <Ionicons name="close" size={13} color="#EF4444" />
                      </Pressable>
                      <Pressable
                        style={[styles.detailCheckInBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
                        onPress={() => onParticipantCheckIn(item.raceId, item.id, 'CHECKED_IN')}
                      >
                        <Ionicons name="checkmark" size={13} color="#10B981" />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={[
                      styles.detailStatusBadge,
                      item.checkInStatus === 'CHECKED_IN' ? { backgroundColor: 'rgba(16, 185, 129, 0.15)' } : { backgroundColor: 'rgba(239, 68, 68, 0.15)' }
                    ]}>
                      <Text style={[
                        styles.detailStatusBadgeText,
                        item.checkInStatus === 'CHECKED_IN' ? { color: '#10B981' } : { color: '#EF4444' }
                      ]}>
                        {item.checkInStatus === 'CHECKED_IN' ? '✓ Check-in' : item.checkInStatus === 'ABSENT' ? '✗ Vắng' : '⏳ Chờ'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
            {participants.length === 0 ? (
              <EmptyText text="Không có ngựa đua nào tham gia cuộc đua này." />
            ) : null}

            {/* Biên bản vi phạm */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 }}>
              <Text style={[styles.detailSectionTitle, { marginBottom: 0 }]}>
                Biên bản vi phạm ({violations.length})
              </Text>
              {onOpenViolationModal ? (
                <Pressable
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: 'rgba(212, 160, 23, 0.15)',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                  onPress={() => {
                    onClose();
                    onOpenViolationModal(race);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '900' }}>Báo vi phạm</Text>
                </Pressable>
              ) : null}
            </View>
            {visibleViolations.map((item) => {
              const itemKey = item.id || violationSignature(item);
              const expanded = selectedViolationKey === itemKey;
              return (
              <View key={itemKey} style={styles.detailListItemCol}>
              <Pressable onPress={() => setSelectedViolationKey(expanded ? '' : itemKey)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.detailItemTitle} numberOfLines={2}>
                    {item.horse || item.horseName || 'Ngựa'} (Nài: {item.jockey || item.jockeyName || 'Chưa rõ'})
                  </Text>
                  <View style={[styles.detailStatusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Text style={[styles.detailStatusBadgeText, { color: '#F59E0B' }]}>
                      {item.severity}
                    </Text>
                  </View>
                </View>
                <Text style={styles.detailItemMeta} numberOfLines={1}>Lỗi: {item.type}</Text>
                {item.penalty ? (
                  <Text style={[styles.detailItemMeta, { color: colors.primary }]}>Hình phạt: {item.penalty}</Text>
                ) : null}
                {item.description ? (
                  <Text style={[styles.detailItemMeta, { marginTop: 4, fontStyle: 'italic' }]}>Chi tiết: {item.description}</Text>
                ) : null}
                {violationEvidenceCount(item) > 0 ? (
                  <Text style={[styles.detailItemMeta, { color: colors.primary, marginTop: 4 }]}>
                    {expanded ? 'Ẩn ảnh bằng chứng' : `Có ${violationEvidenceCount(item)} ảnh bằng chứng · Bấm để xem`}
                  </Text>
                ) : null}
              </Pressable>
              {expanded ? <ViolationEvidencePreview item={item} /> : null}
              </View>
              );
            })}
            {violations.length > visibleViolations.length ? (
              <Text style={[styles.detailItemMeta, { marginTop: 8, textAlign: 'center' }]}>
                Đang ẩn {violations.length - visibleViolations.length} biên bản trùng/cũ để app nhẹ hơn.
              </Text>
            ) : null}
            {violations.length === 0 ? (
              <EmptyText text="Chưa ghi nhận lỗi vi phạm nào trong cuộc đua này." />
            ) : null}

            <View style={{ marginTop: 24, marginBottom: 12 }}>
              <Pressable style={styles.secondaryAction} onPress={onClose}>
                <Text style={styles.secondaryActionText}>Đóng</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={17} color={colors.primary} />
      <View style={styles.detailRowCopy}>
        <Text style={styles.detailRowLabel}>{label}</Text>
        <Text style={styles.detailRowValue}>{value}</Text>
      </View>
    </View>
  );
}

function OwnerDetailModal({ item, type, onClose }) {
  if (!item) return null;

  const titles = {
    tournament: item.name || 'Chi tiết giải đấu',
    result: item.horseName || 'Chi tiết kết quả',
    horse: item.name || 'Chi tiết ngựa',
    registration: item.tournamentName || item.raceName || 'Chi tiết đăng ký',
    invitation: item.jockeyName || 'Chi tiết lời mời',
  };

  return (
    <Modal visible={Boolean(item)} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.detailBackdrop}>
        <View style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleBlock}>
              <Text style={styles.detailEyebrow}>HORSE OWNER</Text>
              <Text style={styles.detailTitle} numberOfLines={2}>{titles[type]}</Text>
            </View>
            <Pressable style={styles.detailClose} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.darkText} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.detailScroll}
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}
          >
            {type === 'tournament' ? (
              <>
                {item.banner ? <Image source={{ uri: item.banner }} style={styles.ownerDetailImage} /> : null}
                <DetailRow icon="information-circle-outline" label="Trạng thái" value={item.status || 'Chưa cập nhật'} />
                <DetailRow icon="location-outline" label="Địa điểm" value={item.location || 'Chưa cập nhật'} />
                <DetailRow icon="calendar-outline" label="Ngày bắt đầu" value={formatDate(item.startDate)} />
                <DetailRow icon="cash-outline" label="Giải thưởng" value={String(item.prize || 'Chưa cập nhật')} />
                <DetailRow icon="flag-outline" label="Số cuộc đua" value={String(item.raceCount || item.races?.length || 0)} />
                {(item.races || []).length ? (
                  <View style={styles.ownerDetailSubsection}>
                    <Text style={styles.detailSectionTitle}>Các cuộc đua</Text>
                    {(item.races || []).map((race) => (
                      <ListItem
                        key={race.id}
                        icon="flag-outline"
                        title={`Race R${race.raceNumber || '-'} · ${race.name}`}
                        meta={`${formatDateTime(race.scheduledStartAt)} · Phí ${formatMoney(race.entryFee)}`}
                        badge={race.status}
                      />
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}

            {type === 'result' ? (
              <>
                <DetailRow icon="trophy-outline" label="Thứ hạng" value={`Hạng ${item.position || '-'}`} />
                <DetailRow icon="footsteps-outline" label="Ngựa" value={item.horseName || 'Chưa cập nhật'} />
                <DetailRow icon="person-outline" label="Jockey" value={item.jockeyName || 'Chưa cập nhật'} />
                <DetailRow icon="ribbon-outline" label="Giải đấu" value={item.tournamentName || 'Chưa cập nhật'} />
                <DetailRow icon="flag-outline" label="Cuộc đua" value={item.raceName || 'Chưa cập nhật'} />
                <DetailRow icon="cash-outline" label="Tiền thưởng" value={formatMoney(item.prizeAmount)} />
                <DetailRow icon="timer-outline" label="Thành tích" value={item.finishTimeMillis ? `${item.finishTimeMillis} ms` : 'Chưa cập nhật'} />
                <DetailRow icon="calendar-outline" label="Ngày xác nhận" value={formatDateTime(item.date)} />
              </>
            ) : null}

            {type === 'horse' ? (
              <>
                {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.ownerDetailImage} /> : null}
                <DetailRow icon="footsteps-outline" label="Tên ngựa" value={item.name || 'Chưa cập nhật'} />
                <DetailRow icon="git-branch-outline" label="Giống" value={item.breed || 'Chưa cập nhật'} />
                <DetailRow icon="calendar-outline" label="Tuổi" value={item.age ? `${item.age} tuổi` : 'Chưa cập nhật'} />
                <DetailRow icon="male-female-outline" label="Giới tính" value={item.gender || 'Chưa cập nhật'} />
                <DetailRow icon="color-palette-outline" label="Màu lông" value={item.color || 'Chưa cập nhật'} />
                <DetailRow icon="resize-outline" label="Chiều cao / cân nặng" value={`${item.height || item.heightCm || 0} cm · ${item.weight || item.weightKg || 0} kg`} />
                <DetailRow icon="medkit-outline" label="Sức khỏe" value={item.healthStatus || 'Chưa cập nhật'} />
                <DetailRow icon="shield-checkmark-outline" label="Duyệt hồ sơ" value={horseApprovalLabel(item)} />
                {item.documentUrl ? (
                  <Pressable style={styles.secondaryAction} onPress={() => Linking.openURL(item.documentUrl)}>
                    <Text style={styles.secondaryActionText}>Mở giấy sức khỏe / chứng nhận</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            {type === 'registration' ? (
              <>
                <DetailRow icon="information-circle-outline" label="Trạng thái" value={item.status || 'Chưa cập nhật'} />
                <DetailRow icon="trophy-outline" label="Giải đấu" value={item.tournamentName || 'Chưa cập nhật'} />
                <DetailRow icon="flag-outline" label="Cuộc đua" value={item.raceName || 'Chưa cập nhật'} />
                <DetailRow icon="calendar-outline" label="Lịch thi đấu" value={formatDateTime(item.raceScheduledAt)} />
                <DetailRow icon="footsteps-outline" label="Ngựa" value={item.horseName || 'Chưa cập nhật'} />
                <DetailRow icon="person-outline" label="Jockey" value={item.jockeyName || 'Chưa cập nhật'} />
                <DetailRow icon="cash-outline" label="Phí đăng ký" value={formatMoney(item.entryFeeAmount)} />
                <DetailRow icon="wallet-outline" label="Tiền cọc" value={formatMoney(item.depositAmount)} />
                <DetailRow icon="checkmark-done-outline" label="Check-in" value={item.checkInStatus || 'PENDING'} />
                {item.ownerNote ? <DetailRow icon="chatbubble-outline" label="Ghi chú của bạn" value={item.ownerNote} /> : null}
                {item.reviewNote ? <DetailRow icon="document-text-outline" label="Phản hồi duyệt" value={item.reviewNote} /> : null}
                {item.withdrawNote ? <DetailRow icon="return-down-back-outline" label="Lý do rút" value={item.withdrawNote} /> : null}
              </>
            ) : null}

            {type === 'invitation' ? (
              <>
                <DetailRow icon="information-circle-outline" label="Trạng thái" value={item.status || 'Chưa cập nhật'} />
                <DetailRow icon="person-outline" label="Jockey" value={item.jockeyName || 'Chưa cập nhật'} />
                <DetailRow icon="footsteps-outline" label="Ngựa" value={item.horseName || 'Chưa cập nhật'} />
                <DetailRow icon="trophy-outline" label="Giải đấu" value={item.tournamentName || 'Chưa cập nhật'} />
                <DetailRow icon="flag-outline" label="Cuộc đua" value={item.raceLabel || 'Chưa cập nhật'} />
                <DetailRow icon="calendar-outline" label="Ngày giờ" value={formatDateTime(item.raceScheduledStartAt || item.raceDate)} />
                <DetailRow icon="location-outline" label="Địa điểm" value={item.location || 'Chưa cập nhật'} />
                <DetailRow icon="cash-outline" label="Thù lao" value={formatMoney(item.reward)} />
                {item.message ? <DetailRow icon="chatbubble-outline" label="Lời nhắn" value={item.message} /> : null}
                {item.responseNote ? <DetailRow icon="document-text-outline" label="Phản hồi jockey" value={item.responseNote} /> : null}
              </>
            ) : null}

            <Pressable style={styles.primaryAction} onPress={onClose}>
              <Text style={styles.primaryActionText}>Đóng</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function Account({
  user,
  role,
  data,
  onLogout,
  onRecordActivity,
  onProfileUpdated,
  onOpenDepositModal,
  onRefresh,
}) {
  const ownerProfile = data?.profile || {};
  const [form, setForm] = useState({
    fullName: displayName(user),
    phone: user?.phone || '',
    location: user?.location || '',
    stableName: '',
    address: '',
    experienceYears: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    reason: '',
  });
  const name = ownerProfile.fullName || form.fullName || displayName(user);

  useEffect(() => {
    setForm({
      fullName: ownerProfile.fullName || displayName(user),
      phone: ownerProfile.phone || user?.phone || '',
      location: user?.location || '',
      stableName: ownerProfile.stableName || '',
      address: ownerProfile.address || '',
      experienceYears:
        ownerProfile.experienceYears === undefined || ownerProfile.experienceYears === null
          ? ''
          : String(ownerProfile.experienceYears),
      bio: ownerProfile.bio || '',
    });
  }, [
    ownerProfile.address,
    ownerProfile.bio,
    ownerProfile.experienceYears,
    ownerProfile.fullName,
    ownerProfile.phone,
    ownerProfile.stableName,
    user,
  ]);

  async function saveProfile() {
    try {
      setSaving(true);
      setMessage('');
      const updated =
        role === 'OWNER'
          ? await ownerService.updateProfile({
              stableName: form.stableName.trim(),
              address: form.address.trim(),
              experienceYears: form.experienceYears.trim(),
              bio: form.bio.trim(),
              phone: form.phone.trim(),
            })
          : await userService.updateProfile(form);
      setForm((current) => ({
        ...current,
        fullName: updated?.fullName || updated?.name || current.fullName,
        phone: updated?.phone ?? current.phone,
        location: updated?.location ?? current.location,
        stableName: updated?.stableName ?? current.stableName,
        address: updated?.address ?? current.address,
        experienceYears:
          updated?.experienceYears === undefined
            ? current.experienceYears
            : String(updated.experienceYears),
        bio: updated?.bio ?? current.bio,
      }));
      onProfileUpdated?.(updated);
      setMessage('Đã cập nhật hồ sơ.');
      if (onRecordActivity) {
        onRecordActivity(
          'person-circle-outline',
          'Đã cập nhật hồ sơ',
          updated?.fullName || updated?.name || form.fullName,
        );
      }
    } catch (requestError) {
      setMessage(requestError.message || 'Không cập nhật được hồ sơ.');
    } finally {
      setSaving(false);
    }
  }

  async function submitWithdrawal() {
    const amount = Number(withdrawForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('Số tiền rút phải lớn hơn 0.');
      return;
    }
    if (amount > Number(data?.wallet?.availableBalance || 0)) {
      setMessage('Số dư khả dụng không đủ để rút.');
      return;
    }
    if (
      !withdrawForm.bankName.trim() ||
      !withdrawForm.bankAccountNumber.trim() ||
      !withdrawForm.bankAccountName.trim()
    ) {
      setMessage('Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng.');
      return;
    }

    try {
      setWithdrawing(true);
      setMessage('');
      await walletService.createWithdrawal({
        ...withdrawForm,
        idempotencyKey: `owner-withdraw-${Date.now()}`,
      });
      setWithdrawVisible(false);
      setWithdrawForm({
        amount: '',
        bankName: '',
        bankAccountNumber: '',
        bankAccountName: '',
        reason: '',
      });
      setMessage('Đã gửi yêu cầu rút tiền.');
      onRecordActivity?.('cash-outline', 'Đã yêu cầu rút tiền', formatMoney(amount));
      onRefresh?.();
    } catch (requestError) {
      setMessage(requestError.message || 'Không tạo được yêu cầu rút tiền.');
    } finally {
      setWithdrawing(false);
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
        {role !== 'OWNER' ? (
          <ProfileField
            label="Họ và tên"
            value={form.fullName}
            onChangeText={(value) => setForm((current) => ({ ...current, fullName: value }))}
          />
        ) : null}
        <ProfileField
          label="Số điện thoại"
          keyboardType="phone-pad"
          value={form.phone}
          onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
        />
        {role === 'OWNER' ? (
          <>
            <ProfileField
              label="Tên chuồng ngựa"
              value={form.stableName}
              onChangeText={(value) => setForm((current) => ({ ...current, stableName: value }))}
            />
            <ProfileField
              label="Địa chỉ chuồng"
              value={form.address}
              onChangeText={(value) => setForm((current) => ({ ...current, address: value }))}
            />
            <ProfileField
              label="Số năm kinh nghiệm"
              keyboardType="numeric"
              value={form.experienceYears}
              onChangeText={(value) =>
                setForm((current) => ({
                  ...current,
                  experienceYears: value.replace(/[^0-9]/g, ''),
                }))
              }
            />
            <ProfileField
              label="Giới thiệu"
              multiline={true}
              value={form.bio}
              onChangeText={(value) => setForm((current) => ({ ...current, bio: value }))}
            />
          </>
        ) : (
          <ProfileField
            label="Địa điểm"
            value={form.location}
            onChangeText={(value) => setForm((current) => ({ ...current, location: value }))}
          />
        )}
        {message ? <Text style={styles.profileMessage}>{message}</Text> : null}
        <Pressable
          disabled={saving || (role !== 'OWNER' && !form.fullName.trim())}
          style={[
            styles.saveProfileButton,
            (saving || (role !== 'OWNER' && !form.fullName.trim())) && styles.disabledButton,
          ]}
          onPress={saveProfile}
        >
          <Text style={styles.saveProfileText}>{saving ? 'Đang lưu...' : 'Lưu hồ sơ'}</Text>
        </Pressable>
      </Section>

      {role === 'OWNER' ? (
        <Section title="Ví của tôi">
          <View style={styles.walletSummary}>
            <View style={styles.walletBalanceCard}>
              <Text style={styles.walletBalanceLabel}>Khả dụng</Text>
              <Text style={styles.walletBalanceValue}>
                {formatMoney(data?.wallet?.availableBalance)}
              </Text>
            </View>
            <View style={styles.walletBalanceCard}>
              <Text style={styles.walletBalanceLabel}>Đang giữ</Text>
              <Text style={styles.walletBalanceValue}>
                {formatMoney(data?.wallet?.holdBalance)}
              </Text>
            </View>
          </View>
          <View style={styles.detailActionRow}>
            <Pressable style={styles.secondaryAction} onPress={onOpenDepositModal}>
              <Text style={styles.secondaryActionText}>Nạp tiền</Text>
            </Pressable>
            <Pressable style={styles.primaryAction} onPress={() => setWithdrawVisible(true)}>
              <Text style={styles.primaryActionText}>Rút tiền</Text>
            </Pressable>
          </View>

          <Text style={styles.walletSubheading}>Giao dịch gần đây</Text>
          {(data?.walletTransactions || []).slice(0, 5).map((item) => (
            <ListItem
              key={item.id}
              icon={item.direction === 'DEBIT' ? 'arrow-up-outline' : 'arrow-down-outline'}
              title={item.description || item.type}
              meta={`${formatDateTime(item.createdAt)} · Số dư ${formatMoney(item.balanceAfter)}`}
              badge={`${item.availableDelta > 0 ? '+' : ''}${formatMoney(item.availableDelta)}`}
            />
          ))}
          {!data?.walletTransactions?.length ? (
            <EmptyText text="Chưa có giao dịch ví." />
          ) : null}

          {(data?.withdrawals || []).length ? (
            <>
              <Text style={styles.walletSubheading}>Yêu cầu rút gần đây</Text>
              {(data.withdrawals || []).slice(0, 3).map((item) => (
                <ListItem
                  key={item.id}
                  icon="cash-outline"
                  title={formatMoney(item.amount)}
                  meta={`${item.bankName || 'Ngân hàng'} · ${item.bankAccount || 'Chưa cập nhật'}`}
                  badge={item.status}
                />
              ))}
            </>
          ) : null}
        </Section>
      ) : null}

      <Modal
        visible={withdrawVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setWithdrawVisible(false)}
      >
        <View style={styles.detailBackdrop}>
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <View style={styles.detailTitleBlock}>
                <Text style={styles.detailEyebrow}>VÍ OWNER</Text>
                <Text style={styles.detailTitle}>Yêu cầu rút tiền</Text>
              </View>
              <Pressable style={styles.detailClose} onPress={() => setWithdrawVisible(false)}>
                <Ionicons name="close" size={20} color={colors.darkText} />
              </Pressable>
            </View>
            <ScrollView style={styles.detailScroll} keyboardShouldPersistTaps="handled">
              <ProfileField
                label="Số tiền rút"
                keyboardType="numeric"
                value={withdrawForm.amount}
                onChangeText={(value) =>
                  setWithdrawForm((current) => ({
                    ...current,
                    amount: value.replace(/[^0-9]/g, ''),
                  }))
                }
              />
              <ProfileField
                label="Ngân hàng"
                value={withdrawForm.bankName}
                onChangeText={(value) =>
                  setWithdrawForm((current) => ({ ...current, bankName: value }))
                }
              />
              <ProfileField
                label="Số tài khoản"
                keyboardType="numeric"
                value={withdrawForm.bankAccountNumber}
                onChangeText={(value) =>
                  setWithdrawForm((current) => ({
                    ...current,
                    bankAccountNumber: value.replace(/[^0-9]/g, ''),
                  }))
                }
              />
              <ProfileField
                label="Tên chủ tài khoản"
                value={withdrawForm.bankAccountName}
                onChangeText={(value) =>
                  setWithdrawForm((current) => ({ ...current, bankAccountName: value }))
                }
              />
              <ProfileField
                label="Lý do / ghi chú"
                multiline={true}
                value={withdrawForm.reason}
                onChangeText={(value) =>
                  setWithdrawForm((current) => ({ ...current, reason: value }))
                }
              />
              <View style={styles.detailActionRow}>
                <Pressable style={styles.secondaryAction} onPress={() => setWithdrawVisible(false)}>
                  <Text style={styles.secondaryActionText}>Hủy</Text>
                </Pressable>
                <Pressable
                  disabled={withdrawing}
                  style={[styles.primaryAction, withdrawing && styles.disabledButton]}
                  onPress={submitWithdrawal}
                >
                  <Text style={styles.primaryActionText}>
                    {withdrawing ? 'Đang gửi...' : 'Gửi yêu cầu'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={18} color="#1D1705" />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: 14,
    color: colors.darkText,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 25,
  },
  jockeyCalendarPanel: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 16,
    backgroundColor: colors.darkSurface,
    paddingBottom: 10,
  },
  calendarLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  calendarLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#991B1B',
  },
  calendarLegendText: {
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  invitationItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
  },
  responseNoteText: {
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
    paddingHorizontal: 13,
    paddingBottom: 10,
  },
  detailBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    padding: 18,
  },
  detailModal: {
    maxHeight: '82%',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 18,
    backgroundColor: colors.darkSurface,
    padding: 18,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailTitleBlock: {
    flex: 1,
  },
  detailEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailTitle: {
    marginTop: 3,
    color: colors.darkText,
    fontSize: 19,
    fontWeight: '900',
  },
  detailClose: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 13,
    backgroundColor: colors.darkSurfaceSoft,
  },
  detailScroll: {
    marginTop: 14,
  },
  detailContent: {
    paddingBottom: 4,
  },
  ownerDetailImage: {
    width: '100%',
    height: 180,
    marginBottom: 12,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  ownerDetailSubsection: {
    marginTop: 14,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
    paddingVertical: 10,
  },
  detailRowCopy: {
    flex: 1,
  },
  detailRowLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailRowValue: {
    marginTop: 4,
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  detailResponseBox: {
    marginTop: 14,
  },
  detailSectionTitle: {
    color: colors.darkText,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  detailReasonInput: {
    minHeight: 82,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 13,
    backgroundColor: colors.darkSurfaceSoft,
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  detailErrorText: {
    marginTop: 9,
    color: '#fecdd3',
    fontSize: 12,
    fontWeight: '800',
  },
  detailActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  detailRejectButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.38)',
    borderRadius: 13,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    paddingVertical: 12,
  },
  detailRejectText: {
    color: '#fecdd3',
    fontSize: 12,
    fontWeight: '900',
  },
  detailAcceptButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 13,
    backgroundColor: colors.primary,
    paddingVertical: 12,
  },
  detailAcceptText: {
    color: '#1D1705',
    fontSize: 12,
    fontWeight: '900',
  },
  detailActionDisabled: {
    opacity: 0.58,
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
  profileMessage: {
    paddingHorizontal: 13,
    paddingTop: 12,
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  walletSummary: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  walletBalanceCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 12,
    backgroundColor: colors.darkSurfaceSoft,
    padding: 12,
  },
  walletBalanceLabel: {
    color: colors.darkTextMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  walletBalanceValue: {
    marginTop: 6,
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  walletSubheading: {
    marginBottom: 6,
    marginTop: 16,
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
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
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 10,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  primaryActionTextButton: {
    color: '#1D1705',
    fontSize: 12,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  taskFilterRow: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 14,
    backgroundColor: colors.darkSurface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#3A2F1B',
  },
  filterChipText: {
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '900',
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  horseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 92,
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
  },
  horseAvatar: {
    overflow: 'hidden',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.darkSurfaceSoft,
  },
  horseAvatarImage: {
    width: '100%',
    height: '100%',
  },
  horseInfo: {
    flex: 1,
    minWidth: 0,
  },
  horseName: {
    color: colors.darkText,
    fontSize: 14,
    fontWeight: '900',
  },
  horseMeta: {
    marginTop: 4,
    color: colors.darkTextMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  horseActions: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 8,
  },
  horseActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  horseActionText: {
    color: colors.darkText,
    fontSize: 10,
    fontWeight: '900',
  },
  deleteHorseButton: {
    borderColor: 'rgba(253, 164, 175, 0.28)',
  },
  deleteHorseText: {
    color: '#FDA4AF',
  },
  approvalBadge: {
    maxWidth: 86,
    borderRadius: 12,
    backgroundColor: '#3A2F1B',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  approvalBadgeApproved: {
    backgroundColor: 'rgba(45, 212, 191, 0.14)',
  },
  approvalBadgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  approvalBadgeTextApproved: {
    color: '#2DD4BF',
  },
  detailListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
  },
  detailListItemCol: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
    gap: 4,
  },
  detailItemTitle: {
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
  },
  detailItemMeta: {
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  detailCheckInBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailStatusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  detailStatusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
});
