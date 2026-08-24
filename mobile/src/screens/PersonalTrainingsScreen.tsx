import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../api/client';
import { Training } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { exerciseBank, exerciseGroups } from '../data/exerciseBank';
import type { ExerciseBankItem, ExerciseGroup } from '../data/exerciseBank';
import { theme } from '../theme';

type Athlete = { id: string; name: string; user?: { email?: string | null } };
type SetType = 'AQUECIMENTO' | 'RECONHECIMENTO' | 'VALIDA' | 'CLUSTER' | 'DROP';

type RoutineSet = {
  setType: SetType;
  load: string;
  reps: string;
  rir: string;
  rest: string;
  notes: string;
};

type RoutineExercise = {
  name: string;
  muscle: string;
  sets: RoutineSet[];
};

type TrainingItem = Training & {
  athleteId?: string | null;
  athlete?: Athlete | null;
  exercises?: RoutineExercise[];
  createdAt?: string;
  updatedAt?: string;
};

const setTypeOptions: Array<{ value: SetType; label: string }> = [
  { value: 'AQUECIMENTO', label: 'Aquecimento' },
  { value: 'RECONHECIMENTO', label: 'Reconhecimento' },
  { value: 'VALIDA', label: 'Valida' },
  { value: 'CLUSTER', label: 'Cluster' },
  { value: 'DROP', label: 'Drop' }
];

export const PersonalTrainingsScreen = () => {
  const { token } = useAuth();
  const [mode, setMode] = useState<'home' | 'create' | 'library'>('home');

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);

  const [library, setLibrary] = useState<TrainingItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');

  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('Novo treino');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftAthleteId, setDraftAthleteId] = useState('');
  const [draftExercises, setDraftExercises] = useState<RoutineExercise[]>([]);

  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseGroup, setExerciseGroup] = useState<ExerciseGroup | 'Todos'>('Todos');

  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkingTrainingId, setLinkingTrainingId] = useState<string | null>(null);
  const [linkAthleteId, setLinkAthleteId] = useState('');

  const ensureAthletesLoaded = async () => {
    if (!token || loadingAthletes || athletes.length > 0) return;
    setLoadingAthletes(true);
    try {
      const data = await api.getPersonalAthletes(token);
      setAthletes((data || []).map((a) => ({ id: a.id, name: a.name, user: a.user })));
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar os alunos.');
    } finally {
      setLoadingAthletes(false);
    }
  };

  const loadLibraryFromDb = async (query?: string) => {
    if (!token) return;
    setLoadingLibrary(true);
    try {
      const data = await api.getPersonalTrainings(token, query);
      setLibrary((data || []) as TrainingItem[]);
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel carregar a biblioteca.');
    } finally {
      setLoadingLibrary(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadLibraryFromDb();
  }, [token]);

  const resetDraft = () => {
    setDraftId(null);
    setDraftTitle('Novo treino');
    setDraftNotes('');
    setDraftAthleteId('');
    setDraftExercises([]);
  };

  const openCreate = async () => {
    await ensureAthletesLoaded();
    resetDraft();
    setMode('create');
  };

  const openLibrary = async () => {
    await ensureAthletesLoaded();
    await loadLibraryFromDb(librarySearch.trim() || undefined);
    setMode('library');
  };

  const addExerciseFromBank = (item: ExerciseBankItem) => {
    setDraftExercises((prev) => [
      ...prev,
      {
        name: item.name,
        muscle: item.group,
        sets: [{ setType: 'VALIDA', load: '', reps: '', rir: '', rest: '', notes: '' }]
      }
    ]);
  };

  const updateExercise = (exerciseIdx: number, patch: Partial<RoutineExercise>) => {
    setDraftExercises((prev) => prev.map((ex, idx) => (idx === exerciseIdx ? { ...ex, ...patch } : ex)));
  };

  const updateSet = (exerciseIdx: number, setIdx: number, patch: Partial<RoutineSet>) => {
    setDraftExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIdx) return ex;
        return { ...ex, sets: ex.sets.map((s, sIdx) => (sIdx === setIdx ? { ...s, ...patch } : s)) };
      })
    );
  };

  const addSet = (exerciseIdx: number) => {
    setDraftExercises((prev) =>
      prev.map((ex, idx) =>
        idx === exerciseIdx
          ? { ...ex, sets: [...ex.sets, { setType: 'VALIDA', load: '', reps: '', rir: '', rest: '', notes: '' }] }
          : ex
      )
    );
  };

  const removeSet = (exerciseIdx: number, setIdx: number) => {
    setDraftExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIdx) return ex;
        const nextSets = ex.sets.filter((_, i) => i !== setIdx);
        return {
          ...ex,
          sets:
            nextSets.length > 0 ? nextSets : [{ setType: 'VALIDA', load: '', reps: '', rir: '', rest: '', notes: '' }]
        };
      })
    );
  };

  const removeExercise = (exerciseIdx: number) => {
    setDraftExercises((prev) => prev.filter((_, idx) => idx !== exerciseIdx));
  };

  const saveTraining = async () => {
    if (!token) return;
    const payload = {
      title: draftTitle.trim() || 'Treino sem titulo',
      notes: draftNotes || null,
      athleteId: draftAthleteId || null,
      exercises: draftExercises
    };

    try {
      if (draftId) {
        const data = await api.updatePersonalTraining(token, draftId, payload as any);
        setDraftId(data.id);
      } else {
        const data = await api.createPersonalTraining(token, payload as any);
        setDraftId(data.id);
      }
      Alert.alert('Sucesso', 'Treino salvo na biblioteca.');
      await loadLibraryFromDb(librarySearch.trim() || undefined);
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel salvar o treino.');
    }
  };

  const editFromLibrary = (training: TrainingItem) => {
    const normalizedExercises: RoutineExercise[] = (training.exercises || []).map((exercise: any) => ({
      name: exercise?.name ?? 'Exercicio',
      muscle: exercise?.muscle ?? 'Geral',
      sets: (exercise?.sets || []).map((set: any) => ({
        setType: (set?.setType as SetType) ?? 'VALIDA',
        load: String(set?.load ?? ''),
        reps: String(set?.reps ?? ''),
        rir: String(set?.rir ?? ''),
        rest: String(set?.rest ?? ''),
        notes: String(set?.notes ?? '')
      }))
    }));

    setDraftId(training.id);
    setDraftTitle(training.title);
    setDraftNotes(training.notes || '');
    setDraftAthleteId(training.athleteId || '');
    setDraftExercises(normalizedExercises);
    setMode('create');
  };

  const deleteFromLibrary = (id: string) => {
    if (!token) return;
    const run = async () => {
      try {
        await api.deletePersonalTraining(token, id);
        Alert.alert('Sucesso', 'Treino removido.');
        await loadLibraryFromDb(librarySearch.trim() || undefined);
      } catch (err: any) {
        Alert.alert('Erro', err?.message || 'Nao foi possivel remover o treino.');
      }
    };
    run();
  };

  const openLinkModal = (training: TrainingItem) => {
    setLinkingTrainingId(training.id);
    setLinkAthleteId(training.athleteId || '');
    setLinkModalVisible(true);
  };

  const confirmLink = () => {
    if (!token || !linkingTrainingId) return;
    const run = async () => {
      try {
        await api.assignPersonalTraining(token, linkingTrainingId, linkAthleteId || null);
        setLinkModalVisible(false);
        Alert.alert('Sucesso', 'Treino vinculado ao aluno.');
        await loadLibraryFromDb(librarySearch.trim() || undefined);
      } catch (err: any) {
        Alert.alert('Erro', err?.message || 'Nao foi possivel vincular o treino.');
      }
    };
    run();
  };

  const filteredExerciseBank = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase();
    return exerciseBank.filter((item) => {
      const groupOk = exerciseGroup === 'Todos' || item.group === exerciseGroup;
      const queryOk = !q || item.name.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q);
      return groupOk && queryOk;
    });
  }, [exerciseGroup, exerciseSearch]);

  const exerciseGroupOptions: Array<ExerciseGroup | 'Todos'> = ['Todos', ...exerciseGroups];

  const filteredLibrary = useMemo(() => {
    const sorted = [...library].sort((a, b) => {
      const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bDate - aDate;
    });
    return sorted;
  }, [library]);

  const resolveAthleteLabel = (training: TrainingItem) => {
    if (!training.athleteId) return 'Nao vinculado';
    if (training.athlete) {
      return training.athlete.user?.email ? `${training.athlete.name} (${training.athlete.user.email})` : training.athlete.name;
    }
    const athlete = athletes.find((a) => a.id === training.athleteId);
    if (!athlete) return 'Aluno nao encontrado';
    return athlete.user?.email ? `${athlete.name} (${athlete.user.email})` : athlete.name;
  };

  const SmallActionButton = ({
    title,
    onPress,
    variant = 'solid'
  }: {
    title: string;
    onPress: () => void;
    variant?: 'solid' | 'outline' | 'ghost';
  }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.smallButton,
        variant === 'outline' && styles.smallButtonOutline,
        variant === 'ghost' && styles.smallButtonGhost
      ]}
    >
      <Text
        style={[
          styles.smallButtonText,
          variant === 'solid' && styles.smallButtonTextSolid,
          variant === 'ghost' && styles.smallButtonTextGhost
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );

  return (
    <Screen contentStyle={styles.content}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Treinos</Text>
            <Text style={styles.subtitle}>Crie novos treinos e gerencie sua biblioteca.</Text>
          </View>
          {mode !== 'home' ? (
            <AppButton title="Voltar" onPress={() => setMode('home')} variant="outline" tone="yellow" />
          ) : null}
        </View>

        {mode === 'home' && (
          <View style={styles.grid}>
            <Card style={styles.optionCard}>
              <Text style={styles.optionTitle}>Criar</Text>
              <Text style={styles.muted}>Forje um novo treino e vincule a um aluno.</Text>
              <AppButton title="Criar treino" onPress={openCreate} tone="yellow" />
            </Card>
            <Card style={styles.optionCard}>
              <Text style={styles.optionTitle}>Biblioteca</Text>
              <Text style={styles.muted}>Pesquise treinos e vincule a alunos.</Text>
              <AppButton title="Abrir biblioteca" onPress={openLibrary} tone="yellow" />
            </Card>
          </View>
        )}

        {mode === 'library' && (
          <Card style={styles.card}>
            <View style={styles.libraryHeader}>
              <View>
                <Text style={styles.sectionTitle}>Biblioteca particular</Text>
                <Text style={styles.muted}>Seus treinos salvos no sistema.</Text>
              </View>
              <AppButton title="Novo" onPress={openCreate} tone="yellow" />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Pesquisar treino..."
              placeholderTextColor={theme.colors.textDim}
              value={librarySearch}
              onChangeText={setLibrarySearch}
            />
            <AppButton
              title="Buscar"
              onPress={() => loadLibraryFromDb(librarySearch.trim() || undefined)}
              variant="outline"
              tone="yellow"
            />

            {loadingLibrary ? (
              <Text style={styles.muted}>Carregando...</Text>
            ) : filteredLibrary.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.muted}>Nenhum treino encontrado.</Text>
              </View>
            ) : (
              filteredLibrary.map((training) => (
                <View key={training.id} style={styles.libraryItem}>
                  <Text style={styles.libraryTitle}>{training.title}</Text>
                  <Text style={styles.muted}>{resolveAthleteLabel(training)}</Text>
                  <Text style={styles.muted}>{training.exercises?.length || 0} exercicios</Text>
                  {training.notes ? <Text style={styles.muted}>{training.notes}</Text> : null}
                  <View style={styles.actionsRow}>
                    <SmallActionButton title="Editar" onPress={() => editFromLibrary(training)} variant="outline" />
                    <SmallActionButton title="Vincular" onPress={() => openLinkModal(training)} variant="ghost" />
                    <SmallActionButton title="Remover" onPress={() => deleteFromLibrary(training.id)} variant="ghost" />
                  </View>
                </View>
              ))
            )}
          </Card>
        )}

        {mode === 'create' && (
          <>
            <Card style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{draftId ? 'Editar treino' : 'Novo treino'}</Text>
                <View style={styles.actionsRow}>
                  <SmallActionButton
                    title="Novo do zero"
                    onPress={resetDraft}
                    variant="outline"
                  />
                  <SmallActionButton title="Salvar" onPress={saveTraining} />
                </View>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Titulo do treino"
                placeholderTextColor={theme.colors.textDim}
                value={draftTitle}
                onChangeText={setDraftTitle}
              />
              <Text style={styles.label}>Vincular ao aluno</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <Pressable
                  style={[styles.chip, !draftAthleteId && styles.chipActive]}
                  onPress={() => setDraftAthleteId('')}
                >
                  <Text style={[styles.chipText, !draftAthleteId && styles.chipTextActive]}>Nao vincular</Text>
                </Pressable>
                {athletes.map((athlete) => (
                  <Pressable
                    key={athlete.id}
                    style={[styles.chip, draftAthleteId === athlete.id && styles.chipActive]}
                    onPress={() => setDraftAthleteId(athlete.id)}
                  >
                    <Text style={[styles.chipText, draftAthleteId === athlete.id && styles.chipTextActive]}>
                      {athlete.user?.email ? `${athlete.name}` : athlete.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Notas do treinador"
                placeholderTextColor={theme.colors.textDim}
                value={draftNotes}
                onChangeText={setDraftNotes}
                multiline
              />
            </Card>

            <Card style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Rotina</Text>
                <SmallActionButton
                  title="Adicionar exercicio"
                  onPress={() => setDraftExercises((prev) => [...prev, { name: 'Novo exercicio', muscle: 'Geral', sets: [{ setType: 'VALIDA', load: '', reps: '', rir: '', rest: '', notes: '' }] }])}
                  variant="outline"
                />
              </View>

              {draftExercises.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.muted}>Adicione exercicios pela biblioteca.</Text>
                </View>
              ) : (
                draftExercises.map((exercise, exerciseIdx) => (
                  <View key={`${exercise.name}-${exerciseIdx}`} style={styles.exerciseCard}>
                    <View style={styles.exerciseHeader}>
                      <TextInput
                        style={styles.input}
                        placeholder="Exercicio"
                        placeholderTextColor={theme.colors.textDim}
                        value={exercise.name}
                        onChangeText={(value) => updateExercise(exerciseIdx, { name: value })}
                      />
                      <SmallActionButton
                        title="Remover"
                        onPress={() => removeExercise(exerciseIdx)}
                        variant="ghost"
                      />
                    </View>

                    <Text style={styles.muted}>Grupo: {exercise.muscle}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                      {exerciseGroups.map((group) => (
                        <Pressable
                          key={`${group}-${exerciseIdx}`}
                          style={[styles.chip, exercise.muscle === group && styles.chipActive]}
                          onPress={() => updateExercise(exerciseIdx, { muscle: group })}
                        >
                          <Text style={[styles.chipText, exercise.muscle === group && styles.chipTextActive]}>
                            {group}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    {exercise.sets.map((set, setIdx) => (
                      <View key={`set-${setIdx}`} style={styles.setCard}>
                        <View style={styles.sectionHeader}>
                          <Text style={styles.muted}>Serie {setIdx + 1}</Text>
                          <SmallActionButton
                            title="Remover"
                            onPress={() => removeSet(exerciseIdx, setIdx)}
                            variant="ghost"
                          />
                        </View>
                        <View style={styles.row}>
                          <TextInput
                            style={[styles.input, styles.flex]}
                            placeholder="Carga"
                            placeholderTextColor={theme.colors.textDim}
                            value={set.load}
                            onChangeText={(value) => updateSet(exerciseIdx, setIdx, { load: value })}
                          />
                          <TextInput
                            style={[styles.input, styles.flex]}
                            placeholder="Reps"
                            placeholderTextColor={theme.colors.textDim}
                            value={set.reps}
                            onChangeText={(value) => updateSet(exerciseIdx, setIdx, { reps: value })}
                          />
                        </View>
                        <View style={styles.row}>
                          <TextInput
                            style={[styles.input, styles.flex]}
                            placeholder="RIR"
                            placeholderTextColor={theme.colors.textDim}
                            value={set.rir}
                            onChangeText={(value) => updateSet(exerciseIdx, setIdx, { rir: value })}
                          />
                          <TextInput
                            style={[styles.input, styles.flex]}
                            placeholder="Descanso"
                            placeholderTextColor={theme.colors.textDim}
                            value={set.rest}
                            onChangeText={(value) => updateSet(exerciseIdx, setIdx, { rest: value })}
                          />
                        </View>
                        <TextInput
                          style={styles.input}
                          placeholder="Notas"
                          placeholderTextColor={theme.colors.textDim}
                          value={set.notes}
                          onChangeText={(value) => updateSet(exerciseIdx, setIdx, { notes: value })}
                        />
                        <View style={styles.chipRow}>
                          {setTypeOptions.map((option) => (
                            <Pressable
                              key={option.value}
                              style={[styles.chip, set.setType === option.value && styles.chipActive]}
                              onPress={() => updateSet(exerciseIdx, setIdx, { setType: option.value })}
                            >
                              <Text style={[styles.chipText, set.setType === option.value && styles.chipTextActive]}>
                                {option.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ))}

                    <SmallActionButton
                      title="Adicionar serie"
                      onPress={() => addSet(exerciseIdx)}
                      variant="outline"
                    />
                  </View>
                ))
              )}
            </Card>

            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Biblioteca de exercicios</Text>
              <TextInput
                style={styles.input}
                placeholder="Buscar exercicio..."
                placeholderTextColor={theme.colors.textDim}
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {exerciseGroupOptions.map((group) => (
                  <Pressable
                    key={group}
                    style={[styles.chip, exerciseGroup === group && styles.chipActive]}
                    onPress={() => setExerciseGroup(group)}
                  >
                    <Text style={[styles.chipText, exerciseGroup === group && styles.chipTextActive]}>
                      {group}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {filteredExerciseBank.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.muted}>Nenhum exercicio encontrado.</Text>
                </View>
              ) : (
                filteredExerciseBank.map((item) => (
                  <View key={`${item.name}-${item.group}`} style={styles.libraryItem}>
                    <Text style={styles.libraryTitle}>{item.name}</Text>
                    <Text style={styles.muted}>{item.detail}</Text>
                    <SmallActionButton title="Adicionar" onPress={() => addExerciseFromBank(item)} />
                  </View>
                ))
              )}
            </Card>
          </>
        )}
      </ScrollView>

      <Modal visible={linkModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vincular treino a um aluno</Text>
            <ScrollView style={styles.modalBody}>
              <Pressable
                style={[styles.chip, !linkAthleteId && styles.chipActive]}
                onPress={() => setLinkAthleteId('')}
              >
                <Text style={[styles.chipText, !linkAthleteId && styles.chipTextActive]}>Nao vincular</Text>
              </Pressable>
              {athletes.map((athlete) => (
                <Pressable
                  key={athlete.id}
                  style={[styles.chip, linkAthleteId === athlete.id && styles.chipActive]}
                  onPress={() => setLinkAthleteId(athlete.id)}
                >
                  <Text style={[styles.chipText, linkAthleteId === athlete.id && styles.chipTextActive]}>
                    {athlete.user?.email ? `${athlete.name} (${athlete.user.email})` : athlete.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <AppButton title="Cancelar" onPress={() => setLinkModalVisible(false)} variant="ghost" tone="yellow" />
              <AppButton title="Vincular" onPress={confirmLink} tone="yellow" />
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: theme.spacing.lg
  },
  title: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 22
  },
  subtitle: {
    color: theme.colors.textDim,
    marginTop: 4
  },
  grid: {
    gap: theme.spacing.md
  },
  optionCard: {
    marginBottom: theme.spacing.md
  },
  optionTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 18,
    marginBottom: 6
  },
  card: {
    marginBottom: theme.spacing.lg
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm
  },
  sectionTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    backgroundColor: theme.colors.bgAlt,
    marginBottom: theme.spacing.sm
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  muted: {
    color: theme.colors.textDim,
    fontSize: 12,
    marginBottom: theme.spacing.sm
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center'
  },
  libraryItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.bgAlt
  },
  libraryTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: 4
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: theme.spacing.sm
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentAlt
  },
  smallButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  smallButtonGhost: {
    backgroundColor: 'transparent'
  },
  smallButtonText: {
    fontSize: 12,
    fontFamily: theme.fonts.semibold
  },
  smallButtonTextSolid: {
    color: '#0a0a0a'
  },
  smallButtonTextGhost: {
    color: theme.colors.text
  },
  label: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: 6
  },
  chipScroll: {
    marginBottom: theme.spacing.sm
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.sm
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8
  },
  chipActive: {
    backgroundColor: theme.colors.accentAlt,
    borderColor: theme.colors.accentAlt
  },
  chipText: {
    color: theme.colors.textDim,
    fontSize: 12,
    fontFamily: theme.fonts.semibold
  },
  chipTextActive: {
    color: '#0a0a0a'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm
  },
  exerciseCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  setCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.bgAlt
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm
  },
  flex: {
    flex: 1
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: '100%',
    maxHeight: '90%'
  },
  modalTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm
  },
  modalBody: {
    marginBottom: theme.spacing.md
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm
  }
});
