/**
 * Type definitions for Parish Officials (Pengurus Paroki)
 * Pastor Paroki, Vikaris, DPPH, Koordinator Seksi dan Anggotanya
 */

export type KategoriPengurus = 'pastor_paroki' | 'vikaris' | 'dpph' | 'seksi';
export type KategoriJabatan = KategoriPengurus | 'anggota_seksi';

export interface MasterJabatan {
  id: string;
  nama: string; // misal: 'Pastor Paroki', 'Wakil Ketua DPPH', 'Koordinator Seksi', dll.
  kategori: KategoriJabatan;
  keterangan?: string;
  isDefault?: boolean;
  urutan?: number;
}

export interface AnggotaSeksi {
  id: string;
  nama: string;
  peran?: string; // misal: 'Wakil Koordinator', 'Sekretaris Seksi', 'Bendahara', 'Anggota Inti'
  kontak?: string;
  keterangan?: string;
}

export interface PengurusItem {
  id: string;
  kategori: KategoriPengurus;
  jabatan: string; // misal: 'Pastor Paroki', 'Vikaris Parokial', 'Sekretaris DPPH', 'Koordinator Seksi Liturgi'
  nama: string; // misal: 'RP. Sesarius Ery Kurniadi, OFMCap'
  divisiId?: string; // relasi ke division ID jika seksi/DPPH (misal 'div-liturgi', 'div-dpph')
  namaDivisi?: string; // 'Seksi Liturgi', 'DPPH'
  kontak?: string; // no telepon / WA
  email?: string;
  periode: string; // misal '2026 - 2027' atau '2025 - 2028'
  anggotas?: AnggotaSeksi[]; // Daftar anggota untuk Koordinator Seksi atau tim DPPH
  urutan: number;
  fotoUrl?: string;
  catatan?: string;
  createdAt?: string;
  updatedAt?: string;
}
