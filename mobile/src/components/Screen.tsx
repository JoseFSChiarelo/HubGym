import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

type ScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

export const Screen = ({ children, style, contentStyle }: ScreenProps) => {
  return (
    <LinearGradient colors={[theme.colors.bg, theme.colors.bgAlt]} style={[styles.container, style]}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  safe: {
    flex: 1
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg
  }
});
