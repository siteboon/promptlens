import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { up as initialSchemaUp } from './001_initial_schema.js';
import { up as templatesSchemaUp } from './002_add_templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Migration {
  version: number;
  up: (db: DatabaseType) => void;
}

// Debug log environment variables at migration time

export class MigrationManager {
  private db: DatabaseType;

  constructor(db: DatabaseType) {
    this.db = db;
  }

  initialize(): void {
    console.log('Starting database initialization...');
    
    // Create migrations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Migration tracking table checked/created');

    // Get current schema version
    const getCurrentVersion = this.db.prepare('SELECT MAX(version) as version FROM schema_migrations');
    const currentVersion = (getCurrentVersion.get() as { version: number | null })?.version || 0;
    console.log('Current database version:', currentVersion);

    // Get all available migrations
    const migrations = this.getMigrations();
    console.log('Available migrations:', migrations.map(m => m.version));

    // Apply pending migrations
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`Applying migration ${migration.version}...`);
        try {
          // Start a transaction for each migration
          this.db.exec('BEGIN TRANSACTION');
          migration.up(this.db);
          this.db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(migration.version);
          this.db.exec('COMMIT');
          console.log(`Migration ${migration.version} applied successfully`);
        } catch (error) {
          // Rollback on error
          this.db.exec('ROLLBACK');
          console.error(`Error applying migration ${migration.version}:`, error);
          throw error;
        }
      } else {
        console.log(`Skipping migration ${migration.version} (already applied)`);
      }
    }
  }

  private getMigrations(): Migration[] {
    return [
      { version: 1, up: initialSchemaUp },
      { version: 2, up: templatesSchemaUp }
    ];
  }
}