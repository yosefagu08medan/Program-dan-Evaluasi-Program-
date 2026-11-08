import React, { useMemo, useState, useEffect } from 'react';
import {
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  ChevronRight,
  Plus,
  Shield,
  Bell,
  AlertCircle,
  Building2,
  Radio,
  HeartHandshake,
  Home,
  Sparkles,
  GraduationCap,
  BookOpen,
  Music,
  BookKey,
  TreePine,
  Award,
  Repeat,
  ChevronDown,
  ChevronUp,
  Landmark,
  FileText,
  Lock,
  LogOut,
  KeyRound,
  ShieldCheck,
  RotateCcw,
  Download,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import { ProgramKerja } from '../types/proker';
import { AuthSession } from '../types/auth';
import { DashboardAuthGate } from './DashboardAuthGate';
import {
  BULAN_LIST,
  formatRupiah,
  formatCompactRupiah,
  formatIndonesianDate,
  getStatusInfo,
  isPelayananRutin,
  isDivisionMatch,
  isProgramBerulang,
  getEvaluasiForMonth,
  getAnggaranTerpakaiSebelumBulan,
  getSisaBudgetUntukBulan,
  getKategoriProgramInfo,
  getAlokasiBudgetBulanan,
} from '../utils/formatters';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';

interface DashboardViewProps {
  programs: ProgramKerja[];
  selectedYear: 'all' | 2026 | 2027;
  onSelectYear: (year: 'all' | 2026 | 2027) => void;
  selectedMonth: number | 'all';
  onSelectMonth: (month: number | 'all') => void;
  selectedSeksi: string | 'all';
  onSelectSeksi: (seksi: string | 'all') => void;
  onOpenProgramDetail: (programId: string) => void;
  onInputProgramForSeksi: (seksiName: string) => void;
  onOpenEvaluasi: (program: ProgramKerja, targetMonth?: number) => void;
  onInputProgramLuarRancangan?: (seksiName?: string) => void;
  authSession: AuthSession | null;
  onAuthenticate: (session: AuthSession) => void;
  onLockDashboard: () => void;
  onOpenPinManager: () => void;
  onPromptUnlockUnit?: (unitId: string, unitNama: string) => void;
  onOpenPdfModal?: () => void;
  onOpenPengurusTab?: () => void;
  onOpenKomparasiTab?: () => void;
  onOpenCashFlowTab?: () => void;
  onOpenPenerimaanTab?: () => void;
  onOpenDualPlanningForSeksi?: (seksiName: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  programs,
  selectedYear,
  onSelectYear,
  selectedMonth,
  onSelectMonth,
  selectedSeksi,
  onSelectSeksi,
  onOpenProgramDetail,
  onInputProgramForSeksi,
  onOpenEvaluasi,
  onInputProgramLuarRancangan,
  authSession,
  onAuthenticate,
  onLockDashboard,
  onOpenPinManager,
  onPromptUnlockUnit,
  onOpenPdfModal,
  onOpenPengurusTab,
  onOpenKomparasiTab,
  onOpenCashFlowTab,
  onOpenPenerimaanTab,
  onOpenDualPlanningForSeksi,
}) => {
  // Bulan berjalan default (1 - 12) berdasarkan kalender saat ini
  const currentCalendarMonth = new Date().getMonth() + 1;
  const [reminderMonth, setReminderMonth] = useState<number>(() => {
    if (typeof selectedMonth === 'number') return selectedMonth;
    return currentCalendarMonth;
  });

  // Sinkronkan reminderMonth jika selectedMonth dari luar berubah
  useEffect(() => {
    if (typeof selectedMonth === 'number') {
      setReminderMonth(selectedMonth);
    }
  }, [selectedMonth]);

  const handleReminderMonthChange = (newMonth: number) => {
    setReminderMonth(newMonth);
    onSelectMonth(newMonth);
  };

  // State untuk toggle list pelayanan rutin per seksi (default: hide/tertutup)
  const [expandedSeksiRoutine, setExpandedSeksiRoutine] = useState<Record<string, boolean>>({});

  // State untuk toggle bagian pelayanan rutin di bawah dashboard (default: hide/tertutup)
  const [isBottomRoutineExpanded, setIsBottomRoutineExpanded] = useState<boolean>(false);

  const toggleSeksiRoutine = (divisionId: string) => {
    setExpandedSeksiRoutine((prev) => ({
      ...prev,
      [divisionId]: !prev[divisionId],
    }));
  };

  // 1. Program dalam tahun terpilih
  const programsInYear = useMemo(() => {
    return programs.filter((p) => {
      if (selectedYear !== 'all' && p.tahun !== selectedYear) return false;
      return true;
    });
  }, [programs, selectedYear]);

  // 2. Filter berdasarkan seksi yang dipilih
  const programsFilteredBySeksi = useMemo(() => {
    if (selectedSeksi === 'all') return programsInYear;
    return programsInYear.filter((p) => isDivisionMatch(p.penanggungjawab?.divisi, selectedSeksi));
  }, [programsInYear, selectedSeksi]);

  // Seksi/Unit aktif yang sedang dilihat (prioritas: seksi login, atau seksi yang difilter)
  const activeSeksiNama = useMemo(() => {
    if (authSession?.role === 'seksi') {
      return authSession.unitNama;
    }
    if (selectedSeksi !== 'all') {
      return selectedSeksi;
    }
    return null;
  }, [authSession, selectedSeksi]);

  // Program milik seksi aktif dalam tahun terpilih
  const activeSeksiPrograms = useMemo(() => {
    if (!activeSeksiNama) return [];
    return programsInYear.filter((p) => isDivisionMatch(p.penanggungjawab?.divisi, activeSeksiNama));
  }, [programsInYear, activeSeksiNama]);

  // Program kerja terjadwal milik seksi pada reminderMonth
  const scheduledForSeksiInMonth = useMemo(() => {
    return activeSeksiPrograms.filter((p) => {
      if (isPelayananRutin(p)) return false;
      return Array.isArray(p.bulanPelaksanaan) && p.bulanPelaksanaan.includes(reminderMonth);
    });
  }, [activeSeksiPrograms, reminderMonth]);

  // Pelayanan rutin milik seksi
  const routineForSeksi = useMemo(() => {
    return activeSeksiPrograms.filter((p) => isPelayananRutin(p));
  }, [activeSeksiPrograms]);

  // Hitung jumlah program yang sudah dievaluasi vs belum pada bulan pengingat ini
  const evaluatedCount = useMemo(() => {
    return scheduledForSeksiInMonth.filter((p) => {
      const ev = getEvaluasiForMonth(p, reminderMonth);
      return !!ev?.statusKeterlaksanaan;
    }).length;
  }, [scheduledForSeksiInMonth, reminderMonth]);

  const pendingEvaluationCount = scheduledForSeksiInMonth.length - evaluatedCount;

  const activeYearDisplay = selectedYear !== 'all' ? selectedYear : 2026;

  // 3. Pisahkan antara Program Terjadwal Khusus vs Pelayanan Rutin Sepanjang Tahun
  // ATURAN: Rapat DPPH BUKAN pelayanan rutin (jadwal pasti).
  // Jika ada program DPPH lainnya selain Rapat DPPH yang berjalan tiap bulan, maka masuk ke Program Rutin.
  const routinePrograms = useMemo(() => {
    return programsFilteredBySeksi.filter((p) => isPelayananRutin(p));
  }, [programsFilteredBySeksi]);

  // Program Terjadwal: Program khusus yang memiliki tanggal/bulan tertentu pada bulan terpilih
  const scheduledProgramsInMonth = useMemo(() => {
    return programsFilteredBySeksi.filter((p) => {
      if (isPelayananRutin(p)) return false;
      if (typeof selectedMonth === 'number') {
        return p.bulanPelaksanaan?.includes(selectedMonth);
      }
      return true;
    });
  }, [programsFilteredBySeksi, selectedMonth]);

  // 4. Breakdown Unit (DPPH & 15 Seksi): Sama persis modelnya, DPPH tampil dengan layout kartu yang sama
  const activeSeksiBreakdown = useMemo(() => {
    return MASTER_DIVISIONS.map((div) => {
      const seksiAllProkers = programsInYear.filter(
        (p) => isDivisionMatch(p.penanggungjawab?.divisi, div.nama)
      );
      const seksiScheduled = seksiAllProkers.filter((p) => {
        if (isPelayananRutin(p)) return false;
        if (typeof selectedMonth === 'number') {
          return p.bulanPelaksanaan?.includes(selectedMonth);
        }
        return true;
      });
      const seksiRoutine = seksiAllProkers.filter((p) => isPelayananRutin(p));
      const totalCount = seksiScheduled.length + seksiRoutine.length;
      const anggaran = seksiAllProkers.reduce(
        (sum, p) => sum + (p.estimasiAnggaran || 0),
        0
      );

      return {
        division: div,
        scheduledPrograms: seksiScheduled,
        routinePrograms: seksiRoutine,
        count: totalCount,
        totalAnggaran: anggaran,
      };
    }).filter((item) => item.count > 0);
  }, [programsInYear, selectedMonth]);

  // 5. Seksi/Unit yang Ditampilkan
  const displayedSeksiBreakdown = useMemo(() => {
    if (selectedSeksi === 'all') {
      return activeSeksiBreakdown;
    }
    return activeSeksiBreakdown.filter(
      (item) => isDivisionMatch(item.division.nama, selectedSeksi)
    );
  }, [activeSeksiBreakdown, selectedSeksi]);

  // Seluruh program yang aktif dalam view (terjadwal + pelayanan rutin)
  const allActiveProgramsInView = useMemo(() => {
    return [...scheduledProgramsInMonth, ...routinePrograms];
  }, [scheduledProgramsInMonth, routinePrograms]);

  // Aggregate metrics
  const totalAnggaran = useMemo(() => {
    return allActiveProgramsInView.reduce((sum, p) => sum + (p.estimasiAnggaran || 0), 0);
  }, [allActiveProgramsInView]);

  const totalAnggaranRoutine = useMemo(() => {
    return routinePrograms.reduce((sum, p) => sum + (p.estimasiAnggaran || 0), 0);
  }, [routinePrograms]);

  const statusCounts = useMemo(() => {
    const counts = { direncanakan: 0, berlangsung: 0, selesai: 0, sudahDievaluasi: 0 };
    allActiveProgramsInView.forEach((p) => {
      if (p.status in counts) {
        counts[p.status as keyof typeof counts]++;
      }
      if (p.evaluasi?.statusKeterlaksanaan === 'terlaksana') {
        counts.sudahDievaluasi++;
      }
    });
    return counts;
  }, [allActiveProgramsInView]);

  const luarRancanganCount = useMemo(() => {
    return allActiveProgramsInView.filter((p) => !!p.isLuarRancangan).length;
  }, [allActiveProgramsInView]);

  const selectedMonthObj = typeof selectedMonth === 'number' ? BULAN_LIST[selectedMonth - 1] : null;

  const getSeksiIcon = (code: string) => {
    switch (code) {
      case 'DPPH':
        return <Landmark className="w-4 h-4 text-indigo-700" />;
      case 'SEK-KEAMANAN':
        return <Shield className="w-4 h-4 text-amber-600" />;
      case 'SEK-UMUM':
        return <Building2 className="w-4 h-4 text-slate-600" />;
      case 'SEK-KOMSOS':
        return <Radio className="w-4 h-4 text-blue-600" />;
      case 'SEK-MUDA':
        return <Users className="w-4 h-4 text-orange-600" />;
      case 'SEK-HAK':
        return <HeartHandshake className="w-4 h-4 text-teal-600" />;
      case 'SEK-PSE':
        return <HeartHandshake className="w-4 h-4 text-rose-600" />;
      case 'SEK-KELUARGA':
        return <Home className="w-4 h-4 text-pink-600" />;
      case 'SEK-KKI':
        return <Sparkles className="w-4 h-4 text-yellow-600" />;
      case 'SEK-EVANGELISASI':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'SEK-PENDIDIKAN':
        return <GraduationCap className="w-4 h-4 text-cyan-600" />;
      case 'SEK-KKS':
        return <BookOpen className="w-4 h-4 text-emerald-600" />;
      case 'SEK-LITURGI':
        return <Music className="w-4 h-4 text-violet-600" />;
      case 'SEK-KATEKESE':
        return <BookKey className="w-4 h-4 text-amber-700" />;
      case 'SEK-PLBKS':
        return <Sparkles className="w-4 h-4 text-amber-600" />;
      case 'SEK-KERAWAM':
        return <Award className="w-4 h-4 text-red-600" />;
      default:
        return <Users className="w-4 h-4 text-slate-600" />;
    }
  };

  // JIKA BELUM TERAUTENTIKASI / DASHBOARD TERKUNCI:
  // Seluruh hooks di atas sudah dieksekusi secara konsisten (mematuhi React Rules of Hooks)
  // sehingga transisi login PIN berlangsung mulus tanpa blank screen!
  if (!authSession) {
    return (
      <DashboardAuthGate
        onAuthenticated={onAuthenticate}
        initialSelectedUnit={selectedSeksi !== 'all' ? selectedSeksi : 'all'}
        programs={programs}
        selectedYear={selectedYear}
        onOpenPengurusTab={onOpenPengurusTab}
      />
    );
  }

  return (
    <div className="space-y-3 pb-8 w-full">
      {/* 0. ACTIVE SESSION & SECURITY BAR */}
      <div className="bg-white p-2.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              authSession.role === 'pastor_paroki'
                ? 'bg-indigo-600 text-white'
                : authSession.role === 'semua_seksi'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-white'
            }`}
          >
            {authSession.role === 'pastor_paroki' ? (
              <ShieldCheck className="w-4 h-4" />
            ) : authSession.role === 'semua_seksi' ? (
              <Users className="w-4 h-4" />
            ) : (
              <Building2 className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-extrabold text-slate-900 truncate">
                {authSession.unitNama}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                  authSession.role === 'pastor_paroki'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : authSession.role === 'semua_seksi'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {authSession.role === 'pastor_paroki'
                  ? '👑 Hak Akses Penuh & Reset PIN'
                  : authSession.role === 'semua_seksi'
                  ? '🌐 Akses Semua Unit'
                  : '🔒 Akses Seksi Terbuka'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              {authSession.role === 'pastor_paroki'
                ? 'Pastor Paroki / Admin dapat melihat seluruh data & mengelola PIN seluruh seksi'
                : authSession.role === 'semua_seksi'
                ? 'Melihat rekap seluruh program kerja paroki'
                : `Hanya menampilkan data program kerja untuk ${authSession.unitNama}`}
            </p>
          </div>
        </div>

        {/* Actions for active session */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          {/* Pastor Paroki Button to Manage and Reset all PINs */}
          {authSession.role === 'pastor_paroki' && (
            <button
              type="button"
              onClick={onOpenPinManager}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 text-[10.5px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title="Buka panel manajemen dan reset PIN seluruh seksi"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-700" />
              <span>Kelola & Reset PIN</span>
            </button>
          )}

          {/* Tombol Akses Cepat Struktur Pengurus */}
          {onOpenPengurusTab && (
            <button
              type="button"
              onClick={onOpenPengurusTab}
              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-[10.5px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title="Buka susunan pengurus paroki, pastor, DPPH, koordinator seksi dan anggotanya"
            >
              <Users className="w-3.5 h-3.5 text-blue-700" />
              <span>Pengurus Paroki</span>
            </button>
          )}

          {/* Switch unit for specific seksi */}
          {authSession.role === 'seksi' && onPromptUnlockUnit && (
            <button
              type="button"
              onClick={() => onPromptUnlockUnit('all', 'Buka Unit Lain')}
              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Buka seksi lain dengan memasukkan PIN"
            >
              <Building2 className="w-3 h-3 text-slate-500" />
              <span>Ganti Seksi</span>
            </button>
          )}

          {/* Komparasi 2026-2027 (DPPH & Seksi) button */}
          {onOpenKomparasiTab && (
            <button
              type="button"
              onClick={onOpenKomparasiTab}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[10.5px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title="Buka Menu Komparasi Evaluasi 2026 vs Rancangan 2027 per Seksi"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
              <span>Komparasi DPPH (2026-2027)</span>
            </button>
          )}

          {/* Proyeksi Kas Bulanan button */}
          {onOpenCashFlowTab && (
            <button
              type="button"
              onClick={onOpenCashFlowTab}
              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-[10.5px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title="Buka Dashboard Proyeksi Kebutuhan Kas Bulanan Paroki"
            >
              <DollarSign className="w-3.5 h-3.5 text-teal-700" />
              <span>Proyeksi Kas Bulanan</span>
            </button>
          )}

          {/* Penerimaan Kas Mingguan button (Pastor Paroki / Admin & Bendahara) */}
          {onOpenPenerimaanTab && (authSession?.role === 'pastor_paroki' || authSession?.role === 'bendahara') && (
            <button
              type="button"
              onClick={onOpenPenerimaanTab}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10.5px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title="Buka Menu Penerimaan Kas Mingguan (Rancangan & Realisasi) - Pastor Paroki / Admin & Bendahara"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Penerimaan Kas (Mingguan)</span>
            </button>
          )}

          {/* Download PDF button */}
          {onOpenPdfModal && (
            <button
              type="button"
              onClick={onOpenPdfModal}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10.5px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title={
                authSession.role === 'pastor_paroki' || authSession.role === 'semua_seksi'
                  ? 'Download Dokumen PDF Laporan Keseluruhan (Landscape & Diagram)'
                  : `Download Dokumen PDF Laporan Program ${activeSeksiNama || 'Seksi'} (Landscape & Diagram)`
              }
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                {authSession.role === 'pastor_paroki' || authSession.role === 'semua_seksi'
                  ? 'Download PDF (Keseluruhan)'
                  : `Download PDF (${activeSeksiNama?.replace('Seksi ', '') || 'Seksi'})`}
              </span>
            </button>
          )}

          {/* Lock / Logout */}
          <button
            type="button"
            onClick={onLockDashboard}
            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[10.5px] font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Keluar / Logout dan kunci kembali dashboard"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>Logout / Keluar</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          1. REMINDER KHUSUS SEKSI YANG BERSANGKUTAN & INPUT EVALUASI
          "Setelah login dari masing-masing seksi di input maka yang pertama keluar 
           ada reminder utk seksi yang bersangkutan dan bisa di input utk mengenai evaluasi"
          ========================================================================= */}
      {activeSeksiNama && (
        <div className="bg-white rounded-2xl border border-emerald-500/30 shadow-sm overflow-hidden animate-in fade-in duration-200">
          {/* Header Reminder Seksi */}
          <div className="px-3.5 py-3 bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Bell className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xs sm:text-sm font-black tracking-tight text-white">
                    Reminder Program Kerja {activeSeksiNama}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/30 border border-emerald-400/40 text-emerald-200">
                    Bulan Berjalan: {BULAN_LIST.find((b) => b.no === reminderMonth)?.nama || `Bulan ${reminderMonth}`} {activeYearDisplay}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-300 mt-0.5">
                  Agenda pelaksanaan program & silakan langsung isi evaluasi keterlaksanaan kegiatan di bawah.
                </p>
              </div>
            </div>

            {/* Dragdown / Dropdown Select Bulan Lain */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <span className="text-[11px] font-medium text-slate-300">Pilih Bulan:</span>
              <div className="relative">
                <select
                  value={reminderMonth}
                  onChange={(e) => handleReminderMonthChange(Number(e.target.value))}
                  className="appearance-none bg-emerald-950/90 hover:bg-emerald-900 text-white text-xs font-bold pl-2.5 pr-7 py-1 rounded-lg border border-emerald-400/50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 shadow-xs transition-colors"
                >
                  {BULAN_LIST.map((b) => (
                    <option key={b.no} value={b.no} className="text-slate-900 bg-white font-medium">
                      {b.nama} {b.no === currentCalendarMonth ? ' (Bulan Ini)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-300 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Body Reminder Seksi */}
          <div className="p-3.5 sm:p-5 space-y-4">
            {/* Status Ringkasan Evaluasi Bulan Ini */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-800">
                  Status Evaluasi {BULAN_LIST.find((b) => b.no === reminderMonth)?.nama}:
                </span>
                {scheduledForSeksiInMonth.length === 0 ? (
                  <span className="text-slate-500 font-medium">Tidak ada program khusus terjadwal</span>
                ) : pendingEvaluationCount > 0 ? (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{pendingEvaluationCount} Program Perlu Diisi Evaluasi</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Semua Program ({evaluatedCount}) Sudah Dievaluasi ✓</span>
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>{scheduledForSeksiInMonth.length} Terjadwal</span>
                <span>•</span>
                <span>{routineForSeksi.length} Pelayanan Rutin</span>
              </div>
            </div>

            {/* DAFTAR PROGRAM KERJA TERJADWAL & TOMBOL INPUT EVALUASI */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Program Kerja Terjadwal Bulan {BULAN_LIST.find((b) => b.no === reminderMonth)?.nama}</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-500">
                  {scheduledForSeksiInMonth.length} Kegiatan
                </span>
              </div>

              {scheduledForSeksiInMonth.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scheduledForSeksiInMonth.map((p) => {
                    const targetDate = p.jadwalBulanan?.[reminderMonth] || p.tanggalSpesifik;
                    const formattedDate = targetDate ? formatIndonesianDate(targetDate) : 'Sesuai Jadwal';
                    const evBulanIni = getEvaluasiForMonth(p, reminderMonth);
                    const hasEvaluasi = !!evBulanIni?.statusKeterlaksanaan;
                    const sisaBudget = getSisaBudgetUntukBulan(p, reminderMonth);
                    const katInfo = getKategoriProgramInfo(p.kategoriProgram);
                    const alokasiBulanIni = getAlokasiBudgetBulanan(p, reminderMonth);
                    const catatanBulanIni = p.catatanBulanan?.[reminderMonth];

                    return (
                      <div
                        key={p.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 shadow-xs ${
                          hasEvaluasi
                            ? 'bg-emerald-50/20 border-emerald-200/90 hover:border-emerald-300'
                            : 'bg-amber-50/40 border-amber-300 hover:border-amber-400'
                        }`}
                      >
                        <div>
                          {/* Header item: Jadwal & Status Evaluasi badge & Klasifikasi */}
                          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9.5px] font-bold text-slate-500">
                                🗓 {formattedDate}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold inline-flex items-center gap-0.5 ${katInfo.badge}`}>
                                <span>{katInfo.iconEmoji}</span>
                                <span>{katInfo.label}</span>
                              </span>
                            </div>
                            {hasEvaluasi ? (
                              evBulanIni?.statusKeterlaksanaan === 'terlaksana' ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold flex items-center gap-1 shadow-2xs">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  <span>Terlaksana dan Sudah Dievaluasi (Bln {reminderMonth})</span>
                                </span>
                              ) : evBulanIni?.statusKeterlaksanaan === 'perubahan_waktu' ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold flex items-center gap-1">
                                  <span>⏳ Geser Waktu (Sudah Dievaluasi)</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-extrabold flex items-center gap-1">
                                  <span>✕ Tidak Terlaksana (Sudah Dievaluasi)</span>
                                </span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold flex items-center gap-1 animate-pulse">
                                <AlertCircle className="w-3 h-3 text-amber-700" />
                                <span>Belum Dievaluasi Bulan {BULAN_LIST[reminderMonth - 1]?.singkatan}</span>
                              </span>
                            )}
                          </div>

                          {/* Nama Program */}
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                            {p.namaProgram}
                          </h4>

                          {/* Info Ringkas: Anggaran & Evaluasi info */}
                          <div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-1 flex-wrap">
                            <span>Pagu Awal: <strong className="text-slate-800">{formatRupiah(p.estimasiAnggaran)}</strong></span>
                            <span>•</span>
                            <span>Alokasi Bln Ini: <strong className="text-slate-800">{formatRupiah(alokasiBulanIni)}</strong></span>
                            <span>•</span>
                            <span>Sisa Budget: <strong className="text-emerald-800 font-extrabold">{formatRupiah(sisaBudget)}</strong></span>
                            {evBulanIni?.tempatPelaksanaan && (
                              <>
                                <span>•</span>
                                <span>Lokasi: {evBulanIni.tempatPelaksanaan}</span>
                              </>
                            )}
                          </div>

                          {/* Catatan Rencana Khusus Bulan Ini jika ada (misal: Pembentukan Panitia / Pencairan Dana) */}
                          {catatanBulanIni && (
                            <div className="mt-1.5 p-2 rounded-lg bg-indigo-50/80 border border-indigo-200 text-[10.5px] text-indigo-950 flex items-start gap-1.5">
                              <span className="font-extrabold text-indigo-700 shrink-0">📝 Note Bln {BULAN_LIST[reminderMonth - 1]?.singkatan}:</span>
                              <span className="font-medium">{catatanBulanIni}</span>
                            </div>
                          )}

                          {/* Catatan hasil evaluasi jika sudah ada */}
                          {evBulanIni?.penjelasanKegiatan && (
                            <p className="text-[11px] text-slate-600 bg-white/70 p-2 rounded-lg border border-slate-200/80 mt-2 line-clamp-2">
                              <span className="font-semibold text-slate-700">Catatan Evaluasi: </span>
                              {evBulanIni.penjelasanKegiatan}
                            </p>
                          )}
                          {evBulanIni?.alasanTidakTerlaksana && (
                            <p className="text-[11px] text-rose-700 bg-rose-50/80 p-2 rounded-lg border border-rose-200 mt-2 line-clamp-2">
                              <span className="font-semibold">Alasan Tidak Terlaksana: </span>
                              {evBulanIni.alasanTidakTerlaksana}
                            </p>
                          )}
                        </div>

                        {/* TOMBOL AKSI: INPUT EVALUASI & LIHAT DETAIL */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => onOpenEvaluasi(p, reminderMonth)}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                              hasEvaluasi
                                ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-98'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{hasEvaluasi ? `✏️ Ubah Evaluasi (${BULAN_LIST[reminderMonth - 1]?.singkatan})` : `📝 Input Evaluasi (${BULAN_LIST[reminderMonth - 1]?.singkatan})`}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenProgramDetail(p.id)}
                            className="py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Buka detail perencanaan program"
                          >
                            <span>Detail</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 px-4 text-center rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <Calendar className="w-7 h-7 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    Tidak ada program kerja khusus non-rutin yang terjadwal di bulan {BULAN_LIST.find((b) => b.no === reminderMonth)?.nama}.
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Seksi {activeSeksiNama} dapat melihat kegiatan pelayanan rutin di bawah ini atau memilih bulan lain dari dropdown di atas.
                  </p>
                </div>
              )}
            </div>

            {/* PELAYANAN RUTIN SEKSI YANG BERSANGKUTAN DENGAN AKSES INPUT EVALUASI */}
            {routineForSeksi.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-amber-600" />
                    <span>Info Pelayanan Rutin {activeSeksiNama}</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">
                    {routineForSeksi.length} Agenda Tetap
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {routineForSeksi.map((r) => {
                    const evBulanIni = getEvaluasiForMonth(r, reminderMonth);
                    const hasEvaluasi = !!evBulanIni?.statusKeterlaksanaan;
                    const sisaBudget = getSisaBudgetUntukBulan(r, reminderMonth);

                    return (
                      <div
                        key={r.id}
                        className="p-3 rounded-xl bg-amber-50/30 border border-amber-200/80 hover:border-amber-300 transition-all flex items-center justify-between gap-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <h5 className="text-xs font-bold text-slate-900 truncate">
                              {r.namaProgram}
                            </h5>
                            {evBulanIni?.statusKeterlaksanaan === 'terlaksana' && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-extrabold flex items-center gap-0.5 shadow-2xs">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                                <span>Terlaksana Bulan {BULAN_LIST[reminderMonth - 1]?.singkatan}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 pl-3 flex items-center gap-1.5 flex-wrap">
                            <span>Pagu: {formatRupiah(r.estimasiAnggaran)}</span>
                            <span>•</span>
                            <span>Sisa Bln {reminderMonth}: <strong className="text-emerald-800 font-extrabold">{formatRupiah(sisaBudget)}</strong></span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenEvaluasi(r, reminderMonth)}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs ${
                            hasEvaluasi
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-white hover:bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                          title={`Input atau lihat evaluasi pelayanan rutin bulan ${BULAN_LIST[reminderMonth - 1]?.nama}`}
                        >
                          <FileText className="w-3 h-3 text-amber-700" />
                          <span>{hasEvaluasi ? `✓ Selesai (${BULAN_LIST[reminderMonth - 1]?.singkatan})` : `Evaluasi (${BULAN_LIST[reminderMonth - 1]?.singkatan})`}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. METRIK UTAMA BERDASARKAN BULAN & SEKSI PILIHAN */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
        {/* Metric 1: Total Program (Terjadwal vs Pelayanan Rutin) */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              {selectedSeksi !== 'all' ? selectedSeksi.replace('Seksi ', '') : 'Total Program'}
            </span>
            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-slate-900 tabular-nums">
              {allActiveProgramsInView.length}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">Program</span>
          </div>
          <div className="text-[9.5px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-emerald-800">
              {scheduledProgramsInMonth.length} Terjadwal
            </span>
            <span>•</span>
            <span className="text-indigo-700 font-bold">{routinePrograms.length} Pelayanan Rutin</span>
          </div>
        </div>

        {/* Metric 2: Estimasi Anggaran */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Anggaran
            </span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-base font-extrabold text-emerald-800 tabular-nums truncate">
              {formatCompactRupiah(totalAnggaran)}
            </span>
          </div>
          <p className="text-[9.5px] text-slate-400 mt-0.5 truncate">
            {formatRupiah(totalAnggaran)}
          </p>
        </div>

        {/* Metric 3: Seksi Terlibat */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Unit Terlibat
            </span>
            <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-slate-900 tabular-nums">
              {selectedSeksi === 'all' ? activeSeksiBreakdown.length : 1}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              {selectedSeksi === 'all' ? 'Unit Aktif' : 'Unit Dipilih'}
            </span>
          </div>
          <p className="text-[9.5px] text-slate-400 mt-0.5 truncate">
            {selectedSeksi === 'all'
              ? `${activeSeksiBreakdown.length} unit memiliki kegiatan`
              : selectedSeksi}
          </p>
        </div>

        {/* Metric 4: Status Pelaksanaan */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Status Pelaksanaan
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 text-[9.5px] font-bold mt-1 flex-wrap">
            <span className="text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-200">
              {statusCounts.direncanakan} Rencana
            </span>
            <span className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
              {statusCounts.selesai} Selesai
            </span>
          </div>
          <p className="text-[9.5px] font-semibold mt-1 truncate text-emerald-800">
            {statusCounts.sudahDievaluasi > 0
              ? `${statusCounts.sudahDievaluasi} Terlaksana & Sudah Dievaluasi`
              : `${statusCounts.berlangsung} Sedang Berjalan`}
          </p>
          {luarRancanganCount > 0 && (
            <div className="mt-1 pt-1 border-t border-slate-100 flex items-center gap-1">
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                <span>{luarRancanganCount} Luar Rancangan</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2B. BANNER KHUSUS PROGRAM TERLAKSANA DI LUAR RANCANGAN (INSIDENTAL) */}
      <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 border border-amber-200/90 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-700 flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs font-black text-amber-950">
                Program Terlaksana di Luar Rancangan Awal
              </h4>
              <span className="text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900">
                {luarRancanganCount} Kegiatan Terlaksana
              </span>
            </div>
            <p className="text-[10.5px] text-amber-900/80 mt-0.5">
              Kegiatan tambahan insidental yang terlaksana untuk kebutuhan umat paroki tanpa masuk buku rancangan awal.
            </p>
          </div>
        </div>

        {onInputProgramLuarRancangan && (
          <button
            type="button"
            onClick={() => onInputProgramLuarRancangan(selectedSeksi !== 'all' ? selectedSeksi : undefined)}
            className="self-end sm:self-auto px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Tambah program yang terlaksana namun tidak masuk dalam rancangan awal (insidental)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Program Luar Rancangan</span>
          </button>
        )}
      </div>

      {/* 2. TAMPILAN PROGRAM KERJA & PELAYANAN RUTIN PER UNIT (DPPH & 15 SEKSI - MODEL SAMA PERSIS) */}
      {displayedSeksiBreakdown.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3 w-full">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">
              {selectedMonthObj
                ? selectedSeksi !== 'all'
                  ? `Tidak ada program kerja ${selectedSeksi} di bulan ${selectedMonthObj.nama}`
                  : `Tidak ada program kerja di bulan ${selectedMonthObj.nama}`
                : selectedSeksi !== 'all'
                ? `Tidak ada program kerja untuk ${selectedSeksi}`
                : 'Tidak ada program kerja'}
            </h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
              Pilih bulan lain pada daftar di atas atau tambah program kerja baru untuk {selectedSeksi !== 'all' ? selectedSeksi : 'DPPH / Seksi paroki'}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onInputProgramForSeksi(selectedSeksi !== 'all' ? selectedSeksi : MASTER_DIVISIONS[0].nama)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Input Program Baru {selectedSeksi !== 'all' ? `untuk ${selectedSeksi}` : ''}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3 w-full">
          <div className={`w-full ${selectedSeksi === 'all' ? 'grid grid-cols-1 md:grid-cols-2 gap-2.5' : 'grid grid-cols-1 gap-2.5'}`}>
            {displayedSeksiBreakdown.map(({ division, scheduledPrograms: seksiScheduled, routinePrograms: seksiRoutine, count, totalAnggaran: seksiAnggaran }) => {
              const isRoutineOpen = !!expandedSeksiRoutine[division.id];

              return (
                <div
                  key={division.id}
                  className="w-full p-3 sm:p-4 rounded-xl border bg-slate-50/70 border-slate-200/90 hover:border-slate-300 transition-all shadow-2xs"
                >
                  {/* Header Card Unit (Seksi / DPPH) */}
                  <div className="flex items-start justify-between gap-2 mb-2 w-full">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                        {getSeksiIcon(division.code)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {division.nama}
                          </h3>
                          <span className="text-[9px] font-semibold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                            {division.kategori}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-emerald-800 font-medium truncate">
                          PIC: <span className="font-bold">{division.defaultPic}</span>
                        </p>
                      </div>
                    </div>

                    {/* Program Count Badge & Input Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border bg-emerald-600 text-white border-emerald-600 shadow-2xs">
                        {count} Proker
                      </span>
                      {onInputProgramLuarRancangan && (
                        <button
                          type="button"
                          onClick={() => onInputProgramLuarRancangan(division.nama)}
                          className="h-7 px-2 rounded-md bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 flex items-center justify-center gap-1 shadow-2xs transition-colors text-[10px] font-bold cursor-pointer"
                          title={`Input Kegiatan di Luar Rancangan (Insidental) untuk ${division.nama}`}
                        >
                          <Sparkles className="w-3 h-3 text-amber-700" />
                          <span className="hidden md:inline">+ Luar Rancangan</span>
                        </button>
                      )}
                      {onOpenDualPlanningForSeksi && (
                        <button
                          type="button"
                          onClick={() => onOpenDualPlanningForSeksi(division.nama)}
                          className="h-7 px-2 rounded-md bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-900 flex items-center justify-center gap-1 shadow-2xs transition-colors text-[10px] font-bold cursor-pointer"
                          title={`Buka Lembar Kerja Perancangan 2 Sisi (2026 vs 2027) untuk ${division.nama}`}
                        >
                          <ArrowRight className="w-3 h-3 text-indigo-600" />
                          <span className="hidden md:inline">Rancang 2 Sisi</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onInputProgramForSeksi(division.nama)}
                        className="h-7 px-2 rounded-md bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 flex items-center justify-center gap-1 shadow-2xs transition-colors text-[10px] font-bold"
                        title={`Input Program Baru untuk ${division.nama}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tambah</span>
                      </button>
                    </div>
                  </div>

                  {/* Sub: Agenda Program Terjadwal & Pelayanan Rutin */}
                  <div className="space-y-2 pt-2 border-t border-slate-200/60 w-full">
                    <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-500 w-full px-0.5">
                      <span>Agenda Program & Pelayanan:</span>
                      <span className="text-emerald-800 font-extrabold tabular-nums">
                        Total {formatCompactRupiah(seksiAnggaran)}
                      </span>
                    </div>

                    {/* 1. Program Terjadwal Bulan Ini (Termasuk Rapat DPPH pada kartu DPPH) */}
                    {seksiScheduled.length > 0 ? (
                      <div className="space-y-1 w-full">
                        {seksiScheduled.map((p) => {
                          const targetMonth = typeof selectedMonth === 'number' ? selectedMonth : 10;
                          const targetDate =
                            typeof selectedMonth === 'number'
                              ? p.jadwalBulanan?.[selectedMonth] || p.tanggalSpesifik
                              : p.tanggalSpesifik;
                          const formattedDate = targetDate ? formatIndonesianDate(targetDate) : 'Sesuai Jadwal';
                          const evBulanIni = getEvaluasiForMonth(p, targetMonth);
                          const sisaBudget = getSisaBudgetUntukBulan(p, targetMonth);
                          const katInfo = getKategoriProgramInfo(p.kategoriProgram);
                          const catatanBulanIni = p.catatanBulanan?.[targetMonth];
                          const alokasiBulanIni = getAlokasiBudgetBulanan(p, targetMonth);

                          return (
                            <div
                              key={p.id}
                              className="w-full text-left p-2.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all flex items-center justify-between gap-2.5 group shadow-2xs"
                            >
                              <button
                                type="button"
                                onClick={() => onOpenProgramDetail(p.id)}
                                className="min-w-0 flex-1 text-left cursor-pointer"
                              >
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border ${getStatusInfo(p.status).color}`}>
                                    {getStatusInfo(p.status).label}
                                  </span>
                                  <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border ${katInfo.badge}`}>
                                    <span>{katInfo.iconEmoji}</span> {katInfo.label}
                                  </span>
                                  {p.isLuarRancangan && (
                                    <span className="text-[8.5px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5 shadow-2xs">
                                      <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                                      <span>Luar Rancangan</span>
                                    </span>
                                  )}
                                  {evBulanIni?.statusKeterlaksanaan === 'terlaksana' && (
                                    <span className="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-0.5 shadow-2xs">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                                      <span>Terlaksana Bln {targetMonth}</span>
                                    </span>
                                  )}
                                  {evBulanIni?.statusKeterlaksanaan === 'tidak_terlaksana' && (
                                    <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                      ✕ Tidak Terlaksana
                                    </span>
                                  )}
                                  {evBulanIni?.statusKeterlaksanaan === 'perubahan_waktu' && (
                                    <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                      ⏳ Geser Waktu {evBulanIni.jadwalBaru ? `(${evBulanIni.jadwalBaru})` : ''}
                                    </span>
                                  )}
                                  <p className="text-[11.5px] sm:text-xs font-bold text-slate-900 group-hover:text-emerald-950 truncate">
                                    {p.namaProgram}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                                  <span>🗓 {formattedDate}</span>
                                  <span>•</span>
                                  <span>Pagu: {formatRupiah(p.estimasiAnggaran)}</span>
                                  {alokasiBulanIni > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>Alokasi Bln Ini: <strong className="text-slate-800">{formatRupiah(alokasiBulanIni)}</strong></span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span className="font-extrabold text-emerald-800">
                                    Sisa: {formatRupiah(sisaBudget)}
                                  </span>
                                  {catatanBulanIni && (
                                    <span className="text-[9.5px] text-indigo-800 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded font-medium">
                                      Note: {catatanBulanIni}
                                    </span>
                                  )}
                                </div>
                              </button>

                              {/* Tombol Aksi: Evaluasi & Buka Detail */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenEvaluasi(p, targetMonth);
                                  }}
                                  className={`px-2 py-1 rounded-md text-[9.5px] font-bold border transition-colors flex items-center gap-1 cursor-pointer shadow-2xs ${
                                    evBulanIni?.statusKeterlaksanaan
                                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                  }`}
                                  title={`Isi atau lihat evaluasi pelaksanaan bulan ${targetMonth}`}
                                >
                                  <FileText className="w-3 h-3 text-amber-700" />
                                  <span>{evBulanIni?.statusKeterlaksanaan ? `✓ Evaluasi (${targetMonth})` : `Evaluasi (${targetMonth})`}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onOpenProgramDetail(p.id)}
                                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors flex items-center gap-0.5 cursor-pointer shadow-2xs"
                                >
                                  <span>Buka</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* 2. Pelayanan Rutin Sepanjang Tahun yang Berjalan Tiap Bulan */}
                    {/* Dinyatakan sebagai Pelayanan Rutin dengan note item apa saja dan di-hide dulu */}
                    {seksiRoutine.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span className="w-6 h-6 rounded-md bg-white text-indigo-700 font-bold flex items-center justify-center shrink-0 border border-indigo-200 shadow-2xs mt-0.5">
                              <Repeat className="w-3.5 h-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-indigo-950 text-xs">
                                  Pelayanan Rutin ({seksiRoutine.length} Kegiatan)
                                </span>
                                <span className="text-[8.5px] bg-indigo-200/70 text-indigo-900 font-bold px-1.5 py-0.2 rounded">
                                  Berjalan Setiap Bulan
                                </span>
                              </div>
                              {/* Note ringkasan item kegiatan yang ada dalam pelayanan rutin */}
                              <p className="text-[10px] text-indigo-800/90 line-clamp-1 mt-0.5">
                                <span className="font-semibold text-indigo-900">Note: </span>
                                {seksiRoutine.map((r) => r.namaProgram).join(', ')}
                              </p>
                            </div>
                          </div>

                          {/* Tombol Toggle: Menampilkan / menyembunyikan detail list program */}
                          <button
                            type="button"
                            onClick={() => toggleSeksiRoutine(division.id)}
                            className="px-2.5 py-1 bg-white hover:bg-indigo-100 rounded-lg border border-indigo-300 text-indigo-900 font-bold text-[10px] shrink-0 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isRoutineOpen ? 'Sembunyikan' : `Lihat Program (${seksiRoutine.length})`}</span>
                            {isRoutineOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* List Detail Program Pelayanan Rutin: Terbuka hanya saat tombol diklik */}
                        {isRoutineOpen && (
                          <div className="pt-2 border-t border-indigo-200 space-y-1.5 w-full">
                            <div className="flex items-center justify-between text-[9.5px] font-bold text-indigo-900 px-0.5">
                              <span>Daftar Pelayanan Rutin {division.nama}:</span>
                              <span className="text-indigo-700 font-semibold">
                                Total {formatRupiah(seksiRoutine.reduce((sum, r) => sum + (r.estimasiAnggaran || 0), 0))}
                              </span>
                            </div>

                            <div className="space-y-1.5 w-full">
                              {seksiRoutine.map((r, rIdx) => {
                                const targetMonth = typeof selectedMonth === 'number' ? selectedMonth : 10;
                                const evBulanIni = getEvaluasiForMonth(r, targetMonth);
                                const sisaBudget = getSisaBudgetUntukBulan(r, targetMonth);

                                return (
                                <div
                                  key={r.id}
                                  className="w-full p-2.5 rounded-lg bg-white border border-indigo-200/90 shadow-2xs hover:border-indigo-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-900 font-extrabold text-[9.5px] flex items-center justify-center shrink-0 mt-0.5">
                                      {rIdx + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <h5 className="text-xs font-bold text-slate-900 truncate">
                                          {r.namaProgram}
                                        </h5>
                                        {evBulanIni?.statusKeterlaksanaan === 'terlaksana' && (
                                          <span className="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-0.5 shadow-2xs">
                                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                                            <span>Terlaksana Bln {targetMonth}</span>
                                          </span>
                                        )}
                                        {evBulanIni?.statusKeterlaksanaan === 'tidak_terlaksana' && (
                                          <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                            ✕ Tidak Terlaksana
                                          </span>
                                        )}
                                        {evBulanIni?.statusKeterlaksanaan === 'perubahan_waktu' && (
                                          <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                            ⏳ Geser Waktu {evBulanIni.jadwalBaru ? `(${evBulanIni.jadwalBaru})` : ''}
                                          </span>
                                        )}
                                      </div>
                                      {r.tujuanKegiatan && (
                                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                          {r.tujuanKegiatan}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2 text-[9.5px] text-slate-600 mt-1 flex-wrap font-medium">
                                        <span className="text-indigo-700 bg-indigo-50 px-1 rounded">
                                          🗓 Berjalan setiap bulan (Jan - Des)
                                        </span>
                                        <span>•</span>
                                        <span>Pagu: {formatRupiah(r.estimasiAnggaran)}</span>
                                        <span>•</span>
                                        <span className="font-extrabold text-emerald-800">
                                          Sisa Bln {targetMonth}: {formatRupiah(sisaBudget)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Tombol Aksi: Evaluasi & Buka Program */}
                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                    <button
                                      type="button"
                                      onClick={() => onOpenEvaluasi(r, targetMonth)}
                                      className={`px-2 py-1 rounded-md text-[9.5px] font-bold border transition-colors flex items-center gap-1 cursor-pointer shadow-2xs ${
                                        evBulanIni?.statusKeterlaksanaan
                                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                                          : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                      }`}
                                      title={`Isi atau lihat evaluasi pelaksanaan bulan ${targetMonth}`}
                                    >
                                      <FileText className="w-3 h-3 text-amber-700" />
                                      <span>{evBulanIni?.statusKeterlaksanaan ? `✓ Evaluasi (${targetMonth})` : `Evaluasi (${targetMonth})`}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => onOpenProgramDetail(r.id)}
                                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>Buka Program</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. DAFTAR PROGRAM UTAMA TERJADWAL SESUAI BULAN YANG DIPILIH */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 w-full">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                Program Terjadwal {selectedMonthObj ? `Bulan ${selectedMonthObj.nama}` : 'Periode Ini'} ({scheduledProgramsInMonth.length})
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Program kerja yang dijadwalkan khusus terlaksana pada bulan ini
            </p>
          </div>
          <span className="text-xs sm:text-sm font-extrabold text-emerald-800 tabular-nums shrink-0">
            Total {formatCompactRupiah(scheduledProgramsInMonth.reduce((s, p) => s + (p.estimasiAnggaran || 0), 0))}
          </span>
        </div>

        {scheduledProgramsInMonth.length === 0 ? (
          <div className="py-5 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">
              Tidak ada agenda program kerja khusus yang jatuh di bulan {selectedMonthObj ? selectedMonthObj.nama : 'ini'}.
            </p>
            <p className="text-[10.5px] text-slate-400">
              {routinePrograms.length > 0
                ? `Kegiatan yang berjalan pada bulan ini mencakup ${routinePrograms.length} pelayanan rutin di bawah.`
                : 'Pilih bulan lain pada filter di atas atau tambah program baru.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 w-full">
            {scheduledProgramsInMonth.map((p, idx) => {
              const targetDate =
                typeof selectedMonth === 'number'
                  ? p.jadwalBulanan?.[selectedMonth] || p.tanggalSpesifik
                  : p.tanggalSpesifik;
              const formattedDate = targetDate ? formatIndonesianDate(targetDate) : 'Sesuai Jadwal';

              return (
                <div
                  key={p.id}
                  className="w-full text-left py-2.5 px-2 sm:px-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 group border border-transparent hover:border-slate-200"
                >
                  <button
                    type="button"
                    onClick={() => onOpenProgramDetail(p.id)}
                    className="flex items-start gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-2xs">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          {p.penanggungjawab?.divisi || 'Seksi Umum'}
                        </span>
                        <span className="text-[9.5px] text-slate-400 font-semibold">
                          Thn {p.tahun}
                        </span>
                        {p.evaluasi?.statusKeterlaksanaan === 'terlaksana' ? (
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>Terlaksana dan Sudah Dievaluasi</span>
                          </span>
                        ) : (
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getStatusInfo(p.status).color}`}>
                            {getStatusInfo(p.status).label}
                          </span>
                        )}
                        {p.evaluasi?.statusKeterlaksanaan === 'tidak_terlaksana' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                            ✕ Tidak Terlaksana (Sudah Dievaluasi)
                          </span>
                        )}
                        {p.evaluasi?.statusKeterlaksanaan === 'perubahan_waktu' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            ⏳ Geser Waktu (Sudah Dievaluasi)
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-900 transition-colors mt-0.5 break-words">
                        {p.namaProgram}
                      </h4>
                      <div className="flex items-center gap-2 sm:gap-4 text-[9.5px] sm:text-[10px] text-slate-500 mt-1 flex-wrap">
                        <span>👤 {p.penanggungjawab?.nama || 'Koordinator Seksi'}</span>
                        <span>•</span>
                        <span>🗓 {formattedDate}</span>
                        <span>•</span>
                        <span className="font-extrabold text-emerald-800 tabular-nums">
                          {formatRupiah(p.estimasiAnggaran)}
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    <button
                      type="button"
                      onClick={() => onOpenEvaluasi(p)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer shadow-2xs ${
                        p.evaluasi?.statusKeterlaksanaan
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                      title="Isi atau lihat evaluasi pelaksanaan program"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-700" />
                      <span>{p.evaluasi?.statusKeterlaksanaan ? '✓ Sudah Dievaluasi' : 'Evaluasi'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenProgramDetail(p.id)}
                      className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-0.5 shadow-2xs cursor-pointer"
                    >
                      <span>Detail</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. BAGIAN KHUSUS PELAYANAN RUTIN SEPANJANG TAHUN */}
      {routinePrograms.length > 0 && (
        <div className="w-full bg-indigo-50/70 rounded-2xl border border-indigo-200/90 shadow-2xs p-3.5 sm:p-4 space-y-3 transition-all">
          <div className="flex items-start justify-between gap-3 pb-2 border-b border-indigo-200/80 w-full">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-xs mt-0.5">
                <Repeat className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-indigo-950 truncate">
                    Pelayanan Rutin Sepanjang Tahun ({routinePrograms.length} Pelayanan)
                  </h3>
                  <span className="text-[9px] font-bold text-indigo-800 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shrink-0">
                    Berjalan Setiap Bulan
                  </span>
                </div>
                {/* Note item apa saja dalam pelayanan rutin */}
                <p className="text-[10px] sm:text-[10.5px] text-indigo-900 mt-0.5">
                  <span className="font-semibold text-indigo-950">Note item: </span>
                  {routinePrograms.map((r) => r.namaProgram).join(', ')}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="text-xs font-extrabold text-indigo-950 tabular-nums">
                Total {formatCompactRupiah(totalAnggaranRoutine)}
              </span>
              {/* Tombol Toggle Buka/Hide List Pelayanan Rutin */}
              <button
                type="button"
                onClick={() => setIsBottomRoutineExpanded((prev) => !prev)}
                className="px-2.5 py-1 bg-white hover:bg-indigo-100 rounded-lg border border-indigo-300 text-indigo-900 font-bold text-[10px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>{isBottomRoutineExpanded ? 'Sembunyikan Daftar' : `Buka Daftar (${routinePrograms.length})`}</span>
                {isBottomRoutineExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* List Detail Program Pelayanan Rutin: Terbuka hanya saat tombol diklik */}
          {isBottomRoutineExpanded && (
            <div className="divide-y divide-indigo-100 bg-white rounded-xl border border-indigo-200/80 overflow-hidden w-full transition-all">
              {routinePrograms.map((p, idx) => (
                <div
                  key={p.id}
                  className="w-full p-3 hover:bg-indigo-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-900 font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9.5px] font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                          {p.penanggungjawab?.divisi || 'Seksi Umum'}
                        </span>
                        <span className="text-[9.5px] text-slate-500 font-semibold">
                          Tahun {p.tahun}
                        </span>
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.2 rounded border border-indigo-200">
                          🔄 Pelayanan Rutin
                        </span>
                        {p.evaluasi?.statusKeterlaksanaan === 'terlaksana' && (
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>Terlaksana dan Sudah Dievaluasi</span>
                          </span>
                        )}
                        {p.evaluasi?.statusKeterlaksanaan === 'tidak_terlaksana' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                            ✕ Tidak Terlaksana (Sudah Dievaluasi)
                          </span>
                        )}
                        {p.evaluasi?.statusKeterlaksanaan === 'perubahan_waktu' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            ⏳ Geser Waktu (Sudah Dievaluasi)
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-1 break-words">
                        {p.namaProgram}
                      </h4>

                      {p.tujuanKegiatan && (
                        <p className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">
                          {p.tujuanKegiatan}
                        </p>
                      )}

                      <div className="flex items-center gap-2 sm:gap-4 text-[9.5px] sm:text-[10px] text-indigo-900 mt-1 flex-wrap font-medium">
                        <span>👤 PIC: {p.penanggungjawab?.nama || 'Koordinator Seksi'}</span>
                        <span>•</span>
                        <span className="text-indigo-700 bg-indigo-50/80 px-1 rounded">
                          🗓 {p.tanggalSpesifik || 'Berjalan rutin setiap bulan'}
                        </span>
                        <span>•</span>
                        <span className="font-extrabold text-emerald-800 tabular-nums">
                          {formatRupiah(p.estimasiAnggaran)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onOpenEvaluasi(p)}
                      className={`px-2.5 py-1.5 rounded-lg font-bold text-[10px] border transition-colors flex items-center gap-1 shadow-2xs cursor-pointer ${
                        p.evaluasi?.statusKeterlaksanaan
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                      title="Isi atau lihat evaluasi pelaksanaan program"
                    >
                      <FileText className="w-3 h-3 text-amber-700" />
                      <span>{p.evaluasi?.statusKeterlaksanaan ? '✓ Sudah Dievaluasi' : 'Evaluasi'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenProgramDetail(p.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <span>Buka Program</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
