import { ProgramKerja } from '../../src/types/proker';

export const SEED_PROGRAMS: ProgramKerja[] = [
  {
    id: 'proker-dpph-01',
    tahun: 2026,
    namaProgram: 'Rapat Rutin Dewan Paroki Harian (DPPH)',
    tujuanKegiatan:
      'Evaluasi pelaksanaan program pastoral bulanan, koordinasi antar-seksi, pengelolaan pastoral paroki, dan pengambilan keputusan strategis Paroki Katedral Medan.',
    targetSasaran: 'Pastor Paroki, Pastor Rekan, dan Seluruh Anggota Dewan Pengurus Paroki Harian (DPPH)',
    estimasiAnggaran: 12000000,
    tipeJadwal: 'sepanjang_tahun',
    bulanPelaksanaan: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    modeTanggal: 'rutin_berkala',
    tanggalSpesifik: 'Setiap Selasa pertama tiap bulan',
    jadwalBulanan: {
      1: '2026-01-06',
      2: '2026-02-03',
      3: '2026-03-03',
      4: '2026-04-07',
      5: '2026-05-05',
      6: '2026-06-02',
      7: '2026-07-07',
      8: '2026-08-04',
      9: '2026-09-01',
      10: '2026-10-06',
      11: '2026-11-03',
      12: '2026-12-01',
    },
    penanggungjawab: {
      nama: 'Sekretariat DPPH Katedral',
      divisi: 'DPPH (Dewan Pengurus Paroki Harian)',
      kontak: '081260011223',
    },
    status: 'berjalan',
    catatan:
      'Dilaksanakan setiap hari Selasa pertama tiap bulan pukul 19.30 WIB di Ruang Rapat Pastoran Katedral Medan. PIC bertanggung jawab menyiapkan undangan, materi agenda rapat, konsumsi, dan notulensi.',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'proker-lit-01',
    tahun: 2026,
    namaProgram: 'Pelatihan & Rekoleksi Petugas Liturgi (Lektor, Pemazmur, Misdinar)',
    tujuanKegiatan:
      'Meningkatkan penghayatan rohani dan keterampilan teknis petugas liturgi dalam melayani perayaan Ekaristi di Gereja Katedral Medan.',
    targetSasaran: 'Seluruh lektor, pemazmur, misdinar, dan asisten imam Paroki Katedral',
    estimasiAnggaran: 8500000,
    tipeJadwal: 'multi_bulan',
    bulanPelaksanaan: [3, 8, 11],
    modeTanggal: 'tanggal_pasti',
    tanggalSpesifik: 'Menjelang Pekan Suci, HUT RI, dan Adven',
    jadwalBulanan: {
      3: '2026-03-14',
      8: '2026-08-08',
      11: '2026-11-21',
    },
    penanggungjawab: {
      nama: 'Koordinator Seksi Liturgi',
      divisi: 'Liturgi & Peribadatan',
      kontak: '081370022334',
    },
    status: 'direncanakan',
    catatan: 'Diselenggarakan di Aula Katedral dengan narasumber Komisi Liturgi KAM.',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
];
