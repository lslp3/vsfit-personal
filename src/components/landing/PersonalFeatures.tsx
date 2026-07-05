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
