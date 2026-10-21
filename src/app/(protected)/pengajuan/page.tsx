import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { PeranType, StatusPengajuan } from '@/types/database';
import {
  Receipt,
  PlusCircle,
  Clock,
  CheckCircle2,
  Eye,
} from 'lucide-react';

// Formatter Rupiah Indonesia
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Badge status pengajuan dengan warna presisi
function StatusBadge({ status }: { status: StatusPengajuan }) {
  const config: Record<StatusPengajuan, { label: string; class: string }> = {
    draf: {
      label: 'Draf',
      class: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    },
    diajukan: {
      label: 'Diajukan',
      class: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    perlu_revisi: {
      label: 'Perlu Revisi',
      class: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    },
    menunggu_direktur: {
      label: 'Menunggu Direktur',
      class: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    },
    disetujui: {
      label: 'Disetujui',
      class: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
    dibayar: {
      label: 'Dibayar',
      class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    ditolak: {
      label: 'Ditolak',
      class: 'bg-rose-600/20 text-rose-300 border-rose-600/30',
    },
    dibatalkan: {
      label: 'Dibatalkan',
      class: 'bg-neutral-800/80 text-neutral-400 border-neutral-700',
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

export default async function PengajuanPage() {
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

  // Query pengajuan dengan join data pengaju & akun beban
  const { data: pengajuanList } = await supabase
    .from('pengajuan')
    .select(`
      id,
      nomor,
      jenis,
      tanggal_transaksi,
      jumlah,
      keterangan,
      status,
      dibuat_pada,
      pengaju:profiles!pengajuan_pengaju_id_fkey(nama_lengkap, email),
      akun_beban:akun!pengajuan_akun_beban_id_fkey(kode, nama)
    `)
    .order('dibuat_pada', { ascending: false });

  const items = pengajuanList || [];

  // Hitung metrik ringkasan
  const pendingCount = items.filter((p) =>
    role === 'akuntan'
      ? p.status === 'diajukan'
      : role === 'direktur'
      ? p.status === 'menunggu_direktur'
      : ['diajukan', 'menunggu_direktur'].includes(p.status as StatusPengajuan)
  ).length;

  const totalNominal = items.reduce((acc, curr) => acc + Number(curr.jumlah || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Apple iOS Liquid Glass */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl liquid-glass-header text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-wider text-[#d4af37] font-bold">
              Manajemen Pengeluaran
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-xs text-neutral-400">CV Batik Larasati</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Pengajuan Biaya & Reimbursement
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            {isFinance
              ? 'Verifikasi nota pengeluaran operasional, reimbursement staf, dan proses persetujuan dana kas.'
              : 'Ajukan penggantian biaya operasional, pembelian bahan batik, atau nota kas kecil Anda.'}
          </p>
        </div>

        {/* Tombol Utama Buat Pengajuan Baru (Hanya untuk Staf & Akuntan, patuh pada BR-09) */}
        {role !== 'direktur' && (
          <div className="self-start sm:self-auto relative z-10">
            <Link
              href="/pengajuan/baru"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#aa8022] text-neutral-950 hover:brightness-110 shadow-lg shadow-[#d4af37]/20 transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Pengajuan Baru</span>
            </Link>
          </div>
        )}
      </div>

      {/* 2. Kartu Ringkasan Cepat */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl liquid-glass liquid-glass-hover space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isFinance ? 'Total Antrean' : 'Sedang Diproses'}
            </span>
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-orange-400">
            {pendingCount} Dokumen
          </div>
          <p className="text-[11px] text-neutral-400">
            {isFinance ? 'Membutuhkan tindakan Anda' : 'Menunggu review finance'}
          </p>
        </div>

        <div className="p-5 rounded-3xl liquid-glass liquid-glass-hover space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Riwayat
            </span>
            <div className="p-2 rounded-xl bg-white/[0.08] text-white border border-white/[0.12]">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {items.length} Pengajuan
          </div>
          <p className="text-[11px] text-neutral-400">Tercatat dalam sistem</p>
        </div>

        <div className="p-5 rounded-3xl liquid-glass liquid-glass-hover space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Akumulasi Nominal
            </span>
            <div className="p-2 rounded-xl bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#d4af37]">
            {formatRupiah(totalNominal)}
          </div>
          <p className="text-[11px] text-neutral-400">Total nilai keseluruhan</p>
        </div>
      </div>

      {/* 3. Tabel Daftar Pengajuan Apple iOS Liquid Glass */}
      <div className="p-6 sm:p-7 rounded-3xl liquid-glass-table space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Daftar Pengajuan Biaya</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isFinance
                ? 'Semua pengajuan nota dan biaya operasional dari seluruh staf'
                : 'Daftar pengajuan operasional dan reimbursement yang Anda buat'}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-xs flex flex-col items-center gap-3">
            <Receipt className="w-10 h-10 text-neutral-500" />
            <span>Belum ada data pengajuan biaya yang tercatat.</span>
            <Link
              href="/pengajuan/baru"
              className="mt-2 text-xs font-bold text-[#d4af37] hover:underline"
            >
              + Buat pengajuan pertama Anda
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase tracking-wider text-neutral-400 bg-white/[0.04] border-b border-white/[0.10]">
                <tr>
                  <th className="py-3 px-3.5 font-semibold">Nomor</th>
                  <th className="py-3 px-3.5 font-semibold">Tanggal</th>
                  {isFinance && <th className="py-3 px-3.5 font-semibold">Pengaju</th>}
                  <th className="py-3 px-3.5 font-semibold">Jenis & Akun Beban</th>
                  <th className="py-3 px-3.5 font-semibold">Keperluan</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Jumlah</th>
                  <th className="py-3 px-3.5 font-semibold text-center">Status</th>
                  <th className="py-3 px-3.5 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {items.map((pg: any) => (
                  <tr key={pg.id} className="hover:bg-white/[0.05] transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-[#d4af37]">
                      {pg.nomor || `#${pg.id}`}
                    </td>
                    <td className="py-3 px-3.5 text-neutral-300">{pg.tanggal_transaksi}</td>
                    {isFinance && (
                      <td className="py-3 px-3.5 font-medium text-white">
                        {pg.pengaju?.nama_lengkap || '-'}
                      </td>
                    )}
                    <td className="py-3 px-3.5 text-neutral-300">
                      <span className="capitalize">{pg.jenis}</span>
                      <span className="text-neutral-500 text-[10px] block">
                        {pg.akun_beban?.kode} - {pg.akun_beban?.nama}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-neutral-300 max-w-xs truncate">
                      {pg.keterangan}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-white text-right">
                      {formatRupiah(pg.jumlah)}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <StatusBadge status={pg.status} />
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <Link
                        href={`/pengajuan/${pg.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] text-neutral-200 hover:text-white transition-all border border-white/[0.12]"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>Detail</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
