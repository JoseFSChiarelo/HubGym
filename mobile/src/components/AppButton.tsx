import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '../theme';

type ButtonVariant = 'primary' | 'outline' | 'ghost';
type ButtonTone = 'orange' | 'yellow' | 'neutral';

type AppButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  tone?: ButtonTone;
  style?: ViewStyle;
};

const tones = {
  orange: {
    bg: theme.colors.accent,
    border: theme.colors.accent,
    text: '#0a0a0a'
  },
  yellow: {
    bg: theme.colors.accentAlt,
    border: theme.colors.accentAlt,
    text: '#0a0a0a'
  },
  neutral: {
    bg: theme.colors.surfaceAlt,
    border: theme.colors.border,
    text: theme.colors.text
  }
};

export const AppButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  tone = 'orange',
  style
}: AppButtonProps) => {
  const colors = tones[tone];
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary && { backgroundColor: colors.bg, borderColor: colors.border },
        isOutline && { backgroundColor: 'transparent', borderColor: colors.border },
        variant === 'ghost' && styles.ghost,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#0a0a0a' : colors.border} />
      ) : (
        <Text
          style={[
            styles.label,
            isPrimary && { color: colors.text },
            isOutline && { color: colors.border },
            variant === 'ghost' && { color: theme.colors.text }
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.border
  },
  label: {
    fontFamily: theme.fonts.semibold,
    fontSize: 16
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }]
  },
  disabled: {
    opacity: 0.5
  }
});
