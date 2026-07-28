import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { BrandMark } from '../brand/BrandMark';

export function LandingHeader() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Recursos', href: '#features' },
    { name: 'Para Personal', href: '#for-personal' },
    { name: 'Para Aluno', href: '#for-student' },
    { name: 'Planos', href: '#plans' },
    { name: 'Como acessar', href: '#install' },
    { name: 'Dúvidas', href: '#faq' },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#050505]/95 backdrop-blur-xl pt-[max(0px,env(safe-area-inset-top))]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <a
          href="/"
          aria-label="Página inicial do VSFit Personal"
          className="flex min-w-0 items-center gap-3"
        >
          <BrandMark size="sm" className="shrink-0" />
          <span className="truncate text-lg font-black tracking-tight text-white">
            VSFit{' '}
            <span className="text-vs-primary">Personal</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-semibold text-zinc-400 transition-colors hover:text-white"
            >
              {link.name}
            </a>
          ))}
          <div className="flex items-center gap-3 border-l border-white/10 pl-6">
            <a
              href="/auth/login"
              className="px-3 py-2 text-sm font-bold text-zinc-300 transition-colors hover:text-white"
            >
              Entrar
            </a>
          </div>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white lg:hidden"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="absolute inset-x-0 top-16 border-b border-white/10 bg-[#080808] p-4 lg:hidden"
          >
            <nav className="mx-auto flex max-w-7xl flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  {link.name}
                </a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
                <a
                  href="/auth/login"
                  onClick={() => setIsOpen(false)}
                  className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-sm font-black text-white"
                >
                  Login Personal
                </a>
                <a
                  href="/auth/student-login"
                  onClick={() => setIsOpen(false)}
                  className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-sm font-black text-white"
                >
                  Login Aluno
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default LandingHeader;