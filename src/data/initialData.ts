import { ProgramKerja } from '../types/proker';

export const INITIAL_PROGRAM_KERJA: ProgramKerja[] = [
  {
    id: 'proker-dpph-01',
    tahun: 2025,
    namaProgram: 'Rapat DPPH',
    tujuanKegiatan: 'Koordinasi rutin berkala pengurus harian, evaluasi pelaksanaan program kerja, serta perumusan dan tindak lanjut kebijakan strategis.',
    targetSasaran: 'Terlaksananya rapat koordinasi rutin di hari Selasa pertama setiap bulan bersama seluruh jajaran pengurus DPPH serta terbitnya notulensi rapat.',
    estimasiAnggaran: 6000000,
    tipeJadwal: 'sepanjang_tahun',
    bulanPelaksanaan: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    modeTanggal: 'rutin_berkala',
    tanggalSpesifik: 'Setiap Selasa pertama tiap bulan',
    penanggungjawab: {
      nama: 'Yosef (Sekretaris 1) & Putut (Sekretaris 2)',
      divisi: 'Sekretariat / DPPH',
      kontak: '',
    },
    status: 'berjalan',
    catatan: 'Dilaksanakan setiap hari Selasa pertama tiap bulan. PIC bertanggung jawab menyiapkan undangan, materi agenda rapat, konsumsi, dan notulensi.',
    createdAt: '2025-01-01T08:00:00.000Z',
    updatedAt: '2025-01-01T08:00:00.000Z',
  },
];
