import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { PeranType } from '@/types/database';
import {
  Scale,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import PrintButton from '../laba-rugi/PrintButton';

// Formatter Rupiah Indonesia
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function NeracaPage({
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

  // Proteksi BR-11: Laporan Keuangan bersifat rahasia dan tidak boleh diakses oleh Staf
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

  // 4. Kalkulasi Saldo Tiap Kelompok Akun
  let totalAset = 0;
  let totalKewajiban = 0;
  let totalEkuitas = 0;
  let totalPendapatan = 0;
  let totalBeban = 0;

  const akunAset: any[] = [];
  const akunKewajiban: any[] = [];
  const akunEkuitas: any[] = [];

  akunList.forEach((akun) => {
    const mutasi = mutasiPerAkun[akun.id] || { debit: 0, kredit: 0 };

    if (akun.tipe === 'aset') {
      // Normal Debit: Saldo = Debit - Kredit
      const saldo = mutasi.debit - mutasi.kredit;
      totalAset += saldo;
      akunAset.push({ ...akun, saldo, mutasi });
    } else if (akun.tipe === 'kewajiban') {
      // Normal Kredit: Saldo = Kredit - Debit
      const saldo = mutasi.kredit - mutasi.debit;
      totalKewajiban += saldo;
      akunKewajiban.push({ ...akun, saldo, mutasi });
    } else if (akun.tipe === 'ekuitas') {
      // Normal Kredit: Saldo = Kredit - Debit
      const saldo = mutasi.kredit - mutasi.debit;
      totalEkuitas += saldo;
      akunEkuitas.push({ ...akun, saldo, mutasi });
    } else if (akun.tipe === 'pendapatan') {
      const saldo = mutasi.kredit - mutasi.debit;
      totalPendapatan += saldo;
    } else if (akun.tipe === 'beban') {
      const saldo = mutasi.debit - mutasi.kredit;
      totalBeban += saldo;
    }
  });

  // 5. Kalkulasi Laba (Rugi) Periode Berjalan untuk dimasukkan ke Ekuitas
  const labaBerjalan = totalPendapatan - totalBeban;
  const totalEkuitasDenganLaba = totalEkuitas + labaBerjalan;
  const totalPasiva = totalKewajiban + totalEkuitasDenganLaba;

  const selisih = Math.abs(totalAset - totalPasiva);
  const isBalanced = selisih === 0 && totalAset > 0;

  return (
    <div className="space-y-6 print:space-y-3 print:overflow-visible print:h-auto print:w-full print:p-0 print:m-0">
      {/* 1. Header Banner Liquid Glass */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl liquid-glass-header text-white print:hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-wider text-[#d4af37] font-bold">
              Laporan Keuangan SAK EMKM
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-xs text-neutral-400">CV Batik Larasati</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Laporan Posisi Keuangan</span>
            {isBalanced ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Balanced
              </span>
            ) : totalAset === 0 ? (
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
            Menyajikan posisi kekayaan (Aset) serta sumber pembiayaan (Kewajiban dan Ekuitas) pada tanggal pelaporan.
          </p>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <Link
            href="/neraca-saldo"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.12] transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Neraca Saldo</span>
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* 2. Navigasi Tab Laporan Keuangan */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 text-xs sm:text-sm font-semibold print:hidden">
        <Link
          href="/laporan/laba-rugi"
          className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          <span>Laba Rugi</span>
        </Link>
        <span className="px-4 py-2 rounded-xl bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 flex items-center gap-2">
          <Scale className="w-4 h-4" />
          <span>Posisi Keuangan (Neraca)</span>
        </span>
      </div>

      {/* 3. Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="p-5 rounded-2xl liquid-glass">
          <p className="text-xs font-medium text-neutral-400">Total Aset (Aktiva)</p>
          <p className="text-xl sm:text-2xl font-bold text-[#d4af37] mt-1.5 font-mono">
            {formatRupiah(totalAset)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Kas, Piutang, Persediaan & Aset Tetap</p>
        </div>

        <div className="p-5 rounded-2xl liquid-glass">
          <p className="text-xs font-medium text-neutral-400">Total Kewajiban (Liabilitas)</p>
          <p className="text-xl sm:text-2xl font-bold text-rose-400 mt-1.5 font-mono">
            {formatRupiah(totalKewajiban)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Utang usaha dan utang bank KUR</p>
        </div>

        <div className="p-5 rounded-2xl liquid-glass">
          <p className="text-xs font-medium text-neutral-400">Total Ekuitas & Laba</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1.5 font-mono">
            {formatRupiah(totalEkuitasDenganLaba)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Modal + Laba Berjalan ({formatRupiah(labaBerjalan)})</p>
        </div>

        <div
          className={`p-5 rounded-2xl liquid-glass border ${
            isBalanced
              ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
              : totalAset === 0
              ? 'border-white/[0.12]'
              : 'border-rose-500/30 bg-rose-500/[0.03]'
          }`}
        >
          <p className="text-xs font-medium text-neutral-400">Validasi Keseimbangan</p>
          <div className="flex items-center gap-2 mt-1.5">
            {isBalanced ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-lg font-bold text-emerald-400">SEIMBANG (0)</span>
              </>
            ) : totalAset === 0 ? (
              <span className="text-lg font-bold text-neutral-400">KOSONG</span>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="text-lg font-bold text-rose-400">TIDAK SEIMBANG</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {isBalanced ? 'Aktiva = Pasiva (100% Sesuai SAK EMKM)' : `Selisih: ${formatRupiah(selisih)}`}
          </p>
        </div>
      </div>

      {/* 4. Filter Periode */}
      <div className="p-5 rounded-3xl liquid-glass print:hidden">
        <form method="GET" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <Calendar className="w-4 h-4 text-[#d4af37]" />
              <span>Periode Posisi Keuangan:</span>
            </div>
            <select
              name="periode_id"
              defaultValue={selectedPeriodeId || ''}
              className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] transition-all min-w-[260px]"
            >
              <option value="" className="bg-neutral-900 text-neutral-400">
                -- Seluruh Periode (Akumulatif YTD) --
              </option>
              {periodeList.map((p) => (
                <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                  Posisi per Akhir Bulan {p.bulan}/{p.tahun} ({p.status.toUpperCase()})
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
              href="/laporan/neraca"
              className="text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Reset ke Seluruh Periode
            </Link>
          )}
        </form>
      </div>

      {/* 5. Lembar Format Resmi Neraca SAK EMKM (T-Account / Dua Kolom Komparatif) */}
      <div className="p-6 sm:p-8 rounded-3xl liquid-glass space-y-6 print:bg-white print:text-black print:border-none print:shadow-none print:overflow-visible print:h-auto print:p-0 print:m-0 print:w-full">
        {/* Kop Resmi Laporan */}
        <div className="text-center border-b border-white/[0.12] pb-5 print:border-black print:pb-4">
          <h2 className="text-xl sm:text-2xl font-black text-[#d4af37] print:text-black tracking-wider uppercase">
            CV BATIK LARASATI
          </h2>
          <h3 className="text-base sm:text-lg font-bold text-white print:text-black uppercase tracking-wide mt-0.5">
            LAPORAN POSISI KEUANGAN (NERACA)
          </h3>
          <p className="text-xs text-neutral-400 print:text-gray-800 mt-1 font-medium">
            {selectedPeriode
              ? `Per Akhir Periode Bulan ${selectedPeriode.bulan} Tahun ${selectedPeriode.tahun}`
              : 'Per 31 Oktober 2026'}
          </p>
          <span className="inline-block mt-1 text-[11px] font-mono text-neutral-500 print:text-gray-600">
            (Disajikan dalam Rupiah / IDR)
          </span>
        </div>

        {/* Layout Dua Kolom: Aset (Kiri) vs Kewajiban & Ekuitas (Kanan) */}
        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-8 print:gap-6 items-start print:overflow-visible print:h-auto">
          {/* KOLOM KIRI: ASET (AKTIVA) */}
          <div className="space-y-4 print:overflow-visible print:h-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#d4af37]/40 print:border-gray-400">
              <span className="text-sm font-bold text-[#d4af37] print:text-black uppercase tracking-wide">
                ASET (AKTIVA)
              </span>
              <span className="text-xs text-neutral-500 print:text-gray-600 font-mono">Kode 1xxx</span>
            </div>

            <div className="divide-y divide-white/[0.04] print:divide-gray-300 print:overflow-visible">
              {akunAset.map((akun) => (
                <div key={akun.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm print:py-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-neutral-500 print:text-gray-600 text-xs w-12">{akun.kode}</span>
                    <span className="text-neutral-200 print:text-gray-900">{akun.nama}</span>
                  </div>
                  <span className="font-mono font-medium text-white print:text-black print:font-semibold">
                    {akun.saldo > 0 ? formatRupiah(akun.saldo) : akun.saldo < 0 ? `(${formatRupiah(Math.abs(akun.saldo))})` : '-'}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t-2 border-white/[0.18] print:border-black flex items-center justify-between text-xs sm:text-sm font-bold bg-white/[0.03] print:bg-gray-100 px-4 py-3 rounded-xl print:text-black">
              <span className="text-white print:text-black uppercase tracking-wider font-bold">
                JUMLAH ASET
              </span>
              <span className="font-mono text-[#d4af37] print:text-black text-base font-black">
                {formatRupiah(totalAset)}
              </span>
            </div>
          </div>

          {/* KOLOM KANAN: KEWAJIBAN & EKUITAS (PASIVA) */}
          <div className="space-y-6 print:space-y-4 print:overflow-visible print:h-auto">
            {/* Bagian Kewajiban */}
            <div className="space-y-4 print:overflow-visible">
              <div className="flex items-center justify-between pb-2 border-b border-rose-500/40 print:border-gray-400">
                <span className="text-sm font-bold text-rose-400 print:text-black uppercase tracking-wide">
                  KEWAJIBAN (LIABILITAS)
                </span>
                <span className="text-xs text-neutral-500 print:text-gray-600 font-mono">Kode 2xxx</span>
              </div>

              <div className="divide-y divide-white/[0.04] print:divide-gray-300 print:overflow-visible">
                {akunKewajiban.map((akun) => (
                  <div key={akun.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm print:py-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-neutral-500 print:text-gray-600 text-xs w-12">{akun.kode}</span>
                      <span className="text-neutral-200 print:text-gray-900">{akun.nama}</span>
                    </div>
                    <span className="font-mono font-medium text-white print:text-black print:font-semibold">
                      {akun.saldo > 0 ? formatRupiah(akun.saldo) : '-'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/[0.08] print:border-gray-300 flex items-center justify-between text-xs font-semibold px-2 text-neutral-300 print:text-gray-800">
                <span>Subtotal Kewajiban</span>
                <span className="font-mono text-rose-400 print:text-black font-bold">{formatRupiah(totalKewajiban)}</span>
              </div>
            </div>

            {/* Bagian Ekuitas */}
            <div className="space-y-4 print:overflow-visible">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/40 print:border-gray-400">
                <span className="text-sm font-bold text-emerald-400 print:text-black uppercase tracking-wide">
                  EKUITAS (MODAL)
                </span>
                <span className="text-xs text-neutral-500 print:text-gray-600 font-mono">Kode 3xxx</span>
              </div>

              <div className="divide-y divide-white/[0.04] print:divide-gray-300 print:overflow-visible">
                {akunEkuitas.map((akun) => (
                  <div key={akun.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm print:py-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-neutral-500 print:text-gray-600 text-xs w-12">{akun.kode}</span>
                      <span className="text-neutral-200 print:text-gray-900">{akun.nama}</span>
                    </div>
                    <span className="font-mono font-medium text-white print:text-black print:font-semibold">
                      {akun.saldo > 0 ? formatRupiah(akun.saldo) : '-'}
                    </span>
                  </div>
                ))}

                {/* Baris Dinamis: Laba (Rugi) Periode Berjalan */}
                <div className="py-2.5 flex items-center justify-between text-xs sm:text-sm bg-emerald-500/[0.04] print:bg-gray-100 px-2 rounded-lg print:py-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-emerald-500 print:text-gray-600 text-xs w-12">LR-NET</span>
                    <span className="text-emerald-300 print:text-black font-semibold">
                      Laba (Rugi) Periode Berjalan
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 print:text-black">
                    {formatRupiah(labaBerjalan)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.08] print:border-gray-300 flex items-center justify-between text-xs font-semibold px-2 text-neutral-300 print:text-gray-800">
                <span>Subtotal Ekuitas</span>
                <span className="font-mono text-emerald-400 print:text-black font-bold">{formatRupiah(totalEkuitasDenganLaba)}</span>
              </div>
            </div>

            {/* Total Pasiva (Kewajiban + Ekuitas) */}
            <div className="mt-4 pt-3 border-t-2 border-white/[0.18] print:border-black flex items-center justify-between text-xs sm:text-sm font-bold bg-white/[0.03] print:bg-gray-100 px-4 py-3 rounded-xl print:text-black">
              <span className="text-white print:text-black uppercase tracking-wider font-bold">
                JUMLAH KEWAJIBAN & EKUITAS
              </span>
              <span className="font-mono text-[#d4af37] print:text-black text-base font-black">
                {formatRupiah(totalPasiva)}
              </span>
            </div>
          </div>
        </div>

        {/* 6. Banner Konfirmasi Keseimbangan Neraca */}
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-4 print:hidden ${
            isBalanced
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : totalAset === 0
              ? 'bg-white/[0.02] border border-white/[0.08] text-neutral-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {isBalanced ? (
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : totalAset === 0 ? (
              <div className="w-9 h-9 rounded-xl bg-neutral-800 text-neutral-400 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}

            <div>
              <p className="text-sm font-bold">
                {isBalanced
                  ? 'Persamaan Akuntansi Terverifikasi Seimbang (Balance)'
                  : totalAset === 0
                  ? 'Belum Ada Transaksi yang Diposting'
                  : 'Peringatan: Posisi Keuangan Tidak Seimbang!'}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {isBalanced
                  ? 'Total Aset sama persis dengan Total Kewajiban dan Ekuitas (Rp 284.421.000). Standar SAK EMKM terpenuhi 100%.'
                  : totalAset === 0
                  ? 'Silakan buat dan posting jurnal terlebih dahulu untuk melihat posisi keuangan.'
                  : `Terdapat selisih antara Aktiva dan Pasiva sebesar ${formatRupiah(selisih)}.`}
              </p>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            <span className="text-[11px] font-mono opacity-60">Status Neraca</span>
            <p className="text-xs font-bold uppercase tracking-wider">
              {isBalanced ? '100% Valid SAK EMKM' : 'Perlu Penyesuaian'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
