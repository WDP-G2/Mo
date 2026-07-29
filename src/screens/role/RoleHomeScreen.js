import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppAlert } from '../../components/ui/AppAlert';
import { colors } from '../../constants/theme';
import { activityStorage } from '../../services/activityStorage';
import { horseService } from '../../services/horseService';
import { invitationService } from '../../services/invitationService';
import { jockeyService } from '../../services/jockeyService';
import { notificationService } from '../../services/notificationService';
import { ownerService } from '../../services/ownerService';
import { refereeService } from '../../services/refereeService';
import { spectatorService } from '../../services/spectatorService';
import { systemSettingsService } from '../../services/systemSettingsService';
import { tournamentService } from '../../services/tournamentService';
import { userService } from '../../services/userService';
import { getRoleLabel } from '../../utils/role';
import {
  isOwnerHorseRaceEligible,
  jockeyLockedForRace,
  raceHorseLockedByInvitation,
  raceHorseLockedByRegistration,
  raceJockeyLockedByInvitation,
  raceJockeyLockedByRegistration,
  sameOwnerFlowId,
  uniqueAcceptedRaceHorseInvitations,
} from '../../utils/ownerFlow.mjs';
import { RoleActionModals } from './components/RoleActionModals';
import { SearchBox, ListItem, EmptyText } from './components/RolePrimitives';
import {
  Account,
  Horses,
  Overview,
  RefereeCalendar,
  Schedule,
  Tasks,
} from './components/RoleSections';
import { buildStats, displayName, initials, loadDataForRole, roleOrSpectator } from './roleData';

const tabs = [
  { key: 'overview', icon: 'grid-outline', activeIcon: 'grid', label: 'Tổng quan' },
  { key: 'schedule', icon: 'calendar-outline', activeIcon: 'calendar', label: 'Lịch' },
  { key: 'tasks', icon: 'checkmark-done-outline', activeIcon: 'checkmark-done', label: 'Việc cần làm' },
  { key: 'account', icon: 'person-outline', activeIcon: 'person', label: 'Tài khoản' },
];

const ownerTabs = [
  { key: 'overview', icon: 'grid-outline', activeIcon: 'grid', label: 'Tổng quan' },
  { key: 'horses', icon: 'footsteps-outline', activeIcon: 'footsteps', label: 'Ngựa' },
  { key: 'schedule', icon: 'calendar-outline', activeIcon: 'calendar', label: 'Lịch' },
  { key: 'tasks', icon: 'checkmark-done-outline', activeIcon: 'checkmark-done', label: 'Việc cần làm' },
  { key: 'account', icon: 'person-outline', activeIcon: 'person', label: 'Tài khoản' },
];

const refereeTabs = [
  { key: 'overview', icon: 'grid-outline', activeIcon: 'grid', label: 'Tổng quan' },
  { key: 'operations', icon: 'flag-outline', activeIcon: 'flag', label: 'Điều hành' },
  { key: 'schedule', icon: 'calendar-outline', activeIcon: 'calendar', label: 'Lịch' },
  { key: 'tasks', icon: 'checkmark-done-outline', activeIcon: 'checkmark-done', label: 'Việc cần làm' },
  { key: 'account', icon: 'person-outline', activeIcon: 'person', label: 'Tài khoản' },
];

const HIDDEN_NOTIFICATION_METADATA_KEYS = new Set([
  'id',
  'link',
  'invitationId',
  'ownerId',
  'horseId',
  'jockeyId',
  'tournamentId',
  'raceId',
  'registrationId',
]);

const NOTIFICATION_METADATA_LABELS = {
  responseNote: 'Lý do/ghi chú',
  reason: 'Lý do',
  status: 'Trạng thái',
  horseName: 'Ngựa',
  jockeyName: 'Jockey',
  ownerName: 'Owner',
  tournamentName: 'Giải đấu',
  raceName: 'Cuộc đua',
  violationType: 'Loại vi phạm',
  severity: 'Mức độ nghiêm trọng',
  penalty: 'Hình phạt đề xuất',
  description: 'Mô tả lỗi vi phạm',
};

const NOTIFICATION_TYPE_LABELS = {
  JOCKEY_INVITATION_CREATED: 'Lời mời jockey mới',
  JOCKEY_INVITATION_ACCEPTED: 'Jockey đã chấp nhận',
  JOCKEY_INVITATION_REJECTED: 'Jockey đã từ chối',
  JOCKEY_INVITATION_CANCELLED: 'Lời mời jockey đã hủy',
  JOCKEY_ASSIGNMENT_CANCELLED: 'Phân công jockey đã hủy',
  REGISTRATION_REJECTED: 'Đăng ký bị từ chối',
  RACE_STARTED: 'Cuộc đua bắt đầu',
  RACE_RESULT_CONFIRMED: 'Kết quả đã xác nhận',
  GENERAL: 'Thông báo hệ thống',
};

const emptyNewHorse = {
  name: '',
  breed: '',
  age: '',
  gender: '',
  color: '',
  height: '',
  weight: '',
  imageFile: null,
  documentFile: null,
  imageUrl: '',
  documentUrl: '',
  healthStatus: 'Khỏe mạnh',
  racingStatus: 'can-race',
};

function createClientRequestKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sameViolation(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && String(a.id) === String(b.id)) return true;
  if (a.clientRequestKey && b.clientRequestKey && a.clientRequestKey === b.clientRequestKey) return true;
  return (
    String(a.raceId || '') === String(b.raceId || '') &&
    String(a.participantId || '') === String(b.participantId || '') &&
    String(a.horseName || a.horse || '') === String(b.horseName || b.horse || '') &&
    String(a.jockeyName || a.jockey || '') === String(b.jockeyName || b.jockey || '') &&
    String(a.type || '') === String(b.type || '') &&
    String(a.severity || '') === String(b.severity || '') &&
    String(a.description || '') === String(b.description || '')
  );
}

function tournamentOpenForRegistration(tournament) {
  return [
    tournament?.statusCode,
    tournament?.status,
  ].some((value) =>
    ['OPEN_REGISTRATION', 'Đang mở đăng ký', 'OPEN'].includes(String(value || '').trim()),
  );
}

function raceOpenForRegistration(race) {
  return [
    race?.statusCode,
    race?.status,
  ].some((value) =>
    ['OPEN_REGISTRATION', 'SCHEDULED', 'Đang mở đăng ký', 'Sắp chạy', 'Sắp diễn ra'].includes(String(value || '').trim()),
  );
}

function horseToForm(horse) {
  return {
    id: horse.id,
    name: horse.name || '',
    breed: horse.breed || '',
    age: horse.age ? String(horse.age) : '',
    gender: horse.gender || '',
    color: horse.color || '',
    height: horse.height ? String(horse.height) : '',
    weight: horse.weight ? String(horse.weight) : '',
    imageFile: null,
    documentFile: null,
    imageUrl: horse.imageUrl || '',
    documentUrl: horse.documentUrl || horse.licenseImageUrl || '',
    healthStatus: horse.healthStatus || 'Khỏe mạnh',
    racingStatus: horse.racingStatus || 'can-race',
  };
}

export default function RoleHomeScreen({ user, onLogout }) {
  const showAlert = useAppAlert();
  const [activeTab, setActiveTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const role = roleOrSpectator(user?.role);
  const name = displayName(user);
  const activityUserKey = user?.id || user?._id || user?.email || name;
  const visibleTabs = role === 'OWNER' ? ownerTabs : role === 'REFEREE' ? refereeTabs : tabs;

  // Modal States
  const [betModalVisible, setBetModalVisible] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);

  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [cardInfo, setCardInfo] = useState({ cardNumber: '4111111111111111', cardName: 'NGUYEN VAN A', expiry: '01/25', cvv: '123' });

  const [horseModalVisible, setHorseModalVisible] = useState(false);
  const [newHorse, setNewHorse] = useState(emptyNewHorse);

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    horseId: '',
    raceId: '',
    tournamentId: '',
    jockeyId: '',
    message: '',
    remunerationAmount: '',
  });
  const [allJockeys, setAllJockeys] = useState([]);
  const [ownerHorses, setOwnerHorses] = useState([]);
  const [ownerOpenRaces, setOwnerOpenRaces] = useState([]);
  const [ownerInvitations, setOwnerInvitations] = useState([]);
  const [ownerRegistrations, setOwnerRegistrations] = useState([]);
  const [ownerRaceOptions, setOwnerRaceOptions] = useState({ horses: [], jockeys: [] });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [activityHydrated, setActivityHydrated] = useState(false);
  const [serverNotifications, setServerNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');

  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    tournamentId: '',
    raceId: '',
    horseId: '',
    jockeyInvitationId: '',
  });
  const [ownerTournaments, setOwnerTournaments] = useState([]);
  const [tournamentRaces, setTournamentRaces] = useState([]);
  const [registerJockeys, setRegisterJockeys] = useState([]);

  const [refereeRaceModalVisible, setRefereeRaceModalVisible] = useState(false);
  const [selectedRefereeRace, setSelectedRefereeRace] = useState(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationDraft, setSimulationDraft] = useState(null);
  const [simulationConfirmed, setSimulationConfirmed] = useState(false);

  // Referee Violation States
  const [violationModalVisible, setViolationModalVisible] = useState(false);
  const [selectedViolationRace, setSelectedViolationRace] = useState(null);
  const [violationForm, setViolationForm] = useState({ participantId: '', gateNumber: '', type: 'Cản trở đối thủ', severity: 'Phạt nhẹ', description: '', penalty: '', imageFile: null });
  const [violationParticipants, setViolationParticipants] = useState([]);
  const [violationTypeOptions, setViolationTypeOptions] = useState([]);
  const [violationSeverityOptions, setViolationSeverityOptions] = useState([]);
  const [violationSubmitting, setViolationSubmitting] = useState(false);
  const violationSubmitLockRef = useRef(false);

  // Stats Details Modals States
  const [jockeyStatsModalVisible, setJockeyStatsModalVisible] = useState(false);
  const [spectatorTournamentsModalVisible, setSpectatorTournamentsModalVisible] = useState(false);


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

  async function loadNotifications({ silent = false } = {}) {
    try {
      if (!silent) setNotificationsLoading(true);
      setNotificationsError('');
      const page = await notificationService.list({ size: 50 });
      setServerNotifications(page.content || []);
    } catch (requestError) {
      setNotificationsError(requestError.message || 'Không tải được thông báo.');
    } finally {
      if (!silent) setNotificationsLoading(false);
    }
  }

  function refreshAll() {
    refreshData();
    loadNotifications();
  }

  useEffect(() => {
    const cleanup = refreshData();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    loadNotifications({ silent: true });
    const timer = setInterval(() => {
      loadNotifications({ silent: true });
    }, 10000);

    return () => clearInterval(timer);
  }, [role]);

  useEffect(() => {
    let active = true;
    setActivityHydrated(false);

    activityStorage
      .load(activityUserKey)
      .then((items) => {
        if (active) setActivityLog(items);
      })
      .finally(() => {
        if (active) setActivityHydrated(true);
      });

    return () => {
      active = false;
    };
  }, [activityUserKey]);

  useEffect(() => {
    if (!activityHydrated) return;
    activityStorage.save(activityUserKey, activityLog).catch(() => {});
  }, [activityHydrated, activityLog, activityUserKey]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, visibleTabs]);

  const stats = useMemo(() => buildStats(role, data), [data, role]);
  const notificationItems = useMemo(
    () => [...activityLog, ...serverNotifications].slice(0, 60),
    [activityLog, serverNotifications],
  );
  const notificationBadgeCount = useMemo(
    () => activityLog.length + serverNotifications.filter((item) => !item.read).length,
    [activityLog, serverNotifications],
  );

  function recordActivity(icon, title, detail, metadata) {
    const createdAt = new Date();
    setActivityLog((current) => [
      {
        id: `${createdAt.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
        icon,
        title,
        detail,
        time: createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        read: false,
        source: 'local',
        metadata,
      },
      ...current,
    ].slice(0, 30));
  }

  async function openNotifications() {
    setActivityModalVisible(true);
    loadNotifications();
  }

  async function markNotificationRead(item) {
    if (!item || item.source !== 'server' || item.read) return;
    setServerNotifications((current) =>
      current.map((notification) =>
        notification.id === item.id ? { ...notification, read: true } : notification,
      ),
    );
    try {
      await notificationService.markRead(item.id);
    } catch {
      loadNotifications({ silent: true });
    }
  }

  async function markAllNotificationsRead() {
    setActivityLog((current) => current.map((item) => ({ ...item, read: true })));
    setServerNotifications((current) => current.map((item) => ({ ...item, read: true })));
    try {
      await notificationService.markAllRead();
    } catch (requestError) {
      setNotificationsError(requestError.message || 'Không đánh dấu được thông báo.');
      loadNotifications({ silent: true });
    }
  }

  async function respondToNotificationInvitation(item, action, note) {
    const invitationId = item?.metadata?.invitationId || '';
    if (!invitationId) {
      throw new Error('Thông báo này thiếu invitationId.');
    }

    const updated = await jockeyService.respondInvitation(invitationId, action, note);
    setData((current) => ({
      ...current,
      invitations: (current.invitations || []).map((invitation) =>
        String(invitation.id) === String(invitationId)
          ? { ...invitation, status: updated?.status || invitation.status, responseNote: updated?.responseNote || note }
          : invitation,
      ),
    }));

    recordActivity(
      action === 'accept' ? 'checkmark-circle-outline' : 'close-circle-outline',
      action === 'accept' ? 'Đã chấp nhận lời mời jockey' : 'Đã từ chối lời mời jockey',
      note || updated?.horseName || item?.detail || 'Lời mời jockey',
    );
    await loadNotifications({ silent: true });
  }

  async function handleInvitationResponse(id, action, note = '') {
    const invitation = (data.invitations || []).find((item) => item.id === id);
    try {
      const updated =
        role === 'JOCKEY'
          ? await jockeyService.respondInvitation(id, action, note)
          : await invitationService.respond(id, action);
      setData((current) => ({
        ...current,
        invitations: (current.invitations || []).map((item) =>
          item.id === id
            ? { ...item, status: updated?.status || item.status, responseNote: updated?.responseNote || note }
            : item,
        ),
      }));
      recordActivity(
        action === 'accept' ? 'checkmark-circle-outline' : 'close-circle-outline',
        action === 'accept' ? 'Đã nhận lời mời' : 'Đã từ chối lời mời',
        updated?.horseName ||
          invitation?.horseName ||
          updated?.raceName ||
          invitation?.raceName ||
          invitation?.tournamentName ||
          'Lời mời jockey',
      );
      return updated;
    } catch (requestError) {
      setError(requestError.message || 'Không cập nhật được lời mời.');
      throw requestError;
    }
  }

  async function handleRefereeInvitationResponse(id, action) {
    const invitation = (data.invitations || []).find((item) => item.id === id);
    try {
      const updated = await refereeService.respondInvitation(id, action);
      setData((current) => ({
        ...current,
        invitations: (current.invitations || []).map((item) =>
          item.id === id ? { ...item, status: updated?.status || item.status } : item,
        ),
      }));
      recordActivity(
        action === 'accept' ? 'shield-checkmark-outline' : 'close-circle-outline',
        action === 'accept' ? 'Đã nhận lời mời trọng tài' : 'Đã từ chối lời mời trọng tài',
        updated?.raceName || invitation?.raceName || invitation?.tournamentName || 'Lời mời trọng tài',
      );
    } catch (requestError) {
      setError(requestError.message || 'Không cập nhật được lời mời trọng tài.');
    }
  }

  async function handleStartRace(id) {
    const race = [
      ...(data.races || []),
      ...(data.dashboard?.upcomingRaces || []),
    ].find((item) => item.id === id);
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
      recordActivity(
        'flag-outline',
        'Đã bắt đầu cuộc đua',
        updated?.name || race?.name || race?.raceName || 'Race',
      );
    } catch (requestError) {
      setError(requestError.message || 'Không bắt đầu được cuộc đua.');
    }
  }

  async function handleParticipantCheckIn(raceId, participantId, status) {
    const participant = (data.participants || []).find((item) => item.id === participantId);
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
      recordActivity(
        status === 'CHECKED_IN' ? 'checkmark-done-outline' : 'remove-circle-outline',
        status === 'CHECKED_IN' ? 'Đã check-in participant' : 'Đã đánh dấu vắng mặt',
        updated?.horseName || participant?.horseName || participant?.raceName || 'Participant',
      );
    } catch (requestError) {
      setError(requestError.message || 'Không check-in được participant.');
    }
  }

  async function handleUpdateGate(raceId, participantId, gateNumber) {
    try {
      const updated = await refereeService.updateParticipantGate(raceId, participantId, gateNumber);
      setData((current) => ({
        ...current,
        participants: (current.participants || []).map((item) =>
          item.id === participantId
            ? { ...item, gateNumber: updated?.gateNumber ?? gateNumber }
            : item,
        ),
      }));
    } catch (requestError) {
      showAlert('Lỗi', requestError.message || 'Không cập nhật được cổng xuất phát.');
    }
  }

  async function handleRandomizeGates(raceId) {
    try {
      setLoading(true);
      const raceParticipants = (data.participants || []).filter((p) => String(p.raceId) === String(raceId));
      if (raceParticipants.length === 0) {
        showAlert('Lỗi', 'Không có ngựa nào tham gia cuộc đua này.');
        return;
      }

      const gates = Array.from({ length: raceParticipants.length }, (_, i) => i + 1);
      for (let i = gates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gates[i], gates[j]] = [gates[j], gates[i]];
      }

      const updatedList = [];
      for (let i = 0; i < raceParticipants.length; i++) {
        const p = raceParticipants[i];
        const gate = gates[i];
        const updated = await refereeService.updateParticipantGate(raceId, p.id, gate);
        updatedList.push({ id: p.id, gateNumber: updated?.gateNumber ?? gate });
      }

      setData((current) => ({
        ...current,
        participants: (current.participants || []).map((item) => {
          const match = updatedList.find((up) => String(up.id) === String(item.id));
          return match ? { ...item, gateNumber: match.gateNumber } : item;
        }),
      }));
      showAlert('Thành công', 'Đã chia chuồng ngẫu nhiên cho tất cả ngựa.');
    } catch (requestError) {
      showAlert('Lỗi', requestError.message || 'Không chia chuồng ngẫu nhiên được.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOwnerInvitationCancel(id) {
    const invitation = (data.invitations || []).find((item) => item.id === id);
    try {
      const updated = await ownerService.cancelJockeyInvitation(id);
      setData((current) => ({
        ...current,
        invitations: (current.invitations || []).map((item) =>
          item.id === id ? { ...item, status: updated?.status || item.status } : item,
        ),
      }));
      recordActivity(
        'mail-open-outline',
        'Đã hủy lời mời jockey',
        updated?.jockeyName || invitation?.jockeyName || invitation?.horseName || 'Jockey',
      );
    } catch (requestError) {
      setError(requestError.message || 'Không hủy được lời mời jockey.');
    }
  }

  async function handleOwnerRegistrationWithdraw(id) {
    const registration = (data.registrations || []).find((item) => item.id === id);
    try {
      const updated = await ownerService.withdrawRegistration(id);
      setData((current) => ({
        ...current,
        registrations: (current.registrations || []).map((item) =>
          item.id === id ? { ...item, ...updated } : item,
        ),
      }));
      recordActivity(
        'reader-outline',
        'Đã rút đăng ký race',
        updated?.raceName ||
          registration?.raceName ||
          updated?.tournamentName ||
          registration?.tournamentName ||
          'Đăng ký',
      );
    } catch (requestError) {
      setError(requestError.message || 'Không rút được đăng ký race.');
    }
  }

  // Place Bet Handler
  async function submitPlaceBet() {
    if (!selectedMarket || !selectedOption || !betAmount) {
      showAlert('Lỗi', 'Vui lòng chọn ngựa và nhập số tiền cược.');
      return;
    }
    const amount = Number(betAmount);
    if (isNaN(amount) || amount < selectedMarket.minStake || amount > selectedMarket.maxStake) {
      showAlert('Lỗi', `Số tiền phải từ ${selectedMarket.minStake.toLocaleString()}đ đến ${selectedMarket.maxStake.toLocaleString()}đ.`);
      return;
    }

    try {
      setLoading(true);
      await spectatorService.placeBet(selectedMarket.raceId, {
        participantId: selectedOption.participantId,
        stakeAmount: amount,
        idempotencyKey: 'bet-' + Date.now(),
      });
      recordActivity(
        'ticket-outline',
        'Đã đặt cược',
        `${selectedOption.horseName || 'Ngựa'} · ${amount.toLocaleString('vi-VN')}đ`,
      );
      showAlert('Thành công', 'Đã đặt cược thành công.');
      setBetModalVisible(false);
      setBetAmount('');
      setSelectedOption(null);
      refreshData();
    } catch (err) {
      showAlert('Lỗi', err.message || 'Không đặt được cược.');
    } finally {
      setLoading(false);
    }
  }

  // Wallet Deposit Handler
  async function submitDeposit() {
    const amount = Number(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert('Lỗi', 'Vui lòng nhập số tiền nạp hợp lệ.');
      return;
    }

    try {
      setLoading(true);
      const order = await spectatorService.createDeposit(amount);
      if (!order || !order.id) {
        throw new Error('Không tạo được lệnh nạp tiền.');
      }
      
      // Pay using card details
      await spectatorService.payCardDeposit(order.id, cardInfo);
      recordActivity('wallet-outline', 'Đã nạp ví', `${amount.toLocaleString('vi-VN')}đ`);
      showAlert('Thành công', `Đã nạp thành công ${amount.toLocaleString()}đ vào ví.`);
      setDepositModalVisible(false);
      setDepositAmount('');
      refreshData();
    } catch (err) {
      showAlert('Lỗi', err.message || 'Thanh toán thất bại.');
    } finally {
      setLoading(false);
    }
  }

  // Create Horse Handler
  async function submitCreateHorse() {
    if (!newHorse.name || !newHorse.breed || !newHorse.age) {
      showAlert('Lỗi', 'Vui lòng nhập đầy đủ thông tin ngựa.');
      return;
    }

    try {
      setLoading(true);
      if (newHorse.id) {
        await horseService.update(newHorse.id, newHorse);
        recordActivity('create-outline', 'Đã sửa ngựa', newHorse.name);
        showAlert('Thành công', `Đã cập nhật ngựa ${newHorse.name} thành công.`);
      } else {
        await horseService.create(newHorse);
        recordActivity('footsteps-outline', 'Đã tạo ngựa', newHorse.name);
        showAlert('Thành công', `Đã thêm ngựa ${newHorse.name} thành công.`);
      }
      setHorseModalVisible(false);
      setNewHorse(emptyNewHorse);
      refreshData();
    } catch (err) {
      showAlert('Lỗi', err.message || 'Không lưu được ngựa.');
    } finally {
      setLoading(false);
    }
  }

  function openEditHorse(horse) {
    setNewHorse(horseToForm(horse));
    setHorseModalVisible(true);
  }

  async function confirmDeleteHorse(horse) {
    try {
      setLoading(true);
      await horseService.remove(horse.id);
      recordActivity('trash-outline', 'Đã xóa ngựa', horse.name || 'Ngựa');
      showAlert('Thành công', `Đã xóa ngựa ${horse.name} thành công.`);
      refreshData();
    } catch (err) {
      showAlert('Lỗi', err.message || 'Không xóa được ngựa.');
    } finally {
      setLoading(false);
    }
  }

  function deleteHorse(horse) {
    showAlert(
      'Xóa ngựa',
      `Bạn có chắc muốn xóa ngựa ${horse.name || 'này'}?`,
      [
        { text: 'Hủy' },
        { text: 'Xóa', style: 'destructive', onPress: () => confirmDeleteHorse(horse) },
      ],
    );
  }

  // Open Invite Modal Handler
  async function openInviteModal() {
    try {
      setLoading(true);
      const [horses, jockeys, invitations, registrations] = await Promise.all([
        ownerService.listHorses(),
        userService.listJockeyDirectory(),
        ownerService.listJockeyInvitations(),
        ownerService.listRaceRegistrations(),
      ]);
      const availableJockeys = (jockeys || []).filter((jockey) => jockey.canInvite !== false);
      const eligibleHorses = (horses || []).filter(isOwnerHorseRaceEligible);
      setOwnerHorses(eligibleHorses);
      setAllJockeys(availableJockeys);
      setOwnerInvitations(invitations || []);
      setOwnerRegistrations(registrations || []);

      // Extract all open races across open tournaments
      const tournaments = await tournamentService.listOwnerOpen();
      const openRaces = [];
      (tournaments || []).forEach(t => {
        (t.races || []).forEach(r => {
          if (raceOpenForRegistration(r)) {
            openRaces.push({
              id: r.id || r._id,
              name: `Race R${r.raceNumber} · ${r.name}`,
              tournamentId: t.id || t._id,
              tournamentName: t.name,
              entryFee: r.entryFee,
              scheduledStartAt: r.scheduledStartAt || '',
              scheduledEndAt: r.scheduledEndAt || '',
            });
          }
        });
      });
      const openTournaments = (tournaments || []).filter(tournamentOpenForRegistration);
      setOwnerTournaments(openTournaments);
      setOwnerOpenRaces(openRaces);
      const firstRace = openRaces[0];
      const availableHorses = eligibleHorses.filter(
        (horse) =>
          firstRace &&
          !raceHorseLockedByInvitation(invitations, firstRace, horse.id) &&
          !raceHorseLockedByRegistration(registrations, firstRace, horse.id),
      );
      const availableRaceJockeys = availableJockeys.filter(
        (jockey) =>
          firstRace &&
          !raceJockeyLockedByInvitation(invitations, firstRace, jockey.id) &&
          !raceJockeyLockedByRegistration(registrations, firstRace, jockey.id),
      );

      setInviteForm({
        horseId: availableHorses[0]?.id || '',
        jockeyId: availableRaceJockeys[0]?.id || '',
        raceId: firstRace?.id || '',
        tournamentId: firstRace?.tournamentId || '',
        message: '',
        remunerationAmount: firstRace?.entryFee ? String(firstRace.entryFee) : '500000'
      });
      setInviteError(
        availableJockeys.length && availableHorses.length
          ? ''
          : eligibleHorses.length
            ? 'Race này chưa còn cặp ngựa/jockey khả dụng để gửi lời mời.'
            : 'Bạn cần có ít nhất một ngựa đã duyệt và đủ điều kiện thi đấu.',
      );
      setInviteModalVisible(true);
    } catch (err) {
      showAlert('Lỗi', err.message || 'Không lấy được thông tin ngựa và jockey.');
    } finally {
      setLoading(false);
    }
  }

  // Create Jockey Invitation Handler
  async function submitJockeyInvitation() {
    setInviteError('');

    if (!inviteForm.horseId || !inviteForm.raceId || !inviteForm.tournamentId || !inviteForm.jockeyId) {
      setInviteError('Vui lòng chọn ngựa, cuộc đua và jockey.');
      return;
    }

    const remunerationAmount = Number(inviteForm.remunerationAmount);
    if (!Number.isFinite(remunerationAmount) || remunerationAmount < 0) {
      setInviteError('Vui lòng nhập mức thù lao hợp lệ.');
      return;
    }

    const selectedRace = ownerOpenRaces.find((race) =>
      sameOwnerFlowId(race.id, inviteForm.raceId),
    ) || inviteForm.raceId;

    if (
      raceHorseLockedByInvitation(ownerInvitations, selectedRace, inviteForm.horseId) ||
      raceHorseLockedByRegistration(ownerRegistrations, selectedRace, inviteForm.horseId)
    ) {
      setInviteError('Ngựa này đã có jockey hoặc đã đăng ký trong cuộc đua này.');
      return;
    }

    if (
      raceJockeyLockedByInvitation(ownerInvitations, selectedRace, inviteForm.jockeyId) ||
      raceJockeyLockedByRegistration(ownerRegistrations, selectedRace, inviteForm.jockeyId)
    ) {
      setInviteError('Jockey này đã có lời mời trong cuộc đua này.');
      return;
    }

    try {
      setInviteSubmitting(true);
      const acceptedRaceLocks = await ownerService.listAcceptedRacesForJockey(inviteForm.jockeyId);
      if (jockeyLockedForRace(acceptedRaceLocks, inviteForm.raceId)) {
        setInviteError('Jockey này đã nhận điều khiển ngựa khác trong cuộc đua này.');
        return;
      }
      await ownerService.createJockeyInvitation({
        ...inviteForm,
        remunerationAmount,
        idempotencyKey: 'invite-' + Date.now()
      });
      setOwnerInvitations((current) => [
        ...current,
        {
          id: `local-${Date.now()}`,
          horseId: inviteForm.horseId,
          jockeyId: inviteForm.jockeyId,
          raceId: inviteForm.raceId,
          status: 'Chờ xử lý',
        },
      ]);
      const invitedJockey = allJockeys.find((jockey) => jockey.id === inviteForm.jockeyId);
      const invitedHorse = ownerHorses.find((horse) => horse.id === inviteForm.horseId);
      recordActivity(
        'mail-outline',
        'Đã gửi lời mời jockey',
        `${invitedJockey?.fullName || invitedJockey?.name || invitedJockey?.username || 'Jockey'} · ${invitedHorse?.name || 'Ngựa'}`,
      );
      setInviteModalVisible(false);
      showAlert('Thành công', 'Đã gửi lời mời tới jockey thành công.');
      refreshData();
    } catch (err) {
      setInviteError(err.message || 'Không gửi được lời mời.');
    } finally {
      setInviteSubmitting(false);
    }
  }

  // Open Register Modal Handler
  async function openRegisterModal() {
    try {
      setLoading(true);
      const [tournaments, horses, invitations, registrations] = await Promise.all([
        tournamentService.listOwnerOpen(),
        ownerService.listHorses(),
        ownerService.listJockeyInvitations(),
        ownerService.listRaceRegistrations(),
      ]);
      const openTournaments = (tournaments || []).filter(tournamentOpenForRegistration);
      const acceptedInvitations = uniqueAcceptedRaceHorseInvitations(invitations);
      const eligibleHorses = (horses || []).filter(isOwnerHorseRaceEligible);
      const eligibleHorseIds = new Set(eligibleHorses.map((horse) => String(horse.id)));
      const eligibleInvitations = acceptedInvitations.filter((item) =>
        eligibleHorseIds.has(String(item.horseId)),
      );
      setOwnerTournaments(openTournaments);
      setOwnerHorses(eligibleHorses);
      setOwnerInvitations(invitations || []);
      setOwnerRegistrations(registrations || []);
      setRegisterJockeys(eligibleInvitations);

      if (openTournaments.length > 0) {
        const races = (openTournaments[0].races || []).filter(raceOpenForRegistration);
        const selectedRaceId = races[0]?.id || races[0]?._id || '';
        const raceOptions = selectedRaceId
          ? await tournamentService.getOwnerRaceOptions(openTournaments[0].id, selectedRaceId)
          : { horses: [], jockeys: [] };
        setOwnerRaceOptions(raceOptions);
        const availableHorseIds = new Set(
          (raceOptions.horses || [])
            .filter((item) => item.available)
            .map((item) => String(item.id)),
        );
        const availableJockeyIds = new Set(
          (raceOptions.jockeys || [])
            .filter((item) => item.available)
            .map((item) => String(item.id)),
        );
        const raceInvitations = eligibleInvitations.filter(
          (item) =>
            sameOwnerFlowId(item.raceId, selectedRaceId) &&
            availableHorseIds.has(String(item.horseId)) &&
            availableJockeyIds.has(String(item.jockeyId)) &&
            !raceHorseLockedByRegistration(registrations, selectedRaceId, item.horseId) &&
            !raceJockeyLockedByRegistration(registrations, selectedRaceId, item.jockeyId),
        );
        const firstInv = raceInvitations[0];
        setTournamentRaces(races);
        setRegisterForm({
          tournamentId: openTournaments[0].id || openTournaments[0]._id,
          raceId: selectedRaceId,
          horseId: firstInv ? firstInv.horseId : '',
          jockeyInvitationId: firstInv ? firstInv.id : '',
        });
      } else {
        setOwnerRaceOptions({ horses: [], jockeys: [] });
        setTournamentRaces([]);
        setRegisterForm({ tournamentId: '', raceId: '', horseId: '', jockeyInvitationId: '' });
      }
      setRegisterModalVisible(true);
    } catch (err) {
      showAlert('Lỗi', 'Không lấy được thông tin đăng ký giải.');
    } finally {
      setLoading(false);
    }
  }

  function handleStatPress(statId) {
    switch (statId) {
      // OWNER stats
      case 'my_horses':
        setActiveTab('horses');
        break;
      case 'open_tournaments':
        openRegisterModal();
        break;
      case 'registrations':
        setActiveTab('schedule');
        break;
      case 'jockey_invitations':
        setActiveTab('tasks');
        break;

      // JOCKEY stats
      case 'races':
        setActiveTab('schedule');
        break;
      case 'pending_invitations':
        setActiveTab('tasks');
        break;
      case 'wins':
      case 'payout':
        setJockeyStatsModalVisible(true);
        break;

      // REFEREE stats
      case 'assigned_races':
        setActiveTab('schedule');
        break;
      case 'pending_checkin':
      case 'checked_in':
      case 'referee_invitations':
        setActiveTab('tasks');
        break;

      // SPECTATOR stats
      case 'wallet_balance':
        setDepositModalVisible(true);
        break;
      case 'spectator_tournaments':
        setSpectatorTournamentsModalVisible(true);
        break;
      case 'open_bets':
        setActiveTab('schedule');
        break;
      case 'total_bets':
        setActiveTab('tasks');
        break;
      default:
        break;
    }
  }

  // Change selected tournament in register form
  async function handleRegisterTournamentChange(tournamentId) {
    try {
      const t = ownerTournaments.find(item => (item.id || item._id) === tournamentId);
      const races = t ? (t.races || []).filter(raceOpenForRegistration) : [];
      setTournamentRaces(races);
      const nextRaceId = races[0]?.id || races[0]?._id || '';
      const raceOptions = nextRaceId
        ? await tournamentService.getOwnerRaceOptions(tournamentId, nextRaceId)
        : { horses: [], jockeys: [] };
      setOwnerRaceOptions(raceOptions);
      const availableHorseIds = new Set(
        (raceOptions.horses || []).filter((item) => item.available).map((item) => String(item.id)),
      );
      const availableJockeyIds = new Set(
        (raceOptions.jockeys || []).filter((item) => item.available).map((item) => String(item.id)),
      );
      const raceInvitations = registerJockeys.filter(
        (item) =>
          sameOwnerFlowId(item.raceId, nextRaceId) &&
          availableHorseIds.has(String(item.horseId)) &&
          availableJockeyIds.has(String(item.jockeyId)) &&
          !raceHorseLockedByRegistration(ownerRegistrations, nextRaceId, item.horseId) &&
          !raceJockeyLockedByRegistration(ownerRegistrations, nextRaceId, item.jockeyId),
      );
      const firstInv = raceInvitations[0];
      setRegisterForm(current => ({
        ...current,
        tournamentId,
        raceId: nextRaceId,
        horseId: firstInv ? firstInv.horseId : '',
        jockeyInvitationId: firstInv ? firstInv.id : '',
      }));
    } catch (requestError) {
      showAlert('Lỗi', requestError.message || 'Không tải được lựa chọn cho giải đấu.');
    }
  }

  async function handleRegisterRaceChange(raceId) {
    try {
      const raceOptions = await tournamentService.getOwnerRaceOptions(
        registerForm.tournamentId,
        raceId,
      );
      setOwnerRaceOptions(raceOptions);
      const availableHorseIds = new Set(
        (raceOptions.horses || []).filter((item) => item.available).map((item) => String(item.id)),
      );
      const availableJockeyIds = new Set(
        (raceOptions.jockeys || []).filter((item) => item.available).map((item) => String(item.id)),
      );
      const firstInv = registerJockeys.find(
        (item) =>
          sameOwnerFlowId(item.raceId, raceId) &&
          availableHorseIds.has(String(item.horseId)) &&
          availableJockeyIds.has(String(item.jockeyId)),
      );
      setRegisterForm((current) => ({
        ...current,
        raceId,
        horseId: firstInv?.horseId || '',
        jockeyInvitationId: firstInv?.id || '',
      }));
    } catch (requestError) {
      showAlert('Lỗi', requestError.message || 'Không tải được lựa chọn cho cuộc đua.');
    }
  }

  // Submit Registration Handler
  async function submitRegistration() {
    if (!registerForm.tournamentId || !registerForm.raceId || !registerForm.horseId || !registerForm.jockeyInvitationId) {
      showAlert('Lỗi', 'Vui lòng chọn race, ngựa và lời mời jockey đã được chấp nhận.');
      return;
    }

    const invitation = registerJockeys.find((item) =>
      sameOwnerFlowId(item.id, registerForm.jockeyInvitationId),
    );
    if (
      !invitation ||
      !sameOwnerFlowId(invitation.raceId, registerForm.raceId) ||
      !sameOwnerFlowId(invitation.horseId, registerForm.horseId)
    ) {
      showAlert('Lỗi', 'Lời mời jockey không khớp với ngựa/cuộc đua đã chọn.');
      return;
    }

    try {
      const freshOptions = await tournamentService.getOwnerRaceOptions(
        registerForm.tournamentId,
        registerForm.raceId,
      );
      const horseOption = (freshOptions.horses || []).find((item) =>
        sameOwnerFlowId(item.id, registerForm.horseId),
      );
      const jockeyOption = (freshOptions.jockeys || []).find((item) =>
        sameOwnerFlowId(item.id, invitation.jockeyId),
      );
      if (!horseOption?.available) {
        showAlert('Không thể đăng ký', horseOption?.unavailableReason || 'Ngựa không còn khả dụng.');
        return;
      }
      if (!jockeyOption?.available) {
        showAlert('Không thể đăng ký', jockeyOption?.unavailableReason || 'Jockey không còn khả dụng.');
        return;
      }
    } catch (requestError) {
      showAlert('Lỗi', requestError.message || 'Không kiểm tra được điều kiện đăng ký.');
      return;
    }

    if (raceHorseLockedByRegistration(ownerRegistrations, registerForm.raceId, registerForm.horseId)) {
      showAlert('Lỗi', 'Ngựa này đã được đăng ký trong cuộc đua này.');
      return;
    }

    if (raceJockeyLockedByRegistration(ownerRegistrations, registerForm.raceId, invitation.jockeyId)) {
      showAlert('Lỗi', 'Jockey này đã được đăng ký trong cuộc đua này.');
      return;
    }

    try {
      setLoading(true);
      await ownerService.createRegistration({
        raceId: registerForm.raceId,
        horseId: registerForm.horseId,
        jockeyInvitationId: registerForm.jockeyInvitationId,
      });
      const registeredHorse = ownerHorses.find((horse) => horse.id === registerForm.horseId);
      recordActivity('trophy-outline', 'Đã đăng ký giải', registeredHorse?.name || 'Ngựa');
      showAlert('Thành công', 'Đăng ký tham gia giải đấu thành công.');
      setRegisterModalVisible(false);
      refreshData();
    } catch (err) {
      showAlert('Lỗi', err.message || 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  }

  // Open Referee Simulation Modal
  function openRefereeRaceModal(race) {
    setSelectedRefereeRace(race);
    setSimulationResult(null);
    setSimulationDraft(null);
    setSimulationConfirmed(false);
    setSimulationLoading(false);
    setRefereeRaceModalVisible(true);
  }

  // Run Race Simulation Handler
  async function runRaceSimulation() {
    if (!selectedRefereeRace) return;
    try {
      setSimulationLoading(true);
      const res = await refereeService.generateSimulation(selectedRefereeRace.id);
      setSimulationResult(res);
      setSimulationDraft(null);
      recordActivity('play-circle-outline', 'Đã chạy mô phỏng', selectedRefereeRace.name || 'Race');
      
      // Simulate playback loading
      setTimeout(() => {
        setSimulationLoading(false);
      }, 2000);
    } catch (err) {
      setSimulationLoading(false);
      showAlert('Lỗi', err.message || 'Mô phỏng thất bại.');
    }
  }

  // Confirm Simulation Handler
  async function confirmRaceSimulation() {
    if (!selectedRefereeRace || !simulationResult) return;
    try {
      setLoading(true);
      const confirmed = await refereeService.confirmSimulation(selectedRefereeRace.id, simulationResult.runId);
      if (confirmed?.simulation) {
        setSimulationResult(confirmed.simulation);
      }
      setSimulationDraft(confirmed?.resultDraft || null);
      setSimulationConfirmed(true);
      recordActivity('checkmark-circle-outline', 'Đã xác nhận mô phỏng', selectedRefereeRace.name || 'Race');
      showAlert('Thành công', 'Đã xác nhận kết quả mô phỏng. Bản nháp đã sẵn sàng để chốt.');
    } catch (err) {
      showAlert('Lỗi', err.message || 'Xác nhận thất bại.');
    } finally {
      setLoading(false);
    }
  }

  // Finalize Race Results Handler
  async function finalizeRaceResults() {
    if (!selectedRefereeRace || !simulationResult) return;
    try {
      setLoading(true);
      const draft = simulationDraft || await refereeService.getResultDraft(selectedRefereeRace.id);
      if (!draft?.version) {
        throw new Error('Chưa có bản nháp kết quả. Vui lòng xác nhận mô phỏng trước.');
      }
      await refereeService.finalizeResults(selectedRefereeRace.id, { draftVersion: draft.version });
      recordActivity('trophy-outline', 'Đã chốt kết quả race', selectedRefereeRace.name || 'Race');
      showAlert('Thành công', 'Đã chốt kết quả cuộc đua thành công.');
      setRefereeRaceModalVisible(false);
      refreshData();
    } catch (err) {
      showAlert('Lỗi', err.message || 'Chốt kết quả thất bại.');
    } finally {
      setLoading(false);
    }
  }

  // Open Violation Modal Handler
  async function openViolationModal(race) {
    setSelectedViolationRace(race);
    try {
      setLoading(true);
      const [list, types, severities] = await Promise.all([
        refereeService.listParticipants(race),
        systemSettingsService.listViolationTypes(),
        systemSettingsService.listViolationSeverities(),
      ]);
      const safeTypes = types?.length ? types : [{ id: 'OTHER', label: 'Khác' }];
      const safeSeverities = severities?.length ? severities : [{ id: 'MINOR', label: 'Phạt nhẹ' }];
      setViolationParticipants(list || []);
      setViolationTypeOptions(safeTypes);
      setViolationSeverityOptions(safeSeverities);
      setViolationForm({
        participantId: list[0]?.id || '',
        gateNumber: list[0]?.gateNumber ? String(list[0].gateNumber) : '1',
        type: safeTypes[0]?.label || 'Khác',
        severity: safeSeverities.find((item) => item.label === 'Phạt nhẹ')?.label || safeSeverities[0]?.label || 'Phạt nhẹ',
        description: '',
        penalty: '',
        imageFile: null,
        idempotencyKey: createClientRequestKey(`violation-${race.id}`),
      });
      setViolationModalVisible(true);
    } catch (err) {
      showAlert('Lỗi', 'Không tải được danh sách người tham gia cuộc đua.');
    } finally {
      setLoading(false);
    }
  }

  // Submit Violation Handler
  async function submitViolation() {
    if (!selectedViolationRace) return;
    if (violationSubmitting || violationSubmitLockRef.current) return;
    if (!violationForm.participantId) {
      showAlert('Lỗi', 'Vui lòng chọn Jockey/Ngựa vi phạm.');
      return;
    }
    try {
      violationSubmitLockRef.current = true;
      setViolationSubmitting(true);
      setLoading(true);
      const selectedPart = violationParticipants.find(p => p.id === violationForm.participantId);
      const created = await refereeService.createViolation(selectedViolationRace.id, {
        ...violationForm,
        gateNumber: selectedPart?.gateNumber || violationForm.gateNumber,
        idempotencyKey: violationForm.idempotencyKey || createClientRequestKey(`violation-${selectedViolationRace.id}`),
      });
      recordActivity(
        'warning-outline',
        'Đã lập biên bản vi phạm',
        selectedPart?.horseName || selectedViolationRace.name || 'Race',
        {
          raceName: selectedViolationRace.name,
          jockeyName: selectedPart?.jockeyName || 'Chưa rõ',
          horseName: selectedPart?.horseName || 'Chưa rõ',
          violationType: violationForm.type,
          severity: violationForm.severity,
          penalty: violationForm.penalty || 'Không đề xuất',
          description: violationForm.description || 'Không có mô tả',
        }
      );
      // Add newly created violation to data immediately for real-time display
      if (created) {
        setData((current) => ({
          ...current,
          violations: [
            created,
            ...(current.violations || []).filter((item) => !sameViolation(item, created)),
          ],
        }));
      }
      setViolationModalVisible(false);
      setViolationForm({
        participantId: violationParticipants[0]?.id || '',
        gateNumber: violationParticipants[0]?.gateNumber ? String(violationParticipants[0].gateNumber) : '1',
        type: violationTypeOptions[0]?.label || 'Khác',
        severity: violationSeverityOptions.find((item) => item.label === 'Phạt nhẹ')?.label || violationSeverityOptions[0]?.label || 'Phạt nhẹ',
        description: '',
        penalty: '',
        imageFile: null,
        idempotencyKey: createClientRequestKey(`violation-${selectedViolationRace.id}`),
      });
      showAlert('Thành công', 'Đã lập biên bản vi phạm.');
    } catch (err) {
      showAlert('Lỗi', err.message || 'Không lập được biên bản vi phạm.');
    } finally {
      setLoading(false);
      setViolationSubmitting(false);
      violationSubmitLockRef.current = false;
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.app}>
        <View style={styles.header}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.eyebrow}>{getRoleLabel(role)} Portal</Text>
            <Text style={styles.title} numberOfLines={1}>{name}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.refreshButton} onPress={refreshAll}>
              <Ionicons name="refresh-outline" size={19} color={colors.darkText} />
            </Pressable>
            <Pressable style={styles.refreshButton} onPress={openNotifications}>
              <Ionicons name="notifications-outline" size={19} color={colors.darkText} />
              {notificationBadgeCount ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{notificationBadgeCount > 9 ? '9+' : notificationBadgeCount}</Text>
                </View>
              ) : null}
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
              <Overview
                role={role}
                stats={stats}
                data={data}
                query={query}
                onOpenDepositModal={() => setDepositModalVisible(true)}
                onOpenHorseModal={() => setHorseModalVisible(true)}
                onOpenInviteModal={openInviteModal}
                onOpenRegisterModal={openRegisterModal}
                onOpenBetModal={(market) => {
                  setSelectedMarket(market);
                  setSelectedOption(market.options[0] || null);
                  setBetModalVisible(true);
                }}
                onStatPress={handleStatPress}
              />
            ) : null}
            {activeTab === 'schedule' ? (
              role === 'REFEREE' ? (
                <RefereeCalendar
                  data={data}
                  query={query}
                  onStartRace={handleStartRace}
                  onOpenRefereeRaceModal={openRefereeRaceModal}
                  onOpenViolationModal={openViolationModal}
                  onParticipantCheckIn={handleParticipantCheckIn}
                  onUpdateGate={handleUpdateGate}
                  onRandomizeGates={handleRandomizeGates}
                />
              ) : (
                <Schedule
                  role={role}
                  data={data}
                  query={query}
                  onOwnerRegistrationWithdraw={handleOwnerRegistrationWithdraw}
                  onStartRace={handleStartRace}
                  onOpenBetModal={(market) => {
                    setSelectedMarket(market);
                    setSelectedOption(market.options[0] || null);
                    setBetModalVisible(true);
                  }}
                  onOpenRefereeRaceModal={openRefereeRaceModal}
                  onOpenViolationModal={openViolationModal}
                  onParticipantCheckIn={handleParticipantCheckIn}
                  onUpdateGate={handleUpdateGate}
                  onRandomizeGates={handleRandomizeGates}
                />
              )
            ) : null}
            {activeTab === 'operations' && role === 'REFEREE' ? (
              <Schedule
                role={role}
                data={data}
                query={query}
                onStartRace={handleStartRace}
                onOpenRefereeRaceModal={openRefereeRaceModal}
                onOpenViolationModal={openViolationModal}
                onParticipantCheckIn={handleParticipantCheckIn}
                onUpdateGate={handleUpdateGate}
                onRandomizeGates={handleRandomizeGates}
              />
            ) : null}
            {activeTab === 'horses' ? (
              <Horses
                data={data}
                query={query}
                onOpenHorseModal={() => {
                  setNewHorse(emptyNewHorse);
                  setHorseModalVisible(true);
                }}
                onEditHorse={openEditHorse}
                onDeleteHorse={deleteHorse}
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
                onOpenViolationModal={openViolationModal}
                onStartRace={handleStartRace}
                onOpenRefereeRaceModal={openRefereeRaceModal}
                onUpdateGate={handleUpdateGate}
                onRandomizeGates={handleRandomizeGates}
              />
            ) : null}
            {activeTab === 'account' ? (
              <Account
                user={user}
                role={role}
                data={data}
                onLogout={onLogout}
                onRecordActivity={recordActivity}
                onOpenDepositModal={() => setDepositModalVisible(true)}
                onProfileUpdated={(profile) =>
                  setData((current) => ({ ...current, profile: { ...current.profile, ...profile } }))
                }
                onRefresh={refreshData}
              />
            ) : null}
          </ScrollView>
        )}

        <View style={styles.tabBar}>
          {visibleTabs.map((tab) => {
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

        <RoleActionModals
          bet={{
            visible: betModalVisible,
            selectedMarket,
            selectedOption,
            betAmount,
            onChangeSelectedOption: setSelectedOption,
            onChangeBetAmount: setBetAmount,
            onClose: () => setBetModalVisible(false),
            onSubmit: submitPlaceBet,
          }}
          deposit={{
            visible: depositModalVisible,
            depositAmount,
            cardInfo,
            onChangeDepositAmount: setDepositAmount,
            onChangeCardInfo: setCardInfo,
            onClose: () => setDepositModalVisible(false),
            onSubmit: submitDeposit,
          }}
          horse={{
            visible: horseModalVisible,
            newHorse,
            onChangeNewHorse: setNewHorse,
            onClose: () => {
              setHorseModalVisible(false);
              setNewHorse(emptyNewHorse);
            },
            onSubmit: submitCreateHorse,
          }}
          invite={{
            visible: inviteModalVisible,
            ownerTournaments,
            ownerHorses,
            ownerOpenRaces,
            allJockeys,
            ownerInvitations,
            ownerRegistrations,
            inviteForm,
            inviteSubmitting,
            inviteError,
            onChangeInviteForm: setInviteForm,
            onClose: () => {
              setInviteModalVisible(false);
              setInviteError('');
            },
            onSubmit: submitJockeyInvitation,
          }}
          registration={{
            visible: registerModalVisible,
            ownerTournaments,
            tournamentRaces,
            ownerHorses,
            registerJockeys,
            ownerRegistrations,
            ownerRaceOptions,
            registerForm,
            onChangeTournament: handleRegisterTournamentChange,
            onChangeRace: handleRegisterRaceChange,
            onChangeRegisterForm: setRegisterForm,
            onClose: () => setRegisterModalVisible(false),
            onSubmit: submitRegistration,
          }}
          refereeRace={{
            visible: refereeRaceModalVisible,
            selectedRefereeRace,
            simulationLoading,
            simulationResult,
            simulationDraft,
            simulationConfirmed,
            onClose: () => setRefereeRaceModalVisible(false),
            onRunSimulation: runRaceSimulation,
            onConfirmSimulation: confirmRaceSimulation,
            onFinalizeResults: finalizeRaceResults,
          }}
          violation={{
            visible: violationModalVisible,
            selectedViolationRace,
            violationParticipants,
            violationForm,
            violationTypeOptions,
            violationSeverityOptions,
            violationSubmitting,
            onChangeViolationForm: setViolationForm,
            onClose: () => setViolationModalVisible(false),
            onSubmit: submitViolation,
          }}
        />

        <ActivityLogModal
          visible={activityModalVisible}
          items={notificationItems}
          loading={notificationsLoading}
          error={notificationsError}
          onClear={markAllNotificationsRead}
          onClose={() => setActivityModalVisible(false)}
          onPressItem={markNotificationRead}
          onRespondInvitation={role === 'JOCKEY' ? respondToNotificationInvitation : null}
        />

        <JockeyStatsModal
          visible={jockeyStatsModalVisible}
          onClose={() => setJockeyStatsModalVisible(false)}
          prizes={data.prizes}
        />

        <SpectatorTournamentsModal
          visible={spectatorTournamentsModalVisible}
          onClose={() => setSpectatorTournamentsModalVisible(false)}
          tournaments={data.tournaments}
        />
      </View>
    </SafeAreaView>
  );
}

function ActivityLogModal({ visible, items, loading, error, onClear, onClose, onPressItem, onRespondInvitation }) {
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (!visible) setSelectedItem(null);
  }, [visible]);

  function openItem(item) {
    onPressItem(item);
    setSelectedItem({ ...item, read: true });
  }

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.activityBackdrop}>
        <View style={styles.activityModal}>
          <View style={styles.activityHeader}>
            <View>
              <Text style={styles.activityEyebrow}>Thông báo</Text>
              <Text style={styles.activityTitle}>{selectedItem ? 'Chi tiết thông báo' : 'Nhật ký thao tác'}</Text>
            </View>
            <Pressable
              style={styles.activityClose}
              onPress={selectedItem ? () => setSelectedItem(null) : onClose}
            >
              <Ionicons name={selectedItem ? 'chevron-back' : 'close'} size={20} color={colors.darkText} />
            </Pressable>
          </View>

          {selectedItem ? (
            <NotificationDetail
              item={selectedItem}
              onRespondInvitation={onRespondInvitation}
              onResponded={(action, note) => {
                setSelectedItem((current) =>
                  current
                    ? {
                      ...current,
                      type: action === 'accept' ? 'JOCKEY_INVITATION_ACCEPTED' : 'JOCKEY_INVITATION_REJECTED',
                      title: action === 'accept' ? 'Đã chấp nhận lời mời jockey' : 'Đã từ chối lời mời jockey',
                      detail: note ? `${current.detail}\n\nLý do/ghi chú: ${note}` : current.detail,
                      metadata: { ...(current.metadata || {}), responseNote: note },
                      read: true,
                    }
                    : current,
                );
              }}
            />
          ) : (
            <ScrollView style={styles.activityList} contentContainerStyle={styles.activityListContent}>
              {loading ? (
                <View style={styles.activityEmpty}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.activityEmptyText}>Đang tải thông báo...</Text>
                </View>
              ) : null}
              {error ? <Text style={styles.activityError}>{error}</Text> : null}
              {!loading && items.length ? (
                items.map((item) => (
                  <Pressable
                    key={`${item.source || 'item'}-${item.id}`}
                    style={[styles.activityItem, !item.read && styles.activityItemUnread, item.read && { opacity: 0.55 }]}
                    onPress={() => openItem(item)}
                  >
                    <View style={styles.activityIcon}>
                      <Ionicons name={item.icon} size={18} color={colors.primary} />
                    </View>
                    <View style={styles.activityCopy}>
                      <View style={styles.activityTitleRow}>
                        {!item.read ? <View style={styles.activityUnreadDot} /> : null}
                        <Text style={styles.activityItemTitle}>{item.title}</Text>
                      </View>
                      <Text style={styles.activityDetail} numberOfLines={2}>{item.detail}</Text>
                    </View>
                    <View style={styles.activityRight}>
                      <Text style={styles.activityTime}>{item.time}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.darkTextMuted} />
                    </View>
                  </Pressable>
                ))
              ) : null}
              {!loading && !items.length ? (
                <View style={styles.activityEmpty}>
                  <Ionicons name="notifications-outline" size={34} color={colors.darkTextMuted} />
                  <Text style={styles.activityEmptyText}>Chưa có thông báo nào.</Text>
                </View>
              ) : null}
            </ScrollView>
          )}

          <View style={styles.activityFooter}>
            <Pressable style={styles.activitySecondaryButton} onPress={onClear}>
              <Text style={styles.activitySecondaryText}>Đọc tất cả</Text>
            </Pressable>
            <Pressable style={styles.activityPrimaryButton} onPress={onClose}>
              <Text style={styles.activityPrimaryText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NotificationDetail({ item, onRespondInvitation, onResponded }) {
  const [note, setNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState('');
  const [actionError, setActionError] = useState('');
  const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
  const metadataRows = Object.entries(metadata).filter(
    ([key, value]) =>
      !HIDDEN_NOTIFICATION_METADATA_KEYS.has(key) &&
      value !== undefined &&
      value !== null &&
      value !== '',
  );
  const canRespond =
    item.source === 'server' &&
    item.type === 'JOCKEY_INVITATION_CREATED' &&
    metadata.invitationId &&
    onRespondInvitation;

  async function submitResponse(action) {
    const trimmedNote = note.trim();
    if (action === 'reject' && !trimmedNote) {
      setActionError('Vui lòng nhập lý do từ chối.');
      return;
    }

    try {
      setSubmittingAction(action);
      setActionError('');
      await onRespondInvitation(item, action, trimmedNote);
      onResponded(action, trimmedNote);
    } catch (requestError) {
      setActionError(requestError.message || 'Không phản hồi được lời mời.');
    } finally {
      setSubmittingAction('');
    }
  }

  return (
    <ScrollView style={styles.notificationDetail} contentContainerStyle={styles.notificationDetailContent}>
      <View style={styles.notificationDetailIcon}>
        <Ionicons name={item.icon || 'notifications-outline'} size={28} color={colors.primary} />
      </View>
      <Text style={styles.notificationDetailTitle}>{item.title || 'Thông báo'}</Text>
      <Text style={styles.notificationDetailBody}>{item.detail || 'Không có nội dung chi tiết.'}</Text>

      <View style={styles.notificationInfoGrid}>
        <NotificationInfoRow label="Thời gian" value={item.time || 'Chưa cập nhật'} />
        <NotificationInfoRow label="Nguồn" value={item.source === 'server' ? 'Hệ thống' : 'Trong phiên này'} />
        <NotificationInfoRow
          label="Loại"
          value={NOTIFICATION_TYPE_LABELS[item.type] || (item.source === 'local' ? 'Thao tác' : 'Thông báo hệ thống')}
        />
        <NotificationInfoRow label="Trạng thái" value={item.read ? 'Đã đọc' : 'Chưa đọc'} />
      </View>

      {metadataRows.length ? (
        <View style={styles.notificationMetadata}>
          <Text style={styles.notificationMetadataTitle}>Dữ liệu liên quan</Text>
          {metadataRows.map(([key, value]) => (
            <NotificationInfoRow key={key} label={NOTIFICATION_METADATA_LABELS[key] || key} value={String(value)} />
          ))}
        </View>
      ) : null}

      {canRespond ? (
        <View style={styles.notificationResponseBox}>
          <Text style={styles.notificationMetadataTitle}>Phản hồi lời mời</Text>
          <TextInput
            multiline
            onChangeText={setNote}
            placeholder="Nhập lý do hoặc ghi chú gửi lại cho owner"
            placeholderTextColor={colors.darkTextMuted}
            style={styles.notificationReasonInput}
            value={note}
          />
          {actionError ? <Text style={styles.notificationActionError}>{actionError}</Text> : null}
          <View style={styles.notificationActionRow}>
            <Pressable
              disabled={Boolean(submittingAction)}
              style={[styles.notificationRejectButton, submittingAction && styles.notificationActionDisabled]}
              onPress={() => submitResponse('reject')}
            >
              <Text style={styles.notificationRejectText}>
                {submittingAction === 'reject' ? 'Đang gửi...' : 'Từ chối'}
              </Text>
            </Pressable>
            <Pressable
              disabled={Boolean(submittingAction)}
              style={[styles.notificationAcceptButton, submittingAction && styles.notificationActionDisabled]}
              onPress={() => submitResponse('accept')}
            >
              <Text style={styles.notificationAcceptText}>
                {submittingAction === 'accept' ? 'Đang gửi...' : 'Chấp nhận'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function NotificationInfoRow({ label, value }) {
  return (
    <View style={styles.notificationInfoRow}>
      <Text style={styles.notificationInfoLabel}>{label}</Text>
      <Text style={styles.notificationInfoValue}>{value}</Text>
    </View>
  );
}

function JockeyStatsModal({ visible, onClose, prizes = [] }) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.activityBackdrop}>
        <View style={styles.activityModal}>
          <View style={styles.activityHeader}>
            <View>
              <Text style={styles.activityEyebrow}>Thống kê Jockey</Text>
              <Text style={styles.activityTitle}>Lịch sử giải thưởng</Text>
            </View>
            <Pressable style={styles.activityClose} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.darkText} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.activityListContent} style={styles.activityList} showsVerticalScrollIndicator={false}>
            {prizes.map((item) => (
              <View key={item.id} style={styles.activityItem}>
                <ListItem
                  icon="ribbon-outline"
                  title={`${item.raceName} · Hạng ${item.position || '-'}`}
                  meta={`${item.tournamentName} · ${item.horseName}`}
                  badge={`${item.prizeAmount?.toLocaleString('vi-VN')}đ`}
                />
              </View>
            ))}
            {prizes.length === 0 ? (
              <EmptyText text="Chưa có thông tin giải thưởng hoặc chiến thắng nào." />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SpectatorTournamentsModal({ visible, onClose, tournaments = [] }) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.activityBackdrop}>
        <View style={styles.activityModal}>
          <View style={styles.activityHeader}>
            <View>
              <Text style={styles.activityEyebrow}>Giải đấu</Text>
              <Text style={styles.activityTitle}>Tất cả giải đấu</Text>
            </View>
            <Pressable style={styles.activityClose} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.darkText} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.activityListContent} style={styles.activityList} showsVerticalScrollIndicator={false}>
            {tournaments.map((item) => (
              <View key={item.id} style={styles.activityItem}>
                <ListItem
                  icon="trophy-outline"
                  title={item.name}
                  meta={`${item.location || 'Địa điểm chưa xác định'} · ${item.raceCount || 0} race`}
                  badge={item.dateLabel || 'Đang diễn ra'}
                />
              </View>
            ))}
            {tournaments.length === 0 ? (
              <EmptyText text="Chưa có giải đấu nào đang mở." />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
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
  headerTitleBlock: {
    flex: 1,
    paddingRight: 12,
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
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: colors.primary,
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#1D1705',
    fontSize: 9,
    fontWeight: '900',
  },
  activityBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    padding: 20,
  },
  activityModal: {
    maxHeight: '78%',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 18,
    backgroundColor: colors.darkSurface,
    padding: 18,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  activityEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  activityTitle: {
    marginTop: 3,
    color: colors.darkText,
    fontSize: 19,
    fontWeight: '900',
  },
  activityClose: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 13,
    backgroundColor: colors.darkSurfaceSoft,
  },
  activityList: {
    marginTop: 14,
  },
  activityListContent: {
    paddingBottom: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 68,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
    paddingVertical: 11,
  },
  activityItemUnread: {
    borderRadius: 12,
    backgroundColor: 'rgba(212, 160, 23, 0.08)',
    paddingHorizontal: 10,
  },
  activityIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.darkSurfaceSoft,
  },
  activityCopy: {
    flex: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  activityUnreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  activityItemTitle: {
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
  },
  activityDetail: {
    marginTop: 4,
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  activityTime: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  activityRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  activityEmpty: {
    alignItems: 'center',
    paddingVertical: 34,
  },
  activityEmptyText: {
    marginTop: 10,
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  activityError: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.28)',
    borderRadius: 12,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    color: '#fecdd3',
    fontSize: 12,
    fontWeight: '800',
    padding: 12,
  },
  activityFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  activitySecondaryButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 13,
    paddingVertical: 12,
  },
  activitySecondaryText: {
    color: colors.darkText,
    fontSize: 12,
    fontWeight: '900',
  },
  activityPrimaryButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 13,
    backgroundColor: colors.primary,
    paddingVertical: 12,
  },
  activityPrimaryText: {
    color: '#1D1705',
    fontSize: 12,
    fontWeight: '900',
  },
  notificationDetail: {
    marginTop: 14,
    maxHeight: 360,
  },
  notificationDetailContent: {
    paddingBottom: 4,
  },
  notificationDetailIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.darkSurfaceSoft,
    marginBottom: 14,
  },
  notificationDetailTitle: {
    color: colors.darkText,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  notificationDetailBody: {
    marginTop: 10,
    color: colors.darkTextMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  notificationInfoGrid: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 14,
    backgroundColor: colors.darkSurfaceSoft,
    overflow: 'hidden',
  },
  notificationInfoRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notificationInfoLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  notificationInfoValue: {
    marginTop: 4,
    color: colors.darkText,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  notificationMetadata: {
    marginTop: 14,
  },
  notificationMetadataTitle: {
    color: colors.darkText,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  notificationResponseBox: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1D2A40',
    paddingTop: 14,
  },
  notificationReasonInput: {
    minHeight: 84,
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
  notificationActionError: {
    marginTop: 9,
    color: '#fecdd3',
    fontSize: 12,
    fontWeight: '800',
  },
  notificationActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  notificationRejectButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.38)',
    borderRadius: 13,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    paddingVertical: 12,
  },
  notificationRejectText: {
    color: '#fecdd3',
    fontSize: 12,
    fontWeight: '900',
  },
  notificationAcceptButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 13,
    backgroundColor: colors.primary,
    paddingVertical: 12,
  },
  notificationAcceptText: {
    color: '#1D1705',
    fontSize: 12,
    fontWeight: '900',
  },
  notificationActionDisabled: {
    opacity: 0.58,
  },
  content: {
    paddingHorizontal: 15,
    paddingBottom: 24,
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
    minWidth: 56,
    paddingHorizontal: 2,
  },
  tabText: {
    marginTop: 4,
    color: colors.darkTextMuted,
    fontSize: 8.5,
    fontWeight: '800',
  },
  activeTabText: {
    color: colors.primary,
  },
});
