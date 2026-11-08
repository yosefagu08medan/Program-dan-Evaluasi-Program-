import React, { useState, useEffect } from 'react';
import {
  Calendar,
  DollarSign,
  Clock,
  Sparkles,
  Repeat,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  X,
  Save,
  ShieldCheck,
  Coins,
  User,
  Phone,
} from 'lucide-react';
import { ProgramKerja, ScheduleType, ProgramStatus, KategoriProgram } from '../types/proker';
import { AuthSession } from '../types/auth';
import { BULAN_LIST, formatRupiah, formatCompactRupiah, getStatusInfo } from '../utils/formatters';

interface AdminProgramEditorModalProps {
  program: ProgramKerja | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: ProgramKerja) => void;
  authSession?: AuthSession | null;
}

export const AdminProgramEditorModal: React.FC<AdminProgramEditorModalProps> = ({
  program,
  isOpen,
  onClose,
  onSave,
  authSession,
}) => {
  // Local Form States - hooks are always declared unconditionally at top
  const [namaProgram, setNamaProgram] = useState<string>(program?.namaProgram || '');
  const [kategoriProgram, setKategoriProgram] = useState<KategoriProgram>(
    program?.kategoriProgram || 'program_biasa'
  );
  const [status, setStatus] = useState<ProgramStatus>(program?.status || 'direncanakan');
  const [estimasiAnggaran, setEstimasiAnggaran] = useState<string>(
    program?.estimasiAnggaran ? String(program.estimasiAnggaran) : '0'
  );
  const [tipeJadwal, setTipeJadwal] = useState<ScheduleType>(program?.tipeJadwal || 'satu_kali');
  const [selectedMonths, setSelectedMonths] = useState<number[]>(
    program?.bulanPelaksanaan && program.bulanPelaksanaan.length > 0
      ? [...program.bulanPelaksanaan]
      : [1]
  );
  const [tanggalSpesifik, setTanggalSpesifik] = useState<string>(program?.tanggalSpesifik || '');
  const [catatanBulanan, setCatatanBulanan] = useState<Record<number, string>>(
    program?.catatanBulanan ? { ...program.catatanBulanan } : {}
  );
  const [alokasiDanaBulanan, setAlokasiDanaBulanan] = useState<Record<number, number>>(
    program?.alokasiDanaBulanan ? { ...program.alokasiDanaBulanan } : {}
  );
  const [catatanAdmin, setCatatanAdmin] = useState<string>(
    program?.catatanAdmin || program?.rekomendasiDPPH || ''
  );
  const [tujuanKegiatan, setTujuanKegiatan] = useState<string>(program?.tujuanKegiatan || '');
  const [targetSasaran, setTargetSasaran] = useState<string>(program?.targetSasaran || '');
  const [picNama, setPicNama] = useState<string>(program?.penanggungjawab?.nama || '');
  const [picKontak, setPicKontak] = useState<string>(program?.penanggungjawab?.kontak || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sinkronisasi data saat program berubah
  useEffect(() => {
    if (program) {
      setNamaProgram(program.namaProgram);
      setKategoriProgram(program.kategoriProgram || 'program_biasa');
      setStatus(program.status || 'direncanakan');
      setEstimasiAnggaran(program.estimasiAnggaran ? String(program.estimasiAnggaran) : '0');
      setTipeJadwal(program.tipeJadwal || 'satu_kali');
      setSelectedMonths(
        program.bulanPelaksanaan && program.bulanPelaksanaan.length > 0
          ? [...program.bulanPelaksanaan]
          : [1]
      );
      setTanggalSpesifik(program.tanggalSpesifik || '');
      setCatatanBulanan(program.catatanBulanan ? { ...program.catatanBulanan } : {});
      setAlokasiDanaBulanan(program.alokasiDanaBulanan ? { ...program.alokasiDanaBulanan } : {});
      setCatatanAdmin(program.catatanAdmin || program.rekomendasiDPPH || '');
      setTujuanKegiatan(program.tujuanKegiatan || '');
      setTargetSasaran(program.targetSasaran || '');
      setPicNama(program.penanggungjawab?.nama || '');
      setPicKontak(program.penanggungjawab?.kontak || '');
      setErrors({});
    }
  }, [program]);

  // Toggle bulan
  const toggleMonth = (m: number) => {
    if (tipeJadwal === 'satu_kali') {
      setSelectedMonths([m]);
    } else {
      setSelectedMonths((prev) => {
        if (prev.includes(m)) {
          if (prev.length === 1) return prev; // minimal 1 bulan
          return prev.filter((b) => b !== m);
        } else {
          return [...prev, m].sort((a, b) => a - b);
        }
      });
    }
  };

  // Helper Ubah Catatan Bulanan
  const handleCatatanBulananChange = (monthNo: number, note: string) => {
    setCatatanBulanan((prev) => ({
      ...prev,
      [monthNo]: note,
    }));
  };

  // Helper Ubah Alokasi Dana Bulanan
  const handleAlokasiDanaBulananChange = (monthNo: number, valStr: string) => {
    const cleanNum = parseInt(valStr.replace(/\D/g, ''), 10) || 0;
    setAlokasiDanaBulanan((prev) => ({
      ...prev,
      [monthNo]: cleanNum,
    }));
  };

  // Helper Bagi Rata Anggaran ke Bulan Aktif
  const handleDistributeEqualBudget = () => {
    const total = Number(estimasiAnggaran) || 0;
    if (total <= 0) return;
    const activeMonths =
      tipeJadwal === 'sepanjang_tahun'
        ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        : selectedMonths.length > 0
        ? selectedMonths
        : [1];

    const perMonth = Math.round(total / activeMonths.length);
    const newMap: Record<number, number> = {};
    activeMonths.forEach((m) => {
      newMap[m] = perMonth;
    });
    setAlokasiDanaBulanan(newMap);
  };

  // Ganti Kategori Program
  const handleKategoriProgramChange = (kat: KategoriProgram) => {
    setKategoriProgram(kat);
    if (kat === 'program_rutin') {
      if (tipeJadwal === 'satu_kali') {
        setTipeJadwal('sepanjang_tahun');
        setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      }
    }
  };

  // Simpan Perubahan & Selesai Kembali ke Tabel
  const handleSaveAndReturn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!program) return;
    const errs: Record<string, string> = {};

    if (!namaProgram.trim()) errs.nama = 'Nama program kerja wajib diisi';
    if (!estimasiAnggaran || isNaN(Number(estimasiAnggaran)) || Number(estimasiAnggaran) < 0) {
      errs.anggaran = 'Estimasi anggaran harus berupa angka yang valid';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const now = new Date().toISOString();
    const updatedProg: ProgramKerja = {
      ...program,
      namaProgram: namaProgram.trim(),
      kategoriProgram,
      status,
      estimasiAnggaran: Number(estimasiAnggaran),
      tipeJadwal,
      bulanPelaksanaan: selectedMonths.length > 0 ? selectedMonths : [1],
      tanggalSpesifik: tanggalSpesifik.trim() || undefined,
      catatanBulanan: Object.keys(catatanBulanan).length > 0 ? catatanBulanan : undefined,
      alokasiDanaBulanan: Object.keys(alokasiDanaBulanan).length > 0 ? alokasiDanaBulanan : undefined,
      tujuanKegiatan: tujuanKegiatan.trim(),
      targetSasaran: targetSasaran.trim(),
      rekomendasiDPPH: catatanAdmin.trim() || program.rekomendasiDPPH,
      catatanAdmin: catatanAdmin.trim() || undefined,
      diubahOleh: authSession?.unitNama || 'Pastor Paroki / Admin',
      tanggalPerubahan: now,
      penanggungjawab: {
        nama: picNama.trim() || program.penanggungjawab?.nama || 'Koordinator Seksi',
        divisi: program.penanggungjawab?.divisi || 'Seksi',
        kontak: picKontak.trim() || program.penanggungjawab?.kontak || '',
      },
      updatedAt: now,
    };

    onSave(updatedProg);
    onClose();
  };

  const activeMonths =
    tipeJadwal === 'sepanjang_tahun'
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      : selectedMonths.length > 0
      ? selectedMonths
      : [1];

  if (!isOpen || !program) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* HEADER DENGAN TOMBOL BACK PROMINENT */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>← Kembali ke Tabel Rencana Penerimaan &amp; Penggunaan</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Tutup (Kembali ke Tabel)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BANNER FOKUS KHUSUS SINGLE PROGRAM */}
        <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-200/80 text-indigo-900">
                  Mode Edit &amp; Penjadwalan Pastor Paroki / Admin
                </span>
                <span className="text-[10.5px] font-bold text-slate-600">
                  {program.penanggungjawab?.divisi} · Tahun {program.tahun}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 font-semibold truncate max-w-xl">
                Menyesuaikan hanya program: <strong>"{program.namaProgram}"</strong>
              </p>
            </div>
          </div>

          <span className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200 font-bold self-start sm:self-auto shrink-0">
            Perubahan Tersimpan Resmi
          </span>
        </div>

        {/* BODY FORMULIR EDIT LENGKAP */}
        <form onSubmit={handleSaveAndReturn} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* 1. NAMA PROGRAM & STATUS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                1. Nama Program Kerja <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={namaProgram}
                onChange={(e) => {
                  setNamaProgram(e.target.value);
                  if (errors.nama) setErrors((prev) => ({ ...prev, nama: '' }));
                }}
                className={`w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:bg-white ${
                  errors.nama ? 'border-rose-400 bg-rose-50' : 'border-slate-300 focus:border-indigo-600'
                }`}
                placeholder="Nama program kerja..."
              />
              {errors.nama && <p className="text-[10px] text-rose-600 font-bold">{errors.nama}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Status Pelaksanaan:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProgramStatus)}
                className={`w-full px-2.5 py-2 border rounded-xl font-bold text-xs cursor-pointer focus:outline-none ${
                  getStatusInfo(status).color
                }`}
              >
                <option value="direncanakan">Direncanakan</option>
                <option value="berjalan">Sedang Berjalan</option>
                <option value="selesai">Selesai</option>
                <option value="ditunda">Ditunda</option>
              </select>
            </div>
          </div>

          {/* 2. KATEGORI PROGRAM (3 PILIHAN IDENTIK) */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. Jenis Karakteristik Program <span className="text-rose-500">*</span></span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                Pilih jenis alokasi kas &amp; fleksibilitas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Program Rutin */}
              <button
                type="button"
                onClick={() => handleKategoriProgramChange('program_rutin')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                  kategoriProgram === 'program_rutin'
                    ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>1. Program Rutin</span>
                  </span>
                  {kategoriProgram === 'program_rutin' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-emerald-900/80 leading-snug">
                  Dilaksanakan berkala / rutin setiap bulan. Tersedia rincian jadwal, catatan kegiatan per bulan, serta pemetaan alokasi dana.
                </p>
              </button>

              {/* Opsional / Tentatif */}
              <button
                type="button"
                onClick={() => handleKategoriProgramChange('program_tentatif')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                  kategoriProgram === 'program_tentatif'
                    ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>2. Opsional / Tentatif</span>
                  </span>
                  {kategoriProgram === 'program_tentatif' && (
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-purple-900/80 leading-snug">
                  Program cadangan / situasional, hanya akan digunakan jika diperlukan sewaktu-waktu.
                </p>
              </button>

              {/* Program Biasa */}
              <button
                type="button"
                onClick={() => handleKategoriProgramChange('program_biasa')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                  kategoriProgram === 'program_biasa'
                    ? 'bg-slate-100/90 border-slate-500 ring-2 ring-slate-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>3. Program Biasa</span>
                  </span>
                  {kategoriProgram === 'program_biasa' && (
                    <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-slate-600 leading-snug">
                  Program kerja reguler standar paroki sesuai rencana kalender pastoral.
                </p>
              </button>
            </div>
          </div>

          {/* 3. ESTIMASI ANGGARAN & PIC */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Estimasi Anggaran (Rp) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="text-xs font-black text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  Rp
                </span>
                <input
                  type="number"
                  value={estimasiAnggaran}
                  onChange={(e) => {
                    setEstimasiAnggaran(e.target.value);
                    if (errors.anggaran) setErrors((prev) => ({ ...prev, anggaran: '' }));
                  }}
                  className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:bg-white ${
                    errors.anggaran ? 'border-rose-400 bg-rose-50' : 'border-slate-300 focus:border-indigo-600'
                  }`}
                  placeholder="0"
                />
              </div>
              <p className="text-[10px] text-emerald-800 font-extrabold">
                {formatRupiah(Number(estimasiAnggaran) || 0)}
              </p>
              {errors.anggaran && <p className="text-[10px] text-rose-600 font-bold">{errors.anggaran}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Penanggung Jawab (PIC):
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={picNama}
                  onChange={(e) => setPicNama(e.target.value)}
                  placeholder="Nama PIC"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Kontak WhatsApp/HP:
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={picKontak}
                  onChange={(e) => setPicKontak(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* 4. JADWAL & PENJADWALAN ULANG */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>4. Pola Waktu &amp; Penjadwalan Pelaksanaan</span>
              </label>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10.5px] font-bold">
                {(['satu_kali', 'multi_bulan', 'sepanjang_tahun'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTipeJadwal(t);
                      if (t === 'sepanjang_tahun') {
                        setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
                      }
                    }}
                    className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                      tipeJadwal === t
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'text-slate-600'
                    }`}
                  >
                    {t === 'satu_kali'
                      ? '1x Pelaksanaan'
                      : t === 'multi_bulan'
                      ? 'Beberapa Bulan'
                      : 'Rutin Sepanjang Tahun'}
                  </button>
                ))}
              </div>
            </div>

            {/* Pills 12 Bulan */}
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {BULAN_LIST.map((bln, idx) => {
                const mNum = idx + 1;
                const isChecked = selectedMonths.includes(mNum);
                return (
                  <button
                    key={mNum}
                    type="button"
                    onClick={() => toggleMonth(mNum)}
                    className={`py-1.5 px-1 rounded-lg text-center text-[10.5px] font-bold transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-indigo-600 text-white font-black shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {bln.singkatan}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={tanggalSpesifik}
              onChange={(e) => setTanggalSpesifik(e.target.value)}
              placeholder="Rencana tanggal spesifik (opsional, misal: Setiap Minggu ke-2, atau 15 Maret)"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
            />

            {/* Rincian Pemakaian Dana & Catatan Bulanan */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-[11px] font-black text-indigo-950 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      Rincian Pemakaian Dana &amp; Catatan Khusus Per Bulan ({activeMonths.length} Bulan Aktif):
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Contoh: Panitia Paskah (Feb: Pembentukan panitia / Rp 0, Mar: Pelaksanaan &amp; pencairan dana Rp 15jt)
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDistributeEqualBudget}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-indigo-900 border border-indigo-300 rounded-lg text-[10.5px] font-extrabold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    title="Bagi rata anggaran ke semua bulan aktif"
                  >
                    <RotateCcw className="w-3 h-3 text-indigo-600" />
                    <span>⚡ Bagi Rata ({activeMonths.length} Bln)</span>
                  </button>
                  <span className="text-[10px] text-slate-700 bg-white px-2 py-0.5 rounded border border-indigo-200 font-bold">
                    Pagu: {formatRupiah(Number(estimasiAnggaran) || 0)}
                  </span>
                </div>
              </div>

              {/* Grid Kartu Bulan Aktif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
                {activeMonths.map((mNo) => {
                  const bObj = BULAN_LIST[mNo - 1];
                  const defaultEven =
                    activeMonths.length > 0 && Number(estimasiAnggaran) > 0
                      ? Math.round(Number(estimasiAnggaran) / activeMonths.length)
                      : 0;
                  const curDana =
                    alokasiDanaBulanan[mNo] !== undefined ? alokasiDanaBulanan[mNo] : defaultEven;
                  const curNote = catatanBulanan[mNo] || '';

                  return (
                    <div
                      key={mNo}
                      className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs space-y-1.5 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>
                            {bObj?.nama} {program.tahun}
                          </span>
                        </span>
                        <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {formatRupiah(curDana)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[9.5px] font-bold text-slate-600 mb-0.5">
                          Pemakaian Dana Bulan Ini (Rp):
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                            Rp
                          </span>
                          <input
                            type="text"
                            value={
                              alokasiDanaBulanan[mNo] !== undefined
                                ? alokasiDanaBulanan[mNo].toLocaleString('id-ID')
                                : defaultEven > 0
                                ? defaultEven.toLocaleString('id-ID')
                                : ''
                            }
                            onChange={(e) => handleAlokasiDanaBulananChange(mNo, e.target.value)}
                            placeholder="0"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9.5px] font-bold text-slate-600 mb-0.5">
                          Catatan / Note Bulan Ini:
                        </label>
                        <input
                          type="text"
                          value={curNote}
                          onChange={(e) => handleCatatanBulananChange(mNo, e.target.value)}
                          placeholder="Contoh: Pembentukan panitia, pencairan dana, evaluasi..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[10.5px] text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 5. KOLOM ARAHAN & CATATAN KHUSUS PASTOR PAROKI / ADMIN */}
          <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl space-y-1.5">
            <label className="block text-[11px] font-black text-purple-950 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
              <span>5. Catatan / Arahan Penjadwalan Pastor Paroki &amp; Admin:</span>
            </label>
            <textarea
              rows={2}
              value={catatanAdmin}
              onChange={(e) => setCatatanAdmin(e.target.value)}
              placeholder="Contoh: Disetujui pelaksanaan dimundurkan ke Maret 2026 bertepatan dengan Trihari Suci, pencairan anggaran dilakukan sekaligus di bulan pelaksanaan..."
              className="w-full p-2.5 bg-white border border-purple-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-purple-600"
            />
            <p className="text-[10px] text-purple-800">
              Catatan ini akan tersimpan permanen sebagai rekomendasi/arahan resmi Pastor Paroki &amp; DPPH.
            </p>
          </div>

          {/* 6. TUJUAN & TARGET SASARAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">Tujuan Kegiatan:</label>
              <textarea
                rows={2}
                value={tujuanKegiatan}
                onChange={(e) => setTujuanKegiatan(e.target.value)}
                placeholder="Tujuan pastoral yang ingin dicapai..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">Target Sasaran:</label>
              <textarea
                rows={2}
                value={targetSasaran}
                onChange={(e) => setTargetSasaran(e.target.value)}
                placeholder="Target umat/peserta..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>
          </div>
        </form>

        {/* FOOTER ACTIONS DENGAN TOMBOL SIMPAN & KEMBALI */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>← Batal &amp; Kembali ke Tabel Rencana</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveAndReturn()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>💾 Simpan Perubahan &amp; Selesai Kembali ke Tabel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
