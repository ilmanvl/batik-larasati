'use client';

import { useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginAction, type AuthState } from '@/app/actions/auth';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export function MasukForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    loginAction,
    { error: null }
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const errorMessage =
    state.error ||
    (urlError === 'inactive'
      ? 'Akun Anda dinonaktifkan. Hubungi Direktur untuk mengaktifkan kembali.'
      : null);

  return (
    <div className="space-y-6">
      {/* Alert Error */}
      {errorMessage && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* Form Login */}
      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-[#a3a3a3] mb-1.5"
          >
            Alamat Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#333333] bg-[#1a1a1a] text-[#f5f5f5] text-xs sm:text-sm placeholder:text-neutral-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 transition-colors shadow-inner"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-[#a3a3a3] mb-1.5"
          >
            Kata Sandi
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#333333] bg-[#1a1a1a] text-[#f5f5f5] text-xs sm:text-sm placeholder:text-neutral-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 transition-colors shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Fitur Lupa Kata Sandi (Mockup) */}
          <div className="flex justify-end mt-1.5">
            <button
              type="button"
              onClick={() => alert('Fitur Lupa Kata Sandi akan dihubungkan ke email reset Supabase pada fase pengembangan berikutnya.')}
              className="text-xs text-neutral-400 hover:text-[#d4af37] transition-colors cursor-pointer"
            >
              Lupa Kata Sandi?
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-neutral-950 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
        >
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-neutral-950/40 border-t-neutral-950 rounded-full animate-spin" />
              <span>Memverifikasi...</span>
            </>
          ) : (
            <>
              <span>Masuk ke Sistem</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}