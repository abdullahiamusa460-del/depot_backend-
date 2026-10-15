import app from './app.js';
import env from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

async function main() {
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`Depot backend listening on http://localhost:${env.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
