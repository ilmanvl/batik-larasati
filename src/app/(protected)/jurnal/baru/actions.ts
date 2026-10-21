'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

interface BarisPayload {
  urutan: number;
  akun_id: number;
  debit: number;
  kredit: number;
  keterangan?: string | null;
}

interface SubmitJurnalInput {
  tanggal: string;
  keterangan: string;
  baris: BarisPayload[];
}

export async function submitJurnalAction(input: SubmitJurnalInput): Promise<{
  success: boolean;
  message?: string;
  jurnalId?: number;
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
      return { success: false, message: 'Hanya Akuntan atau Direktur yang berwenang mencatat jurnal.' };
    }

    // 2. Validasi Double-Entry
    if (!input.baris || input.baris.length < 2) {
      return { success: false, message: 'Jurnal harus memiliki minimal 2 baris transaksi.' };
    }

    const totalDebit = input.baris.reduce((acc, r) => acc + (Number(r.debit) || 0), 0);
    const totalKredit = input.baris.reduce((acc, r) => acc + (Number(r.kredit) || 0), 0);

    if (totalDebit <= 0 || totalDebit !== totalKredit) {
      return { success: false, message: 'Total Debit dan Kredit harus seimbang dan lebih dari Rp 0.' };
    }

    // 3. Validasi Status Periode Akuntansi
    const tanggalTransaksi = new Date(input.tanggal);
    const tahun = tanggalTransaksi.getFullYear();
    const bulan = tanggalTransaksi.getMonth() + 1;

    const { data: periode } = await supabase
      .from('periode')
      .select('id, status')
      .eq('tahun', tahun)
      .eq('bulan', bulan)
      .single();

    if (!periode) {
      return { success: false, message: `Periode akuntansi bulan ${bulan} tahun ${tahun} belum terdaftar di sistem.` };
    }

    if (periode.status === 'ditutup') {
      return {
        success: false,
        message: `Periode akuntansi ${bulan}/${tahun} telah ditutup/dikunci. Transaksi tidak dapat dicatat pada periode ini.`,
      };
    }

    // 4. Instansiasi Admin Client (Service Role untuk menembus RLS database)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Ambil max ID jurnal
    const { data: maxIdData } = await supabaseAdmin
      .from('jurnal')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    const newId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id + 1 : 1;
    const yyyymm = `${tahun}${bulan.toString().padStart(2, '0')}`;
    const nomorJurnal = `JU-${yyyymm}-${newId.toString().padStart(4, '0')}`;

    // 5. Insert Header Jurnal menggunakan supabaseAdmin
    const { data: jurnalHeader, error: headerErr } = await supabaseAdmin
      .from('jurnal')
      .insert({
        id: newId,
        nomor: nomorJurnal,
        tanggal: input.tanggal,
        periode_id: periode.id,
        keterangan: input.keterangan,
        sumber: 'manual',
        status: 'draf',
        dibuat_oleh: user.id,
      })
      .select('id')
      .single();

    if (headerErr || !jurnalHeader) {
      console.error('Error insert jurnal header via admin:', headerErr);
      return { success: false, message: 'Gagal membuat header jurnal: ' + (headerErr?.message || '') };
    }

    // 6. Ambil max baris ID agar terhindar dari conflict sequence pada jurnal_baris
    const { data: maxBarisData } = await supabaseAdmin
      .from('jurnal_baris')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    const startBarisId = maxBarisData && maxBarisData.length > 0 ? maxBarisData[0].id + 1 : 1;

    // 7. Insert Baris Jurnal menggunakan supabaseAdmin
    const barisInsertPayload = input.baris.map((b, index) => ({
      id: startBarisId + index,
      jurnal_id: jurnalHeader.id,
      urutan: index + 1,
      akun_id: b.akun_id,
      debit: b.debit,
      kredit: b.kredit,
      keterangan: b.keterangan || null,
    }));

    const { error: barisErr } = await supabaseAdmin
      .from('jurnal_baris')
      .insert(barisInsertPayload);

    if (barisErr) {
      console.error('Error insert baris jurnal via admin:', barisErr);
      // Rollback header jika baris gagal
      await supabaseAdmin.from('jurnal').delete().eq('id', jurnalHeader.id);
      return { success: false, message: 'Gagal menyimpan rincian baris akun: ' + barisErr.message };
    }

    // 8. Revalidasi Halaman
    revalidatePath('/jurnal');
    revalidatePath('/dashboard');

    return { success: true, jurnalId: jurnalHeader.id };
  } catch (err: any) {
    console.error('Submit jurnal error:', err);
    return { success: false, message: 'Terjadi kesalahan sistem: ' + (err?.message || '') };
  }
}
