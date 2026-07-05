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
