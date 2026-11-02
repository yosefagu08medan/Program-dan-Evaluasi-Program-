import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Layers,
  ChevronRight,
  CheckCircle2,
  Clock,
  Building2,
  Phone,
  Sparkles,
  Printer,
  Info,
  BarChart3,
  Flame,
  Scale,
  Coins,
  Hammer,
  Heart,
  TrendingDown,
  Check,
  Plus,
} from 'lucide-react';
import { ProgramKerja } from '../types/proker';
import { PenerimaanMingguan } from '../types/penerimaan';
import { PenerimaanFormModal } from './PenerimaanFormModal';
import { AuthSession } from '../types/auth';
import {
  BULAN_LIST,
  formatRupiah,
  formatCompactRupiah,
  getStatusInfo,
  isDivisionMatch,
  getAlokasiBudgetBulanan,
  isProgramAktifDiBulan,
  getKategoriProgramInfo,
} from '../utils/formatters';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';

interface MonthlyCashFlowProjectionViewProps {
  programs: ProgramKerja[];
  penerimaanList?: PenerimaanMingguan[];
  onOpenProgramDetail: (progId: string) => void;
  onOpenEvaluasi?: (prog: ProgramKerja, targetMonth?: number) => void;
  onSavePenerimaan?: (item: PenerimaanMingguan) => Promise<void>;
  authSession?: AuthSession | null;
  onNavigateToPenerimaanTab?: () => void;
  initialYear?: 'all' | 2026 | 2027;
  initialSeksi?: string | 'all';
  initialFocusMode?: ViewFocusMode;
}

export type ViewFocusMode = 'komparasi' | 'anggaran' | 'penerimaan';

export const MonthlyCashFlowProjectionView: React.FC<MonthlyCashFlowProjectionViewProps> = ({
  programs,
  penerimaanList = [],
  onOpenProgramDetail,
  onOpenEvaluasi,
  onSavePenerimaan,
  authSession = null,
  onNavigateToPenerimaanTab,
  initialYear = 'all',
  initialSeksi = 'all',
  initialFocusMode = 'komparasi',
}) => {
  const currentCalendarMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState<'all' | 2026 | 2027>(initialYear);
  const [selectedSeksi, setSelectedSeksi] = useState<string | 'all'>(initialSeksi);
  const [activeMonth, setActiveMonth] = useState<number>(currentCalendarMonth);
  const [kategoriFilter, setKategoriFilter] = useState<'all' | 'rancangan' | 'luar_rancangan'>('all');
  const [focusMode, setFocusMode] = useState<ViewFocusMode>(initialFocusMode);
  const [isPenerimaanModalOpen, setIsPenerimaanModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (initialFocusMode) {
      setFocusMode(initialFocusMode);
    }
  }, [initialFocusMode]);

  // Filter program berdasarkan tahun, seksi, dan kategori rancangan
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      // Filter tahun
      if (selectedYear !== 'all' && p.tahun !== selectedYear) return false;

      // Filter seksi
      if (selectedSeksi !== 'all' && !isDivisionMatch(p.penanggungjawab?.divisi, selectedSeksi)) {
        return false;
      }

      // Filter kategori rancangan
      if (kategoriFilter === 'rancangan' && p.isLuarRancangan) return false;
      if (kategoriFilter === 'luar_rancangan' && !p.isLuarRancangan) return false;

      return true;
    });
  }, [programs, selectedYear, selectedSeksi, kategoriFilter]);

  // Kalkulasi distribusi kebutuhan dana dan rencana penerimaan per bulan (1 - 12)
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;

      // 1. Kebutuhan Anggaran Program Kerja
      const monthPrograms: {
        program: ProgramKerja;
        alokasiDanaBulanIni: number;
      }[] = [];

      filteredPrograms.forEach((p) => {
        if (isProgramAktifDiBulan(p, monthNum)) {
          // Bagi rata anggaran: untuk sepanjang_tahun dibagi 12 bulan secara rata
          const alokasi = getAlokasiBudgetBulanan(p, monthNum);
          monthPrograms.push({
            program: p,
            alokasiDanaBulanIni: alokasi,
          });
        }
      });

      const totalDana = monthPrograms.reduce((sum, item) => sum + item.alokasiDanaBulanIni, 0);

      // 2. Rencana & Realisasi Penerimaan Kas di bulan ini
      const monthPenerimaan = penerimaanList.filter((item) => {
        if (selectedYear !== 'all' && item.tahun !== selectedYear) return false;
        if (item.bulan !== monthNum) return false;
        if (selectedSeksi === 'all') {
          // Secara global hanya menampilkan penerimaan tingkat Paroki (Kolekte)
          const isParokiLevel =
            item.alokasiSeksi === 'Umum Paroki' ||
            item.tipeSumber === 'paroki' ||
            item.kategori === 'kolekte_1' ||
            item.kategori === 'kolekte_2' ||
            item.kategori === 'kolekte_khusus';
          if (!isParokiLevel) return false;
        } else {
          // Saat seksi dipilih, hanya tampilkan penerimaan untuk seksi bersangkutan
          if (!item.alokasiSeksi || !isDivisionMatch(item.alokasiSeksi, selectedSeksi)) {
            return false;
          }
        }
        return true;
      });

      const totalRencanaPenerimaan = monthPenerimaan.reduce((sum, item) => sum + (item.rancangan || 0), 0);
      const totalRealisasiPenerimaan = monthPenerimaan.reduce((sum, item) => sum + (item.realisasi || 0), 0);
      const selisihProyeksi = totalRencanaPenerimaan - totalDana;
      const rasioKecukupan = totalDana > 0 ? Math.round((totalRencanaPenerimaan / totalDana) * 100) : 100;

      // Klasifikasi jenis penerimaan di bulan ini
      const kolekte1Items = monthPenerimaan.filter((i) => i.kategori === 'kolekte_1');
      const kolekte2Items = monthPenerimaan.filter((i) => i.kategori === 'kolekte_2');
      const pseItems = monthPenerimaan.filter(
        (i) => i.alokasiSeksi === 'Seksi PSE' || (i.namaPenerimaan && i.namaPenerimaan.toLowerCase().includes('pse'))
      );
      const tentatifItems = monthPenerimaan.filter((i) => i.isTentatif || i.tipeSumber === 'seksi_tentatif');

      return {
        monthNum,
        monthName: BULAN_LIST[i]?.nama || `Bulan ${i + 1}`,
        singkatan: BULAN_LIST[i]?.singkatan || `B${i + 1}`,
        totalDana, // Rencana Anggaran (Kebutuhan Proker)
        totalRencanaPenerimaan, // Rencana Penerimaan Kas
        totalRealisasiPenerimaan, // Realisasi Penerimaan Riil
        selisihProyeksi, // Surplus (+) atau Defisit (-)
        rasioKecukupan, // Persentase ketercukupan
        count: monthPrograms.length,
        items: monthPrograms,
        penerimaanCount: monthPenerimaan.length,
        penerimaanItems: monthPenerimaan,
        breakdownPenerimaan: {
          kolekte1: kolekte1Items.reduce((s, i) => s + (i.rancangan || 0), 0),
          kolekte1Real: kolekte1Items.reduce((s, i) => s + (i.realisasi || 0), 0),
          kolekte2: kolekte2Items.reduce((s, i) => s + (i.rancangan || 0), 0),
          kolekte2Real: kolekte2Items.reduce((s, i) => s + (i.realisasi || 0), 0),
          pse: pseItems.reduce((s, i) => s + (i.rancangan || 0), 0),
          pseReal: pseItems.reduce((s, i) => s + (i.realisasi || 0), 0),
          tentatif: tentatifItems.reduce((s, i) => s + (i.rancangan || 0), 0),
          tentatifReal: tentatifItems.reduce((s, i) => s + (i.realisasi || 0), 0),
        },
      };
    });

    const grandTotalAnggaran = months.reduce((sum, m) => sum + m.totalDana, 0);
    const grandTotalRencanaPenerimaan = months.reduce((sum, m) => sum + m.totalRencanaPenerimaan, 0);
    const grandTotalRealisasiPenerimaan = months.reduce((sum, m) => sum + m.totalRealisasiPenerimaan, 0);
    const totalSelisihTahunan = grandTotalRencanaPenerimaan - grandTotalAnggaran;

    const maxDana = Math.max(...months.map((m) => m.totalDana), 1);
    const maxPenerimaan = Math.max(...months.map((m) => m.totalRencanaPenerimaan), 1);
    const chartMax = Math.max(maxDana, maxPenerimaan, 1);
    const avgDana = grandTotalAnggaran > 0 ? Math.round(grandTotalAnggaran / 12) : 0;
    const avgPenerimaan = grandTotalRencanaPenerimaan > 0 ? Math.round(grandTotalRencanaPenerimaan / 12) : 0;

    // Cari bulan puncak anggaran (Peak Demand Month)
    let peakMonth = months[0];
    months.forEach((m) => {
      if (m.totalDana > peakMonth.totalDana) {
        peakMonth = m;
      }
    });

    // Cari bulan dengan defisit terbesar jika ada
    let deficitMonth = months[0];
    months.forEach((m) => {
      if (m.selisihProyeksi < deficitMonth.selisihProyeksi) {
        deficitMonth = m;
      }
    });

    return {
      months,
      grandTotalAnggaran,
      grandTotalRencanaPenerimaan,
      grandTotalRealisasiPenerimaan,
      totalSelisihTahunan,
      chartMax,
      maxDana,
      maxPenerimaan,
      avgDana,
      avgPenerimaan,
      peakMonth,
      deficitMonth,
    };
  }, [filteredPrograms, penerimaanList, selectedYear, selectedSeksi]);

  // Data untuk bulan aktif terpilih
  const currentMonthData = useMemo(() => {
    return (
      monthlyData.months.find((m) => m.monthNum === activeMonth) || {
        monthNum: activeMonth,
        monthName: BULAN_LIST[activeMonth - 1]?.nama || 'Bulan',
        singkatan: BULAN_LIST[activeMonth - 1]?.singkatan || 'Bln',
        totalDana: 0,
        totalRencanaPenerimaan: 0,
        totalRealisasiPenerimaan: 0,
        selisihProyeksi: 0,
        rasioKecukupan: 100,
        count: 0,
        items: [],
        penerimaanCount: 0,
        penerimaanItems: [],
        breakdownPenerimaan: {
          kolekte1: 0,
          kolekte1Real: 0,
          kolekte2: 0,
          kolekte2Real: 0,
          pse: 0,
          pseReal: 0,
          tentatif: 0,
          tentatifReal: 0,
        },
      }
    );
  }, [monthlyData, activeMonth]);

  // Kelompokkan kegiatan bulan terpilih per Seksi
  const currentMonthBySeksi = useMemo(() => {
    const grouped: Record<
      string,
      {
        seksiName: string;
        totalDanaSeksi: number;
        programs: {
          program: ProgramKerja;
          alokasiDanaBulanIni: number;
        }[];
      }
    > = {};

    currentMonthData.items.forEach(({ program, alokasiDanaBulanIni }) => {
      const seksi = program.penanggungjawab?.divisi || 'Seksi Lainnya';
      if (!grouped[seksi]) {
        grouped[seksi] = {
          seksiName: seksi,
          totalDanaSeksi: 0,
          programs: [],
        };
      }
      grouped[seksi].totalDanaSeksi += alokasiDanaBulanIni;
      grouped[seksi].programs.push({ program, alokasiDanaBulanIni });
    });

    return Object.values(grouped).sort((a, b) => b.totalDanaSeksi - a.totalDanaSeksi);
  }, [currentMonthData]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. HEADER & FILTER BAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Proyeksi Kas &amp; Anggaran Bulanan
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">
                  Penerimaan vs Anggaran
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Pemeriksaan per bulan (Januari – Desember) antara <strong>Rencana Penerimaan Kas</strong> dengan{' '}
                <strong>Rencana Kebutuhan Anggaran Program Kerja</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {onSavePenerimaan && (
              <button
                type="button"
                onClick={() => setIsPenerimaanModalOpen(true)}
                className="h-8 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Input Rencana atau Realisasi Penerimaan Kas"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Input Rencana Penerimaan</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* Filter Bar Controls & View Focus Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tahun */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <span className="text-[10px] text-slate-500 uppercase px-1.5">Tahun:</span>
              {(['all', 2026, 2027] as const).map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    selectedYear === yr
                      ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {yr === 'all' ? '2026 & 2027' : yr}
                </button>
              ))}
            </div>

            {/* Filter Seksi / Unit */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSeksi}
                onChange={(e) => setSelectedSeksi(e.target.value)}
                className="h-8 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white cursor-pointer"
              >
                <option value="all">Semua Seksi / Bidang ({MASTER_DIVISIONS.length})</option>
                {MASTER_DIVISIONS.map((d) => (
                  <option key={d.id} value={d.nama}>
                    {d.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Kategori Proker */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setKategoriFilter('all')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  kategoriFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Proker
              </button>
              <button
                type="button"
                onClick={() => setKategoriFilter('rancangan')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  kategoriFilter === 'rancangan' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rancangan Awal
              </button>
              <button
                type="button"
                onClick={() => setKategoriFilter('luar_rancangan')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  kategoriFilter === 'luar_rancangan' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Insidental</span>
              </button>
            </div>
          </div>

          {/* View Focus Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setFocusMode('komparasi')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                focusMode === 'komparasi'
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              <span>Komparasi</span>
            </button>
            <button
              type="button"
              onClick={() => setFocusMode('penerimaan')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                focusMode === 'penerimaan'
                  ? 'bg-emerald-700 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-300" />
              <span>Rencana Penerimaan</span>
            </button>
            <button
              type="button"
              onClick={() => setFocusMode('anggaran')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                focusMode === 'anggaran'
                  ? 'bg-indigo-700 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-300" />
              <span>Rencana Anggaran</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI METRICS CARDS (KOMPARASI 12 BULAN) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Rencana Penerimaan Kas */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              1. Rencana Penerimaan
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-950">
            {formatRupiah(monthlyData.grandTotalRencanaPenerimaan)}
          </p>
          <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
            <span>Realisasi Kas Masuk:</span>
            <span className="font-bold text-emerald-700">{formatRupiah(monthlyData.grandTotalRealisasiPenerimaan)}</span>
          </div>
        </div>

        {/* Metric 2: Rencana Kebutuhan Anggaran Proker */}
        <div className="bg-white p-4 rounded-2xl border border-indigo-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
              2. Kebutuhan Anggaran
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-indigo-950">
            {formatRupiah(monthlyData.grandTotalAnggaran)}
          </p>
          <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
            <span>{filteredPrograms.length} Kegiatan Proker</span>
            <span>Rata2 {formatRupiah(monthlyData.avgDana)}/bln</span>
          </div>
        </div>

        {/* Metric 3: Proyeksi Ketahanan Kas (Surplus / Defisit) */}
        <div
          className={`p-4 rounded-2xl border shadow-2xs space-y-1 ${
            monthlyData.totalSelisihTahunan >= 0
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50/60 border-emerald-300'
              : 'bg-gradient-to-br from-rose-50 to-amber-50/60 border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${
                monthlyData.totalSelisihTahunan >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              {monthlyData.totalSelisihTahunan >= 0 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Proyeksi Kas Surplus
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Proyeksi Kas Defisit
                </>
              )}
            </span>
            <span
              className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                monthlyData.totalSelisihTahunan >= 0
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-rose-200 text-rose-900'
              }`}
            >
              {monthlyData.grandTotalAnggaran > 0
                ? Math.round((monthlyData.grandTotalRencanaPenerimaan / monthlyData.grandTotalAnggaran) * 100)
                : 100}
              % Tercover
            </span>
          </div>
          <p
            className={`text-xl font-black ${
              monthlyData.totalSelisihTahunan >= 0 ? 'text-emerald-950' : 'text-rose-950'
            }`}
          >
            {monthlyData.totalSelisihTahunan >= 0 ? '+' : ''}
            {formatRupiah(monthlyData.totalSelisihTahunan)}
          </p>
          <p className="text-[10.5px] text-slate-600 font-medium truncate">
            {monthlyData.totalSelisihTahunan >= 0
              ? 'Penerimaan mencukupi estimasi biaya proker'
              : 'Perlu penyesuaian target atau jadwal proker'}
          </p>
        </div>

        {/* Metric 4: Bulan Ditinjau */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              Bulan Fokus: {currentMonthData.monthName}
            </span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-xl font-black text-white">
              {formatRupiah(currentMonthData.totalDana)}
            </p>
            <span
              className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-md ${
                currentMonthData.selisihProyeksi >= 0
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {currentMonthData.selisihProyeksi >= 0 ? 'Aman' : 'Defisit'}
            </span>
          </div>
          <p className="text-[10.5px] text-indigo-200 font-medium">
            Rencana Penerimaan: <strong>{formatRupiah(currentMonthData.totalRencanaPenerimaan)}</strong>
          </p>
        </div>
      </div>

      {/* 3. INTERACTIVE 12-MONTH DUAL CHART (KOMPARASI PENERIMAAN VS ANGGARAN) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>
                Grafik Komparasi 12 Bulan:{' '}
                <span className="text-emerald-700">Rencana Penerimaan</span> vs{' '}
                <span className="text-indigo-700">Rencana Anggaran</span>
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Klik salah satu batang bulan untuk memeriksa perbandingan penerimaan dan anggaran di bulan tersebut
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" />
              Rencana Penerimaan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-indigo-600 inline-block" />
              Rencana Anggaran
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md ring-2 ring-indigo-600 bg-white inline-block" />
              Bulan Aktif
            </span>
          </div>
        </div>

        {/* Dual Bar Visualizer per Bulan (1-12) */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-6 pb-2 items-end min-h-[230px]">
          {monthlyData.months.map((m) => {
            const isSelected = m.monthNum === activeMonth;
            const penerimaanH =
              monthlyData.chartMax > 0 ? Math.max(Math.round((m.totalRencanaPenerimaan / monthlyData.chartMax) * 125), 6) : 6;
            const anggaranH =
              monthlyData.chartMax > 0 ? Math.max(Math.round((m.totalDana / monthlyData.chartMax) * 125), 6) : 6;

            const isDefisit = m.selisihProyeksi < 0 && m.totalDana > 0;

            return (
              <div
                key={m.monthNum}
                onClick={() => setActiveMonth(m.monthNum)}
                className={`flex flex-col items-center group cursor-pointer p-1 rounded-xl transition-all ${
                  isSelected ? 'bg-indigo-50/70 ring-2 ring-indigo-600' : 'hover:bg-slate-50'
                }`}
              >
                {/* Status Icon / Tag */}
                <div className="h-5 flex items-center justify-center">
                  {isDefisit ? (
                    <span className="text-[9px] font-black text-rose-600 px-1 py-0.2 rounded bg-rose-50 border border-rose-200">
                      Defisit
                    </span>
                  ) : m.totalDana > 0 && m.totalRencanaPenerimaan > 0 ? (
                    <span className="text-[9px] font-bold text-emerald-700 px-1 py-0.2 rounded bg-emerald-50">
                      Surplus
                    </span>
                  ) : null}
                </div>

                {/* Dua Batang Berdampingan */}
                <div className="w-full h-[135px] flex items-end justify-center gap-1 px-0.5">
                  {/* Batang 1: Rencana Penerimaan (Hijau) */}
                  <div className="w-1/2 flex flex-col items-center">
                    <span className="text-[8px] font-bold text-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity mb-0.5 truncate max-w-full">
                      {formatCompactRupiah(m.totalRencanaPenerimaan)}
                    </span>
                    <div
                      style={{ height: `${penerimaanH}px` }}
                      className={`w-full max-w-[16px] rounded-t-md transition-all duration-300 ${
                        isSelected
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-xs'
                          : 'bg-emerald-500/80 group-hover:bg-emerald-600'
                      }`}
                      title={`Rencana Penerimaan: ${formatRupiah(m.totalRencanaPenerimaan)}`}
                    />
                  </div>

                  {/* Batang 2: Rencana Anggaran (Indigo / Rose jika beban) */}
                  <div className="w-1/2 flex flex-col items-center">
                    <span className="text-[8px] font-bold text-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity mb-0.5 truncate max-w-full">
                      {formatCompactRupiah(m.totalDana)}
                    </span>
                    <div
                      style={{ height: `${anggaranH}px` }}
                      className={`w-full max-w-[16px] rounded-t-md transition-all duration-300 ${
                        isSelected
                          ? isDefisit
                            ? 'bg-gradient-to-t from-rose-600 to-amber-500 shadow-xs'
                            : 'bg-gradient-to-t from-indigo-700 to-indigo-400 shadow-xs'
                          : isDefisit
                          ? 'bg-rose-500 group-hover:bg-rose-600'
                          : 'bg-indigo-600/80 group-hover:bg-indigo-700'
                      }`}
                      title={`Rencana Anggaran: ${formatRupiah(m.totalDana)}`}
                    />
                  </div>
                </div>

                {/* Label Bulan */}
                <div
                  className={`w-full mt-2 py-1 text-center rounded-lg transition-all ${
                    isSelected ? 'bg-indigo-600 text-white font-black shadow-xs' : 'text-slate-700 font-bold'
                  }`}
                >
                  <div className="text-[10px] leading-tight truncate">{m.singkatan}</div>
                  <div className={`text-[8.5px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {m.count} proker
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. DETAIL PEMERIKSAAN BULAN TERPILIH (2 SISI: RENCANA PENERIMAAN VS RENCANA ANGGARAN) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-5">
        {/* Header Inspeksi Bulan Terpilih */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <h3 className="text-base font-black text-slate-900">
                Pemeriksaan Kas Bulan {currentMonthData.monthName} {selectedYear !== 'all' ? selectedYear : ''}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                Bulan Ke-{currentMonthData.monthNum}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Perbandingan langsung antara target pemasukan kas dan komitmen pencairan program kerja
            </p>
          </div>

          {/* Banner Status Likuiditas Bulan Terpilih */}
          <div
            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
              currentMonthData.selisihProyeksi >= 0
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}
          >
            {currentMonthData.selisihProyeksi >= 0 ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Surplus Proyeksi:{' '}
                  <strong className="text-emerald-800">+{formatRupiah(currentMonthData.selisihProyeksi)}</strong>
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  Defisit Proyeksi:{' '}
                  <strong className="text-rose-800">{formatRupiah(currentMonthData.selisihProyeksi)}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* 2 SISI KOMPARASI (KIRI: PENERIMAAN KAS, KANAN: KEBUTUHAN ANGGARAN PROKER) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* SISI KIRI: RENCANA & REALISASI PENERIMAAN KAS */}
          <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/20 p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">
                    Sisi 1: Rencana &amp; Realisasi Penerimaan
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Total {currentMonthData.penerimaanCount} catatan kas di bulan {currentMonthData.monthName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Rencana Masuk</span>
                  <span className="text-sm font-black text-emerald-700">
                    {formatRupiah(currentMonthData.totalRencanaPenerimaan)}
                  </span>
                </div>
                {onSavePenerimaan && (
                  <button
                    type="button"
                    onClick={() => setIsPenerimaanModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    title={`Input Rencana Penerimaan untuk Bulan ${currentMonthData.monthName}`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>+ Input Rencana</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Summary Cards Penerimaan */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                <span className="text-[10px] text-slate-500 font-bold block">Kolekte I (50% Ops/Proker):</span>
                <span className="text-xs font-black text-slate-900">
                  {formatRupiah(currentMonthData.breakdownPenerimaan.kolekte1)}
                </span>
                <span className="text-[9.5px] text-emerald-700 font-semibold block">
                  Realisasi: {formatRupiah(currentMonthData.breakdownPenerimaan.kolekte1Real)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                <span className="text-[10px] text-slate-500 font-bold block">Kolekte II (Pembangunan):</span>
                <span className="text-xs font-black text-slate-900">
                  {formatRupiah(currentMonthData.breakdownPenerimaan.kolekte2)}
                </span>
                <span className="text-[9.5px] text-emerald-700 font-semibold block">
                  Realisasi: {formatRupiah(currentMonthData.breakdownPenerimaan.kolekte2Real)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-amber-200">
                <span className="text-[10px] text-slate-500 font-bold block">Seksi PSE (Sosial Ekonomi):</span>
                <span className="text-xs font-black text-slate-900">
                  {formatRupiah(currentMonthData.breakdownPenerimaan.pse)}
                </span>
                <span className="text-[9.5px] text-emerald-700 font-semibold block">
                  Realisasi: {formatRupiah(currentMonthData.breakdownPenerimaan.pseReal)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-purple-200">
                <span className="text-[10px] text-slate-500 font-bold block">Penerimaan Tentatif Seksi:</span>
                <span className="text-xs font-black text-slate-900">
                  {formatRupiah(currentMonthData.breakdownPenerimaan.tentatif)}
                </span>
                <span className="text-[9.5px] text-emerald-700 font-semibold block">
                  Realisasi: {formatRupiah(currentMonthData.breakdownPenerimaan.tentatifReal)}
                </span>
              </div>
            </div>

            {/* Daftar Transaksi Penerimaan Bulan Ini */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              <span className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider block">
                Daftar Masukan Kas Mingguan:
              </span>
              {currentMonthData.penerimaanItems.length === 0 ? (
                <div className="p-5 rounded-2xl bg-white border border-emerald-200/80 text-center space-y-3">
                  <DollarSign className="w-8 h-8 text-emerald-500 mx-auto" />
                  <div>
                    <h5 className="text-xs font-black text-slate-900">
                      Belum Ada Rencana Penerimaan untuk Bulan {currentMonthData.monthName}
                    </h5>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
                      Masukkan target anggaran rencana penerimaan kas di bulan ini untuk mengukur ketercukupan dana program kerja.
                    </p>
                  </div>
                  {onSavePenerimaan ? (
                    <button
                      type="button"
                      onClick={() => setIsPenerimaanModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-700/20 cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>+ Masukkan Rencana Penerimaan Bulan {currentMonthData.monthName}</span>
                    </button>
                  ) : onNavigateToPenerimaanTab ? (
                    <button
                      type="button"
                      onClick={onNavigateToPenerimaanTab}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-700/20 cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Buka Menu Penerimaan Kas</span>
                    </button>
                  ) : null}
                </div>
              ) : (
                currentMonthData.penerimaanItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[9.5px] font-bold">
                          Minggu {item.mingguKe}
                        </span>
                        <span className="font-extrabold text-slate-900 truncate">{item.namaPenerimaan}</span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">
                        Alokasi: <strong className="text-slate-700">{item.alokasiSeksi || 'Umum Paroki'}</strong> · Tgl:{' '}
                        {item.tanggal}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block font-medium">Rencana / Realisasi</span>
                      <span className="font-bold text-slate-700">{formatRupiah(item.rancangan)}</span>
                      <span className="text-[10.5px] font-black text-emerald-700 block">
                        Riil: {formatRupiah(item.realisasi)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SISI KANAN: RENCANA ANGGARAN KEBUTUHAN PROGRAM KERJA */}
          <div className="rounded-2xl border border-indigo-200/90 bg-indigo-50/20 p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">
                    Sisi 2: Rencana Kebutuhan Anggaran Proker
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Total {currentMonthData.count} kegiatan aktif di bulan {currentMonthData.monthName}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Kebutuhan Anggaran</span>
                <span className="text-sm font-black text-indigo-700">
                  {formatRupiah(currentMonthData.totalDana)}
                </span>
              </div>
            </div>

            {/* List Program di Bulan Ini Terkelompok per Seksi */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {currentMonthData.items.length === 0 ? (
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-400">
                  Tidak ada program kerja yang membutuhkan anggaran di bulan {currentMonthData.monthName}.
                </div>
              ) : (
                currentMonthBySeksi.map((group) => (
                  <div key={group.seksiName} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{group.seksiName}</span>
                      </div>
                      <span className="font-extrabold text-slate-900">{formatRupiah(group.totalDanaSeksi)}</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {group.programs.map(({ program, alokasiDanaBulanIni }) => {
                        const katInfo = getKategoriProgramInfo(program.kategoriProgram);
                        const noteBln = program.catatanBulanan?.[activeMonth];
                        return (
                          <div key={program.id} className="p-2.5 flex items-start justify-between gap-2 hover:bg-slate-50">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {program.tahun}
                                </span>
                                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${katInfo.badge}`}>
                                  <span>{katInfo.iconEmoji}</span>
                                  <span>{katInfo.label}</span>
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 truncate">{program.namaProgram}</h5>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                PJ: {program.penanggungjawab?.nama || '-'}
                                {program.tanggalSpesifik ? ` · ${program.tanggalSpesifik}` : ''}
                              </p>
                              {noteBln && (
                                <div className="mt-1 text-[10px] px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-medium inline-flex items-center gap-1">
                                  <span className="font-bold">📝 Note {currentMonthData.monthName}:</span>
                                  <span>{noteBln}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0 pt-0.5">
                              <span className="text-xs font-black text-indigo-700">
                                {formatRupiah(alokasiDanaBulanIni)}
                              </span>
                              <button
                                type="button"
                                onClick={() => onOpenProgramDetail(program.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 cursor-pointer"
                                title="Lihat Detail Program"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. TABEL REKAPITULASI 12 BULAN KOMPARATIF */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>
            Matriks Rekapitulasi 12 Bulan: Rencana Penerimaan vs Rencana Anggaran (Tahun{' '}
            {selectedYear !== 'all' ? selectedYear : '2026 - 2027'})
          </span>
        </h3>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-black text-[11px] uppercase border-b border-slate-200">
                <th className="py-2.5 px-3">Bulan</th>
                <th className="py-2.5 px-3 text-right">Rencana Penerimaan</th>
                <th className="py-2.5 px-3 text-right">Rencana Anggaran</th>
                <th className="py-2.5 px-3 text-right">Realisasi Penerimaan</th>
                <th className="py-2.5 px-3 text-right">Selisih Proyeksi</th>
                <th className="py-2.5 px-3 text-center">Kecukupan</th>
                <th className="py-2.5 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {monthlyData.months.map((m) => {
                const isSelected = m.monthNum === activeMonth;
                const isSurplus = m.selisihProyeksi >= 0;

                return (
                  <tr
                    key={m.monthNum}
                    className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/50 font-bold' : ''}`}
                  >
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                        {m.monthNum}
                      </span>
                      <span className="font-extrabold text-slate-900">{m.monthName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                      {formatRupiah(m.totalRencanaPenerimaan)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-indigo-700">
                      {formatRupiah(m.totalDana)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-700">
                      {formatRupiah(m.totalRealisasiPenerimaan)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black">
                      <span className={isSurplus ? 'text-emerald-700' : 'text-rose-600'}>
                        {isSurplus ? '+' : ''}
                        {formatRupiah(m.selisihProyeksi)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSurplus
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {m.rasioKecukupan}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveMonth(m.monthNum)}
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isSelected ? 'Aktif' : 'Cek Bulan'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                <td className="py-3 px-3">TOTAL 12 BULAN</td>
                <td className="py-3 px-3 text-right text-emerald-800 text-xs">
                  {formatRupiah(monthlyData.grandTotalRencanaPenerimaan)}
                </td>
                <td className="py-3 px-3 text-right text-indigo-800 text-xs">
                  {formatRupiah(monthlyData.grandTotalAnggaran)}
                </td>
                <td className="py-3 px-3 text-right text-slate-800 text-xs">
                  {formatRupiah(monthlyData.grandTotalRealisasiPenerimaan)}
                </td>
                <td className="py-3 px-3 text-right text-xs">
                  <span
                    className={
                      monthlyData.totalSelisihTahunan >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }
                  >
                    {monthlyData.totalSelisihTahunan >= 0 ? '+' : ''}
                    {formatRupiah(monthlyData.totalSelisihTahunan)}
                  </span>
                </td>
                <td colSpan={2} className="py-3 px-3 text-center text-slate-500 text-[11px] font-bold">
                  {monthlyData.grandTotalAnggaran > 0
                    ? Math.round((monthlyData.grandTotalRencanaPenerimaan / monthlyData.grandTotalAnggaran) * 100)
                    : 100}
                  % Terpenuhi
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MODAL INPUT RENCANA & REALISASI PENERIMAAN KAS */}
      {onSavePenerimaan && (
        <PenerimaanFormModal
          isOpen={isPenerimaanModalOpen}
          onClose={() => setIsPenerimaanModalOpen(false)}
          onSave={onSavePenerimaan}
          defaultTahun={selectedYear !== 'all' ? selectedYear : 2026}
          defaultBulan={activeMonth}
          defaultMinggu={1}
          programsList={programs}
          authSession={authSession}
          defaultSeksiTarget={selectedSeksi !== 'all' ? selectedSeksi : 'Umum Paroki'}
        />
      )}
    </div>
  );
};
