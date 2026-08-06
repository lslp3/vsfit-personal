# VSFit — Roadmap Geral do Projeto

Roadmap oficial de sprints do VSFit PERSONAL. Branches de trabalho: `test/*`
(Preview via Vercel). Nenhuma sprint é mergeada na `main` sem ordem explícita.

## Legenda

- ✅ Concluída e validada no Preview
- 🔄 Em andamento
- ⏸️ Bloqueada / aguardando
- 📋 Planejada

---

## Sprint 7B — Refatoração Premium da Execução de Treino

- Status: ✅ Concluída (branch `test/sprint-7b-execucao-premium`)
- Commit final: `5062f3d`
- Validação: aprovada; guarda de memória registrada (Sprint 8.1 blindou o rascunho
  do WorkoutBuilder; commit `5062f3d`).

## Sprint 8.1 — Blindagem do Rascunho do Workout Builder

- Status: ✅ Concluída
- Commit: `5062f3d`
- Validação: aprovada; sistema de rascunho resiliente (camada
  `workoutDraftService` + chaves v1 preservadas).

## Sprint 9 — Evolução do Aluno

- Status: ✅ **Concluída**
- Validação: **Validada em Preview**
- **Aprovada para integração futura**
- Branch: `test/sprint-9-evolucao-aluno`
- Commits: `18e02c7`, `b87e129`, `0ba5070`, `9b2358b`, + documentação final
- Escopo: circunferências em `student_metrics`, gráfico SVG próprio, reuso do
  bucket `progress-photos`, avaliações/medidas/metas writable (Personal),
  página de evolução do aluno.
- **Não realizar mais alterações nesta Sprint.**
- Ajustes futuros relacionados à Sprint 9 serão tratados como **HOTFIX**,
  preservando esta entrega como fechada.

## Sprint 10 — Módulo de Comunicação (chat, notificações, presence)

- Status: ✅ **Concluída**
- Validação: **Validada em Preview**
- **Aprovada para integração futura**
- **Congelada** — não realizar alterações, exceto HOTFIX.
- Branch: `test/sprint-10-comunicacao`
- Commits: `75be443`, `0ac9099`, `77afcf9`, + documentação final
- Escopo: consolidação do módulo de comunicação (chat, notificações e presence);
  higienização de páginas órfãs; `messageService` alinhado ao schema real;
  rota `/student/notifications`; lista de conversas do Personal mostrando todos
  os alunos vinculados; realtime e presence estáveis.
- **Não realizar alterações nesta Sprint, exceto HOTFIX** — preservando esta
  entrega como fechada.

## Sprint 11 — Hardening + Fundação V2

- Status: ✅ **Concluída**
- Validação: **Validada em Preview**
- **Aprovada para integração futura**
- **Congelada** — somente HOTFIX caso necessário.
- Branch: `test/sprint-11-hardening`
- Commits: `e20f441`, `6242794`, `5d356a6`, `5c85b0f`, + documentação final
- Origem: `test/sprint-10-comunicacao` (5d1ad50)
- Escopo entregue: C1 docs, C2 SQL manual de RLS (notifications/messages),
  C3 remoção de código morto + consolidação de tipos Message, E4 segurança de
  sessão (getUser() sem tokens manuais no localStorage).
- E3 (quality gate TS), E5 (nutrition) e E6 (desktop responsivo) não
  implementados nesta Sprint — registrados como candidatos a sprints futuras.

## Sprint 12 — Push Notifications

- Status: ✅ **Concluída**
- Validação: **Validada em dispositivo real (Android)**
- **Pronta para Produção**
- Branch: `test/sprint-12-push`
- Origem: `test/sprint-11-hardening` (7309a03)
- Escopo entregue (ETAPAS 1–8): Firebase Cloud Messaging configurado, Edge
  Function `send-push-notification` funcionando, GitHub Actions gerando APK
  corretamente (Secret `GOOGLE_SERVICES_JSON` corrigido — Base64), registro
  automático do token FCM, armazenamento correto em `push_tokens`, envio e
  recebimento funcionando, validação completa em dispositivo Android.
- **Não realizar alterações nesta Sprint, exceto HOTFIX** — entrega fechada.

---

## Sprint 13 — Chat Media 🟢🔄 (EM ANDAMENTO)

- Status: 🟢 **ETAPA 1 (Infraestrutura) concluída** · 🟢 **ETAPA 2 (Upload)
  concluída** · 🟢 **ETAPA 3 (Preview) concluída e validada tecnicamente**
- Branch: `sprint-13-chat-media` (commit `5a5c913` — ETAPAS 1/2 + docs)
- Escopo: mídia no chat — imagens, vídeos, áudios, documentos (PDF, DOC, etc.),
  via Supabase Storage (bucket `chat-files`), upload/download/preview/cache,
  políticas de storage, RLS e novas colunas em `messages`.
- Requer: migration de colunas de mídia + criação/confirmação do bucket
  `chat-files` + políticas de storage (aplicação manual no Supabase).
- Entregas registradas (ETAPA 1 + 2):
  - Bucket privado `chat-files` configurado.
  - Policies Storage aplicadas.
  - Campos de mídia adicionados na tabela `messages`.
  - Upload de imagens, vídeos, áudios e documentos implementado.
  - Validação de MIME e tamanho.
  - Geração de path seguro:
    `chat-files/{trainer_id}/{student_id}/{message_id}/{arquivo}`
  - Rollback de upload em caso de falha.
  - Integração com Personal Chat e Student Chat.
  - Build e TypeScript validados.
- Entregas registradas (ETAPA 3 — Preview):
  - `MessageBubble` reutilizável criado (unifica Personal Chat e Student Chat).
  - Removida duplicação entre Personal Chat e Student Chat.
  - Preview de imagens implementado (thumbnail, loading, erro, zoom).
  - Preview de vídeos implementado (player HTML5).
  - Preview de áudios implementado (player compacto).
  - Preview de documentos implementado (card + abrir/baixar).
  - Signed URLs utilizadas para arquivos privados (sem URL pública).
  - Cache de URLs implementado (por mensagem).
  - Estados de loading e erro adicionados.
  - Fundo neutro escuro aplicado nas mídias conforme decisão UX.
  - Testes: ✅ TypeScript sem erros · ✅ Build PWA concluído.
- Pendências — validação manual (próxima etapa):
  - ⬜ Teste manual em dispositivo real: Personal enviando mídia; Aluno enviando
    mídia; todos os tipos de arquivo.
  - ⬜ Validar comportamento de download de documentos no APK/WebView.

## Sprint 14 — Analytics Dashboard do Personal

- Status: ✅ **Concluída e homologada no Preview**
- **Aprovada para integração futura**
- **Congelada** — não realizar alterações, exceto HOTFIX.
- Branch: `sprint-14-analytics-dashboard`
- Origem: `sprint-13-chat-media`
- Commits: `971ab97`, `2bc3ed0`, `f74717d`, `2b8cf68`, `d69a8ee`, `17a8f1b`,
  `2b00741`, `53dee0f`, + encerramento (ETAPA FINAL)
- Escopo: camada centralizada de analytics (`analyticsService` +
  `useTrainerAnalytics` + `types/analytics.ts`); componentes de dashboard
  (`MetricCard`, `RevenueChart`, `WorkoutTrendChart`, `StudentStatusChart`,
  `AdherenceChart`, `VolumeProgressChart`, `RiskStudentsCard`, `InsightsCard`);
  `AnalyticsPage` com filtros de período (Hoje/7d/30d/90d/Ano/Personalizado),
  tendências atual × anterior (▲/▼/estável com %), KPIs com indicadores
  visuais e seção de Insights derivados de dados reais; rota
  `/personal/analytics` + item Analytics no menu lateral do Personal.
- Infraestrutura temporária de preview (`src/dev`, rota
  `/dev/analytics-preview`, atalho `/?preview=analytics`) removida na ETAPA
  FINAL — nenhuma referência restante.
- Garantias: sem migrations, sem alteração de RLS, sem mudanças em Chat Media,
  Progress, Reports ou Financial.
- **Não realizar alterações nesta Sprint, exceto HOTFIX** — preservando esta
  entrega como fechada. Detalhes em `SPRINT-14.md`.

## Sprint 15 — Financeiro do Personal 🟢🔄 (EM ANDAMENTO — FASE 2)

- Status: 🟢🔄 **Fase 1 concluída e homologada** (2026-08-05, "sem
  regressões"). **Fase 2 concluída** (commit `57b2f01`, aguardando
  homologação). **Fase 3 em planejamento (auditoria).**
- Branch: `test/sprint-15-financeiro`
- Origem: `sprint-14-analytics-dashboard` (Sprint 14 finalizada)
- **Fase 1 — Refatoração e Padronização (concluída e homologada):**
  - Camada reutilizável criada em `src/lib/adminFinance.ts`: `fetchAllRows`
    (paginação parametrizada), `normalizePlan`/`normalizeStatus`,
    `isApprovedStatus`/`isPendingStatus`/`isFailedStatus`/`isRefundedStatus`/
    `isActiveSubscriptionStatus`, `getPaymentDate`/`getPaymentEnvironment`/
    `getTimestamp`/`getMonthKey`/`getValidDate`/`isCurrentMonth`/`isSameMonth`,
    `MONTH_LABELS`, `getPlanLabel`/`getPlanClass`, tipos `AdminPlanSlug` e
    `AdminFinancialEnvironment`.
  - Duplicação eliminada nos **4 serviços administrativos** (`adminFinancialService`,
    `adminSubscriptionService`, `adminDashboardService`, `adminReportsService`)
    — helpers locais removidos em favor da camada, sem alteração de regras de
    negócio, UX, telas, layout, gráficos, APIs, banco, RLS, Mercado Pago ou PIX.
  - Código morto removido da camada e dos serviços (helpers sem consumidores).
  - `npx tsc --noEmit` ✅ exit 0 · `npm run build` ✅ exit 0.
  - Commit único da Fase: `9bf91d0`.
- **Fase 2 — Unificação e estabilização do resumo financeiro (em andamento):**
  - Unificar definitivamente o `AdminFinancialSummary` com **uma única regra de
    negócio** (produção + pagamentos aprovados) compartilhada entre Admin
    Financial e Admin Subscriptions, eliminando a divergência de cálculo entre
    as telas.
  - Centralizar helpers duplicados restantes do módulo financeiro admin.
  - Remover apenas código morto do módulo financeiro admin identificado na
    auditoria.
  - Sem alterações de layout, UX, design, funcionalidades novas, fluxo do
    Personal, PIX, Mercado Pago, Edge Functions, banco/migrations/RLS ou regras
    de negócio já homologadas.
- **Fase 3 — Cobrança completa (concluída — commit `3aba81f`, aguardando
  homologação da E3 no Preview):**
  - Regra pura em `src/lib/studentBilling.ts` (buildStudentBillingSummary +
    getOverduePayments + getOverdueStudents — inadimplência derivada por
    due_date, nunca pelo status 'overdue' que não é persistido).
  - Perfil do aluno: resumo financeiro na aba Financeiro (situação, valor
    pendente, próximo vencimento, último pagamento).
  - Dashboard: card de alunos inadimplentes (corrigido — dependia de status
    'overdue' nunca gravado e nunca aparecia).
  - 26/26 cenários do script de verificação; tsc e build exit 0.
- **Fase 4 — Faturas (Invoices) (planejamento técnico + auditoria):**
  - Objetivo: gerenciamento formal de faturas vinculadas às cobranças dos
    alunos — criação de faturas, status da fatura, histórico, vínculo com
    aluno e pagamento, preparação para o financeiro do aluno.
  - Escopo previsto:
    1. Criação de faturas (formalização da cobrança em fatura).
    2. Status da fatura (em aberto, paga, vencida, cancelada).
    3. Histórico de faturas por aluno.
    4. Vínculo com aluno e com o pagamento correspondente.
    5. Preparação para a Fase 5 (tela financeira do aluno).
  - Fora do escopo: tela financeira do aluno (Fase 5); automações de
    cobrança; alterações no PIX/Mercado Pago sem necessidade; Central de
    Alunos Premium (Sprint 16).
  - Decisão pendente de homologação: nova tabela `invoices` (com migration
    manual) vs. evolução do `payments` — ver relatório de auditoria.
- **Fase 5 — Financeiro do aluno (planejada):**
  - Fora do escopo das Fases 3 e 4; será aberta após a Fase 4.
- Nota: no plano anterior constava como "Sprint 14 — Financeiro do Personal";
  renumerada após o Analytics ser antecipado e executado como Sprint 14.

## Sprint 16 — Central de Alunos Premium ✅

- Status: ✅ **Concluída e homologada no Preview** (Fases 1–5 + melhoria premium do Export)
- **Aprovada para integração futura**
- **Congelada** — não realizar alterações, exceto HOTFIX.
- Branch: `test/sprint-16-central-alunos` (origem: `test/sprint-15-financeiro`)
- Entregue (F1–F5):
  - **F1 — Card Premium** (`8e39391`): card de aluno com indicadores rápidos.
  - **F2 — Resumo Superior da Carteira** (`f2b5ad0`): resumo 30d da carteira.
  - **F3 — Ações Rápidas no Card** (`72b801d`): menu de ações no card.
  - **Hotfix 83921** (fix definitivo `be3b42f`): dupla navegação do menu ⋮ resolvida.
  - **F4 — Filtros Inteligentes** (`8466f53`): 11 filtros (4 status + 7 inteligentes:
    precisa atenção, inadimplente, sem treino recente, sem plano publicado, plano
    ativo, avaliação pendente, aluno só do app), derivados de `students[]` +
    `auditMap` — zero query nova.
  - **F5 — Ordenação + Seleção Múltipla + Ações em Massa** (`94edcba`, `31a85fa`,
    `245df97`): 9 opções de ordenação; seleção múltipla com
    "selecionar todos (visíveis)"; ações em massa — Exportar CSV (prioridade),
    Alterar status, Enviar mensagem, Enviar push (com modal de confirmação).
  - **Export CSV Premium** (`06a35cd`): relatório com cabeçalho de marca,
    resumo da carteira (total/ativos/pausados/inativos/atenção/média de
    aderência) e campos formatados (Ativo/Pausado/Inativo, "9 dias atrás",
    "70 kg") — 100% client-side com BOM UTF-8.
- Garantias: **5 queries fixas da Central** (1 alunos + 4 batch, sem N+1); zero
  `supabase.from` no carregamento; zero migrations/RLS/Edge Functions; fluxos
  Financeiro/Chat/Treinos/Cadastro intocados.
- Pendência registrada: "Publicar treino em massa" **fora desta fase** —
  documentado como evolução futura.

## Sprint 17 — Primeiro Acesso Inteligente, Onboarding e Fluxo de Entrada 📋

- Status: 📋 **Planejada**
- Branch futura: `test/sprint-17-onboarding-fluxo-entrada`

### Objetivo

Criar uma experiência inicial profissional para o VSFit Personal, garantindo que
cada usuário entenda rapidamente o aplicativo, seu papel dentro da plataforma e
o próximo passo.

A Sprint implementará um fluxo inteligente baseado em:

- primeira instalação;
- usuário autenticado;
- tipo de usuário (Personal ou Aluno);
- conexão com internet;
- atualização do aplicativo.

Escopo exclusivamente de UX, navegação e inicialização.

**Não alterar:** banco Supabase; políticas RLS; Edge Functions; regras dos
treinos; chat; financeiro; notificações.

### ETAPA 1 — Auditoria da Inicialização Atual

**Objetivo:** mapear o comportamento atual do aplicativo ao abrir.

Verificar:
- ponto de entrada (`App.tsx`);
- sistema de rotas;
- autenticação Supabase;
- persistência da sessão;
- páginas existentes de login/cadastro;
- identificação atual de Personal e Aluno.

Entregáveis:
- diagnóstico do fluxo atual;
- arquivos envolvidos;
- plano de alteração seguro.

### ETAPA 2 — Splash Screen Inteligente

Criar a primeira tela exibida ao abrir.

- Duração: 1–2 segundos.
- Exibição:

```
VSFit Personal

Seu treino.
Seus alunos.
Sua evolução.
```

- Elementos: logo VSFit; animação simples; identidade visual atual.
- Durante o Splash: verificar sessão Supabase; verificar conexão; verificar
  versão/configurações; carregar dados iniciais necessários.

### ETAPA 3 — Sistema de Primeiro Acesso

Criar controle persistente:
- onboard concluído;
- perfil escolhido;
- estado inicial do usuário.

Regra:

```
Primeira instalação:
→ mostrar onboarding

Usuário existente:
→ nunca repetir onboarding.
```

### ETAPA 4 — Onboarding Inicial

Máximo 3 telas.

- Tela 1: "Gerencie seus alunos, treinos e pagamentos em um só lugar."
  Mostrar: alunos; treinos; evolução.
- Tela 2: "Crie treinos profissionais e acompanhe resultados."
  Mostrar: execução de treino; técnicas avançadas; histórico.
- Tela 3: "Comece agora como Personal ou Aluno."
  Botões:
  ```
  [ Sou Personal Trainer ]
  [ Sou Aluno ]
  ```

Ao finalizar: salvar onboarding concluído.

### ETAPA 5 — Fluxo Personal Trainer

```
Escolheu Personal
↓
Login ou Cadastro
↓
Configuração inicial do perfil
```

Cadastro:
- nome;
- foto;
- CREF opcional;
- especialidade;
- WhatsApp;
- cidade.

Após concluir: "Configure seu primeiro aluno"

```
[ + Adicionar primeiro aluno ]
```

> **Melhoria registrada (pós-ETAPA 5, revisão antes da publicação):**
> Revisar o critério "perfil configurado" (`needsTrainerSetup`). Hoje qualquer campo
> opcional preenchido (avatar_url/cref/niche/phone/location/bio/instagram) já
> considera o setup concluído, o que pode gerar falsos positivos em perfis antigos
> que tenham apenas um campo preenchido. Avaliar posteriormente utilizar um
> **conjunto mínimo de campos obrigatórios** (ex.: nome + especialidade) para
> definir a conclusão — sem criar campo novo no banco. **Não implementado agora.**

### ETAPA 6 — Fluxo Aluno

Regra: **Aluno não cria conta independente.**

```
Sou Aluno
  ↓
Digite código recebido do Personal
  ↓
Criar conta
  ↓
Entrar no treino
```

Validação:
- vínculo com o Personal é obrigatório;
- acesso somente após convite válido.

### ETAPA 7 — Usuário Existente

```
Abrir aplicativo
  ↓
Splash
  ↓
Verificar sessão Supabase
  ↓
Usuário autenticado
```

Direcionamento:
- Personal → Dashboard;
- Aluno → Meu treino do dia.

Nunca mostrar: onboarding; login; escolha de perfil.

### ETAPA 8 — Tratamento Offline

Caso sem internet, mostrar:

```
Sem conexão

Algumas informações podem estar indisponíveis.

[ Tentar novamente ]
```

Permitir: retry; recuperação automática.

### ETAPA 9 — Atualização do Aplicativo

Usuário antigo:

```
Abrir app
  ↓
Splash
  ↓
Atualização de dados
  ↓
Área principal
```

Nunca repetir: onboarding; escolha de perfil; cadastro inicial.

### ETAPA 10 — Tela Inicial Inteligente

Fallback:

```
VSFit Personal

Seu treino.
Seus alunos.
Sua evolução.

[ Entrar ]
[ Criar conta ]
```

Com inteligência:
- Primeira instalação → onboarding;
- Usuário antigo → acesso direto;
- Aluno convidado → código do Personal;
- Personal → cadastro/login.

### ETAPA 11 — Testes de Regressão

- **Novo Personal:** instalar APK limpo; abrir; visualizar onboarding;
  escolher Personal; criar conta; configurar perfil.
- **Novo Aluno:** instalar; onboarding; escolher Aluno; inserir código; criar
  conta; acessar treino.
- **Usuário autenticado:** fechar app; abrir novamente; entrar direto.
- **Offline:** abrir sem internet; visualizar mensagem; recuperar conexão.
- **Atualização:** simular atualização; confirmar que onboarding não reaparece.

### Critérios de conclusão

- ✅ Splash profissional funcionando
- ✅ Onboarding implementado
- ✅ Personal e Aluno separados desde o início
- ✅ Cadastro Personal estruturado
- ✅ Convite obrigatório para Aluno
- ✅ Sessão Supabase preservada
- ✅ Offline tratado
- ✅ Atualização sem repetir fluxo
- ✅ Testado em APK real

### Resultado esperado

O VSFit Personal passa a ter uma experiência de entrada equivalente a um
aplicativo comercial:

> Instala → entende o produto → escolhe seu papel → entra no fluxo correto.

A arquitetura fica preparada para publicação na Play Store e crescimento de
usuários.

## Sprint 18 — Versão Desktop 📋

- Status: 📋 **Planejada**
- Escopo: versão desktop (Responsividade ampliada / app desktop).

## AI para Personal (POSTERGADA)

- Status: ⏸️ **Postergada para versão futura, após o Sprint 18.**

---

## Política de fechamento

1. Cada sprint é validada no Preview antes de ser marcada como concluída.
2. Depois de concluída, nenhuma alteração é feita naquela entrega — ajustes viram
   HOTFIX em branch própria.
3. Integração à `main` só após aprovação explícita.
4. Documentação de sprint detalhada em `SPRINT-<n>.md`.
