import { MASTER_DIVISIONS, getDefaultPicForDivisi } from '../master-data/divisions';
import { MigrationContext } from './001_initial_schema_and_master';

export const migration004 = {
  id: '004_normalize_dpph_and_all_divisions',
  description: 'Penyelarasan nama resmi DPPH (Dewan Pastoral Paroki Harian) pada seluruh program kerja',
  timestamp: 1775271600000,
  up: (ctx: MigrationContext) => {
    ctx.setMeta('master_divisions', MASTER_DIVISIONS);

    const programs = ctx.getPrograms();
    if (Array.isArray(programs) && programs.length > 0) {
      const updated = programs.map((p) => {
        let currentDiv = p.penanggungjawab?.divisi || 'Seksi Umum';
        const dLower = currentDiv.toLowerCase();

        // Normalisasi seluruh variasi penamaan DPPH
        if (
          dLower.includes('dpph') ||
          dLower.includes('dewan pastoral') ||
          dLower.includes('dewan paroki') ||
          dLower.includes('dewan pengurus') ||
          dLower.includes('sekretariat / dpph') ||
          dLower === 'sekretariat'
        ) {
          currentDiv = 'DPPH (Dewan Pastoral Paroki Harian)';
        }

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
