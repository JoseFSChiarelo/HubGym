import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prismaClient';
import { generateToken } from '../utils/jwt';
import { Role, PlanStatus } from '@prisma/client';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { email, password, role = 'PERSONAL', name, phone } = req.body as {
    email?: string;
    password?: string;
    role?: Role;
    name?: string;
    phone?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios' });
  }

  if (role === 'ADMIN') {
    return res
      .status(403)
      .json({ message: 'Criação de ADMIN deve ser feita manualmente no banco.' });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ message: 'Email já cadastrado' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      personal:
        role === 'PERSONAL'
          ? {
              create: {
                name: name || 'Personal sem nome',
                phone,
                planStatus: PlanStatus.PENDING
              }
            }
          : undefined
    },
    include: { personal: true }
  });

  const token = generateToken(user.id, user.role);
  const displayName = user.personal?.name ?? user.email;

  return res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: displayName,
      personalId: user.personal?.id
    }
  });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { personal: true, athlete: true }
  });
  if (!user) {
    return res.status(401).json({ message: 'Credenciais inválidas' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Credenciais inválidas' });
  }

  const token = generateToken(user.id, user.role);
  const displayName = user.athlete?.name ?? user.personal?.name ?? user.email;

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: displayName,
      personalId: user.personal?.id,
      athleteId: user.athlete?.id,
      avatarUrl: user.athlete?.avatarUrl ?? null
    }
  });
});
