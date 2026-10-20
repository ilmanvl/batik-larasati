import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/navigation/Sidebar';
import type { PeranType } from '@/types/database';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/masuk');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nama_lengkap, email, peran, jabatan, aktif')
    .eq('id', user.id)
    .single();

  if (!profile || profile.aktif === false) {
    await supabase.auth.signOut();
    redirect('/masuk?error=inactive');
  }

  const userProfile = {
    nama_lengkap: profile.nama_lengkap,
    email: profile.email,
    peran: profile.peran as PeranType,
    jabatan: profile.jabatan,
  };

  return (
    <div className="min-h-screen flex bg-stone-100/60 font-sans text-stone-900">
      <Sidebar user={userProfile} />
      <div className="flex-1 flex flex-col min-w-0 pt-16 lg:pt-0">
        <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
