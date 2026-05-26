# DATA_MODEL: Cockpit

**Versão:** v1.2  
**Status:** Definitivo para MVP 0.1  
**Última atualização:** Maio 2026  
**Referência:** PRD_Cockpit_v0.5.md — §8 Decisões de Modelagem, §11 Modelo de Dados

> Este arquivo é a fonte de verdade sobre estrutura de dados.  
> Em caso de conflito com o PRD, este arquivo prevalece.

---

## Princípios do modelo

1. **Proposta não é campo de dívida.** `valor_quitacao` não existe em `Debt`. O sistema busca a `DebtProposal` com `status = 'ativa'` vinculada à dívida para obter o valor de quitação.
2. **Status de dívida é simples e mutuamente exclusivo.** `com_proposta` não é status; é condição derivada.
3. **Sem arquivamento no MVP.** `is_archived` não existe. Os estados `quitada` e `suspensa` cobrem os casos de uso.
4. **Todos os valores monetários em centavos (integer).** Evita erros de ponto flutuante. Exibição formata para BRL na camada de apresentação.
5. **Soft delete via status, não DELETE.** Dívidas são marcadas como `quitada`; nunca deletadas em operação normal. Exclusão física apenas quando explicitamente solicitada pelo usuário (com confirmação).

---

## Entidades

### 1. `debts`

Entidade central do sistema. Representa uma dívida.

```sql
CREATE TABLE debts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  creditor            TEXT NOT NULL,
  type                TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'em_aberto',
  current_value       INTEGER NOT NULL CHECK (current_value > 0),
  original_value      INTEGER CHECK (original_value > 0),
  monthly_payment     INTEGER CHECK (monthly_payment > 0),
  due_day             INTEGER CHECK (due_day BETWEEN 1 AND 31),
  due_date            DATE,
  total_installments  INTEGER CHECK (total_installments > 0),
  paid_installments   INTEGER CHECK (paid_installments >= 0),
  overdue_since       DATE,
  priority            TEXT,
  perceived_risk      TEXT,
  notes               TEXT,
  tags                TEXT[],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT debts_paid_installments_valid
    CHECK (
      paid_installments IS NULL
      OR total_installments IS NULL
      OR paid_installments <= total_installments
    )
);
```

**Enum `type`:**

| Valor | Label de exibição |
|---|---|
| `cartao_credito` | Cartão de crédito |
| `emprestimo` | Empréstimo |
| `financiamento` | Financiamento |
| `renegociacao` | Renegociação |
| `loja` | Cartão de loja |
| `cheque_especial` | Cheque especial |
| `outro` | Outro |

**Enum `status`:**

| Valor | Label de exibição | Entra nos totais? |
|---|---|---|
| `em_aberto` | Em aberto | Sim |
| `em_atraso` | Em atraso | Sim |
| `em_negociacao` | Em negociação | Sim |
| `parcelada` | Parcelada | Sim |
| `suspensa` | Suspensa | Sim |
| `quitada` | Quitada | **Não** |

**Enum `priority`:**

| Valor | Label | Badge color |
|---|---|---|
| `baixa` | Baixa | muted |
| `media` | Média | secondary |
| `alta` | Alta | warning |
| `critica` | Crítica | destructive |

**Enum `perceived_risk`:**

`baixo`, `medio`, `alto`, `juridico`, `consignado`, `negativacao`, `nao_sei`

**Campos calculados (nunca persistidos em `debts`):**

| Campo | Fórmula | Pré-condição |
|---|---|---|
| `additions_value` | `current_value - original_value` | `original_value IS NOT NULL` |
| `growth_pct` | `((current_value - original_value) / original_value) * 100` | `original_value IS NOT NULL AND original_value > 0` |
| `remaining_installments` | `total_installments - paid_installments` | ambos não nulos |
| `settlement_value` | `active_proposal.proposed_value` | proposta ativa existir |
| `discount_value` | `current_value - active_proposal.proposed_value` | proposta ativa existir |
| `discount_pct` | `((current_value - active_proposal.proposed_value) / current_value) * 100` | proposta ativa existir |
| `has_active_proposal` | `EXISTS (SELECT 1 FROM debt_proposals WHERE debt_id = id AND status = 'ativa')` | — |

**Validações:**

- `name`: mín. 2 caracteres
- `creditor`: mín. 2 caracteres
- `current_value`: > 0
- `original_value`: > 0, se preenchido
- `monthly_payment`: > 0, se preenchido
- `paid_installments`: 0 ≤ `paid_installments` ≤ `total_installments`, se ambos preenchidos
- `status`: deve ser um dos valores do enum

---

### 2. `debt_proposals`

Propostas de quitação vinculadas a uma dívida. Uma dívida pode ter várias propostas ao longo do tempo.

```sql
CREATE TABLE debt_proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id         UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  proposed_value  INTEGER NOT NULL CHECK (proposed_value > 0),
  proposed_at     DATE NOT NULL,
  expires_at      DATE,
  origin          TEXT,
  status          TEXT NOT NULL DEFAULT 'ativa',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT debt_proposals_expiry_valid
    CHECK (expires_at IS NULL OR expires_at >= proposed_at)
);
```

**Enum `status` de proposta:**

| Valor | Descrição | Transição |
|---|---|---|
| `ativa` | Proposta válida e em vigor | Estado inicial |
| `substituida` | Nova proposta foi registrada | Automático ao criar nova proposta |
| `expirada` | Data de validade passou | Automático por data (`expires_at < hoje`) |
| `recusada` | Usuário recusou a proposta | Manual |
| `aceita` | Proposta foi aceita e paga | Manual (normalmente junto com marcar dívida como quitada) |

**Regras de transição de status:**

1. Ao criar uma nova proposta com `status = 'ativa'`, todas as propostas `ativa` anteriores dessa dívida são automaticamente marcadas como `substituida`.
2. O status `expirada` pode ser calculado na leitura: `expires_at IS NOT NULL AND expires_at < date('now')`. Pode ser atualizado em background ou calculado on-the-fly.
3. Nunca há mais de uma proposta com `status = 'ativa'` para a mesma dívida.

**Campos calculados:**

| Campo | Fórmula |
|---|---|
| `discount_value` | `debt.current_value - proposed_value` |
| `discount_pct` | `((debt.current_value - proposed_value) / debt.current_value) * 100` |
| `days_until_expiry` | `expires_at - CURRENT_DATE` (Postgres retorna `integer` em dias) |
| `is_expiring_soon` | `days_until_expiry IS NOT NULL AND days_until_expiry <= 7 AND days_until_expiry >= 0` |

**Validações:**

- `proposed_value`: > 0 e < `debt.current_value` (desconto deve existir)
- `expires_at`: ≥ `proposed_at`, se preenchido (garantido por constraint)
- `debt_id`: FK válida em `debts` (garantido por FK com CASCADE)

**Índices:**

```sql
-- Busca por dívida + status (query mais frequente)
CREATE INDEX idx_debt_proposals_debt_status
  ON debt_proposals(debt_id, status);

-- Garante unicidade de proposta ativa por dívida no banco
-- Regra de negócio DM03 aplicada como constraint, não só na aplicação
CREATE UNIQUE INDEX unique_active_proposal_per_debt
  ON debt_proposals(debt_id)
  WHERE status = 'ativa';
```

> **Nota sobre o índice parcial único:** o `unique_active_proposal_per_debt` é uma melhoria importante que o Postgres viabiliza nativamente. Ele garante que, mesmo que haja um bug na aplicação, o banco rejeita a inserção de uma segunda proposta ativa para a mesma dívida. SQLite não suporta índices parciais únicos com `WHERE`.

---

### 3. `debt_value_updates`

Histórico de atualizações manuais do valor da dívida. Permite rastrear a escalada ao longo do tempo.

```sql
CREATE TABLE debt_value_updates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id         UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  recorded_value  INTEGER NOT NULL CHECK (recorded_value > 0),
  recorded_at     DATE NOT NULL,
  source          TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Validações:**

- `recorded_value`: > 0
- `recorded_at`: data válida, não futura
- `debt_id`: FK válida em `debts`

**Comportamento:**

- Ao registrar uma atualização de valor, o sistema também atualiza `debts.current_value` com o `recorded_value` mais recente e atualiza `debts.last_updated_at`.
- O histórico é exibido ordenado por `recorded_at ASC` na tela de detalhe.
- O gráfico de evolução usa este histórico como série de dados.

**Índices:**

```sql
CREATE INDEX idx_debt_value_updates_debt_date
  ON debt_value_updates(debt_id, recorded_at);

-- Adicionalmente em debts:
CREATE INDEX idx_debts_status ON debts(status);
```

---

## Queries de referência

### Buscar proposta ativa de uma dívida

```sql
SELECT *
FROM debt_proposals
WHERE debt_id = :debt_id
  AND status = 'ativa'
ORDER BY proposed_at DESC
LIMIT 1;
```

### Listar dívidas com condição "com proposta"

```sql
SELECT d.*,
       dp.proposed_value,
       dp.expires_at,
       (d.current_value - dp.proposed_value) AS discount_value,
       ROUND(((d.current_value - dp.proposed_value) * 100.0 / d.current_value), 2) AS discount_pct
FROM debts d
LEFT JOIN debt_proposals dp
  ON dp.debt_id = d.id
  AND dp.status = 'ativa'
WHERE d.status != 'quitada'
ORDER BY d.current_value DESC;
```

### Totais do dashboard

```sql
SELECT
  COUNT(*)                                       AS total_active_debts,
  SUM(current_value)                             AS total_current_value,
  SUM(COALESCE(original_value, 0))               AS total_original_value,
  SUM(current_value - COALESCE(original_value, current_value)) AS total_additions,
  COUNT(CASE WHEN status = 'em_atraso' THEN 1 END) AS total_overdue
FROM debts
WHERE status != 'quitada';
```

### Economia potencial com propostas ativas

```sql
SELECT
  SUM(dp.proposed_value)                         AS total_settlement_value,
  SUM(d.current_value - dp.proposed_value)       AS total_potential_savings
FROM debts d
INNER JOIN debt_proposals dp
  ON dp.debt_id = d.id
  AND dp.status = 'ativa'
WHERE d.status != 'quitada';
```

### Próxima proposta vencendo

```sql
SELECT d.name, dp.expires_at,
       (dp.expires_at - CURRENT_DATE) AS days_remaining
FROM debt_proposals dp
INNER JOIN debts d ON d.id = dp.debt_id
WHERE dp.status = 'ativa'
  AND dp.expires_at IS NOT NULL
  AND dp.expires_at >= CURRENT_DATE
ORDER BY dp.expires_at ASC
LIMIT 1;
```

### Evolução do valor de uma dívida (para o gráfico)

```sql
SELECT recorded_at, recorded_value
FROM debt_value_updates
WHERE debt_id = :debt_id
ORDER BY recorded_at ASC;
```

---

## Notas de implementação

**Banco:** Supabase/Postgres gerenciado. Sem SQLite. Sem arquivo local.

**IDs:** `UUID` nativo com `gen_random_uuid()`. Gerado pelo banco, não pelo cliente.

**Valores monetários:** `INTEGER` em centavos. `R$ 1.800,00` → `180000`. Nunca `REAL`, `FLOAT` ou `NUMERIC` para dinheiro.

**Datas simples** (`due_date`, `overdue_since`, `proposed_at`, `expires_at`, `recorded_at`): tipo `DATE`.

**Timestamps** (`created_at`, `last_updated_at`): tipo `TIMESTAMPTZ` com `DEFAULT NOW()`.

**Tags:** tipo nativo `TEXT[]` (array do Postgres). Não requer parse de JSON — queries diretas com operadores de array (`@>`, `ANY`).

**Cascata:** FKs com `ON DELETE CASCADE`. Deletar uma dívida remove propostas e histórico de valor automaticamente.

**Constraints no banco:** todas as regras de negócio críticas têm constraint correspondente no schema:
- `current_value > 0` (CHECK)
- `paid_installments <= total_installments` (CHECK com IS NULL)
- `expires_at >= proposed_at` (CHECK)
- Uma proposta ativa por dívida (UNIQUE INDEX PARTIAL)

**Privacidade e segurança mínima no MVP:**
- Nunca expor tabelas publicamente via Supabase Data API sem controle explícito.
- A aplicação não usa Supabase Client (`@supabase/supabase-js`) no MVP.
- A aplicação não usa `SUPABASE_SERVICE_ROLE_KEY` no MVP.
- O acesso ao banco acontece exclusivamente via `DATABASE_URL`, usando Drizzle em Server Components, Server Actions ou Route Handlers.
- `DATABASE_URL` deve existir apenas em `.env.local` e nunca ser exposto no cliente.
- Nunca executar queries de banco em Client Components.
- Habilitar RLS nas tabelas desde o início, mesmo sem policies no MVP.
- Como o acesso acontece via conexão Postgres no servidor, RLS não é a camada de proteção principal nesta fase; a proteção principal é server-only + segredo fora do cliente.
- Não enviar valores financeiros para serviços de analytics ou logging externo.

**Acesso no MVP:** como o MVP é de uso pessoal sem login, todas as queries rodam no servidor Next.js via Drizzle + `DATABASE_URL`. Não há Supabase Client no browser e não há uso de `service_role` no MVP.

---

## Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| v1.0 | Maio 2026 | Documento inicial. Modelo definitivo para MVP 0.1. |
| v1.1 | Maio 2026 | Migração de SQLite para Supabase/Postgres: tipos nativos UUID, DATE, TIMESTAMPTZ, TEXT[]; constraints CHECK no schema; índice parcial único para proposta ativa; queries atualizadas para sintaxe Postgres; notas de privacidade e RLS adicionadas. |
| v1.2 | Maio 2026 | Limpeza de consistência: removida orientação de uso de `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_URL`; acesso definido exclusivamente via Drizzle + `DATABASE_URL` no servidor; referências atualizadas para PRD v0.5 com numeração de seções correta. |
