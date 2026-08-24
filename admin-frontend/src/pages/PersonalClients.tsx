import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Switch,
  Text,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import {
  FiArrowLeft,
  FiCalendar,
  FiDollarSign,
  FiEdit2,
  FiFileText,
  FiPlus,
  FiSearch,
  FiSend,
  FiTrash2,
  FiUserPlus
} from 'react-icons/fi';
import { api } from '../services/api';

type PaymentMethod = 'PIX' | 'DINHEIRO' | 'CARTAO';
type FieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'MULTIPLE_CHOICE';
type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE';

type Athlete = {
  id: string;
  name: string;
  createdAt: string;
  age?: number | null;
  document?: string | null;
  phone?: string | null;
  cep?: string | null;
  paymentMethod?: PaymentMethod | null;
  blockTrainerTrainings?: boolean | null;
  user?: { email?: string };
};

type Training = {
  id: string;
  title: string;
  athleteId?: string | null;
  athlete?: { id: string; name: string; user?: { email?: string } };
};

type AthletePayment = {
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

type WeekDayKey = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
type WeeklySchedule = Record<WeekDayKey, string>;

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

const makeDefaultFields = (): FormFieldDraft[] => [
  { id: 'goal', label: 'Objetivo específico', type: 'TEXT', required: true },
  { id: 'injuries', label: 'Lesões/observações', type: 'TEXT', required: false }
];

const weekDays: Array<{ key: WeekDayKey; label: string }> = [
  { key: 'MONDAY', label: 'Segunda-feira' },
  { key: 'TUESDAY', label: 'Terca-feira' },
  { key: 'WEDNESDAY', label: 'Quarta-feira' },
  { key: 'THURSDAY', label: 'Quinta-feira' },
  { key: 'FRIDAY', label: 'Sexta-feira' },
  { key: 'SATURDAY', label: 'Sabado' },
  { key: 'SUNDAY', label: 'Domingo' }
];

const emptySchedule = (): WeeklySchedule =>
  weekDays.reduce((acc, day) => {
    acc[day.key] = '';
    return acc;
  }, {} as WeeklySchedule);

const statusLabels: Record<PaymentStatus, string> = {
  PAID: 'Pago',
  PENDING: 'Pendente',
  OVERDUE: 'Atrasado'
};

const statusColors: Record<PaymentStatus, string> = {
  PAID: 'green',
  PENDING: 'yellow',
  OVERDUE: 'red'
};

const formatCurrencyBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatShortDate = (value?: string | null) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString('pt-BR');
};

const formatDateInput = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const buildToday = () => new Date().toISOString().slice(0, 10);

const defaultPaymentForm = (): PaymentForm => ({
  amount: '',
  dueDate: '',
  status: 'PENDING',
  paymentMethod: '',
  paidAt: '',
  notes: ''
});

export const PersonalClientsPage = () => {
  const toast = useToast();

  const [mode, setMode] = useState<'home' | 'search' | 'create'>('home');
  const [search, setSearch] = useState('');

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);

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

  const formModal = useDisclosure();
  const editModal = useDisclosure();
  const deleteModal = useDisclosure();
  const scheduleModal = useDisclosure();
  const paymentsModal = useDisclosure();

  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [sendingForm, setSendingForm] = useState(false);
  const [formTitle, setFormTitle] = useState('Questionário do aluno');
  const [formDescription, setFormDescription] = useState(
    'Responda com atenção. Isso ajuda a personalizar seu acompanhamento.'
  );
  const [formFields, setFormFields] = useState<FormFieldDraft[]>(makeDefaultFields());

  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditAthleteForm>({
    name: '',
    age: '',
    document: '',
    phone: '',
    cep: '',
    paymentMethod: 'PIX'
  });

  const [deletingAthlete, setDeletingAthlete] = useState<Athlete | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [scheduleAthlete, setScheduleAthlete] = useState<Athlete | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<WeeklySchedule>(emptySchedule());
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(false);

  const [paymentsAthlete, setPaymentsAthlete] = useState<Athlete | null>(null);
  const [payments, setPayments] = useState<AthletePayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(defaultPaymentForm());
  const [blockTrainerTrainings, setBlockTrainerTrainings] = useState(false);
  const [savingTrainingBlock, setSavingTrainingBlock] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState<EditPaymentForm>({ amount: '', dueDate: '' });
  const [savingEditPaymentId, setSavingEditPaymentId] = useState<string | null>(null);

  const loadAthletes = async () => {
    setLoadingAthletes(true);
    try {
      const { data } = await api.get('/personal/athletes');
      setAthletes(data || []);
    } catch {
      toast({ title: 'Não foi possível carregar os alunos', status: 'error' });
    } finally {
      setLoadingAthletes(false);
    }
  };

  useEffect(() => {
    loadAthletes();
  }, []);

  const filteredAthletes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter((a) => {
      const name = (a.name || '').toLowerCase();
      const email = (a.user?.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [athletes, search]);

  const openCreateFormForAthlete = (athlete: Athlete) => {
    setSelectedAthlete(athlete);
    setFormTitle('Questionário do aluno');
    setFormDescription('Responda com atenção. Isso ajuda a personalizar seu acompanhamento.');
    setFormFields(makeDefaultFields());
    formModal.onOpen();
  };

  const openEditAthlete = (athlete: Athlete) => {
    setEditingAthlete(athlete);
    setEditForm({
      name: athlete.name || '',
      age: athlete.age != null ? String(athlete.age) : '',
      document: athlete.document || '',
      phone: athlete.phone || '',
      cep: athlete.cep || '',
      paymentMethod: (athlete.paymentMethod as PaymentMethod) || 'PIX'
    });
    editModal.onOpen();
  };

  const openDeleteAthlete = (athlete: Athlete) => {
    setDeletingAthlete(athlete);
    deleteModal.onOpen();
  };

  const loadTrainings = async () => {
    if (loadingTrainings) return;
    setLoadingTrainings(true);
    try {
      const { data } = await api.get('/personal/trainings');
      setTrainings(data || []);
    } catch {
      toast({ title: 'NÇœo foi possÇðvel carregar os treinos', status: 'error' });
    } finally {
      setLoadingTrainings(false);
    }
  };

  const loadSchedule = async (athleteId: string) => {
    setLoadingSchedule(true);
    try {
      const { data } = await api.get(`/personal/athletes/${athleteId}/schedule`);
      const schedule = (data?.schedule || {}) as Partial<WeeklySchedule>;
      const next = emptySchedule();
      weekDays.forEach((day) => {
        const value = schedule[day.key];
        next[day.key] = value || '';
      });
      setScheduleDraft(next);
    } catch {
      toast({ title: 'NÇœo foi possÇðvel carregar o cronograma', status: 'error' });
      setScheduleDraft(emptySchedule());
    } finally {
      setLoadingSchedule(false);
    }
  };

  const openSchedule = async (athlete: Athlete) => {
    setScheduleAthlete(athlete);
    scheduleModal.onOpen();
    await Promise.all([loadTrainings(), loadSchedule(athlete.id)]);
  };

  const handleScheduleChange = (day: WeekDayKey, value: string) => {
    setScheduleDraft((prev) => ({ ...prev, [day]: value }));
  };

  const handleSaveSchedule = async () => {
    if (!scheduleAthlete) return;
    setSavingSchedule(true);
    try {
      const payload = weekDays.reduce<Record<WeekDayKey, string | null>>((acc, day) => {
        const value = scheduleDraft[day.key];
        acc[day.key] = value ? value : null;
        return acc;
      }, {} as Record<WeekDayKey, string | null>);

      await api.put(`/personal/athletes/${scheduleAthlete.id}/schedule`, { schedule: payload });
      toast({ title: 'Cronograma salvo', status: 'success' });
      scheduleModal.onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'NÇœo foi possÇðvel salvar o cronograma';
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setSavingSchedule(false);
    }
  };

  const closeScheduleModal = () => {
    scheduleModal.onClose();
    setScheduleAthlete(null);
    setScheduleDraft(emptySchedule());
  };

  const loadPayments = async (athleteId: string) => {
    setLoadingPayments(true);
    try {
      const { data } = await api.get(`/personal/athletes/${athleteId}/payments`);
      setPayments(data || []);
    } catch {
      toast({ title: 'Nao foi possivel carregar os pagamentos', status: 'error' });
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const openPayments = async (athlete: Athlete) => {
    setPaymentsAthlete(athlete);
    setBlockTrainerTrainings(Boolean(athlete.blockTrainerTrainings));
    setPaymentForm({ ...defaultPaymentForm(), dueDate: buildToday() });
    setEditingPaymentId(null);
    setEditPaymentForm({ amount: '', dueDate: '' });
    paymentsModal.onOpen();
    await loadPayments(athlete.id);
  };

  const closePaymentsModal = () => {
    paymentsModal.onClose();
    setPaymentsAthlete(null);
    setPayments([]);
    setUpdatingPaymentId(null);
    setDeletingPaymentId(null);
    setPaymentForm(defaultPaymentForm());
    setBlockTrainerTrainings(false);
    setSavingTrainingBlock(false);
    setEditingPaymentId(null);
    setEditPaymentForm({ amount: '', dueDate: '' });
    setSavingEditPaymentId(null);
  };

  const handleTrainingBlockToggle = async (nextValue: boolean) => {
    if (!paymentsAthlete) return;
    const previousValue = blockTrainerTrainings;
    setBlockTrainerTrainings(nextValue);
    setSavingTrainingBlock(true);
    try {
      const { data } = await api.patch(`/personal/athletes/${paymentsAthlete.id}/training-block`, {
        blockTrainerTrainings: nextValue
      });
      setPaymentsAthlete((prev) => (prev ? { ...prev, blockTrainerTrainings: data?.blockTrainerTrainings } : prev));
      setAthletes((prev) =>
        prev.map((athlete) =>
          athlete.id === paymentsAthlete.id
            ? { ...athlete, blockTrainerTrainings: data?.blockTrainerTrainings }
            : athlete
        )
      );
      toast({
        title: nextValue ? 'Bloqueio de treinos ativado' : 'Bloqueio de treinos desativado',
        status: 'success'
      });
    } catch (err: any) {
      setBlockTrainerTrainings(previousValue);
      const message = err?.response?.data?.message || 'Nao foi possivel atualizar o bloqueio de treinos';
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setSavingTrainingBlock(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!paymentsAthlete) return;
    if (!paymentForm.amount || !paymentForm.dueDate) {
      toast({ title: 'Informe valor e vencimento', status: 'warning' });
      return;
    }

    const amountValue = Number(paymentForm.amount.replace(',', '.'));
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast({ title: 'Valor invalido', status: 'warning' });
      return;
    }

    setSavingPayment(true);
    try {
      const payload: Record<string, unknown> = {
        amount: amountValue,
        dueDate: paymentForm.dueDate,
        status: paymentForm.status
      };

      if (paymentForm.paymentMethod) {
        payload.paymentMethod = paymentForm.paymentMethod;
      }
      if (paymentForm.status === 'PAID' && paymentForm.paidAt) {
        payload.paidAt = paymentForm.paidAt;
      }
      if (paymentForm.notes.trim()) {
        payload.notes = paymentForm.notes.trim();
      }

      await api.post(`/personal/athletes/${paymentsAthlete.id}/payments`, payload);
      toast({ title: 'Pagamento criado', status: 'success' });
      setPaymentForm({ ...defaultPaymentForm(), dueDate: buildToday() });
      await loadPayments(paymentsAthlete.id);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Nao foi possivel criar o pagamento';
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setSavingPayment(false);
    }
  };

  const startEditPayment = (payment: AthletePayment) => {
    setEditingPaymentId(payment.id);
    setEditPaymentForm({
      amount: payment.amount ? String(payment.amount) : '',
      dueDate: formatDateInput(payment.dueDate)
    });
  };

  const cancelEditPayment = () => {
    setEditingPaymentId(null);
    setEditPaymentForm({ amount: '', dueDate: '' });
  };

  const handleSaveEditPayment = async (paymentId: string) => {
    if (!paymentsAthlete) return;
    if (!editPaymentForm.amount || !editPaymentForm.dueDate) {
      toast({ title: 'Informe valor e vencimento', status: 'warning' });
      return;
    }

    const amountValue = Number(editPaymentForm.amount.replace(',', '.'));
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast({ title: 'Valor invalido', status: 'warning' });
      return;
    }

    setSavingEditPaymentId(paymentId);
    try {
      await api.patch(`/personal/athletes/${paymentsAthlete.id}/payments/${paymentId}`, {
        amount: amountValue,
        dueDate: editPaymentForm.dueDate
      });
      toast({ title: 'Pagamento atualizado', status: 'success' });
      cancelEditPayment();
      await loadPayments(paymentsAthlete.id);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Nao foi possivel atualizar o pagamento';
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setSavingEditPaymentId(null);
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    if (!paymentsAthlete) return;
    setUpdatingPaymentId(paymentId);
    try {
      await api.patch(`/personal/athletes/${paymentsAthlete.id}/payments/${paymentId}`, {
        status: 'PAID'
      });
      await loadPayments(paymentsAthlete.id);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Nao foi possivel atualizar o pagamento';
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!paymentsAthlete) return;
    setDeletingPaymentId(paymentId);
    try {
      await api.delete(`/personal/athletes/${paymentsAthlete.id}/payments/${paymentId}`);
      await loadPayments(paymentsAthlete.id);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Nao foi possivel excluir o pagamento';
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const addField = () => {
    setFormFields((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length + 1}`, label: 'Nova pergunta', type: 'TEXT', required: true }
    ]);
  };

  const removeField = (id: string) => {
    setFormFields((prev) => prev.filter((f) => f.id !== id));
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

  const handleCreateAthlete = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast({ title: 'Preencha nome, email e senha', status: 'warning' });
      return;
    }

    const hasPaymentAmount = createForm.paymentAmount.trim() !== '';
    const hasPaymentDueDate = Boolean(createForm.paymentDueDate);
    if (hasPaymentAmount || hasPaymentDueDate) {
      if (!hasPaymentAmount || !hasPaymentDueDate) {
        toast({ title: 'Informe valor e vencimento do pagamento', status: 'warning' });
        return;
      }
      const amountValue = Number(createForm.paymentAmount.replace(',', '.'));
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        toast({ title: 'Valor do pagamento invalido', status: 'warning' });
        return;
      }
    }

    setSavingAthlete(true);
    try {
      const payload: Record<string, unknown> = {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        age: createForm.age ? Number(createForm.age) : undefined,
        document: createForm.document || undefined,
        phone: createForm.phone || undefined,
        cep: createForm.cep || undefined,
        paymentMethod: createForm.paymentMethod,
        blockTrainerTrainings: createForm.blockTrainerTrainings
      };

      if (hasPaymentAmount && hasPaymentDueDate) {
        payload.paymentAmount = Number(createForm.paymentAmount.replace(',', '.'));
        payload.paymentDueDate = createForm.paymentDueDate;
      }

      await api.post('/personal/athletes', payload);
      toast({ title: 'Aluno criado com conta para login', status: 'success' });
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
      await loadAthletes();
      setMode('search');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Não foi possível salvar o aluno. Verifique os dados e tente novamente.';
      toast({ title: 'Erro ao salvar', description: message, status: 'error' });
    } finally {
      setSavingAthlete(false);
    }
  };

  const handleUpdateAthlete = async () => {
    if (!editingAthlete) return;
    if (!editForm.name.trim()) {
      toast({ title: 'Informe o nome do aluno', status: 'warning' });
      return;
    }

    setSavingEdit(true);
    try {
      await api.put(`/personal/athletes/${editingAthlete.id}`, {
        name: editForm.name.trim(),
        age: editForm.age ? Number(editForm.age) : undefined,
        document: editForm.document || undefined,
        phone: editForm.phone || undefined,
        cep: editForm.cep || undefined,
        paymentMethod: editForm.paymentMethod
      });
      toast({ title: 'Cadastro do aluno atualizado', status: 'success' });
      editModal.onClose();
      await loadAthletes();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Não foi possível atualizar o aluno.';
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteAthlete = async () => {
    if (!deletingAthlete) return;
    setDeleting(true);
    try {
      await api.delete(`/personal/athletes/${deletingAthlete.id}`);
      toast({ title: 'Aluno excluído', status: 'success' });
      deleteModal.onClose();
      await loadAthletes();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Não foi possível excluir o aluno.';
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleSendFormToAthlete = async () => {
    if (!selectedAthlete) return;
    if (!formTitle.trim()) {
      toast({ title: 'Informe o título do formulário', status: 'warning' });
      return;
    }
    if (formFields.length === 0) {
      toast({ title: 'Adicione ao menos uma pergunta', status: 'warning' });
      return;
    }

    const payloadFields = formFields.map((f) => ({
      label: f.label,
      type: f.type,
      required: f.required,
      options:
        f.type === 'MULTIPLE_CHOICE'
          ? (f.options || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined
    }));

    setSendingForm(true);
    try {
      const { data: createdForm } = await api.post('/personal/forms', {
        title: formTitle,
        description: formDescription,
        fields: payloadFields
      });
      await api.post(`/personal/forms/${createdForm.id}/assign`, { athleteId: selectedAthlete.id });
      toast({ title: 'Formulário enviado para o aluno', status: 'success' });
      formModal.onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Não foi possível enviar o formulário.';
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setSendingForm(false);
    }
  };

  return (
    <Box bg="#0f0f10" color="gray.100">
      <Flex align="center" justify="space-between" mb="6" wrap="wrap" gap="3">
        <Box>
          <Heading size="lg">Aluno</Heading>
          <Text color="gray.400">Pesquise alunos cadastrados ou crie um novo cadastro.</Text>
        </Box>
        {mode !== 'home' && (
          <Button leftIcon={<FiArrowLeft />} variant="ghost" onClick={() => setMode('home')}>
            Voltar
          </Button>
        )}
      </Flex>

      {mode === 'home' && (
        <SimpleGrid columns={[1, null, 2]} spacing="4">
          <Box bg="#18181b" p="6" borderRadius="xl" border="1px solid" borderColor="blackAlpha.300" boxShadow="lg">
            <HStack spacing="3" mb="2">
              <Icon as={FiSearch} color="yellow.300" />
              <Heading size="md" color="white">
                Pesquisar
              </Heading>
            </HStack>
            <Text color="gray.400" mb="4">
              Buscar um aluno já salvo, atualizar cadastro ou enviar formulário.
            </Text>
            <Button bg="#facc15" color="black" _hover={{ bg: '#eab308' }} onClick={() => setMode('search')}>
              Ir para pesquisa
            </Button>
          </Box>

          <Box bg="#18181b" p="6" borderRadius="xl" border="1px solid" borderColor="blackAlpha.300" boxShadow="lg">
            <HStack spacing="3" mb="2">
              <Icon as={FiUserPlus} color="yellow.300" />
              <Heading size="md" color="white">
                Criar
              </Heading>
            </HStack>
            <Text color="gray.400" mb="4">
              Abrir o formulário de cadastro do aluno.
            </Text>
            <Button bg="#facc15" color="black" _hover={{ bg: '#eab308' }} onClick={() => setMode('create')}>
              Criar aluno
            </Button>
          </Box>
        </SimpleGrid>
      )}

      {mode === 'search' && (
        <Box bg="#18181b" p="6" borderRadius="xl" border="1px solid" borderColor="blackAlpha.300" boxShadow="lg">
          <Flex justify="space-between" align="center" mb="4" gap="3" wrap="wrap">
            <Box>
              <Heading size="md">Pesquisar aluno</Heading>
              <Text color="gray.400">Busque pelo nome ou email.</Text>
            </Box>
            <Input
              placeholder="Buscar por nome ou email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              bg="#0f0f10"
              maxW="420px"
            />
          </Flex>

          {loadingAthletes ? (
            <Flex align="center" justify="center" py="10">
              <Spinner />
            </Flex>
          ) : (
            <Stack spacing="3">
              {filteredAthletes.map((athlete) => (
                <Box key={athlete.id} bg="#0f0f10" borderRadius="lg" border="1px solid" borderColor="blackAlpha.400" p="4">
                  <Flex justify="space-between" align={['flex-start', null, 'center']} gap="3" wrap="wrap">
                    <HStack spacing="3">
                      <Avatar name={athlete.name} />
                      <Box>
                        <Text fontWeight="bold">{athlete.name}</Text>
                        <Text color="gray.400" fontSize="sm">
                          {athlete.user?.email || 'Sem email'}
                        </Text>
                        <HStack spacing="2" mt="2">
                          <Badge colorScheme="yellow" variant="subtle">
                            {athlete.paymentMethod ? `Pagamento: ${athlete.paymentMethod}` : 'Pagamento: —'}
                          </Badge>
                        </HStack>
                      </Box>
                    </HStack>

                    <HStack spacing="2" flexWrap="wrap" justifyContent="flex-end">
                      <Button size="sm" leftIcon={<FiFileText />} variant="outline" colorScheme="yellow" onClick={() => openCreateFormForAthlete(athlete)}>
                        Criar formulário
                      </Button>
                      <Button size="sm" leftIcon={<FiCalendar />} variant="outline" colorScheme="orange" onClick={() => openSchedule(athlete)}>
                        Treinos
                      </Button>
                      <Button size="sm" leftIcon={<FiDollarSign />} variant="outline" colorScheme="green" onClick={() => openPayments(athlete)}>
                        Pagamentos
                      </Button>
                      <Button size="sm" leftIcon={<FiEdit2 />} variant="outline" colorScheme="blue" onClick={() => openEditAthlete(athlete)}>
                        Atualizar
                      </Button>
                      <Button size="sm" leftIcon={<FiTrash2 />} variant="ghost" colorScheme="red" onClick={() => openDeleteAthlete(athlete)}>
                        Excluir
                      </Button>
                    </HStack>
                  </Flex>
                </Box>
              ))}

              {filteredAthletes.length === 0 && (
                <Box bg="#0f0f10" borderRadius="lg" border="1px dashed" borderColor="gray.600" p="6" textAlign="center" color="gray.400">
                  Nenhum aluno encontrado.
                </Box>
              )}
            </Stack>
          )}
        </Box>
      )}

      {mode === 'create' && (
        <Box bg="#18181b" p="6" borderRadius="xl" border="1px solid" borderColor="blackAlpha.300" boxShadow="lg">
          <Heading size="md" mb="4">
            Cadastro do aluno
          </Heading>

          <SimpleGrid columns={[1, null, 2]} spacing="4">
            <FormControl>
              <FormLabel>Nome</FormLabel>
              <Input value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} />
            </FormControl>
            <FormControl>
              <FormLabel>Idade</FormLabel>
              <Input value={createForm.age} onChange={(e) => setCreateForm((p) => ({ ...p, age: e.target.value }))} placeholder="Ex: 28" />
            </FormControl>
            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
            </FormControl>
            <FormControl>
              <FormLabel>Senha provisória</FormLabel>
              <Input value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} placeholder="Defina uma senha inicial" />
            </FormControl>
            <FormControl>
              <FormLabel>Documento</FormLabel>
              <Input value={createForm.document} onChange={(e) => setCreateForm((p) => ({ ...p, document: e.target.value }))} placeholder="CPF/RG" />
            </FormControl>
            <FormControl>
              <FormLabel>Telefone</FormLabel>
              <Input value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(00) 90000-0000" />
            </FormControl>
            <FormControl>
              <FormLabel>CEP</FormLabel>
              <Input value={createForm.cep} onChange={(e) => setCreateForm((p) => ({ ...p, cep: e.target.value }))} placeholder="00000-000" />
            </FormControl>
            
          </SimpleGrid>

          <Box mt="6" bg="#0f0f10" border="1px solid" borderColor="blackAlpha.400" borderRadius="lg" p="4">
            <Heading size="sm" mb="2">
              Pagamento
            </Heading>
            <Text color="gray.400" fontSize="sm" mb="4">
              Opcional: defina a primeira cobranca e o bloqueio de treinos do personal.
            </Text>
            <SimpleGrid columns={[1, null, 2]} spacing="4">
              <FormControl>
                <FormLabel>Forma de pagamento</FormLabel>
                <Select
                  value={createForm.paymentMethod}
                  onChange={(e) => setCreateForm((p) => ({ ...p, paymentMethod: e.target.value as PaymentMethod }))}
                >
                  <option value="PIX">Pix</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CARTAO">Cartao</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Valor</FormLabel>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.paymentAmount}
                  onChange={(e) => setCreateForm((p) => ({ ...p, paymentAmount: e.target.value }))}
                  placeholder="Ex: 150.00"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Vencimento</FormLabel>
                <Input
                  type="date"
                  value={createForm.paymentDueDate}
                  onChange={(e) => setCreateForm((p) => ({ ...p, paymentDueDate: e.target.value }))}
                />
              </FormControl>
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel mb="0">Bloquear treinos do personal</FormLabel>
                <Switch
                  isChecked={createForm.blockTrainerTrainings}
                  onChange={(e) => setCreateForm((p) => ({ ...p, blockTrainerTrainings: e.target.checked }))}
                />
              </FormControl>
            </SimpleGrid>
          </Box>

          <Button mt="4" leftIcon={<FiPlus />} bg="#facc15" color="black" _hover={{ bg: '#eab308' }} onClick={handleCreateAthlete} isLoading={savingAthlete}>
            Salvar aluno
          </Button>
        </Box>
      )}

      <Modal isOpen={formModal.isOpen} onClose={formModal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg="#18181b" color="gray.100" border="1px solid" borderColor="blackAlpha.400">
          <ModalHeader>Formulário para {selectedAthlete?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={[1, null, 2]} spacing="4" mb="4">
              <FormControl>
                <FormLabel>Título</FormLabel>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} bg="#0f0f10" />
              </FormControl>
              <FormControl>
                <FormLabel>Descrição</FormLabel>
                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} bg="#0f0f10" />
              </FormControl>
            </SimpleGrid>

            <Flex justify="space-between" align="center" mb="3">
              <Text fontWeight="bold">Perguntas</Text>
              <Button leftIcon={<FiPlus />} size="sm" onClick={addField} variant="outline" colorScheme="yellow">
                Adicionar
              </Button>
            </Flex>

            <Stack spacing="3">
              {formFields.map((field) => (
                <Box key={field.id} bg="#0f0f10" p="4" borderRadius="md" border="1px solid" borderColor="blackAlpha.400">
                  <Flex justify="space-between" align="center" mb="2">
                    <Text fontWeight="bold" fontSize="sm">
                      Pergunta
                    </Text>
                    <Button size="xs" variant="ghost" colorScheme="red" onClick={() => removeField(field.id)} leftIcon={<FiTrash2 />}>
                      Remover
                    </Button>
                  </Flex>
                  <SimpleGrid columns={[1, null, 2]} spacing="4">
                    <FormControl>
                      <FormLabel>Pergunta</FormLabel>
                      <Input value={field.label} onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Tipo</FormLabel>
                      <Select value={field.type} onChange={(e) => handleFieldChange(field.id, 'type', e.target.value as FieldType)}>
                        <option value="TEXT">Texto</option>
                        <option value="NUMBER">Número</option>
                        <option value="BOOLEAN">Sim/Não</option>
                        <option value="MULTIPLE_CHOICE">Múltipla escolha</option>
                      </Select>
                    </FormControl>
                    {field.type === 'MULTIPLE_CHOICE' && (
                      <FormControl gridColumn={[1, null, 2]}>
                        <FormLabel>Opções (separe por vírgula)</FormLabel>
                        <Input value={field.options || ''} onChange={(e) => handleFieldChange(field.id, 'options', e.target.value)} placeholder="Opção A, Opção B" />
                      </FormControl>
                    )}
                    <FormControl>
                      <FormLabel>Obrigatório?</FormLabel>
                      <Select value={field.required ? 'SIM' : 'NAO'} onChange={(e) => handleFieldChange(field.id, 'required', e.target.value === 'SIM')}>
                        <option value="SIM">Sim</option>
                        <option value="NAO">Não</option>
                      </Select>
                    </FormControl>
                  </SimpleGrid>
                </Box>
              ))}
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={formModal.onClose}>
              Cancelar
            </Button>
            <Button leftIcon={<FiSend />} bg="#facc15" color="black" _hover={{ bg: '#eab308' }} onClick={handleSendFormToAthlete} isLoading={sendingForm}>
              Enviar para o aluno
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={editModal.isOpen} onClose={editModal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent bg="#18181b" color="gray.100" border="1px solid" borderColor="blackAlpha.400">
          <ModalHeader>Atualizar cadastro</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color="gray.400" fontSize="sm" mb="4">
              Email do aluno: {editingAthlete?.user?.email || '—'}
            </Text>

            <SimpleGrid columns={[1, null, 2]} spacing="4">
              <FormControl>
                <FormLabel>Nome</FormLabel>
                <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} bg="#0f0f10" />
              </FormControl>
              <FormControl>
                <FormLabel>Idade</FormLabel>
                <Input value={editForm.age} onChange={(e) => setEditForm((p) => ({ ...p, age: e.target.value }))} bg="#0f0f10" />
              </FormControl>
              <FormControl>
                <FormLabel>Documento</FormLabel>
                <Input value={editForm.document} onChange={(e) => setEditForm((p) => ({ ...p, document: e.target.value }))} bg="#0f0f10" />
              </FormControl>
              <FormControl>
                <FormLabel>Telefone</FormLabel>
                <Input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} bg="#0f0f10" />
              </FormControl>
              <FormControl>
                <FormLabel>CEP</FormLabel>
                <Input value={editForm.cep} onChange={(e) => setEditForm((p) => ({ ...p, cep: e.target.value }))} bg="#0f0f10" />
              </FormControl>
              <FormControl>
                <FormLabel>Forma de pagamento</FormLabel>
                <Select value={editForm.paymentMethod} onChange={(e) => setEditForm((p) => ({ ...p, paymentMethod: e.target.value as PaymentMethod }))} bg="#0f0f10">
                  <option value="PIX">Pix</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CARTAO">Cartão</option>
                </Select>
              </FormControl>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={editModal.onClose}>
              Cancelar
            </Button>
            <Button leftIcon={<FiEdit2 />} bg="#facc15" color="black" _hover={{ bg: '#eab308' }} onClick={handleUpdateAthlete} isLoading={savingEdit}>
              Salvar alterações
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.onClose} size="md">
        <ModalOverlay />
        <ModalContent bg="#18181b" color="gray.100" border="1px solid" borderColor="blackAlpha.400">
          <ModalHeader>Excluir aluno</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Tem certeza que deseja excluir <Text as="span" fontWeight="bold">{deletingAthlete?.name}</Text>?
            </Text>
            <Text mt="2" color="gray.400" fontSize="sm">
              Isso remove também as respostas de formulários vinculadas a este aluno.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={deleteModal.onClose}>
              Cancelar
            </Button>
            <Button leftIcon={<FiTrash2 />} colorScheme="red" onClick={handleDeleteAthlete} isLoading={deleting}>
              Excluir
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={scheduleModal.isOpen} onClose={closeScheduleModal} size="lg">
        <ModalOverlay />
        <ModalContent bg="#18181b" color="gray.100" border="1px solid" borderColor="blackAlpha.400">
          <ModalHeader>Cronograma de treinos</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color="gray.400" fontSize="sm" mb="4">
              Aluno: {scheduleAthlete?.name}
            </Text>

            {loadingSchedule || loadingTrainings ? (
              <Flex align="center" justify="center" py="8">
                <Spinner />
              </Flex>
            ) : (
              <SimpleGrid columns={[1, null, 2]} spacing="4">
                {weekDays.map((day) => (
                  <FormControl key={day.key}>
                    <FormLabel>{day.label}</FormLabel>
                    <Select
                      value={scheduleDraft[day.key]}
                      onChange={(e) => handleScheduleChange(day.key, e.target.value)}
                      bg="#0f0f10"
                    >
                      <option value="">Sem treino</option>
                      {trainings.map((training) => (
                        <option key={training.id} value={training.id}>
                          {training.title}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                ))}
              </SimpleGrid>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={closeScheduleModal}>
              Cancelar
            </Button>
            <Button bg="#facc15" color="black" _hover={{ bg: '#eab308' }} onClick={handleSaveSchedule} isLoading={savingSchedule}>
              Salvar cronograma
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={paymentsModal.isOpen} onClose={closePaymentsModal} size="xl">
        <ModalOverlay />
        <ModalContent bg="#18181b" color="gray.100" border="1px solid" borderColor="blackAlpha.400">
          <ModalHeader>Pagamentos do aluno</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color="gray.400" fontSize="sm" mb="4">
              Aluno: {paymentsAthlete?.name || 'N/A'}
            </Text>

            <Box bg="#0f0f10" border="1px solid" borderColor="blackAlpha.400" borderRadius="lg" p="4">
              <Flex align="center" justify="space-between" mb="2" wrap="wrap" gap="3">
                <Text fontWeight="bold">Novo pagamento</Text>
                <FormControl display="flex" alignItems="center" w="auto">
                  <FormLabel mb="0" fontSize="sm">
                    Bloquear treinos do personal
                  </FormLabel>
                  <Switch
                    isChecked={blockTrainerTrainings}
                    onChange={(e) => handleTrainingBlockToggle(e.target.checked)}
                    isDisabled={savingTrainingBlock}
                  />
                </FormControl>
              </Flex>
              <Text fontSize="xs" color="gray.500" mb="4">
                Treinos do personal ficam bloqueados quando houver pagamento pendente.
              </Text>

              <SimpleGrid columns={[1, null, 2]} spacing="4">
                <FormControl>
                  <FormLabel>Valor</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                    bg="#0f0f10"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Vencimento</FormLabel>
                  <Input
                    type="date"
                    value={paymentForm.dueDate}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    bg="#0f0f10"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={paymentForm.status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as PaymentStatus;
                      setPaymentForm((prev) => ({
                        ...prev,
                        status: nextStatus,
                        paidAt: nextStatus === 'PAID' ? prev.paidAt || buildToday() : ''
                      }));
                    }}
                    bg="#0f0f10"
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="PAID">Pago</option>
                    <option value="OVERDUE">Atrasado</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Forma de pagamento</FormLabel>
                  <Select
                    value={paymentForm.paymentMethod}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({ ...prev, paymentMethod: e.target.value as PaymentMethod | '' }))
                    }
                    placeholder="Selecione"
                    bg="#0f0f10"
                  >
                    <option value="PIX">PIX</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="CARTAO">Cartao</option>
                  </Select>
                </FormControl>
                {paymentForm.status === 'PAID' && (
                  <FormControl>
                    <FormLabel>Pago em</FormLabel>
                    <Input
                      type="date"
                      value={paymentForm.paidAt}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, paidAt: e.target.value }))}
                      bg="#0f0f10"
                    />
                  </FormControl>
                )}
                <FormControl gridColumn={[1, null, 2]}>
                  <FormLabel>Observacao</FormLabel>
                  <Input
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Opcional"
                    bg="#0f0f10"
                  />
                </FormControl>
              </SimpleGrid>

              <Button
                mt="4"
                bg="#facc15"
                color="black"
                _hover={{ bg: '#eab308' }}
                onClick={handleCreatePayment}
                isLoading={savingPayment}
              >
                Adicionar pagamento
              </Button>
            </Box>

            <Box mt="5">
              <Flex align="center" justify="space-between" mb="3" wrap="wrap" gap="2">
                <Text fontWeight="bold">Historico</Text>
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="yellow"
                  onClick={() => paymentsAthlete && loadPayments(paymentsAthlete.id)}
                  isLoading={loadingPayments}
                >
                  Atualizar
                </Button>
              </Flex>

              {loadingPayments ? (
                <Flex align="center" justify="center" py="6">
                  <Spinner />
                </Flex>
              ) : payments.length === 0 ? (
                <Box
                  bg="#0f0f10"
                  borderRadius="lg"
                  border="1px dashed"
                  borderColor="gray.600"
                  p="6"
                  textAlign="center"
                  color="gray.400"
                >
                  Nenhum pagamento registrado.
                </Box>
              ) : (
                <Stack spacing="3">
                  {payments.map((payment) => (
                    <Box key={payment.id} bg="#0f0f10" borderRadius="lg" border="1px solid" borderColor="blackAlpha.400" p="4">
                      <Flex justify="space-between" align={['flex-start', null, 'center']} gap="3" wrap="wrap">
                        <Box>
                          <HStack spacing="2" mb="2">
                            <Text fontWeight="bold">{formatCurrencyBRL(payment.amount)}</Text>
                            <Badge colorScheme={statusColors[payment.status]} variant="subtle">
                              {statusLabels[payment.status]}
                            </Badge>
                            {payment.paymentMethod && (
                              <Badge colorScheme="blue" variant="subtle">
                                {payment.paymentMethod}
                              </Badge>
                            )}
                          </HStack>
                          <Text fontSize="sm" color="gray.400">
                            Vencimento: {formatShortDate(payment.dueDate)}
                          </Text>
                          <Text fontSize="sm" color="gray.400">
                            Pago em: {formatShortDate(payment.paidAt)}
                          </Text>
                          {payment.notes && (
                            <Text fontSize="xs" color="gray.500" mt="1">
                              Obs: {payment.notes}
                            </Text>
                          )}
                        </Box>
                        <HStack spacing="2" flexWrap="wrap" justifyContent="flex-end">
                          <Button
                            size="xs"
                            variant="outline"
                            colorScheme="yellow"
                            onClick={() => startEditPayment(payment)}
                            isDisabled={editingPaymentId !== null && editingPaymentId !== payment.id}
                          >
                            Editar
                          </Button>
                          {payment.status !== 'PAID' && (
                            <Button
                              size="xs"
                              variant="outline"
                              colorScheme="green"
                              onClick={() => handleMarkPaid(payment.id)}
                              isLoading={updatingPaymentId === payment.id}
                              isDisabled={editingPaymentId === payment.id}
                            >
                              Marcar pago
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleDeletePayment(payment.id)}
                            isLoading={deletingPaymentId === payment.id}
                            isDisabled={editingPaymentId === payment.id}
                          >
                            Excluir
                          </Button>
                        </HStack>
                      </Flex>
                      {editingPaymentId === payment.id && (
                        <Box mt="4" bg="#111113" borderRadius="md" border="1px solid" borderColor="blackAlpha.400" p="3">
                          <SimpleGrid columns={[1, null, 2]} spacing="3">
                            <FormControl>
                              <FormLabel>Valor</FormLabel>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editPaymentForm.amount}
                                onChange={(e) => setEditPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                                bg="#0f0f10"
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>Vencimento</FormLabel>
                              <Input
                                type="date"
                                value={editPaymentForm.dueDate}
                                onChange={(e) => setEditPaymentForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                                bg="#0f0f10"
                              />
                            </FormControl>
                          </SimpleGrid>
                          <HStack spacing="2" mt="3">
                            <Button
                              size="sm"
                              bg="#facc15"
                              color="black"
                              _hover={{ bg: '#eab308' }}
                              onClick={() => handleSaveEditPayment(payment.id)}
                              isLoading={savingEditPaymentId === payment.id}
                            >
                              Salvar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditPayment}>
                              Cancelar
                            </Button>
                          </HStack>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};
