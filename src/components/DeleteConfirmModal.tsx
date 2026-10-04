import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { ProgramKerja } from '../types/proker';
import { formatRupiah } from '../utils/formatters';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  program: ProgramKerja | null;
  canDelete: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  program,
  canDelete,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !program) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-rose-50/60">
          <div className="flex items-center gap-2 text-rose-700">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <h3 id="modal-headline" className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                Konfirmasi Hapus Program
              </h3>
              <p className="text-[10px] text-rose-700 font-semibold">Tindakan Permanen</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-600">
            Apakah Anda yakin ingin menghapus data program kerja ini dari database?
          </p>

          {/* Program Card Preview */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9.5px] font-bold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                {program.penanggungjawab?.divisi || 'Seksi Umum'}
              </span>
              <span className="text-[9.5px] font-semibold text-slate-500">
                Thn {program.tahun}
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 leading-snug break-words">
              {program.namaProgram}
            </h4>
            <div className="text-[10px] text-emerald-800 font-bold tabular-nums">
              Estimasi: {formatRupiah(program.estimasiAnggaran)}
            </div>
          </div>

          {!canDelete ? (
            /* Warning if only 1 program left */
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-800 text-[11px]">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Tidak dapat dihapus:</strong> Minimal harus tersisa 1 program kerja dalam sistem database.
              </span>
            </div>
          ) : (
            <p className="text-[10px] text-slate-400">
              * Data yang telah dihapus tidak dapat dipulihkan kembali.
            </p>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
          >
            Batal
          </button>

          {canDelete ? (
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Ya, Hapus Program</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
            >
              Mengerti
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
