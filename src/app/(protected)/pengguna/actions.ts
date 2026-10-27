'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { PeranType } from '@/types/database';

export async function updatePenggunaAction(
  targetUserId: string,
  newPeran: PeranType,
  newAktif: boolean
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sesi berakhir.' };

    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('peran')
      .eq('id', user.id)
      .single();

    if (currentProfile?.peran !== 'direktur') {
      return { success: false, error: 'Hanya Direktur yang memiliki wewenang mengelola pengguna.' };
    }

    // Proteksi: Direktur tidak boleh mengubah peran atau status akunnya sendiri demi kepatuhan tata kelola
    if (targetUserId === user.id) {
      return { success: false, error: 'Direktur tidak diperkenankan mengubah peran atau status aktif akunnya sendiri demi kepatuhan tata kelola.' };
    }

    // Ambil data lama untuk audit log
    const { data: oldProfile } = await supabaseAdmin
      .from('profiles')
      .select('nama_lengkap, email, peran, aktif')
      .eq('id', targetUserId)
      .single();

    if (!oldProfile) {
      return { success: false, error: 'Pengguna tidak ditemukan.' };
    }

    // Update profil
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        peran: newPeran,
        aktif: newAktif,
      })
      .eq('id', targetUserId);

    if (error) throw error;

    // Catat ke audit log
    await supabaseAdmin.from('audit_log').insert({
      pelaku_id: user.id,
      aksi: 'UBAH_PENGGUNA',
      nama_tabel: 'profiles',
      id_data: targetUserId,
      data_lama: { peran: oldProfile.peran, aktif: oldProfile.aktif },
      data_baru: { peran: newPeran, aktif: newAktif },
    });

    revalidatePath('/pengguna');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memperbarui pengguna.' };
  }
}
