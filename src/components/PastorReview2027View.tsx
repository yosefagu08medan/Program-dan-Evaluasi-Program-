import React, { useState, useMemo } from 'react';
import {
  Church,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Building2,
  Lock,
  Unlock,
  Save,
  Search,
  DollarSign,
  Info,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { ProgramKerja, StatusPersetujuanPastor, CatatanPastorParoki } from '../types/proker';
import { AuthSession } from '../types/auth';
import {
  formatRupiah,
  formatCompactRupiah,
  formatBulanPelaksanaan,
  sortProgramsSystematically,
  normalizeDivisionName,
  isDivisionMatch,
} from '../utils/formatters';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';

interface PastorReview2027ViewProps {
  programs: ProgramKerja[];
  authSession: AuthSession | null;
  onUpdateProgram: (updated: ProgramKerja) => Promise<void> | void;
  onOpenPinModal: (target?: { unitId: string; unitNama: string }) => void;
  onOpenProgramDetail?: (programId: string) => void;
}

export const PastorReview2027View: React.FC<PastorReview2027ViewProps> = ({
  programs,
  authSession,
  onUpdateProgram,
  onOpenPinModal,
  onOpenProgramDetail,
}) => {
  // Hanya role Pastor Paroki yang dapat melihat semua program dari seluruh seksi dan memberikan catatan/persetujuan
  const isPastorParoki = authSession?.role === 'pastor_paroki';
  const isSeksiUser = !isPastorParoki && Boolean(authSession);
  const userUnitNama = authSession?.unitNama || '';

  const [selectedDivisi, setSelectedDivisi] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | StatusPersetujuanPastor>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Local editing drafts for each program ID
  const [draftStatus, setDraftStatus] = useState<Record<string, StatusPersetujuanPastor>>({});
  const [draftCatatan, setDraftCatatan] = useState<Record<string, string>>({});
  const [draftRekomendasi, setDraftRekomendasi] = useState<Record<string, number | undefined>>({});
  const [draftNamaPeninjau, setDraftNamaPeninjau] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

  // Filter program tahun 2027 berdasarkan hak akses role:
  // - Pastor Paroki: Melihat semua program paroki
  // - Seksi Login: Hanya melihat program seksi masing-masing
  const programs2027Accessible = useMemo(() => {
    let list = programs.filter((p) => p.tahun === 2027);

    // Pembatasan hak akses: Seksi hanya melihat program unitnya sendiri
    if (!isPastorParoki && authSession) {
      list = list.filter((p) => isDivisionMatch(p.penanggungjawab?.divisi, userUnitNama));
    }

    return sortProgramsSystematically(list);
  }, [programs, isPastorParoki, authSession, userUnitNama]);

  // Filter lanjutan berdasarkan dropdown divisi, status, dan pencarian teks
  const filteredPrograms = useMemo(() => {
    return programs2027Accessible.filter((p) => {
      // 1. Divisi filter (hanya berlaku jika login sebagai Pastor Paroki)
      if (isPastorParoki && selectedDivisi !== 'all') {
        const pNorm = normalizeDivisionName(p.penanggungjawab?.divisi).toLowerCase();
        const tNorm = normalizeDivisionName(selectedDivisi).toLowerCase();
        if (pNorm !== tNorm) return false;
      }

      // 2. Status persetujuan
      const currentStatus = p.catatanPastorParoki?.statusPersetujuan || 'menunggu_review';
      if (selectedStatus !== 'all' && currentStatus !== selectedStatus) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.namaProgram || '').toLowerCase().includes(q);
        const matchTujuan = (p.tujuanKegiatan || '').toLowerCase().includes(q);
        const matchSeksi = (p.penanggungjawab?.divisi || '').toLowerCase().includes(q);
        const matchCatatan = (p.catatanPastorParoki?.catatan || '').toLowerCase().includes(q);
        if (!matchName && !matchTujuan && !matchSeksi && !matchCatatan) return false;
      }

      return true;
    });
  }, [programs2027Accessible, isPastorParoki, selectedDivisi, selectedStatus, searchQuery]);

  // Statistik Ringkasan Persetujuan DPP 2027
  const reviewStats = useMemo(() => {
    let total = programs2027Accessible.length;
    let disetujui = 0;
    let disetujuiCatatan = 0;
    let perluRevisi = 0;
    let ditolak = 0;
    let menunggu = 0;
    let totalAnggaranUsulan = 0;
    let totalAnggaranDisetujui = 0;

    programs2027Accessible.forEach((p) => {
      const pBudget = p.estimasiAnggaran || 0;
      totalAnggaranUsulan += pBudget;

      const st = p.catatanPastorParoki?.statusPersetujuan || 'menunggu_review';
      if (st === 'disetujui') {
        disetujui++;
        totalAnggaranDisetujui += p.catatanPastorParoki?.rekomendasiAnggaran ?? pBudget;
      } else if (st === 'disetujui_dengan_catatan') {
        disetujuiCatatan++;
        totalAnggaranDisetujui += p.catatanPastorParoki?.rekomendasiAnggaran ?? pBudget;
      } else if (st === 'perlu_revisi') {
        perluRevisi++;
      } else if (st === 'ditolak') {
        ditolak++;
      } else {
        menunggu++;
      }
    });

    return {
      total,
      disetujui,
      disetujuiCatatan,
      perluRevisi,
      ditolak,
      menunggu,
      totalAnggaranUsulan,
      totalAnggaranDisetujui,
    };
  }, [programs2027Accessible]);

  // Handler Simpan Catatan & Persetujuan DPP (Khusus Pastor Paroki)
  const handleSaveCatatan = async (prog: ProgramKerja) => {
    if (!isPastorParoki) {
      alert('Akses ditolak: Hanya Pastor Paroki yang berwenang memberikan catatan & persetujuan Dewan Pastoral Paroki.');
      return;
    }

    const status = draftStatus[prog.id] ?? prog.catatanPastorParoki?.statusPersetujuan ?? 'disetujui';
    const catatan = draftCatatan[prog.id] ?? prog.catatanPastorParoki?.catatan ?? '';
    const rekomendasi = draftRekomendasi[prog.id] ?? prog.catatanPastorParoki?.rekomendasiAnggaran;
    const namaPeninjau =
      draftNamaPeninjau[prog.id] ??
      prog.catatanPastorParoki?.namaPastor ??
      'Dewan Pastoral Paroki';

    if (status === 'ditolak' && !catatan.trim()) {
      alert('Perhatian: Untuk program yang tidak disetujui / ditolak, mohon tuliskan catatan alasan penolakan agar Seksi bersangkutan memahami mengapa program ini tidak masuk program final.');
      return;
    }

    const updatedNote: CatatanPastorParoki = {
      statusPersetujuan: status,
      catatan: catatan.trim(),
      rekomendasiAnggaran: rekomendasi,
      tanggalReview: new Date().toISOString(),
      namaPastor: namaPeninjau.trim() || 'Dewan Pastoral Paroki',
    };

    const updatedProgram: ProgramKerja = {
      ...prog,
      catatanPastorParoki: updatedNote,
      catatanAdmin: catatan.trim(),
      rekomendasiDPPH: catatan.trim(),
      diubahOleh: `${namaPeninjau} (Persetujuan DPP 2027)`,
      tanggalPerubahan: new Date().toISOString(),
    };

    setIsSaving((prev) => ({ ...prev, [prog.id]: true }));
    try {
      await onUpdateProgram(updatedProgram);
    } finally {
      setIsSaving((prev) => ({ ...prev, [prog.id]: false }));
    }
  };

  const getStatusBadge = (status?: StatusPersetujuanPastor) => {
    switch (status) {
      case 'disetujui':
        return {
          label: '✓ Disetujui DPP',
          bg: 'bg-emerald-50 text-emerald-950 border-emerald-300',
          dot: 'bg-emerald-600',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'disetujui_dengan_catatan':
        return {
          label: '✓ Disetujui DPP dengan Catatan',
          bg: 'bg-teal-50 text-teal-950 border-teal-300',
          dot: 'bg-teal-600',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />,
        };
      case 'perlu_revisi':
        return {
          label: '⚠️ Perlu Revisi DPP',
          bg: 'bg-amber-50 text-amber-950 border-amber-300',
          dot: 'bg-amber-600',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'ditolak':
        return {
          label: '❌ Tidak Disetujui / Ditolak DPP',
          bg: 'bg-rose-50 text-rose-950 border-rose-300',
          dot: 'bg-rose-600',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
        };
      case 'menunggu_review':
      default:
        return {
          label: '⏳ Menunggu Review DPP',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-400',
          icon: <Clock className="w-3.5 h-3.5 text-slate-500" />,
        };
    }
  };

  // Layar Pengaman Jika Belum Login
  if (!authSession) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-5 max-w-xl mx-auto shadow-sm mt-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
          <Church className="w-8 h-8 text-amber-700" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-black text-slate-900">
            Kanal Catatan Dewan Pastoral Paroki 2027
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            Halaman ini memuat catatan, arahan, dan persetujuan resmi <strong>Dewan Pastoral Paroki (DPP)</strong> untuk usulan program kerja tahun 2027.
          </p>
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 font-medium text-left space-y-1 mt-3">
            <p>
              • <strong>Role Seksi:</strong> Hanya dapat melihat usulan program seksi masing-masing secara <em>view-only</em> beserta catatan dari DPP.
            </p>
            <p>
              • <strong>Role Pastor Paroki:</strong> Dapat melihat seluruh program paroki, memberikan arahan, persetujuan, maupun catatan penolakan.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onOpenPinModal({ unitId: 'pastor_paroki', unitNama: 'Pastor Paroki' })}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>Masuk Sebagai Pastor Paroki</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenPinModal()}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Pilih Seksi &amp; Masukkan PIN</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Dewan Pastoral Paroki */}
      <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-600/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Church className="w-64 h-64 text-amber-300" />
        </div>

        <div className="relative z-10 space-y-3 max-w-4xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
              <Church className="w-3.5 h-3.5 text-amber-300" />
              <span>Dewan Pastoral Paroki (DPP)</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-xs font-bold">
              Tahun Anggaran 2027
            </span>

            {isPastorParoki ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-xs font-black flex items-center gap-1">
                <Unlock className="w-3 h-3" />
                <span>Akses Penuh: Pastor Paroki (Tinjauan Seluruh Seksi)</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-xs font-black flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>Mode Lihat Seksi: {userUnitNama} (View-Only)</span>
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
            Catatan Dewan Pastoral Paroki (Tahun 2027)
          </h2>

          <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed max-w-3xl font-medium">
            {isPastorParoki
              ? 'Kanal peninjauan dan persetujuan resmi Dewan Pastoral Paroki untuk seluruh rancangan program kerja tahun 2027. Pastor Paroki dapat memberikan status persetujuan, catatan arahan pastoral, serta rekomendasi anggaran yang langsung dapat dilihat oleh masing-masing Seksi pengusul.'
              : `Menampilkan daftar usulan program kerja tahun 2027 khusus untuk ${userUnitNama} beserta catatan, arahan, dan status persetujuan resmi dari Dewan Pastoral Paroki.`}
          </p>

          {!isPastorParoki && (
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenPinModal({ unitId: 'pastor_paroki', unitNama: 'Pastor Paroki' })}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-98"
              >
                <Unlock className="w-3.5 h-3.5 text-slate-950" />
                <span>Login Sebagai Pastor Paroki (Buka Semua Program &amp; Berikan Catatan)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Executive Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        {/* Metric 1: Total Usulan */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {isPastorParoki ? 'Total Usulan 2027' : `Usulan ${userUnitNama}`}
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900">
            {reviewStats.total} <span className="text-xs font-normal text-slate-500">Program</span>
          </p>
          <span className="text-[10.5px] text-slate-500 block truncate">
            Usulan: {formatCompactRupiah(reviewStats.totalAnggaranUsulan)}
          </span>
        </div>

        {/* Metric 2: Disetujui Penuh */}
        <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-300 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Disetujui DPP</span>
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-950">
            {reviewStats.disetujui}
          </p>
          <span className="text-[10.5px] text-emerald-700 block font-semibold">
            Masuk Program Final 2027
          </span>
        </div>

        {/* Metric 3: Disetujui dengan Catatan */}
        <div className="bg-teal-50/70 p-3.5 rounded-2xl border border-teal-300 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Dgn Catatan</span>
          </span>
          <p className="text-xl sm:text-2xl font-black text-teal-950">
            {reviewStats.disetujuiCatatan}
          </p>
          <span className="text-[10.5px] text-teal-700 block font-semibold">
            Masuk Program Final (Bersyarat)
          </span>
        </div>

        {/* Metric 4: Perlu Revisi */}
        <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-300 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Perlu Revisi</span>
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-950">
            {reviewStats.perluRevisi}
          </p>
          <span className="text-[10.5px] text-amber-800 block font-semibold">
            Perlu diperbaiki Seksi
          </span>
        </div>

        {/* Metric 5: Ditolak DPP (Tidak Masuk Program Final) */}
        <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-300 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Ditolak DPP</span>
          </span>
          <p className="text-xl sm:text-2xl font-black text-rose-950">
            {reviewStats.ditolak}
          </p>
          <span className="text-[10.5px] text-rose-700 block font-bold">
            Tidak Masuk Program Final
          </span>
        </div>

        {/* Metric 6: Belum Direview */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Belum Direview</span>
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-700">
            {reviewStats.menunggu}
          </p>
          <span className="text-[10.5px] text-slate-500 block font-medium">
            Menunggu tinjauan DPP
          </span>
        </div>
      </div>

      {/* 3. Filter Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama program 2027, tujuan, seksi, atau isi catatan DPP..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>

          {/* Seksi Filter: Hanya Pastor Paroki yang dapat berganti seksi, Seksi lain terkunci ke seksi sendiri */}
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            {isPastorParoki ? (
              <select
                value={selectedDivisi}
                onChange={(e) => setSelectedDivisi(e.target.value)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">Semua Seksi Paroki ({programs2027Accessible.length})</option>
                {MASTER_DIVISIONS.map((d) => {
                  const count = programs.filter(
                    (p) => p.tahun === 2027 && normalizeDivisionName(p.penanggungjawab?.divisi).toLowerCase() === d.nama.toLowerCase()
                  ).length;
                  return (
                    <option key={d.id} value={d.nama}>
                      {d.nama} ({count})
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="py-1.5 px-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-black text-indigo-950 flex items-center gap-1.5">
                <span>Unit Seksi Anda: {userUnitNama}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 shrink-0">
            Filter Status:
          </span>

          <button
            type="button"
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
              selectedStatus === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua ({programs2027Accessible.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('disetujui')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedStatus === 'disetujui'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Disetujui ({reviewStats.disetujui})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('disetujui_dengan_catatan')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedStatus === 'disetujui_dengan_catatan'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 text-teal-900 hover:bg-teal-100 border border-teal-200'
            }`}
          >
            <span>Dgn Catatan ({reviewStats.disetujuiCatatan})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('perlu_revisi')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedStatus === 'perlu_revisi'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Perlu Revisi ({reviewStats.perluRevisi})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('ditolak')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedStatus === 'ditolak'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Ditolak DPP ({reviewStats.ditolak})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('menunggu_review')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedStatus === 'menunggu_review'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Belum Direview ({reviewStats.menunggu})</span>
          </button>
        </div>
      </div>

      {/* 4. Daftar Program Kerja 2027 Berurutan Nomor Urut Resmi */}
      {filteredPrograms.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-slate-200 space-y-3">
          <Church className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-900">
            Tidak ada program kerja 2027 yang cocok
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isPastorParoki
              ? 'Silakan ubah filter Seksi, status persetujuan, atau kata kunci pencarian untuk melihat usulan program lainnya.'
              : `Belum ada usulan program tahun 2027 untuk ${userUnitNama} yang sesuai dengan kriteria filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>
              Menampilkan <strong>{filteredPrograms.length}</strong> Program Kerja Tahun 2027 (Tersusun berdasarkan nomor urut resmi hierarki seksi &amp; jadwal)
            </span>
            <span className="text-slate-400 font-medium hidden sm:inline">
              {isPastorParoki
                ? '💡 Pastor Paroki memiliki hak mengubah status persetujuan, catatan arahan, dan rekomendasi pagu.'
                : '💡 Tampilan ini bersifat peninjauan resmi (View-Only) bagi Seksi.'}
            </span>
          </div>

          {filteredPrograms.map((prog, idx) => {
            const noUrut = idx + 1;
            const currentCatatan = prog.catatanPastorParoki;
            const isDitolak = currentCatatan?.statusPersetujuan === 'ditolak';
            const statusInfo = getStatusBadge(currentCatatan?.statusPersetujuan);
            const activeStatusDraft = draftStatus[prog.id] ?? currentCatatan?.statusPersetujuan ?? 'menunggu_review';
            const activeCatatanDraft = draftCatatan[prog.id] ?? currentCatatan?.catatan ?? '';
            const activeRekomendasiDraft = draftRekomendasi[prog.id] ?? currentCatatan?.rekomendasiAnggaran;
            const activeNamaPeninjauDraft =
              draftNamaPeninjau[prog.id] ??
              currentCatatan?.namaPastor ??
              'Dewan Pastoral Paroki';

            return (
              <div
                key={prog.id}
                className={`bg-white rounded-2xl border transition-all p-5 sm:p-6 space-y-4 shadow-2xs hover:shadow-md ${
                  isDitolak ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200/90'
                }`}
              >
                {/* Header Kartu: Nomor Urut, Seksi, Nama Program, Status Persetujuan */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-amber-900 text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-2xs">
                        #{noUrut}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-50 text-indigo-900 border border-indigo-200 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{prog.penanggungjawab?.divisi}</span>
                      </span>
                      <span className="text-xs text-slate-500 font-bold">
                        Jadwal: {formatBulanPelaksanaan(prog.bulanPelaksanaan)}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        Pagu: {formatRupiah(prog.estimasiAnggaran)}
                      </span>

                      {/* Penanda Khusus Program Tidak Masuk Final */}
                      {isDitolak && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                          🚫 TIDAK MASUK PROGRAM FINAL
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-base sm:text-lg font-black leading-snug ${
                        isDitolak ? 'text-rose-950 line-through decoration-rose-400' : 'text-slate-900'
                      }`}
                    >
                      {prog.namaProgram}
                    </h3>

                    {prog.tujuanKegiatan && (
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        <strong>Tujuan:</strong> {prog.tujuanKegiatan}
                      </p>
                    )}
                    {prog.targetSasaran && (
                      <p className="text-xs text-slate-500 font-medium">
                        <strong>Target Sasaran:</strong> {prog.targetSasaran} · <strong>PJ:</strong> {prog.penanggungjawab?.nama} ({prog.penanggungjawab?.kontak || '-'})
                      </p>
                    )}
                  </div>

                  {/* Badge Status Persetujuan */}
                  <div className="flex sm:flex-col items-end gap-2 shrink-0">
                    <div className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 shadow-2xs ${statusInfo.bg}`}>
                      {statusInfo.icon}
                      <span>{statusInfo.label}</span>
                    </div>

                    {onOpenProgramDetail && (
                      <button
                        type="button"
                        onClick={() => onOpenProgramDetail(prog.id)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                      >
                        Lihat Form Rencana Awal
                      </button>
                    )}
                  </div>
                </div>

                {/* Pemberitahuan Jika Program Ditolak / Tidak Disetujui DPP */}
                {isDitolak && (
                  <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-xs space-y-2 shadow-2xs">
                    <div className="flex items-center gap-2 text-rose-950 font-black uppercase tracking-wide">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>PROGRAM TIDAK DISETUJUI / DITOLAK OLEH DEWAN PASTORAL PAROKI</span>
                    </div>
                    <p className="text-rose-900 font-bold leading-relaxed">
                      Program ini <u>tidak masuk ke dalam program final</u> Seksi {prog.penanggungjawab?.divisi} untuk tahun anggaran 2027.
                    </p>
                    {currentCatatan?.catatan && (
                      <div className="mt-1 p-2.5 bg-white rounded-lg border border-rose-200">
                        <span className="font-black text-rose-900 block text-[11px]">
                          Catatan Alasan Penolakan dari DPP:
                        </span>
                        <p className="text-rose-950 italic mt-0.5 leading-relaxed font-medium">
                          "{currentCatatan.catatan}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tampilan Catatan Dewan Pastoral Paroki untuk Program yang Disetujui / Bersyarat / Revisi */}
                {!isDitolak && currentCatatan && currentCatatan.catatan && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50/80 to-orange-50/60 border border-amber-300 text-xs space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-amber-200/80 pb-1.5 flex-wrap gap-1">
                      <span className="font-black text-amber-950 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                        <Church className="w-4 h-4 text-amber-700" />
                        <span>Catatan &amp; Arahan Dewan Pastoral Paroki:</span>
                      </span>
                      <span className="text-[10.5px] font-bold text-amber-800">
                        Peninjau: {currentCatatan.namaPastor || 'Dewan Pastoral Paroki'}
                        {currentCatatan.tanggalReview && ` · ${new Date(currentCatatan.tanggalReview).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </span>
                    </div>

                    <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-line text-xs sm:text-[12.5px]">
                      "{currentCatatan.catatan}"
                    </p>

                    {currentCatatan.rekomendasiAnggaran !== undefined && currentCatatan.rekomendasiAnggaran > 0 && (
                      <div className="pt-1 text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Rekomendasi Anggaran yang Disetujui DPP: </span>
                        <strong className="text-emerald-950 text-xs font-black">
                          {formatRupiah(currentCatatan.rekomendasiAnggaran)}
                        </strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Form Input / Editor KHUSUS Pastor Paroki (Seksi hanya melihat secara View-Only) */}
                {isPastorParoki ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Church className="w-3.5 h-3.5 text-amber-700" />
                        <span>Formulir Arahan &amp; Persetujuan Dewan Pastoral Paroki:</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Akan tersimpan ke Cloud Firestore &amp; dibaca oleh {prog.penanggungjawab?.divisi}
                      </span>
                    </div>

                    {/* Radio Pilihan Status Persetujuan */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setDraftStatus((prev) => ({ ...prev, [prog.id]: 'disetujui' }))}
                        className={`p-2 rounded-xl border text-left font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
                          activeStatusDraft === 'disetujui'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Disetujui</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraftStatus((prev) => ({ ...prev, [prog.id]: 'disetujui_dengan_catatan' }))}
                        className={`p-2 rounded-xl border text-left font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
                          activeStatusDraft === 'disetujui_dengan_catatan'
                            ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Dgn Catatan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraftStatus((prev) => ({ ...prev, [prog.id]: 'perlu_revisi' }))}
                        className={`p-2 rounded-xl border text-left font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
                          activeStatusDraft === 'perlu_revisi'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Perlu Revisi</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraftStatus((prev) => ({ ...prev, [prog.id]: 'ditolak' }))}
                        className={`p-2 rounded-xl border text-left font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
                          activeStatusDraft === 'ditolak'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>Ditolak (Batal)</span>
                      </button>
                    </div>

                    {/* Textarea Catatan & Rekomendasi */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Catatan Dewan Pastoral Paroki {activeStatusDraft === 'ditolak' ? '(Wajib Diisi - Alasan Penolakan)' : '(Arahan/Pertimbangan):'}
                        </label>
                        {activeStatusDraft === 'ditolak' && (
                          <span className="text-[10px] text-rose-600 font-bold">
                            * Wajib menyertakan alasan penolakan
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        value={activeCatatanDraft}
                        onChange={(e) => setDraftCatatan((prev) => ({ ...prev, [prog.id]: e.target.value }))}
                        placeholder={
                          activeStatusDraft === 'ditolak'
                            ? 'Tuliskan alasan program ini tidak disetujui DPP agar Seksi memahami bahwa kegiatan ini tidak masuk ke program final...'
                            : 'Tuliskan arahan pastoral, instruksi koordinasi dengan seksi lain, syarat persetujuan, atau catatan perbaikan...'
                        }
                        className={`w-full p-2.5 bg-white border rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 ${
                          activeStatusDraft === 'ditolak' ? 'border-rose-300' : 'border-slate-200'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Penyesuaian Anggaran Rekomendasi DPP (Opsional):
                        </label>
                        <input
                          type="number"
                          value={activeRekomendasiDraft !== undefined ? activeRekomendasiDraft : ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                            setDraftRekomendasi((prev) => ({ ...prev, [prog.id]: val }));
                          }}
                          placeholder={`Usulan Seksi: ${prog.estimasiAnggaran}`}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Nama Peninjau:
                        </label>
                        <input
                          type="text"
                          value={activeNamaPeninjauDraft}
                          onChange={(e) => setDraftNamaPeninjau((prev) => ({ ...prev, [prog.id]: e.target.value }))}
                          placeholder="Dewan Pastoral Paroki / Pastor Paroki"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Tombol Simpan */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isSaving[prog.id]}
                        onClick={() => handleSaveCatatan(prog)}
                        className="px-4 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSaving[prog.id] ? 'Menyimpan ke Database...' : 'Simpan Catatan & Persetujuan DPP'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Keterangan bagi Seksi jika belum ada catatan */
                  !currentCatatan?.catatan && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                      <Info className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        Program ini sedang dalam antrean evaluasi dan belum diberikan catatan oleh Dewan Pastoral Paroki.
                      </span>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
