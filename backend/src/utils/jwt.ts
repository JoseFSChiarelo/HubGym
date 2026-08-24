import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'development_secret_change_me';
const EXPIRES_IN = '7d';

export function generateToken(userId: string, role: Role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: EXPIRES_IN });
}
