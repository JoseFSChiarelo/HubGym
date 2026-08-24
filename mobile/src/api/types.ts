export type Role = 'ADMIN' | 'PERSONAL' | 'ATHLETE';

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  name: string;
  personalId?: string | null;
  athleteId?: string | null;
  avatarUrl?: string | null;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type PersonalProfile = {
  id: string;
  userId: string;
  name: string;
  phone?: string | null;
  cpf?: string | null;
  cref?: string | null;
  user?: { email?: string | null };
};

export type AthleteProfile = {
  id: string;
  userId: string;
  name: string;
  age?: number | null;
  document?: string | null;
  phone?: string | null;
  cep?: string | null;
  paymentMethod?: string | null;
  avatarUrl?: string | null;
  blockTrainerTrainings?: boolean | null;
  user?: { email?: string | null };
  personal?: { id: string; name?: string | null };
  weeklySchedule?: Record<string, string | null> | null;
};

export type TrainingExerciseSet = {
  setType?: string;
  load?: string;
  reps?: string;
  rir?: string;
  rest?: string;
  notes?: string;
};

export type TrainingExercise = {
  name?: string;
  muscle?: string;
  sets?: TrainingExerciseSet[];
};

export type Training = {
  id: string;
  title: string;
  notes?: string | null;
  exercises?: TrainingExercise[];
  personal?: { id: string; name?: string | null };
  updatedAt?: string;
};

export type TodayTrainingResponse = {
  day: string;
  training: Training | null;
};

export type Notice = {
  id: string;
  title?: string | null;
  message: string;
  createdAt: string;
};

export type PaymentMethod = 'PIX' | 'DINHEIRO' | 'CARTAO';
export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE';

export type AthletePayment = {
  id: string;
  amount: number;
  status: PaymentStatus;
  dueDate: string;
  paidAt?: string | null;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonalPaymentSummary = {
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
};

export type AthleteListItem = {
  id: string;
  name: string;
  createdAt: string;
  age?: number | null;
  document?: string | null;
  phone?: string | null;
  cep?: string | null;
  paymentMethod?: PaymentMethod | null;
  blockTrainerTrainings?: boolean | null;
  user?: { email?: string | null };
};

export type FormFieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'MULTIPLE_CHOICE';

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
};

export type Form = {
  id: string;
  title: string;
  description?: string | null;
  personal?: { id: string; name: string };
  fields: FormField[];
};

export type FormRequest = {
  id: string;
  status: 'PENDING' | 'RESPONDED';
  createdAt: string;
  respondedAt?: string | null;
  form: Form;
  response?: { id: string; answers: Record<string, unknown>; createdAt: string } | null;
};

export type FormResponse = {
  id: string;
  createdAt: string;
  answers: Record<string, unknown>;
  athlete: { id: string; name: string; user?: { email?: string | null } };
  form: { id: string; title: string; fields?: FormField[] };
};
