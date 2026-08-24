import { Feather } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Svg, { Line, Polygon, Text as SvgText } from 'react-native-svg';
import { api, ApiError } from '../api/client';
import { Training } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { AthleteTrainingStackParamList } from '../navigation/types';
import { findCustomTraining } from '../storage/athleteCustomTrainings';
import {
  clearTrainingSession,
  CompletedTraining,
  loadTrainingHistory,
  loadTrainingSession,
  saveCompletedTraining,
  saveTrainingHistory,
  saveTrainingSession,
  SessionExercise
} from '../storage/athleteTrainingSession';
import { theme } from '../theme';

type TrainingSessionRoute = RouteProp<AthleteTrainingStackParamList, 'TrainingSession'>;

type RoutineSet = {
  setType?: string;
  load?: string;
  reps?: string;
  rir?: string;
  rest?: string;
  notes?: string;
};

type RoutineExercise = {
  name?: string;
  muscle?: string;
  sets?: RoutineSet[];
};

type SessionSet = {
  setType?: string;
  load: string;
  reps: string;
  rir: string;
  rest: string;
  notes: string;
  done: boolean;
};

type FocusItem = { group: string; percent: number; value: number };

type RadarData = {
  size: number;
  center: number;
  radius: number;
  rings: Array<{ level: number; points: string }>;
  axes: Array<{ x: number; y: number; angle: number }>;
  polygon: string;
};

type FeedbackCard =
  | { id: string; type: 'text'; title: string; subtitle?: string; helper?: string }
  | { id: string; type: 'radar'; title: string; summary?: string; radar: RadarData; focusItems: FocusItem[] };

const muscleGroups = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bracos', 'Core', 'Geral'] as const;

const normalizeGroup = (value?: string) => {
  const raw = (value || '').toLowerCase();
  if (raw.includes('peit')) return 'Peito';
  if (raw.includes('cost')) return 'Costas';
  if (raw.includes('pern')) return 'Pernas';
  if (raw.includes('ombr')) return 'Ombros';
  if (raw.includes('brac') || raw.includes('bra')) return 'Bracos';
  if (raw.includes('core')) return 'Core';
  return 'Geral';
};

const buildRadarPoints = (center: number, radius: number, values: number[]) => {
  const count = values.length;
  if (count === 0) return '';
  const points = values.map((value, idx) => {
    const angle = (Math.PI * 2 * idx) / count - Math.PI / 2;
    const pointRadius = radius * value;
    const x = center + pointRadius * Math.cos(angle);
    const y = center + pointRadius * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return points.join(' ');
};

const normalizeValue = (value?: string) => (value ?? '').toString();

const buildSession = (training: Training): SessionExercise[] => {
  const exercises = Array.isArray(training.exercises) ? training.exercises : [];
  return exercises.map((exercise: RoutineExercise) => ({
    name: exercise?.name || 'Exercicio',
    muscle: exercise?.muscle || 'Geral',
    done: false,
    sets: (exercise?.sets || []).map((set) => ({
      setType: set?.setType,
      load: normalizeValue(set?.load),
      reps: normalizeValue(set?.reps),
      rir: normalizeValue(set?.rir),
      rest: normalizeValue(set?.rest),
      notes: normalizeValue(set?.notes),
      done: false
    }))
  }));
};

const applyHistory = (base: SessionExercise[], history?: SessionExercise[]) => {
  if (!history || history.length === 0) return base;
  return base.map((exercise, idx) => {
    const historyExercise = history[idx];
    if (!historyExercise) return exercise;
    return {
      ...exercise,
      sets: exercise.sets.map((set, setIdx) => {
        const historySet = historyExercise.sets?.[setIdx];
        if (!historySet) return set;
        return {
          ...set,
          load: historySet.load ?? set.load,
          reps: historySet.reps ?? set.reps,
          rir: historySet.rir ?? set.rir,
          rest: historySet.rest ?? set.rest,
          notes: historySet.notes ?? set.notes
        };
      })
    };
  });
};

const resetSession = (exercises: SessionExercise[]) =>
  exercises.map((exercise) => ({
    ...exercise,
    done: false,
    sets: exercise.sets.map((set) => ({ ...set, done: false }))
  }));

const formatDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
};

const parseRestSeconds = (value?: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed > 0 ? Math.round(parsed) : 0;
};

const defaultRestSeconds = 90;

export const TrainingDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<TrainingSessionRoute>();
  const { token, user } = useAuth();
  const { id, autoStart, mode } = route.params;
  const isInspect = mode === 'inspect';

  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(false);
  const [trainingBlocked, setTrainingBlocked] = useState(false);
  const [trainingBlockedMessage, setTrainingBlockedMessage] = useState('');

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [restDuration, setRestDuration] = useState(defaultRestSeconds);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
  const [completedTraining, setCompletedTraining] = useState<CompletedTraining | null>(null);
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const [completionVisible, setCompletionVisible] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const restRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  useEffect(() => {
    if (restRunning) {
      restRef.current = setInterval(() => {
        setRestRemaining((prev) => {
          if (prev <= 1) {
            setRestRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (restRef.current) clearInterval(restRef.current);
    };
  }, [restRunning]);

  useEffect(() => {
    const loadTraining = async () => {
      if (!token) return;
      setLoading(true);
      setTrainingBlocked(false);
      setTrainingBlockedMessage('');
      try {
        let trainingData: Training | null = null;
        if (id.startsWith('custom-') && user?.id) {
          const custom = await findCustomTraining(user.id, id);
          if (custom) {
            trainingData = {
              id: custom.id,
              title: custom.title,
              notes: custom.notes ?? null,
              exercises: custom.exercises,
              updatedAt: custom.updatedAt,
              personal: undefined
            };
          }
        }
        if (!trainingData) {
          trainingData = await api.getAthleteTraining(token, id);
        }

        if (!trainingData) {
          setTraining(null);
          return;
        }

        setTraining(trainingData);

        const initialSession = buildSession(trainingData);
        const storedSession = await loadTrainingSession(id);
        const storedHistory = await loadTrainingHistory(id);

        const historyExercises = Array.isArray(storedHistory?.exercises) ? storedHistory?.exercises : undefined;
        const historySession = applyHistory(initialSession, historyExercises);
        const storedExercises = storedSession?.exercises;
        const hasStoredExercises = Array.isArray(storedExercises) && storedExercises.length === initialSession.length;

        if (isInspect) {
          setSessionExercises(historySession);
          setElapsedSeconds(0);
          setRestRemaining(0);
          setRestRunning(false);
          if (storedHistory?.restDuration) {
            setRestDuration(storedHistory.restDuration);
          }
          return;
        }

        if (autoStart) {
          const baseExercises = hasStoredExercises ? storedExercises : historySession;
          setSessionExercises(resetSession(baseExercises as SessionExercise[]));
          setElapsedSeconds(0);
          setRestRemaining(0);
          setRestRunning(false);
          if (storedSession?.restDuration) {
            setRestDuration(storedSession.restDuration);
          } else if (storedHistory?.restDuration) {
            setRestDuration(storedHistory.restDuration);
          }
          return;
        }

        if (hasStoredExercises) {
          setSessionExercises(storedExercises as SessionExercise[]);
          setElapsedSeconds(storedSession?.elapsedSeconds ?? 0);
          setRestDuration(storedSession?.restDuration ?? defaultRestSeconds);
          setRestRemaining(storedSession?.restRemaining ?? 0);
          setRestRunning(storedSession?.restRunning ?? false);
          return;
        }

        setSessionExercises(historySession);
        if (storedHistory?.restDuration) {
          setRestDuration(storedHistory.restDuration);
        }
      } catch (err: any) {
        const apiError = err as ApiError;
        if (apiError?.code === 'TRAINING_BLOCKED') {
          setTraining(null);
          setSessionExercises([]);
          setCompletedTraining(null);
          setTrainingBlocked(true);
          setTrainingBlockedMessage(apiError.message || 'Treino do personal bloqueado. Pagamento pendente.');
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    loadTraining();
  }, [autoStart, id, isInspect, token, user?.id]);

  useEffect(() => {
    if (!id || isInspect) return;
    saveTrainingSession(id, {
      elapsedSeconds,
      restDuration,
      restRemaining,
      restRunning,
      exercises: sessionExercises
    });
  }, [elapsedSeconds, id, isInspect, restDuration, restRemaining, restRunning, sessionExercises]);

  const updateExercise = (exerciseIdx: number, patch: Partial<SessionExercise>) => {
    setSessionExercises((prev) => prev.map((ex, idx) => (idx === exerciseIdx ? { ...ex, ...patch } : ex)));
  };

  const updateSet = (exerciseIdx: number, setIdx: number, patch: Partial<SessionSet>) => {
    setSessionExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((set, sIdx) => (sIdx === setIdx ? { ...set, ...patch } : set))
        };
      })
    );
  };

  const handleToggleSetDone = (exerciseIdx: number, setIdx: number) => {
    const set = sessionExercises[exerciseIdx]?.sets?.[setIdx];
    if (!set) return;
    updateSet(exerciseIdx, setIdx, { done: !set.done });
  };

  const handleToggleExerciseDone = (exerciseIdx: number) => {
    const ex = sessionExercises[exerciseIdx];
    if (!ex) return;
    updateExercise(exerciseIdx, { done: !ex.done });
  };

  const startRest = () => {
    if (restRunning) return;
    const total = restDuration || defaultRestSeconds;
    setRestRemaining(total);
    setRestRunning(true);
  };

  const pauseRest = () => setRestRunning(false);
  const resetRest = () => {
    setRestRunning(false);
    setRestRemaining(0);
  };
  const skipRest = () => {
    setRestRunning(false);
    setRestRemaining(0);
  };

  const handleComplete = async () => {
    if (!id) return;
    const completedAt = new Date().toISOString();
    const completed: CompletedTraining = {
      trainingId: id,
      completedAt,
      elapsedSeconds,
      restDuration,
      exercises: sessionExercises
    };

    setCompletedTraining(completed);
    await saveCompletedTraining(completed);
    await saveTrainingHistory(id, { restDuration, exercises: sessionExercises });
    await clearTrainingSession(id);
    setCompletionVisible(true);
    setIsRunning(false);
  };

  const completedSummary = useMemo(() => {
    if (!completedTraining) return null;
    const totalSets = completedTraining.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
    const completedSets = completedTraining.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.done).length, 0);
    const totalExercises = completedTraining.exercises.length;
    const completedExercises = completedTraining.exercises.filter((exercise) => exercise.done).length;
    return { totalSets, completedSets, totalExercises, completedExercises };
  }, [completedTraining]);

  const focusItems = useMemo<FocusItem[]>(() => {
    if (!completedTraining) return [];
    const totals = new Map<string, number>();
    let totalSets = 0;

    completedTraining.exercises.forEach((exercise) => {
      const muscle = normalizeGroup(exercise.muscle);
      const sets = exercise.sets || [];
      const doneSets = sets.filter((set) => set.done !== false);
      const count = doneSets.length > 0 ? doneSets.length : sets.length;
      if (count === 0) return;
      totalSets += count;
      totals.set(muscle, (totals.get(muscle) || 0) + count);
    });

    return muscleGroups.map((group) => {
      const value = totals.get(group) || 0;
      const percent = totalSets > 0 ? Math.round((value / totalSets) * 100) : 0;
      return { group, value, percent };
    });
  }, [completedTraining]);

  const radarData = useMemo<RadarData | null>(() => {
    if (focusItems.length === 0) return null;
    const values = focusItems.map((item) => Math.min(1, Math.max(0, item.percent / 100)));
    const size = 220;
    const center = size / 2;
    const radius = 78;
    const rings = [0.25, 0.5, 0.75, 1].map((level) => ({
      level,
      points: buildRadarPoints(center, radius, values.map(() => level))
    }));
    const axes = focusItems.map((_, idx) => {
      const angle = (Math.PI * 2 * idx) / focusItems.length - Math.PI / 2;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
        angle
      };
    });
    const polygon = buildRadarPoints(center, radius, values);
    return { size, center, radius, rings, axes, polygon };
  }, [focusItems]);

  const feedbackCards = useMemo<FeedbackCard[]>(() => {
    if (!completedTraining) return [];
    const cards: FeedbackCard[] = [];

    if (completedSummary) {
      cards.push({
        id: 'congrats',
        type: 'text',
        title: 'Parabens!',
        subtitle: `Voce concluiu ${completedSummary.completedExercises} exercicios e ${completedSummary.completedSets} series.`,
        helper: 'Mantenha a consistencia para ver resultados ainda melhores.'
      });
    }

    if (radarData) {
      cards.push({
        id: 'radar',
        type: 'radar',
        title: 'Mapa de foco do treino',
        summary: 'Distribuicao de series por grupo muscular.',
        radar: radarData,
        focusItems
      });
    }

    if (cards.length === 0) {
      cards.push({
        id: 'summary',
        type: 'text',
        title: 'Treino concluido!',
        subtitle: 'Bom trabalho. Continue evoluindo.'
      });
    }

    return cards;
  }, [completedSummary, completedTraining, focusItems, radarData]);

  const activeFeedback = feedbackCards[feedbackIndex];

  const handlePrevFeedback = () => {
    if (feedbackCards.length <= 1) return;
    setFeedbackIndex((prev) => (prev - 1 + feedbackCards.length) % feedbackCards.length);
  };

  const handleNextFeedback = () => {
    if (feedbackCards.length <= 1) return;
    setFeedbackIndex((prev) => (prev + 1) % feedbackCards.length);
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={18} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Treino</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <Card>
            <Text style={styles.muted}>Carregando treino...</Text>
          </Card>
        ) : training ? (
          <>
            <Card style={styles.card}>
              <Text style={styles.trainingTitle}>{training.title || 'Treino'}</Text>
              {training.personal?.name ? (
                <Text style={styles.trainingMeta}>Personal: {training.personal.name}</Text>
              ) : null}
              {training.notes ? <Text style={styles.trainingNotes}>{training.notes}</Text> : null}
            </Card>

            {!isInspect && (
              <Card style={styles.card}>
                <View style={styles.timerRow}>
                  <View>
                    <Text style={styles.timerLabel}>Tempo de treino</Text>
                    <Text style={styles.timerValue}>{formatDuration(elapsedSeconds)}</Text>
                  </View>
                  <View style={styles.timerActions}>
                    {isRunning ? (
                      <AppButton title="Pausar" onPress={() => setIsRunning(false)} variant="outline" />
                    ) : (
                      <AppButton title="Iniciar" onPress={() => setIsRunning(true)} />
                    )}
                    <AppButton title="Concluir" onPress={handleComplete} variant="outline" />
                  </View>
                </View>

                <View style={styles.restRow}>
                  <Text style={styles.timerLabel}>Descanso (segundos)</Text>
                  <TextInput
                    style={styles.restInput}
                    value={String(restDuration)}
                    onChangeText={(value) => setRestDuration(parseRestSeconds(value))}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.timerActions}>
                  <AppButton title={restRunning ? formatDuration(restRemaining) : 'Iniciar descanso'} onPress={startRest} />
                  <AppButton title="Pausar" onPress={pauseRest} variant="outline" />
                  <AppButton title="Zerar" onPress={resetRest} variant="ghost" />
                </View>

                {restRemaining > 0 && (
                  <View style={styles.restNotice}>
                    <View>
                      <Text style={styles.restTitle}>Descanso em andamento</Text>
                      <Text style={styles.muted}>Aguarde ou pule para continuar o treino.</Text>
                    </View>
                    <AppButton title="Pular descanso" onPress={skipRest} variant="outline" />
                  </View>
                )}
              </Card>
            )}

            {sessionExercises.map((exercise, exerciseIdx) => (
              <Card key={`${exercise.name}-${exerciseIdx}`} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View>
                    <Text style={styles.exerciseTitle}>{exercise.name}</Text>
                    <View style={styles.exerciseMetaRow}>
                      <Text style={styles.badge}>{exercise.muscle}</Text>
                      <Text style={styles.badge}>{exercise.sets.length} series</Text>
                    </View>
                  </View>
                  {!isInspect && (
                    <AppButton
                      title={exercise.done ? 'Exercicio concluido' : 'Marcar exercicio'}
                      onPress={() => handleToggleExerciseDone(exerciseIdx)}
                      variant={exercise.done ? 'primary' : 'outline'}
                    />
                  )}
                </View>

                {exercise.done ? (
                  <View style={styles.exerciseDoneBox}>
                    <Text style={styles.muted}>Exercicio concluido. Detalhes minimizados.</Text>
                    <Text style={styles.muted}>
                      {exercise.sets.filter((set) => set.done).length}/{exercise.sets.length} series concluidas.
                    </Text>
                  </View>
                ) : (
                  exercise.sets.map((set, setIdx) => (
                    <View key={`set-${setIdx}`} style={styles.setCard}>
                      <View style={styles.setHeader}>
                        <Text style={styles.setTitle}>Serie {setIdx + 1}</Text>
                        {!isInspect && (
                          <AppButton
                            title={set.done ? 'Serie concluida' : 'Concluir serie'}
                            onPress={() => handleToggleSetDone(exerciseIdx, setIdx)}
                            variant={set.done ? 'primary' : 'outline'}
                          />
                        )}
                      </View>
                      <View style={styles.setRow}>
                        <TextInput
                          style={styles.setInput}
                          value={set.load}
                          onChangeText={(value) => updateSet(exerciseIdx, setIdx, { load: value })}
                          placeholder="Peso"
                          placeholderTextColor={theme.colors.textDim}
                          editable={!isInspect}
                        />
                        <TextInput
                          style={styles.setInput}
                          value={set.reps}
                          onChangeText={(value) => updateSet(exerciseIdx, setIdx, { reps: value })}
                          placeholder="Reps"
                          placeholderTextColor={theme.colors.textDim}
                          editable={!isInspect}
                        />
                      </View>
                      <View style={styles.setRow}>
                        <TextInput
                          style={styles.setInput}
                          value={set.rir}
                          onChangeText={(value) => updateSet(exerciseIdx, setIdx, { rir: value })}
                          placeholder="RIR"
                          placeholderTextColor={theme.colors.textDim}
                          editable={!isInspect}
                        />
                        <TextInput
                          style={styles.setInput}
                          value={set.rest}
                          onChangeText={(value) => updateSet(exerciseIdx, setIdx, { rest: value })}
                          placeholder="Descanso"
                          placeholderTextColor={theme.colors.textDim}
                          editable={!isInspect}
                        />
                      </View>
                      <TextInput
                        style={[styles.setInput, styles.setNotes]}
                        value={set.notes}
                        onChangeText={(value) => updateSet(exerciseIdx, setIdx, { notes: value })}
                        placeholder="Notas"
                        placeholderTextColor={theme.colors.textDim}
                        editable={!isInspect}
                      />
                    </View>
                  ))
                )}
              </Card>
            ))}
          </>
        ) : (
          <Card>
            <Text style={styles.muted}>
              {trainingBlocked ? trainingBlockedMessage || 'Treino do personal bloqueado.' : 'Treino nao encontrado.'}
            </Text>
          </Card>
        )}
      </ScrollView>

      <Modal visible={completionVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Treino concluido</Text>
            {completedTraining && completedSummary ? (
              <>
                <Text style={styles.modalMeta}>
                  Finalizado em {new Date(completedTraining.completedAt).toLocaleString('pt-BR')}
                </Text>
                <View style={styles.modalBadges}>
                  <Text style={styles.badge}>Tempo: {formatDuration(completedTraining.elapsedSeconds)}</Text>
                  <Text style={styles.badge}>
                    Series: {completedSummary.completedSets}/{completedSummary.totalSets}
                  </Text>
                  <Text style={styles.badge}>
                    Exercicios: {completedSummary.completedExercises}/{completedSummary.totalExercises}
                  </Text>
                </View>

                {activeFeedback && (
                  <View style={styles.feedbackCard}>
                    <View style={styles.feedbackHeader}>
                      <Text style={styles.feedbackTitle}>{activeFeedback.title}</Text>
                      <View style={styles.feedbackNav}>
                        <Pressable onPress={handlePrevFeedback}>
                          <Feather name="chevron-left" size={18} color={theme.colors.text} />
                        </Pressable>
                        <Text style={styles.feedbackIndex}>
                          {feedbackIndex + 1}/{feedbackCards.length}
                        </Text>
                        <Pressable onPress={handleNextFeedback}>
                          <Feather name="chevron-right" size={18} color={theme.colors.text} />
                        </Pressable>
                      </View>
                    </View>
                    {activeFeedback.type === 'text' ? (
                      <View>
                        {activeFeedback.subtitle ? (
                          <Text style={styles.feedbackText}>{activeFeedback.subtitle}</Text>
                        ) : null}
                        {activeFeedback.helper ? (
                          <Text style={styles.feedbackHelper}>{activeFeedback.helper}</Text>
                        ) : null}
                      </View>
                    ) : (
                      <View style={styles.radarWrap}>
                        {activeFeedback.summary ? (
                          <Text style={styles.feedbackText}>{activeFeedback.summary}</Text>
                        ) : null}
                        <Svg
                          width={220}
                          height={220}
                          viewBox={`0 0 ${activeFeedback.radar.size} ${activeFeedback.radar.size}`}
                        >
                          {activeFeedback.radar.rings.map((ring) => (
                            <Polygon
                              key={`ring-${ring.level}`}
                              points={ring.points}
                              fill="none"
                              stroke="rgba(255,255,255,0.15)"
                              strokeWidth={1}
                            />
                          ))}
                          {activeFeedback.radar.axes.map((axis, idx) => (
                            <Line
                              key={`axis-${idx}`}
                              x1={activeFeedback.radar.center}
                              y1={activeFeedback.radar.center}
                              x2={axis.x}
                              y2={axis.y}
                              stroke="rgba(255,255,255,0.15)"
                              strokeWidth={1}
                            />
                          ))}
                          <Polygon
                            points={activeFeedback.radar.polygon}
                            fill="rgba(251, 202, 21, 0.22)"
                            stroke="#facc15"
                            strokeWidth={2}
                          />
                          {activeFeedback.radar.axes.map((axis, idx) => {
                            const labelRadius = activeFeedback.radar.radius + 14;
                            const labelX = activeFeedback.radar.center + labelRadius * Math.cos(axis.angle);
                            const labelY = activeFeedback.radar.center + labelRadius * Math.sin(axis.angle);
                            const anchor =
                              Math.cos(axis.angle) > 0.2 ? 'start' : Math.cos(axis.angle) < -0.2 ? 'end' : 'middle';
                            return (
                              <SvgText
                                key={`label-${idx}`}
                                x={labelX}
                                y={labelY}
                                fill="rgba(255,255,255,0.7)"
                                fontSize="11"
                                textAnchor={anchor}
                                alignmentBaseline="middle"
                              >
                                {activeFeedback.focusItems[idx]?.group}
                              </SvgText>
                            );
                          })}
                        </Svg>
                      </View>
                    )}
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.feedbackText}>Treino registrado com sucesso.</Text>
            )}

            <View style={styles.modalActions}>
              <AppButton title="Fechar" onPress={() => setCompletionVisible(false)} variant="ghost" />
              <AppButton title="Voltar ao inicio" onPress={() => navigation.navigate('Home')} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 18
  },
  headerSpacer: {
    width: 36
  },
  card: {
    marginBottom: theme.spacing.lg
  },
  trainingTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 20
  },
  trainingMeta: {
    color: theme.colors.textDim,
    marginTop: 4
  },
  trainingNotes: {
    color: theme.colors.textDim,
    marginTop: theme.spacing.sm
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md
  },
  timerLabel: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.textDim
  },
  timerValue: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    fontSize: 22
  },
  timerActions: {
    flexDirection: 'row',
    gap: 10
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md
  },
  restInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.colors.text,
    backgroundColor: theme.colors.bgAlt
  },
  restNotice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md
  },
  restTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.accent
  },
  exerciseCard: {
    marginBottom: theme.spacing.lg
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm
  },
  exerciseTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 18
  },
  exerciseMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  badge: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: theme.colors.textDim,
    fontSize: 11
  },
  exerciseDoneBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md
  },
  setCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.bgAlt
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceAlt
  },
  setNotes: {
    marginBottom: 0
  },
  muted: {
    color: theme.colors.textDim
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
    width: '100%'
  },
  modalTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 18,
    color: theme.colors.text
  },
  modalMeta: {
    color: theme.colors.textDim,
    marginTop: 6
  },
  modalBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: theme.spacing.sm
  },
  feedbackCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm
  },
  feedbackTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  },
  feedbackNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  feedbackIndex: {
    color: theme.colors.textDim,
    fontSize: 12
  },
  feedbackText: {
    color: theme.colors.textDim
  },
  feedbackHelper: {
    color: theme.colors.textDim,
    fontSize: 12,
    marginTop: 6
  },
  radarWrap: {
    alignItems: 'center'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md
  }
});
