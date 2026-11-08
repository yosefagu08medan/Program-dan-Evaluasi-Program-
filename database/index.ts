import { MigrationRunner } from './migrations/migrationRunner';
import { MigrationContext } from './migrations/001_initial_schema_and_master';
import { MASTER_DIVISIONS, MasterDivision } from './master-data/divisions';
import { MASTER_MENUS, MasterMenu } from './master-data/menus';
import { SYSTEM_CONFIG, SystemConfig } from './master-data/systemConfig';
import { SEED_PROGRAMS } from './seed/seedData';
import { ProgramKerja } from '../src/types/proker';
import { PengurusItem, MasterJabatan } from '../src/types/pengurus';
import { PenerimaanMingguan } from '../src/types/penerimaan';
import { INITIAL_PENGURUS_PAROKI } from '../src/data/initialPengurus';
import { INITIAL_MASTER_JABATAN } from '../src/data/initialJabatan';
import { INITIAL_PENERIMAAN_MINGGUAN } from '../src/data/initialPenerimaan';
import { normalizeDivisionName, getSundaysInMonth } from '../src/utils/formatters';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, testConnection } from '../src/firebase';

export const TRANSACTION_PROGRAMS_KEY = SYSTEM_CONFIG.storageKey;
export const META_STORAGE_KEY = 'proker_db_metadata';
export const PENGURUS_STORAGE_KEY = 'proker_db_pengurus';
export const JABATAN_STORAGE_KEY = 'proker_db_master_jabatan';
export const PENERIMAAN_STORAGE_KEY = 'proker_db_penerimaan_mingguan';

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
  private pengurusListeners: Set<(pengurus: PengurusItem[]) => void> = new Set();
  private jabatanListeners: Set<(jabatanList: MasterJabatan[]) => void> = new Set();
  private penerimaanListeners: Set<(penerimaan: PenerimaanMingguan[]) => void> = new Set();
  private unsubscribeFirestore: (() => void) | null = null;
  private unsubscribeFirestorePengurus: (() => void) | null = null;
  private unsubscribeFirestoreJabatan: (() => void) | null = null;
  private unsubscribeFirestorePenerimaan: (() => void) | null = null;
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
        this.setupFirestorePengurusSync();
        this.setupFirestoreJabatanSync();
        this.setupFirestorePenerimaanSync();
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

  // --- 4B. PENGURUS PAROKI (Pastor Paroki, Vikaris, DPPH, Koordinator Seksi & Anggotanya) ---
  private notifyPengurusSubscribers(pengurus: PengurusItem[]): void {
    this.pengurusListeners.forEach((listener) => {
      try {
        listener(pengurus);
      } catch (err) {
        console.error('Error in pengurus subscriber callback:', err);
      }
    });
  }

  public subscribePengurus(listener: (pengurus: PengurusItem[]) => void): () => void {
    this.pengurusListeners.add(listener);
    listener(this.getPengurus());
    return () => {
      this.pengurusListeners.delete(listener);
    };
  }

  public getPengurus(): PengurusItem[] {
    const list = this.readStorage<PengurusItem[]>(PENGURUS_STORAGE_KEY, []);
    const sourceList = !list || list.length === 0 ? INITIAL_PENGURUS_PAROKI : list;
    return sourceList.map((p) => {
      if (p.kategori === 'dpph' && (p.jabatan.toLowerCase().includes('anggota') || p.id === 'pengurus-dpph-anggota-1')) {
        return {
          ...p,
          jabatan: 'Anggota DPPH',
          catatan: 'Anggota DPPH (Dewan Pastoral Paroki Harian)',
        };
      }
      return p;
    });
  }

  public getPengurusById(id: string): PengurusItem | undefined {
    return this.getPengurus().find((p) => p.id === id);
  }

  public async savePengurus(item: PengurusItem): Promise<PengurusItem> {
    const list = this.getPengurus();
    const existingIndex = list.findIndex((p) => p.id === item.id);
    const now = new Date().toISOString();

    const itemToSave: PengurusItem = {
      ...item,
      updatedAt: now,
      createdAt: item.createdAt || now,
    };

    let updatedList: PengurusItem[];
    if (existingIndex >= 0) {
      updatedList = [...list];
      updatedList[existingIndex] = itemToSave;
    } else {
      updatedList = [...list, itemToSave];
    }

    updatedList.sort((a, b) => (a.urutan || 99) - (b.urutan || 99));

    // 1. Update local cache immediately
    this.writeStorage(PENGURUS_STORAGE_KEY, updatedList);
    this.notifyPengurusSubscribers(updatedList);

    // 2. Persist to Cloud Firestore
    try {
      const docRef = doc(db, 'pengurus', itemToSave.id);
      await setDoc(docRef, sanitizeForFirestore(itemToSave));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `pengurus/${itemToSave.id}`);
    }

    return itemToSave;
  }

  public async saveAllPengurus(items: PengurusItem[]): Promise<void> {
    items.sort((a, b) => (a.urutan || 99) - (b.urutan || 99));
    this.writeStorage(PENGURUS_STORAGE_KEY, items);
    this.notifyPengurusSubscribers(items);
    await this.pushAllPengurusToFirestore(items);
  }

  public async deletePengurus(id: string): Promise<boolean> {
    const list = this.getPengurus();
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length !== list.length) {
      this.writeStorage(PENGURUS_STORAGE_KEY, filtered);
      this.notifyPengurusSubscribers(filtered);

      try {
        const docRef = doc(db, 'pengurus', id);
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `pengurus/${id}`);
      }
      return true;
    }
    return false;
  }

  private async setupFirestorePengurusSync(): Promise<void> {
    try {
      const pengurusCol = collection(db, 'pengurus');
      this.unsubscribeFirestorePengurus = onSnapshot(
        pengurusCol,
        (snapshot) => {
          if (snapshot.empty) {
            console.info('[Firebase] Firestore pengurus collection is empty. Seeding initial pengurus...');
            const localPengurus = this.getPengurus();
            const toSeed = localPengurus.length > 0 ? localPengurus : INITIAL_PENGURUS_PAROKI;
            this.pushAllPengurusToFirestore(toSeed);
          } else {
            const cloudPengurus: PengurusItem[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as PengurusItem;
              if (data.kategori === 'dpph' && (data.jabatan.toLowerCase().includes('anggota') || data.id === 'pengurus-dpph-anggota-1')) {
                data.jabatan = 'Anggota DPPH';
                data.catatan = 'Anggota DPPH (Dewan Pastoral Paroki Harian)';
              }
              cloudPengurus.push(data);
            });
            cloudPengurus.sort((a, b) => (a.urutan || 99) - (b.urutan || 99));
            this.writeStorage(PENGURUS_STORAGE_KEY, cloudPengurus);
            this.notifyPengurusSubscribers(cloudPengurus);
            console.info(`[Firebase] Synced ${cloudPengurus.length} pengurus from Cloud Firestore.`);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'pengurus');
        }
      );
    } catch (err) {
      console.warn('[Firebase] Could not initialize Firestore pengurus sync:', err);
    }
  }

  private async pushAllPengurusToFirestore(items: PengurusItem[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      items.forEach((item) => {
        const docRef = doc(db, 'pengurus', item.id);
        batch.set(docRef, sanitizeForFirestore(item));
      });
      await batch.commit();
      console.info(`[Firebase] Initialized ${items.length} pengurus in Cloud Firestore.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'pengurus');
    }
  }

  public getMasterJabatan(): MasterJabatan[] {
    const cached = this.readStorage<MasterJabatan[]>(JABATAN_STORAGE_KEY, []);
    const source = !cached || cached.length === 0 ? INITIAL_MASTER_JABATAN : cached;

    const cleaned: MasterJabatan[] = [];
    let hasAnggotaDpph = false;

    source.forEach((j) => {
      if (j.kategori === 'dpph') {
        // Standarisasi SETIAP bentuk anggota DPPH menjadi hanya satu "Anggota DPPH"
        if (j.nama.toLowerCase().includes('anggota') || j.id.startsWith('jab-dpph-anggota')) {
          if (!hasAnggotaDpph) {
            hasAnggotaDpph = true;
            cleaned.push({
              id: 'jab-dpph-anggota',
              nama: 'Anggota DPPH',
              kategori: 'dpph',
              keterangan: 'Anggota Dewan Pastoral Paroki Harian (DPPH)',
              isDefault: true,
              urutan: 16,
            });
          }
          return;
        }

        // Hapus/abaikan jabatan DPPH lama yang memiliki pembagian bidang, sarana, aset, dsb
        if (
          j.nama.includes('Sarana') ||
          j.nama.includes('Prasarana') ||
          j.nama.includes('Aset') ||
          j.nama.includes('Bidang') ||
          j.nama.includes('Pewartaan') ||
          j.id.includes('sarana') ||
          j.id.includes('aset') ||
          j.id.includes('pewartaan') ||
          j.id.includes('liturgi') ||
          j.id.includes('paguyuban') ||
          j.id.includes('pelayanan') ||
          j.id.includes('tata-kelola')
        ) {
          return;
        }
      }
      cleaned.push(j);
    });

    if (!hasAnggotaDpph) {
      cleaned.push({
        id: 'jab-dpph-anggota',
        nama: 'Anggota DPPH',
        kategori: 'dpph',
        keterangan: 'Anggota Dewan Pastoral Paroki Harian (DPPH)',
        isDefault: true,
        urutan: 16,
      });
    }

    const seen = new Set<string>();
    return cleaned
      .filter((j) => {
        const key = `${j.kategori}::${j.nama}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (a.urutan || 99) - (b.urutan || 99));
  }

  public subscribeMasterJabatan(listener: (jabatanList: MasterJabatan[]) => void): () => void {
    this.jabatanListeners.add(listener);
    listener(this.getMasterJabatan());
    return () => {
      this.jabatanListeners.delete(listener);
    };
  }

  private notifyJabatanSubscribers(jabatanList: MasterJabatan[]): void {
    this.jabatanListeners.forEach((listener) => {
      try {
        listener(jabatanList);
      } catch (err) {
        console.error('Error in jabatan subscriber callback:', err);
      }
    });
  }

  public async saveMasterJabatan(item: MasterJabatan): Promise<MasterJabatan> {
    const list = this.getMasterJabatan();
    const existingIndex = list.findIndex((j) => j.id === item.id);
    let updated: MasterJabatan[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = item;
    } else {
      updated = [...list, item];
    }
    updated.sort((a, b) => (a.urutan || 99) - (b.urutan || 99));
    this.writeStorage(JABATAN_STORAGE_KEY, updated);
    this.notifyJabatanSubscribers(updated);

    try {
      const docRef = doc(db, 'master_jabatan', item.id);
      await setDoc(docRef, sanitizeForFirestore(item));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `master_jabatan/${item.id}`);
    }
    return item;
  }

  public async deleteMasterJabatan(id: string): Promise<boolean> {
    const list = this.getMasterJabatan();
    const filtered = list.filter((j) => j.id !== id);
    if (filtered.length !== list.length) {
      this.writeStorage(JABATAN_STORAGE_KEY, filtered);
      this.notifyJabatanSubscribers(filtered);

      try {
        const docRef = doc(db, 'master_jabatan', id);
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `master_jabatan/${id}`);
      }
      return true;
    }
    return false;
  }

  public async resetMasterJabatan(): Promise<void> {
    this.writeStorage(JABATAN_STORAGE_KEY, INITIAL_MASTER_JABATAN);
    this.notifyJabatanSubscribers(INITIAL_MASTER_JABATAN);
    try {
      const jabatanCol = collection(db, 'master_jabatan');
      const snapshot = await getDocs(jabatanCol);
      const batch = writeBatch(db);

      const validIds = new Set(INITIAL_MASTER_JABATAN.map((i) => i.id));
      snapshot.forEach((d) => {
        if (!validIds.has(d.id)) {
          batch.delete(d.ref);
        }
      });

      INITIAL_MASTER_JABATAN.forEach((item) => {
        const docRef = doc(db, 'master_jabatan', item.id);
        batch.set(docRef, sanitizeForFirestore(item));
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'master_jabatan');
    }
  }

  private async setupFirestoreJabatanSync(): Promise<void> {
    try {
      const jabatanCol = collection(db, 'master_jabatan');
      this.unsubscribeFirestoreJabatan = onSnapshot(
        jabatanCol,
        (snapshot) => {
          if (snapshot.empty) {
            console.info('[Firebase] Firestore master_jabatan collection is empty. Seeding initial positions...');
            const local = this.getMasterJabatan();
            const toSeed = local.length > 0 ? local : INITIAL_MASTER_JABATAN;
            const batch = writeBatch(db);
            toSeed.forEach((item) => {
              const docRef = doc(db, 'master_jabatan', item.id);
              batch.set(docRef, sanitizeForFirestore(item));
            });
            batch.commit().catch(console.error);
          } else {
            const cloudList: MasterJabatan[] = [];
            const seen = new Set<string>();
            const docsToDelete: string[] = [];
            let hasAnggotaDpph = false;

            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as MasterJabatan;
              const docId = docSnap.id;

              // Standarisasi anggota DPPH: HANYA ada satu 'Anggota DPPH' yang sah
              if (
                data.kategori === 'dpph' &&
                (data.nama.toLowerCase().includes('anggota') || data.id.startsWith('jab-dpph-anggota'))
              ) {
                if (!hasAnggotaDpph) {
                  hasAnggotaDpph = true;
                  cloudList.push({
                    id: 'jab-dpph-anggota',
                    nama: 'Anggota DPPH',
                    kategori: 'dpph',
                    keterangan: 'Anggota Dewan Pastoral Paroki Harian (DPPH)',
                    isDefault: true,
                    urutan: 16,
                  });
                }
                // Jika docId bukan id baku 'jab-dpph-anggota' atau namanya memiliki embel-embel (misal Sarana Prasarana & Aset), hapus dari Firestore!
                if (docId !== 'jab-dpph-anggota' || data.nama !== 'Anggota DPPH') {
                  docsToDelete.push(docId);
                }
                return;
              }

              // Identifikasi item DPPH lama yang memiliki pembagian bidang, sarana, aset, atau id usang
              if (
                data.kategori === 'dpph' &&
                (data.nama.includes('Sarana') ||
                  data.nama.includes('Prasarana') ||
                  data.nama.includes('Aset') ||
                  data.nama.includes('Bidang') ||
                  data.nama.includes('Pewartaan') ||
                  data.nama.includes('Liturgi') ||
                  data.nama.includes('Paguyuban') ||
                  data.nama.includes('Pelayanan') ||
                  data.nama.includes('Tata Kelola') ||
                  docId.includes('sarana') ||
                  docId.includes('aset') ||
                  docId.includes('pewartaan') ||
                  docId.includes('liturgi') ||
                  docId.includes('paguyuban') ||
                  docId.includes('pelayanan') ||
                  docId.includes('tata-kelola') ||
                  docId === 'jab-dpph-anggota-polos')
              ) {
                docsToDelete.push(docId);
                return;
              }

              const key = `${data.kategori}::${data.nama}`;
              if (!seen.has(key)) {
                seen.add(key);
                cloudList.push(data);
              }
            });

            if (!hasAnggotaDpph) {
              cloudList.push({
                id: 'jab-dpph-anggota',
                nama: 'Anggota DPPH',
                kategori: 'dpph',
                keterangan: 'Anggota Dewan Pastoral Paroki Harian (DPPH)',
                isDefault: true,
                urutan: 16,
              });
            }

            cloudList.sort((a, b) => (a.urutan || 99) - (b.urutan || 99));
            this.writeStorage(JABATAN_STORAGE_KEY, cloudList);
            this.notifyJabatanSubscribers(cloudList);
            console.info(`[Firebase] Synced ${cloudList.length} master_jabatan from Cloud Firestore.`);

            // Hapus dokumen DPPH usang/duplikat dari Cloud Firestore
            if (docsToDelete.length > 0) {
              console.info(`[Firebase] Deleting ${docsToDelete.length} obsolete DPPH position docs from Cloud Firestore:`, docsToDelete);
              const batch = writeBatch(db);
              docsToDelete.forEach((id) => {
                batch.delete(doc(db, 'master_jabatan', id));
              });
              batch.commit().catch(console.error);
            }
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'master_jabatan');
        }
      );
    } catch (err) {
      console.warn('[Firebase] Could not initialize Firestore master_jabatan sync:', err);
    }
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

  // ==========================================
  // PENERIMAAN KAS MINGGUAN (PROKER & PASTORAL)
  // ==========================================

  public getPenerimaan(): PenerimaanMingguan[] {
    const cached = this.readStorage<PenerimaanMingguan[]>(PENERIMAAN_STORAGE_KEY, []);
    if (!cached || cached.length === 0) {
      this.writeStorage(PENERIMAAN_STORAGE_KEY, INITIAL_PENERIMAAN_MINGGUAN);
      return INITIAL_PENERIMAAN_MINGGUAN;
    }

    // Sanitasi otomatis: hilangkan angka realisasi palsu/dummy dari data awal yang belum pernah diinput pengguna
    const isRealisasiSanitized = this.readStorage<boolean>('proker_db_realisasi_sanitized_v4', false);
    let workingList = cached;
    if (!isRealisasiSanitized) {
      workingList = cached.map((item) => {
        let nama = item.namaPenerimaan;
        let alokasi = item.alokasiSeksi;
        let realisasiVal = item.realisasi;

        // Reset data seed yang memiliki angka realisasi bawaan dummy
        if (item.id.startsWith('pen_2026_') || item.id.startsWith('pen_2027_')) {
          realisasiVal = 0;
          if (alokasi === 'Seksi PSE') {
            const nLower = (nama || '').toLowerCase();
            if (nLower.includes('app') || nLower.includes('puasa')) {
              nama = 'Dana Aksi Puasa Pembangunan';
            } else if (nLower.includes('natal')) {
              nama = 'Amplop Natal';
            } else if (nLower.includes('kolekte') || item.kategori === 'kolekte_khusus') {
              alokasi = 'Umum Paroki';
            } else {
              nama = 'Dana Solidaritas Umat';
            }
          }
        }
        return {
          ...item,
          namaPenerimaan: nama,
          alokasiSeksi: alokasi,
          realisasi: realisasiVal,
        };
      });
      this.writeStorage('proker_db_realisasi_sanitized_v4', true);
      this.writeStorage(PENERIMAAN_STORAGE_KEY, workingList);
    }

    // Filter out phantom routine weeks (e.g. routine Kolekte 1 & 2 for Minggu 5 in January 2026 which only has 4 Sundays)
    const valid = workingList.filter((item) => {
      if (item.isHariKhusus || item.kategori === 'kolekte_khusus') return true;
      if (item.kategori !== 'kolekte_1' && item.kategori !== 'kolekte_2') return true;
      const sundays = getSundaysInMonth(item.tahun, item.bulan);
      return item.mingguKe <= sundays.length;
    });
    if (valid.length !== workingList.length) {
      this.writeStorage(PENERIMAAN_STORAGE_KEY, valid);
    }
    return valid;
  }

  public subscribePenerimaan(listener: (penerimaan: PenerimaanMingguan[]) => void): () => void {
    this.penerimaanListeners.add(listener);
    listener(this.getPenerimaan());
    return () => {
      this.penerimaanListeners.delete(listener);
    };
  }

  private notifyPenerimaanSubscribers(penerimaan: PenerimaanMingguan[]): void {
    this.penerimaanListeners.forEach((listener) => {
      try {
        listener(penerimaan);
      } catch (err) {
        console.error('Error in penerimaan subscriber callback:', err);
      }
    });
  }

  public async savePenerimaan(item: PenerimaanMingguan): Promise<PenerimaanMingguan> {
    const list = this.getPenerimaan();
    const existingIndex = list.findIndex((p) => p.id === item.id);
    let updated: PenerimaanMingguan[];
    const itemWithTimestamps: PenerimaanMingguan = {
      ...item,
      updatedAt: new Date().toISOString(),
      createdAt: item.createdAt || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = itemWithTimestamps;
    } else {
      updated = [itemWithTimestamps, ...list];
    }

    this.writeStorage(PENERIMAAN_STORAGE_KEY, updated);
    this.notifyPenerimaanSubscribers(updated);

    try {
      const docRef = doc(db, 'penerimaan_mingguan', itemWithTimestamps.id);
      await setDoc(docRef, sanitizeForFirestore(itemWithTimestamps));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `penerimaan_mingguan/${itemWithTimestamps.id}`);
    }
    return itemWithTimestamps;
  }

  public async deletePenerimaan(id: string): Promise<boolean> {
    const list = this.getPenerimaan();
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length !== list.length) {
      this.writeStorage(PENERIMAAN_STORAGE_KEY, filtered);
      this.notifyPenerimaanSubscribers(filtered);

      try {
        const docRef = doc(db, 'penerimaan_mingguan', id);
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `penerimaan_mingguan/${id}`);
      }
      return true;
    }
    return false;
  }

  public async resetPenerimaan(): Promise<void> {
    this.writeStorage(PENERIMAAN_STORAGE_KEY, INITIAL_PENERIMAAN_MINGGUAN);
    this.notifyPenerimaanSubscribers(INITIAL_PENERIMAAN_MINGGUAN);
    try {
      const col = collection(db, 'penerimaan_mingguan');
      const snapshot = await getDocs(col);
      const batch = writeBatch(db);
      snapshot.forEach((d) => batch.delete(d.ref));
      INITIAL_PENERIMAAN_MINGGUAN.forEach((item) => {
        const ref = doc(db, 'penerimaan_mingguan', item.id);
        batch.set(ref, sanitizeForFirestore(item));
      });
      await batch.commit();
    } catch (err) {
      console.warn('Failed resetting penerimaan in Firestore:', err);
    }
  }

  private setupFirestorePenerimaanSync(): void {
    if (this.unsubscribeFirestorePenerimaan) return;
    try {
      const col = collection(db, 'penerimaan_mingguan');
      this.unsubscribeFirestorePenerimaan = onSnapshot(
        col,
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudItems: PenerimaanMingguan[] = [];
            snapshot.forEach((d) => {
              const item = d.data() as PenerimaanMingguan;
              // Bersihkan record kolekte rutin jika mingguKe melebihi hari Minggu kalender riil di bulan tersebut
              if (!item.isHariKhusus && (item.kategori === 'kolekte_1' || item.kategori === 'kolekte_2')) {
                const sundays = getSundaysInMonth(item.tahun, item.bulan);
                if (item.mingguKe > sundays.length) {
                  deleteDoc(d.ref).catch(() => {});
                  return;
                }
              }
              cloudItems.push(item);
            });
            cloudItems.sort((a, b) => {
              if (a.tahun !== b.tahun) return a.tahun - b.tahun;
              if (a.bulan !== b.bulan) return a.bulan - b.bulan;
              return a.mingguKe - b.mingguKe;
            });
            this.writeStorage(PENERIMAAN_STORAGE_KEY, cloudItems);
            this.notifyPenerimaanSubscribers(cloudItems);
          } else {
            // First time seeding to Cloud
            this.seedInitialPenerimaanToFirestore();
          }
        },
        (error) => {
          console.warn('[Firebase] Firestore penerimaan snapshot warning:', error.message);
        }
      );
    } catch (e) {
      console.warn('[Firebase] Exception setting up penerimaan sync:', e);
    }
  }

  private async seedInitialPenerimaanToFirestore(): Promise<void> {
    try {
      const localData = this.getPenerimaan();
      const itemsToSeed = localData.length > 0 ? localData : INITIAL_PENERIMAAN_MINGGUAN;
      const batch = writeBatch(db);
      itemsToSeed.forEach((item) => {
        const ref = doc(db, 'penerimaan_mingguan', item.id);
        batch.set(ref, sanitizeForFirestore(item));
      });
      await batch.commit();
      console.info(`[Firebase] Initialized ${itemsToSeed.length} penerimaan items in Cloud Firestore`);
    } catch (err) {
      console.warn('[Firebase] Failed to seed initial penerimaan:', err);
    }
  }
}

export const dbService = new DatabaseService();
export default dbService;
