/**
 * @author alnosila — https://github.com/alnosila
 */

import { createApplication } from './composition-root.js';
import { createServer } from './infrastructure/http/server.js';
import { closePool } from './infrastructure/persistence/db.js';
import { loadSecrets } from './infrastructure/secrets/load-secrets.js';

async function main(): Promise<void> {
  const secrets = await loadSecrets();

  const app = createApplication();
  const server = createServer({
    getUserPreferences: app.getUserPreferences,
    updateUserPreferences: app.updateUserPreferences,
    evaluateNotification: app.evaluateNotification,
    logger: app.logger,
  });

  const httpServer = server.listen(secrets.port, secrets.host, () => {
    app.logger.info(
      { port: secrets.port, host: secrets.host },
      'Notification Preferences Service started',
    );
  });

  const shutdown = (signal: string) => {
    app.logger.info({ signal }, 'Shutting down');
    httpServer.close(() => {
      void closePool().then(() => process.exit(0));
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
