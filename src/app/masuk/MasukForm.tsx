'use client';

import { useActionState, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginAction, type AuthState } from '@/app/actions/auth';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    role: 'Direktur',
    name: 'Laras Prameswari',
    email: 'laras@larasati.test',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  {
    role: 'Akuntan',
    name: 'Dimas Arya',
    email: 'dimas@larasati.test',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  {
    role: 'Staf',
    name: 'Rina Anggraini',
    email: 'rina@larasati.test',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  {
    role: 'Nonaktif',
    name: 'Yoga Pratama',
    email: 'yoga@larasati.test',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
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
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* Form Login */}
      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
          >
            Alamat Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
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
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/40 focus:border-amber-800 focus:bg-white transition-all shadow-sm"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
          >
            Kata Sandi
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setActiveAccountLabel(null);
              }}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/40 focus:border-amber-800 focus:bg-white transition-all shadow-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm text-white bg-amber-900 hover:bg-amber-800 active:scale-[0.99] transition-all shadow-md shadow-amber-950/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
      <div className="pt-4 border-t border-stone-200/80">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Akun Latihan (Demo)
          </span>
          <span className="text-[11px] text-stone-400">Klik untuk auto-fill</span>
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
                    ? 'border-amber-800 bg-amber-50/80 ring-1 ring-amber-800 shadow-sm'
                    : 'border-stone-200 bg-white hover:bg-stone-50/80 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md border ${acc.badgeClass}`}
                  >
                    {acc.role}
                  </span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-800" />}
                </div>
                <div className="font-medium text-stone-800 truncate">{acc.name}</div>
                <div className="text-[10px] text-stone-500 truncate">{acc.email}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
