import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii } from '../../constants/theme';

export default function PrimaryButton({
  title,
  onPress,
  textColor = colors.white,
  disabled = false,
  loading = false,
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      style={[styles.button, (disabled || loading) && styles.disabledButton]}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 17,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    shadowColor: '#DCA105',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
