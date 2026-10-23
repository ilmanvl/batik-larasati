'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { TipeAkun, SaldoNormalType, StatusPeriode } from '@/types/database';

// 1. Action Simpan Akun (Tambah Baru atau Update)
export async function simpanAkunAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sesi telah berakhir. Silakan masuk kembali.' };

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('peran')
      .eq('id', user.id)
      .single();

    if (!['akuntan', 'direktur'].includes(profile?.peran || '')) {
      return { success: false, error: 'Hanya Akuntan atau Direktur yang dapat mengelola bagan akun.' };
    }

    const id = formData.get('id') ? parseInt(formData.get('id') as string, 10) : null;
    const kode = (formData.get('kode') as string || '').trim();
    const nama = (formData.get('nama') as string || '').trim();
    const tipe = formData.get('tipe') as TipeAkun;
    const saldoNormal = formData.get('saldo_normal') as SaldoNormalType;
    const isKasBank = formData.get('is_kas_bank') === 'true';
    const aktif = formData.get('aktif') !== 'false';
    const keterangan = (formData.get('keterangan') as string || '').trim() || null;

    // Validasi kode akun 4 digit
    if (!/^[1-5][0-9]{3}$/.test(kode)) {
      return { success: false, error: 'Kode akun harus 4 digit angka dimulai dari 1 sampai 5 (contoh: 1101, 5101).' };
    }

    if (nama.length < 3) {
      return { success: false, error: 'Nama akun minimal 3 karakter.' };
    }

    if (id) {
      // Update
      const { error } = await supabaseAdmin
        .from('akun')
        .update({
          nama,
          tipe,
          saldo_normal: saldoNormal,
          is_kas_bank: isKasBank,
          aktif,
          keterangan,
        })
        .eq('id', id);

      if (error) throw error;
    } else {
      // Insert: cari max ID agar sequence tidak tabrakan
      const { data: lastAkun } = await supabaseAdmin
        .from('akun')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

      const nextId = (lastAkun && lastAkun[0] ? Number(lastAkun[0].id) : 0) + 1;

      const { error } = await supabaseAdmin
        .from('akun')
        .insert({
          id: nextId,
          kode,
          nama,
          tipe,
          saldo_normal: saldoNormal,
          is_kas_bank: isKasBank,
          aktif,
          keterangan,
        });

      if (error) throw error;
    }

    revalidatePath('/akun');
    revalidatePath('/jurnal');
    revalidatePath('/neraca-saldo');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan akun COA.' };
  }
}

// 2. Action Tutup Periode (Akuntan & Direktur)
export async function tutupPeriodeAction(periodeId: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sesi berakhir.' };

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('peran')
      .eq('id', user.id)
      .single();

    if (!['akuntan', 'direktur'].includes(profile?.peran || '')) {
      return { success: false, error: 'Hanya Akuntan atau Direktur yang dapat menutup periode.' };
    }

    const { error } = await supabaseAdmin
      .from('periode')
      .update({
        status: 'ditutup',
        ditutup_oleh: user.id,
        ditutup_pada: new Date().toISOString(),
      })
      .eq('id', periodeId);

    if (error) throw error;

    revalidatePath('/akun');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menutup periode.' };
  }
}

// 3. Action Buka Kembali Periode (Hanya Direktur, BR-06, Alasan >= 20 karakter)
export async function bukaKembaliPeriodeAction(periodeId: number, alasan: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sesi berakhir.' };

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('peran')
      .eq('id', user.id)
      .single();

    if (profile?.peran !== 'direktur') {
      return { success: false, error: 'Hanya Direktur yang memiliki wewenang membuka kembali periode yang sudah ditutup (BR-06).' };
    }

    if (!alasan || alasan.trim().length < 20) {
      return { success: false, error: 'Alasan pembukaan ulang periode wajib diisi minimal 20 karakter sesuai aturan BR-06.' };
    }

    const { error } = await supabaseAdmin
      .from('periode')
      .update({
        status: 'terbuka',
        alasan_buka_ulang: alasan.trim(),
        ditutup_oleh: null,
        ditutup_pada: null,
      })
      .eq('id', periodeId);

    if (error) throw error;

    // Catat ke audit log
    await supabaseAdmin.from('audit_log').insert({
      pelaku_id: user.id,
      aksi: 'BUKA_KEMBALI_PERIODE',
      nama_tabel: 'periode',
      id_data: periodeId.toString(),
      data_baru: { alasan: alasan.trim(), status: 'terbuka' },
    });

    revalidatePath('/akun');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membuka kembali periode.' };
  }
}

// 4. Action Buat Periode Baru
export async function buatPeriodeAction(tahun: number, bulan: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sesi berakhir.' };

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('peran')
      .eq('id', user.id)
      .single();

    if (!['akuntan', 'direktur'].includes(profile?.peran || '')) {
      return { success: false, error: 'Akses ditolak.' };
    }

    // Cek duplikasi
    const { data: existing } = await supabaseAdmin
      .from('periode')
      .select('id')
      .eq('tahun', tahun)
      .eq('bulan', bulan)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Periode ${bulan}/${tahun} sudah terdaftar.` };
    }

    const { data: lastP } = await supabaseAdmin
      .from('periode')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    const nextId = (lastP && lastP[0] ? Number(lastP[0].id) : 0) + 1;
    const padBulan = String(bulan).padStart(2, '0');
    const tanggalMulai = `${tahun}-${padBulan}-01`;

    const { error } = await supabaseAdmin
      .from('periode')
      .insert({
        id: nextId,
        tahun,
        bulan,
        tanggal_mulai: tanggalMulai,
        status: 'terbuka',
      });

    if (error) throw error;

    revalidatePath('/akun');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membuat periode baru.' };
  }
}
