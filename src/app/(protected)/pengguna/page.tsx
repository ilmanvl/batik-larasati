import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { PeranType } from '@/types/database';
import { Users, ShieldCheck } from 'lucide-react';
import PenggunaClientList from './PenggunaClientList';

export default async function PenggunaPage() {
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

  // Proteksi BR-12: Hanya Direktur yang dapat mengakses Manajemen Pengguna
  if (role !== 'direktur') {
    redirect('/dashboard');
  }

  // Ambil seluruh daftar pengguna
  const { data: userList } = await supabase
    .from('profiles')
    .select('id, nama_lengkap, email, peran, jabatan, aktif, dibuat_pada')
    .order('dibuat_pada', { ascending: true });

  return (
    <div className="space-y-6">
      {/* Header Banner Liquid Glass */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl liquid-glass-header text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-wider text-[#d4af37] font-bold">
              Administrasi & Tata Kelola
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-xs text-neutral-400">CV Batik Larasati</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-[#d4af37]" />
            <span>Manajemen Pengguna</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            Kelola hak akses pengguna, pembaruan peran struktural, dan penonaktifan akun sesuai kebijakan keamanan perusahaan.
          </p>
        </div>
      </div>

      <PenggunaClientList
        currentUserId={user.id}
        users={userList || []}
      />
    </div>
  );
}
