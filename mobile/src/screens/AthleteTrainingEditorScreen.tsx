import { Feather } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { exerciseBank, exerciseGroups } from '../data/exerciseBank';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import {
  CustomExercise,
  CustomSet,
  CustomSetType,
  CustomTraining,
  generateCustomTrainingId,
  loadCustomTrainings,
  MAX_CUSTOM_TRAININGS,
  saveCustomTrainings
} from '../storage/athleteCustomTrainings';
import { AthleteTrainingStackParamList } from '../navigation/types';
import { theme } from '../theme';

type EditorRoute = RouteProp<AthleteTrainingStackParamList, 'TrainingEditor'>;

type ExerciseGroup = (typeof exerciseGroups)[number] | 'Todos';

const setTypeOptions: CustomSetType[] = ['AQUECIMENTO', 'RECONHECIMENTO', 'VALIDA', 'CLUSTER', 'DROP'];

const setTypeLabels: Record<CustomSetType, string> = {
  AQUECIMENTO: 'Aquecimento',
  RECONHECIMENTO: 'Reconhecimento',
  VALIDA: 'Valida',
  CLUSTER: 'Cluster',
  DROP: 'Drop'
};

const createEmptySet = (): CustomSet => ({
  setType: 'VALIDA',
  load: '',
  reps: '',
  rir: '',
  rest: '',
  notes: ''
});

const cloneExercises = (exercises: CustomExercise[]) =>
  exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => ({ ...set }))
  }));

export const AthleteTrainingEditorScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<EditorRoute>();
  const { user } = useAuth();
  const [customTrainings, setCustomTrainings] = useState<CustomTraining[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('Novo treino');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftExercises, setDraftExercises] = useState<CustomExercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseGroup, setExerciseGroup] = useState<ExerciseGroup>('Todos');

  const trainingId = route.params?.trainingId ?? null;

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const list = await loadCustomTrainings(user.id);
      setCustomTrainings(list);

      if (trainingId) {
        const existing = list.find((t) => t.id === trainingId);
        if (existing) {
          setDraftId(existing.id);
          setDraftTitle(existing.title);
          setDraftNotes(existing.notes || '');
          setDraftExercises(cloneExercises(existing.exercises || []));
        }
      }
    };

    load();
  }, [trainingId, user?.id]);

  const remainingSlots = Math.max(0, MAX_CUSTOM_TRAININGS - customTrainings.length);
  const canCreate = Boolean(draftId) || remainingSlots > 0;

  const filteredExerciseBank = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase();
    return exerciseBank.filter((item) => {
      const groupOk = exerciseGroup === 'Todos' || item.group === exerciseGroup;
      const queryOk = !q || item.name.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q);
      return groupOk && queryOk;
    });
  }, [exerciseGroup, exerciseSearch]);

  const addExerciseFromBank = (name: string, muscle: string) => {
    setDraftExercises((prev) => [...prev, { name, muscle, sets: [createEmptySet()] }]);
  };

  const addBlankExercise = () => {
    setDraftExercises((prev) => [...prev, { name: 'Novo exercicio', muscle: 'Geral', sets: [createEmptySet()] }]);
  };

  const updateExercise = (exerciseIdx: number, patch: Partial<CustomExercise>) => {
    setDraftExercises((prev) => prev.map((ex, idx) => (idx === exerciseIdx ? { ...ex, ...patch } : ex)));
  };

  const updateSet = (exerciseIdx: number, setIdx: number, patch: Partial<CustomSet>) => {
    setDraftExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIdx) return ex;
        return { ...ex, sets: ex.sets.map((set, sIdx) => (sIdx === setIdx ? { ...set, ...patch } : set)) };
      })
    );
  };

  const addSet = (exerciseIdx: number) => {
    setDraftExercises((prev) =>
      prev.map((ex, idx) => (idx === exerciseIdx ? { ...ex, sets: [...ex.sets, createEmptySet()] } : ex))
    );
  };

  const removeSet = (exerciseIdx: number, setIdx: number) => {
    setDraftExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIdx) return ex;
        const nextSets = ex.sets.filter((_, sIdx) => sIdx !== setIdx);
        return { ...ex, sets: nextSets.length > 0 ? nextSets : [createEmptySet()] };
      })
    );
  };

  const removeExercise = (exerciseIdx: number) => {
    setDraftExercises((prev) => prev.filter((_, idx) => idx !== exerciseIdx));
  };

  const cycleSetType = (exerciseIdx: number, setIdx: number) => {
    const current = draftExercises[exerciseIdx]?.sets?.[setIdx]?.setType || 'VALIDA';
    const index = setTypeOptions.indexOf(current);
    const next = setTypeOptions[(index + 1) % setTypeOptions.length];
    updateSet(exerciseIdx, setIdx, { setType: next });
  };

  const saveDraft = async () => {
    if (!user?.id) return;
    if (!draftId && !canCreate) return;
    if (draftExercises.length === 0) return;

    const now = new Date().toISOString();
    const existing = draftId ? customTrainings.find((t) => t.id === draftId) : null;
    const nextTraining: CustomTraining = {
      id: draftId || generateCustomTrainingId(),
      title: draftTitle.trim() || 'Treino sem titulo',
      notes: draftNotes.trim() ? draftNotes : null,
      exercises: cloneExercises(draftExercises),
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    const nextList = existing
      ? customTrainings.map((t) => (t.id === nextTraining.id ? nextTraining : t))
      : [...customTrainings, nextTraining];

    await saveCustomTrainings(user.id, nextList);
    setCustomTrainings(nextList);
    navigation.goBack();
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{draftId ? 'Editar treino' : 'Criar treino'}</Text>
          <AppButton title="Salvar" onPress={saveDraft} disabled={!canCreate} />
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Detalhes</Text>
          <TextInput
            style={styles.input}
            value={draftTitle}
            onChangeText={setDraftTitle}
            placeholder="Titulo do treino"
            placeholderTextColor={theme.colors.textDim}
          />
          <TextInput
            style={[styles.input, styles.textarea]}
            value={draftNotes}
            onChangeText={setDraftNotes}
            placeholder="Notas"
            placeholderTextColor={theme.colors.textDim}
            multiline
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercicios do treino</Text>
            <Pressable style={styles.inlineAction} onPress={addBlankExercise}>
              <Feather name="plus" size={16} color={theme.colors.accent} />
              <Text style={styles.inlineActionText}>Adicionar exercicio</Text>
            </Pressable>
          </View>

          {draftExercises.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Adicione exercicios para montar seu treino.</Text>
            </View>
          ) : (
            draftExercises.map((exercise, exerciseIdx) => (
              <View key={`${exercise.name}-${exerciseIdx}`} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <TextInput
                    style={styles.exerciseName}
                    value={exercise.name}
                    onChangeText={(value) => updateExercise(exerciseIdx, { name: value })}
                  />
                  <Pressable onPress={() => removeExercise(exerciseIdx)}>
                    <Feather name="trash-2" size={16} color={theme.colors.danger} />
                  </Pressable>
                </View>
                <TextInput
                  style={styles.input}
                  value={exercise.muscle}
                  onChangeText={(value) => updateExercise(exerciseIdx, { muscle: value })}
                  placeholder="Grupo"
                  placeholderTextColor={theme.colors.textDim}
                />

                {exercise.sets.map((set, setIdx) => (
                  <View key={`set-${setIdx}`} style={styles.setCard}>
                    <View style={styles.setHeader}>
                      <Text style={styles.setTitle}>Serie {setIdx + 1}</Text>
                      <Pressable onPress={() => removeSet(exerciseIdx, setIdx)}>
                        <Feather name="x" size={16} color={theme.colors.textDim} />
                      </Pressable>
                    </View>
                    <View style={styles.setRow}>
                      <Pressable style={styles.setTypeButton} onPress={() => cycleSetType(exerciseIdx, setIdx)}>
                        <Text style={styles.setTypeText}>{setTypeLabels[set.setType]}</Text>
                      </Pressable>
                      <TextInput
                        style={styles.setInput}
                        value={set.load}
                        onChangeText={(value) => updateSet(exerciseIdx, setIdx, { load: value })}
                        placeholder="Kg"
                        placeholderTextColor={theme.colors.textDim}
                      />
                      <TextInput
                        style={styles.setInput}
                        value={set.reps}
                        onChangeText={(value) => updateSet(exerciseIdx, setIdx, { reps: value })}
                        placeholder="Reps"
                        placeholderTextColor={theme.colors.textDim}
                      />
                    </View>
                    <View style={styles.setRow}>
                      <TextInput
                        style={styles.setInput}
                        value={set.rir}
                        onChangeText={(value) => updateSet(exerciseIdx, setIdx, { rir: value })}
                        placeholder="RIR"
                        placeholderTextColor={theme.colors.textDim}
                      />
                      <TextInput
                        style={styles.setInput}
                        value={set.rest}
                        onChangeText={(value) => updateSet(exerciseIdx, setIdx, { rest: value })}
                        placeholder="Descanso"
                        placeholderTextColor={theme.colors.textDim}
                      />
                    </View>
                    <TextInput
                      style={[styles.input, styles.setNotes]}
                      value={set.notes}
                      onChangeText={(value) => updateSet(exerciseIdx, setIdx, { notes: value })}
                      placeholder="Notas"
                      placeholderTextColor={theme.colors.textDim}
                    />
                  </View>
                ))}

                <AppButton title="Adicionar serie" onPress={() => addSet(exerciseIdx)} variant="outline" />
              </View>
            ))
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Biblioteca de exercicios</Text>
          <TextInput
            style={styles.input}
            value={exerciseSearch}
            onChangeText={setExerciseSearch}
            placeholder="Buscar exercicio..."
            placeholderTextColor={theme.colors.textDim}
          />
          <View style={styles.groupRow}>
            {['Todos', ...exerciseGroups].map((group) => (
              <Pressable
                key={group}
                onPress={() => setExerciseGroup(group as ExerciseGroup)}
                style={[styles.groupChip, exerciseGroup === group && styles.groupChipActive]}
              >
                <Text style={[styles.groupChipText, exerciseGroup === group && styles.groupChipTextActive]}>{group}</Text>
              </Pressable>
            ))}
          </View>

          {filteredExerciseBank.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhum exercicio encontrado.</Text>
            </View>
          ) : (
            filteredExerciseBank.map((exercise) => (
              <Pressable
                key={`${exercise.name}-${exercise.group}`}
                style={styles.libraryItem}
                onPress={() => addExerciseFromBank(exercise.name, exercise.group)}
              >
                <View>
                  <Text style={styles.libraryTitle}>{exercise.name}</Text>
                  <Text style={styles.librarySubtitle}>{exercise.detail}</Text>
                </View>
                <Feather name="plus" size={16} color={theme.colors.accent} />
              </Pressable>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg
  },
  title: {
    fontFamily: theme.fonts.semibold,
    fontSize: 20,
    color: theme.colors.text
  },
  card: {
    marginBottom: theme.spacing.lg
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm
  },
  sectionTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: theme.spacing.sm
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    backgroundColor: theme.colors.bgAlt,
    marginBottom: theme.spacing.sm
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  inlineActionText: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.accent
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.sm
  },
  emptyText: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim
  },
  exerciseCard: {
    backgroundColor: theme.colors.bgAlt,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm
  },
  exerciseName: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 16
  },
  setCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm
  },
  setTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  },
  setRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.sm
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    backgroundColor: theme.colors.bgAlt
  },
  setTypeButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceAlt
  },
  setTypeText: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 12
  },
  setNotes: {
    marginBottom: 0
  },
  groupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.sm
  },
  groupChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  groupChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent
  },
  groupChipText: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.textDim,
    fontSize: 12
  },
  groupChipTextActive: {
    color: '#0a0a0a'
  },
  libraryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm
  },
  libraryTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  },
  librarySubtitle: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim,
    fontSize: 12
  }
});
