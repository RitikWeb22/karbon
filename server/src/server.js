import http from 'http';
import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { initSocketServer } from './sockets/socketServer.js';
import { seedDatabaseIfEmpty } from './utils/seedData.js';

const startServer = async () => {
  try {
    // 1. Connect to MongoDB (local, Atlas, or auto-in-memory fallback)
    await connectDatabase();

    // 2. Seed initial demo data if database is empty
    await seedDatabaseIfEmpty();

    // 3. Create Express App & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 4. Initialize Socket.IO Server
    initSocketServer(server);

    // 5. Start listening
    server.listen(ENV.PORT, () => {
      console.log(`\n======================================================`);
      console.log(`⚡ Karbon Real-Time API Server running on port ${ENV.PORT}`);
      console.log(`🔗 REST API Base: http://localhost:${ENV.PORT}/api/v1`);
      console.log(`🌐 Client Origin: ${ENV.CLIENT_URL}`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
