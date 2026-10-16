const path = require('path');
const fs = require('fs');

let pgInstance = null;

async function ensurePostgresRunning(port = 5432) {
  try {
    const EmbeddedPostgres = require('embedded-postgres').default || require('embedded-postgres');
    const dataDir = path.join(__dirname, '../../.pgdata');

    pgInstance = new EmbeddedPostgres({
      port,
      databaseDir: dataDir,
      user: 'postgres',
      password: 'postgres',
      persistent: true,
    });

    const isInitialized = fs.existsSync(path.join(dataDir, 'PG_VERSION'));
    if (!isInitialized) {
      console.log('[PostgreSQL Engine] Initializing database cluster in .pgdata...');
      await pgInstance.initialise();
      console.log('[PostgreSQL Engine] Cluster initialized.');
    }

    console.log('[PostgreSQL Engine] Starting native PostgreSQL service on port ' + port + '...');
    await pgInstance.start();
    console.log('[PostgreSQL Engine] PostgreSQL service is online and listening on 127.0.0.1:' + port);
    return true;
  } catch (err) {
    console.error('[PostgreSQL Engine] Could not start embedded PostgreSQL:', err.message);
    return false;
  }
}

async function stopEmbeddedPostgres() {
  if (pgInstance) {
    try {
      console.log('[PostgreSQL Engine] Stopping PostgreSQL service...');
      await pgInstance.stop();
      console.log('[PostgreSQL Engine] PostgreSQL service stopped.');
    } catch (err) {
      console.error('[PostgreSQL Engine] Error stopping:', err.message);
    }
  }
}

module.exports = {
  ensurePostgresRunning,
  stopEmbeddedPostgres,
};
