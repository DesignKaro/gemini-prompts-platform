'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  navItems: { href: string; label: string; icon: React.ReactNode }[];
};

export function MobileMenu({ isOpen, onClose, navItems }: MobileMenuProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    if (previousPathname.current !== pathname && previousPathname.current !== '') {
      onClose();
    }
    previousPathname.current = pathname;
  }, [pathname, onClose]);

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-50 flex h-full w-[min(88vw,320px)] flex-col bg-white shadow-xl transition-transform">
        <div className="flex items-center justify-between border-b border-[#e1e5ee] px-5 py-4">
          <span className="text-[1.1rem] font-medium text-[#111118]">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f2f4f7] text-[#111118] transition-colors hover:bg-[#e1e5ee]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
              <path
                d="M18 6L6 18M6 6l12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={`mobile-nav-${item.href}`}
                href={item.href}
                className="flex items-center gap-4 rounded-xl px-4 py-3 text-[1.05rem] text-[#111118] transition-colors hover:bg-[#f2f4f7]"
                onClick={onClose}
              >
                <span className="text-[#556072]">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
