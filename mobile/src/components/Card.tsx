import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../theme';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export const Card = ({ children, style }: CardProps) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6
  }
});
