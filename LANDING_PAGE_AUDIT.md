# Auditoria para Landing Page — VSFit Personal

## 1. Resumo executivo

O VSFit Personal é uma plataforma fitness completa que conecta personal trainers e alunos. Desenvolvido em React + TypeScript + Vite, com estilos Tailwind CSS, animações Framer Motion e backend Supabase. O projeto já possui uma landing page funcional em `/`, navegação por roteamento SPA (browser router), suporte a PWA no iOS e APK Android via Capacitor. A landing page atual contém seções de herói, funcionalidades, instalação e FAQ, mas carece de mockups reais (usa placeholders), seção de planos/preços, depoimentos, SEO estruturado, imagens de dispositivos reais e conteúdo institucional.

## 2. Identidade do produto

| Item | Valor |
|------|-------|
| **Nome do aplicativo** | `vsfit-temp` (package.json), exibido como "VSFit Personal" |
| **Nome no navegador** | VSFit Personal |
| **Short name (PWA/APK)** | VSFit |
| **Slogan/Descrição** | "Plataforma fitness para personal trainers e alunos." |
| **Objetivo principal** | Conectar personal trainers e alunos com treinos personalizados, acompanhamento de progresso, nutrição, chat e gestão financeira |
| **Público-alvo** | Personal trainers (profissionais de educação física) e seus alunos |
| **Site oficial** | `https://vsfit-gym-personal.vercel.app` (do .env, via variável APP_URL) |

## 3. Tecnologias

| Tecnologia | Versão |
|------------|--------|
| **React** | ^19.2.17 (via @types/react) |
| **Vite** | ^8.0.12 |
| **TypeScript** | ~6.0.2 |
| **Tailwind CSS** | ^3.4.19 |
| **Node** | Não especificada (não há .nvmrc ou engines) |

### Dependências principais

| Pacote | Versão | Finalidade |
|--------|--------|------------|
| `react-router-dom` | ^6.30.4 | Roteamento SPA |
| `@supabase/supabase-js` | ^2.108.1 | Backend e autenticação |
| `framer-motion` | ^12.40.0 | Animações |
| `lucide-react` | ^1.17.0 | Ícones |
| `zustand` | ^5.0.14 | Gerenciamento de estado |
| `@capacitor/core` | ^8.4.1 | Capacitor (Android) |
| `@capacitor/android` | ^8.4.1 | Build Android |
| `@capacitor/cli` | ^8.4.1 | CLI Capacitor |

### Scripts disponíveis (package.json)

| Script | Comando |
|--------|---------|
| `dev` | `vite` |
| `build` | `tsc && vite build` |
| `preview` | `vite preview` |

### Estrutura geral do projeto

```
vsfit-personal-v2/
├── android/          # Projeto Android (Capacitor)
├── dist/             # Build gerado
├── public/           # Arquivos estáticos
│   ├── icons/        # Ícones PWA
│   ├── images/       # Imagens públicas
│   ├── manifest.json # Manifest PWA
│   └── favicon.png, apple-touch-icon.png, favicon.svg, icons.svg
├── src/
│   ├── app/          # App.tsx e rotas
│   ├── assets/       # Recursos de marca
│   ├── components/   # Componentes React
│   │   ├── brand/    # Marca/logo
│   │   ├── landing/  # Componentes da landing page
│   │   ├── layout/   # Layouts (shells)
│   │   └── ui/       # Componentes reutilizáveis
│   ├── data/         # Dados (catálogo de exercícios)
│   ├── hooks/        # Hooks customizados
│   ├── lib/          # Utilitários
│   ├── pages/        # Páginas do sistema
│   │   ├── admin/    # Painel admin
│   │   ├── auth/     # Login, cadastro
│   │   ├── personal/ # Painel do personal
│   │   ├── public/   # Páginas públicas
│   │   ├── student/  # Painel do aluno
│   │   └── LandingPage.tsx
│   ├── services/     # Serviços (API/Supabase)
│   ├── store/        # Stores (Zustand)
│   └── types/        # Tipos TypeScript
├── supabase/         # Supabase
│   └── functions/    # Edge Functions
│       ├── create-checkout-session/
│       ├── create-mercadopago-subscription/
│       ├── create-or-reset-student-auth/
│       ├── create-student-access/
│       └── mercadopago-webhook/
├── index.html
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts (não encontrado — provavelmente usa padrão Vite)
├── capacitor.config.ts
└── package.json
```

## 4. Identidade visual

### Logos

| Arquivo | Caminho |
|---------|---------|
| Logo principal (PNG) | `/src/assets/brand/vsfit-logo.png` |
| Logo no build | `dist/assets/vsfit-logo-ChKPIkYW.png` |

### Ícones

| Ícone | Caminho |
|-------|---------|
| Favicon | `/public/favicon.png` |
| Favicon SVG | `/public/favicon.svg` |
| Icons SVG | `/public/icons.svg` |
| Apple Touch Icon | `/public/apple-touch-icon.png` |
| Ícone PWA 192 | `/public/icons/icon-192.png` |
| Ícone PWA 512 | `/public/icons/icon-512.png` |
| Ícone PWA maskable | `/public/icons/icon-maskable-512.png` |
| Ícone Android (vários tamanhos) | `/android/app/src/main/res/mipmap-*/ic_launcher.png` |

### Cores (definidas no tailwind.config.js)

| Token | Cor | Uso |
|-------|-----|-----|
| `vs-dark` | `#050505` | Fundo principal |
| `vs-dark-2` | `#080808` | Fundo secundário |
| `vs-card` | `rgba(255,255,255,0.04)` | Fundo de cards |
| `vs-border` | `rgba(255,255,255,0.10)` | Bordas |
| `vs-primary` | `#ff2a32` | Cor de destaque (vermelho) |
| `vs-text` | `#ffffff` | Texto principal |
| `vs-muted` | `#a1a1aa` | Texto secundário |

### Fontes

- Inter (Google Fonts) — principal e display
- Fallback: system-ui, sans-serif

### Gradientes

- `glass-gradient`: `linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))`
- `text-gradient`: gradient from `vs-primary` to `orange-500`

### Classes utilitárias CSS (index.css)

- `.glass-card` — card com fundo semi-transparente, borda, bordas arredondadas (rounded-2xl), backdrop blur
- `.btn-primary` — botão principal (fundo vs-primary, texto branco)
- `.btn-secondary` — botão secundário (fundo branco/5, borda)
- `.btn-ghost` — botão ghost (texto muted)
- `.input-field` — campo de input
- `.chip` / `.chip-active` — chips/tags
- `.bottom-nav` — navegação inferior fixa
- `.page-container` — container de página (max-w-lg, padding)

### Componentes visuais reutilizáveis

| Componente | Arquivo |
|------------|---------|
| Button | `src/components/ui/Button.tsx` — variantes: primary, secondary, ghost, danger |
| Card | `src/components/ui/Card.tsx` — .glass-card |
| Modal | `src/components/ui/Modal.tsx` — sheet bottom sheet animado |
| Header | `src/components/ui/Header.tsx` — sticky com back button |
| BottomNav | `src/components/ui/BottomNav.tsx` — navegação inferior fixa |
| Input | `src/components/ui/Input.tsx` |
| Badge | `src/components/ui/Badge.tsx` |
| EmptyState | `src/components/ui/EmptyState.tsx` |
| LoadingScreen | `src/components/ui/LoadingScreen.tsx` |
| Sidebar | `src/components/layout/Sidebar.tsx` |
| BrandMark | `src/components/brand/BrandMark.tsx` — logo component com tamanhos xs a xl |

### Imagens existentes

| Arquivo | Caminho |
|---------|---------|
| Logo VSFit | `/src/assets/brand/vsfit-logo.png` |
| Workout card muscle | `/public/images/workout-card-muscle.png` |

### Mockups e imagens promocionais

O código referencia imagens em `/landing/dashboard.webp` e `/landing/student-home.webp`, mas **o diretório `/public/landing/` não existe**. Os placeholders de fallback (via onError) usam `via.placeholder.com`. **Não há mockups reais no projeto.**

## 5. Rotas públicas e privadas

O projeto usa `createBrowserRouter` (browser router, não hash router) definido em `src/app/routes.tsx`.

### Rotas públicas

| URL | Componente | Exige login | Tipo |
|-----|-----------|-------------|------|
| `/` | `LandingPage` | Não | Pública |
| `/auth/login` | `LoginPage` | Não | Login do personal |
| `/auth/register` | `RegisterPage` | Não | Cadastro do personal |
| `/auth/student-login` | `StudentLoginPage` | Não | Login do aluno |
| `/auth/forgot-password` | `ForgotPasswordPage` | Não | Recuperação de senha |
| `/public/signup` | `SignupPublicPage` | Não | Cadastro público via link |

### Rotas privadas — Personal Trainer

| URL | Componente | Exige login |
|-----|-----------|-------------|
| `/personal/dashboard` | `DashboardPage` | Sim |
| `/personal/notifications` | `NotificationsPage` | Sim |
| `/personal/students` | `StudentsPage` | Sim |
| `/personal/students/:id` | `StudentProfilePage` | Sim |
| `/personal/workout-builder` | `WorkoutBuilderPage` | Sim |
| `/personal/exercise-library` | `ExerciseLibraryPage` | Sim |
| `/personal/nutrition` | `NutritionPage` | Sim |
| `/personal/progress` | `ProgressPage` | Sim |
| `/personal/financial` | `FinancialPage` | Sim |
| `/personal/chat` | `ChatPage` | Sim |
| `/personal/signup-links` | `SignupLinksPage` | Sim |
| `/personal/reports` | `ReportsPage` | Sim |
| `/personal/profile` | `TrainerProfilePage` | Sim |
| `/personal/trainer-profile` | `TrainerProfilePage` | Sim |
| `/personal/subscription` | `SubscriptionPage` | Sim |

### Rotas privadas — Aluno

| URL | Componente | Exige login |
|-----|-----------|-------------|
| `/student/home` | `StudentHomePage` | Sim |
| `/student/workouts` | `StudentWorkoutsPage` | Sim |
| `/student/workout-detail/:id` | `WorkoutDetailPage` | Sim |
| `/student/workout-execution/:id` | `WorkoutExecutionPage` | Sim |
| `/student/workout-completed/:id` | `WorkoutCompletedPage` | Sim |
| `/student/progress` | `StudentProgressPage` | Sim |
| `/student/nutrition` | `StudentNutritionPage` | Sim |
| `/student/chat` | `StudentChatPage` | Sim |
| `/student/profile` | `StudentProfile` | Sim |
| `/student/profile/:id` | `StudentProfile` | Sim |

### Rotas privadas — Admin

| URL | Componente | Exige login |
|-----|-----------|-------------|
| `/admin/dashboard` | `AdminDashboardPage` | Sim |
| `/admin/trainers` | `TrainersPage` | Sim |
| `/admin/trainers/:id/approve` | `TrainerApprovalPage` | Sim |
| `/admin/subscriptions` | `AdminSubscriptionsPage` | Sim |
| `/admin/financial` | `AdminFinancialPage` | Sim |
| `/admin/reports` | `AdminReportsPage` | Sim |

### Informações importantes sobre rotas

- **Rota `/` já está ocupada** pela `LandingPage`. Qualquer landing page nova deve substituí-la ou continuar na mesma rota.
- **Login do personal e do aluno são separados**: `/auth/login` (personal) e `/auth/student-login` (aluno).
- **Rota para "Criar conta"**: `/auth/register`.
- **Rota para "Acessar pela Web"**: `/auth/login`.
- **Personal e aluno usam o mesmo backend Supabase Auth mas com fluxos de login diferentes**.

## 6. Funcionalidades do personal

| Funcionalidade | Status | Arquivo principal | Rota |
|----------------|--------|-------------------|------|
| Dashboard com visão geral | Implementada | `DashboardPage.tsx` | `/personal/dashboard` |
| Cadastro de alunos | Implementada | `StudentsPage.tsx` | `/personal/students` |
| Edição de alunos | Implementada | `StudentProfilePage.tsx` | `/personal/students/:id` |
| Exclusão de alunos | Implementada (via serviço) | `studentService.ts` | — |
| Acesso do aluno (login) | Implementada | `StudentLoginPage.tsx` | `/auth/student-login` |
| Redefinição de senha do aluno | Implementada | `resetStudentPassword.ts` | — |
| Montador de treino | Implementada | `WorkoutBuilderPage.tsx` | `/personal/workout-builder` |
| Treino por dia da semana | Implementada | `WorkoutBuilderPage.tsx` | — |
| Bi-set | Implementada | tipos `workout.ts`, `database.ts` | — |
| Drop-set | Implementada | tipos `workout.ts`, `database.ts` | — |
| Datas de início e fim | Implementada | `WorkoutPlan` tipo | — |
| Biblioteca de exercícios | Implementada | `ExerciseLibraryPage.tsx`, `exercisesCatalog.ts` | `/personal/exercise-library` |
| Progresso | Implementada | `ProgressPage.tsx` | `/personal/progress` |
| Biometria | Implementada | `StudentMetrics` tipo | — |
| Fotos de alunos | Implementada | `StudentProfilePage.tsx` | — |
| Financeiro | Implementada | `FinancialPage.tsx` | `/personal/financial` |
| Pix | Implementada | `paymentService.ts` | — |
| Pagamentos | Implementada | `paymentService.ts` | — |
| Chat | Implementada | `ChatPage.tsx` | `/personal/chat` |
| CRM (captação de leads) | Implementada | `SignupLinksPage.tsx`, `signupService.ts` | `/personal/signup-links` |
| Portfólio | **Não encontrado** | — | — |
| Relatórios | Implementada | `ReportsPage.tsx` | `/personal/reports` |
| Notificações | Implementada | `NotificationsPage.tsx`, `Notification` tipo | `/personal/notifications` |
| Verificação de CREF | Implementada | `TrainerApprovalPage.tsx` | `/admin/trainers/:id/approve` |
| Perfil do personal | Implementada | `TrainerProfilePage.tsx` | `/personal/profile` |
| Nutrição (planos alimentares) | Implementada | `NutritionPage.tsx` | `/personal/nutrition` |
| Assinatura / Upgrade | Implementada | `SubscriptionPage.tsx` | `/personal/subscription` |

### Observações

- O sistema usa **dados reais do Supabase** — não há mocks.
- As funcionalidades parecem **completas** para um MVP funcional.
- Captação de alunos (signup links) gera links públicos que levam leads para a rota `/public/signup`.

## 7. Funcionalidades do aluno

| Funcionalidade | Status | Arquivo principal | Rota |
|----------------|--------|-------------------|------|
| Treino do dia | Implementada | `StudentHomePage.tsx` | `/student/home` |
| Organização por dia da semana | Implementada | `StudentWorkoutsPage.tsx` | `/student/workouts` |
| Execução guiada | Implementada | `WorkoutExecutionPage.tsx` | `/student/workout-execution/:id` |
| Cronômetro | Implementada | `WorkoutExecutionPage.tsx` | — |
| Descanso entre séries | Implementada | `WorkoutExecutionPage.tsx` | — |
| Bi-set | Implementada | tipos `workout.ts` | — |
| Drop-set | Implementada | tipos `workout.ts` | — |
| Progresso | Implementada | `StudentProgressPage.tsx` | `/student/progress` |
| Fotos de evolução | Implementada | `StudentProgressPage.tsx` | — |
| Chat | Implementada | `StudentChatPage.tsx` | `/student/chat` |
| Perfil | Implementada | `StudentProfilePage.tsx` | `/student/profile` |
| Conquistas | Implementada | `StudentHomePage.tsx` (streak) | — |
| Notificações | Implementada | `StudentNotificationsPage.tsx` | — |
| Nutrição (planos alimentares) | Implementada | `StudentNutritionPage.tsx` | `/student/nutrition` |
| Detalhes do treino | Implementada | `WorkoutDetailPage.tsx` | `/student/workout-detail/:id` |
| Treino completado | Implementada | `WorkoutCompletedPage.tsx` | `/student/workout-completed/:id` |

### Observações

- O aluno acessa por meio de conta criada pelo personal (via `student_accounts`).
- O aluno pode ter senha temporária e precisa trocar no primeiro acesso.
- O app do aluno possui streak (sequência de treinos), contagem semanal e total.

## 8. Funcionalidades administrativas

| Funcionalidade | Status | Arquivo principal | Rota |
|----------------|--------|-------------------|------|
| Dashboard admin | Implementada | `AdminDashboardPage.tsx` | `/admin/dashboard` |
| Gestão de personal trainers | Implementada | `TrainersPage.tsx` | `/admin/trainers` |
| Aprovação de CREF | Implementada | `TrainerApprovalPage.tsx` | `/admin/trainers/:id/approve` |
| Gestão de assinaturas | Implementada | `AdminSubscriptionsPage.tsx` | `/admin/subscriptions` |
| Financeiro admin | Implementada | `AdminFinancialPage.tsx` | `/admin/financial` |
| Relatórios admin | Implementada | `AdminReportsPage.tsx` | `/admin/reports` |

## 9. Planos e preços

Os planos são definidos em dois locais principais:

### `src/lib/planLimits.ts` — limites hardcoded

| Plano | Preço/mês | Limite alunos | Recursos |
|-------|-----------|---------------|----------|
| **Free** | R$ 0 | 1 | Biblioteca de exercícios, Montador de treinos |
| **Pro** | R$ 49,90 | 3 | Biblioteca completa, Chat, Financeiro básico, Captação (3 links) |
| **Premium** | R$ 99,90 | Ilimitado | Biblioteca completa, Chat completo, Financeiro avançado, Captação ilimitada, Relatórios avançados |

### `src/services/subscriptionService.ts` — fallback prices

- Free: R$ 0
- Pro: R$ 49,90 (hardcoded)
- Premium: R$ 99,90 (hardcoded)

### Observações sobre planos

- **Preços estão hardcoded** como fallback. O sistema também consulta `subscription_plans` no banco.
- **Não existe plano anual** explícito no código.
- **Não existe teste gratuito** explícito (há status `trialing` no banco, mas não na interface).
- **Student_limit** no Free é 1, Pro é 3, Premium é Infinity.
- O checkout usa **Mercado Pago** (não Stripe, apesar da variável `VITE_STRIPE_PUBLISHABLE_KEY` no `.env` — o código chama a Edge Function `create-mercadopago-subscription`).
- O campo `stripe_customer_id` e `stripe_subscription_id` existem no tipo `Subscription` mas não são usados no frontend — parece legado ou preparação futura.

## 10. APK Android

| Item | Informação |
|------|------------|
| **Arquivo .apk dentro do projeto** | Não encontrado |
| **Build Capacitor configurado** | Sim |
| **Android project** | `/android/` completo com Gradle |
| **Pacote Android** | `com.vsfit.app` |
| **Application ID** | `com.vsfit.app` |
| **Nome do APK** | `vsfit-personal` (strings.xml) |
| **Version Code** | 1 |
| **Version Name** | "1.0" |
| **Ícone Android** | Configurado (vários mipmaps) |
| **Splash screen** | Configurada (várias resoluções) |
| **Permissões** | Apenas `INTERNET` |
| **URL download APK** | `VITE_ANDROID_APK_URL` (variável de ambiente) ou fallback `/downloads/vsfit-personal.apk` |
| **Diretório `/public/downloads/`** | **Não existe** |
| **Status** | O projeto Android está configurado e compilável, mas **não há APK no repositório**. É necessário executar `npx cap sync android && npx cap open android` e buildar pelo Android Studio, ou configurar CI/CD. |

### O que falta para disponibilizar o download

1. Buildar o APK via Android Studio ou linha de comando Gradle.
2. Colocar o APK em `/public/downloads/vsfit-personal.apk` ou hospedar em CDN (ex: Supabase Storage, S3).
3. Configurar a variável de ambiente `VITE_ANDROID_APK_URL` apontando para o arquivo.
4. (Opcional) Configurar assinatura do APK para produção.

## 11. PWA e instalação no iPhone

### Configuração PWA atual

| Item | Configurado? | Valor |
|------|-------------|-------|
| `manifest.json` | Sim | `/public/manifest.json` |
| `name` | Sim | "VSFit Personal" |
| `short_name` | Sim | "VSFit" |
| `display` | Sim | "standalone" |
| `orientation` | Sim | "portrait" |
| `background_color` | Sim | `#050505` |
| `theme_color` | Sim | `#050505` |
| `start_url` | Sim | "/" |
| `scope` | Sim | "/" |
| `icons` (192, 512, maskable) | Sim | `/public/icons/` |
| `apple-touch-icon` | Sim | `<link rel="apple-touch-icon">` no index.html |
| `apple-mobile-web-app-capable` | Sim | `<meta>` no index.html |
| `apple-mobile-web-app-title` | Sim | "VSFit" |
| `apple-mobile-web-app-status-bar-style` | Sim | "black-translucent" |
| `mobile-web-app-capable` | Sim | `<meta>` |
| `theme-color` meta | Sim | `#050505` |
| Service worker | **Não** | Vite-plugin-pwa não está no package.json |
| `vite-plugin-pwa` | **Não** | Não está instalado |
| Cache offline | **Não** | Sem service worker |
| Screenshots | **Não** | Não no manifest |
| Shortcuts | **Não** | Não no manifest |

### Pode ser instalado no iPhone?

**Sim**, o PWA funciona no Safari. O usuário deve:

1. Abrir o site no Safari.
2. Tocarem no ícone Compartilhar (ícone de seta para cima).
3. Selecionar "Adicionar à Tela de Início".
4. Confirmar tocando em "Adicionar" no canto superior direito.

### Pode ser instalado no Android?

**Sim**, via Chrome. O navegador deve exibir o banner "Instalar aplicativo" automaticamente. Mas sem service worker, o banner pode não aparecer. Alternativa: baixar o APK.

### Possíveis problemas de configuração

1. **Sem service worker** — sem cache offline, sem atualização automática, sem suporte total a PWA.
2. **Os ícones têm tamanho 1024x1024 declarado** mas os arquivos reais podem ser 192x192 e 512x512.
3. **Falta splash screen iOS** — não há meta tags específicas para splash screen.

### Texto para a landing page: "Como instalar no iPhone"

**Como instalar no iPhone**

1. Abra este site no Safari (não funciona em outros navegadores no iPhone).
2. Toque no ícone de Compartilhar na barra inferior do Safari.
3. Role a lista e selecione "Adicionar à Tela de Início".
4. Edite o nome se desejar e toque em "Adicionar" no canto superior direito.
5. Pronto! O ícone do VSFit aparecerá na tela de início do seu iPhone.

## 12. Acesso web e URLs

| Item | Valor |
|------|-------|
| **URL da Vercel** | `https://vsfit-gym-personal.vercel.app` (da variável `APP_URL` no .env) |
| **Domínio personalizado** | Não encontrado no código |
| **Router** | Browser router (`createBrowserRouter`) |
| **Base URL** | `/` |
| **Vercel config para SPA** | `vercel.json` não encontrado |
| **URL de login personal** | `/auth/login` |
| **URL de login aluno** | `/auth/student-login` |
| **URL de cadastro** | `/auth/register` |
| **URL para "Acessar pela Web"** | `/auth/login` |
| **URL para "Criar conta"** | `/auth/register` |
| **URL do painel web** | `/personal/dashboard` (personal) ou `/student/home` (aluno) |
| **URLs em emails** | Não encontrado |
| **URLs em convites** | `/public/signup` (via signup links) |
| **URL de recuperação de senha** | `/auth/forgot-password` |

### Variáveis de ambiente relacionadas a URL

- `APP_URL`
- `VITE_APP_URL`
- `VITE_SUPABASE_URL` (apenas o nome da variável)
- `VITE_SUPABASE_ANON_KEY` (apenas o nome da variável)
- `VITE_STRIPE_PUBLISHABLE_KEY` (apenas o nome da variável)
- `VITE_ANDROID_APK_URL`

### Risco de conflito de rotas

Não há rota de conflito. A rota `/` está ocupada pela landing page, o que é correto. Recomenda-se manter a landing page em `/`.

## 13. Redes sociais e contato

| Item | Encontrado? | Valor | Arquivo |
|------|-------------|-------|---------|
| Instagram | Sim (campo no banco) | `instagram` no tipo `TrainerProfile` | `src/types/database.ts` |
| WhatsApp | Não encontrado como contato institucional | — | — |
| Email de suporte | **Não encontrado** | — | — |
| Telefone | **Não encontrado** | — | — |
| Política de privacidade | **Não encontrado** | — | — |
| Termos de uso | **Não encontrado** | — | — |
| CNPJ | **Não encontrado** | — | — |
| Nome empresarial | **Não encontrado** | — | — |
| Nome da responsável | **Não encontrado** | — | — |
| CREF | **Não encontrado** | — | — |
| Endereço | **Não encontrado** | — | — |

**Conclusão:** Não há informações institucionais de contato, redes sociais, termos ou política de privacidade no projeto. Tudo precisará ser criado para a landing page.

## 14. Imagens e telas recomendadas

### Telas do Personal (sugeridas para mockups)

| Tela | Rota | Arquivo | O que demonstra |
|------|------|---------|-----------------|
| Dashboard | `/personal/dashboard` | `DashboardPage.tsx` | Visão geral com cards de alunos, treinos, mensagens, faturamento |
| Alunos | `/personal/students` | `StudentsPage.tsx` | Lista de alunos com status, busca |
| Montador de treino | `/personal/workout-builder` | `WorkoutBuilderPage.tsx` | Interface de criação de treinos com exercícios |

### Telas do Aluno (sugeridas para mockups)

| Tela | Rota | Arquivo | O que demonstra |
|------|------|---------|-----------------|
| Home do aluno | `/student/home` | `StudentHomePage.tsx` | Treino do dia, streak, cards de ação |
| Treinos | `/student/workouts` | `StudentWorkoutsPage.tsx` | Lista de treinos com filtros, status de vencimento |
| Execução de treino | `/student/workout-execution/:id` | `WorkoutExecutionPage.tsx` | Execução guiada com cronômetro e descanso |

### Tela de progresso

| Tela | Rota | Arquivo |
|------|------|---------|
| Progresso do aluno | `/student/progress` | `StudentProgressPage.tsx` |

### Tela financeira

| Tela | Rota | Arquivo |
|------|------|---------|
| Financeiro do personal | `/personal/financial` | `FinancialPage.tsx` |

### Capturas de tela existentes

**Não existem capturas de tela no projeto.** O código referencia `/landing/dashboard.webp` e `/landing/student-home.webp` mas esses arquivos não existem.

### Recomendação

Para a landing page, use screenshots reais do sistema rodando com dados de demonstração. As telas mais impactantes são:
1. Dashboard do personal com dados reais
2. Home do aluno com treino do dia
3. Tela de execução de treino (cronômetro)
4. Tela financeira com gráficos/pagamentos

## 15. SEO

### Configuração atual (`index.html`)

| Item | Valor atual | Status |
|------|-------------|--------|
| `<title>` | "VSFit Personal" | ✅ Configurado |
| `<meta description>` | "VSFit Personal — plataforma para personal trainers e alunos." | ✅ Configurado |
| `<meta keywords>` | **Não existe** | ❌ Faltando |
| `lang` | "pt-BR" | ✅ |
| `theme-color` | `#050505` | ✅ |
| `viewport` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | ✅ |
| Open Graph | **Não existe** | ❌ Faltando |
| Twitter Card | **Não existe** | ❌ Faltando |
| `canonical` | **Não existe** | ❌ Faltando |
| `robots.txt` | **Não existe** | ❌ Faltando |
| `sitemap.xml` | **Não existe** | ❌ Faltando |

### Sugestões de SEO

| Tag | Sugestão |
|-----|----------|
| **Título SEO** | "VSFit Personal — Plataforma para Personal Trainers e Alunos" |
| **Meta description** | "VSFit Personal é a plataforma completa para personal trainers gerenciarem treinos, alunos, finanças e comunicação. Disponível para Android e iPhone." |
| **Open Graph title** | "VSFit Personal — Treinos, evolução e gestão em um só lugar" |
| **Open Graph description** | "Conecte personal trainers e alunos com treinos personalizados, acompanhamento de progresso e gestão financeira." |
| **Open Graph image** | `/og-image.png` (precisa ser criado — 1200x630px) |
| **WhatsApp share text** | "VSFit Personal — a plataforma que conecta personal trainers e alunos. Treinos, progresso, chat e finanças em um só lugar. Baixe agora!" |
| **Alt text logo** | "VSFit Personal — Plataforma Fitness" |

## 16. Privacidade e LGPD

| Item | Encontrado? |
|------|-------------|
| Página de política de privacidade | **Não encontrado** |
| Página de termos de uso | **Não encontrado** |
| Banner de cookies | **Não encontrado** |
| Google Analytics | **Não encontrado** |
| Meta Pixel | **Não encontrado** |
| Rastreamento | **Não encontrado** |
| Coleta de dados pessoais | Sim (o sistema coleta nome, email, telefone, biometria, fotos) |
| Informação sobre LGPD | **Não encontrado** |

### Recomendações para a landing page

1. Criar página `/privacidade` com política de privacidade conforme LGPD.
2. Criar página `/termos` com termos de uso.
3. Adicionar banner de cookies se houver rastreamento.
4. Informar na landing page que os dados são protegidos e armazenados com segurança no Supabase (RLS, JWT).
5. Incluir link para política de privacidade e termos no footer.

## 17. Conteúdo sugerido para a landing page

### Título principal
"Treinos, evolução e gestão em um só lugar."

### Subtítulo
"O VSFit conecta personal trainers e alunos com treinos personalizados, acompanhamento de progresso, nutrição, chat e gestão financeira."

### Botão principal (CTA)
- "Começar agora" (leads para instalação ou cadastro)
- "Criar conta gratuita"

### Botão secundário
- "Acessar versão web"

### Seção de benefícios (3 cards)

1. **Treinos personalizados** — Monte treinos por dia da semana, com bi-set, drop-set, cronômetro e descanso.
2. **Progresso em tempo real** — Acompanhe medidas, fotos, peso e evolução corporal de cada aluno.
3. **Comunicação direta** — Chat integrado entre personal e aluno com notificações em tempo real.

### Seção para personal trainers
"Menos planilhas. Mais resultados."
**Recursos:** Gestão de alunos, montador de treinos, progresso e biometria, nutrição, financeiro com Pix, captação de alunos via link, relatórios avançados.

### Seção para alunos
"Seu acompanhamento na palma da mão."
**Recursos:** Treino do dia, execução guiada com cronômetro, histórico de exercícios, fotos de evolução, plano alimentar, chat com o personal, conquistas e sequência de treinos.

### Seção de treinos
"Treinos que se encaixam na sua rotina." — Treinos organizados por dia da semana, com técnicas avançadas como bi-set e drop-set, data de início e fim, e renovação automática.

### Seção de progresso
"Sua evolução, documentada." — Registro de medidas corporais, fotos de antes/depois, peso, percentual de gordura e massa muscular com gráficos de evolução.

### Seção financeira
"Controle financeiro sem estresse." — Gestão de mensalidades, cobranças com Pix, controle de pagos/pendentes/atrasados, envio de cobranças por WhatsApp, extrato mensal e anual.

### Seção de comunicação
"Tudo que importa, num só chat." — Chat integrado com notificações, envio de comprovantes, cobranças e comunicação direta entre personal e aluno.

### Seção de download
"Baixe o app e leve seus treinos para qualquer lugar." — Disponível para Android (APK) e iPhone (PWA via Safari).

### Seção PWA
"Instale no seu iPhone em segundos." — 4 passos simples para adicionar à tela de início pelo Safari.

### Seção de acesso web
"Acesso direto pelo navegador." — Funciona em qualquer dispositivo, sem instalação.

### Seção de planos
**Free** — R$ 0/mês (1 aluno, básico)
**Pro** — R$ 49,90/mês (até 3 alunos, financeiro básico)
**Premium** — R$ 99,90/mês (alunos ilimitados, recursos completos)

### Chamada final (CTA)
"Pronto para profissionalizar seu atendimento?"
"Crie sua conta gratuita e comece agora."

### Perguntas frequentes (FAQ)

1. **O VSFit é gratuito para alunos?** — Sim, o acesso do aluno é gratuito. Quem assina é o personal trainer.
2. **Preciso de Android ou iOS?** — Compatível com ambos. Android via APK, iPhone via PWA (Safari).
3. **Meus dados estão seguros?** — Sim, usamos Supabase com autenticação JWT e RLS.
4. **Como funciona o plano alimentar?** — O personal cadastra a dieta e o aluno recebe notificações.
5. **Posso usar em mais de um dispositivo?** — Sim, via navegador ou app instalado.
6. **Como o personal começa a usar?** — Basta criar uma conta e cadastrar os alunos.

## 18. Arquivos necessários

Para criar a landing page, o desenvolvedor precisará destes arquivos:

**Arquivos principais do sistema**
- `src/app/App.tsx`
- `src/app/routes.tsx`
- `src/main.tsx`
- `index.html`
- `package.json`
- `tailwind.config.js`
- `postcss.config.js`
- `tsconfig.json`
- `src/index.css`

**Componentes da landing page atual (para referência)**
- `src/pages/LandingPage.tsx`
- `src/components/landing/LandingHeader.tsx`
- `src/components/landing/LandingHero.tsx`
- `src/components/landing/PersonalFeatures.tsx`
- `src/components/landing/StudentFeatures.tsx`
- `src/components/landing/DynamicInstallGuide.tsx`
- `src/components/landing/DeviceAwareCTA.tsx`
- `src/components/landing/LandingFAQ.tsx`

**Componentes de UI reutilizáveis**
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/Header.tsx`
- `src/components/ui/BottomNav.tsx`

**Marca e imagens**
- `src/assets/brand/vsfit-logo.png`
- `src/components/brand/BrandMark.tsx`
- `public/favicon.png`
- `public/favicon.svg`
- `public/icons.svg`
- `public/apple-touch-icon.png`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/icon-maskable-512.png`
- `public/images/workout-card-muscle.png`
- `public/manifest.json`

**Planos e assinatura**
- `src/lib/planLimits.ts`
- `src/services/subscriptionService.ts`
- `src/types/database.ts` (Subscription, SubscriptionPlan)
- `src/pages/personal/SubscriptionPage.tsx`

**APK e PWA**
- `capacitor.config.ts`
- `android/app/build.gradle`
- `android/app/src/main/AndroidManifest.xml`
- `src/hooks/useDeviceDetection.ts`

**Outros**
- `src/lib/utils.ts`
- `src/lib/supabase.ts` (apenas nomes de variáveis)
- `src/lib/formatters.ts`

## 19. Informações não encontradas

| Item | Status |
|------|--------|
| Vite config (`vite.config.ts`) | Não encontrado — provavelmente usa configuração padrão |
| Diretório `/public/landing/` | Não existe |
| Diretório `/public/downloads/` | Não existe |
| APK dentro do projeto | Não existe |
| `vercel.json` | Não encontrado |
| `robots.txt` | Não existe |
| `sitemap.xml` | Não existe |
| Open Graph tags | Não existem |
| Twitter Card tags | Não existem |
| `vite-plugin-pwa` | Não está instalado |
| Service worker | Não existe |
| Stripe checkout (ativo) | Não — usa Mercado Pago |
| Plano anual | Não encontrado |
| Teste gratuito | Não encontrado na interface |
| Política de privacidade | Não existe |
| Termos de uso | Não existe |
| Banner de cookies | Não existe |
| Google Analytics | Não encontrado |
| Meta Pixel | Não encontrado |
| Email institucional | Não encontrado |
| WhatsApp institucional | Não encontrado |
| Redes sociais institucionais | Não encontrado |
| CNPJ | Não encontrado |
| Nome empresarial | Não encontrado |
| Nome da responsável | Não encontrado |
| CREF institucional | Não encontrado |
| Endereço | Não encontrado |
| Depoimentos | Não existem |
| Capturas de tela reais | Não existem |
| Screenshots | Não existem |
| Vídeos promocionais | Não existem |
| GIFs promocionais | Não existem |

## 20. Recomendações técnicas

### Prioridade alta

1. **Criar o diretório `/public/landing/`** com screenshots reais do sistema (dashboard.webp, student-home.webp, etc.).
2. **Criar vercel.json** para configuração SPA (fallback para `/index.html`):
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
3. **Adicionar tags Open Graph e Twitter Card** no `index.html` para compartilhamento em redes sociais.
4. **Criar `/public/og-image.png`** (1200x630px) com a marca VSFit.
5. **Instalar `vite-plugin-pwa`** e configurar service worker para cache offline e atualizações automáticas.
6. **Adicionar `robots.txt`** e `sitemap.xml`.

### Prioridade média

7. **Buildar o APK Android** e disponibilizar em `/public/downloads/vsfit-personal.apk` ou CDN.
8. **Configurar `VITE_ANDROID_APK_URL`** no ambiente de produção.
9. **Criar páginas de política de privacidade e termos de uso**.
10. **Configurar corretamente os tamanhos dos ícones no manifest.json** (atualmente declarados como 1024x1024 mas os arquivos são menores).
11. **Adicionar splash screen iOS** via meta tags específicas.

### Prioridade baixa

12. **Adicionar analytics** (Google Analytics, Meta Pixel) com banner de cookies LGPD.
13. **Criar seção de depoimentos** na landing page.
14. **Adicionar animações de scroll** nas seções da landing page.
15. **Otimizar imagens** para WebP/AVIF com fallback.

## 21. Checklist para o responsável pelo projeto

Itens que precisam ser confirmados pelo proprietário antes de finalizar a landing page:

- [ ] **Preço de cada plano** — Confirmar se os valores atuais (Free: R$ 0, Pro: R$ 49,90, Premium: R$ 99,90) estão corretos.
- [ ] **Link definitivo do APK** — Onde o APK será hospedado? URL pública para download.
- [ ] **Domínio oficial** — Confirmar se `https://vsfit-gym-personal.vercel.app` é o domínio final ou se há domínio personalizado.
- [ ] **WhatsApp** — Número de WhatsApp para contato/suporte.
- [ ] **Instagram** — @ oficial do VSFit Personal.
- [ ] **Email de suporte** — Email para contato dos usuários.
- [ ] **Termos de uso** — Texto ou link para os termos de uso.
- [ ] **Política de privacidade** — Texto ou link para a política de privacidade (LGPD).
- [ ] **Depoimentos** — Autorização para usar depoimentos reais de personal trainers e alunos.
- [ ] **Imagens autorizadas** — Fotos reais de personal trainers e alunos podem ser usadas na landing page?
- [ ] **Textos institucionais** — Nome empresarial, CNPJ (se houver), endereço.
- [ ] **Logotipos adicionais** — Precisa de logo em outras cores ou formatos (SVG, branco/preto)?
- [ ] **Cores e identidade visual** — A paleta atual (#050505, #ff2a32) está aprovada? Deseja alterações?
- [ ] **Fontes** — Inter está aprovada ou deseja outra fonte?
- [ ] **Público-alvo principal** — A landing page deve priorizar personal trainers ou alunos?
- [ ] **API/Supabase environment** — Confirmar URLs e variáveis de ambiente para produção.
- [ ] **Screenshots** — Autoriza gerar screenshots do sistema rodando com dados de demonstração?
