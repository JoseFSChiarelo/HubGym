import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { theme } from '../theme';

export const AdminNoticeScreen = () => {
  const { signOut } = useAuth();

  return (
    <Screen>
      <Card style={styles.card}>
        <Text style={styles.title}>Acesso admin</Text>
        <Text style={styles.text}>O painel admin ainda esta disponivel apenas no web.</Text>
        <Text style={styles.text}>Use o admin-frontend para continuar.</Text>
      </Card>
      <AppButton title="Sair" onPress={signOut} variant="ghost" style={styles.button} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: theme.spacing.lg
  },
  title: {
    fontFamily: theme.fonts.semibold,
    fontSize: 20,
    color: theme.colors.text,
    marginBottom: theme.spacing.md
  },
  text: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim,
    marginBottom: theme.spacing.sm
  },
  button: {
    marginTop: theme.spacing.lg
  }
});
