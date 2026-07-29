import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppAlert } from '../../components/ui/AppAlert';
import { colors } from '../../constants/theme';
import { horseService } from '../../services/horseService';
import { invitationService } from '../../services/invitationService';
import { jockeyService } from '../../services/jockeyService';
import { ownerService } from '../../services/ownerService';
import { refereeService } from '../../services/refereeService';
import { spectatorService } from '../../services/spectatorService';
import { tournamentService } from '../../services/tournamentService';
import { userService } from '../../services/userService';
import { getRoleLabel } from '../../utils/role';
import { RoleActionModals } from './components/RoleActionModals';
import { SearchBox } from './components/RolePrimitives';
import { Account, Horses, Overview, Schedule, Tasks } from './components/RoleSections';
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
  const visibleTabs = role === 'OWNER' ? ownerTabs : tabs;

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
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [activityLog, setActivityLog] = useState([]);

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
  const [simulationConfirmed, setSimulationConfirmed] = useState(false);

  // Referee Violation States
  const [violationModalVisible, setViolationModalVisible] = useState(false);
  const [selectedViolationRace, setSelectedViolationRace] = useState(null);
  const [violationForm, setViolationForm] = useState({ participantId: '', gateNumber: '', type: 'Cản trở đối thủ', severity: 'Phạt nhẹ', description: '', penalty: '' });
  const [violationParticipants, setViolationParticipants] = useState([]);


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

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, visibleTabs]);

  const stats = useMemo(() => buildStats(role, data), [data, role]);

  function recordActivity(icon, title, detail) {
    const createdAt = new Date();
    setActivityLog((current) => [
      {
        id: `${createdAt.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
        icon,
        title,
        detail,
        time: createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
      ...current,
    ].slice(0, 30));
  }

  async function handleInvitationResponse(id, action) {
    const invitation = (data.invitations || []).find((item) => item.id === id);
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
    } catch (requestError) {
      setError(requestError.message || 'Không cập nhật được lời mời.');
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
      const [horses, jockeys] = await Promise.all([
        ownerService.listHorses(),
        userService.listJockeyDirectory(),
      ]);
      const availableJockeys = (jockeys || []).filter((jockey) => jockey.canInvite !== false);
      setOwnerHorses(horses);
      setAllJockeys(availableJockeys);

      // Extract all open races across open tournaments
      const tournaments = await tournamentService.list();
      const openRaces = [];
      (tournaments || []).forEach(t => {
        (t.races || []).forEach(r => {
          if (
            r.statusCode === 'OPEN_REGISTRATION' ||
            r.statusCode === 'SCHEDULED' ||
            r.status === 'Đang mở đăng ký' ||
            r.status === 'Sắp chạy' ||
            r.status === 'Sắp diễn ra'
          ) {
            openRaces.push({
              id: r.id || r._id,
              name: `Race R${r.raceNumber} · ${r.name}`,
              tournamentId: t.id || t._id,
              tournamentName: t.name,
              entryFee: r.entryFee
            });
          }
        });
      });
      setOwnerOpenRaces(openRaces);

      setInviteForm({
        horseId: horses[0]?.id || '',
        jockeyId: availableJockeys[0]?.id || '',
        raceId: openRaces[0]?.id || '',
        tournamentId: openRaces[0]?.tournamentId || '',
        message: '',
        remunerationAmount: openRaces[0]?.entryFee ? String(openRaces[0].entryFee) : '500000'
      });
      setInviteError(
        availableJockeys.length ? '' : 'Hiện chưa có jockey khả dụng để gửi lời mời.',
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

    if (!Number(inviteForm.remunerationAmount)) {
      setInviteError('Vui lòng nhập mức thù lao hợp lệ.');
      return;
    }

    try {
      setInviteSubmitting(true);
      await ownerService.createJockeyInvitation({
        ...inviteForm,
        idempotencyKey: 'invite-' + Date.now()
      });
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
      const [tournaments, horses, invitations] = await Promise.all([
        tournamentService.list(),
        ownerService.listHorses(),
        ownerService.listJockeyInvitations(),
      ]);
      const openTournaments = (tournaments || []).filter(t => t.status === 'Đang mở đăng ký');
      const acceptedInvitations = (invitations || []).filter((item) => item.status === 'Đã chấp nhận');
      setOwnerTournaments(openTournaments);
      setOwnerHorses(horses);
      setRegisterJockeys(acceptedInvitations);

      if (openTournaments.length > 0) {
        const races = openTournaments[0].races || [];
        const selectedRaceId = races[0]?.id || races[0]?._id || '';
        const raceInvitation = acceptedInvitations.find((item) => String(item.raceId) === String(selectedRaceId));
        setTournamentRaces(races);
        setRegisterForm({
          tournamentId: openTournaments[0].id || openTournaments[0]._id,
          raceId: selectedRaceId,
          horseId: horses[0]?.id || '',
          jockeyInvitationId: raceInvitation?.id || '',
        });
      } else {
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

  // Change selected tournament in register form
  function handleRegisterTournamentChange(tournamentId) {
    const t = ownerTournaments.find(item => (item.id || item._id) === tournamentId);
    const races = t ? (t.races || []) : [];
    setTournamentRaces(races);
    const nextRaceId = races[0]?.id || races[0]?._id || '';
    const raceInvitation = registerJockeys.find((item) => String(item.raceId) === String(nextRaceId));
    setRegisterForm(current => ({
      ...current,
      tournamentId,
      raceId: nextRaceId,
      jockeyInvitationId: raceInvitation?.id || '',
    }));
  }

  // Submit Registration Handler
  async function submitRegistration() {
    if (!registerForm.tournamentId || !registerForm.raceId || !registerForm.horseId || !registerForm.jockeyInvitationId) {
      showAlert('Lỗi', 'Vui lòng chọn race, ngựa và lời mời jockey đã được chấp nhận.');
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
      await refereeService.confirmSimulation(selectedRefereeRace.id, simulationResult.runId);
      setSimulationConfirmed(true);
      recordActivity('checkmark-circle-outline', 'Đã xác nhận mô phỏng', selectedRefereeRace.name || 'Race');
      showAlert('Thành công', 'Đã xác nhận kết quả mô phỏng.');
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
      // Map results for finalization payload
      const payload = (simulationResult.participants || []).map(p => ({
        participantId: p.participantId,
        rank: p.rank,
        finishTimeMillis: p.finishTimeMillis,
        status: 'FINISHED'
      }));

      await refereeService.finalizeResults(selectedRefereeRace.id, payload);
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
      const list = await refereeService.listParticipants(race);
      setViolationParticipants(list || []);
      setViolationForm({
        participantId: list[0]?.id || '',
        gateNumber: list[0]?.gateNumber ? String(list[0].gateNumber) : '1',
        type: 'Cản trở đối thủ',
        severity: 'Phạt nhẹ',
        description: '',
        penalty: ''
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
    if (!violationForm.participantId) {
      showAlert('Lỗi', 'Vui lòng chọn Jockey/Ngựa vi phạm.');
      return;
    }
    try {
      setLoading(true);
      const selectedPart = violationParticipants.find(p => p.id === violationForm.participantId);
      await refereeService.createViolation(selectedViolationRace.id, {
        ...violationForm,
        gateNumber: selectedPart?.gateNumber || violationForm.gateNumber
      });
      recordActivity('warning-outline', 'Đã lập biên bản vi phạm', selectedPart?.horseName || selectedViolationRace.name || 'Race');
      showAlert('Thành công', 'Đã lập biên bản vi phạm thành công.');
      setViolationModalVisible(false);
      refreshData();
    } catch (err) {
      showAlert('Lỗi', err.message || 'Không lập được biên bản vi phạm.');
    } finally {
      setLoading(false);
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
            <Pressable style={styles.refreshButton} onPress={refreshData}>
              <Ionicons name="refresh-outline" size={19} color={colors.darkText} />
            </Pressable>
            <Pressable style={styles.refreshButton} onPress={() => setActivityModalVisible(true)}>
              <Ionicons name="notifications-outline" size={19} color={colors.darkText} />
              {activityLog.length ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{activityLog.length > 9 ? '9+' : activityLog.length}</Text>
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
              />
            ) : null}
            {activeTab === 'schedule' ? (
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
              />
            ) : null}
            {activeTab === 'account' ? (
              <Account
                user={user}
                role={role}
                onLogout={onLogout}
                onRecordActivity={recordActivity}
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
            ownerHorses,
            ownerOpenRaces,
            allJockeys,
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
            registerForm,
            onChangeTournament: handleRegisterTournamentChange,
            onChangeRegisterForm: setRegisterForm,
            onClose: () => setRegisterModalVisible(false),
            onSubmit: submitRegistration,
          }}
          refereeRace={{
            visible: refereeRaceModalVisible,
            selectedRefereeRace,
            simulationLoading,
            simulationResult,
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
            onChangeViolationForm: setViolationForm,
            onClose: () => setViolationModalVisible(false),
            onSubmit: submitViolation,
          }}
        />

        <ActivityLogModal
          visible={activityModalVisible}
          items={activityLog}
          onClear={() => setActivityLog([])}
          onClose={() => setActivityModalVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}

function ActivityLogModal({ visible, items, onClear, onClose }) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.activityBackdrop}>
        <View style={styles.activityModal}>
          <View style={styles.activityHeader}>
            <View>
              <Text style={styles.activityEyebrow}>Thông báo</Text>
              <Text style={styles.activityTitle}>Nhật ký thao tác</Text>
            </View>
            <Pressable style={styles.activityClose} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.darkText} />
            </Pressable>
          </View>

          <ScrollView style={styles.activityList} contentContainerStyle={styles.activityListContent}>
            {items.length ? (
              items.map((item) => (
                <View key={item.id} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Ionicons name={item.icon} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.activityCopy}>
                    <Text style={styles.activityItemTitle}>{item.title}</Text>
                    <Text style={styles.activityDetail} numberOfLines={2}>{item.detail}</Text>
                  </View>
                  <Text style={styles.activityTime}>{item.time}</Text>
                </View>
              ))
            ) : (
              <View style={styles.activityEmpty}>
                <Ionicons name="notifications-outline" size={34} color={colors.darkTextMuted} />
                <Text style={styles.activityEmptyText}>Chưa có thao tác nào trong phiên này.</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.activityFooter}>
            <Pressable style={styles.activitySecondaryButton} onPress={onClear}>
              <Text style={styles.activitySecondaryText}>Xóa nhật ký</Text>
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
