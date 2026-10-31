import { app } from './app';
import { config } from './utils/config';
import { sessionService } from './services/sessionService';

const server = app.listen(config.port, config.host, () => {
  console.log(`[UNDO-BACKEND] Server listening on http://${config.host}:${config.port}`);
  console.log(`[UNDO-BACKEND] Environment: ${config.nodeEnv}`);
  console.log(`[UNDO-BACKEND] Storage location: [storage root initialized]`);
  console.log(`[UNDO-BACKEND] Health endpoint: http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}/api/v1/health`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n[UNDO-BACKEND] Received ${signal}. Gracefully stopping server...`);
  sessionService.stopCleanup();

  server.close(() => {
    console.log('[UNDO-BACKEND] HTTP server closed.');
    process.exit(0);
  });

  // Force close after 5 seconds if not closed
  setTimeout(() => {
    console.error('[UNDO-BACKEND] Forced termination after timeout');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
