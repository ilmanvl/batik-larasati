'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Edit2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Calendar,
} from 'lucide-react';
import {
  simpanAkunAction,
  tutupPeriodeAction,
  bukaKembaliPeriodeAction,
  buatPeriodeAction,
} from './actions';
import type { PeranType, TipeAkun, SaldoNormalType } from '@/types/database';

interface AkunClientPanelsProps {
  role: PeranType;
  akunList: any[];
  periodeList: any[];
}

export default function AkunClientPanels({
  role,
  akunList,
  periodeList,
}: AkunClientPanelsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'akun' | 'periode'>('akun');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Akun
  const [showAkunModal, setShowAkunModal] = useState(false);
  const [editingAkun, setEditingAkun] = useState<any | null>(null);

  // Modal Buka Kembali Periode (BR-06)
  const [showBukaModal, setShowBukaModal] = useState(false);
  const [reopenPeriodeId, setReopenPeriodeId] = useState<number | null>(null);
  const [alasanBuka, setAlasanBuka] = useState('');

  // Modal Buat Periode
  const [showBuatPeriodeModal, setShowBuatPeriodeModal] = useState(false);
  const [tahunBaru, setTahunBaru] = useState(2026);
  const [bulanBaru, setBulanBaru] = useState(11);

  const handleOpenAddAkun = () => {
    setEditingAkun(null);
    setErrorMsg(null);
    setShowAkunModal(true);
  };

  const handleOpenEditAkun = (a: any) => {
    setEditingAkun(a);
    setErrorMsg(null);
    setShowAkunModal(true);
  };

  const handleSimpanAkun = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(e.currentTarget);
    if (editingAkun) {
      formData.set('id', editingAkun.id.toString());
    }

    const res = await simpanAkunAction(formData);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(editingAkun ? 'Akun berhasil diperbarui.' : 'Akun baru berhasil ditambahkan.');
      setShowAkunModal(false);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Gagal menyimpan akun.');
    }
  };

  const handleTutupPeriode = async (pId: number) => {
    if (!confirm('Apakah Anda yakin ingin menutup periode akuntansi ini? Jurnal baru pada periode ini tidak akan dapat diposting lagi.')) {
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    const res = await tutupPeriodeAction(pId);
    setLoading(false);
    if (res.success) {
      setSuccessMsg('Periode akuntansi berhasil ditutup.');
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Gagal menutup periode.');
    }
  };

  const handleOpenBukaModal = (pId: number) => {
    setReopenPeriodeId(pId);
    setAlasanBuka('');
    setErrorMsg(null);
    setShowBukaModal(true);
  };

  const handleBukaPeriode = async () => {
    if (!reopenPeriodeId) return;
    setLoading(true);
    setErrorMsg(null);
    const res = await bukaKembaliPeriodeAction(reopenPeriodeId, alasanBuka);
    setLoading(false);
    if (res.success) {
      setSuccessMsg('Periode akuntansi berhasil dibuka kembali.');
      setShowBukaModal(false);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Gagal membuka kembali periode.');
    }
  };

  const handleBuatPeriode = async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await buatPeriodeAction(Number(tahunBaru), Number(bulanBaru));
    setLoading(false);
    if (res.success) {
      setSuccessMsg('Periode akuntansi baru berhasil didaftarkan.');
      setShowBuatPeriodeModal(false);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Gagal membuat periode.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifikasi Sukses / Error */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-xs sm:text-sm backdrop-blur-md shadow-lg shadow-emerald-500/10">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-between text-xs sm:text-sm backdrop-blur-md shadow-lg shadow-rose-500/10">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Switcher & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2.5 rounded-2xl liquid-glass border border-white/[0.10]">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('akun')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'akun'
                ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 shadow-sm backdrop-blur-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Bagan Akun (COA)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.10] font-mono text-neutral-200">
              {akunList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('periode')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'periode'
                ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 shadow-sm backdrop-blur-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Periode Akuntansi</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.10] font-mono text-neutral-200">
              {periodeList.length}
            </span>
          </button>
        </div>

        <div>
          {activeTab === 'akun' ? (
            <button
              type="button"
              onClick={handleOpenAddAkun}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#b89328] hover:brightness-110 text-neutral-950 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-[#d4af37]/20 border border-[#f5d77f]/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Akun</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowBuatPeriodeModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#b89328] hover:brightness-110 text-neutral-950 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-[#d4af37]/20 border border-[#f5d77f]/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Periode</span>
            </button>
          )}
        </div>
      </div>

      {/* PANEL 1: BAGAN AKUN (COA) */}
      {activeTab === 'akun' && (
        <div className="p-6 sm:p-7 rounded-3xl liquid-glass-table space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-[#d4af37]" />
                <span>Daftar Bagan Akun Standar (COA)</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Struktur klasifikasi akun 4-digit sesuai standar akuntansi keuangan SAK EMKM
              </p>
            </div>
            <span className="text-xs text-neutral-400 font-mono bg-white/[0.06] px-3 py-1.5 rounded-xl border border-white/[0.10] self-start sm:self-auto">
              {akunList.length} Akun Terdaftar
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.12] bg-white/[0.05] text-[11px] uppercase tracking-wider text-neutral-300">
                  <th className="py-4 px-4 font-semibold w-24">Kode</th>
                  <th className="py-4 px-4 font-semibold">Nama Akun</th>
                  <th className="py-4 px-4 font-semibold w-28 text-center">Tipe</th>
                  <th className="py-4 px-4 font-semibold w-28 text-center">Saldo Normal</th>
                  <th className="py-4 px-4 font-semibold w-24 text-center">Kas/Bank</th>
                  <th className="py-4 px-4 font-semibold w-24 text-center">Status</th>
                  <th className="py-4 px-4 font-semibold w-20 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {akunList.map((akun) => (
                  <tr key={akun.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#d4af37]">
                      {akun.kode}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{akun.nama}</div>
                      {akun.keterangan && (
                        <div className="text-[11px] text-neutral-400 mt-0.5">{akun.keterangan}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-white/[0.06] text-neutral-200 border border-white/[0.12] backdrop-blur-sm shadow-sm">
                        {akun.tipe}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          akun.saldo_normal === 'debit'
                            ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {akun.saldo_normal}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {akun.is_kas_bank ? (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Ya
                        </span>
                      ) : (
                        <span className="text-neutral-500">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {akun.aktif ? (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEditAkun(akun)}
                        className="p-1.5 rounded-xl text-neutral-400 hover:text-[#d4af37] bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] hover:border-[#d4af37]/40 transition-all inline-flex items-center justify-center shadow-sm"
                        title="Edit Akun"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PANEL 2: PERIODE AKUNTANSI */}
      {activeTab === 'periode' && (
        <div className="p-6 sm:p-7 rounded-3xl liquid-glass-table space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-[#d4af37]" />
                <span>Daftar Siklus Periode Pembukuan</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Status pembukuan bulanan serta kontrol buka/tutup periode akuntansi (BR-06)
              </p>
            </div>
            <span className="text-xs text-neutral-400 font-mono bg-white/[0.06] px-3 py-1.5 rounded-xl border border-white/[0.10] self-start sm:self-auto">
              {periodeList.length} Periode Tercatat
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.12] bg-white/[0.05] text-[11px] uppercase tracking-wider text-neutral-300">
                  <th className="py-4 px-4 font-semibold w-28">Bulan/Thn</th>
                  <th className="py-4 px-4 font-semibold w-32 text-center">Status</th>
                  <th className="py-4 px-4 font-semibold">Tutup / Buka Info</th>
                  <th className="py-4 px-4 font-semibold w-44 text-center">Aksi (BR-06)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {periodeList.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {String(p.bulan).padStart(2, '0')}/{p.tahun}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.status === 'terbuka' ? (
                        <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                          <Unlock className="w-3 h-3 text-emerald-400" />
                          <span>Terbuka</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                          <Lock className="w-3 h-3 text-rose-400" />
                          <span>Ditutup</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-neutral-300">
                      {p.status === 'ditutup' ? (
                        <div>
                          <p className="text-neutral-400">
                            Ditutup pada: {p.ditutup_pada ? new Date(p.ditutup_pada).toLocaleDateString('id-ID') : '-'}
                          </p>
                        </div>
                      ) : p.alasan_buka_ulang ? (
                        <div>
                          <span className="text-[10px] text-amber-400 font-bold uppercase">Pernah Dibuka Kembali:</span>
                          <p className="text-neutral-400 italic">"{p.alasan_buka_ulang}"</p>
                        </div>
                      ) : (
                        <span className="text-neutral-500">Periode berjalan aktif.</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.status === 'terbuka' ? (
                        <button
                          type="button"
                          onClick={() => handleTutupPeriode(p.id)}
                          disabled={loading}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 transition-all flex items-center gap-1.5 mx-auto shadow-sm active:scale-95"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Tutup Periode</span>
                        </button>
                      ) : role === 'direktur' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenBukaModal(p.id)}
                          disabled={loading}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#d4af37]/15 text-[#d4af37] hover:bg-[#d4af37]/25 border border-[#d4af37]/40 transition-all flex items-center gap-1.5 mx-auto shadow-sm active:scale-95"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>Buka Kembali</span>
                        </button>
                      ) : (
                        <span className="text-neutral-500 text-xs italic">Perlu Otorisasi Direktur</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: FORM TAMBAH / EDIT AKUN */}
      {showAkunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-3xl liquid-glass-modal text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.10]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#d4af37]" />
                <span>{editingAkun ? 'Edit Akun COA' : 'Tambah Akun Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAkunModal(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSimpanAkun} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1">Kode Akun (4 Digit)</label>
                  <input
                    name="kode"
                    defaultValue={editingAkun?.kode || ''}
                    placeholder="Contoh: 1104"
                    disabled={!!editingAkun}
                    required
                    pattern="^[1-5][0-9]{3}$"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white disabled:opacity-50 focus:outline-none focus:border-[#d4af37] backdrop-blur-md"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1">Tipe Akun</label>
                  <select
                    name="tipe"
                    defaultValue={editingAkun?.tipe || 'beban'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white focus:outline-none focus:border-[#d4af37] backdrop-blur-md cursor-pointer"
                  >
                    <option value="aset" className="bg-neutral-900 text-white">Aset (1xxx)</option>
                    <option value="kewajiban" className="bg-neutral-900 text-white">Kewajiban (2xxx)</option>
                    <option value="ekuitas" className="bg-neutral-900 text-white">Ekuitas (3xxx)</option>
                    <option value="pendapatan" className="bg-neutral-900 text-white">Pendapatan (4xxx)</option>
                    <option value="beban" className="bg-neutral-900 text-white">Beban (5xxx)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">Nama Akun</label>
                <input
                  name="nama"
                  defaultValue={editingAkun?.nama || ''}
                  placeholder="Nama akun COA..."
                  required
                  minLength={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white focus:outline-none focus:border-[#d4af37] backdrop-blur-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1">Saldo Normal</label>
                  <select
                    name="saldo_normal"
                    defaultValue={editingAkun?.saldo_normal || 'debit'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white focus:outline-none focus:border-[#d4af37] backdrop-blur-md cursor-pointer"
                  >
                    <option value="debit" className="bg-neutral-900 text-white">Debit</option>
                    <option value="kredit" className="bg-neutral-900 text-white">Kredit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1">Status Akun</label>
                  <select
                    name="aktif"
                    defaultValue={editingAkun?.aktif !== false ? 'true' : 'false'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white focus:outline-none focus:border-[#d4af37] backdrop-blur-md cursor-pointer"
                  >
                    <option value="true" className="bg-neutral-900 text-white">Aktif</option>
                    <option value="false" className="bg-neutral-900 text-white">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="is_kas_bank"
                  value="true"
                  defaultChecked={editingAkun?.is_kas_bank || false}
                  id="chk_kas_bank"
                  className="rounded text-[#d4af37] focus:ring-[#d4af37]"
                />
                <label htmlFor="chk_kas_bank" className="text-neutral-300 text-xs cursor-pointer">
                  Merupakan Rekening Kas / Bank (Liquid Asset)
                </label>
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">Keterangan (Opsional)</label>
                <input
                  name="keterangan"
                  defaultValue={editingAkun?.keterangan || ''}
                  placeholder="Catatan tambahan..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white focus:outline-none focus:border-[#d4af37] backdrop-blur-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.10]">
                <button
                  type="button"
                  onClick={() => setShowAkunModal(false)}
                  className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b89328] text-neutral-950 font-bold hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-[#d4af37]/20 border border-[#f5d77f]/40"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BUKA KEMBALI PERIODE (BR-06) */}
      {showBukaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 sm:p-7 rounded-3xl liquid-glass-modal text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.10]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Unlock className="w-4 h-4 text-[#d4af37]" />
                <span>Buka Kembali Periode (BR-06)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBukaModal(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <p className="text-neutral-300 leading-relaxed">
                Sesuai aturan bisnis <strong>BR-06</strong>, pembukaan kembali periode yang sudah ditutup hanya dapat dilakukan oleh <strong>Direktur</strong> dan wajib disertai alasan tertulis minimal <strong>20 karakter</strong>.
              </p>

              <div>
                <label className="block text-neutral-300 mb-1">
                  Alasan Pembukaan Kembali (Min. 20 Karakter)
                </label>
                <textarea
                  value={alasanBuka}
                  onChange={(e) => setAlasanBuka(e.target.value)}
                  rows={3}
                  placeholder="Tuliskan justifikasi pembukaan kembali periode akuntansi ini..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white focus:outline-none focus:border-[#d4af37] backdrop-blur-md"
                />
                <span className="text-[11px] text-neutral-400">
                  {alasanBuka.length}/20 Karakter
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.10]">
                <button
                  type="button"
                  onClick={() => setShowBukaModal(false)}
                  className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleBukaPeriode}
                  disabled={loading || alasanBuka.trim().length < 20}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b89328] text-neutral-950 font-bold hover:brightness-110 transition-all disabled:opacity-40 shadow-lg shadow-[#d4af37]/20 border border-[#f5d77f]/40"
                >
                  {loading ? 'Memproses...' : 'Buka Periode'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: TAMBAH PERIODE BARU */}
      {showBuatPeriodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm p-6 sm:p-7 rounded-3xl liquid-glass-modal text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.10]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#d4af37]" />
                <span>Tambah Periode Akuntansi</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBuatPeriodeModal(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1">Bulan</label>
                  <select
                    value={bulanBaru}
                    onChange={(e) => setBulanBaru(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white focus:outline-none focus:border-[#d4af37] backdrop-blur-md cursor-pointer"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1} className="bg-neutral-900 text-white">
                        Bulan {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1">Tahun</label>
                  <input
                    type="number"
                    value={tahunBaru}
                    onChange={(e) => setTahunBaru(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white focus:outline-none focus:border-[#d4af37] backdrop-blur-md"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.10]">
                <button
                  type="button"
                  onClick={() => setShowBuatPeriodeModal(false)}
                  className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleBuatPeriode}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b89328] text-neutral-950 font-bold hover:brightness-110 transition-all disabled:opacity-40 shadow-lg shadow-[#d4af37]/20 border border-[#f5d77f]/40"
                >
                  {loading ? 'Mendaftarkan...' : 'Daftarkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
