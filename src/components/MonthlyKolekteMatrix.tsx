import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Scale,
  Hammer,
  Sparkles,
  Building,
  TrendingUp,
  RotateCcw,
  Info,
  ShieldCheck,
  Split,
  ChevronRight,
  Coins,
  Check,
  Target,
} from 'lucide-react';
import {
  PenerimaanMingguan,
  KategoriPenerimaan,
  calculateKolekte1Split,
} from '../types/penerimaan';
import { AuthSession } from '../types/auth';
import {
  BULAN_LIST,
  formatRupiah,
  parseRupiahInput,
  formatIndonesianDate,
  getSundaysInMonth,
  SundayInfo,
  HARI_KHUSUS_PRESETS,
} from '../utils/formatters';

interface WeekKolekteRow {
  mingguKe: 1 | 2 | 3 | 4 | 5;
  tanggal: string;
  // Kolekte I
  k1Id?: string;
  k1Rencana: number;
  k1RencanaStr: string;
  k1Realisasi: number;
  k1RealisasiStr: string;
  k1Keterangan: string;
  // Kolekte II
  k2Id?: string;
  k2Rencana: number;
  k2RencanaStr: string;
  k2Realisasi: number;
  k2RealisasiStr: string;
  k2Keterangan: string;
}

interface KolekteKhususRow {
  id: string;
  mingguKe: 1 | 2 | 3 | 4 | 5;
  tanggal: string; // Tanggal kalender bebas untuk hari perayaan khusus
  kategori: KategoriPenerimaan; // 'kolekte_khusus' | 'kolekte_1' | 'kolekte_2'
  namaPenerimaan: string;
  rancangan: number;
  rancanganStr: string;
  realisasi: number;
  realisasiStr: string;
  keterangan: string;
  isNew?: boolean;
}

interface MonthlyKolekteMatrixProps {
  tahun: 2026 | 2027;
  bulan: number;
  penerimaanList: PenerimaanMingguan[];
  onSavePenerimaan: (item: PenerimaanMingguan) => Promise<void>;
  onDeletePenerimaan: (id: string) => Promise<void>;
  onMonthChange: (newMonth: number) => void;
  onYearChange: (newYear: 2026 | 2027) => void;
  authSession: AuthSession | null;
  isBendahara?: boolean;
  isDpph?: boolean;
  modeFocus?: 'all' | 'rencana' | 'realisasi';
}

export const MonthlyKolekteMatrix: React.FC<MonthlyKolekteMatrixProps> = ({
  tahun,
  bulan,
  penerimaanList,
  onSavePenerimaan,
  onDeletePenerimaan,
  onMonthChange,
  onYearChange,
  authSession,
  isBendahara = true,
  isDpph = false,
  modeFocus = 'all',
}) => {
  // State 5 Minggu untuk Bulan Ini
  const [rows, setRows] = useState<WeekKolekteRow[]>([]);
  // State Kolekte Khusus (Bila Ada di Bulan Ini)
  const [khususRows, setKhususRows] = useState<KolekteKhususRow[]>([]);
  // Saving states
  const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
  const [savingWeek, setSavingWeek] = useState<number | null>(null);
  const [savingKhususId, setSavingKhususId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const namaBulanAktif = BULAN_LIST[bulan - 1]?.nama || `Bulan ${bulan}`;

  // Kalender Hari Minggu Riil dalam bulan terpilih
  const sundays = useMemo(() => getSundaysInMonth(tahun, bulan), [tahun, bulan]);

  // Inisialisasi baris minggu kalender hari Minggu & hari khusus saat tahun atau bulan berubah
  useEffect(() => {
    const currentSundays = getSundaysInMonth(tahun, bulan);

    const newRows: WeekKolekteRow[] = currentSundays.map((sun) => {
      const w = sun.mingguKe;
      const defaultTgl = sun.tanggal; // Hari Minggu riil dari kalender

      const existingK1 = penerimaanList.find(
        (p) =>
          p.tahun === tahun &&
          p.bulan === bulan &&
          p.mingguKe === w &&
          p.kategori === 'kolekte_1' &&
          !p.isHariKhusus
      );

      const existingK2 = penerimaanList.find(
        (p) =>
          p.tahun === tahun &&
          p.bulan === bulan &&
          p.mingguKe === w &&
          p.kategori === 'kolekte_2' &&
          !p.isHariKhusus
      );

      const k1R = existingK1 ? existingK1.rancangan || 0 : 12000000;
      const k1A = existingK1 ? existingK1.realisasi || 0 : 0;
      const k2R = existingK2 ? existingK2.rancangan || 0 : 10000000;
      const k2A = existingK2 ? existingK2.realisasi || 0 : 0;

      return {
        mingguKe: w,
        tanggal: existingK1?.tanggal || existingK2?.tanggal || defaultTgl,
        k1Id: existingK1?.id,
        k1Rencana: k1R,
        k1RencanaStr: k1R > 0 ? k1R.toLocaleString('id-ID') : '0',
        k1Realisasi: k1A,
        k1RealisasiStr: k1A > 0 ? k1A.toLocaleString('id-ID') : '',
        k1Keterangan: existingK1?.keterangan || '',
        k2Id: existingK2?.id,
        k2Rencana: k2R,
        k2RencanaStr: k2R > 0 ? k2R.toLocaleString('id-ID') : '0',
        k2Realisasi: k2A,
        k2RealisasiStr: k2A > 0 ? k2A.toLocaleString('id-ID') : '',
        k2Keterangan: existingK2?.keterangan || '',
      };
    });

    setRows(newRows);

    // Bersihkan record kolekte rutin yang melebihi jumlah hari Minggu di kalender (misal: minggu 5 di bulan dengan 4 minggu)
    const dangling = penerimaanList.filter(
      (p) =>
        p.tahun === tahun &&
        p.bulan === bulan &&
        !p.isHariKhusus &&
        (p.kategori === 'kolekte_1' || p.kategori === 'kolekte_2') &&
        p.mingguKe > currentSundays.length
    );
    if (dangling.length > 0) {
      dangling.forEach((d) => onDeletePenerimaan(d.id));
    }

    // Ambil Kolekte Khusus / Hari Khusus di luar rutin hari Minggu pada bulan ini
    const existingKhusus: KolekteKhususRow[] = penerimaanList
      .filter(
        (p) =>
          p.tahun === tahun &&
          p.bulan === bulan &&
          (p.kategori === 'kolekte_khusus' || p.isHariKhusus)
      )
      .map((k) => ({
        id: k.id,
        mingguKe: (k.mingguKe as 1 | 2 | 3 | 4 | 5) || 1,
        tanggal: k.tanggal,
        kategori: k.kategori || 'kolekte_khusus',
        namaPenerimaan: k.namaPenerimaan,
        rancangan: k.rancangan || 0,
        rancanganStr: k.rancangan ? k.rancangan.toLocaleString('id-ID') : '0',
        realisasi: k.realisasi || 0,
        realisasiStr: k.realisasi ? k.realisasi.toLocaleString('id-ID') : '',
        keterangan: k.keterangan || '',
        isNew: false,
      }));

    setKhususRows(existingKhusus);
  }, [tahun, bulan]); // Hanya saat tahun atau bulan berubah!

  // Handler input nominal dengan string formatting aman
  const handleUpdateNominal = (
    mingguKe: 1 | 2 | 3 | 4 | 5,
    field: 'k1Rencana' | 'k1Realisasi' | 'k2Rencana' | 'k2Realisasi',
    rawVal: string
  ) => {
    const num = parseRupiahInput(rawVal);
    const str = num > 0 ? num.toLocaleString('id-ID') : rawVal.trim() === '' ? '' : '0';

    setRows((prev) =>
      prev.map((r) => {
        if (r.mingguKe === mingguKe) {
          return {
            ...r,
            [field]: num,
            [`${field}Str`]: str,
          };
        }
        return r;
      })
    );
  };

  // Handler input tanggal atau keterangan
  const handleUpdateText = (
    mingguKe: 1 | 2 | 3 | 4 | 5,
    field: 'tanggal' | 'k1Keterangan' | 'k2Keterangan',
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.mingguKe === mingguKe ? { ...r, [field]: value } : r))
    );
  };

  // Salin target rencana ke realisasi untuk minggu tertentu
  const handleCopyRencanaToRealisasi = (mingguKe: 1 | 2 | 3 | 4 | 5) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.mingguKe === mingguKe) {
          return {
            ...r,
            k1Realisasi: r.k1Rencana,
            k1RealisasiStr: r.k1Rencana > 0 ? r.k1Rencana.toLocaleString('id-ID') : '',
            k2Realisasi: r.k2Rencana,
            k2RealisasiStr: r.k2Rencana > 0 ? r.k2Rencana.toLocaleString('id-ID') : '',
          };
        }
        return r;
      })
    );
  };

  // Preset Cepat untuk baris tertentu
  const handleApplyPreset = (
    mingguKe: 1 | 2 | 3 | 4 | 5,
    kolekte: 'k1' | 'k2',
    nominal: number
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.mingguKe === mingguKe) {
          if (kolekte === 'k1') {
            return {
              ...r,
              k1Rencana: nominal,
              k1RencanaStr: nominal.toLocaleString('id-ID'),
            };
          } else {
            return {
              ...r,
              k2Rencana: nominal,
              k2RencanaStr: nominal.toLocaleString('id-ID'),
            };
          }
        }
        return r;
      })
    );
  };

  // Tambah baris Kolekte Hari Khusus di luar rutin hari Minggu di bulan ini
  const handleAddKhususRow = (presetNama?: string) => {
    const estMonthStr = String(bulan).padStart(2, '0');
    let defaultDay = '15';
    const lower = (presetNama || '').toLowerCase();
    if (lower.includes('24 des')) defaultDay = '24';
    else if (lower.includes('25 des') || lower.includes('natal')) defaultDay = '25';
    else if (lower.includes('31 des') || lower.includes('tutup tahun')) defaultDay = '31';
    else if (lower.includes('1 jan') || lower.includes('bunda allah')) defaultDay = '01';
    else if (lower.includes('8 des') || lower.includes('pelindung')) defaultDay = '08';

    const newKhusus: KolekteKhususRow = {
      id: `khusus_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      mingguKe: 1,
      tanggal: `${tahun}-${estMonthStr}-${defaultDay}`,
      kategori: 'kolekte_khusus',
      namaPenerimaan: presetNama || `Misa Hari Khusus (${namaBulanAktif})`,
      rancangan: 8000000,
      rancanganStr: '8.000.000',
      realisasi: 0,
      realisasiStr: '',
      keterangan: 'Kolekte misa hari perayaan khusus / liturgi di luar hari Minggu rutin',
      isNew: true,
    };
    setKhususRows((prev) => [...prev, newKhusus]);
  };

  const handleUpdateKhususNominal = (
    id: string,
    field: 'rancangan' | 'realisasi',
    rawVal: string
  ) => {
    const num = parseRupiahInput(rawVal);
    const str = num > 0 ? num.toLocaleString('id-ID') : rawVal.trim() === '' ? '' : '0';
    setKhususRows((prev) =>
      prev.map((k) =>
        k.id === id
          ? {
              ...k,
              [field]: num,
              [`${field}Str`]: str,
            }
          : k
      )
    );
  };

  const handleUpdateKhususField = (
    id: string,
    field: 'namaPenerimaan' | 'mingguKe' | 'tanggal' | 'kategori' | 'keterangan',
    value: any
  ) => {
    setKhususRows((prev) =>
      prev.map((k) => (k.id === id ? { ...k, [field]: value } : k))
    );
  };

  const handleDeleteKhususRow = async (id: string, isNew?: boolean) => {
    if (!isNew) {
      if (window.confirm('Hapus pos Kolekte Hari Khusus ini secara permanen?')) {
        await onDeletePenerimaan(id);
      }
    }
    setKhususRows((prev) => prev.filter((k) => k.id !== id));
  };

  // Simpan 1 baris Kolekte Hari Khusus langsung ke database
  const handleSaveKhususRow = async (k: KolekteKhususRow) => {
    try {
      setSavingKhususId(k.id);
      const itemKhusus: PenerimaanMingguan = {
        id: k.id,
        tahun,
        bulan,
        mingguKe: k.mingguKe || 1,
        tanggal: k.tanggal,
        kategori: k.kategori || 'kolekte_khusus',
        namaPenerimaan: k.namaPenerimaan.trim(),
        rancangan: k.rancangan,
        realisasi: k.realisasi,
        alokasiSeksi: 'Umum Paroki',
        tipeSumber: 'paroki',
        isTentatif: false,
        isHariKhusus: true,
        namaHariKhusus: k.namaPenerimaan.trim(),
        keterangan: k.keterangan.trim() || undefined,
        pencatat: 'Bendahara Paroki',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await onSavePenerimaan(itemKhusus);
      setKhususRows((prev) =>
        prev.map((item) => (item.id === k.id ? { ...item, isNew: false } : item))
      );
      setSaveSuccessMsg(`Data kolekte "${k.namaPenerimaan}" berhasil disimpan!`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err?.message || 'Terjadi kesalahan'}`);
    } finally {
      setSavingKhususId(null);
    }
  };

  // Simpan 1 minggu spesifik
  const handleSaveWeek = async (row: WeekKolekteRow) => {
    try {
      setSavingWeek(row.mingguKe);

      // Simpan Kolekte 1
      const itemK1: PenerimaanMingguan = {
        id: row.k1Id || `pen_k1_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tahun,
        bulan,
        mingguKe: row.mingguKe,
        tanggal: row.tanggal,
        kategori: 'kolekte_1',
        namaPenerimaan: 'Kolekte I Misa Mingguan (50% Solidaritas & 50% Operasional/Proker)',
        rancangan: row.k1Rencana,
        realisasi: row.k1Realisasi,
        alokasiSeksi: 'Umum Paroki',
        tipeSumber: 'paroki',
        isTentatif: false,
        keterangan: row.k1Keterangan.trim() || undefined,
        pencatat: 'Bendahara Paroki',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await onSavePenerimaan(itemK1);

      // Simpan Kolekte 2
      const itemK2: PenerimaanMingguan = {
        id: row.k2Id || `pen_k2_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tahun,
        bulan,
        mingguKe: row.mingguKe,
        tanggal: row.tanggal,
        kategori: 'kolekte_2',
        namaPenerimaan: 'Kolekte II Misa Mingguan (Dana Pembangunan Tersimpan)',
        rancangan: row.k2Rencana,
        realisasi: row.k2Realisasi,
        alokasiSeksi: 'Umum Paroki',
        tipeSumber: 'paroki',
        isTentatif: false,
        keterangan: row.k2Keterangan.trim() || undefined,
        pencatat: 'Bendahara Paroki',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await onSavePenerimaan(itemK2);

      setSaveSuccessMsg(`Data Kolekte Minggu ke-${row.mingguKe} berhasil disimpan!`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err?.message || 'Terjadi kesalahan'}`);
    } finally {
      setSavingWeek(null);
    }
  };

  // Simpan Semua Minggu + Kolekte Khusus Bulan Ini Sekaligus
  const handleSaveAllMonth = async () => {
    try {
      setIsSavingAll(true);

      // Simpan 5 Minggu
      for (const row of rows) {
        if (row.k1Rencana > 0 || row.k1Realisasi > 0) {
          const itemK1: PenerimaanMingguan = {
            id: row.k1Id || `pen_k1_${Date.now()}_${row.mingguKe}_${Math.random().toString(36).substring(2, 6)}`,
            tahun,
            bulan,
            mingguKe: row.mingguKe,
            tanggal: row.tanggal,
            kategori: 'kolekte_1',
            namaPenerimaan: 'Kolekte I Misa Mingguan (50% Solidaritas & 50% Operasional/Proker)',
            rancangan: row.k1Rencana,
            realisasi: row.k1Realisasi,
            alokasiSeksi: 'Umum Paroki',
            tipeSumber: 'paroki',
            isTentatif: false,
            keterangan: row.k1Keterangan.trim() || undefined,
            pencatat: 'Bendahara Paroki',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await onSavePenerimaan(itemK1);
        }

        if (row.k2Rencana > 0 || row.k2Realisasi > 0) {
          const itemK2: PenerimaanMingguan = {
            id: row.k2Id || `pen_k2_${Date.now()}_${row.mingguKe}_${Math.random().toString(36).substring(2, 6)}`,
            tahun,
            bulan,
            mingguKe: row.mingguKe,
            tanggal: row.tanggal,
            kategori: 'kolekte_2',
            namaPenerimaan: 'Kolekte II Misa Mingguan (Dana Pembangunan Tersimpan)',
            rancangan: row.k2Rencana,
            realisasi: row.k2Realisasi,
            alokasiSeksi: 'Umum Paroki',
            tipeSumber: 'paroki',
            isTentatif: false,
            keterangan: row.k2Keterangan.trim() || undefined,
            pencatat: 'Bendahara Paroki',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await onSavePenerimaan(itemK2);
        }
      }

      // Simpan Kolekte Hari Khusus Bulan Ini
      for (const k of khususRows) {
        if (k.rancangan > 0 || k.realisasi > 0 || !k.isNew) {
          const itemKhusus: PenerimaanMingguan = {
            id: k.id,
            tahun,
            bulan,
            mingguKe: k.mingguKe || 1,
            tanggal: k.tanggal,
            kategori: k.kategori || 'kolekte_khusus',
            namaPenerimaan: k.namaPenerimaan.trim(),
            rancangan: k.rancangan,
            realisasi: k.realisasi,
            alokasiSeksi: 'Umum Paroki',
            tipeSumber: 'paroki',
            isTentatif: false,
            isHariKhusus: true,
            namaHariKhusus: k.namaPenerimaan.trim(),
            keterangan: k.keterangan.trim() || undefined,
            pencatat: 'Bendahara Paroki',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await onSavePenerimaan(itemKhusus);
        }
      }

      setSaveSuccessMsg(`Seluruh Rencana & Realisasi Kolekte ${namaBulanAktif} ${tahun} berhasil disimpan!`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(`Gagal menyimpan seluruh bulan: ${err?.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsSavingAll(false);
    }
  };

  // Kalkulasi Total Akumulasi Bulan Ini
  const monthlyTotals = useMemo(() => {
    let totK1Rencana = 0;
    let totK1Realisasi = 0;
    let totK2Rencana = 0;
    let totK2Realisasi = 0;

    rows.forEach((r) => {
      totK1Rencana += r.k1Rencana || 0;
      totK1Realisasi += r.k1Realisasi || 0;
      totK2Rencana += r.k2Rencana || 0;
      totK2Realisasi += r.k2Realisasi || 0;
    });

    let totKhususRencana = 0;
    let totKhususRealisasi = 0;
    khususRows.forEach((k) => {
      totKhususRencana += k.rancangan || 0;
      totKhususRealisasi += k.realisasi || 0;
    });

    const splitK1Rencana = calculateKolekte1Split(totK1Rencana);
    const splitK1Realisasi = calculateKolekte1Split(totK1Realisasi);

    const grandTotalRencana = totK1Rencana + totK2Rencana + totKhususRencana;
    const grandTotalRealisasi = totK1Realisasi + totK2Realisasi + totKhususRealisasi;

    const danaOperasionalDanProker =
      totK1Realisasi > 0 ? splitK1Realisasi.danaOperasionalDanProker : splitK1Rencana.danaOperasionalDanProker;

    const danaSolidaritas =
      totK1Realisasi > 0 ? splitK1Realisasi.danaSolidaritas : splitK1Rencana.danaSolidaritas;

    const danaPembangunan =
      totK2Realisasi > 0 ? totK2Realisasi : totK2Rencana;

    return {
      totK1Rencana,
      totK1Realisasi,
      totK2Rencana,
      totK2Realisasi,
      totKhususRencana,
      totKhususRealisasi,
      grandTotalRencana,
      grandTotalRealisasi,
      danaOperasionalDanProker,
      danaSolidaritas,
      danaPembangunan,
    };
  }, [rows, khususRows]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
      {/* 1. Header Toolbar 1-Layar Bulanan */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center font-black">
              {modeFocus === 'rencana' ? '🎯' : modeFocus === 'realisasi' ? '📥' : '⚡'}
            </span>
            <h3 className="text-base sm:text-lg font-black tracking-tight">
              {modeFocus === 'rencana'
                ? `Input Rencana Penerimaan Kas (Bulan ${namaBulanAktif} ${tahun})`
                : modeFocus === 'realisasi'
                ? `Input Realisasi Penerimaan Kas (Bulan ${namaBulanAktif} ${tahun})`
                : `Pengisian Kolekte 1 Layar Per Bulan (${namaBulanAktif} ${tahun})`}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-300 text-emerald-950">
              1 Layar Cepat
            </span>
          </div>
          <p className="text-xs text-emerald-100/90 font-medium mt-1">
            {modeFocus === 'rencana'
              ? 'Fokus pengisian target anggaran Kolekte I (50:50), Kolekte II (Pembangunan), dan Kolekte Khusus per minggu.'
              : modeFocus === 'realisasi'
              ? 'Catat realisasi riil kas masuk misa mingguan dan dana pembangunan paroki.'
              : 'Input langsung rencana & realisasi mingguan. Kolekte 1 dibagi 50:50, Kolekte 2 dicatat 100% Pembangunan.'}
          </p>
        </div>

        {/* Pemilih Tahun & Tombol Simpan */}
        <div className="flex items-center gap-2">
          {/* Pilih Tahun */}
          <div className="inline-flex bg-black/20 p-1 rounded-xl backdrop-blur-xs">
            <button
              type="button"
              onClick={() => onYearChange(2026)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tahun === 2026 ? 'bg-white text-slate-900 shadow-xs' : 'text-white/80 hover:text-white'
              }`}
            >
              2026
            </button>
            <button
              type="button"
              onClick={() => onYearChange(2027)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tahun === 2027 ? 'bg-white text-slate-900 shadow-xs' : 'text-white/80 hover:text-white'
              }`}
            >
              2027
            </button>
          </div>

          {/* Tombol Simpan Semua Bulan Ini */}
          <button
            type="button"
            onClick={handleSaveAllMonth}
            disabled={isSavingAll}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title={`Simpan seluruh isian kolekte bulan ${namaBulanAktif}`}
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>{isSavingAll ? 'Menyimpan Semua...' : `Simpan ${namaBulanAktif}`}</span>
          </button>
        </div>
      </div>

      {/* Navigasi Bulan Cepat (Slider Tab) */}
      <div className="px-4 sm:px-6 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar border-b border-slate-100">
          <span className="text-[11px] font-black uppercase text-slate-400 shrink-0 pr-1">
            Bulan:
          </span>
          {BULAN_LIST.map((b) => (
            <button
              key={b.no}
              type="button"
              onClick={() => onMonthChange(b.no)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                bulan === b.no
                  ? 'bg-emerald-700 text-white font-black shadow-xs ring-1 ring-emerald-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {b.nama}
            </button>
          ))}
        </div>
      </div>

      {/* Toast Notifikasi Tersimpan */}
      {saveSuccessMsg && (
        <div className="mx-4 sm:mx-6 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 2. TABEL MATRIKS INLINE 5 MINGGU (1 LAYAR) */}
      <div className="px-4 sm:px-6 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[780px]">
          <thead>
            <tr className="border-b-2 border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/70">
              <th className="py-2.5 px-3 rounded-l-xl w-32">Minggu &amp; Tanggal</th>
              <th className="py-2.5 px-3 bg-blue-50/60 text-blue-900 border-x border-blue-100">
                <div className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-blue-700" />
                  <span>Kolekte I (Misa Mingguan - 50:50)</span>
                </div>
              </th>
              <th className="py-2.5 px-3 bg-emerald-50/60 text-emerald-900 border-r border-emerald-100">
                <div className="flex items-center gap-1.5">
                  <Hammer className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Kolekte II (Dana Pembangunan 100%)</span>
                </div>
              </th>
              <th className="py-2.5 px-3 rounded-r-xl text-center w-36">Aksi Cepat</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {rows.map((row) => {
              const k1SplitRencana = calculateKolekte1Split(row.k1Rencana);
              const k1SplitRealisasi = calculateKolekte1Split(row.k1Realisasi);
              const k1Selisih = row.k1Realisasi - row.k1Rencana;
              const k2Selisih = row.k2Realisasi - row.k2Rencana;
              const isSavingThisWeek = savingWeek === row.mingguKe;

              return (
                <tr key={row.mingguKe} className="hover:bg-slate-50/80 transition-colors">
                  {/* Kolom 1: Minggu & Tanggal Hari Minggu Kalender */}
                  <td className="py-3 px-3 align-top font-bold text-slate-800">
                    <div className="flex items-start gap-1.5">
                      <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                        M{row.mingguKe}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-slate-900 block leading-tight">
                          Minggu ke-{row.mingguKe}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5 whitespace-nowrap">
                          🗓️ Hari Minggu
                        </span>
                        <div className="text-[11px] font-bold text-slate-700 mt-1 leading-tight">
                          {formatIndonesianDate(row.tanggal, true)}
                        </div>
                      </div>
                    </div>
                    <input
                      type="date"
                      value={row.tanggal}
                      onChange={(e) => handleUpdateText(row.mingguKe, 'tanggal', e.target.value)}
                      className="mt-1.5 px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-medium text-slate-700 w-full focus:outline-none focus:border-emerald-600"
                      title="Tanggal Hari Minggu Riil"
                    />
                  </td>

                  {/* Kolom 2: Kolekte I (Input Rencana & Realisasi + Live 50:50) */}
                  <td className={`py-3 px-3 align-top bg-blue-50/30 border-x border-blue-100/80 space-y-2 ${
                    modeFocus === 'rencana' ? 'ring-2 ring-blue-300/60 rounded-xl' : ''
                  }`}>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Rencana Kolekte I */}
                      <div className={modeFocus === 'rencana' ? 'p-1.5 bg-blue-100/50 rounded-lg' : ''}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-black uppercase text-blue-900 block">
                            Target Rencana (Rp) *
                          </span>
                          {modeFocus === 'rencana' && (
                            <span className="text-[9px] font-bold text-blue-700 bg-blue-200 px-1 py-0.2 rounded">
                              Utama
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={row.k1RencanaStr}
                            onChange={(e) =>
                              handleUpdateNominal(row.mingguKe, 'k1Rencana', e.target.value)
                            }
                            placeholder="0"
                            className="w-full pl-8 pr-2 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-black text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                        {/* Quick Presets Rencana Kol 1 */}
                        <div className="flex items-center gap-1 pt-1 flex-wrap">
                          {[8000000, 10000000, 12000000, 15000000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleApplyPreset(row.mingguKe, 'k1', preset)}
                              className="px-1 py-0.2 rounded bg-white hover:bg-blue-100 text-blue-900 text-[9px] font-bold border border-blue-200 transition-colors cursor-pointer"
                            >
                              {preset / 1000000}Jt
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Realisasi Kolekte I */}
                      <div className={modeFocus === 'realisasi' ? 'p-1.5 bg-teal-100/50 rounded-lg' : ''}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-black uppercase text-blue-900 block">
                            Realisasi Aktual (Rp)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateNominal(row.mingguKe, 'k1Realisasi', String(row.k1Rencana))
                            }
                            className="text-[9px] font-bold text-blue-700 hover:underline cursor-pointer"
                            title="Samakan dengan target"
                          >
                            = Rencana
                          </button>
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={row.k1RealisasiStr}
                            onChange={(e) =>
                              handleUpdateNominal(row.mingguKe, 'k1Realisasi', e.target.value)
                            }
                            placeholder="0"
                            className="w-full pl-8 pr-2 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-black text-blue-950 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* LIVE 50:50 BREAKDOWN STRIP */}
                    <div className="p-2 bg-white rounded-xl border border-blue-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="font-extrabold text-blue-900 flex items-center gap-1">
                          <Split className="w-3 h-3 text-blue-600" />
                          <span>Solidaritas (50%):</span>
                        </span>
                        <strong className="text-blue-950 font-black">
                          {formatRupiah(
                            row.k1Realisasi > 0
                              ? k1SplitRealisasi.danaSolidaritas
                              : k1SplitRencana.danaSolidaritas
                          )}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="font-extrabold text-emerald-800 flex items-center gap-1">
                          <span>✓</span>
                          <span>Bisa Dipakai Proker (50%):</span>
                        </span>
                        <strong className="text-emerald-800 font-black">
                          {formatRupiah(
                            row.k1Realisasi > 0
                              ? k1SplitRealisasi.danaOperasionalDanProker
                              : k1SplitRencana.danaOperasionalDanProker
                          )}
                        </strong>
                      </div>
                      {row.k1Realisasi > 0 && (
                        <div className="text-[9.5px] font-bold pt-0.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-slate-500">Selisih Aktual:</span>
                          <span className={k1Selisih >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            {k1Selisih >= 0 ? '+' : ''}
                            {formatRupiah(k1Selisih)}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Kolom 3: Kolekte II (Input Rencana & Realisasi + 100% Pembangunan) */}
                  <td className={`py-3 px-3 align-top bg-emerald-50/30 border-r border-emerald-100/80 space-y-2 ${
                    modeFocus === 'rencana' ? 'ring-2 ring-emerald-300/60 rounded-xl' : ''
                  }`}>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Rencana Kolekte II */}
                      <div className={modeFocus === 'rencana' ? 'p-1.5 bg-emerald-100/50 rounded-lg' : ''}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-black uppercase text-emerald-900 block">
                            Target Rencana (Rp) *
                          </span>
                          {modeFocus === 'rencana' && (
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-200 px-1 py-0.2 rounded">
                              Utama
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={row.k2RencanaStr}
                            onChange={(e) =>
                              handleUpdateNominal(row.mingguKe, 'k2Rencana', e.target.value)
                            }
                            placeholder="0"
                            className="w-full pl-8 pr-2 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                          />
                        </div>
                        {/* Quick Presets Rencana Kol 2 */}
                        <div className="flex items-center gap-1 pt-1 flex-wrap">
                          {[5000000, 8000000, 10000000, 15000000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleApplyPreset(row.mingguKe, 'k2', preset)}
                              className="px-1 py-0.2 rounded bg-white hover:bg-emerald-100 text-emerald-900 text-[9px] font-bold border border-emerald-200 transition-colors cursor-pointer"
                            >
                              {preset / 1000000}Jt
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Realisasi Kolekte II */}
                      <div className={modeFocus === 'realisasi' ? 'p-1.5 bg-teal-100/50 rounded-lg' : ''}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-black uppercase text-emerald-900 block">
                            Realisasi Aktual (Rp)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateNominal(row.mingguKe, 'k2Realisasi', String(row.k2Rencana))
                            }
                            className="text-[9px] font-bold text-emerald-700 hover:underline cursor-pointer"
                            title="Samakan dengan target"
                          >
                            = Rencana
                          </button>
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={row.k2RealisasiStr}
                            onChange={(e) =>
                              handleUpdateNominal(row.mingguKe, 'k2Realisasi', e.target.value)
                            }
                            placeholder="0"
                            className="w-full pl-8 pr-2 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-black text-emerald-950 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* LIVE 100% PEMBANGUNAN STRIP */}
                    <div className="p-2 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="font-extrabold text-emerald-900 flex items-center gap-1">
                          <Building className="w-3 h-3 text-emerald-600" />
                          <span>Kas Pembangunan (100%):</span>
                        </span>
                        <strong className="text-emerald-900 font-black">
                          {formatRupiah(row.k2Realisasi > 0 ? row.k2Realisasi : row.k2Rencana)}
                        </strong>
                      </div>
                      <p className="text-[9px] text-emerald-800 leading-tight">
                        Tersimpan khusus untuk renovasi &amp; pembangunan fisik.
                      </p>
                      {row.k2Realisasi > 0 && (
                        <div className="text-[9.5px] font-bold pt-0.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-slate-500">Selisih Aktual:</span>
                          <span className={k2Selisih >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            {k2Selisih >= 0 ? '+' : ''}
                            {formatRupiah(k2Selisih)}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Kolom 4: Aksi Cepat per Minggu */}
                  <td className="py-3 px-3 align-top text-center space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyRencanaToRealisasi(row.mingguKe)}
                      className="w-full py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-black transition-colors cursor-pointer border border-slate-200"
                      title="Salin nominal target rencana ke realisasi minggu ini"
                    >
                      📋 Samakan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveWeek(row)}
                      disabled={isSavingThisWeek}
                      className="w-full py-2 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-xs flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3 h-3" />
                      <span>{isSavingThisWeek ? 'Simpan...' : 'Simpan M' + row.mingguKe}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. BAGIAN KOLEKTE HARI KHUSUS (DI LUAR HARI MINGGU RUTIN) */}
      <div className="px-4 sm:px-6 pt-3 pb-3 border-t border-slate-200 space-y-3 bg-gradient-to-b from-purple-50/30 to-white rounded-2xl mx-2 sm:mx-4 my-2 border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black text-sm shrink-0 mt-0.5 shadow-xs">
              <Sparkles className="w-4 h-4 text-purple-700" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-900">
                  Kolekte &amp; Penerimaan Misa Hari Khusus (Di Luar Hari Minggu Rutin)
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                  {khususRows.length} Terdaftar
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                Khusus perayaan di luar hari Minggu rutin (Kamis Putih, Jumat Agung, Malam Paskah, Hari Raya Natal, Misa Tutup Tahun, Hari Kenaikan, dll.). Bebas pilih tanggal kalender &amp; jenis kolekte.
              </p>
            </div>
          </div>

          {/* Tombol & Dropdown Tambah Hari Khusus */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddKhususRow(e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-white text-purple-900 text-xs font-bold border border-purple-300 shadow-2xs hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
            >
              <option value="" disabled>
                ⚡ Pilih Cepat Hari Raya...
              </option>
              {HARI_KHUSUS_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleAddKhususRow()}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Hari Khusus</span>
            </button>
          </div>
        </div>

        {/* Tabel Kolekte Hari Khusus */}
        {khususRows.length > 0 ? (
          <div className="overflow-x-auto bg-white rounded-2xl border border-purple-200 shadow-xs p-3">
            <table className="w-full text-left border-collapse min-w-[840px]">
              <thead>
                <tr className="text-[10px] font-black uppercase text-purple-950 pb-2 border-b-2 border-purple-200 bg-purple-50/50">
                  <th className="py-2 px-2.5 rounded-l-lg w-56">Nama Perayaan / Hari Khusus</th>
                  <th className="py-2 px-2.5 w-44">Tanggal Misa Riil</th>
                  <th className="py-2 px-2.5 w-44">Jenis Kolekte</th>
                  <th className="py-2 px-2.5 w-36">Target Rencana (Rp)</th>
                  <th className="py-2 px-2.5 w-36">Realisasi Aktual (Rp)</th>
                  <th className="py-2 px-2.5">Catatan / Misa</th>
                  <th className="py-2 px-2 rounded-r-lg text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 text-xs">
                {khususRows.map((k) => {
                  const isSavingThisKhusus = savingKhususId === k.id;
                  return (
                    <tr key={k.id} className="hover:bg-purple-50/30 transition-colors">
                      {/* Nama Perayaan */}
                      <td className="py-2.5 px-2.5 align-top">
                        <input
                          type="text"
                          value={k.namaPenerimaan}
                          onChange={(e) =>
                            handleUpdateKhususField(k.id, 'namaPenerimaan', e.target.value)
                          }
                          placeholder="Contoh: Kamis Putih / Jumat Agung"
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                        />
                        <span className="text-[9.5px] font-bold text-purple-700 mt-1 block">
                          ⭐ Di luar jadwal Minggu rutin
                        </span>
                      </td>

                      {/* Tanggal Misa Bebas Kalender */}
                      <td className="py-2.5 px-2.5 align-top">
                        <input
                          type="date"
                          value={k.tanggal}
                          onChange={(e) =>
                            handleUpdateKhususField(k.id, 'tanggal', e.target.value)
                          }
                          className="w-full px-2 py-1 bg-white border border-purple-200 rounded-lg text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-purple-600"
                        />
                        <div className="text-[10px] font-bold text-purple-900 mt-1">
                          {formatIndonesianDate(k.tanggal, true)}
                        </div>
                      </td>

                      {/* Kategori Kolekte */}
                      <td className="py-2.5 px-2.5 align-top">
                        <select
                          value={k.kategori || 'kolekte_khusus'}
                          onChange={(e) =>
                            handleUpdateKhususField(
                              k.id,
                              'kategori',
                              e.target.value as KategoriPenerimaan
                            )
                          }
                          className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-lg text-[11px] font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                        >
                          <option value="kolekte_khusus">
                            Kolekte Khusus (Persembahan Kasih)
                          </option>
                          <option value="kolekte_1">
                            Kolekte I Hari Raya (50:50)
                          </option>
                          <option value="kolekte_2">
                            Kolekte II Hari Raya (100% Pembangunan)
                          </option>
                        </select>
                      </td>

                      {/* Target Rencana */}
                      <td className="py-2.5 px-2.5 align-top">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">
                            Rp
                          </span>
                          <input
                            type="text"
                            value={k.rancanganStr}
                            onChange={(e) =>
                              handleUpdateKhususNominal(k.id, 'rancangan', e.target.value)
                            }
                            placeholder="0"
                            className="w-full pl-8 pr-2 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-black text-slate-900 focus:outline-none focus:border-purple-600"
                          />
                        </div>
                      </td>

                      {/* Realisasi Aktual */}
                      <td className="py-2.5 px-2.5 align-top">
                        <div className="flex items-center justify-between mb-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateKhususNominal(k.id, 'realisasi', String(k.rancangan))
                            }
                            className="text-[9px] font-bold text-purple-700 hover:underline cursor-pointer ml-auto"
                            title="Samakan dengan target"
                          >
                            = Rencana
                          </button>
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">
                            Rp
                          </span>
                          <input
                            type="text"
                            value={k.realisasiStr}
                            onChange={(e) =>
                              handleUpdateKhususNominal(k.id, 'realisasi', e.target.value)
                            }
                            placeholder="0"
                            className="w-full pl-8 pr-2 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-black text-purple-950 focus:outline-none focus:border-purple-600"
                          />
                        </div>
                      </td>

                      {/* Catatan / Keterangan */}
                      <td className="py-2.5 px-2.5 align-top">
                        <input
                          type="text"
                          value={k.keterangan || ''}
                          onChange={(e) =>
                            handleUpdateKhususField(k.id, 'keterangan', e.target.value)
                          }
                          placeholder="Misa sore/malam..."
                          className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-purple-600"
                        />
                      </td>

                      {/* Aksi Baris */}
                      <td className="py-2.5 px-2 align-top text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSaveKhususRow(k)}
                            disabled={isSavingThisKhusus}
                            className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            title="Simpan baris hari khusus ini"
                          >
                            <Save className="w-3 h-3" />
                            <span>{isSavingThisKhusus ? '...' : 'Simpan'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteKhususRow(k.id, k.isNew)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                            title="Hapus baris kolekte hari khusus ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-white rounded-2xl border border-dashed border-purple-200 text-center space-y-1">
            <p className="text-xs font-bold text-slate-700">
              Belum ada kolekte hari khusus yang dicatatkan di bulan {namaBulanAktif} {tahun}.
            </p>
            <p className="text-[11px] text-slate-500">
              Jika terdapat perayaan liturgi yang jatuh di luar hari Minggu (misal Pekan Suci, Hari Raya Natal, Tutup Tahun, atau Pelindung Paroki), pilih perayaan dari tombol &quot;Pilih Cepat Hari Raya&quot; di atas untuk mencatat rencana &amp; realisasinya.
            </p>
          </div>
        )}
      </div>

      {/* 4. REKAPITULASI TOTAL BULAN INI & DANA BISA DIPAKAI (FOOTER) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-b-3xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black text-emerald-300 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            <span>Rekapitulasi Total Bulan {namaBulanAktif} {tahun}</span>
          </span>
          <span className="text-[10.5px] text-slate-300">
            5 Minggu + {khususRows.length} Kolekte Khusus
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Box 1: Total Rencana */}
          <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs">
            <span className="text-[9.5px] font-black uppercase text-slate-300 block">
              1. Total Rencana Masuk:
            </span>
            <strong className="text-sm sm:text-base font-black text-white">
              {formatRupiah(monthlyTotals.grandTotalRencana)}
            </strong>
            <span className="text-[9px] text-slate-400 block mt-0.5">Kol I, II &amp; Khusus</span>
          </div>

          {/* Box 2: Total Realisasi Riil */}
          <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs">
            <span className="text-[9.5px] font-black uppercase text-slate-300 block">
              2. Total Realisasi Riil:
            </span>
            <strong className="text-sm sm:text-base font-black text-emerald-300">
              {formatRupiah(monthlyTotals.grandTotalRealisasi)}
            </strong>
            <span className="text-[9px] text-emerald-200 block mt-0.5">Aktual Kas Masuk</span>
          </div>

          {/* Box 3: DANA YANG BISA DIPAKAI PROKER (50% Kolekte I) */}
          <div className="bg-emerald-500/20 border-2 border-emerald-400/60 p-2.5 rounded-xl shadow-inner">
            <span className="text-[9.5px] font-black uppercase text-emerald-200 block">
              3. Bisa Dipakai Proker Seksi:
            </span>
            <strong className="text-sm sm:text-base font-black text-emerald-300">
              {formatRupiah(monthlyTotals.danaOperasionalDanProker)}
            </strong>
            <span className="text-[9px] text-emerald-100 font-bold block mt-0.5">
              ✓ 50% Kolekte I (Operasional Paroki)
            </span>
          </div>

          {/* Box 4: DANA SOLIDARITAS (50% Kolekte I) */}
          <div className="bg-blue-500/20 border border-blue-400/40 p-2.5 rounded-xl">
            <span className="text-[9.5px] font-black uppercase text-blue-200 block">
              4. Dana Solidaritas:
            </span>
            <strong className="text-sm sm:text-base font-black text-blue-200">
              {formatRupiah(monthlyTotals.danaSolidaritas)}
            </strong>
            <span className="text-[9px] text-blue-300 block mt-0.5">
              Disetor ke Keuskupan
            </span>
          </div>

          {/* Box 5: DANA PEMBANGUNAN TERSIMPAN (100% Kolekte II) */}
          <div className="bg-teal-500/20 border border-teal-400/40 p-2.5 rounded-xl">
            <span className="text-[9.5px] font-black uppercase text-teal-200 block">
              5. Dana Pembangunan:
            </span>
            <strong className="text-sm sm:text-base font-black text-teal-300">
              {formatRupiah(monthlyTotals.danaPembangunan)}
            </strong>
            <span className="text-[9px] text-teal-200 block mt-0.5">
              100% Kolekte II Tersimpan
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
