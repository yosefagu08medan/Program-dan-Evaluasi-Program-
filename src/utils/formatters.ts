import { ProgramKerja, ScheduleType, ProgramStatus } from '../types/proker';

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

export const DAFTAR_DIVISI = [
  'Sekretariat / DPPH',
  'Dewan Pengurus Harian (DPPH)',
  'Bidang Liturgi & Peribadatan',
  'Bidang Pewartaan & Katekese',
  'Bidang Pelayanan & Sosial (PSE)',
  'Bidang Paguyuban & Komunitas',
  'Umum & Operasional',
  'Keuangan & Anggaran',
  'Pengembangan SDM & Kerumahtanggaan',
];

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

export function getTipeJadwalLabel(type: ScheduleType): string {
  switch (type) {
    case 'sepanjang_tahun':
      return 'Sepanjang Tahun';
    case 'multi_bulan':
      return 'Multi Bulan';
    case 'satu_kali':
      return 'Satu Kali';
    default:
      return type;
  }
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
    `"${(item.tanggalSpesifik || '').replace(/"/g, '""')}"`,
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
  link.setAttribute('download', `Program_Kerja_2025_2026_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
