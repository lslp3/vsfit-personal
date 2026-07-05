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
