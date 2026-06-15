import "server-only";

import { asc, desc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { debtProposals } from "@/lib/db/schema";
import { listDebts } from "@/lib/services/debt.service";
import {
  selectLatestPayoffProposal,
  type DebtSelectionItem,
} from "@/lib/debt-selection";

export async function listDebtSelectionItems(): Promise<DebtSelectionItem[]> {
  const debts = await listDebts({
    showArchived: true,
    sort: "current_desc",
  });

  if (debts.length === 0) {
    return [];
  }

  const db = getDb();
  const debtIds = debts.map((debt) => debt.id);
  const proposalRows = await db
    .select()
    .from(debtProposals)
    .where(inArray(debtProposals.debtId, debtIds))
    .orderBy(
      asc(debtProposals.debtId),
      desc(debtProposals.proposedAt),
      desc(debtProposals.createdAt)
    );

  const proposalsByDebtId = new Map<string, (typeof proposalRows)[number][]>();
  for (const proposal of proposalRows) {
    const current = proposalsByDebtId.get(proposal.debtId) ?? [];
    current.push(proposal);
    proposalsByDebtId.set(proposal.debtId, current);
  }

  return debts.map((debt) => {
    const latestPayoffProposal = selectLatestPayoffProposal(proposalsByDebtId.get(debt.id));

    return {
      ...debt,
      latestPayoffProposal,
      hasPayoffProposal: Boolean(latestPayoffProposal),
    };
  });
}
