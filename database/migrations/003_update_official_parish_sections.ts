import { MASTER_DIVISIONS, getDefaultPicForDivisi } from '../master-data/divisions';
import { MigrationContext } from './001_initial_schema_and_master';
import { ProgramKerja } from '../../src/types/proker';

export const migration003 = {
  id: '003_update_official_parish_sections',
  description: 'Pembaruan daftar 15 Seksi resmi Paroki Katedral Medan & otomatisasi PIC Koordinator Seksi',
  timestamp: 1775185200000,
  up: (ctx: MigrationContext) => {
    // 1. Update master divisions in metadata
    ctx.setMeta('master_divisions', MASTER_DIVISIONS);

    // 2. Normalisasi divisi program kerja yang sudah ada ke daftar seksi resmi baru
    const programs = ctx.getPrograms();
    if (Array.isArray(programs) && programs.length > 0) {
      const divisionMap: Record<string, string> = {
        'Liturgi & Peribadatan': 'Seksi Liturgi',
        'Pewartaan & Katekese': 'Seksi Katekese',
        'Pelayanan Kemasyarakatan': 'Seksi PSE',
        'Kepemudaan (OMK & Misdinar)': 'Seksi Kepemudaan',
        'Sarana & Prasarana': 'Seksi Umum',
        'Keuangan & Rumah Tangga': 'Seksi Umum',
        'Paguyuban & Persekutuan': 'Seksi Kerasulan Keluarga',
        'Umum & Lainnya': 'Seksi Umum',
      };

      const updated = programs.map((p) => {
        let currentDiv = p.penanggungjawab?.divisi || 'Seksi Umum';
        if (divisionMap[currentDiv]) {
          currentDiv = divisionMap[currentDiv];
        }

        // Pastikan nama PIC terisi dengan default Koordinator Seksi jika kosong
        let currentPicName = p.penanggungjawab?.nama?.trim();
        if (!currentPicName) {
          currentPicName = getDefaultPicForDivisi(currentDiv);
        }

        return {
          ...p,
          penanggungjawab: {
            ...p.penanggungjawab,
            divisi: currentDiv,
            nama: currentPicName,
          },
        };
      });

      ctx.setPrograms(updated);
    }
  },
};
