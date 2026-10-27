import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { PeranType } from '@/types/database';
import { MutasiClient } from './MutasiClient';

export const metadata = {
  title: 'Mutasi Bank | CV Batik Larasati',
  description: 'Impor dan rekonsiliasi mutasi rekening bank dengan jurnal umum akuntansi.',
};

export default async function MutasiBankPage() {
  const supabase = await createClient();

  // 1. Verifikasi Sesi & Hak Akses
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/masuk');
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('nama_lengkap, peran, aktif')
    .eq('id', user.id)
    .single();

  const role = (profile?.peran || 'staf') as PeranType;

  // Hanya Akuntan dan Direktur yang memiliki akses ke modul Mutasi Bank
  if (!['akuntan', 'direktur'].includes(role) || !profile?.aktif) {
    redirect('/dashboard');
  }

  // 2. Ambil daftar Akun Kas & Bank Aktif untuk pilihan impor
  const { data: akunList } = await supabaseAdmin
    .from('akun')
    .select('id, kode, nama, is_kas_bank')
    .eq('aktif', true)
    .order('kode', { ascending: true });

  // Saring akun yang merupakan kas & bank (atau aset kelompok 1)
  const bankAccounts = (akunList || []).filter(
    (a) => a.is_kas_bank || a.kode.startsWith('1')
  );

  // 3. Ambil Mutasi Bank yang BELUM memiliki jurnal (jurnal_id IS NULL)
  const { data: mutasiData } = await supabaseAdmin
    .from('mutasi_bank')
    .select(`
      id,
      akun_bank_id,
      tanggal,
      deskripsi,
      jumlah,
      saldo,
      nama_file,
      jurnal_id,
      diimpor_pada,
      akun:akun_bank_id (
        id,
        kode,
        nama
      )
    `)
    .is('jurnal_id', null)
    .order('tanggal', { ascending: false });

  return (
    <div className="space-y-6">
      <MutasiClient
        userRole={role}
        bankAccounts={bankAccounts}
        unreconciledMutasi={(mutasiData as any) || []}
      />
    </div>
  );
}
