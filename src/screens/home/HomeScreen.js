import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import HeroCard from '../../components/home/HeroCard';
import HomeBottomTabs from '../../components/home/HomeBottomTabs';
import HomeSectionHeader from '../../components/home/HomeSectionHeader';
import NewsCard from '../../components/home/NewsCard';
import RaceCard from '../../components/home/RaceCard';
import RankingCard from '../../components/home/RankingCard';
import StatCard from '../../components/home/StatCard';
import { colors } from '../../constants/theme';

const raceImage =
  'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=700&q=80';
const newsImage =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.app}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>{'Grand\nChampionship'}</Text>
            </View>
            <View style={styles.headerActions}>
              <Ionicons name="notifications-outline" size={20} color={colors.darkTextMuted} />
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>AD</Text>
              </View>
            </View>
          </View>

          <HeroCard />

          <HomeSectionHeader title={'Gi\u1ea3i \u0111\u1ea5u s\u1eafp t\u1edbi'} action={'Xem t\u1ea5t c\u1ea3'} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.raceList}>
              <RaceCard
                date="15 Thg 10, 2024"
                image={raceImage}
                location={'S\u00e2n v\u1eadn \u0111\u1ed9ng Qu\u1ed1c gia'}
                name="Grand Prix Championship 2024"
                prize="$250,000"
                status={'S\u1eafp di\u1ec5n ra'}
              />
              <RaceCard
                date="22 Thg 10, 2024"
                image={raceImage}
                location={'H\u00e0 N\u1ed9i'}
                name="Autumn Derby Series"
                prize="$180,000"
                status={'M\u1edf \u0111\u0103ng k\u00fd'}
              />
            </View>
          </ScrollView>

          <HomeSectionHeader title={'B\u1ea3ng x\u1ebfp h\u1ea1ng'} />
          <View style={styles.panel}>
            <RankingCard name="Thunderbolt" rank={1} rate="94% Win Rate" subtitle={'Ch\u1ee7 s\u1edf h\u1eefu: L\u00ea V\u0103n A'} />
            <RankingCard name="Golden Stallion" rank={2} rate="88% Win Rate" subtitle={'Ch\u1ee7 s\u1edf h\u1eefu: Nguy\u1ec5n Kim'} />
            <RankingCard name="Midnight Blue" rank={3} rate="82% Win Rate" subtitle={'Ch\u1ee7 s\u1edf h\u1eefu: Tr\u1ea7n H\u00e0'} />
          </View>

          <HomeSectionHeader title={'Th\u1ed1ng k\u00ea h\u1ec7 th\u1ed1ng'} />
          <View style={styles.statsGrid}>
            <StatCard icon="trophy-outline" label={'GI\u1ea2I \u0110\u1ea4U'} value="156" />
            <StatCard icon="footsteps-outline" label={'NG\u1ef0A \u0110UA'} value="328" />
          </View>
          <View style={styles.statsGrid}>
            <StatCard icon="flag-outline" label={'N\u00c0I NG\u1ef0A'} value="145" />
            <StatCard icon="people-outline" label={'KH\u00c1N GI\u1ea2'} value="2,845" />
          </View>

          <HomeSectionHeader title={'Tin t\u1ee9c n\u1ed5i b\u1eadt'} />
          <View style={styles.newsRow}>
            <NewsCard image={newsImage} tag={'K\u1ef8 THU\u1eacT'} title={'B\u00ed quy\u1ebft hu\u1ea5n luy\u1ec7n ng\u1ef1a v\u00f4 \u0111\u1ecbch'} />
            <NewsCard image={raceImage} tag={'S\u1ef0 KI\u1ec6N'} title={'L\u1ecbch thi \u0111\u1ea5u th\u00e1ng n\u00e0y'} />
          </View>

          <View style={styles.cta}>
            <Text style={styles.ctaTitle}>{'S\u1eb5n s\u00e0ng tham gia\ncu\u1ed9c \u0111ua?'}</Text>
            <Text style={styles.ctaText}>
              {'Gia nh\u1eadp c\u1ed9ng \u0111\u1ed3ng \u0111ua ng\u1ef1a h\u00e0ng \u0111\u1ea7u\n\u0111\u1ec3 nh\u1eadn \u01b0u \u0111\u00e3i v\u00e0 tin t\u1ee9c m\u1edbi nh\u1ea5t.'}
            </Text>
            <View style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>{'\u0110\u0103ng k\u00fd ngay'}</Text>
            </View>
          </View>
        </ScrollView>
        <HomeBottomTabs />
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
  content: {
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brand: {
    color: colors.primary,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 23,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: '#1D1705',
    fontSize: 10,
    fontWeight: '900',
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
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  newsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cta: {
    alignItems: 'center',
    marginTop: 22,
    borderRadius: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  ctaTitle: {
    color: '#1D1705',
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 28,
    textAlign: 'center',
  },
  ctaText: {
    marginTop: 12,
    color: '#4A3908',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
  },
  ctaButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 36,
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: colors.darkBackground,
  },
  ctaButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
});
