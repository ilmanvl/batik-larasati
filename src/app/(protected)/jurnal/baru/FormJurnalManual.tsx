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

      {/* WORKSPACE UTAMA: Solid Dark Surface #141414 dengan border #2e2e2e (Tanpa blur, tanpa glass berlebihan) */}
      <div className="bg-[#141414] border border-[#2e2e2e] rounded-3xl p-6 sm:p-8 space-y-8 shadow-xl">
        {/* SECTION 1: Informasi Transaksi */}
        <div className="space-y-4">
          <div className="border-b border-[#262626] pb-3">
            <h2 className="text-sm sm:text-base font-bold text-[#f5f5f5] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#d4af37]" />
              <span>Informasi Transaksi</span>
            </h2>
            <p className="text-xs text-[#a3a3a3] mt-0.5">
              Tentukan tanggal pembukuan dan catatan deskriptif untuk transaksi ini.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#a3a3a3] mb-1.5">
                Tanggal Transaksi <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#333333] text-[#f5f5f5] text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 transition-colors"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#a3a3a3] mb-1.5">
                Keterangan / Deskripsi Transaksi <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                minLength={5}
                placeholder="Contoh: Pembayaran sewa stan pameran batik di Solo Paragon..."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#333333] text-[#f5f5f5] text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 placeholder:text-neutral-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Rincian Debit & Kredit */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#f5f5f5] flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#d4af37]" />
                <span>Rincian Debit & Kredit</span>
              </h2>
              <p className="text-xs text-[#a3a3a3] mt-0.5">
                Tentukan akun COA dan masukkan nominal pada salah satu sisi (Debit atau Kredit).
              </p>
            </div>

            <button
              type="button"
              onClick={handleTambahBaris}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#1f1f1f] hover:bg-[#282828] text-[#f5f5f5] border border-[#383838] hover:border-[#444444] transition-all self-start sm:self-auto active:scale-95 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Tambah Baris Akun</span>
            </button>
          </div>

          {/* Tabel Entri Baris */}
          <div className="overflow-x-auto rounded-xl border border-[#2a2a2a] bg-[#181818]">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-[#1e1e1e] text-[#a3a3a3] text-[11px] uppercase tracking-wider border-b border-[#2e2e2e]">
                  <th className="py-3 px-3 w-10 text-center font-semibold">#</th>
                  <th className="py-3 px-4 min-w-[260px] font-semibold">Bagan Akun (COA)</th>
                  <th className="py-3 px-4 min-w-[180px] text-right font-semibold">Debit (Rp)</th>
                  <th className="py-3 px-4 min-w-[180px] text-right font-semibold">Kredit (Rp)</th>
                  <th className="py-3 px-3 w-12 text-center font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {barisList.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3 text-center font-mono text-[#737373] text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        required
                        value={row.akun_id}
                        onChange={(e) => handleChangeAkun(row.id, Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#333333] text-[#f5f5f5] text-xs focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 transition-colors"
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
                    <td className="py-3.5 px-4 text-right">
                      <input
                        type="text"
                        placeholder="0"
                        value={row.debit ? row.debit.toLocaleString('id-ID') : ''}
                        onChange={(e) => handleChangeDebit(row.id, e.target.value)}
                        className="w-full text-right px-3 py-2 rounded-lg bg-[#141414] border border-[#333333] text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors placeholder:text-neutral-600"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <input
                        type="text"
                        placeholder="0"
                        value={row.kredit ? row.kredit.toLocaleString('id-ID') : ''}
                        onChange={(e) => handleChangeKredit(row.id, e.target.value)}
                        className="w-full text-right px-3 py-2 rounded-lg bg-[#141414] border border-[#333333] text-cyan-400 font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors placeholder:text-neutral-600"
                      />
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        disabled={barisList.length <= 2}
                        onClick={() => handleHapusBaris(row.id)}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-20 disabled:hover:text-neutral-500 disabled:hover:bg-transparent"
                        title={barisList.length <= 2 ? 'Minimal 2 baris transaksi' : 'Hapus baris'}
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

        {/* SECTION 3: Status Keseimbangan Jurnal (Summary Bar Ringkas) */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
            isBalanced
              ? 'bg-[#181818] border-emerald-500/40'
              : 'bg-[#181818] border-amber-500/30'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl border ${
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
                <div className="text-xs sm:text-sm font-bold text-[#f5f5f5] flex items-center gap-2">
                  <span>{isBalanced ? 'Status Jurnal: Seimbang (Balance)' : 'Status Jurnal: Belum Seimbang'}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-[#a3a3a3] mt-0.5">
                  {isBalanced
                    ? 'Total Debit dan Kredit bernilai sama. Draf siap disimpan.'
                    : `Terdapat selisih pembukuan sebesar ${formatRupiah(selisih)}.`}
                </p>
              </div>
            </div>

            {/* Nominal Perbandingan */}
            <div className="flex items-center gap-6 self-end sm:self-auto text-xs font-mono">
              <div>
                <span className="text-[#a3a3a3] block text-[10px] uppercase font-sans">Total Debit</span>
                <span className="text-sm font-bold text-emerald-400">{formatRupiah(totalDebit)}</span>
              </div>
              <div>
                <span className="text-[#a3a3a3] block text-[10px] uppercase font-sans">Total Kredit</span>
                <span className="text-sm font-bold text-cyan-400">{formatRupiah(totalKredit)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Tombol Aksi */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262626]">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#a3a3a3] hover:text-[#f5f5f5] bg-[#1a1a1a] hover:bg-[#242424] border border-[#333333] transition-colors"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#d4af37] hover:bg-[#c59e31] text-neutral-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-md shadow-[#d4af37]/15"
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
      </div>
    </form>
  );
}
