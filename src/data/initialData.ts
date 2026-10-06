import { ProgramKerja } from '../types/proker';

export const INITIAL_PROGRAM_KERJA: ProgramKerja[] = [
  {
    id: 'proker-dpph-01',
    tahun: 2026,
    namaProgram: 'Rapat DPPH',
    tujuanKegiatan: 'Koordinasi rutin berkala pengurus harian, evaluasi pelaksanaan program kerja, serta perumusan dan tindak lanjut kebijakan strategis.',
    targetSasaran: 'Terlaksananya rapat koordinasi rutin di hari Selasa pertama setiap bulan bersama seluruh jajaran pengurus DPPH serta terbitnya notulensi rapat.',
    estimasiAnggaran: 6000000,
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
      nama: 'Yosef (Sekretaris 1) & Putut (Sekretaris 2)',
      divisi: 'DPPH (Dewan Pastoral Paroki Harian)',
      kontak: '',
    },
    status: 'berjalan',
    catatan: 'Dilaksanakan setiap hari Selasa pertama tiap bulan. PIC bertanggung jawab menyiapkan undangan, materi agenda rapat, konsumsi, dan notulensi.',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
];
