'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function postingJurnalAction(jurnalId: number): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const supabase = await createClient();

    // 1. Verifikasi Autentikasi Pengguna
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'Sesi login Anda telah berakhir.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('peran')
      .eq('id', user.id)
      .single();

    if (!['akuntan', 'direktur'].includes(profile?.peran || '')) {
      return { success: false, message: 'Hanya Akuntan atau Direktur yang berwenang memposting jurnal.' };
    }

    // 2. Fetch Jurnal, Baris, dan Periode
    const { data: jurnal } = await supabase
      .from('jurnal')
      .select(`
        id,
        nomor,
        status,
        periode_id,
        periode:periode!jurnal_periode_id_fkey(status),
        jurnal_baris(debit, kredit)
      `)
      .eq('id', jurnalId)
      .single();

    if (!jurnal) {
      return { success: false, message: 'Jurnal tidak ditemukan.' };
    }

    if (jurnal.status !== 'draf') {
      return { success: false, message: `Jurnal tidak dapat diposting karena berstatus: ${jurnal.status}.` };
    }

    const periodeObj = Array.isArray(jurnal.periode) ? jurnal.periode[0] : jurnal.periode;
    if (periodeObj?.status === 'ditutup') {
      return { success: false, message: 'Periode akuntansi dokumen ini telah ditutup/dikunci.' };
    }

    // 3. Validasi Keseimbangan Baris (Double-Entry Balance Check)
    const baris = jurnal.jurnal_baris || [];
    if (baris.length < 2) {
      return { success: false, message: 'Jurnal harus memiliki minimal 2 baris akun.' };
    }

    const totalDebit = baris.reduce((sum: number, b: any) => sum + (Number(b.debit) || 0), 0);
    const totalKredit = baris.reduce((sum: number, b: any) => sum + (Number(b.kredit) || 0), 0);

    if (totalDebit <= 0 || totalDebit !== totalKredit) {
      return { success: false, message: 'Total Debit dan Kredit tidak seimbang.' };
    }

    // 4. Update Status Jurnal ke 'diposting' via Admin Client (Bypass RLS DB)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date().toISOString();
    const { error: updateErr } = await supabaseAdmin
      .from('jurnal')
      .update({
        status: 'diposting',
        diposting_oleh: user.id,
        diposting_pada: now,
      })
      .eq('id', jurnalId);

    if (updateErr) {
      console.error('Error posting jurnal:', updateErr);
      return { success: false, message: 'Gagal memposting jurnal: ' + updateErr.message };
    }

    // 5. Revalidasi Jalur Cache
    revalidatePath('/jurnal');
    revalidatePath(`/jurnal/${jurnalId}`);
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Posting jurnal error:', err);
    return { success: false, message: 'Terjadi kesalahan sistem: ' + (err?.message || '') };
  }
}
