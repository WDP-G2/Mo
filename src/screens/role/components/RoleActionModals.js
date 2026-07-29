import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../../../constants/theme';
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
          <Text style={styles.modalTitle}>Đặt cược ảo</Text>

          {selectedMarket && (
            <ScrollView>
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
          <Text style={styles.modalTitle}>{editing ? 'Sửa thông tin ngựa' : 'Thêm ngựa thi đấu mới'}</Text>

          <ScrollView>
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
  ownerHorses,
  ownerOpenRaces,
  allJockeys,
  inviteForm,
  onChangeInviteForm,
  onClose,
  onSubmit,
}) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Gửi lời mời Jockey</Text>

          <ScrollView>
            <SelectorList
              label="Chọn ngựa của bạn:"
              items={ownerHorses}
              activeId={inviteForm.horseId}
              getId={(h) => h.id}
              getLabel={(h) => h.name}
              onSelect={(id) => onChangeInviteForm((curr) => ({ ...curr, horseId: id }))}
            />
            <SelectorList
              label="Chọn cuộc đua:"
              items={ownerOpenRaces}
              activeId={inviteForm.raceId}
              getId={(r) => r.id}
              getLabel={(r) => r.name}
              onSelect={(id) => onChangeInviteForm((curr) => ({ ...curr, raceId: id }))}
            />
            <SelectorList
              label="Chọn Jockey:"
              items={allJockeys}
              activeId={inviteForm.jockeyId}
              getId={(j) => j.id}
              getLabel={(j) => j.fullName || j.username}
              onSelect={(id) => onChangeInviteForm((curr) => ({ ...curr, jockeyId: id }))}
            />

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

            <ModalButtons cancelText="Hủy" confirmText="Gửi lời mời" onCancel={onClose} onConfirm={onSubmit} />
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
  registerForm,
  onChangeTournament,
  onChangeRegisterForm,
  onClose,
  onSubmit,
}) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Đăng ký giải đấu</Text>

          <ScrollView>
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
                const raceInvitation = (registerJockeys || []).find((item) => String(item.raceId) === String(raceId));
                onChangeRegisterForm((curr) => ({
                  ...curr,
                  raceId,
                  jockeyInvitationId: raceInvitation?.id || '',
                }));
              }}
            />
            <SelectorList
              label="Chọn ngựa của bạn:"
              items={ownerHorses}
              activeId={registerForm.horseId}
              getId={(h) => h.id}
              getLabel={(h) => h.name}
              onSelect={(id) => onChangeRegisterForm((curr) => ({ ...curr, horseId: id }))}
            />

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
                    onPress={() =>
                      onChangeRegisterForm((curr) => ({
                        ...curr,
                        horseId: j.horseId || curr.horseId,
                        jockeyInvitationId: j.id,
                      }))
                    }
                  >
                    <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                      {j.jockeyName || 'Jockey'} · {j.horseName || 'Ngựa'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {!registerJockeys?.length ? (
              <EmptyText text="Cần có lời mời Jockey đã chấp nhận trước khi đăng ký race." />
            ) : null}

            <ModalButtons cancelText="Hủy" confirmText="Đăng ký ngay" onCancel={onClose} onConfirm={onSubmit} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function RefereeRaceModal({
  visible,
  selectedRefereeRace,
  simulationLoading,
  simulationResult,
  simulationConfirmed,
  onClose,
  onRunSimulation,
  onConfirmSimulation,
  onFinalizeResults,
}) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, styles.tallModal]}>
          {selectedRefereeRace && (
            <View style={styles.flexContent}>
              <Text style={styles.modalTitle}>Mô phỏng cuộc đua</Text>
              <Text style={styles.modalLabel}>Race: {selectedRefereeRace.name}</Text>
              <Text style={styles.modalLabel}>Giải đấu: {selectedRefereeRace.tournamentName}</Text>

              {simulationLoading ? (
                <View style={[styles.centerState, styles.simulationState]}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.centerText}>Đang mô phỏng diễn biến...</Text>
                </View>
              ) : simulationResult ? (
                <ScrollView style={styles.resultList}>
                  <Text style={styles.modalLabel}>Bảng kết quả dự kiến:</Text>
                  {(simulationResult.participants || [])
                    .sort((a, b) => a.rank - b.rank)
                    .map((p) => (
                      <View key={p.participantId} style={styles.participantRow}>
                        <Text style={styles.participantText}>{p.horseName} (Nài: {p.jockeyName})</Text>
                        <Text style={styles.participantRank}>
                          Hạng {p.rank} ({(p.finishTimeMillis / 1000).toFixed(2)}s)
                        </Text>
                      </View>
                    ))}
                </ScrollView>
              ) : (
                <View style={styles.emptySimulation}>
                  <Ionicons name="play-circle-outline" size={48} color={colors.darkTextMuted} />
                  <Text style={styles.centerText}>Chưa chạy mô phỏng cuộc đua</Text>
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
                {simulationResult && !simulationConfirmed && (
                  <Pressable style={styles.primaryAction} onPress={onConfirmSimulation}>
                    <Text style={styles.primaryActionText}>Xác nhận kết quả</Text>
                  </Pressable>
                )}
                {simulationConfirmed && (
                  <Pressable style={styles.primaryAction} onPress={onFinalizeResults}>
                    <Text style={styles.primaryActionText}>Chốt kết quả</Text>
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
  onChangeViolationForm,
  onClose,
  onSubmit,
}) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {selectedViolationRace && (
            <View style={styles.flexContent}>
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
                        onPress={() => onChangeViolationForm((curr) => ({ ...curr, participantId: p.id }))}
                      >
                        <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                          {p.horseName} (Nài: {p.jockeyName})
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <SelectorList
                  label="Loại vi phạm:"
                  items={['Cản trở đối thủ', 'Lấn làn', 'Xuất phát sớm', 'Khác']}
                  activeId={violationForm.type}
                  getId={(item) => item}
                  getLabel={(item) => item}
                  onSelect={(type) => onChangeViolationForm((curr) => ({ ...curr, type }))}
                />
                <SelectorList
                  label="Mức độ nghiêm trọng:"
                  items={['Phạt nhẹ', 'Phạt cảnh cáo', 'Nghiêm trọng']}
                  activeId={violationForm.severity}
                  getId={(item) => item}
                  getLabel={(item) => item}
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

                <ModalButtons cancelText="Hủy" confirmText="Lập biên bản" onCancel={onClose} onConfirm={onSubmit} />
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SelectorList({ label, items, activeId, getId, getLabel, onSelect }) {
  return (
    <>
      <Text style={styles.modalLabel}>{label}</Text>
      <View style={styles.modalSelector}>
        {(items || []).map((item) => {
          const id = getId(item);
          const active = activeId === id;
          return (
            <Pressable
              key={id}
              style={[styles.modalSelectorOption, active && styles.modalSelectorOptionActive]}
              onPress={() => onSelect(id, item)}
            >
              <Text style={[styles.modalSelectorText, active && styles.modalSelectorTextActive]}>
                {getLabel(item)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function ModalButtons({ cancelText, confirmText, onCancel, onConfirm }) {
  return (
    <View style={styles.modalButtonRow}>
      <Pressable style={styles.secondaryAction} onPress={onCancel}>
        <Text style={styles.secondaryActionText}>{cancelText}</Text>
      </Pressable>
      <Pressable style={styles.primaryAction} onPress={onConfirm}>
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
