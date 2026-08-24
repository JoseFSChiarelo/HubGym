import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { AthleteProfile, PersonalProfile } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { theme } from '../theme';

export const ProfileScreen = () => {
  const { token, user, signOut } = useAuth();
  const [profile, setProfile] = useState<AthleteProfile | PersonalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    if (!token || !user) return;
    setLoading(true);
    setError('');
    try {
      if (user.role === 'PERSONAL') {
        const data = await api.getPersonalMe(token);
        setProfile(data);
      } else if (user.role === 'ATHLETE') {
        const data = await api.getAthleteMe(token);
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel carregar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, user?.role]);

  const renderRow = (label: string, value?: string | null) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '-'}</Text>
    </View>
  );

  return (
    <Screen>
      <Card style={styles.card}>
        <Text style={styles.title}>Perfil</Text>
        {loading ? (
          <Text style={styles.meta}>Carregando dados...</Text>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            {renderRow('Nome', (profile as any)?.name || user?.name)}
            {renderRow('Email', (profile as any)?.user?.email || user?.email)}
            {user?.role === 'PERSONAL' ? (
              <>
                {renderRow('Telefone', (profile as PersonalProfile)?.phone || '')}
                {renderRow('CPF', (profile as PersonalProfile)?.cpf || '')}
                {renderRow('CREF', (profile as PersonalProfile)?.cref || '')}
              </>
            ) : (
              <>
                {renderRow('Telefone', (profile as AthleteProfile)?.phone || '')}
                {renderRow('Documento', (profile as AthleteProfile)?.document || '')}
                {renderRow('CEP', (profile as AthleteProfile)?.cep || '')}
                {renderRow('Pagamento', (profile as AthleteProfile)?.paymentMethod || '')}
              </>
            )}
          </>
        )}
      </Card>

      <View style={styles.actions}>
        <AppButton title="Sair" onPress={signOut} variant="ghost" />
      </View>
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
  meta: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim
  },
  error: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.danger
  },
  row: {
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  rowLabel: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  },
  rowValue: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim,
    marginTop: theme.spacing.xs
  },
  actions: {
    marginTop: theme.spacing.lg
  }
});
