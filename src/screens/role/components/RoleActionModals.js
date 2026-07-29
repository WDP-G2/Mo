import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Animated, Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../../../constants/theme';
import {
  raceHorseLockedByInvitation,
  raceHorseLockedByRegistration,
  raceJockeyLockedByInvitation,
  raceJockeyLockedByRegistration,
  sameOwnerFlowId as sameId,
} from '../../../utils/ownerFlow.mjs';
import { EmptyText } from './RolePrimitives';

export function RoleActionModals({
  bet,
  deposit,
  horse,
  invite,
  registration,
  refereeRace,
  violation,
}) {
  return (
    <>
      <BetModal {...bet} />
      <DepositModal {...deposit} />
      <HorseModal {...horse} />
      <JockeyInviteModal {...invite} />
      <RaceRegistrationModal {...registration} />
      <RefereeRaceModal {...refereeRace} />
      <ViolationModal {...violation} />
    </>
  );
}

function firstAvailableHorse(horses, invitations, registrations, race) {
  return (horses || []).find(
    (horse) =>
      !raceHorseLockedByInvitation(invitations, race, horse.id) &&
      !raceHorseLockedByRegistration(registrations, race, horse.id),
  );
}

function firstAvailableJockey(jockeys, invitations, registrations, race) {
  return (jockeys || []).find(
    (jockey) =>
      !raceJockeyLockedByInvitation(invitations, race, jockey.id) &&
      !raceJockeyLockedByRegistration(registrations, race, jockey.id),
  );
}

function uniqueByRaceHorse(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const key = `${item.raceId || ''}:${item.horseId || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function BetModal({
  visible,
  selectedMarket,
  selectedOption,
  betAmount,
  onChangeSelectedOption,
  onChangeBetAmount,
  onClose,
  onSubmit,
}) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ModalHeader title="Đặt cược ảo" onClose={onClose} />

          {selectedMarket && (
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalLabel}>Cuộc đua: {selectedMarket.raceName}</Text>
              <Text style={styles.modalLabel}>Giải đấu: {selectedMarket.tournamentName}</Text>
              <Text style={styles.modalLabel}>
                Hạn mức: {selectedMarket.minStake.toLocaleString()}đ - {selectedMarket.maxStake.toLocaleString()}đ
              </Text>

              <Text style={styles.modalLabel}>Chọn ngựa đua:</Text>
              <View style={styles.modalSelector}>
                {(selectedMarket.options || []).map((opt) => {
                  const active = selectedOption?.participantId === opt.participantId;
                  return (
                    <Pressable
                      key={opt.participantId}
                      style={[styles.modalSelectorOption, active && styles.modalSelectorOptionActive]}
                      onPress={() => onChangeSelectedOption(opt)}
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
                onChangeText={onChangeBetAmount}
              />

              <ModalButtons cancelText="Hủy" confirmText="Đặt cược" onCancel={onClose} onConfirm={onSubmit} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DepositModal({ visible, depositAmount, cardInfo, onChangeDepositAmount, onChangeCardInfo, onClose, onSubmit }) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ModalHeader title="Nạp tiền vào ví" onClose={onClose} />

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Chọn số tiền nhanh:</Text>
            <View style={styles.presetRow}>
              {['50000', '100000', '200000', '500000'].map((preset) => {
                const active = depositAmount === preset;
                return (
                  <Pressable
                    key={preset}
                    style={[styles.presetButton, active && styles.presetButtonActive]}
                    onPress={() => onChangeDepositAmount(preset)}
                  >
                    <Text style={[styles.presetText, active && styles.presetTextActive]}>
                      {Number(preset).toLocaleString()}đ
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
              onChangeText={onChangeDepositAmount}
            />

            <Text style={styles.modalLabel}>Thông tin thẻ VISA Sandbox:</Text>
            <TextInput
              style={[styles.modalInput, styles.spacedInput]}
              placeholder="Số thẻ"
              placeholderTextColor={colors.darkTextMuted}
              value={cardInfo.cardNumber}
              onChangeText={(val) => onChangeCardInfo((curr) => ({ ...curr, cardNumber: val }))}
            />
            <TextInput
              style={[styles.modalInput, styles.spacedInput]}
              placeholder="Tên chủ thẻ"
              placeholderTextColor={colors.darkTextMuted}
              value={cardInfo.cardName}
              onChangeText={(val) => onChangeCardInfo((curr) => ({ ...curr, cardName: val }))}
            />
            <View style={styles.cardInlineRow}>
              <TextInput
                style={[styles.modalInput, styles.flexInput]}
                placeholder="Hết hạn (MM/YY)"
                placeholderTextColor={colors.darkTextMuted}
                value={cardInfo.expiry}
                onChangeText={(val) => onChangeCardInfo((curr) => ({ ...curr, expiry: val }))}
              />
              <TextInput
                style={[styles.modalInput, styles.flexInput]}
                placeholder="CVV"
                placeholderTextColor={colors.darkTextMuted}
                secureTextEntry
                value={cardInfo.cvv}
                onChangeText={(val) => onChangeCardInfo((curr) => ({ ...curr, cvv: val }))}
              />
            </View>

            <ModalButtons cancelText="Hủy" confirmText="Thanh toán" onCancel={onClose} onConfirm={onSubmit} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function HorseModal({ visible, newHorse, onChangeNewHorse, onClose, onSubmit }) {
  const editing = Boolean(newHorse.id);
  const previewUri = newHorse.imageFile?.uri || newHorse.imageUrl;

  async function pickHorseImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    onChangeNewHorse((curr) => ({
      ...curr,
      imageFile: {
        uri: asset.uri,
        name: asset.fileName || `horse-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      },
    }));
  }

  async function pickHorseDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    onChangeNewHorse((curr) => ({
      ...curr,
      documentFile: {
        uri: asset.uri,
        name: asset.name || `horse-health-document-${Date.now()}`,
        type: asset.mimeType || 'application/pdf',
      },
    }));
  }

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ModalHeader title={editing ? 'Sửa thông tin ngựa' : 'Thêm ngựa thi đấu mới'} onClose={onClose} />

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Tên ngựa:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ví dụ: Chiến mã"
              placeholderTextColor={colors.darkTextMuted}
              value={newHorse.name}
              onChangeText={(val) => onChangeNewHorse((curr) => ({ ...curr, name: val }))}
            />

            <Text style={styles.modalLabel}>Ảnh ngựa:</Text>
            <Pressable style={styles.imagePickerButton} onPress={pickHorseImage}>
              <Ionicons name="image-outline" size={18} color={colors.primary} />
              <Text style={styles.imagePickerText}>
                {previewUri ? 'Đổi ảnh ngựa' : 'Chọn ảnh ngựa'}
              </Text>
            </Pressable>
            {previewUri ? (
              <View style={styles.imagePreviewRow}>
                <Image source={{ uri: previewUri }} style={styles.imagePreview} />
                <View style={styles.imagePreviewMeta}>
                  <Text style={styles.imageName} numberOfLines={1}>
                    {newHorse.imageFile?.name || 'Ảnh ngựa hiện tại'}
                  </Text>
                  <Pressable
                    style={styles.removeImageButton}
                    onPress={() => onChangeNewHorse((curr) => ({ ...curr, imageFile: null, imageUrl: '' }))}
                  >
                    <Text style={styles.removeImageText}>Xóa ảnh</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Text style={styles.modalLabel}>Giấy sức khỏe / chứng nhận:</Text>
            <Pressable style={styles.imagePickerButton} onPress={pickHorseDocument}>
              <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
              <Text style={styles.imagePickerText}>
                {newHorse.documentFile?.uri ? 'Đổi giấy chứng nhận' : 'Chọn giấy chứng nhận'}
              </Text>
            </Pressable>
            {newHorse.documentFile?.uri ? (
              <View style={styles.filePreviewRow}>
                <View style={styles.fileIcon}>
                  <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.imagePreviewMeta}>
                  <Text style={styles.imageName} numberOfLines={1}>
                    {newHorse.documentFile.name || 'Giấy chứng nhận'}
                  </Text>
                  <Pressable
                    style={styles.removeImageButton}
                    onPress={() => onChangeNewHorse((curr) => ({ ...curr, documentFile: null }))}
                  >
                    <Text style={styles.removeImageText}>Xóa file</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Text style={styles.modalLabel}>Giống ngựa:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ví dụ: Thoroughbred"
              placeholderTextColor={colors.darkTextMuted}
              value={newHorse.breed}
              onChangeText={(val) => onChangeNewHorse((curr) => ({ ...curr, breed: val }))}
            />

            <Text style={styles.modalLabel}>Tuổi (năm):</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Ví dụ: 3"
              placeholderTextColor={colors.darkTextMuted}
              value={newHorse.age}
              onChangeText={(val) => onChangeNewHorse((curr) => ({ ...curr, age: val }))}
            />

            <Text style={styles.modalLabel}>Giới tính:</Text>
            <View style={styles.modalSelector}>
              {[
                { value: 'MALE', label: 'Đực' },
                { value: 'FEMALE', label: 'Cái' },
              ].map((item) => {
                const active = newHorse.gender === item.value;
                return (
                  <Pressable
                    key={item.value}
                    style={[styles.modalSelectorOption, active && styles.modalSelectorOptionActive]}
                    onPress={() => onChangeNewHorse((curr) => ({ ...curr, gender: item.value }))}
                  >
                    <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>Màu lông:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ví dụ: Hồng mã"
              placeholderTextColor={colors.darkTextMuted}
              value={newHorse.color}
              onChangeText={(val) => onChangeNewHorse((curr) => ({ ...curr, color: val }))}
            />

            <View style={styles.cardInlineRow}>
              <View style={styles.flexInput}>
                <Text style={styles.modalLabel}>Chiều cao (cm):</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ví dụ: 160"
                  placeholderTextColor={colors.darkTextMuted}
                  value={newHorse.height}
                  onChangeText={(val) => onChangeNewHorse((curr) => ({ ...curr, height: val }))}
                />
              </View>
              <View style={styles.flexInput}>
                <Text style={styles.modalLabel}>Cân nặng (kg):</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ví dụ: 480"
                  placeholderTextColor={colors.darkTextMuted}
                  value={newHorse.weight}
                  onChangeText={(val) => onChangeNewHorse((curr) => ({ ...curr, weight: val }))}
                />
              </View>
            </View>

            <ModalButtons
              cancelText="Hủy"
              confirmText={editing ? 'Lưu thay đổi' : 'Thêm ngựa'}
              onCancel={onClose}
              onConfirm={onSubmit}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function JockeyInviteModal({
  visible,
  ownerTournaments,
  ownerHorses,
  ownerOpenRaces,
  allJockeys,
  ownerInvitations,
  ownerRegistrations,
  inviteForm,
  inviteSubmitting,
  inviteError,
  onChangeInviteForm,
  onClose,
  onSubmit,
}) {
  const selectedInviteRace = (ownerOpenRaces || []).find((race) =>
    sameId(race.id, inviteForm.raceId),
  ) || inviteForm.raceId;
  const availableInviteHorses = (ownerHorses || []).filter(
    (horse) =>
      !inviteForm.raceId ||
      (!raceHorseLockedByInvitation(ownerInvitations, selectedInviteRace, horse.id) &&
        !raceHorseLockedByRegistration(ownerRegistrations, selectedInviteRace, horse.id)),
  );
  const availableInviteJockeys = (allJockeys || []).filter(
    (jockey) =>
      !inviteForm.raceId ||
      (!raceJockeyLockedByInvitation(ownerInvitations, selectedInviteRace, jockey.id) &&
        !raceJockeyLockedByRegistration(ownerRegistrations, selectedInviteRace, jockey.id)),
  );

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ModalHeader title="Gửi lời mời Jockey" onClose={onClose} />

          <ScrollView keyboardShouldPersistTaps="handled">
            <SelectorList
              label="Chọn giải đấu:"
              items={ownerTournaments}
              activeId={inviteForm.tournamentId}
              getId={(t) => t.id || t._id}
              getLabel={(t) => t.name}
              onSelect={(tournamentId) => {
                const filteredRaces = (ownerOpenRaces || []).filter(
                  (r) => String(r.tournamentId) === String(tournamentId)
                );
                const firstRace = filteredRaces[0];
                const firstHorse = firstAvailableHorse(ownerHorses, ownerInvitations, ownerRegistrations, firstRace);
                const firstJockey = firstAvailableJockey(allJockeys, ownerInvitations, ownerRegistrations, firstRace);
                onChangeInviteForm((curr) => ({
                  ...curr,
                  tournamentId,
                  raceId: firstRace ? firstRace.id : '',
                  horseId: firstHorse?.id || '',
                  jockeyId: firstJockey?.id || '',
                  remunerationAmount: firstRace?.entryFee ? String(firstRace.entryFee) : curr.remunerationAmount,
                }));
              }}
            />
            <SelectorList
              label="Chọn cuộc đua:"
              items={(ownerOpenRaces || []).filter(
                (r) => !inviteForm.tournamentId || String(r.tournamentId) === String(inviteForm.tournamentId)
              )}
              activeId={inviteForm.raceId}
              getId={(r) => r.id}
              getLabel={(r) => r.name}
              onSelect={(id, race) => {
                const firstHorse = firstAvailableHorse(ownerHorses, ownerInvitations, ownerRegistrations, race);
                const firstJockey = firstAvailableJockey(allJockeys, ownerInvitations, ownerRegistrations, race);
                onChangeInviteForm((curr) => ({
                  ...curr,
                  raceId: id,
                  tournamentId: race.tournamentId || curr.tournamentId,
                  horseId: firstHorse?.id || '',
                  jockeyId: firstJockey?.id || '',
                  remunerationAmount: race.entryFee ? String(race.entryFee) : curr.remunerationAmount,
                }));
              }}
            />
            <SelectorList
              label="Chọn ngựa của bạn:"
              items={availableInviteHorses}
              activeId={inviteForm.horseId}
              getId={(h) => h.id}
              getLabel={(h) => h.name}
              onSelect={(id) => onChangeInviteForm((curr) => ({ ...curr, horseId: id }))}
            />
            <SelectorList
              label="Chọn Jockey:"
              items={availableInviteJockeys}
              activeId={inviteForm.jockeyId}
              getId={(j) => j.id}
              getLabel={(j) => j.fullName || j.username}
              onSelect={(id) => onChangeInviteForm((curr) => ({ ...curr, jockeyId: id }))}
            />
            {!availableInviteHorses.length && inviteForm.raceId ? (
              <EmptyText text="Race này đã có đủ cặp ngựa/jockey hoặc ngựa đã đăng ký." />
            ) : null}
            {inviteError ? <Text style={styles.inlineError}>{inviteError}</Text> : null}

            <Text style={styles.modalLabel}>Mức thù lao (VND):</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Thù lao trả cho Jockey"
              placeholderTextColor={colors.darkTextMuted}
              value={inviteForm.remunerationAmount}
              onChangeText={(val) => onChangeInviteForm((curr) => ({ ...curr, remunerationAmount: val }))}
            />

            <Text style={styles.modalLabel}>Lời nhắn:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Lời nhắn đính kèm"
              placeholderTextColor={colors.darkTextMuted}
              value={inviteForm.message}
              onChangeText={(val) => onChangeInviteForm((curr) => ({ ...curr, message: val }))}
            />

            <ModalButtons
              cancelText="Hủy"
              confirmText={inviteSubmitting ? 'Đang gửi...' : 'Gửi lời mời'}
              disabled={inviteSubmitting || !availableInviteHorses.length || !availableInviteJockeys.length}
              onCancel={onClose}
              onConfirm={onSubmit}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function RaceRegistrationModal({
  visible,
  ownerTournaments,
  tournamentRaces,
  ownerHorses,
  registerJockeys,
  ownerRegistrations,
  registerForm,
  onChangeTournament,
  onChangeRegisterForm,
  onClose,
  onSubmit,
}) {
  const registrationInvitations = uniqueByRaceHorse(
    (registerJockeys || []).filter(
      (j) =>
        (!registerForm.raceId || sameId(j.raceId, registerForm.raceId)) &&
        !raceHorseLockedByRegistration(ownerRegistrations, registerForm.raceId, j.horseId) &&
        !raceJockeyLockedByRegistration(ownerRegistrations, registerForm.raceId, j.jockeyId),
    ),
  );
  const registrationHorseIds = new Set(registrationInvitations.map((item) => String(item.horseId)));
  const registrationHorses = (ownerHorses || []).filter((horse) => registrationHorseIds.has(String(horse.id)));
  const selectedHorseInvitations = registrationInvitations.filter(
    (j) => !registerForm.horseId || sameId(j.horseId, registerForm.horseId),
  );

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ModalHeader title="Đăng ký giải đấu" onClose={onClose} />

          <ScrollView keyboardShouldPersistTaps="handled">
            <SelectorList
              label="Chọn giải đấu:"
              items={ownerTournaments}
              activeId={registerForm.tournamentId}
              getId={(t) => t.id || t._id}
              getLabel={(t) => t.name}
              onSelect={onChangeTournament}
            />
            <SelectorList
              label="Chọn cuộc đua:"
              items={tournamentRaces}
              activeId={registerForm.raceId}
              getId={(r) => r.id || r._id}
              getLabel={(r) => `Race R${r.raceNumber} · ${r.name}`}
              onSelect={(raceId) => {
                const raceInvitations = uniqueByRaceHorse(
                  (registerJockeys || []).filter(
                    (item) =>
                      sameId(item.raceId, raceId) &&
                      !raceHorseLockedByRegistration(ownerRegistrations, raceId, item.horseId) &&
                      !raceJockeyLockedByRegistration(ownerRegistrations, raceId, item.jockeyId),
                  ),
                );
                const firstInv = raceInvitations[0];
                onChangeRegisterForm((curr) => ({
                  ...curr,
                  raceId,
                  horseId: firstInv ? firstInv.horseId : '',
                  jockeyInvitationId: firstInv ? firstInv.id : '',
                }));
              }}
            />
            <SelectorList
              label="Chọn ngựa của bạn:"
              items={registrationHorses}
              activeId={registerForm.horseId}
              getId={(h) => h.id}
              getLabel={(h) => h.name}
              onSelect={(id) => {
                const matchingInv = registrationInvitations.find((j) => sameId(j.horseId, id));
                onChangeRegisterForm((curr) => ({
                  ...curr,
                  horseId: id,
                  jockeyInvitationId: matchingInv ? matchingInv.id : '',
                }));
              }}
            />

            <SelectorList
              label="Chọn lời mời Jockey đã chấp nhận:"
              items={selectedHorseInvitations}
              activeId={registerForm.jockeyInvitationId}
              getId={(j) => j.id}
              getLabel={(j) => `${j.jockeyName || 'Jockey'} · ${j.horseName || 'Ngựa'}`}
              placeholder="Chọn lời mời"
              onSelect={(id, j) =>
                onChangeRegisterForm((curr) => ({
                  ...curr,
                  horseId: j.horseId || curr.horseId,
                  jockeyInvitationId: id,
                }))
              }
            />
            {!registerJockeys?.length ? (
              <EmptyText text="Cần có lời mời Jockey đã chấp nhận trước khi đăng ký race." />
            ) : !registrationInvitations.length ? (
              <EmptyText text="Race này chưa có lời mời hợp lệ hoặc ngựa đã được đăng ký." />
            ) : null}

            <ModalButtons cancelText="Hủy" confirmText="Đăng ký ngay" onCancel={onClose} onConfirm={onSubmit} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const TRACK_WIDTH = SCREEN_WIDTH - 80; // padding inside modal
const LANE_COLORS = ['rgba(212,160,23,0.18)', 'rgba(59,130,246,0.12)', 'rgba(16,185,129,0.12)', 'rgba(239,68,68,0.12)', 'rgba(168,85,247,0.12)', 'rgba(249,115,22,0.12)'];
const LANE_ACCENT = ['#D4A017', '#3B82F6', '#10B981', '#EF4444', '#A855F7', '#F97316'];

function rankLabel(rank) {
  if (!rank) return '-';
  return `#${rank}`;
}

function HorseRaceTrack({ participants, animating, animDone }) {
  const progRefs = useRef(participants.map(() => new Animated.Value(0)));

  useEffect(() => {
    // Reset
    progRefs.current.forEach((a) => a.setValue(0));
    if (!animating || !participants.length) return;

    // Sort participants by rank to know finish order
    const sorted = [...participants].sort((a, b) => (a.rank || 99) - (b.rank || 99));
    const maxTime = Math.max(...participants.map((p) => p.finishTimeMillis || 5000), 5000);

    const anims = participants.map((p, i) => {
      const duration = Math.max(1200, Math.min(4000, ((p.finishTimeMillis || maxTime) / maxTime) * 3800));
      return Animated.timing(progRefs.current[i], {
        toValue: 1,
        duration: duration,
        useNativeDriver: false,
      });
    });

    Animated.stagger(0, anims).start();
  }, [animating, participants]);

  if (!participants.length) return null;

  const sortedByRank = [...participants].sort((a, b) => (a.rank || 99) - (b.rank || 99));
  const winner = sortedByRank[0];

  return (
    <View style={{ marginVertical: 8 }}>
      {/* Track header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: colors.darkTextMuted, fontSize: 10, fontWeight: '700' }}>CỔNG XUẤT PHÁT</Text>
        <Text style={{ color: colors.darkTextMuted, fontSize: 10, fontWeight: '700' }}>ĐÍCH</Text>
      </View>

      {/* Race lanes */}
      {participants.map((p, i) => {
        const accent = LANE_ACCENT[i % LANE_ACCENT.length];
        const laneColor = LANE_COLORS[i % LANE_COLORS.length];
        const isWinner = animDone && Number(p.rank) === 1;

        return (
          <View key={p.participantId} style={{ marginBottom: 8 }}>
            {/* Lane label */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3, gap: 6 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{p.gateNumber ?? (i + 1)}</Text>
              </View>
              <Text style={{ color: colors.darkText, fontSize: 11, fontWeight: '800', flex: 1 }} numberOfLines={1}>
                {p.horseName}
              </Text>
              {animDone && p.rank ? (
                <Text style={{ color: p.rank === 1 ? colors.primary : colors.darkTextMuted, fontSize: 11, fontWeight: '900' }}>
                  {rankLabel(p.rank)}
                </Text>
              ) : null}
            </View>

            {/* Lane track */}
            <View style={{
              height: 36,
              backgroundColor: laneColor,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.05)',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {/* Finish line */}
              <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, backgroundColor: 'rgba(255,255,255,0.25)' }} />
              {/* Dashed lane markers */}
              {[0.25, 0.5, 0.75].map((pos) => (
                <View key={pos} style={{
                  position: 'absolute',
                  left: `${pos * 100}%`,
                  top: 14,
                  width: 1,
                  height: 8,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                }} />
              ))}
              {/* Horse animated */}
              <Animated.View style={{
                position: 'absolute',
                top: 4,
                left: progRefs.current[i]?.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, TRACK_WIDTH - 70],
                }) || 0,
                alignItems: 'center',
              }}>
                <View style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isWinner ? colors.primary : accent,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.18)',
                }}>
                  <Ionicons name="flash" size={16} color={isWinner ? '#1D1705' : '#FFFFFF'} />
                </View>
              </Animated.View>
            </View>
          </View>
        );
      })}

      {/* Winner announcement */}
      {animDone && winner && (
        <View style={{
          marginTop: 12,
          padding: 12,
          backgroundColor: 'rgba(212,160,23,0.15)',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: 'rgba(212,160,23,0.3)',
          alignItems: 'center',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="trophy" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '900' }}>
              Chiến thắng: {winner.horseName}
            </Text>
          </View>
          <Text style={{ color: colors.darkTextMuted, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
            Nài: {winner.jockeyName} · {((winner.finishTimeMillis || 0) / 1000).toFixed(2)}s
          </Text>
        </View>
      )}
    </View>
  );
}

function RefereeRaceModal({
  visible,
  selectedRefereeRace,
  simulationLoading,
  simulationResult,
  simulationDraft,
  simulationConfirmed,
  onClose,
  onRunSimulation,
  onConfirmSimulation,
  onFinalizeResults,
}) {
  const [animating, setAnimating] = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    if (!simulationResult) {
      setAnimating(false);
      setAnimDone(false);
      setShowAnimation(false);
    }
  }, [simulationResult]);

  useEffect(() => {
    if (!visible || !simulationResult || simulationConfirmed) return undefined;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(timer);
  }, [visible, simulationResult, simulationConfirmed]);

  function startAnimation() {
    setShowAnimation(true);
    setAnimDone(false);
    setAnimating(true);
    const participants = simulationResult?.participants || [];
    const maxTime = Math.max(...participants.map((p) => p.finishTimeMillis || 5000), 5000);
    const animDuration = Math.min(4500, Math.max(2000, (maxTime / 5000) * 4000));
    setTimeout(() => {
      setAnimating(false);
      setAnimDone(true);
    }, animDuration + 500);
  }

  const participants = simulationResult?.participants || [];
  const playbackEndsAtMs = simulationResult?.playbackEndsAt
    ? new Date(simulationResult.playbackEndsAt).getTime()
    : 0;
  const waitSeconds = playbackEndsAtMs ? Math.max(0, Math.ceil((playbackEndsAtMs - nowMs) / 1000)) : 0;
  const canConfirmSimulation = Boolean(simulationResult && animDone && waitSeconds === 0);

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, styles.tallModal]}>
          {selectedRefereeRace && (
            <View style={styles.flexContent}>
              <ModalHeader title="Mô phỏng cuộc đua" onClose={onClose} />
              <Text style={styles.modalLabel}>Race: {selectedRefereeRace.name}</Text>

              {simulationLoading ? (
                <View style={[styles.centerState, styles.simulationState]}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={styles.centerText}>Đang tính toán mô phỏng...</Text>
                  <Text style={{ color: colors.darkTextMuted, fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                    Phân tích lịch sử và may mắn của ngựa
                  </Text>
                </View>
              ) : simulationResult ? (
                <ScrollView style={styles.resultList} showsVerticalScrollIndicator={false}>
                  {/* Animated Race Track */}
                  {showAnimation ? (
                    <View>
                      <Text style={[styles.modalLabel, { marginBottom: 6 }]}>
                        {animDone ? 'Kết quả mô phỏng:' : 'Đang diễn ra...'}
                      </Text>
                      <HorseRaceTrack
                        participants={participants}
                        animating={animating}
                        animDone={animDone}
                      />
                    </View>
                  ) : (
                    <View>
                      {/* Preview before animation */}
                      <Pressable
                        style={{
                          backgroundColor: 'rgba(212,160,23,0.12)',
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: 'rgba(212,160,23,0.3)',
                          padding: 16,
                          alignItems: 'center',
                          marginBottom: 12,
                        }}
                        onPress={startAnimation}
                      >
                        <Ionicons name="play-circle" size={44} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '900', marginTop: 6 }}>
                          Xem mô phỏng trực quan
                        </Text>
                        <Text style={{ color: colors.darkTextMuted, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                          Nhấn để xem {participants.length} ngựa đua
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Results Table */}
                  <Text style={[styles.modalLabel, { marginTop: animDone ? 12 : 0 }]}>Bảng kết quả:</Text>
                  {[...participants]
                    .sort((a, b) => (a.rank || 99) - (b.rank || 99))
                    .map((p) => (
                      <View key={p.participantId} style={styles.participantRow}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: p.rank === 1 ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: '900', color: p.rank === 1 ? colors.primary : colors.darkTextMuted }}>
                            {rankLabel(p.rank)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.participantText} numberOfLines={1}>
                            {p.horseName}
                          </Text>
                          <Text style={{ color: colors.darkTextMuted, fontSize: 10, fontWeight: '600' }}>
                            Nài: {p.jockeyName || '-'} · Cổng: {p.gateNumber ?? '-'}
                          </Text>
                        </View>
                        <Text style={[styles.participantRank, { color: p.rank === 1 ? colors.primary : colors.darkTextMuted }]}>
                          {((p.finishTimeMillis || 0) / 1000).toFixed(2)}s
                        </Text>
                      </View>
                    ))}
                </ScrollView>
              ) : (
                <View style={styles.emptySimulation}>
                  <Ionicons name="analytics-outline" size={52} color={colors.darkTextMuted} />
                  <Text style={[styles.centerText, { marginTop: 8 }]}>Chưa chạy mô phỏng</Text>
                  <Text style={{ color: colors.darkTextMuted, fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center' }}>
                    Nhấn "Chạy mô phỏng" để tính kết quả dự kiến dựa trên lịch sử và hệ số ngẫu nhiên
                  </Text>
                </View>
              )}

              <View style={styles.modalButtonRow}>
                <Pressable style={styles.secondaryAction} onPress={onClose}>
                  <Text style={styles.secondaryActionText}>Đóng</Text>
                </Pressable>
                {!simulationResult && (
                  <Pressable style={styles.primaryAction} onPress={onRunSimulation}>
                    <Text style={styles.primaryActionText}>Chạy mô phỏng</Text>
                  </Pressable>
                )}
                {simulationResult && !animDone && !showAnimation && (
                  <Pressable style={styles.primaryAction} onPress={startAnimation}>
                    <Text style={styles.primaryActionText}>Chiếu cuộc đua</Text>
                  </Pressable>
                )}
                {simulationResult && animDone && !simulationConfirmed && (
                  <Pressable
                    disabled={!canConfirmSimulation}
                    style={[styles.primaryAction, !canConfirmSimulation && styles.disabledButton]}
                    onPress={onConfirmSimulation}
                  >
                    <Text style={styles.primaryActionText}>
                      {waitSeconds > 0 ? `Đợi ${waitSeconds}s` : 'Xác nhận kết quả'}
                    </Text>
                  </Pressable>
                )}
                {simulationConfirmed && (
                  <Pressable style={styles.primaryAction} onPress={onFinalizeResults}>
                    <Text style={styles.primaryActionText}>
                      {simulationDraft?.version ? 'Chốt kết quả' : 'Tải bản nháp'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ViolationModal({
  visible,
  selectedViolationRace,
  violationParticipants,
  violationForm,
  violationTypeOptions = [],
  violationSeverityOptions = [],
  violationSubmitting = false,
  onChangeViolationForm,
  onClose,
  onSubmit,
}) {
  async function pickEvidenceImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    onChangeViolationForm((curr) => ({
      ...curr,
      imageFile: {
        uri: asset.uri,
        name: asset.fileName || `violation-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      },
    }));
  }

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, styles.tallModal]}>
          {selectedViolationRace && (
            <View style={styles.flexContent}>
              <ModalHeader title="Lập biên bản vi phạm" onClose={onClose} />
              <Text style={styles.modalLabel}>Race: {selectedViolationRace.name}</Text>

              <ScrollView keyboardShouldPersistTaps="handled">
                <SelectorList
                  label="Chọn Jockey/Ngựa vi phạm:"
                  items={violationParticipants}
                  activeId={violationForm.participantId}
                  getId={(p) => p.id}
                  getLabel={(p) => `${p.horseName} (Nài: ${p.jockeyName})`}
                  placeholder="Chọn participant"
                  onSelect={(id) => onChangeViolationForm((curr) => ({ ...curr, participantId: id }))}
                />

                <SelectorList
                  label="Loại vi phạm:"
                  items={violationTypeOptions}
                  activeId={violationForm.type}
                  getId={(item) => item.label}
                  getLabel={(item) => item.label}
                  onSelect={(type) => onChangeViolationForm((curr) => ({ ...curr, type }))}
                />
                <SelectorList
                  label="Mức độ nghiêm trọng:"
                  items={violationSeverityOptions}
                  activeId={violationForm.severity}
                  getId={(item) => item.label}
                  getLabel={(item) => {
                    if (item.resultAction === 'TIME_PENALTY' && item.timePenaltyMillis > 0) {
                      return `${item.label} (+${Math.round(item.timePenaltyMillis / 1000)}s)`;
                    }
                    return item.label;
                  }}
                  onSelect={(severity) => onChangeViolationForm((curr) => ({ ...curr, severity }))}
                />

                <Text style={styles.modalLabel}>Hình phạt đề xuất:</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ví dụ: Phạt tiền, Cảnh cáo..."
                  placeholderTextColor={colors.darkTextMuted}
                  value={violationForm.penalty}
                  onChangeText={(val) => onChangeViolationForm((curr) => ({ ...curr, penalty: val }))}
                />

                <Text style={styles.modalLabel}>Mô tả chi tiết lỗi vi phạm:</Text>
                <TextInput
                  style={[styles.modalInput, styles.descriptionInput]}
                  multiline
                  placeholder="Nhập mô tả lỗi vi phạm..."
                  placeholderTextColor={colors.darkTextMuted}
                  value={violationForm.description}
                  onChangeText={(val) => onChangeViolationForm((curr) => ({ ...curr, description: val }))}
                />

                <Text style={styles.modalLabel}>Bằng chứng hình ảnh:</Text>
                <Pressable style={[styles.imagePickerButton, { marginBottom: 12 }]} onPress={pickEvidenceImage}>
                  <Ionicons name="camera-outline" size={20} color={colors.primary} />
                  <Text style={styles.imagePickerText}>
                    {violationForm.imageFile ? 'Đổi ảnh bằng chứng' : 'Chụp/Chọn ảnh bằng chứng'}
                  </Text>
                </Pressable>

                {violationForm.imageFile?.uri ? (
                  <View style={{ marginBottom: 16, alignItems: 'center' }}>
                    <Image
                      source={{ uri: violationForm.imageFile.uri }}
                      style={{ width: '100%', height: 160, borderRadius: 10, resizeMode: 'cover' }}
                    />
                  </View>
                ) : null}

                <ModalButtons
                  cancelText="Hoàn tất"
                  confirmText={violationSubmitting ? 'Đang lập...' : 'Lập biên bản'}
                  disabled={violationSubmitting}
                  onCancel={onClose}
                  onConfirm={onSubmit}
                />
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SelectorList({ label, items, activeId, getId, getLabel, onSelect, placeholder = 'Chọn một mục' }) {
  const [open, setOpen] = useState(false);
  const selectedItem = (items || []).find((item) => String(getId(item)) === String(activeId));
  const selectedLabel = selectedItem ? getLabel(selectedItem) : placeholder;

  return (
    <>
      <Text style={styles.modalLabel}>{label}</Text>
      <View style={styles.dropdown}>
        <Pressable
          style={[styles.dropdownTrigger, open && styles.dropdownTriggerOpen]}
          onPress={() => setOpen((current) => !current)}
        >
          <Text
            style={[styles.dropdownValue, !selectedItem && styles.dropdownPlaceholder]}
            numberOfLines={2}
          >
            {selectedLabel}
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={open ? colors.primary : colors.darkTextMuted}
          />
        </Pressable>

        {open ? (
          <View style={styles.dropdownMenu}>
            {(items || []).map((item) => {
              const id = getId(item);
              const active = String(activeId) === String(id);
              return (
                <Pressable
                  key={id}
                  style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                  onPress={() => {
                    onSelect(id, item);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]} numberOfLines={2}>
                    {getLabel(item)}
                  </Text>
                  {active ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
            {!items?.length ? <EmptyText text="Không có dữ liệu để chọn." /> : null}
          </View>
        ) : null}
      </View>
    </>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>{title}</Text>
      <Pressable style={styles.closeButton} hitSlop={10} onPress={onClose}>
        <Ionicons name="close" size={20} color={colors.darkText} />
      </Pressable>
    </View>
  );
}

function ModalButtons({ cancelText, confirmText, disabled = false, onCancel, onConfirm }) {
  return (
    <View style={styles.modalButtonRow}>
      <Pressable style={styles.secondaryAction} onPress={onCancel}>
        <Text style={styles.secondaryActionText}>{cancelText}</Text>
      </Pressable>
      <Pressable disabled={disabled} style={[styles.primaryAction, disabled && styles.disabledButton]} onPress={onConfirm}>
        <Text style={styles.primaryActionText}>{confirmText}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  tallModal: {
    height: '80%',
  },
  flexContent: {
    flex: 1,
  },
  modalHeader: {
    position: 'relative',
    minHeight: 40,
    justifyContent: 'center',
    marginBottom: 14,
    paddingHorizontal: 42,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 13,
    backgroundColor: colors.darkSurfaceSoft,
  },
  modalTitle: {
    color: colors.darkText,
    fontSize: 18,
    fontWeight: '900',
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
  inlineError: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.28)',
    borderRadius: 12,
    backgroundColor: 'rgba(251, 113, 133, 0.12)',
    color: '#FDA4AF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    padding: 10,
  },
  spacedInput: {
    marginBottom: 8,
  },
  flexInput: {
    flex: 1,
  },
  cardInlineRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 10,
    backgroundColor: colors.darkSurfaceSoft,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  imagePickerText: {
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '800',
  },
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 12,
    backgroundColor: colors.darkSurfaceSoft,
    padding: 10,
  },
  filePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 12,
    backgroundColor: colors.darkSurfaceSoft,
    padding: 10,
  },
  fileIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.darkSurface,
  },
  imagePreview: {
    width: 76,
    height: 58,
    borderRadius: 8,
    backgroundColor: colors.darkSurface,
  },
  imagePreviewMeta: {
    flex: 1,
  },
  imageName: {
    color: colors.darkText,
    fontSize: 12,
    fontWeight: '800',
  },
  removeImageButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#3A2F1B',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeImageText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
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
  dropdown: {
    marginVertical: 6,
  },
  dropdownTrigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 14,
    backgroundColor: colors.darkSurfaceSoft,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  dropdownTriggerOpen: {
    borderColor: colors.primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: '#3A2F1B',
  },
  dropdownValue: {
    flex: 1,
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  dropdownPlaceholder: {
    color: colors.darkTextMuted,
  },
  dropdownMenu: {
    overflow: 'hidden',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.darkBorder,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: colors.darkSurfaceSoft,
  },
  dropdownOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  dropdownOptionActive: {
    backgroundColor: '#3A2F1B',
  },
  dropdownOptionText: {
    flex: 1,
    color: colors.darkTextMuted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  dropdownOptionTextActive: {
    color: colors.primary,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
    fontSize: 11,
    fontWeight: '700',
  },
  presetTextActive: {
    color: colors.primary,
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
  simulationState: {
    marginVertical: 30,
  },
  resultList: {
    marginVertical: 12,
  },
  emptySimulation: {
    marginVertical: 30,
    alignItems: 'center',
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.darkBorder,
  },
  participantText: {
    flex: 1,
    color: colors.darkText,
    fontSize: 12,
    fontWeight: '700',
  },
  participantRank: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  descriptionInput: {
    minHeight: 60,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
