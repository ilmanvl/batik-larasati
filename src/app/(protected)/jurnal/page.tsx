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
      class: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    diposting: {
      label: 'Diposting',
      class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    dibalik: {
      label: 'Dibalik',
      class: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    },
  };

  const badge = config[status] || {
    label: status,
    class: 'bg-neutral-800 text-neutral-300 border-neutral-700',
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
      class: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    },
    pengajuan: {
      label: pengajuanNomor ? `Pengajuan (${pengajuanNomor})` : 'Pengajuan',
      class: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    },
    saldo_awal: {
      label: 'Saldo Awal',
      class: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
    },
    pembalik: {
      label: 'Pembalik',
      class: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    },
    impor_bank: {
      label: 'Impor Bank',
      class: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    },
  };

  const b = config[sumber] || { label: sumber, class: 'bg-neutral-800 text-neutral-300 border-neutral-700' };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${b.class}`}
    >
      <Tag className="w-2.5 h-2.5 opacity-60" />
      <span>{b.label}</span>
    </span>
  );
}

export default async function JurnalPage() {
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

  // Query seluruh daftar jurnal umum beserta relasi baris untuk total debit/kredit
  const { data: jurnalList } = await supabase
    .from('jurnal')
    .select(`
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
    `)
    .order('tanggal', { ascending: false })
    .order('id', { ascending: false });

  const rawItems = (jurnalList as any[]) || [];

  // Hitung agregasi debit dan kredit per jurnal
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

  // Metrik ringkasan
  const totalCount = items.length;
  const postedCount = items.filter((j) => j.status === 'diposting').length;
  const draftCount = items.filter((j) => j.status === 'draf').length;
  const totalNominalDebit = items
    .filter((j) => j.status === 'diposting')
    .reduce((acc, curr) => acc + curr.totalDebit, 0);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Apple iOS Liquid Glass */}
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#aa8022] text-neutral-950 hover:brightness-110 shadow-lg shadow-[#d4af37]/20 transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Jurnal Manual</span>
            </Link>
          </div>
        )}
      </div>

      {/* 2. Kartu Ringkasan Cepat */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl liquid-glass liquid-glass-hover space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Entri Jurnal
            </span>
            <div className="p-2 rounded-xl bg-white/[0.08] text-white border border-white/[0.12]">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {totalCount} Transaksi
          </div>
          <p className="text-[11px] text-neutral-400">
            {postedCount} telah diposting ke Buku Besar
          </p>
        </div>

        <div className="p-5 rounded-3xl liquid-glass liquid-glass-hover space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Menunggu Posting
            </span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {draftCount} Draf Jurnal
          </div>
          <p className="text-[11px] text-neutral-400">
            Belum memengaruhi saldo buku besar
          </p>
        </div>

        <div className="p-5 rounded-3xl liquid-glass liquid-glass-hover space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Volume Mutasi Diposting
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {formatRupiah(totalNominalDebit)}
          </div>
          <p className="text-[11px] text-neutral-400">
            Total perputaran debit & kredit seimbang
          </p>
        </div>
      </div>

      {/* 3. Tabel Jurnal Umum Liquid Glass */}
      <div className="liquid-glass-table rounded-3xl overflow-hidden text-neutral-200">
        <div className="p-5 sm:p-6 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#d4af37]" />
              Daftar Jurnal Umum
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Urutan transaksi kronologis dengan rincian debit-kredit berpasangan.
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.10] text-neutral-300 font-medium">
            {items.length} Baris
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-neutral-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4 sm:px-6">Tanggal</th>
                <th className="py-3.5 px-4">No. Jurnal</th>
                <th className="py-3.5 px-4">Referensi</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4 text-right">Total Debit</th>
                <th className="py-3.5 px-4 text-right">Total Kredit</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    <BookOpen className="w-10 h-10 mx-auto text-neutral-600 mb-3 stroke-[1.5]" />
                    <p className="text-sm font-medium text-neutral-300">
                      Belum ada data jurnal umum
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Transaksi baru yang dicatat manual atau otomatis akan muncul di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((j) => (
                  <tr
                    key={j.id}
                    className="hover:bg-white/[0.04] transition-colors group"
                  >
                    {/* Tanggal */}
                    <td className="py-4 px-4 sm:px-6 font-medium text-neutral-300 whitespace-nowrap">
                      {formatTanggal(j.tanggal)}
                    </td>

                    {/* No. Jurnal */}
                    <td className="py-4 px-4 font-mono font-bold text-white whitespace-nowrap">
                      {j.nomor || `JU-${j.id.toString().padStart(4, '0')}`}
                    </td>

                    {/* Referensi / Sumber */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <SumberBadge
                        sumber={j.sumber as SumberJurnal}
                        pengajuanNomor={j.pengajuanNomor}
                      />
                    </td>

                    {/* Keterangan */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="font-medium text-white truncate group-hover:text-amber-200 transition-colors">
                        {j.keterangan}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {j.barisCount} baris akun · Dibuat oleh {j.pembuatNama || 'Sistem'}
                      </div>
                    </td>

                    {/* Total Debit */}
                    <td className="py-4 px-4 text-right font-mono font-medium text-emerald-400 whitespace-nowrap">
                      {formatRupiah(j.totalDebit)}
                    </td>

                    {/* Total Kredit */}
                    <td className="py-4 px-4 text-right font-mono font-medium text-cyan-400 whitespace-nowrap">
                      {formatRupiah(j.totalKredit)}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
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
                    <td className="py-4 px-4 sm:px-6 text-center whitespace-nowrap">
                      <Link
                        href={`/jurnal/${j.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.12] transition-all hover:scale-105 active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
