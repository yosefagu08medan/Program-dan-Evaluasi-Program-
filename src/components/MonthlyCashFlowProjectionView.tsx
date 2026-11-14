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
  HeartHandshake,
  TrendingDown,
  Check,
  Plus,
  Lock,
  ChevronDown,
  ChevronsDownUp,
  RotateCcw,
  ArrowLeft,
  X,
  ExternalLink,
  FileText,
  Edit3,
  Search,
  Send,
  AlertCircle,
  Eye,
  MessageSquare,
  ClipboardList,
} from 'lucide-react';
import { ProgramKerja, CatatanRevisiAnggaran } from '../types/proker';
import { PenerimaanMingguan, calculateKolekte1Split } from '../types/penerimaan';
import { PenerimaanFormModal } from './PenerimaanFormModal';
import { PseRealisasiPenggunaanModal } from './PseRealisasiPenggunaanModal';
import { AuthSession } from '../types/auth';
import {
  BULAN_LIST,
  formatRupiah,
  formatCompactRupiah,
  formatIndonesianDate,
  getStatusInfo,
  isDivisionMatch,
  getAlokasiBudgetBulanan,
  isProgramAktifDiBulan,
  isProgramBerulang,
  getKategoriProgramInfo,
  getEvaluasiForMonth,
  getProgramExecutionSummary,
  getSundaysInMonth,
} from '../utils/formatters';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';
import { AdminProgramEditorModal } from './AdminProgramEditorModal';

interface MonthlyCashFlowProjectionViewProps {
  programs: ProgramKerja[];
  penerimaanList?: PenerimaanMingguan[];
  onOpenProgramDetail: (progId: string) => void;
  onOpenEvaluasi?: (prog: ProgramKerja, targetMonth?: number) => void;
  onSavePenerimaan?: (item: PenerimaanMingguan) => Promise<void>;
  onSaveProgram?: (updatedProg: ProgramKerja) => void;
  authSession?: AuthSession | null;
  onNavigateToPenerimaanTab?: () => void;
  initialYear?: 'all' | 2026 | 2027;
  initialSeksi?: string | 'all';
  initialFocusMode?: ViewFocusMode;
}

export type ViewFocusMode = 'komparasi' | 'anggaran' | 'penerimaan' | 'pse_khusus';

export const MonthlyCashFlowProjectionView: React.FC<MonthlyCashFlowProjectionViewProps> = ({
  programs,
  penerimaanList = [],
  onOpenProgramDetail,
  onOpenEvaluasi,
  onSavePenerimaan,
  onSaveProgram,
  authSession = null,
  onNavigateToPenerimaanTab,
  initialYear = 'all',
  initialSeksi = 'all',
  initialFocusMode = 'komparasi',
}) => {
  const currentCalendarMonth = new Date().getMonth() + 1;
  const isPastorOrAdminOrBendahara = authSession?.role === 'pastor_paroki' || authSession?.role === 'bendahara';
  const isPseUser =
    authSession?.unitNama === 'Seksi PSE' ||
    authSession?.unitId === 'div-pse' ||
    Boolean(authSession?.unitNama && authSession.unitNama.toLowerCase().includes('pse'));

  const [selectedYear, setSelectedYear] = useState<'all' | 2026 | 2027>(
    initialYear === 'all' ? 2026 : initialYear
  );
  const [selectedSeksi, setSelectedSeksi] = useState<string | 'all'>(isPseUser ? 'Seksi PSE' : initialSeksi);
  const [activeMonth, setActiveMonth] = useState<number>(currentCalendarMonth);
  const [kategoriFilter, setKategoriFilter] = useState<'all' | 'rancangan' | 'luar_rancangan'>('all');
  const [focusMode, setFocusMode] = useState<ViewFocusMode>(isPseUser ? 'pse_khusus' : initialFocusMode);
  const [isPenerimaanModalOpen, setIsPenerimaanModalOpen] = useState<boolean>(false);
  const [penerimaanModalSeksi, setPenerimaanModalSeksi] = useState<string>(isPseUser ? 'Seksi PSE' : 'Umum Paroki');
  const [isKolekteDetailOpen, setIsKolekteDetailOpen] = useState<boolean>(false);
  const [selectedDetailProgram, setSelectedDetailProgram] = useState<ProgramKerja | null>(null);
  const [programToEditByAdmin, setProgramToEditByAdmin] = useState<ProgramKerja | null>(null);

  // State khusus PSE (Perencanaan Penerimaan & Realisasi Penggunaan Dana Umat)
  const [isPseDisbursementOpen, setIsPseDisbursementOpen] = useState<boolean>(false);
  const [selectedPseDisbursementProgram, setSelectedPseDisbursementProgram] = useState<ProgramKerja | null>(null);
  const [editingPenerimaanItem, setEditingPenerimaanItem] = useState<PenerimaanMingguan | null>(null);

  const handleOpenAddPenerimaan = (targetSeksi?: string) => {
    setEditingPenerimaanItem(null);
    setPenerimaanModalSeksi(targetSeksi || (selectedSeksi !== 'all' ? selectedSeksi : 'Umum Paroki'));
    setIsPenerimaanModalOpen(true);
  };

  const handleEditPenerimaan = (item: PenerimaanMingguan) => {
    setEditingPenerimaanItem(item);
    setPenerimaanModalSeksi(item.alokasiSeksi || 'Umum Paroki');
    setIsPenerimaanModalOpen(true);
  };

  // State accordion list per Seksi untuk Sisi 2 (Rencana Kebutuhan Anggaran Proker)
  const [expandedSeksis, setExpandedSeksis] = useState<Record<string, boolean>>({});

  // State Mode Review Detail Program per Bulan & Catatan Revisi Anggaran
  const [reviewingMonth, setReviewingMonth] = useState<number | null>(null);
  const [reviewSearch, setReviewSearch] = useState<string>('');
  const [reviewSeksiFilter, setReviewSeksiFilter] = useState<string>('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'all' | 'perlu_revisi' | 'belum_catatan'>('all');
  const [reviewSortBy, setReviewSortBy] = useState<'anggaran_desc' | 'seksi'>('anggaran_desc');
  const [activeRevisionFormId, setActiveRevisionFormId] = useState<string | null>(null);
  const [revisionNoteDraft, setRevisionNoteDraft] = useState<string>('');
  const [revisionBudgetDraft, setRevisionBudgetDraft] = useState<string>('');
  const [revisionSavedFeedback, setRevisionSavedFeedback] = useState<{ programId?: string; message: string } | null>(null);

  const toggleSeksi = (seksiName: string) => {
    setExpandedSeksis((prev) => ({
      ...prev,
      [seksiName]: !prev[seksiName],
    }));
  };

  const collapseAllSeksis = () => {
    setExpandedSeksis({});
  };

  const openReviewMonth = (monthNum: number, focusProgram?: ProgramKerja) => {
    setActiveMonth(monthNum);
    setReviewingMonth(monthNum);
    setReviewSearch('');
    setReviewSeksiFilter('all');
    setReviewStatusFilter('all');
    setRevisionSavedFeedback(null);
    if (focusProgram) {
      setActiveRevisionFormId(focusProgram.id);
      setRevisionNoteDraft(focusProgram.catatanRevisiAnggaran?.catatan || '');
      setRevisionBudgetDraft(
        focusProgram.catatanRevisiAnggaran?.rekomendasiAnggaran
          ? String(focusProgram.catatanRevisiAnggaran.rekomendasiAnggaran)
          : ''
      );
    } else {
      setActiveRevisionFormId(null);
      setRevisionNoteDraft('');
      setRevisionBudgetDraft('');
    }
  };

  const closeReviewMonth = () => {
    setReviewingMonth(null);
    setActiveRevisionFormId(null);
    setRevisionNoteDraft('');
    setRevisionBudgetDraft('');
    setRevisionSavedFeedback(null);
  };

  const openRevisionForm = (prog: ProgramKerja) => {
    setActiveRevisionFormId(prog.id);
    setRevisionNoteDraft(prog.catatanRevisiAnggaran?.catatan || '');
    setRevisionBudgetDraft(
      prog.catatanRevisiAnggaran?.rekomendasiAnggaran
        ? String(prog.catatanRevisiAnggaran.rekomendasiAnggaran)
        : ''
    );
    setRevisionSavedFeedback(null);
  };

  const handleSaveRevisionNote = (prog: ProgramKerja, monthNum: number) => {
    const cleanNote = revisionNoteDraft.trim();
    if (!cleanNote || !onSaveProgram) return;

    const numericBudget = revisionBudgetDraft.replace(/[^\d]/g, '');
    const parsedBudget = numericBudget ? parseInt(numericBudget, 10) : undefined;
    const targetMonthName = BULAN_LIST[monthNum - 1]?.nama || `Bulan ${monthNum}`;
    const reviewerName = authSession?.unitNama || 'Admin / Bendahara Paroki';
    const targetRecipient = prog.penanggungjawab?.nama
      ? `${prog.penanggungjawab?.divisi || 'Seksi'} (${prog.penanggungjawab.nama})`
      : prog.penanggungjawab?.divisi || 'Seksi Penanggung Jawab';

    const revisiObj: CatatanRevisiAnggaran = {
      perluRevisi: true,
      catatan: cleanNote,
      targetBulan: monthNum,
      ...(parsedBudget && parsedBudget > 0 ? { rekomendasiAnggaran: parsedBudget } : {}),
      ditujukanKepada: targetRecipient,
      dibuatOleh: reviewerName,
      tanggalCatatan: new Date().toISOString(),
      statusTindakLanjut: 'menunggu_revisi',
    };

    const updatedProg: ProgramKerja = {
      ...prog,
      catatanRevisiAnggaran: revisiObj,
      catatanAdmin: `[Revisi Anggaran Bln ${targetMonthName}] ${cleanNote}`,
      ...(prog.tahun === 2027
        ? {
            catatanPastorParoki: {
              ...(prog.catatanPastorParoki || {}),
              statusPersetujuan: 'perlu_revisi' as const,
              catatan: cleanNote,
              ...(parsedBudget && parsedBudget > 0 ? { rekomendasiAnggaran: parsedBudget } : {}),
              tanggalReview: new Date().toISOString(),
              namaPastor: reviewerName,
            },
          }
        : {}),
    };

    onSaveProgram(updatedProg);
    setActiveRevisionFormId(null);
    setRevisionNoteDraft('');
    setRevisionBudgetDraft('');
    setRevisionSavedFeedback({
      programId: prog.id,
      message: `Catatan revisi untuk "${prog.namaProgram}" berhasil disimpan & ditujukan kepada ${targetRecipient}.`,
    });
  };

  const handleResolveOrClearRevision = (prog: ProgramKerja, mode: 'resolved' | 'clear') => {
    if (!onSaveProgram) return;
    const updatedRevisi: CatatanRevisiAnggaran =
      mode === 'resolved'
        ? {
            ...(prog.catatanRevisiAnggaran || { perluRevisi: false, catatan: '' }),
            perluRevisi: false,
            statusTindakLanjut: 'sudah_direvisi',
          }
        : {
            perluRevisi: false,
            catatan: '',
            statusTindakLanjut: 'sudah_direvisi',
          };

    const updatedProg: ProgramKerja = {
      ...prog,
      catatanRevisiAnggaran: updatedRevisi,
    };
    onSaveProgram(updatedProg);
    setActiveRevisionFormId(null);
    setRevisionSavedFeedback({
      programId: prog.id,
      message:
        mode === 'resolved'
          ? `Status revisi untuk "${prog.namaProgram}" ditandai selesai direvisi.`
          : `Penandaan revisi untuk "${prog.namaProgram}" telah dihapus.`,
    });
  };

  // Reset rincian terbuka saat bulan aktif berubah agar tampilan kembali ke ringkasan semula
  useEffect(() => {
    setExpandedSeksis({});
  }, [activeMonth]);

  useEffect(() => {
    if (isPseUser) {
      setFocusMode('pse_khusus');
      setSelectedSeksi('Seksi PSE');
    } else if (initialFocusMode) {
      setFocusMode(initialFocusMode);
    }
  }, [isPseUser, initialFocusMode]);

  useEffect(() => {
    if (initialYear && initialYear !== 'all') {
      setSelectedYear(initialYear);
    }
  }, [initialYear]);

  useEffect(() => {
    if (initialSeksi) {
      setSelectedSeksi(initialSeksi);
    }
  }, [initialSeksi]);

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

      // 1. Kebutuhan Anggaran & Realisasi Penggunaan Dana Program Kerja
      const monthPrograms: {
        program: ProgramKerja;
        alokasiDanaBulanIni: number;
        realisasiDanaBulanIni: number;
      }[] = [];

      filteredPrograms.forEach((p) => {
        if (isProgramAktifDiBulan(p, monthNum)) {
          // Bagi rata anggaran: untuk sepanjang_tahun dibagi 12 bulan secara rata
          const alokasi = getAlokasiBudgetBulanan(p, monthNum);
          const ev = getEvaluasiForMonth(p, monthNum);
          let realisasi = 0;
          if (ev && ev.statusKeterlaksanaan === 'terlaksana' && typeof ev.anggaranTerpakai === 'number') {
            realisasi = ev.anggaranTerpakai;
          } else if (
            p.evaluasi?.statusKeterlaksanaan === 'terlaksana' &&
            !isProgramBerulang(p) &&
            typeof p.evaluasi.anggaranTerpakai === 'number'
          ) {
            realisasi = p.evaluasi.anggaranTerpakai;
          }

          monthPrograms.push({
            program: p,
            alokasiDanaBulanIni: alokasi,
            realisasiDanaBulanIni: realisasi,
          });
        }
      });

      const totalDana = monthPrograms.reduce((sum, item) => sum + item.alokasiDanaBulanIni, 0);
      const totalPenggunaanRiil = monthPrograms.reduce((sum, item) => sum + item.realisasiDanaBulanIni, 0);

      // 2. Rencana & Realisasi Penerimaan Kas di bulan ini (sinkron 100% dengan database penerimaanList)
      const monthPenerimaan = penerimaanList.filter((item) => {
        if (selectedYear !== 'all' && item.tahun !== selectedYear) return false;
        if (item.bulan !== monthNum) return false;
        if (selectedSeksi !== 'all') {
          // Saat seksi dipilih, filter penerimaan yang dialokasikan ke seksi tersebut
          if (!item.alokasiSeksi || !isDivisionMatch(item.alokasiSeksi, selectedSeksi)) {
            return false;
          }
        }
        // Validasi kalender hari Minggu:
        // Untuk Kolekte rutin (kolekte_1 & kolekte_2 yang bukan hari khusus),
        // mingguKe tidak boleh melebihi jumlah hari Minggu riil di bulan tersebut (misal Januari 2026 hanya ada 4 minggu)
        const itemYear = item.tahun || (selectedYear !== 'all' ? selectedYear : 2026);
        const maxSundays = getSundaysInMonth(itemYear, monthNum).length;
        if (!item.isHariKhusus && (item.kategori === 'kolekte_1' || item.kategori === 'kolekte_2')) {
          if (item.mingguKe > maxSundays) {
            return false;
          }
        }
        // Jika selectedSeksi === 'all', tampilkan SEMUA penerimaan yang telah diinput
        return true;
      });

      const totalRencanaPenerimaan = monthPenerimaan.reduce((sum, item) => sum + (item.rancangan || 0), 0);
      const totalRealisasiPenerimaan = monthPenerimaan.reduce((sum, item) => sum + (item.realisasi || 0), 0);
      const selisihProyeksi = totalRencanaPenerimaan - totalDana;
      const rasioKecukupan = totalDana > 0 ? Math.round((totalRencanaPenerimaan / totalDana) * 100) : 100;

      // Klasifikasi jenis penerimaan di bulan ini
      const kolekte1Items = monthPenerimaan.filter((i) => i.kategori === 'kolekte_1');
      const kolekte2Items = monthPenerimaan.filter((i) => i.kategori === 'kolekte_2');
      const kolekteKhususItems = monthPenerimaan.filter(
        (i) => i.kategori === 'kolekte_khusus' || Boolean(i.isHariKhusus)
      );
      const pseItems = monthPenerimaan.filter(
        (i) =>
          (i.alokasiSeksi && i.alokasiSeksi.toLowerCase().includes('pse')) ||
          (i.namaPenerimaan && i.namaPenerimaan.toLowerCase().includes('pse'))
      );
      const tentatifItems = monthPenerimaan.filter((i) => i.isTentatif || i.tipeSumber === 'seksi_tentatif');
      const seksiLainItems = monthPenerimaan.filter(
        (i) =>
          i.kategori !== 'kolekte_1' &&
          i.kategori !== 'kolekte_2' &&
          i.kategori !== 'kolekte_khusus' &&
          !i.isHariKhusus &&
          !pseItems.includes(i)
      );

      const k1Rencana = kolekte1Items.reduce((s, i) => s + (i.rancangan || 0), 0);
      const k1Real = kolekte1Items.reduce((s, i) => s + (i.realisasi || 0), 0);
      const k1Split = calculateKolekte1Split(k1Rencana);
      const k1RealSplit = calculateKolekte1Split(k1Real);

      const k2Rencana = kolekte2Items.reduce((s, i) => s + (i.rancangan || 0), 0);
      const k2Real = kolekte2Items.reduce((s, i) => s + (i.realisasi || 0), 0);

      const kKhususRencana = kolekteKhususItems.reduce((s, i) => s + (i.rancangan || 0), 0);
      const kKhususReal = kolekteKhususItems.reduce((s, i) => s + (i.realisasi || 0), 0);

      const pseRencana = pseItems.reduce((s, i) => s + (i.rancangan || 0), 0);
      const pseReal = pseItems.reduce((s, i) => s + (i.realisasi || 0), 0);

      const seksiLainRencana = seksiLainItems.reduce((s, i) => s + (i.rancangan || 0), 0);
      const seksiLainReal = seksiLainItems.reduce((s, i) => s + (i.realisasi || 0), 0);

      const tentatifRencana = tentatifItems.reduce((s, i) => s + (i.rancangan || 0), 0);
      const tentatifReal = tentatifItems.reduce((s, i) => s + (i.realisasi || 0), 0);

      // Total Kas Likuid yang dapat digunakan membiayai program kerja:
      // 50% Kolekte 1 + 100% Kolekte Misa Khusus + Kas Seksi PSE + Kas Seksi Lainnya
      // (Kolekte II 100% dialokasikan khusus Kas Pembangunan fisik / renovasi gereja)
      const danaBisaDipakaiProker = k1Split.danaOperasionalDanProker + kKhususRencana + pseRencana + seksiLainRencana;
      const danaBisaDipakaiProkerReal =
        k1RealSplit.danaOperasionalDanProker + kKhususReal + pseReal + seksiLainReal;

      return {
        monthNum,
        monthName: BULAN_LIST[i]?.nama || `Bulan ${i + 1}`,
        singkatan: BULAN_LIST[i]?.singkatan || `B${i + 1}`,
        totalDana, // Rencana Anggaran (Kebutuhan Proker)
        totalPenggunaanRiil, // Realisasi Pengeluaran Proker Riil
        totalRencanaPenerimaan, // Total Rencana Kas Masuk (Semua Sumber)
        totalRealisasiPenerimaan, // Total Realisasi Kas Masuk Riil
        danaBisaDipakaiProker, // Kas Siap Pakai untuk Membiayai Proker
        danaBisaDipakaiProkerReal,
        selisihProyeksi, // Surplus (+) atau Defisit (-) Total
        selisihProker: danaBisaDipakaiProker - totalDana,
        rasioKecukupan, // Persentase ketercukupan
        count: monthPrograms.length,
        items: monthPrograms,
        penerimaanCount: monthPenerimaan.length,
        penerimaanItems: monthPenerimaan,
        breakdownPenerimaan: {
          kolekte1: k1Rencana,
          kolekte1Real: k1Real,
          kolekte1Proker: k1Split.danaOperasionalDanProker,
          kolekte1ProkerReal: k1RealSplit.danaOperasionalDanProker,
          kolekte1Solidaritas: k1Split.danaSolidaritas,
          kolekte2: k2Rencana,
          kolekte2Real: k2Real,
          kolekteKhusus: kKhususRencana,
          kolekteKhususReal: kKhususReal,
          pse: pseRencana,
          pseReal: pseReal,
          seksiLain: seksiLainRencana,
          seksiLainReal: seksiLainReal,
          tentatif: tentatifRencana,
          tentatifReal: tentatifReal,
          danaBisaDipakaiProker,
          danaBisaDipakaiProkerReal,
        },
      };
    });

    const grandTotalAnggaran = months.reduce((sum, m) => sum + m.totalDana, 0);
    const grandTotalPenggunaanRiil = months.reduce((sum, m) => sum + m.totalPenggunaanRiil, 0);
    const grandTotalRencanaPenerimaan = months.reduce((sum, m) => sum + m.totalRencanaPenerimaan, 0);
    const grandTotalRealisasiPenerimaan = months.reduce((sum, m) => sum + m.totalRealisasiPenerimaan, 0);
    const grandTotalDanaBisaDipakaiProker = months.reduce((sum, m) => sum + m.danaBisaDipakaiProker, 0);
    const grandTotalDanaBisaDipakaiProkerReal = months.reduce((sum, m) => sum + m.danaBisaDipakaiProkerReal, 0);
    const totalSelisihTahunan = grandTotalRencanaPenerimaan - grandTotalAnggaran;
    const totalSelisihProkerTahunan = grandTotalDanaBisaDipakaiProker - grandTotalAnggaran;

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
      grandTotalPenggunaanRiil,
      grandTotalRencanaPenerimaan,
      grandTotalRealisasiPenerimaan,
      grandTotalDanaBisaDipakaiProker,
      grandTotalDanaBisaDipakaiProkerReal,
      totalSelisihTahunan,
      totalSelisihProkerTahunan,
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
        totalPenggunaanRiil: 0,
        totalRencanaPenerimaan: 0,
        totalRealisasiPenerimaan: 0,
        danaBisaDipakaiProker: 0,
        danaBisaDipakaiProkerReal: 0,
        selisihProyeksi: 0,
        selisihProker: 0,
        rasioKecukupan: 100,
        count: 0,
        items: [],
        penerimaanCount: 0,
        penerimaanItems: [],
        breakdownPenerimaan: {
          kolekte1: 0,
          kolekte1Real: 0,
          kolekte1Proker: 0,
          kolekte1ProkerReal: 0,
          kolekte1Solidaritas: 0,
          kolekte2: 0,
          kolekte2Real: 0,
          kolekteKhusus: 0,
          kolekteKhususReal: 0,
          pse: 0,
          pseReal: 0,
          seksiLain: 0,
          seksiLainReal: 0,
          tentatif: 0,
          tentatifReal: 0,
          danaBisaDipakaiProker: 0,
          danaBisaDipakaiProkerReal: 0,
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

  // Kalkulasi Khusus Seksi PSE (Pengembangan Sosial Ekonomi) - Terpisah dari Uang Kolekte
  const pseMonthlyData = useMemo(() => {
    // Program PSE
    const psePrograms = programs.filter((p) => {
      if (selectedYear !== 'all' && p.tahun !== selectedYear) return false;
      const div = p.penanggungjawab?.divisi?.toLowerCase() || '';
      const nama = p.namaProgram?.toLowerCase() || '';
      return div.includes('pse') || div.includes('sosial') || div.includes('ekonomi') || nama.includes('pse');
    });

    // 12 Bulan Khusus PSE
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const monthPenerimaan = penerimaanList.filter((item) => {
        if (item.bulan !== monthNum) return false;
        if (selectedYear !== 'all' && item.tahun !== selectedYear) return false;
        const alokasi = item.alokasiSeksi?.toLowerCase() || '';
        const nama = item.namaPenerimaan?.toLowerCase() || '';
        return alokasi.includes('pse') || nama.includes('pse') || (item.kategori as string) === 'dana_sosial_pse' || (item.kategori as string) === 'pse';
      });

      const totalPenerimaanRencana = monthPenerimaan.reduce((sum, item) => sum + (item.rancangan || 0), 0);
      const totalPenerimaanReal = monthPenerimaan.reduce((sum, item) => sum + (item.realisasi || 0), 0);

      const activePrograms = psePrograms.filter((p) => isProgramAktifDiBulan(p, monthNum));
      const totalAnggaran = activePrograms.reduce((sum, p) => sum + getAlokasiBudgetBulanan(p, monthNum), 0);
      const totalPengeluaranRiil = activePrograms.reduce((sum, p) => {
        const ev = getEvaluasiForMonth(p, monthNum);
        return sum + (ev?.anggaranTerpakai || 0);
      }, 0);

      const selisih = totalPenerimaanRencana - totalAnggaran;
      const selisihReal = totalPenerimaanReal - totalPengeluaranRiil;
      const rasioKecukupan = totalAnggaran > 0 ? Math.round((totalPenerimaanRencana / totalAnggaran) * 100) : 100;

      return {
        monthNum,
        monthName: BULAN_LIST[i]?.nama || `Bulan ${i + 1}`,
        singkatan: BULAN_LIST[i]?.singkatan || `B${i + 1}`,
        penerimaanItems: monthPenerimaan,
        totalPenerimaanRencana,
        totalPenerimaanReal,
        programs: activePrograms,
        totalAnggaran,
        totalPengeluaranRiil,
        selisih,
        selisihReal,
        rasioKecukupan,
      };
    });

    const grandTotalPenerimaan = months.reduce((s, m) => s + m.totalPenerimaanRencana, 0);
    const grandTotalPenerimaanReal = months.reduce((s, m) => s + m.totalPenerimaanReal, 0);
    const grandTotalAnggaran = months.reduce((s, m) => s + m.totalAnggaran, 0);
    const grandTotalPengeluaranRiil = months.reduce((s, m) => s + m.totalPengeluaranRiil, 0);
    const saldoSosial = grandTotalPenerimaan - grandTotalAnggaran;
    const saldoSosialReal = grandTotalPenerimaanReal - grandTotalPengeluaranRiil;

    const chartMax = Math.max(
      ...months.map((m) => Math.max(m.totalPenerimaanRencana, m.totalAnggaran, m.totalPenerimaanReal)),
      1
    );

    return {
      psePrograms,
      months,
      grandTotalPenerimaan,
      grandTotalPenerimaanReal,
      grandTotalAnggaran,
      grandTotalPengeluaranRiil,
      saldoSosial,
      saldoSosialReal,
      chartMax,
    };
  }, [programs, penerimaanList, selectedYear]);

  // Data PSE untuk bulan aktif terpilih
  const currentPseMonthData = useMemo(() => {
    return (
      pseMonthlyData.months.find((m) => m.monthNum === activeMonth) || {
        monthNum: activeMonth,
        monthName: BULAN_LIST[activeMonth - 1]?.nama || 'Bulan',
        singkatan: BULAN_LIST[activeMonth - 1]?.singkatan || 'Bln',
        penerimaanItems: [],
        totalPenerimaanRencana: 0,
        totalPenerimaanReal: 0,
        programs: [],
        totalAnggaran: 0,
        totalPengeluaranRiil: 0,
        selisih: 0,
        selisihReal: 0,
        rasioKecukupan: 100,
      }
    );
  }, [pseMonthlyData, activeMonth]);

  // Daftar bulan yang mengalami kekurangan / defisit anggaran (reguler & PSE)
  const deficitMonths = useMemo(() => {
    return monthlyData.months.filter(
      (m) => m.totalDana > 0 && (m.selisihProyeksi < 0 || m.selisihProker < 0)
    );
  }, [monthlyData]);

  const pseDeficitMonths = useMemo(() => {
    return pseMonthlyData.months.filter((m) => m.totalAnggaran > 0 && m.selisih < 0);
  }, [pseMonthlyData]);

  const totalRevisionFlagged = useMemo(() => {
    return filteredPrograms.filter((p) => p.catatanRevisiAnggaran?.perluRevisi).length;
  }, [filteredPrograms]);

  // Data lengkap untuk Mode Review Detail Program pada bulan yang sedang ditinjau
  const reviewContext = useMemo(() => {
    if (reviewingMonth === null) return null;
    const monthName = BULAN_LIST[reviewingMonth - 1]?.nama || `Bulan ${reviewingMonth}`;
    const isPseView = focusMode === 'pse_khusus';

    let basePrograms: { program: ProgramKerja; alokasiDanaBulanIni: number }[] = [];
    let totalKebutuhan = 0;
    let totalPenerimaanTotal = 0;
    let totalDanaSiapPakai = 0;
    let selisihUtama = 0;

    if (isPseView) {
      const mData = pseMonthlyData.months.find((m) => m.monthNum === reviewingMonth);
      basePrograms = (mData?.programs || []).map((program) => ({
        program,
        alokasiDanaBulanIni: getAlokasiBudgetBulanan(program, reviewingMonth),
      }));
      totalKebutuhan = mData?.totalAnggaran || 0;
      totalPenerimaanTotal = mData?.totalPenerimaanRencana || 0;
      totalDanaSiapPakai = mData?.totalPenerimaanRencana || 0;
      selisihUtama = mData?.selisih || 0;
    } else {
      const mData = monthlyData.months.find((m) => m.monthNum === reviewingMonth);
      basePrograms = mData?.items || [];
      totalKebutuhan = mData?.totalDana || 0;
      totalPenerimaanTotal = mData?.totalRencanaPenerimaan || 0;
      totalDanaSiapPakai = mData?.danaBisaDipakaiProker || 0;
      selisihUtama = mData ? (mData.selisihProker < 0 ? mData.selisihProker : mData.selisihProyeksi) : 0;
    }

    const seksiOptions = Array.from(
      new Set(basePrograms.map((i) => i.program.penanggungjawab?.divisi || 'Seksi Lainnya'))
    ).sort();

    const filteredItems = basePrograms
      .filter(({ program }) => {
        if (reviewSeksiFilter !== 'all' && (program.penanggungjawab?.divisi || 'Seksi Lainnya') !== reviewSeksiFilter) {
          return false;
        }
        if (reviewStatusFilter === 'perlu_revisi' && !program.catatanRevisiAnggaran?.perluRevisi) {
          return false;
        }
        if (reviewStatusFilter === 'belum_catatan' && program.catatanRevisiAnggaran?.perluRevisi) {
          return false;
        }
        if (reviewSearch.trim()) {
          const q = reviewSearch.toLowerCase();
          const matchNama = program.namaProgram.toLowerCase().includes(q);
          const matchPj = (program.penanggungjawab?.nama || '').toLowerCase().includes(q);
          const matchSeksi = (program.penanggungjawab?.divisi || '').toLowerCase().includes(q);
          const matchTujuan = (program.tujuanKegiatan || '').toLowerCase().includes(q);
          if (!matchNama && !matchPj && !matchSeksi && !matchTujuan) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (reviewSortBy === 'seksi') {
          const divCmp = (a.program.penanggungjawab?.divisi || '').localeCompare(
            b.program.penanggungjawab?.divisi || ''
          );
          if (divCmp !== 0) return divCmp;
        }
        return b.alokasiDanaBulanIni - a.alokasiDanaBulanIni;
      });

    const flaggedCount = basePrograms.filter((i) => i.program.catatanRevisiAnggaran?.perluRevisi).length;

    return {
      monthNum: reviewingMonth,
      monthName,
      isPseView,
      totalPrograms: basePrograms.length,
      totalKebutuhan,
      totalPenerimaanTotal,
      totalDanaSiapPakai,
      selisihUtama,
      seksiOptions,
      filteredItems,
      flaggedCount,
    };
  }, [
    reviewingMonth,
    focusMode,
    pseMonthlyData,
    monthlyData,
    reviewSeksiFilter,
    reviewStatusFilter,
    reviewSearch,
    reviewSortBy,
  ]);

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
                onClick={() => handleOpenAddPenerimaan()}
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
          {isPseUser ? (
            <div className="flex items-center gap-1.5 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-black text-amber-950 shadow-2xs">
              <Heart className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>Modul Khusus Seksi PSE (Dana Umat)</span>
            </div>
          ) : (
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
              <button
                type="button"
                onClick={() => setFocusMode('pse_khusus')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  focusMode === 'pse_khusus'
                    ? 'bg-amber-600 text-white shadow-xs font-black ring-1 ring-amber-400'
                    : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60'
                }`}
                title="Grafik & Arus Kas Khusus Seksi PSE (Terpisah dari Uang Kolekte)"
              >
                <Heart className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>🤝 Khusus Seksi PSE</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {reviewingMonth !== null && reviewContext ? (
        /* ======================================================== */
        /* MODE REVIEW DETAIL PROGRAM & CATATAN REVISI PER BULAN    */
        /* ======================================================== */
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* STICKY TOP BAR: TOMBOL KEMBALI + NAVIGASI BULAN DEFISIT */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md space-y-4 border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={closeReviewMonth}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-emerald-50 text-slate-900 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-700" />
                  <span>← Kembali ke Dashboard Penggunaan Dana &amp; Penerimaan</span>
                </button>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase">
                      Mode Review Detail Program
                    </span>
                    {reviewContext.selisihUtama < 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white uppercase animate-pulse">
                        Anggaran Kurang ({formatCompactRupiah(reviewContext.selisihUtama)})
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    Review Program Bulan {reviewContext.monthName}{' '}
                    {selectedYear !== 'all' ? selectedYear : '(2026 & 2027)'}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>
                    <strong className="text-amber-300">{reviewContext.flaggedCount}</strong> dari{' '}
                    <strong>{reviewContext.totalPrograms}</strong> Program Ditujukan Revisi
                  </span>
                </div>
              </div>
            </div>

            {/* RINGKASAN ANGGARAN BULAN YANG SEDANG DI-REVIEW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {reviewContext.isPseView ? 'Rencana Masuk PSE' : 'Dana Siap Pakai Proker'}
                </span>
                <span className="text-base font-black text-emerald-300">
                  {formatRupiah(reviewContext.totalDanaSiapPakai)}
                </span>
                {!reviewContext.isPseView && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Total Penerimaan: {formatRupiah(reviewContext.totalPenerimaanTotal)}
                  </span>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Kebutuhan Program Bulan {reviewContext.monthName}
                </span>
                <span className="text-base font-black text-indigo-300">
                  {formatRupiah(reviewContext.totalKebutuhan)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {reviewContext.totalPrograms} kegiatan dijadwalkan berjalan
                </span>
              </div>

              <div
                className={`rounded-xl p-3 border ${
                  reviewContext.selisihUtama >= 0
                    ? 'bg-emerald-950/60 border-emerald-500/40'
                    : 'bg-rose-950/70 border-rose-500/50'
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-slate-300 block">
                  {reviewContext.selisihUtama >= 0 ? 'Status Kas: Surplus' : 'Status Kas: Kekurangan / Defisit'}
                </span>
                <span
                  className={`text-base font-black ${
                    reviewContext.selisihUtama >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {reviewContext.selisihUtama >= 0 ? '+' : ''}
                  {formatRupiah(reviewContext.selisihUtama)}
                </span>
                <span className="text-[10px] text-slate-300 block mt-0.5">
                  {reviewContext.selisihUtama < 0
                    ? 'Tandai program di bawah untuk direvisi Seksi'
                    : 'Anggaran bulan ini tercukupi oleh rencana kas'}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Pindah Review Bulan Lain
                </span>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(reviewContext.isPseView ? pseMonthlyData.months : monthlyData.months).map((m) => {
                    const mSelisih =
                      'selisih' in m ? m.selisih : m.selisihProker < 0 ? m.selisihProker : m.selisihProyeksi;
                    const mTotal = 'totalAnggaran' in m ? m.totalAnggaran : m.totalDana;
                    const isDef = mTotal > 0 && mSelisih < 0;
                    const isCurr = m.monthNum === reviewContext.monthNum;
                    return (
                      <button
                        key={m.monthNum}
                        type="button"
                        onClick={() => openReviewMonth(m.monthNum)}
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-black transition-all cursor-pointer ${
                          isCurr
                            ? 'bg-white text-slate-900 ring-2 ring-amber-400'
                            : isDef
                            ? 'bg-rose-500/80 hover:bg-rose-500 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-slate-300'
                        }`}
                        title={
                          isDef
                            ? `${m.monthName}: Anggaran Kurang (${formatRupiah(mSelisih)})`
                            : `${m.monthName}`
                        }
                      >
                        {m.singkatan}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* FEEDBACK SIMPAN CATATAN REVISI */}
          {revisionSavedFeedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{revisionSavedFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setRevisionSavedFeedback(null)}
                className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TOOLBAR FILTER & PENCARIAN REVIEW */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  placeholder="Cari nama program, PJ, atau tujuan..."
                  className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-400"
                />
              </div>

              <select
                value={reviewSeksiFilter}
                onChange={(e) => setReviewSeksiFilter(e.target.value)}
                className="h-9 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Seksi ({reviewContext.seksiOptions.length})</option>
                {reviewContext.seksiOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                {(
                  [
                    { id: 'all', label: 'Semua' },
                    { id: 'perlu_revisi', label: `Perlu Revisi (${reviewContext.flaggedCount})` },
                    { id: 'belum_catatan', label: 'Belum Catatan' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReviewStatusFilter(opt.id)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      reviewStatusFilter === opt.id
                        ? opt.id === 'perlu_revisi'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span>Urutkan:</span>
              <select
                value={reviewSortBy}
                onChange={(e) => setReviewSortBy(e.target.value as 'anggaran_desc' | 'seksi')}
                className="h-9 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="anggaran_desc">Alokasi Anggaran Terbesar</option>
                <option value="seksi">Per Seksi / Bidang</option>
              </select>
            </div>
          </div>

          {/* DAFTAR DETAIL PROGRAM BULAN TERPILIH */}
          {reviewContext.filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-3">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <h4 className="text-sm font-black text-slate-800">
                  Tidak ada program pada filter review ini
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Coba reset kata kunci pencarian atau pilih bulan lain pada daftar bulan di atas.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewContext.filteredItems.map(({ program, alokasiDanaBulanIni }, idx) => {
                const katInfo = getKategoriProgramInfo(program.kategoriProgram);
                const statusInfo = getStatusInfo(program.status);
                const revisi = program.catatanRevisiAnggaran;
                const isFlagged = Boolean(revisi?.perluRevisi);
                const isResolved = !isFlagged && revisi?.statusTindakLanjut === 'sudah_direvisi';
                const isFormOpen = activeRevisionFormId === program.id;
                const porsiPersen =
                  reviewContext.totalKebutuhan > 0
                    ? Math.round((alokasiDanaBulanIni / reviewContext.totalKebutuhan) * 100)
                    : 0;
                const bulanPelaksanaanText =
                  program.bulanPelaksanaan && program.bulanPelaksanaan.length > 0
                    ? program.bulanPelaksanaan.map((b) => BULAN_LIST[b - 1]?.singkatan).join(', ')
                    : program.tipeJadwal === 'akan_ditentukan'
                    ? 'Akan Ditentukan Kemudian'
                    : '-';
                const noteBulanIni = program.catatanBulanan?.[reviewContext.monthNum];

                return (
                  <div
                    key={program.id}
                    className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-2xs space-y-4 transition-all ${
                      isFlagged
                        ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/15'
                        : 'border-slate-200 hover:border-indigo-200'
                    }`}
                  >
                    {/* HEADER KARTU PROGRAM */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-900 text-white">
                            #{idx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-900">
                            Tahun {program.tahun}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-800">
                            {program.penanggungjawab?.divisi || 'Seksi'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border inline-flex items-center gap-1 ${katInfo.badge}`}
                          >
                            <span>{katInfo.iconEmoji}</span>
                            <span>{katInfo.label}</span>
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>

                          {isFlagged && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white inline-flex items-center gap-1 shadow-2xs">
                              <AlertTriangle className="w-3 h-3" />
                              <span>DITUJUKAN UNTUK REVISI</span>
                            </span>
                          )}
                          {isResolved && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Sudah Direvisi Seksi</span>
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm sm:text-base font-black text-slate-900">
                          {program.namaProgram}
                        </h4>
                      </div>

                      {/* ANGKA ANGGARAN HIGHLIGHT */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                        <div className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-right">
                          <span className="text-[9.5px] font-bold uppercase text-indigo-700 block">
                            Alokasi Bulan {reviewContext.monthName} ({porsiPersen}%)
                          </span>
                          <span className="text-sm sm:text-base font-black text-indigo-900">
                            {formatRupiah(alokasiDanaBulanIni)}
                          </span>
                        </div>
                        <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right">
                          <span className="text-[9.5px] font-bold uppercase text-slate-500 block">
                            Total Pagu Tahunan
                          </span>
                          <span className="text-sm font-black text-slate-800">
                            {formatRupiah(program.estimasiAnggaran)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* DETAIL LENGKAP PROGRAM */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Tujuan Pastoral
                        </span>
                        <p className="text-slate-800 font-medium leading-relaxed">
                          {program.tujuanKegiatan || 'Belum diisi'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Target Sasaran / Output
                        </span>
                        <p className="text-slate-800 font-medium leading-relaxed">
                          {program.targetSasaran || 'Belum diisi'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Penanggung Jawab &amp; Jadwal
                        </span>
                        <p className="text-slate-800 font-semibold">
                          👤 {program.penanggungjawab?.nama || '-'}
                          {program.penanggungjawab?.kontak ? ` · 📞 ${program.penanggungjawab.kontak}` : ''}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          📅 Bulan aktif: <strong>{bulanPelaksanaanText}</strong>
                          {program.tanggalSpesifik ? ` (${program.tanggalSpesifik})` : ''}
                        </p>
                        {noteBulanIni && (
                          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 font-medium">
                            📝 Catatan Bln Ini: {noteBulanIni}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* CATATAN REVISI AKTIF (JIKA SUDAH ADA) */}
                    {isFlagged && revisi && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-xs space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-black text-rose-900 flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-rose-600" />
                            <span>
                              Catatan Revisi Ditujukan Kepada: {revisi.ditujukanKepada || program.penanggungjawab?.divisi}
                            </span>
                          </span>
                          <span className="text-[10.5px] font-bold text-rose-700">
                            Oleh: {revisi.dibuatOleh || 'Admin / Bendahara'}
                            {revisi.tanggalCatatan
                              ? ` · ${formatIndonesianDate(revisi.tanggalCatatan, true)}`
                              : ''}
                          </span>
                        </div>
                        <p className="text-rose-950 font-semibold whitespace-pre-line leading-relaxed">
                          {revisi.catatan}
                        </p>
                        {revisi.rekomendasiAnggaran && revisi.rekomendasiAnggaran > 0 && (
                          <p className="text-[11px] font-black text-amber-900 bg-amber-100/80 border border-amber-300 inline-block px-2.5 py-0.5 rounded-lg">
                            💡 Rekomendasi Pagu Anggaran Baru: {formatRupiah(revisi.rekomendasiAnggaran)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* FORM INLINE BUAT CATATAN & TUJUKAN UNTUK REVISI */}
                    {isFormOpen ? (
                      <div className="p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300 space-y-3 animate-in fade-in duration-150">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs font-black text-amber-950">
                            <MessageSquare className="w-4 h-4 text-amber-700" />
                            <span>
                              Buat Catatan &amp; Tujukan Untuk Revisi →{' '}
                              <span className="text-rose-700">
                                {program.penanggungjawab?.divisi || 'Seksi'} (PJ:{' '}
                                {program.penanggungjawab?.nama || '-'})
                              </span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveRevisionFormId(null)}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            Tutup Form
                          </button>
                        </div>

                        {/* TEMPLATE CEPAT CATATAN REVISI */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-amber-900 uppercase">Template Cepat:</span>
                          {[
                            'Mohon efisiensi pagu anggaran / kurangi biaya operasional karena kas bulan ini defisit.',
                            'Mohon geser jadwal pelaksanaan ke bulan lain yang kondisi kasnya surplus.',
                            'Mohon pecah pencairan bertahap atau sesuaikan jumlah peserta/target.',
                            'Mohon lengkapi dukungan swadaya umat / donatur mandiri sebagian.',
                          ].map((tpl, tIdx) => (
                            <button
                              key={tIdx}
                              type="button"
                              onClick={() =>
                                setRevisionNoteDraft((prev) => (prev ? `${prev}\n${tpl}` : tpl))
                              }
                              className="px-2 py-1 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-[10.5px] font-bold text-amber-950 transition-colors cursor-pointer"
                            >
                              + {tpl.slice(0, 42)}...
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 block">
                              Catatan / Arahan Revisi untuk Seksi &amp; Penanggung Jawab <span className="text-rose-600">*</span>
                            </label>
                            <textarea
                              rows={3}
                              value={revisionNoteDraft}
                              onChange={(e) => setRevisionNoteDraft(e.target.value)}
                              placeholder="Tuliskan poin revisi yang jelas (misal: rincian komponen yang perlu disesuaikan, pengalihan bulan, atau target efisiensi anggaran)..."
                              className="w-full p-2.5 rounded-xl border border-amber-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 block">
                              Rekomendasi Pagu Anggaran (Opsional)
                            </label>
                            <input
                              type="text"
                              value={revisionBudgetDraft}
                              onChange={(e) => setRevisionBudgetDraft(e.target.value.replace(/[^\d]/g, ''))}
                              placeholder="Contoh: 5000000"
                              className="w-full h-10 px-3 rounded-xl border border-amber-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                            {revisionBudgetDraft && (
                              <span className="text-[11px] font-bold text-emerald-700 block">
                                Preview: {formatRupiah(parseInt(revisionBudgetDraft, 10) || 0)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <span className="text-[10.5px] text-amber-900 font-medium">
                            Catatan ini akan muncul sebagai peringatan revisi saat Seksi membuka program ini.
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveRevisionFormId(null)}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={!revisionNoteDraft.trim() || !onSaveProgram}
                              onClick={() => handleSaveRevisionNote(program, reviewContext.monthNum)}
                              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Simpan &amp; Tujukan Untuk Revisi</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* BARIS AKSI PROGRAM DI MODE REVIEW */
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openRevisionForm(program)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer ${
                              isFlagged
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>
                              {isFlagged
                                ? 'Edit Catatan Revisi'
                                : 'Buat Catatan & Tujukan Untuk Revisi'}
                            </span>
                          </button>

                          {isFlagged && onSaveProgram && (
                            <button
                              type="button"
                              onClick={() => handleResolveOrClearRevision(program, 'resolved')}
                              className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Tandai Sudah Direvisi</span>
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setProgramToEditByAdmin(program)}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                            title="Sesuaikan Anggaran atau Jadwal Bulan Program Secara Langsung"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Jadwal / Anggaran</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenProgramDetail(program.id)}
                            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <span>Formulir Lengkap</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* BOTTOM STICKY/FOOTER BAR KEMBALI KE DASHBOARD */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600 font-medium">
              Selesai meninjau program di bulan <strong>{reviewContext.monthName}</strong>?
              {reviewContext.flaggedCount > 0 && (
                <span className="ml-1 text-rose-700 font-bold">
                  ({reviewContext.flaggedCount} program telah ditujukan untuk revisi)
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={closeReviewMonth}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Kembali ke Dashboard Penggunaan Dana &amp; Penerimaan</span>
            </button>
          </div>
        </div>
      ) : focusMode === 'pse_khusus' ? (
        /* ======================================================== */
        /* MODUL KHUSUS SEKSI PSE (PENGEMBANGAN SOSIAL EKONOMI) */
        /* TERPISAH DARI UANG KOLEKTE UMUM & LITURGI */
        /* ======================================================== */
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* BANNER NAVIGASI & PENJELASAN TATA KELOLA KAS PSE */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Heart className="w-7 h-7 fill-white text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-tight">
                      Modul Khusus: Arus Kas &amp; Program Seksi PSE
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-950/40 border border-amber-300/40 text-[10.5px] font-black uppercase text-amber-200">
                      Dana Mandiri · Non-Kolekte
                    </span>
                  </div>
                  <p className="text-xs text-amber-100 font-medium max-w-2xl leading-relaxed mt-0.5">
                    Kas Seksi PSE bersumber dari <strong>Aksi Puasa Pembangunan (APP)</strong>, <strong>Aksi Natal</strong>, <strong>Kotak Solidaritas Kasih</strong>, dan donatur khusus untuk santunan prasejahtera. Dikelola terpisah dan tidak memakai kas kolekte misa umum.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {!isPseUser && (
                  <button
                    type="button"
                    onClick={() => setFocusMode('komparasi')}
                    className="px-3.5 py-2 rounded-xl bg-white text-slate-900 hover:bg-amber-50 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-amber-700" />
                    <span>← Kembali ke Kas Paroki &amp; Kolekte</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ACTION PANEL KHUSUS PSE: PERENCANAAN, REALISASI PENERIMAAN & REALISASI PENGGUNAAN */}
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300 rounded-2xl p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">
                    Menu Khusus Input PSE (Dana Umat &amp; Kasih Karitatif)
                  </span>
                  {(isPseUser || isPastorOrAdminOrBendahara) && (
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-100 text-emerald-800 uppercase">
                      Akses Terbuka
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-amber-900/80 font-medium">
                  Isi rencana perolehan dana derma umat, bukukan realisasi kas masuk, serta catat realisasi penyaluran dana santunan.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tombol 1: Isi Perencanaan Penerimaan Dana Umat */}
              {onSavePenerimaan && (
                <button
                  type="button"
                  onClick={() => handleOpenAddPenerimaan('Seksi PSE (Pengembangan Sosial Ekonomi)')}
                  className="px-3 py-1.5 bg-white hover:bg-amber-100/80 text-amber-950 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Isi Perencanaan Penerimaan Kasih Umat (APP, Aksi Natal, Kotak Solidaritas)"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />
                  <span>📋 + Rencana Penerimaan</span>
                </button>
              )}

              {/* Tombol 2: Catat Realisasi Penerimaan Kas Masuk */}
              {onSavePenerimaan && (
                <button
                  type="button"
                  onClick={() => handleOpenAddPenerimaan('Seksi PSE (Pengembangan Sosial Ekonomi)')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Catat Realisasi Riil Kas Masuk Dana Umat"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-200" />
                  <span>💰 + Realisasi Kas Masuk</span>
                </button>
              )}

              {/* Tombol 3: Catat Realisasi & Penyaluran Penggunaan Dana */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPseDisbursementProgram(null);
                  setIsPseDisbursementOpen(true);
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Catat Realisasi Penggunaan Dana Umat untuk Bantuan & Santunan Karitatif"
              >
                <HeartHandshake className="w-4 h-4 text-white" />
                <span>🤝 + Realisasi &amp; Penggunaan Dana</span>
              </button>
            </div>
          </div>

          {/* 4 KPI METRICS KHUSUS PSE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* KPI 1: Penerimaan Sosial PSE */}
            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  1. Penerimaan Sosial PSE (Tahunan)
                </span>
                <Heart className="w-4 h-4 text-amber-600 fill-amber-500" />
              </div>
              <p className="text-xl font-black text-slate-950">
                {formatRupiah(pseMonthlyData.grandTotalPenerimaan)}
              </p>
              <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
                <span>Realisasi Kas Masuk:</span>
                <span className="font-bold text-emerald-700">
                  {formatRupiah(pseMonthlyData.grandTotalPenerimaanReal)}
                </span>
              </div>
            </div>

            {/* KPI 2: Kebutuhan Program Bantuan PSE */}
            <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-rose-800">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  2. Kebutuhan Bantuan PSE
                </span>
                <TrendingUp className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-xl font-black text-slate-950">
                {formatRupiah(pseMonthlyData.grandTotalAnggaran)}
              </p>
              <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
                <span>{pseMonthlyData.psePrograms.length} Kegiatan Karitatif</span>
                <span>Realisasi: {formatRupiah(pseMonthlyData.grandTotalPengeluaranRiil)}</span>
              </div>
            </div>

            {/* KPI 3: Saldo Kasih Sosial (Surplus / Defisit) */}
            <div
              className={`p-4 rounded-2xl border shadow-2xs space-y-1 ${
                pseMonthlyData.saldoSosial >= 0
                  ? 'bg-gradient-to-br from-emerald-50 to-teal-50/60 border-emerald-300'
                  : 'bg-gradient-to-br from-rose-50 to-amber-50/60 border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${
                    pseMonthlyData.saldoSosial >= 0 ? 'text-emerald-800' : 'text-rose-800'
                  }`}
                >
                  {pseMonthlyData.saldoSosial >= 0 ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Saldo Kasih Surplus
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Perlu Donasi Tambahan
                    </>
                  )}
                </span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    pseMonthlyData.saldoSosial >= 0
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-rose-200 text-rose-900'
                  }`}
                >
                  {pseMonthlyData.grandTotalAnggaran > 0
                    ? Math.round((pseMonthlyData.grandTotalPenerimaan / pseMonthlyData.grandTotalAnggaran) * 100)
                    : 100}
                  % Tercover
                </span>
              </div>
              <p
                className={`text-xl font-black ${
                  pseMonthlyData.saldoSosial >= 0 ? 'text-emerald-950' : 'text-rose-950'
                }`}
              >
                {pseMonthlyData.saldoSosial >= 0 ? '+' : ''}
                {formatRupiah(pseMonthlyData.saldoSosial)}
              </p>
              <p className="text-[10.5px] text-slate-600 font-medium truncate">
                {pseMonthlyData.saldoSosial >= 0
                  ? 'Dana mandiri sosial mencukupi seluruh program santunan'
                  : 'Perlu penggalangan dana kasih atau sponsor donatur'}
              </p>
            </div>

            {/* KPI 4: Bulan Fokus PSE */}
            <div className="bg-gradient-to-br from-slate-900 to-amber-950 text-white p-4 rounded-2xl border border-slate-800 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  Bulan Fokus PSE: {currentPseMonthData.monthName}
                </span>
                <Calendar className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-xl font-black text-white">
                  {formatRupiah(currentPseMonthData.totalAnggaran)}
                </p>
                <span
                  className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-md ${
                    currentPseMonthData.selisih >= 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {currentPseMonthData.selisih >= 0 ? 'Aman' : 'Defisit Kasih'}
                </span>
              </div>
              <p className="text-[10.5px] text-amber-200 font-medium">
                Penerimaan Mandiri: <strong>{formatRupiah(currentPseMonthData.totalPenerimaanRencana)}</strong>
              </p>
            </div>
          </div>

          {/* PANEL PERINGATAN BULAN ANGGARAN PSE KURANG */}
          {pseDeficitMonths.length > 0 && (
            <div className="bg-rose-50/90 border border-rose-300 rounded-2xl p-4 shadow-2xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-black text-rose-950">
                    Deteksi Bulan Anggaran PSE Kurang ({pseDeficitMonths.length} Bulan Defisit)
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-rose-800">
                  Klik bulan di bawah untuk review detail program &amp; beri catatan revisi
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {pseDeficitMonths.map((m) => (
                  <button
                    key={m.monthNum}
                    type="button"
                    onClick={() => openReviewMonth(m.monthNum)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-100 border border-rose-300 text-xs font-black text-rose-900 flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>{m.monthName}: {formatCompactRupiah(m.selisih)}</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px]">
                      Review ({m.programs.length} Proker)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* GRAFIK 12 BULAN KHUSUS SEKSI PSE (TERPISAH DARI KOLEKTE) */}
          <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-600" />
                  <span>
                    Grafik Khusus Arus Kas Seksi PSE:{' '}
                    <span className="text-amber-700">Penerimaan Sosial Mandiri</span> vs{' '}
                    <span className="text-rose-700">Kebutuhan Program Bantuan</span>
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Grafik mandiri terpisah dari uang kolekte misa mingguan. Klik batang bulan untuk memeriksa detail di bulan tersebut.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-amber-500 inline-block" />
                  Penerimaan Sosial (APP/Natal/Donasi)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-600 inline-block" />
                  Kebutuhan Bantuan Proker PSE
                </span>
              </div>
            </div>

            {/* BARS CONTAINER PSE */}
            <div className="h-64 pt-6 pb-2 flex items-end justify-between gap-1 sm:gap-2 border-b border-slate-200">
              {pseMonthlyData.months.map((m) => {
                const isSelected = m.monthNum === activeMonth;
                const penerimaanHeight = Math.max(
                  Math.round((m.totalPenerimaanRencana / pseMonthlyData.chartMax) * 100),
                  2
                );
                const anggaranHeight = Math.max(
                  Math.round((m.totalAnggaran / pseMonthlyData.chartMax) * 100),
                  2
                );

                return (
                  <button
                    key={m.monthNum}
                    type="button"
                    onClick={() => setActiveMonth(m.monthNum)}
                    className={`flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer focus:outline-none transition-all p-1 rounded-xl ${
                      isSelected ? 'bg-amber-100/60 ring-2 ring-amber-500' : 'hover:bg-amber-50/40'
                    }`}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-16 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                      <div className="bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap space-y-0.5">
                        <p className="font-black text-amber-300">Bulan {m.monthName}</p>
                        <p className="text-amber-200">Masuk PSE: {formatRupiah(m.totalPenerimaanRencana)}</p>
                        <p className="text-rose-300">Proker PSE: {formatRupiah(m.totalAnggaran)}</p>
                        <p className={m.selisih >= 0 ? 'text-emerald-300 font-bold' : 'text-rose-400 font-bold'}>
                          Saldo: {m.selisih >= 0 ? '+' : ''}{formatRupiah(m.selisih)}
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                    </div>

                    {/* Dual Bars: Bar 1 = Penerimaan PSE, Bar 2 = Proker Bantuan */}
                    <div className="w-full flex items-end justify-center gap-1 h-44">
                      {/* Bar Penerimaan Sosial PSE */}
                      <div
                        style={{ height: `${penerimaanHeight}%` }}
                        className={`w-1/2 max-w-[18px] rounded-t-md transition-all ${
                          isSelected
                            ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-sm'
                            : 'bg-amber-500 hover:bg-amber-600'
                        }`}
                        title={`Penerimaan Sosial: ${formatRupiah(m.totalPenerimaanRencana)}`}
                      />

                      {/* Bar Anggaran Program Bantuan PSE */}
                      <div
                        style={{ height: `${anggaranHeight}%` }}
                        className={`w-1/2 max-w-[18px] rounded-t-md transition-all ${
                          isSelected
                            ? 'bg-gradient-to-t from-rose-700 to-rose-500 shadow-sm'
                            : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                        title={`Program Bantuan PSE: ${formatRupiah(m.totalAnggaran)}`}
                      />
                    </div>

                    {/* Month Label */}
                    <span
                      className={`text-[10px] mt-2 block font-extrabold ${
                        isSelected ? 'text-amber-950 font-black' : 'text-slate-600'
                      }`}
                    >
                      {m.singkatan}
                    </span>

                    {/* Status Dot */}
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        m.selisih >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* INSPEKSI 2 SISI KHUSUS SEKSI PSE UNTUK BULAN AKTIF */}
          <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-100 gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>🤝 2 Sisi Khusus PSE: Bulan {currentPseMonthData.monthName}</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Perbandingan penerimaan sosial mandiri dengan kebutuhan kegiatan bantuan seksi PSE di bulan ini.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={`px-3 py-1.5 rounded-xl border font-black text-xs flex items-center gap-2 ${
                    currentPseMonthData.selisih >= 0
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-rose-50 text-rose-900 border-rose-300'
                  }`}
                >
                  {currentPseMonthData.selisih >= 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Surplus Kasih:{' '}
                        <strong className="text-emerald-800">+{formatRupiah(currentPseMonthData.selisih)}</strong>
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        Defisit Kasih:{' '}
                        <strong className="text-rose-800">{formatRupiah(currentPseMonthData.selisih)}</strong>
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => openReviewMonth(currentPseMonthData.monthNum)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer ${
                    currentPseMonthData.selisih < 0
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Review Detail &amp; Revisi</span>
                </button>
              </div>
            </div>

            {/* 2 SISI KHUSUS PSE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* SISI 1: PENERIMAAN KHUSUS PSE */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs font-black">
                      <Heart className="w-4 h-4 fill-white text-white" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">
                        Sisi 1: Penerimaan Sosial Mandiri PSE
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Total {currentPseMonthData.penerimaanItems.length} catatan dana sosial di bulan {currentPseMonthData.monthName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Rencana Masuk</span>
                      <span className="text-sm font-black text-amber-800">
                        {formatRupiah(currentPseMonthData.totalPenerimaanRencana)}
                      </span>
                    </div>
                    {onSavePenerimaan && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddPenerimaan('Seksi PSE (Pengembangan Sosial Ekonomi)')}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                        title={`Input Penerimaan Kasih PSE untuk Bulan ${currentPseMonthData.monthName}`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>+ Input Kas PSE</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* List Penerimaan PSE */}
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {currentPseMonthData.penerimaanItems.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white border border-amber-200 text-center space-y-3">
                      <Heart className="w-8 h-8 text-amber-500 mx-auto" />
                      <div>
                        <h5 className="text-xs font-black text-slate-900">
                          Belum Ada Rencana Penerimaan Sosial PSE Bulan {currentPseMonthData.monthName}
                        </h5>
                        <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
                          Masukkan target aksi sosial APP, Aksi Natal, atau donatur bantuan warga prasejahtera.
                        </p>
                      </div>
                      {onSavePenerimaan && (
                        <button
                          type="button"
                          onClick={() => handleOpenAddPenerimaan('Seksi PSE (Pengembangan Sosial Ekonomi)')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs cursor-pointer transition-all"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Input Penerimaan Kasih PSE</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    currentPseMonthData.penerimaanItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between gap-2 shadow-2xs hover:border-amber-300 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9.5px] font-black border border-amber-200">
                              🤝 Kas Sosial PSE
                            </span>
                            <span className="font-extrabold text-slate-900 truncate">{item.namaPenerimaan}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Tgl: {formatIndonesianDate(item.tanggal, true)}
                            {item.keterangan ? ` · ${item.keterangan}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-[9.5px] text-slate-400 block font-medium">Target / Riil</span>
                            <span className="font-extrabold text-slate-900 block text-xs">
                              {formatRupiah(item.rancangan)}
                            </span>
                            <span className="text-[10px] font-black text-emerald-700 block">
                              Riil: {formatRupiah(item.realisasi)}
                            </span>
                          </div>

                          {onSavePenerimaan && (
                            <button
                              type="button"
                              onClick={() => handleEditPenerimaan(item)}
                              className="px-2 py-1 text-slate-700 hover:text-amber-900 bg-slate-50 hover:bg-amber-100 rounded-lg text-[10.5px] font-bold border border-slate-200 cursor-pointer transition-colors shadow-2xs"
                              title="Edit Target Rencana atau Realisasi Kas Masuk Ini"
                            >
                              <span>✏️</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SISI 2: PROGRAM KERJA KHUSUS PSE */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-4 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-black">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">
                        Sisi 2: Program Bantuan Karitatif PSE
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Total {currentPseMonthData.programs.length} kegiatan aktif di bulan {currentPseMonthData.monthName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Kebutuhan Anggaran</span>
                    <span className="text-sm font-black text-rose-700">
                      {formatRupiah(currentPseMonthData.totalAnggaran)}
                    </span>
                  </div>
                </div>

                {/* List Proker Bantuan PSE */}
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {currentPseMonthData.programs.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white border border-rose-200 text-center space-y-2">
                      <p className="text-xs font-black text-slate-700">
                        Tidak ada program bantuan PSE yang dijadwalkan pada bulan {currentPseMonthData.monthName}.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Pilih bulan lain pada grafik di atas untuk memeriksa jadwal santunan / beasiswa / sembako PSE.
                      </p>
                    </div>
                  ) : (
                    currentPseMonthData.programs.map((prog) => {
                      const kInfo = getKategoriProgramInfo(prog.kategoriProgram);
                      const alokasiDanaBulanIni = getAlokasiBudgetBulanan(prog, activeMonth);
                      const existingEv = getEvaluasiForMonth(prog, activeMonth);

                      return (
                        <div
                          key={prog.id}
                          className="p-3 rounded-xl bg-white border border-rose-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs hover:border-rose-400 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border inline-flex items-center gap-1 ${kInfo.badge}`}
                              >
                                <span>{kInfo.iconEmoji}</span>
                                <span>{kInfo.label}</span>
                              </span>
                              <span className="font-extrabold text-slate-900 truncate">
                                {prog.namaProgram}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-500 mt-0.5">
                              PJ: {prog.penanggungjawab?.nama || 'Seksi PSE'} · Target:{' '}
                              {prog.targetSasaran || 'Warga Prasejahtera'}
                            </p>
                            {existingEv && typeof existingEv.anggaranTerpakai === 'number' && existingEv.anggaranTerpakai > 0 && (
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                                  ✅ Realisasi Penyaluran: {formatRupiah(existingEv.anggaranTerpakai)}
                                </span>
                                {existingEv.jumlahPeserta && (
                                  <span className="text-slate-600 font-medium">
                                    · Sasaran: {existingEv.jumlahPeserta}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-auto">
                            <div className="text-right mr-1">
                              <span className="text-[9.5px] text-slate-400 block font-medium uppercase">
                                Alokasi Bln Ini
                              </span>
                              <span className="text-xs font-black text-rose-700">
                                {formatRupiah(alokasiDanaBulanIni)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPseDisbursementProgram(prog);
                                setIsPseDisbursementOpen(true);
                              }}
                              className="px-2.5 py-1 text-amber-950 bg-amber-100 hover:bg-amber-200 rounded-lg text-[10.5px] font-black flex items-center gap-1 cursor-pointer transition-colors shadow-2xs border border-amber-300"
                              title="Catat Realisasi Penyaluran & Penggunaan Dana Umat untuk Program Ini"
                            >
                              <HeartHandshake className="w-3.5 h-3.5 text-amber-700" />
                              <span>{existingEv?.anggaranTerpakai ? 'Update Penyaluran' : 'Catat Penyaluran'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setProgramToEditByAdmin(prog)}
                              className="px-2 py-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs border border-emerald-200"
                              title="Edit atau Jadwalkan Ulang Program PSE Ini"
                            >
                              <span>✏️ Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedDetailProgram(prog)}
                              className="px-2 py-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Lihat Detail Lengkap Program"
                            >
                              <span>Detail</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TABEL REKAPITULASI 12 BULAN KHUSUS SEKSI PSE */}
          <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>
                  Matriks 12 Bulan Khusus Seksi PSE: Penerimaan Mandiri vs Program Bantuan
                </span>
              </h3>
              <span className="text-xs text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full">
                Kas Mandiri Sosial
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-amber-50/80 text-amber-950 font-black text-[11px] uppercase border-b border-amber-200">
                    <th className="py-2.5 px-3">Bulan</th>
                    <th className="py-2.5 px-3 text-right">Rencana Masuk PSE</th>
                    <th className="py-2.5 px-3 text-right">Realisasi Masuk PSE</th>
                    <th className="py-2.5 px-3 text-center">Jml Proker</th>
                    <th className="py-2.5 px-3 text-right text-rose-800">Kebutuhan Bantuan PSE</th>
                    <th className="py-2.5 px-3 text-right">Saldo Kasih</th>
                    <th className="py-2.5 px-3 text-center">Kecukupan</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pseMonthlyData.months.map((m) => {
                    const isSelected = m.monthNum === activeMonth;
                    const isSurplus = m.selisih >= 0;

                    return (
                      <tr
                        key={m.monthNum}
                        className={`hover:bg-amber-50/40 transition-colors ${
                          isSelected ? 'bg-amber-100/50 font-bold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
                            {m.monthNum}
                          </span>
                          <span className="font-extrabold text-slate-900">{m.monthName}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-900">
                          {formatRupiah(m.totalPenerimaanRencana)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {formatRupiah(m.totalPenerimaanReal)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                          {m.programs.length}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-rose-700">
                          {formatRupiah(m.totalAnggaran)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black">
                          <span className={isSurplus ? 'text-emerald-700' : 'text-rose-600'}>
                            {isSurplus ? '+' : ''}
                            {formatRupiah(m.selisih)}
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
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setActiveMonth(m.monthNum)}
                              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isSelected ? 'Aktif' : 'Cek'}
                            </button>
                            {m.programs.length > 0 && (
                              <button
                                type="button"
                                onClick={() => openReviewMonth(m.monthNum)}
                                className={`px-2 py-1 rounded-lg text-[10.5px] font-black transition-colors cursor-pointer ${
                                  !isSurplus
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                }`}
                                title={`Review Detail Program Bulan ${m.monthName}`}
                              >
                                Review
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-100/70 font-black text-amber-950 border-t-2 border-amber-300">
                    <td className="py-3 px-3">TOTAL TAHUNAN PSE</td>
                    <td className="py-3 px-3 text-right text-xs font-black">
                      {formatRupiah(pseMonthlyData.grandTotalPenerimaan)}
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-black text-emerald-800">
                      {formatRupiah(pseMonthlyData.grandTotalPenerimaanReal)}
                    </td>
                    <td className="py-3 px-3 text-center text-xs font-black">
                      {pseMonthlyData.psePrograms.length}
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-black text-rose-800">
                      {formatRupiah(pseMonthlyData.grandTotalAnggaran)}
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-black">
                      <span
                        className={
                          pseMonthlyData.saldoSosial >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }
                      >
                        {pseMonthlyData.saldoSosial >= 0 ? '+' : ''}
                        {formatRupiah(pseMonthlyData.saldoSosial)}
                      </span>
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-center text-[11px] font-bold">
                      {pseMonthlyData.grandTotalAnggaran > 0
                        ? Math.round(
                            (pseMonthlyData.grandTotalPenerimaan / pseMonthlyData.grandTotalAnggaran) * 100
                          )
                        : 100}
                      % Terpenuhi
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
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

      {/* PANEL DETEKSI & REVIEW CEPAT BULAN ANGGARAN KURANG (DEFISIT) */}
      {(deficitMonths.length > 0 || totalRevisionFlagged > 0) && (
        <div
          className={`rounded-2xl p-4 border shadow-2xs space-y-3 ${
            deficitMonths.length > 0
              ? 'bg-gradient-to-r from-rose-50 via-amber-50/70 to-rose-50 border-rose-300'
              : 'bg-amber-50/70 border-amber-300'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start sm:items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  deficitMonths.length > 0 ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">
                  {deficitMonths.length > 0
                    ? `Terdeteksi ${deficitMonths.length} Bulan dengan Anggaran Kurang (Defisit)`
                    : 'Monitoring Catatan Revisi Program Kerja'}
                </h3>
                <p className="text-[11px] text-slate-700 font-medium">
                  {deficitMonths.length > 0
                    ? 'Klik langsung bulan yang defisit untuk memeriksa program yang berjalan secara detail dan menujukan catatan revisi kepada Seksi.'
                    : 'Terdapat program kerja yang sedang ditujukan untuk revisi anggaran oleh peninjau.'}
                </p>
              </div>
            </div>

            {totalRevisionFlagged > 0 && (
              <span className="px-3 py-1 rounded-full bg-white border border-rose-300 text-[11px] font-black text-rose-800 self-start sm:self-auto shrink-0">
                ⚠️ {totalRevisionFlagged} Program Ditujukan Revisi
              </span>
            )}
          </div>

          {deficitMonths.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {deficitMonths.map((m) => {
                const shortfall = m.selisihProker < 0 ? m.selisihProker : m.selisihProyeksi;
                const flaggedInMonth = m.items.filter((i) => i.program.catatanRevisiAnggaran?.perluRevisi).length;
                return (
                  <div
                    key={m.monthNum}
                    className="bg-white rounded-xl p-3 border border-rose-200 shadow-2xs flex items-center justify-between gap-2.5 hover:border-rose-400 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">{m.monthName}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                          {m.count} Proker
                        </span>
                        {flaggedInMonth > 0 && (
                          <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                            {flaggedInMonth} Revisi
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-black text-rose-600 mt-0.5">
                        Kurang {formatRupiah(Math.abs(shortfall))}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        Beban {formatCompactRupiah(m.totalDana)} vs Kas Proker {formatCompactRupiah(m.danaBisaDipakaiProker)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openReviewMonth(m.monthNum)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review Program</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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

          {/* Banner Status Likuiditas Bulan Terpilih + Tombol Review Detail Program */}
          <div className="flex flex-wrap items-center gap-2">
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

            <button
              type="button"
              onClick={() => openReviewMonth(currentMonthData.monthNum)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer ${
                currentMonthData.selisihProyeksi < 0 || currentMonthData.selisihProker < 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
              title={`Review secara detail seluruh program yang berjalan pada bulan ${currentMonthData.monthName} & beri catatan revisi`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Review Program Bulan Ini ({currentMonthData.count})</span>
            </button>
          </div>
        </div>

        {/* 2 SISI KOMPARASI (KIRI: PENERIMAAN KAS, KANAN: KEBUTUHAN ANGGARAN PROKER) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* SISI KIRI: RENCANA & REALISASI PENERIMAAN KAS (PASTOR PAROKI / ADMIN & BENDAHARA) */}
          <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/20 p-4 space-y-3.5">
            {!isPastorOrAdminOrBendahara && !isPseUser ? (
              <div className="p-8 text-center space-y-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center mx-auto shadow-sm">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Sisi 1: Rencana Penerimaan Kas Paroki
                  </h4>
                  <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1 leading-relaxed">
                    Data rencana &amp; realisasi penerimaan kas (Kolekte I, Kolekte II, dan Penerimaan Khusus) dapat diakses oleh <strong>Pastor Paroki / Admin</strong> dan <strong>Bendahara Paroki</strong>.
                  </p>
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10.5px] font-bold">
                    🔒 Akses Khusus Pastor Paroki / Admin &amp; Bendahara
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">
                        {isPseUser ? 'Sisi 1: Rencana Penerimaan Kasih PSE' : 'Sisi 1: Rencana & Realisasi Penerimaan'}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Total {isPseUser ? currentPseMonthData.penerimaanItems.length : currentMonthData.penerimaanCount} catatan kas di bulan {currentMonthData.monthName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Rencana Masuk</span>
                      <span className="text-sm font-black text-emerald-700">
                        {formatRupiah(isPseUser ? currentPseMonthData.totalPenerimaanRencana : currentMonthData.totalRencanaPenerimaan)}
                      </span>
                    </div>
                    {onSavePenerimaan && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddPenerimaan(isPseUser ? 'Seksi PSE (Pengembangan Sosial Ekonomi)' : undefined)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                        title={isPseUser ? `Input Penerimaan Kasih PSE Bulan ${currentMonthData.monthName}` : `Input Rencana Penerimaan untuk Bulan ${currentMonthData.monthName}`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{isPseUser ? '+ Input Kas PSE' : '+ Input Rencana'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* SISI 1: TAMPILAN KHUSUS PSE (DANA UMAT MANDIRI, TANPA KOLEKTE) ATAU KONSOLIDASI KOLEKTE UNTUK PAROKI */}
                {isPseUser ? (
                  <div className="space-y-3.5">
                    {/* CARD UTAMA: TOTAL PENERIMAAN KASIH PSE */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white border border-amber-500 shadow-md space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center text-xs font-bold">
                            🤝
                          </span>
                          <div>
                            <span className="text-[10px] text-amber-200 font-black uppercase tracking-wider block">
                              Penerimaan Kas &amp; Derma Kasih PSE
                            </span>
                            <h5 className="text-xs font-bold text-white">
                              Dana Umat Mandiri (Bulan {currentMonthData.monthName})
                            </h5>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-950/30 border border-amber-300/30 text-amber-100 text-[10px] font-black">
                          {currentPseMonthData.penerimaanItems.length} Catatan Dana Kasih
                        </span>
                      </div>

                      {/* Angka Total PSE */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/20">
                        <div>
                          <span className="text-[10px] text-amber-100 font-bold uppercase block">
                            Target Rencana Masuk PSE:
                          </span>
                          <span className="text-xl font-black text-white">
                            {formatRupiah(currentPseMonthData.totalPenerimaanRencana)}
                          </span>
                          <span className="text-[10px] text-amber-100 block font-medium mt-0.5">
                            Realisasi Riil Terkumpul: <strong className="text-white">{formatRupiah(currentPseMonthData.totalPenerimaanReal)}</strong>
                          </span>
                        </div>

                        <div className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-400/30 space-y-1">
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="text-amber-100 font-semibold">Kebutuhan Bantuan Bln Ini:</span>
                            <strong className="text-white font-black">{formatRupiah(currentPseMonthData.totalAnggaran)}</strong>
                          </div>
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="text-amber-100 font-semibold">Ketahanan Saldo Kasih:</span>
                            <strong className={currentPseMonthData.totalPenerimaanRencana >= currentPseMonthData.totalAnggaran ? 'text-emerald-300 font-black' : 'text-rose-200 font-black'}>
                              {formatRupiah(currentPseMonthData.totalPenerimaanRencana - currentPseMonthData.totalAnggaran)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[10.5px] text-amber-100 border-t border-white/20">
                        <span>🌱 Ketercukupan Anggaran PSE:</span>
                        <strong className="text-white font-black text-xs">
                          {currentPseMonthData.totalAnggaran > 0
                            ? `${Math.round((currentPseMonthData.totalPenerimaanRencana / currentPseMonthData.totalAnggaran) * 100)}%`
                            : '100%'}
                        </strong>
                      </div>
                    </div>

                    {/* DAFTAR RINCIAN PENERIMAAN DANA KASIH PSE */}
                    <div className="p-3 bg-white rounded-2xl border border-amber-200 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <span className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <span>📋 Pos Penerimaan Kasih PSE (Bulan {currentMonthData.monthName}):</span>
                        </span>
                        {onSavePenerimaan && (
                          <button
                            type="button"
                            onClick={() => handleOpenAddPenerimaan('Seksi PSE (Pengembangan Sosial Ekonomi)')}
                            className="text-[10.5px] text-amber-700 hover:text-amber-900 font-black hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3 stroke-[2.5]" />
                            <span>+ Tambah Pos</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                        {currentPseMonthData.penerimaanItems.length === 0 ? (
                          <div className="p-4 text-center rounded-xl bg-amber-50/50 border border-dashed border-amber-200">
                            <p className="text-xs text-amber-900/80 font-medium">
                              Belum ada catatan penerimaan PSE di bulan {currentMonthData.monthName}.
                            </p>
                            {onSavePenerimaan && (
                              <button
                                type="button"
                                onClick={() => handleOpenAddPenerimaan('Seksi PSE (Pengembangan Sosial Ekonomi)')}
                                className="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-black inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3 stroke-[3]" />
                                <span>Input Rencana Penerimaan PSE</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          currentPseMonthData.penerimaanItems.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-xl bg-amber-50/40 border border-amber-200/90 text-xs flex items-center justify-between gap-2 hover:border-amber-400 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 text-[9px] font-black">
                                    {item.kategori === 'persembahan_umat'
                                      ? 'Dana Umat'
                                      : item.kategori === 'donatur_spesifik'
                                      ? 'Donatur Kasih'
                                      : item.kategori === 'dana_kelolaan'
                                      ? 'Dana Kelolaan'
                                      : 'Penerimaan PSE'}
                                  </span>
                                  <span className="font-extrabold text-slate-900 truncate">
                                    {item.namaPenerimaan}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  Tgl: {formatIndonesianDate(item.tanggal, true)}
                                  {item.keterangan ? ` · ${item.keterangan}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right shrink-0">
                                  <span className="font-extrabold text-slate-900 block text-xs">
                                    {formatRupiah(item.rancangan)}
                                  </span>
                                  <span className="text-[9.5px] font-bold text-emerald-700 block">
                                    Riil: {formatRupiah(item.realisasi)}
                                  </span>
                                </div>
                                {onSavePenerimaan && (
                                  <button
                                    type="button"
                                    onClick={() => handleEditPenerimaan(item)}
                                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-amber-50 text-slate-600 hover:text-amber-800 transition-colors cursor-pointer"
                                    title="Edit Catatan Kas PSE"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const kolekteItems = currentMonthData.penerimaanItems.filter(
                      (i) =>
                        i.kategori === 'kolekte_1' ||
                        i.kategori === 'kolekte_2' ||
                        i.kategori === 'kolekte_khusus' ||
                        (!i.alokasiSeksi || i.alokasiSeksi === 'Umum Paroki')
                    );
                    const totalRencanaKolekte =
                      currentMonthData.breakdownPenerimaan.kolekte1 +
                      currentMonthData.breakdownPenerimaan.kolekte2 +
                      currentMonthData.breakdownPenerimaan.kolekteKhusus;
                    const totalRealisasiKolekte =
                      currentMonthData.breakdownPenerimaan.kolekte1Real +
                      currentMonthData.breakdownPenerimaan.kolekte2Real +
                      currentMonthData.breakdownPenerimaan.kolekteKhususReal;
                    const siapProkerParoki =
                      currentMonthData.breakdownPenerimaan.kolekte1Proker +
                      currentMonthData.breakdownPenerimaan.kolekteKhusus;

                    return (
                      <div className="space-y-3.5">
                        {/* CARD UTAMA: TOTAL KOLEKTE MISA (TOTAL SAJA SECARA BERSIH) */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white border border-emerald-800 shadow-md space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">
                                ⛪
                              </span>
                              <div>
                                <span className="text-[10px] text-emerald-300 font-black uppercase tracking-wider block">
                                  Total Penerimaan Kolekte Misa
                                </span>
                                <h5 className="text-xs font-bold text-slate-200">
                                  Kolekte I, II &amp; Khusus (Bulan {currentMonthData.monthName})
                                </h5>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black">
                              {kolekteItems.length} Catatan Misa
                            </span>
                          </div>

                          {/* Angka Total Kolekte */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-emerald-800/80">
                            <div>
                              <span className="text-[10px] text-emerald-300/80 font-bold uppercase block">
                                Total Target Rencana Kolekte:
                              </span>
                              <span className="text-xl font-black text-white">
                                {formatRupiah(totalRencanaKolekte)}
                              </span>
                              <span className="text-[10px] text-emerald-300 block font-medium mt-0.5">
                                Realisasi Riil Terkumpul: <strong>{formatRupiah(totalRealisasiKolekte)}</strong>
                              </span>
                            </div>

                            <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-700/50 space-y-1">
                              <div className="flex items-center justify-between text-[10.5px]">
                                <span className="text-emerald-200 font-semibold">Siap Pakai Proker (50% Kol I + Khusus):</span>
                                <strong className="text-white font-black">{formatRupiah(siapProkerParoki)}</strong>
                              </div>
                              <div className="flex items-center justify-between text-[10.5px]">
                                <span className="text-emerald-200 font-semibold">Kas Fisik/Pembangunan (100% Kol II):</span>
                                <strong className="text-emerald-300 font-black">
                                  {formatRupiah(currentMonthData.breakdownPenerimaan.kolekte2)}
                                </strong>
                              </div>
                            </div>
                          </div>

                          {/* Rincian 3 Pos Utama Kolekte */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-800/60 text-xs">
                            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                              <span className="text-[9.5px] text-blue-300 font-bold block">Kolekte I (Misa):</span>
                              <span className="text-xs font-black text-white block">
                                {formatRupiah(currentMonthData.breakdownPenerimaan.kolekte1)}
                              </span>
                              <span className="text-[9px] text-blue-200 block font-medium">
                                50% Ops &amp; 50% Proker
                              </span>
                            </div>

                            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                              <span className="text-[9.5px] text-emerald-300 font-bold block">Kolekte II (Fisik):</span>
                              <span className="text-xs font-black text-white block">
                                {formatRupiah(currentMonthData.breakdownPenerimaan.kolekte2)}
                              </span>
                              <span className="text-[9px] text-emerald-200 block font-medium">
                                Khusus Renovasi/Gereja
                              </span>
                            </div>

                            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                              <span className="text-[9.5px] text-purple-300 font-bold block">Kolekte Khusus:</span>
                              <span className="text-xs font-black text-white block">
                                {formatRupiah(currentMonthData.breakdownPenerimaan.kolekteKhusus)}
                              </span>
                              <span className="text-[9px] text-purple-200 block font-medium">
                                Hari Raya / Liturgi
                              </span>
                            </div>
                          </div>

                          {/* TOMBOL TOGGLE DETAIL RINCIAN MINGGUAN (TAMPIL TOTAL SAJA SECARA DEFAULT) */}
                          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-[10.5px] text-emerald-300/80 italic">
                              {isKolekteDetailOpen
                                ? 'Rincian mingguan sedang dibuka di bawah'
                                : 'Klik tombol di kanan untuk membuka rincian per minggu jika dibutuhkan'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsKolekteDetailOpen(!isKolekteDetailOpen)}
                              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs border border-white/20 self-start sm:self-auto"
                            >
                              <span>
                                {isKolekteDetailOpen
                                  ? '▲ Tutup Detail Rincian Mingguan'
                                  : `📋 Buka Detail Rincian Kolekte (${kolekteItems.length} Catatan) ▼`}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* RINCIAN MINGGUAN KOLEKTE HANYA TERLIHAT JIKA USER MEMBUKA DETAIL */}
                        {isKolekteDetailOpen && (
                          <div className="p-3 bg-white rounded-2xl border border-emerald-200 space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                              <span className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span>📅 Rincian Transaksi Kolekte per Minggu (Bulan {currentMonthData.monthName}):</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsKolekteDetailOpen(false)}
                                className="text-[10.5px] text-slate-500 hover:text-slate-800 font-bold hover:underline cursor-pointer"
                              >
                                Tutup Rincian ▲
                              </button>
                            </div>

                            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                              {kolekteItems.length === 0 ? (
                                <p className="text-xs text-slate-500 text-center py-4">
                                  Belum ada rincian kolekte mingguan terdata di bulan ini.
                                </p>
                              ) : (
                                kolekteItems.map((item) => (
                                  <div
                                    key={item.id}
                                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2 hover:border-emerald-300 transition-colors"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {item.isHariKhusus ? (
                                          <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 text-[9px] font-black border border-purple-200">
                                            ⭐ {item.namaHariKhusus || 'Hari Khusus'}
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 text-[9px] font-bold">
                                            Minggu {item.mingguKe}
                                          </span>
                                        )}
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                            item.kategori === 'kolekte_1'
                                              ? 'bg-blue-100 text-blue-800'
                                              : item.kategori === 'kolekte_2'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : 'bg-purple-100 text-purple-800'
                                          }`}
                                        >
                                          {item.kategori === 'kolekte_1'
                                            ? 'Kolekte I'
                                            : item.kategori === 'kolekte_2'
                                            ? 'Kolekte II'
                                            : 'Kolekte Khusus'}
                                        </span>
                                        <span className="font-extrabold text-slate-900 truncate">
                                          {item.namaPenerimaan}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 mt-0.5">
                                        Tgl: {formatIndonesianDate(item.tanggal, true)}
                                        {item.keterangan ? ` · ${item.keterangan}` : ''}
                                      </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-extrabold text-slate-900 block text-xs">
                                        {formatRupiah(item.rancangan)}
                                      </span>
                                      <span className="text-[9.5px] font-bold text-emerald-700 block">
                                        Riil: {formatRupiah(item.realisasi)}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* BANNER KHUSUS SEKSI PSE (TERPISAH DARI UANG KOLEKTE) */}
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 shadow-xs space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                                🤝
                              </span>
                              <div>
                                <h5 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                                  <span>Pemisahan Khusus Kas &amp; Program Seksi PSE</span>
                                  <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[9.5px] font-black">
                                    Non-Kolekte
                                  </span>
                                </h5>
                                <p className="text-[10.5px] text-amber-900/80 font-medium">
                                  Dana sosial (APP, Aksi Natal, Donasi Kasih) &amp; Bantuan PSE dikelola mandiri terpisah dari pemakaian uang kolekte.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFocusMode('pse_khusus')}
                              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer transition-all self-start sm:self-auto shrink-0"
                              title="Buka Halaman Khusus Grafik & Arus Kas Seksi PSE"
                            >
                              <span>📊 Buka Grafik &amp; Kas PSE ➔</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-amber-200/80 text-xs">
                            <div className="p-2 rounded-xl bg-white border border-amber-200">
                              <span className="text-[9.5px] text-amber-800 font-bold block">
                                Penerimaan Sosial PSE ({currentMonthData.monthName}):
                              </span>
                              <span className="text-xs font-black text-slate-900">
                                {formatRupiah(currentPseMonthData.totalPenerimaanRencana)}
                              </span>
                              <span className="text-[9px] text-emerald-700 font-semibold block">
                                Riil: {formatRupiah(currentPseMonthData.totalPenerimaanReal)}
                              </span>
                            </div>

                            <div className="p-2 rounded-xl bg-white border border-rose-200">
                              <span className="text-[9.5px] text-rose-800 font-bold block">
                                Kebutuhan Bantuan PSE ({currentMonthData.monthName}):
                              </span>
                              <span className="text-xs font-black text-slate-900">
                                {formatRupiah(currentPseMonthData.totalAnggaran)}
                              </span>
                              <span className="text-[9px] text-indigo-700 font-semibold block">
                                {currentPseMonthData.programs.length} Kegiatan Bantuan
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </>
            )}
          </div>

          {/* SISI KANAN: RENCANA ANGGARAN KEBUTUHAN PROGRAM KERJA */}
          <div className="rounded-2xl border border-indigo-200/90 bg-indigo-50/20 p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-indigo-100 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">
                    Sisi 2: Rencana Kebutuhan Anggaran Proker
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Total {currentMonthData.count} kegiatan aktif di {currentMonthBySeksi.length} Seksi / Unit (Bulan {currentMonthData.monthName})
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

            {/* BAR MENU KONTROL: KEMBALI KE SEMULA / TUTUP SEMUA & BUKA SEMUA */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-white border border-indigo-100 shadow-2xs text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Daftar Proker per Seksi ({currentMonthBySeksi.length} Seksi Aktif)</span>
                {Object.values(expandedSeksis).filter(Boolean).length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black">
                    {Object.values(expandedSeksis).filter(Boolean).length} Seksi Terbuka
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {Object.values(expandedSeksis).filter(Boolean).length > 0 ? (
                  <button
                    type="button"
                    onClick={collapseAllSeksis}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Tutup semua detail dan kembali ke daftar ringkasan per seksi"
                  >
                    <ChevronsDownUp className="w-3.5 h-3.5" />
                    <span>← Kembali ke Ringkasan Seksi</span>
                  </button>
                ) : (
                  <span className="text-[10.5px] text-slate-500 font-medium italic">
                    Klik seksi untuk melihat detail kegiatan
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (Object.values(expandedSeksis).filter(Boolean).length === currentMonthBySeksi.length) {
                      setExpandedSeksis({});
                    } else {
                      const all: Record<string, boolean> = {};
                      currentMonthBySeksi.forEach((g) => {
                        all[g.seksiName] = true;
                      });
                      setExpandedSeksis(all);
                    }
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer"
                >
                  {Object.values(expandedSeksis).filter(Boolean).length === currentMonthBySeksi.length
                    ? 'Tutup Semua'
                    : 'Buka Semua'}
                </button>
              </div>
            </div>

            {/* List Program di Bulan Ini: Ringkasan per Seksi (Accordion) */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {currentMonthData.items.length === 0 ? (
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-400">
                  Tidak ada program kerja yang membutuhkan anggaran di bulan {currentMonthData.monthName}.
                </div>
              ) : (
                currentMonthBySeksi.map((group) => {
                  const isOpen = Boolean(expandedSeksis[group.seksiName]);

                  return (
                    <div
                      key={group.seksiName}
                      className={`rounded-xl border transition-all overflow-hidden ${
                        isOpen
                          ? 'border-indigo-300 bg-white shadow-xs ring-1 ring-indigo-200'
                          : 'border-slate-200 bg-white hover:border-indigo-200 shadow-2xs'
                      }`}
                    >
                      {/* HEADER KARTU SEKSI (KLIK UNTUK BUKA / TUTUP DETAIL) */}
                      <button
                        type="button"
                        onClick={() => toggleSeksi(group.seksiName)}
                        className={`w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                          isOpen ? 'bg-indigo-50/70 border-b border-indigo-100' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-transform ${
                              isOpen ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isOpen ? 'rotate-0' : '-rotate-90'
                              }`}
                            />
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                                {group.seksiName}
                              </h5>
                              <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-bold bg-indigo-100 text-indigo-800 shrink-0">
                                {group.programs.length} Proker
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium block">
                              {isOpen ? 'Klik untuk menutup rincian' : 'Klik untuk melihat rincian kegiatan'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <span className="text-xs sm:text-sm font-black text-indigo-700 block">
                            {formatRupiah(group.totalDanaSeksi)}
                          </span>
                          <span className="text-[9.5px] text-indigo-600 font-bold">
                            {isOpen ? 'Tutup Detail ▲' : 'Buka Detail ▼'}
                          </span>
                        </div>
                      </button>

                      {/* RINCIAN DETAIL KEGIATAN PROKER SEKSI (HANYA DITAMPILKAN JIKA DIBUKA) */}
                      {isOpen && (
                        <div className="divide-y divide-slate-100 bg-white animate-in slide-in-from-top-1 duration-150">
                          {group.programs.map(({ program, alokasiDanaBulanIni }) => {
                            const katInfo = getKategoriProgramInfo(program.kategoriProgram);
                            const noteBln = program.catatanBulanan?.[activeMonth];
                            return (
                              <div
                                key={program.id}
                                onClick={() => setSelectedDetailProgram(program)}
                                className="p-3 flex items-start justify-between gap-2.5 hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                      {program.tahun}
                                    </span>
                                    <span
                                      className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${katInfo.badge}`}
                                    >
                                      <span>{katInfo.iconEmoji}</span>
                                      <span>{katInfo.label}</span>
                                    </span>
                                    {program.catatanRevisiAnggaran?.perluRevisi && (
                                      <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white inline-flex items-center gap-1">
                                        ⚠️ Perlu Revisi
                                      </span>
                                    )}
                                    <h6 className="text-xs font-bold text-slate-900 group-hover:text-indigo-900 truncate">
                                      {program.namaProgram}
                                    </h6>
                                  </div>

                                  <p className="text-[10.5px] text-slate-500 mt-1">
                                    PJ: <strong className="text-slate-700">{program.penanggungjawab?.nama || '-'}</strong>
                                    {program.tanggalSpesifik ? ` · ${program.tanggalSpesifik}` : ''}
                                  </p>

                                  {program.catatanRevisiAnggaran?.perluRevisi && program.catatanRevisiAnggaran.catatan && (
                                    <div className="mt-1.5 text-[10px] px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                                      <span className="font-black">⚠️ Catatan Revisi: </span>
                                      <span>{program.catatanRevisiAnggaran.catatan}</span>
                                    </div>
                                  )}

                                  {noteBln && (
                                    <div className="mt-1.5 text-[10px] px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-medium inline-flex items-center gap-1">
                                      <span className="font-bold">📝 Note {currentMonthData.monthName}:</span>
                                      <span>{noteBln}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                                  <div className="text-right">
                                    <span className="text-[9.5px] text-slate-400 block font-medium uppercase">
                                      Alokasi Bln Ini
                                    </span>
                                    <span className="text-xs font-black text-indigo-700">
                                      {formatRupiah(alokasiDanaBulanIni)}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setProgramToEditByAdmin(program);
                                    }}
                                    className="px-2 py-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs border border-emerald-200"
                                    title="Edit atau Jadwalkan Ulang Program Ini"
                                  >
                                    <span>✏️ Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDetailProgram(program);
                                    }}
                                    className="px-2 py-1 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="Lihat Detail Program Kerja"
                                  >
                                    <span>Detail</span>
                                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* FOOTER KEMBALI KE RINGKASAN SEKSI */}
                          <div className="px-3 py-1.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-medium">
                              {group.programs.length} program kerja berjalan di bulan {currentMonthData.monthName}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleSeksi(group.seksiName)}
                              className="text-indigo-700 hover:text-indigo-900 font-bold hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <span>Kembali ke Semula (Tutup Rincian {group.seksiName})</span>
                              <span>▲</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
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
                <th className="py-2.5 px-3 text-right">Rencana Penerimaan (Total)</th>
                <th className="py-2.5 px-3 text-right text-emerald-800">
                  <span>Bisa Dipakai Proker</span>
                  <span className="block text-[9px] font-normal normal-case text-slate-500">
                    50% Kol I + Khusus + Seksi
                  </span>
                </th>
                <th className="py-2.5 px-3 text-right text-indigo-800">Rencana Anggaran (Proker)</th>
                <th className="py-2.5 px-3 text-right">Realisasi Penerimaan</th>
                <th className="py-2.5 px-3 text-right text-indigo-700">Realisasi Penggunaan</th>
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
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      {formatRupiah(m.totalRencanaPenerimaan)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                      {formatRupiah(m.danaBisaDipakaiProker)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-indigo-700">
                      {formatRupiah(m.totalDana)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-700">
                      {formatRupiah(m.totalRealisasiPenerimaan)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-900">
                      {formatRupiah(m.totalPenggunaanRiil)}
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
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setActiveMonth(m.monthNum)}
                          className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isSelected ? 'Aktif' : 'Cek'}
                        </button>
                        {m.count > 0 && (
                          <button
                            type="button"
                            onClick={() => openReviewMonth(m.monthNum)}
                            className={`px-2 py-1 rounded-lg text-[10.5px] font-black transition-colors cursor-pointer ${
                              (!isSurplus || m.selisihProker < 0)
                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                            }`}
                            title={`Review Detail Program Bulan ${m.monthName}`}
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                <td className="py-3 px-3">TOTAL 12 BULAN</td>
                <td className="py-3 px-3 text-right text-slate-900 text-xs font-black">
                  {formatRupiah(monthlyData.grandTotalRencanaPenerimaan)}
                </td>
                <td className="py-3 px-3 text-right text-emerald-800 text-xs font-black">
                  {formatRupiah(monthlyData.grandTotalDanaBisaDipakaiProker)}
                </td>
                <td className="py-3 px-3 text-right text-indigo-800 text-xs font-black">
                  {formatRupiah(monthlyData.grandTotalAnggaran)}
                </td>
                <td className="py-3 px-3 text-right text-slate-800 text-xs">
                  {formatRupiah(monthlyData.grandTotalRealisasiPenerimaan)}
                </td>
                <td className="py-3 px-3 text-right text-indigo-900 text-xs">
                  {formatRupiah(monthlyData.grandTotalPenggunaanRiil)}
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
                <td colSpan={2} className="py-3 px-3 text-center text-slate-600 text-[11px] font-bold">
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
        </>
      )}

      {/* MODAL INPUT RENCANA & REALISASI PENERIMAAN KAS */}
      {onSavePenerimaan && (
        <PenerimaanFormModal
          isOpen={isPenerimaanModalOpen}
          onClose={() => {
            setIsPenerimaanModalOpen(false);
            setEditingPenerimaanItem(null);
          }}
          onSave={async (item) => {
            await onSavePenerimaan(item);
            setEditingPenerimaanItem(null);
            setIsPenerimaanModalOpen(false);
          }}
          initialData={editingPenerimaanItem}
          defaultTahun={selectedYear !== 'all' ? selectedYear : 2026}
          defaultBulan={activeMonth}
          defaultMinggu={1}
          programsList={programs}
          authSession={authSession}
          defaultSeksiTarget={penerimaanModalSeksi}
        />
      )}

      {/* MODAL DETAIL PROGRAM DENGAN MENU BACK / KEMBALI KE TABEL */}
      {selectedDetailProgram && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* HEADER DENGAN TOMBOL BACK PROMINENT */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDetailProgram(null)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>← Kembali ke Dashboard Penggunaan Dana &amp; Penerimaan</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDetailProgram(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Tutup Detail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* BODY DETAIL PROGRAM */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Title, Year, Category */}
              <div className="space-y-1.5 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-900">
                    Tahun {selectedDetailProgram.tahun}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-800">
                    {selectedDetailProgram.penanggungjawab?.divisi || 'Seksi'}
                  </span>
                  {(() => {
                    const kInfo = getKategoriProgramInfo(selectedDetailProgram.kategoriProgram);
                    return (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-flex items-center gap-1 ${kInfo.badge}`}>
                        <span>{kInfo.iconEmoji}</span>
                        <span>{kInfo.label}</span>
                      </span>
                    );
                  })()}
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${getStatusInfo(selectedDetailProgram.status).color}`}>
                    {getStatusInfo(selectedDetailProgram.status).label}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {selectedDetailProgram.namaProgram}
                </h3>
              </div>

              {/* Anggaran Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Total Estimasi Anggaran:
                  </span>
                  <span className="text-sm sm:text-base font-black text-slate-900">
                    {formatRupiah(selectedDetailProgram.estimasiAnggaran)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase block">
                    Alokasi Kas Bulan {currentMonthData.monthName}:
                  </span>
                  <span className="text-sm sm:text-base font-black text-indigo-700">
                    {formatRupiah(getAlokasiBudgetBulanan(selectedDetailProgram, activeMonth))}
                  </span>
                </div>
              </div>

              {/* Jadwal Pelaksanaan */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase block flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Jadwal Pelaksanaan:</span>
                </span>
                <p className="text-xs font-semibold text-slate-800">
                  Bulan Pelaksanaan:{' '}
                  {selectedDetailProgram.bulanPelaksanaan && selectedDetailProgram.bulanPelaksanaan.length > 0
                    ? selectedDetailProgram.bulanPelaksanaan.map((b) => BULAN_LIST[b - 1]?.nama).join(', ')
                    : selectedDetailProgram.tipeJadwal === 'akan_ditentukan'
                    ? 'Akan Ditentukan Kemudian'
                    : '-'}
                </p>
                {selectedDetailProgram.tanggalSpesifik && (
                  <p className="text-[11px] text-slate-600">
                    Rencana Tanggal: <strong>{selectedDetailProgram.tanggalSpesifik}</strong>
                  </p>
                )}
              </div>

              {/* Catatan Khusus Per Bulan jika ada */}
              {selectedDetailProgram.catatanBulanan && Object.keys(selectedDetailProgram.catatanBulanan).length > 0 && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5">
                  <span className="text-[10.5px] font-black text-amber-900 uppercase block flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    <span>Catatan Khusus Pelaksanaan Per Bulan:</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {Object.entries(selectedDetailProgram.catatanBulanan).map(([mNum, note]) => (
                      note ? (
                        <div key={mNum} className="p-2 bg-white rounded-lg border border-amber-200 text-[11px]">
                          <strong className="text-amber-950 font-bold block">
                            Bulan {BULAN_LIST[Number(mNum) - 1]?.nama}:
                          </strong>
                          <span className="text-slate-800">{note}</span>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>
              )}

              {/* Tujuan & Target Sasaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Tujuan Pastoral:</span>
                  <p className="text-slate-800 font-medium leading-relaxed">
                    {selectedDetailProgram.tujuanKegiatan || 'Belum diisi'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Target Sasaran / Output:</span>
                  <p className="text-slate-800 font-medium leading-relaxed">
                    {selectedDetailProgram.targetSasaran || 'Belum diisi'}
                  </p>
                </div>
              </div>

              {/* Penanggung Jawab */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Penanggung Jawab (PIC):</span>
                <div className="flex flex-wrap items-center gap-4 text-slate-800">
                  <span>👤 <strong>{selectedDetailProgram.penanggungjawab?.nama || '-'}</strong> ({selectedDetailProgram.penanggungjawab?.divisi || 'Seksi'})</span>
                  {selectedDetailProgram.penanggungjawab?.kontak && (
                    <span>📞 <strong>{selectedDetailProgram.penanggungjawab.kontak}</strong></span>
                  )}
                </div>
              </div>

              {/* Catatan Revisi Anggaran jika ada */}
              {selectedDetailProgram.catatanRevisiAnggaran?.perluRevisi && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-1">
                  <span className="text-[10.5px] font-black text-rose-900 uppercase block flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Catatan Revisi Anggaran ({selectedDetailProgram.catatanRevisiAnggaran.ditujukanKepada || 'Seksi'}):</span>
                  </span>
                  <p className="text-rose-950 font-semibold whitespace-pre-line">
                    {selectedDetailProgram.catatanRevisiAnggaran.catatan}
                  </p>
                  {selectedDetailProgram.catatanRevisiAnggaran.rekomendasiAnggaran && (
                    <p className="text-[11px] font-black text-amber-900">
                      Rekomendasi Pagu: {formatRupiah(selectedDetailProgram.catatanRevisiAnggaran.rekomendasiAnggaran)}
                    </p>
                  )}
                </div>
              )}

              {/* Solusi / Tindak Lanjut Kendala jika ada */}
              {selectedDetailProgram.tindakLanjutKendala && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-purple-900 uppercase block">Antisipasi Solusi / Tindak Lanjut:</span>
                  <p className="text-purple-950 whitespace-pre-line font-medium">
                    {selectedDetailProgram.tindakLanjutKendala}
                  </p>
                </div>
              )}
            </div>

            {/* FOOTER ACTIONS DENGAN MENU BACK & EDIT/REVISI */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDetailProgram(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Kembali ke Dashboard Penggunaan Dana &amp; Penerimaan</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const prog = selectedDetailProgram;
                    const targetM = prog.bulanPelaksanaan?.includes(activeMonth)
                      ? activeMonth
                      : prog.bulanPelaksanaan?.[0] || activeMonth;
                    setSelectedDetailProgram(null);
                    openReviewMonth(targetM, prog);
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Tujukan Untuk Revisi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const prog = selectedDetailProgram;
                    setSelectedDetailProgram(null);
                    setProgramToEditByAdmin(prog);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <span>✏️ Edit &amp; Jadwalkan Ulang</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const id = selectedDetailProgram.id;
                    setSelectedDetailProgram(null);
                    onOpenProgramDetail(id);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Buka di Formulir Edit Program"
                >
                  <span>Formulir Lengkap</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOKUS KHUSUS EDIT & JADWALKAN ULANG PROGRAM (HANYA PROGRAM TERPILIH) */}
      {programToEditByAdmin && (
        <AdminProgramEditorModal
          isOpen={Boolean(programToEditByAdmin)}
          program={programToEditByAdmin}
          onClose={() => setProgramToEditByAdmin(null)}
          onSave={(updated) => {
            if (onSaveProgram) {
              onSaveProgram(updated);
            }
            setProgramToEditByAdmin(null);
          }}
          authSession={authSession}
        />
      )}

      {/* MODAL REALISASI & PENGGUNAAN DANA UMAT PSE */}
      {isPseDisbursementOpen && (
        <PseRealisasiPenggunaanModal
          isOpen={isPseDisbursementOpen}
          onClose={() => {
            setIsPseDisbursementOpen(false);
            setSelectedPseDisbursementProgram(null);
          }}
          psePrograms={pseMonthlyData.psePrograms}
          selectedProgram={selectedPseDisbursementProgram}
          defaultMonth={activeMonth}
          onSaveEvaluasi={(programId, evaluasiData, targetBulan) => {
            const prog = programs.find((p) => p.id === programId);
            let savedUpdatedProg: ProgramKerja | undefined;
            if (prog && onSaveProgram) {
              const monthKey = String(targetBulan || activeMonth);
              const updatedEvaluasiBulanan = {
                ...(prog.evaluasiBulanan || {}),
                [monthKey]: evaluasiData,
              };
              const isBerulang =
                prog.tipeJadwal === 'sepanjang_tahun' ||
                prog.tipeJadwal === 'multi_bulan' ||
                isProgramBerulang(prog) ||
                (Array.isArray(prog.bulanPelaksanaan) && prog.bulanPelaksanaan.length > 1);
              let masterEvaluasi = evaluasiData;
              if (isBerulang) {
                const summary = getProgramExecutionSummary({
                  ...prog,
                  evaluasi: evaluasiData,
                  evaluasiBulanan: updatedEvaluasiBulanan,
                });
                masterEvaluasi = {
                  ...evaluasiData,
                  statusKeterlaksanaan:
                    summary.overallStatus === 'terlaksana_penuh'
                      ? 'terlaksana'
                      : summary.overallStatus === 'terlaksana_sebagian'
                      ? 'terlaksana_sebagian'
                      : summary.overallStatus === 'tidak_terlaksana'
                      ? 'tidak_terlaksana'
                      : summary.overallStatus === 'perubahan_waktu'
                      ? 'perubahan_waktu'
                      : 'belum_terlaksana',
                  alasanTidakTerlaksana: summary.catatanBulanTidakTerlaksana || undefined,
                  rincianTidakTerlaksana:
                    summary.rincianTidakTerlaksana.length > 0 ? summary.rincianTidakTerlaksana : undefined,
                };
              }
              const updatedProg: ProgramKerja = {
                ...prog,
                evaluasi: masterEvaluasi,
                evaluasiBulanan: updatedEvaluasiBulanan,
                status: !isBerulang && evaluasiData.statusKeterlaksanaan === 'terlaksana' ? 'selesai' : prog.status,
              };
              savedUpdatedProg = updatedProg;
              onSaveProgram(updatedProg);
            }
            if (onOpenEvaluasi && (savedUpdatedProg || prog)) {
              onOpenEvaluasi(savedUpdatedProg || prog!, targetBulan || activeMonth);
            }
            setIsPseDisbursementOpen(false);
            setSelectedPseDisbursementProgram(null);
          }}
        />
      )}
    </div>
  );
};
