import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { theme } from '../theme';

export const PersonalHomeScreen = () => {
  const { user } = useAuth();

  return (
    <Screen>
      <Card style={styles.card}>
        <Text style={styles.title}>Ola, {user?.name || 'personal'}</Text>
        <Text style={styles.text}>Este app esta com foco no aluno nesta primeira versao.</Text>
        <Text style={styles.text}>Para gerenciar alunos e treinos, use o painel web.</Text>
      </Card>
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
  }
});
