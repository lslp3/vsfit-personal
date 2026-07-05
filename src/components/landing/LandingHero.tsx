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
