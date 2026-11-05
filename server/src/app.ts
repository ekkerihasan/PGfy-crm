import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler, notFoundHandler } from './lib/http';
import { authenticate } from './middleware/auth';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import leadRoutes from './routes/leads';
import callRoutes from './routes/calls';
import followUpRoutes from './routes/followUps';
import dashboardRoutes from './routes/dashboard';
import reportRoutes from './routes/reports';

export function createApp() {
  const app = express();
  app.use(cors({ origin: config.corsOrigin, exposedHeaders: ['Content-Disposition'] }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRoutes); // login is public; /me authenticates itself

  // Everything below requires a valid JWT.
  app.use('/api', authenticate);
  app.use('/api/users', userRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api', callRoutes); // /api/leads/:id/calls and /api/calls
  app.use('/api/follow-ups', followUpRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
