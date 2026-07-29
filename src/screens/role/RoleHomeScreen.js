import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
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
import { Account, Overview, Schedule, Tasks } from './components/RoleSections';
import { buildStats, displayName, initials, loadDataForRole, roleOrSpectator } from './roleData';

const tabs = [
  { key: 'overview', icon: 'grid-outline', activeIcon: 'grid', label: 'Tổng quan' },
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
  healthStatus: 'Khỏe mạnh',
  racingStatus: 'can-race',
};

export default function RoleHomeScreen({ user, onLogout }) {
  const showAlert = useAppAlert();
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
  const [newHorse, setNewHorse] = useState(emptyNewHorse);

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
      await horseService.create(newHorse);
      showAlert('Thành công', `Đã thêm ngựa ${newHorse.name} thành công.`);
      setHorseModalVisible(false);
      setNewHorse(emptyNewHorse);
      refreshData();
    } catch (err) {
      showAlert('Lỗi', err.message || 'Không thêm được ngựa.');
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
        userService.listJockeyDirectory(),
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
      showAlert('Lỗi', err.message || 'Không lấy được thông tin ngựa và jockey.');
    } finally {
      setLoading(false);
    }
  }

  // Create Jockey Invitation Handler
  async function submitJockeyInvitation() {
    if (!inviteForm.horseId || !inviteForm.jockeyId) {
      showAlert('Lỗi', 'Vui lòng chọn ngựa và jockey.');
      return;
    }

    try {
      setLoading(true);
      await ownerService.createJockeyInvitation({
        ...inviteForm,
        idempotencyKey: 'invite-' + Date.now()
      });
      showAlert('Thành công', 'Đã gửi lời mời tới jockey thành công.');
      setInviteModalVisible(false);
      refreshData();
    } catch (err) {
      showAlert('Lỗi', err.message || 'Không gửi được lời mời.');
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
            onClose: () => setHorseModalVisible(false),
            onSubmit: submitCreateHorse,
          }}
          invite={{
            visible: inviteModalVisible,
            ownerHorses,
            ownerOpenRaces,
            allJockeys,
            inviteForm,
            onChangeInviteForm: setInviteForm,
            onClose: () => setInviteModalVisible(false),
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
      </View>
    </SafeAreaView>
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
