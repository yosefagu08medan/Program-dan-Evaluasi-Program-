import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Printer,
  FileText,
  Building2,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Sparkles,
  MapPin,
  HelpCircle,
  TrendingUp,
  Tag,
  Eye,
  Edit3,
  X,
  SlidersHorizontal,
  FileDown,
  Loader2,
  ChevronDown,
  ClipboardList,
} from 'lucide-react';
import { ProgramKerja, EvaluasiProgram } from '../types/proker';
import { AuthSession } from '../types/auth';
import {
  BULAN_LIST,
  formatRupiah,
  formatCompactRupiah,
  formatIndonesianDate,
  getStatusInfo,
  isDivisionMatch,
  getEvaluasiForMonth,
  getLatestEvaluasi,
  isProgramAktifDiBulan,
  getAlokasiBudgetBulanan,
  getDetailPaguBulanan,
  getKategoriProgramInfo,
  isProgramBerulang,
  getProgramExecutionSummary,
  sortProgramsSystematically,
  getAuthRoleFileSlug,
} from '../utils/formatters';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';
import { exportDashboardToPptx, PptxExportMode } from '../utils/pptxExport';

interface DashboardPresentationViewProps {
  programs: ProgramKerja[];
  selectedYear: 'all' | 2026 | 2027;
  onSelectYear: (year: 'all' | 2026 | 2027) => void;
  selectedMonth: number | 'all';
  onSelectMonth: (month: number | 'all') => void;
  selectedSeksi: string | 'all';
  onSelectSeksi: (seksi: string | 'all') => void;
  onOpenEvaluasi: (program: ProgramKerja, targetMonth?: number) => void;
  onOpenProgramDetail?: (programId: string) => void;
  onClosePresentation?: () => void;
  authSession?: AuthSession | null;
}

export type EvaluasiFilterOption =
  | 'all'
  | 'sudah_evaluasi'
  | 'terlaksana'
  | 'terlaksana_sebagian'
  | 'belum_terlaksana'
  | 'perubahan_waktu'
  | 'tidak_terlaksana';
export type PresentationLayoutMode = 'slide' | 'grid';

export const DashboardPresentationView: React.FC<DashboardPresentationViewProps> = ({
  programs,
  selectedYear,
  onSelectYear,
  selectedMonth,
  onSelectMonth,
  selectedSeksi,
  onSelectSeksi,
  onOpenEvaluasi,
  onOpenProgramDetail,
  onClosePresentation,
  authSession = null,
}) => {
  const currentCalMonth = new Date().getMonth() + 1;
  const activeMonthNum = selectedMonth === 'all' ? currentCalMonth : selectedMonth;

  // Local state
  const [evaluasiFilter, setEvaluasiFilter] = useState<EvaluasiFilterOption>('all');
  const [layoutMode, setLayoutMode] = useState<PresentationLayoutMode>('grid');
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isExportingPptx, setIsExportingPptx] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string>('');
  const [activePptxDropdown, setActivePptxDropdown] = useState<'top' | 'slide' | null>(null);

  // Filter program berdasarkan tahun, bulan, seksi, dan pencarian secara sistematis
  const filteredPrograms = useMemo(() => {
    const list = programs.filter((p) => {
      // 1. Tahun
      if (selectedYear !== 'all' && p.tahun !== selectedYear) return false;

      // 2. Bulan
      if (selectedMonth !== 'all') {
        if (!isProgramAktifDiBulan(p, selectedMonth)) return false;
      }

      // 3. Seksi
      if (selectedSeksi !== 'all' && !isDivisionMatch(p.penanggungjawab?.divisi, selectedSeksi)) {
        return false;
      }

      // 4. Pencarian teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nama = (p.namaProgram || '').toLowerCase();
        const divisi = (p.penanggungjawab?.divisi || '').toLowerCase();
        const tujuan = (p.tujuanKegiatan || '').toLowerCase();
        if (!nama.includes(q) && !divisi.includes(q) && !tujuan.includes(q)) {
          return false;
        }
      }

      // 5. Filter Evaluasi / Keterlaksanaan
      const summary = getProgramExecutionSummary(p, selectedMonth);
      const ev = getLatestEvaluasi(p, selectedMonth);
      const isBlnIniTerlaksana = typeof selectedMonth === 'number'
        ? ev?.statusKeterlaksanaan === 'terlaksana'
        : summary.overallStatus === 'terlaksana_penuh' || ev?.statusKeterlaksanaan === 'terlaksana';
      const isAnyTerlaksana = summary.terlaksanaMonths.length > 0 || summary.overallStatus === 'terlaksana_penuh';
      const isAllTerlaksana = summary.overallStatus === 'terlaksana_penuh';
      const isSebagian = summary.overallStatus === 'terlaksana_sebagian';
      const isTidakTerlaksana = typeof selectedMonth === 'number'
        ? ev?.statusKeterlaksanaan === 'tidak_terlaksana'
        : summary.overallStatus === 'tidak_terlaksana';
      const isGeser = typeof selectedMonth === 'number'
        ? ev?.statusKeterlaksanaan === 'perubahan_waktu'
        : summary.overallStatus === 'perubahan_waktu';
      const hasEvaluasi =
        isAnyTerlaksana ||
        isSebagian ||
        isTidakTerlaksana ||
        isGeser ||
        summary.rincianTidakTerlaksana.length > 0 ||
        Boolean(ev && ev.statusKeterlaksanaan && ev.statusKeterlaksanaan !== 'belum_terlaksana');

      if (evaluasiFilter === 'sudah_evaluasi') {
        if (!hasEvaluasi) return false;
      } else if (evaluasiFilter === 'terlaksana') {
        if (!isBlnIniTerlaksana && !isAnyTerlaksana) return false;
      } else if (evaluasiFilter === 'terlaksana_sebagian') {
        if (!isSebagian) return false;
      } else if (evaluasiFilter === 'belum_terlaksana') {
        // Belum terlaksana penuh
        if (isAllTerlaksana) return false;
        if (typeof selectedMonth === 'number' && isBlnIniTerlaksana) return false;
      } else if (evaluasiFilter === 'perubahan_waktu') {
        if (!isGeser) return false;
      } else if (evaluasiFilter === 'tidak_terlaksana') {
        if (!isTidakTerlaksana) return false;
      }

      return true;
    });

    // Urutkan nomor urut secara sistematis: DPPH lebih dulu, lalu Seksi paroki, jadwal bulan, dan nama program
    return sortProgramsSystematically(list);
  }, [programs, selectedYear, selectedMonth, selectedSeksi, searchQuery, evaluasiFilter]);

  // Statistik Executive Summary untuk presentasi
  const summaryStats = useMemo(() => {
    let totalPagu = 0;
    let totalRealisasi = 0;
    let countTerlaksana = 0;
    let countTerlaksanaSebagian = 0;
    let countTidakTerlaksana = 0;
    let countPerubahanWaktu = 0;
    let countBelumTerlaksana = 0;

    filteredPrograms.forEach((p) => {
      const alokasi = selectedMonth === 'all' ? (p.estimasiAnggaran || 0) : getAlokasiBudgetBulanan(p, selectedMonth);
      totalPagu += alokasi;

      const summary = getProgramExecutionSummary(p, selectedMonth);
      const ev = getLatestEvaluasi(p, selectedMonth);

      if (summary.overallStatus === 'terlaksana_sebagian') {
        countTerlaksanaSebagian++;
        countTerlaksana++;
        totalRealisasi += (selectedMonth === 'all' ? summary.totalRealisasiTerpakai : (typeof ev?.anggaranTerpakai === 'number' ? ev.anggaranTerpakai : 0));
      } else if (selectedMonth === 'all' && summary.overallStatus === 'terlaksana_penuh') {
        countTerlaksana++;
        totalRealisasi += summary.totalRealisasiTerpakai > 0 ? summary.totalRealisasiTerpakai : (ev?.anggaranTerpakai || 0);
      } else if (ev && ev.statusKeterlaksanaan === 'terlaksana') {
        countTerlaksana++;
        if (typeof ev.anggaranTerpakai === 'number') {
          totalRealisasi += ev.anggaranTerpakai;
        }
      } else if (
        (typeof selectedMonth === 'number' && ev?.statusKeterlaksanaan === 'tidak_terlaksana') ||
        (selectedMonth === 'all' && summary.overallStatus === 'tidak_terlaksana')
      ) {
        countTidakTerlaksana++;
      } else if (
        (typeof selectedMonth === 'number' && ev?.statusKeterlaksanaan === 'perubahan_waktu') ||
        (selectedMonth === 'all' && summary.overallStatus === 'perubahan_waktu')
      ) {
        countPerubahanWaktu++;
      } else {
        countBelumTerlaksana++;
      }
    });

    const totalCount = filteredPrograms.length;
    const persentaseKeterlaksanaan = totalCount > 0 ? Math.round((countTerlaksana / totalCount) * 100) : 0;
    const sisaAnggaran = totalPagu - totalRealisasi;

    return {
      totalCount,
      countTerlaksana,
      countTerlaksanaSebagian,
      countTidakTerlaksana,
      countPerubahanWaktu,
      countBelumTerlaksana,
      persentaseKeterlaksanaan,
      totalPagu,
      totalRealisasi,
      sisaAnggaran,
    };
  }, [filteredPrograms, selectedMonth]);

  // Keyboard navigation for Slide mode (Arrow Left / Arrow Right)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (layoutMode !== 'slide') return;
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(filteredPrograms.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      }
    },
    [layoutMode, filteredPrograms.length]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset slide index if filtered programs shrink
  useEffect(() => {
    if (currentSlideIndex >= filteredPrograms.length && filteredPrograms.length > 0) {
      setCurrentSlideIndex(0);
    }
  }, [filteredPrograms.length, currentSlideIndex]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handlePrint = () => {
    const prevTitle = document.title;
    const roleSlug = getAuthRoleFileSlug(authSession, selectedSeksi);
    const yearSlug = selectedYear === 'all' ? '2026_2027' : String(selectedYear);
    document.title = `Presentasi_Evaluasi_Proker_${roleSlug}_${yearSlug}`;
    const restore = () => {
      document.title = prevTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);

    const runPrint = () => {
      window.print();
      setTimeout(restore, 2000);
    };

    if (document.fullscreenElement) {
      document
        .exitFullscreen()
        .then(() => {
          setTimeout(runPrint, 350);
        })
        .catch(runPrint);
    } else {
      runPrint();
    }
  };

  useEffect(() => {
    if (!activePptxDropdown) return;
    const handleOutside = () => setActivePptxDropdown(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, [activePptxDropdown]);

  const handleDownloadPptx = async (mode: PptxExportMode = 'evaluasi') => {
    setActivePptxDropdown(null);
    if (filteredPrograms.length === 0) {
      setExportFeedback('Tidak ada program kerja yang memenuhi kriteria filter untuk diekspor ke PPTX.');
      setTimeout(() => setExportFeedback(''), 4000);
      return;
    }
    try {
      setIsExportingPptx(true);
      await exportDashboardToPptx({
        programs: filteredPrograms,
        selectedMonth,
        selectedYear,
        selectedSeksi,
        authSession,
        exportMode: mode,
      });
      setExportFeedback(
        mode === 'program_saja'
          ? 'PPTX Daftar Program Kerja (Tanpa Evaluasi) berhasil dibuat dan diunduh!'
          : 'PPTX Laporan Evaluasi Program Kerja berhasil dibuat dan diunduh!'
      );
      setTimeout(() => setExportFeedback(''), 4500);
    } catch (err: any) {
      console.error('Error exporting PPTX:', err);
      setExportFeedback('Gagal mengekspor file PPTX: ' + (err?.message || 'Terjadi kesalahan sistem'));
      setTimeout(() => setExportFeedback(''), 5000);
    } finally {
      setIsExportingPptx(false);
    }
  };

  const activeBulanObj = BULAN_LIST.find((b) => b.no === activeMonthNum);
  const currentSlideProgram = filteredPrograms[currentSlideIndex] || null;

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* 1. TOP BAR PRESENTASI & CONTROLS */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black tracking-tight text-white">
                  Dashboard Presentasi Rapat &amp; Evaluasi Proker
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase">
                  Mode Dewan / Rapat Pleno
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Penyajian program kerja bulan <strong>{selectedMonth === 'all' ? 'Semua Bulan' : activeBulanObj?.nama} {selectedYear !== 'all' ? selectedYear : '2026/2027'}</strong> lengkap dengan realisasi dan hasil evaluasi yang telah diinput Seksi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            {/* Switcher Layout: Grid vs Slide Deck */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLayoutMode('grid')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  layoutMode === 'grid'
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Tampilkan semua kartu program dalam kisi lebar untuk presentasi"
              >
                <span>📋</span>
                <span>Katalog Kartu</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('slide')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  layoutMode === 'slide'
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Tampilan Slide per Program untuk proyektor (Gunakan panah kiri/kanan)"
              >
                <span>📽️</span>
                <span>Slide Deck ({filteredPrograms.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Layar Penuh untuk Proyektor"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4 text-emerald-400" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Cetak Salinan Presentasi Rapat"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            {/* Pilihan Unduh PPTX (2 Opsi: Laporan Evaluasi atau Program Saja) */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                disabled={isExportingPptx || filteredPrograms.length === 0}
                onClick={() => setActivePptxDropdown((prev) => (prev === 'top' ? null : 'top'))}
                className="h-9 px-3.5 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Pilih format unduhan PowerPoint (.pptx): Laporan Evaluasi atau Program Saja"
              >
                {isExportingPptx ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Membuat PPTX...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                    <span>Unduh PPTX</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-950 transition-transform ${
                        activePptxDropdown === 'top' ? 'rotate-180' : ''
                      }`}
                    />
                  </>
                )}
              </button>

              {activePptxDropdown === 'top' && (
                <div className="absolute right-0 mt-2 w-80 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl p-2 z-50 space-y-1.5 animate-in fade-in duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Pilih Jenis File PowerPoint (.pptx)
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadPptx('evaluasi')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 border border-transparent hover:border-emerald-200 flex items-start gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-900 block">
                        1. PPTX Laporan Evaluasi
                      </span>
                      <span className="text-[10.5px] text-slate-500 leading-snug block mt-0.5">
                        Lengkap dengan status keterlaksanaan, realisasi anggaran, hasil evaluasi &amp; catatan per program.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadPptx('program_saja')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-sky-50 border border-transparent hover:border-sky-200 flex items-start gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-900 block">
                        2. PPTX Program Saja (Tanpa Evaluasi)
                      </span>
                      <span className="text-[10.5px] text-slate-500 leading-snug block mt-0.5">
                        Hanya berisi daftar program kerja, tujuan, sasaran, jadwal &amp; pagu anggaran tanpa data evaluasi.
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {onClosePresentation && (
              <button
                type="button"
                onClick={onClosePresentation}
                className="h-9 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Banner ketika PPTX sukses didownload */}
        {exportFeedback && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-xs font-bold text-emerald-200 flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportFeedback}</span>
          </div>
        )}

        {/* CONTROLS BAR: BULAN, TAHUN, SEKSI, FILTER STATUS */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Slider 12 Bulan */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full no-scrollbar">
            <span className="text-[10px] font-bold uppercase text-slate-400 mr-1.5 shrink-0">Bulan:</span>
            <button
              type="button"
              onClick={() => onSelectMonth('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedMonth === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              Semua
            </button>
            {BULAN_LIST.map((b) => {
              const isSelected = selectedMonth === b.no;
              return (
                <button
                  key={b.no}
                  type="button"
                  onClick={() => onSelectMonth(b.no)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {b.singkatan}
                </button>
              );
            })}
          </div>

          {/* Filter Baris Kedua: Tahun, Seksi & Pencarian */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tahun */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs font-bold">
              {(['all', 2026, 2027] as const).map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => onSelectYear(yr)}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    selectedYear === yr
                      ? 'bg-emerald-600 text-white font-black'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {yr === 'all' ? 'Semua Thn' : yr}
                </button>
              ))}
            </div>

            {/* Filter Seksi */}
            <div className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSeksi}
                onChange={(e) => onSelectSeksi(e.target.value)}
                className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[170px]"
              >
                <option value="all">Semua Seksi ({MASTER_DIVISIONS.length})</option>
                {MASTER_DIVISIONS.map((d) => (
                  <option key={d.id} value={d.nama}>
                    {d.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Pencarian */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari program / seksi..."
                className="pl-8 pr-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-44"
              />
            </div>
          </div>
        </div>

        {/* FILTER STATUS EVALUASI: PILIHAN UTK DIPRESENTASIKAN */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Tampilkan:</span>

          <button
            type="button"
            onClick={() => setEvaluasiFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              evaluasiFilter === 'all'
                ? 'bg-white text-slate-950 font-black shadow-xs'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>Semua Program Bulan Ini</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200">
              {summaryStats.totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEvaluasiFilter('sudah_evaluasi')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              evaluasiFilter === 'sudah_evaluasi'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-800/80 text-emerald-300 hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sudah Dievaluasi</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300">
              {summaryStats.countTerlaksana + summaryStats.countTidakTerlaksana + summaryStats.countPerubahanWaktu}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEvaluasiFilter('terlaksana')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              evaluasiFilter === 'terlaksana'
                ? 'bg-emerald-400 text-slate-950 font-black shadow-xs'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>✓ Terlaksana</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-900 text-emerald-200">
              {summaryStats.countTerlaksana}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEvaluasiFilter('terlaksana_sebagian')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              evaluasiFilter === 'terlaksana_sebagian'
                ? 'bg-teal-400 text-slate-950 font-black shadow-xs'
                : 'bg-slate-800/80 text-teal-300 hover:bg-slate-800'
            }`}
          >
            <span>✓ Terlaksana Sebagian</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-950 text-teal-300">
              {summaryStats.countTerlaksanaSebagian}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEvaluasiFilter('belum_terlaksana')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              evaluasiFilter === 'belum_terlaksana'
                ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                : 'bg-slate-800/80 text-amber-300 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Belum Terlaksana / Belum Lapor</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300">
              {summaryStats.countBelumTerlaksana}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEvaluasiFilter('perubahan_waktu')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              evaluasiFilter === 'perubahan_waktu'
                ? 'bg-blue-400 text-slate-950 font-black shadow-xs'
                : 'bg-slate-800/80 text-blue-300 hover:bg-slate-800'
            }`}
          >
            <span>⏳ Perubahan Waktu</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-950 text-blue-300">
              {summaryStats.countPerubahanWaktu}
            </span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE SUMMARY METRICS BANNER FOR COUNCIL / BOARDROOM */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Metric 1: Total Program Terjadwal */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10.5px] font-bold uppercase tracking-wider">
              Total Program Terjadwal
            </span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900">
            {summaryStats.totalCount}{' '}
            <span className="text-xs font-semibold text-slate-500">Kegiatan</span>
          </p>
          <p className="text-[10.5px] text-slate-500 font-medium">
            Bulan {selectedMonth === 'all' ? 'Sepanjang Tahun' : activeBulanObj?.nama}
          </p>
        </div>

        {/* Metric 2: Sudah Terlaksana & Selesai */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 p-3.5 rounded-2xl border border-emerald-300 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10.5px] font-bold uppercase tracking-wider">
              Terlaksana &amp; Dievaluasi
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-950">
            {summaryStats.countTerlaksana}{' '}
            <span className="text-xs font-semibold text-emerald-700">
              ({summaryStats.persentaseKeterlaksanaan}%)
            </span>
          </p>
          <p className="text-[10.5px] text-emerald-800 font-bold">
            Selesai dilaporkan oleh Seksi
          </p>
        </div>

        {/* Metric 3: Belum Terlaksana */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-3.5 rounded-2xl border border-amber-300 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10.5px] font-bold uppercase tracking-wider">
              Keterangan: Belum Terlaksana
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-950">
            {summaryStats.countBelumTerlaksana}{' '}
            <span className="text-xs font-semibold text-amber-800">Kegiatan</span>
          </p>
          <p className="text-[10.5px] text-amber-800 font-medium">
            Perlu konfirmasi jadwal seksi
          </p>
        </div>

        {/* Metric 4: Pagu Anggaran Rencana */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10.5px] font-bold uppercase tracking-wider">
              Pagu Anggaran Rencana
            </span>
            <DollarSign className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 truncate">
            {formatRupiah(summaryStats.totalPagu)}
          </p>
          <p className="text-[10.5px] text-slate-500 font-medium truncate">
            Alokasi kebutuhan kas
          </p>
        </div>

        {/* Metric 5: Realisasi Biaya Terpakai */}
        <div className="bg-gradient-to-br from-indigo-50 to-slate-50 p-3.5 rounded-2xl border border-indigo-200 shadow-2xs space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-indigo-900">
            <span className="text-[10.5px] font-bold uppercase tracking-wider">
              Realisasi Dana Terpakai
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-indigo-950 truncate">
            {formatRupiah(summaryStats.totalRealisasi)}
          </p>
          <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
            <span>Sisa Saldo:</span>
            <span className={summaryStats.sisaAnggaran < 0 ? "font-black text-rose-600" : "font-extrabold text-emerald-700"}>
              {formatRupiah(summaryStats.sisaAnggaran)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. TAMPILAN PRESENTASI: SLIDE DECK MODE ATAU KATALOG KARTU */}
      {filteredPrograms.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <HelpCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-800">
            Tidak ada program kerja yang sesuai filter presentasi ini
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Coba ubah pilihan bulan, reset filter status evaluasi, atau ketik kata kunci pencarian yang lain.
          </p>
          <button
            type="button"
            onClick={() => {
              setEvaluasiFilter('all');
              setSearchQuery('');
              onSelectMonth('all');
              onSelectSeksi('all');
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : layoutMode === 'slide' ? (
        /* ======================================================== */
        /* MODE SLIDE DECK: 1 PROGRAM PER SLIDE LEBAR PROYEKTOR */
        /* ======================================================== */
        currentSlideProgram && (
          <>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden space-y-0 transition-all print:hidden">
              {/* Top Slide Navigation Bar */}
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    SLIDE {currentSlideIndex + 1} / {filteredPrograms.length}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-xs text-slate-300 font-semibold truncate max-w-xs sm:max-w-md">
                    {currentSlideProgram.penanggungjawab?.divisi}
                  </span>
                </div>

                {/* Prev / Next & Action Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Cetak Salinan Presentasi Rapat"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-300" />
                    <span className="hidden md:inline">Cetak</span>
                  </button>

                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={isExportingPptx || filteredPrograms.length === 0}
                      onClick={() => setActivePptxDropdown((prev) => (prev === 'slide' ? null : 'slide'))}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      title="Pilih format unduhan PowerPoint (.pptx)"
                    >
                      {isExportingPptx ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                      <span className="hidden sm:inline">{isExportingPptx ? 'Proses...' : 'Unduh PPTX'}</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          activePptxDropdown === 'slide' ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {activePptxDropdown === 'slide' && (
                      <div className="absolute right-0 mt-2 w-76 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl p-2 z-50 space-y-1.5 animate-in fade-in duration-150">
                        <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          Pilih Jenis File PPTX
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadPptx('evaluasi')}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 border border-transparent hover:border-emerald-200 flex items-start gap-2.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-black text-slate-900 block">
                              1. PPTX Laporan Evaluasi
                            </span>
                            <span className="text-[10.5px] text-slate-500 block">
                              Termasuk realisasi, status &amp; catatan evaluasi.
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadPptx('program_saja')}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-sky-50 border border-transparent hover:border-sky-200 flex items-start gap-2.5 transition-colors cursor-pointer"
                        >
                          <ClipboardList className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-black text-slate-900 block">
                              2. PPTX Program Saja (Tanpa Evaluasi)
                            </span>
                            <span className="text-[10.5px] text-slate-500 block">
                              Hanya rencana program, jadwal &amp; anggaran.
                            </span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="h-4 w-px bg-slate-700 mx-0.5 hidden sm:block" />

                  <button
                    type="button"
                    disabled={currentSlideIndex === 0}
                    onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="Slide Sebelumnya (Panah Kiri)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Sebelumnya</span>
                  </button>
                  <button
                    type="button"
                    disabled={currentSlideIndex === filteredPrograms.length - 1}
                    onClick={() =>
                      setCurrentSlideIndex((prev) => Math.min(filteredPrograms.length - 1, prev + 1))
                    }
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="Slide Berikutnya (Panah Kanan / Spasi)"
                  >
                    <span className="hidden sm:inline">Berikutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Slide Body: Large Format Presentation Canvas */}
              <SlideCardDetail
                program={currentSlideProgram}
                targetMonth={activeMonthNum}
                selectedMonth={selectedMonth}
                onOpenEvaluasi={onOpenEvaluasi}
                onOpenProgramDetail={onOpenProgramDetail}
                isFullSlide
              />
            </div>

            {/* Printable Complete Slide Deck (Hanya muncul saat dicetak ke kertas/PDF via browser) */}
            <div className="hidden print:block space-y-6">
              <div className="pb-3 border-b-2 border-slate-900 mb-6">
                <h1 className="text-xl font-black text-slate-900 uppercase">
                  Laporan Presentasi Rapat &amp; Evaluasi Program Kerja
                </h1>
                <p className="text-xs text-slate-600 mt-1 font-semibold">
                  Bulan: {selectedMonth === 'all' ? 'Sepanjang Tahun' : activeBulanObj?.nama} {selectedYear !== 'all' ? selectedYear : '2026/2027'} · {selectedSeksi === 'all' ? 'Semua Seksi' : selectedSeksi}
                </p>
              </div>
              {filteredPrograms.map((p, idx) => (
                <div key={p.id} className="border border-slate-300 rounded-2xl p-4 bg-white mb-6 break-inside-avoid">
                  <div className="text-[10px] font-black text-emerald-800 uppercase mb-2">
                    Slide {idx + 1} / {filteredPrograms.length} · {p.penanggungjawab?.divisi}
                  </div>
                  <SlideCardDetail
                    program={p}
                    targetMonth={activeMonthNum}
                    selectedMonth={selectedMonth}
                    onOpenEvaluasi={onOpenEvaluasi}
                    onOpenProgramDetail={onOpenProgramDetail}
                    isFullSlide
                  />
                </div>
              ))}
            </div>
          </>
        )
      ) : (
        /* ======================================================== */
        /* MODE KATALOG KARTU LEBAR (GRID FOR PROJECTION & MEETING) */
        /* ======================================================== */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Menampilkan <strong>{filteredPrograms.length}</strong> program kerja siap dipresentasikan:
            </span>
            <span className="font-semibold text-slate-700">
              💡 Klik tombol <strong>"Buka Evaluasi"</strong> pada kartu untuk melihat atau memperbarui evaluasi
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredPrograms.map((program, idx) => (
              <SlideCardDetail
                key={program.id}
                program={program}
                targetMonth={activeMonthNum}
                selectedMonth={selectedMonth}
                onOpenEvaluasi={onOpenEvaluasi}
                onOpenProgramDetail={onOpenProgramDetail}
                indexNumber={idx + 1}
                isFullSlide={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ======================================================== */
/* SUB-KOMPONEN KARTU DETAIL PRESENTASI RAPI & INFORMATIF */
/* ======================================================== */
interface SlideCardDetailProps {
  program: ProgramKerja;
  targetMonth: number;
  selectedMonth: number | 'all';
  onOpenEvaluasi: (program: ProgramKerja, targetMonth?: number) => void;
  onOpenProgramDetail?: (programId: string) => void;
  indexNumber?: number;
  isFullSlide?: boolean;
}

const SlideCardDetail: React.FC<SlideCardDetailProps> = ({
  program,
  targetMonth,
  selectedMonth,
  onOpenEvaluasi,
  onOpenProgramDetail,
  indexNumber,
  isFullSlide = false,
}) => {
  const summary = getProgramExecutionSummary(program, selectedMonth);
  const ev = getLatestEvaluasi(program, selectedMonth);
  const alokasiBulanIni = selectedMonth === 'all' ? (program.estimasiAnggaran || 0) : getAlokasiBudgetBulanan(program, targetMonth);
  const detailPagu = getDetailPaguBulanan(program, targetMonth);

  const isSebagian = summary.overallStatus === 'terlaksana_sebagian';
  const isPenuh = selectedMonth === 'all' && summary.overallStatus === 'terlaksana_penuh';
  const isBulanIniTerlaksana = isPenuh || ev?.statusKeterlaksanaan === 'terlaksana';
  const isTidakTerlaksana =
    !isSebagian &&
    (typeof selectedMonth === 'number'
      ? ev?.statusKeterlaksanaan === 'tidak_terlaksana'
      : summary.overallStatus === 'tidak_terlaksana');
  const isPerubahanWaktu =
    !isSebagian &&
    (typeof selectedMonth === 'number'
      ? ev?.statusKeterlaksanaan === 'perubahan_waktu'
      : summary.overallStatus === 'perubahan_waktu');

  const isMultiOrMonthly =
    isProgramBerulang(program) ||
    summary.scheduledMonths.length > 1 ||
    program.tipeJadwal === 'sepanjang_tahun' ||
    Object.keys(program.evaluasiBulanan || {}).length > 0;

  const jadwalStr =
    typeof selectedMonth === 'number' && program.jadwalBulanan?.[targetMonth]
      ? program.jadwalBulanan[targetMonth]
      : program.tanggalSpesifik ||
        (program.tipeJadwal === 'akan_ditentukan' && (!Array.isArray(program.bulanPelaksanaan) || program.bulanPelaksanaan.length === 0)
          ? 'Jadwal akan ditentukan kemudian'
          : Array.isArray(program.bulanPelaksanaan) && program.bulanPelaksanaan.length > 0
          ? program.bulanPelaksanaan.map((m) => BULAN_LIST[m - 1]?.nama || `Bulan ${m}`).join(', ')
          : selectedMonth === 'all'
          ? 'Jadwal akan ditentukan kemudian'
          : `Bulan ${BULAN_LIST[targetMonth - 1]?.nama || targetMonth}`);

  const katInfo = getKategoriProgramInfo(program.kategoriProgram);

  return (
    <div
      className={`bg-white rounded-2xl border transition-all ${
        isFullSlide
          ? 'p-6 sm:p-8 space-y-6'
          : 'p-5 sm:p-6 border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 space-y-4'
      }`}
    >
      {/* 1. Header Kartu: Judul Program, Unit Seksi, & Status Keterlaksanaan */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {indexNumber !== undefined && (
              <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                #{indexNumber}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-50 text-indigo-900 border border-indigo-200 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>{program.penanggungjawab?.divisi}</span>
            </span>
            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${katInfo.badge}`}>
              <span>{katInfo.iconEmoji}</span> {katInfo.label}
            </span>
            {program.isLuarRancangan && (
              <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3 h-3 text-amber-700" />
                <span>Insidental (Luar Rancangan)</span>
              </span>
            )}
            <span className="text-xs text-slate-400 font-semibold">Tahun {program.tahun}</span>

            {/* Catatan Dewan Pastoral Paroki 2027 jika ada */}
            {program.tahun === 2027 && program.catatanPastorParoki && (
              <span
                className={`px-2 py-0.5 rounded-lg text-xs font-black border flex items-center gap-1 shadow-2xs ${
                  program.catatanPastorParoki.statusPersetujuan === 'disetujui'
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : program.catatanPastorParoki.statusPersetujuan === 'disetujui_dengan_catatan'
                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                    : program.catatanPastorParoki.statusPersetujuan === 'perlu_revisi'
                    ? 'bg-orange-100 text-orange-950 border-orange-300'
                    : 'bg-rose-100 text-rose-950 border-rose-300'
                }`}
              >
                <span>⛪ DPP:</span>
                <span className="capitalize">
                  {program.catatanPastorParoki.statusPersetujuan === 'ditolak'
                    ? 'Ditolak (Batal Masuk Final)'
                    : program.catatanPastorParoki.statusPersetujuan.replace(/_/g, ' ')}
                </span>
              </span>
            )}
          </div>

          <h3
            className={`font-black tracking-tight leading-snug ${
              program.tahun === 2027 && program.catatanPastorParoki?.statusPersetujuan === 'ditolak'
                ? 'text-rose-950 line-through decoration-rose-400'
                : 'text-slate-900'
            } ${
              isFullSlide ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
            }`}
          >
            {program.namaProgram}
          </h3>

          {program.tujuanKegiatan && (
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-3xl">
              <strong>Tujuan:</strong> {program.tujuanKegiatan}
            </p>
          )}

          {/* Catatan Khusus Dewan Pastoral Paroki 2027 */}
          {program.tahun === 2027 && program.catatanPastorParoki?.catatan && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-start gap-2 max-w-3xl border ${
                program.catatanPastorParoki.statusPersetujuan === 'ditolak'
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : 'bg-amber-50/90 border border-amber-300 text-amber-950'
              }`}
            >
              <span className="font-black text-amber-900 shrink-0">⛪ Catatan Dewan Pastoral Paroki:</span>
              <p className="italic leading-relaxed font-medium">"{program.catatanPastorParoki.catatan}"</p>
            </div>
          )}
        </div>

        {/* Status Badge & Aksi Cepat */}
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          {/* Status Label Rapi: Menangani Keterlaksanaan Sebagian */}
          {isSebagian ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-teal-50 text-teal-950 border-2 border-teal-400 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>✓ Terlaksana Sebagian</span>
            </div>
          ) : isPenuh || isBulanIniTerlaksana ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-300 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>✓ Terlaksana &amp; Selesai</span>
            </div>
          ) : isTidakTerlaksana ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-950 border border-rose-300 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>✕ Tidak Terlaksana</span>
            </div>
          ) : isPerubahanWaktu ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-950 border border-blue-300 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>⏳ Perubahan Waktu</span>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950 border-2 border-amber-400 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>⚠️ Keterangan: Belum Terlaksana</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenEvaluasi(program, targetMonth)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Buka form atau rincian evaluasi program ini"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Buka Evaluasi</span>
            </button>

            {onOpenProgramDetail && (
              <button
                type="button"
                onClick={() => onOpenProgramDetail(program.id)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Lihat rencana awal rancangan program"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rencana Awal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Grid Rincian: Jadwal, Tempat, Pagu vs Realisasi */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Box 1: Jadwal Pelaksanaan */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
            Jadwal Rencana:
          </span>
          <p className="font-extrabold text-slate-900 flex items-center gap-1 truncate" title={jadwalStr}>
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{jadwalStr}</span>
          </p>
          {program.modeTanggal && (
            <span className="text-[10px] text-slate-400 block">
              Mode: {program.modeTanggal.replace('_', ' ')}
            </span>
          )}
        </div>

        {/* Box 2: Sasaran Umat / Peserta */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
            Target Sasaran:
          </span>
          <p className="font-extrabold text-slate-900 truncate">
            {program.targetSasaran || 'Seluruh Umat Paroki'}
          </p>
          <span className="text-[10px] text-slate-400 block truncate">
            PJ: {program.penanggungjawab?.nama || 'Pengurus Seksi'}
          </span>
        </div>

        {/* Box 3: Pagu Anggaran Proker */}
        <div
          className={`p-3 rounded-xl border space-y-0.5 ${
            detailPagu.isMinus
              ? 'bg-rose-50/90 border-rose-300'
              : detailPagu.isMultiMonthCarryover
              ? 'bg-emerald-50/70 border-emerald-300'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wide block text-slate-500">
            {detailPagu.isMinus
              ? '⚠️ Pagu Minus / Defisit:'
              : detailPagu.isMultiMonthCarryover
              ? 'Sisa Total Pagu Bulan Ini:'
              : 'Pagu Bulan Ini / Tahunan:'}
          </span>
          <p className={`font-extrabold ${detailPagu.isMinus ? 'text-rose-600 font-black' : 'text-slate-900'}`}>
            {formatRupiah(alokasiBulanIni)}
          </p>
          <span className="text-[10px] text-slate-500 block">
            {detailPagu.isMultiMonthCarryover && detailPagu.terpakaiSebelumnya > 0
              ? `Total: ${formatRupiah(program.estimasiAnggaran)} • Terpakai lalu: ${formatRupiah(detailPagu.terpakaiSebelumnya)}`
              : `Total Pagu: ${formatRupiah(program.estimasiAnggaran)}`}
          </span>
        </div>

        {/* Box 4: Realisasi Anggaran Terpakai */}
        <div
          className={`p-3 rounded-xl border space-y-0.5 ${
            isBulanIniTerlaksana || isSebagian
              ? 'bg-emerald-50/80 border-emerald-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wide block text-slate-600">
            Realisasi Anggaran Terpakai:
          </span>
          <p className="font-extrabold text-slate-900">
            {isBulanIniTerlaksana && typeof ev?.anggaranTerpakai === 'number'
              ? formatRupiah(ev.anggaranTerpakai)
              : summary.totalRealisasiTerpakai > 0
              ? formatRupiah(summary.totalRealisasiTerpakai)
              : 'Rp 0'}
          </p>
          <span className="text-[10px] font-semibold text-slate-500 block">
            {isBulanIniTerlaksana && typeof ev?.anggaranTerpakai === 'number' ? (
              (() => {
                const sisa = alokasiBulanIni - ev.anggaranTerpakai;
                return sisa < 0 ? (
                  <span className="text-rose-600 font-black">Defisit: {formatRupiah(sisa)}</span>
                ) : (
                  <span>Sisa / Efisiensi: {formatRupiah(sisa)}</span>
                );
              })()
            ) : isSebagian ? (
              <span>Total realisasi semua bulan</span>
            ) : (
              'Belum ada pengeluaran dicatat'
            )}
          </span>
        </div>
      </div>

      {/* 3. BAGIAN HASIL EVALUASI YANG SUDAH DIINPUT OLEH SEKSI */}
      <div className="pt-2">
        {isSebagian ? (
          /* TAMPILAN KHUSUS TERLAKSANA SEBAGIAN DENGAN CATATAN BULAN BELUM TERLAKSANA */
          <div className="p-4 rounded-2xl bg-teal-50/70 border-2 border-teal-300 space-y-3">
            <div className="flex items-center justify-between border-b border-teal-200/90 pb-2">
              <span className="text-xs font-black text-teal-950 flex items-center gap-1.5 uppercase tracking-wide">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                <span>Status: Program Sudah Terlaksana Sebagian</span>
              </span>
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-teal-200 text-teal-950">
                {summary.terlaksanaMonths.length} dari {summary.scheduledMonths.length} Jadwal Selesai
              </span>
            </div>

            {/* Grid Komparasi Bulan Selesai vs Bulan Belum Terlaksana */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-teal-200 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1 text-[10.5px] font-black uppercase text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bulan yang Sudah Terlaksana:</span>
                </div>
                <p className="font-extrabold text-slate-900 text-sm">
                  {summary.catatanBulanSudahTerlaksana || 'Belum ada bulan terlaksana'}
                </p>
                <span className="text-[10px] text-emerald-700 font-bold block">
                  Total dana terserap: {formatRupiah(summary.totalRealisasiTerpakai)}
                </span>
              </div>

              <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-300 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1 text-[10.5px] font-black uppercase text-amber-900">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Bulan yang Masih Berjalan / Belum Terlaksana:</span>
                </div>
                <p className="font-extrabold text-amber-950 text-sm">
                  {summary.catatanBulanBelumTerlaksana || 'Tidak ada (seluruh jadwal telah dievaluasi)'}
                </p>
                <span className="text-[10px] text-amber-800 font-medium block">
                  {summary.catatanBulanBelumTerlaksana ? 'Menunggu pelaksanaan sesuai jadwal paroki' : 'Seluruh bulan terjadwal telah dilaporkan'}
                </span>
              </div>
            </div>

            {/* DAFTAR BULAN YANG TIDAK TERLAKSANA BESERTA ALASANNYA */}
            {summary.rincianTidakTerlaksana && summary.rincianTidakTerlaksana.length > 0 && (
              <div className="bg-rose-50/90 p-3 rounded-xl border border-rose-300 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-rose-900">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Bulan yang Tidak Terlaksana Beserta Alasannya ({summary.rincianTidakTerlaksana.length} Bulan):</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {summary.rincianTidakTerlaksana.map((item) => (
                    <div key={item.bulan} className="p-2 rounded-lg bg-white/90 border border-rose-200">
                      <div className="font-extrabold text-rose-950">
                        • Bulan {item.namaBulan}:
                      </div>
                      <p className="text-slate-800 text-xs mt-0.5">
                        <strong>Alasan:</strong> {item.alasan || 'Tidak ada alasan dicantumkan'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Penjelasan Hasil Pelaksanaan Terakhir jika ada */}
            {ev?.penjelasanKegiatan && (
              <div className="bg-white p-3 rounded-xl border border-teal-200 space-y-1 text-xs">
                <span className="text-[10.5px] font-bold text-slate-600 block">
                  Uraian Hasil Pelaksanaan Terakhir (Pelapor: {ev.evaluator || 'Pengurus Seksi'}):
                </span>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {ev.penjelasanKegiatan}
                </p>
              </div>
            )}
          </div>
        ) : (isBulanIniTerlaksana || isPenuh) ? (
          /* TAMPILAN RAPI EVALUASI SUDAH TERLAKSANA BULAN INI / SELESAI PENUH */
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
              <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Laporan Evaluasi Pelaksanaan dari Seksi:</span>
              </span>
              {ev?.evaluator && (
                <span className="text-[11px] font-bold text-emerald-800">
                  Pelapor: {ev.evaluator} {ev.tanggalEvaluasi ? `(${formatIndonesianDate(ev.tanggalEvaluasi)})` : ''}
                </span>
              )}
            </div>

            {/* Catatan jika ada jadwal bulan lain yang belum terlaksana */}
            {summary.belumTerlaksanaMonths.length > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Catatan Jadwal Berikutnya:</strong> Kegiatan ini masih memiliki jadwal lanjutan di: <strong>{summary.catatanBulanBelumTerlaksana}</strong>.
                </span>
              </div>
            )}

            {/* Rincian Realisasi: Tanggal, Tempat, Jumlah Kehadiran */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-slate-500 font-bold block">Tanggal Pelaksanaan Riil:</span>
                <strong className="text-slate-900">
                  {ev?.tanggalPelaksanaan ? formatIndonesianDate(ev.tanggalPelaksanaan) : 'Sesuai Jadwal'}
                </strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-slate-500 font-bold block">Tempat Pelaksanaan:</span>
                <strong className="text-slate-900">
                  {ev?.tempatPelaksanaan || 'Lokasi Gereja / Paroki'}
                </strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-slate-500 font-bold block">Kehadiran / Peserta:</span>
                <strong className="text-slate-900">
                  {ev?.jumlahPeserta || 'Tercatat sesuai target'}
                </strong>
              </div>
            </div>

            {/* Penjelasan Pelaksanaan Kegiatan */}
            {ev?.penjelasanKegiatan && (
              <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-1 text-xs">
                <span className="text-[10.5px] font-bold text-slate-600 block">
                  Uraian &amp; Hasil Pelaksanaan:
                </span>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {ev.penjelasanKegiatan}
                </p>
              </div>
            )}

            {/* Lampiran Dokumen jika ada */}
            {ev?.dokumentasi && ev.dokumentasi.length > 0 && (
              <div className="text-xs space-y-1">
                <span className="text-[10.5px] font-bold text-slate-600">Dokumentasi Terlampir:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {ev.dokumentasi.map((dok, dIdx) => (
                    <span
                      key={dIdx}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1"
                    >
                      <span>📎</span>
                      <span>{dok.nama}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : isTidakTerlaksana ? (
          /* TAMPILAN RAPI TIDAK TERLAKSANA */
          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-300 space-y-2 text-xs">
            <div className="flex items-center justify-between font-black text-rose-950 uppercase tracking-wide">
              <span className="flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Keterangan: Program Tidak Terlaksana</span>
              </span>
              {ev?.evaluator && <span className="text-[10.5px] font-normal">Pelapor: {ev.evaluator}</span>}
            </div>
            {summary.rincianTidakTerlaksana.length > 0 ? (
              <div className="space-y-1.5">
                {summary.rincianTidakTerlaksana.map((item) => (
                  <div key={item.bulan} className="bg-white p-2.5 rounded-xl border border-rose-200">
                    <span className="font-extrabold text-rose-950">• Bulan {item.namaBulan}: </span>
                    <span className="text-rose-900 font-medium">{item.alasan || 'Tidak ada alasan dicantumkan'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-3 rounded-xl border border-rose-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 font-bold block">Alasan Ditiadakan:</span>
                <p className="text-rose-900 font-medium leading-relaxed">
                  {ev?.alasanTidakTerlaksana?.trim() || 'Tidak ada alasan dicantumkan'}
                </p>
              </div>
            )}
          </div>
        ) : isPerubahanWaktu && ev ? (
          /* TAMPILAN RAPI PERUBAHAN WAKTU */
          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-300 space-y-2 text-xs">
            <div className="flex items-center justify-between font-black text-blue-950 uppercase tracking-wide">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Keterangan: Terjadi Perubahan Waktu Pelaksanaan</span>
              </span>
              {ev.evaluator && <span className="text-[10.5px] font-normal">Pelapor: {ev.evaluator}</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-white p-2.5 rounded-xl border border-blue-200">
                <span className="text-[10px] text-slate-500 font-bold block">Jadwal Baru yang Direncanakan:</span>
                <strong className="text-blue-950">{ev.jadwalBaru || 'Akan ditentukan kemudian'}</strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-blue-200">
                <span className="text-[10px] text-slate-500 font-bold block">Alasan Penggeseran Waktu:</span>
                <p className="text-slate-800 font-medium">{ev.alasanPerubahanWaktu || 'Tidak ada alasan dicantumkan'}</p>
              </div>
            </div>
          </div>
        ) : (
          /* TAMPILAN JIKA BELUM TERLAKSANA / BELUM DIISI OLEH SEKSI */
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-amber-950">
                    {summary.rincianTidakTerlaksana.length > 0
                      ? 'Keterangan: Belum Terlaksana (Sebagian Bulan Dibatalkan)'
                      : 'Keterangan: Belum Terlaksana'}
                  </h4>
                  <p className="text-[11px] text-amber-900/80 font-medium leading-relaxed mt-0.5">
                    Program kerja ini belum memiliki bulan yang terlaksana atau belum ada laporan pelaksanaan dari <strong>{program.penanggungjawab?.divisi}</strong>.
                  </p>
                  {summary.catatanBulanBelumTerlaksana && (
                    <p className="text-[10.5px] text-amber-950 font-bold mt-1">
                      Jadwal belum terlaksana: {summary.catatanBulanBelumTerlaksana}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenEvaluasi(program, targetMonth)}
                className="px-3.5 py-1.5 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                <span>Input Evaluasi Sekarang</span>
              </button>
            </div>

            {summary.rincianTidakTerlaksana.length > 0 && (
              <div className="bg-rose-50/90 p-3 rounded-xl border border-rose-300 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-rose-900">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Bulan yang Tidak Terlaksana Beserta Alasannya ({summary.rincianTidakTerlaksana.length} Bulan):</span>
                </div>
                <div className="space-y-1 text-xs">
                  {summary.rincianTidakTerlaksana.map((item) => (
                    <div key={item.bulan} className="p-2 rounded-lg bg-white/90 border border-rose-200">
                      <span className="font-extrabold text-rose-950">• Bulan {item.namaBulan}: </span>
                      <span className="text-rose-900 italic">{item.alasan || 'Tidak ada alasan dicantumkan'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LAPORAN & CATATAN EVALUASI PER BULAN (Khusus program rutin / bulanan / multi-bulan) */}
        {isMultiOrMonthly && summary.scheduledMonths.length > 0 && (
          <div className="mt-3 p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Laporan &amp; Catatan Evaluasi Per Bulan ({summary.scheduledMonths.length} Jadwal)</span>
              </span>
              <span className="text-[10.5px] font-bold text-slate-600">
                Terlaksana: {summary.terlaksanaMonths.length} Bln · Total Realisasi: {formatRupiah(summary.totalRealisasiTerpakai)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {summary.scheduledMonths.map((m) => {
                const evM = getEvaluasiForMonth(program, m);
                const bNama = BULAN_LIST[m - 1]?.nama || `Bulan ${m}`;
                const st = evM?.statusKeterlaksanaan;
                const isDone = st === 'terlaksana';
                const isCancel = st === 'tidak_terlaksana';
                const isShift = st === 'perubahan_waktu';
                const noteMonth =
                  isDone
                    ? evM?.penjelasanKegiatan || evM?.tempatPelaksanaan || 'Terlaksana sesuai jadwal'
                    : isCancel
                    ? evM?.alasanTidakTerlaksana?.trim() || 'Tidak ada alasan dicantumkan'
                    : isShift
                    ? `${evM?.jadwalBaru ? `Jadwal baru: ${evM.jadwalBaru}. ` : ''}${evM?.alasanPerubahanWaktu || ''}`.trim() || 'Jadwal digeser'
                    : program.catatanBulanan?.[m] || 'Belum ada laporan evaluasi';

                return (
                  <div
                    key={m}
                    className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                      isDone
                        ? 'bg-emerald-50/80 border-emerald-200'
                        : isCancel
                        ? 'bg-rose-50/80 border-rose-200'
                        : isShift
                        ? 'bg-blue-50/80 border-blue-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 font-extrabold">
                      <span className="text-slate-900">{bNama}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9.5px] font-black ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-900'
                            : isCancel
                            ? 'bg-rose-100 text-rose-900'
                            : isShift
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {isDone ? '✓ Terlaksana' : isCancel ? '✕ Batal' : isShift ? '⏳ Geser' : '• Belum'}
                      </span>
                    </div>
                    {isDone && typeof evM?.anggaranTerpakai === 'number' && (
                      <div className="text-[10px] font-bold text-emerald-800">
                        Realisasi: {formatRupiah(evM.anggaranTerpakai)}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-600 line-clamp-2 italic" title={noteMonth}>
                      {noteMonth}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
