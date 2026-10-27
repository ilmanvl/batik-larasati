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
} from 'lucide-react';
import PrintButton from '@/app/(protected)/laporan/laba-rugi/PrintButton';

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
    <div className="space-y-6 print:space-y-3 print:overflow-visible print:h-auto print:w-full print:p-0 print:m-0">
      {/* 1. Header Banner Liquid Glass */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl liquid-glass-header text-white print:hidden">
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

        <div className="flex items-center gap-3 print:hidden">
          <Link
            href="/buku-besar"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.12] transition-all"
          >
            <Scale className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Buku Besar</span>
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* 2. Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
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
      <div className="p-6 rounded-3xl liquid-glass space-y-4 print:hidden">
        <form method="GET" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <Calendar className="w-4 h-4 text-[#d4af37]" />
              <span>Periode Akuntansi:</span>
            </div>
            <select
              name="periode_id"
              defaultValue={selectedPeriodeId || ''}
              className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 transition-all min-w-[260px] backdrop-blur-md cursor-pointer"
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 transition-colors shadow-sm active:scale-95 self-start sm:self-auto"
            >
              Terapkan Filter
            </button>
          </div>

          {selectedPeriodeId && (
            <Link
              href="/neraca-saldo"
              className="text-xs text-[#d4af37] hover:underline transition-colors"
            >
              Reset ke Semua Periode
            </Link>
          )}
        </form>
      </div>

      {/* 4. Tabel Neraca Saldo (Standar Liquid Glass Table) */}
      <div className="p-6 sm:p-7 rounded-3xl liquid-glass-table space-y-5 print:bg-white print:text-black print:border-none print:shadow-none print:overflow-visible print:h-auto print:p-0 print:m-0 print:w-full">
        {/* Kop Resmi Cetak Neraca Saldo */}
        <div className="hidden print:block text-center border-b border-black pb-4 mb-4">
          <h2 className="text-xl font-black text-black tracking-wider uppercase">
            CV BATIK LARASATI
          </h2>
          <h3 className="text-base font-bold text-black uppercase tracking-wide mt-0.5">
            NERACA SALDO (TRIAL BALANCE)
          </h3>
          <p className="text-xs text-gray-800 mt-1 font-medium">
            {selectedPeriode
              ? `Untuk Periode Bulan ${selectedPeriode.bulan} Tahun ${selectedPeriode.tahun}`
              : 'Akumulasi Seluruh Periode (YTD per 31 Oktober 2026)'}
          </p>
          <span className="inline-block mt-0.5 text-[11px] font-mono text-gray-600">
            (Disajikan dalam Rupiah / IDR)
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08] print:hidden">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-[#d4af37]" />
              <span>Daftar Saldo Akun (Trial Balance Sheet)</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {selectedPeriode
                ? `Menampilkan transaksi untuk Periode ${selectedPeriode.bulan}/${selectedPeriode.tahun}`
                : 'Menampilkan akumulasi seluruh periode yang telah diposting'}
            </p>
          </div>
          <span className="text-xs text-neutral-400 font-mono bg-white/[0.06] px-3 py-1.5 rounded-xl border border-white/[0.10] self-start sm:self-auto">
            {akunList.length} Akun Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left border-collapse text-xs sm:text-sm print:text-xs">
            <thead>
              <tr className="border-b border-white/[0.12] bg-white/[0.05] text-[11px] uppercase tracking-wider text-neutral-300 print:bg-gray-100 print:text-black print:border-b-2 print:border-black">
                <th className="py-4 px-4 font-semibold w-28 print:py-2.5 print:text-black">Kode Akun</th>
                <th className="py-4 px-4 font-semibold print:py-2.5 print:text-black">Nama Akun COA</th>
                <th className="py-4 px-4 font-semibold w-28 text-center print:py-2.5 print:text-black">Tipe Akun</th>
                <th className="py-4 px-4 font-semibold w-28 text-center print:py-2.5 print:text-black">Posisi Normal</th>
                <th className="py-4 px-4 font-semibold text-right w-44 print:py-2.5 print:text-black">Saldo Debit (IDR)</th>
                <th className="py-4 px-4 font-semibold text-right w-44 print:py-2.5 print:text-black">Saldo Kredit (IDR)</th>
                <th className="py-4 px-4 font-semibold w-20 text-center print:hidden">Buku</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] print:divide-gray-300">
              {barisNeraca.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-neutral-400 print:text-gray-600">
                    Belum ada data akun yang terdaftar di sistem.
                  </td>
                </tr>
              ) : (
                barisNeraca.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-white/[0.04] transition-colors print:border-b print:border-gray-200 ${
                      row.adaAktivitas ? 'text-white print:text-black' : 'text-neutral-400 print:text-gray-600'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#d4af37] print:text-black print:py-2">
                      {row.kode}
                    </td>
                    <td className="py-3.5 px-4 print:py-2">
                      <div className="font-medium text-white print:text-black flex items-center gap-2">
                        <span>{row.nama}</span>
                        {!row.aktif && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 print:border-gray-400 print:text-gray-700 print:bg-gray-100">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      {!row.adaAktivitas && (
                        <div className="text-[10px] text-neutral-500 print:text-gray-500">Nol mutasi</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center print:py-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-white/[0.06] text-neutral-200 border border-white/[0.12] backdrop-blur-sm shadow-sm print:border-gray-400 print:text-black print:bg-gray-100">
                        {row.tipe}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center print:py-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase print:border-gray-400 print:text-black print:bg-gray-100 ${
                          row.saldoNormal === 'debit'
                            ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {row.saldoNormal}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono print:py-2">
                      {row.saldoDebit > 0 ? (
                        <span className="font-semibold text-white print:text-black">
                          {formatRupiah(row.saldoDebit)}
                        </span>
                      ) : (
                        <span className="text-neutral-500 print:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono print:py-2">
                      {row.saldoKredit > 0 ? (
                        <span className="font-semibold text-white print:text-black">
                          {formatRupiah(row.saldoKredit)}
                        </span>
                      ) : (
                        <span className="text-neutral-500 print:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center print:hidden">
                      <Link
                        href={`/buku-besar?akun_id=${row.id}${
                          selectedPeriodeId ? `&periode_id=${selectedPeriodeId}` : ''
                        }`}
                        title="Lihat Buku Besar"
                        className="p-2 rounded-xl text-neutral-400 hover:text-[#d4af37] bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] hover:border-[#d4af37]/40 inline-flex items-center justify-center transition-all shadow-sm"
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
              <tr className="border-t-2 border-white/[0.18] bg-white/[0.06] text-xs sm:text-sm font-bold print:bg-gray-100 print:border-t-2 print:border-b-2 print:border-black print:text-black">
                <td colSpan={4} className="py-4 px-4 text-right uppercase tracking-wider text-white print:text-black print:py-2.5">
                  Grand Total
                </td>
                <td className="py-4 px-4 text-right font-mono text-base text-[#d4af37] print:text-black print:font-bold print:py-2.5">
                  {formatRupiah(grandTotalDebit)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-base text-[#d4af37] print:text-black print:font-bold print:py-2.5">
                  {formatRupiah(grandTotalKredit)}
                </td>
                <td className="py-4 px-4 text-center print:hidden">
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
          className={`p-5 rounded-2xl flex items-center justify-between gap-4 backdrop-blur-md shadow-lg print:hidden ${
            isBalanced
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-emerald-500/10'
              : grandTotalDebit === 0
              ? 'bg-white/[0.04] border border-white/[0.10] text-neutral-400'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-300 shadow-rose-500/10'
          }`}
        >
          <div className="flex items-center gap-3">
            {isBalanced ? (
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : grandTotalDebit === 0 ? (
              <div className="w-10 h-10 rounded-2xl bg-white/[0.08] text-neutral-400 flex items-center justify-center shrink-0 border border-white/[0.12]">
                <Scale className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}

            <div>
              <p className="text-sm font-bold text-white">
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
            <span className="text-[11px] font-mono opacity-60 text-neutral-300">Status Verifikasi</span>
            <p className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
              {isBalanced ? '100% Terverifikasi' : 'Perlu Penyesuaian'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
