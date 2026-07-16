import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthDivider from '../../components/auth/AuthDivider';
import AuthInput from '../../components/auth/AuthInput';
import AuthNotice from '../../components/auth/AuthNotice';
import PrimaryButton from '../../components/auth/PrimaryButton';
import RegisterBrandHeader from '../../components/auth/RegisterBrandHeader';
import SocialButton from '../../components/auth/SocialButton';
import { colors } from '../../constants/theme';
import { authService } from '../../services/authService';

const roleOptions = [
  { label: 'Horse Owner', value: 'OWNER', icon: 'footsteps-outline' },
  { label: 'Jockey', value: 'JOCKEY', icon: 'ribbon-outline' },
  { label: 'Referee', value: 'REFEREE', icon: 'shield-checkmark-outline' },
  { label: 'Spectator', value: 'SPECTATOR', icon: 'eye-outline' },
];

export default function RegisterScreen({ onNavigateLogin }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('OWNER');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mật khẩu chưa khớp', 'Vui lòng kiểm tra lại mật khẩu xác nhận.');
      return;
    }

    try {
      setLoading(true);
      await authService.register({
        fullName: fullName.trim(),
        email: email.trim(),
        role,
        password,
      });
      Alert.alert('Đăng ký thành công', 'Bạn có thể đăng nhập bằng tài khoản vừa tạo.');
      onNavigateLogin();
    } catch (error) {
      Alert.alert('Đăng ký thất bại', error.message || 'Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <RegisterBrandHeader />

          <View style={styles.card}>
            <Text style={styles.title}>{'\u0110\u0103ng k\u00fd'}</Text>
            <Text style={styles.subtitle}>
              {'Tham gia h\u1ec7 th\u1ed1ng qu\u1ea3n l\u00fd gi\u1ea3i \u0111ua ng\u1ef1a'}
            </Text>

            <View style={styles.form}>
              <AuthInput
                icon={<Ionicons name="person-outline" size={19} color={colors.darkTextMuted} />}
                label={'H\u1ecc V\u00c0 T\u00caN'}
                onChangeText={setFullName}
                placeholder={'Nguy\u1ec5n V\u0103n A'}
                value={fullName}
                variant="dark"
              />

              <AuthInput
                autoCapitalize="none"
                containerStyle={styles.inputGap}
                icon={<Ionicons name="mail-outline" size={19} color={colors.darkTextMuted} />}
                keyboardType="email-address"
                label="EMAIL"
                onChangeText={setEmail}
                placeholder="email@example.com"
                value={email}
                variant="dark"
              />

              <View style={styles.roleBlock}>
                <Text style={styles.roleLabel}>{'VAI TRÒ MOBILE'}</Text>
                <View style={styles.roleGrid}>
                  {roleOptions.map((option) => {
                    const active = role === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        style={[styles.roleOption, active && styles.roleOptionActive]}
                        onPress={() => setRole(option.value)}
                      >
                        <Ionicons
                          name={option.icon}
                          size={18}
                          color={active ? '#1D1705' : colors.darkTextMuted}
                        />
                        <Text style={[styles.roleText, active && styles.roleTextActive]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <AuthInput
                containerStyle={styles.inputGap}
                icon={<Ionicons name="lock-closed-outline" size={19} color={colors.darkTextMuted} />}
                label="MẬT KHẨU"
                onChangeText={setPassword}
                placeholder={'T\u1ed1i thi\u1ec3u 8 k\u00fd t\u1ef1'}
                rightIcon={
                  <Pressable hitSlop={10} onPress={() => setShowPassword((current) => !current)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={19}
                      color={colors.darkTextMuted}
                    />
                  </Pressable>
                }
                secureTextEntry={!showPassword}
                value={password}
                variant="dark"
              />

              <AuthInput
                containerStyle={styles.inputGap}
                icon={<Ionicons name="lock-closed-outline" size={19} color={colors.darkTextMuted} />}
                label="XÁC NHẬN MẬT KHẨU"
                onChangeText={setConfirmPassword}
                placeholder={'Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u'}
                rightIcon={
                  <Pressable
                    hitSlop={10}
                    onPress={() => setShowConfirmPassword((current) => !current)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={19}
                      color={colors.darkTextMuted}
                    />
                  </Pressable>
                }
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                variant="dark"
              />

              <AuthNotice>
                {'Mobile hỗ trợ Horse Owner, Jockey, Referee và Spectator. Admin sử dụng FE riêng.'}
              </AuthNotice>

              <PrimaryButton
                disabled={!fullName.trim() || !email.trim() || !password || !confirmPassword}
                loading={loading}
                onPress={handleRegister}
                title={'\u0110\u0103ng k\u00fd'}
                textColor="#201A05"
              />
            </View>

            <AuthDivider label={'Ho\u1eb7c \u0111\u0103ng k\u00fd v\u1edbi'} variant="dark" />

            <View style={styles.socialRow}>
              <SocialButton provider="google" variant="dark" />
              <SocialButton provider="facebook" variant="dark" />
            </View>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>{'\u0110\u00e3 c\u00f3 t\u00e0i kho\u1ea3n? '}</Text>
              <Pressable hitSlop={10} onPress={onNavigateLogin}>
                <Text style={styles.loginLink}>{'\u0110\u0103ng nh\u1eadp'}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 38,
    paddingBottom: 38,
  },
  card: {
    marginTop: 23,
    borderWidth: 1,
    borderColor: '#192840',
    borderRadius: 13,
    backgroundColor: colors.darkSurface,
    paddingHorizontal: 23,
    paddingTop: 25,
    paddingBottom: 27,
  },
  title: {
    color: colors.darkText,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
  },
  form: {
    marginTop: 21,
  },
  inputGap: {
    marginTop: 15,
  },
  roleBlock: {
    marginTop: 15,
  },
  roleLabel: {
    color: colors.logo,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    marginLeft: 3,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleOption: {
    width: '48%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 12,
    backgroundColor: colors.darkSurface,
    paddingHorizontal: 10,
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  roleText: {
    flex: 1,
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '900',
  },
  roleTextActive: {
    color: '#1D1705',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  loginText: {
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  loginLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
});
