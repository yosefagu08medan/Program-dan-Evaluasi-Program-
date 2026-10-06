export interface MasterDivision {
  id: string; // Stable string ID (e.g. 'div-keamanan')
  code: string;
  nama: string;
  defaultPic: string; // Gelar/Jabatan PIC default, misal: 'Koordinator Seksi Keamanan'
  kategori: 'DPPH' | 'Seksi' | 'PLBKS' | 'Umum';
  deskripsi: string;
  urutan: number;
  isActive: boolean;
}

export const MASTER_DIVISIONS: MasterDivision[] = [
  {
    id: 'div-dpph',
    code: 'DPPH',
    nama: 'DPPH (Dewan Pastoral Paroki Harian)',
    defaultPic: 'Sekretariat DPPH',
    kategori: 'DPPH',
    deskripsi: 'Dewan Pastoral Paroki Harian, koordinasi pastoral umum & kebijakan paroki',
    urutan: 1,
    isActive: true,
  },
  {
    id: 'div-keamanan',
    code: 'SEK-KEAMANAN',
    nama: 'Seksi Keamanan',
    defaultPic: 'Koordinator Seksi Keamanan',
    kategori: 'Seksi',
    deskripsi: 'Keamanan ketertiban misa, parkir, dan pengamanan lingkungan gereja katedral',
    urutan: 2,
    isActive: true,
  },
  {
    id: 'div-umum',
    code: 'SEK-UMUM',
    nama: 'Seksi Umum',
    defaultPic: 'Koordinator Seksi Umum',
    kategori: 'Seksi',
    deskripsi: 'Pengelolaan operasional umum, perlengkapan, dan logistik paroki',
    urutan: 3,
    isActive: true,
  },
  {
    id: 'div-komsos',
    code: 'SEK-KOMSOS',
    nama: 'Seksi Komsos',
    defaultPic: 'Koordinator Seksi Komsos',
    kategori: 'Seksi',
    deskripsi: 'Komunikasi sosial, warta paroki, live streaming misa, dan publikasi media sosial',
    urutan: 4,
    isActive: true,
  },
  {
    id: 'div-kepemudaan',
    code: 'SEK-MUDA',
    nama: 'Seksi Kepemudaan',
    defaultPic: 'Koordinator Seksi Kepemudaan',
    kategori: 'Seksi',
    deskripsi: 'Pendampingan Orang Muda Katolik (OMK), rekoleksi pemuda, dan kaderisasi',
    urutan: 5,
    isActive: true,
  },
  {
    id: 'div-hak',
    code: 'SEK-HAK',
    nama: 'Seksi HAK',
    defaultPic: 'Koordinator Seksi HAK',
    kategori: 'Seksi',
    deskripsi: 'Hubungan Antar Agama dan Kemasyarakatan, dialog lintas iman dan kerukunan',
    urutan: 6,
    isActive: true,
  },
  {
    id: 'div-pse',
    code: 'SEK-PSE',
    nama: 'Seksi PSE',
    defaultPic: 'Koordinator Seksi PSE',
    kategori: 'Seksi',
    deskripsi: 'Pengembangan Sosial Ekonomi, aksi puasa pembangunan, beasiswa, dan bantuan sosial',
    urutan: 7,
    isActive: true,
  },
  {
    id: 'div-keluarga',
    code: 'SEK-KELUARGA',
    nama: 'Seksi Kerasulan Keluarga',
    defaultPic: 'Koordinator Seksi Kerasulan Keluarga',
    kategori: 'Seksi',
    deskripsi: 'Kursus persiapan perkawinan (KPP), pembinaan pasutri, dan pastoral keluarga',
    urutan: 8,
    isActive: true,
  },
  {
    id: 'div-kki',
    code: 'SEK-KKI',
    nama: 'Seksi KKI',
    defaultPic: 'Koordinator Seksi KKI',
    kategori: 'Seksi',
    deskripsi: 'Karya Kepausan Indonesia, animasi misioner anak & remaja (SEKAMI / BIA-BIR)',
    urutan: 9,
    isActive: true,
  },
  {
    id: 'div-evangelisasi',
    code: 'SEK-EVANGELISASI',
    nama: 'Seksi Evangelisasi',
    defaultPic: 'Koordinator Seksi Evangelisasi',
    kategori: 'Seksi',
    deskripsi: 'Pewartaan kabar gembira, retret, persekutuan doa, dan penginjilan baru',
    urutan: 10,
    isActive: true,
  },
  {
    id: 'div-pendidikan',
    code: 'SEK-PENDIDIKAN',
    nama: 'Seksi Pendidikan',
    defaultPic: 'Koordinator Seksi Pendidikan',
    kategori: 'Seksi',
    deskripsi: 'Pendampingan guru katolik, subsidi/bantuan sarana edukasi, dan motivasi belajar',
    urutan: 11,
    isActive: true,
  },
  {
    id: 'div-kks',
    code: 'SEK-KKS',
    nama: 'Seksi KKS',
    defaultPic: 'Koordinator Seksi KKS',
    kategori: 'Seksi',
    deskripsi: 'Kerasulan Kitab Suci, Bulan Kitab Suci Nasional (BKSN), dan kursus Alkitab',
    urutan: 12,
    isActive: true,
  },
  {
    id: 'div-liturgi',
    code: 'SEK-LITURGI',
    nama: 'Seksi Liturgi',
    defaultPic: 'Koordinator Seksi Liturgi',
    kategori: 'Seksi',
    deskripsi: 'Tata perayaan Ekaristi, koor/paduan suara, lektor, pemazmur, dan misdinar',
    urutan: 13,
    isActive: true,
  },
  {
    id: 'div-katekese',
    code: 'SEK-KATEKESE',
    nama: 'Seksi Katekese',
    defaultPic: 'Koordinator Seksi Katekese',
    kategori: 'Seksi',
    deskripsi: 'Pelajaran katekumen inisiasi baptis, komuni pertama, dan krisma',
    urutan: 14,
    isActive: true,
  },
  {
    id: 'div-plbks',
    code: 'SEK-PLBKS',
    nama: 'PLBKS',
    defaultPic: 'Koordinator PLBKS',
    kategori: 'PLBKS',
    deskripsi: 'Pengembangan Lingkungan Hidup, Keadilan, Perdamaian & Tanggap Kebencanaan Paroki',
    urutan: 15,
    isActive: true,
  },
  {
    id: 'div-kerawam',
    code: 'SEK-KERAWAM',
    nama: 'Seksi Kerasulan Awam',
    defaultPic: 'Koordinator Seksi Kerasulan Awam',
    kategori: 'Seksi',
    deskripsi: 'Kerasulan awam dalam kehidupan sosial-politik, kebangsaan, dan advokasi hukum',
    urutan: 16,
    isActive: true,
  },
];

export function getDefaultPicForDivisi(divisiName: string): string {
  const found = MASTER_DIVISIONS.find((d) => d.nama === divisiName);
  if (found && found.defaultPic) return found.defaultPic;
  if (divisiName === 'PLBKS') return 'Koordinator PLBKS';
  if (divisiName.startsWith('Seksi ')) return `Koordinator ${divisiName}`;
  return `Koordinator ${divisiName}`;
}
