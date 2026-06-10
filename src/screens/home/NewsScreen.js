import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import AdminHeader from '../../components/home/AdminHeader';
import AdminPageTitle from '../../components/home/AdminPageTitle';
import SearchBar from '../../components/home/SearchBar';
import { colors } from '../../constants/theme';
import { newsService } from '../../services/newsService';

function formatDate(value) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleDateString('vi-VN');
}

function toStatusLabel(status) {
  return status === 'draft' ? 'Bản nháp' : 'Đã xuất bản';
}

export default function NewsScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const publishedCount = useMemo(
    () => posts.filter((post) => post.status !== 'draft').length,
    [posts],
  );

  useEffect(() => {
    let alive = true;

    newsService
      .list({ admin: true })
      .then((items) => {
        if (alive) setPosts(items);
      })
      .catch((requestError) => {
        if (alive) setError(requestError.message || 'Không tải được tin tức.');
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
      <AdminHeader subtitle="News Management" />
      <AdminPageTitle
        highlight={'Qu\u1ea3n l\u00fd'}
        subtitle={'T\u1ea1o v\u00e0 qu\u1ea3n l\u00fd b\u00e0i vi\u1ebft tin t\u1ee9c'}
        title={'Tin t\u1ee9c'}
      />

      <View style={styles.createButton}>
        <Ionicons name="add" size={19} color="#1D1705" />
        <Text style={styles.createText}>{'T\u1ea1o b\u00e0i vi\u1ebft m\u1edbi'}</Text>
      </View>

      <View style={styles.filterCard}>
        <SearchBar placeholder={'T\u00ecm ki\u1ebfm b\u00e0i vi\u1ebft...'} />
        <View style={styles.statusFilter}>
          <Text style={styles.statusFilterText}>{'T\u1ea5t c\u1ea3 tr\u1ea1ng th\u00e1i'}</Text>
          <Ionicons name="chevron-down" size={17} color={colors.darkText} />
        </View>
      </View>

      <Text style={styles.summaryText}>
        {publishedCount}/{posts.length} bài viết đang xuất bản
      </Text>

      <View style={styles.table}>
        {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
        {!loading && error ? <Text style={styles.emptyText}>{error}</Text> : null}
        {!loading && !error && posts.length === 0 ? (
          <Text style={styles.emptyText}>{'Chưa có bài viết.'}</Text>
        ) : null}
        {posts.map((post) => (
          <View key={post.id} style={styles.postRow}>
            <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
            <View style={styles.postMain}>
              <Text style={styles.postTitle}>{post.title}</Text>
              {post.featured ? (
                <View style={styles.featuredPill}>
                  <Text style={styles.featuredText}>{'N\u1ed5i b\u1eadt'}</Text>
                </View>
              ) : null}
              <Text style={styles.postDate}>{formatDate(post.publishedAt)}</Text>
            </View>
            <View style={styles.side}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>{post.category}</Text>
              </View>
              <View style={[styles.publishPill, post.status === 'draft' && styles.draftPill]}>
                <Text style={[styles.publishText, post.status === 'draft' && styles.draftText]}>
                  {toStatusLabel(post.status)}
                </Text>
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
  createButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  createText: {
    color: '#1D1705',
    fontSize: 13,
    fontWeight: '900',
  },
  filterCard: {
    gap: 12,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 16,
    backgroundColor: colors.darkSurface,
    padding: 14,
  },
  statusFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 13,
    backgroundColor: colors.darkSurfaceSoft,
    paddingHorizontal: 13,
    paddingVertical: 13,
  },
  statusFilterText: {
    color: colors.darkText,
    fontSize: 12,
    fontWeight: '800',
  },
  table: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 16,
    backgroundColor: colors.darkSurface,
    overflow: 'hidden',
  },
  summaryText: {
    marginTop: 14,
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  loader: {
    paddingVertical: 24,
  },
  emptyText: {
    padding: 16,
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  postRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
  },
  postImage: {
    width: 66,
    height: 66,
    borderRadius: 10,
    backgroundColor: colors.darkSurfaceSoft,
  },
  postMain: {
    flex: 1,
  },
  postTitle: {
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  featuredPill: {
    alignSelf: 'flex-start',
    marginTop: 7,
    borderRadius: 8,
    backgroundColor: '#5A2B2F',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featuredText: {
    color: '#FECACA',
    fontSize: 10,
    fontWeight: '900',
  },
  postDate: {
    marginTop: 7,
    color: colors.darkTextMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  side: {
    width: 82,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  categoryPill: {
    borderRadius: 10,
    backgroundColor: '#303226',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  categoryText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  publishPill: {
    borderRadius: 10,
    backgroundColor: '#D7FBE3',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  publishText: {
    color: '#08773B',
    fontSize: 9,
    fontWeight: '900',
  },
  draftPill: {
    backgroundColor: '#334155',
  },
  draftText: {
    color: colors.darkText,
  },
});
