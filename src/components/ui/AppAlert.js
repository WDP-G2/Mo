import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/theme';

const AppAlertContext = createContext(() => {});

function alertTone(title) {
  const normalizedTitle = String(title || '').toLowerCase();
  if (
    normalizedTitle.includes('thành công') ||
    normalizedTitle.includes('success')
  ) {
    return {
      icon: 'checkmark-circle',
      accent: '#2DD4BF',
      surface: 'rgba(45, 212, 191, 0.14)',
      label: 'Hoàn tất',
    };
  }

  if (
    normalizedTitle.includes('lỗi') ||
    normalizedTitle.includes('thất bại') ||
    normalizedTitle.includes('error')
  ) {
    return {
      icon: 'alert-circle',
      accent: '#FB7185',
      surface: 'rgba(251, 113, 133, 0.14)',
      label: 'Cần kiểm tra',
    };
  }

  return {
    icon: 'information-circle',
    accent: colors.primary,
    surface: 'rgba(245, 183, 23, 0.16)',
    label: 'Thông báo',
  };
}

export function AppAlertProvider({ children }) {
  const [alert, setAlert] = useState(null);

  const hideAlert = useCallback((action) => {
    const nextAction = action?.onPress;
    setAlert(null);
    if (typeof nextAction === 'function') nextAction();
  }, []);

  const showAlert = useCallback((title, message, actions = []) => {
    setAlert({
      title: title || 'Thông báo',
      message: message || '',
      actions: Array.isArray(actions) ? actions : [],
    });
  }, []);

  const tone = useMemo(() => alertTone(alert?.title), [alert?.title]);

  return (
    <AppAlertContext.Provider value={showAlert}>
      {children}

      <Modal visible={Boolean(alert)} transparent={true} animationType="fade" onRequestClose={() => hideAlert()}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.topRow}>
              <View style={[styles.iconWrap, { backgroundColor: tone.surface, borderColor: tone.accent }]}>
                <Ionicons name={tone.icon} size={27} color={tone.accent} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.eyebrow, { color: tone.accent }]}>{tone.label}</Text>
                <Text style={styles.title}>{alert?.title}</Text>
              </View>
            </View>

            {alert?.message ? <Text style={styles.message}>{alert.message}</Text> : null}

            <View style={styles.buttonRow}>
              {(alert?.actions?.length ? alert.actions : [{ text: 'Đã hiểu' }]).map((action, index, actions) => {
                const secondary = actions.length > 1 && index === 0;
                const destructive = action.style === 'destructive';
                return (
                  <Pressable
                    key={`${action.text || 'action'}-${index}`}
                    style={[
                      styles.button,
                      secondary && styles.secondaryButton,
                      destructive && styles.destructiveButton,
                    ]}
                    onPress={() => hideAlert(action)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        secondary && styles.secondaryButtonText,
                        destructive && styles.destructiveButtonText,
                      ]}
                    >
                      {action.text || 'Đã hiểu'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  return useContext(AppAlertContext);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(2, 8, 20, 0.68)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.24)',
    borderRadius: 22,
    padding: 20,
    backgroundColor: colors.darkSurface,
    shadowColor: '#020817',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  iconWrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 18,
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 4,
    color: colors.darkText,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 0,
  },
  message: {
    marginTop: 16,
    color: colors.darkTextMuted,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
  },
  button: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.darkBorder,
    backgroundColor: colors.darkSurfaceSoft,
  },
  destructiveButton: {
    backgroundColor: '#FB7185',
  },
  buttonText: {
    color: '#1B1400',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  secondaryButtonText: {
    color: colors.darkText,
  },
  destructiveButtonText: {
    color: '#2A060D',
  },
});
