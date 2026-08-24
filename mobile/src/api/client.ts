import {
  AthleteProfile,
  AthleteListItem,
  AthletePayment,
  Form,
  FormRequest,
  FormResponse,
  Notice,
  LoginResponse,
  PaymentMethod,
  PaymentStatus,
  PersonalProfile,
  PersonalPaymentSummary,
  TodayTrainingResponse,
  Training
} from './types';

export type ApiError = Error & {
  status?: number;
  code?: string;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const normalizeHeaders = (extra?: HeadersInit): Record<string, string> => {
  if (!extra) return {};
  if (extra instanceof Headers) {
    return Object.fromEntries(extra.entries());
  }
  if (Array.isArray(extra)) {
    return Object.fromEntries(extra);
  }
  return extra as Record<string, string>;
};

const buildHeaders = (token?: string, extra?: HeadersInit) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...normalizeHeaders(extra)
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const request = async <T>(path: string, options: RequestInit = {}, token?: string): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: buildHeaders(token, options.headers)
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(data?.message || 'Request failed') as ApiError;
    error.status = response.status;
    error.code = data?.code;
    throw error;
  }

  return data as T;
};

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  getAthleteMe: (token: string) => request<AthleteProfile>('/athlete/me', {}, token),
  updateAthleteMe: (token: string, payload: Partial<AthleteProfile>) =>
    request<AthleteProfile>(
      '/athlete/me',
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      },
      token
    ),
  updateAthletePassword: (token: string, payload: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>(
      '/athlete/me/password',
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      },
      token
    ),
  getAthleteTodayTraining: (token: string, day?: string) =>
    request<TodayTrainingResponse>(
      day ? `/athlete/today-training?day=${day}` : '/athlete/today-training',
      {},
      token
    ),
  getAthleteTrainings: (token: string) => request<Training[]>('/athlete/trainings', {}, token),
  getAthleteTraining: (token: string, id: string) => request<Training>(`/athlete/trainings/${id}`, {}, token),
  getAthleteNotices: (token: string, limit = 5) =>
    request<Notice[]>(`/athlete/notices?limit=${limit}`, {}, token),
  getAthleteForms: (token: string) => request<FormRequest[]>('/athlete/forms', {}, token),
  submitAthleteFormResponse: (token: string, requestId: string, answers: Record<string, unknown>) =>
    request<{ message: string }>(
      `/athlete/forms/${requestId}/responses`,
      {
        method: 'POST',
        body: JSON.stringify({ answers })
      },
      token
    ),
  getPersonalMe: (token: string) => request<PersonalProfile>('/personal/me', {}, token),
  updatePersonalMe: (token: string, payload: Partial<PersonalProfile>) =>
    request<PersonalProfile>(
      '/personal/me',
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      },
      token
    ),
  getPersonalAthletes: (token: string) => request<AthleteListItem[]>('/personal/athletes', {}, token),
  createPersonalAthlete: (
    token: string,
    payload: {
      email: string;
      password: string;
      name: string;
      age?: number;
      document?: string;
      phone?: string;
      cep?: string;
      paymentMethod?: PaymentMethod;
      blockTrainerTrainings?: boolean;
      paymentAmount?: number;
      paymentDueDate?: string;
    }
  ) =>
    request<AthleteListItem>(
      '/personal/athletes',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      token
    ),
  updatePersonalAthlete: (
    token: string,
    athleteId: string,
    payload: {
      name?: string;
      age?: number;
      document?: string;
      phone?: string;
      cep?: string;
      paymentMethod?: PaymentMethod;
    }
  ) =>
    request<AthleteListItem>(
      `/personal/athletes/${athleteId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      },
      token
    ),
  deletePersonalAthlete: (token: string, athleteId: string) =>
    request<void>(
      `/personal/athletes/${athleteId}`,
      {
        method: 'DELETE'
      },
      token
    ),
  getPersonalPaymentsSummary: (token: string) => request<PersonalPaymentSummary>('/personal/payments/summary', {}, token),
  getPersonalTrainings: (token: string, query?: string) =>
    request<Training[]>(
      query ? `/personal/trainings?q=${encodeURIComponent(query)}` : '/personal/trainings',
      {},
      token
    ),
  createPersonalTraining: (token: string, payload: Partial<Training> & { exercises: unknown }) =>
    request<Training>(
      '/personal/trainings',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      token
    ),
  updatePersonalTraining: (token: string, trainingId: string, payload: Partial<Training> & { exercises?: unknown }) =>
    request<Training>(
      `/personal/trainings/${trainingId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      },
      token
    ),
  deletePersonalTraining: (token: string, trainingId: string) =>
    request<void>(
      `/personal/trainings/${trainingId}`,
      {
        method: 'DELETE'
      },
      token
    ),
  assignPersonalTraining: (token: string, trainingId: string, athleteId: string | null) =>
    request<Training>(
      `/personal/trainings/${trainingId}/assign`,
      {
        method: 'PATCH',
        body: JSON.stringify({ athleteId })
      },
      token
    ),
  getPersonalSchedule: (token: string, athleteId: string) =>
    request<{ schedule: Record<string, string | null> }>(`/personal/athletes/${athleteId}/schedule`, {}, token),
  updatePersonalSchedule: (token: string, athleteId: string, schedule: Record<string, string | null>) =>
    request<{ schedule: Record<string, string | null> }>(
      `/personal/athletes/${athleteId}/schedule`,
      {
        method: 'PUT',
        body: JSON.stringify({ schedule })
      },
      token
    ),
  getPersonalPayments: (token: string, athleteId: string) =>
    request<AthletePayment[]>(`/personal/athletes/${athleteId}/payments`, {}, token),
  createPersonalPayment: (
    token: string,
    athleteId: string,
    payload: {
      amount: number;
      dueDate: string;
      status?: PaymentStatus;
      paymentMethod?: PaymentMethod | null;
      paidAt?: string | null;
      notes?: string | null;
    }
  ) =>
    request<AthletePayment>(
      `/personal/athletes/${athleteId}/payments`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      token
    ),
  updatePersonalPayment: (
    token: string,
    athleteId: string,
    paymentId: string,
    payload: {
      amount?: number;
      dueDate?: string;
      status?: PaymentStatus;
      paymentMethod?: PaymentMethod | null;
      paidAt?: string | null;
      notes?: string | null;
    }
  ) =>
    request<AthletePayment>(
      `/personal/athletes/${athleteId}/payments/${paymentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload)
      },
      token
    ),
  deletePersonalPayment: (token: string, athleteId: string, paymentId: string) =>
    request<void>(
      `/personal/athletes/${athleteId}/payments/${paymentId}`,
      {
        method: 'DELETE'
      },
      token
    ),
  updateTrainingBlock: (token: string, athleteId: string, blockTrainerTrainings: boolean) =>
    request<AthleteListItem>(
      `/personal/athletes/${athleteId}/training-block`,
      {
        method: 'PATCH',
        body: JSON.stringify({ blockTrainerTrainings })
      },
      token
    ),
  createPersonalForm: (
    token: string,
    payload: { title: string; description?: string; fields: Array<{ label: string; type: string; required?: boolean; options?: string[] }> }
  ) =>
    request<Form>(
      '/personal/forms',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      token
    ),
  assignPersonalForm: (token: string, formId: string, athleteId: string) =>
    request<FormRequest>(
      `/personal/forms/${formId}/assign`,
      {
        method: 'POST',
        body: JSON.stringify({ athleteId })
      },
      token
    ),
  getPersonalFormResponses: (token: string, limit = 50) =>
    request<FormResponse[]>(`/personal/forms/recent-responses?limit=${limit}`, {}, token),
  getPersonalForm: (token: string, formId: string) => request<Form>(`/personal/forms/${formId}`, {}, token),
  getPersonalNotices: (token: string, limit = 20) =>
    request<Notice[]>(`/personal/notices?limit=${limit}`, {}, token),
  createPersonalNotice: (token: string, payload: { title?: string; message: string }) =>
    request<Notice>(
      '/personal/notices',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      token
    )
};
