# IMPLEMENTATION_PLAN: Cockpit

**Versão:** v1.2  
**Status:** Rascunho  
**Última atualização:** Maio 2026  
**Referências:** PRD_Cockpit_v0.5.md · DATA_MODEL_v1.2.md

> Cada bloco é revisável e entregável de forma independente.  
> Não avance para o próximo bloco enquanto o atual não estiver funcional e com critérios de aceite cumpridos.

---

## Stack definitiva

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | Server components, Server Actions, deploy fácil |
| Linguagem | **TypeScript** | Tipagem do modelo de dados evita bugs de contrato |
| Banco de dados | **Supabase (Postgres gerenciado)** | Relacional, painel visual, UUID nativo, RLS, sem migração futura |
| ORM / Migrations | **Drizzle ORM + drizzle-kit** | Type-safe, próximo ao SQL, migrations controláveis, não abstrai demais |
| UI base | **shadcn/ui** | Design system pronto, componentes acessíveis |
| Estilização | **Tailwind CSS** | Utility-first, integrado ao shadcn/ui |
| Gráficos | **Recharts** | Leve, integrado ao shadcn/ui charts |
| Formulários | **React Hook Form + Zod** | Validação type-safe, integra bem com shadcn/ui |
| State | **React state / Server Actions** | Sem necessidade de Redux no MVP |
| Testes | **Vitest** | Rápido, configuração mínima, compatível com Next.js |

**O que NÃO entra na stack:**
- `@supabase/supabase-js` — não necessário no MVP; acesso ao banco via Drizzle + `DATABASE_URL` no servidor
- Supabase Auth, Storage, Realtime, Edge Functions — fora do MVP
- Prisma (overhead desnecessário; Drizzle é suficiente)
- Redux / Zustand (state local é suficiente no MVP)
- Next Auth (sem login no MVP)
- Stripe / pagamentos (fora de escopo)

---

## Estrutura de pastas

```
cockpit/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Layout raiz com sidebar
│   ├── page.tsx                  # Redirect → /dashboard
│   ├── dashboard/
│   │   └── page.tsx
│   ├── debts/
│   │   ├── page.tsx              # Lista de dívidas
│   │   └── [id]/
│   │       └── page.tsx          # Detalhe da dívida
│   ├── decision/
│   │   └── page.tsx              # Tela de decisão (MVP 0.2)
│   └── api/                      # Route handlers (se necessário)
│
├── components/
│   ├── ui/                       # Componentes shadcn/ui (auto-gerados)
│   ├── debt/
│   │   ├── DebtForm.tsx          # Sheet/Dialog de cadastro e edição
│   │   ├── DebtRow.tsx           # Linha da tabela de dívidas
│   │   ├── StatusBadge.tsx       # Badge de status da dívida
│   │   ├── PriorityBadge.tsx     # Badge de prioridade
│   │   └── ProposalBadge.tsx     # Badge "com proposta" (condição calculada)
│   ├── proposal/
│   │   ├── ProposalForm.tsx      # Form de nova proposta
│   │   ├── ProposalCard.tsx      # Card de proposta ativa
│   │   └── ProposalHistory.tsx   # Lista de propostas anteriores
│   ├── value-update/
│   │   ├── ValueUpdateForm.tsx   # Form de atualização de valor
│   │   ├── ValueHistory.tsx      # Lista de atualizações
│   │   └── ValueChart.tsx        # Gráfico Recharts (MVP 0.2)
│   ├── dashboard/
│   │   ├── MetricCard.tsx        # Card de métrica
│   │   └── TopList.tsx           # Lista de destaque (top 3)
│   ├── decision/
│   │   └── DecisionCard.tsx      # Card com rótulo de decisão (MVP 0.2)
│   └── layout/
│       ├── AppSidebar.tsx        # Navegação lateral
│       └── PageHeader.tsx        # Cabeçalho de página
│
├── lib/
│   ├── db/
│   │   ├── index.ts              # Cliente Drizzle conectado ao Supabase/Postgres
│   │   ├── schema.ts             # Schema Drizzle (tabelas)
│   │   └── migrations/           # Migrations Drizzle
│   ├── services/
│   │   ├── debt.service.ts       # CRUD de dívidas
│   │   ├── proposal.service.ts   # CRUD de propostas
│   │   ├── value-update.service.ts # CRUD de histórico
│   │   └── dashboard.service.ts  # Queries de totais e rankings
│   ├── calculations.ts           # Funções puras de cálculo
│   └── validations.ts            # Schemas Zod
│
├── types/
│   └── index.ts                  # Tipos TypeScript do domínio
│
├── hooks/
│   └── useDebtFilters.ts         # Estado local de filtros da UI, sem acesso direto ao banco
│
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
└── components.json               # Configuração shadcn/ui
```

---

## Blocos de implementação

---

### Bloco 0 — Setup do projeto

**Objetivo:** projeto rodando com navegação básica, layout principal e conexão com Supabase estabelecida.

**O que fazer:**

1. `npx create-next-app@latest cockpit --typescript --tailwind --app --src-dir=false`
2. Instalar e configurar shadcn/ui: `npx shadcn@latest init`
3. Criar projeto no Supabase. Copiar a connection string Postgres e salvar como `DATABASE_URL` no `.env.local`.
4. Instalar dependências: `drizzle-orm`, `drizzle-kit`, `postgres`, `react-hook-form`, `zod`, `@hookform/resolvers`, `recharts`
5. Configurar `drizzle.config.ts` apontando para a connection string do Supabase (via `DATABASE_URL`)
6. Criar `lib/db/index.ts` com cliente Drizzle conectado ao Postgres do Supabase
7. Criar layout raiz com `AppSidebar` (shadcn/ui `Sidebar`)
8. Criar rotas vazias: `/dashboard`, `/debts`, `/decision`
9. Adicionar `.env.local` ao `.gitignore`. Nunca versionar chaves.

**Variáveis de ambiente obrigatórias (`.env.local`):**

```
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

> `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` não são necessários no MVP. O acesso ao banco é feito exclusivamente via Drizzle + `DATABASE_URL` em Server Actions e Server Components. Nenhuma query roda no browser.

**Regras de acesso ao banco (inegociáveis no MVP):**
- Todas as operações de leitura e escrita acontecem **somente no servidor** (Server Actions, Route Handlers ou Server Components).
- `DATABASE_URL` nunca é exposta ao cliente — nunca usar em Client Components.
- Nenhuma query direta ao Supabase roda no browser.
- `.env.local` está no `.gitignore`. Nunca versionar credenciais.

**Componentes shadcn/ui a instalar:**
`sidebar`, `card`, `button`, `badge`, `table`, `dialog`, `sheet`, `input`, `label`, `select`, `textarea`, `alert`, `alert-dialog`, `separator`, `tooltip`, `skeleton`, `popover`, `calendar`, `dropdown-menu`, `collapsible`

**Critérios de aceite:**

- [ ] `npm run dev` sobe sem erros
- [ ] Navegação entre `/dashboard`, `/debts` e `/decision` funciona
- [ ] Layout com sidebar renderiza corretamente
- [ ] Conexão com Supabase estabelecida (query de teste via Drizzle retorna sem erro)
- [ ] `.env.local` não está versionado
- [ ] Nenhum componente UI criado manualmente — tudo via shadcn/ui

---

### Bloco 1 — Modelagem e persistência

**Objetivo:** schema criado no Supabase, migrations rodando, camada de acesso a dados pronta.

**O que fazer:**

1. Criar `lib/db/schema.ts` com as 3 tabelas usando Drizzle para Postgres (ver DATA_MODEL.md)
2. Configurar `drizzle.config.ts` com `driver: 'pg'` e `DATABASE_URL`
3. Gerar e rodar primeira migration: `npx drizzle-kit generate && npx drizzle-kit migrate`
4. Verificar criação das tabelas e índices no painel do Supabase
5. Habilitar RLS nas 3 tabelas via SQL no Supabase (`ALTER TABLE debts ENABLE ROW LEVEL SECURITY` etc.). No MVP não há policies ativas — o acesso é feito exclusivamente via `DATABASE_URL` no servidor, que bypassa RLS. Habilitar agora garante que, quando login for implementado, policies podem ser adicionadas sem alterar o schema.
6. Criar `types/index.ts` com tipos TypeScript derivados do schema
7. Criar funções CRUD básicas em `lib/services/`
8. Criar schemas Zod em `lib/validations.ts`
9. Criar `lib/calculations.ts` com funções puras

**Schema Drizzle para Postgres (`lib/db/schema.ts`):**

```typescript
import {
  pgTable, uuid, text, integer, date, timestamp, check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const debts = pgTable('debts', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  name:               text('name').notNull(),
  creditor:           text('creditor').notNull(),
  type:               text('type').notNull(),
  status:             text('status').notNull().default('em_aberto'),
  currentValue:       integer('current_value').notNull(),
  originalValue:      integer('original_value'),
  monthlyPayment:     integer('monthly_payment'),
  dueDay:             integer('due_day'),
  dueDate:            date('due_date'),
  totalInstallments:  integer('total_installments'),
  paidInstallments:   integer('paid_installments'),
  overdueSince:       date('overdue_since'),
  priority:           text('priority'),
  perceivedRisk:      text('perceived_risk'),
  notes:              text('notes'),
  tags:               text('tags').array(),
  createdAt:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUpdatedAt:      timestamp('last_updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const debtProposals = pgTable('debt_proposals', {
  id:             uuid('id').primaryKey().defaultRandom(),
  debtId:         uuid('debt_id').notNull().references(() => debts.id, { onDelete: 'cascade' }),
  proposedValue:  integer('proposed_value').notNull(),
  proposedAt:     date('proposed_at').notNull(),
  expiresAt:      date('expires_at'),
  origin:         text('origin'),
  status:         text('status').notNull().default('ativa'),
  notes:          text('notes'),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const debtValueUpdates = pgTable('debt_value_updates', {
  id:             uuid('id').primaryKey().defaultRandom(),
  debtId:         uuid('debt_id').notNull().references(() => debts.id, { onDelete: 'cascade' }),
  recordedValue:  integer('recorded_value').notNull(),
  recordedAt:     date('recorded_at').notNull(),
  source:         text('source'),
  notes:          text('notes'),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

> **Nota:** o índice parcial único `unique_active_proposal_per_debt` deve ser adicionado manualmente via migration SQL — Drizzle ainda não suporta partial unique indexes de forma nativa no helper. Adicionar ao arquivo de migration gerado:
> ```sql
> CREATE UNIQUE INDEX unique_active_proposal_per_debt
>   ON debt_proposals(debt_id) WHERE status = 'ativa';
> ```

**`lib/db/index.ts`:**

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

**Funções de cálculo puras (`lib/calculations.ts`):**

```typescript
// Todos os valores em centavos (integer)
export function calcAdditions(currentValue: number, originalValue: number | null) {
  if (originalValue === null) return null;
  return currentValue - originalValue;
}

export function calcGrowthPct(currentValue: number, originalValue: number | null) {
  if (!originalValue || originalValue === 0) return null;
  return ((currentValue - originalValue) / originalValue) * 100;
}

export function calcDiscountValue(currentValue: number, proposedValue: number) {
  return currentValue - proposedValue;
}

export function calcDiscountPct(currentValue: number, proposedValue: number) {
  if (currentValue === 0) return null;
  return ((currentValue - proposedValue) / currentValue) * 100;
}

export function calcRemainingInstallments(total: number | null, paid: number | null) {
  if (total === null || paid === null) return null;
  return total - paid;
}

// Formatar centavos para BRL
export function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

// Parsear input de valor para centavos
export function parseBRL(value: string): number {
  const clean = value.replace(/[R$\s.]/g, '').replace(',', '.');
  return Math.round(parseFloat(clean) * 100);
}
```

**Critérios de aceite:**

- [ ] Migration roda sem erro e cria as 3 tabelas no Supabase
- [ ] Índices (incluindo o parcial único) visíveis no painel do Supabase
- [ ] RLS habilitado nas 3 tabelas
- [ ] Funções de cálculo têm testes unitários passando (Vitest)
- [ ] Schemas Zod validam corretamente casos válidos e inválidos
- [ ] Nenhuma referência a `valor_quitacao` em `debts` no schema
- [ ] `DATABASE_URL` nunca hardcoded no código; sempre via variável de ambiente

---

### Bloco 2 — CRUD de dívidas

**Objetivo:** cadastrar, editar, listar e ver detalhe de uma dívida.

**O que fazer:**

1. Server actions para criar, atualizar e excluir dívida
2. Página `/debts` com tabela usando `Table` do shadcn/ui
3. `DebtForm.tsx` como `Sheet` lateral (cadastro e edição)
4. Página `/debts/[id]` com detalhe básico (sem histórico e sem gráfico)
5. `StatusBadge.tsx` e `PriorityBadge.tsx`
6. Filtros básicos: status, tipo
7. Ordenação por valor atual

**Fluxo de cadastro:**

```
Usuário clica "Nova dívida"
→ Sheet abre com DebtForm
→ Seção obrigatória: nome, credor, tipo, status, valor atual
→ Seção opcional (Collapsible): valor original, parcela mensal, vencimento
→ Seção opcional (Collapsible): prioridade, risco, observações
→ Submit via Server Action
→ Sheet fecha, lista atualiza
```

**Confirmação de exclusão:**

```
Usuário clica "Excluir"
→ AlertDialog com mensagem de confirmação
→ Confirma → Server Action delete → Redireciona para /debts
```

**Critérios de aceite:**

- [ ] Cadastro com apenas 5 campos obrigatórios salva sem erro
- [ ] Campos opcionais não bloqueiam submit
- [ ] Edição carrega dados existentes no form
- [ ] Exclusão exige confirmação via AlertDialog
- [ ] `StatusBadge` exibe cor correta para cada status
- [ ] Lista exibe no mínimo: nome, credor, status, valor atual
- [ ] Nenhum campo `valor_quitacao` no form de dívida

---

### Bloco 3 — Cálculos automáticos

**Objetivo:** todos os cálculos derivados funcionando e exibidos corretamente na lista e no detalhe.

**O que fazer:**

1. Integrar funções de `calculations.ts` nas queries de listagem e detalhe
2. Exibir acréscimos e crescimento % na lista (quando `original_value` preenchido)
3. Exibir parcelas restantes no detalhe (quando disponível)
4. Totais simples do dashboard: total de dívidas, valor total devido, acréscimos

**Regras de exibição:**

- Campo calculado só aparece se os dados base estiverem disponíveis
- Nunca exibir "R$ 0,00" como acréscimo — omitir o campo se `original_value` ausente
- Percentuais: 1 casa decimal. Ex: `+45,3%`
- Valores negativos (desconto): usar cor `text-green-600`, não texto vermelho

**Critérios de aceite:**

- [ ] Dívida com `original_value = null` não exibe campos de acréscimos
- [ ] `additions_value` e `growth_pct` corretos para dívida com ambos os valores
- [ ] `remaining_installments` correto quando `total_installments` e `paid_installments` preenchidos
- [ ] Dashboard exibe: total de dívidas ativas, valor total, total original, acréscimos
- [ ] Testes unitários das funções de `calculations.ts` passando

---

### Bloco 4 — Propostas de quitação

**Objetivo:** registrar propostas, exibir proposta ativa na dívida, histórico de propostas.

**O que fazer:**

1. `ProposalForm.tsx` como `Dialog` na tela de detalhe
2. Server action para criar proposta (com lógica de substituir anterior)
3. `ProposalCard.tsx` exibindo proposta ativa com valor, desconto e validade
4. `ProposalBadge.tsx` na lista de dívidas (condição calculada, não status)
5. `ProposalHistory.tsx` no detalhe com histórico cronológico
6. Alerta de proposta vencendo (`Alert` com variante `destructive`)
7. Calcular `discount_value` e `discount_pct` e exibir

**Lógica de substituição (Server Action):**

```typescript
async function createProposal(debtId: string, data: ProposalInput) {
  // 1. Marcar propostas ativas anteriores como 'substituida'
  await db.update(debtProposals)
    .set({ status: 'substituida' })
    .where(and(eq(debtProposals.debtId, debtId), eq(debtProposals.status, 'ativa')));

  // 2. Inserir nova proposta com status 'ativa'
  await db.insert(debtProposals).values({ ...data, status: 'ativa' });

  // 3. Atualizar last_updated_at da dívida
  await db.update(debts)
    .set({ lastUpdatedAt: new Date().toISOString() })
    .where(eq(debts.id, debtId));
}
```

**Critérios de aceite:**

- [ ] Nova proposta marca anterior como `substituida` automaticamente
- [ ] Nunca há mais de uma proposta `ativa` por dívida
- [ ] `discount_value` e `discount_pct` calculados corretamente
- [ ] Alerta visual aparece quando `days_until_expiry <= 7`
- [ ] Proposta com `expires_at` passado é exibida como `expirada`
- [ ] Badge "com proposta" aparece na lista apenas para dívidas com proposta ativa
- [ ] Dashboard exibe corretamente: valor para quitar com propostas, economia potencial

---

### Bloco 5 — Histórico de valores

**Objetivo:** registrar atualizações de valor e visualizar histórico textual no detalhe.

**O que fazer:**

1. `ValueUpdateForm.tsx` como `Dialog` — campos: valor, data, fonte, observação
2. Server action para criar atualização (e atualizar `debts.current_value`)
3. `ValueHistory.tsx` no detalhe — lista cronológica de atualizações
4. Exibir diferença entre atualizações consecutivas

**Lógica da atualização de valor (Server Action):**

```typescript
async function createValueUpdate(debtId: string, data: ValueUpdateInput) {
  // 1. Inserir registro histórico
  await db.insert(debtValueUpdates).values(data);

  // 2. Atualizar current_value da dívida com o novo valor
  await db.update(debts)
    .set({
      currentValue: data.recordedValue,
      lastUpdatedAt: new Date().toISOString(),
    })
    .where(eq(debts.id, debtId));
}
```

**Critérios de aceite:**

- [ ] Criar atualização de valor atualiza `debts.current_value`
- [ ] Histórico exibido em ordem cronológica crescente
- [ ] Diferença entre atualizações consecutivas é calculada e exibida
- [ ] `last_updated_at` da dívida é atualizado

---

### Bloco 6 — Dashboard completo (MVP 0.1)

**Objetivo:** dashboard com os 8 cards de métricas e listas de destaque essenciais do núcleo.

**O que fazer:**

1. `dashboard.service.ts` com queries de totais
2. `MetricCard.tsx` com label, valor e sublabel
3. Cards: total de dívidas, valor total, total original, acréscimos, dívidas em atraso, maiores dívidas (top 3)
4. `TopList.tsx` para listas de destaque

**Queries por card:**

| Card | Query base |
|---|---|
| Total de dívidas ativas | `COUNT(*) WHERE status != 'quitada'` |
| Valor total devido | `SUM(current_value) WHERE status != 'quitada'` |
| Total original | `SUM(original_value) WHERE original_value IS NOT NULL AND status != 'quitada'` |
| Acréscimos acumulados | Diferença entre os dois anteriores |
| Dívidas em atraso | `COUNT(*) WHERE status = 'em_atraso'` |
| Maiores dívidas | `ORDER BY current_value DESC LIMIT 3` |

**Critérios de aceite:**

- [ ] Dashboard carrega em < 1s com 50 dívidas
- [ ] Dívidas quitadas excluídas de todos os totais
- [ ] Cards de destaque atualizam ao alterar dados
- [ ] Layout responsivo com grid de cards

---

### Bloco 7 — MVP 0.2: Decisão e dashboard completo

**Objetivo:** tela de decisão com rankings e dashboard expandido com propostas e gráficos.

**O que fazer:**

1. `ValueChart.tsx` com Recharts `LineChart` no detalhe da dívida
2. Cards do dashboard: valor para quitar com propostas, economia potencial, próxima proposta vencendo, melhores oportunidades, dívidas que mais cresceram
3. Página `/decision` com `DecisionCard.tsx`
4. Lógica de ranqueamento e rótulos de decisão

**Rótulos de decisão e critério:**

```typescript
type DecisionLabel =
  | 'Melhor oportunidade de quitação'  // maior discount_pct com proposta ativa
  | 'Mais barata para resolver'         // menor proposed_value com proposta ativa
  | 'Maior risco'                       // perceived_risk em ordem: juridico > alto > consignado > negativacao > medio > baixo
  | 'Mais cara em crescimento'          // maior growth_pct
  | 'Proposta vencendo'                 // days_until_expiry <= 7
  | 'Precisa atualizar valor'           // last_updated_at < 30 dias atrás
  | 'Aguardando negociação'             // status = 'em_negociacao'
```

**Critérios de aceite:**

- [ ] Gráfico de linha exibe histórico de valores corretamente
- [ ] Tela de decisão exibe dívidas com rótulo correto
- [ ] Uma dívida pode ter múltiplos rótulos (ex: "Maior risco" + "Proposta vencendo")
- [ ] Dashboard exibe propostas, economia potencial e próximo vencimento
- [ ] Filtro "propostas vencendo" na lista funciona

---

## O que NÃO implementar

| Feature | Status |
|---|---|
| Login / autenticação | Fora do MVP |
| Integração com banco / Open Finance | Fora do escopo do produto |
| Controle de orçamento ou gastos | Fora do escopo do produto |
| Contas fixas ou receitas | Fora do escopo do produto |
| Exportação PDF | P1 — pós MVP 0.2 |
| Notificações (push, e-mail) | P2 |
| Inteligência artificial | Roadmap futuro |
| Multiusuário / cloud sync | Roadmap futuro |
| Design system próprio | Usar shadcn/ui |
| Arquivamento de dívidas | Pós MVP |
| Duplicar dívida | P1 |

---

## Estratégia de testes

### O que testar (Vitest)

**Prioritário — funções puras:**

```typescript
// calculations.test.ts
describe('calcAdditions', () => {
  it('retorna null quando original_value é null', () => { ... });
  it('calcula diferença corretamente', () => { ... });
  it('retorna negativo se current < original', () => { ... });
});

describe('calcGrowthPct', () => {
  it('retorna null quando original_value é null ou zero', () => { ... });
  it('calcula crescimento percentual corretamente', () => { ... });
});

// Cobrir: calcDiscountValue, calcDiscountPct, calcRemainingInstallments
// Cobrir: parseBRL e formatBRL
```

**Secundário — validações Zod:**

```typescript
describe('DebtSchema', () => {
  it('aceita dívida com apenas campos obrigatórios', () => { ... });
  it('rejeita current_value = 0', () => { ... });
  it('rejeita status inválido', () => { ... });
  it('aceita paid_installments = 0', () => { ... });
});
```

**Terciário — lógica de negócio (services):**

```typescript
describe('createProposal', () => {
  it('marca proposta anterior como substituida', () => { ... });
  it('nunca cria duas propostas ativas para a mesma dívida', () => { ... });
});
```

### O que NÃO testar no MVP

- Componentes React (custo alto, retorno baixo no MVP)
- Queries SQL (cobrir via integration test apenas se surgir bug)
- Next.js routing e Server Actions (responsabilidade do framework)

---

## Checklist de entrega por bloco

| Bloco | Descrição | Status |
|---|---|---|
| 0 | Setup: Next.js + shadcn/ui + Tailwind + conexão Supabase | ⬜ |
| 1 | Schema Postgres + migrations + RLS + calculations.ts + validações | ⬜ |
| 2 | CRUD de dívidas: cadastro, edição, lista, detalhe | ⬜ |
| 3 | Cálculos automáticos + dashboard básico | ⬜ |
| 4 | Propostas: criar, substituir, exibir, alertar | ⬜ |
| 5 | Histórico de valores: registrar, listar | ⬜ |
| 6 | Dashboard completo (MVP 0.1) | ⬜ |
| 7 | Gráfico + Tela de decisão + Dashboard expandido (MVP 0.2) | ⬜ |

---

## Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| v1.0 | Maio 2026 | Documento inicial. Plano completo para MVP 0.1 e 0.2. |
| v1.1 | Maio 2026 | Migração de SQLite/better-sqlite3 para Supabase/Postgres + Drizzle. Stack atualizada. Bloco 0 inclui setup de variáveis de ambiente e conexão Supabase. Bloco 1 com schema Drizzle para Postgres. |
| v1.2 | Maio 2026 | Limpeza de consistência: removido `@supabase/supabase-js` do MVP; removido `SUPABASE_SERVICE_ROLE_KEY` de env vars e critérios; `DATABASE_URL` como único ponto de acesso; regras de server-only explicitadas; comentário "SQLite" na pasta corrigido; instrução de RLS reescrita sem ambiguidade. |
