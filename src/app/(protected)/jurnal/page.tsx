import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { PeranType, StatusJurnal, SumberJurnal } from '@/types/database';
import {
  BookOpen,
  PlusCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  AlertCircle,
  Tag,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

// Formatter Rupiah Indonesia
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format Tanggal Lokal Indonesia (contoh: 21 Okt 2026)
function formatTanggal(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

// Badge Status Jurnal
function StatusBadge({ status }: { status: StatusJurnal }) {
  const config: Record<StatusJurnal, { label: string; class: string }> = {
    draf: {
      label: 'Draf',
      class: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    },
    diposting: {
      label: 'Diposting',
      class: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    },
    dibalik: {
      label: 'Dibalik',
      class: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    },
  };

  const badge = config[status] || {
    label: status,
    class: 'bg-white/[0.06] text-neutral-300 border-white/[0.12]',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.class}`}
    >
      {badge.label}
    </span>
  );
}

// Badge Sumber Jurnal (manual, pengajuan, saldo_awal, dsb.)
function SumberBadge({
  sumber,
  pengajuanNomor,
}: {
  sumber: SumberJurnal;
  pengajuanNomor?: string | null;
}) {
  const config: Record<SumberJurnal, { label: string; class: string }> = {
    manual: {
      label: 'Manual',
      class: 'bg-white/[0.06] text-neutral-300 border-white/[0.12]',
    },
    pengajuan: {
      label: pengajuanNomor ? `Pengajuan (${pengajuanNomor})` : 'Pengajuan',
      class: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    },
    saldo_awal: {
      label: 'Saldo Awal',
      class: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    },
    pembalik: {
      label: 'Pembalik',
      class: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    },
    impor_bank: {
      label: 'Impor Bank',
      class: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    },
  };

  const b = config[sumber] || { label: sumber, class: 'bg-white/[0.06] text-neutral-300 border-white/[0.12]' };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${b.class}`}
    >
      <Tag className="w-2.5 h-2.5 opacity-60" />
      <span>{b.label}</span>
    </span>
  );
}

export default async function JurnalPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page, q: rawQ } = await searchParams;
  const q = rawQ?.trim() || '';
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
  const isFinance = ['akuntan', 'direktur'].includes(role);

  // 1. Konfigurasi Server-Side Pagination
  const ITEMS_PER_PAGE = 10;
  const currentPage = Math.max(1, parseInt(page || '1', 10) || 1);
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // 2. Query Metrik Global (Menghitung KESELURUHAN data tanpa terpengaruh filter paginasi)
  const { data: globalList } = await supabase
    .from('jurnal')
    .select('status, jurnal_baris(debit)');

  const globalRaw = globalList || [];
  const globalTotalCount = globalRaw.length;
  const globalPostedCount = globalRaw.filter((j) => j.status === 'diposting').length;
  const globalDraftCount = globalRaw.filter((j) => j.status === 'draf').length;
  const globalNominalDebit = globalRaw
    .filter((j) => j.status === 'diposting')
    .reduce((acc, curr) => {
      const rowDebit = (curr.jurnal_baris as any[])?.reduce(
        (bAcc, b) => bAcc + (Number(b.debit) || 0),
        0
      ) || 0;
      return acc + rowDebit;
    }, 0);

  // 3. Query Data Tabel Jurnal (dengan filter Search & Pagination)
  let tableQuery = supabase
    .from('jurnal')
    .select(
      `
      id,
      nomor,
      tanggal,
      keterangan,
      sumber,
      status,
      pengajuan_id,
      dibuat_pada,
      pengajuan:pengajuan_id(nomor),
      jurnal_baris(debit, kredit),
      pembuat:profiles!jurnal_dibuat_oleh_fkey(nama_lengkap)
    `,
      { count: 'exact' }
    );

  if (q) {
    tableQuery = tableQuery.or(`nomor.ilike.%${q}%,keterangan.ilike.%${q}%`);
  }

  const { data: paginatedJurnalList, count: filteredCount } = await tableQuery
    .order('tanggal', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);

  const rawItems = (paginatedJurnalList as any[]) || [];
  const totalFiltered = filteredCount || 0;
  const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE);

  // Hitung agregasi debit dan kredit per baris jurnal
  const items = rawItems.map((j) => {
    const totalDebit =
      j.jurnal_baris?.reduce((acc: number, row: any) => acc + (Number(row.debit) || 0), 0) ?? 0;
    const totalKredit =
      j.jurnal_baris?.reduce((acc: number, row: any) => acc + (Number(row.kredit) || 0), 0) ?? 0;
    const isBalanced = totalDebit === totalKredit;

    const pengajuanObj = Array.isArray(j.pengajuan) ? j.pengajuan[0] : j.pengajuan;
    const pembuatObj = Array.isArray(j.pembuat) ? j.pembuat[0] : j.pembuat;

    return {
      ...j,
      totalDebit,
      totalKredit,
      isBalanced,
      barisCount: j.jurnal_baris?.length || 0,
      pengajuanNomor: pengajuanObj?.nomor ?? null,
      pembuatNama: pembuatObj?.nama_lengkap ?? null,
    };
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Liquid Glass */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl liquid-glass-header text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-wider text-[#d4af37] font-bold">
              Buku Transaksi Finansial
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-xs text-neutral-400">CV Batik Larasati</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Jurnal Umum (General Journal)
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            Catatan kronologis seluruh pembukuan akuntansi berpasangan (<em>double-entry</em>), pencatatan debit-kredit terverifikasi, dan integrasi pengeluaran kas.
          </p>
        </div>

        {/* Tombol Utama: Buat Jurnal Manual (Hanya untuk Finance / Akuntan & Direktur) */}
        {isFinance && (
          <div className="self-start sm:self-auto relative z-10">
            <Link
              href="/jurnal/baru"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 transition-colors shadow-sm active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Jurnal Manual</span>
            </Link>
          </div>
        )}
      </div>

      {/* 2. Kartu Ringkasan Cepat (Metrik Global) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="p-6 rounded-3xl liquid-glass liquid-glass-hover space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Entri Jurnal
            </span>
            <div className="p-2.5 rounded-2xl bg-white/[0.08] text-white border border-white/[0.12]">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {globalTotalCount} Transaksi
          </div>
          <p className="text-[11px] text-neutral-400">
            {globalPostedCount} telah diposting ke Buku Besar
          </p>
        </div>

        <div className="p-6 rounded-3xl liquid-glass liquid-glass-hover space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Menunggu Posting
            </span>
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-400 tracking-tight">
            {globalDraftCount} Draf Jurnal
          </div>
          <p className="text-[11px] text-neutral-400">
            Belum memengaruhi saldo buku besar
          </p>
        </div>

        <div className="p-6 rounded-3xl liquid-glass liquid-glass-hover space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Volume Mutasi Diposting
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tracking-tight">
            {formatRupiah(globalNominalDebit)}
          </div>
          <p className="text-[11px] text-neutral-400">
            Total perputaran debit & kredit seimbang
          </p>
        </div>
      </div>

      {/* 3. Tabel Jurnal Umum Liquid Glass */}
      <div className="p-6 sm:p-7 rounded-3xl liquid-glass-table space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-[#d4af37]" />
              <span>Daftar Jurnal Umum</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Urutan transaksi kronologis dengan rincian debit-kredit berpasangan
            </p>
          </div>

          {/* Form Search Bar Liquid Glass */}
          <div className="flex items-center gap-3 self-stretch md:self-auto">
            <form method="GET" action="/jurnal" className="flex items-center gap-2 flex-1 md:flex-initial">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Cari nomor / keterangan..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 transition-all backdrop-blur-md"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 transition-colors shadow-sm active:scale-95 shrink-0"
              >
                Cari
              </button>
              {q && (
                <Link
                  href="/jurnal"
                  className="px-2.5 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.10] transition-colors shrink-0"
                  title="Reset Filter Pencarian"
                >
                  Reset
                </Link>
              )}
            </form>
          </div>
        </div>

        {/* Tabel Jurnal Umum */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/[0.12] bg-white/[0.05] text-[11px] uppercase tracking-wider text-neutral-300">
                <th className="py-4 px-4 sm:px-6 font-semibold">Tanggal</th>
                <th className="py-4 px-4 font-semibold">No. Jurnal</th>
                <th className="py-4 px-4 font-semibold">Referensi</th>
                <th className="py-4 px-4 font-semibold">Keterangan</th>
                <th className="py-4 px-4 text-right font-semibold">Total Debit</th>
                <th className="py-4 px-4 text-right font-semibold">Total Kredit</th>
                <th className="py-4 px-4 text-center font-semibold">Status</th>
                <th className="py-4 px-4 sm:px-6 text-center font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-neutral-400">
                    <BookOpen className="w-10 h-10 mx-auto text-neutral-600 mb-3 stroke-[1.5]" />
                    <p className="text-sm font-medium text-neutral-300">
                      {q
                        ? `Tidak ada transaksi jurnal yang cocok dengan pencarian "${q}".`
                        : 'Belum ada data jurnal umum.'}
                    </p>
                    {q && (
                      <Link
                        href="/jurnal"
                        className="inline-block mt-2 text-xs text-[#d4af37] hover:underline"
                      >
                        Reset pencarian
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((j) => (
                  <tr
                    key={j.id}
                    className="hover:bg-white/[0.04] transition-colors group"
                  >
                    {/* Tanggal */}
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-neutral-300 whitespace-nowrap">
                      {formatTanggal(j.tanggal)}
                    </td>

                    {/* No. Jurnal */}
                    <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                      {j.nomor || `JU-${j.id.toString().padStart(4, '0')}`}
                    </td>

                    {/* Referensi / Sumber */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <SumberBadge
                        sumber={j.sumber as SumberJurnal}
                        pengajuanNomor={j.pengajuanNomor}
                      />
                    </td>

                    {/* Keterangan */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-white truncate group-hover:text-[#d4af37] transition-colors">
                        {j.keterangan}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {j.barisCount} baris akun · Dibuat oleh {j.pembuatNama || 'Sistem'}
                      </div>
                    </td>

                    {/* Total Debit */}
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-400 whitespace-nowrap">
                      {formatRupiah(j.totalDebit)}
                    </td>

                    {/* Total Kredit */}
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-cyan-400 whitespace-nowrap">
                      {formatRupiah(j.totalKredit)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center gap-1">
                        <StatusBadge status={j.status as StatusJurnal} />
                        {!j.isBalanced && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-400 font-medium">
                            <AlertCircle className="w-3 h-3" />
                            Tidak Seimbang
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 sm:px-6 text-center whitespace-nowrap">
                      <Link
                        href={`/jurnal/${j.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 hover:text-white border border-white/[0.10] hover:border-[#d4af37]/40 transition-all shadow-sm active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>Detail</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Kontrol Navigasi Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/[0.08] text-xs">
            <span className="text-neutral-400 font-mono">
              Menampilkan <strong className="text-white">{from + 1}</strong> –{' '}
              <strong className="text-white">{Math.min(to + 1, totalFiltered)}</strong> dari{' '}
              <strong className="text-white">{totalFiltered}</strong> transaksi
              {q && <span> (difilter dari {globalTotalCount})</span>}
            </span>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {/* Tombol Sebelumnya */}
              {currentPage > 1 ? (
                <Link
                  href={`/jurnal?page=${currentPage - 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 hover:text-white border border-white/[0.10] transition-all shadow-sm active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4 text-[#d4af37]" />
                  <span>Sebelumnya</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.02] text-neutral-600 border border-white/[0.04] cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </span>
              )}

              <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-neutral-300 font-mono text-xs">
                {currentPage} / {totalPages}
              </span>

              {/* Tombol Selanjutnya */}
              {currentPage < totalPages ? (
                <Link
                  href={`/jurnal?page=${currentPage + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 hover:text-white border border-white/[0.10] transition-all shadow-sm active:scale-95"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-4 h-4 text-[#d4af37]" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.02] text-neutral-600 border border-white/[0.04] cursor-not-allowed">
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
