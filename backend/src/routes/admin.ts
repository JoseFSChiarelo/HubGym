import { Router } from 'express';
import { PlanStatus } from '@prisma/client';
import { prisma } from '../prismaClient';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

export const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

adminRouter.get('/personals', async (req: AuthRequest, res) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 10;
  const status = req.query.status as PlanStatus | undefined;
  const where = status ? { planStatus: status } : {};

  const [total, personals] = await Promise.all([
    prisma.personalProfile.count({ where }),
    prisma.personalProfile.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { email: true, role: true } },
        plan: true
      }
    })
  ]);

  return res.json({
    data: personals,
    pagination: { page, pageSize, total }
  });
});

adminRouter.get('/personals/:id', async (req, res) => {
  const { id } = req.params;
  const personal = await prisma.personalProfile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, role: true } },
      plan: true,
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

  if (!personal) {
    return res.status(404).json({ message: 'Personal não encontrado' });
  }

  return res.json(personal);
});

adminRouter.put('/personals/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, planId } = req.body as {
    name?: string;
    phone?: string;
    planId?: string | null;
  };

  try {
    const updated = await prisma.personalProfile.update({
      where: { id },
      data: {
        name,
        phone,
        planId: planId ?? undefined
      }
    });
    return res.json(updated);
  } catch (err) {
    return res.status(404).json({ message: 'Personal não encontrado' });
  }
});

adminRouter.patch('/personals/:id/plan-status', async (req, res) => {
  const { id } = req.params;
  const { planStatus } = req.body as { planStatus?: PlanStatus };
  if (!planStatus) {
    return res.status(400).json({ message: 'planStatus é obrigatório' });
  }

  try {
    const updated = await prisma.personalProfile.update({
      where: { id },
      data: { planStatus }
    });
    return res.json(updated);
  } catch (err) {
    return res.status(404).json({ message: 'Personal não encontrado' });
  }
});

adminRouter.get('/metrics', async (_req, res) => {
  const [active, late, pending, upcoming] = await Promise.all([
    prisma.personalProfile.count({ where: { planStatus: 'ACTIVE' } }),
    prisma.personalProfile.count({ where: { planStatus: 'LATE' } }),
    prisma.personalProfile.count({ where: { planStatus: 'PENDING' } }),
    prisma.payment.count({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] },
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
        }
      }
    })
  ]);

  return res.json({ active, late, pending, upcomingDue: upcoming });
});

adminRouter.get('/config', async (_req, res) => {
  const config = await prisma.config.findUnique({ where: { id: 1 } });
  return res.json(
    config || { companyName: null, supportEmail: null, defaultPlan: null, terms: null }
  );
});

adminRouter.put('/config', async (req, res) => {
  const { companyName, supportEmail, defaultPlan, terms } = req.body as {
    companyName?: string | null;
    supportEmail?: string | null;
    defaultPlan?: number | null;
    terms?: string | null;
  };

  const config = await prisma.config.upsert({
    where: { id: 1 },
    update: { companyName, supportEmail, defaultPlan, terms },
    create: { id: 1, companyName, supportEmail, defaultPlan, terms }
  });

  return res.json(config);
});
