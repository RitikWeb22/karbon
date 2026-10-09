import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';

let ioInstance = null;

// Map of boardId -> Map of socketId -> { id, name, avatarUrl }
const boardPresence = new Map();

export const initSocketServer = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
      credentials: true,
    },
  });

  // Socket Authentication Middleware
  ioInstance.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select('name email avatarUrl');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      };
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  ioInstance.on('connection', (socket) => {
    // Join personal user room
    socket.join(`user:${socket.user._id}`);

    // Join Workspace Room
    socket.on('join:workspace', ({ workspaceId }) => {
      if (workspaceId) {
        socket.join(`workspace:${workspaceId}`);
      }
    });

    // Join Board Room and announce presence
    socket.on('join:board', ({ boardId, workspaceId }) => {
      if (!boardId) return;

      socket.join(`board:${boardId}`);
      socket.currentBoardId = boardId;

      if (!boardPresence.has(boardId)) {
        boardPresence.set(boardId, new Map());
      }
      boardPresence.get(boardId).set(socket.id, socket.user);

      // Broadcast active presence list to all viewers in this board
      const activeUsers = Array.from(boardPresence.get(boardId).values());
      ioInstance.to(`board:${boardId}`).emit('presence:sync:v1', {
        boardId,
        users: activeUsers,
      });
    });

    // Leave Board Room
    socket.on('leave:board', ({ boardId }) => {
      if (!boardId) return;
      socket.leave(`board:${boardId}`);

      if (boardPresence.has(boardId)) {
        boardPresence.get(boardId).delete(socket.id);
        const activeUsers = Array.from(boardPresence.get(boardId).values());
        ioInstance.to(`board:${boardId}`).emit('presence:sync:v1', {
          boardId,
          users: activeUsers,
        });
      }
    });

    // Task discussion rooms and typing status
    socket.on('join:task', ({ taskId }) => {
      if (taskId) socket.join(`task:${taskId}`);
    });

    socket.on('leave:task', ({ taskId }) => {
      if (taskId) socket.leave(`task:${taskId}`);
    });

    socket.on('typing:start', ({ taskId }) => {
      socket.to(`task:${taskId}`).emit('typing:status:v1', {
        taskId,
        user: socket.user,
        isTyping: true,
      });
    });

    socket.on('typing:stop', ({ taskId }) => {
      socket.to(`task:${taskId}`).emit('typing:status:v1', {
        taskId,
        user: socket.user,
        isTyping: false,
      });
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
      if (socket.currentBoardId && boardPresence.has(socket.currentBoardId)) {
        boardPresence.get(socket.currentBoardId).delete(socket.id);
        const activeUsers = Array.from(boardPresence.get(socket.currentBoardId).values());
        ioInstance.to(`board:${socket.currentBoardId}`).emit('presence:sync:v1', {
          boardId: socket.currentBoardId,
          users: activeUsers,
        });
      }
    });
  });

  return ioInstance;
};

export const getIO = () => {
  return ioInstance;
};

export const broadcastBoardEvent = (boardId, eventName, payload) => {
  if (ioInstance) {
    ioInstance.to(`board:${boardId}`).emit(eventName, payload);
  }
};

export const broadcastWorkspaceEvent = (workspaceId, eventName, payload) => {
  if (ioInstance) {
    ioInstance.to(`workspace:${workspaceId}`).emit(eventName, payload);
  }
};
