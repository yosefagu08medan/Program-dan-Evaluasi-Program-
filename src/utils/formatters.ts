import { ProgramKerja, ScheduleType, ProgramStatus } from '../types/proker';
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
  if (dLower.includes('plbks') || dLower.includes('lingkungan')) return 'Seksi PLBKS';
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
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(amount % 1_000_000_000 === 0 ? 0 : 1)} M`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)} Jt`;
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)} Rb`;
  }
  return `Rp ${amount}`;
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

export function getTipeJadwalLabel(type: ScheduleType): string {
  switch (type) {
    case 'sepanjang_tahun':
      return 'Pelayanan Rutin (Sepanjang Tahun)';
    case 'multi_bulan':
      return 'Multi Bulan';
    case 'satu_kali':
      return 'Satu Kali';
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

export function formatBulanPelaksanaan(bulanList: number[]): string {
  if (!bulanList || bulanList.length === 0) return 'Belum ditentukan';
  if (bulanList.length === 12) return 'Januari – Desember (12 Bulan)';

  const sorted = [...bulanList].sort((a, b) => a - b);
  return sorted.map((b) => BULAN_LIST[b - 1]?.singkatan || b).join(', ');
}

export function exportToCSV(data: ProgramKerja[]) {
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
    `"${formatBulanPelaksanaan(item.bulanPelaksanaan)}"`,
    `"${(item.tanggalSpesifik ? formatIndonesianDate(item.tanggalSpesifik) : '').replace(/"/g, '""')}"`,
    `"${(item.penanggungjawab?.nama || '').replace(/"/g, '""')}"`,
    `"${(item.penanggungjawab?.divisi || '').replace(/"/g, '""')}"`,
    `"${(item.penanggungjawab?.kontak || '').replace(/"/g, '""')}"`,
    getStatusInfo(item.status).label,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Proker_Paroki_Katedral_Medan_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
