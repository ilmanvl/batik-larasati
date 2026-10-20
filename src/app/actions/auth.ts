'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type AuthState = {
  error: string | null;
};

export async function loginAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan kata sandi wajib diisi.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: 'Email atau kata sandi tidak valid.' };
  }

  // Cek status aktif akun di tabel profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('aktif')
    .eq('id', data.user.id)
    .single();

  if (!profile || profile.aktif === false) {
    await supabase.auth.signOut();
    return {
      error: 'Akun Anda dinonaktifkan. Hubungi Direktur untuk mengaktifkan kembali.',
    };
  }

  redirect('/dashboard');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/masuk');
}
