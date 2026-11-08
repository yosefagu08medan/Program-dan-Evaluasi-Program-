import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Calendar,
  Layers,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Edit,
  Trash2,
  DollarSign,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Building,
  Target,
  ArrowRight,
  AlertTriangle,
  X,
  Lock,
  ShieldCheck,
  Star,
  Users,
  Coins,
  Scale,
  Hammer,
  Heart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  PenerimaanMingguan,
  KategoriPenerimaan,
  KATEGORI_PENERIMAAN_LIST,
  getKategoriMeta,
  TipeSumberPenerimaan,
  isSeksiTetap,
  isDpphOrAdmin,
  calculateKolekte1Split,
} from '../types/penerimaan';
import { ProgramKerja } from '../types/proker';
import { AuthSession } from '../types/auth';
import {
  BULAN_LIST,
  formatRupiah,
  formatCompactRupiah,
  formatIndonesianDate,
  getSundaysInMonth,
  HARI_KHUSUS_PRESETS,
  getAlokasiBudgetBulanan,
  isProgramAktifDiBulan,
} from '../utils/formatters';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';
import { PenerimaanFormModal } from './PenerimaanFormModal';
import { MonthlyKolekteMatrix } from './MonthlyKolekteMatrix';

interface PenerimaanMingguanViewProps {
  penerimaanList: PenerimaanMingguan[];
  programsList: ProgramKerja[];
  authSession: AuthSession | null;
  onSavePenerimaan: (item: PenerimaanMingguan) => Promise<void>;
  onDeletePenerimaan: (id: string) => Promise<void>;
  onResetPenerimaan: () => Promise<void>;
  onNavigateToProker?: () => void;
  onPromptUnlockUnit?: (unitId: string, unitNama: string) => void;
  initialModeFocus?: 'all' | 'rencana' | 'realisasi';
}

export const PenerimaanMingguanView: React.FC<PenerimaanMingguanViewProps> = ({
  penerimaanList,
  programsList,
  authSession,
  onSavePenerimaan,
  onDeletePenerimaan,
  onResetPenerimaan,
  onNavigateToProker,
  onPromptUnlockUnit,
  initialModeFocus = 'all',
}) => {
  // Authorization checks
  const isBendahara = authSession?.role === 'bendahara';
  const isPastorParoki = authSession?.role === 'pastor_paroki';
  const isSemuaSeksi = authSession?.role === 'semua_seksi';
  const isDpph = isPastorParoki || isSemuaSeksi || authSession?.unitId === 'div-dpph';
  const isAuthorizedGlobal = isDpph || isBendahara;
  const isSeksiPSE = authSession?.unitNama === 'Seksi PSE' || authSession?.unitId === 'div-pse';
  const isOtherSeksi = authSession?.role === 'seksi' && !isSeksiPSE && !isDpph;
  const isSeksiUser = authSession?.role === 'seksi' && !isDpph;

  // Filter States
  const [selectedTahun, setSelectedTahun] = useState<number | 'all'>(2026);
  const [selectedBulan, setSelectedBulan] = useState<number | 'all'>(1); // Default Januari
  const [selectedMinggu, setSelectedMinggu] = useState<number | 'all'>('all'); // 1-5 atau all
  const [selectedKategori, setSelectedKategori] = useState<KategoriPenerimaan | 'all'>('all');
  const [selectedSeksi, setSelectedSeksi] = useState<string | 'all'>(() => {
    if (isSeksiUser && authSession) {
      return authSession.unitNama;
    }
    return 'all';
  });
  const effectiveSeksiFilter = isSeksiUser && authSession?.unitNama ? authSession.unitNama : selectedSeksi;
  const [tipeSumberFilter, setTipeSumberFilter] = useState<'all' | 'paroki' | 'seksi_tetap' | 'seksi_tentatif'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isTentatifModalMode, setIsTentatifModalMode] = useState<boolean>(false);
  const [targetSeksiForModal, setTargetSeksiForModal] = useState<string>('Umum Paroki');
  const [editingItem, setEditingItem] = useState<PenerimaanMingguan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [defaultMingguForAdd, setDefaultMingguForAdd] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [defaultKategoriForModal, setDefaultKategoriForModal] = useState<KategoriPenerimaan | undefined>(undefined);
  const [defaultNamaForModal, setDefaultNamaForModal] = useState<string | undefined>(undefined);
  const [defaultRancanganForModal, setDefaultRancanganForModal] = useState<number | undefined>(undefined);
  const [defaultRealisasiForModal, setDefaultRealisasiForModal] = useState<number | undefined>(undefined);
  const [showPolicyDetail, setShowPolicyDetail] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>(isSeksiPSE ? 'cards' : 'matrix');

  useEffect(() => {
    if (isSeksiPSE) {
      setViewMode('cards');
      setSelectedSeksi('Seksi PSE');
    }
  }, [isSeksiPSE]);

  // Filtered Penerimaan Data
  const filteredList = useMemo(() => {
    return penerimaanList.filter((item) => {
      // Khusus login PSE: HANYA menampilkan rencana penerimaan dari PSE, KOLEKTE TIDAK PERLU DITAMPILKAN
      if (isSeksiPSE) {
        const isPseItem =
          item.alokasiSeksi === 'Seksi PSE' ||
          (item.namaPenerimaan && item.namaPenerimaan.toLowerCase().includes('pse'));
        const isKolekte =
          item.kategori === 'kolekte_1' ||
          item.kategori === 'kolekte_2' ||
          item.kategori === 'kolekte_khusus';
        if (!isPseItem || isKolekte) {
          return false;
        }
      }

      // Role-based visibility:
      // Seksi non-DPPH hanya dapat melihat penerimaan yang dialokasikan ke seksi mereka
      if (isSeksiUser && authSession?.unitNama && item.alokasiSeksi !== authSession.unitNama) {
        return false;
      }

      // Filter tipe sumber (paroki vs seksi tetap vs seksi tentatif)
      if (tipeSumberFilter !== 'all') {
        const itemTipe: TipeSumberPenerimaan =
          item.tipeSumber ||
          (item.alokasiSeksi === 'Umum Paroki'
            ? 'paroki'
            : isSeksiTetap(item.alokasiSeksi)
            ? 'seksi_tetap'
            : 'seksi_tentatif');
        if (itemTipe !== tipeSumberFilter) return false;
      }

      if (selectedTahun !== 'all' && item.tahun !== selectedTahun) return false;
      if (selectedBulan !== 'all' && item.bulan !== selectedBulan) return false;
      if (selectedMinggu !== 'all' && item.mingguKe !== selectedMinggu) return false;
      if (selectedKategori !== 'all' && item.kategori !== selectedKategori) return false;

      // Seksi filter:
      // Penerimaan utk Seksi TIDAK ditampilkan secara global, hanya ditampilkan pada saat lihat seksi yang bersangkutan
      const effectiveSeksiFilter = isSeksiUser ? authSession.unitNama : selectedSeksi;
      if (effectiveSeksiFilter === 'all') {
        const isParokiLevel =
          item.alokasiSeksi === 'Umum Paroki' ||
          item.tipeSumber === 'paroki' ||
          item.kategori === 'kolekte_1' ||
          item.kategori === 'kolekte_2' ||
          item.kategori === 'kolekte_khusus';
        if (!isParokiLevel) return false;
      } else {
        if (item.alokasiSeksi !== effectiveSeksiFilter) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.namaPenerimaan?.toLowerCase().includes(q);
        const matchKet = item.keterangan?.toLowerCase().includes(q);
        const matchSeksi = item.alokasiSeksi?.toLowerCase().includes(q);
        const matchProker = item.namaProgramTerkait?.toLowerCase().includes(q);
        if (!matchName && !matchKet && !matchSeksi && !matchProker) return false;
      }
      return true;
    });
  }, [
    penerimaanList,
    isSeksiUser,
    authSession,
    tipeSumberFilter,
    selectedTahun,
    selectedBulan,
    selectedMinggu,
    selectedKategori,
    selectedSeksi,
    searchQuery,
  ]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalRancangan = filteredList.reduce((sum, item) => sum + (item.rancangan || 0), 0);
    const totalRealisasi = filteredList.reduce((sum, item) => sum + (item.realisasi || 0), 0);
    const selisih = totalRealisasi - totalRancangan;
    const persentaseCapaian = totalRancangan > 0 ? Math.round((totalRealisasi / totalRancangan) * 100) : 0;

    // Filter program kerja pada periode yang relevan untuk perbandingan daya dukung kas
    const relevantPrograms = programsList.filter((p) => {
      if (selectedTahun !== 'all' && p.tahun !== selectedTahun) return false;
      if (selectedBulan !== 'all' && !isProgramAktifDiBulan(p, selectedBulan as number)) {
        return false;
      }
      if (isSeksiUser && p.penanggungjawab?.divisi !== authSession?.unitNama) {
        return false;
      }
      if (selectedSeksi !== 'all' && p.penanggungjawab?.divisi !== selectedSeksi) {
        return false;
      }
      return true;
    });

    // Hitung alokasi dana program kerja di periode ini:
    // Program yang dilaksanakan 'sepanjang_tahun' dibagi rata tiap bulannya (dibagi 12)
    const totalKebutuhanProker = relevantPrograms.reduce((sum, p) => {
      if (selectedBulan === 'all') {
        return sum + (p.estimasiAnggaran || 0);
      }
      return sum + getAlokasiBudgetBulanan(p, selectedBulan as number);
    }, 0);

    const rasioDayaDukung = totalKebutuhanProker > 0 ? Math.round((totalRealisasi / totalKebutuhanProker) * 100) : 100;
    const surplusKasBersih = totalRealisasi - totalKebutuhanProker;

    // 1. Pemisahan Kolekte I (50% Solidaritas & 50% Operasional/Proker Seksi)
    const kolekte1Items = filteredList.filter((i) => i.kategori === 'kolekte_1');
    const kolekte1Rancangan = kolekte1Items.reduce((sum, i) => sum + (i.rancangan || 0), 0);
    const kolekte1Realisasi = kolekte1Items.reduce((sum, i) => sum + (i.realisasi || 0), 0);
    const kolekte1Split = calculateKolekte1Split(kolekte1Realisasi);

    // 2. Kolekte II (Dicatat Khusus Sebagai Dana Pembangunan)
    const kolekte2Items = filteredList.filter((i) => i.kategori === 'kolekte_2');
    const kolekte2Rancangan = kolekte2Items.reduce((sum, i) => sum + (i.rancangan || 0), 0);
    const kolekte2Realisasi = kolekte2Items.reduce((sum, i) => sum + (i.realisasi || 0), 0);
    const pembangunanProgs = relevantPrograms.filter((p) => {
      const d = (p.penanggungjawab?.divisi || '').toLowerCase();
      const n = (p.namaProgram || '').toLowerCase();
      return (
        d.includes('sarana') ||
        d.includes('aset') ||
        n.includes('pembangunan') ||
        n.includes('renovasi') ||
        n.includes('gedung')
      );
    });
    const totalPenggunaanPembangunan = pembangunanProgs.reduce((sum, p) => {
      if (selectedBulan === 'all') return sum + (p.estimasiAnggaran || 0);
      return sum + getAlokasiBudgetBulanan(p, selectedBulan as number);
    }, 0);
    const saldoTersimpanPembangunan = Math.max(0, kolekte2Realisasi - totalPenggunaanPembangunan);

    // 3. Seksi PSE (Rancangan Rencana Penerimaan & Realisasi)
    const pseItems = filteredList.filter(
      (i) =>
        i.alokasiSeksi === 'Seksi PSE' ||
        (i.namaPenerimaan && i.namaPenerimaan.toLowerCase().includes('pse'))
    );
    const pseRancangan = pseItems.reduce((sum, i) => sum + (i.rancangan || 0), 0);
    const pseRealisasi = pseItems.reduce((sum, i) => sum + (i.realisasi || 0), 0);
    const psePersen = pseRancangan > 0 ? Math.round((pseRealisasi / pseRancangan) * 100) : 0;

    // 3. Kolekte Khusus (Hari Raya / Liturgi)
    const kolekteKhususItems = filteredList.filter((i) => i.kategori === 'kolekte_khusus');
    const kolekteKhususRancangan = kolekteKhususItems.reduce((sum, i) => sum + (i.rancangan || 0), 0);
    const kolekteKhususRealisasi = kolekteKhususItems.reduce((sum, i) => sum + (i.realisasi || 0), 0);

    return {
      totalRancangan,
      totalRealisasi,
      selisih,
      persentaseCapaian,
      totalKebutuhanProker,
      rasioDayaDukung,
      surplusKasBersih,
      countItems: filteredList.length,
      kolekte1Stats: {
        rancangan: kolekte1Rancangan,
        realisasi: kolekte1Realisasi,
        danaSolidaritas: kolekte1Split.danaSolidaritas,
        danaOperasionalDanProker: kolekte1Split.danaOperasionalDanProker,
        count: kolekte1Items.length,
      },
      kolekte2Stats: {
        rancangan: kolekte2Rancangan,
        realisasi: kolekte2Realisasi,
        penggunaan: totalPenggunaanPembangunan,
        saldoTersimpan: saldoTersimpanPembangunan,
        count: kolekte2Items.length,
      },
      kolekteKhususStats: {
        rancangan: kolekteKhususRancangan,
        realisasi: kolekteKhususRealisasi,
        count: kolekteKhususItems.length,
      },
      pseStats: {
        rancangan: pseRancangan,
        realisasi: pseRealisasi,
        persen: psePersen,
        count: pseItems.length,
      },
    };
  }, [filteredList, programsList, selectedTahun, selectedBulan, selectedSeksi, isSeksiUser, authSession]);

  // Group items by Minggu (1, 2, 3, 4, 5)
  const groupedByWeek = useMemo(() => {
    const weeks: Record<number, PenerimaanMingguan[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    filteredList.forEach((item) => {
      const w = item.mingguKe || 1;
      if (!weeks[w]) weeks[w] = [];
      weeks[w].push(item);
    });

    const activeWeeks =
      selectedBulan === 'all'
        ? [1, 2, 3, 4, 5]
        : Array.from(
            {
              length: getSundaysInMonth(
                selectedTahun !== 'all' ? selectedTahun : 2026,
                selectedBulan as number
              ).length,
            },
            (_, i) => (i + 1) as 1 | 2 | 3 | 4 | 5
          );

    return activeWeeks.map((w) => {
      const items = weeks[w] || [];
      const subRancangan = items.reduce((sum, i) => sum + (i.rancangan || 0), 0);
      const subRealisasi = items.reduce((sum, i) => sum + (i.realisasi || 0), 0);
      const subSelisih = subRealisasi - subRancangan;
      const subPersen = subRancangan > 0 ? Math.round((subRealisasi / subRancangan) * 100) : 0;
      return {
        mingguKe: w,
        items,
        subRancangan,
        subRealisasi,
        subSelisih,
        subPersen,
      };
    });
  }, [filteredList, selectedTahun, selectedBulan]);

  // Handle open add modal (Paroki / Bendahara)
  const handleOpenAddParoki = (mingguKe?: 1 | 2 | 3 | 4 | 5) => {
    setEditingItem(null);
    setDefaultKategoriForModal('kolekte_1');
    setDefaultNamaForModal('Penerimaan Kas Paroki');
    setDefaultRancanganForModal(10000000);
    setDefaultRealisasiForModal(0);
    setIsTentatifModalMode(false);
    setTargetSeksiForModal('Umum Paroki');
    setDefaultMingguForAdd(mingguKe || (selectedMinggu !== 'all' ? (selectedMinggu as 1 | 2 | 3 | 4 | 5) : 1));
    setIsModalOpen(true);
  };

  // Handle open add modal for Kolekte I (50:50 Misa Mingguan)
  const handleOpenAddKolekte1 = (mingguKe?: 1 | 2 | 3 | 4 | 5) => {
    const targetMinggu = mingguKe || (selectedMinggu !== 'all' ? (selectedMinggu as 1 | 2 | 3 | 4 | 5) : 1);
    setEditingItem(null);
    setDefaultKategoriForModal('kolekte_1');
    setDefaultNamaForModal('Kolekte I Misa Mingguan (50% Solidaritas & 50% Operasional/Proker)');
    setDefaultRancanganForModal(12000000);
    setDefaultRealisasiForModal(0);
    setIsTentatifModalMode(false);
    setTargetSeksiForModal('Umum Paroki');
    setDefaultMingguForAdd(targetMinggu);
    setIsModalOpen(true);
  };

  // Handle open add modal for Kolekte II (Dana Pembangunan)
  const handleOpenAddKolekte2 = (mingguKe?: 1 | 2 | 3 | 4 | 5) => {
    const targetMinggu = mingguKe || (selectedMinggu !== 'all' ? (selectedMinggu as 1 | 2 | 3 | 4 | 5) : 1);
    setEditingItem(null);
    setDefaultKategoriForModal('kolekte_2');
    setDefaultNamaForModal('Kolekte II Misa Mingguan (Dana Pembangunan Tersimpan)');
    setDefaultRancanganForModal(10000000);
    setDefaultRealisasiForModal(0);
    setIsTentatifModalMode(false);
    setTargetSeksiForModal('Umum Paroki');
    setDefaultMingguForAdd(targetMinggu);
    setIsModalOpen(true);
  };

  // Handle open add modal for Kolekte Khusus (Misa Hari Raya / Liturgi)
  const handleOpenAddKolekteKhusus = (mingguKe?: 1 | 2 | 3 | 4 | 5) => {
    const targetMinggu = mingguKe || (selectedMinggu !== 'all' ? (selectedMinggu as 1 | 2 | 3 | 4 | 5) : 1);
    setEditingItem(null);
    setDefaultKategoriForModal('kolekte_khusus');
    setDefaultNamaForModal('Kolekte Khusus Misa Hari Raya / Liturgi');
    setDefaultRancanganForModal(8000000);
    setDefaultRealisasiForModal(0);
    setIsTentatifModalMode(false);
    setTargetSeksiForModal('Umum Paroki');
    setDefaultMingguForAdd(targetMinggu);
    setIsModalOpen(true);
  };

  // Handle open add modal for Seksi PSE
  const handleOpenAddPSE = (mingguKe?: 1 | 2 | 3 | 4 | 5) => {
    const targetMinggu = mingguKe || (selectedMinggu !== 'all' ? (selectedMinggu as 1 | 2 | 3 | 4 | 5) : 1);
    setEditingItem(null);
    setDefaultKategoriForModal('persembahan_umat');
    setDefaultNamaForModal('Dana Solidaritas Umat');
    setDefaultRancanganForModal(5000000);
    setDefaultRealisasiForModal(0);
    setIsTentatifModalMode(false);
    setTargetSeksiForModal('Seksi PSE');
    setDefaultMingguForAdd(targetMinggu);
    setIsModalOpen(true);
  };

  // Handle open add modal for Tentatif Seksi
  const handleOpenAddTentatifSeksi = (seksiTargetName?: string, mingguKe?: 1 | 2 | 3 | 4 | 5) => {
    const target =
      seksiTargetName ||
      (isSeksiUser && authSession
        ? authSession.unitNama
        : selectedSeksi !== 'all' && selectedSeksi !== 'Umum Paroki'
        ? selectedSeksi
        : 'Seksi Kepemudaan');
    setEditingItem(null);
    setDefaultKategoriForModal('usaha_dana_seksi');
    setDefaultNamaForModal(`Penerimaan Kas Tentatif ${target}`);
    setDefaultRancanganForModal(3000000);
    setDefaultRealisasiForModal(0);
    setIsTentatifModalMode(true);
    setTargetSeksiForModal(target);
    setDefaultMingguForAdd(mingguKe || (selectedMinggu !== 'all' ? (selectedMinggu as 1 | 2 | 3 | 4 | 5) : 1));
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (item: PenerimaanMingguan) => {
    setEditingItem(item);
    setDefaultKategoriForModal(undefined);
    setDefaultNamaForModal(undefined);
    setDefaultRancanganForModal(undefined);
    setDefaultRealisasiForModal(undefined);
    setIsTentatifModalMode(item.isTentatif || item.tipeSumber === 'seksi_tentatif');
    setTargetSeksiForModal(item.alokasiSeksi || 'Umum Paroki');
    setIsModalOpen(true);
  };

  // Handle confirm delete
  const handleDeleteConfirm = async () => {
    if (deletingId) {
      await onDeletePenerimaan(deletingId);
      setDeletingId(null);
    }
  };

  const getWeekDateRangeLabel = (minggu: number, blnNum: number | 'all', yr?: number | 'all') => {
    if (blnNum !== 'all') {
      const year = yr && yr !== 'all' ? yr : 2026;
      const sundays = getSundaysInMonth(year, blnNum);
      const sun = sundays[minggu - 1];
      if (sun) {
        return `Hari Minggu, ${sun.dayOfMonth} ${BULAN_LIST[blnNum - 1]?.nama} ${year}`;
      }
    }
    const blnName = blnNum !== 'all' ? BULAN_LIST[blnNum - 1]?.nama : 'Bulan';
    switch (minggu) {
      case 1:
        return `Tgl 1 - 7 ${blnName}`;
      case 2:
        return `Tgl 8 - 14 ${blnName}`;
      case 3:
        return `Tgl 15 - 21 ${blnName}`;
      case 4:
        return `Tgl 22 - 28 ${blnName}`;
      case 5:
        return `Tgl 29 - 31 ${blnName}`;
      default:
        return `Minggu ${minggu}`;
    }
  };

  // Sesuai instruksi: Rencana penerimaan kolekte & penggunaan dapat diakses oleh Pastor Paroki/Admin & Bendahara, serta Seksi PSE untuk dana sosial/dana umat
  const isAuthorizedKeuangan = authSession?.role === 'pastor_paroki' || authSession?.role === 'bendahara' || isSeksiPSE;

  if (!authSession || !isAuthorizedKeuangan) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 text-center space-y-4 max-w-md mx-auto shadow-sm my-12 animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center mx-auto shadow-md">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            Akses Khusus: Penerimaan Kas Paroki
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
            Data rencana dan realisasi penerimaan kas (Kolekte I, Kolekte II, dan Khusus) <strong>dapat diakses oleh login Pastor Paroki / Admin dan Bendahara Paroki</strong>.
          </p>
        </div>
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => onPromptUnlockUnit?.('bendahara', 'Bendahara Paroki')}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-emerald-200" />
            <span>💰 Masuk Sebagai Bendahara Paroki</span>
          </button>
          <button
            type="button"
            onClick={() => onPromptUnlockUnit?.('admin', 'Pastor Paroki / Administrator')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>👑 Masuk Sebagai Pastor Paroki / Admin</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8 animate-in fade-in duration-200">
      {/* 1. HERO HEADER COMPACT */}
      <div className={`rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-white shadow-sm border ${
        isSeksiPSE
          ? 'bg-gradient-to-r from-amber-800 via-orange-800 to-slate-900 border-amber-600/40'
          : 'bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 border-emerald-700/40'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Sisi Kiri: Judul, Role & Subtitle Singkat */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
              {isSeksiPSE ? 'Penerimaan Kas & Derma Kasih Seksi PSE' : 'Penerimaan Kolekte & Kas Paroki'}
            </h1>
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
              isSeksiPSE
                ? 'bg-amber-500/20 border border-amber-400/40 text-amber-200'
                : 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-200'
            }`}>
              <ShieldCheck className="w-3 h-3 text-amber-300" />
              {isBendahara ? (
                <span>Bendahara • Input Kolekte</span>
              ) : isSeksiPSE ? (
                <span>Seksi PSE • Dana Umat Mandiri</span>
              ) : isAuthorizedGlobal ? (
                <span>Pastor Paroki &amp; DPPH</span>
              ) : (
                <span>{authSession?.unitNama || 'Seksi'}</span>
              )}
            </div>
            <span className={`hidden xl:inline text-xs font-medium ${isSeksiPSE ? 'text-amber-200/90' : 'text-emerald-200/60'}`}>
              {isSeksiPSE
                ? '• Dana APP, Aksi Natal, Kotak Kasih & Donatur Sosial (Terpisah dari Kolekte Paroki)'
                : '• Kolekte I (50:50), Kolekte II (Pembangunan), PSE & Tentatif'}
            </span>
          </div>

          {/* Sisi Kanan: Action Buttons Compact */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {/* Tombol Utama: Input Rencana & Realisasi Penerimaan */}
            <button
              type="button"
              onClick={() => {
                if (isBendahara) {
                  handleOpenAddKolekte1();
                } else if (isSeksiPSE) {
                  handleOpenAddPSE();
                } else if (isOtherSeksi) {
                  handleOpenAddTentatifSeksi(authSession?.unitNama);
                } else {
                  handleOpenAddParoki();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ring-1 ring-white/50"
              title="Input Rencana Penerimaan & Realisasi Kas"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>{isSeksiPSE ? '+ Input Penerimaan PSE' : '+ Input Rencana'}</span>
            </button>

            {/* Tombol Khusus Bendahara: Kolekte I & II */}
            {isBendahara && (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenAddKolekte1()}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Input Kolekte I (50:50)"
                >
                  <Scale className="w-3 h-3 text-blue-200" />
                  <span>+ Kol I (50:50)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddKolekte2()}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Input Kolekte II (Pembangunan)"
                >
                  <Hammer className="w-3 h-3 text-emerald-200" />
                  <span>+ Kol II</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddKolekteKhusus()}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Input Kolekte Khusus"
                >
                  <Coins className="w-3 h-3 text-purple-200" />
                  <span>+ Khusus</span>
                </button>
              </>
            )}

            {/* Tombol DPPH / Pastor Paroki */}
            {isDpph && (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenAddKolekte1()}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white font-extrabold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Input Kolekte I (50:50)"
                >
                  <Scale className="w-3 h-3 text-blue-200" />
                  <span>+ Kol I</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddKolekte2()}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Input Kolekte II (Pembangunan)"
                >
                  <Hammer className="w-3 h-3 text-emerald-200" />
                  <span>+ Kol II</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddPSE()}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Input Seksi PSE"
                >
                  <Heart className="w-3 h-3 text-amber-950" />
                  <span>+ PSE</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddTentatifSeksi()}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white font-extrabold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Tambah pos penerimaan tentatif Seksi"
                >
                  <Sparkles className="w-3 h-3 text-purple-200" />
                  <span>+ Tentatif</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Apakah Anda yakin ingin memulihkan contoh data penerimaan mingguan awal?')) {
                      onResetPenerimaan();
                    }
                  }}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                  title="Reset Data Penerimaan ke Awal"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Tombol Seksi PSE */}
            {!isBendahara && isSeksiPSE && (
              <button
                type="button"
                onClick={() => handleOpenAddPSE()}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                title="Input Rencana & Realisasi Seksi PSE"
              >
                <Heart className="w-3 h-3 text-amber-950" />
                <span>+ Input PSE (APP/Natal/Derma)</span>
              </button>
            )}

            {/* Tombol Seksi Lainnya */}
            {!isBendahara && isOtherSeksi && (
              <button
                type="button"
                onClick={() => handleOpenAddTentatifSeksi(authSession?.unitNama)}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                title={`Tambah pos penerimaan untuk ${authSession?.unitNama}`}
              >
                <Sparkles className="w-3 h-3 text-purple-200" />
                <span>+ Input Penerimaan {authSession?.unitNama}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. FILTER CONTROLS & SEGMEN SUMBER KAS (COMPACT) */}
      <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200 shadow-2xs space-y-2">
        {/* Segmen Pilihan Sumber Penerimaan */}
        {isAuthorizedGlobal && (
          <div className="p-0.5 bg-slate-100 rounded-xl flex flex-wrap items-center gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setTipeSumberFilter('all')}
              className={`flex-1 py-1 px-2.5 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap ${
                tipeSumberFilter === 'all'
                  ? 'bg-white text-slate-900 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Kas (Paroki &amp; Seksi)
            </button>
            <button
              type="button"
              onClick={() => setTipeSumberFilter('paroki')}
              className={`flex-1 py-1 px-2.5 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap ${
                tipeSumberFilter === 'paroki'
                  ? 'bg-white text-blue-900 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏛️ Kas Paroki (Kolekte)
            </button>
            <button
              type="button"
              onClick={() => setTipeSumberFilter('seksi_tetap')}
              className={`flex-1 py-1 px-2.5 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap ${
                tipeSumberFilter === 'seksi_tetap'
                  ? 'bg-white text-amber-900 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⭐ Seksi Tetap (PSE &amp; KKI)
            </button>
            <button
              type="button"
              onClick={() => setTipeSumberFilter('seksi_tentatif')}
              className={`flex-1 py-1 px-2.5 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap ${
                tipeSumberFilter === 'seksi_tentatif'
                  ? 'bg-white text-purple-900 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚡ Seksi Tentatif
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Filter Tahun */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Tahun:
            </span>
            <div className="inline-flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedTahun(2026)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTahun === 2026
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2026
              </button>
              <button
                type="button"
                onClick={() => setSelectedTahun(2027)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTahun === 2027
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2027
              </button>
              <button
                type="button"
                onClick={() => setSelectedTahun('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTahun === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
            </div>
          </div>

          {/* Filter Minggu */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Filter Minggu:</span>
            <div className="inline-flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedMinggu('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedMinggu === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              {(selectedBulan === 'all'
                ? [1, 2, 3, 4, 5]
                : Array.from(
                    {
                      length: getSundaysInMonth(
                        selectedTahun !== 'all' ? selectedTahun : 2026,
                        selectedBulan as number
                      ).length,
                    },
                    (_, i) => (i + 1) as 1 | 2 | 3 | 4 | 5
                  )
              ).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedMinggu(w)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedMinggu === w
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  M-{w}
                </button>
              ))}
            </div>
          </div>

          {/* Pencarian */}
          <div className="relative grow sm:grow-0 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari penerimaan / seksi / proker..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Slider 12 Bulan */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedBulan('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                selectedBulan === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Semua Bulan
            </button>
            {BULAN_LIST.map((b) => {
              const isSelected = selectedBulan === b.no;
              return (
                <button
                  key={b.no}
                  type="button"
                  onClick={() => setSelectedBulan(b.no)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs font-black'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {b.singkatan}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filter: Kategori & Seksi */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Kategori:</span>
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value as KategoriPenerimaan | 'all')}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="all">Semua Kategori {isSeksiPSE ? 'PSE' : ''}</option>
              {KATEGORI_PENERIMAAN_LIST.filter((k) =>
                isSeksiPSE
                  ? !['kolekte_1', 'kolekte_2', 'kolekte_khusus'].includes(k.id)
                  : true
              ).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          {!isSeksiUser && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Alokasi Seksi:</span>
              <select
                value={selectedSeksi}
                onChange={(e) => setSelectedSeksi(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="all">Semua Unit (Paroki &amp; Seksi)</option>
                <option value="Umum Paroki">🏛️ Kas Umum Paroki</option>
                <optgroup label="⭐ Seksi Tetap (Wajib Rutin)">
                  <option value="Seksi PSE">Seksi PSE (Pengembangan Sosial Ekonomi)</option>
                  <option value="Seksi KKI">Seksi KKI (Karya Kepausan Indonesia)</option>
                </optgroup>
                <optgroup label="⚡ Seksi Tentatif (Insidental / Usaha Dana)">
                  {MASTER_DIVISIONS.filter(
                    (d) => !isSeksiTetap(d.nama) && !d.nama.toLowerCase().includes('dpph')
                  ).map((d) => (
                    <option key={d.id} value={d.nama}>
                      {d.nama}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          <div className="ml-auto text-xs font-bold text-slate-500">
            Ditemukan: <span className="text-emerald-700 font-black">{metrics.countItems}</span> catatan
          </div>
        </div>
      </div>

      {/* 3. KPI METRICS CARDS (COMPACT) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        {/* Metric 1: Total Rancangan */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Total Target / Rancangan
            </span>
            <Target className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900">
            {formatRupiah(metrics.totalRancangan)}
          </p>
          <p className="text-[10px] text-slate-400 font-medium truncate">
            Target kas mingguan
          </p>
        </div>

        {/* Metric 2: Total Realisasi */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-2.5 sm:p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-0.5">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Total Realisasi Riil
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-emerald-950">
            {formatRupiah(metrics.totalRealisasi)}
          </p>
          <p className="text-[10px] text-emerald-800 font-bold truncate">
            {metrics.selisih >= 0 ? (
              <>+{formatRupiah(metrics.selisih)} ({metrics.persentaseCapaian}%)</>
            ) : (
              <>-{formatRupiah(Math.abs(metrics.selisih))} ({metrics.persentaseCapaian}%)</>
            )}
          </p>
        </div>

        {/* Metric 3: Kebutuhan Program Kerja Terkait */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Kebutuhan Biaya Proker
            </span>
            <Building className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-indigo-950">
            {formatRupiah(metrics.totalKebutuhanProker)}
          </p>
          <p className="text-[10px] text-slate-500 font-medium flex items-center justify-between truncate">
            <span>Rata-rata bulanan</span>
            {onNavigateToProker && (
              <button
                type="button"
                onClick={onNavigateToProker}
                className="text-[9.5px] text-indigo-600 hover:underline font-bold inline-flex items-center cursor-pointer ml-1"
              >
                Lihat <ArrowRight className="w-2 h-2 ml-0.5" />
              </button>
            )}
          </p>
        </div>

        {/* Metric 4: Daya Dukung Kas & Likuiditas */}
        <div
          className={`p-2.5 sm:p-3 rounded-xl border shadow-2xs space-y-0.5 ${
            metrics.surplusKasBersih >= 0
              ? 'bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200'
              : 'bg-gradient-to-br from-amber-50 to-rose-50 border-amber-200'
          }`}
        >
          <div
            className={`flex items-center justify-between ${
              metrics.surplusKasBersih >= 0 ? 'text-teal-800' : 'text-amber-800'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-wider">
              Daya Dukung Kas Proker
            </span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <p
            className={`text-base sm:text-lg font-black ${
              metrics.surplusKasBersih >= 0 ? 'text-teal-950' : 'text-amber-950'
            }`}
          >
            {metrics.rasioDayaDukung}%
          </p>
          <p
            className={`text-[10px] font-bold truncate ${
              metrics.surplusKasBersih >= 0 ? 'text-teal-800' : 'text-amber-800'
            }`}
          >
            {metrics.surplusKasBersih >= 0 ? 'Kas Aman untuk Eksekusi' : 'Perlu Penyesuaian Pengeluaran'}
          </p>
        </div>
      </div>

      {/* 3B. COMPACT POLICY SUMMARY STRIP & TOGGLE */}
      {isSeksiPSE ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-2.5 sm:px-3.5 sm:py-2 border border-amber-300 shadow-2xs flex items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <Heart className="w-4 h-4 text-amber-600 fill-amber-500 shrink-0" />
            <span>
              Penerimaan Dana Kasih Umat Seksi PSE (APP, Aksi Natal &amp; Kotak Solidaritas) dikelola mandiri terpisah dari kas kolekte umum paroki.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase shrink-0">
            Non-Kolekte
          </span>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-50/70 via-emerald-50/50 to-purple-50/50 rounded-xl p-2.5 sm:px-3.5 sm:py-2 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-bold text-slate-700">
            <div className="flex items-center gap-1.5 text-blue-900">
              <Scale className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px] text-slate-500 font-semibold">Kol I (50:50):</span>
              <span className="text-[11px] font-black text-blue-900">Solidaritas {formatRupiah(metrics.kolekte1Stats.danaSolidaritas)}</span>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] font-black text-emerald-800">Proker {formatRupiah(metrics.kolekte1Stats.danaOperasionalDanProker)}</span>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-900">
              <Hammer className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[11px] text-slate-500 font-semibold">Kol II:</span>
              <span className="text-[11px] font-black text-emerald-900">Tersimpan {formatRupiah(metrics.kolekte2Stats.saldoTersimpan)}</span>
            </div>

            {metrics.pseStats?.realisasi > 0 && (
              <div className="flex items-center gap-1.5 text-amber-900">
                <Heart className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] text-slate-500 font-semibold">PSE:</span>
                <span className="text-[11px] font-black text-amber-900">{formatRupiah(metrics.pseStats.realisasi)}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowPolicyDetail(!showPolicyDetail)}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <span>{showPolicyDetail ? 'Tutup Aturan' : 'Detail Aturan 50:50 & Pembangunan'}</span>
            {showPolicyDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* 3B. KARTU KHUSUS KEBIJAKAN FINANSIAL (Hanya saat showPolicyDetail === true dan BUKAN Seksi PSE) */}
      {!isSeksiPSE && showPolicyDetail && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-in fade-in duration-150">
        {/* KARTU 1: ATURAN 50:50 KOLEKTE I */}
        <div className="bg-white rounded-3xl p-5 border border-blue-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    Kolekte I: Aturan 50:50
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Misa Mingguan Paroki
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                Pemisahan Otomatis
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Kolekte I secara otomatis dipisahkan: <strong>50% disetor sebagai Dana Solidaritas</strong> dan <strong>50% menjadi kas operasional paroki &amp; pembiayaan program seksi</strong>.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide">
                Total Kolekte I Masuk (Realisasi):
              </div>
              <div className="text-lg font-black text-slate-900">
                {formatRupiah(metrics.kolekte1Stats.realisasi)}
              </div>
              <div className="text-[10px] text-slate-400">
                Target Rancangan: {formatRupiah(metrics.kolekte1Stats.rancangan)} ({metrics.kolekte1Stats.count} pos)
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* 50% Solidaritas */}
              <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 shadow-2xs space-y-0.5">
                <span className="text-[9.5px] font-bold text-blue-900 uppercase tracking-wider block">
                  50% Solidaritas:
                </span>
                <span className="text-sm font-black text-blue-900 block">
                  {formatRupiah(metrics.kolekte1Stats.danaSolidaritas)}
                </span>
                <span className="text-[9px] text-blue-700 leading-tight block">
                  Disetor ke Keuskupan
                </span>
              </div>

              {/* 50% Operasional & Proker */}
              <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-2xs space-y-0.5">
                <span className="text-[9.5px] font-bold text-emerald-900 uppercase tracking-wider block">
                  50% Operasional &amp; Proker:
                </span>
                <span className="text-sm font-black text-emerald-800 block">
                  {formatRupiah(metrics.kolekte1Stats.danaOperasionalDanProker)}
                </span>
                <span className="text-[9px] text-emerald-700 leading-tight block">
                  Kas aktif program seksi
                </span>
              </div>
            </div>
          </div>

          {isAuthorizedGlobal && (
            <button
              type="button"
              onClick={() => handleOpenAddKolekte1()}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Input Kolekte I (Misa)</span>
            </button>
          )}
        </div>

        {/* KARTU 2: REKAPITULASI DANA PEMBANGUNAN (KOLEKTE II) */}
        <div className="bg-white rounded-3xl p-5 border border-emerald-300 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                  <Hammer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    Kolekte II: Dana Pembangunan
                  </h3>
                  <span className="text-[10px] text-emerald-700 font-bold">
                    Kas Tersimpan Khusus
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                100% Pembangunan
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Kolekte II dicatatkan khusus sebagai <strong>Dana Pembangunan yang tersimpan</strong> dan hanya dipakai jika ada pengeluaran atau pembiayaan pembangunan/renovasi fisik gereja.
            </p>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
              <div className="text-[10.5px] font-bold text-emerald-900 uppercase tracking-wide">
                Total Kolekte II Masuk (Realisasi):
              </div>
              <div className="text-lg font-black text-emerald-950">
                {formatRupiah(metrics.kolekte2Stats.realisasi)}
              </div>
              <div className="text-[10px] text-emerald-700">
                Target Rancangan: {formatRupiah(metrics.kolekte2Stats.rancangan)} ({metrics.kolekte2Stats.count} pos)
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* Penggunaan Pembangunan */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs space-y-0.5">
                <span className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider block">
                  Penggunaan Proker:
                </span>
                <span className="text-sm font-black text-slate-800 block">
                  {formatRupiah(metrics.kolekte2Stats.penggunaan)}
                </span>
                <span className="text-[9px] text-slate-500 leading-tight block">
                  Renovasi &amp; fisik terpakai
                </span>
              </div>

              {/* Saldo Tersimpan */}
              <div className="p-2.5 rounded-xl bg-emerald-100/70 border border-emerald-300 shadow-2xs space-y-0.5">
                <span className="text-[9.5px] font-bold text-emerald-950 uppercase tracking-wider block">
                  Saldo Tersimpan:
                </span>
                <span className="text-sm font-black text-emerald-900 block">
                  {formatRupiah(metrics.kolekte2Stats.saldoTersimpan)}
                </span>
                <span className="text-[9px] text-emerald-700 leading-tight block">
                  Tersimpan di rekening khusus
                </span>
              </div>
            </div>
          </div>

          {isAuthorizedGlobal && (
            <button
              type="button"
              onClick={() => handleOpenAddKolekte2()}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Input Kolekte II (Pembangunan)</span>
            </button>
          )}
        </div>

        {/* KARTU 3: KONDISIONAL (GLOBAL: KOLEKTE KHUSUS PAROKI vs FILTER SEKSI: PENERIMAAN SEKSI TERSEBUT) */}
        {effectiveSeksiFilter === 'all' || effectiveSeksiFilter === 'Umum Paroki' ? (
          <div className="bg-white rounded-3xl p-5 border border-purple-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900">
                      Kolekte Khusus: Misa Hari Raya
                    </h3>
                    <span className="text-[10px] text-purple-700 font-bold">
                      Kas Khusus Liturgi Paroki
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                  Hari Raya Misa
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Pencatatan kolekte khusus misa hari raya liturgi paroki. <em>Catatan penerimaan untuk unit Seksi (PSE, dsb) hanya ditampilkan saat filter Seksi yang bersangkutan dipilih di atas.</em>
              </p>

              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-1">
                <div className="text-[10.5px] font-bold text-purple-900 uppercase tracking-wide">
                  Total Kolekte Khusus Masuk:
                </div>
                <div className="text-lg font-black text-purple-950">
                  {formatRupiah(metrics.kolekteKhususStats.realisasi)}
                </div>
                <div className="text-[10px] text-purple-700">
                  Target Rencana: {formatRupiah(metrics.kolekteKhususStats.rancangan)} ({metrics.kolekteKhususStats.count} pos)
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10.5px] text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800">Cakupan Kolekte Khusus:</span> Misa Paskah, Natal, Hari Minggu Misi, Liturgi Khusus Keuskupan / Paroki.
              </div>
            </div>

            {isBendahara || isAuthorizedGlobal ? (
              <button
                type="button"
                onClick={() => handleOpenAddKolekteKhusus()}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Input kolekte khusus misa hari raya"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Input Kolekte Khusus Paroki</span>
              </button>
            ) : null}
          </div>
        ) : effectiveSeksiFilter === 'Seksi PSE' || isSeksiPSE ? (
          <div className="bg-white rounded-3xl p-5 border border-amber-300 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900">
                      Seksi PSE: Rencana &amp; Realisasi
                    </h3>
                    <span className="text-[10px] text-amber-800 font-bold">
                      Diisi Seksi PSE
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                  Pos Tetap Seksi
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Inputan khusus rancangan rencana penerimaan dan realisasi yang <strong>diisi langsung oleh Seksi PSE</strong> (Dana APP, Aksi Natal, Derma Kasih, Pelayanan Kesehatan &amp; Sosial).
              </p>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-amber-900 uppercase tracking-wide">
                    Realisasi Kas Masuk PSE:
                  </span>
                  <span className="text-[10.5px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                    {metrics.pseStats.persen}% Capaian
                  </span>
                </div>
                <div className="text-lg font-black text-amber-950">
                  {formatRupiah(metrics.pseStats.realisasi)}
                </div>
                <div className="text-[10px] text-amber-800">
                  Target Rencana: {formatRupiah(metrics.pseStats.rancangan)} ({metrics.pseStats.count} pos tercatat)
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10.5px] text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800">Pos Penerimaan PSE:</span> Dana Aksi Puasa Pembangunan (APP), Aksi Natal, Kotak Kasih, Pelayanan Orang Sakit / Lansia.
              </div>
            </div>

            {isBendahara ? (
              <div className="w-full mt-2 p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs font-semibold flex items-center gap-2">
                <span className="text-base shrink-0">ℹ️</span>
                <span className="leading-snug">
                  Penerimaan ini diisi langsung oleh <strong>Seksi PSE</strong>. Bendahara Paroki hanya mengisi data dari Kolekte.
                </span>
              </div>
            ) : isSeksiPSE || isDpph ? (
              <button
                type="button"
                onClick={() => handleOpenAddPSE()}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Input rancangan rencana penerimaan atau realisasi kas Seksi PSE"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Input Penerimaan Seksi PSE</span>
              </button>
            ) : (
              <div className="w-full mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-medium flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Diisi langsung oleh pengurus Seksi PSE.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-5 border border-purple-300 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[200px]">
                      Penerimaan: {effectiveSeksiFilter}
                    </h3>
                    <span className="text-[10px] text-purple-700 font-bold">
                      Kas Mandiri / Khusus Unit
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-900 border border-purple-300">
                  Unit Seksi
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Penerimaan usaha dana mandiri, sponsorship, atau donatur khusus untuk pendanaan kegiatan <strong>{effectiveSeksiFilter}</strong>.
              </p>

              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-1">
                <div className="text-[10.5px] font-bold text-purple-900 uppercase tracking-wide">
                  Total Realisasi Masuk Unit:
                </div>
                <div className="text-lg font-black text-purple-950">
                  {formatRupiah(metrics.totalRealisasi)}
                </div>
                <div className="text-[10px] text-purple-700">
                  Target Rencana: {formatRupiah(metrics.totalRancangan)} ({metrics.countItems} pos tercatat)
                </div>
              </div>
            </div>

            {isAuthorizedGlobal || (isSeksiUser && authSession?.unitNama === effectiveSeksiFilter) ? (
              <button
                type="button"
                onClick={() => handleOpenAddTentatifSeksi(effectiveSeksiFilter)}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title={`Input pos penerimaan untuk ${effectiveSeksiFilter}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Input Penerimaan {effectiveSeksiFilter}</span>
              </button>
            ) : null}
          </div>
        )}
      </div>
      )}

      {/* 4. MODE SWITCHER: 1 LAYAR BULANAN vs RINCIAN DETAIL MINGGUAN (TIDAK DITAMPILKAN UTK LOGIN PSE) */}
      {!isSeksiPSE && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'matrix'
                  ? 'bg-emerald-700 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>⚡</span>
              <span>Input Kolekte 1 Layar Per Bulan</span>
              <span className="text-[9.5px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-extrabold ml-0.5">
                Cepat
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-emerald-700 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📋</span>
              <span>Rincian Transaksi Mingguan &amp; Seksi</span>
            </button>
          </div>

          {viewMode === 'matrix' && (
            <span className="text-[11px] text-slate-500 font-medium">
              💡 Isi langsung rencana &amp; realisasi semua minggu tanpa buka-tutup jendela modal.
            </span>
          )}
        </div>
      )}

      {viewMode === 'matrix' && !isSeksiPSE ? (
        <MonthlyKolekteMatrix
          tahun={selectedTahun !== 'all' ? (selectedTahun as 2026 | 2027) : 2026}
          bulan={selectedBulan !== 'all' ? (selectedBulan as number) : 1}
          penerimaanList={penerimaanList}
          onSavePenerimaan={onSavePenerimaan}
          onDeletePenerimaan={onDeletePenerimaan}
          onMonthChange={(m) => setSelectedBulan(m)}
          onYearChange={(y) => setSelectedTahun(y)}
          authSession={authSession}
          isBendahara={isBendahara}
          isDpph={isDpph}
          modeFocus={initialModeFocus}
        />
      ) : (
        /* TAMPILAN MINGGUAN TERSTRUKTUR (MINGGU 1 - 5) */
        <div className="space-y-3">
        {groupedByWeek.map((week) => {
          if (selectedMinggu !== 'all' && selectedMinggu !== week.mingguKe) {
            return null;
          }

          const hasItems = week.items.length > 0;

          return (
            <div
              key={week.mingguKe}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
            >
              {/* Header Minggu (Compact) */}
              <div className="px-3.5 py-2.5 sm:px-4 bg-gradient-to-r from-slate-50 via-emerald-50/25 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                    M{week.mingguKe}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-black text-slate-900">
                        Minggu ke-{week.mingguKe}
                      </h3>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        {getWeekDateRangeLabel(week.mingguKe, selectedBulan, selectedTahun)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {week.items.length} pos penerimaan kas
                    </p>
                  </div>
                </div>

                {/* Sub-total Minggu Ini */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                      Target Rencana:
                    </div>
                    <div className="text-xs font-black text-slate-700">
                      {formatRupiah(week.subRancangan)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[9.5px] font-bold text-emerald-700 uppercase tracking-wider">
                      Realisasi Masuk:
                    </div>
                    <div className="text-xs sm:text-sm font-black text-emerald-800">
                      {formatRupiah(week.subRealisasi)}
                    </div>
                  </div>

                  {/* Tombol Input di Minggu Ini */}
                  <div className="flex items-center gap-1">
                    {/* Khusus Bendahara: Hanya Kolekte I & II */}
                    {isBendahara && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenAddKolekte1(week.mingguKe as 1 | 2 | 3 | 4 | 5)}
                          className="px-2 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Input Kolekte I di Minggu Ini"
                        >
                          <Scale className="w-3 h-3 text-blue-700" />
                          <span>+ Kol I</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAddKolekte2(week.mingguKe as 1 | 2 | 3 | 4 | 5)}
                          className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Input Kolekte II (Pembangunan) di Minggu Ini"
                        >
                          <Hammer className="w-3 h-3 text-emerald-700" />
                          <span>+ Kol II</span>
                        </button>
                      </>
                    )}

                    {/* DPPH / Pastor: Kas Paroki & Seksi Tentatif */}
                    {isDpph && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenAddParoki(week.mingguKe as 1 | 2 | 3 | 4 | 5)}
                          className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Input Rencana Penerimaan Kas Paroki di Minggu Ini"
                        >
                          <Plus className="w-3 h-3 stroke-[2.5]" />
                          <span>+ Input Rencana</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAddTentatifSeksi(undefined, week.mingguKe as 1 | 2 | 3 | 4 | 5)}
                          className="px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Tambah Penerimaan Tentatif Seksi di Minggu Ini"
                        >
                          <Sparkles className="w-3 h-3 text-purple-700" />
                          <span>+ Seksi</span>
                        </button>
                      </>
                    )}

                    {/* Khusus Seksi PSE jika login sebagai Seksi PSE */}
                    {!isBendahara && isSeksiPSE && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddPSE(week.mingguKe as 1 | 2 | 3 | 4 | 5)}
                        className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Input Rencana & Realisasi Penerimaan Seksi PSE di Minggu Ini"
                      >
                        <Heart className="w-3 h-3 text-amber-700" />
                        <span>+ Input PSE</span>
                      </button>
                    )}

                    {/* Khusus Seksi Lainnya */}
                    {!isBendahara && isOtherSeksi && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddTentatifSeksi(authSession?.unitNama, week.mingguKe as 1 | 2 | 3 | 4 | 5)}
                        className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title={`Input Penerimaan ${authSession?.unitNama} di Minggu Ini`}
                      >
                        <Sparkles className="w-3 h-3 text-purple-700" />
                        <span>+ Input Seksi</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar Ketercapaian Minggu Ini */}
              <div className="px-4 pt-2 pb-0.5">
                <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-600 mb-0.5">
                  <span>Capaian Target Minggu Ini:</span>
                  <span
                    className={
                      week.subSelisih >= 0 ? 'text-emerald-700 font-black' : 'text-amber-700 font-black'
                    }
                  >
                    {week.subPersen}% ({week.subSelisih >= 0 ? '+' : ''}
                    {formatRupiah(week.subSelisih)})
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      week.subSelisih >= 0 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, week.subPersen))}%` }}
                  />
                </div>
              </div>

              {/* Daftar Pos Penerimaan Minggu Ini */}
              {!hasItems ? (
                <div className="px-4 py-5 text-center text-slate-400 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                    <DollarSign className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700">
                      Belum ada input rencana penerimaan pada Minggu ke-{week.mingguKe}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                      Klik tombol untuk mengisi target rencana kas atau realisasi minggu ini.
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        if (isBendahara) {
                          handleOpenAddKolekte1(week.mingguKe as 1 | 2 | 3 | 4 | 5);
                        } else if (isSeksiPSE) {
                          handleOpenAddPSE(week.mingguKe as 1 | 2 | 3 | 4 | 5);
                        } else if (isOtherSeksi) {
                          handleOpenAddTentatifSeksi(authSession?.unitNama, week.mingguKe as 1 | 2 | 3 | 4 | 5);
                        } else {
                          handleOpenAddParoki(week.mingguKe as 1 | 2 | 3 | 4 | 5);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>+ Input Rencana Penerimaan M{week.mingguKe}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-3.5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                          <th className="pb-2.5 pl-2 font-black">Tanggal &amp; Kategori</th>
                          <th className="pb-2.5 font-black">Uraian Penerimaan</th>
                          <th className="pb-2.5 font-black">Sumber / Alokasi</th>
                          <th className="pb-2.5 text-right font-black">Rancangan (Target)</th>
                          <th className="pb-2.5 text-right font-black">Realisasi (Masuk)</th>
                          <th className="pb-2.5 text-right font-black">Selisih (+/-)</th>
                          <th className="pb-2.5 pr-2 text-center font-black">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {week.items.map((item) => {
                          const meta = getKategoriMeta(item.kategori);
                          const selisihItem = (item.realisasi || 0) - (item.rancangan || 0);
                          const isSurplus = selisihItem >= 0;

                          const isParokiKas = item.alokasiSeksi === 'Umum Paroki' || item.tipeSumber === 'paroki';
                          const isSeksiRutin = isSeksiTetap(item.alokasiSeksi) || item.tipeSumber === 'seksi_tetap';
                          const isTentatif = item.isTentatif || item.tipeSumber === 'seksi_tentatif';

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Tanggal & Badge Kategori */}
                              <td className="py-2 pl-2 pr-2.5 align-top whitespace-nowrap">
                                <div className="font-extrabold text-slate-900 text-xs">
                                  {formatIndonesianDate(item.tanggal, true)}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  <span
                                    className={`inline-block px-2 py-0.2 rounded-full text-[9px] font-black border ${meta.badgeColor}`}
                                  >
                                    {meta.label}
                                  </span>
                                  {item.isHariKhusus && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-purple-100 text-purple-900 border border-purple-300">
                                      ⭐ Hari Khusus
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Uraian Penerimaan */}
                              <td className="py-2 pr-2.5 align-top max-w-xs sm:max-w-md">
                                <div className="font-extrabold text-slate-900 leading-snug text-xs">
                                  {item.namaPenerimaan}
                                </div>
                                {item.keterangan && (
                                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                                    {item.keterangan}
                                  </p>
                                )}
                                {item.pencatat && (
                                  <span className="text-[9px] text-slate-400 mt-0.5 inline-block">
                                    Pencatat: {item.pencatat}
                                  </span>
                                )}
                              </td>

                              {/* Sumber & Alokasi Seksi / Proker */}
                              <td className="py-2 pr-2.5 align-top whitespace-nowrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-800 text-xs">
                                    {item.alokasiSeksi || 'Umum Paroki'}
                                  </span>
                                  {isParokiKas ? (
                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                                      🏛️ Paroki
                                    </span>
                                  ) : isSeksiRutin ? (
                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                      ⭐ Seksi Tetap
                                    </span>
                                  ) : isTentatif ? (
                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-purple-100 text-purple-900 border border-purple-300">
                                      ⚡ Tentatif
                                    </span>
                                  ) : null}
                                </div>

                                {item.namaProgramTerkait ? (
                                  <div className="text-[9.5px] text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 mt-0.5 max-w-[190px] truncate">
                                    Proker: {item.namaProgramTerkait}
                                  </div>
                                ) : (
                                  <span className="text-[9.5px] text-slate-400">Kas Bersama Proker</span>
                                )}
                              </td>

                              {/* Rancangan (Target) */}
                              <td className="py-2 pr-2.5 align-top text-right whitespace-nowrap font-bold text-slate-700 text-xs">
                                {formatRupiah(item.rancangan || 0)}
                              </td>

                              {/* Realisasi (Masuk) */}
                              <td className="py-2 pr-2.5 align-top text-right whitespace-nowrap font-black text-emerald-800 text-xs">
                                {formatRupiah(item.realisasi || 0)}
                              </td>

                              {/* Selisih */}
                              <td className="py-2 pr-2.5 align-top text-right whitespace-nowrap">
                                <span
                                  className={`font-black text-xs ${
                                    isSurplus ? 'text-emerald-700' : 'text-rose-600'
                                  }`}
                                >
                                  {isSurplus ? '+' : ''}
                                  {formatRupiah(selisihItem)}
                                </span>
                              </td>

                              {/* Aksi Edit & Hapus */}
                              <td className="py-2 pr-2 align-top text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  {(() => {
                                    const isKolekteItem =
                                      item.kategori.startsWith('kolekte') ||
                                      item.tipeSumber === 'paroki' ||
                                      item.alokasiSeksi === 'Umum Paroki';
                                    const canEdit =
                                      isDpph
                                        ? true
                                        : isBendahara
                                        ? isKolekteItem
                                        : isSeksiUser
                                        ? item.alokasiSeksi === authSession?.unitNama
                                        : false;

                                    if (!canEdit) {
                                      return (
                                        <span
                                          className="text-[9.5px] text-slate-400 font-semibold px-2 py-0.5 rounded-full bg-slate-100 flex items-center gap-1"
                                          title={
                                            isBendahara
                                              ? 'Penerimaan ini diisi oleh seksi bersangkutan'
                                              : 'Hanya dapat dikelola oleh unit terkait'
                                          }
                                        >
                                          <Lock className="w-2.5 h-2.5" />
                                          <span>{isBendahara ? 'Seksi' : 'Terkunci'}</span>
                                        </span>
                                      );
                                    }

                                    return (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEdit(item)}
                                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                                          title="Edit Transaksi Penerimaan"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setDeletingId(item.id)}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                          title="Hapus Transaksi Penerimaan"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    );
                                  })()}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Aksi Tambahan Minggu Ini */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 mt-2">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {week.items.length} transaksi kas tercatat di Minggu ke-{week.mingguKe}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (isBendahara) {
                          handleOpenAddKolekte1(week.mingguKe as 1 | 2 | 3 | 4 | 5);
                        } else if (isSeksiPSE) {
                          handleOpenAddPSE(week.mingguKe as 1 | 2 | 3 | 4 | 5);
                        } else if (isOtherSeksi) {
                          handleOpenAddTentatifSeksi(authSession?.unitNama, week.mingguKe as 1 | 2 | 3 | 4 | 5);
                        } else {
                          handleOpenAddParoki(week.mingguKe as 1 | 2 | 3 | 4 | 5);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>+ Tambah Rencana / Realisasi Minggu Ini</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* 5. MODAL FORM INPUT & EDIT */}
      <PenerimaanFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSavePenerimaan}
        initialData={editingItem}
        defaultTahun={selectedTahun !== 'all' ? (selectedTahun as 2026 | 2027) : 2026}
        defaultBulan={selectedBulan !== 'all' ? (selectedBulan as number) : 1}
        defaultMinggu={defaultMingguForAdd}
        defaultKategori={defaultKategoriForModal}
        defaultNamaPenerimaan={defaultNamaForModal}
        defaultRancangan={defaultRancanganForModal}
        defaultRealisasi={defaultRealisasiForModal}
        programsList={programsList}
        modeTentatifSeksi={isTentatifModalMode}
        defaultSeksiTarget={targetSeksiForModal}
        authSession={authSession}
        restrictToKolekteOnly={isBendahara}
        penerimaanList={penerimaanList}
      />

      {/* 6. MODAL KONFIRMASI HAPUS */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-rose-50/70">
              <div className="flex items-center gap-2 text-rose-700">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">
                  Hapus Catatan Penerimaan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                Apakah Anda yakin ingin menghapus data penerimaan kas mingguan ini?
              </p>
              {(() => {
                const item = penerimaanList.find((p) => p.id === deletingId);
                if (!item) return null;
                return (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="font-extrabold text-slate-900 truncate">
                      {item.namaPenerimaan}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tanggal: {item.tanggal} · Realisasi: <strong className="text-emerald-700">{formatRupiah(item.realisasi)}</strong>
                    </div>
                  </div>
                );
              })()}
              <p className="text-[10.5px] text-rose-600 font-semibold">
                Tindakan ini permanen dan akan menghapus data dari Cloud Firestore serta perangkat.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
