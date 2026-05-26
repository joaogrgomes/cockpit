# PRD: Cockpit — Sistema Pessoal de Controle de Dívidas

**Versão:** v0.5  
**Status:** Rascunho  
**Autor:** [Você]  
**Última atualização:** Maio 2026  
**Target de lançamento:** [EM ABERTO]

---

## TL;DR

Cockpit é um sistema pessoal para controle e tomada de decisão sobre dívidas. Substitui planilhas confusas por um painel visual e objetivo, onde o usuário cadastra suas dívidas, acompanha a evolução dos valores, registra propostas de quitação e decide o que pagar, negociar ou pausar. O foco não é ser um app financeiro completo — é dar clareza e controle sobre um conjunto específico de dívidas.

---

## 1. O Problema

### Descrição do problema

Pessoas físicas endividadas controlam múltiplas dívidas (cartões, empréstimos, financiamentos, renegociações) em planilhas improvisadas. Esse modelo falha de formas concretas:

- É difícil visualizar o **total real devido** de forma consolidada.
- É difícil comparar **dívida original vs. valor atual** e entender quanto cresceu.
- É difícil registrar e comparar **propostas de quitação** ao longo do tempo.
- É difícil saber quais dívidas têm **parcela mensal ativa**, quais estão **em atraso** e quais podem ser **negociadas**.
- É difícil tomar **decisões jurídicas e financeiras** com clareza quando os dados estão dispersos.
- A planilha se torna um lugar de **ansiedade**, não de controle.

### Evidências

- **[ASSUMIDO]** O usuário principal possui entre 5 e 15 dívidas ativas de diferentes credores.
- **[ASSUMIDO]** Os dados das dívidas estão hoje em pelo menos uma planilha ou anotação manual.
- **[ASSUMIDO]** O usuário já perdeu propostas de quitação por não ter um sistema de acompanhamento.
- **Qualitativo:** A frase "a planilha vira um lugar de ansiedade, não de controle" resume a experiência real do usuário-alvo.

### Por que agora?

Não há no mercado um produto simples, focado exclusivamente em controle de dívidas para pessoa física, sem a complexidade de apps financeiros completos. A solução atual (planilha) é dolorosa o suficiente para justificar uma ferramenta dedicada.

---

## 2. Personas & Usuários

### Persona principal: A pessoa física endividada

**"Ana, 38 anos, servidora pública"**

- **Quem é:** Tem entre 6 e 12 dívidas ativas — cartão de crédito atrasado, empréstimo consignado, fatura de loja. Controla tudo numa planilha que já perdeu o fio.
- **Job to be done:** Quero saber exatamente o que devo, quanto cresceu cada dívida e o que vale a pena pagar primeiro.
- **Dor atual:** Abre a planilha e sente ansiedade. Não consegue comparar as propostas que recebe. Tem medo de tomar decisões erradas por falta de visibilidade.
- **O que ela precisa:** Clareza, não complexidade. Quer um painel que mostre o essencial e a ajude a decidir.

---

## 3. Solução Proposta

### Descrição

Cockpit é um painel de controle pessoal para dívidas. O usuário cadastra cada dívida com os dados que tiver (campos opcionais são bem-vindos), acompanha a evolução dos valores ao longo do tempo, registra propostas de quitação e usa uma tela de decisão para priorizar o que atacar primeiro.

A interface deve parecer um cockpit de Fórmula 1: direta, visual, objetiva. Não é uma planilha. Não é um banco. É um painel de controle.

### User Stories principais

```
Como Ana, quero cadastrar uma dívida mesmo sem ter todos os dados, 
para que eu não deixe de registrá-la por falta de informação completa.

Como Ana, quero ver o total real que devo hoje, consolidado em um número, 
para que eu saiba o tamanho real do meu problema.

Como Ana, quero comparar o valor original da dívida com o valor atual, 
para que eu entenda o quanto os juros já me custaram.

Como Ana, quero registrar propostas de quitação e ver o desconto que representam, 
para que eu possa decidir se vale aceitar a oferta.

Como Ana, quero ver um ranking das dívidas por critério (maior desconto, maior risco, 
vencimento mais próximo), para que eu saiba o que atacar primeiro.
```

### Abordagem de solução [DEFINIDO]

Aplicação web (Next.js + App Router) com dados persistidos em **Supabase/Postgres**. Sem Open Finance, sem login multiusuário no MVP. O usuário é o único dono e operador dos seus dados.

**Decisão de banco:** Supabase/Postgres desde o MVP — não SQLite. Motivos: modelo relacional natural para as 3 entidades; painel visual de inspeção de dados; UUID nativo; RLS disponível quando login for implementado; sem necessidade de migração futura.

**Restrição:** no MVP, Supabase é usado apenas como Postgres gerenciado. Nenhuma feature da plataforma é usada (sem Auth, Storage, Realtime, Edge Functions ou multiusuário).

---

## 4. Requisitos Funcionais

### P0-a — MVP 0.1: Núcleo operacional

> Objetivo: dados entrando corretamente no sistema. Sem essa base, nada mais funciona.

**Cadastro de dívidas**

- RF01: O usuário deve conseguir cadastrar uma dívida com apenas 5 campos obrigatórios: nome, credor, tipo, status e valor atual.
- RF02: Todos os demais campos devem ser opcionais e agrupados visualmente separados dos obrigatórios.
- RF03: O formulário de cadastro deve aceitar dados incompletos sem bloquear o salvamento.
- RF04: O usuário deve conseguir editar qualquer campo de uma dívida a qualquer momento.
- RF05: O usuário deve conseguir excluir fisicamente uma dívida apenas mediante confirmação explícita. A ação é destrutiva e remove também todas as propostas e histórico de valores associados via cascade. Marcar como quitada é o fluxo recomendado para dívidas resolvidas; excluir é reservado para erro de cadastro.

**Cálculos automáticos**

- RF06: Se valor original e valor atual estiverem preenchidos: calcular acréscimos em reais e crescimento percentual automaticamente.
- RF07: O valor de quitação exibido para uma dívida deve ser derivado da proposta ativa mais recente (`DebtProposal` com status `ativa`). Se houver proposta ativa: calcular desconto em reais e percentual de desconto automaticamente. Não existe campo `valor_quitacao` na entidade `Debt`.
- RF08: Se houver parcelas totais e parcelas pagas: calcular parcelas restantes automaticamente.

**Lista de dívidas**

- RF09: Exibir todas as dívidas com colunas: nome, credor, tipo, status, valor atual, acréscimos, valor de quitação (se houver proposta ativa), desconto percentual (se houver), parcela mensal (se houver), vencimento, prioridade.
- RF10: Permitir filtrar por: tipo, status, prioridade, risco, com proposta, em atraso, parceladas, quitadas.
- RF11: Permitir ordenar por: maior valor atual, maior desconto, maior crescimento, menor valor de quitação, maior risco, atualização mais antiga.

**Detalhe da dívida**

- RF12: Exibir todos os dados da dívida na tela de detalhe.
- RF13: Exibir histórico de propostas registradas para a dívida.
- RF14: Exibir histórico de atualizações de valor da dívida.
- RF15: Exibir ações rápidas: atualizar valor atual, adicionar proposta, alterar status, marcar como quitada, registrar observação.

**Propostas de quitação**

- RF16: O usuário deve conseguir registrar uma proposta com: valor proposto, data, validade, origem e observação.
- RF17: Uma dívida pode ter múltiplas propostas ao longo do tempo.
- RF18: Cada proposta deve ter status: ativa, expirada, recusada, aceita ou substituída.
- RF19: Ao registrar nova proposta, a proposta ativa anterior passa automaticamente para "substituída".
- RF20: O sistema deve exibir alerta visual quando a validade de uma proposta ativa estiver próxima do vencimento (≤ 7 dias).

**Histórico de valores**

- RF21: O usuário deve conseguir registrar atualizações manuais do valor da dívida com data, novo valor, observação e origem da informação.
- RF22: O histórico deve ser exibido em ordem cronológica na tela de detalhe.

**Marcar como quitada**

- RF23: O usuário deve conseguir marcar uma dívida como quitada.
- RF24: Dívidas quitadas devem sair dos totais principais do dashboard.
- RF25: Dívidas quitadas devem permanecer acessíveis via filtro na lista.

**Dashboard básico**

- RF26: Exibir o total de dívidas ativas.
- RF27: Exibir o valor total atual devido (soma de todos os valores atuais de dívidas não quitadas).
- RF28: Exibir a soma dos valores originais cadastrados.
- RF29: Exibir o total de acréscimos acumulados.
- RF30: Exibir o valor total para quitar com propostas ativas.
- RF31: Exibir a economia potencial se todas as propostas fossem aceitas.
- RF32: Exibir quantidade de dívidas em atraso.
- RF33: Exibir as maiores dívidas por valor atual (top 3).

---

### P0-b — MVP 0.2: Decisão

> Objetivo: transformar os dados estruturados no 0.1 em inteligência de decisão. Depende do núcleo estar estável.

**Dashboard completo**

- RF34: Exibir quantidade de dívidas com proposta ativa.
- RF35: Exibir a próxima proposta a vencer (nome + dias restantes).
- RF36: Exibir as melhores oportunidades de quitação por % de desconto (top 3).
- RF37: Exibir as dívidas que mais cresceram em percentual (top 3).
- RF38: Exibir dívidas com maior risco percebido (top 3).

**Gráfico de evolução**

- RF39: Exibir gráfico de linha com a evolução histórica do valor da dívida na tela de detalhe.

**Tela de decisão**

- RF40: Exibir uma visão ranqueada das dívidas com rótulos sugestivos: "Melhor oportunidade de quitação", "Maior risco", "Mais cara em crescimento", "Mais barata para resolver", "Proposta vencendo", "Precisa atualizar valor".
- RF41: O ranqueamento deve considerar: maior desconto percentual, menor valor de quitação, maior risco percebido, proposta perto de vencer, maior crescimento da dívida.

### P1 — Importante, mas não bloqueia o lançamento

- RF42: Permitir duplicar uma dívida (útil para renegociações que substituem a dívida original).
- RF43: Filtro de busca por texto livre na lista de dívidas.
- RF44: Exportar lista de dívidas em CSV ou PDF simples.
- RF45: Permitir adicionar tags às dívidas para agrupamento livre.

### P2 — Desejável no futuro

- RF46: Notificações locais de propostas próximas ao vencimento.
- RF47: Sugestão automática de prioridade com base nos dados preenchidos.
- RF48: Comparativo visual entre múltiplas propostas de uma mesma dívida.

---

## 5. Regras de Negócio

**RN01 — Acréscimos:**  
`acréscimos = valor_atual - valor_original`  
Exibido como "juros/multa/acréscimos". Não detalhar componentes no MVP.

**RN02 — Crescimento percentual:**  
`crescimento_pct = ((valor_atual - valor_original) / valor_original) × 100`  
Exibido apenas se valor_original > 0.

**RN03 — Desconto em reais:**  
`desconto = debt.current_value - active_proposal.proposed_value`  
Exibido apenas se houver proposta ativa vinculada à dívida.

**RN04 — Desconto percentual:**  
`desconto_pct = ((debt.current_value - active_proposal.proposed_value) / debt.current_value) × 100`  
Exibido apenas se houver proposta ativa vinculada à dívida.

**RN05 — Parcelas restantes:**  
`parcelas_restantes = parcelas_total - parcelas_pagas`  
Calculado apenas se ambos os campos estiverem preenchidos.

**RN06 — Totais do dashboard:**  
Só consideram dívidas com status diferente de `quitada`.

**RN07 — Total para quitar com propostas:**  
Soma dos `active_proposal.proposed_value` das dívidas que possuem proposta com status `ativa`.  
Dívidas sem proposta ativa não entram neste card — o card é exclusivo de dívidas com proposta.

**RN08 — Economia potencial:**  
`economia = soma(debt.current_value - active_proposal.proposed_value)` para dívidas com proposta ativa.

**RN09 — Alerta de proposta vencendo:**  
Exibir alerta visual quando `validade_proposta - hoje ≤ 7 dias`.

**RN10 — Proposta substituída:**  
Ao registrar nova proposta como "ativa", a proposta anterior passa automaticamente para "substituída".

**RN11 — Dívida sem valor original:**  
Não exibir campos de acréscimos e crescimento percentual. Não bloquear cadastro.

**RN12 — Prioridade manual:**  
A prioridade pode ser definida manualmente pelo usuário em: baixa, média, alta, crítica.  
No MVP, não há cálculo automático de prioridade.

---

## 6. Requisitos Não-Funcionais

- **Performance:** Telas carregam em menos de 2 segundos com até 50 dívidas cadastradas.
- **Privacidade:** O Cockpit lida com dados financeiros sensíveis. Mesmo usando Supabase/Postgres, o MVP deve seguir uma política de mínimo acesso: não expor tabelas publicamente; usar variáveis de ambiente para todas as chaves; nunca versionar credenciais; preparar as tabelas para Row Level Security (RLS habilitado, mesmo sem policies ativas no MVP); não enviar valores financeiros para serviços de analytics ou logging externo.
- **Usabilidade:** O usuário deve conseguir cadastrar uma dívida em menos de 1 minuto.
- **Acessibilidade:** Interface compatível com leitores de tela básicos; contraste adequado (WCAG 2.1 AA).
- **Compatibilidade:** Navegadores modernos (Chrome, Firefox, Safari, Edge). Responsivo para desktop e tablet.
- **Persistência:** Dados não devem ser perdidos entre sessões. Garantido pelo Postgres do Supabase.
- **Confiabilidade:** O sistema não deve perder dados. Responsabilidade compartilhada com o Supabase (backups automáticos).

---

## 7. Stack de Interface & Design System

### Base visual: shadcn/ui + Tailwind CSS [DEFINIDO]

A implementação da interface deve usar **shadcn/ui** como base visual e estrutural da aplicação, combinado com **Tailwind CSS** para estilização. Não será criado um design system próprio no MVP.

**Justificativa:**
- Evita inconsistência visual entre componentes criados ad hoc.
- Garante padrões consolidados de espaçamento, tipografia, bordas, sombras e estados.
- Acelera a construção sem abrir mão de qualidade visual.
- A experiência deve parecer um produto bem resolvido, mesmo no MVP.

### Diretrizes de uso

**Usar shadcn/ui sempre que houver componente disponível.** Componentes customizados só serão criados quando nenhum componente nativo do shadcn/ui atender ao caso de uso.

**Padrão visual:** sóbrio, limpo e funcional. Dashboard financeiro — não SaaS genérico. Sem gradientes gratuitos, excesso de cor ou elementos decorativos sem propósito.

### Mapeamento de componentes por uso no Cockpit

| Necessidade de UI | Componente shadcn/ui |
|---|---|
| Cards de métricas do dashboard | `Card`, `CardHeader`, `CardContent`, `CardTitle` |
| Tabela de dívidas | `Table`, `TableHeader`, `TableRow`, `TableCell` |
| Status e prioridade | `Badge` (variantes por status) |
| Formulário de cadastro/edição | `Sheet` (lateral) ou `Dialog` (modal) |
| Inputs de texto e valor | `Input`, `Label` |
| Selects de tipo/status/prioridade | `Select`, `SelectItem` |
| Date picker | `Popover` + `Calendar` |
| Textarea de observações | `Textarea` |
| Confirmação de exclusão/quitação | `AlertDialog` |
| Filtros da lista | `DropdownMenu`, `Popover`, `Badge` como toggle |
| Navegação principal | `Sidebar` ou `NavigationMenu` |
| Alerta de proposta vencendo | `Alert` com variante destrutiva |
| Ações rápidas na tela de detalhe | `Button` (variantes: `default`, `outline`, `ghost`, `destructive`) |
| Tooltips em valores calculados | `Tooltip` |
| Separação de seções opcionais no form | `Separator`, `Collapsible` |
| Gráfico de evolução de valor | Recharts `LineChart` (via shadcn/ui charts) |
| Ordenação de colunas na tabela | `Button` com ícone no header da coluna |
| Tags de dívida | `Badge` com variante `outline` |
| Skeleton em carregamento | `Skeleton` |

### Mapeamento de status → variante de Badge

| Status da dívida | Variante Badge |
|---|---|
| Em aberto | `outline` (neutro) |
| Em atraso | `destructive` (vermelho) |
| Em negociação | `secondary` com classe de cor âmbar |
| Com proposta | `default` (primário) |
| Parcelada | `outline` com ícone |
| Quitada | `secondary` (cinza apagado) |
| Suspensa | `outline` com opacidade reduzida |
| Prioridade crítica | `destructive` |

### Tokens visuais

Usar o tema padrão do shadcn/ui sem customizações de cor no MVP. As variáveis CSS do tema (`--background`, `--foreground`, `--muted`, `--destructive`, `--primary`) cobrem todos os casos de uso previstos. Paleta monocromática com uso restrito de cor destrutiva (vermelho) para estados de risco e atraso.

### O que não fazer

- Não criar design tokens próprios além do tema base do shadcn/ui.
- Não usar bibliotecas de UI concorrentes (MUI, Ant Design, Chakra) no mesmo projeto.
- Não estilizar inline com `style={{}}` — usar classes Tailwind.
- Não criar componentes de tabela, modal ou formulário do zero se o shadcn/ui os cobre.
- Não usar cores absolutas (`#FF0000`) — usar variáveis semânticas do tema (`text-destructive`, `bg-muted`).

---

## 8. Decisões de Modelagem para Evitar Ambiguidade

> Esta seção existe para resolver pontos que tipicamente geram bugs e retrabalho em implementações financeiras. Deve ser lida antes de qualquer linha de código.

**DM01 — Proposta não é campo da dívida.**
O valor de quitação não deve ser salvo como campo na entidade `Debt`. Toda proposta de quitação é salva em `DebtProposal`. Quando o sistema precisar exibir o "valor para quitar", busca a `DebtProposal` com `status = ativa` e `debt_id` correspondente. Se não houver proposta ativa, o campo de quitação não é exibido.

**DM02 — "Com proposta" não é status principal da dívida.**
Uma dívida pode estar `em_atraso` e, ao mesmo tempo, ter uma proposta ativa. Tratar "com proposta" como status principal forçaria uma escolha artificial e perderia informação. A condição "com proposta" deve ser calculada e exibida como badge secundário, não como status.

**DM03 — Status principal da dívida no MVP.**
Os únicos valores válidos para `status` em `Debt` são:
`em_aberto`, `em_atraso`, `em_negociacao`, `parcelada`, `quitada`, `suspensa`

**DM04 — Dívida quitada sai dos totais, mas não some.**
`status = quitada` exclui a dívida de todos os totais do dashboard. A dívida permanece acessível via filtro "quitadas" na lista. Não há exclusão física de dados.

**DM05 — Arquivamento fica fora do MVP.**
Não existe conceito de "dívida arquivada" no MVP. Ter `quitada`, `suspensa` e `arquivada` simultâneos cria ambiguidade desnecessária. Arquivamento pode entrar em fase posterior se o usuário precisar separar dívidas quitadas antigas de dívidas suspensas ativas.

**DM06 — A tela de decisão depende da qualidade dos dados.**
Construir a tela de decisão antes do núcleo de dados estar estável é risco de escopo. O MVP 0.1 entrega o núcleo. O MVP 0.2 entrega a decisão sobre dados já estruturados.

---

## 9. Fora de Escopo (MVP)

| Feature | Motivo da exclusão |
|---|---|
| Integração com bancos/Open Finance | Complexidade técnica e regulatória; fora do foco do MVP |
| Importação automática de faturas | Mesma razão; o valor manual é suficiente no início |
| Controle de orçamento mensal | Foge do foco: o sistema é de dívidas, não de gastos |
| Contas fixas e categorias de gastos | Idem |
| Investimentos e metas financeiras | Fora do escopo do produto |
| Login multiusuário | Sistema pessoal; um usuário por instalação |
| Notificações push/e-mail avançadas | P2; alerta visual no app é suficiente no MVP |
| Relatórios jurídicos | Complexidade fora do MVP |
| Simulação de superendividamento | Feature futura com potencial de IA |
| Inteligência artificial | Pós-MVP; a tela de decisão resolve o caso de uso básico |
| Arquivamento de dívidas | Ambiguidade com "quitada" e "suspensa"; ver DM05 — entra em fase posterior |

---

## 10. Principais Fluxos de Usuário

### Fluxo 1: Cadastrar uma nova dívida
1. Usuário acessa "Dívidas" → clica em "Nova dívida".
2. Preenche campos obrigatórios: nome, credor, tipo, status, valor atual.
3. Opcionalmente preenche: valor original, parcela mensal, dia de vencimento, observações.
4. Salva. Sistema exibe a dívida na lista e atualiza o dashboard.

### Fluxo 2: Registrar proposta de quitação
1. Usuário acessa o detalhe de uma dívida.
2. Clica em "Adicionar proposta".
3. Preenche: valor proposto, data, validade, origem, observação.
4. Salva. Sistema calcula desconto e exibe na tela de detalhe e na lista.

### Fluxo 3: Atualizar o valor da dívida
1. Usuário acessa o detalhe de uma dívida.
2. Clica em "Atualizar valor atual".
3. Informa novo valor, data e observação opcional.
4. Salva. Sistema registra no histórico e atualiza os cálculos automáticos.

### Fluxo 4: Marcar como quitada
1. Usuário acessa o detalhe ou a lista de dívidas.
2. Clica em "Marcar como quitada" (com confirmação).
3. Sistema move a dívida para status "quitada", remove dos totais do dashboard e mantém no histórico.

### Fluxo 5: Usar a tela de decisão
1. Usuário acessa "Decisão".
2. Sistema exibe dívidas ranqueadas com rótulos de contexto.
3. Usuário usa os rótulos para entender o que priorizar.

---

## 11. Modelo de Dados

### Entidade: Debt (Dívida)

| Campo | Tipo | Obrigatório | Descrição | Validação |
|---|---|---|---|---|
| id | UUID | Sim | Identificador único | Gerado automaticamente |
| name | String | Sim | Nome da dívida | Mín. 2 caracteres |
| creditor | String | Sim | Nome do credor | Mín. 2 caracteres |
| type | Enum | Sim | Tipo da dívida | Ver opções abaixo |
| status | Enum | Sim | Status atual | Ver opções abaixo |
| current_value | Decimal | Sim | Valor atual da dívida | > 0 |
| original_value | Decimal | Não | Valor original quando a dívida começou | > 0, se preenchido |
| monthly_payment | Decimal | Não | Valor da parcela mensal | > 0, se preenchido |
| due_day | Integer | Não | Dia do mês do vencimento | 1–31 |
| due_date | Date | Não | Data completa de vencimento | Data válida |
| total_installments | Integer | Não | Total de parcelas | > 0 |
| paid_installments | Integer | Não | Parcelas já pagas | ≥ 0, ≤ total_installments |
| overdue_since | Date | Não | Data de início do atraso | Data válida |
| priority | Enum | Não | Prioridade manual | baixa, média, alta, crítica |
| perceived_risk | Enum | Não | Risco percebido | Ver opções abaixo |
| notes | Text | Não | Observações livres | — |
| tags | Array<String> | Não | Tags livres | — |
| last_updated_at | DateTime | Sim | Última atualização | Automático |
| created_at | DateTime | Sim | Data de criação | Automático |

**Enums de tipo:**
`cartao_credito`, `emprestimo`, `financiamento`, `renegociacao`, `loja`, `cheque_especial`, `outro`

**Enums de status:**
`em_aberto`, `em_atraso`, `em_negociacao`, `parcelada`, `quitada`, `suspensa`

> **Nota:** `com_proposta` não é status da dívida. É uma condição calculada — exibida como badge quando existe uma `DebtProposal` com status `ativa` vinculada à dívida. Ver §8 Decisões de Modelagem.

**Enums de risco percebido:**
`baixo`, `medio`, `alto`, `juridico`, `consignado`, `negativacao`, `nao_sei`

**Campos calculados (não persistidos):**
- `additions` = `current_value - original_value` (se ambos preenchidos)
- `growth_pct` = `((current_value - original_value) / original_value) × 100` (se ambos preenchidos)
- `remaining_installments` = `total_installments - paid_installments` (se ambos preenchidos)

---

### Entidade: DebtValueUpdate (Histórico de Valores)

| Campo | Tipo | Obrigatório | Descrição | Validação |
|---|---|---|---|---|
| id | UUID | Sim | Identificador único | Gerado automaticamente |
| debt_id | UUID | Sim | Referência à dívida | FK válida |
| recorded_value | Decimal | Sim | Valor registrado na data | > 0 |
| recorded_at | Date | Sim | Data do registro | Data válida |
| source | String | Não | Origem da informação | Ex: "app do banco", "ligação" |
| notes | String | Não | Observação livre | — |
| created_at | DateTime | Sim | Data de criação | Automático |

---

### Entidade: DebtProposal (Proposta de Quitação)

| Campo | Tipo | Obrigatório | Descrição | Validação |
|---|---|---|---|---|
| id | UUID | Sim | Identificador único | Gerado automaticamente |
| debt_id | UUID | Sim | Referência à dívida | FK válida |
| proposed_value | Decimal | Sim | Valor aceito para quitação | > 0 |
| proposed_at | Date | Sim | Data da proposta | Data válida |
| expires_at | Date | Não | Validade da proposta | ≥ proposed_at |
| origin | String | Não | Canal de origem | Ex: "Serasa", "WhatsApp" |
| status | Enum | Sim | Status da proposta | Ver abaixo |
| notes | String | Não | Observação | — |
| created_at | DateTime | Sim | Data de criação | Automático |

**Enums de status da proposta:**
`ativa`, `expirada`, `recusada`, `aceita`, `substituida`

**Campos calculados (não persistidos):**
- `discount_value` = `debt.current_value - proposed_value`
- `discount_pct` = `((debt.current_value - proposed_value) / debt.current_value) × 100`

---

## 12. Telas Principais

### 12.1 Dashboard

Painel principal com 8 cards de métricas e 4 listas de destaque.

**Cards de métricas:**
1. Total devido hoje (soma dos valores atuais de dívidas ativas)
2. Total original (soma dos valores originais cadastrados)
3. Acréscimos acumulados (total_atual - total_original)
4. Valor para quitar com propostas ativas
5. Economia potencial (se todas as propostas fossem aceitas)
6. Dívidas com proposta ativa (contagem)
7. Dívidas críticas (contagem por prioridade crítica + em atraso)
8. Próxima proposta vencendo (nome + dias restantes)

**Listas de destaque:**
- Maiores dívidas (top 3 por valor atual)
- Melhores oportunidades (top 3 por % de desconto)
- Dívidas que mais cresceram (top 3 por % de crescimento)
- Maior risco percebido (top 3 por risco)

---

### 12.2 Lista de Dívidas

Tabela com todas as dívidas ativas (não quitadas por padrão).

**Colunas visíveis:**
Nome | Credor | Tipo | Status | Valor Atual | Acréscimos | Desconto % | Parcela | Vencimento | Prioridade | Última Atualização

**Barra de filtros:** credor, tipo, status, prioridade, risco, com/sem proposta, em atraso, parceladas, quitadas, propostas vencendo.

**Ordenação:** por qualquer coluna relevante.

**Indicadores visuais de status:**
- Em atraso: vermelho
- Com proposta: azul
- Em negociação: amarelo
- Quitada: cinza
- Crítica: vermelho forte

---

### 12.3 Formulário de Cadastro / Edição

**Seção obrigatória:**
- Nome da dívida
- Credor
- Tipo (select)
- Status (select)
- Valor atual (R$)

**Seção opcional — Valores:**
- Valor original
- Parcela mensal
- Dia de vencimento

**Seção opcional — Contexto:**
- Prioridade
- Risco percebido
- Data de início do atraso
- Tags
- Observações

> **Nota:** campos de proposta (valor de quitação, validade, origem) não fazem parte do formulário de dívida. Propostas são registradas exclusivamente pela ação "Adicionar proposta" na tela de detalhe da dívida.

---

### 12.4 Detalhe da Dívida

**Bloco de cabeçalho:** Nome, credor, tipo, status, prioridade, risco.

**Bloco de valores:**
- Valor original → Valor atual → Acréscimos (R$ e %)
- Valor de quitação → Desconto (R$ e %)

**Bloco de parcelas** (se houver):
- Parcela mensal, vencimento, total/pagas/restantes

**Gráfico de evolução:** linha do tempo com o histórico de valores registrados.

**Bloco de proposta atual** (se houver):
- Valor, desconto, validade, origem.

**Histórico de propostas:** lista cronológica de todas as propostas.

**Histórico de valores:** lista cronológica de todas as atualizações de valor.

**Observações:** campo de texto livre.

**Ações rápidas:**
Atualizar valor | Adicionar proposta | Alterar status | Marcar como quitada | Registrar observação

---

### 12.5 Tela de Decisão

Lista de dívidas ordenada por critério composto, com rótulos sugestivos:

| Rótulo | Critério |
|---|---|
| Melhor oportunidade de quitação | Maior % de desconto com proposta ativa |
| Mais barata para resolver | Menor valor absoluto de quitação |
| Maior risco | Maior risco percebido |
| Mais cara em crescimento | Maior % de crescimento sobre valor original |
| Proposta vencendo | Proposta com validade mais próxima |
| Precisa atualizar valor | Última atualização há mais de 30 dias |
| Aguardando negociação | Status "em negociação" |

> O sistema não toma a decisão pelo usuário. Ele oferece leituras objetivas para orientar a escolha.

---

## 13. Componentes de Interface

Os componentes abaixo são construídos **sobre shadcn/ui** — não do zero. O nome aqui é semântico (o que o componente representa no domínio do Cockpit); a implementação usa o componente shadcn/ui indicado na seção 7.

- **MetricCard:** `Card` do dashboard com label, valor principal e variação. → `Card` + `CardHeader` + `CardContent`
- **DebtRow:** linha da tabela de dívidas com `StatusBadge` e `PriorityBadge` inline. → `TableRow` + `TableCell` + `Badge`
- **StatusBadge:** badge semântico por status da dívida. → `Badge` (variante mapeada na seção 7)
- **PriorityBadge:** badge de prioridade (baixa / média / alta / crítica). → `Badge`
- **ValueHistoryChart:** gráfico de linha da evolução do valor. → Recharts `LineChart` via shadcn/ui charts
- **ProposalCard:** card com valor de quitação, desconto e validade. → `Card` + `Badge` de status
- **AlertBanner:** alerta de proposta próxima do vencimento. → `Alert` (variante `destructive`)
- **FilterBar:** conjunto de filtros da lista de dívidas. → `DropdownMenu` + `Popover` + `Badge` como toggle
- **QuickActionBar:** ações rápidas na tela de detalhe. → `Button` em variantes `outline`, `ghost`, `destructive`
- **DecisionLabel:** etiqueta de contexto de decisão ("Melhor oportunidade", "Maior risco"). → `Badge` com variante customizada mínima
- **DebtForm:** formulário de cadastro/edição com seções colapsáveis. → `Sheet` ou `Dialog` + `Input` + `Select` + `Collapsible` + `Separator`
- **ConfirmDialog:** confirmação de ações destrutivas (excluir, quitar). → `AlertDialog`

---

## 14. Métricas Úteis para o Usuário

Estas são as métricas que o próprio sistema calcula e exibe ao usuário — não métricas de produto:

| Métrica | Descrição |
|---|---|
| Total devido hoje | Soma de todos os valores atuais de dívidas ativas |
| Total original | Soma dos valores originais cadastrados |
| Acréscimos acumulados | Diferença entre total atual e total original |
| % médio de crescimento | Crescimento médio percentual entre original e atual |
| Valor para quitar tudo com propostas | Soma dos valores de quitação com propostas ativas |
| Economia potencial | Desconto total se todas as propostas fossem aceitas |
| Comprometimento mensal | Soma das parcelas mensais de dívidas parceladas |
| Dívidas críticas | Contagem de dívidas com prioridade "crítica" ou status "em atraso" |

---

## 15. Critérios de Aceite

### Módulo: Cadastro de Dívida

- [ ] Usuário consegue salvar uma dívida preenchendo apenas nome, credor, tipo, status e valor atual.
- [ ] Campos opcionais não bloqueiam o salvamento.
- [ ] Campos calculados (acréscimos, crescimento %) aparecem corretamente quando valor original é preenchido.
- [ ] Usuário consegue editar qualquer campo de uma dívida.
- [ ] Exclusão exige confirmação antes de deletar.

### Módulo: Dashboard

- [ ] Total devido exclui dívidas quitadas.
- [ ] Economia potencial é calculada corretamente com base nas propostas ativas.
- [ ] Alerta de proposta vencendo aparece quando validade ≤ 7 dias.
- [ ] Cards de destaque (maiores dívidas, melhores oportunidades) atualizam ao mudar dados.

### Módulo: Lista de Dívidas

- [ ] Filtros funcionam de forma combinada (ex: em atraso + com proposta).
- [ ] Ordenação por coluna funciona para todas as ordenações definidas.
- [ ] Dívidas quitadas não aparecem na lista padrão (apenas se filtro "quitadas" estiver ativo).

### Módulo: Detalhe da Dívida

- [ ] Gráfico de evolução exibe os valores históricos na ordem cronológica correta.
- [ ] Histórico de propostas exibe todas as propostas com status correto.
- [ ] Desconto é calculado corretamente em relação ao valor atual da dívida.
- [ ] Ações rápidas executam as ações esperadas sem erros.

### Módulo: Propostas

- [ ] Ao registrar nova proposta como "ativa", a proposta anterior passa para "substituída" automaticamente.
- [ ] Proposta expirada é sinalizada visualmente quando validade passar da data atual.
- [ ] Desconto em reais e percentual são calculados corretamente.

### Módulo: Histórico de Valores

- [ ] Cada atualização registra data, valor e observação.
- [ ] O histórico é exibido em ordem cronológica.
- [ ] O gráfico reflete todos os registros do histórico.

### Módulo: Cálculos Automáticos

- [ ] `acréscimos = valor_atual - valor_original` (quando ambos preenchidos).
- [ ] `crescimento_pct` calculado corretamente (base: valor_original).
- [ ] `desconto = debt.current_value - active_proposal.proposed_value` (quando proposta ativa presente).
- [ ] `parcelas_restantes = total - pagas` (quando ambos preenchidos).
- [ ] Nenhum campo calculado exibido sem os dados base necessários.

### Módulo: Marcar como Quitada

- [ ] Dívida quitada some dos totais do dashboard imediatamente.
- [ ] Dívida quitada continua acessível via filtro "quitadas" na lista.
- [ ] Dados históricos (propostas, evolução de valor) são preservados após quitação.

---

## 16. Dependências & Riscos

### Dependências

- Projeto Supabase/Postgres configurado e acessível via `DATABASE_URL`. [DEFINIDO]
- Next.js 14+ com App Router e Server Actions. [DEFINIDO]
- Drizzle ORM para schema, migrations e queries. [DEFINIDO]
- Recharts para gráfico de evolução de valor (MVP 0.2).

### Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Scope creep por features de orçamento/banco | Alta | Alto | Manter §9 Fora de Escopo visível; recusar requests de integração no MVP |
| Usuário não preencher valor original | Média | Médio | Campo editável a qualquer momento; cálculo só exibido quando disponível |
| Exposição acidental de chaves Supabase | Baixa | Alto | Todas as queries via Server Actions; nunca usar credenciais em Client Components; `.env.local` no `.gitignore` |
| Interface complexa demais para o usuário em crise | Média | Alto | Testar com usuário real antes de lançar; priorizar clareza sobre riqueza de dados |
| Proposta vencida não atualizada pelo usuário | Alta | Baixo | Alerta visual com 7 dias de antecedência; status calculado on-the-fly na leitura |

---

## 17. Sugestões de Roadmap Futuro

### Fase 2 — Após MVP validado

- Exportação de relatório em PDF (visão consolidada das dívidas).
- Notificações locais de propostas vencendo.
- Cálculo sugerido de prioridade com base nos dados preenchidos.
- Modo "quanto eu teria se pagasse hoje" — simulação de impacto de quitação parcial.

### Fase 3 — Crescimento

- Importação via CSV de dados de planilha.
- Modo "superendividamento" com visualização do comprometimento da renda.
- Integração com Serasa Limpa Nome via scraping ou API pública.
- Comparativo de propostas ao longo do tempo (gráfico de desconto histórico).

### Fase 4 — Inteligência

- Sugestão automática de ordem de quitação com base em critérios configuráveis.
- Integração com assistente de negociação (IA para orientar o script de negociação com o credor).
- Histórico de decisões tomadas e resultados (ex: "você quitou X com Y% de desconto em Z meses").

---

## Histórico de Versões

| Versão | Data | Autor | O que mudou |
|---|---|---|---|
| v0.1 | Maio 2026 | — | Rascunho inicial completo |
| v0.2 | Maio 2026 | — | Adicionada seção 7 (Stack de Interface & Design System: shadcn/ui + Tailwind CSS); expandida seção 12 (Componentes) com mapeamento para componentes shadcn/ui; renumeração de seções |
| v0.3 | Maio 2026 | — | 4 ajustes de lapidação pré-execução: (1) removido `valor_quitacao` de `Debt` — agora derivado de `DebtProposal`; (2) removido `com_proposta` do enum de status — agora badge calculado; (3) P0 dividido em MVP 0.1 (núcleo) e MVP 0.2 (decisão); (4) arquivamento movido para Fora de Escopo. Adicionada seção §6 Decisões de Modelagem. |
| v0.4 | Maio 2026 | — | Decisão de stack: SQLite substituído por Supabase/Postgres. Abordagem de solução atualizada. Requisitos não-funcionais de privacidade expandidos. |
| v0.5 | Maio 2026 | — | Limpeza de consistência: numeração de seções corrigida (§6 duplicado→§8); "arquivadas" removido de RN06 e critérios de aceite; RN03/RN04/RN07/RN08 reescritos com `active_proposal.proposed_value`; seção Proposta removida do formulário de dívida; Duplicar/Arquivar removidos das ações rápidas do MVP; dependências atualizadas para Supabase/Postgres via DATABASE_URL. |
