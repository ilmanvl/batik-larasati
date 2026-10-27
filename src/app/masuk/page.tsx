import { Suspense } from 'react';
import { MasukForm } from './MasukForm';
import LogoBatik from '@/components/navigation/LogoBatik';
import { POLA_PENDUKUNG_SVG } from '@/components/navigation/PolaPendukung';

export const metadata = {
  title: 'Masuk | CV Batik Larasati',
  description: 'Masuk ke Sistem Keuangan dan Akuntansi CV Batik Larasati',
};

export default function MasukPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#0a0a0a] text-neutral-100 relative overflow-x-hidden selection:bg-[#d4af37]/30 selection:text-[#f5f5f5]">
      {/* Background Motif Pola Pendukung Resmi CV Batik Larasati */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url("${POLA_PENDUKUNG_SVG}")`,
          backgroundSize: '180px 140px',
        }}
      />

      <main className="w-full max-w-[420px] bg-[#141414] border border-[#2e2e2e] rounded-3xl p-7 sm:p-9 space-y-6 relative z-10 shadow-2xl shadow-black/80">
        {/* Header Identitas & Sambutan */}
        <div className="text-center space-y-2">
          <LogoBatik className="w-16 h-16 text-[#d4af37] mx-auto mb-6" />
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f5f5f5]">
              CV Batik Larasati
            </h1>
            <div className="text-xs uppercase tracking-wider text-[#d4af37] font-semibold">
              Selamat Datang
            </div>
            <p className="text-xs text-[#a3a3a3]">
              Sistem Informasi Keuangan & Akuntansi
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="h-64 flex items-center justify-center text-xs text-neutral-500">
              Memuat formulir autentikasi...
            </div>
          }
        >
          <MasukForm />
        </Suspense>

        <footer className="text-center pt-2 border-t border-[#222222]">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-[#737373]">
            <span>Surakarta · Jawa Tengah</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
