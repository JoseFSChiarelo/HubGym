import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Collapse,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Tooltip,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import {
  FiArrowLeft,
  FiAward,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiInfo,
  FiPause,
  FiPlay,
  FiRefreshCw,
  FiSquare,
  FiStar
} from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';
import { findCustomTraining } from '../modules/athlete/customTrainings';
import { api } from '../services/api';

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

type Training = {
  id: string;
  title: string;
  notes?: string | null;
  exercises?: RoutineExercise[];
  updatedAt: string;
  personal?: { id: string; name?: string | null };
  origin?: 'CUSTOM';
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

type SessionExercise = {
  name: string;
  muscle: string;
  done: boolean;
  sets: SessionSet[];
};

type CompletedTraining = {
  trainingId: string;
  completedAt: string;
  elapsedSeconds: number;
  restDuration: number;
  exercises: SessionExercise[];
};

type FeedbackCard =
  | { id: string; type: 'text'; title: string; subtitle?: string; helper?: string }
  | { id: string; type: 'radar'; title: string; summary?: string; radar: RadarData; focusItems: FocusItem[] };

type FocusItem = { group: string; percent: number; value: number };

type RadarData = {
  size: number;
  center: number;
  radius: number;
  rings: Array<{ level: number; points: string }>;
  axes: Array<{ x: number; y: number; angle: number }>;
  polygon: string;
};

const COMPLETED_PREFIX = 'athlete.training.completed.';
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

const buildCompletedSessionKey = (trainingId: string, completedAt: string) =>
  `${COMPLETED_PREFIX}${trainingId}.${completedAt}`;

const loadCompletedTrainings = () => {
  const items: CompletedTraining[] = [];
  if (typeof window === 'undefined') return items;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key) keys.push(key);
  }

  keys.forEach((key) => {
    if (!key.startsWith(COMPLETED_PREFIX)) return;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as CompletedTraining;
      if (!parsed?.completedAt) return;
      const suffix = key.slice(COMPLETED_PREFIX.length);
      const hasTimestamp = suffix.includes('.');
      if (!hasTimestamp) {
        const trainingId = parsed.trainingId || suffix;
        const nextKey = buildCompletedSessionKey(trainingId, parsed.completedAt);
        if (nextKey !== key) {
          localStorage.setItem(nextKey, raw);
          localStorage.removeItem(key);
        }
      }
      items.push(parsed);
    } catch {
      // ignore broken entries
    }
  });

  return items;
};

const loadLatestCompletedTraining = (trainingId: string) => {
  const sessions = loadCompletedTrainings().filter((session) => session.trainingId === trainingId);
  if (sessions.length === 0) return null;
  return sessions.reduce((latest, current) =>
    new Date(current.completedAt).getTime() > new Date(latest.completedAt).getTime() ? current : latest
  );
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

const extractMaxLoads = (training: CompletedTraining) => {
  const map = new Map<string, number>();
  training.exercises.forEach((exercise) => {
    const name = exercise.name || 'Exercicio';
    exercise.sets.forEach((set) => {
      if (set.done === false) return;
      const loadValue = Number(set.load);
      if (!Number.isFinite(loadValue) || loadValue <= 0) return;
      const current = map.get(name) ?? 0;
      if (loadValue > current) map.set(name, loadValue);
    });
  });
  return map;
};

const setTypeLabels: Record<string, string> = {
  AQUECIMENTO: 'Aquecimento',
  RECONHECIMENTO: 'Reconhecimento',
  VALIDA: 'Valida',
  CLUSTER: 'Cluster',
  DROP: 'Drop'
};

const setTypeDescriptions: Record<string, string> = {
  AQUECIMENTO: 'Series leves para preparar o corpo e a tecnica antes das series principais.',
  RECONHECIMENTO: 'Series de ajuste para encontrar a carga ideal do dia.',
  VALIDA: 'Series de trabalho principal com foco no objetivo do treino.',
  CLUSTER: 'Serie quebrada em mini-blocos com micro pausas para manter a intensidade.',
  DROP: 'Serie com reducao de carga apos a falha para prolongar o esforco.'
};

const normalizeValue = (value?: string) => (value ?? '').toString();

const buildSession = (training: Training): SessionExercise[] => {
  const exercises = Array.isArray(training.exercises) ? training.exercises : [];
  return exercises.map((exercise) => ({
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

export const AthleteTrainingSessionPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(false);
  const [trainingBlocked, setTrainingBlocked] = useState(false);
  const [trainingBlockedMessage, setTrainingBlockedMessage] = useState('');

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
  const [completedTraining, setCompletedTraining] = useState<CompletedTraining | null>(null);
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const autoStartRef = useRef(false);
  const completionModal = useDisclosure();

  const sessionKey = useMemo(() => (id ? `athlete.training.session.${id}` : ''), [id]);
  const historyKey = useMemo(() => (id ? `athlete.training.history.${id}` : ''), [id]);
  const viewMode = (location.state as { autoStart?: boolean; mode?: 'inspect' } | null)?.mode;
  const isInspect = viewMode === 'inspect';
  const autoStart = !isInspect && Boolean((location.state as { autoStart?: boolean } | null)?.autoStart);

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

  const prHighlights = useMemo(() => {
    if (!completedTraining) return [];
    const previousTrainings = loadCompletedTrainings().filter(
      (session) => !(session.trainingId === completedTraining.trainingId && session.completedAt === completedTraining.completedAt)
    );

    const previousMax = new Map<string, number>();
    previousTrainings.forEach((session) => {
      const map = extractMaxLoads(session);
      map.forEach((value, name) => {
        const current = previousMax.get(name) ?? 0;
        if (value > current) previousMax.set(name, value);
      });
    });

    const currentMax = extractMaxLoads(completedTraining);
    const highlights: Array<{ name: string; value: number; prev: number }> = [];
    currentMax.forEach((value, name) => {
      const prev = previousMax.get(name) ?? 0;
      if (value > prev) highlights.push({ name, value, prev });
    });

    return highlights.sort((a, b) => b.value - a.value);
  }, [completedTraining]);

  const feedbackCards = useMemo<FeedbackCard[]>(() => {
    if (!completedTraining) return [];
    const cards: FeedbackCard[] = [];

    if (completedSummary) {
      cards.push({
        id: 'congrats',
        type: 'text',
        title: 'Parabens! 💪',
        subtitle: `Voce concluiu ${completedSummary.completedExercises} exercicios e ${completedSummary.completedSets} series.`,
        helper: 'Mantenha a consistencia para ver resultados ainda melhores.'
      });
    }

    if (prHighlights.length > 0) {
      const top = prHighlights[0];
      const extra = prHighlights.slice(1, 3).map((item) => `${item.name}: ${item.value} kg`).join(' • ');
      cards.push({
        id: 'pr',
        type: 'text',
        title: `Novo recorde em ${top.name}`,
        subtitle: `${top.prev > 0 ? `Antes: ${top.prev} kg` : 'Primeira marca registrada'} • Agora: ${top.value} kg`,
        helper: extra ? `Outros recordes: ${extra}` : undefined
      });
    }

    const focusTop = [...focusItems].sort((a, b) => b.value - a.value)[0];
    if (focusTop && focusTop.value > 0) {
      cards.push({
        id: 'focus',
        type: 'text',
        title: `Foco do dia: ${focusTop.group}`,
        subtitle: `${focusTop.percent}% das series do treino ficaram nesse grupo.`,
        helper: 'Use essa info para equilibrar os proximos treinos.'
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
        subtitle: 'Bom trabalho. Continue evoluindo.',
        helper: 'Cada treino conta para o seu progresso.'
      });
    }

    return cards;
  }, [completedSummary, completedTraining, focusItems, prHighlights, radarData]);

  const activeFeedback = feedbackCards[feedbackIndex];

  const handlePrevFeedback = () => {
    if (feedbackCards.length <= 1) return;
    setFeedbackIndex((prev) => (prev - 1 + feedbackCards.length) % feedbackCards.length);
  };

  const handleNextFeedback = () => {
    if (feedbackCards.length <= 1) return;
    setFeedbackIndex((prev) => (prev + 1) % feedbackCards.length);
  };

  useEffect(() => {
    setFeedbackIndex(0);
  }, [completedTraining?.completedAt]);

  useEffect(() => {
    if (!id) return;
    if (id.startsWith('custom-') && !user?.id) return;
    const loadTraining = async () => {
      setLoading(true);
      setTrainingBlocked(false);
      setTrainingBlockedMessage('');
      try {
        let trainingData: Training | null = null;
        const customTraining = user?.id ? findCustomTraining(user.id, id) : null;

        if (customTraining) {
          trainingData = {
            id: customTraining.id,
            title: customTraining.title,
            notes: customTraining.notes ?? null,
            exercises: customTraining.exercises,
            updatedAt: customTraining.updatedAt,
            origin: 'CUSTOM'
          };
        } else {
          const { data } = await api.get(`/athlete/trainings/${id}`);
          trainingData = data as Training;
        }

        if (!trainingData) {
          setTraining(null);
          toast({ title: 'Treino nao encontrado', status: 'error' });
          return;
        }

        setTraining(trainingData);

        const initialSession = buildSession(trainingData);
        const storedSession = sessionKey ? localStorage.getItem(sessionKey) : null;
        const storedHistory = historyKey ? localStorage.getItem(historyKey) : null;

        let parsedSession: {
          elapsedSeconds?: number;
          restDuration?: number;
          restRemaining?: number;
          restRunning?: boolean;
          exercises?: SessionExercise[];
        } | null = null;

        let parsedHistory: {
          restDuration?: number;
          exercises?: SessionExercise[];
        } | null = null;

        if (storedSession) {
          try {
            parsedSession = JSON.parse(storedSession);
          } catch {
            parsedSession = null;
          }
        }

        if (storedHistory) {
          try {
            parsedHistory = JSON.parse(storedHistory);
          } catch {
            parsedHistory = null;
          }
        }

        const historyExercises = Array.isArray(parsedHistory?.exercises) ? parsedHistory?.exercises : undefined;
        const historySession = applyHistory(initialSession, historyExercises);
        const storedExercises = parsedSession?.exercises;
        const hasStoredExercises = Array.isArray(storedExercises) && storedExercises.length === initialSession.length;

        if (isInspect) {
          setSessionExercises(historySession);
          setElapsedSeconds(0);
          setRestRemaining(0);
          setRestRunning(false);
          if (parsedHistory?.restDuration) {
            setRestDuration(parsedHistory.restDuration);
          }
          return;
        }

        if (autoStart) {
          const baseExercises = hasStoredExercises ? storedExercises : historySession;
          setSessionExercises(resetSession(baseExercises));
          setElapsedSeconds(0);
          setRestRemaining(0);
          setRestRunning(false);
          if (parsedSession?.restDuration) {
            setRestDuration(parsedSession.restDuration);
          } else if (parsedHistory?.restDuration) {
            setRestDuration(parsedHistory.restDuration);
          }
          return;
        }

        if (hasStoredExercises) {
          setSessionExercises(storedExercises);
          setElapsedSeconds(parsedSession?.elapsedSeconds ?? 0);
          setRestDuration(parsedSession?.restDuration ?? defaultRestSeconds);
          setRestRemaining(parsedSession?.restRemaining ?? 0);
          setRestRunning(parsedSession?.restRunning ?? false);
          return;
        }

        setSessionExercises(historySession);
        if (parsedHistory?.restDuration) {
          setRestDuration(parsedHistory.restDuration);
        }
      } catch (err: any) {
        const code = err?.response?.data?.code;
        const message = err?.response?.data?.message || 'Nao foi possivel carregar o treino.';
        if (code === 'TRAINING_BLOCKED') {
          setTraining(null);
          setSessionExercises([]);
          setCompletedTraining(null);
          setTrainingBlocked(true);
          setTrainingBlockedMessage(message || 'Treino do personal bloqueado. Pagamento pendente.');
          return;
        }
        toast({ title: 'Erro', description: message, status: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadTraining();
  }, [autoStart, historyKey, id, isInspect, sessionKey, toast, user?.id]);

  useEffect(() => {
    if (!id) return;
    const latest = loadLatestCompletedTraining(id);
    setCompletedTraining(latest);
  }, [id]);

  useEffect(() => {
    if (!autoStart || autoStartRef.current) return;
    setIsRunning(true);
    autoStartRef.current = true;
  }, [autoStart]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (!restRunning) return;
    if (restRemaining <= 0) {
      setRestRunning(false);
      return;
    }
    const interval = setInterval(() => {
      setRestRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [restRunning, restRemaining]);

  useEffect(() => {
    if (!sessionKey || isInspect) return;
    const payload = {
      elapsedSeconds,
      restDuration,
      restRemaining,
      restRunning,
      exercises: sessionExercises
    };
    localStorage.setItem(sessionKey, JSON.stringify(payload));
  }, [elapsedSeconds, isInspect, restDuration, restRemaining, restRunning, sessionExercises, sessionKey]);

  useEffect(() => {
    if (!historyKey || sessionExercises.length === 0) return;
    const historyPayload = {
      restDuration,
      exercises: resetSession(sessionExercises)
    };
    localStorage.setItem(historyKey, JSON.stringify(historyPayload));
  }, [historyKey, restDuration, sessionExercises]);

  const handleCompleteTraining = () => {
    if (!id) return;
    const completedAt = new Date().toISOString();
    const payload = {
      trainingId: id,
      completedAt,
      elapsedSeconds,
      restDuration,
      exercises: sessionExercises
    };
    const completionKey = buildCompletedSessionKey(id, completedAt);
    localStorage.setItem(completionKey, JSON.stringify(payload));
    setCompletedTraining(payload);
    if (sessionKey) {
      localStorage.removeItem(sessionKey);
    }
    setIsRunning(false);
    setRestRunning(false);
    setRestRemaining(0);
    toast({ title: 'Treino concluido', status: 'success' });
    completionModal.onOpen();
  };

  const handleCancelTraining = () => {
    if (sessionKey) {
      localStorage.removeItem(sessionKey);
    }
    setIsRunning(false);
    setRestRunning(false);
    setRestRemaining(0);
    navigate('/athlete/trainings');
  };

  const totalSets = sessionExercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const completedSets = sessionExercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.done).length, 0);
  const completedExercises = sessionExercises.filter((exercise) => exercise.done).length;

  const updateExercise = (exerciseIdx: number, patch: Partial<SessionExercise>) => {
    setSessionExercises((prev) =>
      prev.map((exercise, idx) => (idx === exerciseIdx ? { ...exercise, ...patch } : exercise))
    );
  };

  const updateSet = (exerciseIdx: number, setIdx: number, patch: Partial<SessionSet>) => {
    setSessionExercises((prev) =>
      prev.map((exercise, idx) => {
        if (idx !== exerciseIdx) return exercise;
        return {
          ...exercise,
          sets: exercise.sets.map((set, sIdx) => (sIdx === setIdx ? { ...set, ...patch } : set))
        };
      })
    );
  };

  const startRestWithSeconds = (seconds: number) => {
    if (seconds <= 0) return;
    setRestRemaining(seconds);
    setRestRunning(true);
  };

  const startRest = () => {
    if (restRemaining === 0) {
      setRestRemaining(restDuration);
    }
    setRestRunning(true);
  };

  const pauseRest = () => {
    setRestRunning(false);
  };

  const resetRest = () => {
    setRestRunning(false);
    setRestRemaining(0);
  };

  const handleToggleSetDone = (exerciseIdx: number, setIdx: number) => {
    const currentSet = sessionExercises[exerciseIdx]?.sets[setIdx];
    const willComplete = !currentSet?.done;
    const parsedRest = willComplete ? parseRestSeconds(currentSet?.rest) : 0;
    const fallbackRest = restDuration > 0 ? restDuration : defaultRestSeconds;
    const nextRestSeconds = willComplete ? (parsedRest > 0 ? parsedRest : fallbackRest) : 0;

    setSessionExercises((prev) =>
      prev.map((exercise, exIdx) => {
        if (exIdx !== exerciseIdx) return exercise;
        return {
          ...exercise,
          sets: exercise.sets.map((set, sIdx) => {
            if (sIdx !== setIdx) return set;
            return { ...set, done: !set.done };
          })
        };
      })
    );

    if (nextRestSeconds > 0) {
      startRestWithSeconds(nextRestSeconds);
    }
  };

  const restLabel = restRunning ? 'Descanso ativo' : restRemaining > 0 ? 'Continuar descanso' : 'Iniciar descanso';

  const skipRest = () => {
    setRestRunning(false);
    setRestRemaining(0);
  };

  return (
    <Box minH="100vh" bg="#0a0a0a" color="white" fontFamily="'Inter', system-ui, sans-serif">
      <Flex align="center" justify="space-between" px={[4, 8]} py="6" wrap="wrap" gap="3">
        <Box>
          <Heading size="lg">{training?.title || 'Treino'}</Heading>
          <Text color="gray.300">
            {training?.origin === 'CUSTOM'
              ? 'Treino criado por voce'
              : training?.personal?.name
                ? `Personal: ${training.personal.name}`
                : 'Treino do personal'}
          </Text>
          {training?.notes && (
            <Text color="gray.400" fontSize="sm" mt="1">
              {training.notes}
            </Text>
          )}
        </Box>
        <Button
          leftIcon={<FiArrowLeft />}
          variant="outline"
          borderColor="orange.400"
          color="orange.300"
          _hover={{ bg: 'orange.500', color: 'black' }}
          onClick={() => navigate('/athlete/trainings')}
        >
          Voltar
        </Button>
      </Flex>

      <Box px={[4, 8]} pb="10">
        {loading && (
          <Flex align="center" justify="center" py="10" color="gray.400">
            Carregando...
          </Flex>
        )}

        {!loading && training && (
          <Stack spacing="6">
            {!isInspect && (
              <Box
                bg="#141414"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="2xl"
                p="5"
                boxShadow="lg"
              >
                <Stack spacing="4">
                  <HStack justify="space-between" flexWrap="wrap">
                    <HStack spacing="3">
                      <Icon as={FiClock} color="orange.300" />
                      <Text fontWeight="bold">Tempo de treino</Text>
                    </HStack>
                    <HStack spacing="2" flexWrap="wrap">
                      <Badge colorScheme="orange" variant="subtle">
                        {completedExercises}/{sessionExercises.length} exercicios
                      </Badge>
                      <Badge colorScheme="yellow" variant="subtle">
                        {completedSets}/{totalSets} series
                      </Badge>
                    </HStack>
                  </HStack>

                  <HStack spacing="4" flexWrap="wrap">
                    <Text fontSize="3xl" fontWeight="bold">
                      {formatDuration(elapsedSeconds)}
                    </Text>
                    <HStack spacing="2">
                      <Button
                        leftIcon={<FiCheckCircle />}
                        colorScheme="orange"
                        variant="outline"
                        onClick={handleCompleteTraining}
                      >
                        Concluir treino
                      </Button>
                      <Button variant="ghost" colorScheme="red" onClick={handleCancelTraining}>
                        Cancelar treino
                      </Button>
                    </HStack>
                  </HStack>

                </Stack>
              </Box>
            )}

            {!isInspect && (
              <Box
                bg="#141414"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="2xl"
                p="5"
                boxShadow="lg"
              >
                <Stack spacing="4">
                  <HStack justify="space-between" flexWrap="wrap">
                    <HStack spacing="3">
                      <Icon as={FiSquare} color="orange.300" />
                      <Text fontWeight="bold">Cronometro de descanso</Text>
                    </HStack>
                    <Badge
                      colorScheme={restRemaining > 0 ? 'orange' : 'gray'}
                      variant="subtle"
                      fontSize="lg"
                      px="3"
                      py="1"
                    >
                      {formatDuration(restRemaining)}
                    </Badge>
                  </HStack>

                  <HStack spacing="3" flexWrap="wrap">
                    <Input
                      type="number"
                      min={10}
                      max={600}
                      bg="#0f0f0f"
                      borderColor="whiteAlpha.200"
                      value={restDuration}
                      onChange={(event) => setRestDuration(Number(event.target.value) || 0)}
                      maxW="140px"
                    />
                    <Text color="gray.400">segundos</Text>
                    <HStack spacing="2">
                      <Button
                        leftIcon={<FiPlay />}
                        colorScheme="orange"
                        bg="orange.400"
                        color="black"
                        _hover={{ bg: 'orange.500' }}
                        onClick={startRest}
                        isDisabled={restRunning}
                      >
                        {restLabel}
                      </Button>
                      <Button leftIcon={<FiPause />} variant="outline" colorScheme="orange" onClick={pauseRest}>
                        Pausar
                      </Button>
                      <Button leftIcon={<FiRefreshCw />} variant="ghost" colorScheme="orange" onClick={resetRest}>
                        Zerar
                      </Button>
                    </HStack>
                  </HStack>

                  {restRemaining > 0 && (
                    <Box bg="#1b1409" border="1px solid" borderColor="orange.400" borderRadius="xl" p="4">
                      <HStack justify="space-between" flexWrap="wrap" gap="3">
                        <Box>
                          <Text fontWeight="bold" color="orange.300">
                            Descanso em andamento
                          </Text>
                          <Text color="gray.300">Aguarde ou pule para continuar o treino.</Text>
                        </Box>
                        <Button variant="outline" colorScheme="orange" onClick={skipRest}>
                          Pular descanso
                        </Button>
                      </HStack>
                    </Box>
                  )}
                </Stack>
              </Box>
            )}

            <Stack spacing="4">
              {sessionExercises.map((exercise, exerciseIdx) => (
                <Box
                  key={`${exercise.name}-${exerciseIdx}`}
                  bg="#141414"
                  border="1px solid"
                  borderColor={exercise.done ? 'orange.400' : 'whiteAlpha.200'}
                  borderRadius="2xl"
                  p="5"
                  boxShadow="lg"
                >
                  <Stack spacing="4">
                    <Flex justify="space-between" align="center" wrap="wrap" gap="3">
                      <Box>
                        <HStack spacing="2" flexWrap="wrap">
                          <Text fontWeight="bold" fontSize="lg">
                            {exercise.name}
                          </Text>
                          <Badge colorScheme="yellow" variant="subtle">
                            {exercise.muscle}
                          </Badge>
                          <Badge colorScheme="purple" variant="subtle">
                            {exercise.sets.length} series
                          </Badge>
                        </HStack>
                      </Box>
                      {!isInspect && (
                        <Button
                          leftIcon={<FiCheckCircle />}
                          variant={exercise.done ? 'solid' : 'outline'}
                          colorScheme="orange"
                          onClick={() => updateExercise(exerciseIdx, { done: !exercise.done })}
                        >
                          {exercise.done ? 'Exercicio concluido' : 'Marcar exercicio'}
                        </Button>
                      )}
                    </Flex>

                    {exercise.done && (
                      <Box bg="#0f0f0f" borderRadius="lg" border="1px dashed" borderColor="whiteAlpha.200" p="4">
                        <Text fontSize="sm" color="gray.400">
                          Exercicio concluido. Detalhes minimizados.
                        </Text>
                        <Text fontSize="sm" color="gray.500" mt="1">
                          {exercise.sets.filter((set) => set.done).length}/{exercise.sets.length} series concluidas.
                        </Text>
                      </Box>
                    )}

                    <Collapse in={!exercise.done} animateOpacity>
                      <Stack spacing="3">
                        {exercise.sets.map((set, setIdx) => (
                          <Box key={`set-${setIdx}`} bg="#0f0f0f" borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200" p="4">
                            <Stack spacing="3">
                              <HStack justify="space-between" flexWrap="wrap">
                                <HStack spacing="2" flexWrap="wrap">
                                  <Badge colorScheme="orange" variant="subtle">
                                    Set {setIdx + 1}
                                  </Badge>
                                  {set.setType && (
                                    <Tooltip
                                      label={setTypeDescriptions[set.setType] || 'Tipo de serie do treino.'}
                                      hasArrow
                                      placement="top"
                                      openDelay={200}
                                     
                                    >
                                      <Badge colorScheme="gray" variant="subtle" cursor="help">
                                        {setTypeLabels[set.setType] || set.setType}
                                      </Badge>
                                    </Tooltip>
                                  )}
                              </HStack>
                              {!isInspect && (
                                <Button
                                  size="sm"
                                  variant={set.done ? 'solid' : 'outline'}
                                  colorScheme="orange"
                                  onClick={() => handleToggleSetDone(exerciseIdx, setIdx)}
                                >
                                  {set.done ? 'Serie concluida' : 'Concluir serie'}
                                </Button>
                              )}
                            </HStack>

                              <Flex gap="3" wrap="wrap">
                                <Box>
                                  <Tooltip label="Carga usada na série, em kg." hasArrow placement="top" openDelay={200}>
                                    <HStack spacing="1" cursor="help">
                                      <Text fontSize="sm" color="gray.400">
                                        Peso (kg)
                                      </Text>
                                      <Icon as={FiInfo} boxSize="3" color="gray.500" />
                                    </HStack>
                                  </Tooltip>
                                  <Input
                                    bg="#141414"
                                    borderColor="whiteAlpha.200"
                                    value={set.load}
                                    onChange={(event) => updateSet(exerciseIdx, setIdx, { load: event.target.value })}
                                    maxW="120px"
                                    isReadOnly={isInspect}
                                  />
                                </Box>
                                <Box>
                                  <Tooltip label="Número de repetições realizadas." hasArrow placement="top" openDelay={200}>
                                    <HStack spacing="1" cursor="help">
                                      <Text fontSize="sm" color="gray.400">
                                        Reps
                                      </Text>
                                      <Icon as={FiInfo} boxSize="3" color="gray.500" />
                                    </HStack>
                                  </Tooltip>
                                  <Input
                                    bg="#141414"
                                    borderColor="whiteAlpha.200"
                                    value={set.reps}
                                    onChange={(event) => updateSet(exerciseIdx, setIdx, { reps: event.target.value })}
                                    maxW="120px"
                                    isReadOnly={isInspect}
                                  />
                                </Box>
                                <Box>
                                  <Tooltip label="RIR = repetições que sobrariam ao final da série." hasArrow placement="top" openDelay={200}>
                                    <HStack spacing="1" cursor="help">
                                      <Text fontSize="sm" color="gray.400">
                                        RIR
                                      </Text>
                                      <Icon as={FiInfo} boxSize="3" color="gray.500" />
                                    </HStack>
                                  </Tooltip>
                                  <Input
                                    bg="#141414"
                                    borderColor="whiteAlpha.200"
                                    value={set.rir}
                                    onChange={(event) => updateSet(exerciseIdx, setIdx, { rir: event.target.value })}
                                    maxW="120px"
                                    isReadOnly={isInspect}
                                  />
                                </Box>
                                <Box>
                                  <Tooltip label="Tempo de descanso entre séries, em segundos." hasArrow placement="top" openDelay={200}>
                                    <HStack spacing="1" cursor="help">
                                      <Text fontSize="sm" color="gray.400">
                                        Descanso (seg)
                                      </Text>
                                      <Icon as={FiInfo} boxSize="3" color="gray.500" />
                                    </HStack>
                                  </Tooltip>
                                  <Input
                                    bg="#141414"
                                    borderColor="whiteAlpha.200"
                                    value={set.rest}
                                    onChange={(event) => updateSet(exerciseIdx, setIdx, { rest: event.target.value })}
                                    maxW="140px"
                                    isReadOnly={isInspect}
                                  />
                                </Box>
                                <Box flex="1" minW="220px">
                                  <Tooltip label="Observações livres sobre a série." hasArrow placement="top" openDelay={200}>
                                    <HStack spacing="1" cursor="help">
                                      <Text fontSize="sm" color="gray.400">
                                        Notas
                                      </Text>
                                      <Icon as={FiInfo} boxSize="3" color="gray.500" />
                                    </HStack>
                                  </Tooltip>
                                  <Input
                                    bg="#141414"
                                    borderColor="whiteAlpha.200"
                                    value={set.notes}
                                    onChange={(event) => updateSet(exerciseIdx, setIdx, { notes: event.target.value })}
                                    isReadOnly={isInspect}
                                  />
                                </Box>
                              </Flex>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    </Collapse>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Stack>
        )}

        {!loading && !training && (
          <Box
            bg="#141414"
            borderRadius="lg"
            border="1px dashed"
            borderColor={trainingBlocked ? 'orange.300' : 'gray.600'}
            p="6"
            textAlign="center"
            color={trainingBlocked ? 'orange.200' : 'gray.400'}
          >
            {trainingBlocked
              ? trainingBlockedMessage || 'Treino do personal bloqueado. Pagamento pendente.'
              : 'Treino nao encontrado.'}
          </Box>
        )}
      </Box>

      <Modal isOpen={completionModal.isOpen} onClose={completionModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="#111111" color="white" border="1px solid" borderColor="whiteAlpha.200">
          <ModalHeader>Treino concluido</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {completedTraining && completedSummary ? (
              <Stack spacing="4">
                <Text color="gray.300" fontSize="sm">
                  Finalizado em {new Date(completedTraining.completedAt).toLocaleString('pt-BR')}
                </Text>
                <HStack spacing="2" flexWrap="wrap">
                  <Badge colorScheme="green" variant="subtle">
                    Tempo: {formatDuration(completedTraining.elapsedSeconds)}
                  </Badge>
                  <Badge colorScheme="green" variant="subtle">
                    Series: {completedSummary.completedSets}/{completedSummary.totalSets}
                  </Badge>
                  <Badge colorScheme="green" variant="subtle">
                    Exercicios: {completedSummary.completedExercises}/{completedSummary.totalExercises}
                  </Badge>
                </HStack>

                {activeFeedback && (
                  <Box bg="#0f0f10" border="1px solid" borderColor="whiteAlpha.200" borderRadius="xl" p="4">
                    <Flex align="center" justify="space-between" gap="3" mb="3" flexWrap="wrap">
                      <HStack spacing="2">
                        <Icon as={activeFeedback.type === 'radar' ? FiStar : FiAward} color="orange.300" />
                        <Text fontWeight="bold">{activeFeedback.title}</Text>
                      </HStack>
                      <HStack spacing="2">
                        <IconButton
                          aria-label="Feedback anterior"
                          size="sm"
                          variant="ghost"
                          icon={<FiChevronLeft />}
                          onClick={handlePrevFeedback}
                          isDisabled={feedbackCards.length <= 1}
                        />
                        <Text fontSize="xs" color="gray.500">
                          {feedbackIndex + 1}/{feedbackCards.length}
                        </Text>
                        <IconButton
                          aria-label="Proximo feedback"
                          size="sm"
                          variant="ghost"
                          icon={<FiChevronRight />}
                          onClick={handleNextFeedback}
                          isDisabled={feedbackCards.length <= 1}
                        />
                      </HStack>
                    </Flex>

                    {activeFeedback.type === 'text' ? (
                      <Stack spacing="2">
                        {activeFeedback.subtitle && (
                          <Text color="gray.200" fontSize="sm">
                            {activeFeedback.subtitle}
                          </Text>
                        )}
                        {activeFeedback.helper && (
                          <Text color="gray.500" fontSize="xs">
                            {activeFeedback.helper}
                          </Text>
                        )}
                      </Stack>
                    ) : (
                      <Stack spacing="3" align="center">
                        {activeFeedback.summary && (
                          <Text color="gray.400" fontSize="sm">
                            {activeFeedback.summary}
                          </Text>
                        )}
                        <Box
                          as="svg"
                          width="220px"
                          height="220px"
                          viewBox={`0 0 ${activeFeedback.radar.size} ${activeFeedback.radar.size}`}
                        >
                          {activeFeedback.radar.rings.map((ring) => (
                            <polygon
                              key={`ring-${ring.level}`}
                              points={ring.points}
                              fill="none"
                              stroke="rgba(255,255,255,0.15)"
                              strokeWidth="1"
                            />
                          ))}
                          {activeFeedback.radar.axes.map((axis, idx) => (
                            <line
                              key={`axis-${idx}`}
                              x1={activeFeedback.radar.center}
                              y1={activeFeedback.radar.center}
                              x2={axis.x}
                              y2={axis.y}
                              stroke="rgba(255,255,255,0.15)"
                              strokeWidth="1"
                            />
                          ))}
                          <polygon
                            points={activeFeedback.radar.polygon}
                            fill="rgba(251, 202, 21, 0.22)"
                            stroke="#facc15"
                            strokeWidth="2"
                          />
                          {activeFeedback.radar.axes.map((axis, idx) => {
                            const labelRadius = activeFeedback.radar.radius + 14;
                            const labelX = activeFeedback.radar.center + labelRadius * Math.cos(axis.angle);
                            const labelY = activeFeedback.radar.center + labelRadius * Math.sin(axis.angle);
                            const anchor =
                              Math.cos(axis.angle) > 0.2 ? 'start' : Math.cos(axis.angle) < -0.2 ? 'end' : 'middle';
                            return (
                              <text
                                key={`label-${idx}`}
                                x={labelX}
                                y={labelY}
                                fill="rgba(255,255,255,0.7)"
                                fontSize="11"
                                textAnchor={anchor}
                                dominantBaseline="middle"
                              >
                                {activeFeedback.focusItems[idx]?.group}
                              </text>
                            );
                          })}
                        </Box>
                      </Stack>
                    )}
                  </Box>
                )}
              </Stack>
            ) : (
              <Text color="gray.300">Treino registrado com sucesso.</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={completionModal.onClose}>
              Fechar
            </Button>
            <Button
              colorScheme="orange"
              bg="orange.400"
              color="black"
              _hover={{ bg: 'orange.500' }}
              onClick={() => navigate('/athlete')}
            >
              Voltar ao inicio
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};
