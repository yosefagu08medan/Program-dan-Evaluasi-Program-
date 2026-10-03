import { FullDatabaseState, MasterMenu, MasterDivisi } from '../types';

export const migration_001 = {
  id: '001_initial_master_data',
  name: 'Initial Master Data & Core Schemas',
  description: 'Inisialisasi data master menu dasar, struktur divisi paroki, dan konfigurasi tahun anggaran 2026-2027.',
  apply: (state: FullDatabaseState): { updatedState: FullDatabaseState; changesCount: number } => {
    let changesCount = 0;

    // 1. Safe UPSERT Master Menus (using stable unique ID)
    const initialMenus: MasterMenu[] = [
      {
        id: 'menu-program-kerja',
        label: 'Program Kerja Operasional',
        shortLabel: 'Program',
        iconName: 'ClipboardList',
        description: 'Daftar matriks program kerja, tujuan kegiatan, dan sasaran',
        order: 1,
        isActive: true,
        isSystem: true,
      },
      {
        id: 'menu-kalender-jadwal',
        label: 'Kalender & Jadwal Bulanan',
        shortLabel: 'Kalender',
        iconName: 'Calendar',
        description: 'Distribusi tanggal rencana pelaksanaan sepanjang tahun',
        order: 2,
        isActive: true,
        isSystem: true,
      },
      {
        id: 'menu-analisis-anggaran',
        label: 'Analisis & Estimasi Anggaran',
        shortLabel: 'Anggaran',
        iconName: 'DollarSign',
        description: 'Visualisasi dan akumulasi anggaran 2026-2027 per divisi',
        order: 3,
        isActive: true,
        isSystem: true,
      },
      {
        id: 'menu-laporan-ekspor',
        label: 'Ekspor Laporan & Cetak',
        shortLabel: 'Laporan',
        iconName: 'FileSpreadsheet',
        description: 'Unduh Excel / CSV dan format cetak dokumen resmi',
        order: 4,
        isActive: true,
        isSystem: true,
      },
    ];

    const currentMenus = [...(state.masterMenus || [])];
    initialMenus.forEach((menu) => {
      const idx = currentMenus.findIndex((m) => m.id === menu.id);
      if (idx === -1) {
        currentMenus.push(menu);
        changesCount++;
      } else {
        // Update if changed
        currentMenus[idx] = { ...currentMenus[idx], ...menu };
      }
    });

    // 2. Safe UPSERT Master Divisi
    const initialDivisions: MasterDivisi[] = [
      {
        id: 'div-dpph-sekretariat',
        nama: 'Sekretariat / DPPH',
        kategori: 'dpph',
        deskripsi: 'Sekretariat & Administrasi Umum Paroki Katedral Medan',
        order: 1,
        isActive: true,
      },
      {
        id: 'div-dpph-keuangan',
        nama: 'Keuangan & Bendahara DPPH',
        kategori: 'dpph',
        deskripsi: 'Pengelolaan anggaran kas paroki dan pembukuan',
        order: 2,
        isActive: true,
      },
      {
        id: 'div-bidang-liturgi',
        nama: 'Bidang Liturgi & Peribadatan',
        kategori: 'bidang',
        deskripsi: 'Koordinasi perayaan Ekaristi, sakramen, lektor, koor, dan misdinar',
        order: 3,
        isActive: true,
      },
      {
        id: 'div-bidang-pewartaan',
        nama: 'Bidang Pewartaan & Katekese',
        kategori: 'bidang',
        deskripsi: 'Pendidikan iman katekumen, komuni pertama, krisma, dan BIA/BIR',
        order: 4,
        isActive: true,
      },
      {
        id: 'div-bidang-pelayanan-sosial',
        nama: 'Bidang Pelayanan & Sosial (PSE)',
        kategori: 'bidang',
        deskripsi: 'Pengembangan Sosial Ekonomi, bantuan karitatif, dan kemasyarakatan',
        order: 5,
        isActive: true,
      },
      {
        id: 'div-bidang-paguyuban',
        nama: 'Bidang Paguyuban & Komunitas',
        kategori: 'bidang',
        deskripsi: 'Pembinaan paguyuban umat, keluarga, dan kelompok kategorial',
        order: 6,
        isActive: true,
      },
      {
        id: 'div-seksi-umum-operasional',
        nama: 'Umum & Operasional',
        kategori: 'seksi',
        deskripsi: 'Pemeliharaan fasilitas gereja, inventaris, dan kebersihan',
        order: 7,
        isActive: true,
      },
      {
        id: 'div-seksi-sdm-kerumahtanggaan',
        nama: 'Pengembangan SDM & Kerumahtanggaan',
        kategori: 'seksi',
        deskripsi: 'Pelatihan pengurus, kehumasan, dan kerumahtanggaan pasturan',
        order: 8,
        isActive: true,
      },
    ];

    const currentDivisi = [...(state.masterDivisi || [])];
    initialDivisions.forEach((div) => {
      const idx = currentDivisi.findIndex((d) => d.id === div.id);
      if (idx === -1) {
        currentDivisi.push(div);
        changesCount++;
      } else {
        currentDivisi[idx] = { ...currentDivisi[idx], ...div };
      }
    });

    // 3. Update configuration
    const updatedConfig = {
      ...state.config,
      appTitle: 'Program Kerja Paroki St Perawan Maria Yang Dikandung Tanpa Noda Katedral Keuskupan Agung Medan',
      activeYears: [2026, 2027] as (2026 | 2027)[],
      defaultYear: 2026 as (2026 | 2027),
      parokiName: 'St. Perawan Maria Yang Dikandung Tanpa Noda Katedral',
      keuskupanName: 'Keuskupan Agung Medan',
      dataVersion: '1.2.0',
    };

    return {
      updatedState: {
        ...state,
        masterMenus: currentMenus.sort((a, b) => a.order - b.order),
        masterDivisi: currentDivisi.sort((a, b) => a.order - b.order),
        config: updatedConfig,
      },
      changesCount,
    };
  },
};
