export type KategoriPenerimaan =
  | 'kolekte_1'
  | 'kolekte_2'
  | 'kolekte_khusus'
  | 'persembahan_umat'
  | 'iuran_lingkungan'
  | 'donatur_spesifik'
  | 'usaha_dana_seksi'
  | 'dana_kelolaan'
  | 'lain_lain';

export type TipeSumberPenerimaan = 'paroki' | 'seksi_tetap' | 'seksi_tentatif';

export interface PenerimaanMingguan {
  id: string;
  tahun: 2026 | 2027;
  bulan: number; // 1 - 12
  mingguKe: 1 | 2 | 3 | 4 | 5; // Minggu 1-5 dalam bulan
  tanggal: string; // Format YYYY-MM-DD atau label tanggal kebaktian/misa
  kategori: KategoriPenerimaan;
  namaPenerimaan: string; // Contoh: "Kolekte II Misa Mingguan (Alokasi Dana Proker Liturgi & PSE)"
  rancangan: number; // Target / Proyeksi Anggaran Penerimaan (Rp)
  realisasi: number; // Dana Riil / Aktual Masuk (Rp)
  alokasiProkerId?: string; // ID Program Kerja terkait (jika dikhususkan)
  namaProgramTerkait?: string; // Nama Proker jika tertaut
  alokasiSeksi?: string; // Seksi penerima alokasi atau 'Umum Paroki'
  tipeSumber?: TipeSumberPenerimaan; // 'paroki' | 'seksi_tetap' (PSE/KKI) | 'seksi_tentatif'
  isTentatif?: boolean; // True jika merupakan penerimaan insidental/tentatif seksi
  isHariKhusus?: boolean; // True jika merupakan kolekte/misa di luar hari Minggu rutin (Kamis Putih, Jumat Agung, Natal, dll.)
  namaHariKhusus?: string; // Nama hari perayaan khusus (misal: "Kamis Putih", "Jumat Agung", "Malam Paskah", dll.)
  keterangan?: string; // Catatan teknis misa / kwitansi / jumlah amplop
  pencatat?: string; // Nama petugas / bendahara yang menginput (Default: Bendahara Paroki)
  isRealisasiManual?: boolean; // True jika realisasi sudah diinput secara manual oleh user
  isTargetTahunan?: boolean; // True jika target adalah target tahunan sepanjang tahun (bukan bulanan), misal Dana Solidaritas Umat PSE
  targetTahunan?: number; // Target tahunan penuh (Rp/tahun). Realisasi di bulan apa pun akan mengurangi target tahunan ini
  createdAt: string;
  updatedAt: string;
}

export function isSeksiTetap(divisiName?: string): boolean {
  if (!divisiName) return false;
  const dLower = divisiName.toLowerCase();
  return (
    dLower.includes('pse') ||
    dLower.includes('kemasyarakatan') ||
    dLower.includes('kki') ||
    dLower.includes('karya kepausan')
  );
}

export function isDpphOrAdmin(session?: { role?: string; unitId?: string; unitNama?: string } | null): boolean {
  if (!session) return false;
  if (
    session.role === 'pastor_paroki' ||
    session.role === 'semua_seksi' ||
    session.role === 'bendahara'
  ) {
    return true;
  }
  const unitLower = (session.unitNama || '').toLowerCase();
  const idLower = (session.unitId || '').toLowerCase();
  return (
    unitLower.includes('dpph') ||
    unitLower.includes('dewan pastoral') ||
    unitLower.includes('dewan paroki') ||
    unitLower.includes('dewan pengurus') ||
    unitLower.includes('bendahara') ||
    idLower.includes('dpph') ||
    idLower.includes('bendahara')
  );
}

// Aturan Pembagian 50:50 Kolekte I:
// 50% masuk sebagai Dana Solidaritas (Keuskupan)
// 50% menjadi Dana Operasional Paroki & Pembiayaan Program Seksi
export function calculateKolekte1Split(nominal: number): {
  danaSolidaritas: number;
  danaOperasionalDanProker: number;
} {
  const val = Math.max(0, nominal || 0);
  const danaSolidaritas = Math.round(val * 0.5);
  const danaOperasionalDanProker = val - danaSolidaritas;
  return {
    danaSolidaritas,
    danaOperasionalDanProker,
  };
}

export interface KategoriPenerimaanMeta {
  id: KategoriPenerimaan;
  label: string;
  deskripsi: string;
  badgeColor: string; // Tailwind class
  accentColor: string;
}

export const KATEGORI_PENERIMAAN_LIST: KategoriPenerimaanMeta[] = [
  {
    id: 'kolekte_2',
    label: 'Kolekte II (Dana Pembangunan)',
    deskripsi: 'Dicatatkan khusus sebagai Dana Pembangunan, tersimpan di kas pembangunan dan hanya dipakai untuk pembiayaan pembangunan/renovasi fisik paroki.',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    accentColor: 'text-emerald-600',
  },
  {
    id: 'kolekte_1',
    label: 'Kolekte I (50% Solidaritas : 50% Operasional & Proker)',
    deskripsi: 'Kolekte misa mingguan yang dibagi otomatis: 50% disetor sebagai Dana Solidaritas Keuskupan, 50% untuk operasional paroki & pembiayaan program kerja seksi.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    accentColor: 'text-blue-600',
  },
  {
    id: 'kolekte_khusus',
    label: 'Kolekte Khusus / Liturgi',
    deskripsi: 'Kolekte Hari Raya, APP (Aksi Puasa Pembangunan), Aksi Natal, HPS, Minggu Misi',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    accentColor: 'text-purple-600',
  },
  {
    id: 'persembahan_umat',
    label: 'Persembahan Syukur & Derma',
    deskripsi: 'Persembahan intensi khusus umat, ucapan syukur baptis, pernikahan, dan derma kasih',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    accentColor: 'text-amber-600',
  },
  {
    id: 'iuran_lingkungan',
    label: 'Iuran Lingkungan & Wilayah',
    deskripsi: 'Kontribusi iuran gotong royong umat dari lingkungan-lingkungan dan wilayah pastoral',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    accentColor: 'text-indigo-600',
  },
  {
    id: 'donatur_spesifik',
    label: 'Donatur Khusus Proker',
    deskripsi: 'Sumbangan dermawan/donatur yang ditujukan spesifik untuk membiayai program kerja tertentu',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    accentColor: 'text-rose-600',
  },
  {
    id: 'usaha_dana_seksi',
    label: 'Usaha Dana Seksi / Panitia',
    deskripsi: 'Penerimaan dari bazar, penjualan cinderamata rohani, tiket konser rohani OMK, dsb',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    accentColor: 'text-teal-600',
  },
  {
    id: 'dana_kelolaan',
    label: 'Dana Kelolaan & Kas Paroki',
    deskripsi: 'Alokasi cadangan kas paroki atau bagi hasil dana kelolaan gereja',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    accentColor: 'text-cyan-600',
  },
  {
    id: 'lain_lain',
    label: 'Penerimaan Lain-lain',
    deskripsi: 'Penerimaan insidental lainnya yang sah untuk kas kegiatan',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    accentColor: 'text-slate-600',
  },
];

export function getKategoriMeta(kategori: KategoriPenerimaan): KategoriPenerimaanMeta {
  const found = KATEGORI_PENERIMAAN_LIST.find((k) => k.id === kategori);
  return (
    found || {
      id: 'lain_lain',
      label: 'Lain-lain',
      deskripsi: 'Penerimaan lainnya',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
      accentColor: 'text-slate-600',
    }
  );
}

// =========================================================================
// STANDAR PILIHAN NAMA PENERIMAAN KHUSUS SEKSI PSE:
// 1. Dana Aksi Puasa Pembangunan
// 2. Amplop Natal
// 3. Dana Solidaritas Umat
// + Pilihan kustom yang bisa diketik sendiri, disimpan, dan menjadi pilihan berikutnya
// =========================================================================
export const DEFAULT_PSE_PENERIMAAN_OPTIONS = [
  'Dana Aksi Puasa Pembangunan',
  'Amplop Natal',
  'Dana Solidaritas Umat',
] as const;

export const PSE_CUSTOM_OPTIONS_STORAGE_KEY = 'proker_pse_custom_penerimaan_options';

export function getPseCustomPenerimaanOptions(): string[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(PSE_CUSTOM_OPTIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (opt): opt is string =>
              typeof opt === 'string' &&
              opt.trim().length > 0 &&
              !DEFAULT_PSE_PENERIMAAN_OPTIONS.some(
                (d) => d.toLowerCase() === opt.trim().toLowerCase()
              )
          );
        }
      }
    }
  } catch (e) {
    console.warn('Error reading PSE custom penerimaan options:', e);
  }
  return [];
}

export function getAllPsePenerimaanOptions(): string[] {
  const custom = getPseCustomPenerimaanOptions();
  return [...DEFAULT_PSE_PENERIMAAN_OPTIONS, ...custom];
}

export function savePseCustomPenerimaanOption(newOption: string): string[] {
  const trimmed = newOption.trim();
  if (!trimmed) return getAllPsePenerimaanOptions();
  const isDefault = DEFAULT_PSE_PENERIMAAN_OPTIONS.some(
    (d) => d.toLowerCase() === trimmed.toLowerCase()
  );
  if (isDefault) return getAllPsePenerimaanOptions();

  const currentCustom = getPseCustomPenerimaanOptions();
  const exists = currentCustom.some((c) => c.toLowerCase() === trimmed.toLowerCase());
  if (!exists) {
    const updated = [...currentCustom, trimmed];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(PSE_CUSTOM_OPTIONS_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('Error saving PSE custom penerimaan option:', e);
    }
    return [...DEFAULT_PSE_PENERIMAAN_OPTIONS, ...updated];
  }
  return [...DEFAULT_PSE_PENERIMAAN_OPTIONS, ...currentCustom];
}

export function removePseCustomPenerimaanOption(optionToRemove: string): string[] {
  const currentCustom = getPseCustomPenerimaanOptions();
  const updated = currentCustom.filter((c) => c !== optionToRemove);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(PSE_CUSTOM_OPTIONS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('Error deleting PSE custom penerimaan option:', e);
  }
  return [...DEFAULT_PSE_PENERIMAAN_OPTIONS, ...updated];
}

export interface PseAnnualTargetSummary {
  namaPenerimaan: string;
  targetTahunan: number;
  totalRealisasiTahunan: number;
  sisaTargetTahunan: number;
  persentaseTahunan: number;
  isSurplus: boolean;
  selisihSurplus: number;
  bulananRealisasi: { bulan: number; namaBulan: string; realisasi: number; count: number }[];
}

export function isPseTargetTahunan(item?: Partial<PenerimaanMingguan> | null): boolean {
  if (!item) return false;
  if (item.isTargetTahunan) return true;
  const isPse = item.alokasiSeksi === 'Seksi PSE' || !item.alokasiSeksi;
  const namaLower = (item.namaPenerimaan || '').toLowerCase();
  return Boolean(isPse && (namaLower.includes('solidaritas') || namaLower.includes('dana solidaritas umat')));
}

export function calculatePseAnnualTargetSummary(
  penerimaanList: PenerimaanMingguan[],
  tahun: 2026 | 2027 | number = 2026,
  targetNama = 'Dana Solidaritas Umat'
): PseAnnualTargetSummary {
  const BULAN_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  // Ambil semua item PSE untuk targetNama dan tahun yang dipilih
  const pseItems = penerimaanList.filter((p) => {
    if (p.tahun !== tahun) return false;
    const isPse = p.alokasiSeksi === 'Seksi PSE' || (p.namaPenerimaan && p.namaPenerimaan.toLowerCase().includes('pse'));
    const isMatchingNama =
      p.namaPenerimaan?.toLowerCase().includes('solidaritas') ||
      p.namaPenerimaan?.toLowerCase() === targetNama.toLowerCase() ||
      p.isTargetTahunan;
    return isPse && isMatchingNama;
  });

  // Tentukan target tahunan
  let targetTahunan = 0;
  for (const item of pseItems) {
    if (typeof item.targetTahunan === 'number' && item.targetTahunan > 0) {
      targetTahunan = Math.max(targetTahunan, item.targetTahunan);
    } else if (typeof item.rancangan === 'number' && item.rancangan > 0) {
      targetTahunan = Math.max(targetTahunan, item.rancangan);
    }
  }

  // Jika belum ada target yang diinput, default ke 50.000.000 / tahun
  if (targetTahunan === 0) {
    targetTahunan = 50000000;
  }

  // Hitung total realisasi tahunan dari seluruh bulan
  const totalRealisasiTahunan = pseItems.reduce((sum, item) => sum + (item.realisasi || 0), 0);
  const sisaTargetTahunan = Math.max(0, targetTahunan - totalRealisasiTahunan);
  const selisihSurplus = Math.max(0, totalRealisasiTahunan - targetTahunan);
  const isSurplus = totalRealisasiTahunan >= targetTahunan;
  const persentaseTahunan = targetTahunan > 0 ? Math.round((totalRealisasiTahunan / targetTahunan) * 100) : 0;

  // Breakdown per bulan (1-12)
  const bulananRealisasi = Array.from({ length: 12 }, (_, i) => {
    const bNum = i + 1;
    const bItems = pseItems.filter((p) => p.bulan === bNum);
    const bReal = bItems.reduce((sum, p) => sum + (p.realisasi || 0), 0);
    return {
      bulan: bNum,
      namaBulan: BULAN_NAMES[i],
      realisasi: bReal,
      count: bItems.length,
    };
  });

  return {
    namaPenerimaan: targetNama,
    targetTahunan,
    totalRealisasiTahunan,
    sisaTargetTahunan,
    persentaseTahunan,
    isSurplus,
    selisihSurplus,
    bulananRealisasi,
  };
}
