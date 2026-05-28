import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/theme';

const tabs = [
  { icon: 'home', label: 'Trang ch\u1ee7', active: true },
  { icon: 'trophy-outline', label: 'Gi\u1ea3i \u0111\u1ea5u' },
  { icon: 'calendar-outline', label: 'Tin t\u1ee9c' },
  { icon: 'person-circle-outline', label: 'T\u00e0i kho\u1ea3n' },
];

export default function HomeBottomTabs() {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <View key={tab.label} style={styles.tab}>
          <Ionicons
            name={tab.icon}
            size={18}
            color={tab.active ? colors.primary : colors.darkTextMuted}
          />
          <Text style={[styles.label, tab.active && styles.activeLabel]}>{tab.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.darkBorder,
    backgroundColor: colors.darkSurface,
    paddingTop: 9,
    paddingBottom: 12,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 62,
  },
  label: {
    marginTop: 4,
    color: colors.darkTextMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  activeLabel: {
    color: colors.primary,
  },
});
