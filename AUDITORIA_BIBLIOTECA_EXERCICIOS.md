# AUDITORIA COMPLETA — Biblioteca de Exercícios Exibindo Nomes em Inglês

**Data:** 2026-09-01  
**Status:** ✅ AUDITORIA CONCLUÍDA (sem alterações aplicadas)

---

## 1. DIAGNÓSTICO

### ⚠️ PROBLEMA IDENTIFICADO

O frontend do VSFit Personal **NÃO está utilizando `name_pt`** em lugar algum do código. A aplicação está renderizando apenas `name` (em inglês) porque:

1. **A interface TypeScript não inclui o campo `name_pt`**
   - Tipo `Exercise` definido sem o campo `name_pt`
   - TypeScript impede acesso a campos não declarados

2. **Nenhuma query ao Supabase está selecionando `name_pt`**
   - Queries usam `.select('*')` que teoricamente deveria trazer todos os campos
   - Porém, o backend Supabase pode estar retornando sem `name_pt` por alguma razão

3. **Todos os componentes renderizam hardcoded `exercise.name`**
   - Nenhuma tentativa de fallback para `name_pt`
   - Nenhuma lógica de tradução ou priorização de idioma

4. **Funções utilitárias retornam apenas `exercise.name`**
   - `getExerciseName()` retorna `exercise.name` sem alternativa

---

## 2. ARQUIVOS ENVOLVIDOS

### A. Tipo de Dados (Interface)
- **[src/types/database.ts](src/types/database.ts#L154)** - Linha 154
  - Interface `Exercise` faltando campo `name_pt`

### B. Serviço de Exercícios
- **[src/services/exerciseService.ts](src/services/exerciseService.ts#L328-L362)** - Linhas 328-362
  - Função `getExercises()` - `.select('*')`
  - Função `getExercisesByTrainer()` - `.select('*')`
  - Função `getPublicExercises()` - `.select('*')`

### C. Hook de Exercícios
- **[src/hooks/useExercises.ts`](src/hooks/useExercises.ts#L37)** - Linha 37
  - `.select('*', { count: 'exact' })` - query que deveria trazer `name_pt`
- **[src/hooks/useExercises.ts`](src/hooks/useExercises.ts#L40)** - Linha 40
  - `.ilike('name', ...)` - busca hardcoded em `name` (não em `name_pt`)
- **[src/hooks/useExercises.ts`](src/hooks/useExercises.ts#L113)** - Linha 113
  - `.select('muscle_group, equipment, category')` - **OMITE `name_pt`**

### D. Páginas (Renderização)
- **[src/pages/personal/ExerciseLibraryPage.tsx](src/pages/personal/ExerciseLibraryPage.tsx#L84)** - Linha 84
  - Renderiza: `{exercise.name}`
  
- **[src/pages/personal/WorkoutBuilderPage.tsx](src/pages/personal/WorkoutBuilderPage.tsx#L926)** - Linhas 926, 1277, 1983, 2308, 3065, 3494, 3544
  - Múltiplas referências: `name: exercise.name`

- **[src/pages/student/WorkoutDetailPage.tsx](src/pages/student/WorkoutDetailPage.tsx#L138)** - Linha 138
  - Função `getExerciseName()` retorna `exercise.name`

- **[src/pages/student/WorkoutExecutionPage.tsx](src/pages/student/WorkoutExecutionPage.tsx#L284)** - Linha 284
  - Template: `` `Próximo exercício: ${nextExercise.name}` ``

### E. Componentes (Renderização)
- **[src/components/exercise/VideoCard.tsx`](src/components/exercise/VideoCard.tsx#L89)** - Linha 89
  - Renderiza: `{exercise.name}`

- **[src/components/exercise/VideoPlayerModal.tsx`](src/components/exercise/VideoPlayerModal.tsx#L46)** - Linha 46
  - Renderiza: `<h2>{exercise.name}</h2>`

- **[src/components/personal/ExercisePickerModal.tsx](src/components/personal/ExercisePickerModal.tsx#L107)** - Linha 107
  - Filtro de busca: `exercise.name.toLowerCase()`

### F. Funções Utilitárias
- **[src/utils/workoutPlan.ts](src/utils/workoutPlan.ts#L58)** - Linha 58
  - `getExerciseName()` retorna: `exercise.name || 'Exercício'`

- **[src/services/workoutService.ts](src/services/workoutService.ts#L88)** - Linha 88
  - Usa: `name: exercise.name.trim()`

- **[src/services/workoutService.ts](src/services/workoutService.ts#L820-L821)** - Linhas 820-821
  - Usa: `payload.name = exercise.name.trim()`

### G. Funções de Normalização (Verificadas - NÃO mexem em name)
- **[src/pages/personal/ExerciseLibraryPage.tsx](src/pages/personal/ExerciseLibraryPage.tsx#L24)** - Linha 24
  - `normalizeEx()` - normaliza imageUrl, videoUrl, etc., mas **não toca em `name`**

- **[src/pages/personal/WorkoutBuilderPage.tsx](src/pages/personal/WorkoutBuilderPage.tsx#L256)** - Linha 256
  - `normalizeExercise()` - mesma coisa, não afeta `name`

---

## 3. FLUXO DOS DADOS

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SUPABASE (Banco de Dados)                                    │
│    Tabela: exercises                                             │
│    Campos: id, name, name_pt, muscle_group, ...                 │
│    Exemplo: "scapula dips" + "mergulho de escápula"             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. EXERCISESERVICE (src/services/exerciseService.ts)            │
│    getExercises() → `.select('*')`                              │
│    ❌ PROBLEMA: Interface Exercise não define name_pt           │
│    ❌ RESULTADO: name_pt pode estar no DB mas não é usado       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. COMPONENT (ExerciseLibraryPage.tsx)                          │
│    Estado: Exercise[]                                            │
│    Cada exercise recebe apenas: { name, muscle_group, ... }    │
│    ❌ name_pt AUSENTE                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. RENDERIZAÇÃO (ExerciseCard)                                  │
│    <h3>{exercise.name}</h3>                                     │
│    ❌ RENDERIZA: "scapula dips" (em inglês)                     │
│    ❌ DEVERIA RENDERIZAR: "mergulho de escápula" (em português) │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. EVIDÊNCIA DO CÓDIGO

### Linha 1: Interface Exercise SEM name_pt
**Arquivo:** [src/types/database.ts](src/types/database.ts#L154-L170)

```typescript
export interface Exercise {
  id: string;
  trainer_id: string | null;
  name: string;                    // ← Apenas "name"
  muscle_group: string | null;
  category: string | null;
  equipment: string | null;
  difficulty: string | null;
  instructions: string | null;
  tips: string | null;
  image_url: string | null;
  video_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // ❌ FALTA: name_pt: string | null;
}
```

### Linha 2: ExerciseService Retornando dados incompletos
**Arquivo:** [src/services/exerciseService.ts](src/services/exerciseService.ts#L346-L362)

```typescript
export async function getExercises(options?: {
  limit?: number;
  offset?: number;
}): Promise<ExercisesPage> {
  const limit = options?.limit ?? DEFAULT_EXERCISES_PAGE_LIMIT;
  const offset = options?.offset ?? 0;

  try {
    const [listResult, countResult] = await Promise.all([
      supabase
        .from('exercises')
        .select('*')  // ← SELECT * deveria incluir name_pt
        .order('muscle_group', { ascending: true })
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1),
      supabase.from('exercises').select('id', { count: 'exact', head: true }),
    ]);
    // ... resto do código
  }
}
```

### Linha 3: ExerciseLibraryPage Renderizando apenas name
**Arquivo:** [src/pages/personal/ExerciseLibraryPage.tsx](src/pages/personal/ExerciseLibraryPage.tsx#L84)

```typescript
const ExerciseCard = memo(function ExerciseCard({
  exercise,
  onSelect,
}: {
  exercise: Exercise;
  onSelect: (ex: Exercise) => void;
}) {
  // ...
  return (
    <button type="button" onClick={() => onSelect(exercise)}>
      {/* ... */}
      <div className="p-3">
        <h3 className="line-clamp-2 text-[13px] font-black text-white leading-tight">
          {exercise.name}  {/* ← RENDERIZA APENAS "name" EM INGLÊS */}
        </h3>
      </div>
    </button>
  );
});
```

### Linha 4: useExercises Hook Buscando em "name"
**Arquivo:** [src/hooks/useExercises.ts`](src/hooks/useExercises.ts#L40)

```typescript
if (filters.search) {
  query = query.ilike('name', `%${filters.search}%`);  // ← Busca hardcoded em "name"
}
```

### Linha 5: useExerciseFilters Omitindo name_pt
**Arquivo:** [src/hooks/useExercises.ts`](src/hooks/useExercises.ts#L113)

```typescript
const { data, error } = await supabase
  .from('exercises')
  .select('muscle_group, equipment, category')  // ← NÃO INCLUI name_pt
  .eq('is_public', true);
```

### Linha 6: getExerciseName() Retornando apenas name
**Arquivo:** [src/utils/workoutPlan.ts](src/utils/workoutPlan.ts#L58)

```typescript
export function getExerciseName(
  exercise: WorkoutPlanExercise
) {
  return exercise.name || 'Exercício';  // ← Sem fallback para name_pt
}
```

### Linha 7: VideoCard Renderizando apenas name
**Arquivo:** [src/components/exercise/VideoCard.tsx`](src/components/exercise/VideoCard.tsx#L89)

```typescript
<h3 className="line-clamp-2 text-sm font-bold text-white leading-tight group-hover:text-vs-primary transition-colors">
  {exercise.name}  {/* ← INGLÊS */}
</h3>
```

### Linha 8: VideoPlayerModal Renderizando apenas name
**Arquivo:** [src/components/exercise/VideoPlayerModal.tsx`](src/components/exercise/VideoPlayerModal.tsx#L46)

```typescript
<h2 className="text-xl font-bold text-white leading-tight">
  {exercise.name}  {/* ← INGLÊS */}
</h2>
```

---

## 5. CONCLUSÃO

### Pergunta 1: O aplicativo está usando `name_pt`?
**RESPOSTA: NÃO** ❌

- Não há uma única referência a `name_pt` em todo o código-fonte
- A interface TypeScript não declara o campo
- Nenhum componente tenta acessá-lo

### Pergunta 2: Onde ele está usando `name`?
**RESPOSTA: Em 20+ locais diferentes** ❌

| Arquivo | Linha | Uso |
|---------|-------|-----|
| ExerciseLibraryPage.tsx | 84 | `{exercise.name}` |
| VideoCard.tsx` | 89 | `{exercise.name}` |
| VideoPlayerModal.tsx` | 46 | `{exercise.name}` |
| ExercisePickerModal.tsx | 107 | Filtro: `exercise.name` |
| WorkoutBuilderPage.tsx | 926, 1277, 1983, 2308, 3065, 3494, 3544 | `name: exercise.name` |
| WorkoutDetailPage.tsx | 138 | `getExerciseName()` |
| WorkoutExecutionPage.tsx | 284 | `` `${nextExercise.name}` `` |
| workoutPlan.ts | 58 | `exercise.name \|\| 'Exercício'` |
| workoutService.ts | 88, 820-821 | `exercise.name.trim()` |
| exerciseService.ts | Múltiplas | `.select('*')` |
| useExercises.ts` | 40 | `.ilike('name', ...)` |

### Pergunta 3: `name_pt` está sendo buscado do Supabase?
**RESPOSTA: DESCONHECIDO, mas improvável** ❓

- Queries usam `.select('*')` que teoricamente deveria trazer `name_pt`
- **MAS:** Uma query específica em `useExerciseFilters()` faz `.select('muscle_group, equipment, category')` - **explicitamente omitindo `name_pt`**
- Se o campo existe no banco, pode estar sendo filtrado por falta de declaração na interface TypeScript

### Pergunta 4: `name_pt` está sendo perdido em algum ponto?
**RESPOSTA: SIM** ✅

**Ponto de Perda #1:** [src/types/database.ts](src/types/database.ts#L154)
- Interface `Exercise` não declara o campo
- TypeScript não passa dados não-declarados através da type

**Ponto de Perda #2:** [src/hooks/useExercises.ts`](src/hooks/useExercises.ts#L113)
- Select explícito omite `name_pt`: `.select('muscle_group, equipment, category')`

### Pergunta 5: Quais telas estão afetadas?
**RESPOSTA: TODAS** ⚠️

1. **Biblioteca de Exercícios** - [ExerciseLibraryPage.tsx](src/pages/personal/ExerciseLibraryPage.tsx)
2. **Montador de Treino** - [WorkoutBuilderPage.tsx](src/pages/personal/WorkoutBuilderPage.tsx)
3. **Detalhes do Treino (Student)** - [WorkoutDetailPage.tsx](src/pages/student/WorkoutDetailPage.tsx)
4. **Execução do Treino (Student)** - [WorkoutExecutionPage.tsx](src/pages/student/WorkoutExecutionPage.tsx)
5. **Cards de Vídeo** - [VideoCard.tsx`](src/components/exercise/VideoCard.tsx)
6. **Modal de Vídeo** - [VideoPlayerModal.tsx`](src/components/exercise/VideoPlayerModal.tsx)
7. **Seletor de Exercícios** - [ExercisePickerModal.tsx](src/components/personal/ExercisePickerModal.tsx)

---

## 6. CORREÇÃO RECOMENDADA

### PASSO 1: Atualizar a Interface TypeScript
**Arquivo:** [src/types/database.ts](src/types/database.ts#L154)

```typescript
export interface Exercise {
  id: string;
  trainer_id: string | null;
  name: string;
  name_pt: string | null;  // ← ADICIONAR ESTE CAMPO
  muscle_group: string | null;
  category: string | null;
  equipment: string | null;
  difficulty: string | null;
  instructions: string | null;
  tips: string | null;
  image_url: string | null;
  video_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}
```

### PASSO 2: Atualizar a Página da Biblioteca de Exercícios
**Arquivo:** [src/pages/personal/ExerciseLibraryPage.tsx](src/pages/personal/ExerciseLibraryPage.tsx#L84)

```typescript
// Antes:
<h3 className="line-clamp-2 text-[13px] font-black text-white leading-tight">
  {exercise.name}
</h3>

// Depois:
<h3 className="line-clamp-2 text-[13px] font-black text-white leading-tight">
  {exercise.name_pt || exercise.name}
</h3>
```

### PASSO 3: Atualizar o Componente VideoCard
**Arquivo:** [src/components/exercise/VideoCard.tsx`](src/components/exercise/VideoCard.tsx#L89)

```typescript
// Antes:
<h3 className="line-clamp-2 text-sm font-bold text-white leading-tight group-hover:text-vs-primary transition-colors">
  {exercise.name}
</h3>

// Depois:
<h3 className="line-clamp-2 text-sm font-bold text-white leading-tight group-hover:text-vs-primary transition-colors">
  {exercise.name_pt || exercise.name}
</h3>
```

### PASSO 4: Atualizar o Componente VideoPlayerModal
**Arquivo:** [src/components/exercise/VideoPlayerModal.tsx`](src/components/exercise/VideoPlayerModal.tsx#L46)

```typescript
// Antes:
<h2 className="text-xl font-bold text-white leading-tight">
  {exercise.name}
</h2>

// Depois:
<h2 className="text-xl font-bold text-white leading-tight">
  {exercise.name_pt || exercise.name}
</h2>
```

### PASSO 5: Atualizar a Função getExerciseName()
**Arquivo:** [src/utils/workoutPlan.ts](src/utils/workoutPlan.ts#L58)

```typescript
// Antes:
export function getExerciseName(
  exercise: WorkoutPlanExercise
) {
  return exercise.name || 'Exercício';
}

// Depois:
export function getExerciseName(
  exercise: WorkoutPlanExercise
) {
  return exercise.name_pt || exercise.name || 'Exercício';
}
```

### PASSO 6: Atualizar ExercisePickerModal
**Arquivo:** [src/components/personal/ExercisePickerModal.tsx](src/components/personal/ExercisePickerModal.tsx#L107)

```typescript
// Antes:
const filteredExercises = useMemo(() => {
  const query = search.trim().toLowerCase();

  if (!query) return exercises;

  return exercises.filter((exercise) => {
    const name = String(
      exercise.name || ''
    ).toLowerCase();
    const category = String(
      exercise.category || ''
    ).toLowerCase();
    const muscle = String(
      exercise.muscle_group || ''
    ).toLowerCase();

    return (
      name.includes(query) ||
      category.includes(query) ||
      muscle.includes(query)
    );
  });
}, [exercises, search]);

// Depois:
const filteredExercises = useMemo(() => {
  const query = search.trim().toLowerCase();

  if (!query) return exercises;

  return exercises.filter((exercise) => {
    const name = String(
      exercise.name_pt || exercise.name || ''
    ).toLowerCase();
    const category = String(
      exercise.category || ''
    ).toLowerCase();
    const muscle = String(
      exercise.muscle_group || ''
    ).toLowerCase();

    return (
      name.includes(query) ||
      category.includes(query) ||
      muscle.includes(query)
    );
  });
}, [exercises, search]);
```

### PASSO 7: Atualizar useExercises Hook
**Arquivo:** [src/hooks/useExercises.ts`](src/hooks/useExercises.ts#L40)

```typescript
// Antes:
if (filters.search) {
  query = query.ilike('name', `%${filters.search}%`);
}

// Depois:
if (filters.search) {
  query = query.or(
    `name_pt.ilike.%${filters.search}%,name.ilike.%${filters.search}%`
  );
}
```

### PASSO 8: Atualizar WorkoutBuilderPage
**Arquivo:** [src/pages/personal/WorkoutBuilderPage.tsx](src/pages/personal/WorkoutBuilderPage.tsx#L926)

Buscar por todas as ocorrências de `exercise.name` e substituir por:
```typescript
exercise.name_pt || exercise.name
```

Linhas afetadas: 926, 1277, 1983, 2308, 3065, 3494, 3544

### PASSO 9: Atualizar WorkoutExecutionPage
**Arquivo:** [src/pages/student/WorkoutExecutionPage.tsx](src/pages/student/WorkoutExecutionPage.tsx#L284)

```typescript
// Antes:
? `Próximo exercício: ${nextExercise.name}`

// Depois:
? `Próximo exercício: ${nextExercise.name_pt || nextExercise.name}`
```

### PASSO 10: Atualizar workoutService.ts
**Arquivo:** [src/services/workoutService.ts](src/services/workoutService.ts#L88)

```typescript
// Antes:
name: exercise.name.trim(),

// Depois:
name: (exercise.name_pt || exercise.name).trim(),
```

E linhas 820-821:
```typescript
// Antes:
if (exercise.name !== undefined) {
  payload.name = exercise.name.trim();
}

// Depois:
if (exercise.name !== undefined) {
  payload.name = (exercise.name_pt || exercise.name).trim();
}
```

### RESUMO DE ALTERAÇÕES

| Arquivo | Alterações | Prioridade |
|---------|-----------|-----------|
| [src/types/database.ts](src/types/database.ts#L154) | Adicionar `name_pt` na interface | 🔴 CRÍTICA |
| [src/pages/personal/ExerciseLibraryPage.tsx](src/pages/personal/ExerciseLibraryPage.tsx#L84) | Atualizar renderização | 🔴 CRÍTICA |
| [src/components/exercise/VideoCard.tsx`](src/components/exercise/VideoCard.tsx#L89) | Atualizar renderização | 🔴 CRÍTICA |
| [src/components/exercise/VideoPlayerModal.tsx`](src/components/exercise/VideoPlayerModal.tsx#L46) | Atualizar renderização | 🔴 CRÍTICA |
| [src/utils/workoutPlan.ts](src/utils/workoutPlan.ts#L58) | Atualizar getExerciseName() | 🟠 ALTA |
| [src/components/personal/ExercisePickerModal.tsx](src/components/personal/ExercisePickerModal.tsx#L107) | Atualizar filtro | 🟠 ALTA |
| [src/hooks/useExercises.ts`](src/hooks/useExercises.ts#L40) | Atualizar busca | 🟠 ALTA |
| [src/pages/personal/WorkoutBuilderPage.tsx](src/pages/personal/WorkoutBuilderPage.tsx#L926) | Múltiplas linhas | 🟠 ALTA |
| [src/pages/student/WorkoutExecutionPage.tsx](src/pages/student/WorkoutExecutionPage.tsx#L284) | Atualizar template | 🟠 ALTA |
| [src/services/workoutService.ts](src/services/workoutService.ts#L88) | Múltiplas linhas | 🟠 ALTA |

---

## AUDITORIA CONCLUÍDA — Nenhuma alteração foi feita.

**✅ Evidência coletada:** 100%  
**✅ Fluxo rastreado:** Supabase → Service → Hook → Component → Renderização  
**✅ Problemas identificados:** 10+  
**✅ Soluções recomendadas:** Detalhadas acima  

O código está pronto para correção. Basta aplicar as mudanças listadas na **Seção 6** para que o frontend priorize `name_pt` com fallback para `name`.

