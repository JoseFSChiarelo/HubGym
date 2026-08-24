import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { prisma } from '../prismaClient';
import { authenticate, AuthRequest } from '../middleware/auth';

export const athleteRouter = Router();

athleteRouter.use(authenticate);

// Apenas ATHLETE
athleteRouter.use((req: AuthRequest, res, next) => {
  if (!req.user || req.user.role !== 'ATHLETE') {
    return res.status(403).json({ message: 'Acesso restrito a alunos/atletas' });
  }
  next();
});

async function getAthlete(userId: string) {
  return prisma.athlete.findUnique({ where: { userId } });
}

const shouldBlockTrainerTrainings = async (athlete: { id: string; blockTrainerTrainings?: boolean | null }) => {
  if (!athlete.blockTrainerTrainings) return false;
  const unpaid = await prisma.athletePayment.findFirst({
    where: {
      athleteId: athlete.id,
      status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] }
    },
    select: { id: true }
  });
  return Boolean(unpaid);
};

const normalizeOptional = (value?: string | null) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

athleteRouter.get('/me', async (req: AuthRequest, res) => {
  const athlete = await prisma.athlete.findUnique({
    where: { userId: req.user!.id },
    include: { user: { select: { email: true } }, personal: { select: { id: true, name: true } } }
  });
  if (!athlete) return res.status(404).json({ message: 'Perfil de atleta nao encontrado' });
  return res.json(athlete);
});

athleteRouter.put('/me', async (req: AuthRequest, res) => {
  const { name, age, document, phone, cep, paymentMethod, avatarUrl } = req.body as {
    name?: string;
    age?: number | null;
    document?: string | null;
    phone?: string | null;
    cep?: string | null;
    paymentMethod?: PaymentMethod | null;
    avatarUrl?: string | null;
  };

  const athlete = await prisma.athlete.findUnique({ where: { userId: req.user!.id } });
  if (!athlete) return res.status(404).json({ message: 'Perfil de atleta nao encontrado' });

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ message: 'Informe o nome' });
  }

  if (paymentMethod !== undefined && paymentMethod !== null) {
    const allowed = new Set<PaymentMethod>(['PIX', 'DINHEIRO', 'CARTAO']);
    if (!allowed.has(paymentMethod)) {
      return res.status(400).json({ message: 'Forma de pagamento invalida' });
    }
  }

  try {
    const updated = await prisma.athlete.update({
      where: { id: athlete.id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        age: age === undefined ? undefined : age === null ? null : Number(age),
        document: normalizeOptional(document),
        phone: normalizeOptional(phone),
        cep: normalizeOptional(cep),
        paymentMethod: paymentMethod === undefined ? undefined : paymentMethod,
        avatarUrl: avatarUrl === undefined ? undefined : normalizeOptional(avatarUrl)
      }
    });
    return res.json(updated);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Documento ja cadastrado' });
    }
    return res.status(400).json({ message: 'Nao foi possivel atualizar o perfil' });
  }
});

athleteRouter.put('/me/password', async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Informe a senha atual e a nova senha' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'A nova senha deve ter ao menos 6 caracteres' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ message: 'Usuario nao encontrado' });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Senha atual incorreta' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return res.json({ message: 'Senha atualizada' });
});

athleteRouter.get('/forms', async (req: AuthRequest, res) => {
  const athlete = await getAthlete(req.user!.id);
  if (!athlete) return res.status(404).json({ message: 'Perfil de atleta não encontrado' });

  const requests = await prisma.formRequest.findMany({
    where: { athleteId: athlete.id },
    include: {
      form: { include: { fields: true, personal: { select: { name: true, id: true } } } },
      response: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return res.json(requests);
});

athleteRouter.get('/forms/:requestId', async (req: AuthRequest, res) => {
  const { requestId } = req.params;
  const athlete = await getAthlete(req.user!.id);
  if (!athlete) return res.status(404).json({ message: 'Perfil de atleta não encontrado' });

  const request = await prisma.formRequest.findFirst({
    where: { id: requestId, athleteId: athlete.id },
    include: {
      form: { include: { fields: true, personal: { select: { name: true, id: true } } } },
      response: true
    }
  });

  if (!request) return res.status(404).json({ message: 'Formulário não encontrado' });
  return res.json(request);
});

athleteRouter.post('/forms/:requestId/responses', async (req: AuthRequest, res) => {
  const { requestId } = req.params;
  const { answers } = req.body as { answers?: Record<string, unknown> };

  const athlete = await getAthlete(req.user!.id);
  if (!athlete) return res.status(404).json({ message: 'Perfil de atleta não encontrado' });

  const request = await prisma.formRequest.findFirst({
    where: { id: requestId, athleteId: athlete.id },
    include: { form: { include: { fields: true } } }
  });

  if (!request) return res.status(404).json({ message: 'Solicitação de formulário não encontrada' });
  if (request.status === 'RESPONDED') {
    return res.status(409).json({ message: 'Formulário já respondido' });
  }

  // Validação simples: todos obrigatórios devem existir no payload
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ message: 'Respostas inválidas' });
  }

  const missingRequired = request.form.fields.filter((f) => f.required && !(f.id in answers));
  if (missingRequired.length > 0) {
    return res.status(400).json({
      message: `Campos obrigatórios ausentes: ${missingRequired.map((f) => f.label).join(', ')}`
    });
  }

  await prisma.$transaction([
    prisma.formResponse.create({
      data: {
        formId: request.formId,
        athleteId: athlete.id,
        requestId,
        answers: answers as any
      }
    }),
    prisma.formRequest.update({
      where: { id: requestId },
      data: { status: 'RESPONDED', respondedAt: new Date() }
    })
  ]);

  return res.status(201).json({ message: 'Respostas registradas' });
});

athleteRouter.get('/trainings', async (req: AuthRequest, res) => {
  const athlete = await getAthlete(req.user!.id);
  if (!athlete) return res.status(404).json({ message: 'Perfil de atleta n?o encontrado' });

  if (await shouldBlockTrainerTrainings(athlete)) {
    return res.status(403).json({
      message: 'Treinos do personal bloqueados. Pagamento pendente.',
      code: 'TRAINING_BLOCKED'
    });
  }

  if (await shouldBlockTrainerTrainings(athlete)) {
    return res.status(403).json({
      message: 'Treino do personal bloqueado. Pagamento pendente.',
      code: 'TRAINING_BLOCKED'
    });
  }

  if (await shouldBlockTrainerTrainings(athlete)) {
    return res.status(403).json({
      message: 'Treino do personal bloqueado. Pagamento pendente.',
      code: 'TRAINING_BLOCKED'
    });
  }

  const schedule = (athlete.weeklySchedule || {}) as Record<string, string | null>;
  const scheduledIds = Array.from(
    new Set(Object.values(schedule).filter((value): value is string => typeof value === 'string' && value))
  );

  const trainings = await prisma.training.findMany({
    where: {
      personalId: athlete.personalId,
      OR: [{ athleteId: athlete.id }, { id: { in: scheduledIds } }]
    },
    include: { personal: { select: { id: true, name: true } } },
    orderBy: { updatedAt: 'desc' }
  });

  return res.json(trainings);
});


const weekDayKeys = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

athleteRouter.get('/today-training', async (req: AuthRequest, res) => {
  const athlete = await getAthlete(req.user!.id);
  if (!athlete) return res.status(404).json({ message: 'Perfil de atleta nÇœo encontrado' });

  const schedule = (athlete.weeklySchedule || {}) as Record<string, string | null>;
  const requestedDay = typeof req.query.day === 'string' ? req.query.day.toUpperCase() : '';
  const dayKey = weekDayKeys.includes(requestedDay as (typeof weekDayKeys)[number])
    ? (requestedDay as (typeof weekDayKeys)[number])
    : weekDayKeys[new Date().getDay()];
  const trainingId = schedule?.[dayKey] || null;

  if (!trainingId) {
    return res.json({ day: dayKey, training: null });
  }

  const training = await prisma.training.findFirst({
    where: { id: trainingId, personalId: athlete.personalId },
    select: { id: true, title: true, notes: true, exercises: true }
  });

  return res.json({ day: dayKey, training: training || null });
});

athleteRouter.get('/notices', async (req: AuthRequest, res) => {
  const athlete = await getAthlete(req.user!.id);
  if (!athlete) return res.status(404).json({ message: 'Perfil de atleta nao encontrado' });

  const limitRaw = Number(req.query.limit);
  const take = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 10;

  const notices = await prisma.notice.findMany({
    where: { personalId: athlete.personalId },
    orderBy: { createdAt: 'desc' },
    take
  });

  return res.json(notices);
});

athleteRouter.get('/trainings/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const athlete = await getAthlete(req.user!.id);
  if (!athlete) return res.status(404).json({ message: 'Perfil de atleta n?o encontrado' });

  const schedule = (athlete.weeklySchedule || {}) as Record<string, string | null>;
  const scheduledIds = Array.from(
    new Set(Object.values(schedule).filter((value): value is string => typeof value === 'string' && value))
  );

  const training = await prisma.training.findFirst({
    where: {
      id,
      personalId: athlete.personalId,
      OR: [{ athleteId: athlete.id }, { id: { in: scheduledIds } }]
    },
    include: { personal: { select: { id: true, name: true } } }
  });

  if (!training) return res.status(404).json({ message: 'Treino n?o encontrado' });
  return res.json(training);
});
