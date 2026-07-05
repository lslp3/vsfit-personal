import { useState } from 'react';
import type { MouseEvent } from 'react';
import {
  ArrowRight,
  Download,
  Share2,
  Smartphone,
  X,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
} from 'framer-motion';

import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { cn } from '../../lib/utils';

interface DeviceAwareCTAProps {
  className?: string;
  onClick?: (
    event: MouseEvent<HTMLButtonElement>
  ) => void;
}

function scrollToInstallSection() {
  document
    .getElementById('install')
    ?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
}

export function DeviceAwareCTA({
  className,
  onClick,
}: DeviceAwareCTAProps) {
  const {
    isAndroid,
    isIOS,
    isStandalone,
  } = useDeviceDetection();

  const [showIosModal, setShowIosModal] =
    useState(false);

  function handleAction() {
    if (isStandalone) {
      window.location.href = '/auth/login';
      return;
    }

    if (isIOS) {
      setShowIosModal(true);
      return;
    }

    scrollToInstallSection();
  }

  let buttonText = 'Ver formas de acesso';

  if (isStandalone) {
    buttonText = 'Abrir VSFit';
  } else if (isAndroid) {
    buttonText = 'APK em breve';
  } else if (isIOS) {
    buttonText = 'Instalar no iPhone';
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          onClick?.(event);
          handleAction();
        }}
        className={cn(
          'flex items-center justify-center gap-2 rounded-2xl bg-vs-primary px-6 py-3 font-black text-white shadow-lg shadow-red-950/20 transition-all hover:bg-red-600 active:scale-[0.98]',
          className
        )}
      >
        {buttonText}

        <ArrowRight className="h-4 w-4 shrink-0" />
      </button>

      <AnimatePresence>
        {showIosModal && (
          <IOSInstallModal
            onClose={() =>
              setShowIosModal(false)
            }
          />
        )}
      </AnimatePresence>
    </>
  );
}

function IOSInstallModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { isSafari } = useDeviceDetection();

  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-4 backdrop-blur-sm sm:items-center"
    >
      <motion.div
        initial={{
          y: '100%',
        }}
        animate={{
          y: 0,
        }}
        exit={{
          y: '100%',
        }}
        transition={{
          type: 'spring',
          damping: 25,
          stiffness: 200,
        }}
        className="relative w-full max-w-md rounded-t-[32px] border border-white/10 bg-[#0d0d0f] p-7 sm:rounded-[32px]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar instruções"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-vs-primary/15">
            <Smartphone className="h-8 w-8 text-vs-primary" />
          </div>

          <h3 className="mt-5 text-2xl font-black text-white">
            Instalar no iPhone
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Adicione o VSFit à tela de início
            usando o Safari.
          </p>
        </div>

        {!isSafari && (
          <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-center text-sm font-semibold text-yellow-200">
            Abra esta página no Safari para
            instalar.
          </div>
        )}

        <div className="mt-6 space-y-3">
          {[
            {
              number: '1',
              icon: Smartphone,
              text: 'Abra esta página no Safari',
            },
            {
              number: '2',
              icon: Share2,
              text: 'Toque no botão Compartilhar',
            },
            {
              number: '3',
              icon: Download,
              text: 'Escolha “Adicionar à Tela de Início”',
            },
            {
              number: '4',
              icon: ArrowRight,
              text: 'Confirme tocando em “Adicionar”',
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.number}
                className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.04] p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vs-primary text-xs font-black text-white">
                  {item.number}
                </span>

                <Icon className="h-5 w-5 shrink-0 text-vs-primary" />

                <span className="text-sm font-semibold text-white">
                  {item.text}
                </span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-7 min-h-[52px] w-full rounded-2xl bg-white font-black text-black"
        >
          Entendi
        </button>
      </motion.div>
    </motion.div>
  );
}

export default DeviceAwareCTA;