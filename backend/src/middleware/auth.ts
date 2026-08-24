import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'development_secret_change_me';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: Role;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: Role };
    req.user = { id: payload.userId, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Acesso restrito a administradores' });
  }
  next();
}
