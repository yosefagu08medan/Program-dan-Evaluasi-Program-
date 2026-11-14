import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  DollarSign,
  Calendar,
  Layers,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Info,
  Scale,
  Hammer,
  Sparkles,
  Heart,
  TrendingUp,
  ArrowRight,
  Split,
  Building,
  Coins,
  Plus,
  Target,
} from 'lucide-react';
import {
  PenerimaanMingguan,
  KategoriPenerimaan,
  KATEGORI_PENERIMAAN_LIST,
  TipeSumberPenerimaan,
  isSeksiTetap,
  calculateKolekte1Split,
  DEFAULT_PSE_PENERIMAAN_OPTIONS,
  getAllPsePenerimaanOptions,
  savePseCustomPenerimaanOption,
  removePseCustomPenerimaanOption,
  isPseTargetTahunan,
  calculatePseAnnualTargetSummary,
  PseAnnualTargetSummary,
} from '../types/penerimaan';
import { ProgramKerja } from '../types/proker';
import { MASTER_DIVISIONS } from '../../database/master-data/divisions';
import {
  BULAN_LIST,
  formatRupiah,
  parseRupiahInput,
  formatIndonesianDate,
  getSundaysInMonth,
  HARI_KHUSUS_PRESETS,
} from '../utils/formatters';
import { AuthSession } from '../types/auth';

interface PenerimaanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: PenerimaanMingguan) => Promise<void>;
  initialData?: PenerimaanMingguan | null;
  defaultTahun?: 2026 | 2027;
  defaultBulan?: number;
  defaultMinggu?: 1 | 2 | 3 | 4 | 5;
  defaultKategori?: KategoriPenerimaan;
  defaultNamaPenerimaan?: string;
  defaultRancangan?: number;
  defaultRealisasi?: number;
  programsList: ProgramKerja[];
  modeTentatifSeksi?: boolean;
  defaultSeksiTarget?: string;
  authSession?: AuthSession | null;
  restrictToKolekteOnly?: boolean;
  penerimaanList?: PenerimaanMingguan[];
}

export const PenerimaanFormModal: React.FC<PenerimaanFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultTahun = 2026,
  defaultBulan = 1,
  defaultMinggu = 1,
  defaultKategori,
  defaultNamaPenerimaan,
  defaultRancangan,
  defaultRealisasi,
  programsList,
  modeTentatifSeksi = false,
  defaultSeksiTarget = 'Umum Paroki',
  authSession = null,
  restrictToKolekteOnly = false,
  penerimaanList = [],
}) => {
  // Roles check
  const isBendahara = authSession?.role === 'bendahara' || restrictToKolekteOnly;
  const isPastorOrDpph =
    authSession?.role === 'pastor_paroki' ||
    authSession?.role === 'semua_seksi' ||
    authSession?.unitId === 'div-dpph';
  const isSeksiPSE = Boolean(
    authSession?.unitNama === 'Seksi PSE' ||
    authSession?.unitId === 'div-pse' ||
    (authSession?.unitNama && (
      authSession.unitNama.toLowerCase().includes('pse') ||
      authSession.unitNama.toLowerCase().includes('sosial ekonomi')
    )) ||
    (!isBendahara && defaultSeksiTarget === 'Seksi PSE')
  );
  const isSeksiUser = authSession?.role === 'seksi' && !isPastorOrDpph;

  // Mode: 'kolekte_dual' (2 kolom: Kolekte 1 & 2) vs 'kolekte_khusus' vs 'seksi_single' (1 kolom pos seksi)
  const [formMode, setFormMode] = useState<'kolekte_dual' | 'kolekte_khusus' | 'seksi_single'>(
    isSeksiPSE ? 'seksi_single' : 'kolekte_dual'
  );

  // Periode Bersama
  const [tahun, setTahun] = useState<2026 | 2027>(defaultTahun);
  const [bulan, setBulan] = useState<number>(defaultBulan);
  const [mingguKe, setMingguKe] = useState<1 | 2 | 3 | 4 | 5>(defaultMinggu);
  const [tanggal, setTanggal] = useState<string>('');

  // 1. STATE KOLOM KOLEKTE I (50:50 Misa Mingguan)
  const [kol1RencanaStr, setKol1RencanaStr] = useState<string>('12.000.000');
  const [kol1RealisasiStr, setKol1RealisasiStr] = useState<string>('');
  const [kol1Keterangan, setKol1Keterangan] = useState<string>('');

  // 2. STATE KOLOM KOLEKTE II (Dana Pembangunan Tersimpan)
  const [kol2RencanaStr, setKol2RencanaStr] = useState<string>('10.000.000');
  const [kol2RealisasiStr, setKol2RealisasiStr] = useState<string>('');
  const [kol2Keterangan, setKol2Keterangan] = useState<string>('');

  // 2B. STATE KOLEKTE KHUSUS (Misa Hari Raya / Liturgi)
  const [khususNama, setKhususNama] = useState<string>('Kolekte Khusus Misa Hari Raya');
  const [khususRencanaStr, setKhususRencanaStr] = useState<string>('8.000.000');
  const [khususRealisasiStr, setKhususRealisasiStr] = useState<string>('');
  const [khususKeterangan, setKhususKeterangan] = useState<string>('');

  // 3. STATE MODE SEKSI (PSE atau Tentatif Seksi)
  const [seksiKategori, setSeksiKategori] = useState<KategoriPenerimaan>('persembahan_umat');
  const [seksiNama, setSeksiNama] = useState<string>('');
  const [seksiRencanaStr, setSeksiRencanaStr] = useState<string>('');
  const [seksiRealisasiStr, setSeksiRealisasiStr] = useState<string>('');
  const [seksiAlokasi, setSeksiAlokasi] = useState<string>('Umum Paroki');
  const [seksiTipeSumber, setSeksiTipeSumber] = useState<TipeSumberPenerimaan>('seksi_tetap');
  const [seksiProkerId, setSeksiProkerId] = useState<string>('');
  const [seksiKeterangan, setSeksiKeterangan] = useState<string>('');
  const [seksiPencatat, setSeksiPencatat] = useState<string>('');

  // State Khusus Pilihan PSE (Standar 3 Pilihan + Kustom Tersimpan)
  const [pseOptions, setPseOptions] = useState<string[]>(() => getAllPsePenerimaanOptions());
  const [isCustomPseMode, setIsCustomPseMode] = useState<boolean>(false);
  const [customPseNama, setCustomPseNama] = useState<string>('');

  // State Khusus Target Tahunan PSE (Sepanjang Tahun / Tentatif)
  const [isTargetTahunanState, setIsTargetTahunanState] = useState<boolean>(false);
  const [targetTahunanStr, setTargetTahunanStr] = useState<string>('50.000.000');

  // Status & Validasi
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Hook 1: Available Categories for Seksi
  const availableCategories = useMemo(() => {
    if (isBendahara) {
      return KATEGORI_PENERIMAAN_LIST.filter((k) =>
        ['kolekte_1', 'kolekte_2', 'kolekte_khusus'].includes(k.id)
      );
    }
    if (isSeksiUser) {
      if (isSeksiPSE) {
        return KATEGORI_PENERIMAAN_LIST.filter(
          (k) => !['kolekte_1', 'kolekte_2'].includes(k.id)
        );
      }
      return KATEGORI_PENERIMAAN_LIST.filter((k) =>
        ['usaha_dana_seksi', 'donatur_spesifik', 'persembahan_umat', 'lain_lain'].includes(k.id)
      );
    }
    return KATEGORI_PENERIMAAN_LIST;
  }, [isBendahara, isSeksiUser, isSeksiPSE]);

  // Hook 2: Programs filtered by selected year
  const availablePrograms = useMemo(() => {
    return programsList.filter((p) => p.tahun === tahun);
  }, [programsList, tahun]);

  // Hook 3: Sinkronisasi Form Saat Modal Dibuka
  useEffect(() => {
    if (!isOpen) return;

    const targetTahun = initialData?.tahun || defaultTahun;
    const targetBulan = initialData?.bulan || defaultBulan;
    const targetMinggu = initialData?.mingguKe || defaultMinggu;

    setTahun(targetTahun);
    setBulan(targetBulan);
    setMingguKe(targetMinggu);

    // Tanggal hari Minggu kalender riil
    if (initialData?.tanggal) {
      setTanggal(initialData.tanggal);
    } else {
      const currentSundays = getSundaysInMonth(targetTahun, targetBulan);
      const sun = currentSundays[targetMinggu - 1] || currentSundays[0];
      setTanggal(sun?.tanggal || `${targetTahun}-${String(targetBulan).padStart(2, '0')}-01`);
    }

    // Tentukan mode awal
    if (isSeksiPSE) {
      setFormMode('seksi_single');
      setSeksiAlokasi('Seksi PSE');
      setSeksiTipeSumber('seksi_tetap');
    } else if (initialData?.kategori === 'kolekte_khusus' || defaultKategori === 'kolekte_khusus') {
      setFormMode('kolekte_khusus');
      setKhususNama(initialData?.namaPenerimaan || defaultNamaPenerimaan || 'Kolekte Khusus Misa Hari Raya');
      setKhususRencanaStr(initialData?.rancangan ? initialData.rancangan.toLocaleString('id-ID') : defaultRancangan ? defaultRancangan.toLocaleString('id-ID') : '8.000.000');
      setKhususRealisasiStr(initialData?.realisasi ? initialData.realisasi.toLocaleString('id-ID') : defaultRealisasi ? defaultRealisasi.toLocaleString('id-ID') : '');
      setKhususKeterangan(initialData?.keterangan || '');
    } else {
      const isSingleSeksiEdit =
        initialData &&
        !['kolekte_1', 'kolekte_2', 'kolekte_khusus'].includes(initialData.kategori) &&
        initialData.alokasiSeksi !== 'Umum Paroki';

      const shouldBeSeksiMode =
        !isBendahara &&
        (isSingleSeksiEdit || isSeksiUser || modeTentatifSeksi || defaultSeksiTarget !== 'Umum Paroki');

      if (shouldBeSeksiMode) {
        setFormMode('seksi_single');
      } else {
        setFormMode('kolekte_dual');
      }
    }

    // Inisialisasi Kolom Kolekte 1
    if (initialData?.kategori === 'kolekte_1') {
      setKol1RencanaStr(initialData.rancangan ? initialData.rancangan.toLocaleString('id-ID') : '0');
      setKol1RealisasiStr(initialData.realisasi ? initialData.realisasi.toLocaleString('id-ID') : '');
      setKol1Keterangan(initialData.keterangan || '');
    } else {
      setKol1RencanaStr(defaultRancangan && defaultKategori === 'kolekte_1' ? defaultRancangan.toLocaleString('id-ID') : '12.000.000');
      setKol1RealisasiStr(defaultRealisasi && defaultKategori === 'kolekte_1' ? defaultRealisasi.toLocaleString('id-ID') : '');
      setKol1Keterangan('');
    }

    // Inisialisasi Kolom Kolekte 2
    if (initialData?.kategori === 'kolekte_2') {
      setKol2RencanaStr(initialData.rancangan ? initialData.rancangan.toLocaleString('id-ID') : '0');
      setKol2RealisasiStr(initialData.realisasi ? initialData.realisasi.toLocaleString('id-ID') : '');
      setKol2Keterangan(initialData.keterangan || '');
    } else {
      setKol2RencanaStr(defaultRancangan && defaultKategori === 'kolekte_2' ? defaultRancangan.toLocaleString('id-ID') : '10.000.000');
      setKol2RealisasiStr(defaultRealisasi && defaultKategori === 'kolekte_2' ? defaultRealisasi.toLocaleString('id-ID') : '');
      setKol2Keterangan('');
    }

    // Inisialisasi Mode Seksi
    const currentAllPse = getAllPsePenerimaanOptions();
    setPseOptions(currentAllPse);

    if (initialData && !['kolekte_1', 'kolekte_2', 'kolekte_khusus'].includes(initialData.kategori)) {
      setSeksiKategori(initialData.kategori);
      setSeksiNama(initialData.namaPenerimaan || '');
      setSeksiRencanaStr(initialData.rancangan ? initialData.rancangan.toLocaleString('id-ID') : '0');
      setSeksiRealisasiStr(initialData.realisasi ? initialData.realisasi.toLocaleString('id-ID') : '');
      setSeksiAlokasi(initialData.alokasiSeksi || 'Seksi PSE');
      setSeksiTipeSumber(initialData.tipeSumber || 'seksi_tetap');
      setSeksiProkerId(initialData.alokasiProkerId || '');
      setSeksiKeterangan(initialData.keterangan || '');
      setSeksiPencatat(initialData.pencatat || `Bendahara ${initialData.alokasiSeksi}`);

      const isTargetPSE = initialData.alokasiSeksi === 'Seksi PSE' || isSeksiPSE;
      if (isTargetPSE) {
        if (initialData.namaPenerimaan && !currentAllPse.includes(initialData.namaPenerimaan)) {
          setIsCustomPseMode(true);
          setCustomPseNama(initialData.namaPenerimaan);
        } else {
          setIsCustomPseMode(false);
          setCustomPseNama('');
        }
      }

      // Inisialisasi status target tahunan
      const isSolidaritas = Boolean(
        initialData.isTargetTahunan ||
        isPseTargetTahunan(initialData) ||
        (isTargetPSE && (initialData.namaPenerimaan?.toLowerCase().includes('solidaritas') || false))
      );
      setIsTargetTahunanState(isSolidaritas);

      const annualSummary = calculatePseAnnualTargetSummary(
        penerimaanList,
        targetTahun,
        initialData.namaPenerimaan || 'Dana Solidaritas Umat'
      );
      const initAnnualTarget =
        initialData.targetTahunan ||
        (initialData.isTargetTahunan && initialData.rancangan ? initialData.rancangan : undefined) ||
        (annualSummary.targetTahunan > 0 ? annualSummary.targetTahunan : 50000000);
      setTargetTahunanStr(initAnnualTarget.toLocaleString('id-ID'));
    } else {
      if (isSeksiPSE) {
        setSeksiAlokasi('Seksi PSE');
        setSeksiTipeSumber('seksi_tetap');
        setSeksiKategori(defaultKategori || 'persembahan_umat');
        const chosenNama = defaultNamaPenerimaan || 'Dana Solidaritas Umat';
        setSeksiNama(chosenNama);
        setSeksiPencatat('Bendahara Seksi PSE');
        setIsCustomPseMode(false);
        setCustomPseNama('');

        const isSolidaritas = chosenNama.toLowerCase().includes('solidaritas');
        setIsTargetTahunanState(isSolidaritas);

        const annualSummary = calculatePseAnnualTargetSummary(
          penerimaanList,
          targetTahun,
          chosenNama
        );
        const initAnnualTarget =
          annualSummary.targetTahunan > 0 ? annualSummary.targetTahunan : 50000000;
        setTargetTahunanStr(initAnnualTarget.toLocaleString('id-ID'));
      } else {
        const target =
          authSession?.unitNama && authSession.unitNama !== 'all' && authSession.unitNama !== 'Umum Paroki'
            ? authSession.unitNama
            : defaultSeksiTarget !== 'all' && defaultSeksiTarget !== 'Umum Paroki'
            ? defaultSeksiTarget
            : 'Seksi Kepemudaan';
        setSeksiAlokasi(target);
        setSeksiTipeSumber(isSeksiTetap(target) ? 'seksi_tetap' : 'seksi_tentatif');
        setSeksiKategori(defaultKategori || 'usaha_dana_seksi');
        setSeksiNama(defaultNamaPenerimaan || `Usaha Dana / Donatur ${target}`);
        setSeksiPencatat(`Bendahara ${target}`);
        setIsCustomPseMode(false);
        setCustomPseNama('');
        setIsTargetTahunanState(false);
        setTargetTahunanStr('50.000.000');
      }
      setSeksiRencanaStr(defaultRancangan && !['kolekte_1', 'kolekte_2', 'kolekte_khusus'].includes(defaultKategori || '') ? defaultRancangan.toLocaleString('id-ID') : '3.000.000');
      setSeksiRealisasiStr(defaultRealisasi && !['kolekte_1', 'kolekte_2', 'kolekte_khusus'].includes(defaultKategori || '') ? defaultRealisasi.toLocaleString('id-ID') : '');
      setSeksiProkerId('');
      setSeksiKeterangan('');
    }

    setErrorMsg('');
  }, [
    isOpen,
    initialData,
    defaultTahun,
    defaultBulan,
    defaultMinggu,
    defaultKategori,
    defaultNamaPenerimaan,
    defaultRancangan,
    defaultRealisasi,
    defaultSeksiTarget,
    modeTentatifSeksi,
    isBendahara,
    isSeksiPSE,
    isSeksiUser,
    authSession,
    penerimaanList,
  ]);

  // Live calculations untuk Kolom Kolekte I (Aturan 50:50)
  const kol1RencanaNum = parseRupiahInput(kol1RencanaStr);
  const kol1RealisasiNum = parseRupiahInput(kol1RealisasiStr);
  const kol1RencanaSplit = calculateKolekte1Split(kol1RencanaNum);
  const kol1RealisasiSplit = calculateKolekte1Split(kol1RealisasiNum);
  const kol1Selisih = kol1RealisasiNum - kol1RencanaNum;
  const kol1Persen = kol1RencanaNum > 0 ? Math.round((kol1RealisasiNum / kol1RencanaNum) * 100) : 0;

  // Live calculations untuk Kolom Kolekte II (Dana Pembangunan 100%)
  const kol2RencanaNum = parseRupiahInput(kol2RencanaStr);
  const kol2RealisasiNum = parseRupiahInput(kol2RealisasiStr);
  const kol2Selisih = kol2RealisasiNum - kol2RencanaNum;
  const kol2Persen = kol2RencanaNum > 0 ? Math.round((kol2RealisasiNum / kol2RencanaNum) * 100) : 0;

  // Total Kolekte Gabungan (Minggu Terpilih)
  const totalRencanaKolekte = kol1RencanaNum + kol2RencanaNum;
  const totalRealisasiKolekte = kol1RealisasiNum + kol2RealisasiNum;
  const totalBisaDipakaiOperasionalProker = kol1RealisasiNum > 0 ? kol1RealisasiSplit.danaOperasionalDanProker : kol1RencanaSplit.danaOperasionalDanProker;
  const totalDanaSolidaritas = kol1RealisasiNum > 0 ? kol1RealisasiSplit.danaSolidaritas : kol1RencanaSplit.danaSolidaritas;
  const totalDanaPembangunan = kol2RealisasiNum > 0 ? kol2RealisasiNum : kol2RencanaNum;

  // Live calculations untuk Seksi
  const seksiRencanaNum = parseRupiahInput(seksiRencanaStr);
  const seksiRealisasiNum = parseRupiahInput(seksiRealisasiStr);
  const seksiSelisih = seksiRealisasiNum - seksiRencanaNum;
  const seksiPersen = seksiRencanaNum > 0 ? Math.round((seksiRealisasiNum / seksiRencanaNum) * 100) : 0;

  // Live calculations untuk Target Tahunan PSE
  const targetTahunanNum = parseRupiahInput(targetTahunanStr);
  const effectiveTargetTahunan = targetTahunanNum > 0 ? targetTahunanNum : 50000000;

  const currentPseNama = (isCustomPseMode ? customPseNama : seksiNama) || 'Dana Solidaritas Umat';
  const pseAnnualSummary = useMemo(() => {
    return calculatePseAnnualTargetSummary(penerimaanList, tahun, currentPseNama);
  }, [penerimaanList, tahun, currentPseNama]);

  // Realisasi bulan-bulan lain di tahun yang sama (kecuali item yang sedang diedit ini)
  const otherMonthsRealization = useMemo(() => {
    const currentItemReal = initialData?.realisasi || 0;
    return Math.max(0, pseAnnualSummary.totalRealisasiTahunan - currentItemReal);
  }, [pseAnnualSummary.totalRealisasiTahunan, initialData]);

  // Live akumulasi realisasi tahunan (bulan lain + bulan yang sedang diinput saat ini)
  const liveTotalRealisasiTahunan = otherMonthsRealization + seksiRealisasiNum;
  const liveSisaTargetTahunan = Math.max(0, effectiveTargetTahunan - liveTotalRealisasiTahunan);
  const liveSurplusTahunan = Math.max(0, liveTotalRealisasiTahunan - effectiveTargetTahunan);
  const isSurplusTahunan = liveTotalRealisasiTahunan >= effectiveTargetTahunan;
  const livePersentaseTahunan =
    effectiveTargetTahunan > 0
      ? Math.round((liveTotalRealisasiTahunan / effectiveTargetTahunan) * 100)
      : 0;

  // Form Handlers
  const handleKol1RencanaChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setKol1RencanaStr('');
      return;
    }
    const num = parseInt(clean, 10);
    setKol1RencanaStr(num.toLocaleString('id-ID'));
  };

  const handleKol1RealisasiChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setKol1RealisasiStr('');
      return;
    }
    const num = parseInt(clean, 10);
    setKol1RealisasiStr(num.toLocaleString('id-ID'));
  };

  const handleKol2RencanaChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setKol2RencanaStr('');
      return;
    }
    const num = parseInt(clean, 10);
    setKol2RencanaStr(num.toLocaleString('id-ID'));
  };

  const handleKol2RealisasiChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setKol2RealisasiStr('');
      return;
    }
    const num = parseInt(clean, 10);
    setKol2RealisasiStr(num.toLocaleString('id-ID'));
  };

  const handleKhususRencanaChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setKhususRencanaStr('');
      return;
    }
    const num = parseInt(clean, 10);
    setKhususRencanaStr(num.toLocaleString('id-ID'));
  };

  const handleKhususRealisasiChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setKhususRealisasiStr('');
      return;
    }
    const num = parseInt(clean, 10);
    setKhususRealisasiStr(num.toLocaleString('id-ID'));
  };

  const handleSeksiRencanaChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setSeksiRencanaStr('');
      return;
    }
    const num = parseInt(clean, 10);
    setSeksiRencanaStr(num.toLocaleString('id-ID'));
  };

  const handleSeksiRealisasiChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setSeksiRealisasiStr('');
      return;
    }
    const num = parseInt(clean, 10);
    setSeksiRealisasiStr(num.toLocaleString('id-ID'));
  };

  const handleTargetTahunanChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setTargetTahunanStr('');
      return;
    }
    const num = parseInt(clean, 10);
    setTargetTahunanStr(num.toLocaleString('id-ID'));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      setIsSubmitting(true);

      if (formMode === 'kolekte_dual') {
        // Validasi minimal ada rencana atau realisasi di salah satu kolom
        if (kol1RencanaNum <= 0 && kol1RealisasiNum <= 0 && kol2RencanaNum <= 0 && kol2RealisasiNum <= 0) {
          setErrorMsg('Harap isi nominal rencana atau realisasi pada Kolom Kolekte I atau Kolom Kolekte II.');
          setIsSubmitting(false);
          return;
        }

        // Cari record yang ada jika ingin update
        const existingK1 = penerimaanList.find(
          (p) =>
            p.tahun === tahun &&
            p.bulan === bulan &&
            p.mingguKe === mingguKe &&
            p.kategori === 'kolekte_1'
        );
        const existingK2 = penerimaanList.find(
          (p) =>
            p.tahun === tahun &&
            p.bulan === bulan &&
            p.mingguKe === mingguKe &&
            p.kategori === 'kolekte_2'
        );

        // 1. Simpan Kolekte 1
        if (kol1RencanaNum > 0 || kol1RealisasiNum > 0 || existingK1) {
          const itemK1: PenerimaanMingguan = {
            id:
              initialData?.kategori === 'kolekte_1'
                ? initialData.id
                : existingK1?.id || `pen_k1_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            tahun,
            bulan,
            mingguKe,
            tanggal: tanggal || `${tahun}-${String(bulan).padStart(2, '0')}-01`,
            kategori: 'kolekte_1',
            namaPenerimaan: 'Kolekte I Misa Mingguan (50% Solidaritas & 50% Operasional/Proker)',
            rancangan: kol1RencanaNum,
            realisasi: kol1RealisasiNum,
            alokasiSeksi: 'Umum Paroki',
            tipeSumber: 'paroki',
            isTentatif: false,
            keterangan: kol1Keterangan.trim() || undefined,
            pencatat: 'Bendahara Paroki',
            createdAt: existingK1?.createdAt || initialData?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await onSave(itemK1);
        }

        // 2. Simpan Kolekte 2
        if (kol2RencanaNum > 0 || kol2RealisasiNum > 0 || existingK2) {
          const itemK2: PenerimaanMingguan = {
            id:
              initialData?.kategori === 'kolekte_2'
                ? initialData.id
                : existingK2?.id || `pen_k2_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            tahun,
            bulan,
            mingguKe,
            tanggal: tanggal || `${tahun}-${String(bulan).padStart(2, '0')}-01`,
            kategori: 'kolekte_2',
            namaPenerimaan: 'Kolekte II Misa Mingguan (Dana Pembangunan Tersimpan)',
            rancangan: kol2RencanaNum,
            realisasi: kol2RealisasiNum,
            alokasiSeksi: 'Umum Paroki',
            tipeSumber: 'paroki',
            isTentatif: false,
            keterangan: kol2Keterangan.trim() || undefined,
            pencatat: 'Bendahara Paroki',
            createdAt: existingK2?.createdAt || initialData?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await onSave(itemK2);
        }

        onClose();
      } else if (formMode === 'kolekte_khusus') {
        const khususRencanaNum = parseRupiahInput(khususRencanaStr);
        const khususRealisasiNum = parseRupiahInput(khususRealisasiStr);
        if (!khususNama.trim()) {
          setErrorMsg('Nama atau uraian Kolekte Khusus wajib diisi.');
          setIsSubmitting(false);
          return;
        }

        const itemKhusus: PenerimaanMingguan = {
          id: initialData?.id || `pen_khusus_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tahun,
          bulan,
          mingguKe,
          tanggal: tanggal || `${tahun}-${String(bulan).padStart(2, '0')}-01`,
          kategori: 'kolekte_khusus',
          namaPenerimaan: khususNama.trim(),
          rancangan: khususRencanaNum,
          realisasi: khususRealisasiNum,
          alokasiSeksi: 'Umum Paroki',
          tipeSumber: 'paroki',
          isTentatif: false,
          isHariKhusus: true,
          namaHariKhusus: khususNama.trim(),
          keterangan: khususKeterangan.trim() || undefined,
          pencatat: 'Bendahara Paroki',
          createdAt: initialData?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await onSave(itemKhusus);
        onClose();
      } else {
        // Mode Seksi (Single pos penerimaan seksi)
        const isTargetPSE = isSeksiPSE || seksiAlokasi === 'Seksi PSE';
        const finalNama = isTargetPSE && isCustomPseMode
          ? customPseNama.trim()
          : seksiNama.trim();

        if (!finalNama) {
          setErrorMsg(
            isTargetPSE
              ? 'Pilih salah satu atau ketik nama penerimaan PSE.'
              : 'Nama atau uraian penerimaan seksi wajib diisi.'
          );
          setIsSubmitting(false);
          return;
        }

        // Jika Seksi PSE, simpan pilihan jika baru agar menjadi pilihan pada program berikutnya
        if (isTargetPSE) {
          savePseCustomPenerimaanOption(finalNama);
          setPseOptions(getAllPsePenerimaanOptions());
        }

        let selectedProgName: string | undefined = undefined;
        if (seksiProkerId) {
          const prog = availablePrograms.find((p) => p.id === seksiProkerId);
          if (prog) {
            selectedProgName = prog.namaProgram;
          }
        }

        const isTentatif =
          isTargetTahunanState ||
          seksiTipeSumber === 'seksi_tentatif' ||
          (seksiAlokasi !== 'Umum Paroki' && !isSeksiTetap(seksiAlokasi));

        const itemSeksi: PenerimaanMingguan = {
          id: initialData?.id || `pen_seksi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tahun,
          bulan,
          mingguKe,
          tanggal: tanggal || `${tahun}-${String(bulan).padStart(2, '0')}-01`,
          kategori: seksiKategori,
          namaPenerimaan: finalNama,
          rancangan: isTargetTahunanState ? 0 : seksiRencanaNum, // Untuk target tahunan, rancangan bulanan diset 0 agar tidak melipatgandakan target 12 kali
          realisasi: seksiRealisasiNum,
          isTargetTahunan: isTargetTahunanState,
          targetTahunan: isTargetTahunanState ? targetTahunanNum : undefined,
          alokasiSeksi: seksiAlokasi || 'Seksi PSE',
          tipeSumber: seksiTipeSumber,
          isTentatif,
          alokasiProkerId: seksiProkerId || undefined,
          namaProgramTerkait: selectedProgName,
          keterangan: seksiKeterangan.trim() || undefined,
          pencatat: seksiPencatat.trim() || `Bendahara ${seksiAlokasi}`,
          createdAt: initialData?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await onSave(itemSeksi);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan saat menyimpan data penerimaan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className={`px-5 sm:px-7 py-4.5 flex items-center justify-between shrink-0 shadow-sm text-white ${
          isSeksiPSE
            ? 'bg-gradient-to-r from-amber-800 via-orange-800 to-slate-900'
            : 'bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-xs shadow-inner">
              {isSeksiPSE ? <Heart className="w-5 h-5 text-amber-200" /> : <DollarSign className="w-5 h-5 text-emerald-200" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  {isSeksiPSE
                    ? (initialData ? 'Edit Penerimaan Dana Kasih Seksi PSE' : 'Input Penerimaan Dana Kasih Seksi PSE')
                    : initialData
                    ? 'Edit Rencana & Realisasi Penerimaan'
                    : formMode === 'kolekte_dual'
                    ? 'Input Rencana & Realisasi 2 Kolom (Kolekte I & Kolekte II)'
                    : `Input Penerimaan ${seksiAlokasi}`}
                </h3>
                {isSeksiPSE && (
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-amber-300 text-amber-950">
                    Seksi PSE Mandiri
                  </span>
                )}
                {isBendahara && (
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-blue-200 text-blue-950">
                    💰 Khusus Kolekte
                  </span>
                )}
                {!isSeksiPSE && formMode === 'kolekte_dual' && (
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-300 text-emerald-950">
                    ⚖️ 2 Kolom Side-by-Side
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
                {isSeksiPSE
                  ? 'Perencanaan dan pencatatan dana kasih umat (APP, Amplop Natal, Dana Solidaritas Umat, dsb.)'
                  : formMode === 'kolekte_dual'
                  ? 'Input langsung 2 kolom: Kolekte 1 otomatis dibagi 50:50 (Solidaritas & Operasional/Proker), Kolekte 2 dialokasikan 100% Pembangunan'
                  : 'Pencatatan pos penerimaan khusus karya sosial seksi PSE atau usaha dana seksi'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: KHUSUS PSE TIDAK DITAMPILKAN TAB KOLEKTE */}
        {isSeksiPSE ? (
          <div className="px-5 sm:px-7 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs font-bold text-amber-950">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-amber-600 fill-amber-500" />
              <span>Input Penerimaan Dana Kasih Seksi PSE (APP, Amplop Natal, Kotak Solidaritas)</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black">
              Kelola Mandiri PSE
            </span>
          </div>
        ) : (
          <div className="px-5 sm:px-7 pt-3 pb-1 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setFormMode('kolekte_dual')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                formMode === 'kolekte_dual'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>🏛️ Kolekte I &amp; II (2 Kolom)</span>
            </button>

            <button
              type="button"
              onClick={() => setFormMode('kolekte_khusus')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                formMode === 'kolekte_khusus'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-purple-400" />
              <span>🪙 Kolekte Khusus (Hari Raya)</span>
            </button>

            {!isBendahara && (
              <button
                type="button"
                onClick={() => setFormMode('seksi_single')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  formMode === 'seksi_single'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>⭐ Penerimaan Seksi (PSE / Tentatif)</span>
              </button>
            )}
          </div>
        )}

        {/* Form Body Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-4 overflow-y-auto grow">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Baris Periode Waktu Bersama (Tahun, Bulan, Minggu, Tanggal) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50/90 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-700 mb-1">
                Tahun *
              </label>
              <select
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value) as 2026 | 2027)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-700 mb-1">
                Bulan *
              </label>
              <select
                value={bulan}
                onChange={(e) => {
                  const newB = Number(e.target.value);
                  setBulan(newB);
                  if (formMode !== 'kolekte_khusus') {
                    const currentSundays = getSundaysInMonth(tahun, newB);
                    const sun = currentSundays[mingguKe - 1] || currentSundays[0];
                    if (sun?.tanggal) setTanggal(sun.tanggal);
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                {BULAN_LIST.map((b) => (
                  <option key={b.no} value={b.no}>
                    {b.no}. {b.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-700 mb-1">
                Minggu Ke- *
              </label>
              <select
                value={mingguKe}
                onChange={(e) => {
                  const newW = Number(e.target.value) as 1 | 2 | 3 | 4 | 5;
                  setMingguKe(newW);
                  if (formMode !== 'kolekte_khusus') {
                    const currentSundays = getSundaysInMonth(tahun, bulan);
                    const sun = currentSundays[newW - 1] || currentSundays[0];
                    if (sun?.tanggal) setTanggal(sun.tanggal);
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                {getSundaysInMonth(tahun, bulan).map((sun) => (
                  <option key={sun.mingguKe} value={sun.mingguKe}>
                    {sun.labelShort} (Hari Minggu)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-700 mb-1">
                Tanggal Transaksi *
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                required
              />
              <div className="text-[10px] font-bold text-emerald-800 mt-0.5 truncate">
                {tanggal ? formatIndonesianDate(tanggal, true) : 'Pilih tanggal'}
              </div>
            </div>
          </div>

          {/* ===================================================================
              MODE 1: DUA KOLOM SIDE-BY-SIDE UNTUK KOLEKTE I & KOLEKTE II
              =================================================================== */}
          {formMode === 'kolekte_dual' ? (
            <div className="space-y-4">
              {/* Layout 2 Kolom Berdampingan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ---------------- KOLOM 1: KOLEKTE I ---------------- */}
                <div className="bg-blue-50/70 rounded-2xl border-2 border-blue-300/80 p-4 space-y-3 flex flex-col justify-between shadow-2xs">
                  <div>
                    {/* Header Kolom 1 */}
                    <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                          <Scale className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-blue-950">
                            Kolekte I (Misa Mingguan)
                          </h4>
                          <span className="text-[10px] text-blue-800 font-extrabold bg-blue-100 px-1.5 py-0.5 rounded">
                            ⚖️ Aturan Pembagian 50:50
                          </span>
                        </div>
                      </div>
                      <span className="text-[10.5px] font-bold text-slate-500">
                        Kolom 1
                      </span>
                    </div>

                    {/* Inputs Kolom 1: Rencana & Realisasi */}
                    <div className="mt-3 space-y-3">
                      {/* 1. Rencana Penerimaan Kolekte I */}
                      <div className="bg-white p-3 rounded-xl border border-blue-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black uppercase tracking-wider text-blue-900">
                            Target Rencana Kolekte I
                          </label>
                          <span className="text-[9.5px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            Rancangan
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={kol1RencanaStr}
                            onChange={(e) => handleKol1RencanaChange(e.target.value)}
                            placeholder="0"
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                        {/* Quick preset Rencana Kol 1 */}
                        <div className="flex items-center gap-1 pt-1 flex-wrap">
                          <span className="text-[9.5px] text-slate-400 font-bold">Preset:</span>
                          {[8000000, 10000000, 12000000, 15000000, 18000000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setKol1RencanaStr(preset.toLocaleString('id-ID'))}
                              className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-900 text-[9.5px] font-bold border border-blue-200 transition-colors cursor-pointer"
                            >
                              {preset / 1000000} Jt
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. Realisasi Penerimaan Kolekte I */}
                      <div className="bg-white p-3 rounded-xl border border-blue-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black uppercase tracking-wider text-blue-900">
                            Realisasi Aktual Kolekte I
                          </label>
                          <button
                            type="button"
                            onClick={() => setKol1RealisasiStr(kol1RencanaStr)}
                            className="text-[9.5px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                            title="Salin nilai dari target rencana"
                          >
                            📋 Samakan Rencana
                          </button>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={kol1RealisasiStr}
                            onChange={(e) => handleKol1RealisasiChange(e.target.value)}
                            placeholder="0 (Belum dihitung / riil masuk)"
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* Catatan Tambahan Kolom 1 */}
                      <div>
                        <input
                          type="text"
                          value={kol1Keterangan}
                          onChange={(e) => setKol1Keterangan(e.target.value)}
                          placeholder="Catatan misa / perincian amplop Kolekte I"
                          className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    {/* LIVE 50:50 BREAKDOWN CARD KOLEKTE I */}
                    <div className="mt-3 p-3 bg-white rounded-xl border border-blue-300 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-blue-950 flex items-center gap-1">
                          <Split className="w-3.5 h-3.5 text-blue-600" />
                          <span>Langsung Dibagi Otomatis (50:50):</span>
                        </span>
                        <span className="text-[10px] font-bold text-blue-700">
                          {kol1RealisasiNum > 0 ? 'Berdasarkan Realisasi' : 'Berdasarkan Rencana'}
                        </span>
                      </div>

                      {/* 2 Kotak Pembagian */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* 50% Dana Solidaritas */}
                        <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 space-y-1">
                          <div className="text-[9.5px] font-extrabold uppercase tracking-wide text-blue-900">
                            1. Dana Solidaritas (50%)
                          </div>
                          <div className="text-xs sm:text-sm font-black text-blue-900">
                            {formatRupiah(
                              kol1RealisasiNum > 0
                                ? kol1RealisasiSplit.danaSolidaritas
                                : kol1RencanaSplit.danaSolidaritas
                            )}
                          </div>
                          <div className="text-[9px] text-blue-700 leading-tight">
                            Disetor ke Keuskupan
                          </div>
                          {kol1RealisasiNum > 0 && (
                            <div className="text-[9px] text-slate-500 pt-0.5 border-t border-blue-200">
                              Target Rencana: {formatRupiah(kol1RencanaSplit.danaSolidaritas)}
                            </div>
                          )}
                        </div>

                        {/* 50% Operasional & Proker */}
                        <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-300 space-y-1">
                          <div className="text-[9.5px] font-extrabold uppercase tracking-wide text-emerald-900">
                            2. Operasional &amp; Proker (50%)
                          </div>
                          <div className="text-xs sm:text-sm font-black text-emerald-800">
                            {formatRupiah(
                              kol1RealisasiNum > 0
                                ? kol1RealisasiSplit.danaOperasionalDanProker
                                : kol1RencanaSplit.danaOperasionalDanProker
                            )}
                          </div>
                          <div className="text-[9px] text-emerald-700 font-bold leading-tight">
                            ✓ Bisa Dipakai Paroki &amp; Seksi
                          </div>
                          {kol1RealisasiNum > 0 && (
                            <div className="text-[9px] text-slate-500 pt-0.5 border-t border-emerald-200">
                              Target Rencana: {formatRupiah(kol1RencanaSplit.danaOperasionalDanProker)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Capaian Kolekte I */}
                      {kol1RealisasiNum > 0 && (
                        <div className="pt-1.5 border-t border-blue-100 flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-600">
                            Capaian: <strong className="text-blue-900">{kol1Persen}%</strong>
                          </span>
                          <span className={kol1Selisih >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            {kol1Selisih >= 0 ? 'Surplus +' : 'Kurang '}
                            {formatRupiah(Math.abs(kol1Selisih))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ---------------- KOLOM 2: KOLEKTE II ---------------- */}
                <div className="bg-emerald-50/70 rounded-2xl border-2 border-emerald-300/80 p-4 space-y-3 flex flex-col justify-between shadow-2xs">
                  <div>
                    {/* Header Kolom 2 */}
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-xs shadow-xs">
                          <Hammer className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-emerald-950">
                            Kolekte II (Dana Pembangunan)
                          </h4>
                          <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-100 px-1.5 py-0.5 rounded">
                            🏛️ 100% Khusus Pembangunan Fisik
                          </span>
                        </div>
                      </div>
                      <span className="text-[10.5px] font-bold text-slate-500">
                        Kolom 2
                      </span>
                    </div>

                    {/* Inputs Kolom 2: Rencana & Realisasi */}
                    <div className="mt-3 space-y-3">
                      {/* 1. Rencana Penerimaan Kolekte II */}
                      <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                            Target Rencana Kolekte II
                          </label>
                          <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Rancangan
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={kol2RencanaStr}
                            onChange={(e) => handleKol2RencanaChange(e.target.value)}
                            placeholder="0"
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                          />
                        </div>
                        {/* Quick preset Rencana Kol 2 */}
                        <div className="flex items-center gap-1 pt-1 flex-wrap">
                          <span className="text-[9.5px] text-slate-400 font-bold">Preset:</span>
                          {[5000000, 8000000, 10000000, 12000000, 15000000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setKol2RencanaStr(preset.toLocaleString('id-ID'))}
                              className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-[9.5px] font-bold border border-emerald-200 transition-colors cursor-pointer"
                            >
                              {preset / 1000000} Jt
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. Realisasi Penerimaan Kolekte II */}
                      <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                            Realisasi Aktual Kolekte II
                          </label>
                          <button
                            type="button"
                            onClick={() => setKol2RealisasiStr(kol2RencanaStr)}
                            className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                            title="Salin nilai dari target rencana"
                          >
                            📋 Samakan Rencana
                          </button>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={kol2RealisasiStr}
                            onChange={(e) => handleKol2RealisasiChange(e.target.value)}
                            placeholder="0 (Belum dihitung / riil masuk)"
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* Catatan Tambahan Kolom 2 */}
                      <div>
                        <input
                          type="text"
                          value={kol2Keterangan}
                          onChange={(e) => setKol2Keterangan(e.target.value)}
                          placeholder="Catatan pos pembangunan / amplop Kolekte II"
                          className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    {/* DETAIL ATURAN DANA PEMBANGUNAN KOLEKTE II */}
                    <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-300 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-emerald-950 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Alokasi Dana Pembangunan:</span>
                        </span>
                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                          100% Tersimpan
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 space-y-1">
                        <div className="text-[10px] font-extrabold uppercase text-emerald-900">
                          Masuk Kas Dana Pembangunan:
                        </div>
                        <div className="text-sm sm:text-base font-black text-emerald-800">
                          {formatRupiah(kol2RealisasiNum > 0 ? kol2RealisasiNum : kol2RencanaNum)}
                        </div>
                        <p className="text-[9.5px] text-emerald-900/90 leading-relaxed font-medium">
                          Tersimpan khusus di kas pembangunan dan <strong>hanya digunakan jika ada proyek pembangunan / renovasi fisik gereja</strong>.
                        </p>
                      </div>

                      {/* Status Capaian Kolekte II */}
                      {kol2RealisasiNum > 0 && (
                        <div className="pt-1.5 border-t border-emerald-100 flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-600">
                            Capaian: <strong className="text-emerald-900">{kol2Persen}%</strong>
                          </span>
                          <span className={kol2Selisih >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            {kol2Selisih >= 0 ? 'Surplus +' : 'Kurang '}
                            {formatRupiah(Math.abs(kol2Selisih))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RINGKASAN GABUNGAN 2 KOLOM (Kolekte I + Kolekte II) */}
              <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl border border-slate-700/80 space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-emerald-300 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    <span>Ringkasan Penerimaan Minggu Ini (Kol I + Kol II)</span>
                  </span>
                  <span className="text-[10px] text-slate-300">
                    Bulan {bulan} · Minggu ke-{mingguKe}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  {/* Total Rencana */}
                  <div className="bg-white/10 p-2 rounded-xl backdrop-blur-xs">
                    <span className="text-[9.5px] text-slate-300 font-bold block uppercase">
                      Total Rencana:
                    </span>
                    <strong className="text-xs sm:text-sm font-black text-white">
                      {formatRupiah(totalRencanaKolekte)}
                    </strong>
                  </div>

                  {/* Total Realisasi */}
                  <div className="bg-white/10 p-2 rounded-xl backdrop-blur-xs">
                    <span className="text-[9.5px] text-slate-300 font-bold block uppercase">
                      Total Realisasi:
                    </span>
                    <strong className="text-xs sm:text-sm font-black text-emerald-300">
                      {formatRupiah(totalRealisasiKolekte)}
                    </strong>
                  </div>

                  {/* Yang Bisa Dipakai Operasional & Proker */}
                  <div className="bg-emerald-500/20 border border-emerald-400/40 p-2 rounded-xl">
                    <span className="text-[9.5px] text-emerald-200 font-extrabold block uppercase">
                      Bisa Dipakai Proker:
                    </span>
                    <strong className="text-xs sm:text-sm font-black text-emerald-300">
                      {formatRupiah(totalBisaDipakaiOperasionalProker)}
                    </strong>
                    <span className="text-[8.5px] text-emerald-200 block">50% Kolekte I</span>
                  </div>

                  {/* Pembangunan Tersimpan */}
                  <div className="bg-teal-500/20 border border-teal-400/40 p-2 rounded-xl">
                    <span className="text-[9.5px] text-teal-200 font-extrabold block uppercase">
                      Dana Pembangunan:
                    </span>
                    <strong className="text-xs sm:text-sm font-black text-teal-300">
                      {formatRupiah(totalDanaPembangunan)}
                    </strong>
                    <span className="text-[8.5px] text-teal-200 block">100% Kolekte II</span>
                  </div>
                </div>
              </div>
            </div>
          ) : formMode === 'kolekte_khusus' ? (
            /* ===================================================================
               MODE 1B: INPUT KOLEKTE KHUSUS (MISA HARI RAYA / LITURGI)
               =================================================================== */
            <div className="p-4 bg-purple-50/70 rounded-2xl border-2 border-purple-300 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-purple-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-purple-950">
                      Input Kolekte Khusus (Hari Raya / Liturgi)
                    </h4>
                    <span className="text-[10px] text-purple-700 font-bold">
                      Kas Khusus Liturgi Paroki
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-purple-900 font-extrabold bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                  🏛️ Paroki
                </span>
              </div>

              {/* Uraian Kolekte Khusus & Pilihan Cepat Hari Raya */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-purple-950">
                    Uraian / Nama Kolekte Khusus *
                  </label>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setKhususNama(e.target.value);
                        const lower = e.target.value.toLowerCase();
                        if (lower.includes('24 des')) setTanggal(`${tahun}-12-24`);
                        else if (lower.includes('25 des') || lower.includes('natal')) setTanggal(`${tahun}-12-25`);
                        else if (lower.includes('31 des') || lower.includes('tutup tahun')) setTanggal(`${tahun}-12-31`);
                        else if (lower.includes('1 jan') || lower.includes('bunda allah')) setTanggal(`${tahun}-01-01`);
                        else if (lower.includes('8 des') || lower.includes('pelindung')) setTanggal(`${tahun}-12-08`);
                        e.target.value = '';
                      }
                    }}
                    className="text-[10px] font-bold text-purple-900 bg-white border border-purple-300 rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>
                      ⚡ Pilih Cepat Hari Raya...
                    </option>
                    {HARI_KHUSUS_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={khususNama}
                  onChange={(e) => setKhususNama(e.target.value)}
                  placeholder="Contoh: Kolekte Khusus Misa Hari Raya Natal / Paskah"
                  className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                  required
                />
              </div>

              {/* 2 Kolom Nominal: Rencana & Realisasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Rencana Kolekte Khusus */}
                <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-purple-950 block">
                    Target Rencana (Rp) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      value={khususRencanaStr}
                      onChange={(e) => handleKhususRencanaChange(e.target.value)}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Realisasi Kolekte Khusus */}
                <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-purple-950 block">
                      Realisasi Masuk (Rp)
                    </label>
                    <button
                      type="button"
                      onClick={() => setKhususRealisasiStr(khususRencanaStr)}
                      className="text-[9.5px] font-bold text-purple-700 hover:underline cursor-pointer"
                    >
                      = Rencana
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      value={khususRealisasiStr}
                      onChange={(e) => handleKhususRealisasiChange(e.target.value)}
                      placeholder="0 (Belum dihitung)"
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-black text-purple-950 focus:outline-none focus:border-purple-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  value={khususKeterangan}
                  onChange={(e) => setKhususKeterangan(e.target.value)}
                  placeholder="Catatan tambahan liturgi misa..."
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>
          ) : (
            /* ===================================================================
               MODE 2: SINGLE INPUT FORM UNTUK SEKSI (PSE / TENTATIF SEKSI)
               =================================================================== */
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-950">
                      Input Rencana &amp; Realisasi Penerimaan Seksi
                    </h4>
                    <span className="text-[10px] text-amber-800 font-bold">
                      {isSeksiPSE
                        ? 'Seksi PSE (Karya Sosial & Kemasyarakatan)'
                        : `Unit / Seksi: ${seksiAlokasi}`}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-amber-800 font-extrabold bg-amber-100 px-2 py-0.5 rounded-full">
                  Diisi Oleh Seksi
                </span>
              </div>

              {/* Unit Seksi & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Seksi / Unit Penerima *
                  </label>
                  {isSeksiUser ? (
                    <div className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-amber-900">
                      {seksiAlokasi} (Unit Anda)
                    </div>
                  ) : (
                    <select
                      value={seksiAlokasi}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSeksiAlokasi(val);
                        setSeksiTipeSumber(isSeksiTetap(val) ? 'seksi_tetap' : 'seksi_tentatif');
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                    >
                      <option value="Seksi PSE">Seksi PSE (Pengembangan Sosial Ekonomi)</option>
                      <option value="Seksi KKI">Seksi KKI (Karya Kepausan Indonesia)</option>
                      {MASTER_DIVISIONS.filter((d) => d.nama !== 'Seksi PSE' && d.nama !== 'Seksi KKI').map((d) => (
                        <option key={d.id} value={d.nama}>
                          {d.nama}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Kategori Pos Penerimaan *
                  </label>
                  <select
                    value={seksiKategori}
                    onChange={(e) => setSeksiKategori(e.target.value as KategoriPenerimaan)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                  >
                    {availableCategories.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nama Penerimaan: Khusus PSE vs Seksi Lain */}
              {(isSeksiPSE || seksiAlokasi === 'Seksi PSE') ? (
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-amber-50/80 border-2 border-amber-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                      <span>Pilihan Nama Penerimaan Seksi PSE *</span>
                    </label>
                    <span className="text-[10px] text-amber-900 font-extrabold bg-amber-200/80 px-2 py-0.5 rounded-full self-start sm:self-auto">
                      Standar: 3 Pos Utama + Pilihan Kustom
                    </span>
                  </div>

                  {/* Pills Pilihan Standar & Kustom */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {pseOptions.map((opt) => {
                      const isSelected = !isCustomPseMode && seksiNama === opt;
                      const isDefault = (DEFAULT_PSE_PENERIMAAN_OPTIONS as readonly string[]).includes(opt);

                      return (
                        <div
                          key={opt}
                          className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400/50'
                              : 'bg-white text-slate-800 border-amber-200 hover:border-amber-400 hover:bg-amber-100/50 shadow-2xs'
                          }`}
                          onClick={() => {
                            setIsCustomPseMode(false);
                            setSeksiNama(opt);
                            if (opt.toLowerCase().includes('solidaritas')) {
                              setIsTargetTahunanState(true);
                            }
                          }}
                        >
                          <span>{opt}</span>
                          {!isDefault && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = removePseCustomPenerimaanOption(opt);
                                setPseOptions(updated);
                                if (seksiNama === opt) {
                                  setSeksiNama('Dana Solidaritas Umat');
                                }
                              }}
                              className="ml-1 w-4 h-4 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center justify-center text-[10px] font-black opacity-80 group-hover:opacity-100 transition-opacity"
                              title="Hapus pilihan tambahan ini"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Tombol Pilihan Tambahan Baru */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomPseMode(true);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border border-dashed ${
                        isCustomPseMode
                          ? 'bg-amber-700 text-white border-amber-800 shadow-xs ring-2 ring-amber-500'
                          : 'bg-amber-100/80 hover:bg-amber-200 text-amber-950 border-amber-400'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>+ Tambah Pilihan Baru / Ketik Sendiri</span>
                    </button>
                  </div>

                  {/* Input Teks jika memilih ketik sendiri */}
                  {isCustomPseMode && (
                    <div className="pt-2.5 border-t border-amber-200 space-y-1.5 animate-in fade-in duration-150">
                      <label className="block text-[10.5px] font-black uppercase tracking-wider text-amber-900">
                        Ketik Nama Pilihan Baru (Akan Disimpan untuk Program Berikutnya):
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={customPseNama}
                          onChange={(e) => {
                            setCustomPseNama(e.target.value);
                            setSeksiNama(e.target.value);
                          }}
                          placeholder="Contoh: Donatur Khusus Beasiswa Kasih / Bazar Amal PSE"
                          className="flex-1 px-3.5 py-2 bg-white border border-amber-400 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customPseNama.trim()) {
                              const updated = savePseCustomPenerimaanOption(customPseNama.trim());
                              setPseOptions(updated);
                              setSeksiNama(customPseNama.trim());
                              setIsCustomPseMode(false);
                            }
                          }}
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer shrink-0"
                        >
                          Simpan Pilihan
                        </button>
                      </div>
                      <p className="text-[10px] text-amber-900/80 font-medium">
                        💡 Pilihan yang Anda ketik akan otomatis disimpan di sistem dan langsung menjadi opsi tombol pilihan pada program dan pencatatan penerimaan berikutnya.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Non-PSE Seksi Nama Input */
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Nama / Uraian Penerimaan Seksi *
                  </label>
                  <input
                    type="text"
                    value={seksiNama}
                    onChange={(e) => setSeksiNama(e.target.value)}
                    placeholder="Contoh: Usaha Dana Penjualan Makanan & Donatur Khusus Seksi"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-600"
                    required
                  />
                </div>
              )}

              {/* Opsi Target Tahunan (Khusus PSE / Dana Solidaritas Umat Sepanjang Tahun Tentatif) */}
              {(isSeksiPSE || seksiAlokasi === 'Seksi PSE') && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-amber-100/80 rounded-xl border border-amber-300 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-800 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-amber-950">
                          Format Target: {isTargetTahunanState ? 'Target Tahunan (Sepanjang Tahun)' : 'Target Bulanan'}
                        </span>
                        {isTargetTahunanState && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-300 text-amber-950">
                            Tentatif Sepanjang Tahun
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-amber-900 leading-tight mt-0.5">
                        {isTargetTahunanState
                          ? 'Target berlaku untuk 1 tahun penuh. Realisasi penerimaan di bulan berapa saja akan otomatis mengurangi target secara tahunan.'
                          : 'Target dihitung per bulan terpisah (bukan akumulasi tahunan).'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTargetTahunanState(!isTargetTahunanState)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer shrink-0 ${
                      isTargetTahunanState
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-300'
                    }`}
                  >
                    {isTargetTahunanState ? '✓ Mode Target Tahunan Aktif' : 'Ganti ke Target Tahunan'}
                  </button>
                </div>
              )}

              {/* Input Nominal: Mode Target Tahunan vs Target Bulanan Biasa */}
              {isTargetTahunanState ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Target Rencana Tahunan (Rp / Tahun) */}
                    <div className="bg-white p-3.5 rounded-xl border-2 border-amber-400 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-amber-600" />
                          <span>Target Rencana Pertahun (Rp / Tahun) *</span>
                        </label>
                        <span className="text-[9.5px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                          🗓️ 1 Tahun Penuh
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                        <input
                          type="text"
                          value={targetTahunanStr}
                          onChange={(e) => handleTargetTahunanChange(e.target.value)}
                          placeholder="50.000.000"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                        />
                      </div>
                      {/* Presets Target Pertahun */}
                      <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                        <span className="text-[9.5px] text-slate-400 font-bold">Preset:</span>
                        {[25000000, 50000000, 75000000, 100000000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setTargetTahunanStr(preset.toLocaleString('id-ID'))}
                            className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-950 text-[9.5px] font-bold border border-amber-200 transition-colors cursor-pointer"
                          >
                            {preset / 1000000} Jt/Thn
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium leading-tight">
                        Target penerimaan untuk 1 tahun penuh. Realisasi penerimaan di bulan berapa saja akan otomatis mengurangi sisa target ini.
                      </p>
                    </div>

                    {/* 2. Realisasi Bulan Ini */}
                    <div className="bg-white p-3.5 rounded-xl border-2 border-emerald-400 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Realisasi Kas Masuk Bulan Ini (Rp)</span>
                        </label>
                        <span className="text-[9.5px] font-black text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                          Bulan {BULAN_LIST.find((b) => b.no === bulan)?.nama || bulan}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                        <input
                          type="text"
                          value={seksiRealisasiStr}
                          onChange={(e) => handleSeksiRealisasiChange(e.target.value)}
                          placeholder="0 (Belum ada dana masuk di bulan ini)"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium leading-tight">
                        Nominal dana solidaritas yang riil diterima pada bulan {BULAN_LIST.find((b) => b.no === bulan)?.nama || bulan}.
                      </p>
                    </div>
                  </div>

                  {/* KOTAK LIVE DEDUKSI TARGET TAHUNAN SECARA REAL-TIME */}
                  <div className="p-3.5 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/70 rounded-2xl border-2 border-amber-300 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-amber-950 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-amber-600" />
                        <span>Kalkulasi Deduksi Target Tahunan (Live Real-Time)</span>
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                        {livePersentaseTahunan}% Terkumpul
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {/* Target Tahunan */}
                      <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                        <span className="text-[9.5px] text-slate-400 font-bold uppercase block">
                          Target 1 Tahun:
                        </span>
                        <strong className="text-xs sm:text-sm font-black text-slate-900">
                          {formatRupiah(effectiveTargetTahunan)}
                        </strong>
                        <span className="text-[8.5px] text-slate-400 block">Pagu Tahunan</span>
                      </div>

                      {/* Realisasi Bulan Ini */}
                      <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                        <span className="text-[9.5px] text-slate-400 font-bold uppercase block">
                          Masuk Bulan Ini:
                        </span>
                        <strong className="text-xs sm:text-sm font-black text-emerald-700">
                          {formatRupiah(seksiRealisasiNum)}
                        </strong>
                        <span className="text-[8.5px] text-slate-400 block">
                          Bulan {BULAN_LIST.find((b) => b.no === bulan)?.nama || bulan}
                        </span>
                      </div>

                      {/* Total Realisasi Kumulatif */}
                      <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                        <span className="text-[9.5px] text-slate-400 font-bold uppercase block">
                          Total Realisasi Kumulatif:
                        </span>
                        <strong className="text-xs sm:text-sm font-black text-amber-900">
                          {formatRupiah(liveTotalRealisasiTahunan)}
                        </strong>
                        <span className="text-[8.5px] text-slate-400 block">
                          {otherMonthsRealization > 0 ? `+${formatRupiah(otherMonthsRealization)} bln lain` : 'Sepanjang tahun'}
                        </span>
                      </div>

                      {/* Sisa Target Tahunan (Mengurangi Target) */}
                      <div className={`p-2.5 rounded-xl border ${
                        isSurplusTahunan
                          ? 'bg-emerald-100/80 border-emerald-300 text-emerald-950'
                          : 'bg-amber-200/80 border-amber-400 text-amber-950'
                      }`}>
                        <span className="text-[9.5px] font-black uppercase block tracking-wider">
                          {isSurplusTahunan ? '✓ Surplus Target:' : '⚡ Sisa Target Tahunan:'}
                        </span>
                        <strong className="text-xs sm:text-sm font-black block">
                          {isSurplusTahunan ? `+${formatRupiah(liveSurplusTahunan)}` : formatRupiah(liveSisaTargetTahunan)}
                        </strong>
                        <span className="text-[8.5px] font-bold block">
                          {isSurplusTahunan ? 'Target tercapai 100%' : 'Otomatis Berkurang'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="w-full h-2 rounded-full bg-amber-200 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            isSurplusTahunan ? 'bg-emerald-600' : 'bg-gradient-to-r from-amber-500 to-amber-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, livePersentaseTahunan))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9.5px] text-amber-900 font-bold">
                        <span>Realisasi di bulan apa pun langsung mengurangi target tahunan.</span>
                        <span>{livePersentaseTahunan}% / 100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* 2 Kotak: Rencana vs Realisasi Seksi Bulanan Biasa */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-amber-300 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                        1. Target Rencana Penerimaan (Rp) *
                      </label>
                      <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        Rancangan Bulanan
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="text"
                        value={seksiRencanaStr}
                        onChange={(e) => handleSeksiRencanaChange(e.target.value)}
                        placeholder="0"
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-300 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                        2. Realisasi Penerimaan (Rp)
                      </label>
                      <button
                        type="button"
                        onClick={() => setSeksiRealisasiStr(seksiRencanaStr)}
                        className="text-[9.5px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        📋 Samakan Rencana
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="text"
                        value={seksiRealisasiStr}
                        onChange={(e) => handleSeksiRealisasiChange(e.target.value)}
                        placeholder="0"
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tautkan ke Program Kerja Seksi (Opsional) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Tautkan ke Program Kerja Seksi (Opsional)
                </label>
                <select
                  value={seksiProkerId}
                  onChange={(e) => setSeksiProkerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-600"
                >
                  <option value="">-- Tidak Terikat Proker Khusus (Kas Umum Seksi) --</option>
                  {availablePrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.penanggungjawab?.divisi || 'Umum'}] {p.namaProgram} (Rp {p.estimasiAnggaran.toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Keterangan & Pencatat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Catatan / Kwitansi
                  </label>
                  <input
                    type="text"
                    value={seksiKeterangan}
                    onChange={(e) => setSeksiKeterangan(e.target.value)}
                    placeholder="No kwitansi / catatan donatur"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pencatat / Bendahara Seksi
                  </label>
                  <input
                    type="text"
                    value={seksiPencatat}
                    onChange={(e) => setSeksiPencatat(e.target.value)}
                    placeholder={`Bendahara ${seksiAlokasi}`}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-slate-500 font-medium">
              {formMode === 'kolekte_dual'
                ? 'Menyimpan Kolom Kolekte I (50:50) dan Kolom Kolekte II (Pembangunan)'
                : `Menyimpan pos penerimaan seksi ${seksiAlokasi}`}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting
                  ? 'Menyimpan...'
                  : formMode === 'kolekte_dual'
                  ? 'Simpan Kolekte I & II'
                  : 'Simpan Penerimaan Seksi'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
