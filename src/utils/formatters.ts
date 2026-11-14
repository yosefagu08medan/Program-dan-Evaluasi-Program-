import { ProgramKerja, ScheduleType, ProgramStatus, EvaluasiProgram, KategoriProgram } from '../types/proker';
import { AuthSession } from '../types/auth';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';

export const BULAN_LIST = [
  { no: 1, nama: 'Januari', singkatan: 'Jan' },
  { no: 2, nama: 'Februari', singkatan: 'Feb' },
  { no: 3, nama: 'Maret', singkatan: 'Mar' },
  { no: 4, nama: 'April', singkatan: 'Apr' },
  { no: 5, nama: 'Mei', singkatan: 'Mei' },
  { no: 6, nama: 'Juni', singkatan: 'Jun' },
  { no: 7, nama: 'Juli', singkatan: 'Jul' },
  { no: 8, nama: 'Agustus', singkatan: 'Agu' },
  { no: 9, nama: 'September', singkatan: 'Sep' },
  { no: 10, nama: 'Oktober', singkatan: 'Okt' },
  { no: 11, nama: 'November', singkatan: 'Nov' },
  { no: 12, nama: 'Desember', singkatan: 'Des' },
];

export const DAFTAR_DIVISI: string[] = MASTER_DIVISIONS.map((d) => d.nama);

export const OFFICIAL_DPPH_NAME = 'DPPH (Dewan Pastoral Paroki Harian)';

/**
 * Normalisasi nama divisi untuk mengatasi variasi penamaan seperti
 * 'Sekretariat / DPPH', 'DPPH', 'DPPH (Dewan Pengurus Paroki Harian)'
 */
export function normalizeDivisionName(divisi: string | undefined): string {
  if (!divisi) return 'Seksi Umum';
  const dLower = divisi.toLowerCase();
  if (
    dLower.includes('dpph') ||
    dLower.includes('dewan pastoral') ||
    dLower.includes('dewan paroki') ||
    dLower.includes('dewan pengurus') ||
    dLower.includes('sekretariat / dpph') ||
    dLower === 'sekretariat'
  ) {
    return OFFICIAL_DPPH_NAME;
  }

  // Cari di daftar MASTER_DIVISIONS
  const found = MASTER_DIVISIONS.find((m) => m.nama.toLowerCase() === dLower);
  if (found) return found.nama;

  // Pencocokan seksi
  if (dLower.includes('liturgi')) return 'Seksi Liturgi';
  if (dLower.includes('katekese')) return 'Seksi Katekese';
  if (dLower.includes('komsos')) return 'Seksi Komsos';
  if (dLower.includes('keamanan')) return 'Seksi Keamanan';
  if (dLower.includes('pse') || dLower.includes('kemasyarakatan')) return 'Seksi PSE';
  if (dLower.includes('kepemudaan') || dLower.includes('omk')) return 'Seksi Kepemudaan';
  if (dLower.includes('keluarga')) return 'Seksi Kerasulan Keluarga';
  if (dLower.includes('pendidikan')) return 'Seksi Pendidikan';
  if (dLower.includes('kki') || dLower.includes('karya kepausan')) return 'Seksi KKI';
  if (dLower.includes('evangelisasi')) return 'Seksi Evangelisasi';
  if (dLower.includes('kks') || dLower.includes('kitab suci')) return 'Seksi KKS';
  if (dLower.includes('plbks') || dLower.includes('komuni suci') || dLower.includes('pelayan luar biasa')) return 'PLBKS (Pelayan Luar Biasa Komuni Suci)';
  if (dLower.includes('kerawam') || dLower.includes('awam')) return 'Seksi Kerasulan Awam';
  if (dLower.includes('hak') || dLower.includes('kepercayaan')) return 'Seksi HAK';
  if (dLower.includes('umum') || dLower.includes('sarana') || dLower.includes('rumah tangga')) return 'Seksi Umum';

  return divisi;
}

/**
 * Mencocokkan divisi program dengan filter atau master division
 */
export function isDivisionMatch(progDivisi: string | undefined, targetDivisi: string): boolean {
  if (!targetDivisi || targetDivisi === 'all') return true;
  if (!progDivisi) return false;
  return normalizeDivisionName(progDivisi) === normalizeDivisionName(targetDivisi);
}

export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactRupiah(amount: number): string {
  if (!amount) return 'Rp 0';
  const isNeg = amount < 0;
  const abs = Math.abs(amount);
  const prefix = isNeg ? '-Rp ' : 'Rp ';
  if (abs >= 1_000_000_000) {
    return `${prefix}${(abs / 1_000_000_000).toFixed(abs % 1_000_000_000 === 0 ? 0 : 1)} M`;
  }
  if (abs >= 1_000_000) {
    return `${prefix}${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)} Jt`;
  }
  if (abs >= 1_000) {
    return `${prefix}${(abs / 1_000).toFixed(0)} Rb`;
  }
  return `${isNeg ? '-' : ''}Rp ${abs}`;
}

export function parseRupiahInput(val: string): number {
  const cleaned = val.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export function toISODateString(val?: string): string {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;

  const regex = /(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/;
  const match = val.match(regex);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthName = match[2].toLowerCase();
    const year = parseInt(match[3], 10);
    const monthIdx = BULAN_LIST.findIndex(
      (b) => b.nama.toLowerCase() === monthName || b.singkatan.toLowerCase() === monthName
    );
    if (monthIdx !== -1) {
      const mStr = String(monthIdx + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      return `${year}-${mStr}-${dStr}`;
    }
  }

  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return '';
}

export function formatIndonesianDate(dateStr?: string, withDayName = true): string {
  if (!dateStr) return '';
  const iso = toISODateString(dateStr);
  if (iso && iso.includes('-')) {
    const parts = iso.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10);
      const da = parseInt(parts[2], 10);
      if (!isNaN(yr) && !isNaN(mo) && !isNaN(da)) {
        const dateObj = new Date(yr, mo - 1, da);
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const dayName = dayNames[dateObj.getDay()];
        const moName = BULAN_LIST[mo - 1]?.nama || '';
        return withDayName && dayName ? `${dayName}, ${da} ${moName} ${yr}` : `${da} ${moName} ${yr}`;
      }
    }
  }
  return dateStr;
}

export function generateJadwalBulanan(
  tahun: number,
  pola: 'selasa_pertama' | 'minggu_pertama' | 'tanggal_1' | 'tanggal_5' | 'tanggal_10' | 'tanggal_15'
): Record<number, string> {
  const result: Record<number, string> = {};
  for (let m = 1; m <= 12; m++) {
    const mStr = String(m).padStart(2, '0');
    let tgl = 1;
    if (pola === 'selasa_pertama') {
      const firstDay = new Date(tahun, m - 1, 1).getDay();
      tgl = ((2 - firstDay + 7) % 7) + 1;
    } else if (pola === 'minggu_pertama') {
      const firstDay = new Date(tahun, m - 1, 1).getDay();
      tgl = ((0 - firstDay + 7) % 7) + 1;
    } else if (pola === 'tanggal_1') {
      tgl = 1;
    } else if (pola === 'tanggal_5') {
      tgl = 5;
    } else if (pola === 'tanggal_10') {
      tgl = 10;
    } else if (pola === 'tanggal_15') {
      tgl = 15;
    }
    const dStr = String(tgl).padStart(2, '0');
    result[m] = `${tahun}-${mStr}-${dStr}`;
  }
  return result;
}

export interface SundayInfo {
  mingguKe: 1 | 2 | 3 | 4 | 5;
  dayOfMonth: number;
  tanggal: string; // YYYY-MM-DD
  labelShort: string; // e.g. "Minggu I - 4 Jan"
  labelFull: string; // e.g. "Minggu I - 4 Januari 2026"
}

/**
 * Menghasilkan daftar tanggal hari Minggu riil dalam satu bulan kalender.
 * Menghitung hari di mana getDay() === 0 (Hari Minggu) sesuai kalender resmi.
 */
export function getSundaysInMonth(year: number, month: number): SundayInfo[] {
  const sundays: SundayInfo[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const romawi = ['I', 'II', 'III', 'IV', 'V'];
  const monthName = BULAN_LIST[month - 1]?.nama || `Bulan ${month}`;
  const monthShort = BULAN_LIST[month - 1]?.singkatan || `Bln ${month}`;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getDay() === 0) {
      const idx = sundays.length;
      if (idx < 5) {
        const mKe = (idx + 1) as 1 | 2 | 3 | 4 | 5;
        const rom = romawi[idx] || `${idx + 1}`;
        const dayStr = String(day).padStart(2, '0');
        const monthStr = String(month).padStart(2, '0');
        const iso = `${year}-${monthStr}-${dayStr}`;
        sundays.push({
          mingguKe: mKe,
          dayOfMonth: day,
          tanggal: iso,
          labelShort: `Minggu ${rom} - ${day} ${monthShort}`,
          labelFull: `Minggu ${rom} - ${day} ${monthName} ${year}`,
        });
      }
    }
  }

  // Fallback jika karena suatu hal kalender belum terhitung (misal invalid params)
  if (sundays.length === 0) {
    for (let i = 1; i <= 4; i++) {
      const approxDay = (i - 1) * 7 + 1;
      const mStr = String(month).padStart(2, '0');
      const dStr = String(approxDay).padStart(2, '0');
      sundays.push({
        mingguKe: i as 1 | 2 | 3 | 4 | 5,
        dayOfMonth: approxDay,
        tanggal: `${year}-${mStr}-${dStr}`,
        labelShort: `Minggu ${romawi[i - 1]} - ${approxDay} ${monthShort}`,
        labelFull: `Minggu ${romawi[i - 1]} - ${approxDay} ${monthName} ${year}`,
      });
    }
  }

  return sundays;
}

export const HARI_KHUSUS_PRESETS = [
  'Kamis Putih (Trihari Suci)',
  'Jumat Agung (Penghormatan Salib)',
  'Malam Paskah (Vigili Paskah)',
  'Hari Raya Kenaikan Tuhan Yesus',
  'Malam Natal (Vigili Natal - 24 Des)',
  'Hari Raya Natal (Kelahiran Tuhan - 25 Des)',
  'Misa Tutup Tahun (31 Des)',
  'Hari Raya Santa Maria Bunda Allah (1 Jan)',
  'Hari Raya Penampakan Tuhan (Epifani)',
  'Rabu Abu (Awal Masa Prapaskah)',
  'Hari Raya Pentakosta (Turunnya Roh Kudus)',
  'Hari Raya Tritunggal Mahakudus',
  'Hari Raya Tubuh dan Darah Kristus',
  'Pesta Pelindung Paroki Katedral (8 Des - Maria Dikandung Tanpa Noda)',
  'Misa Krisma (Pemberkatan Minyak Suci)',
  'Misa Penerimaan Sakramen Penguatan (Krisma)',
  'Misa Syukur Ulang Tahun Imamat / Tahbisan',
  'Misa Hari Anak Misioner (KKI)',
  'Misa Hari Minggu Panggilan',
  'Lainnya (Misa Perayaan Khusus)',
];

export function getTipeJadwalLabel(type: ScheduleType): string {
  switch (type) {
    case 'sepanjang_tahun':
      return 'Pelayanan Rutin (Sepanjang Tahun)';
    case 'multi_bulan':
      return 'Multi Bulan';
    case 'satu_kali':
      return 'Satu Kali';
    case 'akan_ditentukan':
      return 'Jadwal Akan Ditentukan Kemudian';
    default:
      return type;
  }
}

/**
 * Deteksi apakah program merupakan Rapat Dewan Pastoral Paroki Harian (DPPH).
 * Rapat DPPH memiliki jadwal pelaksanaan yang sudah ditentukan pasti setiap bulannya
 * dan ditampilkan di Dashboard secara khusus (bukan program rutin).
 */
export function isRapatDPPH(p: ProgramKerja): boolean {
  const nama = (p.namaProgram || '').toLowerCase();
  const div = (p.penanggungjawab?.divisi || '').toLowerCase();
  return (
    nama.includes('rapat dpph') ||
    nama.includes('rapat rutin dpph') ||
    nama.includes('rapat dewan pastoral') ||
    nama.includes('rapat rutin dewan pastoral') ||
    nama.includes('rapat rutin dewan paroki') ||
    (div.includes('dpph') && nama.includes('rapat'))
  );
}

/**
 * Deteksi apakah program merupakan "Pelayanan Rutin":
 * Program yang berjalan rutin setiap bulan sepanjang tahun.
 * 
 * ATURAN KHUSUS SESUAI INSTRUKSI:
 * - Rapat DPPH BUKAN masuk program rutin (memiliki kartu/dashboard khusus).
 * - JIKA ADA PROGRAM DPPH LAIN YANG DILAKSANAKAN SETIAP BULAN SELAIN RAPAT DPPH,
 *   MAKA ITU MASUK KE PROGRAM RUTIN.
 */
export function isPelayananRutin(p: ProgramKerja): boolean {
  // 1. Rapat DPPH secara eksplisit BUKAN pelayanan rutin
  if (isRapatDPPH(p)) {
    return false;
  }

  // Program dengan jadwal belum ditentukan tidak dianggap pelayanan rutin
  if (p.tipeJadwal === 'akan_ditentukan') {
    return false;
  }

  // 2. Jika program berjalan sepanjang tahun (12 bulan)
  // Termasuk program DPPH selain Rapat DPPH dan seluruh seksi lainnya
  if (p.tipeJadwal === 'sepanjang_tahun' || (p.bulanPelaksanaan && p.bulanPelaksanaan.length >= 12)) {
    return true;
  }

  const tgl = (p.tanggalSpesifik || '').toLowerCase();
  if (
    tgl.includes('setiap bulan') ||
    tgl.includes('tiap bulan') ||
    tgl.includes('rutin') ||
    tgl.includes('pelayanan rutin') ||
    tgl.includes('berkala')
  ) {
    return true;
  }

  return false;
}

/**
 * Cek apakah suatu program dilaksanakan secara berulang/setiap bulan:
 * Termasuk tipeJadwal sepanjang_tahun, multi_bulan, Rapat DPPH, atau program dengan bulanPelaksanaan > 1
 */
export function isProgramBerulang(p: ProgramKerja): boolean {
  if (p.tipeJadwal === 'sepanjang_tahun') return true;
  if (p.tipeJadwal === 'akan_ditentukan') {
    return Array.isArray(p.bulanPelaksanaan) && p.bulanPelaksanaan.length > 1;
  }
  if (isPelayananRutin(p)) return true;
  if (isRapatDPPH(p)) return true;
  if (Array.isArray(p.bulanPelaksanaan) && p.bulanPelaksanaan.length > 1) return true;
  return false;
}

/**
 * Ambil data evaluasi untuk bulan tertentu:
 * Jika program berulang/rutin, utamakan evaluasiBulanan[bulan].
 * Fallback ke evaluasi single jika cocok atau jika program hanya 1 bulan.
 */
export function getEvaluasiForMonth(p: ProgramKerja, bulan: number): EvaluasiProgram | undefined {
  const monthlyEv = p.evaluasiBulanan?.[bulan];
  if (monthlyEv && monthlyEv.statusKeterlaksanaan && monthlyEv.statusKeterlaksanaan !== 'belum_terlaksana') {
    return monthlyEv;
  }
  // Jika program satu kali atau evaluasi umum yang tanggalnya jatuh di bulan ini
  if (p.evaluasi && p.evaluasi.statusKeterlaksanaan && p.evaluasi.statusKeterlaksanaan !== 'belum_terlaksana') {
    if (!isProgramBerulang(p)) {
      return p.evaluasi;
    }
    // Jika evaluasi lama tersimpan di p.evaluasi dan tanggalnya sesuai bulan
    if (p.evaluasi.tanggalPelaksanaan) {
      const iso = toISODateString(p.evaluasi.tanggalPelaksanaan);
      const monthFromDate = iso ? parseInt(iso.split('-')[1], 10) : NaN;
      if (monthFromDate === bulan) {
        return p.evaluasi;
      }
    }
  }
  if (monthlyEv) return monthlyEv;
  if (!isProgramBerulang(p) && p.evaluasi) return p.evaluasi;
  return undefined;
}

/**
 * Hitung total anggaran terpakai pada bulan-bulan sebelum bulan target:
 * Misalnya target bulan 2 (Februari), jumlahkan pemakaian riil di bulan 1 (Januari).
 * Jika ada pemakaian di bulan Januari misal 711.900 dari pagu 15.600.000,
 * maka sisa budget sebelum Februari adalah 15.600.000 - 711.900 = 14.888.100.
 */
export function getAnggaranTerpakaiSebelumBulan(p: ProgramKerja, bulanTarget: number): number {
  let total = 0;

  if (p.evaluasiBulanan) {
    for (let m = 1; m < bulanTarget; m++) {
      const ev = p.evaluasiBulanan[m];
      if (ev && ev.statusKeterlaksanaan === 'terlaksana' && typeof ev.anggaranTerpakai === 'number') {
        total += ev.anggaranTerpakai;
      }
    }
  }

  // Cek jika p.evaluasi lama/single ada dan tanggalnya sebelum bulan target
  if (p.evaluasi && p.evaluasi.statusKeterlaksanaan === 'terlaksana' && typeof p.evaluasi.anggaranTerpakai === 'number') {
    let evalMonth: number | null = null;
    if (p.evaluasi.tanggalPelaksanaan) {
      const iso = toISODateString(p.evaluasi.tanggalPelaksanaan);
      const parsed = iso ? parseInt(iso.split('-')[1], 10) : NaN;
      if (!isNaN(parsed)) evalMonth = parsed;
    } else if (Array.isArray(p.bulanPelaksanaan) && p.bulanPelaksanaan.length === 1) {
      evalMonth = p.bulanPelaksanaan[0];
    }
    if (evalMonth && evalMonth < bulanTarget) {
      if (!p.evaluasiBulanan?.[evalMonth]) {
        total += p.evaluasi.anggaranTerpakai;
      }
    }
  }

  return total;
}

/**
 * Hitung sisa budget program yang tersedia untuk bulan tertentu (setelah dikurangi pengeluaran bulan-bulan sebelumnya).
 * Bisa bernilai minus jika pengeluaran pada bulan-bulan sebelumnya melebihi estimasi anggaran (defisit).
 */
export function getSisaBudgetUntukBulan(p: ProgramKerja, bulanTarget: number): number {
  const terpakaiSebelumnya = getAnggaranTerpakaiSebelumBulan(p, bulanTarget);
  const totalBudget = p.estimasiAnggaran || 0;
  return totalBudget - terpakaiSebelumnya;
}

export interface DetailPaguBulanan {
  pagu: number;
  isMultiMonthCarryover: boolean;
  totalPagu: number;
  terpakaiSebelumnya: number;
  isMinus: boolean;
  initialPlannedAlokasi: number;
}

/**
 * Mendapatkan informasi detail pagu anggaran untuk bulan tertentu:
 * Untuk program multi-bulan (atau berulang):
 * - Jika bulan-bulan sebelumnya SUDAH TERCATAT / DIEVALUASI:
 *   Yang ditampilkan adalah SISA ANGGARAN TOTAL YANG BELUM DIGUNAKAN.
 *   - Jika bulan sebelumnya tidak terlaksana (realisasi 0), maka pagu bulan ini adalah sisa total pagu (misal 5jt).
 *   - Jika bulan sebelumnya terlaksana dan melebihi pagu (misal 6jt dari 5jt), maka pagu bulan ini menjadi MINUS (-1jt).
 *   - Jika bulan sebelumnya terlaksana dengan 2jt dari 5jt, maka pagu bulan ini adalah 3jt.
 * - Jika bulan sebelumnya belum tercatat atau ini adalah bulan pertama pelaksanaan:
 *   Menggunakan alokasi terencana awal bulan tersebut.
 */
export function getDetailPaguBulanan(p: ProgramKerja, bulan: number): DetailPaguBulanan {
  const totalBudget = p.estimasiAnggaran || 0;
  if (totalBudget <= 0) {
    return {
      pagu: 0,
      isMultiMonthCarryover: false,
      totalPagu: 0,
      terpakaiSebelumnya: 0,
      isMinus: false,
      initialPlannedAlokasi: 0,
    };
  }

  // 1. Hitung alokasi terencana awal untuk bulan ini
  let initialPlannedAlokasi = 0;
  if (p.isKustomAlokasiDana && p.alokasiDanaBulanan && typeof p.alokasiDanaBulanan[bulan] === 'number') {
    initialPlannedAlokasi = p.alokasiDanaBulanan[bulan];
  } else if (p.tipeJadwal === 'sepanjang_tahun') {
    initialPlannedAlokasi = Math.round(totalBudget / 12);
  } else if (p.tipeJadwal === 'akan_ditentukan' && (!Array.isArray(p.bulanPelaksanaan) || p.bulanPelaksanaan.length === 0)) {
    initialPlannedAlokasi = 0;
  } else {
    const blnList = Array.isArray(p.bulanPelaksanaan) && p.bulanPelaksanaan.length > 0
      ? p.bulanPelaksanaan
      : [1];
    if (blnList.includes(bulan)) {
      initialPlannedAlokasi = Math.round(totalBudget / blnList.length);
    } else if (isPelayananRutin(p) || isRapatDPPH(p)) {
      initialPlannedAlokasi = Math.round(totalBudget / 12);
    }
  }

  // 2. Daftar bulan pelaksanaan terjadwal
  const scheduledMonths = (
    Array.isArray(p.bulanPelaksanaan) && p.bulanPelaksanaan.length > 0
      ? [...p.bulanPelaksanaan]
      : p.tipeJadwal === 'sepanjang_tahun' || isPelayananRutin(p) || isRapatDPPH(p)
        ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        : p.tipeJadwal === 'akan_ditentukan'
        ? []
        : [1]
  ).sort((a, b) => a - b);

  const isMultiMonth = scheduledMonths.length > 1 || p.tipeJadwal === 'multi_bulan' || isProgramBerulang(p);

  if (isMultiMonth) {
    const priorMonths = scheduledMonths.filter((m) => m < bulan);
    if (priorMonths.length > 0) {
      // Cek apakah ada bulan sebelumnya yang sudah tercatat / dievaluasi
      let hasPriorRecord = false;
      for (const m of priorMonths) {
        const ev = getEvaluasiForMonth(p, m);
        if (ev && ev.statusKeterlaksanaan && ev.statusKeterlaksanaan !== 'belum_terlaksana') {
          hasPriorRecord = true;
          break;
        }
      }

      const terpakaiSebelumnya = getAnggaranTerpakaiSebelumBulan(p, bulan);
      if (terpakaiSebelumnya > 0) {
        hasPriorRecord = true;
      }

      // Cek jika p.evaluasi tunggal tercatat untuk bulan sebelum target
      if (!hasPriorRecord && p.evaluasi?.statusKeterlaksanaan && p.evaluasi.statusKeterlaksanaan !== 'belum_terlaksana') {
        const m = p.evaluasi.tanggalPelaksanaan ? parseInt(p.evaluasi.tanggalPelaksanaan.split('-')[1], 10) : null;
        if (m && m < bulan) {
          hasPriorRecord = true;
        }
      }

      // Jika ada bulan sebelumnya yang sudah tercatat, pagu bulan ini adalah SISA TOTAL PAGU (bisa minus)
      if (hasPriorRecord) {
        const sisaTotalPagu = totalBudget - terpakaiSebelumnya;
        return {
          pagu: sisaTotalPagu,
          isMultiMonthCarryover: true,
          totalPagu: totalBudget,
          terpakaiSebelumnya,
          isMinus: sisaTotalPagu < 0,
          initialPlannedAlokasi,
        };
      }
    }
  }

  return {
    pagu: initialPlannedAlokasi,
    isMultiMonthCarryover: false,
    totalPagu: totalBudget,
    terpakaiSebelumnya: getAnggaranTerpakaiSebelumBulan(p, bulan),
    isMinus: initialPlannedAlokasi < 0,
    initialPlannedAlokasi,
  };
}

/**
 * Alokasi kebutuhan biaya / pagu program untuk bulan tertentu:
 * Jika program multi-bulan dan ada bulan sebelumnya yang sudah terlaksana/tercatat,
 * mengembalikan sisa total anggaran yang belum digunakan (atau minus jika overspent).
 */
export function getAlokasiBudgetBulanan(p: ProgramKerja, bulan: number): number {
  return getDetailPaguBulanan(p, bulan).pagu;
}

export function getKategoriProgramInfo(kategori?: KategoriProgram) {
  switch (kategori) {
    case 'program_rutin':
      return {
        key: 'program_rutin',
        label: 'Program Rutin',
        deskripsi: 'Rutin bulanan / multi-bulan dengan alokasi pencairan dana & catatan terencana',
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        badgeDark: 'bg-emerald-600 text-white',
        dot: 'bg-emerald-500',
        iconEmoji: '🔄',
      };
    case 'program_tentatif':
      return {
        key: 'program_tentatif',
        label: 'Opsional / Tentatif',
        deskripsi: 'Program cadangan/situasional, akan digunakan hanya jika diperlukan',
        badge: 'bg-purple-50 text-purple-800 border-purple-300',
        badgeDark: 'bg-purple-600 text-white',
        dot: 'bg-purple-500',
        iconEmoji: '⚡',
      };
    case 'program_biasa':
    default:
      return {
        key: 'program_biasa',
        label: 'Program Biasa',
        deskripsi: 'Program kerja standar paroki terjadwal',
        badge: 'bg-slate-100 text-slate-800 border-slate-300',
        badgeDark: 'bg-slate-700 text-white',
        dot: 'bg-slate-400',
        iconEmoji: '📋',
      };
  }
}

/**
 * Cek apakah suatu program aktif pada bulan tertentu
 */
export function isProgramAktifDiBulan(p: ProgramKerja, bulan: number): boolean {
  if (p.tipeJadwal === 'sepanjang_tahun') return true;
  if (p.tipeJadwal === 'akan_ditentukan') {
    return Array.isArray(p.bulanPelaksanaan) && p.bulanPelaksanaan.includes(bulan);
  }
  if (isPelayananRutin(p) || isRapatDPPH(p)) return true;
  const blnList = Array.isArray(p.bulanPelaksanaan) && p.bulanPelaksanaan.length > 0
    ? p.bulanPelaksanaan
    : [];
  return blnList.includes(bulan);
}

/**
 * Total akumulasi seluruh realisasi anggaran yang terpakai sepanjang tahun untuk suatu program.
 */
export function getTotalAnggaranTerpakai(p: ProgramKerja): number {
  let total = 0;
  if (p.evaluasiBulanan) {
    for (let m = 1; m <= 12; m++) {
      const ev = p.evaluasiBulanan[m];
      if (ev && ev.statusKeterlaksanaan === 'terlaksana' && typeof ev.anggaranTerpakai === 'number') {
        total += ev.anggaranTerpakai;
      }
    }
  }
  // Jika belum ada di evaluasiBulanan tapi ada di p.evaluasi
  if (total === 0 && p.evaluasi?.statusKeterlaksanaan === 'terlaksana' && p.evaluasi.anggaranTerpakai) {
    total = p.evaluasi.anggaranTerpakai;
  }
  return total;
}

export function getStatusInfo(status: ProgramStatus) {
  switch (status) {
    case 'berjalan':
      return {
        label: 'Sedang Berjalan',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'selesai':
      return {
        label: 'Selesai',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'ditunda':
      return {
        label: 'Ditunda',
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        dot: 'bg-rose-500',
      };
    case 'direncanakan':
    default:
      return {
        label: 'Direncanakan',
        color: 'text-sky-700 bg-sky-50 border-sky-200',
        dot: 'bg-sky-500',
      };
  }
}

export function getTanggalPelaksanaanLabel(program: { modeTanggal?: string; tanggalSpesifik?: string }): string {
  if (program.modeTanggal === 'akan_ditentukan') {
    return 'Tanggal akan ditentukan kemudian (Tentatif)';
  }
  if (program.tanggalSpesifik) {
    return program.tanggalSpesifik;
  }
  return 'Belum ditentukan';
}

export function formatBulanPelaksanaan(bulanList: number[], tipeJadwal?: ScheduleType): string {
  if (!bulanList || bulanList.length === 0) {
    return tipeJadwal === 'akan_ditentukan' ? 'Akan Ditentukan Kemudian' : 'Belum ditentukan';
  }
  if (bulanList.length === 12) return 'Januari – Desember (12 Bulan)';

  const sorted = [...bulanList].sort((a, b) => a - b);
  return sorted.map((b) => BULAN_LIST[b - 1]?.singkatan || b).join(', ');
}

function sanitizeFilenamePart(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Menghasilkan label role login yang aman untuk penamaan file unduhan.
 * Contoh: Seksi Komsos -> "Seksi_Komsos", Pastor Paroki -> "Pastor_Paroki", dll.
 */
export function getAuthRoleFileSlug(
  authSession?: AuthSession | null,
  selectedSeksi?: string | 'all'
): string {
  let activeSession = authSession;
  if (!activeSession && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem('proker_auth_session_v2');
      if (raw) activeSession = JSON.parse(raw) as AuthSession;
    } catch {
      // ignore storage read error
    }
  }

  let baseRole = '';
  if (activeSession) {
    if (activeSession.role === 'pastor_paroki') {
      baseRole = 'Pastor_Paroki';
    } else if (activeSession.role === 'bendahara') {
      baseRole = 'Bendahara_Paroki';
    } else if (activeSession.role === 'semua_seksi') {
      baseRole = 'Semua_Seksi';
    } else if (activeSession.unitNama) {
      baseRole = sanitizeFilenamePart(activeSession.unitNama);
    }
  }

  if (!baseRole) {
    baseRole =
      selectedSeksi && selectedSeksi !== 'all'
        ? sanitizeFilenamePart(selectedSeksi)
        : 'Paroki';
  }

  // Jika login sebagai Pastor / Bendahara / Semua Seksi dan memilih filter seksi tertentu, sertakan pula seksinya
  if (
    activeSession &&
    activeSession.role !== 'seksi' &&
    selectedSeksi &&
    selectedSeksi !== 'all'
  ) {
    const seksiPart = sanitizeFilenamePart(selectedSeksi);
    if (seksiPart && !baseRole.toLowerCase().includes(seksiPart.toLowerCase())) {
      return `${baseRole}_${seksiPart}`;
    }
  }

  return baseRole || 'Paroki';
}

export function exportToCSV(
  data: ProgramKerja[],
  authSession?: AuthSession | null,
  selectedSeksi?: string | 'all'
) {
  const headers = [
    'No',
    'Tahun',
    'Nama Program',
    'Tujuan Kegiatan',
    'Target Sasaran',
    'Estimasi Anggaran (Rp)',
    'Tipe Jadwal',
    'Bulan Pelaksanaan',
    'Tanggal/Waktu Spesifik',
    'Penanggung Jawab',
    'Divisi',
    'Kontak',
    'Status',
  ];

  const rows = data.map((item, index) => [
    index + 1,
    item.tahun,
    `"${(item.namaProgram || '').replace(/"/g, '""')}"`,
    `"${(item.tujuanKegiatan || '').replace(/"/g, '""')}"`,
    `"${(item.targetSasaran || '').replace(/"/g, '""')}"`,
    item.estimasiAnggaran,
    getTipeJadwalLabel(item.tipeJadwal),
    `"${formatBulanPelaksanaan(item.bulanPelaksanaan, item.tipeJadwal)}"`,
    `"${(item.tanggalSpesifik ? formatIndonesianDate(item.tanggalSpesifik) : '').replace(/"/g, '""')}"`,
    `"${(item.penanggungjawab?.nama || '').replace(/"/g, '""')}"`,
    `"${(item.penanggungjawab?.divisi || '').replace(/"/g, '""')}"`,
    `"${(item.penanggungjawab?.kontak || '').replace(/"/g, '""')}"`,
    getStatusInfo(item.status).label,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

  const roleSlug = getAuthRoleFileSlug(authSession, selectedSeksi);
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Proker_${roleSlug}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Mengambil urutan resmi hierarki divisi/seksi paroki (1 = DPPH, 2 = Keamanan, dst.)
 */
export function getDivisionOrder(divisiName?: string): number {
  if (!divisiName) return 999;
  const norm = normalizeDivisionName(divisiName).toLowerCase();
  const idx = MASTER_DIVISIONS.findIndex((d) => d.nama.toLowerCase() === norm);
  if (idx !== -1) return MASTER_DIVISIONS[idx].urutan;
  return 999;
}

/**
 * Mengurutkan program kerja secara teratur dan sistematis (Bukan berdasarkan urutan waktu input di database):
 * 1. Prioritas nomor urut eksplisit jika ada (p.nomorUrut)
 * 2. Urutan resmi Divisi / Seksi Paroki (DPPH -> Seksi Liturgi -> PSE -> ...)
 * 3. Bulan pelaksanaan paling awal (Januari -> Desember)
 * 4. Urutan alfabetis nama program kerja
 */
export function sortProgramsSystematically(programs: ProgramKerja[]): ProgramKerja[] {
  return [...programs].sort((a, b) => {
    if (typeof a.nomorUrut === 'number' && typeof b.nomorUrut === 'number') {
      return a.nomorUrut - b.nomorUrut;
    }
    if (typeof a.nomorUrut === 'number') return -1;
    if (typeof b.nomorUrut === 'number') return 1;

    const divA = getDivisionOrder(a.penanggungjawab?.divisi);
    const divB = getDivisionOrder(b.penanggungjawab?.divisi);
    if (divA !== divB) {
      return divA - divB;
    }

    const monthA = Array.isArray(a.bulanPelaksanaan) && a.bulanPelaksanaan.length > 0
      ? Math.min(...a.bulanPelaksanaan)
      : a.tipeJadwal === 'sepanjang_tahun' ? 1 : 13;
    const monthB = Array.isArray(b.bulanPelaksanaan) && b.bulanPelaksanaan.length > 0
      ? Math.min(...b.bulanPelaksanaan)
      : b.tipeJadwal === 'sepanjang_tahun' ? 1 : 13;
    if (monthA !== monthB) {
      return monthA - monthB;
    }

    return (a.namaProgram || '').localeCompare(b.namaProgram || '', 'id');
  });
}

export interface ProgramExecutionSummary {
  overallStatus: 'terlaksana_penuh' | 'terlaksana_sebagian' | 'tidak_terlaksana' | 'perubahan_waktu' | 'belum_terlaksana';
  statusLabel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeClass: string;

  scheduledMonths: number[];
  terlaksanaMonths: number[];
  tidakTerlaksanaMonths: number[];
  perubahanWaktuMonths: number[];
  belumTerlaksanaMonths: number[];

  catatanStatus: string;
  catatanBulanBelumTerlaksana: string; // Misal: "Desember" atau "Agu, Des"
  catatanBulanSudahTerlaksana: string; // Misal: "April"
  catatanBulanTidakTerlaksana: string; // Misal: "Desember (Alasan: Terkendala cuaca)"
  rincianTidakTerlaksana: Array<{ bulan: number; namaBulan: string; alasan: string }>;

  selectedMonthStatus?: {
    isBulanIniTerlaksana: boolean;
    isBulanIniTidakTerlaksana: boolean;
    isBulanIniPerubahanWaktu: boolean;
    isBulanIniBelumTerlaksana: boolean;
    bulanIniStatusLabel: string;
  };

  totalRealisasiTerpakai: number;
  totalPagu: number;
}

/**
 * Menganalisis status keterlaksanaan program kerja secara komprehensif:
 * - Jika program multi-bulan dan ada sebagian bulan yang tidak terlaksana:
 *   status BUKAN 'tidak_terlaksana' melainkan 'terlaksana_sebagian' ("✓ Terlaksana Sebagian")
 *   serta memunculkan bulan yang tidak terlaksana beserta alasannya.
 * - Jika seluruh jadwal telah terlaksana: 'terlaksana_penuh' ("✓ Terlaksana & Selesai")
 * - Jika seluruh jadwal ditiadakan: 'tidak_terlaksana' ("✕ Tidak Terlaksana")
 */
export function getLatestEvaluasi(p: ProgramKerja, selectedMonth?: number | 'all'): EvaluasiProgram | undefined {
  if (typeof selectedMonth === 'number') {
    return getEvaluasiForMonth(p, selectedMonth);
  }
  if (p.evaluasiBulanan) {
    const entries = Object.entries(p.evaluasiBulanan)
      .map(([mStr, ev]) => ({ bulan: parseInt(mStr, 10), ev }))
      .filter((x) => !isNaN(x.bulan) && x.ev && x.ev.statusKeterlaksanaan && x.ev.statusKeterlaksanaan !== 'belum_terlaksana');

    const terlaksanaEntries = entries.filter((x) => x.ev.statusKeterlaksanaan === 'terlaksana' || x.ev.statusKeterlaksanaan === 'terlaksana_sebagian').sort((a, b) => b.bulan - a.bulan);
    if (terlaksanaEntries.length > 0) return terlaksanaEntries[0].ev;

    const perubahanEntries = entries.filter((x) => x.ev.statusKeterlaksanaan === 'perubahan_waktu').sort((a, b) => b.bulan - a.bulan);
    if (perubahanEntries.length > 0) return perubahanEntries[0].ev;

    const tidakEntries = entries.filter((x) => x.ev.statusKeterlaksanaan === 'tidak_terlaksana').sort((a, b) => b.bulan - a.bulan);
    if (tidakEntries.length > 0) return tidakEntries[0].ev;
  }
  if (p.evaluasi && p.evaluasi.statusKeterlaksanaan && p.evaluasi.statusKeterlaksanaan !== 'belum_terlaksana') {
    return p.evaluasi;
  }
  return p.evaluasi;
}

/**
 * Mengecek apakah program sudah memiliki input evaluasi (terlaksana, terlaksana sebagian,
 * geser waktu, atau tidak terlaksana — baik dari p.evaluasi maupun p.evaluasiBulanan).
 */
export function hasProgramEvaluasi(p: ProgramKerja, selectedMonth?: number | 'all'): boolean {
  const summary = getProgramExecutionSummary(p, selectedMonth);
  if (typeof selectedMonth === 'number') {
    const ev = getEvaluasiForMonth(p, selectedMonth);
    if (ev?.statusKeterlaksanaan && ev.statusKeterlaksanaan !== 'belum_terlaksana') {
      return true;
    }
    return (
      summary.overallStatus === 'terlaksana_sebagian' ||
      summary.rincianTidakTerlaksana.length > 0 ||
      summary.perubahanWaktuMonths.length > 0
    );
  }
  if (summary.overallStatus !== 'belum_terlaksana') return true;
  if (
    summary.terlaksanaMonths.length > 0 ||
    summary.tidakTerlaksanaMonths.length > 0 ||
    summary.perubahanWaktuMonths.length > 0
  ) {
    return true;
  }
  if (p.evaluasi?.statusKeterlaksanaan && p.evaluasi.statusKeterlaksanaan !== 'belum_terlaksana') {
    return true;
  }
  return false;
}

/**
 * Menganalisis status keterlaksanaan program kerja secara komprehensif:
 * - Jika program multi-bulan memiliki bulan yang terlaksana sekaligus bulan yang belum / tidak terlaksana:
 *   status menjadi 'terlaksana_sebagian' ("✓ Terlaksana Sebagian")
 *   serta memunculkan bulan yang tidak terlaksana beserta alasannya (jika diisi).
 * - Jika 0 bulan yang terlaksana sementara sebagian bulan tidak terlaksana dan sisanya masih belum berjalan:
 *   status tidak diklaim sebagai "Terlaksana Sebagian", melainkan tetap 'belum_terlaksana' dengan catatan pembatalan.
 * - Jika seluruh jadwal telah terlaksana: 'terlaksana_penuh' ("✓ Terlaksana & Selesai")
 * - Jika seluruh jadwal ditiadakan: 'tidak_terlaksana' ("✕ Tidak Terlaksana")
 */
export function getProgramExecutionSummary(
  p: ProgramKerja,
  selectedMonth?: number | 'all'
): ProgramExecutionSummary {
  const scheduledMonths = (
    Array.isArray(p.bulanPelaksanaan) && p.bulanPelaksanaan.length > 0
      ? [...p.bulanPelaksanaan]
      : p.tipeJadwal === 'sepanjang_tahun' || isPelayananRutin(p) || isRapatDPPH(p)
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      : p.tipeJadwal === 'akan_ditentukan'
      ? []
      : [1]
  ).sort((a, b) => a - b);

  const isMultiMonth =
    scheduledMonths.length > 1 ||
    p.tipeJadwal === 'multi_bulan' ||
    p.tipeJadwal === 'sepanjang_tahun' ||
    isProgramBerulang(p);

  const terlaksanaMonths: number[] = [];
  const tidakTerlaksanaMonths: number[] = [];
  const perubahanWaktuMonths: number[] = [];
  const belumTerlaksanaMonths: number[] = [];
  let totalRealisasiTerpakai = 0;

  scheduledMonths.forEach((m) => {
    const ev = getEvaluasiForMonth(p, m);
    if (ev && (ev.statusKeterlaksanaan === 'terlaksana' || ev.statusKeterlaksanaan === 'terlaksana_sebagian')) {
      terlaksanaMonths.push(m);
      if (typeof ev.anggaranTerpakai === 'number') {
        totalRealisasiTerpakai += ev.anggaranTerpakai;
      }
    } else if (ev?.statusKeterlaksanaan === 'tidak_terlaksana') {
      tidakTerlaksanaMonths.push(m);
    } else if (ev?.statusKeterlaksanaan === 'perubahan_waktu') {
      perubahanWaktuMonths.push(m);
    } else {
      belumTerlaksanaMonths.push(m);
    }
  });

  // Sertakan evaluasi bulanan yang tersimpan pada bulan di luar scheduledMonths agar tidak hilang
  if (p.evaluasiBulanan) {
    Object.entries(p.evaluasiBulanan)
      .map(([mStr, ev]) => ({ m: parseInt(mStr, 10), ev }))
      .filter((x) => !isNaN(x.m) && x.m >= 1 && x.m <= 12 && !scheduledMonths.includes(x.m))
      .sort((a, b) => a.m - b.m)
      .forEach(({ m, ev }) => {
        if (!ev || !ev.statusKeterlaksanaan || ev.statusKeterlaksanaan === 'belum_terlaksana') return;
        if (ev.statusKeterlaksanaan === 'terlaksana' || ev.statusKeterlaksanaan === 'terlaksana_sebagian') {
          if (!terlaksanaMonths.includes(m)) terlaksanaMonths.push(m);
          if (typeof ev.anggaranTerpakai === 'number') {
            totalRealisasiTerpakai += ev.anggaranTerpakai;
          }
        } else if (ev.statusKeterlaksanaan === 'tidak_terlaksana') {
          if (!tidakTerlaksanaMonths.includes(m)) tidakTerlaksanaMonths.push(m);
        } else if (ev.statusKeterlaksanaan === 'perubahan_waktu') {
          if (!perubahanWaktuMonths.includes(m)) perubahanWaktuMonths.push(m);
        }
      });
  }

  // Fallback jika evaluasi tunggal lama hanya tersimpan di p.evaluasi (tanpa evaluasiBulanan)
  const hasAnyMonthlyEval =
    terlaksanaMonths.length > 0 ||
    tidakTerlaksanaMonths.length > 0 ||
    perubahanWaktuMonths.length > 0;

  let masterFallbackSebagian = false;
  if (!hasAnyMonthlyEval && p.evaluasi?.statusKeterlaksanaan && p.evaluasi.statusKeterlaksanaan !== 'belum_terlaksana') {
    let evalMonth = scheduledMonths[0] || 1;
    if (p.evaluasi.tanggalPelaksanaan) {
      const iso = toISODateString(p.evaluasi.tanggalPelaksanaan);
      const parsed = iso ? parseInt(iso.split('-')[1], 10) : NaN;
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) evalMonth = parsed;
    }

    const st = p.evaluasi.statusKeterlaksanaan;
    if (st === 'terlaksana' || st === 'terlaksana_sebagian') {
      if (st === 'terlaksana_sebagian') {
        masterFallbackSebagian = true;
      }
      terlaksanaMonths.push(evalMonth);
      const idx = belumTerlaksanaMonths.indexOf(evalMonth);
      if (idx !== -1) belumTerlaksanaMonths.splice(idx, 1);
      if (typeof p.evaluasi.anggaranTerpakai === 'number') {
        totalRealisasiTerpakai += p.evaluasi.anggaranTerpakai;
      }
    } else if (st === 'tidak_terlaksana') {
      tidakTerlaksanaMonths.push(evalMonth);
      const idx = belumTerlaksanaMonths.indexOf(evalMonth);
      if (idx !== -1) belumTerlaksanaMonths.splice(idx, 1);
    } else if (st === 'perubahan_waktu') {
      perubahanWaktuMonths.push(evalMonth);
      const idx = belumTerlaksanaMonths.indexOf(evalMonth);
      if (idx !== -1) belumTerlaksanaMonths.splice(idx, 1);
    }
  }

  // Rincian bulan yang tidak terlaksana beserta alasannya (APA ADANYA, jangan salin alasan dari bulan lain/master)
  const rincianTidakTerlaksana: Array<{ bulan: number; namaBulan: string; alasan: string }> = [];
  tidakTerlaksanaMonths.forEach((m) => {
    const monthlyEv = p.evaluasiBulanan?.[m];
    const ev = monthlyEv || getEvaluasiForMonth(p, m);
    const alasanRaw = monthlyEv || isMultiMonth
      ? ev?.alasanTidakTerlaksana?.trim()
      : (ev?.alasanTidakTerlaksana?.trim() || p.evaluasi?.alasanTidakTerlaksana?.trim());
    const alasan = alasanRaw || '';
    const namaBulan = BULAN_LIST[m - 1]?.nama || `Bulan ${m}`;
    rincianTidakTerlaksana.push({ bulan: m, namaBulan, alasan });
  });
  if (rincianTidakTerlaksana.length === 0 && masterFallbackSebagian && Array.isArray(p.evaluasi?.rincianTidakTerlaksana)) {
    p.evaluasi.rincianTidakTerlaksana.forEach((item) => {
      rincianTidakTerlaksana.push({
        bulan: item.bulan,
        namaBulan: item.namaBulan || BULAN_LIST[item.bulan - 1]?.nama || `Bulan ${item.bulan}`,
        alasan: item.alasan || '',
      });
    });
  }

  // Tentukan overall status
  let overallStatus: ProgramExecutionSummary['overallStatus'] = 'belum_terlaksana';
  let statusLabel = '⚠️ Belum Terlaksana';
  let badgeBg = 'bg-amber-50';
  let badgeBorder = 'border-amber-400';
  let badgeText = 'text-amber-950';
  let badgeClass = 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950 border-2 border-amber-400';

  if (isMultiMonth) {
    const allScheduledTerlaksana = scheduledMonths.every((m) => terlaksanaMonths.includes(m));
    const allScheduledTidakTerlaksana = scheduledMonths.every((m) => tidakTerlaksanaMonths.includes(m));
    if (terlaksanaMonths.length > 0) {
      if (allScheduledTerlaksana && !masterFallbackSebagian) {
        overallStatus = 'terlaksana_penuh';
        statusLabel = '✓ Terlaksana & Selesai';
        badgeBg = 'bg-emerald-50';
        badgeBorder = 'border-emerald-300';
        badgeText = 'text-emerald-950';
        badgeClass = 'bg-emerald-50 text-emerald-950 border border-emerald-300';
      } else {
        overallStatus = 'terlaksana_sebagian';
        statusLabel = '✓ Terlaksana Sebagian';
        badgeBg = 'bg-teal-50';
        badgeBorder = 'border-teal-400';
        badgeText = 'text-teal-950';
        badgeClass = 'bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-950 border-2 border-teal-400';
      }
    } else if (tidakTerlaksanaMonths.length > 0) {
      if (allScheduledTidakTerlaksana) {
        overallStatus = 'tidak_terlaksana';
        statusLabel = '✕ Tidak Terlaksana';
        badgeBg = 'bg-rose-50';
        badgeBorder = 'border-rose-300';
        badgeText = 'text-rose-950';
        badgeClass = 'bg-rose-50 text-rose-950 border border-rose-300';
      } else {
        // Belum ada satu pun bulan yang terlaksana; sebagian batal dan sisanya masih terjadwal/geser
        overallStatus = 'belum_terlaksana';
        statusLabel = '⚠️ Belum Terlaksana (Sebagian Batal)';
        badgeBg = 'bg-amber-50';
        badgeBorder = 'border-amber-400';
        badgeText = 'text-amber-950';
        badgeClass = 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950 border-2 border-amber-400';
      }
    } else if (perubahanWaktuMonths.length > 0) {
      overallStatus = 'perubahan_waktu';
      statusLabel = '⏳ Perubahan Waktu';
      badgeBg = 'bg-blue-50';
      badgeBorder = 'border-blue-300';
      badgeText = 'text-blue-950';
      badgeClass = 'bg-blue-50 text-blue-950 border border-blue-300';
    } else {
      overallStatus = 'belum_terlaksana';
      statusLabel = '⚠️ Belum Terlaksana';
    }
  } else {
    // Program satu kali
    if (terlaksanaMonths.length > 0) {
      overallStatus = 'terlaksana_penuh';
      statusLabel = '✓ Terlaksana & Selesai';
      badgeBg = 'bg-emerald-50';
      badgeBorder = 'border-emerald-300';
      badgeText = 'text-emerald-950';
      badgeClass = 'bg-emerald-50 text-emerald-950 border border-emerald-300';
    } else if (tidakTerlaksanaMonths.length > 0) {
      overallStatus = 'tidak_terlaksana';
      statusLabel = '✕ Tidak Terlaksana';
      badgeBg = 'bg-rose-50';
      badgeBorder = 'border-rose-300';
      badgeText = 'text-rose-950';
      badgeClass = 'bg-rose-50 text-rose-950 border border-rose-300';
    } else if (perubahanWaktuMonths.length > 0) {
      overallStatus = 'perubahan_waktu';
      statusLabel = '⏳ Perubahan Waktu';
      badgeBg = 'bg-blue-50';
      badgeBorder = 'border-blue-300';
      badgeText = 'text-blue-950';
      badgeClass = 'bg-blue-50 text-blue-950 border border-blue-300';
    } else {
      overallStatus = 'belum_terlaksana';
      statusLabel = '⚠️ Belum Terlaksana';
    }
  }

  const catatanBulanBelumTerlaksana = belumTerlaksanaMonths
    .map((m) => BULAN_LIST[m - 1]?.nama || `Bulan ${m}`)
    .join(', ');

  const catatanBulanSudahTerlaksana = terlaksanaMonths
    .map((m) => BULAN_LIST[m - 1]?.nama || `Bulan ${m}`)
    .join(', ');

  const catatanBulanTidakTerlaksana = rincianTidakTerlaksana
    .map((r) => (r.alasan ? `${r.namaBulan} (Alasan: ${r.alasan})` : `${r.namaBulan} (Tidak ada alasan dicantumkan)`))
    .join('; ');

  let catatanStatus = '';
  if (overallStatus === 'terlaksana_sebagian') {
    if (rincianTidakTerlaksana.length > 0) {
      const tidakStr = rincianTidakTerlaksana
        .map((r) =>
          r.alasan
            ? `Bulan ${r.namaBulan} tidak terlaksana karena: ${r.alasan}`
            : `Bulan ${r.namaBulan} tidak terlaksana (Tidak ada alasan dicantumkan)`
        )
        .join('. ');
      const sudahStr = terlaksanaMonths.length > 0 ? `Sudah terlaksana di bulan ${catatanBulanSudahTerlaksana}. ` : '';
      const sisaStr = belumTerlaksanaMonths.length > 0 ? ` Jadwal lain (${catatanBulanBelumTerlaksana}) masih dalam rencana.` : '';
      catatanStatus = `Terlaksana sebagian. ${sudahStr}${tidakStr}.${sisaStr}`;
    } else {
      catatanStatus = `Sudah terlaksana di bulan ${catatanBulanSudahTerlaksana}. Belum terlaksana di bulan ${catatanBulanBelumTerlaksana}.`;
    }
  } else if (overallStatus === 'terlaksana_penuh') {
    catatanStatus = `Seluruh jadwal (${catatanBulanSudahTerlaksana}) telah selesai terlaksana dan dievaluasi.`;
  } else if (overallStatus === 'tidak_terlaksana') {
    if (rincianTidakTerlaksana.length > 0) {
      catatanStatus = `Program tidak terlaksana. ${rincianTidakTerlaksana
        .map((r) => `Bulan ${r.namaBulan}: ${r.alasan || 'Tidak ada alasan dicantumkan'}`)
        .join('; ')}.`;
    } else {
      catatanStatus = 'Program dinyatakan tidak terlaksana.';
    }
  } else if (overallStatus === 'perubahan_waktu') {
    catatanStatus = 'Program mengalami pergeseran jadwal / perubahan waktu.';
  } else if (rincianTidakTerlaksana.length > 0) {
    const tidakStr = rincianTidakTerlaksana
      .map((r) =>
        r.alasan
          ? `Bulan ${r.namaBulan} tidak terlaksana (Alasan: ${r.alasan})`
          : `Bulan ${r.namaBulan} tidak terlaksana (Tidak ada alasan dicantumkan)`
      )
      .join('; ');
    catatanStatus = `Belum ada jadwal yang terlaksana. ${tidakStr}. Jadwal lain (${catatanBulanBelumTerlaksana || '-'}) belum terlaksana.`;
  } else if (scheduledMonths.length === 0) {
    catatanStatus = 'Bulan pelaksanaan belum ditentukan (jadwal akan ditentukan kemudian). Belum ada laporan evaluasi.';
  } else {
    catatanStatus = `Belum ada laporan evaluasi untuk jadwal ${scheduledMonths.map((m) => BULAN_LIST[m - 1]?.nama || m).join(', ')}.`;
  }

  // Jika memeriksa bulan spesifik
  let selectedMonthStatus: ProgramExecutionSummary['selectedMonthStatus'];
  if (typeof selectedMonth === 'number') {
    const evBln = getEvaluasiForMonth(p, selectedMonth);
    const isBulanIniTerlaksana = evBln?.statusKeterlaksanaan === 'terlaksana';
    const isBulanIniTidakTerlaksana = evBln?.statusKeterlaksanaan === 'tidak_terlaksana';
    const isBulanIniPerubahanWaktu = evBln?.statusKeterlaksanaan === 'perubahan_waktu';
    const isBulanIniBelumTerlaksana = !evBln || !evBln.statusKeterlaksanaan || evBln.statusKeterlaksanaan === 'belum_terlaksana';

    let bulanIniStatusLabel = statusLabel;
    if (isBulanIniTerlaksana) {
      bulanIniStatusLabel = belumTerlaksanaMonths.length > 0 || tidakTerlaksanaMonths.length > 0 ? '✓ Terlaksana Bulan Ini (Sebagian)' : '✓ Terlaksana & Selesai';
    } else if (isBulanIniTidakTerlaksana) {
      bulanIniStatusLabel = overallStatus === 'terlaksana_sebagian'
        ? '✕ Tidak Terlaksana Bulan Ini (Program Terlaksana Sebagian)'
        : '✕ Tidak Terlaksana Bulan Ini';
    } else if (isBulanIniPerubahanWaktu) {
      bulanIniStatusLabel = '⏳ Geser Waktu Bulan Ini';
    } else if (terlaksanaMonths.length > 0) {
      bulanIniStatusLabel = '✓ Terlaksana Sebagian (Bln Ini Belum)';
    }

    selectedMonthStatus = {
      isBulanIniTerlaksana,
      isBulanIniTidakTerlaksana,
      isBulanIniPerubahanWaktu,
      isBulanIniBelumTerlaksana,
      bulanIniStatusLabel,
    };
  }

  return {
    overallStatus,
    statusLabel,
    badgeBg,
    badgeBorder,
    badgeText,
    badgeClass,
    scheduledMonths,
    terlaksanaMonths,
    tidakTerlaksanaMonths,
    perubahanWaktuMonths,
    belumTerlaksanaMonths,
    catatanStatus,
    catatanBulanBelumTerlaksana,
    catatanBulanSudahTerlaksana,
    catatanBulanTidakTerlaksana,
    rincianTidakTerlaksana,
    selectedMonthStatus,
    totalRealisasiTerpakai,
    totalPagu: p.estimasiAnggaran || 0,
  };
}

/**
 * Mengecek apakah program masuk ke dalam program final seksi:
 * Program tahun 2027 yang ditolak / tidak disetujui oleh Dewan Pastoral Paroki
 * TIDAK MASUK ke dalam program final seksi bersangkutan.
 */
export function isProgramDisetujuiFinal(p: ProgramKerja): boolean {
  if (p.tahun === 2027 && p.catatanPastorParoki?.statusPersetujuan === 'ditolak') {
    return false;
  }
  return true;
}
