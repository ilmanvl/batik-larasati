import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { PeranType, StatusPengajuan } from '@/types/database';
import { ActionApprovalPanel } from './ActionApprovalPanel';
import {
  ArrowLeft,
  FileText,
  ExternalLink,
} from 'lucide-react';

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatusBadge({ status }: { status: StatusPengajuan }) {
  const config: Record<StatusPengajuan, { label: string; class: string }> = {
    draf: { label: 'Draf', class: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
    diajukan: { label: 'Diajukan', class: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    perlu_revisi: { label: 'Perlu Revisi', class: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    menunggu_direktur: { label: 'Menunggu Direktur', class: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    disetujui: { label: 'Disetujui', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    dibayar: { label: 'Dibayar', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    ditolak: { label: 'Ditolak', class: 'bg-rose-600/20 text-rose-300 border-rose-600/30' },
    dibatalkan: { label: 'Dibatalkan', class: 'bg-neutral-800/80 text-neutral-400 border-neutral-700' },
  };
  const b = config[status] || { label: status, class: 'bg-neutral-800 text-neutral-300 border-neutral-700' };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${b.class}`}>
      {b.label}
    </span>
  );
}

export default async function DetailPengajuanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pengajuanId = parseInt(id, 10);
  if (isNaN(pengajuanId)) notFound();

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

  // Query detail pengajuan dengan relasi lengkap
  const { data: pengajuan, error } = await supabase
    .from('pengajuan')
    .select(`
      *,
      pengaju:profiles!pengajuan_pengaju_id_fkey(nama_lengkap, email, jabatan),
      akun_beban:akun!pengajuan_akun_beban_id_fkey(kode, nama),
      akun_kas:akun!pengajuan_akun_kas_id_fkey(kode, nama),
      verifikator:profiles!pengajuan_diverifikasi_oleh_fkey(nama_lengkap),
      persetuju:profiles!pengajuan_disetujui_oleh_fkey(nama_lengkap),
      pembayar:profiles!pengajuan_dibayar_oleh_fkey(nama_lengkap)
    `)
    .eq('id', pengajuanId)
    .single();

  if (error || !pengajuan) notFound();

  // Ambil daftar akun kas (jika berhak mencairkan kas)
  let daftarAkunKas: any[] = [];
  if (role === 'akuntan' && pengajuan.status === 'disetujui') {
    const { data: kasList } = await supabase
      .from('akun')
      .select('id, kode, nama')
      .eq('tipe', 'aset')
      .eq('aktif', true)
      .ilike('kode', '11%')
      .order('kode', { ascending: true });
    daftarAkunKas = kasList || [];
  }

  const isOwner = pengajuan.pengaju_id === user.id;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Header Banner Liquid Glass */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl liquid-glass-header text-white">
        <div className="relative z-10">
          <Link
            href="/pengajuan"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d4af37] hover:text-[#f0cb5a] mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar Pengajuan</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
              {pengajuan.nomor || `#${pengajuan.id}`}
            </h1>
            <StatusBadge status={pengajuan.status} />
          </div>
          <p className="text-xs text-neutral-300 mt-1">
            Jenis: <strong className="capitalize text-white">{pengajuan.jenis}</strong> · Tanggal Transaksi: {pengajuan.tanggal_transaksi}
          </p>
        </div>
      </div>

      {/* 2. Panel Aksi Dinamis (Approval / Verifikasi / Pencairan) */}
      <ActionApprovalPanel
        pengajuan={{
          id: pengajuan.id,
          nomor: pengajuan.nomor,
          jumlah: pengajuan.jumlah,
          status: pengajuan.status,
          catatan_peninjau: pengajuan.catatan_peninjau,
        }}
        currentRole={role}
        isOwner={isOwner}
        daftarAkunKas={daftarAkunKas}
      />

      {/* 3. Kartu Rincian Finansial & Pemohon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Nominal Besar */}
        <div className="p-6 rounded-3xl liquid-glass space-y-2 md:col-span-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Total Nominal
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#d4af37]">
            {formatRupiah(pengajuan.jumlah)}
          </div>
          <p className="text-[11px] text-neutral-400">
            {pengajuan.jumlah > 1000000
              ? 'Memerlukan persetujuan Direktur (> Rp 1 Jt)'
              : 'Dapat disetujui langsung oleh Akuntan'}
          </p>
        </div>

        {/* Pemohon & Beban */}
        <div className="p-6 rounded-3xl liquid-glass space-y-3 md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] text-neutral-400 uppercase font-semibold">Diajukan Oleh</span>
              <p className="text-sm font-bold text-white mt-0.5">{pengajuan.pengaju?.nama_lengkap || '-'}</p>
              <p className="text-[11px] text-neutral-400">{pengajuan.pengaju?.jabatan || pengajuan.pengaju?.email || '-'}</p>
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 uppercase font-semibold">Pos Akun Beban</span>
              <p className="text-sm font-bold text-white mt-0.5">{pengajuan.akun_beban?.nama || '-'}</p>
              <p className="text-[11px] font-mono text-[#d4af37]">{pengajuan.akun_beban?.kode || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Keperluan & Lampiran Bukti Nota */}
      <div className="p-6 sm:p-7 rounded-3xl liquid-glass-table space-y-5 text-white">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Rincian Keperluan Pengeluaran
          </h3>
          <p className="text-sm text-neutral-200 leading-relaxed bg-white/[0.04] p-4 rounded-2xl border border-white/[0.08]">
            {pengajuan.keterangan}
          </p>
        </div>

        {/* Bukti Nota */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Berkas Lampiran Nota
          </h3>
          {pengajuan.bukti_path ? (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/[0.10]">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#d4af37]" />
                <div>
                  <p className="text-xs font-semibold text-white">{pengajuan.bukti_path.split('/').pop()}</p>
                  <p className="text-[10px] text-neutral-400">Bukti struk / nota sah pengeluaran</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30">
                <span>Nota Terlampir</span>
              </span>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 italic">Tidak ada berkas bukti fisik terlampir.</p>
          )}
        </div>

        {/* Catatan Peninjau (Jika Pernah Direvisi atau Ditolak) */}
        {pengajuan.catatan_peninjau && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
            <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] block mb-1">
              Catatan Peninjau / Alasan:
            </span>
            <p className="text-neutral-200">{pengajuan.catatan_peninjau}</p>
          </div>
        )}
      </div>

      {/* 5. Jejak Audit & Riwayat Verifikasi */}
      <div className="p-6 rounded-3xl liquid-glass text-xs text-neutral-400 space-y-3">
        <h3 className="font-bold uppercase tracking-wider text-neutral-300 text-[11px]">
          Jejak Dokumen & Verifikasi
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1 border-t border-white/[0.08]">
          <div>
            <span className="text-[10px] uppercase block text-neutral-500">Dibuat / Diajukan</span>
            <span className="text-white font-medium">{pengajuan.diajukan_pada ? new Date(pengajuan.diajukan_pada).toLocaleDateString('id-ID') : '-'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase block text-neutral-500">Diverifikasi Akuntan</span>
            <span className="text-white font-medium">{pengajuan.verifikator?.nama_lengkap || '-'}</span>
            <span className="block text-[10px] text-neutral-500">
              {pengajuan.diverifikasi_pada ? new Date(pengajuan.diverifikasi_pada).toLocaleDateString('id-ID') : ''}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase block text-neutral-500">Disetujui Direktur</span>
            <span className="text-white font-medium">{pengajuan.persetuju?.nama_lengkap || '-'}</span>
            <span className="block text-[10px] text-neutral-500">
              {pengajuan.disetujui_pada ? new Date(pengajuan.disetujui_pada).toLocaleDateString('id-ID') : ''}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase block text-neutral-500">Pencairan Kas (Bayar)</span>
            <span className="text-white font-medium">{pengajuan.pembayar?.nama_lengkap || '-'}</span>
            <span className="block text-[10px] text-neutral-500">
              {pengajuan.dibayar_pada ? `${pengajuan.akun_kas?.nama || ''} (${new Date(pengajuan.dibayar_pada).toLocaleDateString('id-ID')})` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
