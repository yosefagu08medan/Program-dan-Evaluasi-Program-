import { MigrationRunner } from './migrations/migrationRunner';
import { MigrationContext } from './migrations/001_initial_schema_and_master';
import { MASTER_DIVISIONS, MasterDivision } from './master-data/divisions';
import { MASTER_MENUS, MasterMenu } from './master-data/menus';
import { SYSTEM_CONFIG, SystemConfig } from './master-data/systemConfig';
import { SEED_PROGRAMS } from './seed/seedData';
import { ProgramKerja } from '../src/types/proker';
import { normalizeDivisionName } from '../src/utils/formatters';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, testConnection } from '../src/firebase';

export const TRANSACTION_PROGRAMS_KEY = SYSTEM_CONFIG.storageKey;
export const META_STORAGE_KEY = 'proker_db_metadata';

export interface DatabaseMetadata {
  masterDivisions: MasterDivision[];
  masterMenus: MasterMenu[];
  systemConfig: SystemConfig;
  lastMigrationRun?: string;
  schemaVersion: number;
}

// Clean undefined properties so Firestore doesn't reject them
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = sanitizeForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

class DatabaseService {
  private runner: MigrationRunner;
  private isInitialized = false;
  private listeners: Set<(programs: ProgramKerja[]) => void> = new Set();
  private unsubscribeFirestore: (() => void) | null = null;
  private isConnectedToCloud = false;

  constructor() {
    this.runner = new MigrationRunner();
  }

  // 1. Storage Helpers
  private readStorage<T>(key: string, fallback: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = localStorage.getItem(key);
        if (item) {
          return JSON.parse(item);
        }
      }
    } catch (e) {
      console.warn(`Error reading key "${key}" from localStorage:`, e);
    }
    return fallback;
  }

  private writeStorage<T>(key: string, data: T): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (e) {
      console.error(`Error writing key "${key}" to localStorage:`, e);
    }
  }

  private notifySubscribers(programs: ProgramKerja[]): void {
    this.listeners.forEach((listener) => {
      try {
        listener(programs);
      } catch (err) {
        console.error('Error in subscriber callback:', err);
      }
    });
  }

  // 2. Real-Time Subscription
  public subscribe(listener: (programs: ProgramKerja[]) => void): () => void {
    this.listeners.add(listener);
    // Immediately emit current data
    listener(this.getPrograms());
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 3. Initialization & Auto-Migration & Firestore Sync
  public initDatabase(): {
    programs: ProgramKerja[];
    divisions: MasterDivision[];
    menus: MasterMenu[];
    systemConfig: SystemConfig;
  } {
    if (!this.isInitialized) {
      const migrationContext: MigrationContext = {
        getPrograms: () => this.readStorage<ProgramKerja[]>(TRANSACTION_PROGRAMS_KEY, []),
        setPrograms: (progs: ProgramKerja[]) => this.writeStorage(TRANSACTION_PROGRAMS_KEY, progs),
        getMeta: (key: string) => {
          const meta = this.readStorage<Record<string, any>>(META_STORAGE_KEY, {});
          return meta[key];
        },
        setMeta: (key: string, value: any) => {
          const meta = this.readStorage<Record<string, any>>(META_STORAGE_KEY, {});
          meta[key] = value;
          this.writeStorage(META_STORAGE_KEY, meta);
        },
      };

      // Run migrations idempotently on local layer
      const migrationResult = this.runner.run(migrationContext);
      if (migrationResult.newlyExecuted.length > 0) {
        console.info(
          `[DatabaseService] Successfully executed ${migrationResult.newlyExecuted.length} migrations:`,
          migrationResult.newlyExecuted
        );
      }

      this.isInitialized = true;

      // Start Firebase Firestore real-time listener if in browser
      if (typeof window !== 'undefined') {
        this.setupFirestoreSync();
      }
    }

    // Load current cached programs
    let programs = this.readStorage<ProgramKerja[]>(TRANSACTION_PROGRAMS_KEY, []);
    if (!programs || programs.length === 0) {
      programs = SEED_PROGRAMS;
      this.writeStorage(TRANSACTION_PROGRAMS_KEY, programs);
    } else {
      let modified = false;
      programs = programs.map((p) => {
        const norm = normalizeDivisionName(p.penanggungjawab?.divisi);
        if (p.penanggungjawab && p.penanggungjawab.divisi !== norm) {
          modified = true;
          return {
            ...p,
            penanggungjawab: {
              ...p.penanggungjawab,
              divisi: norm,
            },
          };
        }
        return p;
      });
      if (modified) {
        this.writeStorage(TRANSACTION_PROGRAMS_KEY, programs);
      }
    }

    return {
      programs,
      divisions: this.getMasterDivisions(),
      menus: this.getMasterMenus(),
      systemConfig: this.getSystemConfig(),
    };
  }

  private async setupFirestoreSync(): Promise<void> {
    try {
      testConnection().then((ok) => {
        this.isConnectedToCloud = ok;
      });

      const programsCol = collection(db, 'programs');

      this.unsubscribeFirestore = onSnapshot(
        programsCol,
        (snapshot) => {
          this.isConnectedToCloud = true;

          if (snapshot.empty) {
            // Jika database Firestore di cloud masih kosong, unggah seed data awal
            console.info('[Firebase] Firestore collection is empty. Seeding initial data to Cloud Firestore...');
            const localPrograms = this.getPrograms();
            const toSeed = localPrograms.length > 0 ? localPrograms : SEED_PROGRAMS;
            this.pushAllToFirestore(toSeed);
          } else {
            // Sinkronisasi data Firestore ke cache lokal & subscribers
            const cloudPrograms: ProgramKerja[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as ProgramKerja;
              if (data.penanggungjawab) {
                data.penanggungjawab.divisi = normalizeDivisionName(data.penanggungjawab.divisi);
              }
              cloudPrograms.push(data);
            });

            // Urutkan berdasarkan tahun dan nama
            cloudPrograms.sort((a, b) => a.tahun - b.tahun || a.namaProgram.localeCompare(b.namaProgram));

            this.writeStorage(TRANSACTION_PROGRAMS_KEY, cloudPrograms);
            this.notifySubscribers(cloudPrograms);
            console.info(`[Firebase] Synced ${cloudPrograms.length} programs from Cloud Firestore.`);
          }
        },
        (error) => {
          this.isConnectedToCloud = false;
          handleFirestoreError(error, OperationType.GET, 'programs');
        }
      );
    } catch (err) {
      console.warn('[Firebase] Could not initialize Firestore sync:', err);
    }
  }

  private async pushAllToFirestore(programs: ProgramKerja[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      programs.forEach((prog) => {
        const docRef = doc(db, 'programs', prog.id);
        batch.set(docRef, sanitizeForFirestore(prog));
      });
      await batch.commit();
      console.info(`[Firebase] Initialized ${programs.length} programs in Cloud Firestore.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'programs');
    }
  }

  // 4. Program Transactions CRUD
  public getPrograms(): ProgramKerja[] {
    const progs = this.readStorage<ProgramKerja[]>(TRANSACTION_PROGRAMS_KEY, []);
    return progs.length > 0 ? progs : SEED_PROGRAMS;
  }

  public getProgramById(id: string): ProgramKerja | undefined {
    return this.getPrograms().find((p) => p.id === id);
  }

  public async saveProgram(program: ProgramKerja): Promise<ProgramKerja> {
    const programs = this.getPrograms();
    const existingIndex = programs.findIndex((p) => p.id === program.id);
    const now = new Date().toISOString();

    const programToSave: ProgramKerja = {
      ...program,
      updatedAt: now,
      createdAt: program.createdAt || now,
    };

    let updatedList: ProgramKerja[];
    if (existingIndex >= 0) {
      updatedList = [...programs];
      updatedList[existingIndex] = programToSave;
    } else {
      updatedList = [programToSave, ...programs];
    }

    // 1. Update local cache immediately
    this.writeStorage(TRANSACTION_PROGRAMS_KEY, updatedList);
    this.notifySubscribers(updatedList);

    // 2. Persist to Cloud Firestore
    try {
      const docRef = doc(db, 'programs', programToSave.id);
      await setDoc(docRef, sanitizeForFirestore(programToSave));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `programs/${programToSave.id}`);
    }

    return programToSave;
  }

  public async saveAllPrograms(programs: ProgramKerja[]): Promise<void> {
    this.writeStorage(TRANSACTION_PROGRAMS_KEY, programs);
    this.notifySubscribers(programs);
  }

  public async deleteProgram(id: string): Promise<boolean> {
    const programs = this.getPrograms();
    const filtered = programs.filter((p) => p.id !== id);

    if (filtered.length !== programs.length) {
      // 1. Update local cache immediately
      this.writeStorage(TRANSACTION_PROGRAMS_KEY, filtered);
      this.notifySubscribers(filtered);

      // 2. Delete from Cloud Firestore
      try {
        const docRef = doc(db, 'programs', id);
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `programs/${id}`);
      }

      return true;
    }
    return false;
  }

  // 5. Master Data Getters (Version Controlled)
  public getMasterDivisions(): MasterDivision[] {
    return MASTER_DIVISIONS.filter((d) => d.isActive).sort((a, b) => a.urutan - b.urutan);
  }

  public getDivisionNames(): string[] {
    return this.getMasterDivisions().map((d) => d.nama);
  }

  public getMasterMenus(): MasterMenu[] {
    return MASTER_MENUS.filter((m) => m.isActive).sort((a, b) => a.urutan - b.urutan);
  }

  public getSystemConfig(): SystemConfig {
    return SYSTEM_CONFIG;
  }

  public getCloudStatus(): boolean {
    return this.isConnectedToCloud;
  }

  // 6. Data Reset & Backup
  public async resetToDefaultSeed(): Promise<ProgramKerja[]> {
    this.writeStorage(TRANSACTION_PROGRAMS_KEY, SEED_PROGRAMS);
    this.notifySubscribers(SEED_PROGRAMS);
    await this.pushAllToFirestore(SEED_PROGRAMS);
    return SEED_PROGRAMS;
  }

  public exportBackup(): string {
    const backupPayload = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: SYSTEM_CONFIG.schemaVersion,
        paroki: SYSTEM_CONFIG.parokiName,
        keuskupan: SYSTEM_CONFIG.dioceseName,
        storageKey: TRANSACTION_PROGRAMS_KEY,
        cloudSync: 'Firebase Firestore',
      },
      masterData: {
        divisions: this.getMasterDivisions(),
        menus: this.getMasterMenus(),
      },
      executedMigrations: this.runner.getExecutedMigrationIds(),
      programs: this.getPrograms(),
    };

    return JSON.stringify(backupPayload, null, 2);
  }

  public async importBackup(jsonString: string): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      let programsToImport: ProgramKerja[] = [];

      if (Array.isArray(parsed)) {
        programsToImport = parsed;
      } else if (parsed && Array.isArray(parsed.programs)) {
        programsToImport = parsed.programs;
      } else {
        return { success: false, count: 0, message: 'Format data JSON tidak valid' };
      }

      const validPrograms = programsToImport.filter(
        (p) => p && typeof p.id === 'string' && typeof p.namaProgram === 'string'
      );

      if (validPrograms.length === 0) {
        return { success: false, count: 0, message: 'Tidak ditemukan data program kerja yang valid dalam file' };
      }

      this.writeStorage(TRANSACTION_PROGRAMS_KEY, validPrograms);
      this.notifySubscribers(validPrograms);
      await this.pushAllToFirestore(validPrograms);

      return {
        success: true,
        count: validPrograms.length,
        message: `Berhasil memulihkan ${validPrograms.length} program kerja ke Cloud Firebase & perangkat!`,
      };
    } catch (e: any) {
      return { success: false, count: 0, message: `Gagal membaca file JSON: ${e?.message || e}` };
    }
  }
}

export const dbService = new DatabaseService();
export default dbService;
