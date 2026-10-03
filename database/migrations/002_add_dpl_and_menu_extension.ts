import { FullDatabaseState, MasterMenu, MasterDivisi } from '../types';

export const migration_002 = {
  id: '002_add_dpl_and_menu_extension',
  name: 'Add Master DPL, Kategorial & Database Sync Menu',
  description: 'Menambahkan data master DPL (St. Mikael Kampung Baru, St. Fransiskus Asisi), Kategorial (WKRI, OMK), dan Menu Sinkronisasi Database.',
  apply: (state: FullDatabaseState): { updatedState: FullDatabaseState; changesCount: number } => {
    let changesCount = 0;

    // 1. Safe UPSERT new Menu (Sinkronisasi Data & Migrasi)
    const newMenu: MasterMenu = {
      id: 'menu-sinkronisasi-data',
      label: 'Status Database & Sinkronisasi',
      shortLabel: 'Database',
      iconName: 'Database',
      description: 'Pemantauan versi migration, master data, dan integritas data transaksi',
      order: 5,
      isActive: true,
      isSystem: false,
      badge: 'Baru',
    };

    const currentMenus = [...(state.masterMenus || [])];
    const menuIdx = currentMenus.findIndex((m) => m.id === newMenu.id);
    if (menuIdx === -1) {
      currentMenus.push(newMenu);
      changesCount++;
    } else {
      currentMenus[menuIdx] = { ...currentMenus[menuIdx], ...newMenu };
    }

    // 2. Safe UPSERT new DPL & Kategorial
    const newDivisions: MasterDivisi[] = [
      {
        id: 'div-dpl-st-mikael-kampung-baru',
        nama: 'DPL St. Mikael - Kampung Baru',
        kategori: 'dpl',
        deskripsi: 'Dewan Pengurus Lingkungan St. Mikael kawasan Kampung Baru',
        order: 9,
        isActive: true,
      },
      {
        id: 'div-dpl-st-fransiskus-asisi',
        nama: 'DPL St. Fransiskus Asisi',
        kategori: 'dpl',
        deskripsi: 'Dewan Pengurus Lingkungan St. Fransiskus Asisi',
        order: 10,
        isActive: true,
      },
      {
        id: 'div-kategorial-wkri',
        nama: 'Kategorial WKRI (Wanita Katolik RI)',
        kategori: 'kategorial',
        deskripsi: 'Organisasi kategorial kaum ibu Paroki Katedral',
        order: 11,
        isActive: true,
      },
      {
        id: 'div-kategorial-omk',
        nama: 'Kategorial OMK (Orang Muda Katolik)',
        kategori: 'kategorial',
        deskripsi: 'Pembinaan kepemudaan Paroki Katedral Medan',
        order: 12,
        isActive: true,
      },
    ];

    const currentDivisi = [...(state.masterDivisi || [])];
    newDivisions.forEach((div) => {
      const idx = currentDivisi.findIndex((d) => d.id === div.id);
      if (idx === -1) {
        currentDivisi.push(div);
        changesCount++;
      } else {
        currentDivisi[idx] = { ...currentDivisi[idx], ...div };
      }
    });

    return {
      updatedState: {
        ...state,
        masterMenus: currentMenus.sort((a, b) => a.order - b.order),
        masterDivisi: currentDivisi.sort((a, b) => a.order - b.order),
      },
      changesCount,
    };
  },
};
