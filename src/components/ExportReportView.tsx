import React, { useRef } from 'react';
import {
  Download,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Database,
  Upload,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { ProgramKerja } from '../types/proker';
import dbService from '../../database';
import {
  exportToCSV,
  formatRupiah,
  getTipeJadwalLabel,
  formatBulanPelaksanaan,
  getStatusInfo,
} from '../utils/formatters';

interface ExportReportViewProps {
  programs: ProgramKerja[];
  onResetData: () => void;
  onRestoreData: (restored: ProgramKerja[]) => void;
}

export const ExportReportView: React.FC<ExportReportViewProps> = ({
  programs,
  onResetData,
  onRestoreData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup to JSON with full database metadata
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(dbService.exportBackup());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `backup_proker_2026_2027_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Restore from JSON with safe schema validation
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = async (event) => {
        const content = event.target?.result as string;
        const res = await dbService.importBackup(content);
        if (res.success) {
          onRestoreData(dbService.getPrograms());
        }
      };
    }
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  const totalAnggaran = programs.reduce((acc, p) => acc + (p.estimasiAnggaran || 0), 0);

  return (
    <div className="space-y-4">
      {/* Action Buttons Box */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3 no-print">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Ekspor & Dokumen Laporan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Download CSV / Excel */}
          <button
            type="button"
            onClick={() => exportToCSV(programs)}
            className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 flex items-center gap-3 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold">Unduh Format Excel / CSV</p>
              <p className="text-[10px] text-emerald-700">
                Ekspor seluruh data lengkap ke tabel spreadsheet
              </p>
            </div>
          </button>

          {/* Cetak / Simpan PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 flex items-center gap-3 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold">Cetak / Simpan PDF</p>
              <p className="text-[10px] text-slate-500">
                Format resmi siap cetak lengkap tanda tangan
              </p>
            </div>
          </button>
        </div>

        {/* Data Management Tools: Backup & Restore */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 font-medium"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Backup JSON</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 font-medium"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Restore JSON</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJSON}
              accept=".json"
              className="hidden"
            />
          </div>

          <button
            type="button"
            onClick={onResetData}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 py-1 px-2 rounded-md hover:bg-rose-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Data Contoh
          </button>
        </div>
      </div>

      {/* Official Printable Report View (Visible on screen and optimized for print) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs print:border-none print:shadow-none print:p-0">
        {/* Document Header (KOP Surat / Judul Resmi) */}
        <div className="text-center pb-4 mb-4 border-b-2 border-slate-900">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-wide">
            RENCANA PROGRAM KERJA OPERASIONAL TAHUN 2026 - 2027
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Matriks Sasaran, Estimasi Anggaran, Jadwal Pelaksanaan, dan Penanggung Jawab
          </p>
          <div className="mt-2 inline-flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <span>Total: {programs.length} Kegiatan Terencana</span>
            <span>·</span>
            <span className="font-bold text-slate-800">
              Total Anggaran: {formatRupiah(totalAnggaran)}
            </span>
          </div>
        </div>

        {/* Responsive Table for Mobile & Print */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-y border-slate-300 font-bold">
                <th className="py-2 px-2 text-center w-8">No</th>
                <th className="py-2 px-2 w-12 text-center">Tahun</th>
                <th className="py-2 px-2 min-w-[140px]">Program Kerja</th>
                <th className="py-2 px-2 min-w-[140px]">Tujuan & Target Sasaran</th>
                <th className="py-2 px-2 text-right min-w-[100px]">Estimasi Anggaran</th>
                <th className="py-2 px-2 min-w-[110px]">Jadwal Pelaksanaan</th>
                <th className="py-2 px-2 min-w-[100px]">Penanggung Jawab</th>
                <th className="py-2 px-2 text-center w-20">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {programs.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-2 text-center font-bold text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-2 text-center font-semibold">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        p.tahun === 2026 ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {p.tahun}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 font-bold text-slate-900">
                    {p.namaProgram}
                    {p.catatan && (
                      <p className="text-[10px] font-normal text-slate-400 mt-0.5 italic">
                        *{p.catatan}
                      </p>
                    )}
                  </td>
                  <td className="py-2.5 px-2 space-y-1">
                    <div>
                      <span className="font-semibold text-slate-800">Tujuan:</span> {p.tujuanKegiatan}
                    </div>
                    <div className="text-emerald-800 font-medium">
                      <span className="font-semibold text-slate-800">Target:</span> {p.targetSasaran}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold tabular-nums text-slate-900">
                    {formatRupiah(p.estimasiAnggaran)}
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="font-bold text-slate-800 block">
                      {getTipeJadwalLabel(p.tipeJadwal)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {p.tipeJadwal === 'sepanjang_tahun'
                        ? '12 Bulan (Jan - Des)'
                        : p.tipeJadwal === 'satu_kali'
                        ? `Bulan ${p.bulanPelaksanaan?.[0]} ${p.tanggalSpesifik ? `(${p.tanggalSpesifik})` : ''}`
                        : formatBulanPelaksanaan(p.bulanPelaksanaan)}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <p className="font-bold text-slate-900">
                      {p.penanggungjawab?.nama || '-'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {p.penanggungjawab?.divisi || 'Umum'}
                    </p>
                    {p.penanggungjawab?.kontak && (
                      <p className="text-[10px] text-slate-400">
                        {p.penanggungjawab.kontak}
                      </p>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded ${getStatusInfo(p.status).color}`}>
                      {getStatusInfo(p.status).label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <td colSpan={4} className="py-2.5 px-2 text-right">
                  TOTAL ESTIMASI ANGGARAN KESELURUHAN:
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums text-emerald-800 font-black">
                  {formatRupiah(totalAnggaran)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Approval Signatures for Print Document */}
        <div className="mt-8 pt-4 border-t border-slate-200 hidden print:grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <p className="text-slate-500 mb-16">Disetujui Oleh,</p>
            <p className="font-bold text-slate-900 underline">Direktur / Ketua Lembaga</p>
            <p className="text-slate-500">NIP / ID: .......................................</p>
          </div>
          <div>
            <p className="text-slate-500 mb-16">
              Ditetapkan di Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="font-bold text-slate-900 underline">Koordinator Program & Anggaran</p>
            <p className="text-slate-500">NIP / ID: .......................................</p>
          </div>
        </div>
      </div>
    </div>
  );
};
