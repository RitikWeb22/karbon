import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ENV } from './config/env.js';
import { errorHandler } from './middlewares/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from './modules/auth/auth.routes.js';
import workspaceRoutes from './modules/workspaces/workspace.routes.js';
import projectRoutes from './modules/projects/project.routes.js';
import boardRoutes from './modules/boards/board.routes.js';
import taskRoutes from './modules/tasks/task.routes.js';
import commentRoutes from './modules/comments/comment.routes.js';
import activityRoutes from './modules/activity/activity.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import searchRoutes from './modules/search/search.routes.js';

export const createApp = () => {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, mobile, server-to-server) or any frontend origin
        callback(null, true);
      },
      credentials: true,
    })
  );

  app.use(morgan('dev'));
  app.use(
    express.json({
      limit: '50mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      platform: 'Karbon API',
      timestamp: new Date().toISOString(),
    });
  });

  // REST API v1 Routing - supports both scoped and header-driven tenancy
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/workspaces', workspaceRoutes);

  // Direct tenant routes (reads x-workspace-id header)
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/boards', boardRoutes);
  app.use('/api/v1/tasks', taskRoutes);
  app.use('/api/v1/comments', commentRoutes);
  app.use('/api/v1/activity', activityRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/billing', billingRoutes);
  app.use('/api/v1/search', searchRoutes);

  // Also support nested /workspaces/:workspaceId/... path routes
  app.use('/api/v1/workspaces/:workspaceId/projects', projectRoutes);
  app.use('/api/v1/workspaces/:workspaceId/boards', boardRoutes);
  app.use('/api/v1/workspaces/:workspaceId/tasks', taskRoutes);
  app.use('/api/v1/workspaces/:workspaceId/comments', commentRoutes);
  app.use('/api/v1/workspaces/:workspaceId/activity', activityRoutes);
  app.use('/api/v1/workspaces/:workspaceId/analytics', analyticsRoutes);
  app.use('/api/v1/workspaces/:workspaceId/billing', billingRoutes);
  app.use('/api/v1/workspaces/:workspaceId/search', searchRoutes);

  // Serve Frontend Static Files in production if client/dist exists
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
};
