import { Suspense } from 'react';
import { MasukForm } from './MasukForm';
import { Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Masuk | CV Batik Larasati',
  description: 'Masuk ke Sistem Keuangan dan Akuntansi CV Batik Larasati',
};

export default function MasukPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-stone-100 to-amber-100/50 p-4 relative overflow-hidden">
      {/* Background Decorative Circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-amber-200/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-orange-200/30 blur-3xl pointer-events-none" />

      <main className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-amber-950/5 border border-amber-200/70 p-7 sm:p-8 space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-900 text-amber-100 font-bold text-xl shadow-md shadow-amber-950/30">
            BL
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            CV Batik Larasati
          </h1>
          <p className="text-xs text-stone-500 font-medium">
            Sistem Informasi Keuangan & Akuntansi Internal
          </p>
        </div>

        <Suspense
          fallback={
            <div className="h-64 flex items-center justify-center text-xs text-stone-400">
              Memuat formulir...
            </div>
          }
        >
          <MasukForm />
        </Suspense>

        <footer className="text-center pt-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-stone-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-700/60" />
            <span>Surakarta · Jawa Tengah</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
