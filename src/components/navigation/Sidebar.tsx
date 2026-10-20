'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import type { PeranType } from '@/types/database';
import {
  LayoutDashboard,
  Receipt,
  BookOpen,
  Scale,
  TrendingUp,
  FolderTree,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface SidebarProps {
  user: {
    nama_lengkap: string;
    email: string;
    peran: PeranType;
    jabatan: string | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Definisi item navigasi berdasarkan peran (RBAC)
  const navItems = [
    {
      title: 'Menu Utama',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/pengajuan', label: 'Pengajuan Biaya', icon: Receipt },
      ],
    },
    ...(['akuntan', 'direktur'].includes(user.peran)
      ? [
          {
            title: 'Akuntansi & Keuangan',
            items: [
              { href: '/jurnal', label: 'Jurnal Umum', icon: BookOpen },
              { href: '/buku-besar', label: 'Buku Besar', icon: Scale },
              { href: '/laporan', label: 'Laporan Keuangan', icon: TrendingUp },
              { href: '/akun', label: 'Bagan Akun & Periode', icon: FolderTree },
            ],
          },
        ]
      : []),
    ...(user.peran === 'direktur'
      ? [
          {
            title: 'Administrasi',
            items: [
              { href: '/pengguna', label: 'Manajemen Pengguna', icon: Users },
              { href: '/audit-log', label: 'Audit Log', icon: ShieldCheck },
            ],
          },
        ]
      : []),
  ];

  const getRoleBadge = (role: PeranType) => {
    switch (role) {
      case 'direktur':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'akuntan':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      default:
        return 'bg-blue-100 text-blue-900 border-blue-300';
    }
  };

  return (
    <>
      {/* Tombol Mobile Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-stone-200 px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2.5 font-bold text-stone-900">
          <div className="w-8 h-8 rounded-lg bg-amber-900 text-amber-100 flex items-center justify-center text-xs font-bold shadow-sm">
            BL
          </div>
          <span className="text-sm tracking-tight">CV Batik Larasati</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg text-stone-600 hover:bg-stone-100"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop Mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 w-64 bg-stone-900 text-stone-100 z-50 flex flex-col transition-transform duration-300 ease-in-out border-r border-stone-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-stone-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-700/80 text-amber-100 flex items-center justify-center font-bold text-base shadow-sm">
            BL
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white">
              CV Batik Larasati
            </h1>
            <p className="text-[11px] text-amber-200/70">Finance & Accounting</p>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-stone-800/60 border border-stone-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-amber-900/90 text-amber-200 font-semibold text-xs flex items-center justify-center border border-amber-600/30">
              {user.nama_lengkap.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user.nama_lengkap}
              </p>
              <p className="text-[11px] text-stone-400 truncate">
                {user.jabatan || user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-stone-700/40">
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold rounded border uppercase tracking-wider ${getRoleBadge(
                user.peran
              )}`}
            >
              {user.peran}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Aktif</span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          {navItems.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-amber-800/80 text-white shadow-sm shadow-amber-950/40'
                        : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-amber-200/80" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-stone-800/80">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Keluar dari Aplikasi</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
