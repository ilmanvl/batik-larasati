'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePengajuanAction } from './actions';
import { Loader2, UploadCloud, AlertCircle, Save, Send } from 'lucide-react';

interface AkunBebanItem {
  id: number;
  kode: string;
  nama: string;
}

interface PengajuanData {
  id: number;
  nomor: string | null;
  jenis: 'reimburse' | 'pengeluaran';
  tanggal_transaksi: string;
  akun_beban_id: number;
  jumlah: number;
  keterangan: string;
  bukti_path: string | null;
  status: string;
}

export function FormEditPengajuan({
  pengajuan,
  akunBebanList,
}: {
  pengajuan: PengajuanData;
  akunBebanList: AkunBebanItem[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [jenis, setJenis] = useState<'reimburse' | 'pengeluaran'>(pengajuan.jenis);
  const [jumlahRaw, setJumlahRaw] = useState<number>(pengajuan.jumlah);
  const [jumlahDisplay, setJumlahDisplay] = useState<string>(
    new Intl.NumberFormat('id-ID').format(pengajuan.jumlah)
  );
  const [fileName, setFileName] = useState<string | null>(null);

  const handleJumlahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    const num = parseInt(rawVal, 10) || 0;
    setJumlahRaw(num);
    setJumlahDisplay(num > 0 ? new Intl.NumberFormat('id-ID').format(num) : '');
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
    formData.set('jenis', jenis);
    formData.set('jumlah', jumlahRaw.toString());
    formData.set('submit_action', actionType);

    const result = await updatePengajuanAction(pengajuan.id, formData);

    if (!result.success) {
      setErrorMsg(result.message || 'Gagal memperbarui pengajuan.');
      setLoading(false);
      return;
    }

    router.push(`/pengajuan/${pengajuan.id}`);
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

      {/* Wadah Formulir Liquid Glass */}
      <div className="p-6 sm:p-8 rounded-3xl liquid-glass space-y-6">
        {/* Jenis Pengajuan */}
        <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
          Jenis Pengajuan
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setJenis('reimburse')}
            className={`p-4 rounded-2xl text-left border text-xs font-semibold transition-all ${
              jenis === 'reimburse'
                ? 'bg-white/[0.12] border-[#d4af37] text-white'
                : 'bg-white/[0.04] border-white/[0.12] text-neutral-400'
            }`}
          >
            Reimbursement (Nota Fisik Terlampir)
          </button>
          <button
            type="button"
            onClick={() => setJenis('pengeluaran')}
            className={`p-4 rounded-2xl text-left border text-xs font-semibold transition-all ${
              jenis === 'pengeluaran'
                ? 'bg-white/[0.12] border-[#d4af37] text-white'
                : 'bg-white/[0.04] border-white/[0.12] text-neutral-400'
            }`}
          >
            Kasbon / Pengeluaran Di Muka
          </button>
        </div>
      </div>

      {/* Tanggal & Akun Beban */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
            Tanggal Transaksi <span className="text-rose-400">*</span>
          </label>
          <input
            type="date"
            name="tanggal_transaksi"
            required
            defaultValue={pengajuan.tanggal_transaksi}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white text-xs sm:text-sm focus:outline-none focus:border-[#d4af37]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
            Pos Akun Beban (COA) <span className="text-rose-400">*</span>
          </label>
          <select
            name="akun_beban_id"
            required
            defaultValue={pengajuan.akun_beban_id}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white text-xs sm:text-sm focus:outline-none focus:border-[#d4af37]"
          >
            {akunBebanList.map((a) => (
              <option key={a.id} value={a.id} className="bg-neutral-900 text-white">
                {a.kode} - {a.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Nominal */}
      <div>
        <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
          Nominal Pengajuan (Rp) <span className="text-rose-400">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
            Rp
          </span>
          <input
            type="text"
            required
            placeholder="0"
            value={jumlahDisplay}
            onChange={handleJumlahChange}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white text-sm font-mono font-bold focus:outline-none focus:border-[#d4af37]"
          />
        </div>
      </div>

      {/* Keterangan */}
      <div>
        <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
          Keterangan Pengeluaran <span className="text-rose-400">*</span>
        </label>
        <textarea
          name="keterangan"
          required
          rows={3}
          minLength={10}
          defaultValue={pengajuan.keterangan}
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white text-xs sm:text-sm focus:outline-none focus:border-[#d4af37]"
        />
      </div>

      {/* Upload Berkas Nota */}
      <div>
        <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
          Ganti Lampiran Bukti Nota (Opsional jika sudah ada)
        </label>
        <div className="p-4 rounded-xl border border-dashed border-white/[0.15] bg-white/[0.02] text-center">
          <UploadCloud className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
          <input
            type="file"
            id="bukti_file"
            name="bukti_file"
            accept="image/*,.pdf"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
            className="hidden"
          />
          <label
            htmlFor="bukti_file"
            className="cursor-pointer text-xs font-semibold text-[#d4af37] hover:underline"
          >
            {fileName || (pengajuan.bukti_path ? `File saat ini: ${pengajuan.bukti_path.split('/').pop()} (Klik untuk mengganti)` : 'Pilih file nota baru')}
          </label>
        </div>
      </div>

        {/* Tombol Aksi */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={(e: any) => handleSubmit(e, 'draf')}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Simpan Perubahan</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={(e: any) => handleSubmit(e, 'ajukan')}
            className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#aa8022] text-neutral-950 hover:brightness-110 shadow-lg shadow-[#d4af37]/20 flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Simpan & Ajukan Sekarang</span>
          </button>
        </div>
      </div>
    </form>
  );
}
