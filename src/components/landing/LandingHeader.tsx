import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeviceAwareCTA } from './DeviceAwareCTA';

export function LandingHeader() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Recursos', href: '#features' },
    { name: 'Para Personal', href: '#personal' },
    { name: 'Para Aluno', href: '#student' },
    { name: 'Como instalar', href: '#install' },
    { name: 'Dúvidas', href: '#faq' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-md border-b border-white/5"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative w-10 h-10 overflow-hidden rounded-lg bg-white/5 flex items-center justify-center">
            <img 
              src="/src/assets/brand/vsfit-logo.png" 
              alt="VSFit Logo" 
              className="w-full h-full object-contain p-2"
            />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            VSFit <span className="text-vs-primary">Personal</span>
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <nav className="flex items-center gap-6">
            {navLinks.map(link => (
              <a 
                key={link.name} 
                href={link.href} 
                className="text-sm font-medium text-vs-muted hover:text-white transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3 pl-6 border-l border-white/10">
            <a 
              href="/auth/login" 
              className="text-sm font-medium text-white/70 hover:text-white transition-colors px-4 py-2"
            >
              Entrar
            </a>
            <DeviceAwareCTA className="py-2 px-4 text-xs h-9" />
          </div>
        </div>

        {/* Mobile Trigger */}
        <div className="md:hidden flex items-center gap-3">
          <DeviceAwareCTA className="py-2 px-3 text-xs h-9" />
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-0 right-0 bg-[#090909] border-b border-white/10 p-4 md:hidden"
          >
            <nav className="flex flex-col gap-2">
              {navLinks.map(link => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-3 rounded-xl text-vs-muted hover:text-white hover:bg-white/5 transition-all"
                >
                  {link.name}
                </a>
              ))}
              <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-3">
                <a 
                  href="/auth/login" 
                  className="w-full py-3 text-center rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-all"
                >
                  Entrar
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
