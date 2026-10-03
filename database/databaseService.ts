import { FullDatabaseState, MasterMenu, MasterDivisi, MasterConfig } from './types';
import { ProgramKerja } from '../src/types/proker';
import { MASTER_MENUS } from './master-data/menus';
import { MASTER_DIVISI } from './master-data/divisions';
import { MASTER_CONFIG } from './master-data/systemConfig';
import { SEED_PROGRAMS } from './seed/seedPrograms';
import { runPendingMigrations, MIGRATION_REGISTRY } from './migrations/migrationRunner';

const DATABASE_STORAGE_KEY = 'paroki_katedral_db_v1';
const LEGACY_STORAGE_KEY = 'proker_katedral_medan_2026_2027_v12';

class DatabaseService {
  private state: FullDatabaseState | null = null;

  public initDatabase(): FullDatabaseState {
    if (this.state) {
      return this.state;
    }

    let loadedState: FullDatabaseState | null = null;

    try {
      const stored = localStorage.getItem(DATABASE_STORAGE_KEY);
      if (stored) {
        loadedState = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read existing database, initializing fresh state', e);
    }

    // Fallback: Check if there is data in legacy storage key
    let existingTransactionalPrograms: ProgramKerja[] = [];
    if (!loadedState) {
      try {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          const parsedLegacy = JSON.parse(legacy);
          if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
            existingTransactionalPrograms = parsedLegacy;
          }
        }
      } catch (err) {
        console.warn('Could not read legacy storage', err);
      }
    } else {
      existingTransactionalPrograms = loadedState.transactionalPrograms || [];
    }

    // If still empty, use SEED_PROGRAMS
    if (existingTransactionalPrograms.length === 0) {
      existingTransactionalPrograms = [...SEED_PROGRAMS];
    } else {
      // Ensure seed programs exist (UPSERT seed without overwriting user changes)
      SEED_PROGRAMS.forEach((seedProg) => {
        const found = existingTransactionalPrograms.find((p) => p.id === seedProg.id);
        if (!found) {
          existingTransactionalPrograms.push(seedProg);
        }
      });
    }

    // Build or merge database state
    const baseState: FullDatabaseState = {
      metadata: loadedState?.metadata || {
        schemaVersion: 0,
        lastMigrationId: 'none',
        lastSyncTimestamp: new Date().toISOString(),
        executedMigrations: [],
      },
      masterMenus: loadedState?.masterMenus && loadedState.masterMenus.length > 0
        ? loadedState.masterMenus
        : [...MASTER_MENUS],
      masterDivisi: loadedState?.masterDivisi && loadedState.masterDivisi.length > 0
        ? loadedState.masterDivisi
        : [...MASTER_DIVISI],
      config: loadedState?.config || { ...MASTER_CONFIG },
      transactionalPrograms: existingTransactionalPrograms,
    };

    // Run pending migrations from GitHub
    const { state: migratedState, newlyExecutedCount } = runPendingMigrations(baseState);

    this.state = migratedState;
    this.persistState();

    if (newlyExecutedCount > 0) {
      console.log(`[DatabaseService] Successfully executed ${newlyExecutedCount} new migration(s) without resetting data.`);
    }

    return this.state;
  }

  public getState(): FullDatabaseState {
    if (!this.state) {
      return this.initDatabase();
    }
    return this.state;
  }

  public getTransactionalPrograms(): ProgramKerja[] {
    return this.getState().transactionalPrograms;
  }

  public saveTransactionalPrograms(programs: ProgramKerja[]): void {
    const currentState = this.getState();
    this.state = {
      ...currentState,
      transactionalPrograms: programs,
    };
    this.persistState();
  }

  public getMasterMenus(): MasterMenu[] {
    return this.getState().masterMenus.filter((m) => m.isActive);
  }

  public getMasterDivisi(): MasterDivisi[] {
    return this.getState().masterDivisi.filter((d) => d.isActive);
  }

  public getMasterDivisiNames(): string[] {
    return this.getMasterDivisi().map((d) => d.nama);
  }

  public getDatabaseConfig(): MasterConfig {
    return this.getState().config;
  }

  public getMigrationStatus(): {
    totalMigrations: number;
    executedMigrations: string[];
    allMigrations: typeof MIGRATION_REGISTRY;
    lastMigration: string;
    lastSyncTimestamp: string;
  } {
    const s = this.getState();
    return {
      totalMigrations: MIGRATION_REGISTRY.length,
      executedMigrations: s.metadata.executedMigrations || [],
      allMigrations: MIGRATION_REGISTRY,
      lastMigration: s.metadata.lastMigrationId,
      lastSyncTimestamp: s.metadata.lastSyncTimestamp,
    };
  }

  public forceRerunMigrations(): { newlyExecutedCount: number } {
    const currentState = this.getState();
    const { state: migratedState, newlyExecutedCount } = runPendingMigrations(currentState);
    this.state = migratedState;
    this.persistState();
    return { newlyExecutedCount };
  }

  private persistState(): void {
    if (!this.state) return;
    try {
      localStorage.setItem(DATABASE_STORAGE_KEY, JSON.stringify(this.state));
      // Also keep legacy key synced for backward compatibility
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(this.state.transactionalPrograms));
    } catch (e) {
      console.error('[DatabaseService] Failed to persist state to storage', e);
    }
  }
}

export const databaseService = new DatabaseService();
