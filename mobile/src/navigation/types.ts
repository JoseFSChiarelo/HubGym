export type AuthStackParamList = {
  Login: undefined;
};

export type AthleteTabParamList = {
  Home: undefined;
  Trainings: undefined;
  Evolution: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type AthleteTrainingStackParamList = {
  TrainingList: undefined;
  TrainingSession: { id: string; title?: string; autoStart?: boolean; mode?: 'inspect' };
  TrainingEditor: { trainingId?: string };
};

export type PersonalTabParamList = {
  Home: undefined;
  Clients: undefined;
  Trainings: undefined;
  Library: undefined;
  Chat: undefined;
  Profile: undefined;
};
