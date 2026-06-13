import { Apple } from 'lucide-react';
import { Header } from '../../components/ui/Header';
import { EmptyState } from '../../components/ui/EmptyState';

export function NutritionPage() {
  return (
    <div>
      <Header title="Nutrição" showBack />
      <div className="page-container">
        <EmptyState
          icon={<Apple className="w-8 h-8 text-vs-muted" />}
          title="Em breve"
          description="O módulo de nutrição está sendo desenvolvido. Em breve você poderá criar planos alimentares para seus alunos."
        />
      </div>
    </div>
  );
}
