import React, { useState, useEffect, useMemo } from 'react';
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
  Sparkles,
  Plus,
  Save,
  RotateCcw,
  Edit,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Info,
  Clock,
  HelpCircle,
  Repeat,
  Check,
  ShieldCheck,
  Coins,
  FileText,
} from 'lucide-react';
import { ProgramKerja, ScheduleType, ProgramStatus, KategoriProgram } from '../types/proker';
import { AuthSession } from '../types/auth';
import {
  BULAN_LIST,
  formatRupiah,
  formatCompactRupiah,
  formatBulanPelaksanaan,
  getStatusInfo,
  getKategoriProgramInfo,
  isDivisionMatch,
} from '../utils/formatters';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';

interface DualPanePlanningViewProps {
  programs: ProgramKerja[];
  authSession: AuthSession | null;
  onSaveProgram: (prog: ProgramKerja) => void;
  onDeleteProgram: (progId: string) => void;
  onOpenEvaluasi: (prog: ProgramKerja, targetMonth?: number) => void;
  initialSeksi?: string | 'all';
  preselectedProgram2026?: ProgramKerja | null;
}

export const DualPanePlanningView: React.FC<DualPanePlanningViewProps> = ({
  programs,
  authSession,
  onSaveProgram,
  onDeleteProgram,
  onOpenEvaluasi,
  initialSeksi = 'all',
  preselectedProgram2026 = null,
}) => {
  // Seksi aktif yang sedang dirancang
  const [activeSeksi, setActiveSeksi] = useState<string>(() => {
    if (authSession?.role === 'seksi' && authSession.unitNama) {
      return authSession.unitNama;
    }
    if (initialSeksi && initialSeksi !== 'all') {
      return initialSeksi;
    }
    return MASTER_DIVISIONS[0]?.nama || 'Seksi Liturgi';
  });

  // State Form Perancangan 2027 (Sisi Kanan)
  const [editingProg2027Id, setEditingProg2027Id] = useState<string | null>(null);
  const [adopted2026Prog, setAdopted2026Prog] = useState<ProgramKerja | null>(preselectedProgram2026);
  
  // Form fields (sinkron dengan input_program)
  const [kategoriProgram, setKategoriProgram] = useState<KategoriProgram>('program_biasa');
  const [namaProgram, setNamaProgram] = useState<string>('');
  const [tujuanKegiatan, setTujuanKegiatan] = useState<string>('');
  const [targetSasaran, setTargetSasaran] = useState<string>('');
  const [estimasiAnggaran, setEstimasiAnggaran] = useState<string>('');
  const [tipeJadwal, setTipeJadwal] = useState<ScheduleType>('satu_kali');
  const [selectedMonths, setSelectedMonths] = useState<number[]>([1]);
  const [tanggalSpesifik, setTanggalSpesifik] = useState<string>('');
  const [catatanBulanan, setCatatanBulanan] = useState<Record<number, string>>({});
  const [alokasiDanaBulanan, setAlokasiDanaBulanan] = useState<Record<number, number>>({});
  const [tindakLanjutKendala, setTindakLanjutKendala] = useState<string>('');
  const [isLuarRancangan, setIsLuarRancangan] = useState<boolean>(false);
  const [picNama, setPicNama] = useState<string>('');
  const [picKontak, setPicKontak] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Seksi Master Info
  const activeDivision = useMemo(() => {
    return MASTER_DIVISIONS.find((d) => isDivisionMatch(d.nama, activeSeksi)) || MASTER_DIVISIONS[0];
  }, [activeSeksi]);

  // Sinkronkan data jika preselectedProgram2026 berubah dari luar
  useEffect(() => {
    if (preselectedProgram2026) {
      if (preselectedProgram2026.penanggungjawab?.divisi) {
        setActiveSeksi(preselectedProgram2026.penanggungjawab.divisi);
      }
      handleAdoptProgram(preselectedProgram2026);
    }
  }, [preselectedProgram2026]);

  // Set default PIC ketika activeSeksi berubah
  useEffect(() => {
    if (!editingProg2027Id && !adopted2026Prog) {
      setPicNama(activeDivision?.defaultPic || '');
    }
  }, [activeSeksi, activeDivision, editingProg2027Id, adopted2026Prog]);

  // Program-program tahun 2026 untuk seksi aktif (Sisi Kiri)
  const programs2026 = useMemo(() => {
    return programs
      .filter((p) => p.tahun === 2026 && isDivisionMatch(p.penanggungjawab?.divisi, activeSeksi))
      .sort((a, b) => {
        const blnA = a.bulanPelaksanaan?.[0] || 0;
        const blnB = b.bulanPelaksanaan?.[0] || 0;
        return blnA - blnB;
      });
  }, [programs, activeSeksi]);

  // Program-program tahun 2027 untuk seksi aktif (Sisi Kanan)
  const programs2027 = useMemo(() => {
    return programs
      .filter((p) => p.tahun === 2027 && isDivisionMatch(p.penanggungjawab?.divisi, activeSeksi))
      .sort((a, b) => {
        const blnA = a.bulanPelaksanaan?.[0] || 0;
        const blnB = b.bulanPelaksanaan?.[0] || 0;
        return blnA - blnB;
      });
  }, [programs, activeSeksi]);

  // Metrik perbandingan seksi aktif
  const statsSeksi = useMemo(() => {
    const total2026 = programs2026.length;
    const budget2026 = programs2026.reduce((sum, p) => sum + (p.estimasiAnggaran || 0), 0);
    const terlaksana2026 = programs2026.filter((p) => {
      return (
        p.status === 'selesai' ||
        p.evaluasi?.statusKeterlaksanaan === 'terlaksana' ||
        (p.evaluasiBulanan && Object.values(p.evaluasiBulanan).some((e) => e.statusKeterlaksanaan === 'terlaksana'))
      );
    }).length;
    const kendala2026 = programs2026.filter((p) => {
      const k = p.evaluasi?.alasanTidakTerlaksana || p.evaluasi?.alasanPerubahanWaktu;
      return Boolean(k && k.trim().length > 0);
    }).length;

    const finalPrograms2027 = programs2027.filter((p) => p.catatanPastorParoki?.statusPersetujuan !== 'ditolak');
    const total2027 = finalPrograms2027.length;
    const budget2027 = finalPrograms2027.reduce((sum, p) => sum + (p.estimasiAnggaran || 0), 0);
    const ditolakCount2027 = programs2027.filter((p) => p.catatanPastorParoki?.statusPersetujuan === 'ditolak').length;
    const lanjutanCount = finalPrograms2027.filter((p) => Boolean(p.programLanjutanDariId || p.namaProgram2026Asal)).length;

    return {
      total2026,
      budget2026,
      terlaksana2026,
      kendala2026,
      total2027,
      budget2027,
      ditolakCount2027,
      lanjutanCount,
    };
  }, [programs2026, programs2027]);

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
    const activeMonths = tipeJadwal === 'sepanjang_tahun'
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      : tipeJadwal === 'akan_ditentukan'
      ? selectedMonths
      : selectedMonths.length > 0 ? selectedMonths : [1];

    if (activeMonths.length === 0) return;

    const perMonth = Math.round(total / activeMonths.length);
    const newMap: Record<number, number> = {};
    activeMonths.forEach((m) => {
      newMap[m] = perMonth;
    });
    setAlokasiDanaBulanan(newMap);
  };

  // Aksi Cepat: Adopsi program 2026 ke formulir rancangan 2027
  const handleAdoptProgram = (prog2026: ProgramKerja) => {
    setEditingProg2027Id(null);
    setAdopted2026Prog(prog2026);
    setKategoriProgram(prog2026.kategoriProgram || 'program_biasa');
    setNamaProgram(prog2026.namaProgram);
    setTujuanKegiatan(prog2026.tujuanKegiatan || '');
    setTargetSasaran(prog2026.targetSasaran || '');
    setEstimasiAnggaran(prog2026.estimasiAnggaran ? String(prog2026.estimasiAnggaran) : '');
    setTipeJadwal(prog2026.tipeJadwal || 'satu_kali');
    setSelectedMonths(
      prog2026.tipeJadwal === 'akan_ditentukan'
        ? []
        : prog2026.bulanPelaksanaan && prog2026.bulanPelaksanaan.length > 0
        ? [...prog2026.bulanPelaksanaan]
        : [1]
    );
    setTanggalSpesifik(prog2026.tanggalSpesifik || '');
    setCatatanBulanan(prog2026.catatanBulanan ? { ...prog2026.catatanBulanan } : {});
    setAlokasiDanaBulanan(prog2026.alokasiDanaBulanan ? { ...prog2026.alokasiDanaBulanan } : {});
    setIsLuarRancangan(false);
    setPicNama(prog2026.penanggungjawab?.nama || activeDivision?.defaultPic || '');
    setPicKontak(prog2026.penanggungjawab?.kontak || '');

    // Jika ada kendala pada 2026, siapkan placeholder / saran solusi
    const kendala2026 = prog2026.evaluasi?.alasanTidakTerlaksana || prog2026.evaluasi?.alasanPerubahanWaktu;
    if (kendala2026) {
      setTindakLanjutKendala(`Evaluasi 2026: ${kendala2026}\nSolusi 2027: `);
    } else {
      setTindakLanjutKendala('');
    }

    setErrors({});
  };

  // Mulai buat program 2027 baru dari nol
  const handleStartNew2027 = () => {
    setEditingProg2027Id(null);
    setAdopted2026Prog(null);
    setKategoriProgram('program_biasa');
    setNamaProgram('');
    setTujuanKegiatan('');
    setTargetSasaran('');
    setEstimasiAnggaran('');
    setTipeJadwal('satu_kali');
    setSelectedMonths([1]);
    setTanggalSpesifik('');
    setCatatanBulanan({});
    setAlokasiDanaBulanan({});
    setTindakLanjutKendala('');
    setIsLuarRancangan(false);
    setPicNama(activeDivision?.defaultPic || '');
    setPicKontak('');
    setErrors({});
  };

  // Edit program 2027 yang sudah pernah dirancang
  const handleEditProg2027 = (prog2027: ProgramKerja) => {
    setEditingProg2027Id(prog2027.id);
    setAdopted2026Prog(null);
    setKategoriProgram(prog2027.kategoriProgram || 'program_biasa');
    setNamaProgram(prog2027.namaProgram);
    setTujuanKegiatan(prog2027.tujuanKegiatan || '');
    setTargetSasaran(prog2027.targetSasaran || '');
    setEstimasiAnggaran(prog2027.estimasiAnggaran ? String(prog2027.estimasiAnggaran) : '');
    setTipeJadwal(prog2027.tipeJadwal || 'satu_kali');
    setSelectedMonths(
      prog2027.tipeJadwal === 'akan_ditentukan'
        ? []
        : prog2027.bulanPelaksanaan && prog2027.bulanPelaksanaan.length > 0
        ? [...prog2027.bulanPelaksanaan]
        : [1]
    );
    setTanggalSpesifik(prog2027.tanggalSpesifik || '');
    setCatatanBulanan(prog2027.catatanBulanan ? { ...prog2027.catatanBulanan } : {});
    setAlokasiDanaBulanan(prog2027.alokasiDanaBulanan ? { ...prog2027.alokasiDanaBulanan } : {});
    setTindakLanjutKendala(prog2027.tindakLanjutKendala || '');
    setIsLuarRancangan(Boolean(prog2027.isLuarRancangan));
    setPicNama(prog2027.penanggungjawab?.nama || '');
    setPicKontak(prog2027.penanggungjawab?.kontak || '');
    setErrors({});
  };

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

  // Simpan Form 2027
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!namaProgram.trim()) errs.nama = 'Nama program wajib diisi';
    if (!estimasiAnggaran || isNaN(Number(estimasiAnggaran)) || Number(estimasiAnggaran) < 0) {
      errs.anggaran = 'Estimasi anggaran harus berupa angka valid';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const progId = editingProg2027Id || `proker-2027-${Date.now()}`;
    const now = new Date().toISOString();

    const newProg: ProgramKerja = {
      id: progId,
      tahun: 2027,
      kategoriProgram,
      namaProgram: namaProgram.trim(),
      tujuanKegiatan: tujuanKegiatan.trim(),
      targetSasaran: targetSasaran.trim(),
      estimasiAnggaran: Number(estimasiAnggaran),
      tipeJadwal,
      bulanPelaksanaan:
        tipeJadwal === 'akan_ditentukan'
          ? []
          : tipeJadwal === 'sepanjang_tahun'
          ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
          : selectedMonths.length > 0
          ? selectedMonths
          : [1],
      modeTanggal:
        tipeJadwal === 'akan_ditentukan'
          ? 'akan_ditentukan'
          : tipeJadwal === 'sepanjang_tahun'
          ? 'rutin_berkala'
          : 'tanggal_pasti',
      tanggalSpesifik: tanggalSpesifik.trim() || undefined,
      catatanBulanan: Object.keys(catatanBulanan).length > 0 ? catatanBulanan : undefined,
      alokasiDanaBulanan: Object.keys(alokasiDanaBulanan).length > 0 ? alokasiDanaBulanan : undefined,
      penanggungjawab: {
        nama: picNama.trim() || activeDivision?.defaultPic || 'Koordinator Seksi',
        divisi: activeSeksi,
        kontak: picKontak.trim() || '',
      },
      status: 'direncanakan',
      isLuarRancangan,
      programLanjutanDariId: adopted2026Prog?.id || undefined,
      namaProgram2026Asal: adopted2026Prog?.namaProgram || undefined,
      statusKelanjutan2027: adopted2026Prog ? 'dilanjutkan' : 'baru',
      tindakLanjutKendala: tindakLanjutKendala.trim() || undefined,
      createdAt: editingProg2027Id ? (programs.find((p) => p.id === editingProg2027Id)?.createdAt || now) : now,
      updatedAt: now,
    };

    onSaveProgram(newProg);

    setSuccessToast(`Program 2027 "${newProg.namaProgram}" berhasil disimpan!`);
    setTimeout(() => setSuccessToast(null), 3500);

    // Reset Form
    handleStartNew2027();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. HEADER & SELECTION BAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Lembar Kerja Perancangan Program (2 Sisi)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 uppercase">
                  Dual-Pane Planning Workspace
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Sisi Kiri: Rekam jejak & kendala kegiatan 2026 · Sisi Kanan: Lembar kerja rancangan program kerja 2027
              </p>
            </div>
          </div>

          {/* Selector Seksi */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Seksi yang Dirancang:</span>
            <select
              value={activeSeksi}
              onChange={(e) => {
                setActiveSeksi(e.target.value);
                handleStartNew2027();
              }}
              className="h-9 bg-slate-50 border border-indigo-300 rounded-xl px-3 text-xs font-extrabold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white cursor-pointer shadow-2xs"
            >
              {MASTER_DIVISIONS.map((d) => (
                <option key={d.id} value={d.nama}>
                  {d.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Banner Ringkasan Seksi Terpilih */}
        <div className="p-3 bg-gradient-to-r from-slate-100 via-indigo-50/40 to-slate-100 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-700" />
            <span className="font-extrabold text-slate-900">{activeDivision?.nama}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600">PIC Default: {activeDivision?.defaultPic}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-bold">
            <span className="text-slate-700">
              2026:{' '}
              <strong className="text-slate-900">
                {statsSeksi.total2026} Proker ({statsSeksi.terlaksana2026} Terlaksana · {statsSeksi.kendala2026} Ada Kendala)
              </strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-indigo-800">
              2027 Dirancang:{' '}
              <strong className="text-indigo-950 font-extrabold">
                {statsSeksi.total2027} Proker ({formatRupiah(statsSeksi.budget2027)})
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {successToast && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 2. DUA SISI BERDAMPINGAN: SISI KIRI 2026 vs SISI KANAN 2027 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= SISI KIRI (LG: COL-5): REKAM JEJAK 2026 ================= */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                1. Rekam Jejak Kegiatan 2026
              </h3>
            </div>
            <span className="text-[10.5px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {programs2026.length} Kegiatan
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            Tinjau pelaksanaan, kendala, dan evaluasi kegiatan tahun 2026. Klik tombol <strong>"Adopsi ke 2027"</strong> untuk meneruskan program dengan penyesuaian solusi.
          </p>

          {/* List Kartu Program 2026 */}
          {programs2026.length === 0 ? (
            <div className="py-12 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-xl p-4">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">
                Belum ada data kegiatan 2026 untuk {activeDivision?.nama}
              </p>
              <p className="text-[10.5px] text-slate-400">
                Seksi dapat langsung membuat rancangan program 2027 baru di panel sebelah kanan.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
              {programs2026.map((p26) => {
                const isSelesai = p26.status === 'selesai' || p26.evaluasi?.statusKeterlaksanaan === 'terlaksana';
                const isDitunda = p26.status === 'ditunda' || p26.evaluasi?.statusKeterlaksanaan === 'tidak_terlaksana';
                const kendala = p26.evaluasi?.alasanTidakTerlaksana || p26.evaluasi?.alasanPerubahanWaktu;
                const isBeingAdopted = adopted2026Prog?.id === p26.id;

                // Cek apakah sudah pernah diadopsi ke 2027
                const alreadyAdoptedTo2027 = programs2027.find(
                  (p27) => p27.programLanjutanDariId === p26.id || p27.namaProgram2026Asal === p26.namaProgram
                );

                return (
                  <div
                    key={p26.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                      isBeingAdopted
                        ? 'bg-purple-50/60 border-purple-400 ring-2 ring-purple-400'
                        : alreadyAdoptedTo2027
                        ? 'bg-emerald-50/30 border-emerald-300'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {/* Badge Jenis Kategori Program (Rutin / Tentatif / Biasa) */}
                          {(() => {
                            const katInfo = getKategoriProgramInfo(p26.kategoriProgram);
                            return (
                              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black border flex items-center gap-1 ${katInfo.badge}`}>
                                <span>{katInfo.iconEmoji}</span>
                                <span>{katInfo.label}</span>
                              </span>
                            );
                          })()}

                          {isSelesai ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              Terlaksana
                            </span>
                          ) : isDitunda ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 flex items-center gap-0.5">
                              <XCircle className="w-3 h-3" />
                              Tidak Terlaksana
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              {getStatusInfo(p26.status).label}
                            </span>
                          )}

                          {alreadyAdoptedTo2027 && (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" />
                              Sudah Dirancang di 2027
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                          {p26.namaProgram}
                        </h4>
                      </div>

                      <span className="text-xs font-black text-slate-900 shrink-0">
                        {formatRupiah(p26.estimasiAnggaran)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Bulan: {formatBulanPelaksanaan(p26.bulanPelaksanaan, p26.tipeJadwal)}
                      </span>
                      {p26.tanggalSpesifik && <span className="text-slate-400">({p26.tanggalSpesifik})</span>}
                    </div>

                    {/* Catatan Per Bulan 2026 jika ada */}
                    {p26.catatanBulanan && Object.keys(p26.catatanBulanan).length > 0 && (
                      <div className="p-2 bg-emerald-50/70 rounded-lg border border-emerald-200/80 text-[10px] text-emerald-950 space-y-1">
                        <span className="font-extrabold flex items-center gap-1 text-emerald-900">
                          <FileText className="w-3 h-3 text-emerald-600" />
                          <span>Catatan Kegiatan Tiap Bulan (2026):</span>
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-1">
                          {Object.entries(p26.catatanBulanan).map(([mNum, note]) => (
                            note ? (
                              <div key={mNum} className="text-[9.5px] bg-white/80 px-2 py-0.5 rounded border border-emerald-100">
                                <strong className="text-emerald-900">{BULAN_LIST[Number(mNum) - 1]?.singkatan}:</strong> {note}
                              </div>
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sorotan Kendala Pelaksanaan */}
                    {kendala ? (
                      <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs space-y-1">
                        <div className="flex items-center gap-1 text-amber-900 font-extrabold text-[10.5px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Kendala / Alasan Tidak Terlaksana:</span>
                        </div>
                        <p className="text-[11px] text-amber-950 font-medium pl-4">
                          {kendala}
                        </p>
                      </div>
                    ) : p26.evaluasi?.penjelasanKegiatan ? (
                      <p className="text-[10.5px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 line-clamp-2">
                        <strong className="text-slate-700">Hasil:</strong> {p26.evaluasi.penjelasanKegiatan}
                      </p>
                    ) : null}

                    {/* Tombol Aksi Cepat */}
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => onOpenEvaluasi(p26)}
                        className="text-[11px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                      >
                        {p26.evaluasi ? 'Edit Evaluasi 2026' : '+ Isi Evaluasi 2026'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdoptProgram(p26)}
                        className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                          isBeingAdopted
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs'
                        }`}
                      >
                        <span>Adopsi ke 2027</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= SISI KANAN (LG: COL-7): FORMULIR PERANCANGAN 2027 ================= */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                2. Lembar Perancangan Tahun 2027
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {adopted2026Prog || editingProg2027Id ? (
                <button
                  type="button"
                  onClick={handleStartNew2027}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Buat Program Baru dari Nol</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Banner Adopsi jika program lanjutan dari 2026 */}
          {adopted2026Prog && (
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Melanjutkan Program Tahun 2026: "{adopted2026Prog.namaProgram}"
                </span>
                <button
                  type="button"
                  onClick={() => setAdopted2026Prog(null)}
                  className="text-[10.5px] font-bold text-purple-700 hover:text-purple-900"
                >
                  Lepas Kaitan
                </button>
              </div>
              <p className="text-[11px] text-purple-800">
                Data program tahun 2026 telah disalin. Silakan sesuaikan jadwal, anggaran, serta isi kolom{' '}
                <strong>antisipasi/solusi kendala</strong> agar pelaksanaan 2027 berjalan sukses.
              </p>
            </div>
          )}

          {/* Form Perancangan 2027 */}
          <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
            {/* KATEGORI JENIS PROGRAM (3 PILIHAN: RUTIN, TENTATIF, BIASA) - SINKRON DENGAN SISTEM INPUT PROKER */}
            <div className="space-y-2 p-3 bg-slate-50/90 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Jenis Kategori Program <span className="text-rose-500">*</span></span>
                </label>
                <span className="text-[10px] text-slate-500 font-medium">
                  Identik dengan Formulir Proker Paroki
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Program Rutin */}
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
                    Dilaksanakan berkala / rutin setiap bulan dengan rincian alokasi &amp; catatan per bulan.
                  </p>
                </button>

                {/* 2. Opsional / Tentatif */}
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

                {/* 3. Program Biasa */}
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

            {/* Nama Program */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Nama Program Kerja Tahun 2027 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={namaProgram}
                onChange={(e) => {
                  setNamaProgram(e.target.value);
                  if (errors.nama) setErrors((prev) => ({ ...prev, nama: '' }));
                }}
                placeholder="Contoh: Rekoleksi Komuni Pertama & Pendampingan Orang Tua 2027"
                className={`w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white text-xs ${
                  errors.nama ? 'border-rose-400 bg-rose-50' : 'border-slate-300 focus:border-indigo-600'
                }`}
              />
              {errors.nama && <p className="text-[10px] text-rose-600 font-bold">{errors.nama}</p>}
            </div>

            {/* Kolom Refleksi / Antisipasi Solusi Kendala 2026 (Khusus jika adopsi) */}
            {adopted2026Prog && (
              <div className="space-y-1 p-3 bg-amber-50/70 rounded-xl border border-amber-200">
                <label className="block text-[11px] font-black text-amber-900 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Refleksi & Penyesuaian Solusi terhadap Kendala 2026 untuk 2027:</span>
                </label>
                <textarea
                  value={tindakLanjutKendala}
                  onChange={(e) => setTindakLanjutKendala(e.target.value)}
                  placeholder="Jelaskan apa yang diperbaiki/disesuaikan di tahun 2027 agar kendala tahun 2026 tidak terulang (misal: penyesuaian waktu, pembentukan panitia lebih awal, sinergi dengan seksi lain)..."
                  rows={2}
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-600"
                />
              </div>
            )}

            {/* Tujuan & Target Sasaran */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Tujuan Kegiatan:</label>
                <textarea
                  value={tujuanKegiatan}
                  onChange={(e) => setTujuanKegiatan(e.target.value)}
                  placeholder="Tujuan pastoral yang ingin dicapai..."
                  rows={2}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Target Sasaran:</label>
                <textarea
                  value={targetSasaran}
                  onChange={(e) => setTargetSasaran(e.target.value)}
                  placeholder="Target umat/peserta (misal: 150 calon komuni & orang tua)..."
                  rows={2}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Estimasi Anggaran & PIC */}
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
                    placeholder="0"
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white text-xs ${
                      errors.anggaran ? 'border-rose-400 bg-rose-50' : 'border-slate-300 focus:border-indigo-600'
                    }`}
                  />
                </div>
                {errors.anggaran && <p className="text-[10px] text-rose-600 font-bold">{errors.anggaran}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Penanggung Jawab (PIC):</label>
                <input
                  type="text"
                  value={picNama}
                  onChange={(e) => setPicNama(e.target.value)}
                  placeholder="Nama Koordinator / PIC"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Kontak WhatsApp/HP:</label>
                <input
                  type="text"
                  value={picKontak}
                  onChange={(e) => setPicKontak(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white text-xs"
                />
              </div>
            </div>

            {/* Tipe Jadwal & Bulan Pelaksanaan 2027 */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Rencana Waktu Pelaksanaan Tahun 2027:
                </label>
                <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10.5px] font-bold">
                  {(['satu_kali', 'multi_bulan', 'sepanjang_tahun', 'akan_ditentukan'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTipeJadwal(t);
                        if (t === 'sepanjang_tahun') {
                          setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
                        } else if (t === 'akan_ditentukan') {
                          setSelectedMonths([]);
                          if (!tanggalSpesifik.trim()) setTanggalSpesifik('Jadwal akan ditentukan kemudian');
                        } else if (selectedMonths.length === 0) {
                          setSelectedMonths([1]);
                        }
                      }}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        tipeJadwal === t ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600'
                      }`}
                    >
                      {t === 'satu_kali'
                        ? '1x Pelaksanaan'
                        : t === 'multi_bulan'
                        ? 'Beberapa Bulan'
                        : t === 'sepanjang_tahun'
                        ? 'Rutin Setahun'
                        : 'Akan Ditentukan'}
                    </button>
                  ))}
                </div>
              </div>

              {tipeJadwal === 'akan_ditentukan' ? (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-950 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Bulan pelaksanaan tahun 2027 belum ditentukan</p>
                    <p className="text-amber-900/90 mt-0.5">
                      Program disimpan dengan pola <strong>Jadwal Akan Ditentukan Kemudian</strong>. Bulan pelaksanaan dapat diisi nanti saat jadwal sudah pasti.
                    </p>
                  </div>
                </div>
              ) : (
                /* Bulan Pills */
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
              )}

              <input
                type="text"
                value={tanggalSpesifik}
                onChange={(e) => setTanggalSpesifik(e.target.value)}
                placeholder="Rencana tanggal spesifik / keterangan waktu (opsional, misal: Setiap Minggu ke-2, 15 Agustus 2027, atau Akan ditentukan kemudian)"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white mt-1"
              />

              {/* Rincian Alokasi Kas & Catatan Khusus Per Bulan Aktif (Sinkron dengan Sistem Input Proker Paroki) */}
              {(() => {
                const activeMonths = tipeJadwal === 'sepanjang_tahun'
                  ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                  : tipeJadwal === 'akan_ditentukan'
                  ? []
                  : selectedMonths.length > 0 ? selectedMonths : [1];

                if (activeMonths.length === 0) return null;

                const totalBudget = Number(estimasiAnggaran) || 0;

                return (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-[11px] font-black text-indigo-950 flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Rincian Pemakaian Dana &amp; Catatan Khusus Per Bulan ({activeMonths.length} Bulan Aktif):</span>
                        </label>
                        <p className="text-[10px] text-slate-500">
                          Isi catatan khusus per bulan (misal: "Feb: Pembentukan Panitia", "Mar: Pelaksanaan &amp; Pencairan Dana") dan sesuaikan nominal pemakaian dana jika tidak dicairkan sekaligus.
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
                          Pagu: {formatRupiah(totalBudget)}
                        </span>
                      </div>
                    </div>

                    {/* Grid Kartu Bulan Aktif */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                      {activeMonths.map((mNo) => {
                        const bObj = BULAN_LIST[mNo - 1];
                        const defaultEven = activeMonths.length > 0 && totalBudget > 0
                          ? Math.round(totalBudget / activeMonths.length)
                          : 0;
                        const curDana = alokasiDanaBulanan[mNo] !== undefined
                          ? alokasiDanaBulanan[mNo]
                          : defaultEven;
                        const curNote = catatanBulanan[mNo] || '';

                        return (
                          <div
                            key={mNo}
                            className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs space-y-1.5 hover:border-indigo-300 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-slate-900 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>{bObj?.nama} 2027</span>
                              </span>
                              <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                {formatRupiah(curDana)}
                              </span>
                            </div>

                            <div>
                              <label className="block text-[9.5px] font-bold text-slate-600 mb-0.5">
                                Pemakaian Dana Bln Ini (Rp):
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                                <input
                                  type="text"
                                  value={alokasiDanaBulanan[mNo] !== undefined ? alokasiDanaBulanan[mNo].toLocaleString('id-ID') : (defaultEven > 0 ? defaultEven.toLocaleString('id-ID') : '')}
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
                                placeholder="Contoh: Pembentukan panitia / pelaksanaan & pencairan dana..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[10.5px] text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Tombol Simpan */}
            <div className="pt-2 flex items-center justify-end gap-2">
              {(editingProg2027Id || adopted2026Prog) && (
                <button
                  type="button"
                  onClick={handleStartNew2027}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{editingProg2027Id ? 'Perbarui Rancangan 2027' : 'Simpan Rancangan Program 2027'}</span>
              </button>
            </div>
          </form>

          {/* 3. REKAP DAFTAR PROGRAM 2027 YANG TELAH DIRANCANG */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Daftar Rancangan Program 2027 ({programs2027.length})</span>
              </h4>
              <span className="text-xs font-black text-indigo-900">
                Total Pagu: {formatRupiah(statsSeksi.budget2027)}
              </span>
            </div>

            {programs2027.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                Belum ada program yang disimpan untuk tahun 2027. Isi formulir di atas untuk merancang program.
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {programs2027.map((p27) => (
                  <div
                    key={p27.id}
                    className="p-3 bg-slate-50 hover:bg-indigo-50/40 rounded-xl border border-slate-200 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        {/* Badge Kategori Program 2027 */}
                        {(() => {
                          const katInfo = getKategoriProgramInfo(p27.kategoriProgram);
                          return (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border flex items-center gap-1 ${katInfo.badge}`}>
                              <span>{katInfo.iconEmoji}</span>
                              <span>{katInfo.label}</span>
                            </span>
                          );
                        })()}

                        {p27.programLanjutanDariId || p27.namaProgram2026Asal ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-900">
                            Lanjutan 2026
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-700">
                            Baru
                          </span>
                        )}
                        {p27.catatanPastorParoki && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black border flex items-center gap-1 ${
                              p27.catatanPastorParoki.statusPersetujuan === 'disetujui'
                                ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                : p27.catatanPastorParoki.statusPersetujuan === 'disetujui_dengan_catatan'
                                ? 'bg-amber-100 text-amber-950 border-amber-300'
                                : p27.catatanPastorParoki.statusPersetujuan === 'perlu_revisi'
                                ? 'bg-orange-100 text-orange-950 border-orange-300'
                                : 'bg-rose-100 text-rose-950 border-rose-300'
                            }`}
                          >
                            <span>⛪ DPP:</span>
                            <span className="capitalize">
                              {p27.catatanPastorParoki.statusPersetujuan === 'ditolak'
                                ? 'Ditolak (Batal Masuk Final)'
                                : p27.catatanPastorParoki.statusPersetujuan.replace(/_/g, ' ')}
                            </span>
                          </span>
                        )}
                        <h5
                          className={`text-xs font-extrabold truncate ${
                            p27.catatanPastorParoki?.statusPersetujuan === 'ditolak'
                              ? 'text-rose-950 line-through decoration-rose-400'
                              : 'text-slate-900'
                          }`}
                        >
                          {p27.namaProgram}
                        </h5>
                      </div>
                      <div className="text-[10.5px] text-slate-500 font-medium">
                        Bulan: {formatBulanPelaksanaan(p27.bulanPelaksanaan, p27.tipeJadwal)} ·{' '}
                        <strong className="text-slate-800">{formatRupiah(p27.estimasiAnggaran)}</strong>
                        {p27.catatanPastorParoki?.statusPersetujuan === 'ditolak' && (
                          <span className="ml-2 font-bold text-rose-600">
                            (Tidak Dihitung di Pagu Final)
                          </span>
                        )}
                      </div>

                      {/* Catatan Dewan Pastoral Paroki 2027 */}
                      {p27.catatanPastorParoki?.catatan && (
                        <div
                          className={`mt-1 p-2 rounded-md border text-[9.5px] ${
                            p27.catatanPastorParoki.statusPersetujuan === 'ditolak'
                              ? 'bg-rose-50 border-rose-200 text-rose-950'
                              : 'bg-amber-50 border-amber-200 text-amber-950'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-black mb-0.5">
                            <span>⛪ Catatan Dewan Pastoral Paroki:</span>
                            {p27.catatanPastorParoki.statusPersetujuan === 'ditolak' && (
                              <span className="text-[9px] px-1 bg-rose-200 text-rose-900 rounded font-black">
                                Tidak Masuk Program Final
                              </span>
                            )}
                          </div>
                          <p className="italic leading-relaxed">"{p27.catatanPastorParoki.catatan}"</p>
                        </div>
                      )}

                      {/* Catatan Per Bulan 2027 jika ada */}
                      {p27.catatanBulanan && Object.keys(p27.catatanBulanan).length > 0 && (
                        <div className="mt-1 p-1.5 bg-indigo-50/60 rounded-md border border-indigo-100 text-[9.5px] text-indigo-950">
                          <span className="font-bold text-indigo-900">Catatan Khusus: </span>
                          {Object.entries(p27.catatanBulanan)
                            .filter(([_, n]) => Boolean(n))
                            .map(([mNum, note]) => `${BULAN_LIST[Number(mNum) - 1]?.singkatan}: ${note}`)
                            .join(' · ')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditProg2027(p27)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                        title="Edit Program 2027"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProgram(p27.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="Hapus Program 2027"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
