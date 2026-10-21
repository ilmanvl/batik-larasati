import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { PeranType } from '@/types/database';
import { FormJurnalManual } from './FormJurnalManual';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default async function BuatJurnalBaruPage() {
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

  // Hanya Akuntan dan Direktur yang boleh mencatat jurnal manual
  if (!['akuntan', 'direktur'].includes(role)) {
    redirect('/jurnal');
  }

  // Ambil daftar Bagan Akun (COA) aktif yang diurutkan berdasarkan kode
  const { data: akunList } = await supabase
    .from('akun')
    .select('id, kode, nama, tipe, saldo_normal')
    .eq('aktif', true)
    .order('kode', { ascending: true });

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
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider text-[#d4af37] font-bold">
              Pembukuan Manual
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-xs text-neutral-400">Double-Entry Bookkeeping</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Catat Jurnal Umum Baru
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            Masukkan mutasi transaksi keuangan secara berpasangan. Pastikan posisi Debit dan Kredit seimbang sebelum disimpan ke sistem sebagai draf.
          </p>
        </div>
      </div>

      {/* 2. Banner Informasi Prinsip Akuntansi */}
      <div className="p-4 rounded-2xl liquid-glass text-xs text-neutral-300 flex items-start gap-3 border border-amber-500/20 bg-amber-500/[0.04]">
        <ShieldCheck className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-white">Standar Validasi Pembukuan:</span>
          <p className="text-neutral-400 leading-relaxed">
            Transaksi harus memiliki minimal 2 baris akun. Pada tiap baris hanya boleh diisi salah satu (Debit atau Kredit). Total nilai Debit wajib sama persis dengan total Kredit. Tanggal transaksi harus berada pada periode akuntansi yang berstatus terbuka.
          </p>
        </div>
      </div>

      {/* 3. Wadah Formulir Interaktif */}
      <FormJurnalManual akunList={akunList || []} />
    </div>
  );
}
