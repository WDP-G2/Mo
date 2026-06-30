import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import AdminHeader from '../../components/home/AdminHeader';
import AdminMetricCard from '../../components/home/AdminMetricCard';
import AdminPageTitle from '../../components/home/AdminPageTitle';
import HeroCard from '../../components/home/HeroCard';
import HomeSectionHeader from '../../components/home/HomeSectionHeader';
import NewsCard from '../../components/home/NewsCard';
import RaceCard from '../../components/home/RaceCard';
import RankingCard from '../../components/home/RankingCard';
import StatCard from '../../components/home/StatCard';
import { colors } from '../../constants/theme';
import { horseService } from '../../services/horseService';
import { newsService } from '../../services/newsService';
import { tournamentService } from '../../services/tournamentService';
import { userService } from '../../services/userService';

const raceImage =
  'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=700&q=80';
const newsImage =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80';

export default function AdminDashboardScreen() {
  const [tournaments, setTournaments] = useState([]);
  const [news, setNews] = useState([]);
  const [users, setUsers] = useState([]);
  const [horses, setHorses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    Promise.all([
      tournamentService.list(),
      newsService.list(),
      userService.list(),
      horseService.list(),
    ])
      .then(([nextTournaments, nextNews, nextUsers, nextHorses]) => {
        if (!alive) return;
        setTournaments(nextTournaments);
        setNews(nextNews);
        setUsers(nextUsers);
        setHorses(nextHorses);
      })
      .catch((requestError) => {
        if (alive) setError(requestError.message || 'Không tải được dữ liệu tổng quan.');
      });

    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const raceCount = tournaments.reduce((total, item) => total + Number(item.raceCount || 0), 0);
    const participantCount = tournaments.reduce(
      (total, item) => total + Number(item.registrationCount || 0),
      0,
    );
    const pendingCount = tournaments.reduce(
      (total, item) => total + Number(item.pendingCount || 0),
      0,
    );
    const jockeyCount = users.filter((item) => item.role === 'JOCKEY').length;

    return {
      tournamentCount: tournaments.length,
      raceCount,
      participantCount,
      pendingCount,
      jockeyCount,
      userCount: users.length,
      horseCount: horses.length,
    };
  }, [horses, tournaments, users]);

  const upcoming = tournaments.slice(0, 2);
  const featuredNews = news.filter((item) => item.featured).slice(0, 2);
  const visibleNews = featuredNews.length ? featuredNews : news.slice(0, 2);
  const topHorses = [...horses].sort((a, b) => b.wins - a.wins).slice(0, 3);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AdminHeader subtitle="Championship" />
      <AdminPageTitle
        highlight={'B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n'}
        subtitle={'Th\u1ed1ng k\u00ea h\u1ec7 th\u1ed1ng qu\u1ea3n l\u00fd gi\u1ea3i \u0111ua ng\u1ef1a'}
        title={'T\u1ed5ng quan'}
      />
      <View style={styles.metricGrid}>
        <AdminMetricCard icon="trophy-outline" label={'T\u1ed5ng gi\u1ea3i \u0111\u1ea5u'} tone="gold" trend="BE" value={String(stats.tournamentCount)} />
        <AdminMetricCard icon="flag-outline" label={'T\u1ed5ng cu\u1ed9c \u0111ua'} tone="blue" trend="BE" value={String(stats.raceCount)} />
      </View>
      <View style={styles.metricGrid}>
        <AdminMetricCard icon="people-outline" label={'Ng\u01b0\u1eddi tham gia'} tone="green" trend="BE" value={String(stats.participantCount)} />
        <AdminMetricCard icon="footsteps-outline" label={'Ng\u1ef1a \u0111ua'} tone="gold" trend="BE" value={String(stats.horseCount)} />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <HeroCard />

      <HomeSectionHeader title={'Gi\u1ea3i \u0111\u1ea5u s\u1eafp t\u1edbi'} action={'Xem t\u1ea5t c\u1ea3'} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.raceList}>
          {(upcoming.length ? upcoming : []).map((item) => (
            <RaceCard
              key={item.id}
              date={item.dateLabel}
              image={item.banner || raceImage}
              location={item.location}
              name={item.name}
              prize={String(item.prize)}
              status={item.status}
            />
          ))}
          {!upcoming.length ? <Text style={styles.emptyText}>{'Chưa có giải đấu.'}</Text> : null}
        </View>
      </ScrollView>

      <HomeSectionHeader title={'Vi\u1ec7c c\u1ea7n x\u1eed l\u00fd'} />
      <View style={styles.todoPanel}>
        <TodoItem count={String(stats.pendingCount).padStart(2, '0')} icon="person-add-outline" title={'Duy\u1ec7t \u0111\u0103ng k\u00fd tham gia'} />
        <TodoItem count={String(stats.raceCount).padStart(2, '0')} icon="flag-outline" title={'Theo d\u00f5i cu\u1ed9c \u0111ua'} />
        <TodoItem count={String(news.length).padStart(2, '0')} icon="newspaper-outline" title={'Qu\u1ea3n l\u00fd b\u00e0i vi\u1ebft'} />
      </View>

      <HomeSectionHeader title={'B\u1ea3ng x\u1ebfp h\u1ea1ng'} />
      <View style={styles.panel}>
        {topHorses.map((horse, index) => (
          <RankingCard
            key={horse.id}
            name={horse.name}
            rank={index + 1}
            rate={`${horse.wins} thắng`}
            subtitle={`Chủ sở hữu: ${horse.ownerName}`}
          />
        ))}
        {!topHorses.length ? <Text style={styles.panelEmptyText}>{'Chưa có dữ liệu ngựa.'}</Text> : null}
      </View>

      <HomeSectionHeader title={'Th\u1ed1ng k\u00ea h\u1ec7 th\u1ed1ng'} />
      <View style={styles.statsGrid}>
        <StatCard icon="trophy-outline" label={'GI\u1ea2I \u0110\u1ea4U'} value={String(stats.tournamentCount)} />
        <StatCard icon="footsteps-outline" label={'NG\u1ef0A \u0110UA'} value={String(stats.horseCount)} />
      </View>
      <View style={styles.statsGrid}>
        <StatCard icon="flag-outline" label={'N\u00c0I NG\u1ef0A'} value={String(stats.jockeyCount)} />
        <StatCard icon="people-outline" label={'NG\u01af\u1edcI D\u00d9NG'} value={String(stats.userCount)} />
      </View>

      <HomeSectionHeader title={'Tin t\u1ee9c n\u1ed5i b\u1eadt'} />
      <View style={styles.newsRow}>
        {visibleNews.map((item) => (
          <NewsCard key={item.id} image={item.imageUrl || newsImage} tag={item.category} title={item.title} />
        ))}
        {!visibleNews.length ? <Text style={styles.emptyText}>{'Chưa có tin tức.'}</Text> : null}
      </View>
    </ScrollView>
  );
}

function TodoItem({ icon, title, count }) {
  return (
    <View style={styles.todoItem}>
      <View style={styles.todoIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.todoTitle}>{title}</Text>
      <Text style={styles.todoCount}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 22,
  },
  raceList: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 15,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  panel: {
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 13,
    backgroundColor: colors.darkSurface,
    paddingHorizontal: 13,
  },
  panelEmptyText: {
    paddingVertical: 16,
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  todoPanel: {
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 13,
    backgroundColor: colors.darkSurface,
    paddingHorizontal: 12,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
  },
  todoIcon: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.darkSurfaceSoft,
  },
  todoTitle: {
    flex: 1,
    marginLeft: 10,
    color: colors.darkText,
    fontSize: 12,
    fontWeight: '800',
  },
  todoCount: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  newsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  errorText: {
    marginBottom: 12,
    color: '#FDA4AF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
