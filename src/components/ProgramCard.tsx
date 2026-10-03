import React from 'react';
import {
  Calendar,
  User,
  Phone,
  Target,
  FileText,
  DollarSign,
  Edit2,
  Trash2,
  Copy,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { ProgramKerja, ProgramStatus } from '../types/proker';
import {
  formatRupiah,
  getStatusInfo,
  getTipeJadwalLabel,
  BULAN_LIST,
} from '../utils/formatters';

interface ProgramCardProps {
  program: ProgramKerja;
  onEdit: (program: ProgramKerja) => void;
  onDelete: (id: string) => void;
  onDuplicate: (program: ProgramKerja) => void;
  onStatusChange: (id: string, status: ProgramStatus) => void;
}

export const ProgramCard: React.FC<ProgramCardProps> = ({
  program,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange,
}) => {
  const statusInfo = getStatusInfo(program.status);

  // Helper to test if a month is active
  const isMonthActive = (m: number) => program.bulanPelaksanaan?.includes(m);

  return (
    <article className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all p-4 space-y-3.5 relative overflow-hidden">
      {/* Top Bar: Tahun & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
              program.tahun === 2026
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-purple-50 text-purple-700 border border-purple-200'
            }`}
          >
            Tahun {program.tahun}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-[11px] text-slate-500 font-medium">
            {getTipeJadwalLabel(program.tipeJadwal)}
          </span>
        </div>

        {/* Status Dropdown/Selector */}
        <div className="relative">
          <select
            value={program.status}
            onChange={(e) =>
              onStatusChange(program.id, e.target.value as ProgramStatus)
            }
            className={`text-[11px] font-semibold pl-2 pr-5 py-1 rounded-full border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 ${statusInfo.color}`}
          >
            <option value="direncanakan">Direncanakan</option>
            <option value="berjalan">Sedang Berjalan</option>
            <option value="selesai">Selesai</option>
            <option value="ditunda">Ditunda</option>
          </select>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[9px] text-slate-400">
            ▼
          </span>
        </div>
      </div>

      {/* Nama Program */}
      <div>
        <h3 className="text-base font-bold text-slate-900 leading-snug">
          {program.namaProgram}
        </h3>
      </div>

      {/* Tujuan & Target Sasaran */}
      <div className="space-y-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
        <div className="flex items-start gap-2">
          <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <span className="font-semibold text-slate-700">Tujuan: </span>
            <span className="text-slate-600 leading-relaxed">
              {program.tujuanKegiatan}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Target className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <span className="font-semibold text-slate-700">Target Sasaran: </span>
            <span className="text-slate-600 leading-relaxed font-medium">
              {program.targetSasaran}
            </span>
          </div>
        </div>
      </div>

      {/* Estimasi Anggaran & Jadwal Pelaksanaan Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
        {/* Anggaran */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Estimasi Anggaran
              </p>
              <p className="text-sm font-bold text-slate-900 tabular-nums">
                {formatRupiah(program.estimasiAnggaran)}
              </p>
            </div>
          </div>
        </div>

        {/* Jadwal Pelaksanaan Summary */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Jadwal Pelaksanaan</span>
          </div>

          {program.tipeJadwal === 'sepanjang_tahun' ? (
            <p className="text-xs font-semibold text-slate-800">
              Sepanjang Tahun (Jan – Des)
            </p>
          ) : program.tipeJadwal === 'satu_kali' ? (
            <div className="text-xs font-semibold text-slate-800">
              <span>Bulan {BULAN_LIST[(program.bulanPelaksanaan[0] || 1) - 1]?.nama}</span>
              {program.tanggalSpesifik && (
                <span className="text-slate-500 font-normal block text-[11px] truncate">
                  ({program.tanggalSpesifik})
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs font-semibold text-slate-800">
              Terjadwal {program.bulanPelaksanaan.length} Bulan
            </p>
          )}
        </div>
      </div>

      {/* Mini 12-Months Visual Indicator */}
      <div className="pt-1">
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mb-1 px-0.5">
          <span>Timeline Bulan:</span>
          <span>
            {program.bulanPelaksanaan?.length || 0} dari 12 bulan aktif
          </span>
        </div>
        <div className="grid grid-cols-12 gap-1">
          {BULAN_LIST.map((m) => {
            const active = isMonthActive(m.no);
            return (
              <div
                key={m.no}
                title={`${m.nama}: ${active ? 'Terjadwal' : 'Tidak aktif'}`}
                className={`h-4 rounded-sm flex items-center justify-center text-[8px] font-bold transition-colors ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {m.singkatan.charAt(0)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Penanggungjawab & Action Bar */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* PJ Info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {program.penanggungjawab?.nama ? program.penanggungjawab.nama.charAt(0).toUpperCase() : 'P'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              {program.penanggungjawab?.nama || 'Tanpa PJ'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {program.penanggungjawab?.divisi || 'Umum'}
            </p>
          </div>
        </div>

        {/* Actions Button Group */}
        <div className="flex items-center gap-1 shrink-0">
          {program.penanggungjawab?.kontak && (
            <a
              href={`https://wa.me/${program.penanggungjawab.kontak.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title={`Hubungi ${program.penanggungjawab.kontak}`}
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={() => onDuplicate(program)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Duplikasi Program"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onEdit(program)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Ubah Program"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(program.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Hapus Program"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
