export type ScheduleType = 'sepanjang_tahun' | 'multi_bulan' | 'satu_kali';

export type ProgramStatus = 'direncanakan' | 'berjalan' | 'selesai' | 'ditunda';

export type ModeTanggal = 'tanggal_pasti' | 'akan_ditentukan' | 'rutin_berkala';

export interface PenanggungJawab {
  nama: string;
  divisi: string;
  kontak: string;
}

export interface ProgramKerja {
  id: string;
  tahun: 2025 | 2026;
  namaProgram: string;
  tujuanKegiatan: string;
  targetSasaran: string;
  estimasiAnggaran: number;
  tipeJadwal: ScheduleType;
  bulanPelaksanaan: number[]; // 1 = Januari, ..., 12 = Desember
  modeTanggal?: ModeTanggal; // 'tanggal_pasti' | 'akan_ditentukan' | 'rutin_berkala'
  tanggalSpesifik?: string; // e.g. "Setiap Selasa pertama tiap bulan", "15 Agustus 2025", or "Akan ditentukan kemudian"
  jadwalBulanan?: Record<number, string>; // Rencana tanggal pelaksanaan untuk tiap bulan (1-12)
  penanggungjawab: PenanggungJawab;
  status: ProgramStatus;
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilterOptions {
  tahun: 'all' | 2025 | 2026;
  searchQuery: string;
  tipeJadwal: 'all' | ScheduleType;
  status: 'all' | ProgramStatus;
  divisi: 'all' | string;
  selectedMonth?: number; // 1-12
}
