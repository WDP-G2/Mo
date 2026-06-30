import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../constants/theme';
import RoleHomeScreen from '../role/RoleHomeScreen';
import { isAdminRole } from '../../utils/role';

export default function HomeScreen({ user, onLogout }) {
  if (!isAdminRole(user?.role)) {
    return <RoleHomeScreen user={user} onLogout={onLogout} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.unsupported}>
        <Text style={styles.title}>Admin không dùng mobile</Text>
        <Text style={styles.subtitle}>
          Mobile dành cho Horse Owner, Jockey, Referee và Spectator. Vui lòng dùng FE admin.
        </Text>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  unsupported: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: colors.darkText,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    color: colors.darkTextMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 20,
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  logoutText: {
    color: '#1D1705',
    fontSize: 13,
    fontWeight: '900',
  },
});
