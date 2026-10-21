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

  // SVG Pattern Batik Kawung Tradisional: Kelopak netral berisi + outline + cecek emas lembut di atas #0a0a0a
  const batikPatternSvg = `data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.09' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.13'%3E%3Cellipse cx='40' cy='20' rx='12' ry='18'/%3E%3Cellipse cx='40' cy='60' rx='12' ry='18'/%3E%3Cellipse cx='20' cy='40' rx='18' ry='12'/%3E%3Cellipse cx='60' cy='40' rx='18' ry='12'/%3E%3Cellipse cx='0' cy='20' rx='12' ry='18'/%3E%3Cellipse cx='80' cy='20' rx='12' ry='18'/%3E%3Cellipse cx='0' cy='60' rx='12' ry='18'/%3E%3Cellipse cx='80' cy='60' rx='12' ry='18'/%3E%3Cellipse cx='20' cy='0' rx='18' ry='12'/%3E%3Cellipse cx='60' cy='0' rx='18' ry='12'/%3E%3Cellipse cx='20' cy='80' rx='18' ry='12'/%3E%3Cellipse cx='60' cy='80' rx='18' ry='12'/%3E%3C/g%3E%3Cg fill='%23d4af37' fill-opacity='0.06'%3E%3Ccircle cx='40' cy='40' r='3.5'/%3E%3Ccircle cx='0' cy='0' r='3.5'/%3E%3Ccircle cx='80' cy='0' r='3.5'/%3E%3Ccircle cx='0' cy='80' r='3.5'/%3E%3Ccircle cx='80' cy='80' r='3.5'/%3E%3Ccircle cx='40' cy='0' r='3'/%3E%3Ccircle cx='40' cy='80' r='3'/%3E%3Ccircle cx='0' cy='40' r='3'/%3E%3Ccircle cx='80' cy='40' r='3'/%3E%3C/g%3E%3Cg fill='%23ffffff' fill-opacity='0.07'%3E%3Ccircle cx='40' cy='20' r='2'/%3E%3Ccircle cx='40' cy='60' r='2'/%3E%3Ccircle cx='20' cy='40' r='2'/%3E%3Ccircle cx='60' cy='40' r='2'/%3E%3Ccircle cx='0' cy='20' r='2'/%3E%3Ccircle cx='80' cy='20' r='2'/%3E%3Ccircle cx='0' cy='60' r='2'/%3E%3Ccircle cx='80' cy='60' r='2'/%3E%3Ccircle cx='20' cy='0' r='2'/%3E%3Ccircle cx='60' cy='0' r='2'/%3E%3Ccircle cx='20' cy='80' r='2'/%3E%3Ccircle cx='60' cy='80' r='2'/%3E%3C/g%3E%3C/svg%3E`;

  return (
    <div
      className="min-h-screen flex bg-[#0a0a0a] font-sans text-neutral-100 relative bg-fixed"
      style={{
        backgroundImage: `url("${batikPatternSvg}")`,
        backgroundAttachment: 'fixed',
      }}
    >
      <Sidebar user={userProfile} />

      <div className="flex-1 flex flex-col min-w-0 pt-16 lg:pt-0 relative z-10">
        <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
