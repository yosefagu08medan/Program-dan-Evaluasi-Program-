import pptxgen from 'pptxgenjs';
import { EvaluasiProgram, ProgramKerja, StatusPersetujuanPastor } from '../types/proker';
import { AuthSession } from '../types/auth';
import {
  BULAN_LIST,
  formatBulanPelaksanaan,
  formatCompactRupiah,
  formatRupiah,
  getAlokasiBudgetBulanan,
  getAuthRoleFileSlug,
  getDetailPaguBulanan,
  getDivisionOrder,
  getEvaluasiForMonth,
  getKategoriProgramInfo,
  getLatestEvaluasi,
  formatIndonesianDate,
  getProgramExecutionSummary,
  getTipeJadwalLabel,
  isProgramAktifDiBulan,
  isProgramBerulang,
  normalizeDivisionName,
  sortProgramsSystematically,
} from './formatters';

export type PptxExportMode = 'evaluasi' | 'program_saja';

export interface PptxExportOptions {
  programs: ProgramKerja[];
  selectedMonth: number | 'all';
  selectedYear: 2026 | 2027 | 'all';
  selectedSeksi: string | 'all';
  authSession?: AuthSession | null;
  exportMode?: PptxExportMode;
  title?: string;
}

function cleanSingleLine(text: string): string {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function cleanMultilineText(text: string): string {
  return (text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1].length > 0))
    .join('\n')
    .trim();
}

function estimateWrappedLines(
  text: string,
  boxWInches: number,
  fontSizePt: number,
  bold = false
): number {
  const usableW = Math.max(0.25, boxWInches - 0.04);
  const avgCharPt = fontSizePt * (bold ? 0.59 : 0.53);
  const charsPerLine = Math.max(3, Math.floor((usableW * 72) / avgCharPt));

  const paragraphs = (text || '').split('\n');
  let totalLines = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      totalLines += 1;
      continue;
    }
    const words = trimmed.split(/\s+/);
    let currentLen = 0;
    let paraLines = 1;

    for (const word of words) {
      if (word.length > charsPerLine) {
        if (currentLen > 0) {
          paraLines += 1;
          currentLen = 0;
        }
        const extraLines = Math.ceil(word.length / charsPerLine);
        paraLines += extraLines - 1;
        currentLen = word.length % charsPerLine || charsPerLine;
      } else if (currentLen === 0) {
        currentLen = word.length;
      } else if (currentLen + 1 + word.length <= charsPerLine) {
        currentLen += 1 + word.length;
      } else {
        paraLines += 1;
        currentLen = word.length;
      }
    }
    totalLines += paraLines;
  }

  return Math.max(1, totalLines);
}

function fitFontSize(
  text: string,
  boxWInches: number,
  boxHInches: number,
  maxFontPt: number,
  options: {
    minFontPt?: number;
    bold?: boolean;
    paraSpacePt?: number;
    maxLines?: number;
    safetyRatio?: number;
  } = {}
): number {
  const {
    minFontPt = 6.5,
    bold = false,
    paraSpacePt = 0,
    maxLines,
    safetyRatio = 0.9,
  } = options;

  const content = text || '';
  if (!content.trim()) return maxFontPt;

  const paragraphCount = content.split('\n').length;

  for (let fs = maxFontPt; fs >= minFontPt; fs -= 0.5) {
    const lines = estimateWrappedLines(content, boxWInches, fs, bold);
    if (typeof maxLines === 'number' && lines > maxLines) {
      continue;
    }
    const effectiveParaPt = fs >= 13 ? paraSpacePt : Math.min(paraSpacePt, 0.5);
    const totalParaSpaceIn = (effectiveParaPt * Math.max(0, paragraphCount - 1)) / 72;
    const requiredH = (lines * fs * 1.24) / 72 + totalParaSpaceIn;
    if (requiredH <= boxHInches * safetyRatio) {
      return Number(fs.toFixed(1));
    }
  }

  return minFontPt;
}

function getAllRelevantMonths(
  prog: ProgramKerja,
  summary: ReturnType<typeof getProgramExecutionSummary>
): number[] {
  const set = new Set<number>(summary.scheduledMonths);
  if (prog.evaluasiBulanan) {
    Object.keys(prog.evaluasiBulanan).forEach((k) => {
      const n = parseInt(k, 10);
      if (!isNaN(n) && n >= 1 && n <= 12) set.add(n);
    });
  }
  summary.rincianTidakTerlaksana.forEach((r) => {
    if (r.bulan >= 1 && r.bulan <= 12) set.add(r.bulan);
  });
  return Array.from(set).sort((a, b) => a - b);
}

function formatEvalDetailText(ev: EvaluasiProgram | undefined, progCatatanBulan?: string): string {
  if (!ev || !ev.statusKeterlaksanaan || ev.statusKeterlaksanaan === 'belum_terlaksana') {
    return cleanMultilineText(progCatatanBulan || '') || 'Belum ada laporan evaluasi pelaksanaan dari seksi.';
  }

  const parts: string[] = [];
  if (ev.statusKeterlaksanaan === 'terlaksana') {
    if (ev.penjelasanKegiatan?.trim()) parts.push(cleanSingleLine(ev.penjelasanKegiatan));
    if (progCatatanBulan?.trim()) parts.push(`Rencana Bln: ${cleanSingleLine(progCatatanBulan)}`);
    if (ev.dokumentasi && ev.dokumentasi.length > 0) {
      parts.push(`Lampiran: ${ev.dokumentasi.map((d) => d.nama).join(', ')}`);
    }
    if (parts.length === 0) parts.push('Terlaksana sesuai jadwal & anggaran.');
  } else if (ev.statusKeterlaksanaan === 'tidak_terlaksana') {
    parts.push(`Alasan: ${cleanSingleLine(ev.alasanTidakTerlaksana || '') || 'Tidak ada alasan dicantumkan'}`);
    if (ev.penjelasanKegiatan?.trim()) parts.push(cleanSingleLine(ev.penjelasanKegiatan));
  } else if (ev.statusKeterlaksanaan === 'perubahan_waktu') {
    if (ev.jadwalBaru?.trim()) parts.push(`Jadwal baru: ${cleanSingleLine(ev.jadwalBaru)}`);
    parts.push(`Alasan: ${cleanSingleLine(ev.alasanPerubahanWaktu || '') || 'Tidak ada alasan dicantumkan'}`);
    if (ev.penjelasanPerubahan?.trim()) parts.push(cleanSingleLine(ev.penjelasanPerubahan));
  } else if (ev.statusKeterlaksanaan === 'terlaksana_sebagian') {
    if (ev.penjelasanKegiatan?.trim()) parts.push(cleanSingleLine(ev.penjelasanKegiatan));
  }

  return parts.join(' · ');
}

function buildMonthlyStatusLines(
  prog: ProgramKerja,
  summary: ReturnType<typeof getProgramExecutionSummary>,
  options: { compact?: boolean; includeDetails?: boolean } = {}
): string[] {
  const { compact = false, includeDetails = true } = options;
  const relevantMonths = getAllRelevantMonths(prog, summary);

  return relevantMonths.map((m) => {
    const bNama = compact
      ? BULAN_LIST[m - 1]?.singkatan || `Bln ${m}`
      : BULAN_LIST[m - 1]?.nama || `Bulan ${m}`;
    const evM = prog.evaluasiBulanan?.[m] || getEvaluasiForMonth(prog, m);
    const rencanaNote = prog.catatanBulanan?.[m]?.trim();

    if (summary.terlaksanaMonths.includes(m)) {
      const realTxt =
        typeof evM?.anggaranTerpakai === 'number' && evM.anggaranTerpakai > 0
          ? ` (${formatRupiah(evM.anggaranTerpakai)})`
          : '';
      if (!includeDetails) {
        return `• ${bNama}: ✓ Terlaksana${realTxt}`;
      }
      const metaDetails: string[] = [];
      if (evM?.tanggalPelaksanaan) metaDetails.push(formatIndonesianDate(evM.tanggalPelaksanaan));
      if (evM?.tempatPelaksanaan?.trim()) metaDetails.push(cleanSingleLine(evM.tempatPelaksanaan));
      if (evM?.jumlahPeserta?.trim()) metaDetails.push(`Peserta: ${cleanSingleLine(evM.jumlahPeserta)}`);
      const metaStr = metaDetails.length > 0 ? ` [${metaDetails.join(', ')}]` : '';
      const ket =
        evM?.penjelasanKegiatan?.trim() ||
        (rencanaNote ? `Rencana: ${rencanaNote}` : '');
      const cleanKet = ket ? cleanSingleLine(ket) : metaDetails.length > 0 ? '' : 'Sesuai jadwal';
      return `• ${bNama}: ✓ Terlaksana${realTxt}${metaStr}${cleanKet ? ` — ${cleanKet}` : ''}`;
    }

    const batalItem = summary.rincianTidakTerlaksana.find((r) => r.bulan === m);
    if (summary.tidakTerlaksanaMonths.includes(m) || batalItem) {
      const alasanRaw = batalItem?.alasan?.trim() || evM?.alasanTidakTerlaksana?.trim() || '';
      const alasan = alasanRaw ? cleanSingleLine(alasanRaw) : 'Tidak ada alasan dicantumkan';
      return compact
        ? `• ${bNama}: ✕ Batal — ${alasan}`
        : `• ${bNama}: ✕ Tidak Terlaksana — Alasan: ${alasan}`;
    }

    if (summary.perubahanWaktuMonths.includes(m)) {
      const jadwalBaru = evM?.jadwalBaru?.trim() ? `→ ${cleanSingleLine(evM.jadwalBaru)}` : '';
      const alasanGeser = evM?.alasanPerubahanWaktu?.trim()
        ? cleanSingleLine(evM.alasanPerubahanWaktu)
        : '';
      const extra = [jadwalBaru, alasanGeser ? `Alasan: ${alasanGeser}` : '']
        .filter(Boolean)
        .join(' · ');
      return `• ${bNama}: ⏳ Geser Waktu${extra ? ` (${extra})` : ''}`;
    }

    if (rencanaNote) {
      return `• ${bNama}: ⚠️ Belum Terlaksana — ${cleanSingleLine(rencanaNote)}`;
    }
    return `• ${bNama}: ⚠️ Belum Terlaksana`;
  });
}

function collectAllEvaluationNotes(
  prog: ProgramKerja,
  selectedMonth: number | 'all',
  summary: ReturnType<typeof getProgramExecutionSummary>,
  ev: EvaluasiProgram | undefined
): string {
  const lines: string[] = [];
  const relevantMonths = getAllRelevantMonths(prog, summary);
  const hasMonthlyBreakdown =
    selectedMonth === 'all' &&
    (relevantMonths.length > 1 ||
      isProgramBerulang(prog) ||
      prog.tipeJadwal === 'sepanjang_tahun' ||
      Object.keys(prog.evaluasiBulanan || {}).length > 0);

  if (typeof selectedMonth === 'number') {
    const bNama = BULAN_LIST[selectedMonth - 1]?.nama || `Bulan ${selectedMonth}`;
    const note = formatEvalDetailText(ev, prog.catatanBulanan?.[selectedMonth]);
    if (note) lines.push(`• ${bNama}: ${note}`);
  } else if (hasMonthlyBreakdown) {
    lines.push(...buildMonthlyStatusLines(prog, summary, { compact: false, includeDetails: true }));
  } else if (relevantMonths.length === 1) {
    const m = relevantMonths[0];
    const bNama = BULAN_LIST[m - 1]?.nama || `Bulan ${m}`;
    const evSingle = prog.evaluasiBulanan?.[m] || ev;
    const note = formatEvalDetailText(evSingle, prog.catatanBulanan?.[m]);
    lines.push(`• ${bNama}: ${note}`);
  } else if (ev) {
    lines.push(formatEvalDetailText(ev));
  }

  if (prog.catatan?.trim()) {
    lines.push(`Catatan Seksi: ${cleanSingleLine(prog.catatan)}`);
  }
  if (prog.tahun === 2027 && prog.catatanPastorParoki?.catatan?.trim()) {
    lines.push(`Catatan DPP (2027): ${cleanSingleLine(prog.catatanPastorParoki.catatan)}`);
  }

  return cleanMultilineText(lines.join('\n')) || 'Belum ada catatan evaluasi yang dicatat.';
}

interface NotesSplitResult {
  hasPage2: boolean;
  page1Text: string;
  page1FontSize: number;
  page2Text: string;
  page2FontSize: number;
}

const EVAL_SINGLE_SLIDE_MIN_FONT = 14.5;
const EVAL_MAX_FONT = 18;
const EVAL_PAGE2_BOX_W = 11.73;
const EVAL_PAGE2_BOX_H = 4.34;

function splitNotesIntoPages(
  text: string,
  page1BoxW: number,
  page1BoxH: number,
  paraSpacePt = 2.5
): NotesSplitResult {
  const cleanText = cleanMultilineText(text) || '-';
  const singleFs = fitFontSize(cleanText, page1BoxW, page1BoxH, EVAL_MAX_FONT, {
    minFontPt: 6.5,
    paraSpacePt,
  });

  if (singleFs >= EVAL_SINGLE_SLIDE_MIN_FONT) {
    return {
      hasPage2: false,
      page1Text: cleanText,
      page1FontSize: singleFs,
      page2Text: '',
      page2FontSize: EVAL_MAX_FONT,
    };
  }

  let units = cleanText.split('\n').filter((l) => l.trim().length > 0);
  let joiner = '\n';

  if (units.length <= 1) {
    const sentences = cleanText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length > 1) {
      units = sentences;
      joiner = ' ';
    } else {
      const words = cleanText.split(/\s+/).filter(Boolean);
      if (words.length > 1) {
        units = words;
        joiner = ' ';
      }
    }
  }

  if (units.length <= 1) {
    return {
      hasPage2: false,
      page1Text: cleanText,
      page1FontSize: singleFs,
      page2Text: '',
      page2FontSize: EVAL_MAX_FONT,
    };
  }

  let bestK = 1;
  let bestScore = -Infinity;
  let bestFs1 = singleFs;
  let bestFs2 = EVAL_MAX_FONT;

  for (let k = 1; k < units.length; k++) {
    const p1 = units.slice(0, k).join(joiner);
    const p2 = units.slice(k).join(joiner);
    const fs1 = fitFontSize(p1, page1BoxW, page1BoxH, EVAL_MAX_FONT, {
      minFontPt: 6.5,
      paraSpacePt,
    });
    const fs2 = fitFontSize(p2, EVAL_PAGE2_BOX_W, EVAL_PAGE2_BOX_H, EVAL_MAX_FONT, {
      minFontPt: 6.5,
      paraSpacePt: 3,
    });

    const lines1 = estimateWrappedLines(p1, page1BoxW, fs1, false);
    const estH1 = (lines1 * fs1 * 1.24) / 72;
    const util1 = Math.min(1, estH1 / (page1BoxH * 0.9));

    const minFs = Math.min(fs1, fs2);
    const score = minFs * 100 + (util1 >= 0.5 ? 25 : util1 * 30) + util1 * 5 + (fs1 + fs2) * 0.2;

    if (score > bestScore) {
      bestScore = score;
      bestK = k;
      bestFs1 = fs1;
      bestFs2 = fs2;
    }
  }

  if (Math.min(bestFs1, bestFs2) <= singleFs + 0.5) {
    return {
      hasPage2: false,
      page1Text: cleanText,
      page1FontSize: singleFs,
      page2Text: '',
      page2FontSize: EVAL_MAX_FONT,
    };
  }

  return {
    hasPage2: true,
    page1Text: units.slice(0, bestK).join(joiner),
    page1FontSize: bestFs1,
    page2Text: units.slice(bestK).join(joiner),
    page2FontSize: bestFs2,
  };
}

export async function exportDashboardToPptx({
  programs,
  selectedMonth,
  selectedYear,
  selectedSeksi,
  authSession = null,
  exportMode = 'evaluasi',
  title = 'Laporan Presentasi Rapat & Evaluasi Program Kerja',
}: PptxExportOptions): Promise<void> {
  const pptx = new pptxgen();
  const roleFileSlug = getAuthRoleFileSlug(authSession, selectedSeksi);

  // Widescreen 16:9 modern layout (13.333" x 7.50")
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Dewan Pastoral Paroki';
  pptx.company = 'Paroki Katolik';
  pptx.title =
    exportMode === 'program_saja'
      ? 'Presentasi Rencana Program Kerja Paroki (Tanpa Evaluasi)'
      : title;

  // Urutkan program secara sistematis (urutan divisi, bulan, nama) bukan urutan input
  const sortedPrograms = sortProgramsSystematically(programs);

  const currentCalMonth = new Date().getMonth() + 1;
  const activeMonthNum = selectedMonth === 'all' ? currentCalMonth : selectedMonth;
  const activeBulanObj = BULAN_LIST.find((b) => b.no === activeMonthNum);
  const bulanLabel = selectedMonth === 'all' ? 'Sepanjang Tahun (12 Bulan)' : `Bulan ${activeBulanObj?.nama || 'Berjalan'}`;
  const tahunLabel = selectedYear === 'all' ? 'Tahun 2026 & 2027' : `Tahun ${selectedYear}`;
  const seksiLabel = selectedSeksi === 'all' ? 'Semua Seksi / Komisi' : selectedSeksi;
  const tanggalHariIni = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Calculate Summary Stats with multi-month & selectedMonth='all' support
  let totalPagu = 0;
  let totalRealisasi = 0;
  let countTerlaksana = 0;
  let countTerlaksanaSebagian = 0;
  let countTidakTerlaksana = 0;
  let countPerubahanWaktu = 0;
  let countBelumTerlaksana = 0;

  sortedPrograms.forEach((p) => {
    const alokasi = selectedMonth === 'all' ? (p.estimasiAnggaran || 0) : getAlokasiBudgetBulanan(p, selectedMonth);
    totalPagu += alokasi;

    const summary = getProgramExecutionSummary(p, selectedMonth);
    const ev = getLatestEvaluasi(p, selectedMonth);

    if (summary.overallStatus === 'terlaksana_sebagian') {
      countTerlaksanaSebagian++;
      countTerlaksana++;
      totalRealisasi +=
        selectedMonth === 'all'
          ? summary.totalRealisasiTerpakai
          : typeof ev?.anggaranTerpakai === 'number'
          ? ev.anggaranTerpakai
          : 0;
    } else if (selectedMonth === 'all' && summary.overallStatus === 'terlaksana_penuh') {
      countTerlaksana++;
      totalRealisasi +=
        summary.totalRealisasiTerpakai > 0 ? summary.totalRealisasiTerpakai : ev?.anggaranTerpakai || 0;
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

  const totalCount = sortedPrograms.length;
  const persentaseKeterlaksanaan = totalCount > 0 ? Math.round((countTerlaksana / totalCount) * 100) : 0;
  const sisaAnggaran = totalPagu - totalRealisasi;
  const serapanAnggaran = totalPagu > 0 ? Math.round((totalRealisasi / totalPagu) * 100) : 0;

  // =========================================================================
  // MODE KHUSUS: HANYA PROGRAM SAJA (TANPA EVALUASI & REALISASI)
  // =========================================================================
  if (exportMode === 'program_saja') {
    let countBiasa = 0;
    let countRutin = 0;
    let countTentatif = 0;
    const seksiMap = new Map<string, { name: string; count: number; totalBudget: number }>();

    sortedPrograms.forEach((p) => {
      if (p.kategoriProgram === 'program_rutin') countRutin++;
      else if (p.kategoriProgram === 'program_tentatif') countTentatif++;
      else countBiasa++;

      const seksiName = p.penanggungjawab?.divisi || 'Seksi Paroki';
      const alokasi = selectedMonth === 'all' ? (p.estimasiAnggaran || 0) : getAlokasiBudgetBulanan(p, selectedMonth);
      const prev = seksiMap.get(seksiName) || { name: seksiName, count: 0, totalBudget: 0 };
      prev.count += 1;
      prev.totalBudget += alokasi;
      seksiMap.set(seksiName, prev);
    });

    const seksiStats = Array.from(seksiMap.values()).sort(
      (a, b) => getDivisionOrder(a.name) - getDivisionOrder(b.name)
    );

    // -----------------------------------------------------------------------
    // SLIDE 1: COVER SLIDE (PROGRAM KERJA SAJA)
    // -----------------------------------------------------------------------
    const slideCoverOnly = pptx.addSlide();
    slideCoverOnly.background = { color: '0F172A' };

    slideCoverOnly.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.15,
      fill: { color: '38BDF8' },
    });

    slideCoverOnly.addText('DEWAN PASTORAL PAROKI · PRESENTASI RENCANA PROGRAM KERJA', {
      x: 1.0,
      y: 1.5,
      w: 11.33,
      h: 0.35,
      fontSize: 11,
      fontFace: 'Arial',
      bold: true,
      color: '38BDF8',
    });

    slideCoverOnly.addText('DAFTAR & RENCANA PROGRAM KERJA PAROKI', {
      x: 1.0,
      y: 1.95,
      w: 11.33,
      h: 1.0,
      fontSize: 28,
      fontFace: 'Arial',
      bold: true,
      color: 'FFFFFF',
    });

    slideCoverOnly.addText('Informasi Program Kerja, Tujuan, Target Sasaran, Jadwal & Alokasi Anggaran (Tanpa Evaluasi)', {
      x: 1.0,
      y: 2.95,
      w: 11.33,
      h: 0.45,
      fontSize: 15,
      fontFace: 'Arial',
      color: 'CBD5E1',
    });

    slideCoverOnly.addShape(pptx.ShapeType.roundRect, {
      x: 1.0,
      y: 3.55,
      w: 11.33,
      h: 0.55,
      rectRadius: 0.08,
      fill: { color: '1E293B' },
      line: { color: '334155', width: 1 },
    });
    slideCoverOnly.addText(`Periode: ${bulanLabel}   ·   ${tahunLabel}   ·   Unit: ${seksiLabel}`, {
      x: 1.2,
      y: 3.55,
      w: 10.9,
      h: 0.55,
      fontSize: 12,
      fontFace: 'Arial',
      bold: true,
      color: '38BDF8',
      valign: 'middle',
    });

    const cW = 3.6;
    const cY = 4.45;

    slideCoverOnly.addShape(pptx.ShapeType.roundRect, {
      x: 1.0,
      y: cY,
      w: cW,
      h: 1.8,
      rectRadius: 0.1,
      fill: { color: '1E293B' },
      line: { color: '334155', width: 1 },
    });
    slideCoverOnly.addText('TOTAL PROGRAM KERJA', { x: 1.25, y: cY + 0.2, w: cW - 0.5, h: 0.25, fontSize: 10, bold: true, color: '94A3B8' });
    slideCoverOnly.addText(`${totalCount} Program`, { x: 1.25, y: cY + 0.5, w: cW - 0.5, h: 0.6, fontSize: 24, bold: true, color: 'FFFFFF' });
    slideCoverOnly.addText(`Aktif pada ${bulanLabel}`, { x: 1.25, y: cY + 1.2, w: cW - 0.5, h: 0.35, fontSize: 9.5, color: '64748B' });

    slideCoverOnly.addShape(pptx.ShapeType.roundRect, {
      x: 4.86,
      y: cY,
      w: cW,
      h: 1.8,
      rectRadius: 0.1,
      fill: { color: '1E3A8A' },
      line: { color: '3B82F6', width: 1.5 },
    });
    slideCoverOnly.addText('CAKUPAN SEKSI / UNIT', { x: 5.11, y: cY + 0.2, w: cW - 0.5, h: 0.25, fontSize: 10, bold: true, color: '93C5FD' });
    slideCoverOnly.addText(`${seksiStats.length} Seksi / Unit`, { x: 5.11, y: cY + 0.5, w: cW - 0.5, h: 0.6, fontSize: 22, bold: true, color: 'FFFFFF' });
    slideCoverOnly.addText(`Biasa: ${countBiasa} · Rutin: ${countRutin} · Tentatif: ${countTentatif}`, { x: 5.11, y: cY + 1.2, w: cW - 0.5, h: 0.35, fontSize: 9.2, color: 'DBEAFE' });

    slideCoverOnly.addShape(pptx.ShapeType.roundRect, {
      x: 8.73,
      y: cY,
      w: cW,
      h: 1.8,
      rectRadius: 0.1,
      fill: { color: '1E293B' },
      line: { color: '334155', width: 1 },
    });
    slideCoverOnly.addText('TOTAL PAGU ANGGARAN', { x: 8.98, y: cY + 0.2, w: cW - 0.5, h: 0.25, fontSize: 10, bold: true, color: '94A3B8' });
    slideCoverOnly.addText(formatRupiah(totalPagu), { x: 8.98, y: cY + 0.5, w: cW - 0.5, h: 0.6, fontSize: 18, bold: true, color: '38BDF8' });
    slideCoverOnly.addText('Estimasi kebutuhan dana terencana', { x: 8.98, y: cY + 1.2, w: cW - 0.5, h: 0.35, fontSize: 9.5, color: '64748B' });

    slideCoverOnly.addText(`Dokumen Rencana Program Kerja (Tanpa Evaluasi) · Diekspor pada: ${tanggalHariIni} · Dewan Pastoral Paroki`, {
      x: 1.0,
      y: 6.8,
      w: 11.33,
      h: 0.35,
      fontSize: 9,
      fontFace: 'Arial',
      color: '64748B',
    });

    // -----------------------------------------------------------------------
    // SLIDE 2: RINGKASAN RENCANA PROGRAM & REKAP PER SEKSI
    // -----------------------------------------------------------------------
    let slideNoOnly = 2;
    const slideSumOnly = pptx.addSlide();
    slideSumOnly.background = { color: 'F8FAFC' };

    slideSumOnly.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.05, fill: { color: '0F172A' } });
    slideSumOnly.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: '38BDF8' } });
    slideSumOnly.addText('RINGKASAN RENCANA PROGRAM KERJA & PAGU ANGGARAN', {
      x: 0.8,
      y: 0.18,
      w: 11.5,
      h: 0.4,
      fontSize: 18,
      fontFace: 'Arial',
      bold: true,
      color: 'FFFFFF',
    });
    slideSumOnly.addText(`Periode: ${bulanLabel} ${tahunLabel} · ${seksiLabel} · Daftar Program Tanpa Data Evaluasi`, {
      x: 0.8,
      y: 0.6,
      w: 11.5,
      h: 0.3,
      fontSize: 10,
      fontFace: 'Arial',
      color: '94A3B8',
    });

    const sCardW = 2.75;
    const sCardH = 1.45;
    const sCardY = 1.25;

    // KPI 1
    slideSumOnly.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: sCardY, w: sCardW, h: sCardH, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: 'CBD5E1', width: 1 } });
    slideSumOnly.addText('TOTAL PROGRAM', { x: 1.0, y: sCardY + 0.14, w: sCardW - 0.4, h: 0.22, fontSize: 9.5, bold: true, color: '64748B' });
    slideSumOnly.addText(`${totalCount}`, { x: 1.0, y: sCardY + 0.38, w: sCardW - 0.4, h: 0.55, fontSize: 28, bold: true, color: '0F172A' });
    slideSumOnly.addText(`Terjadwal pada ${bulanLabel}`, { x: 1.0, y: sCardY + 1.0, w: sCardW - 0.4, h: 0.3, fontSize: 8.8, color: '64748B' });

    // KPI 2
    slideSumOnly.addShape(pptx.ShapeType.roundRect, { x: 3.79, y: sCardY, w: sCardW, h: sCardH, rectRadius: 0.08, fill: { color: 'EFF6FF' }, line: { color: '93C5FD', width: 1.2 } });
    slideSumOnly.addText('SEKSI / UNIT TERLIBAT', { x: 3.99, y: sCardY + 0.14, w: sCardW - 0.4, h: 0.22, fontSize: 9.5, bold: true, color: '1E40AF' });
    slideSumOnly.addText(`${seksiStats.length}`, { x: 3.99, y: sCardY + 0.38, w: sCardW - 0.4, h: 0.55, fontSize: 28, bold: true, color: '1D4ED8' });
    slideSumOnly.addText('Unit pelaksana program paroki', { x: 3.99, y: sCardY + 1.0, w: sCardW - 0.4, h: 0.3, fontSize: 8.8, color: '1E40AF' });

    // KPI 3
    slideSumOnly.addShape(pptx.ShapeType.roundRect, { x: 6.78, y: sCardY, w: sCardW, h: sCardH, rectRadius: 0.08, fill: { color: 'F0FDF4' }, line: { color: '86EFAC', width: 1.2 } });
    slideSumOnly.addText('SIFAT / KATEGORI PROKER', { x: 6.98, y: sCardY + 0.14, w: sCardW - 0.4, h: 0.22, fontSize: 9.5, bold: true, color: '166534' });
    slideSumOnly.addText(`${countBiasa} Biasa`, { x: 6.98, y: sCardY + 0.38, w: sCardW - 0.4, h: 0.55, fontSize: 22, bold: true, color: '15803D' });
    slideSumOnly.addText(`Rutin: ${countRutin} · Tentatif: ${countTentatif}`, { x: 6.98, y: sCardY + 1.0, w: sCardW - 0.4, h: 0.3, fontSize: 8.8, bold: true, color: '166534' });

    // KPI 4
    slideSumOnly.addShape(pptx.ShapeType.roundRect, { x: 9.77, y: sCardY, w: sCardW, h: sCardH, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: 'CBD5E1', width: 1 } });
    slideSumOnly.addText('TOTAL PAGU ANGGARAN', { x: 9.97, y: sCardY + 0.14, w: sCardW - 0.4, h: 0.22, fontSize: 9.5, bold: true, color: '475569' });
    slideSumOnly.addText(formatCompactRupiah(totalPagu), { x: 9.97, y: sCardY + 0.38, w: sCardW - 0.4, h: 0.55, fontSize: 22, bold: true, color: '0F172A' });
    slideSumOnly.addText(formatRupiah(totalPagu), { x: 9.97, y: sCardY + 1.0, w: sCardW - 0.4, h: 0.3, fontSize: 8.8, bold: true, color: '0284C7' });

    // Bottom Seksi Summary Table inside Slide 2
    slideSumOnly.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 2.9,
      w: 11.72,
      h: 3.9,
      rectRadius: 0.08,
      fill: { color: 'FFFFFF' },
      line: { color: 'CBD5E1', width: 1 },
    });
    slideSumOnly.addText('REKAPITULASI JUMLAH PROGRAM & ALOKASI PAGU ANGGARAN PER SEKSI / UNIT', {
      x: 1.05,
      y: 3.04,
      w: 11.2,
      h: 0.28,
      fontSize: 10.5,
      bold: true,
      color: '0F172A',
    });

    const MAX_SEKSI_ROWS = 8;
    const displaySeksi = seksiStats.slice(0, MAX_SEKSI_ROWS);
    if (seksiStats.length > MAX_SEKSI_ROWS) {
      const rest = seksiStats.slice(MAX_SEKSI_ROWS);
      displaySeksi.push({
        name: `Unit / Seksi Lainnya (${rest.length} seksi)`,
        count: rest.reduce((acc, s) => acc + s.count, 0),
        totalBudget: rest.reduce((acc, s) => acc + s.totalBudget, 0),
      });
    }

    const seksiTblRows: any[][] = [
      [
        { text: 'No', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'center', fontSize: 8.5, valign: 'middle' } },
        { text: 'Nama Seksi / Bidang / Unit', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'left', fontSize: 8.5, valign: 'middle' } },
        { text: 'Jumlah Program', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'center', fontSize: 8.5, valign: 'middle' } },
        { text: 'Alokasi Pagu Anggaran', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'right', fontSize: 8.5, valign: 'middle' } },
        { text: 'Porsi (%)', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'right', fontSize: 8.5, valign: 'middle' } },
      ],
    ];
    displaySeksi.forEach((s, idx) => {
      const pct = totalPagu > 0 ? Math.round((s.totalBudget / totalPagu) * 100) : 0;
      const bg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
      seksiTblRows.push([
        { text: `${idx + 1}`, options: { fill: { color: bg }, align: 'center', fontSize: 8.2, color: '64748B', valign: 'middle' } },
        { text: s.name, options: { fill: { color: bg }, align: 'left', bold: true, fontSize: 8.5, color: '0F172A', valign: 'middle' } },
        { text: `${s.count} Proker`, options: { fill: { color: bg }, align: 'center', bold: true, fontSize: 8.5, color: '1D4ED8', valign: 'middle' } },
        { text: formatRupiah(s.totalBudget), options: { fill: { color: bg }, align: 'right', bold: true, fontSize: 8.5, color: '0F172A', valign: 'middle' } },
        { text: `${pct}%`, options: { fill: { color: bg }, align: 'right', fontSize: 8.2, color: '475569', valign: 'middle' } },
      ]);
    });

    slideSumOnly.addTable(seksiTblRows, {
      x: 1.05,
      y: 3.4,
      w: 11.22,
      colW: [0.55, 5.2, 1.6, 2.57, 1.3],
      rowH: 0.31,
      border: { pt: 0.5, color: 'E2E8F0' },
      margin: [0.03, 0.08, 0.03, 0.08],
      autoPage: false,
    });

    slideSumOnly.addText(`Dewan Pastoral Paroki · Ringkasan Program Kerja (Tanpa Evaluasi) · Slide ${slideNoOnly}`, {
      x: 0.8,
      y: 6.95,
      w: 11.72,
      h: 0.35,
      fontSize: 8.5,
      fontFace: 'Arial',
      color: '94A3B8',
    });

    // -----------------------------------------------------------------------
    // SLIDE 3+: MATRIKS DAFTAR PROGRAM KERJA (TANPA EVALUASI - FONT 2X + AUTO-FIT)
    // -----------------------------------------------------------------------
    const onlyMatColW = [0.55, 2.35, 1.45, 1.15, 1.4, 1.35, 1.6, 2.58];
    interface OnlyMatRowData {
      overallIdx: number;
      namaProg: string;
      divisiTxt: string;
      katLabel: string;
      jadwalText: string;
      pjNama: string;
      alokasi: number;
      alokasiTxt: string;
      tujuanTargetText: string;
      estHeight: number;
    }

    const preparedOnlyMat: OnlyMatRowData[] = sortedPrograms.map((p, idx) => {
      const kat = getKategoriProgramInfo(p.kategoriProgram);
      const alokasi = selectedMonth === 'all' ? (p.estimasiAnggaran || 0) : getAlokasiBudgetBulanan(p, selectedMonth);
      const jadwalBln =
        p.tipeJadwal === 'sepanjang_tahun'
          ? 'Jan - Des (Rutin)'
          : p.tipeJadwal === 'akan_ditentukan' && (!p.bulanPelaksanaan || p.bulanPelaksanaan.length === 0)
          ? 'Akan Ditentukan'
          : p.bulanPelaksanaan?.map((m) => BULAN_LIST[m - 1]?.singkatan || m).join(', ') || 'Akan Ditentukan';
      const jadwalText = p.tanggalSpesifik ? `${jadwalBln}\n(${cleanSingleLine(p.tanggalSpesifik)})` : jadwalBln;
      const namaProg = cleanSingleLine(p.namaProgram || '-');
      const divisiTxt = cleanSingleLine(p.penanggungjawab?.divisi || 'Seksi Paroki');
      const pjNama = cleanSingleLine(p.penanggungjawab?.nama || '-');
      const alokasiTxt = formatRupiah(alokasi);
      const tujuanTargetText = `Tujuan: ${cleanSingleLine(p.tujuanKegiatan || '-')}\nTarget: ${cleanSingleLine(p.targetSasaran || '-')}`;

      const lTitle = estimateWrappedLines(namaProg, onlyMatColW[1] - 0.12, 15, true);
      const lDiv = estimateWrappedLines(divisiTxt, onlyMatColW[2] - 0.12, 14.5, false);
      const lJadwal = estimateWrappedLines(jadwalText, onlyMatColW[4] - 0.12, 14, false);
      const lTarget = estimateWrappedLines(tujuanTargetText, onlyMatColW[7] - 0.12, 14, false);
      const maxLinesNeeded = Math.max(lTitle, lDiv, lJadwal, lTarget, 2);
      const naturalH = 0.22 + maxLinesNeeded * 0.255;
      const estHeight = Math.min(4.85, Math.max(1.2, Math.min(naturalH, 2.45)));

      return {
        overallIdx: idx + 1,
        namaProg,
        divisiTxt,
        katLabel: kat.label,
        jadwalText,
        pjNama,
        alokasi,
        alokasiTxt,
        tujuanTargetText,
        estHeight,
      };
    });

    const onlyMatPages: OnlyMatRowData[][] = [];
    let curOnlyPage: OnlyMatRowData[] = [];
    let curOnlyH = 0;

    preparedOnlyMat.forEach((item) => {
      if (curOnlyPage.length > 0 && (curOnlyH + item.estHeight > 5.08 || curOnlyPage.length >= 4)) {
        onlyMatPages.push(curOnlyPage);
        curOnlyPage = [];
        curOnlyH = 0;
      }
      curOnlyPage.push(item);
      curOnlyH += item.estHeight;
    });
    if (curOnlyPage.length > 0) onlyMatPages.push(curOnlyPage);

    const totalOnlyMatPages = onlyMatPages.length;

    for (let pageIdx = 0; pageIdx < totalOnlyMatPages; pageIdx++) {
      slideNoOnly++;
      const slideMat = pptx.addSlide();
      slideMat.background = { color: 'F8FAFC' };

      slideMat.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.12, fill: { color: '0F172A' } });
      slideMat.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: '38BDF8' } });
      slideMat.addText(
        totalOnlyMatPages > 1
          ? `MATRIKS PROGRAM KERJA (${pageIdx + 1}/${totalOnlyMatPages})`
          : 'MATRIKS DAFTAR PROGRAM KERJA PAROKI',
        { x: 0.45, y: 0.14, w: 12.43, h: 0.52, fontSize: 26, fontFace: 'Arial', bold: true, color: 'FFFFFF' }
      );
      const onlyMatSub = `Daftar Program ${bulanLabel} ${tahunLabel} · ${seksiLabel}`;
      slideMat.addText(onlyMatSub, {
        x: 0.45,
        y: 0.68,
        w: 12.43,
        h: 0.36,
        fontSize: fitFontSize(onlyMatSub, 12.43, 0.36, 16, { maxLines: 1 }),
        fontFace: 'Arial',
        color: '94A3B8',
      });

      const pageItems = onlyMatPages[pageIdx];
      const matRows: any[][] = [
        [
          { text: 'No', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'center', fontSize: 15, valign: 'middle' } },
          { text: 'Nama Program Kerja', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'left', fontSize: 15, valign: 'middle' } },
          { text: 'Seksi / Unit', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'left', fontSize: 15, valign: 'middle' } },
          { text: 'Kategori', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'center', fontSize: 15, valign: 'middle' } },
          { text: 'Jadwal', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'left', fontSize: 15, valign: 'middle' } },
          { text: 'Penanggung Jawab', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'left', fontSize: 15, valign: 'middle' } },
          { text: 'Pagu Anggaran', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'right', fontSize: 15, valign: 'middle' } },
          { text: 'Tujuan & Sasaran', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'left', fontSize: 15, valign: 'middle' } },
        ],
      ];

      pageItems.forEach((row, rIdx) => {
        const rowBg = rIdx % 2 === 1 ? 'F1F5F9' : 'FFFFFF';
        const cellH = row.estHeight - 0.08;

        matRows.push([
          { text: `${row.overallIdx}`, options: { fill: { color: rowBg }, align: 'center', fontSize: 15, color: '475569', valign: 'middle' } },
          { text: row.namaProg, options: { fill: { color: rowBg }, align: 'left', bold: true, fontSize: fitFontSize(row.namaProg, onlyMatColW[1] - 0.12, cellH, 15, { bold: true }), color: '0F172A', valign: 'middle' } },
          { text: row.divisiTxt, options: { fill: { color: rowBg }, align: 'left', fontSize: fitFontSize(row.divisiTxt, onlyMatColW[2] - 0.12, cellH, 14.5), color: '334155', valign: 'middle' } },
          { text: row.katLabel, options: { fill: { color: rowBg }, align: 'center', bold: true, fontSize: fitFontSize(row.katLabel, onlyMatColW[3] - 0.12, cellH, 14.5, { bold: true }), color: '1E40AF', valign: 'middle' } },
          { text: row.jadwalText, options: { fill: { color: rowBg }, align: 'left', fontSize: fitFontSize(row.jadwalText, onlyMatColW[4] - 0.12, cellH, 14), color: '334155', valign: 'middle' } },
          { text: row.pjNama, options: { fill: { color: rowBg }, align: 'left', fontSize: fitFontSize(row.pjNama, onlyMatColW[5] - 0.12, cellH, 14.5), color: '334155', valign: 'middle' } },
          { text: row.alokasiTxt, options: { fill: { color: rowBg }, align: 'right', bold: true, fontSize: fitFontSize(row.alokasiTxt, onlyMatColW[6] - 0.12, cellH, 14.5, { bold: true, maxLines: 1 }), color: row.alokasi < 0 ? 'B91C1C' : '0F172A', valign: 'middle' } },
          { text: row.tujuanTargetText, options: { fill: { color: rowBg }, align: 'left', fontSize: fitFontSize(row.tujuanTargetText, onlyMatColW[7] - 0.12, cellH, 14), color: '334155', valign: 'middle' } },
        ]);
      });

      slideMat.addTable(matRows, {
        x: 0.45,
        y: 1.24,
        w: 12.43,
        colW: onlyMatColW,
        rowH: [0.54, ...pageItems.map((r) => r.estHeight)],
        border: { pt: 0.5, color: 'CBD5E1' },
        margin: [0.04, 0.05, 0.04, 0.05],
        autoPage: false,
      });

      slideMat.addText(`Dewan Pastoral Paroki · Matriks Program Kerja · Slide ${slideNoOnly}`, {
        x: 0.45,
        y: 7.02,
        w: 12.43,
        h: 0.36,
        fontSize: 15,
        fontFace: 'Arial',
        color: '94A3B8',
      });
    }

    // -----------------------------------------------------------------------
    // SLIDE DETAIL PER PROGRAM (HANYA RENCANA PROGRAM, TANPA EVALUASI - FONT 2X + AUTO-FIT)
    // -----------------------------------------------------------------------
    sortedPrograms.forEach((prog, index) => {
      slideNoOnly++;
      const slide = pptx.addSlide();
      slide.background = { color: 'F8FAFC' };

      const katInfo = getKategoriProgramInfo(prog.kategoriProgram);
      const alokasiBulan = selectedMonth === 'all' ? (prog.estimasiAnggaran || 0) : getAlokasiBudgetBulanan(prog, selectedMonth);

      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.14, fill: { color: '0F172A' } });
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: '38BDF8' } });

      const eyebrowOnly = `PROGRAM #${index + 1}/${sortedPrograms.length} · ${cleanSingleLine(prog.penanggungjawab?.divisi || 'SEKSI PAROKI').toUpperCase()} · ${prog.tahun}`;
      slide.addText(eyebrowOnly, {
        x: 0.45,
        y: 0.14,
        w: 9.2,
        h: 0.3,
        fontSize: fitFontSize(eyebrowOnly, 9.2, 0.3, 15, { bold: true, maxLines: 1 }),
        fontFace: 'Arial',
        bold: true,
        color: '38BDF8',
      });

      const titleOnly = cleanSingleLine(prog.namaProgram || '-');
      slide.addText(titleOnly, {
        x: 0.45,
        y: 0.44,
        w: 9.2,
        h: 0.64,
        fontSize: fitFontSize(titleOnly, 9.2, 0.64, 26, { bold: true }),
        fontFace: 'Arial',
        bold: true,
        color: 'FFFFFF',
        valign: 'middle',
      });

      const badgeTextOnly = `${katInfo.label}${prog.isLuarRancangan ? '\n(Insidental)' : ''}`;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 9.85,
        y: 0.2,
        w: 3.03,
        h: 0.74,
        rectRadius: 0.08,
        fill: { color: 'EFF6FF' },
        line: { color: '3B82F6', width: 1.5 },
      });
      slide.addText(badgeTextOnly, {
        x: 9.9,
        y: 0.2,
        w: 2.93,
        h: 0.74,
        fontSize: fitFontSize(badgeTextOnly, 2.93, 0.74, 16, { bold: true }),
        fontFace: 'Arial',
        bold: true,
        color: '1E3A8A',
        align: 'center',
        valign: 'middle',
      });

      // LEFT PANEL: TUJUAN, TARGET SASARAN & PENANGGUNG JAWAB
      const cLX = 0.45;
      const cRX = 6.76;
      const panelY = 1.24;
      const panelW = 6.12;
      const panelH = 5.72;

      slide.addShape(pptx.ShapeType.roundRect, { x: cLX, y: panelY, w: panelW, h: panelH, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: 'CBD5E1', width: 1 } });
      slide.addText('1. TUJUAN, SASARAN & PENANGGUNG JAWAB', {
        x: cLX + 0.2,
        y: panelY + 0.12,
        w: panelW - 0.4,
        h: 0.34,
        fontSize: 17,
        bold: true,
        color: '0F172A',
      });

      const tujuanOnlyText = cleanMultilineText(prog.tujuanKegiatan || '') || 'Belum ada deskripsi tujuan kegiatan.';
      slide.addShape(pptx.ShapeType.roundRect, { x: cLX + 0.2, y: panelY + 0.52, w: panelW - 0.4, h: 1.78, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 } });
      slide.addText('Tujuan Kegiatan / Program:', { x: cLX + 0.32, y: panelY + 0.58, w: panelW - 0.64, h: 0.28, fontSize: 15, bold: true, color: '64748B' });
      slide.addText(tujuanOnlyText, {
        x: cLX + 0.32,
        y: panelY + 0.9,
        w: panelW - 0.64,
        h: 1.32,
        fontSize: fitFontSize(tujuanOnlyText, panelW - 0.64, 1.32, 16),
        color: '1E293B',
        valign: 'top',
      });

      const sasaranOnlyText = cleanMultilineText(prog.targetSasaran || '') || 'Seluruh umat paroki sesuai unit terkait.';
      slide.addShape(pptx.ShapeType.roundRect, { x: cLX + 0.2, y: panelY + 2.4, w: panelW - 0.4, h: 1.56, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 } });
      slide.addText('Target Sasaran / Output:', { x: cLX + 0.32, y: panelY + 2.46, w: panelW - 0.64, h: 0.28, fontSize: 15, bold: true, color: '64748B' });
      slide.addText(sasaranOnlyText, {
        x: cLX + 0.32,
        y: panelY + 2.78,
        w: panelW - 0.64,
        h: 1.1,
        fontSize: fitFontSize(sasaranOnlyText, panelW - 0.64, 1.1, 16),
        color: '0F172A',
        valign: 'top',
      });

      const pjOnlyText = `Seksi: ${cleanSingleLine(prog.penanggungjawab?.divisi || '-')}\nPJ: ${cleanSingleLine(prog.penanggungjawab?.nama || '-')}\nKontak: ${cleanSingleLine(prog.penanggungjawab?.kontak || '-')}`;
      slide.addShape(pptx.ShapeType.roundRect, { x: cLX + 0.2, y: panelY + 4.06, w: panelW - 0.4, h: 1.52, fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', width: 1 } });
      slide.addText('Penanggung Jawab & Seksi:', { x: cLX + 0.32, y: panelY + 4.12, w: panelW - 0.64, h: 0.28, fontSize: 15, bold: true, color: '1E40AF' });
      slide.addText(pjOnlyText, {
        x: cLX + 0.32,
        y: panelY + 4.44,
        w: panelW - 0.64,
        h: 1.06,
        fontSize: fitFontSize(pjOnlyText, panelW - 0.64, 1.06, 15.5, { bold: true }),
        bold: true,
        color: '0F172A',
        valign: 'top',
      });

      // RIGHT PANEL: JADWAL PELAKSANAAN, PAGU ANGGARAN & CATATAN RENCANA
      slide.addShape(pptx.ShapeType.roundRect, { x: cRX, y: panelY, w: panelW, h: panelH, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: 'CBD5E1', width: 1 } });
      slide.addText('2. JADWAL, ANGGARAN & CATATAN', {
        x: cRX + 0.2,
        y: panelY + 0.12,
        w: panelW - 0.4,
        h: 0.34,
        fontSize: 17,
        bold: true,
        color: '0F172A',
      });

      const jadwalBulanStr =
        prog.tipeJadwal === 'sepanjang_tahun'
          ? 'Setiap Bulan (Jan - Des)'
          : prog.tipeJadwal === 'akan_ditentukan' && (!prog.bulanPelaksanaan || prog.bulanPelaksanaan.length === 0)
          ? 'Jadwal akan ditentukan kemudian'
          : prog.bulanPelaksanaan?.map((m) => BULAN_LIST[m - 1]?.singkatan || BULAN_LIST[m - 1]?.nama).join(', ') || 'Sesuai jadwal';
      const jadwalOnlyText = `Tipe: ${getTipeJadwalLabel(prog.tipeJadwal)}\nBulan: ${jadwalBulanStr}${prog.tanggalSpesifik ? ` (${cleanSingleLine(prog.tanggalSpesifik)})` : ''}`;

      slide.addShape(pptx.ShapeType.roundRect, { x: cRX + 0.2, y: panelY + 0.52, w: panelW - 0.4, h: 1.34, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 } });
      slide.addText('Jadwal & Waktu Pelaksanaan:', { x: cRX + 0.32, y: panelY + 0.58, w: panelW - 0.64, h: 0.28, fontSize: 15, bold: true, color: '64748B' });
      slide.addText(jadwalOnlyText, {
        x: cRX + 0.32,
        y: panelY + 0.88,
        w: panelW - 0.64,
        h: 0.92,
        fontSize: fitFontSize(jadwalOnlyText, panelW - 0.64, 0.92, 15.5, { bold: true }),
        bold: true,
        color: '0F172A',
        valign: 'top',
      });

      // Pagu Anggaran Rencana (2 boxes side by side)
      const halfBoxW = (panelW - 0.4 - 0.16) / 2;
      const paguOnlyStr = formatRupiah(alokasiBulan);
      const estOnlyStr = formatRupiah(prog.estimasiAnggaran || 0);
      slide.addShape(pptx.ShapeType.roundRect, { x: cRX + 0.2, y: panelY + 1.96, w: halfBoxW, h: 1.08, fill: { color: 'EEF2FF' }, line: { color: 'C7D2FE', width: 1 } });
      slide.addText(selectedMonth === 'all' ? 'Total Pagu Anggaran' : `Pagu ${activeBulanObj?.singkatan || ''}`, { x: cRX + 0.32, y: panelY + 2.04, w: halfBoxW - 0.24, h: 0.28, fontSize: 14.5, bold: true, color: '3730A3' });
      slide.addText(paguOnlyStr, {
        x: cRX + 0.32,
        y: panelY + 2.38,
        w: halfBoxW - 0.24,
        h: 0.56,
        fontSize: fitFontSize(paguOnlyStr, halfBoxW - 0.24, 0.56, 20, { bold: true, maxLines: 1 }),
        bold: true,
        color: '312E81',
      });

      slide.addShape(pptx.ShapeType.roundRect, { x: cRX + 0.2 + halfBoxW + 0.16, y: panelY + 1.96, w: halfBoxW, h: 1.08, fill: { color: 'F8FAFC' }, line: { color: 'CBD5E1', width: 1 } });
      slide.addText('Estimasi Tahunan', { x: cRX + 0.32 + halfBoxW + 0.16, y: panelY + 2.04, w: halfBoxW - 0.24, h: 0.28, fontSize: 14.5, bold: true, color: '475569' });
      slide.addText(estOnlyStr, {
        x: cRX + 0.32 + halfBoxW + 0.16,
        y: panelY + 2.38,
        w: halfBoxW - 0.24,
        h: 0.56,
        fontSize: fitFontSize(estOnlyStr, halfBoxW - 0.24, 0.56, 20, { bold: true, maxLines: 1 }),
        bold: true,
        color: '0F172A',
      });

      // Rincian Rencana Bulanan & Catatan Perencanaan (Tanpa Evaluasi)
      const planNotes: string[] = [];
      if (prog.catatanBulanan && Object.keys(prog.catatanBulanan).length > 0) {
        Object.entries(prog.catatanBulanan)
          .sort(([a], [b]) => Number(a) - Number(b))
          .forEach(([mStr, note]) => {
            if (note?.trim()) {
              const mName = BULAN_LIST[Number(mStr) - 1]?.singkatan || `Bln ${mStr}`;
              const mBudget = getAlokasiBudgetBulanan(prog, Number(mStr));
              planNotes.push(`• ${mName} (${formatCompactRupiah(mBudget)}): ${cleanSingleLine(note)}`);
            }
          });
      }
      if (prog.catatan?.trim()) planNotes.push(`Catatan: ${cleanSingleLine(prog.catatan)}`);
      if (prog.tindakLanjutKendala?.trim()) planNotes.push(`Tindak Lanjut: ${cleanSingleLine(prog.tindakLanjutKendala)}`);
      if (prog.rekomendasiDPPH?.trim()) planNotes.push(`DPPH: ${cleanSingleLine(prog.rekomendasiDPPH)}`);
      if (prog.catatanAdmin?.trim()) planNotes.push(`Arahan: ${cleanSingleLine(prog.catatanAdmin)}`);
      if (prog.tahun === 2027 && prog.catatanPastorParoki?.catatan?.trim()) {
        const stDpp = prog.catatanPastorParoki.statusPersetujuan.replace(/_/g, ' ').toUpperCase();
        planNotes.push(`DPP 2027 [${stDpp}]: ${cleanSingleLine(prog.catatanPastorParoki.catatan)}`);
      }

      const planNotesStr = cleanMultilineText(planNotes.join('\n')) || 'Tidak ada catatan perencanaan tambahan.';
      const planNotesFs = fitFontSize(planNotesStr, panelW - 0.64, 1.96, 15, { paraSpacePt: 2 });

      slide.addShape(pptx.ShapeType.roundRect, { x: cRX + 0.2, y: panelY + 3.14, w: panelW - 0.4, h: 2.44, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 } });
      slide.addText('Catatan Perencanaan & Arahan:', { x: cRX + 0.32, y: panelY + 3.22, w: panelW - 0.64, h: 0.28, fontSize: 15, bold: true, color: '475569' });
      slide.addText(planNotesStr, {
        x: cRX + 0.32,
        y: panelY + 3.54,
        w: panelW - 0.64,
        h: 1.96,
        fontSize: planNotesFs,
        color: '1E293B',
        valign: 'top',
        paraSpaceAfter: planNotesFs >= 13 ? 2 : 0.5,
      });

      slide.addText(`Dewan Pastoral Paroki · Rencana Program #${index + 1} · Slide ${slideNoOnly}`, {
        x: 0.45,
        y: 7.02,
        w: 12.43,
        h: 0.36,
        fontSize: 15,
        fontFace: 'Arial',
        color: '94A3B8',
      });
    });

    // -----------------------------------------------------------------------
    // SLIDE PENUTUP (PROGRAM SAJA - FONT 2X)
    // -----------------------------------------------------------------------
    slideNoOnly++;
    const slideCloseOnly = pptx.addSlide();
    slideCloseOnly.background = { color: '0F172A' };
    slideCloseOnly.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.15, fill: { color: '38BDF8' } });
    slideCloseOnly.addText('DEWAN PASTORAL PAROKI · RENCANA PROGRAM KERJA', {
      x: 0.6,
      y: 1.4,
      w: 12.13,
      h: 0.55,
      fontSize: 22,
      fontFace: 'Arial',
      bold: true,
      color: '38BDF8',
      align: 'center',
    });
    slideCloseOnly.addText('TERIMA KASIH & SALAM PASTORAL', {
      x: 0.6,
      y: 2.05,
      w: 12.13,
      h: 1.2,
      fontSize: 48,
      fontFace: 'Arial',
      bold: true,
      color: 'FFFFFF',
      align: 'center',
    });
    slideCloseOnly.addText(
      'Semoga seluruh rencana dan karya pelayanan kita senantiasa membawa berkat,\nkegembiraan, dan pertumbuhan iman bagi seluruh umat paroki.',
      { x: 0.6, y: 3.35, w: 12.13, h: 1.15, fontSize: 24, fontFace: 'Arial', color: 'CBD5E1', align: 'center' }
    );
    slideCloseOnly.addShape(pptx.ShapeType.roundRect, {
      x: 1.1,
      y: 4.75,
      w: 11.13,
      h: 1.05,
      rectRadius: 0.1,
      fill: { color: '1E293B' },
      line: { color: '334155', width: 1 },
    });
    slideCloseOnly.addText(
      `${totalCount} Program  ·  ${seksiStats.length} Seksi / Unit  ·  Pagu: ${formatRupiah(totalPagu)}`,
      { x: 1.25, y: 4.75, w: 10.83, h: 1.05, fontSize: 20, bold: true, color: '38BDF8', align: 'center', valign: 'middle' }
    );
    slideCloseOnly.addText(
      `Dewan Pastoral Paroki · Daftar Rencana Program Kerja · ${tahunLabel} · Slide ${slideNoOnly}`,
      { x: 0.6, y: 6.85, w: 12.13, h: 0.45, fontSize: 15, fontFace: 'Arial', color: '64748B', align: 'center' }
    );

    const cleanBulanOnly = selectedMonth === 'all' ? 'Semua_Bulan' : activeBulanObj?.nama || 'Bulan';
    const cleanTahunOnly = selectedYear === 'all' ? '2026_2027' : selectedYear;
    await pptx.writeFile({ fileName: `Presentasi_Program_Kerja_${roleFileSlug}_${cleanBulanOnly}_${cleanTahunOnly}.pptx` });
    return;
  }

  // =========================================================================
  // SLIDE 1: COVER SLIDE (Executive Dark Widescreen - Laporan Evaluasi)
  // =========================================================================
  const slideCover = pptx.addSlide();
  slideCover.background = { color: '0F172A' };

  slideCover.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.15,
    fill: { color: '059669' },
  });

  slideCover.addText('DEWAN PASTORAL PAROKI · RAPAT EVALUASI & PLENO PROGRAM KERJA', {
    x: 1.0,
    y: 1.5,
    w: 11.33,
    h: 0.35,
    fontSize: 11,
    fontFace: 'Arial',
    bold: true,
    color: '34D399',
  });

  slideCover.addText('PRESENTASI & EVALUASI PROGRAM KERJA', {
    x: 1.0,
    y: 1.95,
    w: 11.33,
    h: 1.0,
    fontSize: 28,
    fontFace: 'Arial',
    bold: true,
    color: 'FFFFFF',
  });

  slideCover.addText('Laporan Keterlaksanaan Kegiatan, Evaluasi Per Bulan & Realisasi Anggaran Paroki', {
    x: 1.0,
    y: 2.95,
    w: 11.33,
    h: 0.45,
    fontSize: 16,
    fontFace: 'Arial',
    color: 'CBD5E1',
  });

  slideCover.addShape(pptx.ShapeType.roundRect, {
    x: 1.0,
    y: 3.55,
    w: 11.33,
    h: 0.55,
    rectRadius: 0.08,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
  });
  slideCover.addText(`Periode: ${bulanLabel}   ·   ${tahunLabel}   ·   Unit: ${seksiLabel}`, {
    x: 1.2,
    y: 3.55,
    w: 10.9,
    h: 0.55,
    fontSize: 12,
    fontFace: 'Arial',
    bold: true,
    color: '38BDF8',
    valign: 'middle',
  });

  const coverCardW = 3.6;
  const coverCardY = 4.45;

  slideCover.addShape(pptx.ShapeType.roundRect, {
    x: 1.0,
    y: coverCardY,
    w: coverCardW,
    h: 1.8,
    rectRadius: 0.1,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
  });
  slideCover.addText('TOTAL KEGIATAN TERJADWAL', {
    x: 1.25,
    y: coverCardY + 0.2,
    w: coverCardW - 0.5,
    h: 0.25,
    fontSize: 10,
    bold: true,
    color: '94A3B8',
  });
  slideCover.addText(`${totalCount} Program`, {
    x: 1.25,
    y: coverCardY + 0.5,
    w: coverCardW - 0.5,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: 'FFFFFF',
  });
  slideCover.addText(`Aktif pada ${bulanLabel}`, {
    x: 1.25,
    y: coverCardY + 1.2,
    w: coverCardW - 0.5,
    h: 0.35,
    fontSize: 9.5,
    color: '64748B',
  });

  slideCover.addShape(pptx.ShapeType.roundRect, {
    x: 4.86,
    y: coverCardY,
    w: coverCardW,
    h: 1.8,
    rectRadius: 0.1,
    fill: { color: '064E3B' },
    line: { color: '059669', width: 1.5 },
  });
  slideCover.addText('TINGKAT KETERLAKSANAAN', {
    x: 5.11,
    y: coverCardY + 0.2,
    w: coverCardW - 0.5,
    h: 0.25,
    fontSize: 10,
    bold: true,
    color: '6EE7B7',
  });
  slideCover.addText(`${persentaseKeterlaksanaan}% Terlaksana`, {
    x: 5.11,
    y: coverCardY + 0.5,
    w: coverCardW - 0.5,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: 'FFFFFF',
  });
  slideCover.addText(`${countTerlaksana} dari ${totalCount} program (${countTerlaksanaSebagian} sebagian)`, {
    x: 5.11,
    y: coverCardY + 1.2,
    w: coverCardW - 0.5,
    h: 0.35,
    fontSize: 9.5,
    color: 'A7F3D0',
  });

  slideCover.addShape(pptx.ShapeType.roundRect, {
    x: 8.73,
    y: coverCardY,
    w: coverCardW,
    h: 1.8,
    rectRadius: 0.1,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
  });
  slideCover.addText('REALISASI BIAYA TERPAKAI', {
    x: 8.98,
    y: coverCardY + 0.2,
    w: coverCardW - 0.5,
    h: 0.25,
    fontSize: 10,
    bold: true,
    color: '94A3B8',
  });
  slideCover.addText(formatRupiah(totalRealisasi), {
    x: 8.98,
    y: coverCardY + 0.5,
    w: coverCardW - 0.5,
    h: 0.6,
    fontSize: 18,
    bold: true,
    color: '38BDF8',
  });
  slideCover.addText(`Serapan: ${serapanAnggaran}% dari total pagu`, {
    x: 8.98,
    y: coverCardY + 1.2,
    w: coverCardW - 0.5,
    h: 0.35,
    fontSize: 9.5,
    color: '64748B',
  });

  slideCover.addText(`Dokumen Bahan Rapat Pleno · Diekspor pada: ${tanggalHariIni} · Dewan Pastoral Paroki Harian (DPPH)`, {
    x: 1.0,
    y: 6.8,
    w: 11.33,
    h: 0.35,
    fontSize: 9,
    fontFace: 'Arial',
    color: '64748B',
  });

  // =========================================================================
  // SLIDE 2: RINGKASAN EKSEKUTIF CAPAIAN (Dashboard Scorecard)
  // =========================================================================
  const slideExec = pptx.addSlide();
  slideExec.background = { color: 'F8FAFC' };

  slideExec.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 1.05,
    fill: { color: '0F172A' },
  });
  slideExec.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.08,
    fill: { color: '059669' },
  });
  slideExec.addText('RINGKASAN EKSEKUTIF CAPAIAN PROGRAM KERJA', {
    x: 0.8,
    y: 0.18,
    w: 10.5,
    h: 0.4,
    fontSize: 18,
    fontFace: 'Arial',
    bold: true,
    color: 'FFFFFF',
  });
  slideExec.addText(`Periode: ${bulanLabel} ${tahunLabel} · ${seksiLabel} · Dewan Pastoral Paroki`, {
    x: 0.8,
    y: 0.6,
    w: 10.5,
    h: 0.3,
    fontSize: 10,
    fontFace: 'Arial',
    color: '94A3B8',
  });

  const cardW = 2.75;
  const cardH = 2.05;
  const cardY = 1.35;

  // Card 1: Total Program
  slideExec.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: cardY,
    w: cardW,
    h: cardH,
    rectRadius: 0.08,
    fill: { color: 'FFFFFF' },
    line: { color: 'CBD5E1', width: 1 },
  });
  slideExec.addText('TOTAL PROGRAM', { x: 1.0, y: cardY + 0.18, w: cardW - 0.4, h: 0.25, fontSize: 10, bold: true, color: '64748B' });
  slideExec.addText(`${totalCount}`, { x: 1.0, y: cardY + 0.45, w: cardW - 0.4, h: 0.7, fontSize: 32, bold: true, color: '0F172A' });
  slideExec.addText(`Terjadwal aktif pada ${bulanLabel}`, { x: 1.0, y: cardY + 1.35, w: cardW - 0.4, h: 0.45, fontSize: 9.5, color: '64748B' });

  // Card 2: Terlaksana
  slideExec.addShape(pptx.ShapeType.roundRect, {
    x: 3.79,
    y: cardY,
    w: cardW,
    h: cardH,
    rectRadius: 0.08,
    fill: { color: 'ECFDF5' },
    line: { color: '10B981', width: 1.5 },
  });
  slideExec.addText('SUDAH TERLAKSANA', { x: 3.99, y: cardY + 0.18, w: cardW - 0.4, h: 0.25, fontSize: 10, bold: true, color: '065F46' });
  slideExec.addText(`${countTerlaksana}`, { x: 3.99, y: cardY + 0.45, w: cardW - 0.4, h: 0.7, fontSize: 32, bold: true, color: '047857' });
  const terlaksanaSub =
    countTerlaksanaSebagian > 0
      ? `Capaian: ${persentaseKeterlaksanaan}% · Penuh: ${countTerlaksana - countTerlaksanaSebagian} · Sebagian: ${countTerlaksanaSebagian}`
      : `Capaian: ${persentaseKeterlaksanaan}% sudah terlaksana & dievaluasi`;
  slideExec.addText(terlaksanaSub, { x: 3.99, y: cardY + 1.35, w: cardW - 0.4, h: 0.48, fontSize: 9, bold: true, color: '065F46' });

  // Card 3: Belum Terlaksana
  slideExec.addShape(pptx.ShapeType.roundRect, {
    x: 6.78,
    y: cardY,
    w: cardW,
    h: cardH,
    rectRadius: 0.08,
    fill: { color: 'FFFBEB' },
    line: { color: 'F59E0B', width: 1.5 },
  });
  slideExec.addText('BELUM TERLAKSANA', { x: 6.98, y: cardY + 0.18, w: cardW - 0.4, h: 0.25, fontSize: 10, bold: true, color: '92400E' });
  slideExec.addText(`${countBelumTerlaksana}`, { x: 6.98, y: cardY + 0.45, w: cardW - 0.4, h: 0.7, fontSize: 32, bold: true, color: 'B45309' });
  slideExec.addText('Menunggu pelaksanaan / laporan evaluasi', { x: 6.98, y: cardY + 1.35, w: cardW - 0.4, h: 0.45, fontSize: 9.5, color: '92400E' });

  // Card 4: Perubahan Jadwal / Batal
  slideExec.addShape(pptx.ShapeType.roundRect, {
    x: 9.77,
    y: cardY,
    w: cardW,
    h: cardH,
    rectRadius: 0.08,
    fill: { color: 'F1F5F9' },
    line: { color: '94A3B8', width: 1 },
  });
  slideExec.addText('GESER JADWAL / BATAL', { x: 9.97, y: cardY + 0.18, w: cardW - 0.4, h: 0.25, fontSize: 10, bold: true, color: '475569' });
  slideExec.addText(`${countPerubahanWaktu + countTidakTerlaksana}`, { x: 9.97, y: cardY + 0.45, w: cardW - 0.4, h: 0.7, fontSize: 32, bold: true, color: '334155' });
  slideExec.addText(`Geser: ${countPerubahanWaktu} · Tidak Terlaksana: ${countTidakTerlaksana}`, { x: 9.97, y: cardY + 1.35, w: cardW - 0.4, h: 0.45, fontSize: 9.5, color: '64748B' });

  // Bottom Financial Summary Box
  const finBoxY = 3.65;
  const finBoxH = 3.15;
  slideExec.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: finBoxY,
    w: 11.72,
    h: finBoxH,
    rectRadius: 0.08,
    fill: { color: 'FFFFFF' },
    line: { color: 'CBD5E1', width: 1 },
  });

  slideExec.addText('REKAPITULASI KEUANGAN: PAGU RENCANA VS REALISASI BIAYA TERPAKAI', {
    x: 1.1,
    y: finBoxY + 0.18,
    w: 11.0,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: '0F172A',
  });

  const finColW = 3.6;
  const finColY = finBoxY + 0.55;

  slideExec.addShape(pptx.ShapeType.roundRect, {
    x: 1.1,
    y: finColY,
    w: finColW,
    h: 1.8,
    fill: { color: 'F8FAFC' },
    line: { color: 'E2E8F0', width: 1 },
  });
  slideExec.addText('Total Pagu Anggaran Rencana', { x: 1.3, y: finColY + 0.18, w: finColW - 0.4, h: 0.25, fontSize: 9.5, color: '64748B', bold: true });
  slideExec.addText(formatRupiah(totalPagu), { x: 1.3, y: finColY + 0.48, w: finColW - 0.4, h: 0.55, fontSize: 18, color: '0F172A', bold: true });
  slideExec.addText('Total estimasi biaya yang disetujui pada rencana program kerja', { x: 1.3, y: finColY + 1.15, w: finColW - 0.4, h: 0.5, fontSize: 8.5, color: '94A3B8' });

  slideExec.addShape(pptx.ShapeType.roundRect, {
    x: 4.86,
    y: finColY,
    w: finColW,
    h: 1.8,
    fill: { color: 'EEF2FF' },
    line: { color: 'C7D2FE', width: 1 },
  });
  slideExec.addText('Total Realisasi Biaya Terpakai', { x: 5.06, y: finColY + 0.18, w: finColW - 0.4, h: 0.25, fontSize: 9.5, color: '3730A3', bold: true });
  slideExec.addText(formatRupiah(totalRealisasi), { x: 5.06, y: finColY + 0.48, w: finColW - 0.4, h: 0.55, fontSize: 18, color: '312E81', bold: true });
  slideExec.addText(`Serapan kas: ${serapanAnggaran}% dari total pagu anggaran yang direncanakan`, { x: 5.06, y: finColY + 1.15, w: finColW - 0.4, h: 0.5, fontSize: 8.5, color: '4F46E5' });

  slideExec.addShape(pptx.ShapeType.roundRect, {
    x: 8.62,
    y: finColY,
    w: finColW,
    h: 1.8,
    fill: { color: sisaAnggaran < 0 ? 'FEE2E2' : 'ECFDF5' },
    line: { color: sisaAnggaran < 0 ? 'FCA5A5' : 'A7F3D0', width: 1 },
  });
  slideExec.addText(sisaAnggaran < 0 ? 'Defisit / Pagu Minus' : 'Sisa Saldo Kas / Efisiensi Anggaran', {
    x: 8.82,
    y: finColY + 0.18,
    w: finColW - 0.4,
    h: 0.25,
    fontSize: 9.5,
    color: sisaAnggaran < 0 ? '991B1B' : '065F46',
    bold: true,
  });
  slideExec.addText(formatRupiah(sisaAnggaran), {
    x: 8.82,
    y: finColY + 0.48,
    w: finColW - 0.4,
    h: 0.55,
    fontSize: 18,
    color: sisaAnggaran < 0 ? 'B91C1C' : '047857',
    bold: true,
  });
  slideExec.addText('Sisa pagu yang belum terserap atau selisih lebih realisasi kegiatan', {
    x: 8.82,
    y: finColY + 1.15,
    w: finColW - 0.4,
    h: 0.5,
    fontSize: 8.5,
    color: sisaAnggaran < 0 ? 'B91C1C' : '059669',
  });

  slideExec.addShape(pptx.ShapeType.rect, {
    x: 1.1,
    y: finBoxY + 2.48,
    w: 11.12,
    h: 0.45,
    fill: { color: 'F8FAFC' },
    line: { color: 'E2E8F0', width: 1 },
  });
  slideExec.addText(
    'Fokus Evaluasi Rapat: Memastikan seluruh program terlaksana tepat sasaran, seluruh catatan evaluasi terekam rapi, dan realisasi anggaran akuntabel.',
    {
      x: 1.25,
      y: finBoxY + 2.52,
      w: 10.8,
      h: 0.38,
      fontSize: 9,
      fontFace: 'Arial',
      color: '475569',
      valign: 'middle',
    }
  );

  let currentSlideNo = 2;
  slideExec.addText(`Dewan Pastoral Paroki · Ringkasan Eksekutif · Slide ${currentSlideNo}`, {
    x: 0.8,
    y: 6.95,
    w: 11.72,
    h: 0.35,
    fontSize: 8.5,
    fontFace: 'Arial',
    color: '94A3B8',
  });

  // =========================================================================
  // SLIDES DETAIL: LAPORAN PER PROGRAM KERJA (EVALUASI & CATATAN DIPERBESAR, MAKS 2 HALAMAN)
  // =========================================================================
  sortedPrograms.forEach((prog, index) => {
    currentSlideNo++;
    const slide = pptx.addSlide();
    slide.background = { color: 'F8FAFC' };

    const summary = getProgramExecutionSummary(prog, selectedMonth);
    const ev = getLatestEvaluasi(prog, selectedMonth);
    const alokasiBulan = selectedMonth === 'all' ? (prog.estimasiAnggaran || 0) : getAlokasiBudgetBulanan(prog, selectedMonth);
    const realisasiBiaya =
      selectedMonth === 'all' && summary.totalRealisasiTerpakai > 0
        ? summary.totalRealisasiTerpakai
        : typeof ev?.anggaranTerpakai === 'number'
        ? ev.anggaranTerpakai
        : summary.totalRealisasiTerpakai;
    const sisaBiaya = alokasiBulan - realisasiBiaya;

    const isSebagian = summary.overallStatus === 'terlaksana_sebagian';
    const isTerlaksana =
      !isSebagian &&
      ((selectedMonth === 'all' && summary.overallStatus === 'terlaksana_penuh') ||
        ev?.statusKeterlaksanaan === 'terlaksana');
    const isPerubahanWaktu =
      !isSebagian &&
      !isTerlaksana &&
      ((selectedMonth === 'all' && summary.overallStatus === 'perubahan_waktu') ||
        ev?.statusKeterlaksanaan === 'perubahan_waktu');
    const isTidakTerlaksana =
      !isSebagian &&
      !isTerlaksana &&
      !isPerubahanWaktu &&
      ((selectedMonth === 'all' && summary.overallStatus === 'tidak_terlaksana') ||
        (typeof selectedMonth === 'number' && ev?.statusKeterlaksanaan === 'tidak_terlaksana'));

    const isMultiOrMonthly =
      isProgramBerulang(prog) ||
      summary.scheduledMonths.length > 1 ||
      prog.tipeJadwal === 'sepanjang_tahun' ||
      Object.keys(prog.evaluasiBulanan || {}).length > 0;

    // Keterlaksanaan status badge
    let statusLabel = '⚠️ BELUM TERLAKSANA / BELUM LAPOR';
    let statusBgColor = 'FEF3C7';
    let statusTextColor = '92400E';
    let statusBorderColor = 'F59E0B';

    if (isSebagian) {
      statusLabel = '✓ TERLAKSANA SEBAGIAN';
      statusBgColor = 'CCFBF1';
      statusTextColor = '115E59';
      statusBorderColor = '14B8A6';
    } else if (isTerlaksana) {
      statusLabel = '✓ SUDAH TERLAKSANA & DIEVALUASI';
      statusBgColor = 'D1FAE5';
      statusTextColor = '065F46';
      statusBorderColor = '10B981';
    } else if (isPerubahanWaktu) {
      statusLabel = '⏳ PERUBAHAN WAKTU / GESER';
      statusBgColor = 'E0E7FF';
      statusTextColor = '3730A3';
      statusBorderColor = '6366F1';
    } else if (isTidakTerlaksana) {
      statusLabel = '❌ TIDAK TERLAKSANA';
      statusBgColor = 'FEE2E2';
      statusTextColor = '991B1B';
      statusBorderColor = 'EF4444';
    } else if (summary.rincianTidakTerlaksana.length > 0) {
      statusLabel = '⚠️ BELUM TERLAKSANA (SEBAGIAN BATAL)';
      statusBgColor = 'FEF3C7';
      statusTextColor = '92400E';
      statusBorderColor = 'F59E0B';
    }

    // Top Header Bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 1.14,
      fill: { color: '0F172A' },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.08,
      fill: { color: '059669' },
    });

    const evalEyebrow = `PROGRAM #${index + 1}/${sortedPrograms.length} · ${cleanSingleLine(prog.penanggungjawab?.divisi || 'SEKSI PAROKI').toUpperCase()} · ${prog.tahun}`;
    slide.addText(evalEyebrow, {
      x: 0.45,
      y: 0.14,
      w: 9.2,
      h: 0.3,
      fontSize: fitFontSize(evalEyebrow, 9.2, 0.3, 15, { bold: true, maxLines: 1 }),
      fontFace: 'Arial',
      bold: true,
      color: '34D399',
    });

    const evalTitle = cleanSingleLine(prog.namaProgram || '-');
    slide.addText(evalTitle, {
      x: 0.45,
      y: 0.44,
      w: 9.2,
      h: 0.64,
      fontSize: fitFontSize(evalTitle, 9.2, 0.64, 26, { bold: true }),
      fontFace: 'Arial',
      bold: true,
      color: 'FFFFFF',
      valign: 'middle',
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 9.85,
      y: 0.18,
      w: 3.03,
      h: 0.78,
      rectRadius: 0.08,
      fill: { color: statusBgColor },
      line: { color: statusBorderColor, width: 1.5 },
    });
    slide.addText(statusLabel, {
      x: 9.9,
      y: 0.18,
      w: 2.93,
      h: 0.78,
      fontSize: fitFontSize(statusLabel, 2.93, 0.78, 15, { bold: true }),
      fontFace: 'Arial',
      bold: true,
      color: statusTextColor,
      align: 'center',
      valign: 'middle',
    });

    // ----------------------------------------------------
    // LEFT PANEL: RENCANA, SASARAN & CATATAN PROGRAM
    // ----------------------------------------------------
    const colLeftX = 0.45;
    const colY = 1.24;
    const colW = 6.12;
    const colH = 5.72;

    slide.addShape(pptx.ShapeType.roundRect, {
      x: colLeftX,
      y: colY,
      w: colW,
      h: colH,
      rectRadius: 0.08,
      fill: { color: 'FFFFFF' },
      line: { color: 'CBD5E1', width: 1 },
    });

    slide.addText('1. RENCANA, SASARAN & ANGGARAN', {
      x: colLeftX + 0.2,
      y: colY + 0.1,
      w: colW - 0.4,
      h: 0.34,
      fontSize: 16.5,
      bold: true,
      color: '0F172A',
    });

    // 1A. Tujuan Kegiatan
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colLeftX + 0.2,
      y: colY + 0.46,
      w: colW - 0.4,
      h: 1.12,
      fill: { color: 'F8FAFC' },
      line: { color: 'E2E8F0', width: 1 },
    });
    slide.addText('Tujuan Kegiatan:', {
      x: colLeftX + 0.32,
      y: colY + 0.52,
      w: colW - 0.64,
      h: 0.24,
      fontSize: 14.5,
      bold: true,
      color: '64748B',
    });
    const evalTujuanText = cleanMultilineText(prog.tujuanKegiatan || '') || 'Tidak ada deskripsi tujuan kegiatan.';
    slide.addText(evalTujuanText, {
      x: colLeftX + 0.32,
      y: colY + 0.78,
      w: colW - 0.64,
      h: 0.76,
      fontSize: fitFontSize(evalTujuanText, colW - 0.64, 0.76, 15),
      color: '1E293B',
      valign: 'top',
    });

    // 1B. Target Sasaran & Penanggung Jawab
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colLeftX + 0.2,
      y: colY + 1.64,
      w: colW - 0.4,
      h: 0.92,
      fill: { color: 'F8FAFC' },
      line: { color: 'E2E8F0', width: 1 },
    });
    slide.addText('Sasaran & Penanggung Jawab:', {
      x: colLeftX + 0.32,
      y: colY + 1.7,
      w: colW - 0.64,
      h: 0.24,
      fontSize: 14.5,
      bold: true,
      color: '64748B',
    });
    const evalSasaranPj = `Sasaran: ${cleanSingleLine(prog.targetSasaran || 'Seluruh umat paroki')}\nPJ: ${cleanSingleLine(prog.penanggungjawab?.nama || '-')} (${cleanSingleLine(prog.penanggungjawab?.kontak || '-')})`;
    slide.addText(evalSasaranPj, {
      x: colLeftX + 0.32,
      y: colY + 1.96,
      w: colW - 0.64,
      h: 0.56,
      fontSize: fitFontSize(evalSasaranPj, colW - 0.64, 0.56, 14.5, { bold: true }),
      bold: true,
      color: '0F172A',
      valign: 'top',
    });

    // 1C. Jadwal Rencana & Frekuensi
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colLeftX + 0.2,
      y: colY + 2.62,
      w: colW - 0.4,
      h: 0.86,
      fill: { color: 'F8FAFC' },
      line: { color: 'E2E8F0', width: 1 },
    });
    slide.addText('Jadwal Rencana Pelaksanaan:', {
      x: colLeftX + 0.32,
      y: colY + 2.68,
      w: colW - 0.64,
      h: 0.24,
      fontSize: 14.5,
      bold: true,
      color: '64748B',
    });
    const jadwalBulanStr =
      prog.tipeJadwal === 'sepanjang_tahun'
        ? 'Setiap Bulan (Jan - Des)'
        : prog.tipeJadwal === 'akan_ditentukan' && (!prog.bulanPelaksanaan || prog.bulanPelaksanaan.length === 0)
        ? 'Jadwal akan ditentukan kemudian'
        : prog.bulanPelaksanaan?.map((m) => BULAN_LIST[m - 1]?.singkatan || BULAN_LIST[m - 1]?.nama).join(', ') || 'Sesuai jadwal';
    const evalJadwalStr = `Bulan: ${jadwalBulanStr}${prog.tanggalSpesifik ? ` · ${cleanSingleLine(prog.tanggalSpesifik)}` : ''}`;
    slide.addText(evalJadwalStr, {
      x: colLeftX + 0.32,
      y: colY + 2.94,
      w: colW - 0.64,
      h: 0.5,
      fontSize: fitFontSize(evalJadwalStr, colW - 0.64, 0.5, 14.5, { bold: true }),
      bold: true,
      color: '0F172A',
      valign: 'top',
    });

    // 1D. Catatan Program / DPP 2027
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colLeftX + 0.2,
      y: colY + 3.54,
      w: colW - 0.4,
      h: 1.02,
      fill: { color: prog.tahun === 2027 && prog.catatanPastorParoki ? 'FFFBEB' : 'F8FAFC' },
      line: { color: prog.tahun === 2027 && prog.catatanPastorParoki ? 'FCD34D' : 'E2E8F0', width: 1 },
    });
    slide.addText('Catatan Seksi & Arahan DPP:', {
      x: colLeftX + 0.32,
      y: colY + 3.6,
      w: colW - 0.64,
      h: 0.24,
      fontSize: 14.5,
      bold: true,
      color: prog.tahun === 2027 && prog.catatanPastorParoki ? '92400E' : '64748B',
    });
    const leftNotesParts: string[] = [];
    if (prog.catatan?.trim()) leftNotesParts.push(`Catatan: ${cleanSingleLine(prog.catatan)}`);
    if (prog.tindakLanjutKendala?.trim()) leftNotesParts.push(`Tindak Lanjut: ${cleanSingleLine(prog.tindakLanjutKendala)}`);
    if (prog.rekomendasiDPPH?.trim()) leftNotesParts.push(`DPPH: ${cleanSingleLine(prog.rekomendasiDPPH)}`);
    if (prog.tahun === 2027 && prog.catatanPastorParoki) {
      const stDpp = prog.catatanPastorParoki.statusPersetujuan.replace(/_/g, ' ').toUpperCase();
      leftNotesParts.push(`DPP 2027 [${stDpp}]: ${cleanSingleLine(prog.catatanPastorParoki.catatan || '-')}`);
    }
    const leftNotesFullStr = cleanMultilineText(leftNotesParts.join('\n')) || 'Tidak ada catatan perencanaan tambahan.';
    slide.addText(leftNotesFullStr, {
      x: colLeftX + 0.32,
      y: colY + 3.86,
      w: colW - 0.64,
      h: 0.64,
      fontSize: fitFontSize(leftNotesFullStr, colW - 0.64, 0.64, 14),
      color: '1E293B',
      valign: 'top',
    });

    // 1E. Financial 3-Box Mini Table inside Left Card
    const finSubY = colY + 4.62;
    slide.addText('ALOKASI ANGGARAN & REALISASI (RP)', {
      x: colLeftX + 0.2,
      y: finSubY,
      w: colW - 0.4,
      h: 0.24,
      fontSize: 14,
      bold: true,
      color: '475569',
    });

    const miniW = 1.82;
    const miniGap = 0.13;
    const paguMiniStr = formatRupiah(alokasiBulan);
    const realMiniStr = formatRupiah(realisasiBiaya);
    const sisaMiniStr = formatRupiah(sisaBiaya);

    const isPaguMinus = alokasiBulan < 0;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colLeftX + 0.2,
      y: finSubY + 0.26,
      w: miniW,
      h: 0.78,
      fill: { color: isPaguMinus ? 'FEE2E2' : 'F8FAFC' },
      line: { color: isPaguMinus ? 'FCA5A5' : 'CBD5E1', width: 1 },
    });
    slide.addText(isPaguMinus ? '⚠️ Pagu Minus' : 'Pagu Rencana', { x: colLeftX + 0.26, y: finSubY + 0.31, w: miniW - 0.12, h: 0.24, fontSize: 13.5, bold: isPaguMinus, color: isPaguMinus ? '991B1B' : '64748B' });
    slide.addText(paguMiniStr, { x: colLeftX + 0.26, y: finSubY + 0.56, w: miniW - 0.12, h: 0.42, fontSize: fitFontSize(paguMiniStr, miniW - 0.12, 0.42, 15.5, { bold: true, maxLines: 1 }), bold: true, color: isPaguMinus ? 'B91C1C' : '0F172A' });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: colLeftX + 0.2 + miniW + miniGap,
      y: finSubY + 0.26,
      w: miniW,
      h: 0.78,
      fill: { color: 'EEF2FF' },
      line: { color: 'C7D2FE', width: 1 },
    });
    slide.addText('Realisasi Riil', { x: colLeftX + 0.26 + miniW + miniGap, y: finSubY + 0.31, w: miniW - 0.12, h: 0.24, fontSize: 13.5, color: '4338CA', bold: true });
    slide.addText(realMiniStr, { x: colLeftX + 0.26 + miniW + miniGap, y: finSubY + 0.56, w: miniW - 0.12, h: 0.42, fontSize: fitFontSize(realMiniStr, miniW - 0.12, 0.42, 15.5, { bold: true, maxLines: 1 }), bold: true, color: '312E81' });

    const isSisaDefisit = sisaBiaya < 0;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colLeftX + 0.2 + (miniW + miniGap) * 2,
      y: finSubY + 0.26,
      w: miniW,
      h: 0.78,
      fill: { color: isSisaDefisit ? 'FEE2E2' : 'ECFDF5' },
      line: { color: isSisaDefisit ? 'FCA5A5' : 'A7F3D0', width: 1 },
    });
    slide.addText(isSisaDefisit ? 'Defisit Saldo' : 'Sisa Saldo', { x: colLeftX + 0.26 + (miniW + miniGap) * 2, y: finSubY + 0.31, w: miniW - 0.12, h: 0.24, fontSize: 13.5, bold: true, color: isSisaDefisit ? '991B1B' : '065F46' });
    slide.addText(sisaMiniStr, { x: colLeftX + 0.26 + (miniW + miniGap) * 2, y: finSubY + 0.56, w: miniW - 0.12, h: 0.42, fontSize: fitFontSize(sisaMiniStr, miniW - 0.12, 0.42, 15.5, { bold: true, maxLines: 1 }), bold: true, color: isSisaDefisit ? 'B91C1C' : '047857' });

    // ----------------------------------------------------
    // RIGHT PANEL: LAPORAN HASIL EVALUASI & SEMUA CATATAN (DIMAKSIMALKAN + AUTO 2 HALAMAN)
    // ----------------------------------------------------
    const colRightX = 6.76;

    slide.addShape(pptx.ShapeType.roundRect, {
      x: colRightX,
      y: colY,
      w: colW,
      h: colH,
      rectRadius: 0.08,
      fill: { color: 'FFFFFF' },
      line: { color: 'CBD5E1', width: 1 },
    });

    const relevantMonths = getAllRelevantMonths(prog, summary);
    const allEvalNotes = collectAllEvaluationNotes(prog, selectedMonth, summary, ev);
    const notesW = colW - 0.56;

    let evalNotesSplit: NotesSplitResult = {
      hasPage2: false,
      page1Text: allEvalNotes,
      page1FontSize: 16,
      page2Text: '',
      page2FontSize: 18,
    };
    let page2SectionLabel = 'Rincian Evaluasi & Catatan Lengkap (Lanjutan):';

    if (isSebagian) {
      // TERLAKSANA SEBAGIAN
      evalNotesSplit = splitNotesIntoPages(allEvalNotes, notesW, 3.44, 2.5);
      slide.addText(
        evalNotesSplit.hasPage2
          ? '2. LAPORAN HASIL EVALUASI & CATATAN (HAL. 1/2)'
          : '2. LAPORAN HASIL EVALUASI & CATATAN',
        {
          x: colRightX + 0.2,
          y: colY + 0.1,
          w: colW - 0.4,
          h: 0.32,
          fontSize: 16.5,
          bold: true,
          color: '0F172A',
        }
      );

      slide.addShape(pptx.ShapeType.roundRect, {
        x: colRightX + 0.2,
        y: colY + 0.44,
        w: colW - 0.4,
        h: 0.8,
        fill: { color: 'CCFBF1' },
        line: { color: '14B8A6', width: 1.5 },
      });
      slide.addText(
        `✓ TERLAKSANA SEBAGIAN (${summary.terlaksanaMonths.length}/${relevantMonths.length} BLN)`,
        {
          x: colRightX + 0.32,
          y: colY + 0.49,
          w: colW - 0.64,
          h: 0.3,
          fontSize: 16,
          bold: true,
          color: '115E59',
        }
      );
      const sebSub = `Selesai: ${summary.terlaksanaMonths.length} · Batal: ${summary.tidakTerlaksanaMonths.length} · Geser: ${summary.perubahanWaktuMonths.length} · Belum: ${summary.belumTerlaksanaMonths.length}`;
      slide.addText(sebSub, {
        x: colRightX + 0.32,
        y: colY + 0.82,
        w: colW - 0.64,
        h: 0.36,
        fontSize: fitFontSize(sebSub, colW - 0.64, 0.36, 14.5, { bold: true, maxLines: 1 }),
        bold: true,
        color: '0F766E',
        valign: 'top',
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: colRightX + 0.2,
        y: colY + 1.32,
        w: colW - 0.4,
        h: 3.92,
        fill: { color: 'F8FAFC' },
        line: { color: 'CBD5E1', width: 1 },
      });
      slide.addText(
        evalNotesSplit.hasPage2
          ? 'Rincian Per Bulan & Catatan Evaluasi (Hal. 1/2):'
          : 'Rincian Per Bulan & Catatan Evaluasi:',
        {
          x: colRightX + 0.28,
          y: colY + 1.38,
          w: notesW,
          h: 0.28,
          fontSize: 15,
          bold: true,
          color: '475569',
        }
      );
      slide.addText(evalNotesSplit.page1Text, {
        x: colRightX + 0.28,
        y: colY + 1.7,
        w: notesW,
        h: 3.44,
        fontSize: evalNotesSplit.page1FontSize,
        color: '1E293B',
        valign: 'top',
        paraSpaceAfter: evalNotesSplit.page1FontSize >= 13 ? 2.5 : 0.5,
      });

      slide.addText(
        evalNotesSplit.hasPage2
          ? 'Bersambung ke Halaman 2/2 (Lanjutan Evaluasi & Catatan) →'
          : `Pleno: Berjalan sebagian (${summary.terlaksanaMonths.length}/${relevantMonths.length} bulan selesai).`,
        {
          x: colRightX + 0.2,
          y: colY + 5.28,
          w: colW - 0.4,
          h: 0.34,
          fontSize: 14,
          bold: true,
          color: '0D9488',
        }
      );
      page2SectionLabel = 'Lanjutan Rincian Per Bulan & Catatan Evaluasi:';
    } else if (isTerlaksana) {
      // SUDAH TERLAKSANA & DIEVALUASI
      evalNotesSplit = splitNotesIntoPages(allEvalNotes, notesW, 2.34, 2.5);
      slide.addText(
        evalNotesSplit.hasPage2
          ? '2. LAPORAN HASIL EVALUASI & CATATAN (HAL. 1/2)'
          : '2. LAPORAN HASIL EVALUASI & CATATAN',
        {
          x: colRightX + 0.2,
          y: colY + 0.1,
          w: colW - 0.4,
          h: 0.32,
          fontSize: 16.5,
          bold: true,
          color: '0F172A',
        }
      );

      slide.addShape(pptx.ShapeType.roundRect, {
        x: colRightX + 0.2,
        y: colY + 0.44,
        w: colW - 0.4,
        h: 0.56,
        fill: { color: 'D1FAE5' },
        line: { color: '10B981', width: 1.5 },
      });
      slide.addText(
        isMultiOrMonthly
          ? `✓ TERLAKSANA (${summary.terlaksanaMonths.length}/${relevantMonths.length} BLN SELESAI)`
          : '✓ SUDAH TERLAKSANA & DIEVALUASI',
        {
          x: colRightX + 0.32,
          y: colY + 0.46,
          w: colW - 0.64,
          h: 0.52,
          fontSize: 16.5,
          bold: true,
          color: '065F46',
          valign: 'middle',
        }
      );

      const halfW = (colW - 0.4 - 0.14) / 2;

      const tglRiilStr = ev?.tanggalPelaksanaan ? formatIndonesianDate(ev.tanggalPelaksanaan) : 'Sesuai jadwal';
      slide.addShape(pptx.ShapeType.roundRect, {
        x: colRightX + 0.2,
        y: colY + 1.06,
        w: halfW,
        h: 0.76,
        fill: { color: 'F8FAFC' },
        line: { color: 'E2E8F0', width: 1 },
      });
      slide.addText('Tanggal Riil:', { x: colRightX + 0.28, y: colY + 1.1, w: halfW - 0.16, h: 0.22, fontSize: 13.5, bold: true, color: '64748B' });
      slide.addText(tglRiilStr, {
        x: colRightX + 0.28,
        y: colY + 1.34,
        w: halfW - 0.16,
        h: 0.44,
        fontSize: fitFontSize(tglRiilStr, halfW - 0.16, 0.44, 15, { bold: true }),
        bold: true,
        color: '0F172A',
      });

      const tempatStr = cleanSingleLine(ev?.tempatPelaksanaan || 'Gereja / Aula Paroki');
      slide.addShape(pptx.ShapeType.roundRect, {
        x: colRightX + 0.2 + halfW + 0.14,
        y: colY + 1.06,
        w: halfW,
        h: 0.76,
        fill: { color: 'F8FAFC' },
        line: { color: 'E2E8F0', width: 1 },
      });
      slide.addText('Tempat / Lokasi:', { x: colRightX + 0.28 + halfW + 0.14, y: colY + 1.1, w: halfW - 0.16, h: 0.22, fontSize: 13.5, bold: true, color: '64748B' });
      slide.addText(tempatStr, {
        x: colRightX + 0.28 + halfW + 0.14,
        y: colY + 1.34,
        w: halfW - 0.16,
        h: 0.44,
        fontSize: fitFontSize(tempatStr, halfW - 0.16, 0.44, 15, { bold: true }),
        bold: true,
        color: '0F172A',
      });

      const pesertaStr = `Peserta: ${cleanSingleLine(ev?.jumlahPeserta || 'Sesuai kuota sasaran program')}`;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: colRightX + 0.2,
        y: colY + 1.88,
        w: colW - 0.4,
        h: 0.5,
        fill: { color: 'ECFDF5' },
        line: { color: '10B981', width: 1 },
      });
      slide.addText(pesertaStr, {
        x: colRightX + 0.3,
        y: colY + 1.9,
        w: colW - 0.6,
        h: 0.46,
        fontSize: fitFontSize(pesertaStr, colW - 0.6, 0.46, 15, { bold: true }),
        bold: true,
        color: '047857',
        valign: 'middle',
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: colRightX + 0.2,
        y: colY + 2.44,
        w: colW - 0.4,
        h: 2.8,
        fill: { color: 'F8FAFC' },
        line: { color: 'CBD5E1', width: 1 },
      });
      slide.addText(
        isMultiOrMonthly
          ? evalNotesSplit.hasPage2
            ? 'Rincian Per Bulan & Evaluasi (Hal. 1/2):'
            : 'Rincian Per Bulan & Evaluasi:'
          : evalNotesSplit.hasPage2
          ? 'Deskripsi & Catatan Evaluasi (Hal. 1/2):'
          : 'Deskripsi & Catatan Evaluasi:',
        {
          x: colRightX + 0.28,
          y: colY + 2.5,
          w: notesW,
          h: 0.28,
          fontSize: 15,
          bold: true,
          color: '475569',
        }
      );
      slide.addText(evalNotesSplit.page1Text, {
        x: colRightX + 0.28,
        y: colY + 2.82,
        w: notesW,
        h: 2.34,
        fontSize: evalNotesSplit.page1FontSize,
        color: '1E293B',
        valign: 'top',
        paraSpaceAfter: evalNotesSplit.page1FontSize >= 13 ? 2.5 : 0.5,
      });

      const pelaporStr = evalNotesSplit.hasPage2
        ? 'Bersambung ke Halaman 2/2 (Lanjutan Evaluasi & Catatan) →'
        : `Pelapor: ${cleanSingleLine(ev?.evaluator || prog.penanggungjawab?.nama || 'Seksi')} · ${ev?.tanggalEvaluasi ? formatIndonesianDate(ev.tanggalEvaluasi) : '-'}`;
      slide.addText(pelaporStr, {
        x: colRightX + 0.2,
        y: colY + 5.28,
        w: colW - 0.4,
        h: 0.34,
        fontSize: fitFontSize(pelaporStr, colW - 0.4, 0.34, 14, { bold: true, maxLines: 1 }),
        color: '047857',
        bold: true,
      });
      page2SectionLabel = isMultiOrMonthly
        ? 'Lanjutan Rincian Per Bulan & Evaluasi:'
        : 'Lanjutan Deskripsi & Catatan Evaluasi:';
    } else if (isPerubahanWaktu) {
      // PERUBAHAN WAKTU
      evalNotesSplit = splitNotesIntoPages(allEvalNotes, notesW, 3.22, 2.5);
      slide.addText(
        evalNotesSplit.hasPage2
          ? '2. LAPORAN HASIL EVALUASI & CATATAN (HAL. 1/2)'
          : '2. LAPORAN HASIL EVALUASI & CATATAN',
        {
          x: colRightX + 0.2,
          y: colY + 0.1,
          w: colW - 0.4,
          h: 0.32,
          fontSize: 16.5,
          bold: true,
          color: '0F172A',
        }
      );

      slide.addShape(pptx.ShapeType.roundRect, {
        x: colRightX + 0.2,
        y: colY + 0.44,
        w: colW - 0.4,
        h: 1.04,
        fill: { color: 'EEF2FF' },
        line: { color: '6366F1', width: 1.5 },
      });
      slide.addText('⏳ PERUBAHAN WAKTU / GESER JADWAL', {
        x: colRightX + 0.32,
        y: colY + 0.5,
        w: colW - 0.64,
        h: 0.28,
        fontSize: 15.5,
        bold: true,
        color: '3730A3',
      });
      const jadwalBaruStr = `Jadwal Baru: ${cleanSingleLine(ev?.jadwalBaru || 'Akan dijadwalkan ulang')}`;
      slide.addText(jadwalBaruStr, {
        x: colRightX + 0.32,
        y: colY + 0.82,
        w: colW - 0.64,
        h: 0.6,
        fontSize: fitFontSize(jadwalBaruStr, colW - 0.64, 0.6, 17.5, { bold: true }),
        bold: true,
        color: '1E1B4B',
        valign: 'top',
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: colRightX + 0.2,
        y: colY + 1.56,
        w: colW - 0.4,
        h: 3.68,
        fill: { color: 'F8FAFC' },
        line: { color: 'CBD5E1', width: 1 },
      });
      slide.addText(
        evalNotesSplit.hasPage2
          ? 'Rincian, Alasan Perubahan & Catatan (Hal. 1/2):'
          : 'Rincian, Alasan Perubahan & Catatan:',
        {
          x: colRightX + 0.28,
          y: colY + 1.62,
          w: notesW,
          h: 0.28,
          fontSize: 15,
          bold: true,
          color: '475569',
        }
      );
      slide.addText(evalNotesSplit.page1Text, {
        x: colRightX + 0.28,
        y: colY + 1.94,
        w: notesW,
        h: 3.22,
        fontSize: evalNotesSplit.page1FontSize,
        color: '1E293B',
        valign: 'top',
        paraSpaceAfter: evalNotesSplit.page1FontSize >= 13 ? 2.5 : 0.5,
      });

      slide.addText(
        evalNotesSplit.hasPage2
          ? 'Bersambung ke Halaman 2/2 (Lanjutan Evaluasi & Catatan) →'
          : 'Pleno: Sepakati jadwal baru bersama penanggung jawab Seksi.',
        {
          x: colRightX + 0.2,
          y: colY + 5.28,
          w: colW - 0.4,
          h: 0.34,
          fontSize: 14,
          bold: true,
          color: '4F46E5',
        }
      );
      page2SectionLabel = 'Lanjutan Rincian, Alasan Perubahan & Catatan:';
    } else if (isTidakTerlaksana) {
      // TIDAK TERLAKSANA
      evalNotesSplit = splitNotesIntoPages(allEvalNotes, notesW, 3.36, 2.5);
      slide.addText(
        evalNotesSplit.hasPage2
          ? '2. LAPORAN HASIL EVALUASI & CATATAN (HAL. 1/2)'
          : '2. LAPORAN HASIL EVALUASI & CATATAN',
        {
          x: colRightX + 0.2,
          y: colY + 0.1,
          w: colW - 0.4,
          h: 0.32,
          fontSize: 16.5,
          bold: true,
          color: '0F172A',
        }
      );

      slide.addShape(pptx.ShapeType.roundRect, {
        x: colRightX + 0.2,
        y: colY + 0.44,
        w: colW - 0.4,
        h: 0.9,
        fill: { color: 'FEE2E2' },
        line: { color: 'EF4444', width: 1.5 },
      });
      slide.addText('✕ KEGIATAN TIDAK TERLAKSANA / DIBATALKAN', {
        x: colRightX + 0.32,
        y: colY + 0.5,
        w: colW - 0.64,
        h: 0.3,
        fontSize: 16,
        bold: true,
        color: '991B1B',
      });
      slide.addText('Kegiatan dibatalkan / tidak dieksekusi pada jadwal rencana.', {
        x: colRightX + 0.32,
        y: colY + 0.84,
        w: colW - 0.64,
        h: 0.44,
        fontSize: 14.5,
        color: '7F1D1D',
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: colRightX + 0.2,
        y: colY + 1.42,
        w: colW - 0.4,
        h: 3.82,
        fill: { color: 'F8FAFC' },
        line: { color: 'CBD5E1', width: 1 },
      });
      slide.addText(
        evalNotesSplit.hasPage2
          ? 'Alasan Pembatalan & Catatan Evaluasi (Hal. 1/2):'
          : 'Alasan Pembatalan & Catatan Evaluasi:',
        {
          x: colRightX + 0.28,
          y: colY + 1.48,
          w: notesW,
          h: 0.28,
          fontSize: 15,
          bold: true,
          color: '475569',
        }
      );
      slide.addText(evalNotesSplit.page1Text, {
        x: colRightX + 0.28,
        y: colY + 1.8,
        w: notesW,
        h: 3.36,
        fontSize: evalNotesSplit.page1FontSize,
        color: '1E293B',
        valign: 'top',
        paraSpaceAfter: evalNotesSplit.page1FontSize >= 13 ? 2.5 : 0.5,
      });

      slide.addText(
        evalNotesSplit.hasPage2
          ? 'Bersambung ke Halaman 2/2 (Lanjutan Evaluasi & Catatan) →'
          : 'Pleno: Anggaran tidak terserap & tersimpan di kas paroki.',
        {
          x: colRightX + 0.2,
          y: colY + 5.28,
          w: colW - 0.4,
          h: 0.34,
          fontSize: 14,
          bold: true,
          color: 'DC2626',
        }
      );
      page2SectionLabel = 'Lanjutan Alasan Pembatalan & Catatan Evaluasi:';
    } else {
      // BELUM TERLAKSANA / BELUM LAPOR
      const pendingBody =
        isMultiOrMonthly || summary.rincianTidakTerlaksana.length > 0
          ? allEvalNotes
          : `${allEvalNotes !== 'Belum ada catatan evaluasi yang dicatat.' ? `${allEvalNotes}\n` : ''}Tindak Lanjut:\n1. Konfirmasi progres ke PJ Seksi.\n2. Input laporan & kuitansi bila selesai.\n3. Ajukan geser jadwal bila berubah.`;

      evalNotesSplit = splitNotesIntoPages(pendingBody, notesW, 3.34, 2.5);
      slide.addText(
        evalNotesSplit.hasPage2
          ? '2. LAPORAN HASIL EVALUASI & CATATAN (HAL. 1/2)'
          : '2. LAPORAN HASIL EVALUASI & CATATAN',
        {
          x: colRightX + 0.2,
          y: colY + 0.1,
          w: colW - 0.4,
          h: 0.32,
          fontSize: 16.5,
          bold: true,
          color: '0F172A',
        }
      );

      slide.addShape(pptx.ShapeType.roundRect, {
        x: colRightX + 0.2,
        y: colY + 0.44,
        w: colW - 0.4,
        h: 0.92,
        fill: { color: 'FFFBEB' },
        line: { color: 'F59E0B', width: 1.5 },
      });
      slide.addText(
        summary.rincianTidakTerlaksana.length > 0
          ? `⚠️ BELUM TERLAKSANA (${summary.rincianTidakTerlaksana.length} BLN BATAL)`
          : '⚠️ BELUM TERLAKSANA / BELUM LAPOR',
        {
          x: colRightX + 0.32,
          y: colY + 0.5,
          w: colW - 0.64,
          h: 0.3,
          fontSize: 16,
          bold: true,
          color: '92400E',
        }
      );
      slide.addText(
        summary.rincianTidakTerlaksana.length > 0
          ? `${summary.tidakTerlaksanaMonths.length} bulan batal, ${summary.belumTerlaksanaMonths.length} bulan menunggu pelaksanaan.`
          : 'Kegiatan terjadwal aktif, belum ada laporan pelaksanaan Seksi.',
        {
          x: colRightX + 0.32,
          y: colY + 0.84,
          w: colW - 0.64,
          h: 0.48,
          fontSize: 14.5,
          color: '78350F',
        }
      );

      slide.addShape(pptx.ShapeType.roundRect, {
        x: colRightX + 0.2,
        y: colY + 1.44,
        w: colW - 0.4,
        h: 3.8,
        fill: { color: 'F8FAFC' },
        line: { color: 'CBD5E1', width: 1 },
      });
      slide.addText(
        isMultiOrMonthly || summary.rincianTidakTerlaksana.length > 0
          ? evalNotesSplit.hasPage2
            ? 'Rincian Status Per Bulan & Catatan (Hal. 1/2):'
            : 'Rincian Status Per Bulan & Catatan:'
          : evalNotesSplit.hasPage2
          ? 'Agenda Konfirmasi Rapat Pleno (Hal. 1/2):'
          : 'Agenda Konfirmasi Rapat Pleno:',
        {
          x: colRightX + 0.28,
          y: colY + 1.5,
          w: notesW,
          h: 0.28,
          fontSize: 15,
          bold: true,
          color: '475569',
        }
      );

      slide.addText(evalNotesSplit.page1Text, {
        x: colRightX + 0.28,
        y: colY + 1.82,
        w: notesW,
        h: 3.34,
        fontSize: evalNotesSplit.page1FontSize,
        color: '334155',
        valign: 'top',
        paraSpaceAfter: evalNotesSplit.page1FontSize >= 13 ? 2.5 : 0.5,
      });

      slide.addText(
        evalNotesSplit.hasPage2
          ? 'Bersambung ke Halaman 2/2 (Lanjutan Evaluasi & Catatan) →'
          : 'Pleno: Perlu klarifikasi pengurus seksi pada sesi tanya-jawab.',
        {
          x: colRightX + 0.2,
          y: colY + 5.28,
          w: colW - 0.4,
          h: 0.34,
          fontSize: 14,
          bold: true,
          color: 'B45309',
        }
      );
      page2SectionLabel = 'Lanjutan Rincian Status Per Bulan & Catatan:';
    }

    // Slide Footer Halaman 1
    slide.addText(
      `Dewan Pastoral Paroki · Laporan Program Kerja #${index + 1}${evalNotesSplit.hasPage2 ? ' (Hal. 1/2)' : ''} · Slide ${currentSlideNo}`,
      {
        x: 0.45,
        y: 7.02,
        w: 12.43,
        h: 0.36,
        fontSize: 15,
        fontFace: 'Arial',
        color: '94A3B8',
      }
    );

    // =========================================================================
    // HALAMAN 2/2 (LANJUTAN EVALUASI & CATATAN JIKA ISI PANJANG AGAR TULISAN TETAP BESAR)
    // =========================================================================
    if (evalNotesSplit.hasPage2) {
      currentSlideNo++;
      const slide2 = pptx.addSlide();
      slide2.background = { color: 'F8FAFC' };

      slide2.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.33,
        h: 1.14,
        fill: { color: '0F172A' },
      });
      slide2.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.33,
        h: 0.08,
        fill: { color: '059669' },
      });

      const eyebrowP2 = `${evalEyebrow} · LANJUTAN EVALUASI (HAL. 2/2)`;
      slide2.addText(eyebrowP2, {
        x: 0.45,
        y: 0.14,
        w: 9.2,
        h: 0.3,
        fontSize: fitFontSize(eyebrowP2, 9.2, 0.3, 15, { bold: true, maxLines: 1 }),
        fontFace: 'Arial',
        bold: true,
        color: '34D399',
      });

      slide2.addText(evalTitle, {
        x: 0.45,
        y: 0.44,
        w: 9.2,
        h: 0.64,
        fontSize: fitFontSize(evalTitle, 9.2, 0.64, 26, { bold: true }),
        fontFace: 'Arial',
        bold: true,
        color: 'FFFFFF',
        valign: 'middle',
      });

      slide2.addShape(pptx.ShapeType.roundRect, {
        x: 9.85,
        y: 0.18,
        w: 3.03,
        h: 0.78,
        rectRadius: 0.08,
        fill: { color: statusBgColor },
        line: { color: statusBorderColor, width: 1.5 },
      });
      slide2.addText(statusLabel, {
        x: 9.9,
        y: 0.18,
        w: 2.93,
        h: 0.78,
        fontSize: fitFontSize(statusLabel, 2.93, 0.78, 15, { bold: true }),
        fontFace: 'Arial',
        bold: true,
        color: statusTextColor,
        align: 'center',
        valign: 'middle',
      });

      // Context Strip Ringkas Program
      slide2.addShape(pptx.ShapeType.roundRect, {
        x: 0.45,
        y: 1.24,
        w: 12.43,
        h: 0.48,
        rectRadius: 0.06,
        fill: { color: 'FFFFFF' },
        line: { color: 'CBD5E1', width: 1 },
      });
      const p2ContextStr = `PJ: ${cleanSingleLine(prog.penanggungjawab?.nama || '-')} · Pagu: ${formatCompactRupiah(alokasiBulan)} · Realisasi: ${formatCompactRupiah(realisasiBiaya)} · Sisa: ${formatCompactRupiah(sisaBiaya)}`;
      slide2.addText(p2ContextStr, {
        x: 0.62,
        y: 1.24,
        w: 12.1,
        h: 0.48,
        fontSize: fitFontSize(p2ContextStr, 12.1, 0.48, 15, { bold: true, maxLines: 1 }),
        bold: true,
        color: '0F172A',
        valign: 'middle',
      });

      // Full-Width Card untuk Lanjutan Evaluasi & Catatan
      slide2.addShape(pptx.ShapeType.roundRect, {
        x: 0.45,
        y: 1.8,
        w: 12.43,
        h: 5.14,
        rectRadius: 0.08,
        fill: { color: 'FFFFFF' },
        line: { color: 'CBD5E1', width: 1 },
      });
      slide2.addText('2. LANJUTAN LAPORAN HASIL EVALUASI & CATATAN (HALAMAN 2/2)', {
        x: 0.65,
        y: 1.9,
        w: 12.03,
        h: 0.34,
        fontSize: 17,
        bold: true,
        color: '0F172A',
      });

      slide2.addShape(pptx.ShapeType.roundRect, {
        x: 0.65,
        y: 2.28,
        w: 12.03,
        h: 4.52,
        fill: { color: 'F8FAFC' },
        line: { color: 'CBD5E1', width: 1 },
      });
      slide2.addText(page2SectionLabel, {
        x: 0.8,
        y: 2.34,
        w: EVAL_PAGE2_BOX_W,
        h: 0.28,
        fontSize: 15,
        bold: true,
        color: '475569',
      });
      slide2.addText(evalNotesSplit.page2Text, {
        x: 0.8,
        y: 2.66,
        w: EVAL_PAGE2_BOX_W,
        h: 4.06,
        fontSize: evalNotesSplit.page2FontSize,
        color: '1E293B',
        valign: 'top',
        paraSpaceAfter: evalNotesSplit.page2FontSize >= 13 ? 3 : 0.8,
      });

      slide2.addText(
        `Dewan Pastoral Paroki · Laporan Program Kerja #${index + 1} (Hal. 2/2) · Slide ${currentSlideNo}`,
        {
          x: 0.45,
          y: 7.02,
          w: 12.43,
          h: 0.36,
          fontSize: 15,
          fontFace: 'Arial',
          color: '94A3B8',
        }
      );
    }
  });

  // =========================================================================
  // SLIDE PENUTUP: CLOSING & PASTORAL BLESSING (FONT 2X)
  // =========================================================================
  currentSlideNo++;
  const slideClose = pptx.addSlide();
  slideClose.background = { color: '0F172A' };

  slideClose.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.15,
    fill: { color: '059669' },
  });

  slideClose.addText('DEWAN PASTORAL PAROKI · RAPAT EVALUASI & PLENO', {
    x: 0.6,
    y: 1.4,
    w: 12.13,
    h: 0.55,
    fontSize: 22,
    fontFace: 'Arial',
    bold: true,
    color: '34D399',
    align: 'center',
  });

  slideClose.addText('TERIMA KASIH & SALAM PASTORAL', {
    x: 0.6,
    y: 2.05,
    w: 12.13,
    h: 1.2,
    fontSize: 48,
    fontFace: 'Arial',
    bold: true,
    color: 'FFFFFF',
    align: 'center',
  });

  slideClose.addText(
    'Semoga seluruh rencana dan karya pelayanan kita senantiasa membawa berkat,\nkegembiraan, dan pertumbuhan iman bagi seluruh umat paroki.',
    {
      x: 0.6,
      y: 3.35,
      w: 12.13,
      h: 1.15,
      fontSize: 24,
      fontFace: 'Arial',
      color: 'CBD5E1',
      align: 'center',
    }
  );

  slideClose.addShape(pptx.ShapeType.roundRect, {
    x: 1.1,
    y: 4.75,
    w: 11.13,
    h: 1.05,
    rectRadius: 0.1,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
  });
  slideClose.addText(
    `${totalCount} Program  ·  ${persentaseKeterlaksanaan}% Terlaksana  ·  Realisasi: ${formatRupiah(totalRealisasi)}`,
    {
      x: 1.25,
      y: 4.75,
      w: 10.83,
      h: 1.05,
      fontSize: 20,
      bold: true,
      color: '38BDF8',
      align: 'center',
      valign: 'middle',
    }
  );

  slideClose.addText(
    `Dewan Pastoral Paroki · Evaluasi Program Kerja · ${tahunLabel} · Slide ${currentSlideNo}`,
    {
      x: 0.6,
      y: 6.85,
      w: 12.13,
      h: 0.45,
      fontSize: 15,
      fontFace: 'Arial',
      color: '64748B',
      align: 'center',
    }
  );

  // Clean role-based filename
  const cleanBulan = selectedMonth === 'all' ? 'Semua_Bulan' : activeBulanObj?.nama || 'Bulan';
  const cleanTahun = selectedYear === 'all' ? '2026_2027' : selectedYear;
  const fileName = `Laporan_Evaluasi_Proker_${roleFileSlug}_${cleanBulan}_${cleanTahun}.pptx`;

  await pptx.writeFile({ fileName });
}

export interface Pptx2027Options {
  programs: ProgramKerja[];
  selectedSeksi: string | 'all';
  authSession?: AuthSession | null;
  scopeLabel?: string;
  title?: string;
}

function getDpp2027StatusStyle(status?: StatusPersetujuanPastor): {
  label: string;
  shortLabel: string;
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'disetujui':
      return {
        label: '✓ DISETUJUI DPP',
        shortLabel: '✓ Disetujui',
        bg: 'D1FAE5',
        text: '065F46',
        border: '10B981',
      };
    case 'disetujui_dengan_catatan':
      return {
        label: '✓ DISETUJUI DGN CATATAN',
        shortLabel: '✓ Dgn Catatan',
        bg: 'CCFBF1',
        text: '115E59',
        border: '14B8A6',
      };
    case 'perlu_revisi':
      return {
        label: '⚠️ PERLU REVISI DPP',
        shortLabel: '⚠️ Revisi',
        bg: 'FEF3C7',
        text: '92400E',
        border: 'F59E0B',
      };
    case 'ditolak':
      return {
        label: '✕ TIDAK DISETUJUI DPP',
        shortLabel: '✕ Ditolak',
        bg: 'FEE2E2',
        text: '991B1B',
        border: 'EF4444',
      };
    case 'menunggu_review':
    default:
      return {
        label: '⏳ MENUNGGU REVIEW DPP',
        shortLabel: '⏳ Menunggu',
        bg: 'F1F5F9',
        text: '475569',
        border: '94A3B8',
      };
  }
}

export async function exportProker2027ToPptx({
  programs,
  selectedSeksi,
  authSession = null,
  scopeLabel = 'Program Kerja Final & Terjadwal 2027',
  title = 'Presentasi Rencana Program Kerja & Anggaran Tahun 2027',
}: Pptx2027Options): Promise<void> {
  const pptx = new pptxgen();
  const roleFileSlug = getAuthRoleFileSlug(authSession, selectedSeksi);
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Dewan Pastoral Paroki';
  pptx.company = 'Paroki Katolik';
  pptx.title = title;

  const sorted2027 = sortProgramsSystematically(
    programs.filter((p) => p.tahun === 2027)
  );

  const seksiLabel =
    selectedSeksi === 'all' ? 'Semua Seksi / Unit Paroki' : selectedSeksi;
  const tanggalHariIni = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // 1. Hitung total anggaran & distribusi kebutuhan pendanaan setiap bulan (Jan - Des 2027)
  const totalAnggaran2027 = sorted2027.reduce(
    (sum, p) => sum + (p.estimasiAnggaran || 0),
    0
  );

  const monthlyTotals = BULAN_LIST.map((b) => {
    let totalDana = 0;
    let activeCount = 0;
    sorted2027.forEach((p) => {
      if (isProgramAktifDiBulan(p, b.no)) {
        activeCount += 1;
        const detail = getDetailPaguBulanan(p, b.no);
        totalDana += detail.initialPlannedAlokasi;
      }
    });
    return {
      bulanNo: b.no,
      nama: b.nama,
      singkatan: b.singkatan,
      totalDana,
      activeCount,
    };
  });

  const totalDistribusiBulanan = monthlyTotals.reduce((s, m) => s + m.totalDana, 0);
  const rataRataPerBulan = Math.round(totalAnggaran2027 / 12);

  const peakMonth = monthlyTotals.reduce(
    (best, cur) => (cur.totalDana > best.totalDana ? cur : best),
    monthlyTotals[0]
  );
  const nonZeroMonths = monthlyTotals.filter((m) => m.totalDana > 0);
  const lowestActiveMonth =
    nonZeroMonths.length > 0
      ? nonZeroMonths.reduce(
          (min, cur) => (cur.totalDana < min.totalDana ? cur : min),
          nonZeroMonths[0]
        )
      : monthlyTotals[0];

  // Rekap per Seksi / Unit
  const seksiMap: Record<
    string,
    { divisi: string; count: number; totalAnggaran: number; order: number }
  > = {};
  sorted2027.forEach((p) => {
    const divName = normalizeDivisionName(p.penanggungjawab?.divisi || 'Seksi Umum');
    if (!seksiMap[divName]) {
      seksiMap[divName] = {
        divisi: divName,
        count: 0,
        totalAnggaran: 0,
        order: getDivisionOrder(divName),
      };
    }
    seksiMap[divName].count += 1;
    seksiMap[divName].totalAnggaran += p.estimasiAnggaran || 0;
  });
  const seksiBreakdown = Object.values(seksiMap).sort((a, b) => a.order - b.order);

  // Hitung status persetujuan DPP
  let countDisetujui = 0;
  let countRevisiMenunggu = 0;
  let countDitolak = 0;
  sorted2027.forEach((p) => {
    const st = p.catatanPastorParoki?.statusPersetujuan || 'menunggu_review';
    if (st === 'disetujui' || st === 'disetujui_dengan_catatan') countDisetujui += 1;
    else if (st === 'ditolak') countDitolak += 1;
    else countRevisiMenunggu += 1;
  });

  // =========================================================================
  // SLIDE 1: COVER SLIDE PRESENTASI PROGRAM KERJA 2027
  // =========================================================================
  const slideCover = pptx.addSlide();
  slideCover.background = { color: '0F172A' };

  slideCover.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.15,
    fill: { color: '059669' },
  });

  slideCover.addText('DEWAN PASTORAL PAROKI · PERENCANAAN STRATEGIS TAHUN 2027', {
    x: 1.0,
    y: 1.4,
    w: 11.33,
    h: 0.35,
    fontSize: 11,
    fontFace: 'Arial',
    bold: true,
    color: '34D399',
  });

  slideCover.addText('PRESENTASI PROGRAM KERJA & ANGGARAN TAHUN 2027', {
    x: 1.0,
    y: 1.85,
    w: 11.33,
    h: 1.0,
    fontSize: 27,
    fontFace: 'Arial',
    bold: true,
    color: 'FFFFFF',
  });

  slideCover.addText(
    'Daftar Kegiatan Terencana Tahun 2027, Alokasi Anggaran & Grafik Keperluan Pendanaan Setiap Bulan',
    {
      x: 1.0,
      y: 2.9,
      w: 11.33,
      h: 0.45,
      fontSize: 15,
      fontFace: 'Arial',
      color: 'CBD5E1',
    }
  );

  slideCover.addShape(pptx.ShapeType.roundRect, {
    x: 1.0,
    y: 3.52,
    w: 11.33,
    h: 0.55,
    rectRadius: 0.08,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
  });
  slideCover.addText(
    `Unit: ${seksiLabel}   ·   Cakupan: ${scopeLabel}   ·   Tahun Anggaran: 2027`,
    {
      x: 1.2,
      y: 3.52,
      w: 10.9,
      h: 0.55,
      fontSize: 11.5,
      fontFace: 'Arial',
      bold: true,
      color: '38BDF8',
      valign: 'middle',
    }
  );

  const cW = 3.6;
  const cY = 4.42;

  slideCover.addShape(pptx.ShapeType.roundRect, {
    x: 1.0,
    y: cY,
    w: cW,
    h: 1.85,
    rectRadius: 0.1,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
  });
  slideCover.addText('TOTAL PROGRAM KERJA 2027', {
    x: 1.25,
    y: cY + 0.2,
    w: cW - 0.5,
    h: 0.25,
    fontSize: 10,
    bold: true,
    color: '94A3B8',
  });
  slideCover.addText(`${sorted2027.length} Program`, {
    x: 1.25,
    y: cY + 0.5,
    w: cW - 0.5,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: 'FFFFFF',
  });
  slideCover.addText(`Mencakup ${seksiBreakdown.length} Seksi / Unit Paroki`, {
    x: 1.25,
    y: cY + 1.22,
    w: cW - 0.5,
    h: 0.35,
    fontSize: 9.5,
    color: '94A3B8',
  });

  slideCover.addShape(pptx.ShapeType.roundRect, {
    x: 4.86,
    y: cY,
    w: cW,
    h: 1.85,
    rectRadius: 0.1,
    fill: { color: '064E3B' },
    line: { color: '059669', width: 1.5 },
  });
  slideCover.addText('TOTAL ANGGARAN TAHUN 2027', {
    x: 5.11,
    y: cY + 0.2,
    w: cW - 0.5,
    h: 0.25,
    fontSize: 10,
    bold: true,
    color: '6EE7B7',
  });
  slideCover.addText(formatRupiah(totalAnggaran2027), {
    x: 5.11,
    y: cY + 0.5,
    w: cW - 0.5,
    h: 0.6,
    fontSize: 18,
    bold: true,
    color: 'FFFFFF',
  });
  slideCover.addText(`Rata-rata: ${formatRupiah(rataRataPerBulan)} / bulan`, {
    x: 5.11,
    y: cY + 1.22,
    w: cW - 0.5,
    h: 0.35,
    fontSize: 9.5,
    color: 'A7F3D0',
  });

  slideCover.addShape(pptx.ShapeType.roundRect, {
    x: 8.73,
    y: cY,
    w: cW,
    h: 1.85,
    rectRadius: 0.1,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
  });
  slideCover.addText('PUNCAK KEBUTUHAN DANA BULANAN', {
    x: 8.98,
    y: cY + 0.2,
    w: cW - 0.5,
    h: 0.25,
    fontSize: 10,
    bold: true,
    color: '94A3B8',
  });
  slideCover.addText(peakMonth ? peakMonth.nama : '-', {
    x: 8.98,
    y: cY + 0.5,
    w: cW - 0.5,
    h: 0.5,
    fontSize: 21,
    bold: true,
    color: 'FBBF24',
  });
  slideCover.addText(
    peakMonth
      ? `${formatRupiah(peakMonth.totalDana)} (${peakMonth.activeCount} program aktif)`
      : '-',
    {
      x: 8.98,
      y: cY + 1.18,
      w: cW - 0.5,
      h: 0.42,
      fontSize: 9.5,
      color: 'CBD5E1',
    }
  );

  slideCover.addText(
    `Dokumen Perencanaan Program Kerja 2027 · Diekspor pada: ${tanggalHariIni} · Dewan Pastoral Paroki`,
    {
      x: 1.0,
      y: 6.8,
      w: 11.33,
      h: 0.35,
      fontSize: 9,
      fontFace: 'Arial',
      color: '64748B',
    }
  );

  // =========================================================================
  // SLIDE 2+: RINGKASAN EKSEKUTIF & REKAP ANGGARAN PER SEKSI (2027)
  // =========================================================================
  let currentSlideNo = 1;
  const SEKSI_PER_SLIDE = 9;
  const totalSeksiSlides = Math.max(1, Math.ceil(seksiBreakdown.length / SEKSI_PER_SLIDE));

  for (let sPage = 0; sPage < totalSeksiSlides; sPage++) {
    currentSlideNo++;
    const isLargeSumCont = sPage > 0; // Halaman 2 (sPage === 0) tetap sama, Slide 3+ font 2x
    const slideSum = pptx.addSlide();
    slideSum.background = { color: 'F8FAFC' };

    slideSum.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: isLargeSumCont ? 1.12 : 1.05,
      fill: { color: '0F172A' },
    });
    slideSum.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.08,
      fill: { color: '059669' },
    });
    slideSum.addText(
      totalSeksiSlides > 1
        ? `RINGKASAN ANGGARAN PROKER 2027 PER SEKSI (${sPage + 1}/${totalSeksiSlides})`
        : 'RINGKASAN EKSEKUTIF & ANGGARAN PROGRAM KERJA 2027',
      {
        x: isLargeSumCont ? 0.45 : 0.8,
        y: isLargeSumCont ? 0.14 : 0.18,
        w: isLargeSumCont ? 12.43 : 11.7,
        h: isLargeSumCont ? 0.52 : 0.4,
        fontSize: isLargeSumCont ? 26 : 17.5,
        fontFace: 'Arial',
        bold: true,
        color: 'FFFFFF',
      }
    );
    slideSum.addText(`${seksiLabel} · ${scopeLabel} · Tahun Anggaran 2027`, {
      x: isLargeSumCont ? 0.45 : 0.8,
      y: isLargeSumCont ? 0.68 : 0.6,
      w: isLargeSumCont ? 12.43 : 11.7,
      h: isLargeSumCont ? 0.36 : 0.3,
      fontSize: isLargeSumCont ? 16 : 10,
      fontFace: 'Arial',
      color: '94A3B8',
    });

    if (sPage === 0) {
      const kpiW = 2.75;
      const kpiH = 1.25;
      const kpiY = 1.22;

      // KPI 1
      slideSum.addShape(pptx.ShapeType.roundRect, {
        x: 0.8,
        y: kpiY,
        w: kpiW,
        h: kpiH,
        rectRadius: 0.08,
        fill: { color: 'FFFFFF' },
        line: { color: 'CBD5E1', width: 1 },
      });
      slideSum.addText('PROGRAM KERJA 2027', {
        x: 0.98,
        y: kpiY + 0.14,
        w: kpiW - 0.36,
        h: 0.22,
        fontSize: 9,
        bold: true,
        color: '64748B',
      });
      slideSum.addText(`${sorted2027.length} Program`, {
        x: 0.98,
        y: kpiY + 0.38,
        w: kpiW - 0.36,
        h: 0.42,
        fontSize: 20,
        bold: true,
        color: '0F172A',
      });
      slideSum.addText(`${seksiBreakdown.length} Seksi / Unit terlibat`, {
        x: 0.98,
        y: kpiY + 0.88,
        w: kpiW - 0.36,
        h: 0.25,
        fontSize: 8.5,
        color: '64748B',
      });

      // KPI 2
      slideSum.addShape(pptx.ShapeType.roundRect, {
        x: 3.79,
        y: kpiY,
        w: kpiW,
        h: kpiH,
        rectRadius: 0.08,
        fill: { color: 'ECFDF5' },
        line: { color: '10B981', width: 1.5 },
      });
      slideSum.addText('TOTAL ANGGARAN 2027', {
        x: 3.97,
        y: kpiY + 0.14,
        w: kpiW - 0.36,
        h: 0.22,
        fontSize: 9,
        bold: true,
        color: '065F46',
      });
      slideSum.addText(formatRupiah(totalAnggaran2027), {
        x: 3.97,
        y: kpiY + 0.38,
        w: kpiW - 0.36,
        h: 0.42,
        fontSize: 15,
        bold: true,
        color: '047857',
      });
      slideSum.addText(`Rata-rata: ${formatCompactRupiah(rataRataPerBulan)} / bln`, {
        x: 3.97,
        y: kpiY + 0.88,
        w: kpiW - 0.36,
        h: 0.25,
        fontSize: 8.5,
        bold: true,
        color: '065F46',
      });

      // KPI 3
      slideSum.addShape(pptx.ShapeType.roundRect, {
        x: 6.78,
        y: kpiY,
        w: kpiW,
        h: kpiH,
        rectRadius: 0.08,
        fill: { color: 'FFFBEB' },
        line: { color: 'F59E0B', width: 1.5 },
      });
      slideSum.addText('BULAN PUNCAK DANA', {
        x: 6.96,
        y: kpiY + 0.14,
        w: kpiW - 0.36,
        h: 0.22,
        fontSize: 9,
        bold: true,
        color: '92400E',
      });
      slideSum.addText(peakMonth ? peakMonth.nama : '-', {
        x: 6.96,
        y: kpiY + 0.38,
        w: kpiW - 0.36,
        h: 0.42,
        fontSize: 18,
        bold: true,
        color: 'B45309',
      });
      slideSum.addText(
        peakMonth ? formatRupiah(peakMonth.totalDana) : 'Rp 0',
        {
          x: 6.96,
          y: kpiY + 0.88,
          w: kpiW - 0.36,
          h: 0.25,
          fontSize: 8.5,
          bold: true,
          color: '92400E',
        }
      );

      // KPI 4
      slideSum.addShape(pptx.ShapeType.roundRect, {
        x: 9.77,
        y: kpiY,
        w: kpiW,
        h: kpiH,
        rectRadius: 0.08,
        fill: { color: 'EEF2FF' },
        line: { color: '6366F1', width: 1 },
      });
      slideSum.addText('STATUS PERSETUJUAN DPP', {
        x: 9.95,
        y: kpiY + 0.14,
        w: kpiW - 0.36,
        h: 0.22,
        fontSize: 9,
        bold: true,
        color: '3730A3',
      });
      slideSum.addText(`${countDisetujui} Disetujui`, {
        x: 9.95,
        y: kpiY + 0.38,
        w: kpiW - 0.36,
        h: 0.42,
        fontSize: 17,
        bold: true,
        color: '312E81',
      });
      slideSum.addText(
        `Menunggu/Revisi: ${countRevisiMenunggu}${countDitolak > 0 ? ` · Ditolak: ${countDitolak}` : ''}`,
        {
          x: 9.95,
          y: kpiY + 0.88,
          w: kpiW - 0.36,
          h: 0.25,
          fontSize: 8.2,
          color: '4338CA',
        }
      );
    }

    const sliceSeksis = seksiBreakdown.slice(
      sPage * SEKSI_PER_SLIDE,
      (sPage + 1) * SEKSI_PER_SLIDE
    );
    const tblFs = isLargeSumCont ? 15.5 : 9;
    const seksiRows: any[][] = [];
    seksiRows.push([
      { text: 'No', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'center', fontSize: tblFs, valign: 'middle' } },
      { text: 'Seksi / Unit Paroki', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'left', fontSize: tblFs, valign: 'middle' } },
      { text: 'Jumlah Program 2027', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'center', fontSize: tblFs, valign: 'middle' } },
      { text: 'Estimasi Anggaran 2027', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'right', fontSize: tblFs, valign: 'middle' } },
      { text: 'Porsi', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'right', fontSize: tblFs, valign: 'middle' } },
    ]);

    sliceSeksis.forEach((sec, idx) => {
      const no = sPage * SEKSI_PER_SLIDE + idx + 1;
      const pct =
        totalAnggaran2027 > 0
          ? ((sec.totalAnggaran / totalAnggaran2027) * 100).toFixed(1)
          : '0.0';
      const rowBg = idx % 2 === 1 ? 'F1F5F9' : 'FFFFFF';
      const divisiFs = fitFontSize(sec.divisi, (isLargeSumCont ? 5.18 : 4.98) - 0.16, (isLargeSumCont ? 0.48 : 0.38) - 0.08, tblFs, { bold: true });
      const anggaranCellTxt = formatRupiah(sec.totalAnggaran);
      const anggaranCellFs = fitFontSize(anggaranCellTxt, (isLargeSumCont ? 3.05 : 2.75) - 0.16, (isLargeSumCont ? 0.48 : 0.38) - 0.08, tblFs, { bold: true, maxLines: 1 });
      seksiRows.push([
        { text: `${no}`, options: { fill: { color: rowBg }, align: 'center', fontSize: tblFs, color: '475569', valign: 'middle' } },
        { text: sec.divisi, options: { fill: { color: rowBg }, align: 'left', bold: true, fontSize: divisiFs, color: '0F172A', valign: 'middle' } },
        { text: `${sec.count} Program`, options: { fill: { color: rowBg }, align: 'center', fontSize: tblFs, color: '334155', valign: 'middle' } },
        { text: anggaranCellTxt, options: { fill: { color: rowBg }, align: 'right', bold: true, fontSize: anggaranCellFs, color: '047857', valign: 'middle' } },
        { text: `${pct}%`, options: { fill: { color: rowBg }, align: 'right', bold: true, fontSize: tblFs, color: '334155', valign: 'middle' } },
      ]);
    });

    if (sPage === totalSeksiSlides - 1) {
      const totFs = isLargeSumCont ? 16 : 9.5;
      const totAnggaranTxt = formatRupiah(totalAnggaran2027);
      const totAnggaranFs = fitFontSize(totAnggaranTxt, (isLargeSumCont ? 3.05 : 2.75) - 0.16, (isLargeSumCont ? 0.48 : 0.38) - 0.08, totFs, { bold: true, maxLines: 1 });
      seksiRows.push([
        { text: '', options: { fill: { color: 'ECFDF5' } } },
        { text: 'TOTAL KESELURUHAN TAHUN 2027', options: { fill: { color: 'ECFDF5' }, align: 'left', bold: true, fontSize: totFs, color: '065F46', valign: 'middle' } },
        { text: `${sorted2027.length} Program`, options: { fill: { color: 'ECFDF5' }, align: 'center', bold: true, fontSize: totFs, color: '065F46', valign: 'middle' } },
        { text: totAnggaranTxt, options: { fill: { color: 'ECFDF5' }, align: 'right', bold: true, fontSize: totAnggaranFs, color: '047857', valign: 'middle' } },
        { text: '100.0%', options: { fill: { color: 'ECFDF5' }, align: 'right', bold: true, fontSize: totFs, color: '065F46', valign: 'middle' } },
      ]);
    }

    slideSum.addTable(seksiRows, {
      x: isLargeSumCont ? 0.45 : 0.8,
      y: sPage === 0 ? 2.65 : 1.24,
      w: isLargeSumCont ? 12.43 : 11.73,
      colW: isLargeSumCont ? [0.65, 5.18, 2.0, 3.05, 1.55] : [0.65, 4.98, 1.85, 2.75, 1.5],
      rowH: isLargeSumCont ? 0.48 : 0.38,
      border: { pt: 0.5, color: 'CBD5E1' },
      margin: [0.04, 0.08, 0.04, 0.08],
      autoPage: false,
    });

    slideSum.addText(
      `Dewan Pastoral Paroki · Rekapitulasi Anggaran 2027 · Slide ${currentSlideNo}`,
      {
        x: isLargeSumCont ? 0.45 : 0.8,
        y: isLargeSumCont ? 7.02 : 6.95,
        w: isLargeSumCont ? 12.43 : 11.72,
        h: 0.35,
        fontSize: isLargeSumCont ? 15 : 8.5,
        fontFace: 'Arial',
        color: '94A3B8',
      }
    );
  }

  // =========================================================================
  // SLIDE 3: GRAFIK (CHART) KEPERLUAN PENDANAAN SETIAP BULAN TAHUN 2027 (FONT 2X)
  // =========================================================================
  currentSlideNo++;
  const slideChart = pptx.addSlide();
  slideChart.background = { color: 'F8FAFC' };

  slideChart.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 1.12,
    fill: { color: '0F172A' },
  });
  slideChart.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.08,
    fill: { color: '059669' },
  });
  slideChart.addText('GRAFIK KEPERLUAN PENDANAAN BULANAN (2027)', {
    x: 0.45,
    y: 0.14,
    w: 12.43,
    h: 0.52,
    fontSize: 26,
    fontFace: 'Arial',
    bold: true,
    color: 'FFFFFF',
  });
  const chartSubText = `Proyeksi Kebutuhan Dana Jan – Des 2027 · ${seksiLabel}`;
  slideChart.addText(chartSubText, {
    x: 0.45,
    y: 0.68,
    w: 12.43,
    h: 0.36,
    fontSize: fitFontSize(chartSubText, 12.43, 0.36, 16, { maxLines: 1 }),
    fontFace: 'Arial',
    color: '94A3B8',
  });

  // Card Container untuk Chart di Kiri
  slideChart.addShape(pptx.ShapeType.roundRect, {
    x: 0.45,
    y: 1.22,
    w: 7.55,
    h: 5.02,
    rectRadius: 0.08,
    fill: { color: 'FFFFFF' },
    line: { color: 'CBD5E1', width: 1 },
  });

  const maxMonthlyDana = Math.max(...monthlyTotals.map((m) => m.totalDana), 0);
  const useMillions = maxMonthlyDana >= 2_000_000;
  const chartValues = monthlyTotals.map((m) =>
    useMillions ? Number((m.totalDana / 1_000_000).toFixed(2)) : m.totalDana
  );

  slideChart.addChart(
    pptx.ChartType.bar,
    [
      {
        name: useMillions
          ? 'Keperluan Pendanaan (Juta Rp)'
          : 'Keperluan Pendanaan (Rp)',
        labels: monthlyTotals.map((m) => m.singkatan),
        values: chartValues,
      },
    ],
    {
      x: 0.55,
      y: 1.32,
      w: 7.35,
      h: 4.82,
      barDir: 'col',
      barGapWidthPct: 40,
      chartColors: ['059669'],
      showTitle: true,
      title: useMillions
        ? 'Pendanaan Bulanan 2027 (Juta Rp)'
        : 'Pendanaan Bulanan 2027 (Rp)',
      titleFontFace: 'Arial',
      titleFontSize: 18,
      titleColor: '0F172A',
      showLegend: false,
      showValue: true,
      dataLabelPosition: 'outEnd',
      dataLabelFontFace: 'Arial',
      dataLabelFontSize: 13.5,
      dataLabelFontBold: true,
      dataLabelColor: '065F46',
      dataLabelFormatCode: useMillions ? '#,##0.0' : '#,##0',
      catAxisLabelFontFace: 'Arial',
      catAxisLabelFontSize: 15,
      catAxisLabelColor: '334155',
      valAxisLabelFontFace: 'Arial',
      valAxisLabelFontSize: 14,
      valAxisLabelColor: '475569',
      valAxisLabelFormatCode: useMillions ? '#,##0' : '#,##0',
      valAxisMinVal: 0,
      ...(maxMonthlyDana === 0 ? { valAxisMaxVal: 10 } : {}),
      showValAxisTitle: true,
      valAxisTitle: useMillions ? 'Juta Rp' : 'Rupiah',
      valAxisTitleFontFace: 'Arial',
      valAxisTitleFontSize: 15,
      valAxisTitleColor: '475569',
      valGridLine: { color: 'E2E8F0', size: 0.5, style: 'solid' },
    }
  );

  // Strip Insight Bawah Chart
  slideChart.addShape(pptx.ShapeType.roundRect, {
    x: 0.45,
    y: 6.32,
    w: 7.55,
    h: 0.56,
    rectRadius: 0.06,
    fill: { color: 'FFFBEB' },
    line: { color: 'FCD34D', width: 1 },
  });
  const insightText = `Puncak: ${peakMonth.nama} (${formatCompactRupiah(peakMonth.totalDana)})  ·  Terendah: ${lowestActiveMonth.nama} (${formatCompactRupiah(lowestActiveMonth.totalDana)})`;
  slideChart.addText(insightText, {
    x: 0.6,
    y: 6.32,
    w: 7.25,
    h: 0.56,
    fontSize: fitFontSize(insightText, 7.25, 0.56, 15, { bold: true }),
    fontFace: 'Arial',
    bold: true,
    color: '92400E',
    valign: 'middle',
  });

  // Tabel Rincian 12 Bulan di Kanan
  const monthlyTableRows: any[][] = [];
  monthlyTableRows.push([
    { text: 'Bulan', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'left', fontSize: 14.5, valign: 'middle' } },
    { text: 'Prg', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'center', fontSize: 14.5, valign: 'middle' } },
    { text: 'Keperluan Dana', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'right', fontSize: 14.5, valign: 'middle' } },
  ]);

  monthlyTotals.forEach((m, idx) => {
    const isPeak = peakMonth.totalDana > 0 && m.bulanNo === peakMonth.bulanNo;
    const rowBg = isPeak ? 'FEF3C7' : idx % 2 === 1 ? 'F1F5F9' : 'FFFFFF';
    const monthLabelTxt = isPeak ? `${m.singkatan} ★` : m.nama;
    const monthDanaTxt = formatRupiah(m.totalDana);
    monthlyTableRows.push([
      {
        text: monthLabelTxt,
        options: {
          fill: { color: rowBg },
          align: 'left',
          bold: isPeak,
          fontSize: fitFontSize(monthLabelTxt, 1.58, 0.34, 14.5, { bold: isPeak, maxLines: 1 }),
          color: isPeak ? '92400E' : '0F172A',
          valign: 'middle',
        },
      },
      {
        text: `${m.activeCount}`,
        options: {
          fill: { color: rowBg },
          align: 'center',
          fontSize: 14.5,
          color: '475569',
          valign: 'middle',
        },
      },
      {
        text: monthDanaTxt,
        options: {
          fill: { color: rowBg },
          align: 'right',
          bold: m.totalDana > 0,
          fontSize: fitFontSize(monthDanaTxt, 2.22, 0.34, 14.5, { bold: m.totalDana > 0, maxLines: 1 }),
          color: isPeak ? 'B45309' : m.totalDana > 0 ? '047857' : '94A3B8',
          valign: 'middle',
        },
      },
    ]);
  });

  const total2027CellTxt = formatRupiah(totalDistribusiBulanan || totalAnggaran2027);
  monthlyTableRows.push([
    { text: 'TOTAL 2027', options: { fill: { color: 'ECFDF5' }, align: 'left', bold: true, fontSize: 14.5, color: '065F46', valign: 'middle' } },
    { text: `${sorted2027.length}`, options: { fill: { color: 'ECFDF5' }, align: 'center', bold: true, fontSize: 14.5, color: '065F46', valign: 'middle' } },
    {
      text: total2027CellTxt,
      options: {
        fill: { color: 'ECFDF5' },
        align: 'right',
        bold: true,
        fontSize: fitFontSize(total2027CellTxt, 2.22, 0.34, 14.5, { bold: true, maxLines: 1 }),
        color: '047857',
        valign: 'middle',
      },
    },
  ]);

  slideChart.addTable(monthlyTableRows, {
    x: 8.12,
    y: 1.22,
    w: 4.76,
    colW: [1.7, 0.72, 2.34],
    rowH: 0.4,
    border: { pt: 0.5, color: 'CBD5E1' },
    margin: [0.02, 0.05, 0.02, 0.05],
    autoPage: false,
  });

  slideChart.addText(
    `Dewan Pastoral Paroki · Proyeksi Pendanaan Bulanan 2027 · Slide ${currentSlideNo}`,
    {
      x: 0.45,
      y: 7.02,
      w: 12.43,
      h: 0.36,
      fontSize: 15,
      fontFace: 'Arial',
      color: '94A3B8',
    }
  );

  // =========================================================================
  // SLIDE 4+: MATRIKS DAFTAR PROGRAM KERJA & ANGGARAN 2027 (FONT 2X, AUTO-FIT)
  // =========================================================================
  interface Matrix2027Row {
    prog: ProgramKerja;
    no: number;
    tujuanSasaran: string;
    estHeight: number;
  }

  const prepared2027Rows: Matrix2027Row[] = sorted2027.map((prog, idx) => {
    const tujuan = cleanSingleLine(prog.tujuanKegiatan || '-');
    const sasaran = cleanSingleLine(prog.targetSasaran || '-');
    const tujuanSasaran = `Tujuan: ${tujuan}\nSasaran: ${sasaran}`;
    const noteLines = estimateWrappedLines(tujuanSasaran, 2.94, 13.5, false);
    const titleLines = estimateWrappedLines(cleanSingleLine(prog.namaProgram), 2.16, 14, true);
    const divisiLines = estimateWrappedLines(cleanSingleLine(prog.penanggungjawab?.divisi || 'Seksi Paroki'), 1.28, 14, false);
    const jadwalBln =
      prog.tipeJadwal === 'sepanjang_tahun'
        ? 'Jan-Des\n(Rutin)'
        : formatBulanPelaksanaan(prog.bulanPelaksanaan, prog.tipeJadwal);
    const jadwalLines = estimateWrappedLines(jadwalBln, 1.03, 13.5, false);
    const linesCount = Math.max(noteLines, titleLines, divisiLines, jadwalLines);
    const estHeight = Math.min(2.6, Math.max(0.95, 0.24 + linesCount * 0.24));
    return { prog, no: idx + 1, tujuanSasaran, estHeight };
  });

  const matrix2027Pages: Matrix2027Row[][] = [];
  let cur2027Page: Matrix2027Row[] = [];
  let cur2027H = 0;

  prepared2027Rows.forEach((item) => {
    if (cur2027Page.length > 0 && (cur2027H + item.estHeight > 5.08 || cur2027Page.length >= 4)) {
      matrix2027Pages.push(cur2027Page);
      cur2027Page = [];
      cur2027H = 0;
    }
    cur2027Page.push(item);
    cur2027H += item.estHeight;
  });
  if (cur2027Page.length > 0) matrix2027Pages.push(cur2027Page);

  matrix2027Pages.forEach((pageRows, pageIdx) => {
    currentSlideNo++;
    const slideMat = pptx.addSlide();
    slideMat.background = { color: 'F8FAFC' };

    slideMat.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 1.12,
      fill: { color: '0F172A' },
    });
    slideMat.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.08,
      fill: { color: '059669' },
    });
    slideMat.addText(
      matrix2027Pages.length > 1
        ? `MATRIKS PROKER & ANGGARAN 2027 (${pageIdx + 1}/${matrix2027Pages.length})`
        : 'MATRIKS PROGRAM KERJA & ANGGARAN TAHUN 2027',
      {
        x: 0.45,
        y: 0.14,
        w: 12.43,
        h: 0.52,
        fontSize: 26,
        fontFace: 'Arial',
        bold: true,
        color: 'FFFFFF',
      }
    );
    const matSubText = `${seksiLabel} · ${scopeLabel}`;
    slideMat.addText(matSubText, {
      x: 0.45,
      y: 0.68,
      w: 12.43,
      h: 0.36,
      fontSize: fitFontSize(matSubText, 12.43, 0.36, 16, { maxLines: 1 }),
      fontFace: 'Arial',
      color: '94A3B8',
    });

    const tRows: any[][] = [];
    const tRowHeights: number[] = [0.54];
    tRows.push([
      { text: 'No', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'center', fontSize: 15, valign: 'middle' } },
      { text: 'Nama Program', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'left', fontSize: 15, valign: 'middle' } },
      { text: 'Seksi / Unit', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'left', fontSize: 15, valign: 'middle' } },
      { text: 'Jadwal 2027', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'center', fontSize: 15, valign: 'middle' } },
      { text: 'Kategori', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'center', fontSize: 15, valign: 'middle' } },
      { text: 'Status DPP', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'center', fontSize: 15, valign: 'middle' } },
      { text: 'Anggaran 2027', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'right', fontSize: 15, valign: 'middle' } },
      { text: 'Tujuan & Sasaran', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'left', fontSize: 15, valign: 'middle' } },
    ]);

    pageRows.forEach(({ prog: p, no, tujuanSasaran, estHeight }, rIdx) => {
      const rowBg = rIdx % 2 === 1 ? 'F1F5F9' : 'FFFFFF';
      const katInfo = getKategoriProgramInfo(p.kategoriProgram);
      const dppStyle = getDpp2027StatusStyle(p.catatanPastorParoki?.statusPersetujuan);
      const jadwalBln =
        p.tipeJadwal === 'sepanjang_tahun'
          ? 'Jan-Des\n(Rutin)'
          : formatBulanPelaksanaan(p.bulanPelaksanaan, p.tipeJadwal);
      const namaProg = cleanSingleLine(p.namaProgram);
      const divisiTxt = cleanSingleLine(p.penanggungjawab?.divisi || 'Seksi Paroki');
      const anggaranTxt = formatRupiah(p.estimasiAnggaran || 0);
      const cellAvailH = estHeight - 0.1;

      tRowHeights.push(estHeight);
      tRows.push([
        { text: `${no}`, options: { fill: { color: rowBg }, align: 'center', fontSize: 15, color: '475569', valign: 'middle' } },
        { text: namaProg, options: { fill: { color: rowBg }, align: 'left', bold: true, fontSize: fitFontSize(namaProg, 2.18, cellAvailH, 15, { bold: true }), color: '0F172A', valign: 'middle' } },
        { text: divisiTxt, options: { fill: { color: rowBg }, align: 'left', fontSize: fitFontSize(divisiTxt, 1.28, cellAvailH, 14.5), color: '334155', valign: 'middle' } },
        { text: jadwalBln, options: { fill: { color: rowBg }, align: 'center', fontSize: fitFontSize(jadwalBln, 1.03, cellAvailH, 14), color: '475569', valign: 'middle' } },
        { text: katInfo.label, options: { fill: { color: rowBg }, align: 'center', fontSize: fitFontSize(katInfo.label, 0.93, cellAvailH, 14), color: '334155', valign: 'middle' } },
        { text: dppStyle.shortLabel, options: { fill: { color: rowBg }, align: 'center', bold: true, fontSize: fitFontSize(dppStyle.shortLabel, 1.13, cellAvailH, 14, { bold: true }), color: dppStyle.text, valign: 'middle' } },
        { text: anggaranTxt, options: { fill: { color: rowBg }, align: 'right', bold: true, fontSize: fitFontSize(anggaranTxt, 1.53, cellAvailH, 14.5, { bold: true, maxLines: 1 }), color: '047857', valign: 'middle' } },
        { text: tujuanSasaran, options: { fill: { color: rowBg }, align: 'left', fontSize: fitFontSize(tujuanSasaran, 2.96, cellAvailH, 14), color: '334155', valign: 'top' } },
      ]);
    });

    slideMat.addTable(tRows, {
      x: 0.45,
      y: 1.24,
      w: 12.43,
      colW: [0.55, 2.3, 1.4, 1.15, 1.05, 1.25, 1.65, 3.08],
      rowH: tRowHeights,
      border: { pt: 0.5, color: 'CBD5E1' },
      margin: [0.04, 0.05, 0.04, 0.05],
      autoPage: false,
    });

    slideMat.addText(
      `Dewan Pastoral Paroki · Matriks Program Kerja 2027 · Slide ${currentSlideNo}`,
      {
        x: 0.45,
        y: 7.02,
        w: 12.43,
        h: 0.36,
        fontSize: 15,
        fontFace: 'Arial',
        color: '94A3B8',
      }
    );
  });

  // =========================================================================
  // SLIDES DETAIL: SETIAP PROGRAM KERJA 2027 & RINCIAN PENDANAAN PER BULAN (FONT 2X, AUTO-FIT)
  // =========================================================================
  sorted2027.forEach((prog, idx) => {
    currentSlideNo++;
    const slide = pptx.addSlide();
    slide.background = { color: 'F8FAFC' };

    const dppStyle = getDpp2027StatusStyle(prog.catatanPastorParoki?.statusPersetujuan);
    const katInfo = getKategoriProgramInfo(prog.kategoriProgram);

    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 1.14,
      fill: { color: '0F172A' },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.08,
      fill: { color: '059669' },
    });

    const eyebrow2027 = `PROKER 2027 #${idx + 1}/${sorted2027.length} · ${cleanSingleLine((prog.penanggungjawab?.divisi || 'SEKSI PAROKI').toUpperCase())} · ${cleanSingleLine(katInfo.label.toUpperCase())}`;
    slide.addText(eyebrow2027, {
      x: 0.45,
      y: 0.14,
      w: 9.2,
      h: 0.3,
      fontSize: fitFontSize(eyebrow2027, 9.2, 0.3, 15, { bold: true, maxLines: 1 }),
      fontFace: 'Arial',
      bold: true,
      color: '34D399',
    });
    const title2027 = cleanSingleLine(prog.namaProgram);
    slide.addText(title2027, {
      x: 0.45,
      y: 0.44,
      w: 9.2,
      h: 0.64,
      fontSize: fitFontSize(title2027, 9.2, 0.64, 26, { bold: true, minFontPt: 11 }),
      fontFace: 'Arial',
      bold: true,
      color: 'FFFFFF',
      valign: 'middle',
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 9.85,
      y: 0.2,
      w: 3.03,
      h: 0.74,
      rectRadius: 0.08,
      fill: { color: dppStyle.bg },
      line: { color: dppStyle.border, width: 1.5 },
    });
    slide.addText(dppStyle.label, {
      x: 9.9,
      y: 0.2,
      w: 2.93,
      h: 0.74,
      fontSize: fitFontSize(dppStyle.label, 2.85, 0.68, 15.5, { bold: true }),
      fontFace: 'Arial',
      bold: true,
      color: dppStyle.text,
      align: 'center',
      valign: 'middle',
    });

    // LEFT PANEL: RENCANA, SASARAN & JADWAL 2027
    const colLeftX = 0.45;
    const colY = 1.24;
    const colW = 6.12;
    const colH = 5.72;

    slide.addShape(pptx.ShapeType.roundRect, {
      x: colLeftX,
      y: colY,
      w: colW,
      h: colH,
      rectRadius: 0.08,
      fill: { color: 'FFFFFF' },
      line: { color: 'CBD5E1', width: 1 },
    });

    slide.addText('1. RENCANA KEGIATAN & SASARAN 2027', {
      x: colLeftX + 0.2,
      y: colY + 0.12,
      w: colW - 0.4,
      h: 0.34,
      fontSize: 16.5,
      bold: true,
      color: '0F172A',
    });

    // 1A Tujuan
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colLeftX + 0.2,
      y: colY + 0.5,
      w: colW - 0.4,
      h: 1.24,
      fill: { color: 'F8FAFC' },
      line: { color: 'E2E8F0', width: 1 },
    });
    slide.addText('Tujuan Kegiatan:', {
      x: colLeftX + 0.32,
      y: colY + 0.56,
      w: colW - 0.64,
      h: 0.26,
      fontSize: 14.5,
      bold: true,
      color: '64748B',
    });
    const tujuan2027Text = cleanMultilineText(prog.tujuanKegiatan || 'Belum ada deskripsi tujuan kegiatan.');
    slide.addText(tujuan2027Text, {
      x: colLeftX + 0.32,
      y: colY + 0.84,
      w: colW - 0.64,
      h: 0.84,
      fontSize: fitFontSize(tujuan2027Text, colW - 0.64, 0.84, 15),
      color: '1E293B',
      valign: 'top',
    });

    // 1B Target Sasaran & PJ
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colLeftX + 0.2,
      y: colY + 1.82,
      w: colW - 0.4,
      h: 1.04,
      fill: { color: 'F8FAFC' },
      line: { color: 'E2E8F0', width: 1 },
    });
    slide.addText('Sasaran & Penanggung Jawab:', {
      x: colLeftX + 0.32,
      y: colY + 1.88,
      w: colW - 0.64,
      h: 0.26,
      fontSize: 14.5,
      bold: true,
      color: '64748B',
    });
    const sasaranPj2027Text = `Sasaran: ${cleanSingleLine(prog.targetSasaran || 'Seluruh umat paroki')}\nPJ: ${cleanSingleLine(prog.penanggungjawab?.nama || '-')} (${cleanSingleLine(prog.penanggungjawab?.kontak || '-')})`;
    slide.addText(sasaranPj2027Text, {
      x: colLeftX + 0.32,
      y: colY + 2.16,
      w: colW - 0.64,
      h: 0.64,
      fontSize: fitFontSize(sasaranPj2027Text, colW - 0.64, 0.64, 14.5, { bold: true }),
      bold: true,
      color: '0F172A',
      valign: 'top',
    });

    // 1C Jadwal Rencana 2027
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colLeftX + 0.2,
      y: colY + 2.94,
      w: colW - 0.4,
      h: 1.18,
      fill: { color: 'F8FAFC' },
      line: { color: 'E2E8F0', width: 1 },
    });
    slide.addText('Jadwal Pelaksanaan 2027:', {
      x: colLeftX + 0.32,
      y: colY + 3.0,
      w: colW - 0.64,
      h: 0.26,
      fontSize: 14.5,
      bold: true,
      color: '64748B',
    });
    const jadwalBlnStr =
      prog.tipeJadwal === 'sepanjang_tahun'
        ? 'Setiap Bulan (Januari – Desember 2027)'
        : prog.tipeJadwal === 'akan_ditentukan' && (!prog.bulanPelaksanaan || prog.bulanPelaksanaan.length === 0)
        ? 'Jadwal akan ditentukan kemudian'
        : prog.bulanPelaksanaan?.map((m) => BULAN_LIST[m - 1]?.nama || BULAN_LIST[m - 1]?.singkatan).join(', ') ||
          'Sesuai jadwal';
    const jadwal2027Text = `Tipe: ${getTipeJadwalLabel(prog.tipeJadwal)}\nBulan: ${jadwalBlnStr}${prog.tanggalSpesifik ? ` (${cleanSingleLine(prog.tanggalSpesifik)})` : ''}`;
    slide.addText(jadwal2027Text, {
      x: colLeftX + 0.32,
      y: colY + 3.28,
      w: colW - 0.64,
      h: 0.78,
      fontSize: fitFontSize(jadwal2027Text, colW - 0.64, 0.78, 14.5, { bold: true }),
      bold: true,
      color: '0F172A',
      valign: 'top',
    });

    // 1D Catatan Seksi, Tindak Lanjut 2026 & Arahan DPP
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colLeftX + 0.2,
      y: colY + 4.2,
      w: colW - 0.4,
      h: 1.4,
      fill: { color: prog.catatanPastorParoki ? 'FFFBEB' : 'F8FAFC' },
      line: { color: prog.catatanPastorParoki ? 'FCD34D' : 'E2E8F0', width: 1 },
    });
    slide.addText('Catatan Seksi, Tindak Lanjut & Arahan DPP:', {
      x: colLeftX + 0.32,
      y: colY + 4.26,
      w: colW - 0.64,
      h: 0.26,
      fontSize: 14.5,
      bold: true,
      color: prog.catatanPastorParoki ? '92400E' : '64748B',
    });
    const leftNotes: string[] = [];
    if (prog.statusKelanjutan2027) {
      const kelLabel =
        prog.statusKelanjutan2027 === 'dilanjutkan'
          ? 'Kelanjutan Program 2026'
          : prog.statusKelanjutan2027 === 'baru'
          ? 'Usulan Program Baru 2027'
          : 'Tidak Dilanjutkan';
      leftNotes.push(`Status: ${kelLabel}`);
    }
    if (prog.tindakLanjutKendala?.trim()) {
      leftNotes.push(`Tindak Lanjut: ${cleanSingleLine(prog.tindakLanjutKendala)}`);
    }
    if (prog.catatan?.trim()) {
      leftNotes.push(`Catatan: ${cleanSingleLine(prog.catatan)}`);
    }
    if (prog.catatanPastorParoki?.catatan?.trim()) {
      leftNotes.push(`Arahan DPP: ${cleanSingleLine(prog.catatanPastorParoki.catatan)}`);
    }
    const leftNotesText = cleanMultilineText(leftNotes.join('\n')) || 'Tidak ada catatan tambahan.';
    const leftNotesFs = fitFontSize(leftNotesText, colW - 0.64, 1.0, 14, { paraSpacePt: 2 });
    slide.addText(leftNotesText, {
      x: colLeftX + 0.32,
      y: colY + 4.54,
      w: colW - 0.64,
      h: 1.0,
      fontSize: leftNotesFs,
      color: '1E293B',
      valign: 'top',
      paraSpaceAfter: leftNotesFs >= 12 ? 2 : 0.5,
    });

    // RIGHT PANEL: ANGGARAN & KEPERLUAN PENDANAAN PER BULAN 2027
    const colRightX = 6.76;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colRightX,
      y: colY,
      w: colW,
      h: colH,
      rectRadius: 0.08,
      fill: { color: 'FFFFFF' },
      line: { color: 'CBD5E1', width: 1 },
    });

    slide.addText('2. ANGGARAN & PENDANAAN BULANAN (2027)', {
      x: colRightX + 0.2,
      y: colY + 0.12,
      w: colW - 0.4,
      h: 0.34,
      fontSize: 16.5,
      bold: true,
      color: '0F172A',
    });

    // Budget Banner
    slide.addShape(pptx.ShapeType.roundRect, {
      x: colRightX + 0.2,
      y: colY + 0.5,
      w: colW - 0.4,
      h: 0.94,
      fill: { color: 'ECFDF5' },
      line: { color: '10B981', width: 1.5 },
    });
    slide.addText('TOTAL ESTIMASI ANGGARAN TAHUN 2027', {
      x: colRightX + 0.34,
      y: colY + 0.56,
      w: colW - 0.68,
      h: 0.28,
      fontSize: 14.5,
      bold: true,
      color: '065F46',
    });
    const totalEstAnggaranTxt = formatRupiah(prog.estimasiAnggaran || 0);
    slide.addText(totalEstAnggaranTxt, {
      x: colRightX + 0.34,
      y: colY + 0.86,
      w: colW - 0.68,
      h: 0.52,
      fontSize: fitFontSize(totalEstAnggaranTxt, colW - 0.68, 0.52, 25, { bold: true, maxLines: 1 }),
      bold: true,
      color: '047857',
    });

    // Rekomendasi Anggaran DPP jika ada
    const hasRek = typeof prog.catatanPastorParoki?.rekomendasiAnggaran === 'number';
    if (hasRek) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: colRightX + 0.2,
        y: colY + 1.52,
        w: colW - 0.4,
        h: 0.5,
        fill: { color: 'FFFBEB' },
        line: { color: 'FCD34D', width: 1 },
      });
      const rekText = `Rekomendasi DPP: ${formatRupiah(prog.catatanPastorParoki!.rekomendasiAnggaran!)}`;
      slide.addText(rekText, {
        x: colRightX + 0.34,
        y: colY + 1.52,
        w: colW - 0.68,
        h: 0.5,
        fontSize: fitFontSize(rekText, colW - 0.68, 0.5, 15, { bold: true, maxLines: 1 }),
        bold: true,
        color: '92400E',
        valign: 'middle',
      });
    }

    const monthlyBoxY = hasRek ? colY + 2.1 : colY + 1.54;
    const monthlyBoxH = hasRek ? 3.5 : 4.06;

    slide.addShape(pptx.ShapeType.roundRect, {
      x: colRightX + 0.2,
      y: monthlyBoxY,
      w: colW - 0.4,
      h: monthlyBoxH,
      fill: { color: 'F8FAFC' },
      line: { color: 'CBD5E1', width: 1 },
    });
    slide.addText('Rincian Pendanaan Per Bulan (1 Baris / Bulan):', {
      x: colRightX + 0.32,
      y: monthlyBoxY + 0.08,
      w: colW - 0.64,
      h: 0.3,
      fontSize: 14.5,
      bold: true,
      color: '475569',
    });

    const activeMonthLines: string[] = [];
    BULAN_LIST.forEach((b) => {
      if (isProgramAktifDiBulan(prog, b.no)) {
        const detail = getDetailPaguBulanan(prog, b.no);
        const jadwalSpecific = prog.jadwalBulanan?.[b.no]
          ? ` — ${cleanSingleLine(prog.jadwalBulanan[b.no])}`
          : '';
        const noteSpecific = prog.catatanBulanan?.[b.no]?.trim()
          ? ` (${cleanSingleLine(prog.catatanBulanan[b.no])})`
          : '';
        activeMonthLines.push(
          `• ${b.nama}: ${formatRupiah(detail.initialPlannedAlokasi)}${jadwalSpecific}${noteSpecific}`
        );
      }
    });

    const monthlyBreakdownText = activeMonthLines.join('\n') || 'Tidak ada alokasi bulan terjadwal.';
    const monthlyParaSpace = activeMonthLines.length > 6 ? 1 : 2;
    const monthlyFs = fitFontSize(monthlyBreakdownText, colW - 0.64, monthlyBoxH - 0.5, 15, {
      paraSpacePt: monthlyParaSpace,
    });
    slide.addText(monthlyBreakdownText, {
      x: colRightX + 0.32,
      y: monthlyBoxY + 0.42,
      w: colW - 0.64,
      h: monthlyBoxH - 0.5,
      fontSize: monthlyFs,
      color: '1E293B',
      valign: 'top',
      paraSpaceAfter: monthlyFs >= 13 ? monthlyParaSpace : 0.5,
    });

    slide.addText(
      `Dewan Pastoral Paroki · Rencana Proker 2027 #${idx + 1} · Slide ${currentSlideNo}`,
      {
        x: 0.45,
        y: 7.02,
        w: 12.43,
        h: 0.35,
        fontSize: 15,
        fontFace: 'Arial',
        color: '94A3B8',
      }
    );
  });

  // =========================================================================
  // SLIDE PENUTUP: CLOSING 2027 (FONT 2X)
  // =========================================================================
  currentSlideNo++;
  const slideClose = pptx.addSlide();
  slideClose.background = { color: '0F172A' };

  slideClose.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.15,
    fill: { color: '059669' },
  });

  slideClose.addText('DEWAN PASTORAL PAROKI · PROGRAM KERJA 2027', {
    x: 0.6,
    y: 1.4,
    w: 12.13,
    h: 0.55,
    fontSize: 22,
    fontFace: 'Arial',
    bold: true,
    color: '34D399',
    align: 'center',
  });

  slideClose.addText('TERIMA KASIH & SALAM PASTORAL', {
    x: 0.6,
    y: 2.05,
    w: 12.13,
    h: 1.2,
    fontSize: 48,
    fontFace: 'Arial',
    bold: true,
    color: 'FFFFFF',
    align: 'center',
  });

  slideClose.addText(
    'Semoga rencana program kerja 2027 dan pengelolaan anggarannya\ndapat berjalan selaras demi pelayanan umat paroki.',
    {
      x: 0.6,
      y: 3.4,
      w: 12.13,
      h: 1.25,
      fontSize: 24,
      fontFace: 'Arial',
      color: 'CBD5E1',
      align: 'center',
    }
  );

  slideClose.addShape(pptx.ShapeType.roundRect, {
    x: 1.2,
    y: 4.95,
    w: 10.93,
    h: 1.1,
    rectRadius: 0.1,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
  });
  const closeBannerTxt = `${sorted2027.length} Proker 2027 · ${formatRupiah(totalAnggaran2027)} · Puncak: ${peakMonth.nama}`;
  slideClose.addText(closeBannerTxt, {
    x: 1.4,
    y: 4.95,
    w: 10.53,
    h: 1.1,
    fontSize: fitFontSize(closeBannerTxt, 10.53, 1.1, 19, { bold: true }),
    bold: true,
    color: '38BDF8',
    align: 'center',
    valign: 'middle',
  });

  slideClose.addText(
    `Dewan Pastoral Paroki · Presentasi Proker 2027 · Slide ${currentSlideNo}`,
    {
      x: 0.6,
      y: 6.85,
      w: 12.13,
      h: 0.4,
      fontSize: 15,
      fontFace: 'Arial',
      color: '64748B',
      align: 'center',
    }
  );

  const fileName = `Presentasi_Proker_2027_${roleFileSlug}.pptx`;
  await pptx.writeFile({ fileName });
}
