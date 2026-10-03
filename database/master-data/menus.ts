export interface MasterMenu {
  id: string; // Stable string ID (e.g. 'menu-program')
  code: string;
  label: string;
  icon: string;
  tipe: 'tab' | 'action' | 'filter';
  path?: string;
  deskripsi: string;
  urutan: number;
  isActive: boolean;
  badge?: string;
}

export const MASTER_MENUS: MasterMenu[] = [
  {
    id: 'menu-program',
    code: 'PROGRAM_LIST',
    label: 'Program Kerja',
    icon: 'ListFilter',
    tipe: 'tab',
    path: '#programs',
    deskripsi: 'Navigasi dan edit daftar program kerja 1 layar per program',
    urutan: 1,
    isActive: true,
  },
  {
    id: 'menu-kalender',
    code: 'CALENDAR_TIMELINE',
    label: 'Kalender',
    icon: 'Calendar',
    tipe: 'tab',
    path: '#calendar',
    deskripsi: 'Tinjauan matriks timeline dan kalender bulanan',
    urutan: 2,
    isActive: true,
  },
  {
    id: 'menu-anggaran',
    code: 'BUDGET_ANALYTICS',
    label: 'Anggaran',
    icon: 'PieChart',
    tipe: 'tab',
    path: '#budget',
    deskripsi: 'Analitik distribusi anggaran per divisi dan tipe jadwal',
    urutan: 3,
    isActive: true,
  },
  {
    id: 'menu-laporan',
    code: 'REPORT_EXPORT',
    label: 'Laporan',
    icon: 'FileText',
    tipe: 'tab',
    path: '#report',
    deskripsi: 'Dokumen matriks proker siap cetak & backup data',
    urutan: 4,
    isActive: true,
  },
  {
    id: 'menu-action-tambah',
    code: 'ACTION_ADD_PROKER',
    label: '+ Baru',
    icon: 'Plus',
    tipe: 'action',
    deskripsi: 'Membuat program kerja baru untuk tahun anggaran aktif',
    urutan: 5,
    isActive: true,
  },
  {
    id: 'menu-action-excel',
    code: 'ACTION_EXPORT_EXCEL',
    label: 'Ekspor Excel / CSV',
    icon: 'Download',
    tipe: 'action',
    deskripsi: 'Ekspor seluruh data proker ke spreadsheet Excel/CSV',
    urutan: 6,
    isActive: true,
  },
];
