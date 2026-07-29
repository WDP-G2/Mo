import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../../../constants/theme';

export function ProfileField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  multiline = false,
}) {
  return (
    <View style={styles.profileField}>
      <Text style={styles.profileLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor={colors.darkTextMuted}
        style={[styles.profileInput, multiline && styles.profileInputMultiline]}
        value={value}
      />
    </View>
  );
}

export function Metric({ item, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.metric,
        onPress && pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Ionicons name={item.icon} size={22} color={colors.primary} />
      <Text style={styles.metricValue}>{item.value}</Text>
      <Text style={styles.metricLabel}>{item.label}</Text>
    </Pressable>
  );
}

export function SearchBox({ query, onChangeQuery }) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search-outline" size={18} color={colors.darkTextMuted} />
      <TextInput
        onChangeText={onChangeQuery}
        placeholder="Tìm giải, race, ngựa, tin tức..."
        placeholderTextColor={colors.darkTextMuted}
        style={styles.searchInput}
        value={query}
      />
      {query ? (
        <Pressable hitSlop={10} onPress={() => onChangeQuery('')}>
          <Ionicons name="close-circle" size={18} color={colors.darkTextMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.panel}>{children}</View>
    </View>
  );
}

export function ListItem({ icon, title, meta, badge }) {
  return (
    <View style={styles.listItem}>
      <View style={styles.itemIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.itemMain}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.itemMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function EmptyText({ text }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 46,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 14,
    backgroundColor: colors.darkSurface,
    paddingHorizontal: 13,
  },
  searchInput: {
    flex: 1,
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '700',
  },
  metric: {
    width: '48%',
    minHeight: 118,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 16,
    backgroundColor: colors.darkSurface,
    padding: 14,
  },
  metricValue: {
    marginTop: 16,
    color: colors.darkText,
    fontSize: 24,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: 5,
    color: colors.darkTextMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  section: {
    marginTop: 18,
  },
  sectionHeader: {
    marginBottom: 10,
    color: colors.darkText,
    fontSize: 16,
    fontWeight: '900',
  },
  panel: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 16,
    backgroundColor: colors.darkSurface,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 70,
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
  },
  itemIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.darkSurfaceSoft,
  },
  itemMain: {
    flex: 1,
  },
  itemTitle: {
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  itemMeta: {
    marginTop: 4,
    color: colors.darkTextMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  badge: {
    maxWidth: 98,
    borderRadius: 12,
    backgroundColor: '#3A2F1B',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  emptyText: {
    padding: 16,
    color: colors.darkTextMuted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  profileField: {
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A40',
  },
  profileLabel: {
    color: colors.darkTextMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  profileInput: {
    minHeight: 42,
    marginTop: 7,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: 12,
    backgroundColor: colors.darkSurfaceSoft,
    color: colors.darkText,
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 12,
  },
  profileInputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
