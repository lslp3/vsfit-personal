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
