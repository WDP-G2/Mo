import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

function formatDateTime(value) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function GuestHomeScreen({ onNavigateLogin, onNavigateRegister }) {
  const [tournaments, setTournaments] = useState([]);
  const [horses, setHorses] = useState([]);
  const [news, setNews] = useState([]);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

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
  const races = useMemo(
    () =>
      tournaments.flatMap((tournament) =>
        (tournament.races || []).map((race) => ({
          ...race,
          tournamentName: tournament.name,
          tournamentStatus: tournament.status,
          tournamentLocation: tournament.location,
        })),
      ),
    [tournaments],
  );
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
          <Pressable style={styles.statPressable} onPress={() => setDetail({ type: 'tournaments' })}>
            <StatCard icon="trophy-outline" label="GIẢI ĐẤU" value={String(stats.tournamentCount)} />
          </Pressable>
          <Pressable style={styles.statPressable} onPress={() => setDetail({ type: 'races' })}>
            <StatCard icon="flag-outline" label="CUỘC ĐUA" value={String(stats.raceCount)} />
          </Pressable>
        </View>
        <View style={styles.statsGrid}>
          <Pressable style={styles.statPressable} onPress={() => setDetail({ type: 'horses' })}>
            <StatCard icon="footsteps-outline" label="NGỰA ĐUA" value={String(stats.horseCount)} />
          </Pressable>
          <Pressable style={styles.statPressable} onPress={() => setDetail({ type: 'news' })}>
            <StatCard icon="newspaper-outline" label="TIN TỨC" value={String(stats.newsCount)} />
          </Pressable>
        </View>

        <HomeSectionHeader title="Giải đấu sắp tới" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.raceList}>
            {upcoming.map((item) => (
              <Pressable key={item.id} onPress={() => setDetail({ type: 'tournament', item })}>
                <RaceCard
                  date={item.dateLabel}
                  image={item.banner || raceImage}
                  location={item.location}
                  name={item.name}
                  prize={String(item.prize)}
                  status={item.status}
                />
              </Pressable>
            ))}
            {!upcoming.length ? <Text style={styles.emptyText}>Chưa có giải đấu.</Text> : null}
          </View>
        </ScrollView>

        <HomeSectionHeader title="Top ngựa nổi bật" />
        <View style={styles.panel}>
          {topHorses.map((horse, index) => (
            <Pressable key={horse.id} onPress={() => setDetail({ type: 'horse', item: horse, rank: index + 1 })}>
              <RankingCard
                name={horse.name}
                rank={index + 1}
                rate={`${horse.wins} thắng`}
                subtitle={`Chủ sở hữu: ${horse.ownerName || 'Chưa cập nhật'}`}
              />
            </Pressable>
          ))}
          {!topHorses.length ? <Text style={styles.panelEmptyText}>Chưa có dữ liệu ngựa.</Text> : null}
        </View>

        <HomeSectionHeader title="Tin tức nổi bật" />
        <View style={styles.newsRow}>
          {visibleNews.map((item) => (
            <Pressable key={item.id} style={styles.newsPressable} onPress={() => setDetail({ type: 'article', item })}>
              <NewsCard image={item.imageUrl || newsImage} tag={item.category} title={item.title} />
            </Pressable>
          ))}
          {!visibleNews.length ? <Text style={styles.emptyText}>Chưa có tin tức.</Text> : null}
        </View>
      </ScrollView>

      <GuestDetailModal
        detail={detail}
        horses={horses}
        news={news}
        races={races}
        tournaments={tournaments}
        onClose={() => setDetail(null)}
        onOpenDetail={setDetail}
      />
    </SafeAreaView>
  );
}

function GuestDetailModal({ detail, horses, news, races, tournaments, onClose, onOpenDetail }) {
  if (!detail) return null;

  const topHorses = [...horses].sort((a, b) => b.wins - a.wins);
  const titleMap = {
    tournaments: 'Danh sách giải đấu',
    races: 'Danh sách cuộc đua',
    horses: 'Danh sách ngựa đua',
    news: 'Danh sách tin tức',
    tournament: detail.item?.name || 'Chi tiết giải đấu',
    horse: detail.item?.name || 'Chi tiết ngựa',
    article: detail.item?.title || 'Chi tiết tin tức',
  };

  return (
    <Modal visible={Boolean(detail)} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.detailBackdrop}>
        <View style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleBlock}>
              <Text style={styles.detailEyebrow}>Chi tiết</Text>
              <Text style={styles.detailTitle}>{titleMap[detail.type] || 'Thông tin'}</Text>
            </View>
            <Pressable style={styles.detailClose} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.darkText} />
            </Pressable>
          </View>

          <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent}>
            {detail.type === 'tournaments' ? (
              tournaments.map((item) => (
                <Pressable key={item.id} style={styles.detailListItem} onPress={() => onOpenDetail({ type: 'tournament', item })}>
                  <Ionicons name="trophy-outline" size={20} color={colors.primary} />
                  <View style={styles.detailListCopy}>
                    <Text style={styles.detailItemTitle}>{item.name}</Text>
                    <Text style={styles.detailItemMeta}>{item.status} · {item.raceCount || item.races?.length || 0} cuộc đua</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.darkTextMuted} />
                </Pressable>
              ))
            ) : null}

            {detail.type === 'races' ? (
              races.map((item) => (
                <View key={item.id} style={styles.detailListItem}>
                  <Ionicons name="flag-outline" size={20} color={colors.primary} />
                  <View style={styles.detailListCopy}>
                    <Text style={styles.detailItemTitle}>Race R{item.raceNumber || '-'} · {item.name}</Text>
                    <Text style={styles.detailItemMeta}>{item.tournamentName} · {item.status}</Text>
                    <Text style={styles.detailItemMeta}>{formatDateTime(item.scheduledStartAt)}</Text>
                  </View>
                </View>
              ))
            ) : null}

            {detail.type === 'horses' ? (
              topHorses.map((item, index) => (
                <Pressable key={item.id} style={styles.detailListItem} onPress={() => onOpenDetail({ type: 'horse', item, rank: index + 1 })}>
                  <Ionicons name="footsteps-outline" size={20} color={colors.primary} />
                  <View style={styles.detailListCopy}>
                    <Text style={styles.detailItemTitle}>#{index + 1} {item.name}</Text>
                    <Text style={styles.detailItemMeta}>{item.ownerName || 'Chưa cập nhật chủ'} · {item.wins} thắng</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.darkTextMuted} />
                </Pressable>
              ))
            ) : null}

            {detail.type === 'news' ? (
              news.map((item) => (
                <Pressable key={item.id} style={styles.detailListItem} onPress={() => onOpenDetail({ type: 'article', item })}>
                  <Ionicons name="newspaper-outline" size={20} color={colors.primary} />
                  <View style={styles.detailListCopy}>
                    <Text style={styles.detailItemTitle}>{item.title}</Text>
                    <Text style={styles.detailItemMeta}>{item.category} · {item.author}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.darkTextMuted} />
                </Pressable>
              ))
            ) : null}

            {detail.type === 'tournament' ? <TournamentDetail item={detail.item} /> : null}
            {detail.type === 'horse' ? <HorseDetail item={detail.item} rank={detail.rank} /> : null}
            {detail.type === 'article' ? <ArticleDetail item={detail.item} /> : null}

            {['tournaments', 'races', 'horses', 'news'].includes(detail.type) && !(
              detail.type === 'tournaments' ? tournaments.length :
                detail.type === 'races' ? races.length :
                  detail.type === 'horses' ? horses.length :
                    news.length
            ) ? <Text style={styles.detailEmpty}>Chưa có dữ liệu.</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={17} color={colors.primary} />
      <View style={styles.detailRowCopy}>
        <Text style={styles.detailRowLabel}>{label}</Text>
        <Text style={styles.detailRowValue}>{value || 'Chưa cập nhật'}</Text>
      </View>
    </View>
  );
}

function TournamentDetail({ item }) {
  return (
    <View>
      <Image source={{ uri: item.banner || raceImage }} style={styles.detailImage} />
      <DetailRow icon="calendar-outline" label="Ngày bắt đầu" value={item.dateLabel} />
      <DetailRow icon="location-outline" label="Địa điểm" value={item.location} />
      <DetailRow icon="medal-outline" label="Giải thưởng" value={String(item.prize || 'Chưa cập nhật')} />
      <DetailRow icon="flag-outline" label="Số cuộc đua" value={`${item.raceCount || item.races?.length || 0}`} />
      <Text style={styles.detailSectionTitle}>Các cuộc đua</Text>
      {(item.races || []).map((race) => (
        <View key={race.id} style={styles.compactRaceRow}>
          <Text style={styles.compactRaceName}>Race R{race.raceNumber || '-'} · {race.name}</Text>
          <Text style={styles.compactRaceMeta}>{race.status} · {formatDateTime(race.scheduledStartAt)}</Text>
        </View>
      ))}
      {!item.races?.length ? <Text style={styles.detailEmpty}>Giải này chưa có cuộc đua.</Text> : null}
    </View>
  );
}

function HorseDetail({ item, rank }) {
  return (
    <View>
      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.detailImage} /> : null}
      <DetailRow icon="podium-outline" label="Xếp hạng" value={rank ? `#${rank}` : 'Chưa xếp hạng'} />
      <DetailRow icon="person-outline" label="Chủ sở hữu" value={item.ownerName} />
      <DetailRow icon="ribbon-outline" label="Thành tích" value={`${item.wins || 0} thắng · ${item.races || 0} cuộc đua`} />
      <DetailRow icon="information-circle-outline" label="Giống / tuổi" value={`${item.breed || 'Chưa cập nhật'} · ${item.age || 0} tuổi`} />
      <DetailRow icon="color-palette-outline" label="Màu lông" value={item.color} />
      <DetailRow icon="resize-outline" label="Thông số" value={`${item.height || 0} cm · ${item.weight || 0} kg`} />
      <DetailRow icon="shield-checkmark-outline" label="Trạng thái" value={item.approvalLabel || item.healthStatus} />
    </View>
  );
}

function ArticleDetail({ item }) {
  return (
    <View>
      <Image source={{ uri: item.imageUrl || newsImage }} style={styles.detailImage} />
      <DetailRow icon="pricetag-outline" label="Chuyên mục" value={item.category} />
      <DetailRow icon="person-outline" label="Tác giả" value={item.author} />
      <DetailRow icon="time-outline" label="Ngày đăng" value={formatDateTime(item.publishedAt)} />
      <Text style={styles.articleBody}>{item.content || item.summary || 'Chưa có nội dung chi tiết.'}</Text>
    </View>
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
  statPressable: {
    flex: 1,
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
  newsPressable: {
    flex: 1,
  },
  emptyText: {
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 16,
  },
  detailBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    padding: 18,
  },
  detailModal: {
    maxHeight: '82%',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 18,
    backgroundColor: colors.darkSurface,
    padding: 18,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailTitleBlock: {
    flex: 1,
  },
  detailEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailTitle: {
    marginTop: 3,
    color: colors.darkText,
    fontSize: 19,
    fontWeight: '900',
  },
  detailClose: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 13,
    backgroundColor: colors.darkSurfaceSoft,
  },
  detailScroll: {
    marginTop: 14,
  },
  detailContent: {
    paddingBottom: 6,
  },
  detailListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
    paddingVertical: 11,
  },
  detailListCopy: {
    flex: 1,
  },
  detailItemTitle: {
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  detailItemMeta: {
    marginTop: 4,
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  detailEmpty: {
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '800',
    paddingVertical: 18,
    textAlign: 'center',
  },
  detailImage: {
    width: '100%',
    height: 150,
    borderRadius: 14,
    backgroundColor: colors.darkSurfaceSoft,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
    paddingVertical: 10,
  },
  detailRowCopy: {
    flex: 1,
  },
  detailRowLabel: {
    color: colors.darkTextMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailRowValue: {
    marginTop: 3,
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  detailSectionTitle: {
    marginTop: 16,
    marginBottom: 6,
    color: colors.darkText,
    fontSize: 15,
    fontWeight: '900',
  },
  compactRaceRow: {
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 12,
    backgroundColor: colors.darkSurfaceSoft,
    padding: 12,
    marginTop: 8,
  },
  compactRaceName: {
    color: colors.darkText,
    fontSize: 12,
    fontWeight: '900',
  },
  compactRaceMeta: {
    marginTop: 4,
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  articleBody: {
    marginTop: 14,
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
});
