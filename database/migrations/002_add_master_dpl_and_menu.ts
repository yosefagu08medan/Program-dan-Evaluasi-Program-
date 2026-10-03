import { MASTER_DIVISIONS } from '../master-data/divisions';
import { MASTER_MENUS } from '../master-data/menus';
import { SYSTEM_CONFIG } from '../master-data/systemConfig';
import { MigrationContext } from './001_initial_schema_and_master';
import { ProgramKerja } from '../../src/types/proker';

export const migration002 = {
  id: '002_add_master_dpl_and_menu',
  description: 'Sinkronisasi master data DPL, menu navigasi, dan normalisasi tahun anggaran 2026/2027',
  timestamp: 1775178000000,
  up: (ctx: MigrationContext) => {
    // 1. Selalu perbarui master divisions dan master menus ke versi terkini dari git
    ctx.setMeta('master_divisions', MASTER_DIVISIONS);
    ctx.setMeta('master_menus', MASTER_MENUS);
    ctx.setMeta('system_config', SYSTEM_CONFIG);

    // 2. Normalisasi program kerja tanpa merusak data pengguna
    const programs = ctx.getPrograms();
    if (Array.isArray(programs) && programs.length > 0) {
      let hasChanges = false;
      const validDivisions = new Set(MASTER_DIVISIONS.map((d) => d.nama));

      const updatedPrograms: ProgramKerja[] = programs.map((p) => {
        let changed = false;
        let tahun = p.tahun;

        // Migrasikan tahun 2025 lama ke 2026 jika ditemukan data legacy
        if ((tahun as any) === 2025) {
          tahun = 2026;
          changed = true;
        }

        // Pastikan divisi memiliki fallback valid jika kosong
        let divisi = p.penanggungjawab?.divisi;
        if (!divisi || !validDivisions.has(divisi)) {
          // Cari divisi terdekat atau fallback ke DPPH
          const matching = MASTER_DIVISIONS.find((d) =>
            d.nama.toLowerCase().includes((divisi || '').toLowerCase())
          );
          divisi = matching ? matching.nama : MASTER_DIVISIONS[0].nama;
          changed = true;
        }

        if (changed) {
          hasChanges = true;
          return {
            ...p,
            tahun,
            penanggungjawab: {
              ...p.penanggungjawab,
              divisi,
            },
          };
        }
        return p;
      });

      if (hasChanges) {
        ctx.setPrograms(updatedPrograms);
      }
    }
  },
};
