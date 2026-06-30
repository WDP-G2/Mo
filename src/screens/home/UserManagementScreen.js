import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import AdminHeader from '../../components/home/AdminHeader';
import AdminPageTitle from '../../components/home/AdminPageTitle';
import SearchBar from '../../components/home/SearchBar';
import { colors } from '../../constants/theme';
import { userService } from '../../services/userService';

export default function UserManagementScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    userService
      .list()
      .then((items) => {
        if (alive) setUsers(items);
      })
      .catch((requestError) => {
        if (alive) setError(requestError.message || 'Không tải được người dùng.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AdminHeader subtitle="User Management" />
      <AdminPageTitle
        highlight={'Qu\u1ea3n l\u00fd'}
        subtitle={'Ch\u1ee7 ng\u1ef1a, jockey, tr\u1ecdng t\u00e0i, kh\u00e1n gi\u1ea3 v\u00e0 y\u00eau c\u1ea7u c\u1ea5p quy\u1ec1n'}
        title={'Ng\u01b0\u1eddi d\u00f9ng'}
      />

      <View style={styles.primaryButton}>
        <Ionicons name="person-add-outline" size={18} color="#1D1705" />
        <Text style={styles.primaryButtonText}>{'M\u1eddi ng\u01b0\u1eddi d\u00f9ng'}</Text>
      </View>

      <View style={styles.segmentRow}>
        <View style={styles.segmentActive}>
          <Text style={styles.segmentActiveText}>{'Danh s\u00e1ch ng\u01b0\u1eddi d\u00f9ng'}</Text>
          <Text style={styles.badge}>{users.length}</Text>
        </View>
        <View style={styles.segment}>
          <Text style={styles.segmentText}>{'Y\u00eau c\u1ea7u c\u1ea5p quy\u1ec1n'}</Text>
          <Text style={styles.badgeMuted}>0</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.filterRow}>
          <View style={styles.searchWrap}>
            <SearchBar placeholder={'T\u00ecm theo t\u00ean ho\u1eb7c email...'} />
          </View>
          <View style={styles.filterPill}>
            <Text style={styles.filterText}>{'T\u1ea5t c\u1ea3'}</Text>
          </View>
        </View>
        {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
        {!loading && error ? <Text style={styles.emptyText}>{error}</Text> : null}
        {!loading && !error && users.length === 0 ? (
          <Text style={styles.emptyText}>{'Chưa có người dùng.'}</Text>
        ) : null}
        {users.map((user) => (
          <UserRow key={user.id} user={user} />
        ))}
      </View>

      <View style={styles.notice}>
        <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
        <Text style={styles.noticeText}>
          {'Kh\u00e1n gi\u1ea3 c\u00f3 th\u1ec3 n\u1ed9p y\u00eau c\u1ea7u n\u00e2ng c\u1ea5p th\u00e0nh Jockey, Ch\u1ee7 ng\u1ef1a ho\u1eb7c Tr\u1ecdng t\u00e0i. Admin x\u00e9t duy\u1ec7t t\u1ea1i \u0111\u00e2y.'}
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.emptyText}>
          {'BE hiện chưa có endpoint yêu cầu cấp quyền. Danh sách sẽ hiển thị khi API được bổ sung.'}
        </Text>
      </View>
    </ScrollView>
  );
}

function UserRow({ user }) {
  const isLocked = user.status !== '\u0110ang ho\u1ea1t \u0111\u1ed9ng';

  return (
    <View style={styles.userRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user.code}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userMeta}>{user.email || user.phone || 'Chưa cập nhật liên hệ'}</Text>
        <Text style={styles.userMeta}>{user.phone || 'Chưa cập nhật số điện thoại'}</Text>
      </View>
      <View style={styles.rolePill}>
        <Text style={styles.roleText}>{user.role}</Text>
      </View>
      <View style={[styles.statusPill, isLocked && styles.lockedPill]}>
        <Text style={[styles.statusText, isLocked && styles.lockedText]}>{user.status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 22,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    borderRadius: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#1D1705',
    fontSize: 13,
    fontWeight: '900',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  segmentActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.primary,
    paddingVertical: 12,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 16,
    backgroundColor: colors.darkSurface,
    paddingVertical: 12,
  },
  segmentActiveText: {
    color: '#1D1705',
    fontSize: 12,
    fontWeight: '900',
  },
  segmentText: {
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  badge: {
    marginLeft: 8,
    color: '#1D1705',
    fontSize: 11,
    fontWeight: '900',
  },
  badgeMuted: {
    marginLeft: 8,
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '900',
  },
  panel: {
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 16,
    backgroundColor: colors.darkSurface,
    overflow: 'hidden',
  },
  loader: {
    paddingVertical: 18,
  },
  emptyText: {
    padding: 16,
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  filterRow: {
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.darkBorder,
  },
  searchWrap: {
    flex: 1,
  },
  filterPill: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: colors.darkSurfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: {
    color: colors.darkText,
    fontSize: 12,
    fontWeight: '800',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: '#1D1705',
    fontSize: 16,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
  },
  userMeta: {
    marginTop: 3,
    color: colors.darkTextMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  rolePill: {
    borderRadius: 14,
    backgroundColor: '#3A2F1B',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  roleText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  statusPill: {
    borderRadius: 14,
    backgroundColor: '#083C33',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    color: '#6EE7B7',
    fontSize: 9,
    fontWeight: '900',
  },
  lockedPill: {
    backgroundColor: '#47242B',
  },
  lockedText: {
    color: '#FDA4AF',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 16,
    backgroundColor: colors.warningSurface,
    padding: 14,
  },
  noticeText: {
    flex: 1,
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 17,
  },
});
