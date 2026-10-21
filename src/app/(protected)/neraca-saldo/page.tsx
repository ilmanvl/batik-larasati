import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { PeranType } from '@/types/database';
import {
  Scale,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';

// Formatter Rupiah Indonesia
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function NeracaSaldoPage({
  searchParams,
}: {
  searchParams: Promise<{ periode_id?: string }>;
}) {
  const { periode_id } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/masuk');

  const { data: profile } = await supabase
    .from('profiles')
    .select('nama_lengkap, peran')
    .eq('id', user.id)
    .single();

  const role = (profile?.peran || 'staf') as PeranType;

  // Proteksi BR-11: Neraca Saldo bersifat rahasia dan tidak boleh diakses oleh Staf
  if (role === 'staf') {
    redirect('/dashboard');
  }

  // 1. Ambil daftar Periode untuk filter
  const { data: daftarPeriode } = await supabase
    .from('periode')
    .select('id, tahun, bulan, status')
    .order('tahun', { ascending: false })
    .order('bulan', { ascending: false });

  const periodeList = daftarPeriode || [];
  const selectedPeriodeId = periode_id ? parseInt(periode_id, 10) : null;
  const selectedPeriode = periodeList.find((p) => p.id === selectedPeriodeId);

  // 2. Ambil seluruh COA terurut berdasarkan kode akun
  // (termasuk akun yang dinonaktifkan tetapi memiliki riwayat transaksi jurnal)
  const { data: daftarAkun } = await supabase
    .from('akun')
    .select('id, kode, nama, tipe, saldo_normal, aktif')
    .order('kode', { ascending: true });

  const akunList = daftarAkun || [];

  // 3. Ambil seluruh baris jurnal yang berstatus 'diposting'
  const { data: barisData } = await supabase
    .from('jurnal_baris')
    .select(`
      id,
      akun_id,
      debit,
      kredit,
      jurnal:jurnal!jurnal_baris_jurnal_id_fkey(
        id,
        nomor,
        tanggal,
        status,
        periode_id
      )
    `);

  // Filter jurnal diposting & periode terpilih (jika ada)
  const barisDiposting = (barisData || []).filter((row: any) => {
    const j = Array.isArray(row.jurnal) ? row.jurnal[0] : row.jurnal;
    if (!j || j.status !== 'diposting') return false;
    if (selectedPeriodeId && j.periode_id !== selectedPeriodeId) return false;
    return true;
  });

  // Agregasi mutasi debit & kredit per akun_id
  const mutasiPerAkun: Record<number, { debit: number; kredit: number }> = {};
  for (const b of barisDiposting) {
    if (!mutasiPerAkun[b.akun_id]) {
      mutasiPerAkun[b.akun_id] = { debit: 0, kredit: 0 };
    }
    mutasiPerAkun[b.akun_id].debit += Number(b.debit) || 0;
    mutasiPerAkun[b.akun_id].kredit += Number(b.kredit) || 0;
  }

  // 4. Hitung Saldo Akhir Neraca Saldo untuk setiap Akun
  let grandTotalDebit = 0;
  let grandTotalKredit = 0;

  const barisNeraca = akunList.map((akun) => {
    const mutasi = mutasiPerAkun[akun.id] || { debit: 0, kredit: 0 };
    const net = mutasi.debit - mutasi.kredit;

    let saldoDebit = 0;
    let saldoKredit = 0;

    if (akun.saldo_normal === 'debit') {
      if (net >= 0) {
        saldoDebit = net;
      } else {
        saldoKredit = Math.abs(net);
      }
    } else {
      // Saldo normal kredit
      if (net <= 0) {
        saldoKredit = Math.abs(net);
      } else {
        saldoDebit = net;
      }
    }

    grandTotalDebit += saldoDebit;
    grandTotalKredit += saldoKredit;

    return {
      id: akun.id,
      kode: akun.kode,
      nama: akun.nama,
      tipe: akun.tipe,
      saldoNormal: akun.saldo_normal,
      aktif: akun.aktif,
      totalMutasiDebit: mutasi.debit,
      totalMutasiKredit: mutasi.kredit,
      saldoDebit,
      saldoKredit,
      adaAktivitas: mutasi.debit > 0 || mutasi.kredit > 0,
    };
  });

  const selisih = Math.abs(grandTotalDebit - grandTotalKredit);
  const isBalanced = selisih === 0 && grandTotalDebit > 0;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Liquid Glass */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl liquid-glass-header text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-wider text-[#d4af37] font-bold">
              Neraca Saldo (Trial Balance)
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-xs text-neutral-400">CV Batik Larasati</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Neraca Saldo</span>
            {isBalanced ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Balanced
              </span>
            ) : grandTotalDebit === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
                Belum Ada Jurnal
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-3.5 h-3.5" />
                Selisih: {formatRupiah(selisih)}
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            Pemeriksaan matematis keseimbangan posisi Debit dan Kredit seluruh akun COA dari jurnal yang telah diposting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/buku-besar"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.12] transition-all"
          >
            <Scale className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Buku Besar</span>
          </Link>
          <Link
            href="/jurnal"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.12] transition-all"
          >
            <span>Daftar Jurnal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl liquid-glass">
          <p className="text-xs font-medium text-neutral-400">Total Akun Terdaftar</p>
          <p className="text-2xl font-bold text-white mt-1.5">{akunList.length}</p>
          <p className="text-[11px] text-neutral-500 mt-1">
            {barisNeraca.filter((b) => b.adaAktivitas).length} akun memiliki mutasi
          </p>
        </div>

        <div className="p-5 rounded-2xl liquid-glass">
          <p className="text-xs font-medium text-neutral-400">Grand Total Debit</p>
          <p className="text-xl sm:text-2xl font-bold text-[#d4af37] mt-1.5 font-mono">
            {formatRupiah(grandTotalDebit)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Sisi Debit Neraca Saldo</p>
        </div>

        <div className="p-5 rounded-2xl liquid-glass">
          <p className="text-xs font-medium text-neutral-400">Grand Total Kredit</p>
          <p className="text-xl sm:text-2xl font-bold text-[#d4af37] mt-1.5 font-mono">
            {formatRupiah(grandTotalKredit)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Sisi Kredit Neraca Saldo</p>
        </div>

        <div
          className={`p-5 rounded-2xl liquid-glass border ${
            isBalanced
              ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
              : grandTotalDebit === 0
              ? 'border-white/[0.12]'
              : 'border-rose-500/30 bg-rose-500/[0.03]'
          }`}
        >
          <p className="text-xs font-medium text-neutral-400">Status Keseimbangan</p>
          <div className="flex items-center gap-2 mt-1.5">
            {isBalanced ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-lg font-bold text-emerald-400">SEIMBANG (0)</span>
              </>
            ) : grandTotalDebit === 0 ? (
              <span className="text-lg font-bold text-neutral-400">KOSONG</span>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="text-lg font-bold text-rose-400">TIDAK SEIMBANG</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {isBalanced
              ? 'Debit & Kredit tepat sama (100% Sesuai SAK EMKM)'
              : grandTotalDebit === 0
              ? 'Tidak ada transaksi jurnal diposting'
              : `Terdapat selisih ${formatRupiah(selisih)}`}
          </p>
        </div>
      </div>

      {/* 3. Filter Periode */}
      <div className="p-5 rounded-3xl liquid-glass">
        <form method="GET" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <Calendar className="w-4 h-4 text-[#d4af37]" />
              <span>Periode Akuntansi:</span>
            </div>
            <select
              name="periode_id"
              defaultValue={selectedPeriodeId || ''}
              className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] transition-all min-w-[260px]"
            >
              <option value="" className="bg-neutral-900 text-neutral-400">
                -- Semua Periode Akuntansi --
              </option>
              {periodeList.map((p) => (
                <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                  Periode {p.bulan}/{p.tahun} ({p.status.toUpperCase()})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#d4af37] hover:bg-[#c49f2e] text-neutral-950 transition-all active:scale-95 self-start sm:self-auto"
            >
              Terapkan Filter
            </button>
          </div>

          {selectedPeriodeId && (
            <Link
              href="/neraca-saldo"
              className="text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Reset ke Semua Periode
            </Link>
          )}
        </form>
      </div>

      {/* 4. Tabel Neraca Saldo */}
      <div className="p-6 rounded-3xl liquid-glass space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/[0.08]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#d4af37]" />
              <span>Daftar Saldo Akun (Trial Balance Sheet)</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {selectedPeriode
                ? `Menampilkan transaksi untuk Periode ${selectedPeriode.bulan}/${selectedPeriode.tahun}`
                : 'Menampilkan akumulasi seluruh periode yang telah diposting'}
            </p>
          </div>
          <span className="text-xs text-neutral-500 font-mono">
            {akunList.length} Akun
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/[0.12]">
          <table className="w-full text-left border-collapse liquid-glass-table">
            <thead>
              <tr className="border-b border-white/[0.12] bg-white/[0.04] text-[11px] uppercase tracking-wider text-neutral-400">
                <th className="py-3.5 px-4 font-semibold w-28">Kode Akun</th>
                <th className="py-3.5 px-4 font-semibold">Nama Akun COA</th>
                <th className="py-3.5 px-4 font-semibold w-28 text-center">Tipe Akun</th>
                <th className="py-3.5 px-4 font-semibold w-28 text-center">Posisi Normal</th>
                <th className="py-3.5 px-4 font-semibold text-right w-44">Saldo Debit (IDR)</th>
                <th className="py-3.5 px-4 font-semibold text-right w-44">Saldo Kredit (IDR)</th>
                <th className="py-3.5 px-4 font-semibold w-16 text-center">Buku</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-xs sm:text-sm">
              {barisNeraca.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    Belum ada data akun yang terdaftar di sistem.
                  </td>
                </tr>
              ) : (
                barisNeraca.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-white/[0.03] transition-colors ${
                      row.adaAktivitas ? 'text-white' : 'text-neutral-400'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#d4af37]">
                      {row.kode}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white flex items-center gap-2">
                        <span>{row.nama}</span>
                        {!row.aktif && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      {!row.adaAktivitas && (
                        <div className="text-[10px] text-neutral-500">Nol mutasi</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {row.tipe}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          row.saldoNormal === 'debit'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {row.saldoNormal}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      {row.saldoDebit > 0 ? (
                        <span className="font-semibold text-white">
                          {formatRupiah(row.saldoDebit)}
                        </span>
                      ) : (
                        <span className="text-neutral-600">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      {row.saldoKredit > 0 ? (
                        <span className="font-semibold text-white">
                          {formatRupiah(row.saldoKredit)}
                        </span>
                      ) : (
                        <span className="text-neutral-600">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        href={`/buku-besar?akun_id=${row.id}${
                          selectedPeriodeId ? `&periode_id=${selectedPeriodeId}` : ''
                        }`}
                        title="Lihat Buku Besar"
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-[#d4af37] hover:bg-white/[0.05] inline-flex items-center justify-center transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* 5. Footer Tabel: Grand Total & Balance Indicator */}
            <tfoot>
              <tr className="border-t-2 border-white/[0.18] bg-white/[0.06] text-xs sm:text-sm font-bold">
                <td colSpan={4} className="py-4 px-4 text-right uppercase tracking-wider text-white">
                  Grand Total
                </td>
                <td className="py-4 px-4 text-right font-mono text-base text-[#d4af37]">
                  {formatRupiah(grandTotalDebit)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-base text-[#d4af37]">
                  {formatRupiah(grandTotalKredit)}
                </td>
                <td className="py-4 px-4 text-center">
                  {isBalanced && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 inline-block" />
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 6. Banner Konfirmasi Keseimbangan */}
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-4 ${
            isBalanced
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : grandTotalDebit === 0
              ? 'bg-white/[0.02] border border-white/[0.08] text-neutral-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {isBalanced ? (
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : grandTotalDebit === 0 ? (
              <div className="w-9 h-9 rounded-xl bg-neutral-800 text-neutral-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}

            <div>
              <p className="text-sm font-bold">
                {isBalanced
                  ? 'Neraca Saldo Dinyatakan Seimbang (Balance)'
                  : grandTotalDebit === 0
                  ? 'Belum Ada Transaksi yang Diposting'
                  : 'Peringatan: Neraca Saldo Tidak Seimbang!'}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {isBalanced
                  ? 'Total Debit dan Total Kredit bernilai sama persis. Data siap dilanjutkan ke penyusunan Laporan Keuangan.'
                  : grandTotalDebit === 0
                  ? 'Silakan buat dan posting jurnal terlebih dahulu untuk melihat pergerakan saldo.'
                  : `Terdapat ketidakseimbangan sebesar ${formatRupiah(
                      selisih
                    )}. Silakan periksa kembali entri pada Buku Besar dan Jurnal Umum.`}
              </p>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            <span className="text-[11px] font-mono opacity-60">Status Verifikasi</span>
            <p className="text-xs font-bold uppercase tracking-wider">
              {isBalanced ? '100% Terverifikasi' : 'Perlu Penyesuaian'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
