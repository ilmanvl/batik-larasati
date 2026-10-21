import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { PeranType } from '@/types/database';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  FileSpreadsheet,
  Scale,
  Layers,
  Sparkles,
} from 'lucide-react';
import PrintButton from './PrintButton';

// Formatter Rupiah Indonesia
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function LabaRugiPage({
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

  // 2. Ambil seluruh akun kategori Pendapatan dan Beban (termasuk yang nonaktif bila ada mutasi riil)
  const { data: daftarAkun } = await supabase
    .from('akun')
    .select('id, kode, nama, tipe, saldo_normal, aktif')
    .in('tipe', ['pendapatan', 'beban'])
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

  // 4. Kalkulasi Subtotal Pendapatan & Subtotal Beban
  const akunPendapatan = akunList
    .filter((a) => a.tipe === 'pendapatan')
    .map((akun) => {
      const mutasi = mutasiPerAkun[akun.id] || { debit: 0, kredit: 0 };
      // Pendapatan saldo normal kredit: Saldo = Kredit - Debit
      const saldo = mutasi.kredit - mutasi.debit;
      return {
        ...akun,
        saldo,
        adaAktivitas: mutasi.debit > 0 || mutasi.kredit > 0,
      };
    });

  const akunBeban = akunList
    .filter((a) => a.tipe === 'beban')
    .map((akun) => {
      const mutasi = mutasiPerAkun[akun.id] || { debit: 0, kredit: 0 };
      // Beban saldo normal debit: Saldo = Debit - Kredit
      const saldo = mutasi.debit - mutasi.kredit;
      return {
        ...akun,
        saldo,
        adaAktivitas: mutasi.debit > 0 || mutasi.kredit > 0,
      };
    });

  const totalPendapatan = akunPendapatan.reduce((acc, curr) => acc + curr.saldo, 0);
  const totalBeban = akunBeban.reduce((acc, curr) => acc + curr.saldo, 0);
  const labaBersih = totalPendapatan - totalBeban;
  const isProfit = labaBersih >= 0;
  const netMargin = totalPendapatan > 0 ? (labaBersih / totalPendapatan) * 100 : 0;

  return (
    <div className="space-y-6">
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
            <span>Laporan Laba Rugi</span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isProfit
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {isProfit ? 'Laba Bersih' : 'Rugi Bersih'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            Menyajikan ikhtisar pendapatan usaha dan beban operasional untuk mengukur kinerja profitabilitas entitas.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
        <span className="px-4 py-2 rounded-xl bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          <span>Laba Rugi</span>
        </span>
        <Link
          href="/laporan/neraca"
          className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <Scale className="w-4 h-4" />
          <span>Posisi Keuangan (Neraca)</span>
        </Link>
      </div>

      {/* 3. Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="p-5 rounded-2xl liquid-glass">
          <p className="text-xs font-medium text-neutral-400">Total Pendapatan Usaha</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1.5 font-mono">
            {formatRupiah(totalPendapatan)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Akumulasi seluruh sumber omzet</p>
        </div>

        <div className="p-5 rounded-2xl liquid-glass">
          <p className="text-xs font-medium text-neutral-400">Total Beban Operasional</p>
          <p className="text-xl sm:text-2xl font-bold text-rose-400 mt-1.5 font-mono">
            {formatRupiah(totalBeban)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Biaya pokok & biaya operasional</p>
        </div>

        <div className="p-5 rounded-2xl liquid-glass">
          <p className="text-xs font-medium text-neutral-400">
            {isProfit ? 'Laba Bersih Usaha' : 'Rugi Bersih Usaha'}
          </p>
          <p
            className={`text-xl sm:text-2xl font-bold mt-1.5 font-mono ${
              isProfit ? 'text-[#d4af37]' : 'text-rose-400'
            }`}
          >
            {formatRupiah(Math.abs(labaBersih))}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">
            {isProfit ? 'Surplus operasional bersih' : 'Defisit operasional'}
          </p>
        </div>

        <div className="p-5 rounded-2xl liquid-glass">
          <p className="text-xs font-medium text-neutral-400">Margin Laba Bersih</p>
          <p className="text-xl sm:text-2xl font-bold text-white mt-1.5 font-mono">
            {netMargin.toFixed(1)}%
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Net profit margin terhadap omzet</p>
        </div>
      </div>

      {/* 4. Filter Periode */}
      <div className="p-5 rounded-3xl liquid-glass print:hidden">
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
                -- Seluruh Periode (Akumulatif YTD) --
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
              href="/laporan/laba-rugi"
              className="text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Reset ke Seluruh Periode
            </Link>
          )}
        </form>
      </div>

      {/* 5. Lembar Format Resmi Laporan Laba Rugi SAK EMKM */}
      <div className="p-6 sm:p-8 rounded-3xl liquid-glass space-y-6 print:bg-white print:text-black print:border-none print:shadow-none">
        {/* Kop Resmi Laporan */}
        <div className="text-center border-b border-white/[0.12] pb-5 print:border-black">
          <h2 className="text-xl sm:text-2xl font-black text-[#d4af37] print:text-black tracking-wider uppercase">
            CV BATIK LARASATI
          </h2>
          <h3 className="text-base sm:text-lg font-bold text-white print:text-black uppercase tracking-wide mt-0.5">
            LAPORAN LABA RUGI
          </h3>
          <p className="text-xs text-neutral-400 print:text-neutral-700 mt-1">
            {selectedPeriode
              ? `Untuk Periode Bulan ${selectedPeriode.bulan} Tahun ${selectedPeriode.tahun}`
              : 'Untuk Periode yang Berakhir pada 31 Oktober 2026 (Akumulatif)'}
          </p>
          <span className="inline-block mt-1 text-[11px] font-mono text-neutral-500 print:text-neutral-600">
            (Disajikan dalam Rupiah / IDR)
          </span>
        </div>

        {/* Tabel Rincian */}
        <div className="space-y-6">
          {/* BAGIAN I: PENDAPATAN OPERASIONAL */}
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-emerald-500/30 print:border-neutral-400">
              <span className="text-sm font-bold text-emerald-400 print:text-neutral-900 uppercase tracking-wide">
                I. Pendapatan Operasional
              </span>
              <span className="text-xs text-neutral-500 print:text-neutral-600 font-mono">Kode 4xxx</span>
            </div>
            <div className="divide-y divide-white/[0.04] print:divide-neutral-200">
              {akunPendapatan.map((akun) => (
                <div key={akun.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-neutral-500 print:text-neutral-600 text-xs w-12">
                      {akun.kode}
                    </span>
                    <span className="text-neutral-200 print:text-neutral-900">{akun.nama}</span>
                    {!akun.aktif && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700 print:border-neutral-300">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-medium text-white print:text-neutral-900">
                    {akun.saldo > 0 ? formatRupiah(akun.saldo) : '-'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.1] print:border-neutral-400 flex items-center justify-between text-xs sm:text-sm font-bold bg-white/[0.02] print:bg-neutral-100 px-4 py-3 rounded-xl">
              <span className="text-neutral-200 print:text-neutral-900 uppercase">
                Total Pendapatan Operasional
              </span>
              <span className="font-mono text-emerald-400 print:text-neutral-900 text-base">
                {formatRupiah(totalPendapatan)}
              </span>
            </div>
          </div>

          {/* BAGIAN II: BEBAN OPERASIONAL */}
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-rose-500/30 print:border-neutral-400">
              <span className="text-sm font-bold text-rose-400 print:text-neutral-900 uppercase tracking-wide">
                II. Beban Operasional & Usaha
              </span>
              <span className="text-xs text-neutral-500 print:text-neutral-600 font-mono">Kode 5xxx</span>
            </div>
            <div className="divide-y divide-white/[0.04] print:divide-neutral-200">
              {akunBeban.map((akun) => (
                <div key={akun.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-neutral-500 print:text-neutral-600 text-xs w-12">
                      {akun.kode}
                    </span>
                    <span className="text-neutral-200 print:text-neutral-900">{akun.nama}</span>
                    {!akun.aktif && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700 print:border-neutral-300">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-medium text-white print:text-neutral-900">
                    {akun.saldo > 0
                      ? formatRupiah(akun.saldo)
                      : akun.saldo < 0
                      ? `(${formatRupiah(Math.abs(akun.saldo))})`
                      : '-'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.1] print:border-neutral-400 flex items-center justify-between text-xs sm:text-sm font-bold bg-white/[0.02] print:bg-neutral-100 px-4 py-3 rounded-xl">
              <span className="text-neutral-200 print:text-neutral-900 uppercase">
                Total Beban Operasional
              </span>
              <span className="font-mono text-rose-400 print:text-neutral-900 text-base">
                {formatRupiah(totalBeban)}
              </span>
            </div>
          </div>

          {/* BAGIAN III: LABA / (RUGI) BERSIH */}
          <div className="pt-4 border-t-2 border-white/[0.2] print:border-neutral-900">
            <div
              className={`p-5 rounded-2xl flex items-center justify-between ${
                isProfit
                  ? 'bg-gradient-to-r from-emerald-500/15 to-[#d4af37]/15 border border-[#d4af37]/40 print:bg-neutral-100 print:border-neutral-900'
                  : 'bg-rose-500/15 border border-rose-500/40 print:bg-neutral-100 print:border-neutral-900'
              }`}
            >
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-300 print:text-neutral-900 font-bold">
                  {isProfit
                    ? 'Laba Bersih Tahun / Periode Berjalan'
                    : 'Rugi Bersih Tahun / Periode Berjalan'}
                </p>
                <p className="text-[11px] text-neutral-400 print:text-neutral-600 mt-0.5">
                  (Total Pendapatan Operasional dikurangi Total Beban Usaha)
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-xl sm:text-3xl font-black font-mono tracking-tight ${
                    isProfit ? 'text-[#d4af37] print:text-neutral-900' : 'text-rose-400 print:text-rose-700'
                  }`}
                >
                  {formatRupiah(Math.abs(labaBersih))}
                </span>
                <span className="block text-[11px] text-neutral-400 print:text-neutral-600 font-mono mt-0.5">
                  Margin: {netMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
