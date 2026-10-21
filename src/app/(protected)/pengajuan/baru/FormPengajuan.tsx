'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitPengajuanAction } from './actions';
import { Loader2, CheckCircle2, FileText, UploadCloud, AlertCircle } from 'lucide-react';

interface AkunBebanItem {
  id: number;
  kode: string;
  nama: string;
}

export function FormPengajuan({ akunBebanList }: { akunBebanList: AkunBebanItem[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [jenis, setJenis] = useState<'reimburse' | 'pengeluaran'>('reimburse');
  const [jumlahRaw, setJumlahRaw] = useState<number>(0);
  const [jumlahDisplay, setJumlahDisplay] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);

  const handleJumlahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    const num = parseInt(rawVal, 10) || 0;
    setJumlahRaw(num);
    setJumlahDisplay(num > 0 ? new Intl.NumberFormat('id-ID').format(num) : '');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    } else {
      setFileName(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, actionType: 'draf' | 'ajukan') => {
    e.preventDefault();
    setErrorMsg(null);

    if (jumlahRaw < 10000 || jumlahRaw > 25000000) {
      setErrorMsg('Nominal pengajuan harus antara Rp 10.000 dan Rp 25.000.000.');
      return;
    }

    setLoading(true);
    const formEl = e.currentTarget.closest('form');
    if (!formEl) return;

    const formData = new FormData(formEl);
    formData.set('jumlah', jumlahRaw.toString());
    formData.set('submit_action', actionType);

    const result = await submitPengajuanAction(formData);

    if (!result.success) {
      setErrorMsg(result.message || 'Gagal menyimpan pengajuan');
      setLoading(false);
      return;
    }

    router.push('/pengajuan');
    router.refresh();
  };

  return (
    <form className="space-y-6">
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Jenis Pengajuan */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
          Jenis Pengajuan <span className="text-rose-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setJenis('reimburse')}
            className={`p-4 rounded-2xl text-left border text-xs font-semibold transition-all relative ${
              jenis === 'reimburse'
                ? 'bg-gradient-to-br from-white/[0.12] to-white/[0.06] border-[#d4af37] text-white shadow-lg shadow-[#d4af37]/15 ring-1 ring-[#d4af37]/50'
                : 'bg-white/[0.04] border-white/[0.12] text-neutral-400 hover:bg-white/[0.08]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-white">Reimbursement</span>
              {jenis === 'reimburse' && (
                <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Penggantian biaya pribadi staf setelah transaksi selesai (lampirkan nota fisik).
            </p>
          </button>

          <button
            type="button"
            onClick={() => setJenis('pengeluaran')}
            className={`p-4 rounded-2xl text-left border text-xs font-semibold transition-all relative ${
              jenis === 'pengeluaran'
                ? 'bg-gradient-to-br from-white/[0.12] to-white/[0.06] border-[#d4af37] text-white shadow-lg shadow-[#d4af37]/15 ring-1 ring-[#d4af37]/50'
                : 'bg-white/[0.04] border-white/[0.12] text-neutral-400 hover:bg-white/[0.08]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-white">Kasbon / Belanja di Muka</span>
              {jenis === 'pengeluaran' && (
                <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Permohonan pencairan dana tunai sebelum transaksi operasional dilaksanakan.
            </p>
          </button>
        </div>
        <input type="hidden" name="jenis" value={jenis} />
      </div>

      {/* 2. Tanggal Transaksi & Pos Beban */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
            Tanggal Transaksi <span className="text-rose-400">*</span>
          </label>
          <input
            type="date"
            name="tanggal_transaksi"
            defaultValue={new Date().toISOString().split('T')[0]}
            max={new Date().toISOString().split('T')[0]}
            required
            className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.06] border border-white/[0.14] text-xs text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
            Kategori Akun Beban <span className="text-rose-400">*</span>
          </label>
          <select
            name="akun_beban_id"
            required
            className="w-full px-4 py-2.5 rounded-2xl bg-[#141414] border border-white/[0.14] text-xs text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
          >
            <option value="">-- Pilih Pos Beban Akuntansi --</option>
            {akunBebanList.map((ak) => (
              <option key={ak.id} value={ak.id}>
                {ak.kode} - {ak.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Nominal Pengajuan */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
          Jumlah Nominal Pengajuan (Rp) <span className="text-rose-400">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#d4af37]">
            Rp
          </span>
          <input
            type="text"
            value={jumlahDisplay}
            onChange={handleJumlahChange}
            placeholder="0"
            required
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.14] text-base font-bold text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
          />
        </div>
        <p className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
          <span>Min. Rp 10.000 — Maks. Rp 25.000.000</span>
          {jumlahRaw > 1000000 && (
            <span className="text-orange-400 font-semibold">
              ⚠️ Memerlukan persetujuan Direktur (&gt; Rp 1 Jt)
            </span>
          )}
        </p>
      </div>

      {/* 4. Deskripsi Keperluan */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
          Keperluan / Keterangan Pengeluaran <span className="text-rose-400">*</span>
        </label>
        <textarea
          name="keterangan"
          rows={3}
          minLength={10}
          required
          placeholder="Tuliskan alasan dan rincian belanja operasional (minimal 10 karakter)..."
          className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.06] border border-white/[0.14] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
        />
      </div>

      {/* 5. Upload Berkas Nota */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
          Lampiran Bukti Nota / Kwitansi {jenis === 'reimburse' && <span className="text-rose-400">*</span>}
        </label>
        <div className="p-5 rounded-2xl border border-dashed border-white/[0.2] bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-center relative cursor-pointer">
          <input
            type="file"
            name="bukti_file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            required={jenis === 'reimburse'}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
            <UploadCloud className="w-7 h-7 text-[#d4af37]" />
            <span className="text-xs font-semibold text-neutral-200">
              {fileName ? (
                <span className="text-emerald-400 font-bold">Terpilih: {fileName}</span>
              ) : (
                'Klik untuk memilih berkas nota atau seret ke sini'
              )}
            </span>
            <span className="text-[10px] text-neutral-500">
              Format: JPG, PNG, atau PDF (maksimal 5MB)
            </span>
          </div>
        </div>
      </div>

      {/* 6. Tombol Aksi */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/[0.10]">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-semibold text-neutral-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.12] transition-all"
        >
          Batalkan
        </button>

        <div className="w-full sm:w-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={(e: any) => handleSubmit(e, 'draf')}
            disabled={loading}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] text-neutral-200 hover:text-white transition-all border border-white/[0.14] disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-neutral-400" />
            <span>Simpan Draf</span>
          </button>

          <button
            type="button"
            onClick={(e: any) => handleSubmit(e, 'ajukan')}
            disabled={loading}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#aa8022] text-neutral-950 hover:brightness-110 shadow-lg shadow-[#d4af37]/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Ajukan Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
