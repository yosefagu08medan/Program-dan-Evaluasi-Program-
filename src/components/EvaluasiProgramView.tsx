import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Search,
  Filter,
  FileText,
  DollarSign,
  Building2,
  Users,
  Sparkles,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  Check,
} from 'lucide-react';
import { ProgramKerja } from '../types/proker';
import { AuthSession } from '../types/auth';
import {
  BULAN_LIST,
  formatRupiah,
  formatCompactRupiah,
  formatIndonesianDate,
  isPelayananRutin,
  isDivisionMatch,
  getEvaluasiForMonth,
  getLatestEvaluasi,
  getDetailPaguBulanan,
  getKategoriProgramInfo,
  isProgramBerulang,
  getProgramExecutionSummary,
} from '../utils/formatters';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';

interface EvaluasiProgramViewProps {
  programs: ProgramKerja[];
  selectedYear: 'all' | 2026 | 2027;
  onSelectYear: (year: 'all' | 2026 | 2027) => void;
  selectedSeksi: string | 'all';
  onSelectSeksi: (seksi: string | 'all') => void;
  onOpenProgramDetail: (programId: string) => void;
  onOpenEvaluasi: (program: ProgramKerja, targetMonth?: number) => void;
  authSession: AuthSession | null;
  onNavigateToDashboard?: () => void;
}

export const EvaluasiProgramView: React.FC<EvaluasiProgramViewProps> = ({
  programs,
  selectedYear,
  onSelectYear,
  selectedSeksi,
  onSelectSeksi,
  onOpenProgramDetail,
  onOpenEvaluasi,
  authSession,
  onNavigateToDashboard,
}) => {
  const currentCalendarMonth = new Date().getMonth() + 1;

  // Filter States
  const [filterYear, setFilterYear] = useState<'all' | 2026 | 2027>(selectedYear);
  const [filterSeksi, setFilterSeksi] = useState<string | 'all'>(() => {
    if (authSession?.role === 'seksi' && authSession.unitNama) {
      return authSession.unitNama;
    }
    return selectedSeksi;
  });
  const [filterStatusEvaluasi, setFilterStatusEvaluasi] = useState<
    'all' | 'belum_evaluasi' | 'sudah_evaluasi' | 'terlaksana' | 'terlaksana_sebagian' | 'perubahan_waktu' | 'tidak_terlaksana'
  >('all');
  const [filterBulan, setFilterBulan] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isSeksiUser = authSession?.role === 'seksi' && !!authSession.unitNama;
  const effectiveSeksi = isSeksiUser ? authSession.unitNama : filterSeksi;

  const getProgramEvalState = (p: ProgramKerja, bulan: number | 'all') => {
    const summary = getProgramExecutionSummary(p, bulan);
    if (typeof bulan === 'number') {
      const evMonth = getEvaluasiForMonth(p, bulan);
      const hasEvalMonth = !!evMonth?.statusKeterlaksanaan && evMonth.statusKeterlaksanaan !== 'belum_terlaksana';
      const hasPartialCancel = summary.rincianTidakTerlaksana.length > 0;
      const isSebagian = summary.overallStatus === 'terlaksana_sebagian';
      const status: 'terlaksana' | 'terlaksana_sebagian' | 'perubahan_waktu' | 'tidak_terlaksana' | 'belum_evaluasi' = isSebagian
        ? 'terlaksana_sebagian'
        : evMonth?.statusKeterlaksanaan === 'terlaksana'
        ? 'terlaksana'
        : evMonth?.statusKeterlaksanaan === 'perubahan_waktu'
        ? 'perubahan_waktu'
        : evMonth?.statusKeterlaksanaan === 'tidak_terlaksana'
        ? 'tidak_terlaksana'
        : 'belum_evaluasi';
      const realisasi = typeof evMonth?.anggaranTerpakai === 'number' ? evMonth.anggaranTerpakai : 0;
      return { summary, ev: evMonth, hasEvaluation: hasEvalMonth || isSebagian || hasPartialCancel, status, realisasi };
    }

    const evLatest = getLatestEvaluasi(p, 'all');
    const isSebagian = summary.overallStatus === 'terlaksana_sebagian';
    const hasPartialCancel = summary.rincianTidakTerlaksana.length > 0;
    const status: 'terlaksana' | 'terlaksana_sebagian' | 'perubahan_waktu' | 'tidak_terlaksana' | 'belum_evaluasi' =
      summary.overallStatus === 'terlaksana_penuh'
        ? 'terlaksana'
        : summary.overallStatus === 'terlaksana_sebagian'
        ? 'terlaksana_sebagian'
        : summary.overallStatus === 'perubahan_waktu'
        ? 'perubahan_waktu'
        : summary.overallStatus === 'tidak_terlaksana'
        ? 'tidak_terlaksana'
        : 'belum_evaluasi';
    const hasEvaluation =
      status !== 'belum_evaluasi' ||
      hasPartialCancel ||
      summary.perubahanWaktuMonths.length > 0;
    const realisasi = summary.totalRealisasiTerpakai > 0 ? summary.totalRealisasiTerpakai : (evLatest?.anggaranTerpakai || 0);
    return { summary, ev: evLatest, hasEvaluation, status, realisasi };
  };

  // 1. Filter Program Berdasarkan Tahun & Hak Akses Seksi
  const filteredPrograms = useMemo(() => {
    return programs
      .filter((p) => {
        // Filter tahun
        if (filterYear !== 'all' && p.tahun !== filterYear) return false;

        // Filter seksi
        if (effectiveSeksi !== 'all') {
          if (!isDivisionMatch(p.penanggungjawab?.divisi, effectiveSeksi)) {
            return false;
          }
        }

        // Filter bulan pelaksanaan
        if (filterBulan !== 'all') {
          const isMonthMatched =
            p.tipeJadwal === 'sepanjang_tahun' ||
            (Array.isArray(p.bulanPelaksanaan) && p.bulanPelaksanaan.includes(filterBulan)) ||
            Boolean(p.evaluasiBulanan?.[filterBulan]);
          if (!isMonthMatched) return false;
        }

        // Filter status evaluasi & deteksi keterlaksanaan multi-bulan
        const { hasEvaluation, status: effectiveStatus } = getProgramEvalState(p, filterBulan);

        if (filterStatusEvaluasi === 'belum_evaluasi' && hasEvaluation) return false;
        if (filterStatusEvaluasi === 'sudah_evaluasi' && !hasEvaluation) return false;
        if (filterStatusEvaluasi === 'terlaksana_sebagian' && effectiveStatus !== 'terlaksana_sebagian') return false;
        if (filterStatusEvaluasi === 'terlaksana' && effectiveStatus !== 'terlaksana') return false;
        if (filterStatusEvaluasi === 'perubahan_waktu' && effectiveStatus !== 'perubahan_waktu') return false;
        if (filterStatusEvaluasi === 'tidak_terlaksana' && effectiveStatus !== 'tidak_terlaksana') return false;

        // Pencarian teks
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.namaProgram?.toLowerCase().includes(q);
          const matchDiv = p.penanggungjawab?.divisi?.toLowerCase().includes(q);
          const matchPic = p.penanggungjawab?.nama?.toLowerCase().includes(q);
          const matchNo = p.nomorUrut?.toString().includes(q);
          const matchEvNotes =
            p.evaluasi?.penjelasanKegiatan?.toLowerCase().includes(q) ||
            p.evaluasi?.alasanTidakTerlaksana?.toLowerCase().includes(q) ||
            Object.values(p.evaluasiBulanan || {}).some(
              (evB) =>
                evB.penjelasanKegiatan?.toLowerCase().includes(q) ||
                evB.alasanTidakTerlaksana?.toLowerCase().includes(q) ||
                evB.alasanPerubahanWaktu?.toLowerCase().includes(q)
            );
          if (!matchTitle && !matchDiv && !matchPic && !matchNo && !matchEvNotes) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Urutkan berdasarkan nomor urut resmi jika tersedia
        const noA = a.nomorUrut ?? 999999;
        const noB = b.nomorUrut ?? 999999;
        if (noA !== noB) return noA - noB;
        return a.namaProgram.localeCompare(b.namaProgram);
      });
  }, [programs, filterYear, effectiveSeksi, filterBulan, filterStatusEvaluasi, searchQuery]);

  // Aggregate Metrics untuk Header Evaluasi
  const stats = useMemo(() => {
    let totalCount = 0;
    let sudahDievaluasiCount = 0;
    let terlaksanaCount = 0;
    let terlaksanaSebagianCount = 0;
    let perubahanCount = 0;
    let tidakTerlaksanaCount = 0;
    let belumDievaluasiCount = 0;
    let totalPagu = 0;
    let totalRealisasi = 0;

    filteredPrograms.forEach((p) => {
      totalCount++;
      totalPagu += p.estimasiAnggaran || 0;

      const { hasEvaluation, status, realisasi } = getProgramEvalState(p, filterBulan);

      if (hasEvaluation) {
        sudahDievaluasiCount++;
        totalRealisasi += realisasi;

        if (status === 'terlaksana_sebagian') {
          terlaksanaSebagianCount++;
        } else if (status === 'terlaksana') {
          terlaksanaCount++;
        } else if (status === 'perubahan_waktu') {
          perubahanCount++;
        } else if (status === 'tidak_terlaksana') {
          tidakTerlaksanaCount++;
        }
      } else {
        belumDievaluasiCount++;
      }
    });

    const completionRate = totalCount > 0 ? Math.round((sudahDievaluasiCount / totalCount) * 100) : 0;

    return {
      totalCount,
      sudahDievaluasiCount,
      terlaksanaCount,
      terlaksanaSebagianCount,
      perubahanCount,
      tidakTerlaksanaCount,
      belumDievaluasiCount,
      totalPagu,
      totalRealisasi,
      completionRate,
    };
  }, [filteredPrograms, filterBulan]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 sm:px-4 pb-12 animate-in fade-in duration-200">
      {/* 1. HEADER HALAMAN EVALUASI */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-4 sm:p-6 text-white shadow-lg border border-indigo-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <ClipboardCheck className="w-3 h-3 text-emerald-400" />
              <span>Modul Pengisian Evaluasi Program</span>
            </span>
            {isSeksiUser && (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-black">
                👤 Unit: {authSession.unitNama}
              </span>
            )}
          </div>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Pengisian &amp; Evaluasi Keterlaksanaan Program</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
            Formulir dan pemantauan resmi pengisian evaluasi seluruh kegiatan paroki. Catat status pelaksanaan, realisasi anggaran, peserta, serta catatan kendala dan solusi.
          </p>
        </div>

        {onNavigateToDashboard && (
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="self-start md:self-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <span>Buka Dashboard Monitoring</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        )}
      </div>

      {/* 2. STATISTIK KETERLAKSANAAN & EVALUASI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Total Program */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Program</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 tabular-nums">{stats.totalCount}</span>
            <span className="text-xs font-bold text-slate-500">Kegiatan</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            {effectiveSeksi === 'all' ? 'Seluruh seksi & DPPH' : effectiveSeksi}
          </p>
        </div>

        {/* Card 2: Sudah Dievaluasi */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Sudah Dievaluasi</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700 tabular-nums">{stats.sudahDievaluasiCount}</span>
            <span className="text-xs font-bold text-emerald-600">({stats.completionRate}%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-slate-600 mt-1 flex-wrap">
            <span className="text-emerald-700">{stats.terlaksanaCount} Terlaksana</span>
            {stats.terlaksanaSebagianCount > 0 && (
              <>
                <span>•</span>
                <span className="text-teal-700">{stats.terlaksanaSebagianCount} Sebagian</span>
              </>
            )}
            <span>•</span>
            <span className="text-amber-700">{stats.perubahanCount} Geser</span>
            <span>•</span>
            <span className="text-rose-700">{stats.tidakTerlaksanaCount} Batal</span>
          </div>
        </div>

        {/* Card 3: Belum Dievaluasi */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Perlu Diisi Evaluasi</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-700 tabular-nums">{stats.belumDievaluasiCount}</span>
            <span className="text-xs font-bold text-amber-600">Pending</span>
          </div>
          <p className="text-[10px] text-amber-800 font-medium mt-0.5">
            Klik tombol &quot;Isi Evaluasi&quot; untuk menginput
          </p>
        </div>

        {/* Card 4: Realisasi Anggaran */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Realisasi Biaya</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-black text-slate-900 truncate">
              {formatCompactRupiah(stats.totalRealisasi)}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            Dari Total Pagu {formatCompactRupiah(stats.totalPagu)}
          </p>
        </div>
      </div>

      {/* 3. BAR FILTER & PENCARIAN */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        {/* Baris Atas: Tab Filter Status Evaluasi Cepat */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-400 font-bold text-[11px] mr-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Status:</span>
          </span>
          <button
            type="button"
            onClick={() => setFilterStatusEvaluasi('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs ${
              filterStatusEvaluasi === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({stats.totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatusEvaluasi('belum_evaluasi')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs flex items-center gap-1 ${
              filterStatusEvaluasi === 'belum_evaluasi'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertCircle className="w-3 h-3 text-amber-500" />
            <span>Perlu Diisi Evaluasi ({stats.belumDievaluasiCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatusEvaluasi('terlaksana')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs flex items-center gap-1 ${
              filterStatusEvaluasi === 'terlaksana'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Terlaksana ({stats.terlaksanaCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatusEvaluasi('terlaksana_sebagian')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs flex items-center gap-1 ${
              filterStatusEvaluasi === 'terlaksana_sebagian'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-teal-600" />
            <span>Terlaksana Sebagian ({stats.terlaksanaSebagianCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatusEvaluasi('perubahan_waktu')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs flex items-center gap-1 ${
              filterStatusEvaluasi === 'perubahan_waktu'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            <Clock className="w-3 h-3 text-purple-500" />
            <span>Geser Waktu ({stats.perubahanCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatusEvaluasi('tidak_terlaksana')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs flex items-center gap-1 ${
              filterStatusEvaluasi === 'tidak_terlaksana'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3 h-3 text-rose-500" />
            <span>Tidak Terlaksana ({stats.tidakTerlaksanaCount})</span>
          </button>
        </div>

        {/* Baris Bawah: Dropdown Filter Seksi, Tahun, Bulan, dan Input Pencarian */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
          {/* Filter Tahun */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Tahun Anggaran:
            </label>
            <select
              value={filterYear}
              onChange={(e) => {
                const y = e.target.value === 'all' ? 'all' : (Number(e.target.value) as 2026 | 2027);
                setFilterYear(y);
                onSelectYear(y);
              }}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            >
              <option value="2026">Tahun Anggaran 2026</option>
              <option value="2027">Tahun Anggaran 2027</option>
              <option value="all">Semua Tahun (2026 &amp; 2027)</option>
            </select>
          </div>

          {/* Filter Seksi */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Unit / Seksi Paroki:
            </label>
            {isSeksiUser ? (
              <div className="w-full text-xs font-bold bg-indigo-50/70 border border-indigo-200 text-indigo-900 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                <span className="truncate">{authSession.unitNama}</span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-950">Login</span>
              </div>
            ) : (
              <select
                value={filterSeksi}
                onChange={(e) => {
                  setFilterSeksi(e.target.value);
                  onSelectSeksi(e.target.value);
                }}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              >
                <option value="all">Semua Seksi &amp; DPPH (16 Unit)</option>
                {MASTER_DIVISIONS.map((d) => (
                  <option key={d.id} value={d.nama}>
                    {d.nama}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Filter Bulan Pelaksanaan */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Jadwal Bulan:
            </label>
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            >
              <option value="all">Semua Bulan (Jan - Des)</option>
              {BULAN_LIST.map((b) => (
                <option key={b.no} value={b.no}>
                  Bulan {b.nama} {b.no === currentCalendarMonth ? ' (Bulan Berjalan Ini)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Input Pencarian */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Pencarian Program:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama proker, PIC, kendala..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. DAFTAR PROGRAM UNTUK PENGISIAN EVALUASI */}
      {filteredPrograms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Tidak ada program yang sesuai dengan kriteria filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Coba ganti filter status evaluasi, pilihan seksi, jadwal bulan, atau hapus kata kunci pencarian.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilterStatusEvaluasi('all');
              setFilterBulan('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-bold text-slate-700">
              Menampilkan {filteredPrograms.length} program untuk pengisian &amp; monitoring evaluasi
            </span>
            <span className="text-[11px] text-slate-400">
              Diurutkan berdasarkan Nomor Urut Resmi Paroki
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredPrograms.map((p, idx) => {
              const isBerulang = isProgramBerulang(p);
              const targetMonth = typeof filterBulan === 'number' ? filterBulan : (p.bulanPelaksanaan?.[0] || currentCalendarMonth);
              const { summary, ev, hasEvaluation: hasEvaluasi, status: cardStatus } = getProgramEvalState(p, filterBulan);
              const isSebagian = cardStatus === 'terlaksana_sebagian';
              const katInfo = getKategoriProgramInfo(p.kategoriProgram);
              const noUrutDisplay = p.nomorUrut !== undefined ? `No. #${p.nomorUrut}` : `No. #${idx + 1}`;

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-xs flex flex-col justify-between gap-3.5 hover:shadow-md ${
                    hasEvaluasi
                      ? isSebagian
                        ? 'border-teal-300 bg-teal-50/15'
                        : cardStatus === 'terlaksana'
                        ? 'border-emerald-200/90 bg-emerald-50/10'
                        : cardStatus === 'perubahan_waktu'
                        ? 'border-purple-200/90 bg-purple-50/10'
                        : cardStatus === 'tidak_terlaksana'
                        ? 'border-rose-200/90 bg-rose-50/10'
                        : 'border-amber-300/80 bg-amber-50/15'
                      : 'border-amber-300/80 bg-amber-50/15'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header Baris 1: Nomor Urut, Seksi, Kategori, Tipe Jadwal */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Badge Nomor Urut Resmi */}
                        <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white text-[11px] font-black tracking-wide shadow-2xs">
                          {noUrutDisplay}
                        </span>

                        {/* Badge Seksi */}
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[10.5px] font-extrabold flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-indigo-600" />
                          <span>{p.penanggungjawab?.divisi || 'Paroki'}</span>
                        </span>

                        {/* Badge Kategori */}
                        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold inline-flex items-center gap-0.5 ${katInfo.badge}`}>
                          <span>{katInfo.iconEmoji}</span>
                          <span>{katInfo.label}</span>
                        </span>

                        {/* Badge Luar Rancangan */}
                        {p.isLuarRancangan && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-700" />
                            <span>Luar Rancangan</span>
                          </span>
                        )}
                      </div>

                      {/* Status Evaluasi Badge */}
                      <div>
                        {hasEvaluasi ? (
                          isSebagian ? (
                            <span className="px-3 py-1 rounded-xl bg-teal-100 text-teal-950 border border-teal-300 text-xs font-black flex items-center gap-1.5 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                              <span>✓ Terlaksana Sebagian ({summary.terlaksanaMonths.length}/{summary.scheduledMonths.length} Bln)</span>
                            </span>
                          ) : cardStatus === 'terlaksana' ? (
                            <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black flex items-center gap-1.5 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>✓ Terlaksana &amp; Sudah Dievaluasi</span>
                            </span>
                          ) : cardStatus === 'perubahan_waktu' ? (
                            <span className="px-3 py-1 rounded-xl bg-purple-100 text-purple-900 border border-purple-300 text-xs font-black flex items-center gap-1.5 shadow-2xs">
                              <Clock className="w-3.5 h-3.5 text-purple-700" />
                              <span>⏳ Geser Waktu (Sudah Dievaluasi)</span>
                            </span>
                          ) : cardStatus === 'tidak_terlaksana' ? (
                            <span className="px-3 py-1 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 text-xs font-black flex items-center gap-1.5 shadow-2xs">
                              <XCircle className="w-3.5 h-3.5 text-rose-700" />
                              <span>✕ Tidak Terlaksana (Sudah Dievaluasi)</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black flex items-center gap-1.5 shadow-2xs">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                              <span>⚠️ Belum Terlaksana ({summary.rincianTidakTerlaksana.length} Bln Batal)</span>
                            </span>
                          )
                        ) : (
                          <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black flex items-center gap-1.5 animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                            <span>⚠️ Belum Dievaluasi</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Judul Program & Deskripsi */}
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                        {p.namaProgram}
                      </h3>
                      {p.tujuanKegiatan && (
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 font-normal">
                          {p.tujuanKegiatan}
                        </p>
                      )}
                    </div>

                    {/* Meta Informasi: Jadwal Pelaksanaan & Pagu Anggaran */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jadwal Pelaksanaan:</span>
                        <div className="font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>
                            {p.tipeJadwal === 'sepanjang_tahun'
                              ? 'Sepanjang Tahun (Rutin)'
                              : p.tipeJadwal === 'akan_ditentukan' && (!Array.isArray(p.bulanPelaksanaan) || p.bulanPelaksanaan.length === 0)
                              ? 'Jadwal Akan Ditentukan Kemudian'
                              : Array.isArray(p.bulanPelaksanaan) && p.bulanPelaksanaan.length > 0
                              ? p.bulanPelaksanaan.map((m) => BULAN_LIST[m - 1]?.singkatan).join(', ')
                              : 'Belum Ditentukan'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pagu Anggaran:</span>
                        <div className="font-extrabold text-slate-900 flex items-center gap-1 mt-0.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{formatRupiah(p.estimasiAnggaran)}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PIC Penanggung Jawab:</span>
                        <div className="font-extrabold text-slate-800 flex items-center gap-1 mt-0.5 truncate">
                          <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{p.penanggungjawab?.nama || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* DETAIL HASIL EVALUASI JIKA SUDAH ADA */}
                    {hasEvaluasi && (
                      isSebagian ? (
                        /* TAMPILAN KHUSUS TERLAKSANA SEBAGIAN DENGAN BULAN TIDAK TERLAKSANA & ALASANNYA */
                        <div className="p-3.5 rounded-xl bg-teal-50/70 border-2 border-teal-300 text-xs space-y-2">
                          <div className="flex items-center justify-between text-teal-950 font-black border-b border-teal-200/80 pb-1.5 flex-wrap gap-1">
                            <span className="flex items-center gap-1.5 uppercase tracking-wide">
                              <CheckCircle2 className="w-4 h-4 text-teal-700" />
                              <span>Status: Program Terlaksana Sebagian</span>
                            </span>
                            <span className="text-[11px] bg-teal-200 text-teal-950 px-2 py-0.5 rounded-full font-extrabold">
                              {summary.terlaksanaMonths.length} dari {summary.scheduledMonths.length} Jadwal Selesai
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-0.5">
                            <div className="p-2 rounded-lg bg-white/90 border border-teal-200">
                              <span className="text-slate-500 font-bold block text-[10px] uppercase">Bulan Sudah Terlaksana:</span>
                              <strong className="text-emerald-800 font-extrabold">
                                {summary.catatanBulanSudahTerlaksana || 'Belum ada bulan terlaksana'}
                              </strong>
                              <div className="text-slate-600 mt-0.5 text-[10.5px]">
                                Realisasi dana: <strong>{formatRupiah(summary.totalRealisasiTerpakai)}</strong>
                              </div>
                            </div>

                            {summary.belumTerlaksanaMonths.length > 0 && (
                              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                                <span className="text-amber-800 font-bold block text-[10px] uppercase">Bulan Belum Terlaksana / Berjalan:</span>
                                <strong className="text-amber-950 font-extrabold">{summary.catatanBulanBelumTerlaksana}</strong>
                                <div className="text-amber-800 mt-0.5 text-[10.5px]">
                                  Sesuai jadwal kelanjutan program
                                </div>
                              </div>
                            )}
                          </div>

                          {/* DAFTAR BULAN YANG TIDAK TERLAKSANA BESERTA ALASANNYA */}
                          {summary.rincianTidakTerlaksana && summary.rincianTidakTerlaksana.length > 0 && (
                            <div className="p-2.5 rounded-lg bg-rose-50/90 border border-rose-300 space-y-1.5">
                              <div className="flex items-center gap-1.5 font-black text-rose-950 text-[11px] uppercase">
                                <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Bulan yang Tidak Terlaksana Beserta Alasannya:</span>
                              </div>
                              <div className="space-y-1 pl-1">
                                {summary.rincianTidakTerlaksana.map((item) => (
                                  <div key={item.bulan} className="text-[11px] text-slate-800 bg-white/90 p-2 rounded-md border border-rose-200">
                                    <span className="font-extrabold text-rose-950">• Bulan {item.namaBulan}: </span>
                                    <span className="italic">{item.alasan || 'Tidak ada alasan dicantumkan'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {ev?.penjelasanKegiatan && (
                            <div className="text-[11px] text-slate-700 bg-white/80 p-2 rounded-lg border border-teal-100">
                              <span className="font-bold text-teal-950">Catatan Pelaksanaan Terakhir: </span>
                              <span>{ev.penjelasanKegiatan}</span>
                            </div>
                          )}
                        </div>
                      ) : summary.rincianTidakTerlaksana.length > 0 ? (
                        <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-300 text-xs space-y-2">
                          <div className="flex items-center justify-between text-amber-950 font-black border-b border-amber-200/80 pb-1.5 flex-wrap gap-1">
                            <span className="flex items-center gap-1.5 uppercase tracking-wide">
                              <AlertCircle className="w-4 h-4 text-amber-700" />
                              <span>
                                {cardStatus === 'tidak_terlaksana'
                                  ? 'Status: Program Tidak Terlaksana'
                                  : 'Status: Belum Ada Bulan Terlaksana (Sebagian Batal)'}
                              </span>
                            </span>
                            <span className="text-[11px] bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full font-extrabold">
                              0 dari {summary.scheduledMonths.length} Jadwal Terlaksana
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-rose-50/90 border border-rose-300 space-y-1.5">
                            <div className="flex items-center gap-1.5 font-black text-rose-950 text-[11px] uppercase">
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>Bulan yang Tidak Terlaksana Beserta Alasannya:</span>
                            </div>
                            <div className="space-y-1 pl-1">
                              {summary.rincianTidakTerlaksana.map((item) => (
                                <div key={item.bulan} className="text-[11px] text-slate-800 bg-white/90 p-2 rounded-md border border-rose-200">
                                  <span className="font-extrabold text-rose-950">• Bulan {item.namaBulan}: </span>
                                  <span className="italic">{item.alasan || 'Tidak ada alasan dicantumkan'}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {summary.belumTerlaksanaMonths.length > 0 && (
                            <div className="text-[11px] text-amber-900 bg-white/80 p-2 rounded-lg border border-amber-200">
                              <span className="font-bold">Jadwal Berikutnya / Belum Terlaksana: </span>
                              <strong>{summary.catatanBulanBelumTerlaksana}</strong>
                            </div>
                          )}
                        </div>
                      ) : ev && ev.statusKeterlaksanaan === 'terlaksana' ? (
                        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-emerald-900 font-black border-b border-emerald-200/80 pb-1 flex-wrap gap-1">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Hasil Evaluasi Keterlaksanaan ({ev.tanggalPelaksanaan ? formatIndonesianDate(ev.tanggalPelaksanaan) : 'Selesai'})</span>
                            </span>
                            {ev.evaluator && (
                              <span className="text-[10px] text-emerald-800 font-bold">
                                Evaluator: {ev.evaluator}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-0.5">
                            <div>
                              <span className="text-slate-500 font-medium">Realisasi Biaya: </span>
                              <strong className="text-slate-900">{formatRupiah(ev.anggaranTerpakai || summary.totalRealisasiTerpakai || 0)}</strong>
                              {p.estimasiAnggaran > 0 && (
                                <span className="text-slate-500 ml-1">
                                  ({Math.round(((ev.anggaranTerpakai || summary.totalRealisasiTerpakai || 0) / p.estimasiAnggaran) * 100)}% dari pagu)
                                </span>
                              )}
                            </div>
                            {ev.tempatPelaksanaan && (
                              <div>
                                <span className="text-slate-500 font-medium">Lokasi: </span>
                                <strong className="text-slate-800">{ev.tempatPelaksanaan}</strong>
                              </div>
                            )}
                          </div>

                          {ev.penjelasanKegiatan && (
                            <div className="text-[11px] text-slate-700 bg-white/80 p-2 rounded-lg border border-emerald-100">
                              <span className="font-bold text-emerald-950">Catatan Kegiatan: </span>
                              <span>{ev.penjelasanKegiatan}</span>
                            </div>
                          )}
                        </div>
                      ) : ev && ev.statusKeterlaksanaan === 'perubahan_waktu' ? (
                        <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-1">
                          <div className="text-[11px] text-purple-900">
                            <span className="font-bold">Alasan Perubahan Waktu: </span>
                            <span>{ev.alasanPerubahanWaktu || 'Tidak ada alasan dicantumkan'}</span>
                            {ev.jadwalBaru && <span> (Jadwal Baru: <strong>{ev.jadwalBaru}</strong>)</span>}
                          </div>
                          {ev.penjelasanPerubahan && (
                            <p className="text-[11px] text-slate-700 italic">{ev.penjelasanPerubahan}</p>
                          )}
                        </div>
                      ) : ev && ev.statusKeterlaksanaan === 'tidak_terlaksana' ? (
                        <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs">
                          <div className="text-[11px] text-rose-900">
                            <span className="font-bold">Alasan Tidak Terlaksana: </span>
                            <span className="italic">{ev.alasanTidakTerlaksana?.trim() || 'Tidak ada alasan dicantumkan'}</span>
                          </div>
                        </div>
                      ) : null
                    )}

                    {/* Jika Belum Dievaluasi */}
                    {!hasEvaluasi && (
                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-amber-900">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-semibold">
                            Program ini belum memiliki catatan evaluasi pelaksanaan kegiatan.
                          </span>
                        </div>
                        <span className="text-[10.5px] font-bold text-amber-800">
                          Silakan klik tombol &quot;Isi Evaluasi&quot; di bawah
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer Card: Tombol Aksi Evaluasi & Lihat Detail */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/80 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onOpenProgramDetail(p.id)}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Lihat Rincian Program</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Untuk program multi-bulan / berulang, sediakan opsi pilih bulan jika sedang filter all */}
                      {isBerulang && filterBulan === 'all' && Array.isArray(p.bulanPelaksanaan) && p.bulanPelaksanaan.length > 1 && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                          <span>Evaluasi Per Bulan:</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {p.bulanPelaksanaan.map((m) => {
                              const evM = getEvaluasiForMonth(p, m);
                              const isEvM = !!evM?.statusKeterlaksanaan && evM.statusKeterlaksanaan !== 'belum_terlaksana';
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => onOpenEvaluasi(p, m)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                                    isEvM
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                                  }`}
                                  title={`Evaluasi pelaksanaan bulan ${BULAN_LIST[m - 1]?.nama}`}
                                >
                                  {BULAN_LIST[m - 1]?.singkatan} {isEvM ? '✓' : ''}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tombol Utama: Isi / Edit Evaluasi */}
                      <button
                        type="button"
                        onClick={() => onOpenEvaluasi(p, targetMonth)}
                        className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98 ${
                          hasEvaluasi
                            ? 'bg-slate-900 hover:bg-slate-800 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        }`}
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        <span>{hasEvaluasi ? '✏️ Ubah / Update Evaluasi' : '📝 Isi Evaluasi Sekarang'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
export default EvaluasiProgramView;
