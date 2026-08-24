import AsyncStorage from '@react-native-async-storage/async-storage';

export type SessionSet = {
  setType?: string;
  load: string;
  reps: string;
  rir: string;
  rest: string;
  notes: string;
  done: boolean;
};

export type SessionExercise = {
  name: string;
  muscle: string;
  done: boolean;
  sets: SessionSet[];
};

export type CompletedTraining = {
  trainingId: string;
  completedAt: string;
  elapsedSeconds: number;
  restDuration: number;
  exercises: SessionExercise[];
};

export type StoredSession = {
  elapsedSeconds?: number;
  restDuration?: number;
  restRemaining?: number;
  restRunning?: boolean;
  exercises?: SessionExercise[];
};

export type StoredHistory = {
  restDuration?: number;
  exercises?: SessionExercise[];
};

const SESSION_PREFIX = 'athlete.training.session.';
const HISTORY_PREFIX = 'athlete.training.history.';
const COMPLETED_PREFIX = 'athlete.training.completed.';

const buildCompletedSessionKey = (trainingId: string, completedAt: string) =>
  `${COMPLETED_PREFIX}${trainingId}.${completedAt}`;

export const loadTrainingSession = async (trainingId: string) => {
  if (!trainingId) return null;
  const raw = await AsyncStorage.getItem(`${SESSION_PREFIX}${trainingId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
};

export const saveTrainingSession = async (trainingId: string, data: StoredSession) => {
  if (!trainingId) return;
  await AsyncStorage.setItem(`${SESSION_PREFIX}${trainingId}`, JSON.stringify(data));
};

export const clearTrainingSession = async (trainingId: string) => {
  if (!trainingId) return;
  await AsyncStorage.removeItem(`${SESSION_PREFIX}${trainingId}`);
};

export const loadTrainingHistory = async (trainingId: string) => {
  if (!trainingId) return null;
  const raw = await AsyncStorage.getItem(`${HISTORY_PREFIX}${trainingId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredHistory;
  } catch {
    return null;
  }
};

export const saveTrainingHistory = async (trainingId: string, data: StoredHistory) => {
  if (!trainingId) return;
  await AsyncStorage.setItem(`${HISTORY_PREFIX}${trainingId}`, JSON.stringify(data));
};

export const saveCompletedTraining = async (completed: CompletedTraining) => {
  if (!completed?.trainingId || !completed?.completedAt) return;
  const key = buildCompletedSessionKey(completed.trainingId, completed.completedAt);
  await AsyncStorage.setItem(key, JSON.stringify(completed));
};

export const loadCompletedTrainings = async (): Promise<CompletedTraining[]> => {
  const keys = await AsyncStorage.getAllKeys();
  const targetKeys = keys.filter((key) => key.startsWith(COMPLETED_PREFIX));
  if (targetKeys.length === 0) return [];

  const entries = await AsyncStorage.multiGet(targetKeys);
  const items: CompletedTraining[] = [];

  for (const [key, raw] of entries) {
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as CompletedTraining;
      if (!parsed?.completedAt) continue;
      const suffix = key.slice(COMPLETED_PREFIX.length);
      const hasTimestamp = suffix.includes('.');
      if (!hasTimestamp) {
        const trainingId = parsed.trainingId || suffix;
        const nextKey = buildCompletedSessionKey(trainingId, parsed.completedAt);
        if (nextKey !== key) {
          await AsyncStorage.setItem(nextKey, raw);
          await AsyncStorage.removeItem(key);
        }
      }
      items.push(parsed);
    } catch {
      // ignore invalid
    }
  }

  return items.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
};

export const loadLatestCompletedTraining = async (trainingId: string) => {
  if (!trainingId) return null;
  const sessions = (await loadCompletedTrainings()).filter((session) => session.trainingId === trainingId);
  if (sessions.length === 0) return null;
  return sessions.reduce((latest, current) =>
    new Date(current.completedAt).getTime() > new Date(latest.completedAt).getTime() ? current : latest
  );
};
