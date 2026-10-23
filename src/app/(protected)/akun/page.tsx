import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { PeranType } from '@/types/database';
import { FolderTree } from 'lucide-react';
import AkunClientPanels from './AkunClientPanels';

export default async function AkunPage() {
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

  // Proteksi BR-11: Staf tidak boleh mengakses Bagan Akun & Periode
  if (role === 'staf') {
    redirect('/dashboard');
  }

  // Ambil daftar Akun COA
  const { data: akunList } = await supabase
    .from('akun')
    .select('*')
    .order('kode', { ascending: true });

  // Ambil daftar Periode
  const { data: periodeList } = await supabase
    .from('periode')
    .select('*')
    .order('tahun', { ascending: false })
    .order('bulan', { ascending: false });

  return (
    <div className="space-y-6">
      {/* Header Banner Liquid Glass */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl liquid-glass-header text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-wider text-[#d4af37] font-bold">
              Master Data Akuntansi
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-xs text-neutral-400">CV Batik Larasati</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <FolderTree className="w-7 h-7 text-[#d4af37]" />
            <span>Bagan Akun & Periode</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            Kelola struktur bagan akun standar (COA 4-digit) dan siklus buka/tutup periode akuntansi sesuai regulasi SAK EMKM.
          </p>
        </div>
      </div>

      {/* Client Interactive Panels */}
      <AkunClientPanels
        role={role}
        akunList={akunList || []}
        periodeList={periodeList || []}
      />
    </div>
  );
}
