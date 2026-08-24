import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { FormFieldType, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';
import { authenticate, AuthRequest } from '../middleware/auth';

export const personalRouter = Router();

personalRouter.use(authenticate);

// Restrito a PERSONAL
personalRouter.use((req: AuthRequest, res, next) => {
  if (!req.user || req.user.role !== 'PERSONAL') {
    return res.status(403).json({ message: 'Acesso restrito a personal trainers' });
  }
  next();
});

personalRouter.get('/me', async (req: AuthRequest, res) => {
  const personal = await prisma.personalProfile.findUnique({
    where: { userId: req.user!.id },
    include: { user: { select: { email: true } } }
  });
  if (!personal) return res.status(404).json({ message: 'Perfil não encontrado' });
  return res.json(personal);
});

personalRouter.put('/me', async (req: AuthRequest, res) => {
  const { name, phone, cpf, cref } = req.body as {
    name?: string;
    phone?: string | null;
    cpf?: string | null;
    cref?: string | null;
  };

  try {
    const updated = await prisma.personalProfile.update({
      where: { userId: req.user!.id },
      data: { name, phone, cpf, cref }
    });
    return res.json(updated);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'CPF ou CREF já cadastrado' });
    }
    return res.status(400).json({ message: 'Não foi possível atualizar o perfil' });
  }
});

// === Alunos / Atletas ===
personalRouter.post('/athletes', async (req: AuthRequest, res) => {
  const { email, password, name, age, document, phone, cep, paymentMethod, blockTrainerTrainings, paymentAmount, paymentDueDate } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    age?: number;
    document?: string;
    phone?: string;
    cep?: string;
    paymentMethod?: PaymentMethod;
    blockTrainerTrainings?: boolean;
    paymentAmount?: number | string;
    paymentDueDate?: string;
  };

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
  }

  if (blockTrainerTrainings !== undefined && typeof blockTrainerTrainings !== 'boolean') {
    return res.status(400).json({ message: 'blockTrainerTrainings deve ser boolean' });
  }

  const wantsPayment = paymentAmount !== undefined || paymentDueDate !== undefined;
  let paymentAmountValue: number | null = null;
  let paymentDueDateValue: Date | null = null;

  if (wantsPayment) {
    const parsedAmount = Number(paymentAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'paymentAmount invalido' });
    }
    if (!paymentDueDate || typeof paymentDueDate !== 'string') {
      return res.status(400).json({ message: 'paymentDueDate invalido' });
    }
    const parsedDueDate = new Date(paymentDueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ message: 'paymentDueDate invalido' });
    }
    paymentAmountValue = parsedAmount;
    paymentDueDateValue = parsedDueDate;
  }

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal não encontrado' });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return res.status(409).json({ message: 'Email já cadastrado' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: 'ATHLETE',
        athlete: {
          create: {
            personalId: personal.id,
            name,
            age: age ? Number(age) : null,
            document,
            phone,
            cep,
            paymentMethod: paymentMethod ?? null,
            blockTrainerTrainings: blockTrainerTrainings === undefined ? undefined : blockTrainerTrainings
          }
        }
      },
      include: { athlete: true }
    });

    if (wantsPayment && created.athlete?.id) {
      await tx.athletePayment.create({
        data: {
          athleteId: created.athlete.id,
          personalId: personal.id,
          amount: paymentAmountValue ?? 0,
          dueDate: paymentDueDateValue!,
          status: 'PENDING',
          paymentMethod: paymentMethod ?? null
        }
      });
    }

    return created;
  });

  return res.status(201).json({
    id: user.athlete?.id,
    userId: user.id,
    email: user.email,
    name,
    age,
    document,
    phone,
    cep,
    paymentMethod,
    blockTrainerTrainings: user.athlete?.blockTrainerTrainings ?? false
  });
});

personalRouter.get('/athletes', async (req: AuthRequest, res) => {
  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal não encontrado' });

  const athletes = await prisma.athlete.findMany({
    where: { personalId: personal.id },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' }
  });

  return res.json(athletes);
});

personalRouter.put('/athletes/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, age, document, phone, cep, paymentMethod } = req.body as {
    name?: string;
    age?: number;
    document?: string;
    phone?: string;
    cep?: string;
    paymentMethod?: PaymentMethod;
  };

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal não encontrado' });

  const athlete = await prisma.athlete.findFirst({ where: { id, personalId: personal.id } });
  if (!athlete) return res.status(404).json({ message: 'Aluno não encontrado' });

  try {
    const updated = await prisma.athlete.update({
      where: { id },
      data: {
        name,
        age: age ? Number(age) : null,
        document,
        phone,
        cep,
        paymentMethod: paymentMethod ?? null
      }
    });
    return res.json(updated);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Documento já cadastrado' });
    }
    return res.status(400).json({ message: 'Não foi possível atualizar o aluno' });
  }
});

const scheduleDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
type ScheduleDay = (typeof scheduleDays)[number];

const paymentStatuses = new Set<PaymentStatus>(['PAID', 'PENDING', 'OVERDUE']);
const paymentMethods = new Set<PaymentMethod>(['PIX', 'DINHEIRO', 'CARTAO']);

const parseDate = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeSchedule = (input: Record<string, unknown>) =>
  scheduleDays.reduce<Record<ScheduleDay, string | null>>((acc, day) => {
    const value = input[day];
    acc[day] = typeof value === 'string' && value.trim() ? value : null;
    return acc;
  }, {} as Record<ScheduleDay, string | null>);

personalRouter.get('/athletes/:id/schedule', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal não encontrado' });

  const athlete = await prisma.athlete.findFirst({
    where: { id, personalId: personal.id },
    select: { weeklySchedule: true }
  });
  if (!athlete) return res.status(404).json({ message: 'Aluno não encontrado' });

  const schedule = normalizeSchedule((athlete.weeklySchedule || {}) as Record<string, unknown>);
  return res.json({ schedule });
});

personalRouter.put('/athletes/:id/schedule', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { schedule } = req.body as { schedule?: Record<string, unknown> };

  if (!schedule || typeof schedule !== 'object') {
    return res.status(400).json({ message: 'Schedule inválido' });
  }

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal não encontrado' });

  const athlete = await prisma.athlete.findFirst({ where: { id, personalId: personal.id } });
  if (!athlete) return res.status(404).json({ message: 'Aluno não encontrado' });

  const normalizedSchedule = normalizeSchedule(schedule);
  const trainingIds = Object.values(normalizedSchedule).filter((value): value is string => typeof value === 'string' && value);
  const uniqueTrainingIds = Array.from(new Set(trainingIds));

  if (uniqueTrainingIds.length > 0) {
    const trainings = await prisma.training.findMany({
      where: { id: { in: uniqueTrainingIds }, personalId: personal.id },
      select: { id: true, athleteId: true }
    });

    if (trainings.length !== uniqueTrainingIds.length) {
      return res.status(404).json({ message: 'Treino não encontrado' });
    }

    // Mantém o treino reutilizável entre alunos (vínculo é feito apenas no cronograma).
  }

  const updated = await prisma.athlete.update({
    where: { id: athlete.id },
    data: { weeklySchedule: normalizedSchedule }
  });

  return res.json({ schedule: normalizeSchedule((updated.weeklySchedule || {}) as Record<string, unknown>) });
});

personalRouter.patch('/athletes/:id/training-block', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { blockTrainerTrainings } = req.body as { blockTrainerTrainings?: boolean };

  if (typeof blockTrainerTrainings !== 'boolean') {
    return res.status(400).json({ message: 'blockTrainerTrainings deve ser boolean' });
  }

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nao encontrado' });

  const athlete = await prisma.athlete.findFirst({ where: { id, personalId: personal.id } });
  if (!athlete) return res.status(404).json({ message: 'Aluno nao encontrado' });

  const updated = await prisma.athlete.update({
    where: { id: athlete.id },
    data: { blockTrainerTrainings }
  });

  return res.json(updated);
});

// === Pagamentos de alunos ===
personalRouter.get('/athletes/:id/payments', async (req: AuthRequest, res) => {
  const { id } = req.params;

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nao encontrado' });

  const athlete = await prisma.athlete.findFirst({ where: { id, personalId: personal.id } });
  if (!athlete) return res.status(404).json({ message: 'Aluno nao encontrado' });

  const payments = await prisma.athletePayment.findMany({
    where: { athleteId: athlete.id },
    orderBy: { dueDate: 'desc' }
  });

  return res.json(payments);
});

personalRouter.post('/athletes/:id/payments', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { amount, dueDate, status, paymentMethod, paidAt, notes } = req.body as {
    amount?: number | string;
    dueDate?: string;
    status?: PaymentStatus;
    paymentMethod?: PaymentMethod | null;
    paidAt?: string | null;
    notes?: string | null;
  };

  if (amount === undefined || amount === null || dueDate === undefined) {
    return res.status(400).json({ message: 'amount e dueDate sao obrigatorios' });
  }

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nao encontrado' });

  const athlete = await prisma.athlete.findFirst({ where: { id, personalId: personal.id } });
  if (!athlete) return res.status(404).json({ message: 'Aluno nao encontrado' });

  const amountValue = Number(amount);
  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    return res.status(400).json({ message: 'amount invalido' });
  }

  const dueDateValue = parseDate(dueDate);
  if (!dueDateValue) {
    return res.status(400).json({ message: 'dueDate invalido' });
  }

  const statusValue = status ?? 'PENDING';
  if (!paymentStatuses.has(statusValue)) {
    return res.status(400).json({ message: 'status invalido' });
  }

  let paymentMethodValue: PaymentMethod | null | undefined = undefined;
  if (paymentMethod !== undefined) {
    if (paymentMethod === null || (typeof paymentMethod === 'string' && paymentMethod.trim() === '')) {
      paymentMethodValue = null;
    } else if (!paymentMethods.has(paymentMethod)) {
      return res.status(400).json({ message: 'paymentMethod invalido' });
    } else {
      paymentMethodValue = paymentMethod;
    }
  }

  let paidAtValue: Date | null = null;
  if (statusValue === 'PAID') {
    if (paidAt) {
      const parsedPaidAt = parseDate(paidAt);
      if (!parsedPaidAt) {
        return res.status(400).json({ message: 'paidAt invalido' });
      }
      paidAtValue = parsedPaidAt;
    } else {
      paidAtValue = new Date();
    }
  }

  const created = await prisma.athletePayment.create({
    data: {
      athleteId: athlete.id,
      personalId: personal.id,
      amount: amountValue,
      dueDate: dueDateValue,
      status: statusValue,
      paidAt: paidAtValue,
      paymentMethod: paymentMethodValue,
      notes: notes && notes.trim() ? notes.trim() : null
    }
  });

  return res.status(201).json(created);
});

personalRouter.patch('/athletes/:id/payments/:paymentId', async (req: AuthRequest, res) => {
  const { id, paymentId } = req.params;
  const { amount, dueDate, status, paymentMethod, paidAt, notes } = req.body as {
    amount?: number | string;
    dueDate?: string;
    status?: PaymentStatus;
    paymentMethod?: PaymentMethod | null;
    paidAt?: string | null;
    notes?: string | null;
  };

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nao encontrado' });

  const athlete = await prisma.athlete.findFirst({ where: { id, personalId: personal.id } });
  if (!athlete) return res.status(404).json({ message: 'Aluno nao encontrado' });

  const payment = await prisma.athletePayment.findFirst({
    where: { id: paymentId, athleteId: athlete.id, personalId: personal.id }
  });
  if (!payment) return res.status(404).json({ message: 'Pagamento nao encontrado' });

  const data: Record<string, any> = {};

  if (amount !== undefined) {
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return res.status(400).json({ message: 'amount invalido' });
    }
    data.amount = amountValue;
  }

  if (dueDate !== undefined) {
    const dueDateValue = parseDate(dueDate);
    if (!dueDateValue) {
      return res.status(400).json({ message: 'dueDate invalido' });
    }
    data.dueDate = dueDateValue;
  }

  if (status !== undefined) {
    if (!paymentStatuses.has(status)) {
      return res.status(400).json({ message: 'status invalido' });
    }
    data.status = status;
  }

  if (paymentMethod !== undefined) {
    if (paymentMethod === null || (typeof paymentMethod === 'string' && paymentMethod.trim() === '')) {
      data.paymentMethod = null;
    } else if (!paymentMethods.has(paymentMethod)) {
      return res.status(400).json({ message: 'paymentMethod invalido' });
    } else {
      data.paymentMethod = paymentMethod;
    }
  }

  if (notes !== undefined) {
    data.notes = notes && notes.trim() ? notes.trim() : null;
  }

  if (paidAt !== undefined) {
    if (status !== 'PAID') {
      return res.status(400).json({ message: 'paidAt requer status PAID' });
    }
    if (paidAt === null) {
      data.paidAt = null;
    } else {
      const parsedPaidAt = parseDate(paidAt);
      if (!parsedPaidAt) {
        return res.status(400).json({ message: 'paidAt invalido' });
      }
      data.paidAt = parsedPaidAt;
    }
  }

  if (data.status === 'PAID' && data.paidAt === undefined) {
    data.paidAt = payment.paidAt ?? new Date();
  }
  if (data.status && data.status !== 'PAID') {
    data.paidAt = null;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'Nenhum campo para atualizar' });
  }

  const updated = await prisma.athletePayment.update({
    where: { id: payment.id },
    data
  });

  return res.json(updated);
});

personalRouter.delete('/athletes/:id/payments/:paymentId', async (req: AuthRequest, res) => {
  const { id, paymentId } = req.params;

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nao encontrado' });

  const athlete = await prisma.athlete.findFirst({ where: { id, personalId: personal.id } });
  if (!athlete) return res.status(404).json({ message: 'Aluno nao encontrado' });

  const payment = await prisma.athletePayment.findFirst({
    where: { id: paymentId, athleteId: athlete.id, personalId: personal.id }
  });
  if (!payment) return res.status(404).json({ message: 'Pagamento nao encontrado' });

  await prisma.athletePayment.delete({ where: { id: payment.id } });
  return res.status(204).send();
});


// === Avisos para alunos ===
personalRouter.get('/notices', async (req: AuthRequest, res) => {
  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nao encontrado' });

  const limitRaw = Number(req.query.limit);
  const take = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 20;

  const notices = await prisma.notice.findMany({
    where: { personalId: personal.id },
    orderBy: { createdAt: 'desc' },
    take
  });

  return res.json(notices);
});

personalRouter.post('/notices', async (req: AuthRequest, res) => {
  const { title, message } = req.body as { title?: string; message?: string };

  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'Mensagem do aviso e obrigatoria' });
  }

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nao encontrado' });

  const created = await prisma.notice.create({
    data: {
      personalId: personal.id,
      title: title && title.trim() ? title.trim() : null,
      message: message.trim()
    }
  });

  return res.status(201).json(created);
});

// === Formulários personalizáveis ===
personalRouter.delete('/athletes/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nÆo encontrado' });

  const athlete = await prisma.athlete.findFirst({ where: { id, personalId: personal.id } });
  if (!athlete) return res.status(404).json({ message: 'Aluno nÆo encontrado' });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.formResponse.deleteMany({ where: { athleteId: athlete.id } });
      await tx.formRequest.deleteMany({ where: { athleteId: athlete.id } });
      await tx.athletePayment.deleteMany({ where: { athleteId: athlete.id } });
      await tx.training.updateMany({ where: { athleteId: athlete.id }, data: { athleteId: null } });
      await tx.athlete.delete({ where: { id: athlete.id } });
      await tx.user.delete({ where: { id: athlete.userId } });
    });
    return res.status(204).send();
  } catch (err: any) {
    console.error('Erro ao excluir aluno', err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2003') {
        return res.status(409).json({ message: 'Nao foi possivel excluir o aluno. Existem dados vinculados.' });
      }
      if (err.code === 'P2021') {
        return res
          .status(500)
          .json({ message: 'Tabela nao encontrada no banco. Rode as migrations do Prisma.' });
      }
      if (err.code === 'P2025') {
        return res.status(404).json({ message: 'Aluno ou usuario nao encontrado.' });
      }
    }
    return res.status(400).json({ message: 'Nao foi possivel excluir o aluno' });
  }
});

personalRouter.post('/forms', async (req: AuthRequest, res) => {
  const { title, description, fields } = req.body as {
    title?: string;
    description?: string;
    fields?: Array<{
      label: string;
      type: FormFieldType;
      required?: boolean;
      options?: string[];
    }>;
  };

  if (!title || !fields || !Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({ message: 'Título e campos são obrigatórios' });
  }

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal não encontrado' });

  const validTypes = new Set<FormFieldType>(['TEXT', 'NUMBER', 'BOOLEAN', 'MULTIPLE_CHOICE']);
  for (const field of fields) {
    if (!validTypes.has(field.type)) {
      return res.status(400).json({ message: `Tipo de campo inválido: ${field.type}` });
    }
  }

  const form = await prisma.form.create({
    data: {
      personalId: personal.id,
      title,
      description,
      fields: {
        create: fields.map((f) => ({
          label: f.label,
          type: f.type,
          required: f.required ?? true,
          options: f.options && f.options.length > 0 ? f.options : []
        }))
      }
    },
    include: { fields: true }
  });

  return res.status(201).json(form);
});

personalRouter.post('/forms/:id/assign', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { athleteId } = req.body as { athleteId?: string };

  if (!athleteId) return res.status(400).json({ message: 'athleteId obrigatório' });

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal não encontrado' });

  const [form, athlete] = await Promise.all([
    prisma.form.findFirst({ where: { id, personalId: personal.id } }),
    prisma.athlete.findFirst({ where: { id: athleteId, personalId: personal.id } })
  ]);

  if (!form) return res.status(404).json({ message: 'Formulário não encontrado' });
  if (!athlete) return res.status(404).json({ message: 'Aluno não encontrado' });

  const request = await prisma.formRequest.create({
    data: {
      formId: form.id,
      athleteId: athlete.id,
      status: 'PENDING'
    },
    include: { form: { include: { fields: true } } }
  });

  return res.status(201).json(request);
});

personalRouter.get('/forms/recent-responses', async (req: AuthRequest, res) => {
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nÇÎ"o encontrado' });

  const responses = await prisma.formResponse.findMany({
    where: { form: { personalId: personal.id } },
    include: {
      athlete: { select: { id: true, name: true, user: { select: { email: true } } } },
      form: {
        select: {
          id: true,
          title: true,
          fields: { select: { id: true, label: true, type: true, options: true, required: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return res.json(responses);
});

personalRouter.get('/forms/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nÇœo encontrado' });

  const form = await prisma.form.findFirst({
    where: { id, personalId: personal.id },
    include: { fields: true }
  });

  if (!form) return res.status(404).json({ message: 'FormulÇ­rio nÇœo encontrado' });
  return res.json(form);
});

personalRouter.get('/forms/:id/responses', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal não encontrado' });

  const form = await prisma.form.findFirst({ where: { id, personalId: personal.id } });
  if (!form) return res.status(404).json({ message: 'Formulário não encontrado' });

  const responses = await prisma.formResponse.findMany({
    where: { formId: id },
    include: {
      athlete: { select: { id: true, name: true, user: { select: { email: true } } } },
      request: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return res.json(responses);
});

// === Dashboard helpers ===
personalRouter.get('/payments/summary', async (req: AuthRequest, res) => {
  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nÇœo encontrado' });

  const payments = await prisma.payment.findMany({
    where: { personalId: personal.id },
    select: { status: true, amount: true }
  });

  const summary = payments.reduce(
    (acc, payment) => {
      if (payment.status === 'PAID') {
        acc.paidCount += 1;
        acc.paidAmount += payment.amount;
        return acc;
      }
      if (payment.status === 'OVERDUE') {
        acc.overdueCount += 1;
        acc.overdueAmount += payment.amount;
        return acc;
      }
      acc.pendingCount += 1;
      acc.pendingAmount += payment.amount;
      return acc;
    },
    {
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0
    }
  );

  return res.json(summary);
});

// === Treinos (biblioteca particular do treinador) ===
personalRouter.get('/trainings', async (req: AuthRequest, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nÇœo encontrado' });

  const trainings = await prisma.training.findMany({
    where: {
      personalId: personal.id,
      ...(q ? { title: { contains: q, mode: 'insensitive' } } : {})
    },
    include: {
      athlete: { select: { id: true, name: true, user: { select: { email: true } } } }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return res.json(trainings);
});

personalRouter.post('/trainings', async (req: AuthRequest, res) => {
  const { title, notes, exercises, athleteId } = req.body as {
    title?: string;
    notes?: string | null;
    exercises?: unknown;
    athleteId?: string | null;
  };

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'TÇðtulo do treino Ç¸ obrigatÇürio' });
  }
  if (!exercises) {
    return res.status(400).json({ message: 'ExercÇðcios do treino sÇœo obrigatÇürios' });
  }

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nÇœo encontrado' });

  if (athleteId) {
    const athlete = await prisma.athlete.findFirst({ where: { id: athleteId, personalId: personal.id } });
    if (!athlete) return res.status(404).json({ message: 'Aluno nÇœo encontrado' });
  }

  const created = await prisma.training.create({
    data: {
      personalId: personal.id,
      athleteId: athleteId ?? null,
      title: title.trim(),
      notes: notes ?? null,
      exercises: exercises as any
    },
    include: {
      athlete: { select: { id: true, name: true, user: { select: { email: true } } } }
    }
  });

  return res.status(201).json(created);
});

personalRouter.put('/trainings/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { title, notes, exercises, athleteId } = req.body as {
    title?: string;
    notes?: string | null;
    exercises?: unknown;
    athleteId?: string | null;
  };

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nÇœo encontrado' });

  const existing = await prisma.training.findFirst({ where: { id, personalId: personal.id } });
  if (!existing) return res.status(404).json({ message: 'Treino nÇœo encontrado' });

  if (athleteId) {
    const athlete = await prisma.athlete.findFirst({ where: { id: athleteId, personalId: personal.id } });
    if (!athlete) return res.status(404).json({ message: 'Aluno nÇœo encontrado' });
  }

  const updated = await prisma.training.update({
    where: { id },
    data: {
      title: title !== undefined ? title.trim() : undefined,
      notes: notes !== undefined ? notes : undefined,
      exercises: exercises !== undefined ? (exercises as any) : undefined,
      athleteId: athleteId !== undefined ? athleteId : undefined
    },
    include: {
      athlete: { select: { id: true, name: true, user: { select: { email: true } } } }
    }
  });

  return res.json(updated);
});

personalRouter.patch('/trainings/:id/assign', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { athleteId } = req.body as { athleteId?: string | null };

  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nÇœo encontrado' });

  const existing = await prisma.training.findFirst({ where: { id, personalId: personal.id } });
  if (!existing) return res.status(404).json({ message: 'Treino nÇœo encontrado' });

  if (athleteId) {
    const athlete = await prisma.athlete.findFirst({ where: { id: athleteId, personalId: personal.id } });
    if (!athlete) return res.status(404).json({ message: 'Aluno nÇœo encontrado' });
  }

  const updated = await prisma.training.update({
    where: { id },
    data: { athleteId: athleteId ?? null },
    include: {
      athlete: { select: { id: true, name: true, user: { select: { email: true } } } }
    }
  });

  return res.json(updated);
});

personalRouter.delete('/trainings/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const personal = await prisma.personalProfile.findUnique({ where: { userId: req.user!.id } });
  if (!personal) return res.status(404).json({ message: 'Perfil de personal nÇœo encontrado' });

  const existing = await prisma.training.findFirst({ where: { id, personalId: personal.id } });
  if (!existing) return res.status(404).json({ message: 'Treino nÇœo encontrado' });

  await prisma.training.delete({ where: { id } });
  return res.status(204).send();
});
