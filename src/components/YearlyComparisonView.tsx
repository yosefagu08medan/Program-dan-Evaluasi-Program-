import React, { useState, useMemo } from 'react';
import {
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Building2,
  Phone,
  MessageSquare,
  Sparkles,
  Printer,
  ChevronRight,
  Search,
  Filter,
  Layers,
  HelpCircle,
  PlusCircle,
  ArrowUpRight,
  ShieldCheck,
  Edit,
  Save,
  RotateCcw,
} from 'lucide-react';
import { ProgramKerja, StatusKeterlaksanaan } from '../types/proker';
import { AuthSession } from '../types/auth';
import {
  BULAN_LIST,
  formatRupiah,
  getStatusInfo,
  isDivisionMatch,
  getProgramExecutionSummary,
  getLatestEvaluasi,
  hasProgramEvaluasi,
} from '../utils/formatters';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';

interface YearlyComparisonViewProps {
  programs: ProgramKerja[];
  authSession: AuthSession | null;
  onOpenProgramDetail: (progId: string) => void;
  onOpenEvaluasi: (prog: ProgramKerja, targetMonth?: number) => void;
  onNavigateToDualPlanning: (seksiName: string, program2026?: ProgramKerja) => void;
  onSaveProgram: (updated: ProgramKerja) => void;
  initialSeksi?: string | 'all';
}

export const YearlyComparisonView: React.FC<YearlyComparisonViewProps> = ({
  programs,
  authSession,
  onOpenProgramDetail,
  onOpenEvaluasi,
  onNavigateToDualPlanning,
  onSaveProgram,
  initialSeksi = 'all',
}) => {
  const isPastorOrDpphOrAdmin =
    authSession?.role === 'pastor_paroki' ||
    authSession?.role === 'semua_seksi' ||
    authSession?.unitId === 'div-dpph' ||
    Boolean(authSession?.unitNama?.toLowerCase().includes('dpph'));

  const [selectedSeksi, setSelectedSeksi] = useState<string | 'all'>(() => {
    if (authSession?.role === 'seksi' && authSession.unitNama) {
      return authSession.unitNama;
    }
    return initialSeksi;
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter2026, setStatusFilter2026] = useState<'all' | 'terlaksana' | 'kendala' | 'tidak_terlaksana'>('all');
  const [editingRekomendasiId, setEditingRekomendasiId] = useState<string | null>(null);
  const [rekomendasiInput, setRekomendasiInput] = useState<string>('');

  // Saring daftar seksi yang ditampilkan
  const divisionList = useMemo(() => {
    if (selectedSeksi === 'all') {
      return MASTER_DIVISIONS;
    }
    return MASTER_DIVISIONS.filter((d) => isDivisionMatch(d.nama, selectedSeksi));
  }, [selectedSeksi]);

  // Kelompokkan data per seksi: Program 2026 dan Program 2027
  const comparisonDataPerSeksi = useMemo(() => {
    return divisionList.map((div) => {
      const seksiPrograms = programs.filter((p) => isDivisionMatch(p.penanggungjawab?.divisi, div.nama));
      
      const progs2026 = seksiPrograms.filter((p) => p.tahun === 2026);
      const progs2027 = seksiPrograms.filter((p) => p.tahun === 2027);

      // Metrik 2026
      const count2026 = progs2026.length;
      const budget2026 = progs2026.reduce((sum, p) => sum + (p.estimasiAnggaran || 0), 0);
      const terlaksana2026 = progs2026.filter((p) => {
        if (p.status === 'selesai') return true;
        const sum26 = getProgramExecutionSummary(p);
        return sum26.overallStatus === 'terlaksana_penuh' || sum26.overallStatus === 'terlaksana_sebagian';
      }).length;

      const tidakTerlaksana2026 = progs2026.filter((p) => {
        if (p.status === 'ditunda') return true;
        const sum26 = getProgramExecutionSummary(p);
        return sum26.overallStatus === 'tidak_terlaksana';
      }).length;

      const adaKendala2026 = progs2026.filter((p) => {
        const sum26 = getProgramExecutionSummary(p);
        const ev26 = getLatestEvaluasi(p);
        const alasan = ev26?.alasanTidakTerlaksana || ev26?.alasanPerubahanWaktu;
        return sum26.rincianTidakTerlaksana.length > 0 || Boolean(alasan && alasan.trim().length > 0);
      }).length;

      // Metrik 2027 (Program yang ditolak DPP tidak masuk ke program final seksi)
      const progs2027Final = progs2027.filter((p) => p.catatanPastorParoki?.statusPersetujuan !== 'ditolak');
      const count2027 = progs2027Final.length;
      const budget2027 = progs2027Final.reduce((sum, p) => sum + (p.estimasiAnggaran || 0), 0);
      const ditolak2027 = progs2027.filter((p) => p.catatanPastorParoki?.statusPersetujuan === 'ditolak').length;
      const lanjutanCount2027 = progs2027Final.filter((p) => Boolean(p.programLanjutanDariId || p.namaProgram2026Asal)).length;

      // Filter pencarian dan status jika diterapkan
      const filteredProgs2026 = progs2026.filter((p) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.namaProgram.toLowerCase().includes(q);
          const matchTujuan = p.tujuanKegiatan?.toLowerCase().includes(q) || false;
          if (!matchName && !matchTujuan) return false;
        }

        const sum26 = getProgramExecutionSummary(p);
        const ev26 = getLatestEvaluasi(p);
        if (statusFilter2026 === 'terlaksana') {
          return p.status === 'selesai' || sum26.overallStatus === 'terlaksana_penuh' || sum26.overallStatus === 'terlaksana_sebagian';
        }
        if (statusFilter2026 === 'tidak_terlaksana') {
          return p.status === 'ditunda' || sum26.overallStatus === 'tidak_terlaksana';
        }
        if (statusFilter2026 === 'kendala') {
          return sum26.rincianTidakTerlaksana.length > 0 || Boolean(ev26?.alasanTidakTerlaksana || ev26?.alasanPerubahanWaktu);
        }
        return true;
      });

      return {
        division: div,
        count2026,
        budget2026,
        terlaksana2026,
        tidakTerlaksana2026,
        adaKendala2026,
        count2027,
        budget2027,
        lanjutanCount2027,
        ditolakCount2027: ditolak2027,
        diffBudget: budget2027 - budget2026,
        progs2026: filteredProgs2026,
        progs2027,
      };
    });
  }, [divisionList, programs, searchQuery, statusFilter2026]);

  // Total Keseluruhan
  const overallSummary = useMemo(() => {
    let totProgs2026 = 0;
    let totBudget2026 = 0;
    let totTerlaksana2026 = 0;
    let totProgs2027 = 0;
    let totBudget2027 = 0;

    comparisonDataPerSeksi.forEach((item) => {
      totProgs2026 += item.count2026;
      totBudget2026 += item.budget2026;
      totTerlaksana2026 += item.terlaksana2026;
      totProgs2027 += item.count2027;
      totBudget2027 += item.budget2027;
    });

    const completionRate = totProgs2026 > 0 ? Math.round((totTerlaksana2026 / totProgs2026) * 100) : 0;
    const diffBudget = totBudget2027 - totBudget2026;

    return {
      totProgs2026,
      totBudget2026,
      totTerlaksana2026,
      completionRate,
      totProgs2027,
      totBudget2027,
      diffBudget,
    };
  }, [comparisonDataPerSeksi]);

  const handleSaveRekomendasi = (prog: ProgramKerja) => {
    const updated: ProgramKerja = {
      ...prog,
      rekomendasiDPPH: rekomendasiInput.trim(),
      updatedAt: new Date().toISOString(),
    };
    onSaveProgram(updated);
    setEditingRekomendasiId(null);
    setRekomendasiInput('');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. HEADER KHUSUS DPPH & SEKSI */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Tinjauan Komparasi Program & Evaluasi (2026 vs 2027)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 uppercase">
                  Menu Khusus DPPH & Seksi
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Evaluasi keterlaksanaan kegiatan tahun 2026 per Seksi disandingkan dengan rancangan program tahun 2027 untuk memastikan kesinambungan karya pastoral
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="self-start md:self-auto h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan Komparasi</span>
          </button>
        </div>

        {/* Filter Bar Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Seksi */}
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

            {/* Filter Status 2026 */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter2026('all')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter2026 === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Status 2026
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter2026('terlaksana')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter2026 === 'terlaksana'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✓ Terlaksana
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter2026('kendala')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter2026 === 'kendala'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Ada Kendala</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari program / kendala..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* 2. RINGKASAN METRIK KOMPARASI TOTAL */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Program 2026 (Realisasi)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900">{overallSummary.totProgs2026}</span>
            <span className="text-xs font-bold text-emerald-700">
              ({overallSummary.totTerlaksana2026} Terlaksana · {overallSummary.completionRate}%)
            </span>
          </div>
          <p className="text-[10.5px] text-slate-500 font-medium">
            Anggaran: {formatRupiah(overallSummary.totBudget2026)}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Rancangan 2027 (Diajukan)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-indigo-950">{overallSummary.totProgs2027}</span>
            <span className="text-[11px] font-bold text-indigo-700">Kegiatan Baru & Lanjutan</span>
          </div>
          <p className="text-[10.5px] text-slate-500 font-medium">
            Estimasi: {formatRupiah(overallSummary.totBudget2027)}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Pertumbuhan Anggaran
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-black ${
                overallSummary.diffBudget > 0
                  ? 'text-amber-700'
                  : overallSummary.diffBudget < 0
                  ? 'text-emerald-700'
                  : 'text-slate-700'
              }`}
            >
              {overallSummary.diffBudget > 0 ? '+' : ''}
              {formatRupiah(overallSummary.diffBudget)}
            </span>
          </div>
          <p className="text-[10.5px] text-slate-500 font-medium">
            Selisih pengajuan 2027 vs 2026
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 p-3.5 rounded-2xl border border-blue-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">
            Keterlaksanaan Paroki 2026
          </span>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-blue-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallSummary.completionRate}%` }}
              />
            </div>
            <span className="text-sm font-black text-blue-950">
              {overallSummary.completionRate}%
            </span>
          </div>
          <p className="text-[10px] text-blue-800 font-semibold">
            Tingkat keberhasilan eksekusi program
          </p>
        </div>
      </div>

      {/* 3. KOMPARASI DUA SISI PER SEKSI (2026 VS 2027) */}
      <div className="space-y-6">
        {comparisonDataPerSeksi.map((group) => {
          return (
            <div
              key={group.division.id}
              className="bg-white rounded-2xl border border-slate-300/80 shadow-2xs overflow-hidden"
            >
              {/* Header Kartu Seksi */}
              <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm sm:text-base font-extrabold text-white">
                      {group.division.nama}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                      {group.division.kategori}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    PIC Koordinator: {group.division.defaultPic} · {group.division.deskripsi}
                  </p>
                </div>

                {/* Sub-metrik & Tombol Perancangan 2 Sisi */}
                <div className="flex items-center gap-3">
                  <div className="text-right text-[11px]">
                    <div className="text-slate-300">
                      2026: <strong className="text-white">{group.count2026} Proker</strong> ({formatRupiah(group.budget2026)})
                    </div>
                    <div className="text-slate-300">
                      2027: <strong className="text-white">{group.count2027} Proker</strong> ({formatRupiah(group.budget2027)})
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateToDualPlanning(group.division.nama)}
                    className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span>Rancang 2 Sisi (2027)</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Konten Komparasi 2 Kolom Berdampingan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                {/* ================= SISI KIRI: REALISASI & EVALUASI 2026 ================= */}
                <div className="p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Realisasi & Evaluasi Tahun 2026 ({group.progs2026.length})
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">
                      Terlaksana: {group.terlaksana2026} · Kendala: {group.adaKendala2026}
                    </span>
                  </div>

                  {group.progs2026.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      Tidak ada program kerja tahun 2026 yang sesuai dengan filter pencarian.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {group.progs2026.map((prog) => {
                        const summary = getProgramExecutionSummary(prog);
                        const latestEv = getLatestEvaluasi(prog);
                        const hasEval = hasProgramEvaluasi(prog);
                        const isSebagian = summary.overallStatus === 'terlaksana_sebagian';
                        const isSelesai = summary.overallStatus === 'terlaksana_penuh' || prog.status === 'selesai' || (!isSebagian && latestEv?.statusKeterlaksanaan === 'terlaksana');
                        const isDitunda = summary.overallStatus === 'tidak_terlaksana' || prog.status === 'ditunda' || latestEv?.statusKeterlaksanaan === 'tidak_terlaksana';
                        const isGeser = summary.overallStatus === 'perubahan_waktu' || latestEv?.statusKeterlaksanaan === 'perubahan_waktu';
                        const kendala =
                          (summary.rincianTidakTerlaksana.length > 0 ? summary.catatanBulanTidakTerlaksana : '') ||
                          latestEv?.alasanTidakTerlaksana ||
                          latestEv?.alasanPerubahanWaktu;

                        return (
                          <div
                            key={prog.id}
                            className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-slate-300 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  {isSebagian ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-950 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Terlaksana Sebagian ({summary.terlaksanaMonths.length}/{summary.scheduledMonths.length} Bln)
                                    </span>
                                  ) : isSelesai ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Terlaksana
                                    </span>
                                  ) : isGeser ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 flex items-center gap-1">
                                      ⏳ Geser Waktu
                                    </span>
                                  ) : isDitunda ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 flex items-center gap-1">
                                      <XCircle className="w-3 h-3" />
                                      Tidak Terlaksana
                                    </span>
                                  ) : summary.rincianTidakTerlaksana.length > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-950">
                                      ⚠️ Sudah Dievaluasi ({summary.rincianTidakTerlaksana.length} Bln Batal)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                      {getStatusInfo(prog.status).label}
                                    </span>
                                  )}

                                  {prog.isLuarRancangan && (
                                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-amber-100 text-amber-900 flex items-center gap-0.5">
                                      <Sparkles className="w-2.5 h-2.5" />
                                      Insidental
                                    </span>
                                  )}
                                </div>

                                <h5 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                                  {prog.namaProgram}
                                </h5>
                              </div>

                              <span className="text-xs font-black text-slate-800 shrink-0">
                                {formatRupiah(prog.estimasiAnggaran)}
                              </span>
                            </div>

                            {/* Info Tanggal Pelaksanaan 2026 */}
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                Bulan:{' '}
                                {prog.bulanPelaksanaan && prog.bulanPelaksanaan.length > 0
                                  ? prog.bulanPelaksanaan.map((b) => BULAN_LIST[b - 1]?.singkatan || '').join(', ')
                                  : prog.tipeJadwal === 'akan_ditentukan'
                                  ? 'Akan Ditentukan Kemudian'
                                  : 'Belum Ditentukan'}
                              </span>
                              {prog.tanggalSpesifik && (
                                <span className="text-slate-400">({prog.tanggalSpesifik})</span>
                              )}
                            </div>

                            {/* Bagian Catatan Kendala & Evaluasi 2026 */}
                            {kendala ? (
                              <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs space-y-1">
                                <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-[10.5px]">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Kendala / Alasan Evaluasi 2026:</span>
                                </div>
                                <p className="text-[11px] text-amber-950 font-medium pl-5">
                                  {kendala}
                                </p>
                              </div>
                            ) : latestEv?.penjelasanKegiatan ? (
                              <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 text-[11px] text-emerald-950">
                                <span className="font-bold text-emerald-800">Catatan Pelaksanaan: </span>
                                {latestEv.penjelasanKegiatan}
                              </div>
                            ) : null}

                            {/* Aksi Cepat Seksi / DPPH */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                              <button
                                type="button"
                                onClick={() => onOpenEvaluasi(prog)}
                                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>{hasEval ? 'Edit Evaluasi' : '+ Isi Evaluasi'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onNavigateToDualPlanning(group.division.nama, prog)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Gunakan program ini sebagai dasar perancangan program tahun 2027"
                              >
                                <span>Lanjutkan ke 2027</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ================= SISI KANAN: RANCANGAN PROGRAM 2027 ================= */}
                <div className="p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Rancangan Program Tahun 2027 ({group.progs2027.length})
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-700">
                      Total Pagu: {formatRupiah(group.budget2027)}
                    </span>
                  </div>

                  {group.progs2027.length === 0 ? (
                    <div className="py-10 text-center space-y-3 border-2 border-dashed border-slate-200 rounded-xl p-4">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-slate-700">
                          Belum ada program kerja yang dirancang untuk tahun 2027
                        </h5>
                        <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                          Seksi dapat mulai merancang program 2027 dengan melihat evaluasi program 2026 di sebelah kiri.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateToDualPlanning(group.division.nama)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Mulai Rancang Program 2027</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {group.progs2027.map((prog) => {
                        const isLanjutan = Boolean(prog.programLanjutanDariId || prog.namaProgram2026Asal);
                        const isEditingRekomendasi = editingRekomendasiId === prog.id;

                        return (
                          <div
                            key={prog.id}
                            className="p-3.5 bg-gradient-to-br from-indigo-50/30 via-white to-slate-50/50 rounded-xl border border-indigo-200 shadow-2xs space-y-2.5 hover:border-indigo-300 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                                    Tahun 2027
                                  </span>

                                  {isLanjutan ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1">
                                      <ArrowRight className="w-2.5 h-2.5" />
                                      Lanjutan dari 2026
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                      Program Baru 2027
                                    </span>
                                  )}
                                </div>

                                <h5 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                                  {prog.namaProgram}
                                </h5>
                              </div>

                              <span className="text-xs font-black text-indigo-900 shrink-0">
                                {formatRupiah(prog.estimasiAnggaran)}
                              </span>
                            </div>

                            {/* Detail Tindak Lanjut Kendala 2026 */}
                            {prog.tindakLanjutKendala && (
                              <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-xs space-y-1">
                                <div className="flex items-center gap-1.5 text-blue-900 font-extrabold text-[10.5px]">
                                  <HelpCircle className="w-3.5 h-3.5 text-blue-700" />
                                  <span>Solusi / Antisipasi Kendala 2026 di Tahun 2027:</span>
                                </div>
                                <p className="text-[11px] text-blue-950 font-medium pl-5">
                                  {prog.tindakLanjutKendala}
                                </p>
                              </div>
                            )}

                            {/* Kolom Catatan / Rekomendasi DPPH */}
                            <div className="p-2.5 rounded-lg bg-slate-100/80 border border-slate-200 text-xs space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10.5px] font-black text-slate-800 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  Catatan / Arahan DPPH:
                                </span>

                                {isPastorOrDpphOrAdmin && !isEditingRekomendasi && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingRekomendasiId(prog.id);
                                      setRekomendasiInput(prog.rekomendasiDPPH || '');
                                    }}
                                    className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Edit className="w-2.5 h-2.5" />
                                    <span>{prog.rekomendasiDPPH ? 'Ubah Catatan' : '+ Beri Arahan'}</span>
                                  </button>
                                )}
                              </div>

                              {isEditingRekomendasi ? (
                                <div className="space-y-1.5 pt-1">
                                  <textarea
                                    value={rekomendasiInput}
                                    onChange={(e) => setRekomendasiInput(e.target.value)}
                                    placeholder="Tuliskan arahan pastoral DPPH terkait pelaksanaan dan anggaran program ini..."
                                    rows={2}
                                    className="w-full p-2 bg-white border border-indigo-300 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-600"
                                  />
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingRekomendasiId(null);
                                        setRekomendasiInput('');
                                      }}
                                      className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 rounded text-[10.5px] font-bold"
                                    >
                                      Batal
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveRekomendasi(prog)}
                                      className="px-2.5 py-0.5 bg-indigo-600 text-white rounded text-[10.5px] font-extrabold flex items-center gap-1"
                                    >
                                      <Save className="w-2.5 h-2.5" />
                                      <span>Simpan</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-600 italic">
                                  {prog.rekomendasiDPPH || 'Belum ada catatan/arahan khusus dari DPPH.'}
                                </p>
                              )}
                            </div>

                            {/* Tombol Detail */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className="text-[10.5px] text-slate-500 font-medium">
                                Jadwal:{' '}
                                {prog.bulanPelaksanaan && prog.bulanPelaksanaan.length > 0
                                  ? `Bulan ${prog.bulanPelaksanaan.map((b) => BULAN_LIST[b - 1]?.singkatan || '').join(', ')}`
                                  : prog.tipeJadwal === 'akan_ditentukan'
                                  ? 'Akan Ditentukan Kemudian'
                                  : 'Belum Ditentukan'}
                              </span>

                              <button
                                type="button"
                                onClick={() => onOpenProgramDetail(prog.id)}
                                className="text-[11px] font-bold text-slate-700 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer"
                              >
                                <span>Buka Form</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
