import { ProgramKerja, ProgramStatus, ScheduleType } from '../src/types/proker';

export interface MasterMenu {
  id: string; // Stable unique ID, e.g. 'menu-programs', 'menu-calendar', 'menu-budget'
  label: string;
  shortLabel?: string;
  iconName: string;
  description: string;
  order: number;
  isActive: boolean;
  isSystem: boolean; // Cannot be deleted
  badge?: string;
}

export type DivisiCategory = 'dpph' | 'bidang' | 'seksi' | 'dpl' | 'kategorial' | 'lainnya';

export interface MasterDivisi {
  id: string; // Stable slug ID, e.g. 'div-dpph', 'div-dpl-st-mikael'
  nama: string;
  kategori: DivisiCategory;
  deskripsi?: string;
  koordinator?: string;
  order: number;
  isActive: boolean;
}

export interface MasterConfig {
  appTitle: string;
  activeYears: (2026 | 2027)[];
  defaultYear: 2026 | 2027;
  parokiName: string;
  keuskupanName: string;
  dataVersion: string;
}

export interface MigrationRecord {
  id: string; // e.g. '001_initial_master_data'
  name: string;
  executedAt: string;
  checksum?: string;
  changesCount: number;
}

export interface DatabaseMetadata {
  schemaVersion: number;
  lastMigrationId: string;
  lastSyncTimestamp: string;
  executedMigrations: string[];
}

export interface FullDatabaseState {
  metadata: DatabaseMetadata;
  masterMenus: MasterMenu[];
  masterDivisi: MasterDivisi[];
  config: MasterConfig;
  transactionalPrograms: ProgramKerja[];
}
