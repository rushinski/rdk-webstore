// src/components/admin/AdminSidebar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Globe,
  Package,
  BarChart3,
  DollarSign,
  Settings,
  X,
  Menu,
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/website', label: 'Website', icon: Globe },
  { href: '/admin/inventory', label: 'Inventory', icon: Package },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/sales', label: 'Sales', icon: DollarSign },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const SidebarContent = () => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            className={`flex items-center space-x-3 px-4 py-3 rounded transition ${
              isActive
                ? 'bg-red-900/20 text-white'
                : 'text-gray-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-20 left-4 z-40 bg-red-600 text-white p-2 rounded shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Full-Screen Sidebar */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">Admin Menu</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 bg-zinc-900 border-r border-red-900/20 min-h-screen p-6">
        <h2 className="text-2xl font-bold text-white mb-8">Admin</h2>
        <SidebarContent />
      </aside>
    </>
  );
}
