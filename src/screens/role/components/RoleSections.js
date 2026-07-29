import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../../../constants/theme';
import { userService } from '../../../services/userService';
import { getRoleLabel } from '../../../utils/role';
import { displayName, formatDate, initials, matchesQuery } from '../roleData';
import { EmptyText, ListItem, Metric, ProfileField, Section } from './RolePrimitives';

function acceptedInvitation(item) {
  return item.status === 'Đã chấp nhận' || item.status === 'ACCEPTED';
}

function pendingInvitation(item) {
  return item.status === 'Chờ xử lý' || item.status === 'PENDING';
}

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
      scheduledStartAt: item.raceDate && item.raceTime ? `${item.raceDate} ${item.raceTime}` : item.raceDate,
    }));

  return [...raceItems, ...acceptedItems];
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
}) {
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
}) {
  const [selectedScheduleItem, setSelectedScheduleItem] = useState(null);

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
    const scheduleItems = buildJockeyScheduleItems(data);

    return (
      <Section title="Lịch thi đấu của jockey">
        {scheduleItems.filter((item) => matchesQuery(item, query)).map((item) => (
          <Pressable key={item.id} onPress={() => setSelectedScheduleItem(item)}>
            <ListItem
              icon="calendar-outline"
              title={item.raceName || item.raceLabel || item.tournamentName || 'Race'}
              meta={`${item.horseName || 'Ngựa'} · ${item.ownerName || 'Chủ ngựa'}`}
              badge={item.status}
            />
          </Pressable>
        ))}
        {!scheduleItems.length ? <EmptyText text="Chưa có lịch thi đấu." /> : null}
        <JockeyDetailModal
          item={selectedScheduleItem}
          title="Chi tiết lịch thi đấu"
          onClose={() => setSelectedScheduleItem(null)}
        />
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
            <View style={styles.horseAvatar}>
              {horse.imageUrl ? (
                <Image source={{ uri: horse.imageUrl }} style={styles.horseAvatarImage} />
              ) : (
                <Ionicons name="footsteps-outline" size={22} color={colors.primary} />
              )}
            </View>

            <View style={styles.horseInfo}>
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
}) {
  const [selectedInvitation, setSelectedInvitation] = useState(null);

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
      </Section>
    );
  }

  if (role === 'JOCKEY') {
    return (
      <Section title="Lời mời điều khiển ngựa">
        {(data.invitations || []).filter((item) => matchesQuery(item, query)).map((item) => (
          <View key={item.id} style={styles.invitationItem}>
            <Pressable onPress={() => setSelectedInvitation(item)}>
              <ListItem
                icon="mail-unread-outline"
                title={item.horseName || 'Ngựa'}
                meta={`${item.ownerName || 'Chủ ngựa'} · ${item.tournamentName || 'Giải đấu'}`}
                badge={item.status}
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
        {!data.invitations?.length ? <EmptyText text="Chưa có lời mời." /> : null}
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

export function Account({ user, role, onLogout, onRecordActivity }) {
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

const styles = StyleSheet.create({
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
});
