import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const FINANCE_ROUTES = ['/jurnal', '/buku-besar', '/laporan', '/akun'];
const DIREKTUR_ROUTES = ['/pengguna', '/audit-log'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabaseResponse, user, supabase } = await updateSession(request);

  const isPublicRoute = pathname.startsWith('/masuk') || pathname.startsWith('/api/auth');

  // 1. Belum login dan mencoba mengakses rute internal
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/masuk';
    return NextResponse.redirect(url);
  }

  // 2. Sudah login
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('peran, aktif')
      .eq('id', user.id)
      .single();

    // 2a. Akun Nonaktif: tolak dan keluarkan
    if (!profile || profile.aktif === false) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/masuk';
      url.searchParams.set('error', 'inactive');
      return NextResponse.redirect(url);
    }

    // 2b. User aktif mengakses /masuk atau / -> alihkan ke /dashboard
    if (pathname === '/masuk' || pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    const { peran } = profile;

    // 2c. Validasi Rute Finance (Hanya Akuntan & Direktur)
    if (FINANCE_ROUTES.some((route) => pathname.startsWith(route))) {
      if (peran === 'staf') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }

    // 2d. Validasi Rute Direktur (Hanya Direktur)
    if (DIREKTUR_ROUTES.some((route) => pathname.startsWith(route))) {
      if (peran !== 'direktur') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
