import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const raceImage =
  'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=700&q=80';
const newsImage =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80';

export default function GuestHomeScreen({ onNavigateLogin, onNavigateRegister }) {
  const [tournaments, setTournaments] = useState([]);
  const [horses, setHorses] = useState([]);
  const [news, setNews] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    Promise.all([
      tournamentService.list(),
      horseService.list(),
      newsService.list(),
    ])
      .then(([nextTournaments, nextHorses, nextNews]) => {
        if (!alive) return;
        setTournaments(nextTournaments);
        setHorses(nextHorses);
        setNews(nextNews);
      })
      .catch((requestError) => {
        if (alive) setError(requestError.message || 'Không tải được dữ liệu trang chủ.');
      });

    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const raceCount = tournaments.reduce((total, item) => total + Number(item.raceCount || 0), 0);
    return {
      tournamentCount: tournaments.length,
      raceCount,
      horseCount: horses.length,
      newsCount: news.length,
    };
  }, [horses, news, tournaments]);

  const upcoming = tournaments.slice(0, 3);
  const featuredNews = news.filter((item) => item.featured).slice(0, 2);
  const visibleNews = featuredNews.length ? featuredNews : news.slice(0, 2);
  const topHorses = [...horses].sort((a, b) => b.wins - a.wins).slice(0, 3);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Horse Racing</Text>
            <Text style={styles.title}>Trang chủ</Text>
          </View>
          <Pressable style={styles.loginButton} onPress={onNavigateLogin}>
            <Ionicons name="log-in-outline" size={17} color="#1D1705" />
            <Text style={styles.loginText}>Đăng nhập</Text>
          </Pressable>
        </View>

        <HeroCard />

        <View style={styles.actionRow}>
          <Pressable style={styles.primaryButton} onPress={onNavigateLogin}>
            <Text style={styles.primaryButtonText}>Đăng nhập</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onNavigateRegister}>
            <Text style={styles.secondaryButtonText}>Đăng ký</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.statsGrid}>
          <StatCard icon="trophy-outline" label="GIẢI ĐẤU" value={String(stats.tournamentCount)} />
          <StatCard icon="flag-outline" label="CUỘC ĐUA" value={String(stats.raceCount)} />
        </View>
        <View style={styles.statsGrid}>
          <StatCard icon="footsteps-outline" label="NGỰA ĐUA" value={String(stats.horseCount)} />
          <StatCard icon="newspaper-outline" label="TIN TỨC" value={String(stats.newsCount)} />
        </View>

        <HomeSectionHeader title="Giải đấu sắp tới" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.raceList}>
            {upcoming.map((item) => (
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
            {!upcoming.length ? <Text style={styles.emptyText}>Chưa có giải đấu.</Text> : null}
          </View>
        </ScrollView>

        <HomeSectionHeader title="Top ngựa nổi bật" />
        <View style={styles.panel}>
          {topHorses.map((horse, index) => (
            <RankingCard
              key={horse.id}
              name={horse.name}
              rank={index + 1}
              rate={`${horse.wins} thắng`}
              subtitle={`Chủ sở hữu: ${horse.ownerName || 'Chưa cập nhật'}`}
            />
          ))}
          {!topHorses.length ? <Text style={styles.panelEmptyText}>Chưa có dữ liệu ngựa.</Text> : null}
        </View>

        <HomeSectionHeader title="Tin tức nổi bật" />
        <View style={styles.newsRow}>
          {visibleNews.map((item) => (
            <NewsCard key={item.id} image={item.imageUrl || newsImage} tag={item.category} title={item.title} />
          ))}
          {!visibleNews.length ? <Text style={styles.emptyText}>Chưa có tin tức.</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  content: {
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 26,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
    fontSize: 23,
    fontWeight: '900',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 13,
    backgroundColor: colors.primary,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  loginText: {
    color: '#1D1705',
    fontSize: 12,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#1D1705',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 14,
    backgroundColor: colors.darkSurface,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
  },
  errorText: {
    marginBottom: 12,
    color: '#FDA4AF',
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  raceList: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 15,
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
  newsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyText: {
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 16,
  },
});
