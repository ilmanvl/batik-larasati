'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitJurnalAction } from './actions';
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Scale,
} from 'lucide-react';

interface AkunOption {
  id: number;
  kode: string;
  nama: string;
  tipe: string;
  saldo_normal: string;
}

interface BarisState {
  id: string;
  akun_id: number | '';
  debit: number;
  kredit: number;
  keterangan: string;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function FormJurnalManual({ akunList }: { akunList: AkunOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State Form Header
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan] = useState('');

  // State Baris Transaksi (Minimal 2 baris awal untuk double entry)
  const [barisList, setBarisList] = useState<BarisState[]>([
    { id: 'row-1', akun_id: '', debit: 0, kredit: 0, keterangan: '' },
    { id: 'row-2', akun_id: '', debit: 0, kredit: 0, keterangan: '' },
  ]);

  // Tambah baris baru
  const handleTambahBaris = () => {
    setBarisList((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        akun_id: '',
        debit: 0,
        kredit: 0,
        keterangan: '',
      },
    ]);
  };

  // Hapus baris (minimal tetap 2 baris)
  const handleHapusBaris = (id: string) => {
    if (barisList.length <= 2) return;
    setBarisList((prev) => prev.filter((r) => r.id !== id));
  };

  // Ubah akun
  const handleChangeAkun = (id: string, akunId: number) => {
    setBarisList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, akun_id: akunId } : r))
    );
  };

  // Ubah Debit (otomatis reset Kredit jadi 0)
  const handleChangeDebit = (id: string, value: string) => {
    const cleanNumber = parseInt(value.replace(/\D/g, ''), 10) || 0;
    setBarisList((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, debit: cleanNumber, kredit: cleanNumber > 0 ? 0 : r.kredit } : r
      )
    );
  };

  // Ubah Kredit (otomatis reset Debit jadi 0)
  const handleChangeKredit = (id: string, value: string) => {
    const cleanNumber = parseInt(value.replace(/\D/g, ''), 10) || 0;
    setBarisList((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, kredit: cleanNumber, debit: cleanNumber > 0 ? 0 : r.debit } : r
      )
    );
  };

  // Kalkulasi total Debit & Kredit
  const totalDebit = barisList.reduce((acc, r) => acc + (r.debit || 0), 0);
  const totalKredit = barisList.reduce((acc, r) => acc + (r.kredit || 0), 0);
  const selisih = Math.abs(totalDebit - totalKredit);
  const isBalanced = totalDebit > 0 && totalDebit === totalKredit;

  // Validasi form kelayakan simpan
  const isAllAccountsSelected = barisList.every((r) => typeof r.akun_id === 'number' && r.akun_id > 0);
  const isKeteranganValid = keterangan.trim().length >= 5;
  const canSubmit = isBalanced && isAllAccountsSelected && isKeteranganValid && !loading;

  // Handler Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setErrorMsg(null);

    const res = await submitJurnalAction({
      tanggal,
      keterangan: keterangan.trim(),
      baris: barisList.map((r, idx) => ({
        urutan: idx + 1,
        akun_id: Number(r.akun_id),
        debit: r.debit,
        kredit: r.kredit,
        keterangan: r.keterangan?.trim() || null,
      })),
    });

    if (res.success) {
      router.push('/jurnal');
      router.refresh();
    } else {
      setErrorMsg(res.message || 'Gagal menyimpan draf jurnal.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Pesan Kesalahan */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Header Informasi Transaksi */}
      <div className="p-6 rounded-3xl liquid-glass space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#d4af37]" />
          Informasi Utama Jurnal
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Tanggal Transaksi <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] transition-all"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Keterangan / Deskripsi Transaksi <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              minLength={5}
              placeholder="Contoh: Pembayaran sewa stan pameran batik di Solo Paragon..."
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] placeholder:text-neutral-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 2. Baris Akun Double-Entry */}
      <div className="p-6 rounded-3xl liquid-glass-table space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#d4af37]" />
              Rincian Posisi Debit & Kredit
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Tentukan akun dan masukkan nominal pada salah satu sisi (Debit atau Kredit).
            </p>
          </div>

          <button
            type="button"
            onClick={handleTambahBaris}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.12] transition-all self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Tambah Baris Akun</span>
          </button>
        </div>

        {/* Tabel Entri Baris */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="text-neutral-400 text-[11px] uppercase tracking-wider border-b border-white/[0.06]">
                <th className="py-2 px-2 w-10 text-center">#</th>
                <th className="py-2 px-3 min-w-[260px]">Bagan Akun (COA)</th>
                <th className="py-2 px-3 min-w-[180px] text-right">Debit (Rp)</th>
                <th className="py-2 px-3 min-w-[180px] text-right">Kredit (Rp)</th>
                <th className="py-2 px-2 w-12 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {barisList.map((row, idx) => (
                <tr key={row.id} className="group">
                  <td className="py-3 px-2 text-center font-mono text-neutral-500 text-xs">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-3">
                    <select
                      required
                      value={row.akun_id}
                      onChange={(e) => handleChangeAkun(row.id, Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white text-xs focus:outline-none focus:border-[#d4af37] transition-all"
                    >
                      <option value="" disabled className="bg-neutral-900 text-neutral-400">
                        -- Pilih Akun COA --
                      </option>
                      {akunList.map((a) => (
                        <option key={a.id} value={a.id} className="bg-neutral-900 text-white">
                          {a.kode} - {a.nama} ({a.tipe.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <input
                      type="text"
                      placeholder="0"
                      value={row.debit ? row.debit.toLocaleString('id-ID') : ''}
                      onChange={(e) => handleChangeDebit(row.id, e.target.value)}
                      className="w-full text-right px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.12] text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-500 transition-all placeholder:text-neutral-600"
                    />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <input
                      type="text"
                      placeholder="0"
                      value={row.kredit ? row.kredit.toLocaleString('id-ID') : ''}
                      onChange={(e) => handleChangeKredit(row.id, e.target.value)}
                      className="w-full text-right px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.12] text-cyan-400 font-mono text-xs focus:outline-none focus:border-cyan-500 transition-all placeholder:text-neutral-600"
                    />
                  </td>
                  <td className="py-3 px-2 text-center">
                    <button
                      type="button"
                      disabled={barisList.length <= 2}
                      onClick={() => handleHapusBaris(row.id)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:hover:text-neutral-500 disabled:hover:bg-transparent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Live Balance Checker Widget */}
      <div
        className={`p-5 rounded-3xl liquid-glass border transition-all ${
          isBalanced
            ? 'border-emerald-500/40 bg-emerald-500/[0.04]'
            : 'border-amber-500/30 bg-amber-500/[0.04]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl border ${
                isBalanced
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              {isBalanced ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{isBalanced ? 'Status Jurnal: Seimbang (Balance)' : 'Status Jurnal: Belum Seimbang'}</span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isBalanced
                  ? 'Total Debit dan Kredit bernilai sama. Draf siap untuk disimpan.'
                  : `Terdapat selisih pembukuan sebesar ${formatRupiah(selisih)}.`}
              </p>
            </div>
          </div>

          {/* Nominal Perbandingan */}
          <div className="flex items-center gap-6 self-end sm:self-auto text-xs font-mono">
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase">Total Debit</span>
              <span className="text-sm font-bold text-emerald-400">{formatRupiah(totalDebit)}</span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase">Total Kredit</span>
              <span className="text-sm font-bold text-cyan-400">{formatRupiah(totalKredit)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tombol Aksi Simpan */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.10] transition-all"
        >
          Batal
        </button>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#aa8022] text-neutral-950 hover:brightness-110 shadow-lg shadow-[#d4af37]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyimpan Draf Jurnal...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Sebagai Draf Jurnal</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
