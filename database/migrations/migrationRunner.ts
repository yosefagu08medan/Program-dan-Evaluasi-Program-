import { migration001, MigrationContext } from './001_initial_schema_and_master';
import { migration002 } from './002_add_master_dpl_and_menu';
import { migration003 } from './003_update_official_parish_sections';

export interface Migration {
  id: string;
  description: string;
  timestamp: number;
  up: (ctx: MigrationContext) => Promise<void> | void;
}

export const ALL_MIGRATIONS: Migration[] = [
  migration001,
  migration002,
  migration003,
];

export const MIGRATION_STORAGE_KEY = 'proker_db_executed_migrations';

export interface MigrationResult {
  success: boolean;
  previouslyExecuted: string[];
  newlyExecuted: string[];
  totalExecuted: number;
  errors?: string[];
}

export class MigrationRunner {
  private executedMigrations: string[] = [];

  constructor() {
    this.loadExecutedMigrations();
  }

  private loadExecutedMigrations(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(MIGRATION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.executedMigrations = parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read executed migrations from localStorage:', e);
      this.executedMigrations = [];
    }
  }

  private saveExecutedMigrations(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(MIGRATION_STORAGE_KEY, JSON.stringify(this.executedMigrations));
      }
    } catch (e) {
      console.error('Could not save executed migrations to localStorage:', e);
    }
  }

  public getExecutedMigrationIds(): string[] {
    return [...this.executedMigrations];
  }

  public run(ctx: MigrationContext): MigrationResult {
    this.loadExecutedMigrations();
    const previouslyExecuted = [...this.executedMigrations];
    const newlyExecuted: string[] = [];
    const errors: string[] = [];

    // Sort migrations by timestamp/id
    const sorted = [...ALL_MIGRATIONS].sort((a, b) => a.timestamp - b.timestamp);

    for (const migration of sorted) {
      if (!this.executedMigrations.includes(migration.id)) {
        try {
          console.info(`[DB Migration] Running migration: ${migration.id} (${migration.description})`);
          migration.up(ctx);
          this.executedMigrations.push(migration.id);
          newlyExecuted.push(migration.id);
          this.saveExecutedMigrations();
          console.info(`[DB Migration] Successfully completed: ${migration.id}`);
        } catch (err: any) {
          const errMsg = `Error running migration ${migration.id}: ${err?.message || err}`;
          console.error(errMsg, err);
          errors.push(errMsg);
          break; // Stop running further migrations if one fails
        }
      }
    }

    return {
      success: errors.length === 0,
      previouslyExecuted,
      newlyExecuted,
      totalExecuted: this.executedMigrations.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
