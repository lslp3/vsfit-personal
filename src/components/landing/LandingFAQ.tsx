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
