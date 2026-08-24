import AsyncStorage from '@react-native-async-storage/async-storage';

export type CustomSetType = 'AQUECIMENTO' | 'RECONHECIMENTO' | 'VALIDA' | 'CLUSTER' | 'DROP';

export type CustomSet = {
  setType: CustomSetType;
  load: string;
  reps: string;
  rir: string;
  rest: string;
  notes?: string;
};

export type CustomExercise = {
  name: string;
  muscle: string;
  sets: CustomSet[];
};

export type CustomTraining = {
  id: string;
  title: string;
  notes?: string | null;
  exercises: CustomExercise[];
  createdAt: string;
  updatedAt: string;
};

export const MAX_CUSTOM_TRAININGS = 2;

const storageKey = (userId: string) => `hubgym.athlete.customTrainings.v1.${userId}`;

export const loadCustomTrainings = async (userId: string): Promise<CustomTraining[]> => {
  if (!userId) return [];
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomTraining[]) : [];
  } catch {
    return [];
  }
};

export const saveCustomTrainings = async (userId: string, trainings: CustomTraining[]) => {
  if (!userId) return;
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(trainings));
};

export const generateCustomTrainingId = () => `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const findCustomTraining = async (userId: string, id: string) => {
  const trainings = await loadCustomTrainings(userId);
  return trainings.find((training) => training.id === id) || null;
};
