'use client';

import { useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginAction, type AuthState } from '@/app/actions/auth';
import { Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    role: 'Direktur',
    name: 'Laras Prameswari',
    email: 'laras@larasati.test',
    badgeClass: 'bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/30',
  },
  {
    role: 'Akuntan',
    name: 'Dimas Arya',
    email: 'dimas@larasati.test',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  {
    role: 'Staf',
    name: 'Rina Anggraini',
    email: 'rina@larasati.test',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  {
    role: 'Nonaktif',
    name: 'Yoga Pratama',
    email: 'yoga@larasati.test',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  },
];

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
  const [activeAccountLabel, setActiveAccountLabel] = useState<string | null>(null);

  const selectDemoAccount = (demoEmail: string, role: string) => {
    setEmail(demoEmail);
    setPassword('Latihan#2026');
    setActiveAccountLabel(role);
  };

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
              onChange={(e) => {
                setEmail(e.target.value);
                setActiveAccountLabel(null);
              }}
              placeholder="nama@larasati.test"
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
              onChange={(e) => {
                setPassword(e.target.value);
                setActiveAccountLabel(null);
              }}
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
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-neutral-950 bg-[#d4af37] hover:bg-[#c59e31] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-[#d4af37]/20"
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

      {/* Akun Demo / Uji Cepat */}
      <div className="pt-4 border-t border-[#262626]">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a3a3a3]">
            Akun Latihan (Demo)
          </span>
          <span className="text-[10px] text-neutral-500">Klik untuk auto-fill</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((acc) => {
            const isSelected = email === acc.email;
            return (
              <button
                key={acc.email}
                type="button"
                onClick={() => selectDemoAccount(acc.email, acc.role)}
                className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#d4af37] bg-[#d4af37]/10 ring-1 ring-[#d4af37]/40 shadow-sm'
                    : 'border-[#2e2e2e] bg-[#181818] hover:bg-[#202020] hover:border-[#3a3a3a]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md border ${acc.badgeClass}`}
                  >
                    {acc.role}
                  </span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#d4af37]" />}
                </div>
                <div className="font-semibold text-[#f5f5f5] truncate">{acc.name}</div>
                <div className="text-[10px] text-neutral-400 truncate">{acc.email}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

