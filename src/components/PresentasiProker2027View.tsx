import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Presentation,
  BarChart3,
  FileDown,
  Maximize2,
  Minimize2,
  Printer,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Building2,
  DollarSign,
  Search,
  Lock,
  KeyRound,
  Layers,
  Calendar,
  Users,
  Loader2,
  Eye,
  TrendingUp,
  Tag,
  Church,
  FileText,
  Sparkles,
} from 'lucide-react';
import { ProgramKerja, StatusPersetujuanPastor } from '../types/proker';
import { AuthSession } from '../types/auth';
import {
  BULAN_LIST,
  formatRupiah,
  formatCompactRupiah,
  isDivisionMatch,
  isProgramAktifDiBulan,
  isProgramDisetujuiFinal,
  getDetailPaguBulanan,
  getKategoriProgramInfo,
  getTipeJadwalLabel,
  getDivisionOrder,
  normalizeDivisionName,
  sortProgramsSystematically,
  getAuthRoleFileSlug,
} from '../utils/formatters';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';
import { exportProker2027ToPptx } from '../utils/pptxExport';

interface PresentasiProker2027ViewProps {
  programs: ProgramKerja[];
  authSession: AuthSession | null;
  onOpenProgramDetail?: (programId: string) => void;
  onNavigateToDashboard?: () => void;
}

type ApprovalFilter2027 = 'final_aktif' | 'disetujui_only' | 'semua';
type ViewMode2027 = 'overview' | 'slide';

function getDppBadge(status?: StatusPersetujuanPastor) {
  switch (status) {
    case 'disetujui':
      return {
        label: 'Disetujui DPP',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        Icon: CheckCircle2,
      };
    case 'disetujui_dengan_catatan':
      return {
        label: 'Disetujui dgn Catatan',
        className: 'bg-teal-100 text-teal-800 border-teal-300',
        Icon: CheckCircle2,
      };
    case 'perlu_revisi':
      return {
        label: 'Perlu Revisi DPP',
        className: 'bg-amber-100 text-amber-800 border-amber-300',
        Icon: AlertTriangle,
      };
    case 'ditolak':
      return {
        label: 'Tidak Disetujui DPP',
        className: 'bg-rose-100 text-rose-800 border-rose-300',
        Icon: XCircle,
      };
    case 'menunggu_review':
    default:
      return {
        label: 'Menunggu Review DPP',
        className: 'bg-slate-100 text-slate-700 border-slate-300',
        Icon: Clock,
      };
  }
}

export const PresentasiProker2027View: React.FC<PresentasiProker2027ViewProps> = ({
  programs,
  authSession,
  onOpenProgramDetail,
  onNavigateToDashboard,
}) => {
  const isLockedToSeksi = authSession?.role === 'seksi';
  const [selectedSeksi, setSelectedSeksi] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter2027>('final_aktif');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode2027>('overview');
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [selectedChartMonth, setSelectedChartMonth] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isExportingPptx, setIsExportingPptx] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Kunci filter seksi secara otomatis jika user login sebagai Seksi tertentu
  const effectiveSeksi = useMemo(() => {
    if (isLockedToSeksi && authSession?.unitNama) {
      return authSession.unitNama;
    }
    return selectedSeksi;
  }, [isLockedToSeksi, authSession, selectedSeksi]);

  // Daftar Program Tahun 2027 setelah filter hak akses, seksi, persetujuan DPP, dan pencarian
  const filtered2027Programs = useMemo(() => {
    if (!authSession) return [];

    const q = searchQuery.trim().toLowerCase();
    const list = programs.filter((p) => {
      if (p.tahun !== 2027) return false;

      if (effectiveSeksi !== 'all' && !isDivisionMatch(p.penanggungjawab?.divisi, effectiveSeksi)) {
        return false;
      }

      if (approvalFilter === 'final_aktif') {
        if (!isProgramDisetujuiFinal(p)) return false;
      } else if (approvalFilter === 'disetujui_only') {
        const st = p.catatanPastorParoki?.statusPersetujuan;
        if (st !== 'disetujui' && st !== 'disetujui_dengan_catatan') return false;
      }

      if (q) {
        const matchesText =
          (p.namaProgram || '').toLowerCase().includes(q) ||
          (p.tujuanKegiatan || '').toLowerCase().includes(q) ||
          (p.targetSasaran || '').toLowerCase().includes(q) ||
          (p.penanggungjawab?.nama || '').toLowerCase().includes(q) ||
          (p.penanggungjawab?.divisi || '').toLowerCase().includes(q);
        if (!matchesText) return false;
      }

      return true;
    });

    return sortProgramsSystematically(list);
  }, [programs, authSession, effectiveSeksi, approvalFilter, searchQuery]);

  // Total anggaran 2027
  const totalAnggaran2027 = useMemo(() => {
    return filtered2027Programs.reduce((sum, p) => sum + (p.estimasiAnggaran || 0), 0);
  }, [filtered2027Programs]);

  // Hitung kebutuhan pendanaan setiap bulan (Januari - Desember 2027)
  const monthlyFundingData = useMemo(() => {
    return BULAN_LIST.map((b) => {
      let totalDana = 0;
      const activePrograms: Array<{
        program: ProgramKerja;
        alokasiBulan: number;
        catatan?: string;
        jadwal?: string;
      }> = [];

      filtered2027Programs.forEach((p) => {
        if (isProgramAktifDiBulan(p, b.no)) {
          const detail = getDetailPaguBulanan(p, b.no);
          const alokasi = detail.initialPlannedAlokasi;
          totalDana += alokasi;
          activePrograms.push({
            program: p,
            alokasiBulan: alokasi,
            catatan: p.catatanBulanan?.[b.no],
            jadwal: p.jadwalBulanan?.[b.no],
          });
        }
      });

      activePrograms.sort((a, bItem) => bItem.alokasiBulan - a.alokasiBulan);

      return {
        bulanNo: b.no,
        nama: b.nama,
        singkatan: b.singkatan,
        totalDana,
        activeCount: activePrograms.length,
        activePrograms,
      };
    });
  }, [filtered2027Programs]);

  const maxMonthlyDana = useMemo(() => {
    return Math.max(...monthlyFundingData.map((m) => m.totalDana), 1);
  }, [monthlyFundingData]);

  const peakMonth = useMemo(() => {
    return monthlyFundingData.reduce(
      (best, cur) => (cur.totalDana > best.totalDana ? cur : best),
      monthlyFundingData[0]
    );
  }, [monthlyFundingData]);

  const lowestActiveMonth = useMemo(() => {
    const nonZero = monthlyFundingData.filter((m) => m.totalDana > 0);
    if (nonZero.length === 0) return monthlyFundingData[0];
    return nonZero.reduce(
      (min, cur) => (cur.totalDana < min.totalDana ? cur : min),
      nonZero[0]
    );
  }, [monthlyFundingData]);

  const totalDistribusiBulanan = useMemo(() => {
    return monthlyFundingData.reduce((s, m) => s + m.totalDana, 0);
  }, [monthlyFundingData]);

  // Rekap per Seksi 2027
  const seksiBreakdown = useMemo(() => {
    const map: Record<
      string,
      { divisi: string; count: number; totalAnggaran: number; order: number }
    > = {};
    filtered2027Programs.forEach((p) => {
      const divName = normalizeDivisionName(p.penanggungjawab?.divisi || 'Seksi Umum');
      if (!map[divName]) {
        map[divName] = {
          divisi: divName,
          count: 0,
          totalAnggaran: 0,
          order: getDivisionOrder(divName),
        };
      }
      map[divName].count += 1;
      map[divName].totalAnggaran += p.estimasiAnggaran || 0;
    });
    return Object.values(map).sort((a, b) => a.order - b.order);
  }, [filtered2027Programs]);

  // Ringkasan Persetujuan DPP 2027
  const approvalStats = useMemo(() => {
    let disetujui = 0;
    let menungguRevisi = 0;
    let ditolak = 0;
    filtered2027Programs.forEach((p) => {
      const st = p.catatanPastorParoki?.statusPersetujuan || 'menunggu_review';
      if (st === 'disetujui' || st === 'disetujui_dengan_catatan') disetujui += 1;
      else if (st === 'ditolak') ditolak += 1;
      else menungguRevisi += 1;
    });
    return { disetujui, menungguRevisi, ditolak };
  }, [filtered2027Programs]);

  // Slide Deck structure:
  // 0 = Cover 2027
  // 1 = Ringkasan Eksekutif & Rekap Per Seksi 2027
  // 2 = Grafik (Chart) Keperluan Pendanaan Setiap Bulan 2027
  // 3 = Matriks Daftar Program Kerja & Anggaran 2027
  // 4 .. 4 + N - 1 = Slide Detail per Program Kerja 2027
  const totalSlides = 4 + filtered2027Programs.length;

  useEffect(() => {
    if (currentSlideIndex >= totalSlides) {
      setCurrentSlideIndex(0);
    }
  }, [totalSlides, currentSlideIndex]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleNextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev + 1 < totalSlides ? prev + 1 : prev));
  }, [totalSlides]);

  const handlePrevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
  }, []);

  // Keyboard navigation in slide mode
  useEffect(() => {
    if (viewMode !== 'slide') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, handleNextSlide, handlePrevSlide]);

  const scopeLabel = useMemo(() => {
    if (approvalFilter === 'disetujui_only') return 'Program 2027 Sudah Disetujui DPP';
    if (approvalFilter === 'semua') return 'Semua Usulan Program Kerja 2027';
    return 'Program Kerja Final & Terjadwal 2027';
  }, [approvalFilter]);

  const handleDownloadPptx2027 = async () => {
    if (filtered2027Programs.length === 0 || isExportingPptx) return;
    setIsExportingPptx(true);
    setExportFeedback(null);
    try {
      await exportProker2027ToPptx({
        programs: filtered2027Programs,
        selectedSeksi: effectiveSeksi,
        authSession,
        scopeLabel,
      });
      setExportFeedback({
        type: 'success',
        text: `File PPTX Presentasi Program Kerja 2027 (${filtered2027Programs.length} program + slide grafik pendanaan bulanan) berhasil diunduh.`,
      });
    } catch (err) {
      console.error('Gagal export PPTX 2027:', err);
      setExportFeedback({
        type: 'error',
        text: 'Terjadi kendala saat membuat file PowerPoint 2027. Silakan coba kembali.',
      });
    } finally {
      setIsExportingPptx(false);
    }
  };

  // Locked guard jika belum login PIN
  if (!authSession) {
    return (
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 text-center space-y-4 max-w-lg mx-auto shadow-sm mt-6">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Presentasi Program Kerja 2027 Dilindungi PIN
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Silakan buka akses dengan memasukkan PIN Pastor Paroki, Bendahara, atau PIN Seksi Anda melalui menu Dashboard terlebih dahulu.
          </p>
        </div>
        {onNavigateToDashboard && (
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span>Buka Kunci Akses di Dashboard</span>
          </button>
        )}
      </div>
    );
  }

  const activeChartMonthObj =
    selectedChartMonth !== null
      ? monthlyFundingData.find((m) => m.bulanNo === selectedChartMonth) || null
      : null;

  // Helper to render the Interactive Monthly Funding Bar Chart (reused on Overview & Slide 2)
  const renderMonthlyFundingChartPanel = (compact = false, largeSlideFont = false) => (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-4 py-3 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <h3 className={largeSlideFont ? 'text-2xl sm:text-3xl font-black tracking-tight' : 'text-sm font-black tracking-tight'}>
              Grafik Keperluan Pendanaan Setiap Bulan — Tahun 2027
            </h3>
            <p className={largeSlideFont ? 'text-base sm:text-lg text-slate-300' : 'text-[10.5px] text-slate-300'}>
              Proyeksi kebutuhan dana pelaksanaan program kerja per bulan (Januari – Desember 2027). Klik batang bulan untuk rincian program.
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-2 flex-wrap ${largeSlideFont ? 'text-base sm:text-lg' : 'text-[10.5px]'}`}>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 font-bold">
            Puncak: {peakMonth?.nama || '-'} ({formatCompactRupiah(peakMonth?.totalDana || 0)})
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-bold">
            Total: {formatCompactRupiah(totalDistribusiBulanan || totalAnggaran2027)}
          </span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Vertical Bar Chart 12 Bulan */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-slate-50/80 rounded-xl border border-slate-200 p-3.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={`${largeSlideFont ? 'text-base sm:text-lg' : 'text-[11px]'} font-extrabold text-slate-700 uppercase tracking-wider`}>
              Diagram Batang Kebutuhan Dana (Jan – Des 2027)
            </span>
            <div className={`flex items-center gap-3 font-bold text-slate-500 ${largeSlideFont ? 'text-sm sm:text-base' : 'text-[10px]'}`}>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                Bulan Reguler
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                Bulan Puncak
              </span>
            </div>
          </div>

          <div
            className={`relative flex items-end justify-between gap-1.5 sm:gap-2 pt-8 pb-2 px-1 border-b border-slate-300 ${
              largeSlideFont ? 'h-80' : compact ? 'h-56' : 'h-64'
            }`}
          >
            {/* Subtle horizontal grid lines */}
            <div className="absolute inset-x-0 top-8 bottom-2 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3].map((lineIdx) => (
                <div key={lineIdx} className="w-full border-t border-dashed border-slate-200/90" />
              ))}
            </div>

            {monthlyFundingData.map((m) => {
              const heightPct =
                maxMonthlyDana > 0
                  ? Math.max(m.totalDana > 0 ? 6 : 1, Math.round((m.totalDana / maxMonthlyDana) * 100))
                  : 1;
              const isPeak = peakMonth && peakMonth.totalDana > 0 && m.bulanNo === peakMonth.bulanNo;
              const isSelected = selectedChartMonth === m.bulanNo;

              return (
                <button
                  key={m.bulanNo}
                  type="button"
                  onClick={() =>
                    setSelectedChartMonth((prev) => (prev === m.bulanNo ? null : m.bulanNo))
                  }
                  title={`${m.nama} 2027: ${formatRupiah(m.totalDana)} (${m.activeCount} program)`}
                  className={`relative z-10 flex-1 h-full flex flex-col items-center justify-end group cursor-pointer focus:outline-none rounded-lg transition-colors ${
                    isSelected ? 'bg-indigo-50/80 ring-1 ring-indigo-300' : 'hover:bg-white/70'
                  }`}
                >
                  {/* Value label above bar */}
                  <span
                    className={`${largeSlideFont ? 'text-sm sm:text-base' : 'text-[9px]'} font-black mb-1 tabular-nums leading-none whitespace-nowrap ${
                      isPeak
                        ? 'text-amber-700'
                        : m.totalDana > 0
                        ? 'text-emerald-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {m.totalDana > 0 ? formatCompactRupiah(m.totalDana) : '0'}
                  </span>

                  {/* Bar column */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[34px] rounded-t-md transition-all duration-300 shadow-2xs flex items-start justify-center pt-1 ${
                      isSelected
                        ? 'bg-indigo-600 ring-2 ring-indigo-300'
                        : isPeak
                        ? 'bg-gradient-to-t from-amber-600 to-amber-400'
                        : m.totalDana > 0
                        ? 'bg-gradient-to-t from-emerald-700 to-emerald-500 group-hover:from-emerald-600 group-hover:to-emerald-400'
                        : 'bg-slate-200'
                    }`}
                  >
                    {m.activeCount > 0 && heightPct >= 18 && (
                      <span className={`${largeSlideFont ? 'text-sm sm:text-base' : 'text-[8.5px]'} font-black text-white/95 leading-none`}>
                        {m.activeCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* X-axis Month Labels */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-1 pt-1.5">
            {monthlyFundingData.map((m) => {
              const isPeak = peakMonth && peakMonth.totalDana > 0 && m.bulanNo === peakMonth.bulanNo;
              const isSelected = selectedChartMonth === m.bulanNo;
              return (
                <div key={m.bulanNo} className="flex-1 text-center">
                  <div
                    className={`${largeSlideFont ? 'text-base sm:text-lg' : 'text-[10px]'} font-extrabold ${
                      isSelected
                        ? 'text-indigo-700'
                        : isPeak
                        ? 'text-amber-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {m.singkatan}
                  </div>
                  <div className={`${largeSlideFont ? 'text-sm' : 'text-[8.5px]'} text-slate-400 font-semibold`}>
                    {m.activeCount} prg
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Month Breakdown Drawer inside Chart Card */}
          <div className={`mt-3 p-2.5 rounded-xl bg-white border border-slate-200 ${largeSlideFont ? 'text-lg' : 'text-xs'}`}>
            {activeChartMonthObj ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-black text-slate-900">
                    📌 Rincian Pendanaan {activeChartMonthObj.nama} 2027 ({activeChartMonthObj.activeCount} Program)
                  </span>
                  <span className="font-black text-emerald-700 tabular-nums">
                    {formatRupiah(activeChartMonthObj.totalDana)}
                  </span>
                </div>
                {activeChartMonthObj.activePrograms.length === 0 ? (
                  <p className={`${largeSlideFont ? 'text-base' : 'text-[11px]'} text-slate-500`}>
                    Tidak ada program kerja terjadwal pada bulan {activeChartMonthObj.nama} 2027.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 pr-1">
                    {activeChartMonthObj.activePrograms.map((item) => (
                      <div
                        key={item.program.id}
                        className={`py-1 flex items-center justify-between gap-2 ${largeSlideFont ? 'text-base' : 'text-[11px]'}`}
                      >
                        <div className="min-w-0 truncate">
                          <span className="font-bold text-slate-800">{item.program.namaProgram}</span>
                          <span className="text-slate-400 ml-1.5">
                            ({item.program.penanggungjawab?.divisi})
                          </span>
                        </div>
                        <span className="font-extrabold text-emerald-700 tabular-nums shrink-0">
                          {formatRupiah(item.alokasiBulan)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={`flex items-center justify-between flex-wrap gap-2 text-slate-600 ${largeSlideFont ? 'text-base sm:text-lg' : 'text-[11px]'}`}>
                <span>
                  <strong className="text-amber-700">Puncak Tertinggi:</strong> {peakMonth?.nama} ({formatRupiah(peakMonth?.totalDana || 0)})
                </span>
                <span>
                  <strong className="text-emerald-700">Terendah Aktif:</strong> {lowestActiveMonth?.nama} ({formatRupiah(lowestActiveMonth?.totalDana || 0)})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: 12-Month Funding Table */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className={`bg-slate-900 text-white px-3 py-2 flex items-center justify-between font-black ${largeSlideFont ? 'text-lg' : 'text-[11px]'}`}>
            <span>Tabel Keperluan Dana Per Bulan (2027)</span>
            <span className="text-emerald-300">12 Bulan</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className={`w-full ${largeSlideFont ? 'text-lg' : 'text-[11px]'}`}>
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-1.5 px-2.5 text-left">Bulan</th>
                  <th className="py-1.5 px-2 text-center">Program</th>
                  <th className="py-1.5 px-2.5 text-right">Keperluan Dana</th>
                  <th className="py-1.5 px-2 text-right">Porsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyFundingData.map((m) => {
                  const isPeak = peakMonth && peakMonth.totalDana > 0 && m.bulanNo === peakMonth.bulanNo;
                  const pct =
                    totalDistribusiBulanan > 0
                      ? ((m.totalDana / totalDistribusiBulanan) * 100).toFixed(1)
                      : '0.0';
                  const isSelected = selectedChartMonth === m.bulanNo;
                  return (
                    <tr
                      key={m.bulanNo}
                      onClick={() =>
                        setSelectedChartMonth((prev) => (prev === m.bulanNo ? null : m.bulanNo))
                      }
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 font-bold'
                          : isPeak
                          ? 'bg-amber-50/90'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-1.5 px-2.5 font-bold text-slate-800 whitespace-nowrap">
                        {m.nama}
                        {isPeak && (
                          <span className={`ml-1.5 px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-black ${largeSlideFont ? 'text-sm' : 'text-[9px]'}`}>
                            Puncak
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center text-slate-600 tabular-nums">
                        {m.activeCount}
                      </td>
                      <td
                        className={`py-1.5 px-2.5 text-right font-extrabold tabular-nums ${
                          isPeak
                            ? 'text-amber-700'
                            : m.totalDana > 0
                            ? 'text-emerald-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {formatRupiah(m.totalDana)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-500 tabular-nums">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50 border-t-2 border-emerald-200 font-black text-emerald-950">
                  <td className="py-2 px-2.5">TOTAL 2027</td>
                  <td className="py-2 px-2 text-center">{filtered2027Programs.length}</td>
                  <td className="py-2 px-2.5 text-right text-emerald-800 tabular-nums">
                    {formatRupiah(totalDistribusiBulanan || totalAnggaran2027)}
                  </td>
                  <td className="py-2 px-2 text-right">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // Slide Renderer untuk Mode Slide Presentasi
  const renderActiveSlide = () => {
    // SLIDE 0: COVER PRESENTASI PROKER 2027
    if (currentSlideIndex === 0) {
      return (
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden min-h-[460px] flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />
          <div className="space-y-4 pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-black tracking-wide uppercase">
              <Presentation className="w-3.5 h-3.5" />
              <span>Dewan Pastoral Paroki · Perencanaan Strategis 2027</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Presentasi Program Kerja &amp; Anggaran Tahun 2027
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
              Memuat seluruh daftar program kerja yang akan dilaksanakan sepanjang tahun 2027, rincian estimasi anggaran tiap program, serta grafik proyeksi keperluan pendanaan setiap bulan.
            </p>
            <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-bold text-sky-300">
              <span>Unit: {effectiveSeksi === 'all' ? 'Semua Seksi / Unit Paroki' : effectiveSeksi}</span>
              <span className="text-slate-500">•</span>
              <span>Cakupan: {scopeLabel}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6">
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Program Kerja 2027
              </div>
              <div className="text-3xl font-black text-white mt-1 tabular-nums">
                {filtered2027Programs.length} Program
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Mencakup {seksiBreakdown.length} Seksi / Unit Paroki
              </div>
            </div>

            <div className="bg-emerald-950/80 border border-emerald-700/70 rounded-2xl p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Total Anggaran Tahun 2027
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1 tabular-nums">
                {formatRupiah(totalAnggaran2027)}
              </div>
              <div className="text-xs text-emerald-200 mt-1">
                Rata-rata {formatRupiah(Math.round(totalAnggaran2027 / 12))} / bulan
              </div>
            </div>

            <div className="bg-slate-800/90 border border-amber-500/40 rounded-2xl p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                Puncak Pendanaan Bulanan
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
                {peakMonth?.nama || '-'}
              </div>
              <div className="text-xs text-slate-300 mt-1 tabular-nums">
                {formatRupiah(peakMonth?.totalDana || 0)} ({peakMonth?.activeCount || 0} program aktif)
              </div>
            </div>
          </div>
        </div>
      );
    }

    // SLIDE 1: RINGKASAN EKSEKUTIF & REKAP PER SEKSI 2027
    if (currentSlideIndex === 1) {
      return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-[10.5px] font-black uppercase tracking-wider text-emerald-400">
                Slide 2 · Ringkasan Eksekutif
              </div>
              <h3 className="text-lg sm:text-xl font-black">
                Rekapitulasi Program Kerja &amp; Anggaran Per Seksi Tahun 2027
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black">
              Total: {formatRupiah(totalAnggaran2027)}
            </span>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Program 2027</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{filtered2027Programs.length}</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Total Anggaran</div>
                <div className="text-base sm:text-lg font-black text-emerald-800 mt-0.5 tabular-nums">
                  {formatCompactRupiah(totalAnggaran2027)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-[10px] font-bold text-amber-800 uppercase">Puncak Dana</div>
                <div className="text-base sm:text-lg font-black text-amber-700 mt-0.5">
                  {peakMonth?.nama || '-'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                <div className="text-[10px] font-bold text-indigo-700 uppercase">Disetujui DPP</div>
                <div className="text-xl font-black text-indigo-900 mt-0.5">
                  {approvalStats.disetujui} <span className="text-xs font-semibold">/ {filtered2027Programs.length}</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="py-2.5 px-3 text-center w-12">No</th>
                    <th className="py-2.5 px-3 text-left">Seksi / Unit Paroki</th>
                    <th className="py-2.5 px-3 text-center">Jumlah Program</th>
                    <th className="py-2.5 px-3 text-right">Estimasi Anggaran 2027</th>
                    <th className="py-2.5 px-3 text-right w-28">Porsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {seksiBreakdown.map((sec, idx) => {
                    const pct =
                      totalAnggaran2027 > 0
                        ? ((sec.totalAnggaran / totalAnggaran2027) * 100).toFixed(1)
                        : '0.0';
                    return (
                      <tr key={sec.divisi} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                        <td className="py-2 px-3 text-center text-slate-500 font-semibold">{idx + 1}</td>
                        <td className="py-2 px-3 font-extrabold text-slate-900">{sec.divisi}</td>
                        <td className="py-2 px-3 text-center font-semibold text-slate-700">
                          {sec.count} Program
                        </td>
                        <td className="py-2 px-3 text-right font-black text-emerald-700 tabular-nums">
                          {formatRupiah(sec.totalAnggaran)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-600 tabular-nums">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // SLIDE 2: SLIDE DEDIKATIF GRAFIK (CHART) KEPERLUAN PENDANAAN SETIAP BULAN 2027 (Halaman 3: Font 2x)
    if (currentSlideIndex === 2) {
      return renderMonthlyFundingChartPanel(false, true);
    }

    // SLIDE 3: MATRIKS PROGRAM KERJA & ANGGARAN TAHUN 2027 (Halaman 4: Font 2x)
    if (currentSlideIndex === 3) {
      return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-lg font-black uppercase tracking-wider text-emerald-400">
                Slide 4 · Matriks Program Kerja 2027
              </div>
              <h3 className="text-2xl sm:text-3xl font-black">
                Daftar Lengkap Program Kerja &amp; Anggaran Tahun 2027
              </h3>
            </div>
            <span className="text-lg font-bold text-slate-300">
              {filtered2027Programs.length} Program Terjadwal
            </span>
          </div>

          <div className="p-4 overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full text-lg sm:text-xl leading-snug">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                  <th className="py-3 px-3 text-center">No</th>
                  <th className="py-3 px-3 text-left">Program Kerja</th>
                  <th className="py-3 px-3 text-left">Seksi &amp; PJ</th>
                  <th className="py-3 px-3 text-center">Jadwal 2027</th>
                  <th className="py-3 px-3 text-center">Status DPP</th>
                  <th className="py-3 px-3 text-right">Anggaran 2027</th>
                  <th className="py-3 px-3 text-center">Slide</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered2027Programs.map((p, idx) => {
                  const dpp = getDppBadge(p.catatanPastorParoki?.statusPersetujuan);
                  const DppIcon = dpp.Icon;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 text-center text-slate-500 font-semibold">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900">{p.namaProgram}</div>
                        <div className="text-base text-slate-500 line-clamp-2">{p.tujuanKegiatan}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{p.penanggungjawab?.divisi}</div>
                        <div className="text-base text-slate-500">{p.penanggungjawab?.nama}</div>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700 font-medium">
                        {p.tipeJadwal === 'sepanjang_tahun'
                          ? 'Jan – Des (Rutin)'
                          : p.tipeJadwal === 'akan_ditentukan' && (!p.bulanPelaksanaan || p.bulanPelaksanaan.length === 0)
                          ? 'Akan Ditentukan'
                          : p.bulanPelaksanaan?.map((m) => BULAN_LIST[m - 1]?.singkatan).join(', ') || 'Akan Ditentukan'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm sm:text-base font-bold border ${dpp.className}`}
                        >
                          <DppIcon className="w-4 h-4" />
                          {dpp.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-700 tabular-nums whitespace-nowrap">
                        {formatRupiah(p.estimasiAnggaran || 0)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setCurrentSlideIndex(4 + idx)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-base cursor-pointer whitespace-nowrap"
                        >
                          Buka Slide #{idx + 1}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // SLIDES DETAIL PROGRAM KERJA 2027 (Halaman 5+: Font 2x)
    const progIdx = currentSlideIndex - 4;
    const prog = filtered2027Programs[progIdx];
    if (!prog) return null;

    const dpp = getDppBadge(prog.catatanPastorParoki?.statusPersetujuan);
    const DppIcon = dpp.Icon;
    const katInfo = getKategoriProgramInfo(prog.kategoriProgram);
    const activeMonths = BULAN_LIST.filter((b) => isProgramAktifDiBulan(prog, b.no));

    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-4 border-emerald-500">
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-black uppercase tracking-wider text-emerald-300 flex items-center gap-2 flex-wrap">
              <span>
                Program Kerja 2027 #{progIdx + 1} dari {filtered2027Programs.length}
              </span>
              <span>•</span>
              <span>{prog.penanggungjawab?.divisi}</span>
              <span>•</span>
              <span>{katInfo.label}</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black mt-1 leading-snug">{prog.namaProgram}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-base sm:text-lg font-black border ${dpp.className}`}
            >
              <DppIcon className="w-5 h-5" />
              {dpp.label}
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel Kiri: Rencana & Sasaran */}
          <div className="space-y-4 bg-slate-50/80 rounded-2xl p-5 border border-slate-200">
            <h4 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-700">
              1. Rencana Kegiatan &amp; Sasaran Program 2027
            </h4>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-sm sm:text-base font-bold text-slate-400 uppercase">Tujuan Kegiatan</div>
              <p className="text-lg sm:text-xl text-slate-800 mt-1.5 leading-relaxed">
                {prog.tujuanKegiatan || 'Belum ada uraian tujuan kegiatan.'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm sm:text-base font-bold text-slate-400 uppercase">Target Sasaran</div>
                <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                  {prog.targetSasaran || 'Seluruh umat paroki'}
                </p>
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-slate-400 uppercase">Penanggung Jawab</div>
                <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                  {prog.penanggungjawab?.nama || '-'}
                  {prog.penanggungjawab?.kontak ? ` (${prog.penanggungjawab.kontak})` : ''}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-sm sm:text-base font-bold text-slate-400 uppercase">Jadwal Pelaksanaan 2027</div>
              <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                {getTipeJadwalLabel(prog.tipeJadwal)} —{' '}
                {prog.tipeJadwal === 'sepanjang_tahun'
                  ? 'Setiap Bulan (Januari – Desember 2027)'
                  : prog.tipeJadwal === 'akan_ditentukan' && (!prog.bulanPelaksanaan || prog.bulanPelaksanaan.length === 0)
                  ? 'Bulan belum ditentukan'
                  : prog.bulanPelaksanaan?.map((m) => BULAN_LIST[m - 1]?.nama).join(', ') || 'Sesuai jadwal'}
              </p>
              {prog.tanggalSpesifik && (
                <p className="text-base sm:text-lg text-slate-600 mt-1">Waktu: {prog.tanggalSpesifik}</p>
              )}
            </div>

            {(prog.catatanPastorParoki?.catatan || prog.tindakLanjutKendala || prog.catatan) && (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-1.5">
                <div className="text-sm sm:text-base font-black text-amber-900 uppercase">
                  Catatan Seksi &amp; Arahan DPP 2027
                </div>
                {prog.tindakLanjutKendala && (
                  <p className="text-lg text-slate-800">
                    <strong>Tindak Lanjut 2026:</strong> {prog.tindakLanjutKendala}
                  </p>
                )}
                {prog.catatan && (
                  <p className="text-lg text-slate-800">
                    <strong>Catatan Seksi:</strong> {prog.catatan}
                  </p>
                )}
                {prog.catatanPastorParoki?.catatan && (
                  <p className="text-lg text-amber-950 font-semibold">
                    <strong>Arahan DPP:</strong> {prog.catatanPastorParoki.catatan}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Panel Kanan: Anggaran & Rincian Dana Bulanan (1 Baris / Bulan) */}
          <div className="space-y-4 bg-slate-50/80 rounded-2xl p-5 border border-slate-200">
            <h4 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-700">
              2. Anggaran &amp; Keperluan Pendanaan Per Bulan (2027)
            </h4>

            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm sm:text-base font-black uppercase text-emerald-800">
                  Total Estimasi Anggaran Tahun 2027
                </div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-800 mt-1 tabular-nums">
                  {formatRupiah(prog.estimasiAnggaran || 0)}
                </div>
              </div>
              {onOpenProgramDetail && (
                <button
                  type="button"
                  onClick={() => onOpenProgramDetail(prog.id)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-base font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                >
                  <Eye className="w-4 h-4" />
                  <span>Buka Detail</span>
                </button>
              )}
            </div>

            {typeof prog.catatanPastorParoki?.rekomendasiAnggaran === 'number' && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 text-lg font-bold text-amber-900">
                Rekomendasi Anggaran DPP: {formatRupiah(prog.catatanPastorParoki.rekomendasiAnggaran)}
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 text-base sm:text-lg font-black text-slate-700 border-b border-slate-200">
                Rincian Pendanaan Per Bulan ({activeMonths.length} Bulan Aktif — 1 Baris / Bulan)
              </div>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {activeMonths.length === 0 ? (
                  <div className="p-4 text-lg text-slate-500">Belum ada bulan pelaksanaan aktif.</div>
                ) : (
                  activeMonths.map((b) => {
                    const detail = getDetailPaguBulanan(prog, b.no);
                    const jadwalSpec = prog.jadwalBulanan?.[b.no];
                    const noteSpec = prog.catatanBulanan?.[b.no];
                    return (
                      <div
                        key={b.no}
                        className="px-4 py-2.5 flex items-center justify-between gap-2 text-lg sm:text-xl hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-900">{b.nama} 2027</span>
                          {jadwalSpec && (
                            <span className="text-base text-slate-500 ml-2">Jadwal: {jadwalSpec}</span>
                          )}
                          {noteSpec && (
                            <span className="text-base text-indigo-700 ml-2">({noteSpec})</span>
                          )}
                        </div>
                        <span className="font-black text-emerald-700 tabular-nums shrink-0">
                          {formatRupiah(detail.initialPlannedAlokasi)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-10">
      {/* HEADER BAR & CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Presentation className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Presentasi Program Kerja Tahun 2027
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black">
                  Anggaran &amp; Chart Pendanaan Bulanan
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan program kerja yang akan dilaksanakan pada tahun 2027, rencana anggaran, serta grafik keperluan dana setiap bulan.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewMode === 'overview'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ringkasan &amp; Grafik</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('slide')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewMode === 'slide'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Presentation className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mode Slide ({totalSlides})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadPptx2027}
              disabled={isExportingPptx || filtered2027Programs.length === 0}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              title="Unduh file PowerPoint Presentasi Program Kerja 2027 lengkap dengan Slide Chart Keperluan Pendanaan Bulanan"
            >
              {isExportingPptx ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>{isExportingPptx ? 'Membuat PPTX...' : 'Unduh PPTX Proker 2027'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const prevTitle = document.title;
                const roleSlug = getAuthRoleFileSlug(authSession, effectiveSeksi);
                document.title = `Presentasi_Proker_2027_${roleSlug}`;
                const restore = () => {
                  document.title = prevTitle;
                  window.removeEventListener('afterprint', restore);
                };
                window.addEventListener('afterprint', restore);
                window.print();
                setTimeout(restore, 2000);
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="Cetak atau Simpan PDF via browser"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 cursor-pointer"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Seksi */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              {isLockedToSeksi ? (
                <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-extrabold text-slate-800">
                  {effectiveSeksi}
                </span>
              ) : (
                <select
                  value={selectedSeksi}
                  onChange={(e) => setSelectedSeksi(e.target.value)}
                  className="h-8 bg-slate-50 border border-slate-300 rounded-lg px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="all">Semua Seksi / Unit Paroki</option>
                  {MASTER_DIVISIONS.map((div) => (
                    <option key={div.id} value={div.nama}>
                      {div.nama}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Filter Status Persetujuan DPP */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setApprovalFilter('final_aktif')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  approvalFilter === 'final_aktif'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Final &amp; Terjadwal (Non-Ditolak)
              </button>
              <button
                type="button"
                onClick={() => setApprovalFilter('disetujui_only')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  approvalFilter === 'disetujui_only'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sudah Disetujui DPP
              </button>
              <button
                type="button"
                onClick={() => setApprovalFilter('semua')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  approvalFilter === 'semua'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Usulan 2027
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari program kerja 2027..."
              className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Export Feedback Banner */}
        {exportFeedback && (
          <div
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
              exportFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <span>{exportFeedback.text}</span>
            <button
              type="button"
              onClick={() => setExportFeedback(null)}
              className="text-[11px] underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}
      </div>

      {/* EMPTY STATE */}
      {filtered2027Programs.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center space-y-2">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-800">
            Belum ada program kerja tahun 2027 yang sesuai dengan filter saat ini
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Anda dapat mengubah filter status persetujuan DPP menjadi &ldquo;Semua Usulan 2027&rdquo; atau menambahkan rancangan program 2027 pada menu Input / Perancangan Dua Sisi.
          </p>
        </div>
      ) : viewMode === 'slide' ? (
        /* MODE SLIDE PRESENTASI */
        <div className="space-y-3">
          {/* Slide Toolbar Navigation */}
          <div className="bg-slate-900 text-white rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap print:hidden">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevSlide}
                disabled={currentSlideIndex === 0}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>
              <span className="text-xs font-extrabold text-emerald-300 px-2 tabular-nums">
                Slide {currentSlideIndex + 1} / {totalSlides}
              </span>
              <button
                type="button"
                onClick={handleNextSlide}
                disabled={currentSlideIndex >= totalSlides - 1}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Jump Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setCurrentSlideIndex(0)}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                  currentSlideIndex === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Cover
              </button>
              <button
                type="button"
                onClick={() => setCurrentSlideIndex(1)}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                  currentSlideIndex === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Rekap Seksi
              </button>
              <button
                type="button"
                onClick={() => setCurrentSlideIndex(2)}
                className={`px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 ${
                  currentSlideIndex === 2 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Slide Grafik Dana Bulanan</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentSlideIndex(3)}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                  currentSlideIndex === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Matriks 2027
              </button>
              <select
                value={currentSlideIndex >= 4 ? currentSlideIndex : ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setCurrentSlideIndex(val);
                }}
                className="h-7 bg-slate-800 border border-slate-700 rounded-lg px-2 text-[11px] text-white cursor-pointer"
              >
                <option value="">Lompat ke Detail Program...</option>
                {filtered2027Programs.map((p, idx) => (
                  <option key={p.id} value={4 + idx}>
                    #{idx + 1} — {p.namaProgram}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Slide Content */}
          {renderActiveSlide()}
        </div>
      ) : (
        /* MODE OVERVIEW: KPI + CHART PENDANAAN BULANAN + REKAP SEKSI + TABEL PROGRAM 2027 */
        <div className="space-y-4">
          {/* 1. KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[10.5px] font-bold uppercase">
                <span>Program Kerja 2027</span>
                <FileText className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                {filtered2027Programs.length} <span className="text-xs font-bold text-slate-500">Program</span>
              </div>
              <div className="text-[10.5px] text-slate-500 mt-0.5">
                Tersebar di {seksiBreakdown.length} Seksi / Unit
              </div>
            </div>

            <div className="bg-emerald-50/90 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-800 text-[10.5px] font-bold uppercase">
                <span>Total Anggaran 2027</span>
                <DollarSign className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-1 tabular-nums truncate">
                {formatCompactRupiah(totalAnggaran2027)}
              </div>
              <div className="text-[10.5px] text-emerald-700 font-semibold mt-0.5 truncate">
                {formatRupiah(totalAnggaran2027)}
              </div>
            </div>

            <div className="bg-amber-50/90 p-3.5 rounded-2xl border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between text-amber-800 text-[10.5px] font-bold uppercase">
                <span>Bulan Puncak Dana</span>
                <TrendingUp className="w-4 h-4 text-amber-700" />
              </div>
              <div className="text-xl font-black text-amber-800 mt-1">
                {peakMonth?.nama || '-'}
              </div>
              <div className="text-[10.5px] text-amber-800 font-bold mt-0.5 tabular-nums truncate">
                {formatRupiah(peakMonth?.totalDana || 0)}
              </div>
            </div>

            <div className="bg-indigo-50/80 p-3.5 rounded-2xl border border-indigo-200 shadow-2xs">
              <div className="flex items-center justify-between text-indigo-800 text-[10.5px] font-bold uppercase">
                <span>Persetujuan DPP 2027</span>
                <Church className="w-4 h-4 text-indigo-700" />
              </div>
              <div className="text-xl font-black text-indigo-950 mt-1 tabular-nums">
                {approvalStats.disetujui} <span className="text-xs font-bold text-indigo-700">Disetujui</span>
              </div>
              <div className="text-[10.5px] text-indigo-700 font-medium mt-0.5">
                Menunggu/Revisi: {approvalStats.menungguRevisi}
                {approvalStats.ditolak > 0 ? ` · Ditolak: ${approvalStats.ditolak}` : ''}
              </div>
            </div>
          </div>

          {/* 2. Chart Keperluan Pendanaan Setiap Bulan 2027 */}
          {renderMonthlyFundingChartPanel(false)}

          {/* 3. Rekap Anggaran Per Seksi 2027 */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-black text-slate-900">
                  Rekapitulasi Anggaran Program Kerja 2027 Per Seksi
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                {seksiBreakdown.length} Seksi / Unit Aktif
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {seksiBreakdown.map((sec) => {
                const pct =
                  totalAnggaran2027 > 0
                    ? Math.round((sec.totalAnggaran / totalAnggaran2027) * 1000) / 10
                    : 0;
                return (
                  <div
                    key={sec.divisi}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-900 truncate">
                        {sec.divisi}
                      </span>
                      <span className="text-[10.5px] font-bold text-slate-500 shrink-0">
                        {sec.count} Program
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-black text-emerald-700 tabular-nums">
                        {formatRupiah(sec.totalAnggaran)}
                      </span>
                      <span className="text-[10.5px] font-extrabold text-slate-600 tabular-nums">
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Tabel Program Kerja & Anggaran Tahun 2027 */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black">
                  Daftar Program Kerja Tahun 2027 &amp; Rincian Anggaran
                </h3>
              </div>
              <span className="text-[11px] text-slate-300 font-bold">
                Menampilkan {filtered2027Programs.length} program · Total {formatRupiah(totalAnggaran2027)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center w-10">No</th>
                    <th className="py-2.5 px-3 text-left">Program Kerja &amp; Tujuan</th>
                    <th className="py-2.5 px-3 text-left">Seksi &amp; PJ</th>
                    <th className="py-2.5 px-3 text-left">Jadwal &amp; Sebaran Dana</th>
                    <th className="py-2.5 px-3 text-center">Status DPP</th>
                    <th className="py-2.5 px-3 text-right">Anggaran 2027</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered2027Programs.map((p, idx) => {
                    const dpp = getDppBadge(p.catatanPastorParoki?.statusPersetujuan);
                    const DppIcon = dpp.Icon;
                    const katInfo = getKategoriProgramInfo(p.kategoriProgram);
                    const activeBulans = BULAN_LIST.filter((b) => isProgramAktifDiBulan(p, b.no));

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 align-top">
                        <td className="py-2.5 px-3 text-center text-slate-500 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="font-extrabold text-slate-900">{p.namaProgram}</div>
                          <div className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold text-slate-500">
                            <Tag className="w-3 h-3" />
                            <span>{katInfo.label}</span>
                          </div>
                          {p.tujuanKegiatan && (
                            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                              {p.tujuanKegiatan}
                            </p>
                          )}
                          {p.targetSasaran && (
                            <p className="text-[10.5px] text-slate-500 mt-0.5">
                              <strong>Sasaran:</strong> {p.targetSasaran}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">
                            {p.penanggungjawab?.divisi || '-'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            PJ: {p.penanggungjawab?.nama || '-'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="font-bold text-slate-800">
                            {getTipeJadwalLabel(p.tipeJadwal)}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {activeBulans.map((b) => {
                              const alok = getDetailPaguBulanan(p, b.no).initialPlannedAlokasi;
                              return (
                                <span
                                  key={b.no}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700"
                                >
                                  {b.singkatan}: {formatCompactRupiah(alok)}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${dpp.className}`}
                          >
                            <DppIcon className="w-3 h-3" />
                            {dpp.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-700 tabular-nums whitespace-nowrap">
                          {formatRupiah(p.estimasiAnggaran || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex flex-col gap-1 items-center">
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentSlideIndex(4 + idx);
                                setViewMode('slide');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10.5px] font-bold cursor-pointer whitespace-nowrap"
                            >
                              Lihat Slide
                            </button>
                            {onOpenProgramDetail && (
                              <button
                                type="button"
                                onClick={() => onOpenProgramDetail(p.id)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold cursor-pointer whitespace-nowrap"
                              >
                                Detail Form
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
