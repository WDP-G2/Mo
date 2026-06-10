import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import AdminHeader from '../../components/home/AdminHeader';
import HomeSectionHeader from '../../components/home/HomeSectionHeader';
import SearchBar from '../../components/home/SearchBar';
import { colors } from '../../constants/theme';
import { tournamentService } from '../../services/tournamentService';

const actions = [
  { icon: 'add-circle-outline', title: 'T\u1ea1o gi\u1ea3i \u0111\u1ea5u', desc: 'L\u1eadp th\u00f4ng tin m\u00f9a gi\u1ea3i m\u1edbi' },
  { icon: 'calendar-outline', title: 'L\u1eadp l\u1ecbch thi \u0111\u1ea5u', desc: 'S\u1eafp x\u1ebfp cu\u1ed9c \u0111ua v\u00e0 v\u00f2ng \u0111ua' },
  { icon: 'checkmark-done-outline', title: 'Duy\u1ec7t \u0111\u0103ng k\u00fd', desc: 'X\u00e1c nh\u1eadn ng\u1ef1a, jockey, horse owner' },
  { icon: 'shield-checkmark-outline', title: 'Ph\u00e2n c\u00f4ng tr\u1ecdng t\u00e0i', desc: 'G\u00e1n referee cho t\u1eebng cu\u1ed9c \u0111ua' },
];

export default function TournamentAdminScreen() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    tournamentService
      .list()
      .then((items) => {
        if (alive) setTournaments(items);
      })
      .catch((requestError) => {
        if (alive) setError(requestError.message || 'Không tải được giải đấu.');
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
      <AdminHeader subtitle="Tournament Admin" />
      <SearchBar placeholder={'T\u00ecm gi\u1ea3i \u0111\u1ea5u, cu\u1ed9c \u0111ua...'} />

      <HomeSectionHeader title={'T\u00e1c v\u1ee5 qu\u1ea3n tr\u1ecb'} />
      <View style={styles.actionGrid}>
        {actions.map((item) => (
          <View key={item.title} style={styles.actionCard}>
            <Ionicons name={item.icon} size={24} color={colors.primary} />
            <Text style={styles.actionTitle}>{item.title}</Text>
            <Text style={styles.actionDesc}>{item.desc}</Text>
          </View>
        ))}
      </View>

      <HomeSectionHeader title={'Danh s\u00e1ch gi\u1ea3i \u0111\u1ea5u'} action={'T\u1ea1o m\u1edbi'} />
      <View style={styles.list}>
        {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
        {!loading && error ? <Text style={styles.emptyText}>{error}</Text> : null}
        {!loading && !error && tournaments.length === 0 ? (
          <Text style={styles.emptyText}>{'Chưa có giải đấu.'}</Text>
        ) : null}
        {tournaments.map((item) => (
          <View key={item.id} style={styles.tournamentCard}>
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <Ionicons name="trophy-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.tournamentInfo}>
                <Text style={styles.tournamentName}>{item.name}</Text>
                <Text style={styles.tournamentStatus}>
                  {item.status} · {item.dateLabel}
                </Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaBox}>
                <Text style={styles.metaValue}>{item.raceCount}</Text>
                <Text style={styles.metaLabel}>{'Cu\u1ed9c \u0111ua'}</Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaValue}>{item.pendingCount}</Text>
                <Text style={styles.metaLabel}>{'Ch\u1edd duy\u1ec7t'}</Text>
              </View>
              <View style={styles.manageButton}>
                <Text style={styles.manageText}>{'Qu\u1ea3n l\u00fd'}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 22,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    minHeight: 126,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 14,
    backgroundColor: colors.darkSurface,
    padding: 13,
  },
  actionTitle: {
    marginTop: 12,
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  actionDesc: {
    marginTop: 6,
    color: colors.darkTextMuted,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 15,
  },
  list: {
    gap: 12,
  },
  loader: {
    paddingVertical: 18,
  },
  emptyText: {
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  tournamentCard: {
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 14,
    backgroundColor: colors.darkSurface,
    padding: 13,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.darkSurfaceSoft,
  },
  tournamentInfo: {
    flex: 1,
    marginLeft: 11,
  },
  tournamentName: {
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
  },
  tournamentStatus: {
    marginTop: 4,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  metaBox: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.darkSurfaceSoft,
    padding: 10,
  },
  metaValue: {
    color: colors.darkText,
    fontSize: 16,
    fontWeight: '900',
  },
  metaLabel: {
    marginTop: 3,
    color: colors.darkTextMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  manageButton: {
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  manageText: {
    color: '#201A05',
    fontSize: 11,
    fontWeight: '900',
  },
});
