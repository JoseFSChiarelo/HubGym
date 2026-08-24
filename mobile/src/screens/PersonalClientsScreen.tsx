import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { api } from '../api/client';
import { AthleteListItem, AthletePayment, PaymentMethod, PaymentStatus, Training } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { theme } from '../theme';

type FieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'MULTIPLE_CHOICE';
type WeekDayKey = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

type CreateAthleteForm = {
  name: string;
  age: string;
  email: string;
  password: string;
  document: string;
  phone: string;
  cep: string;
  paymentMethod: PaymentMethod;
  paymentAmount: string;
  paymentDueDate: string;
  blockTrainerTrainings: boolean;
};

type EditAthleteForm = {
  name: string;
  age: string;
  document: string;
  phone: string;
  cep: string;
  paymentMethod: PaymentMethod;
};

type FormFieldDraft = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string;
};

type PaymentForm = {
  amount: string;
  dueDate: string;
  status: PaymentStatus;
  paymentMethod: '' | PaymentMethod;
  paidAt: string;
  notes: string;
};

type EditPaymentForm = {
  amount: string;
  dueDate: string;
};

const paymentMethods: PaymentMethod[] = ['PIX', 'DINHEIRO', 'CARTAO'];
const paymentStatuses: PaymentStatus[] = ['PENDING', 'PAID', 'OVERDUE'];

const weekDays: Array<{ key: WeekDayKey; label: string }> = [
  { key: 'MONDAY', label: 'Segunda-feira' },
  { key: 'TUESDAY', label: 'Terca-feira' },
  { key: 'WEDNESDAY', label: 'Quarta-feira' },
  { key: 'THURSDAY', label: 'Quinta-feira' },
  { key: 'FRIDAY', label: 'Sexta-feira' },
  { key: 'SATURDAY', label: 'Sabado' },
  { key: 'SUNDAY', label: 'Domingo' }
];

const emptySchedule = (): Record<WeekDayKey, string> =>
  weekDays.reduce((acc, day) => {
    acc[day.key] = '';
    return acc;
  }, {} as Record<WeekDayKey, string>);

const makeDefaultFields = (): FormFieldDraft[] => [
  { id: 'goal', label: 'Objetivo especifico', type: 'TEXT', required: true },
  { id: 'injuries', label: 'Lesoes/observacoes', type: 'TEXT', required: false }
];

const defaultPaymentForm = (): PaymentForm => ({
  amount: '',
  dueDate: '',
  status: 'PENDING',
  paymentMethod: '',
  paidAt: '',
  notes: ''
});

const formatCurrencyBRL = (value: number) => {
  const rounded = Math.round((value || 0) * 100) / 100;
  const [integer, decimal = '00'] = rounded.toFixed(2).split('.');
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${formatted},${decimal}`;
};

const formatShortDate = (value?: string | null) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString('pt-BR');
};

const buildToday = () => new Date().toISOString().slice(0, 10);

const statusLabel: Record<PaymentStatus, string> = {
  PAID: 'Pago',
  PENDING: 'Pendente',
  OVERDUE: 'Atrasado'
};

export const PersonalClientsScreen = () => {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [paymentsModalVisible, setPaymentsModalVisible] = useState(false);
  const [trainingPickerVisible, setTrainingPickerVisible] = useState(false);
  const [editPaymentModalVisible, setEditPaymentModalVisible] = useState(false);

  const [createForm, setCreateForm] = useState<CreateAthleteForm>({
    name: '',
    age: '',
    email: '',
    password: '',
    document: '',
    phone: '',
    cep: '',
    paymentMethod: 'PIX',
    paymentAmount: '',
    paymentDueDate: '',
    blockTrainerTrainings: false
  });
  const [savingAthlete, setSavingAthlete] = useState(false);

  const [editingAthlete, setEditingAthlete] = useState<AthleteListItem | null>(null);
  const [editForm, setEditForm] = useState<EditAthleteForm>({
    name: '',
    age: '',
    document: '',
    phone: '',
    cep: '',
    paymentMethod: 'PIX'
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingAthlete, setDeletingAthlete] = useState<AthleteListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formAthlete, setFormAthlete] = useState<AthleteListItem | null>(null);
  const [formTitle, setFormTitle] = useState('Questionario do aluno');
  const [formDescription, setFormDescription] = useState(
    'Responda com atencao. Isso ajuda a personalizar seu acompanhamento.'
  );
  const [formFields, setFormFields] = useState<FormFieldDraft[]>(makeDefaultFields());
  const [sendingForm, setSendingForm] = useState(false);

  const [scheduleAthlete, setScheduleAthlete] = useState<AthleteListItem | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<Record<WeekDayKey, string>>(emptySchedule());
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  const [activeScheduleDay, setActiveScheduleDay] = useState<WeekDayKey | null>(null);

  const [paymentsAthlete, setPaymentsAthlete] = useState<AthleteListItem | null>(null);
  const [payments, setPayments] = useState<AthletePayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(defaultPaymentForm());
  const [blockTrainerTrainings, setBlockTrainerTrainings] = useState(false);
  const [savingTrainingBlock, setSavingTrainingBlock] = useState(false);
  const [editingPayment, setEditingPayment] = useState<AthletePayment | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState<EditPaymentForm>({ amount: '', dueDate: '' });
  const [savingEditPayment, setSavingEditPayment] = useState(false);

  const loadAthletes = async () => {
    if (!token) return;
    setLoadingAthletes(true);
    try {
      const data = await api.getPersonalAthletes(token);
      setAthletes(data || []);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar os alunos.');
    } finally {
      setLoadingAthletes(false);
    }
  };

  useEffect(() => {
    loadAthletes();
  }, [token]);

  const filteredAthletes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter((a) => {
      const name = (a.name || '').toLowerCase();
      const email = (a.user?.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [athletes, search]);

  const openCreate = () => {
    setCreateForm({
      name: '',
      age: '',
      email: '',
      password: '',
      document: '',
      phone: '',
      cep: '',
      paymentMethod: 'PIX',
      paymentAmount: '',
      paymentDueDate: '',
      blockTrainerTrainings: false
    });
    setCreateModalVisible(true);
  };

  const closeCreate = () => {
    setCreateModalVisible(false);
    setSavingAthlete(false);
  };

  const handleCreateAthlete = async () => {
    if (!token) return;
    if (!createForm.name || !createForm.email || !createForm.password) {
      Alert.alert('Atencao', 'Preencha nome, email e senha.');
      return;
    }

    const hasPaymentAmount = createForm.paymentAmount.trim() !== '';
    const hasPaymentDueDate = Boolean(createForm.paymentDueDate);
    if (hasPaymentAmount || hasPaymentDueDate) {
      if (!hasPaymentAmount || !hasPaymentDueDate) {
        Alert.alert('Atencao', 'Informe valor e vencimento do pagamento.');
        return;
      }
      const amountValue = Number(createForm.paymentAmount.replace(',', '.'));
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        Alert.alert('Atencao', 'Valor do pagamento invalido.');
        return;
      }
    }

    setSavingAthlete(true);
    try {
      const payload: Record<string, unknown> = {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        age: createForm.age ? Number(createForm.age) : undefined,
        document: createForm.document || undefined,
        phone: createForm.phone || undefined,
        cep: createForm.cep || undefined,
        paymentMethod: createForm.paymentMethod || undefined,
        blockTrainerTrainings: createForm.blockTrainerTrainings
      };

      if (hasPaymentAmount && hasPaymentDueDate) {
        payload.paymentAmount = Number(createForm.paymentAmount.replace(',', '.'));
        payload.paymentDueDate = createForm.paymentDueDate;
      }

      await api.createPersonalAthlete(token, payload as any);
      Alert.alert('Sucesso', 'Aluno criado.');
      closeCreate();
      await loadAthletes();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel criar o aluno.');
    } finally {
      setSavingAthlete(false);
    }
  };

  const openEdit = (athlete: AthleteListItem) => {
    setEditingAthlete(athlete);
    setEditForm({
      name: athlete.name || '',
      age: athlete.age != null ? String(athlete.age) : '',
      document: athlete.document || '',
      phone: athlete.phone || '',
      cep: athlete.cep || '',
      paymentMethod: athlete.paymentMethod || 'PIX'
    });
    setEditModalVisible(true);
  };

  const closeEdit = () => {
    setEditModalVisible(false);
    setEditingAthlete(null);
  };

  const handleUpdateAthlete = async () => {
    if (!token || !editingAthlete) return;
    if (!editForm.name.trim()) {
      Alert.alert('Atencao', 'Informe o nome do aluno.');
      return;
    }

    setSavingEdit(true);
    try {
      await api.updatePersonalAthlete(token, editingAthlete.id, {
        name: editForm.name.trim(),
        age: editForm.age ? Number(editForm.age) : undefined,
        document: editForm.document || undefined,
        phone: editForm.phone || undefined,
        cep: editForm.cep || undefined,
        paymentMethod: editForm.paymentMethod
      });
      Alert.alert('Sucesso', 'Cadastro atualizado.');
      closeEdit();
      await loadAthletes();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel atualizar o aluno.');
    } finally {
      setSavingEdit(false);
    }
  };

  const openDelete = (athlete: AthleteListItem) => {
    setDeletingAthlete(athlete);
    setDeleteModalVisible(true);
  };

  const closeDelete = () => {
    setDeletingAthlete(null);
    setDeleteModalVisible(false);
  };

  const handleDeleteAthlete = async () => {
    if (!token || !deletingAthlete) return;
    setDeleting(true);
    try {
      await api.deletePersonalAthlete(token, deletingAthlete.id);
      Alert.alert('Sucesso', 'Aluno removido.');
      closeDelete();
      await loadAthletes();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel excluir o aluno.');
    } finally {
      setDeleting(false);
    }
  };

  const openFormModal = (athlete: AthleteListItem) => {
    setFormAthlete(athlete);
    setFormTitle('Questionario do aluno');
    setFormDescription('Responda com atencao. Isso ajuda a personalizar seu acompanhamento.');
    setFormFields(makeDefaultFields());
    setFormModalVisible(true);
  };

  const closeFormModal = () => {
    setFormModalVisible(false);
    setFormAthlete(null);
  };

  const handleSendForm = async () => {
    if (!token || !formAthlete) return;
    if (!formTitle.trim()) {
      Alert.alert('Atencao', 'Informe um titulo para o formulario.');
      return;
    }

    const fieldsPayload = formFields.map((field) => {
      const options =
        field.type === 'MULTIPLE_CHOICE' && field.options
          ? field.options
              .split(',')
              .map((opt) => opt.trim())
              .filter(Boolean)
          : undefined;
      return {
        label: field.label.trim() || 'Pergunta',
        type: field.type,
        required: field.required,
        options
      };
    });

    setSendingForm(true);
    try {
      const form = await api.createPersonalForm(token, {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        fields: fieldsPayload
      });
      await api.assignPersonalForm(token, form.id, formAthlete.id);
      Alert.alert('Sucesso', 'Formulario enviado ao aluno.');
      closeFormModal();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel enviar o formulario.');
    } finally {
      setSendingForm(false);
    }
  };

  const addField = () => {
    setFormFields((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length + 1}`, label: 'Nova pergunta', type: 'TEXT', required: true }
    ]);
  };

  const removeField = (id: string) => {
    setFormFields((prev) => prev.filter((field) => field.id !== id));
  };

  const handleFieldChange = (id: string, key: 'label' | 'type' | 'required' | 'options', value: string | boolean) => {
    setFormFields((prev) =>
      prev.map((field) => {
        if (field.id !== id) return field;
        if (key === 'type' && value !== 'MULTIPLE_CHOICE') return { ...field, type: value as FieldType, options: undefined };
        return { ...field, [key]: value } as FormFieldDraft;
      })
    );
  };

  const loadTrainings = async () => {
    if (!token) return;
    setLoadingTrainings(true);
    try {
      const data = await api.getPersonalTrainings(token);
      setTrainings(data || []);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar os treinos.');
    } finally {
      setLoadingTrainings(false);
    }
  };

  const loadSchedule = async (athleteId: string) => {
    if (!token) return;
    setLoadingSchedule(true);
    try {
      const data = await api.getPersonalSchedule(token, athleteId);
      const schedule = (data?.schedule || {}) as Partial<Record<WeekDayKey, string | null>>;
      const next = emptySchedule();
      weekDays.forEach((day) => {
        next[day.key] = schedule[day.key] || '';
      });
      setScheduleDraft(next);
    } catch {
      setScheduleDraft(emptySchedule());
      Alert.alert('Erro', 'Nao foi possivel carregar o cronograma.');
    } finally {
      setLoadingSchedule(false);
    }
  };

  const openSchedule = async (athlete: AthleteListItem) => {
    setScheduleAthlete(athlete);
    setScheduleModalVisible(true);
    await Promise.all([loadTrainings(), loadSchedule(athlete.id)]);
  };

  const closeSchedule = () => {
    setScheduleAthlete(null);
    setScheduleModalVisible(false);
    setScheduleDraft(emptySchedule());
  };

  const handleSaveSchedule = async () => {
    if (!token || !scheduleAthlete) return;
    setSavingSchedule(true);
    try {
      const payload = weekDays.reduce<Record<WeekDayKey, string | null>>((acc, day) => {
        const value = scheduleDraft[day.key];
        acc[day.key] = value ? value : null;
        return acc;
      }, {} as Record<WeekDayKey, string | null>);

      await api.updatePersonalSchedule(token, scheduleAthlete.id, payload);
      Alert.alert('Sucesso', 'Cronograma salvo.');
      closeSchedule();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel salvar o cronograma.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const resolveTrainingTitle = (trainingId?: string) => {
    if (!trainingId) return 'Sem treino';
    const training = trainings.find((item) => item.id === trainingId);
    return training?.title || 'Treino nao encontrado';
  };

  const openTrainingPicker = (dayKey: WeekDayKey) => {
    setActiveScheduleDay(dayKey);
    setTrainingPickerVisible(true);
  };

  const handleSelectTraining = (trainingId: string) => {
    if (!activeScheduleDay) return;
    setScheduleDraft((prev) => ({ ...prev, [activeScheduleDay]: trainingId }));
    setTrainingPickerVisible(false);
    setActiveScheduleDay(null);
  };

  const closeTrainingPicker = () => {
    setTrainingPickerVisible(false);
    setActiveScheduleDay(null);
  };

  const loadPayments = async (athleteId: string) => {
    if (!token) return;
    setLoadingPayments(true);
    try {
      const data = await api.getPersonalPayments(token, athleteId);
      setPayments(data || []);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar os pagamentos.');
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const openPayments = async (athlete: AthleteListItem) => {
    setPaymentsAthlete(athlete);
    setBlockTrainerTrainings(Boolean(athlete.blockTrainerTrainings));
    setPaymentForm({ ...defaultPaymentForm(), dueDate: buildToday() });
    setPaymentsModalVisible(true);
    await loadPayments(athlete.id);
  };

  const closePayments = () => {
    setPaymentsAthlete(null);
    setPayments([]);
    setUpdatingPaymentId(null);
    setDeletingPaymentId(null);
    setPaymentForm(defaultPaymentForm());
    setBlockTrainerTrainings(false);
    setSavingTrainingBlock(false);
    setPaymentsModalVisible(false);
  };

  const handleTrainingBlockToggle = async (nextValue: boolean) => {
    if (!token || !paymentsAthlete) return;
    const previousValue = blockTrainerTrainings;
    setBlockTrainerTrainings(nextValue);
    setSavingTrainingBlock(true);
    try {
      const data = await api.updateTrainingBlock(token, paymentsAthlete.id, nextValue);
      setPaymentsAthlete((prev) => (prev ? { ...prev, blockTrainerTrainings: data?.blockTrainerTrainings } : prev));
      setAthletes((prev) =>
        prev.map((athlete) =>
          athlete.id === paymentsAthlete.id
            ? { ...athlete, blockTrainerTrainings: data?.blockTrainerTrainings }
            : athlete
        )
      );
      Alert.alert('Sucesso', nextValue ? 'Bloqueio ativado.' : 'Bloqueio desativado.');
    } catch (err: any) {
      setBlockTrainerTrainings(previousValue);
      Alert.alert('Erro', err?.message || 'Nao foi possivel atualizar o bloqueio.');
    } finally {
      setSavingTrainingBlock(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!token || !paymentsAthlete) return;
    if (!paymentForm.amount || !paymentForm.dueDate) {
      Alert.alert('Atencao', 'Informe valor e vencimento.');
      return;
    }

    const amountValue = Number(paymentForm.amount.replace(',', '.'));
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      Alert.alert('Atencao', 'Valor invalido.');
      return;
    }

    setSavingPayment(true);
    try {
      const payload: Record<string, unknown> = {
        amount: amountValue,
        dueDate: paymentForm.dueDate,
        status: paymentForm.status
      };

      if (paymentForm.paymentMethod) payload.paymentMethod = paymentForm.paymentMethod;
      if (paymentForm.status === 'PAID' && paymentForm.paidAt) payload.paidAt = paymentForm.paidAt;
      if (paymentForm.notes.trim()) payload.notes = paymentForm.notes.trim();

      await api.createPersonalPayment(token, paymentsAthlete.id, payload as any);
      Alert.alert('Sucesso', 'Pagamento criado.');
      setPaymentForm({ ...defaultPaymentForm(), dueDate: buildToday() });
      await loadPayments(paymentsAthlete.id);
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel criar o pagamento.');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    if (!token || !paymentsAthlete) return;
    setUpdatingPaymentId(paymentId);
    try {
      await api.updatePersonalPayment(token, paymentsAthlete.id, paymentId, { status: 'PAID' });
      await loadPayments(paymentsAthlete.id);
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel atualizar o pagamento.');
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!token || !paymentsAthlete) return;
    setDeletingPaymentId(paymentId);
    try {
      await api.deletePersonalPayment(token, paymentsAthlete.id, paymentId);
      await loadPayments(paymentsAthlete.id);
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel excluir o pagamento.');
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const openEditPayment = (payment: AthletePayment) => {
    setEditingPayment(payment);
    setEditPaymentForm({
      amount: payment.amount ? String(payment.amount) : '',
      dueDate: payment.dueDate ? payment.dueDate.slice(0, 10) : ''
    });
    setEditPaymentModalVisible(true);
  };

  const closeEditPayment = () => {
    setEditingPayment(null);
    setEditPaymentForm({ amount: '', dueDate: '' });
    setEditPaymentModalVisible(false);
  };

  const handleSaveEditPayment = async () => {
    if (!token || !paymentsAthlete || !editingPayment) return;
    if (!editPaymentForm.amount || !editPaymentForm.dueDate) {
      Alert.alert('Atencao', 'Informe valor e vencimento.');
      return;
    }
    const amountValue = Number(editPaymentForm.amount.replace(',', '.'));
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      Alert.alert('Atencao', 'Valor invalido.');
      return;
    }

    setSavingEditPayment(true);
    try {
      await api.updatePersonalPayment(token, paymentsAthlete.id, editingPayment.id, {
        amount: amountValue,
        dueDate: editPaymentForm.dueDate
      });
      Alert.alert('Sucesso', 'Pagamento atualizado.');
      closeEditPayment();
      await loadPayments(paymentsAthlete.id);
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel atualizar o pagamento.');
    } finally {
      setSavingEditPayment(false);
    }
  };

  const ActionButton = ({
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
        styles.actionButton,
        variant === 'outline' && styles.actionButtonOutline,
        variant === 'ghost' && styles.actionButtonGhost
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          variant === 'solid' && styles.actionButtonTextSolid,
          variant === 'ghost' && styles.actionButtonTextGhost
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
            <Text style={styles.title}>Alunos</Text>
            <Text style={styles.subtitle}>Gerencie o cadastro e acompanhe os pagamentos.</Text>
          </View>
          <View style={styles.headerActions}>
            <AppButton title="Novo aluno" onPress={openCreate} tone="yellow" />
            <AppButton title="Atualizar" onPress={loadAthletes} variant="outline" tone="yellow" />
          </View>
        </View>

        <Card style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Buscar por nome ou email..."
            placeholderTextColor={theme.colors.textDim}
            value={search}
            onChangeText={setSearch}
          />

          {loadingAthletes ? (
            <Text style={styles.muted}>Carregando alunos...</Text>
          ) : filteredAthletes.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.muted}>Nenhum aluno encontrado.</Text>
            </View>
          ) : (
            filteredAthletes.map((athlete) => (
              <View key={athlete.id} style={styles.athleteCard}>
                <View style={styles.athleteHeader}>
                  <View style={styles.athleteInfo}>
                    <Text style={styles.athleteName}>{athlete.name}</Text>
                    <Text style={styles.muted}>{athlete.user?.email || 'Sem email'}</Text>
                    <Text style={styles.muted}>
                      Pagamento: {athlete.paymentMethod || 'Nao informado'}
                    </Text>
                  </View>
                  {athlete.blockTrainerTrainings ? (
                    <Text style={styles.blockBadge}>Treinos bloqueados</Text>
                  ) : null}
                </View>

                <View style={styles.actionsRow}>
                  <ActionButton title="Formulario" onPress={() => openFormModal(athlete)} />
                  <ActionButton title="Cronograma" onPress={() => openSchedule(athlete)} variant="outline" />
                  <ActionButton title="Pagamentos" onPress={() => openPayments(athlete)} variant="outline" />
                </View>
                <View style={styles.actionsRow}>
                  <ActionButton title="Editar" onPress={() => openEdit(athlete)} variant="ghost" />
                  <ActionButton title="Excluir" onPress={() => openDelete(athlete)} variant="ghost" />
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      <Modal visible={createModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo aluno</Text>
            <ScrollView style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Nome"
                placeholderTextColor={theme.colors.textDim}
                value={createForm.name}
                onChangeText={(value) => setCreateForm((prev) => ({ ...prev, name: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={theme.colors.textDim}
                value={createForm.email}
                onChangeText={(value) => setCreateForm((prev) => ({ ...prev, email: value }))}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor={theme.colors.textDim}
                value={createForm.password}
                onChangeText={(value) => setCreateForm((prev) => ({ ...prev, password: value }))}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="Idade"
                placeholderTextColor={theme.colors.textDim}
                value={createForm.age}
                onChangeText={(value) => setCreateForm((prev) => ({ ...prev, age: value }))}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Documento"
                placeholderTextColor={theme.colors.textDim}
                value={createForm.document}
                onChangeText={(value) => setCreateForm((prev) => ({ ...prev, document: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Telefone"
                placeholderTextColor={theme.colors.textDim}
                value={createForm.phone}
                onChangeText={(value) => setCreateForm((prev) => ({ ...prev, phone: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="CEP"
                placeholderTextColor={theme.colors.textDim}
                value={createForm.cep}
                onChangeText={(value) => setCreateForm((prev) => ({ ...prev, cep: value }))}
              />

              <Text style={styles.label}>Forma de pagamento</Text>
              <View style={styles.chipRow}>
                {paymentMethods.map((method) => (
                  <Pressable
                    key={method}
                    style={[styles.chip, createForm.paymentMethod === method && styles.chipActive]}
                    onPress={() => setCreateForm((prev) => ({ ...prev, paymentMethod: method }))}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        createForm.paymentMethod === method && styles.chipTextActive
                      ]}
                    >
                      {method}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Pagamento inicial (opcional)</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder="Valor"
                  placeholderTextColor={theme.colors.textDim}
                  value={createForm.paymentAmount}
                  onChangeText={(value) => setCreateForm((prev) => ({ ...prev, paymentAmount: value }))}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder="Vencimento YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textDim}
                  value={createForm.paymentDueDate}
                  onChangeText={(value) => setCreateForm((prev) => ({ ...prev, paymentDueDate: value }))}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Bloquear treinos do personal</Text>
                <Switch
                  value={createForm.blockTrainerTrainings}
                  onValueChange={(value) =>
                    setCreateForm((prev) => ({ ...prev, blockTrainerTrainings: value }))
                  }
                />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <AppButton title="Cancelar" onPress={closeCreate} variant="ghost" tone="yellow" />
              <AppButton title="Salvar" onPress={handleCreateAthlete} loading={savingAthlete} tone="yellow" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Atualizar cadastro</Text>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.muted}>Email: {editingAthlete?.user?.email || 'N/A'}</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome"
                placeholderTextColor={theme.colors.textDim}
                value={editForm.name}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, name: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Idade"
                placeholderTextColor={theme.colors.textDim}
                value={editForm.age}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, age: value }))}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Documento"
                placeholderTextColor={theme.colors.textDim}
                value={editForm.document}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, document: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Telefone"
                placeholderTextColor={theme.colors.textDim}
                value={editForm.phone}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, phone: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="CEP"
                placeholderTextColor={theme.colors.textDim}
                value={editForm.cep}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, cep: value }))}
              />

              <Text style={styles.label}>Forma de pagamento</Text>
              <View style={styles.chipRow}>
                {paymentMethods.map((method) => (
                  <Pressable
                    key={method}
                    style={[styles.chip, editForm.paymentMethod === method && styles.chipActive]}
                    onPress={() => setEditForm((prev) => ({ ...prev, paymentMethod: method }))}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        editForm.paymentMethod === method && styles.chipTextActive
                      ]}
                    >
                      {method}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <AppButton title="Cancelar" onPress={closeEdit} variant="ghost" tone="yellow" />
              <AppButton title="Salvar" onPress={handleUpdateAthlete} loading={savingEdit} tone="yellow" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Excluir aluno</Text>
            <Text style={styles.muted}>
              Tem certeza que deseja excluir {deletingAthlete?.name}?
            </Text>
            <View style={styles.modalActions}>
              <AppButton title="Cancelar" onPress={closeDelete} variant="ghost" tone="yellow" />
              <AppButton title="Excluir" onPress={handleDeleteAthlete} loading={deleting} tone="yellow" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={formModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Formulario do aluno</Text>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.muted}>Aluno: {formAthlete?.name}</Text>
              <TextInput
                style={styles.input}
                placeholder="Titulo"
                placeholderTextColor={theme.colors.textDim}
                value={formTitle}
                onChangeText={setFormTitle}
              />
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Descricao"
                placeholderTextColor={theme.colors.textDim}
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
              />

              {formFields.map((field) => (
                <View key={field.id} style={styles.fieldCard}>
                  <View style={styles.fieldHeader}>
                    <Text style={styles.fieldTitle}>Pergunta</Text>
                    <Pressable onPress={() => removeField(field.id)}>
                      <Text style={styles.dangerText}>Remover</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Descricao da pergunta"
                    placeholderTextColor={theme.colors.textDim}
                    value={field.label}
                    onChangeText={(value) => handleFieldChange(field.id, 'label', value)}
                  />
                  <Text style={styles.label}>Tipo</Text>
                  <View style={styles.chipRow}>
                    {(['TEXT', 'NUMBER', 'BOOLEAN', 'MULTIPLE_CHOICE'] as FieldType[]).map((type) => (
                      <Pressable
                        key={type}
                        style={[styles.chip, field.type === type && styles.chipActive]}
                        onPress={() => handleFieldChange(field.id, 'type', type)}
                      >
                        <Text style={[styles.chipText, field.type === type && styles.chipTextActive]}>
                          {type === 'TEXT' ? 'Texto' : type === 'NUMBER' ? 'Numero' : type === 'BOOLEAN' ? 'Sim/Nao' : 'Multipla'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {field.type === 'MULTIPLE_CHOICE' && (
                    <TextInput
                      style={styles.input}
                      placeholder="Opcoes (separe por virgula)"
                      placeholderTextColor={theme.colors.textDim}
                      value={field.options || ''}
                      onChangeText={(value) => handleFieldChange(field.id, 'options', value)}
                    />
                  )}

                  <View style={styles.switchRow}>
                    <Text style={styles.label}>Obrigatorio?</Text>
                    <Switch
                      value={field.required}
                      onValueChange={(value) => handleFieldChange(field.id, 'required', value)}
                    />
                  </View>
                </View>
              ))}

              <AppButton title="Adicionar pergunta" onPress={addField} variant="outline" tone="yellow" />
            </ScrollView>
            <View style={styles.modalActions}>
              <AppButton title="Cancelar" onPress={closeFormModal} variant="ghost" tone="yellow" />
              <AppButton title="Enviar" onPress={handleSendForm} loading={sendingForm} tone="yellow" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={scheduleModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cronograma de treinos</Text>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.muted}>Aluno: {scheduleAthlete?.name}</Text>
              {loadingSchedule || loadingTrainings ? (
                <Text style={styles.muted}>Carregando cronograma...</Text>
              ) : (
                weekDays.map((day) => (
                  <View key={day.key} style={styles.scheduleRow}>
                    <Text style={styles.scheduleLabel}>{day.label}</Text>
                    <Pressable
                      style={styles.scheduleSelect}
                      onPress={() => openTrainingPicker(day.key)}
                    >
                      <Text style={styles.scheduleValue}>{resolveTrainingTitle(scheduleDraft[day.key])}</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <AppButton title="Cancelar" onPress={closeSchedule} variant="ghost" tone="yellow" />
              <AppButton title="Salvar" onPress={handleSaveSchedule} loading={savingSchedule} tone="yellow" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={trainingPickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar treino</Text>
            <ScrollView style={styles.modalBody}>
              <Pressable style={styles.selectRow} onPress={() => handleSelectTraining('')}>
                <Text style={styles.selectText}>Sem treino</Text>
              </Pressable>
              {trainings.map((training) => (
                <Pressable
                  key={training.id}
                  style={styles.selectRow}
                  onPress={() => handleSelectTraining(training.id)}
                >
                  <Text style={styles.selectText}>{training.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <AppButton title="Fechar" onPress={closeTrainingPicker} variant="ghost" tone="yellow" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={paymentsModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pagamentos do aluno</Text>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.muted}>Aluno: {paymentsAthlete?.name || 'N/A'}</Text>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Novo pagamento</Text>
                  <View style={styles.switchRow}>
                    <Text style={styles.label}>Bloquear treinos</Text>
                    <Switch
                      value={blockTrainerTrainings}
                      onValueChange={handleTrainingBlockToggle}
                      disabled={savingTrainingBlock}
                    />
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Valor"
                  placeholderTextColor={theme.colors.textDim}
                  value={paymentForm.amount}
                  onChangeText={(value) => setPaymentForm((prev) => ({ ...prev, amount: value }))}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Vencimento YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textDim}
                  value={paymentForm.dueDate}
                  onChangeText={(value) => setPaymentForm((prev) => ({ ...prev, dueDate: value }))}
                />

                <Text style={styles.label}>Status</Text>
                <View style={styles.chipRow}>
                  {paymentStatuses.map((status) => (
                    <Pressable
                      key={status}
                      style={[styles.chip, paymentForm.status === status && styles.chipActive]}
                      onPress={() =>
                        setPaymentForm((prev) => ({
                          ...prev,
                          status,
                          paidAt: status === 'PAID' ? prev.paidAt || buildToday() : ''
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          paymentForm.status === status && styles.chipTextActive
                        ]}
                      >
                        {statusLabel[status]}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Forma de pagamento</Text>
                <View style={styles.chipRow}>
                  {paymentMethods.map((method) => (
                    <Pressable
                      key={method}
                      style={[styles.chip, paymentForm.paymentMethod === method && styles.chipActive]}
                      onPress={() => setPaymentForm((prev) => ({ ...prev, paymentMethod: method }))}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          paymentForm.paymentMethod === method && styles.chipTextActive
                        ]}
                      >
                        {method}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {paymentForm.status === 'PAID' && (
                  <TextInput
                    style={styles.input}
                    placeholder="Pago em YYYY-MM-DD"
                    placeholderTextColor={theme.colors.textDim}
                    value={paymentForm.paidAt}
                    onChangeText={(value) => setPaymentForm((prev) => ({ ...prev, paidAt: value }))}
                  />
                )}

                <TextInput
                  style={styles.input}
                  placeholder="Observacao (opcional)"
                  placeholderTextColor={theme.colors.textDim}
                  value={paymentForm.notes}
                  onChangeText={(value) => setPaymentForm((prev) => ({ ...prev, notes: value }))}
                />
                <AppButton title="Adicionar pagamento" onPress={handleCreatePayment} loading={savingPayment} tone="yellow" />
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Historico</Text>
                  <AppButton
                    title="Atualizar"
                    onPress={() => paymentsAthlete && loadPayments(paymentsAthlete.id)}
                    variant="outline"
                    tone="yellow"
                  />
                </View>

                {loadingPayments ? (
                  <Text style={styles.muted}>Carregando...</Text>
                ) : payments.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.muted}>Nenhum pagamento registrado.</Text>
                  </View>
                ) : (
                  payments.map((payment) => (
                    <View key={payment.id} style={styles.paymentCard}>
                      <Text style={styles.paymentAmount}>{formatCurrencyBRL(payment.amount)}</Text>
                      <View style={styles.badgeRow}>
                        <Text style={styles.badge}>{statusLabel[payment.status]}</Text>
                        {payment.paymentMethod ? <Text style={styles.badge}>{payment.paymentMethod}</Text> : null}
                      </View>
                      <Text style={styles.muted}>Vencimento: {formatShortDate(payment.dueDate)}</Text>
                      <Text style={styles.muted}>Pago em: {formatShortDate(payment.paidAt)}</Text>
                      {payment.notes ? <Text style={styles.muted}>Obs: {payment.notes}</Text> : null}

                      <View style={styles.actionsRow}>
                        <ActionButton title="Editar" onPress={() => openEditPayment(payment)} variant="outline" />
                        {payment.status !== 'PAID' ? (
                          <ActionButton
                            title={updatingPaymentId === payment.id ? 'Atualizando...' : 'Marcar pago'}
                            onPress={() => handleMarkPaid(payment.id)}
                            variant="outline"
                          />
                        ) : null}
                        <ActionButton
                          title={deletingPaymentId === payment.id ? 'Excluindo...' : 'Excluir'}
                          onPress={() => handleDeletePayment(payment.id)}
                          variant="ghost"
                        />
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <AppButton title="Fechar" onPress={closePayments} variant="ghost" tone="yellow" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editPaymentModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar pagamento</Text>
            <ScrollView style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Valor"
                placeholderTextColor={theme.colors.textDim}
                value={editPaymentForm.amount}
                onChangeText={(value) => setEditPaymentForm((prev) => ({ ...prev, amount: value }))}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Vencimento YYYY-MM-DD"
                placeholderTextColor={theme.colors.textDim}
                value={editPaymentForm.dueDate}
                onChangeText={(value) => setEditPaymentForm((prev) => ({ ...prev, dueDate: value }))}
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <AppButton title="Cancelar" onPress={closeEditPayment} variant="ghost" tone="yellow" />
              <AppButton title="Salvar" onPress={handleSaveEditPayment} loading={savingEditPayment} tone="yellow" />
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
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md
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
  card: {
    marginBottom: theme.spacing.lg
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
  athleteCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.bgAlt
  },
  athleteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  athleteInfo: {
    flex: 1,
    marginRight: theme.spacing.sm
  },
  athleteName: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 4
  },
  blockBadge: {
    borderWidth: 1,
    borderColor: theme.colors.warning,
    color: theme.colors.warning,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 10
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: theme.spacing.sm
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentAlt
  },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  actionButtonGhost: {
    backgroundColor: 'transparent'
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: theme.fonts.semibold
  },
  actionButtonTextSolid: {
    color: '#0a0a0a'
  },
  actionButtonTextGhost: {
    color: theme.colors.text
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
  },
  label: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: 6
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
    paddingVertical: 6
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm
  },
  flex: {
    flex: 1
  },
  fieldCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm
  },
  fieldTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  },
  dangerText: {
    color: theme.colors.danger,
    fontSize: 12
  },
  scheduleRow: {
    marginBottom: theme.spacing.sm
  },
  scheduleLabel: {
    color: theme.colors.text,
    fontFamily: theme.fonts.semibold,
    marginBottom: 6
  },
  scheduleSelect: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgAlt
  },
  scheduleValue: {
    color: theme.colors.textDim
  },
  selectRow: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm
  },
  selectText: {
    color: theme.colors.text
  },
  section: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  sectionHeader: {
    marginBottom: theme.spacing.sm
  },
  sectionTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm
  },
  paymentCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.bgAlt
  },
  paymentAmount: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: 6
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6
  },
  badge: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    color: theme.colors.textDim
  }
});
