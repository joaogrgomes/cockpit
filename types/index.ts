import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  DEBT_STATUS_VALUES,
  PROPOSAL_STATUS_VALUES,
  debts,
  debtProposals,
  debtValueUpdates,
} from "@/lib/db/schema";

export type Debt = InferSelectModel<typeof debts>;
export type NewDebt = InferInsertModel<typeof debts>;

export type DebtProposal = InferSelectModel<typeof debtProposals>;
export type NewDebtProposal = InferInsertModel<typeof debtProposals>;

export type DebtValueUpdate = InferSelectModel<typeof debtValueUpdates>;
export type NewDebtValueUpdate = InferInsertModel<typeof debtValueUpdates>;

export type DebtStatus = (typeof DEBT_STATUS_VALUES)[number];
export type DebtProposalStatus = (typeof PROPOSAL_STATUS_VALUES)[number];
