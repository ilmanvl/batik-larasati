'use client';

import { useState } from 'react';
import { Eye, X, FileJson } from 'lucide-react';

interface AuditLogDetailModalProps {
  log: {
    id: number;
    waktu: string;
    aksi: string;
    nama_tabel: string;
    id_data: string;
    pelaku?: {
      nama_lengkap: string;
      email: string;
    } | null;
    data_lama: any;
    data_baru: any;
  };
}

export default function AuditLogDetailModal({ log }: AuditLogDetailModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 hover:text-white transition-all border border-white/[0.12] hover:border-[#d4af37]/40 inline-flex items-center gap-1.5 shadow-sm active:scale-95"
        title="Lihat Rincian Data"
      >
        <Eye className="w-3.5 h-3.5 text-[#d4af37]" />
        <span>Rincian</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl p-6 sm:p-7 rounded-3xl liquid-glass-modal text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.10]">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[#d4af37]" />
                <h3 className="text-base font-bold text-white">
                  Rincian Rekam Jejak #{log.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white/[0.04] p-3.5 rounded-2xl border border-white/[0.08]">
              <div>
                <span className="text-neutral-400 block text-[11px]">Tabel Target:</span>
                <span className="font-mono font-bold text-[#d4af37] uppercase">{log.nama_tabel}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[11px]">Aksi:</span>
                <span className="font-semibold text-white">{log.aksi}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[11px]">ID Rekaman:</span>
                <span className="font-mono text-neutral-200">#{log.id_data}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[11px]">Pelaku:</span>
                <span className="text-white truncate block">{log.pelaku?.nama_lengkap || 'Sistem'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1.5">
                <span className="text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                  <span>Data Sebelum Aksi (Lama):</span>
                </span>
                <pre className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.10] text-neutral-200 overflow-x-auto max-h-60 text-[11px] leading-relaxed backdrop-blur-md">
                  {log.data_lama ? JSON.stringify(log.data_lama, null, 2) : '(Kosong / Insert Baru)'}
                </pre>
              </div>

              <div className="space-y-1.5">
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <span>Data Sesudah Aksi (Baru):</span>
                </span>
                <pre className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.10] text-neutral-200 overflow-x-auto max-h-60 text-[11px] leading-relaxed backdrop-blur-md">
                  {log.data_baru ? JSON.stringify(log.data_baru, null, 2) : '(Kosong / Hapus)'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/[0.10]">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold transition-all border border-white/[0.12]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
