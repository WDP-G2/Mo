import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import AdminHeader from '../../components/home/AdminHeader';
import AdminPageTitle from '../../components/home/AdminPageTitle';
import { colors } from '../../constants/theme';
import { newsService } from '../../services/newsService';
import { tournamentService } from '../../services/tournamentService';

export default function NotificationsScreen() {
  const [tournaments, setTournaments] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    Promise.all([tournamentService.list(), newsService.list()])
      .then(([nextTournaments, nextNews]) => {
        if (!alive) return;
        setTournaments(nextTournaments);
        setNews(nextNews);
      })
      .catch((requestError) => {
        if (alive) setError(requestError.message || 'Không tải được dữ liệu thông báo.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const suggestions = useMemo(() => {
    const tournamentItems = tournaments.slice(0, 3).map((item) => ({
      id: `tournament-${item.id}`,
      title: item.name,
      channel: 'Push + Email',
      meta: item.status,
      count: item.registrationCount,
    }));
    const newsItems = news.slice(0, 2).map((item) => ({
      id: `news-${item.id}`,
      title: item.title,
      channel: 'Push',
      meta: item.category,
      count: item.featured ? 1 : 0,
    }));

    return [...tournamentItems, ...newsItems];
  }, [news, tournaments]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AdminHeader subtitle="Notifications" />
      <AdminPageTitle
        highlight={'Th\u00f4ng b\u00e1o'}
        subtitle={'So\u1ea1n v\u00e0 g\u1eedi Email, Push, SMS cho t\u1eebng nh\u00f3m ng\u01b0\u1eddi d\u00f9ng'}
        title={'Qu\u1ea3n l\u00fd'}
      />

      <View style={styles.composeCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerIcon}>
            <Ionicons name="paper-plane-outline" size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.cardTitle}>{'So\u1ea1n th\u00f4ng b\u00e1o'}</Text>
            <Text style={styles.cardSub}>{'H\u1ed7 tr\u1ee3 Email / Push / SMS'}</Text>
          </View>
        </View>

        <Field label={'TI\u00caU \u0110\u1ec0'} value={'VD: L\u1ecbch \u0111ua cu\u1ed9c \u0111ua R4...'} />
        <Field label={'\u0110\u1ed0I T\u01af\u1ee2NG'} value={'T\u1ea5t c\u1ea3 ng\u01b0\u1eddi d\u00f9ng'} />
        <View style={styles.channelRow}>
          <Channel icon="mail-outline" label="Email" />
          <Channel icon="phone-portrait-outline" label="Push" />
          <Channel icon="chatbox-outline" label="SMS" />
        </View>
        <View style={styles.messageBox}>
          <Text style={styles.messagePlaceholder}>{'N\u1ed9i dung th\u00f4ng b\u00e1o...'}</Text>
        </View>
        <View style={styles.actionRow}>
          <View style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>{'L\u01b0u nh\u00e1p'}</Text>
          </View>
          <View style={styles.primaryButton}>
            <Ionicons name="paper-plane-outline" size={17} color="#1D1705" />
            <Text style={styles.primaryText}>{'G\u1eedi th\u00f4ng b\u00e1o'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>{'Gợi ý từ dữ liệu hệ thống'}</Text>
        {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
        {!loading && error ? <Text style={styles.emptyText}>{error}</Text> : null}
        {!loading && !error && suggestions.length === 0 ? (
          <Text style={styles.emptyText}>
            {'BE chưa có lịch sử gửi thông báo. Gợi ý sẽ xuất hiện khi có giải đấu hoặc tin tức.'}
          </Text>
        ) : null}
        {suggestions.map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <View style={styles.historyInfo}>
              <Text style={styles.historyName}>{item.title}</Text>
              <Text style={styles.historyMeta}>{item.channel} {'\u00b7'} {item.meta}</Text>
            </View>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{item.count}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Field({ label, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputBox}>
        <Text style={styles.inputText}>{value}</Text>
      </View>
    </View>
  );
}

function Channel({ icon, label }) {
  return (
    <View style={styles.channel}>
      <Ionicons name={icon} size={17} color={colors.primary} />
      <Text style={styles.channelText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 22,
  },
  composeCard: {
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 16,
    backgroundColor: colors.darkSurface,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: '#333322',
  },
  cardTitle: {
    color: colors.darkText,
    fontSize: 19,
    fontWeight: '900',
  },
  cardSub: {
    marginTop: 4,
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  field: {
    marginTop: 13,
  },
  fieldLabel: {
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '900',
  },
  inputBox: {
    minHeight: 46,
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 12,
    backgroundColor: colors.darkSurfaceSoft,
    paddingHorizontal: 12,
  },
  inputText: {
    color: colors.darkText,
    fontSize: 12,
    fontWeight: '700',
  },
  channelRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  channel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 12,
    backgroundColor: colors.darkSurfaceSoft,
    paddingVertical: 11,
  },
  channelText: {
    color: colors.darkText,
    fontSize: 11,
    fontWeight: '900',
  },
  messageBox: {
    height: 140,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 14,
    backgroundColor: colors.darkSurfaceSoft,
    padding: 13,
  },
  messagePlaceholder: {
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 13,
    paddingVertical: 13,
  },
  secondaryText: {
    color: colors.darkText,
    fontSize: 12,
    fontWeight: '900',
  },
  primaryButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 13,
    backgroundColor: colors.primary,
    paddingVertical: 13,
  },
  primaryText: {
    color: '#1D1705',
    fontSize: 12,
    fontWeight: '900',
  },
  historyCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 16,
    backgroundColor: colors.darkSurface,
    padding: 16,
  },
  historyTitle: {
    color: colors.darkText,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  loader: {
    paddingVertical: 18,
  },
  emptyText: {
    paddingVertical: 12,
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    borderTopWidth: 1,
    borderTopColor: '#1D2A40',
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  historyMeta: {
    marginTop: 5,
    color: colors.darkTextMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  countPill: {
    borderRadius: 16,
    backgroundColor: '#083C33',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countText: {
    color: '#55F0BE',
    fontSize: 11,
    fontWeight: '900',
  },
});
