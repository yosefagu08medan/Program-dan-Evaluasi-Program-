export type ScheduleType = 'sepanjang_tahun' | 'multi_bulan' | 'satu_kali' | 'akan_ditentukan';

export type ProgramStatus = 'direncanakan' | 'berjalan' | 'selesai' | 'ditunda';

export type ModeTanggal = 'tanggal_pasti' | 'akan_ditentukan' | 'rutin_berkala';

export interface PenanggungJawab {
  nama: string;
  divisi: string;
  kontak: string;
}

export interface DokumenLampiran {
  id: string;
  nama: string;
  tipe: string; // 'application/pdf', 'image/jpeg', etc.
  dataUrl?: string; // data URI atau URL file
  ukuran?: string; // e.g. '2.4 MB'
}

export type StatusKeterlaksanaan =
  | 'terlaksana'
  | 'tidak_terlaksana'
  | 'perubahan_waktu'
  | 'belum_terlaksana'
  | 'terlaksana_sebagian';

export interface EvaluasiProgram {
  statusKeterlaksanaan?: StatusKeterlaksanaan;
  // Jika terlaksana (semua opsional):
  tanggalPelaksanaan?: string;
  tempatPelaksanaan?: string;
  jumlahPeserta?: string;
  penjelasanKegiatan?: string;
  anggaranTerpakai?: number;
  dokumentasi?: DokumenLampiran[];
  // Jika tidak terlaksana:
  alasanTidakTerlaksana?: string;
  // Rincian untuk program multi-bulan yang terlaksana sebagian:
  bulanTidakTerlaksanaList?: number[];
  rincianTidakTerlaksana?: Array<{ bulan: number; namaBulan: string; alasan: string }>;
  // Jika perubahan waktu pelaksanaan:
  jadwalBaru?: string; // e.g. Rencana tanggal atau bulan baru
  alasanPerubahanWaktu?: string; // Alasan pergantian waktu
  penjelasanPerubahan?: string; // Catatan tambahan perubahan
  // Metadata pengisi:
  tanggalEvaluasi?: string;
  evaluator?: string;
}

export type KategoriProgram = 'program_biasa' | 'program_rutin' | 'program_tentatif';

export interface EvaluasiBulanan {
  [bulan: number]: EvaluasiProgram; // 1 = Januari, ..., 12 = Desember
}

export interface ProgramKerja {
  id: string;
  tahun: 2026 | 2027;
  namaProgram: string;
  tujuanKegiatan: string;
  targetSasaran: string;
  estimasiAnggaran: number;
  tipeJadwal: ScheduleType;
  bulanPelaksanaan: number[]; // 1 = Januari, ..., 12 = Desember
  modeTanggal?: ModeTanggal; // 'tanggal_pasti' | 'akan_ditentukan' | 'rutin_berkala'
  tanggalSpesifik?: string; // e.g. "Setiap Selasa pertama tiap bulan", "15 Agustus 2026", or "Akan ditentukan kemudian"
  jadwalBulanan?: Record<number, string>; // Rencana tanggal pelaksanaan untuk tiap bulan (1-12)
  penanggungjawab: PenanggungJawab;
  status: ProgramStatus;
  // Klasifikasi Jenis Program:
  kategoriProgram?: KategoriProgram; // 'program_rutin' | 'program_tentatif' | 'program_biasa'
  // Kustom Alokasi Pemakaian Dana & Catatan Bulanan (misal Panitia Paskah Feb: Rp 0 / Pembentukan Panitia, Mar: Rp 15jt / Pencairan dana):
  isKustomAlokasiDana?: boolean;
  alokasiDanaBulanan?: Record<number, number>; // Nominal rencana pemakaian per bulan (1-12)
  catatanBulanan?: Record<number, string>; // Catatan / rincian kegiatan per bulan pelaksanaan
  evaluasi?: EvaluasiProgram; // Evaluasi tunggal atau fallback
  evaluasiBulanan?: EvaluasiBulanan; // Evaluasi per bulan (1-12) untuk program rutin/berulang
  isLuarRancangan?: boolean; // True jika kegiatan terlaksana namun tidak masuk dalam rancangan awal (insidental)
  alasanLuarRancangan?: string; // Alasan/latar belakang program terlaksana di luar rancangan
  // Integrasi Rancangan 2026 vs 2027 & Evaluasi DPPH:
  programLanjutanDariId?: string; // ID program 2026 jika program 2027 ini merupakan kelanjutan
  namaProgram2026Asal?: string; // Nama program 2026 acuan
  statusKelanjutan2027?: 'dilanjutkan' | 'tidak_dilanjutkan' | 'baru';
  tindakLanjutKendala?: string; // Solusi atas kendala tahun 2026 untuk perancangan tahun 2027
  rekomendasiDPPH?: string; // Arahan/catatan evaluasi dari DPPH
  catatanAdmin?: string; // Catatan arahan/penjadwalan ulang dari Pastor Paroki / Admin
  diubahOleh?: string; // Aktor yang melakukan perubahan terakhir (Pastor Paroki / Admin / Seksi)
  tanggalPerubahan?: string; // Waktu perubahan terakhir disimpan
  catatan?: string;
  nomorUrut?: number; // Nomor urut teratur program
  // Review & Catatan Persetujuan Pastor Paroki untuk Program Tahun 2027:
  catatanPastorParoki?: CatatanPastorParoki;
  // Catatan Revisi Anggaran / Penjadwalan dari Dashboard Penggunaan Dana & Penerimaan:
  catatanRevisiAnggaran?: CatatanRevisiAnggaran;
  createdAt: string;
  updatedAt: string;
}

export interface CatatanRevisiAnggaran {
  perluRevisi: boolean;
  catatan: string;
  targetBulan?: number;
  rekomendasiAnggaran?: number;
  ditujukanKepada?: string;
  dibuatOleh?: string;
  tanggalCatatan?: string;
  statusTindakLanjut?: 'menunggu_revisi' | 'sudah_direvisi';
}

export type StatusPersetujuanPastor =
  | 'menunggu_review'
  | 'disetujui'
  | 'disetujui_dengan_catatan'
  | 'perlu_revisi'
  | 'ditolak';

export interface CatatanPastorParoki {
  statusPersetujuan: StatusPersetujuanPastor;
  catatan?: string; // Catatan arahan pastoral / evaluasi dari Romo
  rekomendasiAnggaran?: number; // Catatan penyesuaian anggaran jika ada
  tanggalReview?: string; // Tanggal review dilakukan
  namaPastor?: string; // Nama Pastor Paroki / Romo peninjau
}

export interface FilterOptions {
  tahun: 'all' | 2026 | 2027;
  searchQuery: string;
  tipeJadwal: 'all' | ScheduleType;
  status: 'all' | ProgramStatus;
  divisi: 'all' | string;
  kategoriRancangan?: 'all' | 'rancangan' | 'luar_rancangan';
  kategoriProgram?: 'all' | KategoriProgram;
  selectedMonth?: number; // 1-12
}
