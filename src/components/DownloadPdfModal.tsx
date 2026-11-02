import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { ProgramKerja } from '../types/proker';
import { AuthSession } from '../types/auth';
import { PengurusItem } from '../types/pengurus';
import {
  formatRupiah,
  isDivisionMatch,
  getTipeJadwalLabel,
  getTotalAnggaranTerpakai,
} from '../utils/formatters';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';

interface DownloadPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  programs: ProgramKerja[];
  authSession: AuthSession | null;
  selectedSeksi: string | 'all';
  selectedYear: 'all' | 2026 | 2027;
  selectedMonth: number | 'all';
  pengurusList?: PengurusItem[];
}

export const DownloadPdfModal: React.FC<DownloadPdfModalProps> = ({
  isOpen,
  onClose,
  programs,
  authSession,
  selectedSeksi,
  selectedYear,
  pengurusList,
}) => {
  if (!isOpen) return null;

  const isPastorOrAdmin =
    authSession?.role === 'pastor_paroki' || authSession?.role === 'semua_seksi';

  // State untuk mode cakupan data bagi Pastor Paroki / Admin
  // Default untuk Pastor Paroki / Admin: data secara KESELURUHAN (semua seksi) sesuai instruksi pengguna
  const [adminScopeMode, setAdminScopeMode] = useState<'all' | 'specific'>('all');
  const [adminSelectedUnit, setAdminSelectedUnit] = useState<string>(
    selectedSeksi !== 'all' ? selectedSeksi : MASTER_DIVISIONS[0].nama
  );

  // Penentuan nama seksi / cakupan yang aktif
  const isOverallScope = isPastorOrAdmin && adminScopeMode === 'all';
  const targetSeksiName = isPastorOrAdmin
    ? adminScopeMode === 'all'
      ? 'Semua Seksi & DPPH (Keseluruhan Paroki)'
      : adminSelectedUnit
    : authSession?.unitNama || selectedSeksi;

  // Filter data program berdasarkan cakupan hak akses & pilihan
  const filteredData = useMemo(() => {
    return programs.filter((p) => {
      // Role non-admin: hanya data seksi yang bersangkutan
      if (!isPastorOrAdmin) {
        const mySeksi = authSession?.unitNama || selectedSeksi;
        if (!isDivisionMatch(p.penanggungjawab?.divisi, mySeksi)) return false;
      } else if (adminScopeMode === 'specific') {
        if (!isDivisionMatch(p.penanggungjawab?.divisi, adminSelectedUnit)) return false;
      }
      // Filter tahun jika dipilih
      if (selectedYear !== 'all' && p.tahun !== selectedYear) return false;
      return true;
    });
  }, [programs, isPastorOrAdmin, authSession, selectedSeksi, adminScopeMode, adminSelectedUnit, selectedYear]);

  // Metrik Pencapaian Program
  const totalPrograms = filteredData.length;
  let terlaksanaCount = 0;
  let pergeseranCount = 0;
  let tidakTerlaksanaCount = 0;
  let belumDievaluasiCount = 0;

  let totalPaguAnggaran = 0;
  let totalRealisasiDana = 0;

  filteredData.forEach((p) => {
    totalPaguAnggaran += p.estimasiAnggaran || 0;
    const realisasi = getTotalAnggaranTerpakai(p);
    totalRealisasiDana += realisasi;

    // Evaluasi status check
    const hasBulanan = p.evaluasiBulanan && Object.keys(p.evaluasiBulanan).length > 0;
    if (hasBulanan) {
      const evValues = Object.values(p.evaluasiBulanan!);
      const doneSome = evValues.some((v) => v.statusKeterlaksanaan === 'terlaksana');
      const batalAll = evValues.every((v) => v.statusKeterlaksanaan === 'tidak_terlaksana');
      if (doneSome) terlaksanaCount++;
      else if (batalAll) tidakTerlaksanaCount++;
      else pergeseranCount++;
    } else if (p.evaluasi?.statusKeterlaksanaan === 'terlaksana') {
      terlaksanaCount++;
    } else if (p.evaluasi?.statusKeterlaksanaan === 'perubahan_waktu') {
      pergeseranCount++;
    } else if (p.evaluasi?.statusKeterlaksanaan === 'tidak_terlaksana') {
      tidakTerlaksanaCount++;
    } else {
      belumDievaluasiCount++;
    }
  });

  const sisaDana = Math.max(0, totalPaguAnggaran - totalRealisasiDana);
  const persentaseCapaianProker = totalPrograms > 0 ? Math.round((terlaksanaCount / totalPrograms) * 100) : 0;
  const persentaseRealisasiDana = totalPaguAnggaran > 0 ? Math.min(100, Math.round((totalRealisasiDana / totalPaguAnggaran) * 100)) : 0;
  const persentaseSisaDana = 100 - persentaseRealisasiDana;

  // Breakdown per Unit / Seksi (khusus laporan keseluruhan untuk Pastor Paroki / Admin)
  const breakdownPerUnit = useMemo(() => {
    const map: Record<
      string,
      { totalPagu: number; realisasi: number; totalProker: number; terlaksana: number }
    > = {};

    filteredData.forEach((p) => {
      const unit = p.penanggungjawab?.divisi || 'Lainnya';
      if (!map[unit]) {
        map[unit] = { totalPagu: 0, realisasi: 0, totalProker: 0, terlaksana: 0 };
      }
      map[unit].totalPagu += p.estimasiAnggaran || 0;
      map[unit].realisasi += getTotalAnggaranTerpakai(p);
      map[unit].totalProker += 1;
      if (
        p.evaluasi?.statusKeterlaksanaan === 'terlaksana' ||
        (p.evaluasiBulanan && Object.values(p.evaluasiBulanan).some((v) => v.statusKeterlaksanaan === 'terlaksana'))
      ) {
        map[unit].terlaksana += 1;
      }
    });

    return map;
  }, [filteredData]);

  const handlePrintPdf = () => {
    window.print();
  };

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200 print:static print:p-0 print:bg-white print:z-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
        {/* HEADER MODAL - TAMPIL DI LAYAR SAJA (DISEMBUNYIKAN SAAT PRINT) */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-extrabold text-white truncate">
                  Preview Dokumen PDF Laporan Program Kerja
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Format A4 Landscape
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {isPastorOrAdmin
                  ? '👑 Hak Akses Pastor Paroki/Admin: Laporan Keseluruhan Seluruh Seksi dengan Diagram Capaian & Penggunaan Dana'
                  : `🏛️ Hak Akses: Laporan Program Kerja ${targetSeksiName} dengan Diagram Evaluasi`}
              </p>
            </div>
          </div>

          {/* Opsi Cakupan Khusus Pastor Paroki / Admin & Tombol Cetak */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
            {isPastorOrAdmin && (
              <div className="flex items-center p-0.5 bg-slate-800 rounded-lg text-[10px] font-bold border border-slate-700">
                <button
                  type="button"
                  onClick={() => setAdminScopeMode('all')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    adminScopeMode === 'all'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Semua Seksi (Keseluruhan)
                </button>
                <button
                  type="button"
                  onClick={() => setAdminScopeMode('specific')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    adminScopeMode === 'specific'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Seksi Tertentu
                </button>
              </div>
            )}

            {isPastorOrAdmin && adminScopeMode === 'specific' && (
              <select
                value={adminSelectedUnit}
                onChange={(e) => setAdminSelectedUnit(e.target.value)}
                className="h-7 bg-slate-800 border border-slate-700 text-white text-[10.5px] font-bold rounded-lg px-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {MASTER_DIVISIONS.map((d) => (
                  <option key={d.id} value={d.nama} className="bg-white text-slate-900 font-medium">
                    {d.nama}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Cetak atau Simpan sebagai PDF (Landscape)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Tutup Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PETUNJUK SIMPAN PDF DI LAYAR */}
        <div className="p-2 bg-emerald-50 border-b border-emerald-200 text-emerald-950 text-xs flex items-center justify-between no-print px-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-emerald-800">💡 Tips PDF Landscape:</span>
            <span>
              Pada dialog browser print, pilih <strong>Destination: Save as PDF</strong>, tentukan{' '}
              <strong>Layout: Landscape</strong>, dan centang <strong>Background graphics</strong> agar diagram tercetak optimal.
            </span>
          </div>
          <button
            type="button"
            onClick={handlePrintPdf}
            className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
          >
            Buka Dialog Cetak
          </button>
        </div>

        {/* CONTENT SCROLLABLE / PRINT DOCUMENT AREA */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-white text-slate-900 print:p-0 print:overflow-visible">
          {/* 1. KOP SURAT RESMI PAROKI KATEDRAL MEDAN */}
          <div className="border-b-2 border-slate-900 pb-3 text-center relative">
            <div className="flex items-center justify-center gap-3 mb-1">
              <span className="w-9 h-9 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-base shadow-xs">
                ⛪
              </span>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
                  PAROKI SANTA PERAWAN MARIA YANG DIKANDUNG TANPA NODA
                </h1>
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-wider uppercase">
                  GEREJA KATEDRAL KEUSKUPAN AGUNG MEDAN
                </h2>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Jl. Pemuda No. 1, Medan, Sumatera Utara · Telp: (061) 4516827 · Email: katedralmedan@gmail.com
            </p>
            <div className="mt-2 py-1 px-4 bg-slate-100 rounded-lg inline-block border border-slate-200">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-900">
                LAPORAN CAPAIAN PROGRAM KERJA & PENGGUNAAN ANGGARAN TAHUN {selectedYear === 'all' ? '2026 - 2027' : selectedYear}
              </h3>
              <p className="text-[11px] font-bold text-emerald-800 mt-0.5">
                Cakupan Laporan: {targetSeksiName}
              </p>
            </div>
          </div>

          {/* 2. DIAGRAM VISUAL PENCAPAIAN PELAKSANAAN PROGRAM & PENGGUNAAN DANA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>DIAGRAM PENCAPAIAN PELAKSANAAN PROGRAM & REALISASI PENGGUNAAN DANA</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-500">
                Per Tanggal: {currentDateStr}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* DIAGRAM 1: PENCAPAIAN PELAKSANAAN PROGRAM KERJA */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-extrabold text-slate-900">
                      1. Tingkat Pencapaian Pelaksanaan Program
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    {persentaseCapaianProker}% Terlaksana
                  </span>
                </div>

                {/* Progress Bar Multi-Segment */}
                <div className="space-y-1">
                  <div className="w-full h-4.5 bg-slate-200 rounded-full overflow-hidden flex border border-slate-300">
                    <div
                      style={{ width: `${(terlaksanaCount / Math.max(1, totalPrograms)) * 100}%` }}
                      className="bg-emerald-600 h-full transition-all"
                      title={`Terlaksana: ${terlaksanaCount} Program`}
                    />
                    <div
                      style={{ width: `${(pergeseranCount / Math.max(1, totalPrograms)) * 100}%` }}
                      className="bg-amber-500 h-full transition-all"
                      title={`Geser Waktu: ${pergeseranCount} Program`}
                    />
                    <div
                      style={{ width: `${(tidakTerlaksanaCount / Math.max(1, totalPrograms)) * 100}%` }}
                      className="bg-rose-500 h-full transition-all"
                      title={`Tidak Terlaksana: ${tidakTerlaksanaCount} Program`}
                    />
                    <div
                      style={{ width: `${(belumDievaluasiCount / Math.max(1, totalPrograms)) * 100}%` }}
                      className="bg-slate-300 h-full transition-all"
                      title={`Belum Evaluasi: ${belumDievaluasiCount} Program`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold px-0.5">
                    <span>0%</span>
                    <span>Total {totalPrograms} Program Kerja Terdaftar</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Legenda Segment Proker */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[10px]">
                  <div className="p-1.5 rounded-lg bg-white border border-emerald-200 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="block font-bold text-slate-800">Terlaksana</span>
                      <strong className="text-emerald-900 font-black">{terlaksanaCount} proker</strong>
                    </div>
                  </div>

                  <div className="p-1.5 rounded-lg bg-white border border-amber-200 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="block font-bold text-slate-800">Geser Waktu</span>
                      <strong className="text-amber-900 font-black">{pergeseranCount} proker</strong>
                    </div>
                  </div>

                  <div className="p-1.5 rounded-lg bg-white border border-rose-200 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="block font-bold text-slate-800">Ditiadakan</span>
                      <strong className="text-rose-900 font-black">{tidakTerlaksanaCount} proker</strong>
                    </div>
                  </div>

                  <div className="p-1.5 rounded-lg bg-white border border-slate-200 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                    <div className="min-w-0">
                      <span className="block font-bold text-slate-800">Rencana/Antre</span>
                      <strong className="text-slate-700 font-black">{belumDievaluasiCount} proker</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* DIAGRAM 2: PENGGUNAAN & REALISASI ANGGARAN DANA */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-extrabold text-slate-900">
                      2. Diagram Realisasi & Sisa Penggunaan Dana
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                    Pagu: {formatRupiah(totalPaguAnggaran)}
                  </span>
                </div>

                {/* Progress Bar Anggaran */}
                <div className="space-y-1">
                  <div className="w-full h-4.5 bg-slate-200 rounded-full overflow-hidden flex border border-slate-300">
                    <div
                      style={{ width: `${persentaseRealisasiDana}%` }}
                      className="bg-indigo-600 h-full transition-all"
                      title={`Dana Terpakai: ${formatRupiah(totalRealisasiDana)}`}
                    />
                    <div
                      style={{ width: `${persentaseSisaDana}%` }}
                      className="bg-emerald-500 h-full transition-all"
                      title={`Sisa Dana: ${formatRupiah(sisaDana)}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold px-0.5">
                    <span>Realisasi ({persentaseRealisasiDana}%)</span>
                    <span>Sisa Pagu ({persentaseSisaDana}%)</span>
                  </div>
                </div>

                {/* Ringkasan Angka Dana */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[10.5px]">
                  <div className="p-2 rounded-lg bg-white border border-indigo-200 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block text-[9.5px] font-semibold">
                        Realisasi Dana Terpakai
                      </span>
                      <strong className="text-indigo-900 font-black text-xs">
                        {formatRupiah(totalRealisasiDana)}
                      </strong>
                    </div>
                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {persentaseRealisasiDana}%
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block text-[9.5px] font-semibold">
                        Sisa Anggaran Tersedia
                      </span>
                      <strong className="text-emerald-900 font-black text-xs">
                        {formatRupiah(sisaDana)}
                      </strong>
                    </div>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {persentaseSisaDana}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* DIAGRAM 3: DIAGRAM VISUAL GRAFIK BATANG KOMPARASI PER SEKSI (KHUSUS PASTOR PAROKI / ADMIN - SELURUH SEKSI) */}
            {isOverallScope && Object.keys(breakdownPerUnit).length > 1 && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-extrabold text-slate-900">
                      3. Diagram Visual Perbandingan Serapan Dana & Capaian Tiap Seksi / DPPH
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {Object.keys(breakdownPerUnit).length} Unit Pelayanan
                  </span>
                </div>

                {/* Grid Visual Bar Chart Per Seksi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {Object.entries(breakdownPerUnit).map(([unitName, uData]) => {
                    const serapan = uData.totalPagu > 0 ? Math.round((uData.realisasi / uData.totalPagu) * 100) : 0;
                    const capaianProker = uData.totalProker > 0 ? Math.round((uData.terlaksana / uData.totalProker) * 100) : 0;

                    return (
                      <div
                        key={unitName}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-[10px] space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-900 truncate max-w-[140px]">{unitName}</span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 font-extrabold">
                            {capaianProker}% Capaian
                          </span>
                        </div>

                        {/* Bar Serapan Dana */}
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between text-[9px] text-slate-500">
                            <span>Serapan Dana ({serapan}%)</span>
                            <span>{formatRupiah(uData.realisasi)} / {formatRupiah(uData.totalPagu)}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 flex">
                            <div
                              style={{ width: `${Math.min(100, serapan)}%` }}
                              className="bg-indigo-600 h-full"
                            />
                          </div>
                        </div>

                        {/* Info Proker */}
                        <div className="flex items-center justify-between text-[9px] text-slate-600 pt-0.5 border-t border-slate-100">
                          <span>Program: <strong>{uData.totalProker} proker</strong></span>
                          <span>Terlaksana: <strong className="text-emerald-800">{uData.terlaksana} proker</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. TABEL REKAPITULASI PENGGUNAAN DANA PER SEKSI (KHUSUS PASTOR PAROKI / ADMIN) */}
          {isOverallScope && Object.keys(breakdownPerUnit).length > 1 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>REKAPITULASI DANA & CAPAIAN PER SEKSI / DPPH (KESELURUHAN)</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-y border-slate-300 font-bold">
                      <th className="py-1.5 px-2">No</th>
                      <th className="py-1.5 px-2">Nama Seksi / Unit DPPH</th>
                      <th className="py-1.5 px-2 text-center">Jml Proker</th>
                      <th className="py-1.5 px-2 text-center">Terlaksana</th>
                      <th className="py-1.5 px-2 text-right">Pagu Anggaran</th>
                      <th className="py-1.5 px-2 text-right">Dana Terpakai</th>
                      <th className="py-1.5 px-2 text-right">Sisa Anggaran</th>
                      <th className="py-1.5 px-2 text-center">Serapan (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Object.entries(breakdownPerUnit).map(([unitName, uData], uIdx) => {
                      const uSisa = Math.max(0, uData.totalPagu - uData.realisasi);
                      const uSerapan = uData.totalPagu > 0 ? Math.round((uData.realisasi / uData.totalPagu) * 100) : 0;
                      return (
                        <tr key={unitName} className="hover:bg-slate-50">
                          <td className="py-1 px-2 font-bold text-slate-500">{uIdx + 1}</td>
                          <td className="py-1 px-2 font-bold text-slate-900">{unitName}</td>
                          <td className="py-1 px-2 text-center font-semibold">{uData.totalProker}</td>
                          <td className="py-1 px-2 text-center font-bold text-emerald-800">
                            {uData.terlaksana} ({Math.round((uData.terlaksana / uData.totalProker) * 100)}%)
                          </td>
                          <td className="py-1 px-2 text-right font-semibold">{formatRupiah(uData.totalPagu)}</td>
                          <td className="py-1 px-2 text-right font-bold text-indigo-900">{formatRupiah(uData.realisasi)}</td>
                          <td className="py-1 px-2 text-right font-extrabold text-emerald-800">{formatRupiah(uSisa)}</td>
                          <td className="py-1 px-2 text-center">
                            <span className="px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-800">
                              {uSerapan}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={2} className="py-1.5 px-2 text-right">TOTAL KESELURUHAN:</td>
                      <td className="py-1.5 px-2 text-center">{totalPrograms}</td>
                      <td className="py-1.5 px-2 text-center text-emerald-800">{terlaksanaCount}</td>
                      <td className="py-1.5 px-2 text-right">{formatRupiah(totalPaguAnggaran)}</td>
                      <td className="py-1.5 px-2 text-right text-indigo-900">{formatRupiah(totalRealisasiDana)}</td>
                      <td className="py-1.5 px-2 text-right text-emerald-800">{formatRupiah(sisaDana)}</td>
                      <td className="py-1.5 px-2 text-center">{persentaseRealisasiDana}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 4. TABEL MATRIKS RINCIAN PROGRAM KERJA */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1">
              <span>MATRIKS RINCIAN DATA PROGRAM KERJA & EVALUASI</span>
              <span className="text-[10px] text-slate-500 font-semibold">
                {filteredData.length} Program Terdaftar
              </span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[9.5px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-y border-slate-300 font-bold">
                    <th className="py-1.5 px-1.5 text-center w-6">No</th>
                    <th className="py-1.5 px-1.5 w-10 text-center">Tahun</th>
                    <th className="py-1.5 px-2 min-w-[140px]">Nama Program Kerja</th>
                    <th className="py-1.5 px-2 min-w-[120px]">Unit / Penanggung Jawab</th>
                    <th className="py-1.5 px-2 min-w-[100px]">Jadwal & Frekuensi</th>
                    <th className="py-1.5 px-2 text-right min-w-[85px]">Pagu Anggaran</th>
                    <th className="py-1.5 px-2 text-right min-w-[85px]">Realisasi Biaya</th>
                    <th className="py-1.5 px-2 text-right min-w-[85px]">Sisa Budget</th>
                    <th className="py-1.5 px-1.5 text-center w-24">Status Evaluasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {filteredData.map((p, idx) => {
                    const realisasi = getTotalAnggaranTerpakai(p);
                    const sisa = Math.max(0, (p.estimasiAnggaran || 0) - realisasi);
                    const isEvaluated =
                      p.evaluasi?.statusKeterlaksanaan === 'terlaksana' ||
                      (p.evaluasiBulanan && Object.values(p.evaluasiBulanan).some((v) => v.statusKeterlaksanaan === 'terlaksana'));

                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-1.5 px-1.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-1.5 px-1.5 text-center font-bold">
                          <span className={p.tahun === 2026 ? 'text-blue-700' : 'text-purple-700'}>
                            {p.tahun}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 font-bold text-slate-900 leading-tight">
                          <div className="flex items-center gap-1 flex-wrap">
                            {p.isLuarRancangan && (
                              <span className="text-[7.5px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                ⚡ Luar Rancangan
                              </span>
                            )}
                            <span>{p.namaProgram}</span>
                          </div>
                          {p.alasanLuarRancangan && (
                            <p className="text-[8px] font-medium text-amber-800 italic mt-0.5">
                              Catatan: {p.alasanLuarRancangan}
                            </p>
                          )}
                          {p.targetSasaran && (
                            <p className="text-[8.5px] font-normal text-slate-500 mt-0.5 line-clamp-1">
                              Sasaran: {p.targetSasaran}
                            </p>
                          )}
                        </td>
                        <td className="py-1.5 px-2">
                          <p className="font-bold text-slate-800">{p.penanggungjawab?.divisi}</p>
                          <p className="text-[8.5px] text-slate-400">{p.penanggungjawab?.nama}</p>
                        </td>
                        <td className="py-1.5 px-2">
                          <p className="font-semibold">{getTipeJadwalLabel(p.tipeJadwal)}</p>
                          <p className="text-[8.5px] text-slate-500 truncate">
                            {p.tanggalSpesifik || (p.bulanPelaksanaan?.length ? `${p.bulanPelaksanaan.length} Bulan` : '-')}
                          </p>
                        </td>
                        <td className="py-1.5 px-2 text-right font-semibold tabular-nums text-slate-800">
                          {formatRupiah(p.estimasiAnggaran)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold tabular-nums text-indigo-900">
                          {formatRupiah(realisasi)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-extrabold tabular-nums text-emerald-800">
                          {formatRupiah(sisa)}
                        </td>
                        <td className="py-1.5 px-1.5 text-center">
                          {isEvaluated || (p.isLuarRancangan && p.status === 'selesai') ? (
                            <span className="inline-block px-1.5 py-0.5 rounded font-black text-[8px] bg-emerald-100 text-emerald-900 border border-emerald-300">
                              {p.isLuarRancangan ? '✓ Terlaksana (Insidental)' : '✓ Terlaksana'}
                            </span>
                          ) : p.evaluasi?.statusKeterlaksanaan === 'perubahan_waktu' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded font-bold text-[8px] bg-amber-100 text-amber-900 border border-amber-300">
                              ⏳ Geser Waktu
                            </span>
                          ) : p.evaluasi?.statusKeterlaksanaan === 'tidak_terlaksana' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded font-bold text-[8px] bg-rose-100 text-rose-900 border border-rose-300">
                              ✕ Ditiadakan
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded font-semibold text-[8px] bg-slate-100 text-slate-600">
                              Direncanakan
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={5} className="py-2 px-2 text-right">TOTAL PENGGUNAAN ANGGARAN:</td>
                    <td className="py-2 px-2 text-right text-slate-900">{formatRupiah(totalPaguAnggaran)}</td>
                    <td className="py-2 px-2 text-right text-indigo-900">{formatRupiah(totalRealisasiDana)}</td>
                    <td className="py-2 px-2 text-right text-emerald-800">{formatRupiah(sisaDana)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 5. TANDA TANGAN RESMI PENGESAHAN */}
          <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="text-slate-500 mb-14">Mengetahui & Menyetujui,</p>
              <p className="font-bold text-slate-900 underline">
                {pengurusList?.find((p) => p.kategori === 'pastor_paroki')?.nama || 'RP. Sesarius Ery Kurniadi, OFMCap'}
              </p>
              <p className="text-[10px] text-slate-500">Pastor Paroki Katedral Medan</p>
            </div>
            <div>
              <p className="text-slate-500 mb-14">
                Medan, {currentDateStr}
              </p>
              <p className="font-bold text-slate-900 underline">
                {isOverallScope
                  ? 'Sekretariat Dewan Pastoral Paroki Harian (DPPH)'
                  : `Koordinator ${targetSeksiName}`}
              </p>
              <p className="text-[10px] text-slate-500">Penanggung Jawab Program Kerja</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
