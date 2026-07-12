import { useMemo } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Globe2,
  QrCode,
  Share2,
  Smartphone,
} from 'lucide-react';

const APP_URL = 'https://vsfit-personal.vercel.app';

export function DynamicInstallGuide() {
  const qrCodeSrc = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
      APP_URL
    )}`;
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-vs-primary/15">
            <QrCode className="h-5 w-5 text-vs-primary" />
          </div>
          <div>
            <p className="text-sm font-black text-white">
              Acesse no celular
            </p>
            <p className="text-sm text-zinc-400">
              Escaneie o QR Code para abrir o VSFit no navegador do seu celular.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-center rounded-[28px] border border-white/10 bg-black/30 p-6">
          <img
            src={qrCodeSrc}
            alt="QR Code para acessar o VSFit Personal no celular"
            className="h-[220px] w-[220px] rounded-2xl bg-white p-3"
            loading="lazy"
          />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Link de acesso
          </p>
          <a
            href={APP_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 break-all text-sm font-bold text-vs-primary"
          >
            {APP_URL}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vs-primary/15">
                <Smartphone className="h-5 w-5 text-vs-primary" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Android</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Baixe o aplicativo oficial para Android e organize seus treinos.
                </p>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-vs-primary text-white shadow-lg transition-all hover:bg-red-600">
              <a href="/VSFit-Personal-v1.0.0.apk" download>
                <Download className="h-5 w-5" />
              </a>
            </div>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase text-vs-primary transition-all hover:bg-white/[0.1]">
            <span className="text-white/50">Versão</span>
            v1.0.0
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vs-primary/15">
              <Share2 className="h-5 w-5 text-vs-primary" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">iPhone</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Abra o VSFit pelo Safari, toque em Compartilhar e depois em
                “Adicionar à Tela de Início”.
              </p>
              <div className="mt-4 space-y-2">
                {[
                  'Abra o link no Safari',
                  'Toque em Compartilhar',
                  'Selecione “Adicionar à Tela de Início”',
                  'Confirme para instalar',
                ].map((step) => (
                  <div key={step} className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-vs-primary" />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vs-primary/15">
                <Globe2 className="h-5 w-5 text-vs-primary" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Acesso web</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Use no navegador do computador, tablet ou celular.
                </p>
              </div>
            </div>
            <a
              href="/auth/login"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white transition-all hover:bg-white/[0.1]"
            >
              Entrar
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DynamicInstallGuide;
