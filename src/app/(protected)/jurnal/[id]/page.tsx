import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { PeranType, StatusJurnal, SumberJurnal } from '@/types/database';
import { PostingButton } from './PostingButton';
import {
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  UserCheck,
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

// Format Tanggal Lokal Indonesia
function formatTanggal(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

function formatWaktu(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badge.class}`}
    >
      {badge.label}
    </span>
  );
}

// Badge Sumber Jurnal
function SumberBadge({
  sumber,
  pengajuanId,
  pengajuanNomor,
}: {
  sumber: SumberJurnal;
  pengajuanId?: number | null;
  pengajuanNomor?: string | null;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-white/[0.05] border border-white/[0.10] text-neutral-300">
      <Tag className="w-3 h-3 text-[#d4af37]" />
      <span>Sumber: <strong className="capitalize text-white">{sumber.replace('_', ' ')}</strong></span>
      {pengajuanId && pengajuanNomor && (
        <Link
          href={`/pengajuan/${pengajuanId}`}
          className="ml-1 inline-flex items-center gap-1 text-[#d4af37] hover:underline"
        >
          <span>({pengajuanNomor})</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      )}
    </span>
  );
}

export default async function DetailJurnalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jurnalId = parseInt(id, 10);
  if (isNaN(jurnalId)) notFound();

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

  // Query detail jurnal beserta relasi lengkap baris akun, periode, dan profil
  const { data: jurnal, error } = await supabase
    .from('jurnal')
    .select(`
      *,
      periode:periode!jurnal_periode_id_fkey(tahun, bulan, status),
      pengajuan:pengajuan!jurnal_pengajuan_id_fkey(id, nomor, keterangan, jumlah),
      pembuat:profiles!jurnal_dibuat_oleh_fkey(nama_lengkap, peran, jabatan),
      pemosting:profiles!jurnal_diposting_oleh_fkey(nama_lengkap, peran, jabatan),
      jurnal_baris(
        id,
        urutan,
        akun_id,
        debit,
        kredit,
        keterangan,
        akun:akun!jurnal_baris_akun_id_fkey(id, kode, nama, tipe, saldo_normal)
      )
    `)
    .eq('id', jurnalId)
    .single();

  if (error || !jurnal) notFound();

  const rawJurnal = jurnal as any;
  const periodeObj = Array.isArray(rawJurnal.periode) ? rawJurnal.periode[0] : rawJurnal.periode;
  const pengajuanObj = Array.isArray(rawJurnal.pengajuan) ? rawJurnal.pengajuan[0] : rawJurnal.pengajuan;
  const pembuatObj = Array.isArray(rawJurnal.pembuat) ? rawJurnal.pembuat[0] : rawJurnal.pembuat;
  const pemostingObj = Array.isArray(rawJurnal.pemosting) ? rawJurnal.pemosting[0] : rawJurnal.pemosting;

  // Sorting baris jurnal berdasarkan urutan
  const baris = (rawJurnal.jurnal_baris || []).sort((a: any, b: any) => a.urutan - b.urutan);

  // Kalkulasi total debit & kredit
  const totalDebit = baris.reduce((sum: number, b: any) => sum + (Number(b.debit) || 0), 0);
  const totalKredit = baris.reduce((sum: number, b: any) => sum + (Number(b.kredit) || 0), 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalKredit;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Banner Liquid Glass */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl liquid-glass-header text-white">
        <div className="relative z-10">
          <Link
            href="/jurnal"
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Jurnal</span>
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-white">
              {rawJurnal.nomor || `JU-${rawJurnal.id.toString().padStart(4, '0')}`}
            </h1>
            <StatusBadge status={rawJurnal.status as StatusJurnal} />
          </div>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            Tanggal Transaksi: <strong>{formatTanggal(rawJurnal.tanggal)}</strong> · Periode{' '}
            <strong>{periodeObj?.bulan}/{periodeObj?.tahun}</strong> ({periodeObj?.status?.toUpperCase()})
          </p>
        </div>

        <div className="self-start sm:self-auto relative z-10">
          <SumberBadge
            sumber={rawJurnal.sumber as SumberJurnal}
            pengajuanId={pengajuanObj?.id}
            pengajuanNomor={pengajuanObj?.nomor}
          />
        </div>
      </div>

      {/* 2. Panel Aksi Posting Jurnal (Hanya jika Draf) */}
      {rawJurnal.status === 'draf' && (
        <div className="p-6 rounded-3xl liquid-glass border border-amber-500/30 bg-amber-500/[0.03] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
                <Clock className="w-4 h-4" />
                <span>Dokumen Masih Berstatus Draf</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-2xl">
                Jurnal ini belum diposting ke Buku Besar dan belum memengaruhi saldo akun. Pastikan posisi debit dan kredit sudah seimbang sebelum memposting.
              </p>
            </div>

            {isFinance && (
              <PostingButton
                jurnalId={rawJurnal.id}
                nomorJurnal={rawJurnal.nomor || `JU-${rawJurnal.id}`}
                isBalanced={isBalanced}
                isPeriodeOpen={periodeObj?.status === 'terbuka'}
              />
            )}
          </div>
        </div>
      )}

      {/* 3. Kartu Ringkasan Keseimbangan & Keterangan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Keterangan */}
        <div className="p-5 rounded-3xl liquid-glass space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block">
            Deskripsi / Keterangan Transaksi
          </span>
          <p className="text-sm font-medium text-white leading-relaxed">
            {rawJurnal.keterangan}
          </p>
        </div>

        {/* Status Balance */}
        <div className="p-5 rounded-3xl liquid-glass space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block">
            Keseimbangan (Balance)
          </span>
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">Seimbang (Balance)</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <span className="text-sm font-bold text-rose-400">Tidak Seimbang</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-neutral-400">
            Total Debit dan Kredit: {formatRupiah(totalDebit)}
          </p>
        </div>
      </div>

      {/* 4. Tabel Baris Akun Debit & Kredit */}
      <div className="liquid-glass-table rounded-3xl overflow-hidden text-neutral-200">
        <div className="p-5 sm:p-6 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#d4af37]" />
              Rincian Entri Akun Berpasangan
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Daftar akun yang terpengaruh beserta posisi mutasi Debit dan Kredit.
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.10] text-neutral-300 font-medium">
            {baris.length} Baris Akun
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-neutral-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Kode & Nama Akun</th>
                <th className="py-3.5 px-4">Tipe Akun</th>
                <th className="py-3.5 px-4">Keterangan Baris</th>
                <th className="py-3.5 px-4 text-right">Debit (Rp)</th>
                <th className="py-3.5 px-4 text-right">Kredit (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {baris.map((b: any, idx: number) => {
                const akun = Array.isArray(b.akun) ? b.akun[0] : b.akun;
                const isDebit = Number(b.debit) > 0;

                return (
                  <tr key={b.id || idx} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-neutral-500 text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className={`font-medium ${isDebit ? 'text-white' : 'text-neutral-300 pl-4'}`}>
                        <span className="font-mono text-[#d4af37] mr-2">[{akun?.kode}]</span>
                        <span>{akun?.nama || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-neutral-400 font-medium">
                        {akun?.tipe || '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400 text-xs max-w-xs truncate">
                      {b.keterangan || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-400">
                      {Number(b.debit) > 0 ? formatRupiah(Number(b.debit)) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-cyan-400">
                      {Number(b.kredit) > 0 ? formatRupiah(Number(b.kredit)) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/[0.12] bg-white/[0.03] font-bold text-xs sm:text-sm">
                <td colSpan={4} className="py-4 px-4 text-right text-white uppercase tracking-wider">
                  Total Mutasi
                </td>
                <td className="py-4 px-4 text-right font-mono text-emerald-400">
                  {formatRupiah(totalDebit)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-cyan-400">
                  {formatRupiah(totalKredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Jejak Rekam / Audit Trail */}
      <div className="p-6 rounded-3xl liquid-glass space-y-4">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-neutral-400 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#d4af37]" />
          Rekam Jejak Dokumen Jurnal
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <span className="text-neutral-400 block text-[11px]">Dibuat Oleh:</span>
            <span className="font-semibold text-white block">
              {pembuatObj?.nama_lengkap || 'Sistem / Tidak Tercatat'}
            </span>
            <span className="text-[11px] text-neutral-500 block">
              Waktu: {formatWaktu(rawJurnal.dibuat_pada)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <span className="text-neutral-400 block text-[11px]">Status Posting:</span>
            {rawJurnal.status === 'diposting' ? (
              <>
                <span className="font-semibold text-emerald-400 block">
                  Diposting oleh {pemostingObj?.nama_lengkap || 'Akuntan'}
                </span>
                <span className="text-[11px] text-neutral-500 block">
                  Waktu: {rawJurnal.diposting_pada ? formatWaktu(rawJurnal.diposting_pada) : '-'}
                </span>
              </>
            ) : (
              <span className="font-semibold text-amber-400 block">
                Belum Diposting (Draf)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
