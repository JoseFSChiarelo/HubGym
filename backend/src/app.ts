import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { personalRouter } from './routes/personal';
import { athleteRouter } from './routes/athlete';

// Optamos por Express para manter a API inicial simples e direta para o CRUD/admin.
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRouter);
app.use('/admins', adminRouter);
app.use('/personal', personalRouter);
app.use('/athlete', athleteRouter);

export { app };
