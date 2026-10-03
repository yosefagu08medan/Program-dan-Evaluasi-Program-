import { MASTER_DIVISIONS } from '../master-data/divisions';
import { MASTER_MENUS } from '../master-data/menus';
import { SYSTEM_CONFIG } from '../master-data/systemConfig';
import { SEED_PROGRAMS } from '../seed/seedData';
import { ProgramKerja } from '../../src/types/proker';

export interface MigrationContext {
  getPrograms: () => ProgramKerja[];
  setPrograms: (programs: ProgramKerja[]) => void;
  getMeta: (key: string) => any;
  setMeta: (key: string, value: any) => void;
}

export const migration001 = {
  id: '001_initial_schema_and_master',
  description: 'Inisialisasi schema dasar, master data divisi, master menu, dan seed data awal DPPH',
  timestamp: 1775174400000,
  up: (ctx: MigrationContext) => {
    // 1. Inisialisasi Master Data di metadata storage
    ctx.setMeta('master_divisions', MASTER_DIVISIONS);
    ctx.setMeta('master_menus', MASTER_MENUS);
    ctx.setMeta('system_config', SYSTEM_CONFIG);

    // 2. Safe Idempotent UPSERT untuk Program Transaksi
    const currentPrograms = ctx.getPrograms();

    if (!currentPrograms || currentPrograms.length === 0) {
      // Jika belum ada program kerja sama sekali, pasang seed data awal
      ctx.setPrograms(SEED_PROGRAMS);
    } else {
      // Jika sudah ada program kerja yang dibuat pengguna, JANGAN hapus/reset!
      // Lakukan idempotent check: pastikan minimal ada program seed awal tanpa menimpa data pengguna
      const existingIds = new Set(currentPrograms.map((p) => p.id));
      const missingSeeds = SEED_PROGRAMS.filter((seed) => !existingIds.has(seed.id));

      if (missingSeeds.length > 0) {
        ctx.setPrograms([...currentPrograms, ...missingSeeds]);
      }
    }
  },
};
