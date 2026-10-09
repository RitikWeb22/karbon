import mongoose from 'mongoose';
import dns from 'node:dns';
import { ENV } from './env.js';

let memoryServer = null;

export const connectDatabase = async () => {
  let uri = ENV.MONGODB_URI;

  // Configure public DNS resolvers to prevent Windows "querySrv ECONNREFUSED" on mongodb+srv://
  if (uri && uri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch (dnsErr) {
      console.warn('⚠️ Could not set DNS servers:', dnsErr.message);
    }
  }

  try {
    if (!uri) {
      console.log('ℹ️  No MONGODB_URI provided. Starting zero-config in-memory MongoDB server...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
      console.log(`✅ In-Memory MongoDB Server running at: ${uri}`);
    }

    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`🚀 MongoDB connected successfully to ${mongoose.connection.host || 'embedded instance'}`);
  } catch (error) {
    console.error('⚠️ Primary MongoDB connection failed:', error.message);

    // If querySrv or ECONNREFUSED error happened, try explicit DNS override and retry
    if (uri && (error.message.includes('querySrv') || error.message.includes('ECONNREFUSED'))) {
      try {
        console.log('🔄 Retrying MongoDB connection with Google/Cloudflare DNS (8.8.8.8, 1.1.1.1)...');
        dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        console.log(`🚀 MongoDB connected successfully to ${mongoose.connection.host}`);
        return;
      } catch (retryErr) {
        console.error('⚠️ DNS retry failed:', retryErr.message);
      }
    }

    console.log('🔄 Attempting in-memory MongoDB fallback...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const fallbackUri = memoryServer.getUri();
      await mongoose.connect(fallbackUri);
      console.log(`✅ Fallback In-Memory MongoDB connected: ${fallbackUri}`);
    } catch (fallbackErr) {
      console.error('❌ Critical MongoDB connection failure:', fallbackErr);
      process.exit(1);
    }
  }
};

export const disconnectDatabase = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
};
