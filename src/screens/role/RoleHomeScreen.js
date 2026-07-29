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
  Alert,
  Modal,
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

  // Modal States
  const [betModalVisible, setBetModalVisible] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);

  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [cardInfo, setCardInfo] = useState({ cardNumber: '4111111111111111', cardName: 'NGUYEN VAN A', expiry: '01/25', cvv: '123' });

  const [horseModalVisible, setHorseModalVisible] = useState(false);
  const [newHorse, setNewHorse] = useState({ name: '', breed: '', age: '', healthStatus: 'Khỏe mạnh' });

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteForm, setInviteForm] = useState({ horseId: '', raceId: '', jockeyId: '', message: '', remunerationAmount: '' });
  const [allJockeys, setAllJockeys] = useState([]);
  const [ownerHorses, setOwnerHorses] = useState([]);
  const [ownerOpenRaces, setOwnerOpenRaces] = useState([]);

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

  // Place Bet Handler
  async function submitPlaceBet() {
    if (!selectedMarket || !selectedOption || !betAmount) {
      Alert.alert('Lỗi', 'Vui lòng chọn ngựa và nhập số tiền cược.');
      return;
    }
    const amount = Number(betAmount);
    if (isNaN(amount) || amount < selectedMarket.minStake || amount > selectedMarket.maxStake) {
      Alert.alert('Lỗi', `Số tiền phải từ ${selectedMarket.minStake.toLocaleString()}đ đến ${selectedMarket.maxStake.toLocaleString()}đ.`);
      return;
    }

    try {
      setLoading(true);
      await spectatorService.placeBet(selectedMarket.raceId, {
        participantId: selectedOption.participantId,
        stakeAmount: amount,
        idempotencyKey: 'bet-' + Date.now(),
      });
      Alert.alert('Thành công', 'Đã đặt cược thành công.');
      setBetModalVisible(false);
      setBetAmount('');
      setSelectedOption(null);
      refreshData();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không đặt được cược.');
    } finally {
      setLoading(false);
    }
  }

  // Wallet Deposit Handler
  async function submitDeposit() {
    const amount = Number(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền nạp hợp lệ.');
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
      Alert.alert('Thành công', `Đã nạp thành công ${amount.toLocaleString()}đ vào ví.`);
      setDepositModalVisible(false);
      setDepositAmount('');
      refreshData();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Thanh toán thất bại.');
    } finally {
      setLoading(false);
    }
  }

  // Create Horse Handler
  async function submitCreateHorse() {
    if (!newHorse.name || !newHorse.breed || !newHorse.age) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin ngựa.');
      return;
    }

    try {
      setLoading(true);
      await horseService.create(newHorse);
      Alert.alert('Thành công', `Đã thêm ngựa ${newHorse.name} thành công.`);
      setHorseModalVisible(false);
      setNewHorse({ name: '', breed: '', age: '', healthStatus: 'Khỏe mạnh' });
      refreshData();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thêm được ngựa.');
    } finally {
      setLoading(false);
    }
  }

  // Open Invite Modal Handler
  async function openInviteModal() {
    try {
      setLoading(true);
      const [horses, jockeys] = await Promise.all([
        ownerService.listHorses(),
        userService.list({ role: 'JOCKEY' })
      ]);
      setOwnerHorses(horses);
      setAllJockeys(jockeys);

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
              tournamentName: t.name,
              entryFee: r.entryFee
            });
          }
        });
      });
      setOwnerOpenRaces(openRaces);

      setInviteForm({
        horseId: horses[0]?.id || '',
        jockeyId: jockeys[0]?.id || '',
        raceId: openRaces[0]?.id || '',
        message: '',
        remunerationAmount: openRaces[0]?.entryFee ? String(openRaces[0].entryFee) : '500000'
      });
      setInviteModalVisible(true);
    } catch (err) {
      Alert.alert('Lỗi', 'Không lấy được thông tin ngựa và jockey.');
    } finally {
      setLoading(false);
    }
  }

  // Create Jockey Invitation Handler
  async function submitJockeyInvitation() {
    if (!inviteForm.horseId || !inviteForm.jockeyId) {
      Alert.alert('Lỗi', 'Vui lòng chọn ngựa và jockey.');
      return;
    }

    try {
      setLoading(true);
      await ownerService.createJockeyInvitation({
        ...inviteForm,
        idempotencyKey: 'invite-' + Date.now()
      });
      Alert.alert('Thành công', 'Đã gửi lời mời tới jockey thành công.');
      setInviteModalVisible(false);
      refreshData();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không gửi được lời mời.');
    } finally {
      setLoading(false);
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
      Alert.alert('Lỗi', 'Không lấy được thông tin đăng ký giải.');
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
      Alert.alert('Lỗi', 'Vui lòng chọn race, ngựa và lời mời jockey đã được chấp nhận.');
      return;
    }

    try {
      setLoading(true);
      await ownerService.createRegistration({
        raceId: registerForm.raceId,
        horseId: registerForm.horseId,
        jockeyInvitationId: registerForm.jockeyInvitationId,
      });
      Alert.alert('Thành công', 'Đăng ký tham gia giải đấu thành công.');
      setRegisterModalVisible(false);
      refreshData();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Đăng ký thất bại.');
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
      
      // Simulate playback loading
      setTimeout(() => {
        setSimulationLoading(false);
      }, 2000);
    } catch (err) {
      setSimulationLoading(false);
      Alert.alert('Lỗi', err.message || 'Mô phỏng thất bại.');
    }
  }

  // Confirm Simulation Handler
  async function confirmRaceSimulation() {
    if (!selectedRefereeRace || !simulationResult) return;
    try {
      setLoading(true);
      await refereeService.confirmSimulation(selectedRefereeRace.id, simulationResult.runId);
      setSimulationConfirmed(true);
      Alert.alert('Thành công', 'Đã xác nhận kết quả mô phỏng.');
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Xác nhận thất bại.');
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
      Alert.alert('Thành công', 'Đã chốt kết quả cuộc đua thành công.');
      setRefereeRaceModalVisible(false);
      refreshData();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Chốt kết quả thất bại.');
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
      Alert.alert('Lỗi', 'Không tải được danh sách người tham gia cuộc đua.');
    } finally {
      setLoading(false);
    }
  }

  // Submit Violation Handler
  async function submitViolation() {
    if (!selectedViolationRace) return;
    if (!violationForm.participantId) {
      Alert.alert('Lỗi', 'Vui lòng chọn Jockey/Ngựa vi phạm.');
      return;
    }
    try {
      setLoading(true);
      const selectedPart = violationParticipants.find(p => p.id === violationForm.participantId);
      await refereeService.createViolation(selectedViolationRace.id, {
        ...violationForm,
        gateNumber: selectedPart?.gateNumber || violationForm.gateNumber
      });
      Alert.alert('Thành công', 'Đã lập biên bản vi phạm thành công.');
      setViolationModalVisible(false);
      refreshData();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không lập được biên bản vi phạm.');
    } finally {
      setLoading(false);
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

        {/* Modal: Đặt cược */}
        <Modal visible={betModalVisible} transparent={true} animationType="fade" onRequestClose={() => setBetModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Đặt cược ảo</Text>
              
              {selectedMarket && (
                <ScrollView>
                  <Text style={styles.modalLabel}>Cuộc đua: {selectedMarket.raceName}</Text>
                  <Text style={styles.modalLabel}>Giải đấu: {selectedMarket.tournamentName}</Text>
                  <Text style={styles.modalLabel}>Hạn mức: {selectedMarket.minStake.toLocaleString()}đ - {selectedMarket.maxStake.toLocaleString()}đ</Text>
                  
                  <Text style={styles.modalLabel}>Chọn ngựa đua:</Text>
                  <View style={styles.modalSelector}>
                    {(selectedMarket.options || []).map((opt) => {
                      const active = selectedOption?.participantId === opt.participantId;
                      return (
                        <Pressable
                          key={opt.participantId}
                          style={[styles.modalSelectorOption, active && styles.modalSelectorOptionActive]}
                          onPress={() => setSelectedOption(opt)}
                        >
                          <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                            {opt.horseName} (P: {opt.winProbability ? Math.round(opt.winProbability * 100) : '-'}%)
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.modalLabel}>Số tiền cược (VND):</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    placeholder="Nhập số tiền cược"
                    placeholderTextColor={colors.darkTextMuted}
                    value={betAmount}
                    onChangeText={setBetAmount}
                  />

                  <View style={styles.modalButtonRow}>
                    <Pressable style={styles.secondaryAction} onPress={() => setBetModalVisible(false)}>
                      <Text style={styles.secondaryActionText}>Hủy</Text>
                    </Pressable>
                    <Pressable style={styles.primaryAction} onPress={submitPlaceBet}>
                      <Text style={styles.primaryActionText}>Đặt cược</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal: Nạp tiền */}
        <Modal visible={depositModalVisible} transparent={true} animationType="fade" onRequestClose={() => setDepositModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Nạp tiền vào ví</Text>
              
              <ScrollView>
                <Text style={styles.modalLabel}>Chọn số tiền nhanh:</Text>
                <View style={styles.presetRow}>
                  {['50000', '100000', '200000', '500000'].map((preset) => {
                    const active = depositAmount === preset;
                    return (
                      <Pressable
                        key={preset}
                        style={[styles.presetButton, active && styles.presetButtonActive]}
                        onPress={() => setDepositAmount(preset)}
                      >
                        <Text style={[styles.presetText, active && styles.presetTextActive]}>
                          {(Number(preset)).toLocaleString()}đ
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.modalLabel}>Số tiền tự nhập (VND):</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ví dụ: 100000"
                  placeholderTextColor={colors.darkTextMuted}
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                />

                <Text style={styles.modalLabel}>Thông tin thẻ VISA Sandbox:</Text>
                <TextInput
                  style={[styles.modalInput, { marginBottom: 8 }]}
                  placeholder="Số thẻ"
                  placeholderTextColor={colors.darkTextMuted}
                  value={cardInfo.cardNumber}
                  onChangeText={(val) => setCardInfo(curr => ({ ...curr, cardNumber: val }))}
                />
                <TextInput
                  style={[styles.modalInput, { marginBottom: 8 }]}
                  placeholder="Tên chủ thẻ"
                  placeholderTextColor={colors.darkTextMuted}
                  value={cardInfo.cardName}
                  onChangeText={(val) => setCardInfo(curr => ({ ...curr, cardName: val }))}
                />
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    placeholder="Hết hạn (MM/YY)"
                    placeholderTextColor={colors.darkTextMuted}
                    value={cardInfo.expiry}
                    onChangeText={(val) => setCardInfo(curr => ({ ...curr, expiry: val }))}
                  />
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    placeholder="CVV"
                    placeholderTextColor={colors.darkTextMuted}
                    secureTextEntry
                    value={cardInfo.cvv}
                    onChangeText={(val) => setCardInfo(curr => ({ ...curr, cvv: val }))}
                  />
                </View>

                <View style={styles.modalButtonRow}>
                  <Pressable style={styles.secondaryAction} onPress={() => setDepositModalVisible(false)}>
                    <Text style={styles.secondaryActionText}>Hủy</Text>
                  </Pressable>
                  <Pressable style={styles.primaryAction} onPress={submitDeposit}>
                    <Text style={styles.primaryActionText}>Thanh toán</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Thêm ngựa */}
        <Modal visible={horseModalVisible} transparent={true} animationType="fade" onRequestClose={() => setHorseModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Thêm ngựa thi đấu mới</Text>
              
              <ScrollView>
                <Text style={styles.modalLabel}>Tên ngựa:</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ví dụ: Chiến mã"
                  placeholderTextColor={colors.darkTextMuted}
                  value={newHorse.name}
                  onChangeText={(val) => setNewHorse(curr => ({ ...curr, name: val }))}
                />

                <Text style={styles.modalLabel}>Giống ngựa:</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ví dụ: Thoroughbred"
                  placeholderTextColor={colors.darkTextMuted}
                  value={newHorse.breed}
                  onChangeText={(val) => setNewHorse(curr => ({ ...curr, breed: val }))}
                />

                <Text style={styles.modalLabel}>Tuổi (năm):</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ví dụ: 3"
                  placeholderTextColor={colors.darkTextMuted}
                  value={newHorse.age}
                  onChangeText={(val) => setNewHorse(curr => ({ ...curr, age: val }))}
                />

                <Text style={styles.modalLabel}>Trạng thái sức khỏe:</Text>
                <View style={styles.modalSelector}>
                  {['Khỏe mạnh', 'Chấn thương nhẹ', 'Cần theo dõi'].map((status) => {
                    const active = newHorse.healthStatus === status;
                    return (
                      <Pressable
                        key={status}
                        style={[styles.modalSelectorOption, active && styles.modalSelectorOptionActive]}
                        onPress={() => setNewHorse(curr => ({ ...curr, healthStatus: status }))}
                      >
                        <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                          {status}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.modalButtonRow}>
                  <Pressable style={styles.secondaryAction} onPress={() => setHorseModalVisible(false)}>
                    <Text style={styles.secondaryActionText}>Hủy</Text>
                  </Pressable>
                  <Pressable style={styles.primaryAction} onPress={submitCreateHorse}>
                    <Text style={styles.primaryActionText}>Thêm ngựa</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Gửi lời mời Jockey */}
        <Modal visible={inviteModalVisible} transparent={true} animationType="fade" onRequestClose={() => setInviteModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Gửi lời mời Jockey</Text>
              
              <ScrollView>
                <Text style={styles.modalLabel}>Chọn ngựa của bạn:</Text>
                <View style={styles.modalSelector}>
                  {(ownerHorses || []).map((h) => {
                    const active = inviteForm.horseId === h.id;
                    return (
                      <Pressable
                        key={h.id}
                        style={[styles.modalSelectorOption, active && styles.modalSelectorOptionActive]}
                        onPress={() => setInviteForm(curr => ({ ...curr, horseId: h.id }))}
                      >
                        <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                          {h.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.modalLabel}>Chọn cuộc đua:</Text>
                <View style={styles.modalSelector}>
                  {(ownerOpenRaces || []).map((r) => {
                    const active = inviteForm.raceId === r.id;
                    return (
                      <Pressable
                        key={r.id}
                        style={[styles.modalSelectorOption, active && styles.modalSelectorOptionActive]}
                        onPress={() => setInviteForm(curr => ({ ...curr, raceId: r.id }))}
                      >
                        <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                          {r.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.modalLabel}>Chọn Jockey:</Text>
                <View style={styles.modalSelector}>
                  {(allJockeys || []).map((j) => {
                    const active = inviteForm.jockeyId === j.id;
                    return (
                      <Pressable
                        key={j.id}
                        style={[styles.modalSelectorOption, active && styles.modalSelectorOptionActive]}
                        onPress={() => setInviteForm(curr => ({ ...curr, jockeyId: j.id }))}
                      >
                        <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                          {j.fullName || j.username}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.modalLabel}>Mức thù lao (VND):</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Thù lao trả cho Jockey"
                  placeholderTextColor={colors.darkTextMuted}
                  value={inviteForm.remunerationAmount}
                  onChangeText={(val) => setInviteForm(curr => ({ ...curr, remunerationAmount: val }))}
                />

                <Text style={styles.modalLabel}>Lời nhắn:</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Lời nhắn đính kèm"
                  placeholderTextColor={colors.darkTextMuted}
                  value={inviteForm.message}
                  onChangeText={(val) => setInviteForm(curr => ({ ...curr, message: val }))}
                />

                <View style={styles.modalButtonRow}>
                  <Pressable style={styles.secondaryAction} onPress={() => setInviteModalVisible(false)}>
                    <Text style={styles.secondaryActionText}>Hủy</Text>
                  </Pressable>
                  <Pressable style={styles.primaryAction} onPress={submitJockeyInvitation}>
                    <Text style={styles.primaryActionText}>Gửi lời mời</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Đăng ký giải */}
        <Modal visible={registerModalVisible} transparent={true} animationType="fade" onRequestClose={() => setRegisterModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Đăng ký giải đấu</Text>
              
              <ScrollView>
                <Text style={styles.modalLabel}>Chọn giải đấu:</Text>
                <View style={styles.modalSelector}>
                  {(ownerTournaments || []).map((t) => {
                    const active = registerForm.tournamentId === (t.id || t._id);
                    return (
                      <Pressable
                        key={t.id || t._id}
                        style={[styles.modalSelectorOption, active && styles.modalSelectorOptionActive]}
                        onPress={() => handleRegisterTournamentChange(t.id || t._id)}
                      >
                        <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                          {t.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.modalLabel}>Chọn cuộc đua:</Text>
                <View style={styles.modalSelector}>
                  {(tournamentRaces || []).map((r) => {
                    const active = registerForm.raceId === (r.id || r._id);
                    return (
                      <Pressable
                        key={r.id || r._id}
                        style={[styles.modalSelectorOption, active && styles.modalSelectorOptionActive]}
                        onPress={() => {
                          const raceId = r.id || r._id;
                          const raceInvitation = registerJockeys.find((item) => String(item.raceId) === String(raceId));
                          setRegisterForm(curr => ({
                            ...curr,
                            raceId,
                            jockeyInvitationId: raceInvitation?.id || '',
                          }));
                        }}
                      >
                        <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                          Race R{r.raceNumber} · {r.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.modalLabel}>Chọn ngựa của bạn:</Text>
                <View style={styles.modalSelector}>
                  {(ownerHorses || []).map((h) => {
                    const active = registerForm.horseId === h.id;
                    return (
                      <Pressable
                        key={h.id}
                        style={[styles.modalSelectorOption, active && styles.modalSelectorOptionActive]}
                        onPress={() => setRegisterForm(curr => ({ ...curr, horseId: h.id }))}
                      >
                        <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                          {h.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.modalLabel}>Chọn lời mời Jockey đã chấp nhận:</Text>
                <View style={styles.modalSelector}>
                  {(registerJockeys || []).map((j) => {
                    const active = registerForm.jockeyInvitationId === j.id;
                    const disabled = registerForm.raceId && String(j.raceId) !== String(registerForm.raceId);
                    return (
                      <Pressable
                        key={j.id}
                        disabled={disabled}
                        style={[
                          styles.modalSelectorOption,
                          active && styles.modalSelectorOptionActive,
                          disabled && styles.disabledButton,
                        ]}
                        onPress={() => setRegisterForm(curr => ({
                          ...curr,
                          horseId: j.horseId || curr.horseId,
                          jockeyInvitationId: j.id,
                        }))}
                      >
                        <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                          {j.jockeyName || 'Jockey'} · {j.horseName || 'Ngựa'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {!registerJockeys?.length ? (
                  <Text style={styles.emptyText}>Cần có lời mời Jockey đã chấp nhận trước khi đăng ký race.</Text>
                ) : null}

                <View style={styles.modalButtonRow}>
                  <Pressable style={styles.secondaryAction} onPress={() => setRegisterModalVisible(false)}>
                    <Text style={styles.secondaryActionText}>Hủy</Text>
                  </Pressable>
                  <Pressable style={styles.primaryAction} onPress={submitRegistration}>
                    <Text style={styles.primaryActionText}>Đăng ký ngay</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Referee Race Control */}
        <Modal visible={refereeRaceModalVisible} transparent={true} animationType="fade" onRequestClose={() => setRefereeRaceModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { height: '80%' }]}>
              {selectedRefereeRace && (
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Mô phỏng cuộc đua</Text>
                  <Text style={styles.modalLabel}>Race: {selectedRefereeRace.name}</Text>
                  <Text style={styles.modalLabel}>Giải đấu: {selectedRefereeRace.tournamentName}</Text>
                  
                  {simulationLoading ? (
                    <View style={[styles.centerState, { marginVertical: 30 }]}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={styles.centerText}>Đang mô phỏng diễn biến...</Text>
                    </View>
                  ) : simulationResult ? (
                    <ScrollView style={{ marginVertical: 12 }}>
                      <Text style={styles.modalLabel}>Bảng kết quả dự kiến:</Text>
                      {(simulationResult.participants || []).sort((a,b) => a.rank - b.rank).map((p) => (
                        <View key={p.participantId} style={styles.participantRow}>
                          <Text style={styles.participantText}>{p.horseName} (Nài: {p.jockeyName})</Text>
                          <Text style={styles.participantRank}>Hạng {p.rank} ({(p.finishTimeMillis/1000).toFixed(2)}s)</Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={{ marginVertical: 30, alignItems: 'center' }}>
                      <Ionicons name="play-circle-outline" size={48} color={colors.darkTextMuted} />
                      <Text style={styles.centerText}>Chưa chạy mô phỏng cuộc đua</Text>
                    </View>
                  )}

                  <View style={styles.modalButtonRow}>
                    <Pressable style={styles.secondaryAction} onPress={() => setRefereeRaceModalVisible(false)}>
                      <Text style={styles.secondaryActionText}>Đóng</Text>
                    </Pressable>
                    {!simulationResult && (
                      <Pressable style={styles.primaryAction} onPress={runRaceSimulation}>
                        <Text style={styles.primaryActionText}>Chạy mô phỏng</Text>
                      </Pressable>
                    )}
                    {simulationResult && !simulationConfirmed && (
                      <Pressable style={styles.primaryAction} onPress={confirmRaceSimulation}>
                        <Text style={styles.primaryActionText}>Xác nhận kết quả</Text>
                      </Pressable>
                    )}
                    {simulationConfirmed && (
                      <Pressable style={styles.primaryAction} onPress={finalizeRaceResults}>
                        <Text style={styles.primaryActionText}>Chốt kết quả</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal: Báo cáo vi phạm */}
        <Modal visible={violationModalVisible} transparent={true} animationType="fade" onRequestClose={() => setViolationModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {selectedViolationRace && (
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Lập biên bản vi phạm</Text>
                  <Text style={styles.modalLabel}>Race: {selectedViolationRace.name}</Text>
                  
                  <ScrollView>
                    <Text style={styles.modalLabel}>Chọn Jockey/Ngựa vi phạm:</Text>
                    <View style={styles.modalSelector}>
                      {(violationParticipants || []).map((p) => {
                        const active = violationForm.participantId === p.id;
                        return (
                          <Pressable
                            key={p.id}
                            style={[styles.modalSelectorOption, active && styles.modalSelectorOptionActive]}
                            onPress={() => setViolationForm(curr => ({ ...curr, participantId: p.id }))}
                          >
                            <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                              {p.horseName} (Nài: {p.jockeyName})
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={styles.modalLabel}>Loại vi phạm:</Text>
                    <View style={styles.modalSelector}>
                      {['Cản trở đối thủ', 'Lấn làn', 'Xuất phát sớm', 'Khác'].map((t) => {
                        const active = violationForm.type === t;
                        return (
                          <Pressable
                            key={t}
                            style={[styles.modalSelectorOption, active && styles.modalSelectorOptionActive]}
                            onPress={() => setViolationForm(curr => ({ ...curr, type: t }))}
                          >
                            <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                              {t}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={styles.modalLabel}>Mức độ nghiêm trọng:</Text>
                    <View style={styles.modalSelector}>
                      {['Phạt nhẹ', 'Phạt cảnh cáo', 'Nghiêm trọng'].map((s) => {
                        const active = violationForm.severity === s;
                        return (
                          <Pressable
                            key={s}
                            style={[styles.modalSelectorOption, active && styles.modalSelectorOptionActive]}
                            onPress={() => setViolationForm(curr => ({ ...curr, severity: s }))}
                          >
                            <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                              {s}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={styles.modalLabel}>Hình phạt đề xuất:</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Ví dụ: Phạt tiền, Cảnh cáo..."
                      placeholderTextColor={colors.darkTextMuted}
                      value={violationForm.penalty}
                      onChangeText={(val) => setViolationForm(curr => ({ ...curr, penalty: val }))}
                    />

                    <Text style={styles.modalLabel}>Mô tả chi tiết lỗi vi phạm:</Text>
                    <TextInput
                      style={[styles.modalInput, { minHeight: 60 }]}
                      multiline
                      placeholder="Nhập mô tả lỗi vi phạm..."
                      placeholderTextColor={colors.darkTextMuted}
                      value={violationForm.description}
                      onChangeText={(val) => setViolationForm(curr => ({ ...curr, description: val }))}
                    />

                    <View style={styles.modalButtonRow}>
                      <Pressable style={styles.secondaryAction} onPress={() => setViolationModalVisible(false)}>
                        <Text style={styles.secondaryActionText}>Hủy</Text>
                      </Pressable>
                      <Pressable style={styles.primaryAction} onPress={submitViolation}>
                        <Text style={styles.primaryActionText}>Lập biên bản</Text>
                      </Pressable>
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </Modal>
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

function Overview({
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

      {/* Role Quick Actions */}
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

function Schedule({
  role,
  data,
  query,
  onOwnerRegistrationWithdraw,
  onStartRace,
  onOpenBetModal,
  onOpenRefereeRaceModal,
  onOpenViolationModal,
}) {
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
            {(item.statusCode === 'ONGOING' || item.status === 'Đang chạy' || item.status === 'Đang diễn ra') ? (
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.darkSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    color: colors.darkText,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: colors.darkSurfaceSoft,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 10,
    color: colors.darkText,
    padding: 10,
    fontSize: 13,
    fontWeight: '700',
    minHeight: 40,
  },
  modalSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  modalSelectorOption: {
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.darkSurfaceSoft,
  },
  modalSelectorOptionActive: {
    borderColor: colors.primary,
    backgroundColor: '#3A2F1B',
  },
  modalSelectorText: {
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  modalSelectorTextActive: {
    color: colors.primary,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  presetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.darkSurfaceSoft,
  },
  presetButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#3A2F1B',
  },
  presetText: {
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  presetTextActive: {
    color: colors.primary,
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
  },
  participantText: {
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '700',
  },
  participantRank: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
});
