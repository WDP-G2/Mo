import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import AdminHeader from '../../components/home/AdminHeader';
import AdminMetricCard from '../../components/home/AdminMetricCard';
import AdminPageTitle from '../../components/home/AdminPageTitle';
import HomeSectionHeader from '../../components/home/HomeSectionHeader';
import { colors } from '../../constants/theme';
import { horseService } from '../../services/horseService';
import { tournamentService } from '../../services/tournamentService';
import { userService } from '../../services/userService';

function chartBottom(value, multiplier) {
  return Math.min(150, 26 + value * multiplier);
}

export default function StatisticsScreen() {
  const [tournaments, setTournaments] = useState([]);
  const [horses, setHorses] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    Promise.all([tournamentService.list(), horseService.list(), userService.list()])
      .then(([nextTournaments, nextHorses, nextUsers]) => {
        if (!alive) return;
        setTournaments(nextTournaments);
        setHorses(nextHorses);
        setUsers(nextUsers);
      })
      .catch((requestError) => {
        if (alive) setError(requestError.message || 'Không tải được thống kê.');
      });

    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const raceCount = tournaments.reduce((total, item) => total + Number(item.raceCount || 0), 0);
    const registrationCount = tournaments.reduce(
      (total, item) => total + Number(item.registrationCount || 0),
      0,
    );
    const activeHorses = horses.filter((horse) => horse.canRace).length;

    return {
      raceCount,
      registrationCount,
      activeHorses,
      tournamentCount: tournaments.length,
      userCount: users.length,
    };
  }, [horses, tournaments, users]);

  const bars = tournaments.slice(0, 5).map((item) => ({
    label: item.name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 4)
      .toUpperCase(),
    value: Math.max(1, Number(item.raceCount || 0)),
  }));
  const topHorses = [...horses].sort((a, b) => b.wins - a.wins).slice(0, 5);
  const maxBar = Math.max(...bars.map((item) => item.value), 1);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AdminHeader subtitle="Analytics" />
      <AdminPageTitle
        highlight={'To\u00e0n h\u1ec7 th\u1ed1ng'}
        subtitle={'B\u00e1o c\u00e1o t\u1ed5ng h\u1ee3p gi\u1ea3i \u0111\u1ea5u, cu\u1ed9c \u0111ua, doanh thu v\u00e0 x\u1ebfp h\u1ea1ng'}
        title={'Th\u1ed1ng k\u00ea'}
      />

      <View style={styles.metricGrid}>
        <AdminMetricCard icon="trophy-outline" label={'Gi\u1ea3i \u0111\u1ea5u'} tone="gold" trend="BE" value={String(stats.tournamentCount)} />
        <AdminMetricCard icon="flag-outline" label={'Cu\u1ed9c \u0111ua'} tone="blue" trend="BE" value={String(stats.raceCount)} />
      </View>
      <View style={styles.metricGrid}>
        <AdminMetricCard icon="people-outline" label={'\u0110\u0103ng k\u00fd'} tone="green" trend="BE" value={String(stats.registrationCount)} />
        <AdminMetricCard icon="footsteps-outline" label={'Ng\u1ef1a s\u1eb5n s\u00e0ng'} tone="gold" trend="BE" value={String(stats.activeHorses)} />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>{'T\u1ed5ng quan h\u1ec7 th\u1ed1ng'}</Text>
            <Text style={styles.chartSubtitle}>{'D\u1eef li\u1ec7u t\u1eeb BE theo gi\u1ea3i \u0111\u1ea5u v\u00e0 ng\u01b0\u1eddi d\u00f9ng'}</Text>
          </View>
          <View style={styles.growthPill}>
            <Text style={styles.growthText}>{stats.userCount} người dùng</Text>
          </View>
        </View>
        <View style={styles.lineChart}>
          <View style={[styles.linePoint, { left: '4%', bottom: chartBottom(stats.tournamentCount, 8) }]} />
          <View style={[styles.linePoint, { left: '24%', bottom: chartBottom(stats.raceCount, 4) }]} />
          <View style={[styles.linePoint, { left: '44%', bottom: chartBottom(stats.registrationCount, 1) }]} />
          <View style={[styles.linePoint, { left: '64%', bottom: chartBottom(stats.activeHorses, 3) }]} />
          <View style={[styles.linePoint, { left: '84%', bottom: chartBottom(stats.userCount, 2) }]} />
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>{'S\u1ed1 cu\u1ed9c \u0111ua / Gi\u1ea3i'}</Text>
        <View style={styles.barRow}>
          {bars.map((item) => (
            <View key={item.label} style={styles.barItem}>
              <View style={[styles.bar, { height: Math.max(16, (item.value / maxBar) * 145) }]} />
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          ))}
          {!bars.length ? <Text style={styles.emptyText}>{'Chưa có dữ liệu giải đấu.'}</Text> : null}
        </View>
      </View>

      <HomeSectionHeader title={'Top ng\u1ef1a th\u1eafng gi\u1ea3i'} />
      <View style={styles.table}>
        {topHorses.map((item, index) => (
          <View key={item.id} style={styles.tableRow}>
            <View style={styles.rank}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.tableName}>
              <Text style={styles.horseName}>{item.name}</Text>
              <Text style={styles.tableMeta}>{item.wins} {'tr\u1eadn th\u1eafng'}</Text>
            </View>
            <Text style={styles.prize}>{item.races} lượt đua</Text>
          </View>
        ))}
        {!topHorses.length ? <Text style={styles.emptyText}>{'Chưa có dữ liệu ngựa.'}</Text> : null}
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
  metricGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  chartCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 16,
    backgroundColor: colors.darkSurface,
    padding: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartTitle: {
    color: colors.darkText,
    fontSize: 18,
    fontWeight: '900',
  },
  chartSubtitle: {
    marginTop: 5,
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  growthPill: {
    borderRadius: 16,
    backgroundColor: '#073F38',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  growthText: {
    color: '#55F0BE',
    fontSize: 11,
    fontWeight: '900',
  },
  lineChart: {
    height: 180,
    marginTop: 18,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#6B7280',
    backgroundColor: '#101B2A',
  },
  linePoint: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  barRow: {
    height: 185,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginTop: 18,
  },
  barItem: {
    alignItems: 'center',
  },
  bar: {
    width: 32,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    backgroundColor: colors.primary,
  },
  barLabel: {
    marginTop: 8,
    color: colors.darkTextMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  table: {
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 16,
    backgroundColor: colors.darkSurface,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
  },
  rank: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  rankText: {
    color: '#1D1705',
    fontSize: 13,
    fontWeight: '900',
  },
  tableName: {
    flex: 1,
  },
  horseName: {
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
  },
  tableMeta: {
    marginTop: 4,
    color: colors.darkTextMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  prize: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  errorText: {
    marginBottom: 12,
    color: '#FDA4AF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    padding: 16,
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
