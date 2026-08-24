import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { api, ApiError } from '../api/client';
import { Training } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import {
  CustomTraining,
  loadCustomTrainings,
  MAX_CUSTOM_TRAININGS,
  saveCustomTrainings
} from '../storage/athleteCustomTrainings';
import { theme } from '../theme';

export const TrainingsScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<any>();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [customTrainings, setCustomTrainings] = useState<CustomTraining[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [trainerTrainingBlocked, setTrainerTrainingBlocked] = useState(false);
  const [trainerTrainingBlockMessage, setTrainerTrainingBlockMessage] = useState('');

  const loadData = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      setTrainerTrainingBlocked(false);
      setTrainerTrainingBlockMessage('');
      try {
        const data = await api.getAthleteTrainings(token);
        setTrainings(data || []);
      } catch (err: any) {
        const apiError = err as ApiError;
        if (apiError?.code === 'TRAINING_BLOCKED') {
          setTrainings([]);
          setTrainerTrainingBlocked(true);
          setTrainerTrainingBlockMessage(apiError.message || 'Treinos do personal bloqueados. Pagamento pendente.');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user?.id) return;
    const run = async () => {
      const list = await loadCustomTrainings(user.id);
      setCustomTrainings(list);
    };
    run();
  }, [user?.id]);

  const orderedTrainings = useMemo(
    () => [...trainings].sort((a, b) => new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime()),
    [trainings]
  );

  const orderedCustomTrainings = useMemo(
    () => [...customTrainings].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [customTrainings]
  );

  const remainingSlots = Math.max(0, MAX_CUSTOM_TRAININGS - customTrainings.length);
  const canCreateCustom = remainingSlots > 0;

  const openEditor = (trainingId?: string) => {
    navigation.navigate('TrainingEditor', { trainingId });
  };

  const openTraining = (id: string, mode?: 'inspect') => {
    navigation.navigate('TrainingSession', { id, mode, autoStart: mode !== 'inspect' });
  };

  const deleteCustomTraining = async (id: string) => {
    if (!user?.id) return;
    const next = customTrainings.filter((t) => t.id !== id);
    await saveCustomTrainings(user.id, next);
    setCustomTrainings(next);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    if (user?.id) {
      const list = await loadCustomTrainings(user.id);
      setCustomTrainings(list);
    }
    setRefreshing(false);
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Treinos</Text>
            <Text style={styles.subtitle}>Treinos do personal e treinos criados por voce.</Text>
          </View>
          <View style={styles.headerActions}>
            <AppButton
              title="Criar treino"
              onPress={() => openEditor()}
              disabled={!canCreateCustom}
            />
          </View>
        </View>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Meus treinos</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{remainingSlots} de {MAX_CUSTOM_TRAININGS} disponiveis</Text>
            </View>
          </View>
          <Text style={styles.sectionHelper}>Voce pode criar ate dois treinos adicionais.</Text>

          {orderedCustomTrainings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Voce ainda nao criou treinos personalizados.</Text>
            </View>
          ) : (
            orderedCustomTrainings.map((training) => (
              <View key={training.id} style={styles.trainingCard}>
                <View style={styles.trainingInfo}>
                  <Text style={styles.trainingTitle}>{training.title || 'Treino'}</Text>
                  <Text style={styles.trainingMeta}>Treino criado por voce</Text>
                  {training.notes ? <Text style={styles.trainingNotes}>{training.notes}</Text> : null}
                </View>
                <View style={styles.trainingActions}>
                  <AppButton title="Iniciar" onPress={() => openTraining(training.id)} />
                  <AppButton title="Inspecionar" onPress={() => openTraining(training.id, 'inspect')} variant="outline" />
                  <Pressable style={styles.iconAction} onPress={() => openEditor(training.id)}>
                    <Feather name="edit-2" size={16} color={theme.colors.accentAlt} />
                  </Pressable>
                  <Pressable style={styles.iconAction} onPress={() => deleteCustomTraining(training.id)}>
                    <Feather name="trash-2" size={16} color={theme.colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Treinos do personal</Text>
          {loading ? (
            <Text style={styles.muted}>Carregando...</Text>
          ) : trainerTrainingBlocked ? (
            <View style={styles.blockedBox}>
              <Text style={styles.blockedText}>{trainerTrainingBlockMessage || 'Treinos bloqueados.'}</Text>
            </View>
          ) : orderedTrainings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhum treino vinculado para este aluno.</Text>
            </View>
          ) : (
            orderedTrainings.map((training) => (
              <View key={training.id} style={styles.trainingCard}>
                <View style={styles.trainingInfo}>
                  <Text style={styles.trainingTitle}>{training.title || 'Treino'}</Text>
                  <Text style={styles.trainingMeta}>
                    {training.personal?.name ? `Personal: ${training.personal.name}` : 'Personal nao informado'}
                  </Text>
                  {training.notes ? <Text style={styles.trainingNotes}>{training.notes}</Text> : null}
                </View>
                <View style={styles.trainingActions}>
                  <AppButton title="Iniciar" onPress={() => openTraining(training.id)} />
                  <AppButton title="Inspecionar" onPress={() => openTraining(training.id, 'inspect')} variant="outline" />
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl
  },
  scroll: {
    paddingBottom: theme.spacing.xxl
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg
  },
  title: {
    fontFamily: theme.fonts.semibold,
    fontSize: 22,
    color: theme.colors.text
  },
  subtitle: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim,
    marginTop: 4
  },
  headerActions: {
    alignItems: 'flex-end'
  },
  sectionCard: {
    marginBottom: theme.spacing.lg
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm
  },
  sectionTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 16,
    color: theme.colors.text
  },
  sectionHelper: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim,
    fontSize: 12,
    marginBottom: theme.spacing.md
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  badgeText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    color: theme.colors.textDim
  },
  trainingCard: {
    backgroundColor: theme.colors.bgAlt,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  trainingInfo: {
    marginBottom: theme.spacing.sm
  },
  trainingTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 16,
    color: theme.colors.text
  },
  trainingMeta: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim,
    marginTop: 4
  },
  trainingNotes: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim,
    marginTop: 6
  },
  trainingActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'
  },
  iconAction: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center'
  },
  emptyText: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim
  },
  blockedBox: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md
  },
  blockedText: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.accent
  },
  muted: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim
  }
});
