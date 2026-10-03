export interface MasterDivision {
  id: string; // Stable string ID (e.g. 'div-dpph')
  code: string;
  nama: string;
  kategori: 'DPPH' | 'Seksi' | 'Kategorial' | 'DPL' | 'Umum';
  deskripsi: string;
  urutan: number;
  isActive: boolean;
}

export const MASTER_DIVISIONS: MasterDivision[] = [
  {
    id: 'div-dpph',
    code: 'DPPH',
    nama: 'DPPH (Dewan Pengurus Paroki Harian)',
    kategori: 'DPPH',
    deskripsi: 'Dewan Paroki Harian: Pastor Paroki, Wakil, Sekretaris, Bendahara, dan Ketua Bidang',
    urutan: 1,
    isActive: true,
  },
  {
    id: 'div-liturgi',
    code: 'LIT',
    nama: 'Liturgi & Peribadatan',
    kategori: 'Seksi',
    deskripsi: 'Seksi Liturgi, Paduan Suara / Koor, Lektor, Pemazmur, dan Tata Tertib Perayaan',
    urutan: 2,
    isActive: true,
  },
  {
    id: 'div-pewartaan',
    code: 'PEW',
    nama: 'Pewartaan & Katekese',
    kategori: 'Seksi',
    deskripsi: 'Seksi Katekese, Inisiasi Katolik, Komuni Pertama, Krisma, Bina Iman Anak (BIA/BIR)',
    urutan: 3,
    isActive: true,
  },
  {
    id: 'div-kategorial',
    code: 'KAT',
    nama: 'Paguyuban & Persekutuan Kategorial',
    kategori: 'Kategorial',
    deskripsi: 'Kelompok kategorial, PDKK, Wanita Katolik RI (WKRI), Legio Mariae, Couples for Christ',
    urutan: 4,
    isActive: true,
  },
  {
    id: 'div-diakonia',
    code: 'DIAK',
    nama: 'Pelayanan Kemasyarakatan (Sosial / PSE)',
    kategori: 'Seksi',
    deskripsi: 'Pengembangan Sosial Ekonomi (PSE), Karitas Paroki, Pelayanan Kesehatan & Lansia',
    urutan: 5,
    isActive: true,
  },
  {
    id: 'div-kepemudaan',
    code: 'OMK',
    nama: 'Kepemudaan (OMK & Misdinar)',
    kategori: 'Kategorial',
    deskripsi: 'Orang Muda Katolik (OMK) Paroki Katedral dan Putra-Putri Altar / Misdinar',
    urutan: 6,
    isActive: true,
  },
  {
    id: 'div-sarpras',
    code: 'SARPRAS',
    nama: 'Sarana & Prasarana',
    kategori: 'Seksi',
    deskripsi: 'Pemeliharaan gedung Gereja Katedral, sound system, kelistrikan, dan inventaris liturgis',
    urutan: 7,
    isActive: true,
  },
  {
    id: 'div-keuangan',
    code: 'KEU',
    nama: 'Keuangan & Rumah Tangga Paroki',
    kategori: 'Seksi',
    deskripsi: 'Pengelolaan anggaran, pembukuan kolekte, persembahan, dan operasional pastoran',
    urutan: 8,
    isActive: true,
  },
  {
    id: 'div-dpl',
    code: 'DPL',
    nama: 'DPL (Dewan Pastoral Lingkungan)',
    kategori: 'DPL',
    deskripsi: 'Koordinasi kegiatan lingkungan, ibadat sabda lingkungan, dan pendataan umat basis',
    urutan: 9,
    isActive: true,
  },
  {
    id: 'div-umum',
    code: 'UMUM',
    nama: 'Umum & Lainnya',
    kategori: 'Umum',
    deskripsi: 'Panitia perayaan khusus (Paskah, Natal, Ulang Tahun Paroki) dan tim ad-hoc',
    urutan: 10,
    isActive: true,
  },
];
