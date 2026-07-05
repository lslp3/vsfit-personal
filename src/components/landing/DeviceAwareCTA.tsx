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
