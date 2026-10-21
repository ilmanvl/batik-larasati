'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PeranType, StatusPengajuan } from '@/types/database';
import {
  verifikasiPengajuanAction,
  setujuiDirekturAction,
  tolakAtauRevisiAction,
  cairkanPengajuanAction,
  ajukanDokumenAction,
  batalkanDokumenAction,
} from './actions';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Loader2,
  Banknote,
  FileCheck,
  ShieldAlert,
  Edit3,
} from 'lucide-react';

interface AkunKasItem {
  id: number;
  kode: string;
  nama: string;
}

interface ActionApprovalPanelProps {
  pengajuan: {
    id: number;
    nomor: string | null;
    jumlah: number;
    status: StatusPengajuan;
    catatan_peninjau: string | null;
  };
  currentRole: PeranType;
  isOwner: boolean;
  daftarAkunKas: AkunKasItem[];
}

export function ActionApprovalPanel({
  pengajuan,
  currentRole,
  isOwner,
  daftarAkunKas,
}: ActionApprovalPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // State untuk form tolak / minta revisi
  const [modePeninjauan, setModePeninjauan] = useState<'perlu_revisi' | 'ditolak' | null>(null);
  const [catatanPeninjau, setCatatanPeninjau] = useState('');

  // State untuk form pencairan kas (Akuntan)
  const [showBayarModal, setShowBayarModal] = useState(false);
  const [selectedAkunKasId, setSelectedAkunKasId] = useState<number | ''>('');

  const isMoreThan1Jt = pengajuan.jumlah > 1000000;

  // 1. Handler Verifikasi Akuntan
  const handleVerifikasiAkuntan = async () => {
    setLoading(true);
    setFeedback(null);
    const res = await verifikasiPengajuanAction(pengajuan.id);
    if (!res.success) {
      setFeedback({ type: 'error', text: res.message || 'Gagal memverifikasi pengajuan.' });
      setLoading(false);
    } else {
      setFeedback({ type: 'success', text: res.message || 'Berhasil diproses.' });
      router.refresh();
      setLoading(false);
    }
  };

  // 2. Handler Persetujuan Direktur
  const handleSetujuiDirektur = async () => {
    setLoading(true);
    setFeedback(null);
    const res = await setujuiDirekturAction(pengajuan.id);
    if (!res.success) {
      setFeedback({ type: 'error', text: res.message || 'Gagal menyetujui pengajuan.' });
      setLoading(false);
    } else {
      setFeedback({ type: 'success', text: res.message || 'Berhasil disetujui.' });
      router.refresh();
      setLoading(false);
    }
  };

  // 3. Handler Tolak atau Minta Revisi
  const handleTolakAtauRevisiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modePeninjauan) return;

    if (catatanPeninjau.trim().length < 10) {
      setFeedback({
        type: 'error',
        text: 'Catatan peninjau / alasan wajib diisi minimal 10 karakter.',
      });
      return;
    }

    setLoading(true);
    setFeedback(null);
    const res = await tolakAtauRevisiAction(pengajuan.id, modePeninjauan, catatanPeninjau);
    if (!res.success) {
      setFeedback({ type: 'error', text: res.message || 'Gagal menyimpan penolakan/revisi.' });
      setLoading(false);
    } else {
      setFeedback({ type: 'success', text: res.message || 'Berhasil diperbarui.' });
      setModePeninjauan(null);
      setCatatanPeninjau('');
      router.refresh();
      setLoading(false);
    }
  };

  // 4. Handler Pencairan Kas (Bayar)
  const handleCairkanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAkunKasId) {
      setFeedback({ type: 'error', text: 'Silakan pilih rekening kas/bank pengeluaran.' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    const res = await cairkanPengajuanAction(pengajuan.id, Number(selectedAkunKasId));
    if (!res.success) {
      setFeedback({ type: 'error', text: res.message || 'Gagal mencatat pencairan kas.' });
      setLoading(false);
    } else {
      setFeedback({ type: 'success', text: res.message || 'Kas berhasil dicairkan.' });
      setShowBayarModal(false);
      router.refresh();
      setLoading(false);
    }
  };

  // 5. Handler Ajukan Dokumen oleh Owner
  const handleAjukanOwner = async () => {
    setLoading(true);
    setFeedback(null);
    const res = await ajukanDokumenAction(pengajuan.id);
    if (!res.success) {
      setFeedback({ type: 'error', text: res.message || 'Gagal mengajukan dokumen.' });
      setLoading(false);
    } else {
      setFeedback({ type: 'success', text: res.message || 'Pengajuan berhasil dikirimkan.' });
      router.refresh();
      setLoading(false);
    }
  };

  // 6. Handler Batalkan Dokumen oleh Owner
  const handleBatalkanOwner = async () => {
    if (!confirm('Apakah Anda yakin ingin membatalkan pengajuan ini? Dokumen yang dibatalkan tidak dapat diproses lagi.')) return;
    setLoading(true);
    setFeedback(null);
    const res = await batalkanDokumenAction(pengajuan.id);
    if (!res.success) {
      setFeedback({ type: 'error', text: res.message || 'Gagal membatalkan pengajuan.' });
      setLoading(false);
    } else {
      setFeedback({ type: 'success', text: res.message || 'Pengajuan berhasil dibatalkan.' });
      router.refresh();
      setLoading(false);
    }
  };

  // Evaluasi apakah user memiliki aksi pada pengajuan ini
  const canAkuntanVerify = currentRole === 'akuntan' && pengajuan.status === 'diajukan';
  const canDirekturApprove = currentRole === 'direktur' && pengajuan.status === 'menunggu_direktur';
  const canAkuntanPay = currentRole === 'akuntan' && pengajuan.status === 'disetujui';
  const canOwnerAct = isOwner && ['draf', 'perlu_revisi'].includes(pengajuan.status);

  if (!canAkuntanVerify && !canDirekturApprove && !canAkuntanPay && !canOwnerAct) {
    return null;
  }

  return (
    <div className="p-6 rounded-3xl liquid-glass border-[#d4af37]/30 space-y-4 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.10]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#d4af37]" />
          <h2 className="text-sm font-bold text-white tracking-wide">
            Panel Tindakan & Otorisasi Dokumen
          </h2>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/[0.08] text-neutral-300 border border-white/[0.12]">
          {canOwnerAct ? (
            <span className="text-[#d4af37]">PEMOHON (OWNER)</span>
          ) : (
            <>Hak Akses: <strong className="text-[#d4af37] uppercase">{currentRole}</strong></>
          )}
        </span>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
            feedback.type === 'error'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          {feedback.type === 'error' ? (
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* FORM INPUT MODAL: TOLAK ATAU MINTA REVISI */}
      {modePeninjauan && (
        <form
          onSubmit={handleTolakAtauRevisiSubmit}
          className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.12] space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {modePeninjauan === 'perlu_revisi'
                ? 'Kembalikan untuk Revisi Staf'
                : 'Konfirmasi Penolakan Pengajuan'}
            </h4>
            <button
              type="button"
              onClick={() => setModePeninjauan(null)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              ✕ Batalkan
            </button>
          </div>
          <div>
            <label className="block text-[11px] text-neutral-300 mb-1 font-medium">
              Alasan / Catatan Peninjau (Wajib, minimal 10 karakter):
            </label>
            <textarea
              value={catatanPeninjau}
              onChange={(e) => setCatatanPeninjau(e.target.value)}
              rows={3}
              minLength={10}
              required
              placeholder={
                modePeninjauan === 'perlu_revisi'
                  ? 'Contoh: Nota pembelian malam belum terlampir jelas, mohon upload ulang foto struk resmi...'
                  : 'Contoh: Pengeluaran ini belum dianggarkan pada periode berjalan atau kegiatan dibatalkan...'
              }
              className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.06] border border-white/[0.14] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModePeninjauan(null)}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                modePeninjauan === 'perlu_revisi'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              }`}
            >
              {loading ? 'Menyimpan...' : 'Kirim Catatan'}
            </button>
          </div>
        </form>
      )}

      {/* FORM INPUT MODAL: PENCAIRAN KAS OLEH AKUNTAN */}
      {showBayarModal && (
        <form
          onSubmit={handleCairkanSubmit}
          className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.12] space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Pilih Rekening Kas / Bank Pencairan Dana
            </h4>
            <button
              type="button"
              onClick={() => setShowBayarModal(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              ✕ Batalkan
            </button>
          </div>
          <div>
            <label className="block text-[11px] text-neutral-300 mb-1 font-medium">
              Sumber Kas Pengeluaran:
            </label>
            <select
              value={selectedAkunKasId}
              onChange={(e) => setSelectedAkunKasId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-4 py-2.5 rounded-2xl bg-[#141414] border border-white/[0.14] text-xs text-white focus:outline-none focus:border-[#d4af37]"
            >
              <option value="">-- Pilih Rekening Kas / Bank --</option>
              {daftarAkunKas.map((kas) => (
                <option key={kas.id} value={kas.id}>
                  {kas.kode} - {kas.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowBayarModal(false)}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Banknote className="w-3.5 h-3.5" />
              )}
              <span>Konfirmasi Pembayaran Kas</span>
            </button>
          </div>
        </form>
      )}

      {/* BARIS TOMBOL AKSI UTAMA */}
      {!modePeninjauan && !showBayarModal && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-neutral-400">
            {canOwnerAct && (
              <span>
                {pengajuan.status === 'perlu_revisi'
                  ? 'Pengajuan ini membutuhkan perbaikan. Anda dapat mengedit rincian atau membatalkan dokumen.'
                  : 'Dokumen berstatus Draf. Anda dapat mengedit rincian atau mengirimkannya ke bagian keuangan.'}
              </span>
            )}
            {canAkuntanVerify && (
              <span>
                Verifikasi nota pengeluaran ini.{' '}
                {isMoreThan1Jt
                  ? 'Karena nominal > Rp 1.000.000, verifikasi akan meneruskan ke Direktur.'
                  : 'Karena nominal ≤ Rp 1.000.000, Akuntan dapat langsung menyetujui dokumen ini.'}
              </span>
            )}
            {canDirekturApprove && (
              <span>Pengeluaran di atas Rp 1 Juta ini memerlukan persetujuan otorisasi Anda.</span>
            )}
            {canAkuntanPay && (
              <span>Dokumen telah disetujui. Silakan catat rekening kas yang digunakan untuk membayar.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Tombol Aksi untuk Owner Pengajuan (Draf & Perlu Revisi) */}
            {canOwnerAct && (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleBatalkanOwner}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 transition-all flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Batalkan Pengajuan</span>
                </button>

                <Link
                  href={`/pengajuan/${pengajuan.id}/edit`}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] transition-all flex items-center gap-1.5"
                >
                  <Edit3 className="w-4 h-4 text-[#d4af37]" />
                  <span>Edit Rincian</span>
                </Link>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleAjukanOwner}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#aa8022] text-neutral-950 hover:brightness-110 shadow-lg shadow-[#d4af37]/20 transition-all active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Ajukan Dokumen Sekarang</span>
                </button>
              </>
            )}
            {/* Tombol Tolak / Minta Revisi (untuk Akuntan & Direktur) */}
            {(canAkuntanVerify || canDirekturApprove) && (
              <>
                {canAkuntanVerify && (
                  <button
                    type="button"
                    onClick={() => {
                      setModePeninjauan('perlu_revisi');
                      setFeedback(null);
                    }}
                    disabled={loading}
                    className="px-4 py-2 rounded-2xl text-xs font-semibold text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 transition-all"
                  >
                    Minta Revisi
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setModePeninjauan('ditolak');
                    setFeedback(null);
                  }}
                  disabled={loading}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 transition-all"
                >
                  Tolak Pengajuan
                </button>
              </>
            )}

            {/* Tombol Verifikasi Akuntan */}
            {canAkuntanVerify && (
              <button
                type="button"
                onClick={handleVerifikasiAkuntan}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#aa8022] text-neutral-950 hover:brightness-110 shadow-lg shadow-[#d4af37]/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isMoreThan1Jt ? (
                  <Send className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {isMoreThan1Jt ? 'Verifikasi & Teruskan ke Direktur' : 'Setujui Pengajuan'}
                </span>
              </button>
            )}

            {/* Tombol Setujui Direktur */}
            {canDirekturApprove && (
              <button
                type="button"
                onClick={handleSetujuiDirektur}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#aa8022] text-neutral-950 hover:brightness-110 shadow-lg shadow-[#d4af37]/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Setujui Pencairan Dana</span>
              </button>
            )}

            {/* Tombol Bayar / Cairkan Kas (Akuntan) */}
            {canAkuntanPay && (
              <button
                type="button"
                onClick={() => {
                  setShowBayarModal(true);
                  setFeedback(null);
                }}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Banknote className="w-4 h-4" />
                <span>Cairkan Kas / Bayar</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
