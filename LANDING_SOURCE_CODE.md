# Código-fonte atual da Landing Page

## Arquivo: package.json
```json
{
  "name": "vsfit-temp",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@capacitor/assets": "^3.0.5",
    "@capacitor/cli": "^8.4.1",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "autoprefixer": "^10.5.0",
    "postcss": "^8.5.15",
    "tailwindcss": "^3.4.19",
    "typescript": "~6.0.2",
    "vite": "^8.0.12"
  },
  "dependencies": {
    "@capacitor/android": "^8.4.1",
    "@capacitor/core": "^8.4.1",
    "@supabase/supabase-js": "^2.108.1",
    "framer-motion": "^12.40.0",
    "lucide-react": "^1.17.0",
    "react-router-dom": "^6.30.4",
    "zustand": "^5.0.14"
  },
  "allowScripts": {
    "sharp@0.32.6": true
  }
}
```

## Arquivo: src/pages/LandingPage.tsx
```tsx
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingHero } from '../components/landing/LandingHero';
import { PersonalFeatures } from '../components/landing/PersonalFeatures';
import { StudentFeatures } from '../components/landing/StudentFeatures';
import { DynamicInstallGuide } from '../components/landing/DynamicInstallGuide';
import { LandingFAQ, LandingSecurity } from '../components/landing/LandingFAQ';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-vs-primary/30">
      <LandingHeader />
      <main>
        <LandingHero />
        <PersonalFeatures />
        <StudentFeatures />
        
        {/* Dynamic Installation Section */}
        <section id="install" className="py-24 px-4 bg-[#0D0D0F]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6">Comece agora</h2>
            <p className="text-vs-muted mb-12">Escolha a melhor forma de acessar a plataforma no seu dispositivo.</p>
            <DynamicInstallGuide />
          </div>
        </section>

        <LandingFAQ />
        <LandingSecurity />
      </main>
      
      <footer className="py-12 px-4 border-t border-white/5 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 overflow-hidden rounded-lg bg-white/5 flex items-center justify-center">
              <img src="/src/assets/brand/vsfit-logo.png" alt="VSFit" className="w-full h-full object-contain p-1" />
            </div>
            <span className="text-white font-bold text-sm tracking-tight">
              VSFit <span className="text-vs-primary">Personal</span>
            </span>
          </div>
          <p className="text-vs-muted text-xs">&copy; {new Date().getFullYear()} VSFit Personal. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
```

## Arquivo: src/components/landing/LandingHeader.tsx
```tsx
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
```

## Arquivo: src/components/landing/LandingHero.tsx
```tsx
import { motion } from 'framer-motion';
import { DeviceAwareCTA } from './DeviceAwareCTA';
import { CheckCircle2 } from 'lucide-react';

export function LandingHero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-vs-primary/10 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-vs-primary/5 blur-[100px] rounded-full -z-10" />

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center lg:text-left flex flex-col items-center lg:items-start"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-vs-muted text-xs font-medium mb-6 tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-vs-primary animate-pulse" />
            Plataforma Fitness Completa
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6 tracking-tight">
            Treinos, <span className="text-vs-primary">evolução</span> e gestão em um só lugar.
          </h1>

          <p className="text-lg text-vs-muted mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            O VSFit conecta personal trainers e alunos com treinos personalizados, acompanhamento de progresso, nutrição, chat e gestão financeira.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <DeviceAwareCTA className="w-full sm:w-auto h-14 px-8 text-base" />
            <a 
              href="/auth/login" 
              className="w-full sm:w-auto px-8 h-14 rounded-2xl font-bold text-white border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-center flex items-center justify-center"
            >
              Acessar versão web
            </a>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full sm:w-auto">
            {[
              'Treinos personalizados',
              'Progresso em tempo real',
              'Comunicação direta'
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-vs-muted font-medium bg-white/5 px-3 py-2 rounded-full border border-white/5">
                <CheckCircle2 className="w-3 h-3 text-vs-primary" />
                {benefit}
              </div>
            ))}
          </div>

          <p className="mt-8 text-[11px] text-vs-muted/60 italic text-center lg:text-left">
            Desenvolvido para personal trainers que desejam profissionalizar o atendimento.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative flex justify-center items-center"
        >
          {/* Device Mockup Container */}
          <div className="relative w-full max-w-[320px] aspect-[9/19] bg-[#0D0D0F] border-[8px] border-[#1A1A1A] rounded-[40px] shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1A1A1A] rounded-b-2xl z-20" />
            
            {/* Mockup screens with subtle floating animation */}
            <motion.div 
              animate={{ y: [0, -15, 0] }} 
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-full h-full overflow-hidden bg-black"
            >
               <img 
                 src="/landing/dashboard.webp" 
                 alt="VSFit Dashboard" 
                 className="w-full h-full object-cover"
                 onError={(e) => {
                   e.currentTarget.src = "https://via.placeholder.com/360x780/0D0D0F/FFFFFF?text=VSFit+Dashboard";
                 }}
               />
            </motion.div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-vs-primary/20 blur-[100px] rounded-full" />
        </motion.div>
      </div>
    </section>
  );
}
```

## Arquivo: src/components/landing/PersonalFeatures.tsx
```tsx
import { Users, Layout, Activity, Utensils, CreditCard, Share2 } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-vs-primary/30 transition-all group cursor-default">
      <div className="w-12 h-12 rounded-2xl bg-vs-primary/10 flex items-center justify-center text-vs-primary mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-white font-bold mb-2">{title}</h3>
      <p className="text-vs-muted text-sm leading-relaxed">{description}</p>
    </div>
  );
}

export function PersonalFeatures() {
  const features = [
    { icon: <Users className="w-6 h-6" />, title: 'Gestão de alunos', description: 'Cadastre, acompanhe e organize todos os seus alunos.' },
    { icon: <Layout className="w-6 h-6" />, title: 'Montador de treinos', description: 'Crie, publique e atualize treinos personalizados.' },
    { icon: <Activity className="w-6 h-6" />, title: 'Progresso e biometria', description: 'Acompanhe medidas, fotos e evolução corporal.' },
    { icon: <Utensils className="w-6 h-6" />, title: 'Nutrição', description: 'Disponibilize planos alimentares organizados.' },
    { icon: <CreditCard className="w-6 h-6" />, title: 'Financeiro', description: 'Controle cobranças, pagamentos e mensalidades.' },
    { icon: <Share2 className="w-6 h-6" />, title: 'Captação de alunos', description: 'Compartilhe seu link e transforme visitantes em novos alunos.' },
  ];

  return (
    <section id="personal" className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-vs-primary text-xs font-bold uppercase tracking-widest mb-3 block">Para Personal Trainers</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">Menos planilhas. <span className="text-vs-primary">Mais resultados.</span></h2>
          <p className="text-vs-muted max-w-2xl mx-auto">Organize alunos, treinos, avaliações, pagamentos e comunicação em uma plataforma profissional.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <FeatureCard key={i} icon={f.icon} title={f.title} description={f.description} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

## Arquivo: src/components/landing/StudentFeatures.tsx
```tsx
import { Timer, History, Camera, Utensils, MessageSquare, Trophy } from 'lucide-react';

export function StudentFeatures() {
  const highlights = [
    { icon: <Timer className="w-5 h-5" />, text: 'Cronômetro de treino' },
    { icon: <History className="w-5 h-5" />, text: 'Histórico de exercícios' },
    { icon: <Camera className="w-5 h-5" />, text: 'Fotos de evolução' },
    { icon: <Utensils className="w-5 h-5" />, text: 'Plano alimentar' },
    { icon: <MessageSquare className="w-5 h-5" />, text: 'Chat com o personal' },
    { icon: <Trophy className="w-5 h-5" />, text: 'Conquistas e sequência' },
  ];

  return (
    <section id="student" className="py-24 px-4 bg-[#090909]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="text-center lg:text-left">
          <span className="text-vs-primary text-xs font-bold uppercase tracking-widest mb-3 block">Para Alunos</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">Seu acompanhamento <span className="text-vs-primary">na palma da mão.</span></h2>
          <p className="text-vs-muted mb-12 max-w-xl mx-auto lg:mx-0">O aluno recebe treinos, acompanha a evolução, visualiza o plano alimentar e conversa com o personal.</p>
          
          <div className="grid grid-cols-2 gap-4">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-vs-primary">{h.icon}</span>
                <span className="text-white text-sm font-medium">{h.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex justify-center">
          <div className="relative w-full max-w-[300px] aspect-[9/19] bg-[#0D0D0F] border-[8px] border-[#1A1A1A] rounded-[40px] shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1A1A1A] rounded-b-2xl z-20" />
            <img 
              src="/landing/student-home.webp" 
              alt="VSFit Student App" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/360x780/0D0D0F/FFFFFF?text=Student+View";
              }}
            />
          </div>
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-vs-primary/10 blur-[80px] rounded-full" />
        </div>
      </div>
    </section>
  );
}
```

## Arquivo: src/components/landing/DynamicInstallGuide.tsx
```tsx
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { QrCode, Smartphone, Download, Share, Info } from 'lucide-react';

export function DynamicInstallGuide() {
  const { isAndroid, isIOS, isStandalone } = useDeviceDetection();

  if (isStandalone) {
    return (
      <div className="text-center p-8 rounded-3xl bg-white/5 border border-white/10">
        <div className="w-16 h-16 bg-vs-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Smartphone className="w-8 h-8 text-vs-primary" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">App Instalado!</h3>
        <p className="text-vs-muted">Você já está acessando o VSFit como um aplicativo.</p>
      </div>
    );
  }

  if (isAndroid) {
    const url = import.meta.env.VITE_ANDROID_APK_URL || '/downloads/vsfit-personal.apk';
    return (
      <div className="text-center p-8 rounded-3xl bg-white/5 border border-white/10">
        <div className="w-16 h-16 bg-vs-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Download className="w-8 h-8 text-vs-primary" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Baixar para Android</h3>
        <p className="text-vs-muted mb-6">Instale o APK para ter a melhor experiência no seu Android.</p>
        <a 
          href={url}
          className="inline-flex items-center gap-2 px-8 py-4 bg-vs-primary text-white font-bold rounded-2xl hover:bg-red-600 transition-all"
        >
          <Download className="w-5 h-5" />
          Baixar APK Agora
        </a>
        <div className="mt-6 text-left p-4 rounded-2xl bg-black/40 border border-white/5">
          <div className="flex items-center gap-2 text-vs-primary mb-2">
            <Info className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Dica de Instalação</span>
          </div>
          <p className="text-xs text-vs-muted leading-relaxed">
            Se o Android bloquear a instalação, vá em <span className="text-white font-medium">Configurações &gt; Segurança &gt; Instalar apps desconhecidos</span> e autorize o seu navegador.
          </p>
        </div>
      </div>
    );
  }

  if (isIOS) {
    return (
      <div className="text-center p-8 rounded-3xl bg-white/5 border border-white/10">
        <div className="w-16 h-16 bg-vs-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Share className="w-8 h-8 text-vs-primary" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Instalar no iPhone</h3>
        <p className="text-vs-muted mb-6">Adicione o VSFit à sua tela de início para acesso rápido.</p>
        
        <div className="grid grid-cols-1 gap-3 text-left mb-6">
          {[
            { step: '1', icon: <Smartphone className="w-4 h-4" />, text: 'Abra este site no Safari' },
            { step: '2', icon: <Share className="w-4 h-4" />, text: 'Toque no ícone de Compartilhar' },
            { step: '3', icon: <Download className="w-4 h-4" />, text: 'Selecione "Adicionar à Tela de Início"' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="w-6 h-6 rounded-full bg-vs-primary text-white text-[10px] flex items-center justify-center font-bold shrink-0">{s.step}</span>
              <span className="text-sm text-white font-medium">{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Desktop: QR Code + Options
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-white/5 border border-white/10">
        <div className="p-4 bg-white rounded-2xl mb-4">
          <div className="w-32 h-32 bg-black flex items-center justify-center">
            <QrCode className="w-24 h-24 text-black" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Acesse no Celular</h3>
        <p className="text-vs-muted text-sm">Escaneie o código para instalar agora.</p>
      </div>

      <div className="space-y-4">
        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-vs-primary/10 text-vs-primary">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold">Android</p>
              <p className="text-vs-muted text-xs">Baixe o APK oficial</p>
            </div>
          </div>
          <a 
            href={import.meta.env.VITE_ANDROID_APK_URL || '/downloads/vsfit-personal.apk'}
            className="p-3 rounded-xl bg-white text-black hover:bg-gray-200 transition-colors"
          >
            <Download className="w-5 h-5" />
          </a>
        </div>

        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-vs-primary/10 text-vs-primary">
              <Share className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold">iOS (iPhone)</p>
              <p className="text-vs-muted text-xs">Instalação via PWA</p>
            </div>
          </div>
          <span className="text-vs-muted text-xs font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10">
            Via Safari
          </span>
        </div>
      </div>
    </div>
  );
}
```

## Arquivo: src/components/landing/DeviceAwareCTA.tsx
```tsx
import React, { useState } from 'react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, Download, Smartphone, ArrowRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DeviceAwareCTAProps {
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function DeviceAwareCTA({ className, onClick }: DeviceAwareCTAProps) {
  const { isAndroid, isIOS, isStandalone } = useDeviceDetection();
  const [showIosModal, setShowIosModal] = useState(false);

  const getCTAConfig = () => {
    if (isStandalone) {
      return { text: 'Abrir VSFit', action: () => window.location.href = '/auth/login', variant: 'primary' };
    }
    if (isAndroid) {
      const url = import.meta.env.VITE_ANDROID_APK_URL || '/downloads/vsfit-personal.apk';
      return { text: 'Baixar APK para Android', action: () => window.location.href = url, variant: 'primary' };
    }
    if (isIOS) {
      return { text: 'Instalar no iPhone', action: () => setShowIosModal(true), variant: 'primary' };
    }
    return { text: 'Instalar no celular', action: () => document.getElementById('install-section')?.scrollIntoView({ behavior: 'smooth' }), variant: 'primary' };
  };

  const config = getCTAConfig();

  return (
    <>
      <button 
        onClick={(e) => {
          if(onClick) onClick(e);
          config.action();
        }}
        className={cn(
          "px-6 py-3 rounded-2xl font-bold transition-all duration-300 active:scale-95 flex items-center justify-center gap-2",
          "bg-vs-primary text-white hover:bg-red-600 shadow-lg shadow-red-900/20",
          className
        )}
      >
        {config.text}
        <ArrowRight className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {showIosModal && (
          <IOSInstallModal onClose={() => setShowIosModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function IOSInstallModal({ onClose }: { onClose: () => void }) {
  const { isSafari } = useDeviceDetection();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-[#0D0D0F] border border-white/10 rounded-t-[32px] sm:rounded-[32px] w-full max-w-md p-8 relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-vs-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-vs-primary" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Instalar no iPhone</h3>
          <p className="text-vs-muted">Siga os passos para adicionar o VSFit à sua tela de início.</p>
        </div>

        {!isSafari ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 text-center">
            <p className="text-red-400 text-sm font-medium">
              Para instalar o VSFit no iPhone, abra esta página no Safari.
            </p>
          </div>
        ) : null}

        <div className="space-y-4 mb-8">
          {[
            { step: '1', icon: <Smartphone className="w-5 h-5" />, text: 'Abra esta página no Safari' },
            { step: '2', icon: <Share className="w-5 h-5" />, text: 'Toque no botão Compartilhar' },
            { step: '3', icon: <Download className="w-5 h-5" />, text: 'Escolha "Adicionar à Tela de Início"' },
            { step: '4', icon: <ArrowRight className="w-5 h-5" />, text: 'Toque em "Adicionar"' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="w-8 h-8 rounded-full bg-vs-primary flex items-center justify-center text-white font-bold text-xs shrink-0">
                {item.step}
              </div>
              <div className="flex items-center gap-3 text-white font-medium">
                <span className="text-vs-primary">{item.icon}</span>
                {item.text}
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-colors"
        >
          Entendi
        </button>
      </motion.div>
    </motion.div>
  );
}
```

## Arquivo: src/components/landing/LandingFAQ.tsx
```tsx
import { motion } from 'framer-motion';
import { HelpCircle, Lock, Eye, Cloud } from 'lucide-react';

const FAQS = [
  {
    question: 'O VSFit é gratuito para alunos?',
    answer: 'O acesso ao aplicativo é gratuito para alunos convidados por seus personal trainers. O personal trainer utiliza a plataforma para gerir seus alunos de forma profissional.'
  },
  {
    question: 'Preciso de Android ou iOS?',
    answer: 'O VSFit é compatível com ambos. No Android, recomendamos o uso do APK para melhor performance. No iOS, utilizamos a tecnologia PWA, que permite adicionar o app à tela de início via Safari.'
  },
  {
    question: 'Meus dados estão seguros?',
    answer: 'Sim. Utilizamos Supabase com autenticação JWT e políticas de RLS (Row Level Security) rigorosas, garantindo que cada aluno veja apenas seus próprios treinos e dados.'
  },
  {
    question: 'Como funciona o plano alimentar?',
    answer: 'O personal trainer cadastra a dieta do aluno dentro da plataforma, e o aluno recebe notificações e acesso imediato às refeições e orientações nutricionais.'
  },
  {
    question: 'Posso usar em mais de um dispositivo?',
    answer: 'Sim, você pode acessar sua conta em qualquer dispositivo via navegador, mas a melhor experiência é instalando o app no celular.'
  },
  {
    question: 'Como o Personal Trainer começa a usar?',
    answer: 'Basta criar uma conta e começar a cadastrar seus alunos. A plataforma é intuitiva e permite a montagem de treinos em poucos minutos.'
  }
];

export function LandingFAQ() {
  return (
    <section id="faq" className="py-24 px-4 bg-[#050505]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-vs-primary text-xs font-bold uppercase tracking-widest mb-3 block">Dúvidas</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">Perguntas <span className="text-vs-primary">Frequentes</span></h2>
          <p className="text-vs-muted">Tudo o que você precisa saber sobre a plataforma VSFit.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FAQS.map((faq, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-vs-primary/10 text-vs-primary shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-2">{faq.question}</h3>
                  <p className="text-vs-muted text-sm leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingSecurity() {
  return (
    <section className="py-20 px-4 bg-[#0D0D0F] border-y border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-vs-primary/10 flex items-center justify-center text-vs-primary mb-6">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-white font-bold text-lg mb-3">Criptografia de Ponta</h3>
            <p className="text-vs-muted text-sm">Dados protegidos com os mais altos padrões de segurança da indústria.</p>
          </div>
          <div className="flex flex-col items-center text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-vs-primary/10 flex items-center justify-center text-vs-primary mb-6">
              <Eye className="w-7 h-7" />
            </div>
            <h3 className="text-white font-bold text-lg mb-3">Privacidade Total</h3>
            <p className="text-vs-muted text-sm">Controle total sobre quem acessa as informações de cada aluno.</p>
          </div>
          <div className="flex flex-col items-center text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-vs-primary/10 flex items-center justify-center text-vs-primary mb-6">
              <Cloud className="w-7 h-7" />
            </div>
            <h3 className="text-white font-bold text-lg mb-3">Sincronização Cloud</h3>
            <p className="text-vs-muted text-sm">Seus dados seguros na nuvem, acessíveis de qualquer lugar do mundo.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

## Arquivo: src/components/brand/BrandMark.tsx
```tsx
import type { HTMLAttributes } from 'react';

import vsfitLogo from '../../assets/brand/vsfit-logo.png';
import { cn } from '../../lib/utils';

type BrandMarkSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl';

interface BrandMarkProps
  extends HTMLAttributes<HTMLDivElement> {
  size?: BrandMarkSize;
}

const sizeClasses: Record<BrandMarkSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

export function BrandMark({
  size = 'md',
  className,
  ...props
}: BrandMarkProps) {
  return (
    <div
      {...props}
      className={cn(
        'relative shrink-0 overflow-hidden bg-transparent',
        sizeClasses[size],
        className
      )}
    >
      <img
        src={vsfitLogo}
        alt="VSFit"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
      />
    </div>
  );
}

export default BrandMark;
```

## Arquivo: src/components/ui/Button.tsx
```tsx
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'font-semibold rounded-xl active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2';

  const variants = {
    primary: 'bg-vs-primary text-white',
    secondary: 'bg-white/5 text-white border border-vs-border',
    ghost: 'text-vs-muted hover:text-white',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3.5 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
```

## Arquivo: src/components/ui/Card.tsx
```tsx
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: boolean;
}

export function Card({ children, className, onClick, padding = true }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card',
        padding && 'p-4',
        onClick && 'cursor-pointer active:scale-[0.99] transition-transform',
        className
      )}
    >
      {children}
    </div>
  );
}
```

## Arquivo: src/app/routes.tsx
```tsx
import {
  createBrowserRouter,
  Navigate,
} from 'react-router-dom';

import { MobileShell } from '../components/layout/MobileShell';
import { PersonalShell } from '../components/layout/PersonalShell';
import { StudentShell } from '../components/layout/StudentShell';
import { AdminShell } from '../components/layout/AdminShell';

import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { StudentLoginPage } from '../pages/auth/StudentLoginPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';

import { DashboardPage } from '../pages/personal/DashboardPage';
import { StudentsPage } from '../pages/personal/StudentsPage';
import { StudentProfilePage } from '../pages/personal/StudentProfilePage';
import { WorkoutBuilderPage } from '../pages/personal/WorkoutBuilderPage';
import { ExerciseLibraryPage } from '../pages/personal/ExerciseLibraryPage';
import { NutritionPage } from '../pages/personal/NutritionPage';
import { ProgressPage } from '../pages/personal/ProgressPage';
import { FinancialPage } from '../pages/personal/FinancialPage';
import { ChatPage } from '../pages/personal/ChatPage';
import { SignupLinksPage } from '../pages/personal/SignupLinksPage';
import { ReportsPage } from '../pages/personal/ReportsPage';
import { TrainerProfilePage } from '../pages/personal/TrainerProfilePage';
import { SubscriptionPage } from '../pages/personal/SubscriptionPage';
import { NotificationsPage } from '../pages/personal/NotificationsPage';

import { SignupPublicPage } from '../pages/public/SignupPublicPage';

import { StudentHomePage } from '../pages/student/StudentHomePage';
import { StudentWorkoutsPage } from '../pages/student/StudentWorkoutsPage';
import { WorkoutDetailPage } from '../pages/student/WorkoutDetailPage';
import { WorkoutExecutionPage } from '../pages/student/WorkoutExecutionPage';
import { WorkoutCompletedPage } from '../pages/student/WorkoutCompletedPage';
import { StudentProgressPage } from '../pages/student/StudentProgressPage';
import { StudentChatPage } from '../pages/student/StudentChatPage';
import {
  StudentProfilePage as StudentProfile,
} from '../pages/student/StudentProfilePage';
import {
  NutritionPage as StudentNutritionPage,
} from '../pages/student/NutritionPage';

import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { TrainersPage } from '../pages/admin/TrainersPage';
import { TrainerApprovalPage } from '../pages/admin/TrainerApprovalPage';
import { AdminSubscriptionsPage } from '../pages/admin/AdminSubscriptionsPage';
import { AdminFinancialPage } from '../pages/admin/AdminFinancialPage';
import { AdminReportsPage } from '../pages/admin/AdminReportsPage';

import LandingPage from '../pages/LandingPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },

  {
    path: '/auth',
    element: <MobileShell />,
    children: [
      {
        index: true,
        element: (
          <Navigate
            to="/auth/login"
            replace
          />
        ),
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'student-login',
        element: <StudentLoginPage />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
      },
    ],
  },

  {
    path: '/personal',
    element: <PersonalShell />,
    children: [
      {
        index: true,
        element: (
          <Navigate
            to="/personal/dashboard"
            replace
          />
        ),
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'students',
        element: <StudentsPage />,
      },
      {
        path: 'students/:id',
        element: <StudentProfilePage />,
      },
      {
        path: 'workout-builder',
        element: <WorkoutBuilderPage />,
      },
      {
        path: 'exercise-library',
        element: <ExerciseLibraryPage />,
      },
      {
        path: 'nutrition',
        element: <NutritionPage />,
      },
      {
        path: 'progress',
        element: <ProgressPage />,
      },
      {
        path: 'financial',
        element: <FinancialPage />,
      },
      {
        path: 'chat',
        element: <ChatPage />,
      },
      {
        path: 'signup-links',
        element: <SignupLinksPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'profile',
        element: <TrainerProfilePage />,
      },
      {
        path: 'trainer-profile',
        element: <TrainerProfilePage />,
      },
      {
        path: 'subscription',
        element: <SubscriptionPage />,
      },
    ],
  },

  {
    path: '/student',
    element: <StudentShell />,
    children: [
      {
        index: true,
        element: (
          <Navigate
            to="/student/home"
            replace
          />
        ),
      },
      {
        path: 'home',
        element: <StudentHomePage />,
      },
      {
        path: 'workouts',
        element: <StudentWorkoutsPage />,
      },
      {
        path: 'workout-detail/:id',
        element: <WorkoutDetailPage />,
      },
      {
        path: 'workout-execution/:id',
        element: <WorkoutExecutionPage />,
      },
      {
        path: 'workout-completed/:id',
        element: <WorkoutCompletedPage />,
      },
      {
        path: 'progress',
        element: <StudentProgressPage />,
      },
      {
        path: 'nutrition',
        element: <StudentNutritionPage />,
      },
      {
        path: 'chat',
        element: <StudentChatPage />,
      },
      {
        path: 'profile',
        element: <StudentProfile />,
      },
      {
        path: 'profile/:id',
        element: <StudentProfile />,
      },
    ],
  },

  {
    path: '/admin',
    element: <AdminShell />,
    children: [
      {
        index: true,
        element: (
          <Navigate
            to="/admin/dashboard"
            replace
          />
        ),
      },
      {
        path: 'dashboard',
        element: <AdminDashboardPage />,
      },
      {
        path: 'trainers',
        element: <TrainersPage />,
      },
      {
        path: 'trainers/:id/approve',
        element: <TrainerApprovalPage />,
      },
      {
        path: 'subscriptions',
        element: <AdminSubscriptionsPage />,
      },
      {
        path: 'financial',
        element: <AdminFinancialPage />,
      },
      {
        path: 'reports',
        element: <AdminReportsPage />,
      },
    ],
  },

  {
    path: '/public/signup',
    element: <SignupPublicPage />,
  },

  {
    path: '*',
    element: (
      <Navigate
        to="/"
        replace
      />
    ),
  },
]);

export default router;
```

## Arquivo: src/app/App.tsx
```tsx
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useAuthStore } from '../store/authStore';
import { LoadingScreen } from '../components/ui/LoadingScreen';

export function App() {
  const { isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <RouterProvider router={router} />;
}
```

## Arquivo: src/main.tsx
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

## Arquivo: src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    -webkit-tap-highlight-color: transparent;
    scroll-behavior: smooth;
  }

  body {
    @apply bg-vs-dark text-vs-text font-sans antialiased;
  }

  input, textarea, select {
    @apply outline-none;
  }
}

@layer components {
  .glass-card {
    @apply bg-vs-card border border-vs-border rounded-2xl backdrop-blur-sm;
  }

  .btn-primary {
    @apply bg-vs-primary text-white font-semibold rounded-xl px-6 py-3.5 
           active:scale-[0.98] transition-all duration-150 
           disabled:opacity-50 disabled:cursor-not-allowed
           text-base w-full;
  }

  .btn-secondary {
    @apply bg-white/5 text-white font-semibold rounded-xl px-6 py-3.5 
           border border-vs-border active:scale-[0.98] transition-all duration-150 
           text-base w-full;
  }

  .btn-ghost {
    @apply text-vs-muted font-medium rounded-xl px-4 py-2 
           active:bg-white/5 transition-all duration-150 text-sm;
  }

  .input-field {
    @apply w-full bg-vs-dark-2 border border-vs-border rounded-xl px-4 py-3.5 
           text-white placeholder-vs-muted/60 text-base
           focus:border-vs-primary focus:ring-1 focus:ring-vs-primary/30
           transition-all duration-150;
  }


  .chip {
    @apply px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-vs-border;
  }

  .chip-active {
    @apply bg-vs-primary/20 text-vs-primary border-vs-primary/30;
  }

  .bottom-nav {
    @apply fixed bottom-0 left-0 right-0 z-50 
           bg-vs-dark-2/95 backdrop-blur-xl border-t border-vs-border
           safe-area-bottom;
  }

  .page-container {
    @apply px-4 pb-28 pt-4 max-w-lg mx-auto;
  }

  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
}

@layer utilities {
  .text-gradient {
    @apply bg-clip-text text-transparent bg-gradient-to-r from-vs-primary to-orange-500;
  }

  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }

  .input-autocomplete-fix {
    -webkit-box-shadow: 0 0 0px 1000px var(--vs-dark-2) inset !important;
    box-shadow: 0 0 0px 1000px var(--vs-dark-2) inset !important;
  }
}
```

## Arquivo: tailwind.config.js
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        vs: {
          dark: "#050505",
          "dark-2": "#080808",
          card: "rgba(255,255,255,0.04)",
          border: "rgba(255,255,255,0.10)",
          primary: "#ff2a32",
          text: "#ffffff",
          muted: "#a1a1aa",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "glass-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
      },
    },
  },
  plugins: [],
};
```

## Arquivo: index.html
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
    />

    <meta
      name="theme-color"
      content="#050505"
    />

    <meta
      name="description"
      content="VSFit Personal — plataforma para personal trainers e alunos."
    />

    <meta
      name="application-name"
      content="VSFit Personal"
    />

    <meta
      name="mobile-web-app-capable"
      content="yes"
    />

    <meta
      name="apple-mobile-web-app-capable"
      content="yes"
    />

    <meta
      name="apple-mobile-web-app-title"
      content="VSFit"
    />

    <meta
      name="apple-mobile-web-app-status-bar-style"
      content="black-translucent"
    />

    <link
      rel="icon"
      type="image/png"
      href="/favicon.png"
    />

    <link
      rel="apple-touch-icon"
      sizes="180x180"
      href="/apple-touch-icon.png"
    />

    <link
      rel="manifest"
      href="/manifest.json"
    />

    <link
      rel="preconnect"
      href="https://fonts.googleapis.com"
    />

    <link
      rel="preconnect"
      href="https://fonts.gstatic.com"
      crossorigin
    />

    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
      rel="stylesheet"
    />

    <title>VSFit Personal</title>
  </head>

  <body class="bg-vs-dark text-vs-text">
    <div id="root"></div>

    <script
      type="module"
      src="/src/main.tsx"
    ></script>
  </body>
</html>
```

## Arquivo: public/manifest.json
```json
{
  "id": "/",
  "name": "VSFit Personal",
  "short_name": "VSFit",
  "description": "Plataforma fitness para personal trainers e alunos.",
  "lang": "pt-BR",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#050505",
  "theme_color": "#050505",
  "categories": [
    "fitness",
    "health",
    "sports"
  ],
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "1024x1024",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "1024x1024",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "1024x1024",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

## Arquivo: src/hooks/useDeviceDetection.ts
```ts
import { useState, useEffect } from 'react';

export type DeviceInfo = {
  isAndroid: boolean;
  isIOS: boolean;
  isDesktop: boolean;
  isStandalone: boolean;
  isSafari: boolean;
};

export function useDeviceDetection(): DeviceInfo {
  const [device, setDevice] = useState<DeviceInfo>({
    isAndroid: false,
    isIOS: false,
    isDesktop: true,
    isStandalone: false,
    isSafari: false,
  });

  useEffect(() => {
    const detect = () => {
      const userAgent = navigator.userAgent || navigator.vendor || '';
      
      const isAndroid = /android/i.test(userAgent);
      
      const isIOS = 
        /iPad|iPhone|iPod/i.test(userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
      const isSafari = 
        /Safari/i.test(userAgent) && 
        !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);

      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches || 
        Boolean((navigator as any).standalone);

      const isDesktop = !isAndroid && !isIOS;

      setDevice({
        isAndroid,
        isIOS,
        isDesktop,
        isStandalone,
        isSafari,
      });
    };

    detect();

    const matchMediaListener = () => {
      setDevice(prev => ({
        ...prev,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as any).standalone)
      }));
    };

    window.matchMedia('(display-mode: standalone)').addEventListener('change', matchMediaListener);
    return () => window.matchMedia('(display-mode: standalone)').removeEventListener('change', matchMediaListener);
  }, []);

  return device;
}
```

## Arquivo: src/lib/planLimits.ts
```ts
export type PlanSlug = 'free' | 'pro' | 'premium';

export type FinancialLevel = 'none' | 'basic' | 'advanced';

export interface PlanLimits {
  students: number;
  signupLinks: number;
  financial: boolean;
  financialLevel: FinancialLevel;
  reports: boolean;
  advancedProgress: boolean;
  capture: boolean;
  features?: string[];
}

export const PLAN_LIMITS: Record<PlanSlug, PlanLimits> = {
  free: {
    students: 1,
    signupLinks: 0,
    financial: false,
    financialLevel: 'none',
    reports: false,
    advancedProgress: false,
    capture: false,
    features: [
      '1 aluno',
      'Biblioteca de exercícios',
      'Montador de treinos',
    ],
  },

  pro: {
    students: 3,
    signupLinks: 3,
    financial: true,
    financialLevel: 'basic',
    reports: false,
    advancedProgress: false,
    capture: true,
    features: [
      'Até 3 alunos',
      'Biblioteca completa',
      'Montador de treinos',
      'Chat com alunos',
      'Financeiro básico',
      'Captação de alunos (3 links)',
    ],
  },

  premium: {
    students: Infinity,
    signupLinks: Infinity,
    financial: true,
    financialLevel: 'advanced',
    reports: true,
    advancedProgress: true,
    capture: true,
    features: [
      'Alunos ilimitados',
      'Biblioteca completa',
      'Montador de treinos',
      'Chat completo',
      'Financeiro avançado',
      'Captação ilimitada',
      'Relatórios avançados',
      'Recursos premium',
    ],
  },
};

export function normalizePlanSlug(planSlug?: string): PlanSlug {
  const normalized = String(planSlug || 'free').toLowerCase();

  if (normalized === 'premium') return 'premium';
  if (normalized === 'pro') return 'pro';

  return 'free';
}

export function getPlanLimits(planSlug?: string): PlanLimits {
  const normalized = normalizePlanSlug(planSlug);
  return PLAN_LIMITS[normalized];
}

export function getStudentLimit(planSlug?: string): number {
  return getPlanLimits(planSlug).students;
}

export function getSignupLinkLimit(planSlug?: string): number {
  return getPlanLimits(planSlug).signupLinks;
}

export function canAccessFeature(
  planSlug: string | undefined,
  feature: 'financial' | 'reports' | 'advancedProgress' | 'capture'
): boolean {
  const limits = getPlanLimits(planSlug);
  return limits[feature] === true;
}

export function getFinancialLevel(planSlug?: string): FinancialLevel {
  return getPlanLimits(planSlug).financialLevel;
}

export function canAccessBasicFinancial(planSlug?: string): boolean {
  const level = getFinancialLevel(planSlug);
  return level === 'basic' || level === 'advanced';
}

export function canAccessAdvancedFinancial(planSlug?: string): boolean {
  return getFinancialLevel(planSlug) === 'advanced';
}

export function canCreateStudent(planSlug: string | undefined, currentStudentCount: number): boolean {
  const limit = getStudentLimit(planSlug);

  if (limit === Infinity) return true;

  return currentStudentCount < limit;
}

export function formatPlanLimit(value: number): string {
  if (value === Infinity || value >= 999999) return 'Ilimitado';

  return String(value);
}
```

## Arquivo: src/services/subscriptionService.ts
```ts
import { supabase } from '../lib/supabase';
import { PLAN_LIMITS, normalizePlanSlug, type PlanSlug } from '../lib/planLimits';

export interface Subscription {
  id?: string;
  trainer_id: string;
  plan_slug: string;
  status: string;
  payment_provider?: string | null;
  mercadopago_preapproval_id?: string | null;
  mercadopago_plan_id?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SubscriptionPlanWithLimits {
  id?: string;
  slug: PlanSlug;
  name: string;
  description?: string | null;
  price_monthly: number;
  student_limit: number;
  features: string[] | string;
  is_active?: boolean;
}

const FALLBACK_PLANS: SubscriptionPlanWithLimits[] = [
  {
    slug: 'free',
    name: 'Free',
    description: 'Para começar com 1 aluno',
    price_monthly: 0,
    student_limit: 1,
    features: ['1 aluno', 'Biblioteca de exercícios', 'Montador de treinos'],
    is_active: true,
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'Para personal que está começando a crescer',
    price_monthly: 49.9,
    student_limit: 3,
    features: [
      'Até 3 alunos',
      'Biblioteca completa',
      'Montador de treinos',
      'Chat com alunos',
      'Financeiro básico',
      'Captação de alunos (3 links)',
    ],
    is_active: true,
  },
  {
    slug: 'premium',
    name: 'Premium',
    description: 'Para personal que quer escala total',
    price_monthly: 99.9,
    student_limit: 999999,
    features: [
      'Alunos ilimitados',
      'Biblioteca completa',
      'Montador de treinos',
      'Chat completo',
      'Financeiro completo',
      'Captação ilimitada',
      'Relatórios avançados',
      'Recursos premium',
    ],
    is_active: true,
  },
];

function isActiveStatus(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'active' || normalized === 'trialing' || normalized === 'authorized';
}

function normalizeDbPlanSlug(value?: string | null): PlanSlug {
  return normalizePlanSlug(String(value || 'free'));
}

export async function getCurrentSubscription(trainerId: string): Promise<Subscription | null> {
  try {
    if (!trainerId) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('trainer_id', trainerId);

    if (error) {
      console.error('[SubscriptionService] getCurrentSubscription error:', error);
      return null;
    }

    console.log('[SubscriptionService] Assinaturas encontradas no banco:', {
      trainerId,
      data,
    });

    if (!data || data.length === 0) {
      return null;
    }

    const activeSubscriptions = data.filter((item: any) => isActiveStatus(item.status));

    if (activeSubscriptions.length === 0) {
      return null;
    }

    const premium = activeSubscriptions.find(
      (item: any) => normalizeDbPlanSlug(item.plan_slug) === 'premium'
    );

    if (premium) return premium as Subscription;

    const pro = activeSubscriptions.find(
      (item: any) => normalizeDbPlanSlug(item.plan_slug) === 'pro'
    );

    if (pro) return pro as Subscription;

    return activeSubscriptions[0] as Subscription;
  } catch (error) {
    console.error('[SubscriptionService] getCurrentSubscription exception:', error);
    return null;
  }
}

export async function getCurrentPlanSlug(trainerId: string): Promise<PlanSlug> {
  try {
    const subscription = await getCurrentSubscription(trainerId);

    if (!subscription) {
      console.warn('[SubscriptionService] Nenhuma assinatura ativa encontrada:', trainerId);
      return 'free';
    }

    const planSlug = normalizeDbPlanSlug(subscription.plan_slug);

    console.log('[SubscriptionService] Plano atual encontrado:', {
      trainerId,
      planSlug,
      status: subscription.status,
      subscription,
    });

    return planSlug;
  } catch (error) {
    console.error('[SubscriptionService] getCurrentPlanSlug exception:', error);
    return 'free';
  }
}

export async function getAllSubscriptionPlans(): Promise<SubscriptionPlanWithLimits[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*');

    if (error) {
      console.warn('[SubscriptionService] getAllSubscriptionPlans usando fallback:', error);
      return FALLBACK_PLANS;
    }

    if (!data || data.length === 0) {
      return FALLBACK_PLANS;
    }

    const plans = data.map((plan: any) => {
      const slug = normalizeDbPlanSlug(plan.slug);
      const limits = PLAN_LIMITS[slug];

      return {
        id: plan.id,
        slug,
        name: plan.name || (slug === 'premium' ? 'Premium' : slug === 'pro' ? 'Pro' : 'Free'),
        description: plan.description || null,
        price_monthly:
          Number(plan.price_monthly ?? plan.price ?? (slug === 'premium' ? 99.9 : slug === 'pro' ? 49.9 : 0)),
        student_limit:
          Number(
            plan.student_limit ??
              plan.max_students ??
              (limits.students === Infinity ? 999999 : limits.students)
          ),
        features: plan.features || limits.features || [],
        is_active: plan.is_active ?? true,
      } as SubscriptionPlanWithLimits;
    });

    return plans.sort((a, b) => {
      const order: Record<string, number> = {
        free: 1,
        pro: 2,
        premium: 3,
      };

      return order[a.slug] - order[b.slug];
    });
  } catch (error) {
    console.error('[SubscriptionService] getAllSubscriptionPlans exception:', error);
    return FALLBACK_PLANS;
  }
}

export async function createCheckoutSession(planSlug: 'pro' | 'premium') {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      throw new Error('Usuário não autenticado. Faça login novamente.');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/create-mercadopago-subscription`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planSlug,
      }),
    });

    const text = await response.text();

    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error('[SubscriptionService] Mercado Pago checkout raw error:', {
        status: response.status,
        text,
        data,
      });

      throw new Error(data?.error || text || `Erro HTTP ${response.status} ao criar checkout.`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao criar assinatura no Mercado Pago.');
    }

    if (!data?.url) {
      throw new Error('Mercado Pago não retornou o link de checkout.');
    }

    return data.url as string;
  } catch (error) {
    console.error('[SubscriptionService] createCheckoutSession exception:', error);
    throw error;
  }
}

export async function refreshSubscription(trainerId: string): Promise<Subscription | null> {
  return await getCurrentSubscription(trainerId);
}

export async function canCreateStudent(
  trainerId: string,
  currentStudentCount: number
): Promise<boolean> {
  try {
    const planSlug = await getCurrentPlanSlug(trainerId);
    const limits = PLAN_LIMITS[planSlug];

    if (limits.students === Infinity) return true;

    return currentStudentCount < limits.students;
  } catch (error) {
    console.error('[SubscriptionService] canCreateStudent exception:', error);
    return false;
  }
}
```

## Arquivo: capacitor.config.ts
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vsfit.personal',
  appName: 'VSFit Personal',
  webDir: 'dist',
};

export default config;
```

---

## Checklist de verificação

### Arquivos que não existem
Nenhum dos 23 arquivos solicitados está faltando. Todos existem.

### Outros componentes importados diretamente pela LandingPage
A `LandingPage.tsx` importa apenas:
- `LandingHeader` (de `../components/landing/LandingHeader`)
- `LandingHero` (de `../components/landing/LandingHero`)
- `PersonalFeatures` (de `../components/landing/PersonalFeatures`)
- `StudentFeatures` (de `../components/landing/StudentFeatures`)
- `DynamicInstallGuide` (de `../components/landing/DynamicInstallGuide`)
- `LandingFAQ` e `LandingSecurity` (de `../components/landing/LandingFAQ`)

Nenhum outro componente é importado diretamente pela LandingPage.

### Imagens usadas pela LandingPage que não existem
- `/landing/dashboard.webp` (usado em `LandingHero.tsx:77`) — **NÃO EXISTE** (fallback para placeholder funciona via `onError`)
- `/landing/student-home.webp` (usado em `StudentFeatures.tsx:35`) — **NÃO EXISTE** (fallback para placeholder funciona via `onError`)
- `/src/assets/brand/vsfit-logo.png` — **EXISTE** em `src/assets/brand/vsfit-logo.png`
- `/downloads/vsfit-personal.apk` — **NÃO EXISTE** (fallback para `VITE_ANDROID_APK_URL`)
- `/icons/icon-192.png` — **EXISTE**
- `/icons/icon-512.png` — **EXISTE**
- `/icons/icon-maskable-512.png` — **EXISTE**
- `/favicon.png` — **EXISTE**
- `/apple-touch-icon.png` — **EXISTE**

### CSS específico da landing
Não existe CSS específico para a landing page. Todo o CSS global está em `src/index.css`. A landing usa apenas classes Tailwind inline e classes utilitárias globais (como `glass-card`, `btn-primary`, etc.).

### Rotas usadas nos botões da landing
- `/auth/login` — link "Entrar" no header e "Acessar versão web" no hero
- `/auth/login` — usado no `DeviceAwareCTA` quando `isStandalone` é true
- `#features`, `#personal`, `#student`, `#install`, `#faq` — links de navegação âncora (scroll suave)
- `/downloads/vsfit-personal.apk` — link de download Android (fallback sem `VITE_ANDROID_APK_URL`)
- `#install-section` — scroll no CTA para desktop (usando `getElementById`, mas o ID real é `#install` e não `#install-section` — possível bug)

### Risco de quebrar login, cadastro ou acesso do aluno
As rotas de autenticação (`/auth/login`, `/auth/register`, `/auth/student-login`) estão definidas em `routes.tsx` e não dependem da landing. A landing apenas navega para essas rotas via `<a href>`. **Não há risco de quebrar** login, cadastro ou acesso do aluno, pois a landing e as páginas de auth são independentes no roteador.

### vercel.json
**Não existe** arquivo `vercel.json` na raiz do projeto.

### Rota "/" aponta diretamente para LandingPage
**Sim.** Em `src/app/routes.tsx:58-60`:
```tsx
{
  path: '/',
  element: <LandingPage />,
}
```
A rota raiz renderiza diretamente a `LandingPage`, sem qualquer redirecionamento ou verificação de autenticação.
