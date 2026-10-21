import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { PeranType } from '@/types/database';
import {
  BookMarked,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  ExternalLink,
  Scale,
} from 'lucide-react';

// Formatter Rupiah Indonesia
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format Tanggal Lokal
function formatTanggal(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

export default async function BukuBesarPage({
  searchParams,
}: {
  searchParams: Promise<{ akun_id?: string; periode_id?: string }>;
}) {
  const { akun_id, periode_id } = await searchParams;
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

  // Proteksi BR-11: Buku Besar bersifat rahasia dan tidak boleh diakses oleh Staf
  if (role === 'staf') {
    redirect('/dashboard');
  }

  // 1. Ambil seluruh daftar Akun COA aktif untuk dropdown filter
  const { data: daftarAkun } = await supabase
    .from('akun')
    .select('id, kode, nama, tipe, saldo_normal')
    .eq('aktif', true)
    .order('kode', { ascending: true });

  const akunList = daftarAkun || [];

  // Tentukan akun terpilih (default ke akun kas 1101 atau akun pertama)
  const selectedAkunId = akun_id ? parseInt(akun_id, 10) : akunList[0]?.id;
  const selectedAkun = akunList.find((a) => a.id === selectedAkunId) || akunList[0];

  // 2. Ambil daftar Periode untuk filter
  const { data: daftarPeriode } = await supabase
    .from('periode')
    .select('id, tahun, bulan, status')
    .order('tahun', { ascending: false })
    .order('bulan', { ascending: false });

  const periodeList = daftarPeriode || [];
  const selectedPeriodeId = periode_id ? parseInt(periode_id, 10) : null;

  // 3. Query baris jurnal yang berstatus 'diposting' untuk akun terpilih
  let query = supabase
    .from('jurnal_baris')
    .select(`
      id,
      urutan,
      debit,
      kredit,
      keterangan,
      jurnal_id,
      jurnal:jurnal!jurnal_baris_jurnal_id_fkey(
        id,
        nomor,
        tanggal,
        keterangan,
        status,
        periode_id
      )
    `)
    .eq('akun_id', selectedAkun ? selectedAkun.id : 0);

  const { data: barisData } = await query;

  // Filter di memory untuk memastikan status 'diposting' dan periode terpilih
  const mutasiValid = (barisData || [])
    .filter((row: any) => {
      const j = Array.isArray(row.jurnal) ? row.jurnal[0] : row.jurnal;
      if (!j || j.status !== 'diposting') return false;
      if (selectedPeriodeId && j.periode_id !== selectedPeriodeId) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      const jA = Array.isArray(a.jurnal) ? a.jurnal[0] : a.jurnal;
      const jB = Array.isArray(b.jurnal) ? b.jurnal[0] : b.jurnal;
      const dateDiff = new Date(jA.tanggal).getTime() - new Date(jB.tanggal).getTime();
      return dateDiff !== 0 ? dateDiff : a.id - b.id;
    });

  // 4. Kalkulasi Running Balance (Saldo Berjalan)
  let currentBalance = 0;
  let totalDebit = 0;
  let totalKredit = 0;
  const isDebitNormal = selectedAkun ? selectedAkun.saldo_normal === 'debit' : true;

  const rowsWithBalance = mutasiValid.map((row: any) => {
    const d = Number(row.debit) || 0;
    const k = Number(row.kredit) || 0;
    totalDebit += d;
    totalKredit += k;

    if (isDebitNormal) {
      currentBalance += d - k;
    } else {
      currentBalance += k - d;
    }

    const j = Array.isArray(row.jurnal) ? row.jurnal[0] : row.jurnal;

    return {
      id: row.id,
      jurnalId: j.id,
      nomorJurnal: j.nomor || `JU-${j.id}`,
      tanggal: j.tanggal,
      keterangan: row.keterangan || j.keterangan,
      debit: d,
      kredit: k,
      runningBalance: currentBalance,
    };
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Apple iOS Liquid Glass */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl liquid-glass-header text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-wider text-[#d4af37] font-bold">
              Buku Besar (General Ledger)
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-xs text-neutral-400">CV Batik Larasati</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Buku Besar Akun
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            Rekapitulasi mutasi dan saldo berjalan per akun berdasarkan seluruh jurnal yang telah diposting ke sistem.
          </p>
        </div>
      </div>

      {/* 2. Filter Bar Liquid Glass */}
      <div className="p-5 rounded-3xl liquid-glass space-y-4">
        <form method="GET" className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Pilihan Akun COA */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Pilih Akun Buku Besar (COA)</span>
            </label>
            <select
              name="akun_id"
              defaultValue={selectedAkun?.id}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] transition-all"
            >
              {akunList.map((a) => (
                <option key={a.id} value={a.id} className="bg-neutral-900 text-white">
                  [{a.kode}] {a.nama} — {a.tipe.toUpperCase()} (Saldo Normal: {a.saldo_normal.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Pilihan Periode */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Filter Periode Akuntansi</span>
            </label>
            <div className="flex gap-2">
              <select
                name="periode_id"
                defaultValue={selectedPeriodeId || ''}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] transition-all"
              >
                <option value="" className="bg-neutral-900 text-neutral-400">
                  -- Semua Periode --
                </option>
                {periodeList.map((p) => (
                  <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                    Periode {p.bulan}/{p.tahun} ({p.status})
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#d4af37] hover:bg-[#c49f2e] text-neutral-950 transition-all active:scale-95"
              >
                Tampilkan
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. Kartu Ringkasan Akun Terpilih */}
      {selectedAkun && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Detail Akun */}
          <div className="p-5 rounded-3xl liquid-glass space-y-1 sm:col-span-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
              Informasi Akun
            </span>
            <div className="text-lg font-mono font-bold text-[#d4af37]">
              [{selectedAkun.kode}]
            </div>
            <div className="text-sm font-semibold text-white truncate">
              {selectedAkun.nama}
            </div>
            <div className="text-[11px] text-neutral-400 capitalize">
              {selectedAkun.tipe} · Saldo Normal: {selectedAkun.saldo_normal}
            </div>
          </div>

          {/* Total Debit */}
          <div className="p-5 rounded-3xl liquid-glass space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
              Total Mutasi Debit
            </span>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {formatRupiah(totalDebit)}
            </div>
            <p className="text-[11px] text-neutral-500">Akumulasi transaksi debit</p>
          </div>

          {/* Total Kredit */}
          <div className="p-5 rounded-3xl liquid-glass space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
              Total Mutasi Kredit
            </span>
            <div className="text-xl font-bold font-mono text-cyan-400">
              {formatRupiah(totalKredit)}
            </div>
            <p className="text-[11px] text-neutral-500">Akumulasi transaksi kredit</p>
          </div>

          {/* Saldo Akhir Berjalan */}
          <div className="p-5 rounded-3xl liquid-glass space-y-1 border border-[#d4af37]/30 bg-[#d4af37]/[0.03]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#d4af37] block flex items-center gap-1">
              <Scale className="w-3.5 h-3.5" />
              Saldo Akhir Berjalan
            </span>
            <div className="text-xl font-bold font-mono text-white">
              {formatRupiah(currentBalance)}
            </div>
            <p className="text-[11px] text-neutral-400">
              {rowsWithBalance.length} transaksi tercatat
            </p>
          </div>
        </div>
      )}

      {/* 4. Tabel Mutasi Buku Besar */}
      <div className="liquid-glass-table rounded-3xl overflow-hidden text-neutral-200">
        <div className="p-5 sm:p-6 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-[#d4af37]" />
              Kartu Mutasi: {selectedAkun?.nama || 'Akun'}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Kronologi transaksi berpasangan dan kalkulasi saldo berjalan (<em>running balance</em>).
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.10] text-neutral-300 font-medium">
            {rowsWithBalance.length} Entri Mutasi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-neutral-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4 sm:px-6">Tanggal</th>
                <th className="py-3.5 px-4">No. Jurnal</th>
                <th className="py-3.5 px-4 min-w-[220px]">Keterangan</th>
                <th className="py-3.5 px-4 text-right">Debit (Rp)</th>
                <th className="py-3.5 px-4 text-right">Kredit (Rp)</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Saldo Berjalan (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {rowsWithBalance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <BookMarked className="w-10 h-10 mx-auto text-neutral-600 mb-3 stroke-[1.5]" />
                    <p className="text-sm font-medium text-neutral-300">
                      Belum ada transaksi mutasi untuk akun ini
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Transaksi yang telah diposting ke jurnal umum akan otomatis terangkum di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                rowsWithBalance.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.03] transition-colors">
                    {/* Tanggal */}
                    <td className="py-3.5 px-4 sm:px-6 text-neutral-300 whitespace-nowrap">
                      {formatTanggal(r.tanggal)}
                    </td>

                    {/* No. Jurnal */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Link
                        href={`/jurnal/${r.jurnalId}`}
                        className="inline-flex items-center gap-1 font-mono font-bold text-white hover:text-[#d4af37] transition-colors"
                      >
                        <span>{r.nomorJurnal}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    </td>

                    {/* Keterangan */}
                    <td className="py-3.5 px-4 text-white">
                      {r.keterangan}
                    </td>

                    {/* Debit */}
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-400 whitespace-nowrap">
                      {r.debit > 0 ? formatRupiah(r.debit) : '-'}
                    </td>

                    {/* Kredit */}
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-cyan-400 whitespace-nowrap">
                      {r.kredit > 0 ? formatRupiah(r.kredit) : '-'}
                    </td>

                    {/* Saldo Berjalan */}
                    <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-bold text-white whitespace-nowrap">
                      {formatRupiah(r.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rowsWithBalance.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-white/[0.12] bg-white/[0.03] font-bold text-xs sm:text-sm">
                  <td colSpan={3} className="py-4 px-4 sm:px-6 text-right text-white uppercase tracking-wider">
                    Total Mutasi & Saldo Akhir
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-emerald-400">
                    {formatRupiah(totalDebit)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-cyan-400">
                    {formatRupiah(totalKredit)}
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-right font-mono text-[#d4af37]">
                    {formatRupiah(currentBalance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
